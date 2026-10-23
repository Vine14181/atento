import React, { useState } from 'react';
import { Check } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { useAuth } from '../contexts/AuthContext';
import { addAiReport } from '../services/firestore';
import { withTimeout } from '../utils/timeout';

const REASONS = [
  { id: 'ofensivo', label: 'Ofensivo ou impróprio' },
  { id: 'perigoso', label: 'Perigoso ou prejudicial' },
  { id: 'incorreto', label: 'Errado ou sem sentido' },
  { id: 'outro', label: 'Outro motivo' },
];

/**
 * Denúncia de conteúdo gerado pela IA, sem sair do app (exigência da política
 * de conteúdo gerado por IA da Google Play). Guarda o trecho denunciado junto,
 * para o desenvolvedor saber exatamente o que a IA respondeu.
 */
export default function ReportAiSheet({ open, onClose, feature, aiText }) {
  const { currentUser } = useAuth();
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error

  const close = () => {
    setReason('');
    setComment('');
    setStatus('idle');
    onClose();
  };

  const send = async () => {
    if (!reason || status === 'sending' || !currentUser) return;
    setStatus('sending');
    try {
      await withTimeout(addAiReport(currentUser.uid, {
        feature,
        reason,
        comment: comment.trim().slice(0, 1000),
        aiText: String(aiText || '').slice(0, 4000),
      }), 15000);
      setStatus('sent');
    } catch (e) {
      console.error('Falha ao enviar a denúncia', e);
      setStatus('error');
    }
  };

  const sent = status === 'sent';

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title="Denunciar resposta da IA"
      subtitle="A denúncia vai para o desenvolvedor do app."
      footer={sent ? (
        <button className="btn-primary" onClick={close} style={{ width: '100%' }}>Fechar</button>
      ) : (
        <button
          className="btn-primary"
          onClick={send}
          disabled={!reason || status === 'sending'}
          style={{ width: '100%', opacity: reason && status !== 'sending' ? 1 : 0.5 }}
        >
          {status === 'sending' ? 'Enviando…' : 'Enviar denúncia'}
        </button>
      )}
    >
      {sent ? (
        <div className="field-card" role="status" style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, lineHeight: 1.5 }}>
          <Check size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
          Obrigado! Sua denúncia foi registrada e será analisada.
        </div>
      ) : (
        <>
          <div className="field-card">
            <label className="field-label">O que houve de errado?</label>
            <div className="chip-row">
              {REASONS.map(r => (
                <button
                  key={r.id}
                  type="button"
                  className={`chip ${reason === r.id ? 'selected' : ''}`}
                  onClick={() => setReason(r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field-card">
            <label className="field-label" htmlFor="report-comment">Comentário (opcional)</label>
            <textarea
              id="report-comment"
              className="field-input"
              value={comment}
              onChange={e => setComment(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Conte mais, se quiser"
              style={{ resize: 'none', fontFamily: 'inherit' }}
            />
          </div>
          {status === 'error' && (
            <div role="alert" style={{
              background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
              padding: 12, borderRadius: 10, fontSize: 14,
            }}>
              Não foi possível enviar. Verifique a internet e tente de novo.
            </div>
          )}
        </>
      )}
    </BottomSheet>
  );
}
