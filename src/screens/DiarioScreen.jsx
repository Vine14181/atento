import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2, Zap, AlarmClock, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../contexts/AuthContext';
import { setHabitDone } from '../services/firestore';
import { todayStr } from '../utils/dates';
import { isScheduledOn, isDoneOn } from '../utils/scoring';

const fmtMin = (min) => {
  if (min <= 0) return '0min';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${m}` : `${h}h`;
};

export default function DiarioScreen({
  pendingTasks, doneTasks, habits, alarms = [], onComplete, onCompleteAll, onOpenBreaker, onDeleteAlarm,
}) {
  const { currentUser } = useAuth();
  const today = todayStr();

  const totalTasks = pendingTasks.length + doneTasks.length;
  const completedCount = doneTasks.length;
  const pct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const circumference = 2 * Math.PI * 44;
  const dashOffset = circumference - (circumference * pct) / 100;

  const habitsToday = habits.filter(h => isScheduledOn(h, today));
  const habitsDone = habitsToday.filter(h => isDoneOn(h, today));

  // Foco restante = soma das durações reais das tarefas pendentes
  const remainingMin = pendingTasks.reduce((sum, t) => sum + (t.durationMin || 30), 0);
  const totalMin = [...pendingTasks, ...doneTasks].reduce((sum, t) => sum + (t.durationMin || 30), 0);

  const dateStr = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  });
  const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  const handleComplete = (taskId) => {
    confetti({
      particleCount: 60, spread: 55, origin: { y: 0.6 },
      colors: ['#22d3ee', '#fff', '#888'],
    });
    onComplete(taskId);
  };

  const handleCompleteAll = () => {
    confetti({
      particleCount: 140, spread: 90, origin: { y: 0.5 },
      colors: ['#22d3ee', '#fff', '#888', '#7dd3fc'],
    });
    onCompleteAll();
  };

  const toggleHabit = async (habit) => {
    if (!currentUser) return;
    const done = isDoneOn(habit, today);
    if (!done) {
      confetti({
        particleCount: 40, spread: 45, origin: { y: 0.7 },
        colors: ['#22d3ee', '#fff', '#888'],
      });
    }
    await setHabitDone(currentUser.uid, habit.id, today, !done);
  };

  return (
    <div style={{ padding: '24px 16px 0' }}>
      {/* Subtítulo com data */}
      <div style={{ marginBottom: 4, fontSize: 14, color: 'var(--fg-muted)' }}>
        {formattedDate}
      </div>
      <h1 className="page-title" style={{ marginBottom: 20 }}>Diário</h1>

      {/* Card de progresso */}
      <div className="card" style={{ padding: 20, marginBottom: 20, display: 'flex', gap: 20, alignItems: 'center' }}>
        {/* Anel circular */}
        <div className="progress-ring-container" style={{ flexShrink: 0 }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="var(--surface-2)" strokeWidth="8" />
            <motion.circle
              cx="50" cy="50" r="44" fill="none"
              stroke="var(--primary)" strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <span className="progress-ring-label">{pct}%</span>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />
              Tarefas
            </span>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{completedCount}/{totalTasks}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#a855f7', display: 'inline-block' }} />
              Hábitos
            </span>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{habitsDone.length}/{habitsToday.length}</span>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', fontSize: 12 }}>
              <Clock size={12} /> Foco restante
            </div>
            <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--primary)', lineHeight: 1.2, marginTop: 2 }}>
              {fmtMin(remainingMin)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-dim)' }}>de {fmtMin(totalMin)} total</div>
          </div>
        </div>
      </div>

      {/* Botão Concluir todas */}
      {pendingTasks.length > 0 && (
        <button className="btn-outline-primary" style={{ marginBottom: 24 }} onClick={handleCompleteAll}>
          <CheckCircle2 size={16} />
          Concluir todas ({pendingTasks.length})
        </button>
      )}

      {/* Tarefas de hoje */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <span>🔥</span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Tarefas de hoje</span>
          {pendingTasks.length > 0 && (
            <span style={{ color: 'var(--fg-dim)', fontSize: 13 }}>
              {pendingTasks.length} pendente{pendingTasks.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {pendingTasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--fg-dim)', fontSize: 14 }}>
            {totalTasks > 0 ? 'Tudo concluído por hoje! 🎉' : 'Nenhuma tarefa para hoje.'}
          </div>
        )}

        <AnimatePresence>
          {pendingTasks.map((task, i) => (
            <motion.div
              key={task.id}
              className="task-item"
              style={{ marginBottom: 8 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ delay: i * 0.04 }}
            >
              <button
                className="task-check"
                onClick={() => handleComplete(task.id)}
                title="Marcar como concluída"
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{task.emoji || '📝'}</span>
                  {task.text}
                </div>
                <div style={{ color: 'var(--fg-dim)', fontSize: 12 }}>
                  {fmtMin(task.durationMin || 30)} · {task.steps?.length || 0} etapas
                </div>
              </div>
              <button
                onClick={() => onOpenBreaker(task)}
                title="Descomplicar com IA"
                style={{
                  color: 'var(--primary)', background: 'var(--primary-dark)',
                  borderRadius: 8, padding: '6px 8px', border: '1px solid hsla(189,94%,55%,0.3)',
                }}
              >
                <Zap size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Alarmes / Lembretes futuros */}
      {alarms.filter(a => !a.fired).length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <span>⏰</span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Alarmes</span>
          </div>
          {alarms
            .filter(a => !a.fired)
            .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
            .map(alarm => (
              <div key={alarm.id} className="task-item" style={{ marginBottom: 8 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: 'var(--primary-dark)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <AlarmClock size={17} color="var(--primary)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{alarm.text}</div>
                  <div style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
                    {alarm.date === today ? 'Hoje' : alarm.date.split('-').reverse().slice(0, 2).join('/')} às{' '}
                    <b style={{ color: 'var(--primary)' }}>{alarm.time}</b>
                    {alarm.gcalEventId && ' · na Google Agenda 📅'}
                  </div>
                </div>
                <button
                  onClick={() => onDeleteAlarm(alarm)}
                  title="Excluir alarme"
                  style={{ color: 'var(--fg-dim)', padding: 6 }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
        </div>
      )}

      {/* Hábitos de hoje */}
      {habitsToday.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <span>🌱</span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Hábitos de hoje</span>
            <span style={{ color: 'var(--fg-dim)', fontSize: 13 }}>{habitsDone.length}/{habitsToday.length}</span>
          </div>

          {habitsToday.map((habit) => {
            const done = isDoneOn(habit, today);
            return (
              <div key={habit.id} className="task-item" style={{ marginBottom: 8, opacity: done ? 0.55 : 1 }}>
                <span style={{ fontSize: 18 }}>{habit.emoji}</span>
                <div style={{ flex: 1, fontWeight: 600, fontSize: 15, textDecoration: done ? 'line-through' : 'none' }}>
                  {habit.name}
                </div>
                <button
                  className={`task-check ${done ? 'done' : ''}`}
                  onClick={() => toggleHabit(habit)}
                >
                  {done && <CheckCircle2 size={14} color="var(--primary-text)" />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Concluídas */}
      {doneTasks.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <span>✅</span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Concluídas</span>
            <span style={{ color: 'var(--fg-dim)', fontSize: 13 }}>{doneTasks.length}</span>
          </div>

          {doneTasks.map((task, i) => (
            <motion.div
              key={task.id}
              className="task-item"
              style={{ marginBottom: 8, opacity: 0.55 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.55, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <div className="task-check done">
                <CheckCircle2 size={14} color="var(--primary-text)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, textDecoration: 'line-through' }}>
                  {task.text}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
