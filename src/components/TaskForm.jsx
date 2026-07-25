import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { todayStr } from '../utils/dates';

const EMOJIS = ['📝', '💳', '📞', '🛒', '🏠', '💼', '🏥', '🚗', '📧', '🎁'];
const DURATIONS = [5, 15, 30, 45, 60, 90];

/**
 * Formulário completo de tarefa (estilo AIBro): título+emoji, prioridade,
 * quando (hoje/semana/quando puder/data), horário, repetição, duração.
 */
export default function TaskForm({ open, onClose, onSave, initialDate = null }) {
  const [text, setText] = useState('');
  const [emoji, setEmoji] = useState('📝');
  const [priority, setPriority] = useState('media');
  const [bucket, setBucket] = useState(initialDate ? 'data' : 'hoje');
  const [date, setDate] = useState(initialDate || todayStr());
  const [time, setTime] = useState('');
  const [repeat, setRepeat] = useState('nenhuma');
  const [durationMin, setDurationMin] = useState(30);

  const reset = () => {
    setText(''); setEmoji('📝'); setPriority('media');
    setBucket('hoje'); setDate(todayStr()); setTime('');
    setRepeat('nenhuma'); setDurationMin(30);
  };

  const handleSave = () => {
    if (!text.trim()) return;
    onSave({
      text: text.trim(),
      emoji,
      priority,
      bucket,
      date: bucket === 'data' ? date : null,
      time: time || null,
      repeat,
      durationMin,
      steps: [],
    });
    reset();
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Nova tarefa"
      subtitle="Organize o que fazer."
      footer={
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={!text.trim()}
          style={{ width: '100%', opacity: text.trim() ? 1 : 0.5 }}
        >
          <Plus size={16} />
          Criar tarefa
        </button>
      }
    >
      <div className="field-card">
        <label className="field-label">Título</label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 24 }}>{emoji}</span>
          <input
            className="field-input"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Título da tarefa"
            autoFocus
          />
        </div>
        <div className="chip-row" style={{ marginTop: 10 }}>
          {EMOJIS.map(em => (
            <button
              key={em}
              type="button"
              className={`chip ${emoji === em ? 'selected-soft' : ''}`}
              style={{ padding: '6px 10px', fontSize: 16 }}
              onClick={() => setEmoji(em)}
            >
              {em}
            </button>
          ))}
        </div>
      </div>

      <div className="field-card">
        <label className="field-label">Prioridade</label>
        <div className="chip-row">
          {[['alta', 'Alta'], ['media', 'Média'], ['baixa', 'Baixa']].map(([v, l]) => (
            <button key={v} type="button" className={`chip ${priority === v ? 'selected' : ''}`} onClick={() => setPriority(v)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="field-card">
        <label className="field-label">Quando</label>
        <div className="chip-row">
          {[['hoje', '🔥 Hoje'], ['semana', '⏳ Esta semana'], ['quando', '💤 Quando puder'], ['data', '📅 Data específica']].map(([v, l]) => (
            <button key={v} type="button" className={`chip ${bucket === v ? 'selected' : ''}`} onClick={() => setBucket(v)}>
              {l}
            </button>
          ))}
        </div>
        {bucket === 'data' && (
          <input
            type="date"
            className="field-input"
            style={{ marginTop: 10 }}
            value={date}
            min={todayStr()}
            onChange={e => setDate(e.target.value)}
          />
        )}
        <label className="field-label" style={{ marginTop: 12 }}>Horário (opcional)</label>
        <input
          type="time"
          className="field-input"
          value={time}
          onChange={e => setTime(e.target.value)}
        />
      </div>

      <div className="field-card">
        <label className="field-label">Duração estimada</label>
        <div className="chip-row">
          {DURATIONS.map(d => (
            <button key={d} type="button" className={`chip ${durationMin === d ? 'selected' : ''}`} onClick={() => setDurationMin(d)}>
              {d >= 60 ? `${d / 60}h${d % 60 ? d % 60 : ''}` : `${d}min`}
            </button>
          ))}
        </div>
      </div>

      <div className="field-card">
        <label className="field-label">Repetição</label>
        <div className="chip-row">
          {[['nenhuma', 'Nenhuma'], ['diaria', 'Diária'], ['semanal', 'Semanal'], ['quinzenal', 'Quinzenal'], ['mensal', 'Mensal']].map(([v, l]) => (
            <button key={v} type="button" className={`chip ${repeat === v ? 'selected' : ''}`} onClick={() => setRepeat(v)}>
              {l}
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}
