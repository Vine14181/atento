import { todayStr, addDays, weekdayOf, lastNDays, weekStartOf } from './dates.js';

// Um hábito está "programado" num dia se: já existia, e a frequência bate
// (diário, ou o dia da semana está na lista de dias específicos)
export const isScheduledOn = (habit, dateStr) => {
  const created = (habit.createdAt || '').slice(0, 10);
  if (created && created > dateStr) return false;
  if (habit.freqType === 'dias' && Array.isArray(habit.days)) {
    return habit.days.includes(weekdayOf(dateStr));
  }
  return true; // diário
};

export const isDoneOn = (habit, dateStr) => Boolean(habit.doneDates?.[dateStr]);

export const isHabitDoneToday = (habit) => isDoneOn(habit, todayStr());

// Score do dia: % de hábitos programados que foram feitos (null = nada programado)
export const dayScore = (habits, dateStr) => {
  const scheduled = habits.filter(h => isScheduledOn(h, dateStr));
  if (scheduled.length === 0) return null;
  const done = scheduled.filter(h => isDoneOn(h, dateStr)).length;
  return Math.round((done / scheduled.length) * 100);
};

/**
 * Streak global com a regra dos 60%:
 * — dia passado só QUEBRA a sequência se score < 60% (com hábitos programados)
 * — dia sem hábitos programados é neutro (não quebra, não conta)
 * — hoje nunca quebra enquanto o dia não acabou; conta se já bateu 60%
 */
export const globalStreak = (habits) => {
  if (habits.length === 0) return 0;
  let streak = 0;
  const today = todayStr();
  const todayScore = dayScore(habits, today);
  if (todayScore !== null && todayScore >= 60) streak++;

  let day = addDays(today, -1);
  for (let i = 0; i < 400; i++) {
    const score = dayScore(habits, day);
    if (score === null) {
      // neutro — mas se o hábito mais antigo ainda não existia, para
      const oldest = habits.reduce((min, h) => {
        const c = (h.createdAt || '').slice(0, 10);
        return c && c < min ? c : min;
      }, today);
      if (day < oldest) break;
    } else if (score >= 60) {
      streak++;
    } else {
      break;
    }
    day = addDays(day, -1);
  }
  return streak;
};

// Streak individual de um hábito (dias consecutivos feitos, hoje não quebra)
export const habitStreak = (habit) => {
  let streak = 0;
  const today = todayStr();
  if (isDoneOn(habit, today)) streak++;
  let day = addDays(today, -1);
  for (let i = 0; i < 400; i++) {
    if (!isScheduledOn(habit, day)) { day = addDays(day, -1); continue; }
    if (isDoneOn(habit, day)) streak++;
    else break;
    day = addDays(day, -1);
  }
  return streak;
};

// Tabela de consistência dos últimos 7 dias: [{date, label, score}]
export const consistency7 = (habits) =>
  lastNDays(7).map(date => ({ date, score: dayScore(habits, date) }));

// Scores da semana atual (Dom..Sáb), null para dias futuros
export const currentWeekScores = (habits) => {
  const start = weekStartOf(todayStr());
  const today = todayStr();
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return { date, score: date > today ? null : dayScore(habits, date) };
  });
};

// Média dos últimos 30 dias (ignora dias neutros)
export const monthAverage = (habits) => {
  const scores = lastNDays(30).map(d => dayScore(habits, d)).filter(s => s !== null);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
};
