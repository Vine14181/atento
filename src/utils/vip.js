// Lista de exibição apenas — a checagem REAL de VIP acontece no servidor
// (netlify/functions/ai.mjs), verificando o token de login do Firebase.
// Configure em VITE_VIP_EMAILS (emails separados por vírgula). Vazio = ninguém é VIP.
export const VIP_EMAILS = (import.meta.env.VITE_VIP_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const isVip = (email) =>
  Boolean(email && VIP_EMAILS.includes(email.toLowerCase()));
