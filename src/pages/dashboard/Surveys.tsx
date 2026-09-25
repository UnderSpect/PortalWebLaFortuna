import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, Clock, CheckCircle2, Plus, Trash2, Edit2, 
  X, HelpCircle, Loader2, Save, Calendar, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { 
  collection, addDoc, query, orderBy, onSnapshot, 
  doc, updateDoc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { ConfirmationModal } from '../../components/ConfirmationModal';

/**
 * Checks if a survey expiration date (YYYY-MM-DD) is in the past.
 * The survey expires at 23:59:59.999 on the given date.
 */
export const isSurveyExpired = (expiresAt?: string): boolean => {
  if (!expiresAt) return false;
  try {
    const parts = expiresAt.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const expiry = new Date(year, month, day, 23, 59, 59, 999);
      return new Date().getTime() > expiry.getTime();
    }
    const parsed = new Date(expiresAt);
    return !isNaN(parsed.getTime()) && new Date().getTime() > parsed.getTime();
  } catch (e) {
    console.error('Error evaluating survey expiration:', e);
    return false;
  }
};

export default function SurveysPage() {
  const { profile } = useAuth();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    question: '',
    options: ['', ''],
    expiresAt: '',
    active: true,
  });

  useEffect(() => {
    const q = query(collection(db, 'surveys'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dataMap = new Map();
      snapshot.docs.forEach(doc => {
        dataMap.set(doc.id, { id: doc.id, ...doc.data() });
      });
      setSurveys(Array.from(dataMap.values()));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'surveys');
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'jefe_calle';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const filteredOptions = formData.options.filter(o => o.trim() !== '');
      if (filteredOptions.length < 2) return alert('Debes agregar al menos 2 opciones.');

      if (selectedSurvey) {
        await updateDoc(doc(db, 'surveys', selectedSurvey.id), {
          ...formData,
          options: filteredOptions,
        });
      } else {
        const votes: any = {};
        filteredOptions.forEach((_, i) => (votes[i] = 0));
        await addDoc(collection(db, 'surveys'), {
          ...formData,
          options: filteredOptions,
          votes,
          userVotes: {}, // userId: optionIndex
          createdAt: serverTimestamp(),
        });
      }
      setShowModal(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'surveys');
    }
  };

  const handleVote = async (survey: any, optionIndex: number) => {
    if (!profile) return;
    
    // Check if survey has expired or is inactive
    const expired = isSurveyExpired(survey.expiresAt);
    if (survey.active === false || expired) {
      alert(expired 
        ? `Esta consulta popular venció el ${survey.expiresAt} y ya no admite nuevos votos.` 
        : 'Esta consulta popular se encuentra finalizada.');
      return;
    }

    const currentVote = survey.userVotes?.[profile.uid];
    
    try {
      const newVotes = { ...survey.votes };
      const newUserVotes = { ...survey.userVotes };

      if (currentVote === optionIndex) {
        // Deselect
        newVotes[optionIndex] = Math.max(0, (newVotes[optionIndex] || 0) - 1);
        delete newUserVotes[profile.uid];
      } else {
        // Remove old vote if exists
        if (currentVote !== undefined) {
          newVotes[currentVote] = Math.max(0, (newVotes[currentVote] || 0) - 1);
        }
        // Add new vote
        newVotes[optionIndex] = (newVotes[optionIndex] || 0) + 1;
        newUserVotes[profile.uid] = optionIndex;
      }

      await updateDoc(doc(db, 'surveys', survey.id), {
        votes: newVotes,
        userVotes: newUserVotes,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `surveys/${survey.id}`);
    }
  };

  const resetForm = () => {
    setFormData({
      question: '',
      options: ['', ''],
      expiresAt: '',
      active: true,
    });
    setSelectedSurvey(null);
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteSurvey = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'surveys', id));
      setSurveyToDelete(null);
      console.log(`Encuesta eliminada: ${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `surveys/${id}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="space-y-8 max-w-7xl mx-auto pb-20"
    >
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 inline-block">
            Participación Ciudadana
          </div>
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">Encuestas y Consultas</h2>
          <p className="text-slate-500 max-w-lg">Tu opinión es fundamental para la toma de decisiones en La Fortuna.</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary relative z-10 px-8">
            <Plus className="w-5 h-5" /> 
            <span>Nueva Encuesta</span>
          </button>
        )}
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-50 rounded-full blur-3xl opacity-50 translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
        {loading ? (
          <div className="col-span-full py-20 flex justify-center">
            <Loader2 className="animate-spin text-emerald-500" size={40} />
          </div>
        ) : surveys.length === 0 ? (
          <div className="col-span-full bg-white p-20 rounded-[2.5rem] text-center border border-slate-100">
            <BarChart3 size={64} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500 italic">No hay encuestas activas en este momento.</p>
          </div>
        ) : surveys.map((survey) => {
          const userVote = survey.userVotes?.[profile?.uid || ''];
          const totalVotes = (Object.values(survey.votes || {}) as number[]).reduce((a, b) => a + b, 0);
          const isExpired = isSurveyExpired(survey.expiresAt);
          const isClosed = survey.active === false || isExpired;

          return (
            <div 
              key={survey.id} 
              className={cn(
                "bg-white p-8 rounded-[2rem] border shadow-sm space-y-6 relative group overflow-hidden transition-all border-b-4",
                isClosed 
                  ? "border-slate-200 border-b-slate-300" 
                  : "border-slate-200 hover:shadow-2xl hover:shadow-emerald-100/20 border-b-transparent hover:border-b-emerald-400"
              )}
            >
              <div className="flex justify-between items-start z-10 relative gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {isExpired ? (
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                      <Clock className="w-3.5 h-3.5 text-rose-600" />
                      <span>Venció el {survey.expiresAt}</span>
                    </div>
                  ) : survey.expiresAt ? (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-widest">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Vence el {survey.expiresAt}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full uppercase tracking-widest">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Consulta Permanente</span>
                    </div>
                  )}

                  {isClosed && (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full border border-rose-300">
                      Votación Cerrada
                    </span>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={() => { 
                        setFormData({
                          question: survey.question || '',
                          options: survey.options || ['', ''],
                          expiresAt: survey.expiresAt || '',
                          active: survey.active !== undefined ? survey.active : true,
                        }); 
                        setSelectedSurvey(survey); 
                        setShowModal(true); 
                      }} 
                      title="Editar encuesta"
                      className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        setSurveyToDelete(survey.id);
                        setShowDeleteModal(true);
                      }} 
                      title="Eliminar encuesta"
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <h3 className="text-2xl font-black text-slate-900 leading-tight z-10 relative uppercase tracking-tighter">{survey.question}</h3>

              {isClosed && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs font-medium z-10 relative">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    {isExpired ? (
                      <p>
                        <strong>Plazo concluido:</strong> Esta consulta venció el <strong>{survey.expiresAt}</strong>. La opción de votar por «Sí», «No» u otras alternativas se encuentra deshabilitada y los resultados reflejan la votación final de la comunidad.
                      </p>
                    ) : (
                      <p>
                        <strong>Consulta Finalizada:</strong> La administración ha concluido el proceso participativo. No se admiten votos adicionales.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4 z-10 relative">
                {survey.options.map((opt: string, i: number) => {
                  const votesCount = (survey.votes?.[i] as number) || 0;
                  const perc = Math.round((votesCount / (totalVotes || 1)) * 100);
                  const isSelected = userVote === i;
                  
                  return (
                    <button 
                      key={i} 
                      type="button"
                      disabled={isClosed}
                      onClick={() => !isClosed && handleVote(survey, i)}
                      className={cn(
                        "w-full text-left group/opt relative outline-none transition-all",
                        isClosed ? "cursor-not-allowed" : "cursor-pointer"
                      )}
                      title={isClosed ? (isSelected ? "Tu voto registrado (Votación concluida)" : "Votación concluida") : `Votar por: ${opt}`}
                    >
                      <div className={cn(
                        "relative z-10 p-5 border-2 rounded-2xl flex justify-between items-center transition-all",
                        isSelected 
                          ? "border-emerald-500 bg-emerald-50/40 shadow-sm" 
                          : isClosed
                            ? "border-slate-100 bg-slate-50/60"
                            : "border-slate-50 bg-white group-hover/opt:border-emerald-200"
                      )}>
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                            isSelected 
                              ? "border-emerald-500 bg-emerald-500 text-white" 
                              : isClosed
                                ? "border-slate-200 bg-slate-100 text-slate-300"
                                : "border-slate-200 bg-white group-hover/opt:border-emerald-400"
                          )}>
                            {isSelected && <CheckCircle2 size={12} />}
                          </div>
                          <div>
                            <span className={cn(
                              "text-sm font-black uppercase tracking-tight block", 
                              isSelected ? "text-emerald-900" : isClosed ? "text-slate-600" : "text-slate-700"
                            )}>
                              {opt}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block">
                                Tu voto registrado
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-600 block">{perc}%</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{votesCount} {votesCount === 1 ? 'voto' : 'votos'}</span>
                        </div>
                      </div>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${perc}%` }}
                        className={cn(
                          "absolute inset-x-0 bottom-0 h-1 rounded-full transition-all duration-1000",
                          isClosed ? "bg-slate-300/40" : "bg-emerald-400/20"
                        )} 
                      />
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest pt-4 z-10 relative border-t border-slate-100">
                <span>{totalVotes} {totalVotes === 1 ? 'voto registrado' : 'votos registrados'}</span>
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full border",
                  !isClosed 
                    ? "text-emerald-700 bg-emerald-50 border-emerald-200" 
                    : "text-slate-600 bg-slate-100 border-slate-200"
                )}>
                  <CheckCircle2 className="w-3 h-3" /> 
                  <span>{!isClosed ? 'Encuesta Activa' : (isExpired ? 'Plazo Vencido' : 'Finalizada')}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white max-w-2xl w-full rounded-[3rem] p-10 shadow-2xl relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                    {selectedSurvey ? 'Editar Consulta' : 'Nueva Consulta Popular'}
                  </h3>
                  <p className="text-slate-500 font-medium">Define la pregunta y las opciones de respuesta</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                  <X />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pregunta Central</label>
                  <input 
                    required 
                    placeholder="Ej. ¿Qué color pintamos la fachada de la cancha?"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:border-emerald-500 outline-none transition-all"
                    value={formData.question}
                    onChange={e => setFormData({...formData, question: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Opciones de Respuesta</label>
                  {formData.options.map((opt, i) => (
                    <div key={i} className="flex gap-2 group">
                      <div className="w-10 h-14 bg-emerald-50 rounded-xl flex items-center justify-center font-black text-emerald-600 shrink-0">
                        {i + 1}
                      </div>
                      <input 
                        required={i < 2}
                        placeholder={`Opción ${i + 1}`}
                        className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:border-emerald-500 outline-none transition-all"
                        value={opt}
                        onChange={e => {
                          const newOpts = [...formData.options];
                          newOpts[i] = e.target.value;
                          setFormData({...formData, options: newOpts});
                        }}
                      />
                      {i > 1 && (
                        <button 
                          type="button" 
                          onClick={() => setFormData({...formData, options: formData.options.filter((_, idx) => idx !== i)})}
                          className="p-4 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                  {formData.options.length < 5 && (
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, options: [...formData.options, '']})}
                      className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-xs hover:border-emerald-400 hover:text-emerald-500 transition-all uppercase tracking-widest"
                    >
                      + Añadir otra opción
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Expiración</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
                    <input 
                      type="date"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:border-emerald-500 outline-none transition-all"
                      value={formData.expiresAt}
                      onChange={e => setFormData({...formData, expiresAt: e.target.value})}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 ml-1">Al cumplirse esta fecha a las 23:59, la encuesta se cerrará automáticamente impidiendo nuevos votos.</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl">
                  <div>
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wide block">Estado de la Consulta</label>
                    <p className="text-[11px] text-slate-400">Si está inactiva o vencida, los vecinos verán los resultados pero no podrán votar.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.active} 
                      onChange={e => setFormData({ ...formData, active: e.target.checked })} 
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-2xl shadow-emerald-100 hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 uppercase tracking-widest">
                  <Save size={20} />
                  {selectedSurvey ? 'Guardar Cambios' : 'Lanzar Encuesta Popular'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={showDeleteModal}
        title="¿Eliminar esta encuesta?"
        message="Esta acción no se puede deshacer y todos los votos registrados se perderán permanentemente de los registros auditables."
        onConfirm={() => surveyToDelete && deleteSurvey(surveyToDelete)}
        onCancel={() => {
          setShowDeleteModal(false);
          setSurveyToDelete(null);
        }}
      />
    </motion.div>
  );
}
