import React, { useState, useEffect } from 'react';
import { Zap, Loader2, Download, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { isInstalledApp } from '../utils/platform';

export default function LoginScreen() {
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // A exclusão de conta termina recarregando a página com ?conta-excluida=1
  const [accountDeleted] = useState(
    () => new URLSearchParams(window.location.search).has('conta-excluida')
  );
  // Quem já está no app instalado (Play ou PWA) não precisa do APK. Dentro do
  // app da Play, oferecer outra instalação fere a política da loja.
  const [showApk] = useState(() => !isInstalledApp());

  useEffect(() => {
    // Tira o parâmetro da barra de endereço para o aviso não voltar ao recarregar
    if (accountDeleted) window.history.replaceState(null, '', '/');
  }, [accountDeleted]);

  async function handleLogin() {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
    } catch (e) {
      console.error(e);
      setError('Falha ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '24px'
    }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '320px',
          width: '100%',
          textAlign: 'center'
        }}
      >
        <div style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: 'linear-gradient(160deg, hsl(192 90% 14%), hsl(210 80% 14%))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 28,
          border: '1px solid hsla(189,94%,55%,0.35)',
          boxShadow: '0 0 40px -8px hsl(189 94% 55% / 0.4), inset 0 1px 0 hsla(189,94%,80%,0.15)',
        }}>
          <Zap size={34} color="var(--primary)" style={{ filter: 'drop-shadow(0 0 8px hsl(189 94% 55% / 0.7))' }} />
        </div>

        <h1 className="page-title" style={{ fontSize: 34, marginBottom: 12, lineHeight: 1.15 }}>
          Bem-vindo ao Atento
        </h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: 16, marginBottom: 40, lineHeight: 1.5 }}>
          Seu co-piloto IA para TDAH.<br/>Sincronizado na nuvem.
        </p>

        {accountDeleted && (
          <div role="status" style={{
            background: 'rgba(34, 197, 94, 0.1)',
            color: '#22c55e',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '14px',
            lineHeight: 1.5,
            width: '100%',
            display: 'flex',
            gap: 8,
            textAlign: 'left',
          }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Sua conta e seus dados foram excluídos. Se quiser, remova também
              o acesso do app em myaccount.google.com/permissions.
            </span>
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '14px',
            width: '100%'
          }}>
            {error}
          </div>
        )}

        <button
          className="btn-primary"
          onClick={handleLogin}
          disabled={loading}
          style={{ width: '100%', padding: '16px', fontSize: '16px', display: 'flex', justifyContent: 'center' }}
        >
          {loading ? <Loader2 className="animate-spin" /> : 'Entrar com Google'}
        </button>

        {/* Baixar o app para Android (APK) — só no navegador comum */}
        {showApk && (
          <>
            <a
              href="/atento.apk"
              download="Atento.apk"
              className="btn-outline-primary"
              style={{
                width: '100%', marginTop: 14, padding: '14px', fontSize: 15,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                textDecoration: 'none',
              }}
            >
              <Download size={18} />
              Baixar o app (Android)
            </a>
            <p style={{ color: 'var(--fg-dim)', fontSize: 12, marginTop: 10, lineHeight: 1.5 }}>
              No celular, ao abrir o arquivo baixado o Android pede para permitir
              “instalar de fontes desconhecidas”. Se já tinha uma versão antiga,
              desinstale antes de instalar esta.
            </p>
          </>
        )}

        <p style={{ color: 'var(--fg-dim)', fontSize: 12, marginTop: 28, lineHeight: 1.6 }}>
          <a href="/privacidade.html" style={{ color: 'var(--fg-muted)' }}>Política de privacidade</a>
          {' · '}
          <a href="/excluir-conta.html" style={{ color: 'var(--fg-muted)' }}>Excluir conta</a>
        </p>
      </motion.div>
    </div>
  );
}
