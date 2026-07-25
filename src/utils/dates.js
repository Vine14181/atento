// Datas SEMPRE no fuso local (formato YYYY-MM-DD).
// Nunca usar toISOString() para "hoje": às 21h+ no Brasil (UTC-3) já viraria amanhã.

export const toDateStr = (d) => d.toLocaleDateString('sv'); // 'sv' = YYYY-MM-DD

export const todayStr = () => toDateStr(new Date());

export const addDays = (dateStr, n) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return toDateStr(dt);
};

export const yesterdayStr = () => addDays(todayStr(), -1);

// 0=domingo ... 6=sábado
export const weekdayOf = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
};

// Domingo da semana que contém dateStr
export const weekStartOf = (dateStr) => addDays(dateStr, -weekdayOf(dateStr));

// Últimos n dias terminando hoje (ordem cronológica)
export const lastNDays = (n) => {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(todayStr(), -i));
  return out;
};

export const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const formatShort = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};
