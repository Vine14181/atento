import { todayStr } from './dates.js';
import { dayScore, isScheduledOn, isDoneOn, globalStreak } from './scoring.js';

/**
 * Insights contextuais para o Perfil — regras simples sobre os dados do dia.
 * Retorna [{emoji, text}] (máx 5).
 */
export const buildInsights = ({ tasks, doneTasks, habits, profile }) => {
  const out = [];
  const today = todayStr();
  const pending = tasks.filter(t => !t.done);
  const doneToday = doneTasks.filter(t => (t.completedAt || '').slice(0, 10) === today);
  const habitsToday = habits.filter(h => isScheduledOn(h, today));
  const habitsDone = habitsToday.filter(h => isDoneOn(h, today));
  const streak = globalStreak(habits);

  if (habits.length === 0) {
    out.push({ emoji: '✅', text: 'Crie hábitos para acompanhar seu progresso' });
  } else if (habitsDone.length === 0 && habitsToday.length > 0) {
    out.push({ emoji: '🔥', text: streak > 0 ? `Não deixe seu streak de ${streak} dias morrer — complete um hábito hoje!` : 'Comece seu streak completando hábitos hoje!' });
  } else if (habitsToday.length > 0 && habitsDone.length === habitsToday.length) {
    out.push({ emoji: '🌟', text: 'Todos os hábitos de hoje concluídos. Impecável!' });
  }

  if (!profile?.energy) {
    out.push({ emoji: '🧠', text: 'Configure seu perfil de energia para dicas personalizadas' });
  } else {
    const e = profile.energy;
    if (e.peak) out.push({ emoji: '⚡', text: `Seu pico de energia é ${e.peak} — reserve as tarefas difíceis para esse horário` });
  }

  const urgent = pending.filter(t => t.priority === 'alta');
  if (urgent.length > 0) {
    out.push({ emoji: '🚨', text: `Você tem ${urgent.length} tarefa${urgent.length > 1 ? 's' : ''} de prioridade alta pendente${urgent.length > 1 ? 's' : ''}` });
  } else if (doneToday.length === 0 && pending.length > 0) {
    out.push({ emoji: '🎯', text: 'Nenhuma tarefa concluída hoje ainda. Que tal começar pela mais fácil?' });
  } else if (pending.length === 0 && tasks.length > 0) {
    out.push({ emoji: '💪', text: 'Nenhuma tarefa pendente. Você está em dia! ✨' });
  }

  const score = dayScore(habits, today);
  if (score !== null && score >= 60 && score < 100) {
    out.push({ emoji: '📈', text: `Dia em ${score}% — falta pouco para fechar 100%` });
  }

  return out.slice(0, 5);
};
