import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Send, CheckSquare, Calendar, ShieldAlert, Zap,
  Sparkles, StickyNote, Clock, Check, Plus,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { chatWithAtento, transcribeAudio } from '../gemini';
import { useAuth } from '../contexts/AuthContext';
import { isVip } from '../utils/vip';

const QUICK_ACTIONS = [
  { id: 'task',    icon: <CheckSquare size={18} />, label: 'Cadastrar tarefa' },
  { id: 'day',     icon: <Calendar size={18} />,    label: 'Organizar meu dia' },
  { id: 'week',    icon: <Calendar size={18} />,    label: 'Organizar semana' },
  { id: 'stuck',   icon: <ShieldAlert size={18} />, label: 'Estou travado' },
];

const PRIORITY_STYLE = {
  alta:  { label: 'Alta',  color: '#ef4444' },
  media: { label: 'Média', color: '#eab308' },
  baixa: { label: 'Baixa', color: '#22c55e' },
};

const BUCKET_LABEL = { hoje: '🔥 Hoje', semana: '⏳ Esta semana', quando: '💤 Quando puder', data: '📅' };

// Ditado por voz: grava o áudio e manda para o Gemini transcrever
// (mesmo motor multimodal do app do Gemini — muito mais preciso que a
// Web Speech API do navegador, que errava muito em português).
const hasMic =
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
const RECORDER_MIME_TYPES = ['audio/webm', 'audio/mp4', 'audio/ogg'];

