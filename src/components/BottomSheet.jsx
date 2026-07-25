import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Bottom sheet padrão do app (estilo AIBro): sobe de baixo, com alcinha,
 * cabeçalho, corpo rolável e rodapé fixo para o CTA.
 */
export default function BottomSheet({ open, onClose, title, subtitle, footer, children }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="bottom-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          >
            <div className="sheet-handle" />
            <div className="sheet-header" style={{ position: 'relative' }}>
              <div className="sheet-title">{title}</div>
              {subtitle && <div className="sheet-sub">{subtitle}</div>}
              <button className="sheet-close" onClick={onClose}>
                <X size={18} />
              </button>
            </div>
            <div className="sheet-body">{children}</div>
            {footer && <div className="sheet-footer">{footer}</div>}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
