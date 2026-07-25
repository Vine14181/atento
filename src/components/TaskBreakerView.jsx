import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Zap, Circle, CheckCircle2, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { breakDownTask } from '../gemini';

/**
 * TaskBreakerView — O Descomplicador
 * Recebe uma tarefa e gera micro-passos via Gemini.
 * O usuário vai riscando os passos e ganha confetes.
 *
 * Props:
 *   task:       { id, text }
 *   onComplete: (taskId) => void   — chamado quando TODA a tarefa é concluída
 *   onClose:    () => void         — volta para a tela anterior
 */
export default function TaskBreakerView({ task, onComplete, onClose }) {
  // Se a tarefa já veio com micro-passos da IA, mostra direto (sem nova chamada)
  const initialSteps = Array.isArray(task.steps) && task.steps.length > 0
    ? task.steps.map((text, i) => ({ id: i + 1, text: String(text), done: false }))
    : [];

  const [steps, setSteps] = useState(initialSteps);
  const [isBreaking, setIsBreaking] = useState(false);
  const [hasStarted, setHasStarted] = useState(initialSteps.length > 0);

  const handleBreakDown = async () => {
    setIsBreaking(true);
    setHasStarted(true);

    const rawSteps = await breakDownTask(task.text);

    const formatted = rawSteps.map((text, i) => ({
      id: i + 1,
      text: typeof text === 'string' ? text : String(text),
      done: false,
    }));

    setSteps(formatted);
    setIsBreaking(false);
  };

  const toggleStep = (stepId) => {
    setSteps((prev) =>
      prev.map((s) => {
        if (s.id === stepId && !s.done) {
          // Confete ao completar um passo
          confetti({
            particleCount: 40,
            spread: 45,
            origin: { y: 0.75 },
            colors: ['#22d3ee', '#ffffff', '#888'],
          });
          return { ...s, done: true };
        }
        return s;
      })
    );
  };

  const allDone = steps.length > 0 && steps.every((s) => s.done);
  const doneCount = steps.filter((s) => s.done).length;

  const handleFinish = () => {
    // Grande explosão de confetes
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#22d3ee', '#ffffff', '#888', '#7dd3fc'],
    });
    onComplete(task.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 430,
        margin: '0 auto',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button onClick={onClose} style={{ color: 'var(--fg-muted)', padding: 4 }}>
          <ArrowLeft size={22} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--primary-dark)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={16} color="var(--primary)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Descomplicador</div>
            <div style={{ fontSize: 11, color: 'var(--fg-dim)' }}>Gemini IA</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Tarefa selecionada */}
        <div className="card" style={{
          padding: 16,
          borderLeft: '3px solid var(--primary)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 8 }}>
            Tarefa selecionada
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
            {task.text}
          </h3>
        </div>

        {/* Estado: não começou ainda */}
        {!hasStarted && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '32px 16px' }}
          >
            <p style={{ color: 'var(--fg-muted)', fontSize: 15, marginBottom: 8, lineHeight: 1.6 }}>
              Essa tarefa parece muito grande?
            </p>
            <p style={{ color: 'var(--fg-dim)', fontSize: 14, marginBottom: 28 }}>
              A IA vai quebrar em passos tão pequenos que é impossível não começar.
            </p>
            <button className="btn-primary" onClick={handleBreakDown}>
              <Zap size={18} />
              Me ajude a começar
            </button>
          </motion.div>
        )}

        {/* Estado: carregando */}
        {isBreaking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '40px 0' }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ display: 'inline-block', marginBottom: 16 }}
            >
              <Loader2 size={32} color="var(--primary)" />
            </motion.div>
            <p style={{ color: 'var(--fg-muted)', fontSize: 14 }}>
              A IA está quebrando a tarefa em micro-passos...
            </p>
          </motion.div>
        )}

        {/* Estado: passos gerados */}
        {steps.length > 0 && !isBreaking && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Progresso */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden' }}>
                <motion.div
                  style={{ height: '100%', borderRadius: 99, background: 'var(--primary)' }}
                  animate={{ width: `${(doneCount / steps.length) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 120 }}
                />
              </div>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)', fontWeight: 600, minWidth: 40, textAlign: 'right' }}>
                {doneCount}/{steps.length}
              </span>
            </div>

            {/* Lista de passos */}
            <AnimatePresence>
              {steps.map((step, index) => (
                <motion.button
                  key={step.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 }}
                  onClick={() => !step.done && toggleStep(step.id)}
                  className="suggestion-step"
                  style={{
                    cursor: step.done ? 'default' : 'pointer',
                    opacity: step.done ? 0.5 : 1,
                    textDecoration: step.done ? 'line-through' : 'none',
                    transition: 'opacity 0.3s, background 0.2s',
                    background: step.done ? 'var(--primary-dark)' : 'var(--surface)',
                    borderColor: step.done ? 'hsla(189,94%,55%,0.4)' : 'var(--border)',
                    width: '100%',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                >
                  {step.done ? (
                    <CheckCircle2 size={18} color="var(--primary)" />
                  ) : (
                    <Circle size={18} color="var(--fg-dim)" />
                  )}
                  <span style={{ flex: 1, fontSize: 14, lineHeight: 1.4 }}>{step.text}</span>
                </motion.button>
              ))}
            </AnimatePresence>

            {/* Botão de concluir quando todos os passos feitos */}
            <AnimatePresence>
              {allDone && (
                <motion.div
                  initial={{ opacity: 0, y: 16, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  style={{ marginTop: 16 }}
                >
                  <button className="btn-primary" onClick={handleFinish}>
                    <CheckCircle2 size={18} />
                    Concluir Tarefa Oficialmente 🎉
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
