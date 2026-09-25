import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  Loader2, 
  ShieldAlert, 
  CheckCircle2, 
  Users, 
  Calendar, 
  BarChart3, 
  MessageSquare 
} from 'lucide-react';
import { purgeUserAccount } from '../lib/accountService';
import { useNavigate } from 'react-router-dom';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userRole: string;
}

export function DeleteAccountModal({
  isOpen,
  onClose,
  userId,
  userName,
  userRole,
}: DeleteAccountModalProps) {
  const [confirmKeyword, setConfirmKeyword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleConfirmDelete = async () => {
    if (confirmKeyword.trim().toUpperCase() !== 'ELIMINAR') {
      setErrorMessage('Debes escribir la palabra "ELIMINAR" para confirmar.');
      return;
    }

    setIsDeleting(true);
    setErrorMessage('');
    setDeleteStatus('Borrando registro de censo, encuestas, eventos y datos de la base de datos...');

    try {
      const result = await purgeUserAccount(userId, true);
      
      if (!result.success) {
        setErrorMessage(result.error || 'No se pudo completar el borrado de la cuenta.');
        setIsDeleting(false);
        return;
      }

      setDeleteStatus('¡Cuenta eliminada exitosamente! Redirigiendo...');
      setTimeout(() => {
        onClose();
        navigate('/');
      }, 1500);
    } catch (err: any) {
      console.error('Error al eliminar cuenta:', err);
      setErrorMessage(err?.message || 'Error inesperado al eliminar los datos.');
      setIsDeleting(false);
    }
  };

  const roleLabel = userRole === 'admin' 
    ? 'Administrador' 
    : userRole === 'jefe_calle' 
    ? 'Jefe de Calle' 
    : 'Vecino';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isDeleting && onClose()}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-red-100 z-10"
        >
          {/* Header decorative accent */}
          <div className="h-2 bg-gradient-to-r from-red-500 via-rose-500 to-red-600" />

          <div className="p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Title & Icon */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100 shadow-sm">
                <ShieldAlert size={28} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                    Zona de Peligro
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {roleLabel}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                  Eliminar Cuenta
                </h3>
              </div>
              {!isDeleting && (
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                  aria-label="Cerrar"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Explanation box */}
            <div className="bg-red-50/70 border border-red-200/80 rounded-2xl p-4 text-xs space-y-3 text-red-950 font-medium">
              <p className="font-bold text-red-800 flex items-center gap-1.5">
                <AlertTriangle size={16} className="shrink-0 text-red-600" />
                Esta acción es permanente y completamente irreversible.
              </p>
              <p className="text-red-900/90 leading-relaxed">
                Al confirmar, se eliminará tu usuario <span className="font-black text-slate-900">({userName})</span> y se purgará de forma definitiva toda tu información de la base de datos comunitaria:
              </p>
              <div className="space-y-1.5 pt-1 pl-1 text-[11px] text-red-900/90">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-red-600 shrink-0" />
                  <span><strong>Censo Digital:</strong> Se borrará tu ficha censal, dirección y datos socioeconómicos.</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 size={14} className="text-red-600 shrink-0" />
                  <span><strong>Encuestas:</strong> Se retirarán todos tus votos registrados y se actualizarán los contadores.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-red-600 shrink-0" />
                  <span><strong>Eventos y Jornadas:</strong> Se anularán todas tus inscripciones y reservas de cupos.</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} className="text-red-600 shrink-0" />
                  <span><strong>Reportes y Comunicación:</strong> Se limpiarán tus reportes y mensajes enviados.</span>
                </div>
              </div>
            </div>

            {/* Security confirmation input */}
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                Para confirmar la eliminación, escribe <span className="text-red-600 font-black">ELIMINAR</span> a continuación:
              </label>
              <input
                type="text"
                value={confirmKeyword}
                onChange={(e) => {
                  setConfirmKeyword(e.target.value);
                  setErrorMessage('');
                }}
                disabled={isDeleting}
                placeholder="Escribe ELIMINAR"
                className="w-full bg-slate-50 border-2 border-slate-200 focus:border-red-500 focus:bg-white rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
              />
              {errorMessage && (
                <p className="text-red-600 text-xs font-bold mt-1 flex items-center gap-1">
                  <AlertTriangle size={14} /> {errorMessage}
                </p>
              )}
            </div>

            {/* Loading / Status notice */}
            {isDeleting && (
              <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center gap-3">
                <Loader2 size={20} className="animate-spin text-emerald-400 shrink-0" />
                <p className="text-xs font-semibold text-slate-200 leading-snug">
                  {deleteStatus}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="flex-1 px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting || confirmKeyword.trim().toUpperCase() !== 'ELIMINAR'}
                className="flex-1 px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Borrando...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Eliminar mi cuenta
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
