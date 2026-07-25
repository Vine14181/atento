import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, X, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRamCache, saveRamCache } from '../services/firestore';

const STORAGE_KEY = 'atento_ram_cache_fallback';

export default function RAMCache() {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const timeoutRef = useRef(null);

  // Load initial content
  useEffect(() => {
    const loadContent = async () => {
      if (currentUser) {
        try {
          const cloudContent = await getRamCache(currentUser.uid);
          setContent(cloudContent);
        } catch (e) {
          console.error("Erro ao carregar RAM Cache da nuvem", e);
          setContent(localStorage.getItem(STORAGE_KEY) || '');
        }
      } else {
        setContent(localStorage.getItem(STORAGE_KEY) || '');
      }
    };
    loadContent();
  }, [currentUser]);

  // Save changes with debounce
  useEffect(() => {
    // Save to local immediately
    try {
      localStorage.setItem(STORAGE_KEY, content);
    } catch (e) {
      console.warn('localStorage cheio ou indisponível', e);
    }

    // Debounce save to cloud
    if (currentUser) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(async () => {
        try {
          await saveRamCache(currentUser.uid, content);
        } catch (e) {
          console.error("Erro ao salvar RAM Cache na nuvem", e);
        }
      }, 1000);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [content, currentUser]);

  const handleClear = () => {
    setContent('');
    localStorage.removeItem(STORAGE_KEY);
    if (currentUser) {
      saveRamCache(currentUser.uid, '');
    }
  };

  const charCount = content.length;

  return (
    <>
      {/* Botão flutuante — sempre visível */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: 'calc(var(--nav-h) + 16px)',
          right: '16px',
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px -8px rgba(0,0,0,0.6)',
          zIndex: 80,
          cursor: 'pointer',
        }}
        title="Memória RAM (Rascunho rápido)"
      >
        <Cpu size={22} />
      </motion.button>

      {/* Painel da Memória RAM */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 98,
              }}
            />

            {/* Painel */}
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.92 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              style={{
                position: 'fixed',
                bottom: 'calc(var(--nav-h) + 78px)',
                right: 16,
                width: 'min(340px, calc(100vw - 32px))',
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid hsla(189,94%,55%,0.4)',
                boxShadow: '0 20px 40px -10px rgba(0,0,0,0.7), 0 0 0 1px var(--border)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                zIndex: 99,
                maxHeight: '50vh',
              }}
            >
              {/* Header */}
              <div style={{
                background: 'var(--primary-dark)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid hsla(189,94%,55%,0.25)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Cpu size={16} color="var(--primary)" />
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)' }}>
                    Memória RAM
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {content.length > 0 && (
                    <button
                      onClick={handleClear}
                      style={{ color: 'var(--fg-dim)', padding: 4 }}
                      title="Limpar tudo"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    style={{ color: 'var(--fg-dim)', padding: 4 }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Textarea */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Cole aquele código, número de telefone ou pensamento rápido aqui. Fica salvo na nuvem..."
                autoFocus
                style={{
                  flex: 1,
                  minHeight: 180,
                  background: 'transparent',
                  border: 'none',
                  padding: 16,
                  color: 'var(--fg)',
                  fontSize: 14,
                  lineHeight: 1.7,
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />

              {/* Footer */}
              <div style={{
                padding: '8px 16px',
                background: 'var(--bg)',
                fontSize: 11,
                color: 'var(--fg-dim)',
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <span>Sincronizado via nuvem.</span>
                <span>{charCount > 0 ? `${charCount} chars` : ''}</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
