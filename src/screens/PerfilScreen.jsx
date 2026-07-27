import React, { useState, useEffect } from 'react';
import { LogOut, Zap, Download, MessageCircle, Trash2, Flame, CalendarCheck } from 'lucide-react';
import { connectCalendar } from '../services/calendar';
import { useAuth } from '../contexts/AuthContext';
import EnergyProfileSheet from '../components/EnergyProfileSheet';
import { updateProfile, clearAllTasks } from '../services/firestore';
import { todayStr, WEEKDAY_LABELS } from '../utils/dates';
import { globalStreak, currentWeekScores, monthAverage } from '../utils/scoring';
import { buildInsights } from '../utils/insights';
import { ACHIEVEMENTS, CATEGORIES, CAT_EMOJI } from '../utils/achievements';

// Email de suporte/feedback — configurado no ambiente, nunca no código.
// Se vazio, o item de feedback não aparece no menu.
const FEEDBACK_EMAIL = import.meta.env.VITE_FEEDBACK_EMAIL || '';

export default function PerfilScreen({ tasks, doneTasks, habits, profile }) {
  const { currentUser, logout, isVip } = useAuth();
  const [energyOpen, setEnergyOpen] = useState(false);
  const [wheelView, setWheelView] = useState('semana');
  const [installEvent, setInstallEvent] = useState(null);

  // PWA: captura o prompt "Adicionar à tela inicial"
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const displayName = currentUser?.displayName || 'Você';
  const email = currentUser?.email || '';
  const photo = currentUser?.photoURL;

  const streak = globalStreak(habits);
  const week = currentWeekScores(habits);
  const weekValid = week.filter(d => d.score !== null);
  const weekAvg = weekValid.length
    ? Math.round(weekValid.reduce((a, b) => a + b.score, 0) / weekValid.length)
    : 0;
  const goodDays = week.filter(d => d.score !== null && d.score >= 80).length;
  const monthAvg = monthAverage(habits);

  const totalDoneCount = doneTasks.length;
  const completionRate = tasks.length + doneTasks.length > 0
    ? Math.round((doneTasks.length / (tasks.length + doneTasks.length)) * 100)
    : 0;
  const focusMinutes = doneTasks.reduce((sum, t) => sum + (t.durationMin || 30), 0);
  const focusH = Math.floor(focusMinutes / 60);

  const insights = buildInsights({ tasks: [...tasks, ...doneTasks], doneTasks, habits, profile });
  const unlocked = profile?.achievements || {};
  const unlockedCount = Object.keys(unlocked).length;

  const handleLogout = async () => {
    if (!window.confirm('Sair da sua conta?')) return;
    try {
      await logout();
    } catch (e) {
      console.error('Erro ao sair', e);
    }
  };

  const handleClearTasks = async () => {
    if (!currentUser) return;
    if (!window.confirm('Apagar TODAS as tarefas (pendentes e concluídas)? Isso não pode ser desfeito.')) return;
    await clearAllTasks(currentUser.uid);
  };

  const handleInstall = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  const saveEnergy = async (answers) => {
    if (!currentUser) return;
    await updateProfile(currentUser.uid, { energy: answers });
  };

  const toggleCalendar = async () => {
    if (!currentUser) return;
    if (profile?.gcalEnabled) {
      await updateProfile(currentUser.uid, { gcalEnabled: false });
      return;
    }
    try {
      await connectCalendar(); // popup do Google pedindo permissão de agenda
      await updateProfile(currentUser.uid, { gcalEnabled: true });
    } catch (e) {
      console.error('Falha ao conectar Google Agenda', e);
      window.alert('Não foi possível conectar à Google Agenda. Tente de novo.');
    }
  };

  const MenuRow = ({ icon, iconBg, iconColor, title, desc, onClick, right }) => (
    <button
      onClick={onClick}
      className="card"
      style={{
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
        width: '100%', cursor: 'pointer', textAlign: 'left',
        border: '1px solid var(--border)', marginBottom: 10,
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg || 'var(--primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor || 'var(--primary)', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
        {desc && <div style={{ color: 'var(--fg-muted)', fontSize: 12, marginTop: 2 }}>{desc}</div>}
      </div>
      {right}
    </button>
  );

  return (
    <div style={{ padding: '24px 16px 0' }}>
      {/* User Card */}
      <div className="card" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 20, textAlign: 'center' }}>
        {photo ? (
          <img
            src={photo}
            alt={displayName}
            referrerPolicy="no-referrer"
            style={{ width: 72, height: 72, borderRadius: '50%', border: '2px solid var(--primary)', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--primary-dark)', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>
            🧠
          </div>
        )}
        <div>
          <div style={{ fontWeight: 800, fontSize: 20 }}>{displayName}</div>
          {email && <div style={{ color: 'var(--fg-muted)', fontSize: 13 }}>{email}</div>}
        </div>
        {isVip && (
          <span style={{
            background: 'var(--primary-dark)', color: 'var(--primary)',
            borderRadius: 99, padding: '3px 14px', fontSize: 12, fontWeight: 700,
            border: '1px solid hsla(189,94%,55%,0.4)',
          }}>
            ✨ VIP — IA Opus 5
          </span>
        )}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--primary-dark)', borderRadius: 'var(--radius-full)',
          padding: '8px 18px', border: '1px solid hsla(189,94%,55%,0.3)',
        }}>
          <Flame size={16} color="#fb923c" />
          <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--primary)' }}>{streak}</span>
          <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>dias de streak</span>
        </div>
      </div>

      {/* Roda de Progresso */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Roda de Progresso</span>
          <div className="chip-row">
            {[['semana', 'Semana'], ['mes', 'Mês']].map(([v, l]) => (
              <button key={v} className={`chip ${wheelView === v ? 'selected' : ''}`} style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setWheelView(v)}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {wheelView === 'semana' ? (
          <>
            <div className="week-wheel" style={{ marginBottom: 16 }}>
              {week.map(({ date, score }) => (
                <div key={date} className={`week-day ${date === todayStr() ? 'today' : ''}`}>
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
            <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--primary)' }}>{weekAvg}%</div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Média semanal</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 20 }}>{goodDays}/7</div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Dias ≥80%</div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontWeight: 800, fontSize: 34, color: 'var(--primary)' }}>{monthAvg}%</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Média dos últimos 30 dias</div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="stat-tiles" style={{ marginBottom: 16 }}>
        <div className="stat-tile">
          <div className="v">{totalDoneCount}</div>
          <div className="l">Tarefas feitas</div>
        </div>
        <div className="stat-tile">
          <div className="v" style={{ color: '#22c55e' }}>{completionRate}%</div>
          <div className="l">Taxa conclusão</div>
        </div>
        <div className="stat-tile">
          <div className="v" style={{ color: '#eab308' }}>{focusH}h</div>
          <div className="l">Foco total</div>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Insights</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {insights.map((ins, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.5, paddingBottom: i < insights.length - 1 ? 10 : 0, borderBottom: i < insights.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{ins.emoji}</span>
                <span>{ins.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conquistas */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
          Conquistas <span style={{ color: 'var(--fg-muted)', fontWeight: 600, fontSize: 13 }}>{unlockedCount}/{ACHIEVEMENTS.length}</span>
        </div>
        {CATEGORIES.map(cat => (
          <div key={cat}>
            <p className="section-label" style={{ margin: '14px 0 10px' }}>{CAT_EMOJI[cat]} {cat}</p>
            <div className="ach-grid">
              {ACHIEVEMENTS.filter(a => a.cat === cat).map(a => (
                <div key={a.id} className={`ach-item ${unlocked[a.id] ? 'unlocked' : ''}`} title={a.desc}>
                  <div className="ach-badge">{a.emoji}</div>
                  <span className="ach-name">{a.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Menu */}
      <p className="section-label" style={{ marginBottom: 12 }}>Configurações</p>

      <MenuRow
        icon={<Zap size={18} />}
        title="Perfil de energia"
        desc={profile?.energy ? `Pico: ${profile.energy.peak} · Foco: ${profile.energy.focusSpan}` : 'Configure para dicas personalizadas'}
        onClick={() => setEnergyOpen(true)}
        right={profile?.energy && <span style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 700 }}>✓</span>}
      />

      <MenuRow
        icon={<CalendarCheck size={18} />}
        title="Google Agenda"
        desc={profile?.gcalEnabled
          ? 'Conectada — tarefas com data e alarmes viram eventos'
          : 'Conecte para sincronizar tarefas e alarmes'}
        onClick={toggleCalendar}
        right={
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
            background: profile?.gcalEnabled ? 'var(--primary-dark)' : 'var(--surface-2)',
            color: profile?.gcalEnabled ? 'var(--primary)' : 'var(--fg-dim)',
            border: `1px solid ${profile?.gcalEnabled ? 'var(--primary)' : 'var(--border)'}`,
          }}>
            {profile?.gcalEnabled ? 'ON' : 'OFF'}
          </span>
        }
      />

      {installEvent && (
        <MenuRow
          icon={<Download size={18} />}
          title="Instalar Atento no celular"
          desc="Adicionar à tela inicial como app"
          onClick={handleInstall}
        />
      )}

      {FEEDBACK_EMAIL && (
        <MenuRow
          icon={<MessageCircle size={18} />}
          title="Suporte / Feedback"
          desc="Encontrou um problema? Me conta!"
          onClick={() => { window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=Feedback%20Atento`; }}
        />
      )}

      <MenuRow
        icon={<Trash2 size={18} />}
        iconBg="rgba(239,68,68,0.12)"
        iconColor="#ef4444"
        title="Limpar todas as tarefas"
        desc="Apaga pendentes e concluídas (não pode ser desfeito)"
        onClick={handleClearTasks}
      />

      <MenuRow
        icon={<LogOut size={18} />}
        iconBg="rgba(239,68,68,0.12)"
        iconColor="#ef4444"
        title="Sair da conta"
        desc="Seus dados continuam salvos na nuvem"
        onClick={handleLogout}
      />

      <div style={{ height: 16 }} />

      <EnergyProfileSheet
        open={energyOpen}
        onClose={() => setEnergyOpen(false)}
        initial={profile?.energy}
        onSave={saveEnergy}
      />
    </div>
  );
}
