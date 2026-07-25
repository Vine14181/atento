import React, { useState } from 'react';
import BottomSheet from './BottomSheet';

const QUESTIONS = [
  { key: 'peak',          label: 'Em que horário você se sente mais produtivo?', options: ['6h-9h', '9h-12h', '14h-17h', '20h-23h'] },
  { key: 'coffee',        label: 'Quanto café você toma por dia?', options: ['0', '1-2 xícaras', '3-4 xícaras', '5+'] },
  { key: 'sleep',         label: 'Como está seu sono?', options: ['Ruim', 'Irregular', 'Ok', 'Ótimo'] },
  { key: 'challenge',     label: 'Qual seu maior desafio?', options: ['Começar tarefas', 'Manter foco', 'Finalizar', 'Priorizar'] },
  { key: 'exercise',      label: 'Nível de exercício semanal?', options: ['Nenhum', '1-2x', '3-4x', '5+'] },
  { key: 'interruptions', label: 'Como você lida com interrupções?', options: ['Me perco total', 'Demoro a voltar', 'Volto rápido', 'Não me afeta'] },
  { key: 'music',         label: 'Prefere trabalhar com música?', options: ['Silêncio', 'Lo-fi/ambiente', 'Música com letra', 'Depende'] },
  { key: 'focusSpan',     label: 'Quanto tempo consegue focar sem pausas?', options: ['5-10min', '15-25min', '30-45min', '1h+'] },
];

/**
 * Questionário de Perfil de Energia (8 perguntas) — as respostas alimentam
 * o contexto da IA para dicas personalizadas.
 */
export default function EnergyProfileSheet({ open, onClose, initial, onSave }) {
  const [answers, setAnswers] = useState(initial || {});

  const complete = QUESTIONS.every(q => answers[q.key]);

  const handleSave = () => {
    onSave(answers);
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="⚡ Perfil de Energia"
      subtitle="Responda para personalizar sua experiência"
      footer={
        <button className="btn-primary" onClick={handleSave} disabled={!complete} style={{ width: '100%', opacity: complete ? 1 : 0.5 }}>
          Salvar perfil de energia
        </button>
      }
    >
      {QUESTIONS.map(q => (
        <div key={q.key} className="field-card">
          <label className="field-label">{q.label}</label>
          <div className="chip-row">
            {q.options.map(opt => (
              <button
                key={opt}
                type="button"
                className={`chip ${answers[q.key] === opt ? 'selected' : ''}`}
                onClick={() => setAnswers(a => ({ ...a, [q.key]: opt }))}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}
    </BottomSheet>
  );
}
