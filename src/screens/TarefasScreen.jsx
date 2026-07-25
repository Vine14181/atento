import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, ChevronRight, ChevronDown, ChevronLeft, CheckCircle2, Zap, Trash2, Clock,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import TaskForm from '../components/TaskForm';
import { todayStr, addDays, weekStartOf, WEEKDAY_LABELS, toDateStr } from '../utils/dates';

const PRIORITY_COLOR = { alta: '#ef4444', media: '#eab308', baixa: '#22c55e' };

// Em qual grupo a tarefa pendente aparece
const bucketOf = (task) => {
  if (task.done) return 'concluidas';
  const b = task.bucket || 'hoje';
  if (b === 'data') {
    if (!task.date || task.date <= todayStr()) return 'hoje'; // data chegou (ou passou) = hoje
    return 'agendadas';
  }
  return b;
};

function TaskRow({ task, group, onComplete, onDelete, onOpenBreaker }) {
  const isDone = group === 'concluidas';
  return (
    <motion.div
      className="task-item"
      style={isDone ? { opacity: 0.55 } : undefined}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: isDone ? 0.55 : 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
    >
      {isDone ? (
        <div className="task-check done">
          <CheckCircle2 size={14} color="var(--primary-text)" />
        </div>
      ) : (
        <button className="task-check" onClick={() => onComplete(task.id)} title="Marcar como concluída" />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600, fontSize: 15, marginBottom: 4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          textDecoration: isDone ? 'line-through' : 'none',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>{task.emoji || '📝'}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.text}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, color: 'var(--fg-muted)', fontSize: 12, alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Clock size={11} /> {task.durationMin || 30}min
          </span>
          {task.priority && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.media, display: 'inline-block' }} />
              {task.priority === 'alta' ? 'Alta' : task.priority === 'baixa' ? 'Baixa' : 'Média'}
            </span>
          )}
          {task.date && <span>📅 {task.date.split('-').reverse().slice(0, 2).join('/')}</span>}
          {task.time && <span>{task.time}</span>}
          <span>{task.steps?.length || 0} etapas</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        {isDone ? (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            title="Excluir permanentemente"
            style={{ color: 'var(--fg-dim)', padding: 6 }}
          >
            <Trash2 size={14} />
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenBreaker(task); }}
            title="Descomplicar com IA"
            style={{
              color: 'var(--primary)', background: 'var(--primary-dark)',
              borderRadius: 8, padding: '6px 8px',
              border: '1px solid hsla(189,94%,55%,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Zap size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ===================== AGENDA (calendário) ===================== */

function Agenda({ tasks, onComplete, onDelete, onOpenBreaker, onCreateForDay }) {
  const [view, setView] = useState('mes');
  const [selectedDay, setSelectedDay] = useState(todayStr());
  const [monthAnchor, setMonthAnchor] = useState(todayStr().slice(0, 7)); // YYYY-MM

  // Tarefas com data explícita + tarefas "hoje" aparecem no dia de hoje
  const tasksOn = (dateStr) => tasks.filter(t => {
    if (t.date) return t.date === dateStr;
    return dateStr === todayStr() && !t.done && (t.bucket || 'hoje') === 'hoje';
  });

  const [year, month] = monthAnchor.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const gridStart = addDays(toDateStr(firstDay), -firstDay.getDay());

  const changeMonth = (delta) => {
    const d = new Date(year, month - 1 + delta, 1);
    setMonthAnchor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthLabel = firstDay.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const days = view === 'mes'
    ? Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
    : view === 'semana'
      ? Array.from({ length: 7 }, (_, i) => addDays(weekStartOf(selectedDay), i))
      : [selectedDay];

  const dayTasks = tasksOn(selectedDay);

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 className="page-title" style={{ fontSize: 22 }}>Agenda</h2>
        <div className="chip-row">
          {[['mes', 'Mês'], ['semana', 'Semana'], ['dia', 'Dia']].map(([v, l]) => (
            <button key={v} className={`chip ${view === v ? 'selected' : ''}`} style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setView(v)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {view === 'mes' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <button onClick={() => changeMonth(-1)} style={{ color: 'var(--fg-muted)', padding: 6 }}><ChevronLeft size={16} /></button>
            <span style={{ fontWeight: 700, fontSize: 14, textTransform: 'capitalize' }}>{monthLabel}</span>
            <button onClick={() => changeMonth(1)} style={{ color: 'var(--fg-muted)', padding: 6 }}><ChevronRight size={16} /></button>
          </div>
          <div className="cal-grid">
            {WEEKDAY_LABELS.map(d => <div key={d} className="cal-head">{d}</div>)}
            {days.map(d => {
              const inMonth = d.slice(0, 7) === monthAnchor;
              const isToday = d === todayStr();
              const has = tasksOn(d).length > 0;
              return (
                <button
                  key={d}
                  className={`cal-day ${inMonth ? '' : 'other'} ${isToday ? 'today' : ''} ${d === selectedDay ? 'selected' : ''}`}
                  onClick={() => setSelectedDay(d)}
                >
                  {Number(d.slice(8))}
                  {has && <span className="dot" />}
                </button>
              );
            })}
          </div>
        </>
      )}

      {view === 'semana' && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {days.map(d => {
            const isToday = d === todayStr();
            const has = tasksOn(d).length > 0;
            return (
              <button
                key={d}
                className={`cal-day ${isToday ? 'today' : ''} ${d === selectedDay ? 'selected' : ''}`}
                style={{ flex: 1, aspectRatio: 'auto', padding: '10px 0' }}
                onClick={() => setSelectedDay(d)}
              >
                <span style={{ fontSize: 10, color: 'var(--fg-dim)' }}>{WEEKDAY_LABELS[new Date(d + 'T12:00').getDay()]}</span>
                {Number(d.slice(8))}
                {has && <span className="dot" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Tarefas do dia selecionado */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span className="section-label">
            {selectedDay === todayStr() ? 'Hoje' : selectedDay.split('-').reverse().slice(0, 2).join('/')}
          </span>
          <span style={{ fontSize: 11, color: 'var(--fg-dim)' }}>{dayTasks.length} tarefa{dayTasks.length !== 1 ? 's' : ''}</span>
        </div>

        {dayTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '14px 0 6px', color: 'var(--fg-dim)', fontSize: 14 }}>
            Nenhuma tarefa neste dia 🌿
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dayTasks.map(t => (
              <TaskRow key={t.id} task={t} group={t.done ? 'concluidas' : 'dia'} onComplete={onComplete} onDelete={onDelete} onOpenBreaker={onOpenBreaker} />
            ))}
          </div>
        )}

        <button
          className="btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '10px auto 0', color: 'var(--primary)' }}
          onClick={() => onCreateForDay(selectedDay)}
        >
          <Plus size={14} /> Criar tarefa para este dia
        </button>
      </div>
    </div>
  );
}

/* ===================== TELA ===================== */

const GROUPS = [
  { id: 'hoje',       label: 'Hoje',          emoji: '🔥' },
  { id: 'semana',     label: 'Esta Semana',   emoji: '⏳' },
  { id: 'agendadas',  label: 'Agendadas',     emoji: '📅' },
  { id: 'quando',     label: 'Quando Puder',  emoji: '💤' },
  { id: 'concluidas', label: 'Concluídas',    emoji: '✅' },
];

export default function TarefasScreen({ tasks, onComplete, onDelete, onAddTask, onOpenBreaker }) {
  const [openGroups, setOpenGroups] = useState({ hoje: true });
  const [formOpen, setFormOpen] = useState(false);
  const [formDate, setFormDate] = useState(null);

  const toggleGroup = (id) => setOpenGroups(g => ({ ...g, [id]: !g[id] }));

  const handleComplete = (taskId) => {
    confetti({
      particleCount: 80, spread: 60, origin: { y: 0.6 },
      colors: ['#22d3ee', '#fff', '#888'],
    });
    onComplete(taskId);
  };

  const grouped = Object.fromEntries(GROUPS.map(g => [g.id, []]));
  for (const t of tasks) grouped[bucketOf(t)]?.push(t);
  const pendingCount = tasks.filter(t => !t.done).length;

  const openForm = (date = null) => {
    setFormDate(date);
    setFormOpen(true);
  };

  return (
    <div style={{ padding: '24px 16px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 className="page-title">Tarefas</h1>
        <div style={{ color: 'var(--fg-muted)', fontSize: 13, fontWeight: 500, position: 'relative' }}>
          Pendentes
          {pendingCount > 0 && (
            <span style={{
              position: 'absolute', top: -8, right: -8,
              background: 'var(--primary)', color: 'var(--primary-text)',
              borderRadius: 99, fontSize: 10, padding: '1px 5px', fontWeight: 700,
            }}>{pendingCount}</span>
          )}
        </div>
      </div>

      {/* Criar nova tarefa */}
      <button className="btn-outline-primary" style={{ marginBottom: 24, fontSize: 15 }} onClick={() => openForm()}>
        <Plus size={18} />
        Criar nova tarefa
      </button>

      {/* Grupos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {GROUPS.map(group => {
          const groupTasks = grouped[group.id];
          const isOpen = openGroups[group.id];

          return (
            <div key={group.id}>
              <button
                onClick={() => toggleGroup(group.id)}
                className="section-group-header"
                style={{ width: '100%', cursor: 'pointer', background: 'none', border: 'none' }}
              >
                {isOpen
                  ? <ChevronDown size={15} color="var(--fg-dim)" />
                  : <ChevronRight size={15} color="var(--fg-dim)" />}
                <span style={{ fontSize: 12 }}>{group.emoji}</span>
                <span className="section-label">{group.label}</span>
                <span style={{
                  marginLeft: 4, background: 'var(--surface-2)', borderRadius: 99,
                  padding: '1px 8px', fontSize: 11, color: 'var(--fg-muted)', fontWeight: 600,
                }}>
                  {groupTasks.length}
                </span>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 16 }}>
                      {groupTasks.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '14px 0', color: 'var(--fg-dim)', fontSize: 13 }}>
                          {group.id === 'hoje' ? 'Nada para hoje' : group.id === 'concluidas' ? 'Nenhuma concluída ainda' : 'Vazio'}
                        </div>
                      ) : (
                        <AnimatePresence>
                          {groupTasks.map(task => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              group={group.id}
                              onComplete={handleComplete}
                              onDelete={onDelete}
                              onOpenBreaker={onOpenBreaker}
                            />
                          ))}
                        </AnimatePresence>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Agenda com calendário */}
      <Agenda
        tasks={tasks}
        onComplete={handleComplete}
        onDelete={onDelete}
        onOpenBreaker={onOpenBreaker}
        onCreateForDay={(d) => openForm(d)}
      />

      <div style={{ height: 24 }} />

      {/* Formulário em bottom sheet */}
      <TaskForm
        key={formDate || 'default'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={onAddTask}
        initialDate={formDate}
      />
    </div>
  );
}
