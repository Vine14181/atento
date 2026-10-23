import { GoogleAuthProvider, reauthenticateWithPopup, deleteUser } from 'firebase/auth';
import { auth } from '../firebase';
import { listUserDocs, deleteDocsInBatches } from './firestore';
import { CALENDAR_SCOPE } from './calendar';
import { withTimeout } from '../utils/timeout';

/**
 * Exclusão de conta e de todos os dados — exigência da Google Play para apps
 * em que a pessoa cria conta (aqui, o primeiro login com Google cria a conta).
 *
 * São duas etapas, sempre nesta ordem:
 *  1. confirmIdentity: o Google pede para escolher a conta de novo. O Firebase
 *     só deixa apagar uma conta com login recente, e o popup precisa abrir
 *     direto do toque no botão (senão o navegador o bloqueia).
 *  2. deleteEverything: apaga os DADOS antes da CONTA. Sem a conta, as regras
 *     do Firestore não deixam mais ninguém apagar os documentos dela.
 */

// Chaves do localStorage que guardam dados do usuário no aparelho
const LOCAL_KEYS = ['atento_gcal_token', 'atento_ram_cache_fallback'];

export function clearLocalUserData() {
  for (const key of LOCAL_KEYS) {
    try { localStorage.removeItem(key); } catch { /* armazenamento bloqueado */ }
  }
}

const appError = (code) => Object.assign(new Error(code), { code });

export async function confirmIdentity({ withCalendar = false } = {}) {
  const user = auth.currentUser;
  if (!user) throw appError('auth/no-current-user');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ login_hint: user.email || '', prompt: 'select_account' });
  // O escopo da agenda só é pedido se a pessoa quiser apagar os eventos de lá
  if (withCalendar) provider.addScope(CALENDAR_SCOPE);
  // Se a pessoa escolher outra conta Google, o Firebase recusa (auth/user-mismatch)
  const result = await reauthenticateWithPopup(user, provider);
  return GoogleAuthProvider.credentialFromResult(result)?.accessToken || null;
}

export async function deleteEverything({ accessToken = null, deleteCalendarEvents = false, onStep = () => {} } = {}) {
  const user = auth.currentUser;
  // "stage" diz à tela se algo já tinha sido apagado quando um erro aconteceu
  let stage = 'antes';
  try {
    if (!user) throw appError('auth/no-current-user');
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw appError('app/offline');

    onStep('Lendo seus dados…');
    let docs = await withTimeout(listUserDocs(user.uid), 20000);

    // Os IDs dos eventos estão nos próprios documentos: a agenda vem ANTES de apagá-los
    if (deleteCalendarEvents && accessToken) {
      const eventIds = [...new Set(docs.map(d => d.get('gcalEventId')).filter(Boolean))];
      if (eventIds.length > 0) {
        stage = 'durante';
        onStep('Apagando da Google Agenda os eventos criados pelo app…');
        for (const id of eventIds) {
          await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(id)}`,
            { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
          ).catch(() => {}); // evento que a pessoa já apagou na agenda não impede o resto
        }
      }
    }

    // Até 3 passadas: se alguma gravação já estava a caminho quando a exclusão
    // começou (ex.: o salvamento automático da Memória RAM), a passada seguinte
    // apaga o que chegou depois.
    for (let pass = 0; pass < 3 && docs.length > 0; pass++) {
      stage = 'durante';
      await withTimeout(
        deleteDocsInBatches(docs, (n, total) => onStep(`Apagando seus dados (${n} de ${total})…`)),
        60000,
      );
      docs = await withTimeout(listUserDocs(user.uid), 20000);
    }
    if (docs.length > 0) throw appError('app/leftover-data');

    onStep('Removendo sua conta…');
    await deleteUser(user); // apaga a conta no Firebase Auth e encerra a sessão
  } catch (e) {
    e.stage = stage;
    throw e;
  }

  // Tira o app da lista "Apps com acesso à sua conta" do Google (melhor esforço).
  // Com mode "no-cors" a resposta vem opaca, mas o pedido de revogação chega.
  if (accessToken) {
    fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `token=${encodeURIComponent(accessToken)}`,
    }).catch(() => {});
  }
  clearLocalUserData();
}

// Mensagem para cada erro da exclusão. Com stage 'antes', nada foi apagado.
export function deletionErrorMessage(code, stage, email) {
  const nothingDeleted = stage === 'antes';
  const tail = nothingDeleted ? ' Nada foi apagado.' : '';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/user-cancelled':
      return nothingDeleted
        ? 'Confirmação cancelada. Nada foi apagado.'
        : 'Confirmação cancelada. Parte dos seus dados já tinha sido apagada: toque em "Tentar de novo" para terminar.';
    case 'auth/popup-blocked':
      return `O celular bloqueou a janela do Google. Toque no botão de novo.${tail}`;
    case 'auth/user-mismatch':
      return `Você escolheu outra conta Google. Escolha ${email || 'a mesma conta com que entrou no app'}.${tail}`;
    case 'app/offline':
    case 'app/timeout':
    case 'auth/network-request-failed':
    case 'unavailable':
      return nothingDeleted
        ? 'Sem internet. Nada foi apagado. Conecte-se e tente de novo.'
        : 'A conexão caiu no meio. Parte dos dados pode já ter sido apagada. Conecte-se e toque em "Tentar de novo".';
    case 'auth/requires-recent-login':
      return 'Seus dados já foram apagados, mas o Google pediu para confirmar a conta de novo. Toque em "Tentar de novo".';
    case 'permission-denied':
      return 'Sua sessão expirou no meio da exclusão. Toque em "Tentar de novo".';
    case 'auth/too-many-requests':
      return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.';
    default:
      return nothingDeleted
        ? 'Não foi possível excluir agora. Nada foi apagado. Tente de novo.'
        : 'A exclusão parou no meio. Toque em "Tentar de novo" para terminar.';
  }
}
