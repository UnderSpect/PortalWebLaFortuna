import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger'
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const colors = {
    danger: 'bg-red-600 hover:bg-red-700 shadow-red-500/20',
    warning: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
    info: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
        >
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${variant === 'danger' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">{title}</h3>
            </div>
            
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              {message}
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onCancel}
                className="flex-1 px-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onCancel();
                }}
                className={`flex-1 px-6 py-3 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg ${colors[variant]}`}
              >
                {confirmText}
              </button>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-500 transition-colors"
          >
            <X size={18} />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
