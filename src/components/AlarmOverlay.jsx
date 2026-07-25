import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlarmClock, BellOff, Clock } from 'lucide-react';
import { playAlarmSound } from '../utils/alarmSound';

/**
 * Tela cheia quando um alarme dispara: som alto + vibração + ações.
 * onSnooze adia 10 minutos; onStop desliga.
 */
export default function AlarmOverlay({ alarm, onSnooze, onStop }) {
  const stopSoundRef = useRef(null);

  useEffect(() => {
    stopSoundRef.current = playAlarmSound();
    // Notificação do sistema (se permitido) — ajuda quando a aba está em segundo plano
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification('⏰ ' + alarm.text, {
          body: 'Alarme do Atento',
          tag: `alarm-${alarm.id}`,
        });
      } catch { /* alguns navegadores restringem */ }
    }
    return () => stopSoundRef.current?.();
  }, [alarm]);

  const stopAll = (fn) => () => {
    stopSoundRef.current?.();
    fn();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'radial-gradient(ellipse 100% 60% at 50% 0%, hsl(192 80% 12%), hsl(210 35% 3%))',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 24, maxWidth: 430, margin: '0 auto', textAlign: 'center',
      }}
    >
      <motion.div
        animate={{ rotate: [0, -12, 12, -12, 12, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.4 }}
        style={{
          width: 110, height: 110, borderRadius: '50%',
          background: 'var(--grad-primary)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', marginBottom: 32,
          boxShadow: '0 0 60px -8px hsl(189 94% 55% / 0.7)',
        }}
      >
        <AlarmClock size={52} color="var(--primary-text)" />
      </motion.div>

      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', color: 'var(--primary)', marginBottom: 10 }}>
        ⏰ ALARME
      </div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, marginBottom: 8, lineHeight: 1.2 }}>
        {alarm.text}
      </h1>
      <p style={{ color: 'var(--fg-muted)', fontSize: 15, marginBottom: 48 }}>
        {alarm.time}
      </p>

      <button className="btn-primary" onClick={stopAll(onStop)} style={{ marginBottom: 14, maxWidth: 300 }}>
        <BellOff size={18} />
        Parar
      </button>
      <button
        className="btn-ghost"
        onClick={stopAll(onSnooze)}
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <Clock size={15} />
        Soneca — 10 minutos
      </button>
    </motion.div>
  );
}