export default function IAScreen({ pendingTasks, energy, onAddTask, onAddAlarm, onCircuitBreaker }) {
  const { currentUser } = useAuth();
  const vip = isVip(currentUser?.email);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [addedIds, setAddedIds] = useState({}); // sugestões já adicionadas
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const toggleRecording = async () => {
    if (!hasMic || isTranscribing) return;
    if (isRecording) {
      stopRecording();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = RECORDER_MIME_TYPES.find(t => MediaRecorder.isTypeSupported(t));
      const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      rec.onstop = async () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (chunks.length === 0) return;
        const blob = new Blob(chunks, { type: rec.mimeType || mimeType || 'audio/webm' });
        setIsTranscribing(true);
        try {
          const text = await transcribeAudio(blob);
          if (text) setInputText(prev => (prev.trim() ? `${prev.trim()} ${text}` : text));
        } catch (err) {
          console.error('Erro ao transcrever áudio:', err);
        } finally {
          setIsTranscribing(false);
        }
      };
      mediaRecorderRef.current = rec;
      rec.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Não foi possível acessar o microfone:', err);
      setIsRecording(false);
    }
  };

  const handleSend = async (overrideText) => {
    const text = (overrideText || inputText).trim();
    if (!text || isProcessing) return;

    if (isRecording) stopRecording();
    setInputText('');
    setShowChat(true);

    const userMsg = { role: 'user', text, id: Date.now() };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    scrollToBottom();
    setIsProcessing(true);

    // Chat multi-turno: envia o histórico + contexto (tarefas pendentes, perfil de energia)
    const res = await chatWithAtento(
      newHistory.map(m => ({ role: m.role, text: m.text })),
      { pendingTasks, energy }
    );

    const suggestions = res.tasks.map((t, i) => ({
      ...t,
      suggestionId: `${Date.now()}_${i}`,
    }));
    const alarmSuggestions = (res.alarms || []).map((a, i) => ({
      ...a,
      suggestionId: `${Date.now()}_al_${i}`,
    }));

    setMessages(prev => [...prev, {
      role: 'ai',
      id: Date.now() + 100,
      text: res.reply,
      tasks: suggestions,
      notes: res.notes,
      alarms: alarmSuggestions,
    }]);
    setIsProcessing(false);
    scrollToBottom();
  };

  const handleQuickAction = (actionId) => {
    const prompts = {
      task: 'Quero cadastrar uma nova tarefa',
      day: 'Me ajude a organizar meu dia de hoje',
      week: 'Vamos organizar minha semana inteira',
      stuck: 'Estou travado e sem foco. Me ajuda?',
    };
    setShowChat(true);
    handleSend(prompts[actionId]);
  };

  // Confirmação explícita: só entra na lista quando o usuário clica em Adicionar
  const handleAddSuggestion = (sug) => {
    confetti({ particleCount: 40, spread: 40, origin: { y: 0.7 }, colors: ['#22d3ee', '#fff'] });
    onAddTask({
      text: sug.text,
      emoji: sug.emoji || '📝',
      durationMin: sug.durationMin || 30,
      priority: sug.priority || 'media',
      bucket: sug.bucket || 'hoje',
      date: sug.bucket === 'data' ? sug.date : null,
      time: sug.time || null,
      steps: Array.isArray(sug.steps) ? sug.steps : [],
    });
    setAddedIds(prev => ({ ...prev, [sug.suggestionId]: true }));
  };

  const handleAddAlarmSuggestion = (al) => {
    confetti({ particleCount: 40, spread: 40, origin: { y: 0.7 }, colors: ['#22d3ee', '#fff'] });
    onAddAlarm({ text: al.text, date: al.date, time: al.time });
    setAddedIds(prev => ({ ...prev, [al.suggestionId]: true }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: '130px' }}>

      {/* Header */}
      <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={18} color="var(--primary)" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>
            Atento {vip && <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700 }}>✨ VIP</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
            {vip ? 'Motor Opus 5 · raciocínio máximo' : 'Seu co-piloto IA para TDAH'}
          </div>
        </div>
        {showChat && (
          <button
            onClick={() => { setShowChat(false); setMessages([]); setAddedIds({}); }}
            style={{ marginLeft: 'auto', color: 'var(--fg-muted)', fontSize: 13, fontWeight: 500, padding: '6px 10px' }}
          >
            × Fechar
          </button>
        )}
      </div>

      {/* ======= MODO HOME (sem chat) ======= */}
      {!showChat ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '24px 20px' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10, letterSpacing: '-0.5px', lineHeight: 1.25 }}>
              O que você precisa tirar<br />da cabeça?
            </h2>
            <p style={{ color: 'var(--fg-muted)', fontSize: 14, lineHeight: 1.6 }}>
              {hasMic ? 'Fale ou digite — a IA organiza pra você.' : 'Digite — a IA organiza pra você.'}
            </p>
          </div>

          {/* Mic button (só aparece se o navegador suportar gravação) */}
          {hasMic && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <motion.button
                className="mic-btn"
                onClick={toggleRecording}
                disabled={isTranscribing}
                animate={isRecording ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                transition={isRecording ? { duration: 1.2, repeat: Infinity } : {}}
                style={{
                  ...(isRecording ? { background: '#ef4444', borderColor: '#ef4444' } : {}),
                  opacity: isTranscribing ? 0.5 : 1,
                }}
              >
                {isRecording ? <MicOff size={36} /> : <Mic size={36} />}
              </motion.button>
              <span style={{ fontSize: 13, color: isRecording ? '#ef4444' : 'var(--fg-muted)' }}>
                {isTranscribing ? 'Transcrevendo...' : isRecording ? 'Gravando... toque para parar' : 'Toque para gravar'}
              </span>
            </div>
          )}

          {/* Quick Actions */}
          <div className="quick-actions" style={{ width: '100%', maxWidth: 380 }}>
            {QUICK_ACTIONS.map(a => (
              <motion.button
                key={a.id}
                className="quick-action-btn"
                whileTap={{ scale: 0.97 }}
                onClick={() => handleQuickAction(a.id)}
              >
                <span style={{ color: 'var(--fg-muted)' }}>{a.icon}</span>
                <span>{a.label}</span>
              </motion.button>
            ))}
          </div>

          {/* Disjuntor — modo emergência: esconde tudo e mostra UMA tarefa */}
          {pendingTasks.length > 0 && (
            <button
              onClick={onCircuitBreaker}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                color: '#ef4444', borderRadius: 'var(--radius-full)',
                padding: '10px 20px', fontSize: 13, fontWeight: 700,
              }}
            >
              <ShieldAlert size={16} />
              Sobrecarga! Ativar o Disjuntor
            </button>
          )}
        </div>
      ) : (
        /* ======= MODO CHAT ======= */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, padding: '12px 14px 0' }}>
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                style={{ display: 'flex', flexDirection: 'column' }}
              >
                {msg.role === 'user' ? (
                  <div style={{ alignSelf: 'flex-end', maxWidth: '82%' }}>
                    <div className="bubble-user">{msg.text}</div>
                  </div>
                ) : (
                  <div style={{ alignSelf: 'flex-start', maxWidth: '92%' }}>
                    <div className="bubble-ai">
                      <p style={{ marginBottom: (msg.tasks?.length || msg.notes?.length) ? 12 : 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {msg.text}
                      </p>

                      {/* Notas identificadas */}
                      {msg.notes?.length > 0 && (
                        <div style={{ marginBottom: msg.tasks?.length ? 12 : 0 }}>
                          {msg.notes.map((note, i) => (
                            <div key={i} style={{
                              display: 'flex', alignItems: 'flex-start', gap: 8,
                              padding: '8px 12px', background: 'var(--surface-2)',
                              borderRadius: 10, marginBottom: 4,
                              border: '1px solid var(--border)', fontSize: 14,
                            }}>
                              <StickyNote size={14} color="var(--fg-dim)" style={{ flexShrink: 0, marginTop: 2 }} />
                              <span style={{ color: 'var(--fg-muted)' }}>{note.text}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Cards de alarme */}
                      {msg.alarms?.map(al => {
                        const added = addedIds[al.suggestionId];
                        return (
                          <div key={al.suggestionId} className="suggestion-card">
                            <div className="suggestion-card-label">
                              ⏰ ALARME
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{al.text}</div>
                            <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 10 }}>
                              📅 {al.date.split('-').reverse().slice(0, 2).join('/')} às <b style={{ color: 'var(--primary)' }}>{al.time}</b>
                            </div>
                            {added ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', color: 'var(--primary)', fontWeight: 700, fontSize: 14 }}>
                                <Check size={16} /> Alarme criado!
                              </div>
                            ) : (
                              <button className="btn-outline-primary" onClick={() => handleAddAlarmSuggestion(al)}>
                                ⏰ Criar alarme
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {/* Cards ricos de sugestão de tarefa */}
                      {msg.tasks?.map(sug => {
                        const added = addedIds[sug.suggestionId];
                        const prio = PRIORITY_STYLE[sug.priority] || PRIORITY_STYLE.media;
                        return (
                          <div key={sug.suggestionId} className="suggestion-card">
                            <div className="suggestion-card-label">
                              <Sparkles size={11} /> SUGESTÃO DE TAREFA
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: 20 }}>{sug.emoji || '📝'}</span>
                              <span style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>{sug.text}</span>
                            </div>

                            {/* Metadados: duração, prioridade, quando */}
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10, fontSize: 12, color: 'var(--fg-muted)' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={12} /> {sug.durationMin || 30}min
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: prio.color, display: 'inline-block' }} />
                                {prio.label}
                              </span>
                              <span>
                                {sug.bucket === 'data' && sug.date
                                  ? `📅 ${sug.date.split('-').reverse().slice(0, 2).join('/')}`
                                  : BUCKET_LABEL[sug.bucket] || BUCKET_LABEL.hoje}
                              </span>
                              {sug.steps?.length > 0 && <span>{sug.steps.length} etapas</span>}
                            </div>

                            {/* Micro-passos já inclusos */}
                            {sug.steps?.length > 0 && (
                              <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {sug.steps.map((s, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fg-muted)' }}>
                                    <span style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid var(--border-strong)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--fg-dim)' }}>{i + 1}</span>
                                    {s}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Confirmação explícita */}
                            {added ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', color: 'var(--primary)', fontWeight: 700, fontSize: 14 }}>
                                <Check size={16} /> Adicionada!
                              </div>
                            ) : (
                              <button className="btn-outline-primary" onClick={() => handleAddSuggestion(sug)}>
                                <Plus size={15} />
                                Adicionar às minhas tarefas
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Indicador de loading */}
          {isProcessing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ alignSelf: 'flex-start' }}>
              <div className="bubble-ai" style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '14px 20px' }}>
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', display: 'block' }}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.5, delay: i * 0.12, repeat: Infinity }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* ======= BARRA DE INPUT ======= */}
      <div className="chat-bar">
        <input
          className="chat-input"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder={isTranscribing ? 'Transcrevendo...' : isRecording ? 'Ouvindo...' : 'Fale com a IA...'}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />
        {hasMic && (
          <button
            className="chat-icon-btn"
            onClick={toggleRecording}
            disabled={isTranscribing}
            style={{ ...(isRecording ? { color: '#ef4444' } : {}), opacity: isTranscribing ? 0.5 : 1 }}
            title={isRecording ? 'Parar gravação' : 'Ditar por voz'}
          >
            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        )}
        <button
          className="chat-send-btn"
          onClick={() => handleSend()}
          disabled={!inputText.trim() || isProcessing}
          style={{ opacity: (!inputText.trim() || isProcessing) ? 0.4 : 1 }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
