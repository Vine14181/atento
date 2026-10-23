import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { deletionErrorMessage } from '../services/account';

/**
 * Tela cheia que substitui o app enquanto a conta é excluída. Sem as outras
 * telas montadas, nada (listeners, Memória RAM, conquistas) volta a gravar
 * dados no meio da exclusão.
 */
export default function DeletionScreen() {
  const { currentUser, deletion, deleteAccount, cancelDeletion } = useAuth();
  if (!deletion) return null;
  const running = deletion.status === 'running';

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      padding: 24, textAlign: 'center', maxWidth: 430, margin: '0 auto',
    }}>
      {running ? (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{ display: 'inline-block' }}
          >
            <Loader2 size={36} color="var(--primary)" />
          </motion.div>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>Excluindo sua conta</h2>
          <p role="status" aria-live="polite" style={{ color: 'var(--fg-muted)', fontSize: 15, lineHeight: 1.5 }}>
            {deletion.step}
          </p>
          <p style={{ color: 'var(--fg-dim)', fontSize: 13 }}>Não feche o app até terminar.</p>
        </>
      ) : (
        <>
          <ShieldAlert size={36} color="#ef4444" />
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>A exclusão não terminou</h2>
          <p role="alert" style={{ color: 'var(--fg-muted)', fontSize: 15, lineHeight: 1.5 }}>
            {deletionErrorMessage(deletion.code, deletion.stage, currentUser?.email)}
          </p>
          <button className="btn-primary" onClick={() => deleteAccount(deletion.options)} style={{ width: '100%' }}>
            Tentar de novo
          </button>
          <button className="btn-ghost" onClick={cancelDeletion}>
            Voltar ao app
          </button>
        </>
      )}
    </div>
  );
}
