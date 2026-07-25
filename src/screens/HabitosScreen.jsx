import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import BottomSheet from '../components/BottomSheet';
import { useAuth } from '../contexts/AuthContext';
import { addHabit, updateHabit, removeHabit, setHabitDone } from '../services/firestore';
import { todayStr, WEEKDAY_LABELS } from '../utils/dates';
import { isScheduledOn, isDoneOn, habitStreak, consistency7 } from '../utils/scoring';

const EMOJI_OPTIONS = ['💊', '🧘', '🏃', '💧', '📚', '🙏', '😴', '🥗', '🦷', '☀️'];
const COLORS = ['#22d3ee', '#a855f7', '#22c55e', '#38bdf8', '#eab308', '#f87171', '#fb923c', '#ec4899'];

const todayCount = (habit) => (habit.countDate === todayStr() ? habit.count || 0 : 0);

export default function HabitosScreen({ habits }) {
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [sortPendingFirst, setSortPendingFirst] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💊');
  const [color, setColor] = useState(COLORS[0]);
  const [freqType, setFreqType] = useState('diario');
  const [days, setDays] = useState([1, 2, 3, 4, 5]);
  const [isCounter, setIsCounter] = useState(false);
  const [goal, setGoal] = useState(10);

  const today = todayStr();
  const habitsToday = habits.filter(h => isScheduledOn(h, today));
  const totalDone = habitsToday.filter(h => isDoneOn(h, today)).length;

  const sorted = sortPendingFirst
    ? [...habitsToday].sort((a, b) => Number(isDoneOn(a, today)) - Number(isDoneOn(b, today)))
    : habitsToday;

  const otherDays = habits.filter(h => !isScheduledOn(h, today));
  const consist = consistency7(habits);

  const resetForm = () => {
    setName(''); setEmoji('💊'); setColor(COLORS[0]);
    setFreqType('diario'); setDays([1, 2, 3, 4, 5]);
    setIsCounter(false); setGoal(10);
  };

  const handleCreate = async () => {
    if (!name.trim() || !currentUser) return;
    await addHabit(currentUser.uid, {
      id: Date.now() + Math.random(),
      name: name.trim(),
      emoji,
      color,
      freqType,
      days: freqType === 'dias' ? days : null,
      counter: isCounter,
      goal: isCounter ? goal : null,
    });
    resetForm();
    setShowForm(false);
  };

  const toggleDay = (d) => {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  };

  const toggleDone = async (habit) => {
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

  const changeCount = async (habit, delta) => {
    if (!currentUser) return;
    const current = todayCount(habit);
    const next = Math.max(0, Math.min(habit.goal || 10, current + delta));
    await updateHabit(currentUser.uid, habit.id, { count: next, countDate: today });
    // Bater a meta marca o hábito como feito hoje
    if (next >= (habit.goal || 10) && !isDoneOn(habit, today)) {
      confetti({
        particleCount: 60, spread: 55, origin: { y: 0.7 },
        colors: ['#22d3ee', '#fff', '#888'],
      });
      await setHabitDone(currentUser.uid, habit.id, today, true);
    }
  };

  const handleRemove = async (habit) => {
    if (!currentUser) return;
    if (!window.confirm(`Excluir o hábito "${habit.name}"? O histórico será perdido.`)) return;
    await removeHabit(currentUser.uid, habit.id);
  };

  const HabitRow = ({ habit, inactive }) => {
    const doneToday = isDoneOn(habit, today);
    const count = todayCount(habit);
    const streak = habitStreak(habit);
    const c = habit.color || 'var(--primary)';
    return (
      <motion.div
        className="task-item"
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: inactive ? 0.5 : 1, y: 0 }}
        exit={{ opacity: 0, x: 40 }}
        style={{ borderLeft: `3px solid ${c}` }}
      >
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: doneToday ? 'var(--primary-dark)' : 'var(--surface-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
          border: doneToday ? '1px solid hsla(189,94%,55%,0.4)' : '1px solid var(--border)',
        }}>
          {habit.emoji}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{habit.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-muted)' }}>
            <span>
              {habit.freqType === 'dias' && Array.isArray(habit.days)
                ? habit.days.map(d => WEEKDAY_LABELS[d]).join(', ')
                : 'Diário'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              🔥 {streak} dia{streak !== 1 ? 's' : ''}
            </span>
          </div>
          {habit.counter && !inactive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <button
                onClick={() => changeCount(habit, -1)}
                style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--surface-2)', color: 'var(--fg-muted)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >–</button>
              <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'var(--surface-2)', position: 'relative' }}>
                <div style={{ width: `${(count / (habit.goal || 10)) * 100}%`, height: '100%', background: c, borderRadius: 99 }} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)', minWidth: 32 }}>{count}/{habit.goal || 10}</span>
              <button
                onClick={() => changeCount(habit, +1)}
                style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--surface-2)', color: 'var(--fg-muted)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >+</button>
            </div>
          )}
        </div>

        <button
          onClick={() => handleRemove(habit)}
          title="Excluir hábito"
          style={{ color: 'var(--fg-dim)', padding: 4, flexShrink: 0 }}
        >
          <Trash2 size={14} />
        </button>

        {!inactive && (
          <button
            className={`task-check ${doneToday ? 'done' : ''}`}
            style={{ width: 28, height: 28, flexShrink: 0 }}
            onClick={() => toggleDone(habit)}
          />
        )}
      </motion.div>
    );
  };

  return (
    <div style={{ padding: '24px 16px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 className="page-title">Hábitos</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {habitsToday.length > 1 && (
            <button
              onClick={() => setSortPendingFirst(s => !s)}
              className={`chip ${sortPendingFirst ? 'selected-soft' : ''}`}
              style={{ padding: '6px 14px' }}
            >
              ⇅ Ordenar
            </button>
          )}
          {habitsToday.length > 0 && (
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary)' }}>
              {totalDone}/{habitsToday.length} hoje
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {habitsToday.length > 0 && (
        <div style={{ height: 4, borderRadius: 99, background: 'var(--surface-2)', marginBottom: 16, overflow: 'hidden' }}>
          <motion.div
            style={{ height: '100%', borderRadius: 99, background: 'var(--primary)' }}
            animate={{ width: `${(totalDone / habitsToday.length) * 100}%` }}
            transition={{ type: 'spring', stiffness: 120 }}
          />
        </div>
      )}

      {/* Como o streak funciona */}
      <div className="card" style={{ padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
        🔥 <b>Como o streak funciona:</b> o dia de hoje não zera seu streak enquanto não acabar.
        Um dia passado só quebra a sequência se você fez menos de <b>60%</b> dos hábitos programados naquele dia.
      </div>

      {/* Criar */}
      <button className="btn-outline-primary" style={{ marginBottom: 24, fontSize: 15 }} onClick={() => setShowForm(true)}>
        <Plus size={18} />
        Criar novo hábito
      </button>

      {/* Hábitos de hoje */}
      <p className="section-label" style={{ marginBottom: 12 }}>Hábitos de hoje</p>

      {habitsToday.length === 0 && (
        <div style={{ textAlign: 'center', padding: '18px 0', color: 'var(--fg-dim)', fontSize: 14 }}>
          {habits.length === 0
            ? <>Nenhum hábito ainda.<br /><span style={{ color: 'var(--primary)' }}>Crie o primeiro para começar seu streak! 🔥</span></>
            : 'Nenhum hábito programado para hoje 🎉'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <AnimatePresence>
          {sorted.map(h => <HabitRow key={h.id} habit={h} />)}
        </AnimatePresence>
      </div>

      {/* Hábitos de outros dias */}
      {otherDays.length > 0 && (
        <>
          <p className="section-label" style={{ margin: '20px 0 12px' }}>Outros dias</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {otherDays.map(h => <HabitRow key={h.id} habit={h} inactive />)}
          </div>
        </>
      )}

      {/* Consistência — 7 dias */}
      {habits.length > 0 && (
        <div className="card" style={{ padding: 16, margin: '24px 0' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Consistência — 7 dias</div>
          <div className="week-wheel">
            {consist.map(({ date, score }) => (
              <div key={date} className={`week-day ${date === today ? 'today' : ''}`}>
                <span className="lbl">{WEEKDAY_LABELS[new Date(date + 'T12:00').getDay()]}</span>
                <div
                  className="circle"
                  style={score !== null && score >= 60
                    ? { borderColor: 'var(--primary)', color: 'var(--primary)' }
                    : score !== null
                      ? { borderColor: '#ef4444', color: '#ef4444' }
                      : {}}
                >
                  {score === null ? '—' : `${score}%`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ height: 16 }} />

      {/* Formulário */}
      <BottomSheet
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Novo hábito"
        subtitle="Crie um hábito para acompanhar sua evolução diária."
        footer={
          <button className="btn-primary" onClick={handleCreate} disabled={!name.trim()} style={{ width: '100%', opacity: name.trim() ? 1 : 0.5 }}>
            <Plus size={16} />
            Criar hábito
          </button>
        }
      >
        <div className="field-card">
          <label className="field-label">Nome do hábito</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 24 }}>{emoji}</span>
            <input
              className="field-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Beber água, Meditar..."
              autoFocus
            />
          </div>
          <div className="chip-row" style={{ marginTop: 10 }}>
            {EMOJI_OPTIONS.map(em => (
              <button key={em} type="button" className={`chip ${emoji === em ? 'selected-soft' : ''}`} style={{ padding: '6px 10px', fontSize: 16 }} onClick={() => setEmoji(em)}>
                {em}
              </button>
            ))}
          </div>
        </div>

        <div className="field-card">
          <label className="field-label">Frequência</label>
          <div className="chip-row">
            <button type="button" className={`chip ${freqType === 'diario' ? 'selected' : ''}`} onClick={() => setFreqType('diario')}>Diário</button>
            <button type="button" className={`chip ${freqType === 'dias' ? 'selected' : ''}`} onClick={() => setFreqType('dias')}>Dias específicos</button>
          </div>
          {freqType === 'dias' && (
            <div className="chip-row" style={{ marginTop: 10 }}>
              {WEEKDAY_LABELS.map((l, d) => (
                <button key={d} type="button" className={`chip ${days.includes(d) ? 'selected' : ''}`} style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => toggleDay(d)}>
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="field-card">
          <label className="field-label">Tipo</label>
          <div className="chip-row">
            <button type="button" className={`chip ${!isCounter ? 'selected' : ''}`} onClick={() => setIsCounter(false)}>✓ Check único</button>
            <button type="button" className={`chip ${isCounter ? 'selected' : ''}`} onClick={() => setIsCounter(true)}>🔢 Contador</button>
          </div>
          {isCounter && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fg-muted)', marginTop: 10 }}>
              Meta diária:
              <input
                type="number"
                min={1}
                max={99}
                value={goal}
                onChange={e => setGoal(Math.max(1, Number(e.target.value) || 1))}
                className="field-input"
                style={{ width: 70, padding: '6px 10px' }}
              />
            </label>
          )}
        </div>

        <div className="field-card">
          <label className="field-label">Cor</label>
          <div className="chip-row">
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{
                  width: 32, height: 32, borderRadius: '50%', background: c,
                  border: color === c ? '3px solid var(--fg)' : '3px solid transparent',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
