import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart2, CheckSquare, Zap, Leaf, User, ShieldAlert,
} from 'lucide-react';
import confetti from 'canvas-confetti';

import IAScreen from './screens/IAScreen';
import TarefasScreen from './screens/TarefasScreen';
import DiarioScreen from './screens/DiarioScreen';
import HabitosScreen from './screens/HabitosScreen';
import PerfilScreen from './screens/PerfilScreen';
import LoginScreen from './screens/LoginScreen';
import RAMCache from './components/RAMCache';
import TaskBreakerView from './components/TaskBreakerView';
import AlarmOverlay from './components/AlarmOverlay';
import { useAuth } from './contexts/AuthContext';
import {
  subscribeToTasks, subscribeToHabits, subscribeToProfile, subscribeToAlarms,
  addTask, completeTask, completeAllTasks, removeTask,
  addAlarm, updateAlarm, removeAlarm,
  updateProfile, incrementBreakerUses,
} from './services/firestore';
import { createCalendarEvent, deleteCalendarEvent } from './services/calendar';
import { evaluateAchievements } from './utils/achievements';
import { consistency7 } from './utils/scoring';
import { todayStr } from './utils/dates';

/* ======= BOTTOM NAVIGATION CONFIG ======= */
const TABS = [
  { id: 'diario',  label: 'Diário',  Icon: BarChart2 },
  { id: 'tarefas', label: 'Tarefas', Icon: CheckSquare },
  { id: 'ia',      label: 'IA',      Icon: Zap, primary: true },
  { id: 'habitos', label: 'Hábitos', Icon: Leaf },
  { id: 'perfil',  label: 'Perfil',  Icon: User },
];

