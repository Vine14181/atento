import { todayStr } from './dates.js';
import { globalStreak, habitStreak } from './scoring.js';

/**
 * 18 conquistas em 4 categorias.
 * check(data) => boolean; data = { tasks, doneTasks, habits, profile }
 */
export const ACHIEVEMENTS = [
  // 🔥 Consistência (streak global)
  { id: 'fagulha',    cat: 'Consistência', emoji: '🔥', name: 'Primeira Fagulha', desc: 'Streak de 1 dia',
    check: (d) => globalStreak(d.habits) >= 1 },
  { id: 'fogo',       cat: 'Consistência', emoji: '🔥', name: 'Pegando Fogo', desc: 'Streak de 3 dias',
    check: (d) => globalStreak(d.habits) >= 3 },
  { id: 'constancia', cat: 'Consistência', emoji: '⚡', name: 'Constância', desc: 'Streak de 7 dias',
    check: (d) => globalStreak(d.habits) >= 7 },
  { id: 'inabalavel', cat: 'Consistência', emoji: '🏔️', name: 'Inabalável', desc: 'Streak de 30 dias',
    check: (d) => globalStreak(d.habits) >= 30 },
  { id: 'lendario',   cat: 'Consistência', emoji: '🏆', name: 'Lendário', desc: 'Streak de 100 dias',
    check: (d) => globalStreak(d.habits) >= 100 },

  // 🎯 Produtividade (tarefas)
  { id: 'primeiro-passo', cat: 'Produtividade', emoji: '🎯', name: 'Primeiro Passo', desc: 'Concluir a primeira tarefa',
    check: (d) => d.doneTasks.length >= 1 },
  { id: 'tarefa-pesada',  cat: 'Produtividade', emoji: '💪', name: 'Tarefa Pesada', desc: 'Concluir uma tarefa de 1h+',
    check: (d) => d.doneTasks.some(t => (t.durationMin || 0) >= 60) },
  { id: 'dia-perfeito',   cat: 'Produtividade', emoji: '🚀', name: 'Dia Perfeito', desc: '100% das tarefas do dia concluídas',
    check: (d) => {
      const today = todayStr();
      const doneToday = d.doneTasks.filter(t => (t.completedAt || '').slice(0, 10) === today).length;
      return doneToday > 0 && d.tasks.filter(t => !t.done).length === 0;
    } },
  { id: 'semana-ouro',    cat: 'Produtividade', emoji: '⭐', name: 'Semana de Ouro', desc: 'Média ≥80% na semana de hábitos',
    check: (d) => {
      // média dos últimos 7 dias com hábitos programados (mínimo 4 dias válidos)
      const vs = (d.week7 || []).filter(x => x !== null);
      if (vs.length < 4) return false;
      return vs.reduce((a, b) => a + b, 0) / vs.length >= 80;
    } },
  { id: 'foco-total',     cat: 'Produtividade', emoji: '🧠', name: 'Foco Total', desc: 'Concluir 25 tarefas',
    check: (d) => d.doneTasks.length >= 25 },

  // 🌱 Hábitos
  { id: 'semente',  cat: 'Hábitos', emoji: '🌱', name: 'Semente Plantada', desc: 'Criar o primeiro hábito',
    check: (d) => d.habits.length >= 1 },
  { id: 'raizes',   cat: 'Hábitos', emoji: '🌿', name: 'Criando Raízes', desc: 'Ter 3 hábitos ativos',
    check: (d) => d.habits.length >= 3 },
  { id: 'arvore',   cat: 'Hábitos', emoji: '🌳', name: 'Árvore Firme', desc: 'Um hábito com streak de 21 dias',
    check: (d) => d.habits.some(h => habitStreak(h) >= 21) },
  { id: 'leitor',   cat: 'Hábitos', emoji: '📚', name: 'Leitor Dedicado', desc: 'Hábito de leitura feito 10 vezes',
    check: (d) => d.habits.some(h => /ler|leitura|livro/i.test(h.name || '') && Object.keys(h.doneDates || {}).length >= 10) },

  // ✨ Especial
  { id: 'coruja',     cat: 'Especial', emoji: '🦉', name: 'Coruja', desc: 'Concluir tarefa depois das 22h',
    check: (d) => d.doneTasks.some(t => {
      const h = new Date(t.completedAt || 0).getHours();
      return t.completedAt && (h >= 22 || h < 4);
    }) },
  { id: 'madrugador', cat: 'Especial', emoji: '🐓', name: 'Madrugador', desc: 'Concluir tarefa antes das 7h',
    check: (d) => d.doneTasks.some(t => {
      const h = new Date(t.completedAt || 0).getHours();
      return t.completedAt && h >= 4 && h < 7;
    }) },
  { id: 'recomeco',   cat: 'Especial', emoji: '🔄', name: 'Recomeço', desc: 'Voltar a fazer hábitos depois de quebrar um streak',
    check: (d) => d.habits.some(h => {
      const dates = Object.keys(h.doneDates || {}).sort();
      if (dates.length < 2) return false;
      // existe um "buraco" de 2+ dias entre datas feitas, e voltou depois
      for (let i = 1; i < dates.length; i++) {
        const gap = (new Date(dates[i]) - new Date(dates[i - 1])) / 86400000;
        if (gap >= 3) return true;
      }
      return false;
    }) },
  { id: 'diretor',    cat: 'Especial', emoji: '🎬', name: 'Diretor', desc: 'Usar o Descomplicador 10 vezes',
    check: (d) => (d.profile?.breakerUses || 0) >= 10 },
];

export const CATEGORIES = ['Consistência', 'Produtividade', 'Hábitos', 'Especial'];
export const CAT_EMOJI = { 'Consistência': '🔥', 'Produtividade': '🎯', 'Hábitos': '🌱', 'Especial': '✨' };

/**
 * Avalia todas; retorna { unlockedNow: [ach], all: {id: dateStr} }.
 * `already` = mapa {id: date} já salvo no perfil.
 */
export const evaluateAchievements = (data, already = {}) => {
  const unlockedNow = [];
  const all = { ...already };
  for (const a of ACHIEVEMENTS) {
    if (all[a.id]) continue;
    try {
      if (a.check(data)) {
        all[a.id] = todayStr();
        unlockedNow.push(a);
      }
    } catch { /* checagem individual nunca derruba o app */ }
  }
  return { unlockedNow, all };
};
