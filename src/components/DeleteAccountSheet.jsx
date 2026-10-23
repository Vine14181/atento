import React, { useState } from 'react';
import BottomSheet from './BottomSheet';
import { useAuth } from '../contexts/AuthContext';
import { deletionErrorMessage } from '../services/account';

const CONFIRM_WORD = 'EXCLUIR';

/**
 * Confirmação em 2 passos da exclusão de conta: a pessoa lê o que será
 * apagado e digita EXCLUIR. Só então o botão final libera.
 */
export default function DeleteAccountSheet({ open, onClose, hasCalendar }) {
  const { currentUser, deleteAccount } = useAuth();
  const [typed, setTyped] = useState('');
  const [alsoCalendar, setAlsoCalendar] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const email = currentUser?.email || '';
  const confirmed = typed.trim().toUpperCase() === CONFIRM_WORD;

  const close = () => {
    setTyped('');
    setAlsoCalendar(false);
    setError('');
    onClose();
  };

  // Nada de await antes de deleteAccount: o popup do Google precisa sair
  // direto do toque, senão o navegador bloqueia a janela.
  const handleDelete = () => {
    if (!confirmed || busy) return;
    setError('');
    setBusy(true);
    deleteAccount({ deleteCalendarEvents: hasCalendar && alsoCalendar })
      .then(res => {
        if (res && !res.ok && res.stage === 'antes') setError(deletionErrorMessage(res.code, 'antes', email));
      })
      .finally(() => setBusy(false));
  };

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title="Excluir conta e dados"
      subtitle="Isso não pode ser desfeito."
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="btn-primary"
            onClick={handleDelete}
            disabled={!confirmed || busy}
            style={{
              width: '100%', background: '#ef4444', color: '#fff', boxShadow: 'none',
              opacity: confirmed && !busy ? 1 : 0.45,
            }}
          >
            {busy ? 'Aguardando o Google…' : 'Excluir minha conta'}
          </button>
          <button className="btn-ghost" onClick={close} style={{ width: '100%' }}>
            Cancelar
          </button>
        </div>
      }
    >
      <div className="field-card" style={{ fontSize: 14, lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Vamos apagar para sempre:</div>
        <ul style={{ paddingLeft: 18, color: 'var(--fg-muted)' }}>
          <li>suas tarefas e micro-passos;</li>
          <li>seus hábitos e todo o histórico de sequências;</li>
          <li>alarmes, perfil de energia, conquistas e a Memória RAM;</li>
          <li>as denúncias de respostas da IA que você enviou;</li>
          <li>a sua conta no app.</li>
        </ul>
        <div style={{ fontWeight: 700, margin: '12px 0 6px' }}>Não é apagado por aqui:</div>
        <ul style={{ paddingLeft: 18, color: 'var(--fg-muted)' }}>
          <li>a sua conta Google, que é sua e continua existindo;</li>
          <li>os eventos que o app criou na sua Google Agenda{hasCalendar ? ', a não ser que você marque a opção abaixo' : ''};</li>
          <li>cópias temporárias que os serviços de IA e de hospedagem guardam pelo prazo dos termos deles.</li>
        </ul>
      </div>

      {hasCalendar && (
        <label className="field-card" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={alsoCalendar}
            onChange={e => setAlsoCalendar(e.target.checked)}
            style={{ marginTop: 3, accentColor: '#ef4444' }}
          />
          <span>Também apagar da minha Google Agenda os eventos criados pelo app</span>
        </label>
      )}

      <div className="field-card">
        <label className="field-label" htmlFor="confirm-delete">
          Digite {CONFIRM_WORD} para confirmar
        </label>
        <input
          id="confirm-delete"
          className="field-input"
          value={typed}
          onChange={e => setTyped(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          placeholder={CONFIRM_WORD}
        />
        <p style={{ fontSize: 12, color: 'var(--fg-dim)', marginTop: 8, lineHeight: 1.5 }}>
          O Google vai pedir para você escolher a sua conta de novo{email ? ` (${email})` : ''}.
        </p>
      </div>

      {error && (
        <div role="alert" style={{
          background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
          padding: 12, borderRadius: 10, fontSize: 14, lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}
    </BottomSheet>
  );
}