export default function App() {
  const { currentUser } = useAuth();

  /* ======= ESTADO GLOBAL ======= */
  const [activeTab, setActiveTab] = useState('ia');
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [alarms, setAlarms] = useState([]);
  const [profile, setProfile] = useState({});
  const [breakerTask, setBreakerTask] = useState(null);     // Descomplicador
  const [circuitMode, setCircuitMode] = useState(false);     // Disjuntor
  const [achToast, setAchToast] = useState(null);            // Conquista desbloqueada
  const [ringingAlarm, setRingingAlarm] = useState(null);    // Alarme tocando agora
  const evaluatingRef = useRef(false);

  const pendingTasks = tasks.filter(t => !t.done);
  const doneTasks = tasks.filter(t => t.done);

  /* ======= FIRESTORE SYNC ======= */
  useEffect(() => {
    if (!currentUser) {
      setTasks([]);
      setHabits([]);
      setProfile({});
      return;
    }
    const unsubTasks = subscribeToTasks(currentUser.uid, setTasks);
    const unsubHabits = subscribeToHabits(currentUser.uid, setHabits);
    const unsubProfile = subscribeToProfile(currentUser.uid, setProfile);
    const unsubAlarms = subscribeToAlarms(currentUser.uid, setAlarms);
    return () => {
      unsubTasks();
      unsubHabits();
      unsubProfile();
      unsubAlarms();
    };
  }, [currentUser]);

  /* ======= WATCHER DE ALARMES: dispara na hora certa ======= */
  useEffect(() => {
    if (!currentUser) return;
    const check = () => {
      if (ringingAlarm) return; // já tem um tocando
      const now = new Date();
      const due = alarms.find(a => !a.fired && new Date(`${a.date}T${a.time}:00`) <= now);
      if (due) setRingingAlarm(due);
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, [alarms, ringingAlarm, currentUser]);

  const stopAlarm = async () => {
    if (!currentUser || !ringingAlarm) return;
    await updateAlarm(currentUser.uid, ringingAlarm.id, { fired: true });
    setRingingAlarm(null);
  };

  const snoozeAlarm = async () => {
    if (!currentUser || !ringingAlarm) return;
    const next = new Date(Date.now() + 10 * 60 * 1000);
    const p = (n) => String(n).padStart(2, '0');
    await updateAlarm(currentUser.uid, ringingAlarm.id, {
      date: next.toLocaleDateString('sv'),
      time: `${p(next.getHours())}:${p(next.getMinutes())}`,
      fired: false,
    });
    setRingingAlarm(null);
  };

  /* ======= CONQUISTAS: avalia a cada mudança de dados ======= */
  useEffect(() => {
    if (!currentUser || evaluatingRef.current) return;
    const week7 = consistency7(habits).map(d => d.score);
    const { unlockedNow, all } = evaluateAchievements(
      { tasks, doneTasks, habits, profile, week7 },
      profile?.achievements || {}
    );
    if (unlockedNow.length > 0) {
      evaluatingRef.current = true;
      updateProfile(currentUser.uid, { achievements: all })
        .finally(() => { evaluatingRef.current = false; });
      // Celebra a primeira da leva
      const a = unlockedNow[0];
      setAchToast(a);
      confetti({
        particleCount: 120, spread: 80, origin: { y: 0.4 },
        colors: ['#22d3ee', '#fff', '#7dd3fc'],
      });
      setTimeout(() => setAchToast(null), 4000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, habits, profile, currentUser]);

  /* ======= CALLBACKS DE TAREFAS ======= */
  // Tarefa rica (vinda do chat da IA ou do formulário completo)
  const handleAddTask = async (taskData) => {
    if (!currentUser) return;
    const task = {
      id: Date.now() + Math.random(),
      emoji: '📝',
      priority: 'media',
      bucket: 'hoje',
      date: null,
      time: null,
      repeat: 'nenhuma',
      durationMin: 30,
      steps: [],
      ...taskData,
    };
    await addTask(currentUser.uid, task);

    // Google Agenda: tarefa com data ou horário vira evento (se conectado)
    if (profile?.gcalEnabled && (task.date || task.time)) {
      try {
        const eventId = await createCalendarEvent({
          title: `${task.emoji} ${task.text}`,
          date: task.date || todayStr(),
          time: task.time,
          durationMin: task.durationMin,
          reminderMin: 10,
        });
        await updateTaskGcal(task.id, eventId);
      } catch (e) {
        console.warn('Não foi possível sincronizar com a Google Agenda', e);
      }
    }
  };

  const updateTaskGcal = async (taskId, eventId) => {
    if (!currentUser || !eventId) return;
    const { updateTask } = await import('./services/firestore');
    await updateTask(currentUser.uid, taskId, { gcalEventId: eventId });
  };

  /* ======= ALARMES ======= */
  const handleAddAlarm = async (alarmData) => {
    if (!currentUser) return;
    // Pede permissão de notificação na primeira vez
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    const alarm = { id: Date.now() + Math.random(), ...alarmData };
    await addAlarm(currentUser.uid, alarm);

    // Backup na Google Agenda: o celular toca mesmo com o app fechado
    if (profile?.gcalEnabled) {
      try {
        const eventId = await createCalendarEvent({
          title: `⏰ ${alarm.text}`,
          date: alarm.date,
          time: alarm.time,
          durationMin: 5,
          reminderMin: 0,
        });
        await updateAlarm(currentUser.uid, alarm.id, { gcalEventId: eventId });
      } catch (e) {
        console.warn('Alarme criado, mas sem backup na Google Agenda', e);
      }
    }
  };

  const handleDeleteAlarm = async (alarm) => {
    if (!currentUser) return;
    if (alarm.gcalEventId) deleteCalendarEvent(alarm.gcalEventId);
    await removeAlarm(currentUser.uid, alarm.id);
  };

  const handleCompleteTask = async (id) => {
    if (!currentUser) return;
    await completeTask(currentUser.uid, id);
    setBreakerTask(null);
    setCircuitMode(false);
  };

  const handleCompleteAll = async () => {
    if (!currentUser) return;
    await completeAllTasks(currentUser.uid, pendingTasks.map(t => t.id));
  };

  const handleDeleteTask = async (id) => {
    if (!currentUser) return;
    const task = tasks.find(t => t.id === id);
    if (task?.gcalEventId) deleteCalendarEvent(task.gcalEventId); // remove da Agenda também
    await removeTask(currentUser.uid, id);
  };

  /* ======= CALLBACKS DE OVERLAYS ======= */
  const openBreaker = (task) => {
    setBreakerTask(task);
    setCircuitMode(false);
    if (currentUser) incrementBreakerUses(currentUser.uid); // conquista "Diretor"
  };

  const enterCircuitBreaker = () => {
    if (pendingTasks.length > 0) {
      setCircuitMode(true);
    }
  };

  const exitCircuitBreaker = () => {
    setCircuitMode(false);
  };

  /* ======= RENDER DA ABA ATIVA ======= */
  const renderScreen = () => {
    switch (activeTab) {
      case 'tarefas':
        return (
          <TarefasScreen
            tasks={tasks}
            onComplete={handleCompleteTask}
            onDelete={handleDeleteTask}
            onAddTask={handleAddTask}
            onOpenBreaker={openBreaker}
          />
        );
      case 'diario':
        return (
          <DiarioScreen
            pendingTasks={pendingTasks}
            doneTasks={doneTasks}
            habits={habits}
            alarms={alarms}
            onComplete={handleCompleteTask}
            onCompleteAll={handleCompleteAll}
            onOpenBreaker={openBreaker}
            onDeleteAlarm={handleDeleteAlarm}
          />
        );
      case 'habitos':
        return <HabitosScreen habits={habits} />;
      case 'perfil':
        return (
          <PerfilScreen
            tasks={pendingTasks}
            doneTasks={doneTasks}
            habits={habits}
            profile={profile}
          />
        );
      case 'ia':
      default:
        return (
          <IAScreen
            pendingTasks={pendingTasks}
            energy={profile?.energy || null}
            onAddTask={handleAddTask}
            onAddAlarm={handleAddAlarm}
            onCircuitBreaker={enterCircuitBreaker}
          />
        );
    }
  };

  // Se não estiver logado, mostra apenas a tela de login
  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <>
      {/* ======= TELA ATIVA ======= */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          className="app-screen"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>

      {/* ======= TOAST DE CONQUISTA ======= */}
      <AnimatePresence>
        {achToast && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            style={{
              position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
              zIndex: 500, background: 'var(--surface)', border: '1px solid var(--primary)',
              borderRadius: 'var(--radius-lg)', padding: '12px 20px',
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: '0 12px 32px -8px rgba(0,0,0,0.7)',
              maxWidth: 'calc(100vw - 32px)',
            }}
          >
            <span style={{ fontSize: 26 }}>{achToast.emoji}</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.08em' }}>
                CONQUISTA DESBLOQUEADA
              </div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{achToast.name}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{achToast.desc}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======= BOTTOM NAVIGATION ======= */}
      <nav className="bottom-nav">
        {TABS.map(({ id, label, Icon, primary }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`nav-item ${primary ? 'nav-item-ia' : ''} ${activeTab === id && !primary ? 'active' : ''}`}
          >
            <span className="nav-icon-wrap">
              <Icon size={primary ? 20 : 22} strokeWidth={activeTab === id ? 2.5 : 1.8} />
            </span>
            {!primary && <span>{label}</span>}
          </button>
        ))}
      </nav>

      {/* ======= MEMÓRIA RAM EXTERNA (flutuante) ======= */}
      <RAMCache />

      {/* ======= CIRCUIT BREAKER OVERLAY (Disjuntor) ======= */}
      <AnimatePresence>
        {circuitMode && pendingTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              zIndex: 300,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              maxWidth: 430,
              margin: '0 auto',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', damping: 20 }}
              style={{ textAlign: 'center', maxWidth: 360 }}
            >
              {/* Ícone */}
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '2px solid rgba(239, 68, 68, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <ShieldAlert size={32} color="#ef4444" />
              </div>

              {/* Título */}
              <h2 style={{
                fontSize: 26, fontWeight: 800, marginBottom: 12,
                letterSpacing: '-0.5px', lineHeight: 1.2,
              }}>
                Sobrecarga Detectada
              </h2>
              <p style={{
                color: 'var(--fg-muted)', fontSize: 15, lineHeight: 1.6,
                marginBottom: 32,
              }}>
                Esqueça a lista inteira. Esqueça o amanhã.<br />
                A única coisa que importa agora é isso:
              </p>

              {/* A ÚNICA tarefa */}
              <div className="card" style={{
                padding: 20,
                borderLeft: '3px solid var(--primary)',
                marginBottom: 28,
                textAlign: 'left',
              }}>
                <h3 style={{
                  fontSize: 20, fontWeight: 700, margin: 0,
                  color: 'var(--primary)', lineHeight: 1.4,
                }}>
                  {pendingTasks[0].text}
                </h3>
              </div>

              {/* Ações */}
              <button
                className="btn-primary"
                onClick={() => openBreaker(pendingTasks[0])}
                style={{ marginBottom: 16 }}
              >
                <Zap size={18} />
                Focar Apenas Nisso
              </button>

              <button
                className="btn-ghost"
                onClick={exitCircuitBreaker}
                style={{ display: 'block', margin: '0 auto' }}
              >
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======= TASK BREAKER VIEW (Descomplicador) ======= */}
      <AnimatePresence>
        {breakerTask && (
          <TaskBreakerView
            key={breakerTask.id}
            task={breakerTask}
            onComplete={handleCompleteTask}
            onClose={() => setBreakerTask(null)}
          />
        )}
      </AnimatePresence>

      {/* ======= ALARME TOCANDO ======= */}
      <AnimatePresence>
        {ringingAlarm && (
          <AlarmOverlay
            alarm={ringingAlarm}
            onStop={stopAlarm}
            onSnooze={snoozeAlarm}
          />
        )}
      </AnimatePresence>
    </>
  );
}
