import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import { addDays } from '../utils/dates';

/**
 * Integração com a Google Agenda.
 * O login já é Google — pedimos o escopo de agenda sob demanda e usamos
 * o access token OAuth para criar eventos via REST (do próprio navegador).
 * O token dura ~1h; quando expira, reabrimos o popup (rápido, já autorizado).
 */

const TOKEN_KEY = 'atento_gcal_token';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';

const getStoredToken = () => {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const { token, exp } = JSON.parse(raw);
    if (!token || Date.now() > exp) return null;
    return token;
  } catch {
    return null;
  }
};

const storeToken = (token) => {
  // Tokens OAuth do Google duram ~1h; guardamos com folga de segurança
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ token, exp: Date.now() + 55 * 60 * 1000 }));
};

// Abre o popup do Google pedindo o escopo de agenda e captura o access token
export const connectCalendar = async () => {
  const provider = new GoogleAuthProvider();
  provider.addScope(SCOPE);
  const result = await signInWithPopup(auth, provider);
  const cred = GoogleAuthProvider.credentialFromResult(result);
  if (!cred?.accessToken) throw new Error('Sem token de acesso');
  storeToken(cred.accessToken);
  return cred.accessToken;
};

// Token válido, reconectando via popup se necessário
const getToken = async () => {
  const stored = getStoredToken();
  if (stored) return stored;
  return connectCalendar();
};

const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Cria um evento na agenda principal do usuário.
 * { title, date: 'YYYY-MM-DD', time: 'HH:MM'|null, durationMin, reminderMin }
 * Com hora → evento com horário; sem hora → evento de dia inteiro.
 * Retorna o eventId (ou lança erro).
 */
export const createCalendarEvent = async ({ title, description, date, time, durationMin = 30, reminderMin = 10 }) => {
  const token = await getToken();

  let start, end;
  if (time) {
    const startDt = new Date(`${date}T${time}:00`);
    const endDt = new Date(startDt.getTime() + durationMin * 60000);
    const iso = (d) => {
      const p = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
    };
    start = { dateTime: iso(startDt), timeZone: tz() };
    end = { dateTime: iso(endDt), timeZone: tz() };
  } else {
    start = { date };
    end = { date: addDays(date, 1) };
  }

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: title,
        description: description || 'Criado pelo Atento ⚡',
        start,
        end,
        reminders: {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: reminderMin }],
        },
      }),
    }
  );

  if (!res.ok) throw new Error(`Google Agenda retornou ${res.status}`);
  const data = await res.json();
  return data.id;
};

// Remove um evento (usado quando a tarefa/alarme é excluído)
export const deleteCalendarEvent = async (eventId) => {
  const token = getStoredToken();
  if (!token || !eventId) return;
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  ).catch(() => {});
};
