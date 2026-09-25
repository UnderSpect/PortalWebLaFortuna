import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, MapPin, Clock, Star, Info, 
  ChevronRight, Plus, Trash2, Edit2, Users, CheckCircle, 
  AlertCircle, X, Loader2, Phone, Shield
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { 
  collection, addDoc, query, orderBy, onSnapshot, 
  doc, updateDoc, deleteDoc, arrayUnion, arrayRemove,
  serverTimestamp 
} from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { ConfirmationModal } from '../../components/ConfirmationModal';

export default function EventsPage() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showRegistrants, setShowRegistrants] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  const [viewTab, setViewTab] = useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    type: 'jornada' as 'jornada' | 'evento',
    desc: '',
    capacity: 50,
    isUnlimited: false,
    deadline: '',
    instructions: 'Todas nuestras jornadas son autogestionadas. Recuerda traer tu cédula original y estar al día con los censos de tu calle.',
  });

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dataMap = new Map();
      snapshot.docs.forEach(doc => {
        dataMap.set(doc.id, { id: doc.id, ...doc.data() });
      });
      setEvents(Array.from(dataMap.values()));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'events');
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'jefe_calle';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedEvent) {
        await updateDoc(doc(db, 'events', selectedEvent.id), formData);
      } else {
        await addDoc(collection(db, 'events'), {
          ...formData,
          createdAt: serverTimestamp(),
          registrants: [],
        });
      }
      setShowModal(false);
      setSelectedEvent(null);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'events');
    }
  };

  const handleRegister = async (event: any, isRegistered: boolean) => {
    if (!profile) return;

    // Check if deadline is passed (optional, since it's a string in some cases)
    // For simplicity, we assume if current date > event date, registration is closed
    const eventDate = new Date(event.date + 'T23:59:59');
    const now = new Date();
    if (!isRegistered && now > eventDate) {
      alert('Esta jornada ha expirado y ya no acepta registros.');
      return;
    }

    const regCount = (event.registrations || []).length;
    if (!isRegistered && !event.isUnlimited && regCount >= (event.capacity || 0)) {
      alert('Lo sentimos, el cupo para esta jornada se ha agotado.');
      return;
    }

    try {
      const eventRef = doc(db, 'events', event.id);
      if (isRegistered) {
        const toRemove = event.registrantsData?.find((r: any) => r.uid === profile.uid);
        if (toRemove) {
          await updateDoc(eventRef, { 
            registrants: arrayRemove(profile.uid),
            registrantsData: arrayRemove(toRemove)
          });
        }
      } else {
        const registration = {
          uid: profile.uid,
          name: `${profile.firstName} ${profile.firstSurname}`,
          phone: profile.phone || 'N/A',
          street: profile.street || 'N/A',
          cedula: profile.cedula || 'N/A',
          timestamp: new Date().toISOString()
        };
        await updateDoc(eventRef, { 
          registrants: arrayUnion(profile.uid),
          registrantsData: arrayUnion(registration)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `events/${event.id}`);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      date: '',
      time: '',
      location: '',
      type: 'jornada',
      desc: '',
      capacity: 50,
      deadline: '',
      instructions: 'Todas nuestras jornadas son autogestionadas. Recuerda traer tu cédula original y estar al día con los censos de tu calle.',
      isUnlimited: false
    });
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteEv = async (id: string) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'events', id));
      setEventToDelete(null);
      console.log(`Evento eliminado: ${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `events/${id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }} 
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8 max-w-7xl mx-auto pb-20"
    >
      <AnimatePresence>
        {profile?.role === 'admin' && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-slate-900 border-b border-white/10 px-8 py-3 flex items-center justify-between text-white"
          >
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Panel Administrativo de Eventos</span>
            </div>
            <span className="text-[9px] text-slate-400 font-bold italic">Supervisando todas las calles y jefes</span>
          </motion.div>
        )}
        {profile?.role === 'jefe_calle' && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-emerald-600 px-8 py-3 flex items-center justify-between text-white shadow-xl shadow-emerald-500/10"
          >
            <div className="flex items-center gap-2">
              <Users size={14} className="text-emerald-200" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Gestión de Calle: {profile.street}</span>
            </div>
            <span className="text-[9px] text-emerald-100 font-bold italic">Mantén informados a tus vecinos sobre estas jornadas</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 inline-block">
            Gestión de Eventos
          </div>
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">Agenda Comunitaria</h2>
          <p className="text-slate-500 max-w-lg">Mantente al tanto de todas las jornadas y participación de nuestro consejo comunal.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10 w-full md:w-auto mt-6 md:mt-0">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 w-full sm:w-auto justify-center">
            <button 
              type="button"
              onClick={() => setViewTab('calendar')} 
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all w-full sm:w-auto text-center whitespace-nowrap",
                viewTab === 'calendar' ? "bg-white text-emerald-600 shadow-sm font-black" : "text-slate-400 hover:text-slate-600 font-bold"
              )}
            >
              Calendario
            </button>
            <button 
              type="button"
              onClick={() => setViewTab('list')} 
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all w-full sm:w-auto text-center whitespace-nowrap",
                viewTab === 'list' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Lista ({events.length})
            </button>
          </div>
          {isAdmin && (
            <button onClick={() => { resetForm(); setSelectedEvent(null); setShowModal(true); }} className="btn-primary w-full sm:w-auto px-6 whitespace-nowrap">
              <Plus className="w-5 h-5" /> 
              <span>Nuevo Evento</span>
            </button>
          )}
        </div>
        
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl opacity-50 translate-x-1/2 -translate-y-1/2" />
      </div>

      {viewTab === 'calendar' ? (
        <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
          {/* Calendar Controller Header */}
          <div className="flex justify-between items-center bg-slate-50 p-4 md:p-6 rounded-[2rem] border border-slate-100">
            <button 
              type="button"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
              className="p-3 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50/20 transition-all shadow-sm"
              title="Mes Anterior"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            
            <div className="text-center">
              <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight capitalize">
                {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Calendario Mensual Autogestionado</p>
            </div>
            
            <button 
              type="button"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              className="p-3 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50/20 transition-all shadow-sm"
              title="Siguiente Mes"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-2 text-center">
            {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((dayName) => (
              <div key={dayName} className="py-2.5 bg-slate-100/60 rounded-xl">
                <span className="hidden md:inline text-[9px] font-black uppercase text-slate-400 tracking-widest">{dayName}</span>
                <span className="inline md:hidden text-[9px] font-black uppercase text-slate-400 tracking-widest">{dayName.slice(0, 3)}</span>
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {(() => {
              const year = currentMonth.getFullYear();
              const month = currentMonth.getMonth();
              const firstDayIndex = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              
              const blanks = Array(firstDayIndex).fill(null);
              const days = Array.from({ length: daysInMonth }, (_, idx) => idx + 1);
              const cells = [...blanks, ...days];
              
              const getCellDateString = (day: number) => {
                const y = year;
                const m = String(month + 1).padStart(2, '0');
                const d = String(day).padStart(2, '0');
                return `${y}-${m}-${d}`;
              };

              return cells.map((dayNum, cellIdx) => {
                if (dayNum === null) {
                  return (
                    <div key={`blank-${cellIdx}`} className="min-h-[85px] md:min-h-[125px] bg-slate-50/20 rounded-2xl border border-dashed border-slate-100" />
                  );
                }
                
                const cellDateStr = getCellDateString(dayNum);
                const dayEvents = events.filter(e => e.date === cellDateStr);
                const isToday = new Date().toDateString() === new Date(year, month, dayNum).toDateString();

                return (
                  <div 
                    key={`day-${dayNum}`}
                    className={cn(
                      "min-h-[85px] md:min-h-[125px] bg-white p-2 border rounded-2xl flex flex-col gap-1.5 transition-all relative group/cell hover:shadow-lg hover:shadow-emerald-100/10 hover:border-emerald-250 hover:border-emerald-200",
                      isToday ? "border-emerald-400 shadow-md ring-2 ring-emerald-400/20 bg-emerald-50/5" : "border-slate-150/80 border-slate-200 bg-white"
                    )}
                  >
                    <div className="flex justify-between items-center shrink-0">
                      {isToday && (
                        <span className="px-1 py-0.2 bg-emerald-600 text-white text-[7px] font-extrabold uppercase rounded tracking-wider">Hoy</span>
                      )}
                      <span className={cn(
                        "text-[9px] font-black tracking-tight ml-auto",
                        isToday ? "text-emerald-600 text-xs font-black" : "text-slate-400 group-hover/cell:text-slate-800 font-bold"
                      )}>
                        {dayNum}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin pr-0.5 max-h-[80px]">
                      {dayEvents.map(e => {
                        const isRegistered = e.registrants?.includes(profile?.uid);
                        return (
                          <button
                            key={e.id}
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setSelectedEvent(e);
                              setShowEventDetailsModal(true);
                            }}
                            className={cn(
                              "w-full text-left truncate px-2 py-1.5 rounded-lg text-[8px] md:text-[9px] font-extrabold flex flex-col gap-0.5 border shadow-sm transition-all hover:scale-[1.02] relative group/pill",
                              e.type === 'jornada' 
                                ? "bg-amber-50 text-amber-800 border-amber-200/80 hover:bg-amber-100" 
                                : "bg-sky-50 text-sky-800 border-sky-200/80 hover:bg-sky-100"
                            )}
                          >
                            <div className="flex items-center gap-1 font-bold">
                              <span>{e.type === 'jornada' ? '🚗' : '🗣️'}</span>
                              <span className="truncate uppercase tracking-tight">{e.title}</span>
                            </div>
                            <div className="flex justify-between items-center text-[7px] font-bold text-slate-400 mt-0.5">
                              <span>{e.time}</span>
                              {isRegistered && <span className="text-emerald-600 font-extrabold">✓ Inscrito</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            {loading ? (
              <div className="bg-white p-20 rounded-[2.5rem] flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-500" size={40} />
              </div>
            ) : events.length === 0 ? (
              <div className="bg-white p-20 rounded-[2.5rem] text-center space-y-4">
                <CalendarIcon size={64} className="mx-auto text-slate-200" />
                <p className="text-slate-500 italic">No hay eventos programados en este momento.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {events.map((event, i) => {
                  const isRegistered = event.registrants?.includes(profile?.uid);
                  const spotsLeft = event.isUnlimited ? Infinity : (event.capacity - (event.registrants?.length || 0));
                  const isFull = !event.isUnlimited && spotsLeft <= 0;
                  
                  return (
                    <motion.div 
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="group bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8 hover:shadow-2xl hover:shadow-emerald-100/30 transition-all relative overflow-hidden"
                    >
                      <div className={cn(
                        "absolute left-0 top-0 bottom-0 w-2 transition-all group-hover:w-3",
                        event.type === 'jornada' ? 'bg-amber-400' : 'bg-sky-400'
                      )} />
                      
                      <div className="md:w-32 h-32 flex flex-col items-center justify-center bg-slate-50 rounded-2xl p-4 text-center border border-slate-100 group-hover:bg-white transition-colors">
                        <span className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest mb-1">
                          {new Date(event.date + 'T12:00:00').toLocaleDateString('es-ES', { month: 'short' })}
                        </span>
                        <span className="text-5xl font-black text-slate-900 tracking-tighter">
                          {new Date(event.date + 'T12:00:00').getDate()}
                        </span>
                      </div>
                      
                      <div className="flex-1 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={cn(
                              "text-[9px] uppercase font-black tracking-[0.2em] px-3 py-1 rounded-full mb-3 inline-block",
                              event.type === 'jornada' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                            )}>
                              {event.type}
                            </span>
                            <h3 className="text-2xl font-bold text-slate-900 leading-tight group-hover:text-emerald-600 transition-colors uppercase tracking-tight">{event.title}</h3>
                          </div>
                          {isAdmin && (
                            <div className="flex gap-2">
                              <button onClick={() => { setFormData(event); setSelectedEvent(event); setShowModal(true); }} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"><Edit2 size={16} /></button>
                              <button 
                                onClick={() => {
                                  setEventToDelete(event.id);
                                  setShowDeleteModal(true);
                                }} 
                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-slate-500 text-sm leading-relaxed max-w-xl">{event.desc}</p>
                        
                        <div className="flex flex-wrap gap-8 pt-6 border-t border-slate-100">
                          <div className="flex items-center gap-2.5 text-slate-400 text-xs font-bold uppercase tracking-widest">
                            <Clock className="w-4 h-4 text-emerald-500" />
                            {event.time}
                          </div>
                          <div className="flex items-center gap-2.5 text-slate-400 text-xs font-bold uppercase tracking-widest">
                            <MapPin className="w-4 h-4 text-emerald-500" />
                            {event.location}
                          </div>
                          <div className="flex items-center gap-2.5 text-slate-400 text-xs font-bold uppercase tracking-widest">
                            <Users className="w-4 h-4 text-emerald-500" />
                            {event.registrants?.length || 0} / {event.isUnlimited ? '∞' : event.capacity} Cupos
                          </div>
                        </div>

                        <div className="pt-4 flex items-center justify-between">
                          {!isAdmin && (() => {
                            const isPast = event.date < new Date().toISOString().split('T')[0];
                            if (isPast) {
                              return (
                                <button 
                                  disabled
                                  className="px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed flex items-center gap-2"
                                >
                                  <span>Jornada Expirada / Finalizada</span>
                                </button>
                              );
                            }
                            return (
                              <button 
                                onClick={() => handleRegister(event, isRegistered)}
                                disabled={isFull && !isRegistered}
                                className={cn(
                                  "px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2",
                                  isRegistered 
                                    ? "bg-slate-100 text-slate-600 border border-slate-200" 
                                    : isFull ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-100"
                                )}
                              >
                                {isRegistered ? <CheckCircle size={16} /> : <Star size={16} />}
                                {isRegistered ? 'Inscrito' : isFull ? 'Cupos Agotados' : 'Participar'}
                              </button>
                            );
                          })()}
                          {isAdmin && (
                            <button 
                              onClick={() => { setSelectedEvent(event); setShowRegistrants(true); }}
                              className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                            >
                              <Users size={14} /> Ver listado de inscritos
                            </button>
                          )}
                          <div className="text-[10px] font-bold text-slate-400 uppercase">
                            Plazo: {event.deadline || 'Hasta fecha'}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm h-fit">
              <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-emerald-600" />
                Días Destacados
              </h4>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-300 mb-4 uppercase tracking-widest">
                {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => <div key={`${d}-${i}`}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 31 }).map((_, i) => {
                  const hasEvent = events.some(e => new Date(e.date).getDate() === i + 1);
                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all cursor-pointer border",
                        hasEvent ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200 scale-110" : "hover:bg-slate-50 border-transparent text-slate-600"
                      )}
                    >
                      {i + 1}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white relative overflow-hidden group shadow-2xl shadow-slate-200">
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:rotate-12 transition-transform">
                  💡
                </div>
                <h4 className="text-xl font-bold mb-3 tracking-tight">¿Cómo participar?</h4>
                <p className="text-slate-400 text-sm leading-relaxed mb-8">
                  {isAdmin 
                    ? "Como administrador, gestiona las jornadas comunitarias y supervisa la participación ciudadana." 
                    : "Todas nuestras jornadas son autogestionadas. Recuerda traer tu cédula original y estar al día con los censos de tu calle."}
                </p>
                <button 
                  onClick={() => setShowInfo(true)}
                  className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/40"
                >
                  Más Información
                </button>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl translate-x-12 -translate-y-12" />
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white max-w-2xl w-full rounded-[3rem] p-10 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                    {selectedEvent ? 'Editar Evento' : 'Crear Nuevo Evento'}
                  </h3>
                  <p className="text-slate-500 font-medium">Configura los detalles de la jornada comunitaria</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                  <X />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Título del Evento</label>
                  <input 
                    required 
                    placeholder="Ej. Entrega CLAO, Operativo de Salud..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Fecha</label>
                    <input 
                      type="date"
                      required 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Hora</label>
                    <input 
                      required 
                      placeholder="9:00 AM"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.time}
                      onChange={e => setFormData({...formData, time: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Ubicación</label>
                    <input 
                      required 
                      placeholder="Lugar del evento"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Tipo</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value as any})}
                    >
                      <option value="jornada">Jornada</option>
                      <option value="evento">Evento Comunitario</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Capacidad Máxima</label>
                    <div className="flex gap-4">
                      <input 
                        type="number"
                        disabled={formData.isUnlimited}
                        required={!formData.isUnlimited}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
                        value={formData.capacity}
                        onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})}
                      />
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, isUnlimited: !formData.isUnlimited})}
                        className={cn(
                          "px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                          formData.isUnlimited ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-400 border-slate-200 hover:border-emerald-300"
                        )}
                      >
                        {formData.isUnlimited ? 'Ilimitado' : 'Limitar'}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Tope Registro</label>
                    <input 
                      placeholder="Ej. Mañana al mediodia"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.deadline}
                      onChange={e => setFormData({...formData, deadline: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Descripción</label>
                  <textarea 
                    required 
                    rows={3}
                    placeholder="Detalles sobre participación..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                    value={formData.desc}
                    onChange={e => setFormData({...formData, desc: e.target.value})}
                  />
                </div>

                <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-[1.5rem] font-bold shadow-2xl shadow-emerald-200 hover:bg-emerald-500 transition-all flex items-center justify-center gap-2">
                  <Star size={18} />
                  {selectedEvent ? 'Actualizar Evento' : 'Publicar Agenda'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showInfo && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-white max-w-md w-full rounded-[2.5rem] p-10 space-y-6 shadow-2xl border border-slate-100"
            >
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl mx-auto">
                🤝
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Manual de Participación</h3>
                <p className="text-sm text-slate-500 font-medium">Nuestras jornadas son 100% autogestionadas por el Consejo Comunal La Fortuna.</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                <div className="flex gap-4">
                  <div className="w-6 h-6 bg-emerald-500 rounded-full flex shrink-0 items-center justify-center text-white text-[10px] font-bold">1</div>
                  <p className="text-xs text-slate-600 font-bold leading-relaxed">Presentar Cédula de Identidad laminada original.</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 bg-emerald-500 rounded-full flex shrink-0 items-center justify-center text-white text-[10px] font-bold">2</div>
                  <p className="text-xs text-slate-600 font-bold leading-relaxed">Estar registrado y verificado en el censo comunal de su respectiva calle.</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 bg-emerald-500 rounded-full flex shrink-0 items-center justify-center text-white text-[10px] font-bold">3</div>
                  <p className="text-xs text-slate-600 font-bold leading-relaxed">Respetar el orden de llegada y las indicaciones de los jefes de calle.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowInfo(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}

        {showRegistrants && selectedEvent && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-white max-w-xl w-full rounded-[2.5rem] p-10 space-y-6 relative overflow-hidden"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Inscritos en Jornada</h3>
                <button onClick={() => setShowRegistrants(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X /></button>
              </div>
              <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {selectedEvent.registrantsData?.length > 0 ? (
                  selectedEvent.registrantsData.map((reg: any) => (
                    <div key={reg.uid} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-xs uppercase">
                            {reg.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700">{reg.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              V-{reg.cedula}
                            </p>
                          </div>
                        </div>
                        <div className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-sm border border-emerald-200">Confirmado</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200/50">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          <Phone size={12} className="text-emerald-500" />
                          {reg.phone}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          <MapPin size={12} className="text-emerald-500" />
                          {reg.street}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-400 py-10 italic">No hay registrados todavía.</p>
                )}
              </div>
              <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">Registros auditables por el consejo comunal</p>
            </motion.div>
          </div>
        )}

        {showEventDetailsModal && selectedEvent && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white max-w-xl w-full rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 relative overflow-hidden max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
            >
              <div className={cn(
                "absolute top-0 inset-x-0 h-4",
                selectedEvent.type === 'jornada' ? 'bg-amber-400' : 'bg-sky-450 bg-sky-400'
              )} />

              <div className="flex justify-between items-start mb-6 pt-2">
                <div className="max-w-[85%]">
                  <span className={cn(
                    "text-[8px] uppercase font-black tracking-[0.2em] px-3 py-1 rounded-full mb-3 inline-block",
                    selectedEvent.type === 'jornada' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                  )}>
                    {selectedEvent.type}
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-snug uppercase">
                    {selectedEvent.title}
                  </h3>
                </div>
                <button 
                  type="button"
                  onClick={() => { setShowEventDetailsModal(false); setSelectedEvent(null); }} 
                  className="p-2 hover:bg-slate-150 rounded-xl transition-all bg-slate-50 border border-slate-100"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              <div className="space-y-6">
                <p className="text-slate-500 text-xs font-semibold leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100/80">
                  {selectedEvent.desc}
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                    <CalendarIcon className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Fecha</p>
                      <p className="text-xs font-black text-slate-800">
                        {new Date(selectedEvent.date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                    <Clock className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Hora</p>
                      <p className="text-xs font-black text-slate-800">{selectedEvent.time}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3 col-span-2">
                    <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Lugar</p>
                      <p className="text-xs font-black text-slate-800">{selectedEvent.location}</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-slate-950 text-white rounded-[2rem] space-y-3 shadow-md">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cupos y Registros de la Calle</span>
                    <span className="text-xs font-black text-emerald-400">
                      {selectedEvent.registrants?.length || 0} / {selectedEvent.isUnlimited ? '∞' : selectedEvent.capacity}
                    </span>
                  </div>
                  {!selectedEvent.isUnlimited && (
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, (((selectedEvent.registrants?.length || 0) / selectedEvent.capacity) * 100))}%` }} 
                      />
                    </div>
                  )}
                  <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest text-center pt-1 border-t border-slate-800/50">
                    Plazo Máximo: {selectedEvent.deadline || 'Hasta el día de la jornada'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-150 flex flex-col gap-3">
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => {
                          setFormData(selectedEvent);
                          setShowEventDetailsModal(false);
                          setShowModal(true);
                        }} 
                        className="flex-1 py-3 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <Edit2 size={14} /> Editar
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setShowEventDetailsModal(false);
                          setEventToDelete(selectedEvent.id);
                          setShowDeleteModal(true);
                        }} 
                        className="flex-1 py-3 bg-red-50 border border-red-100 text-red-650 hover:bg-red-100 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 size={14} /> Eliminar
                      </button>
                    </div>
                  )}

                  {!isAdmin && (() => {
                    const isRegistered = selectedEvent.registrants?.includes(profile?.uid);
                    const spotsLeft = selectedEvent.isUnlimited ? Infinity : (selectedEvent.capacity - (selectedEvent.registrants?.length || 0));
                    const isFull = !selectedEvent.isUnlimited && spotsLeft <= 0;
                    const isPastEvent = selectedEvent.date < new Date().toISOString().split('T')[0];

                    if (isPastEvent) {
                      return (
                        <button 
                          type="button"
                          disabled
                          className="w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed flex items-center justify-center gap-2 shadow-none"
                        >
                          <span>Jornada Finalizada (Información Histórica)</span>
                        </button>
                      );
                    }

                    return (
                      <button 
                        type="button"
                        onClick={() => {
                          handleRegister(selectedEvent, isRegistered);
                          setShowEventDetailsModal(false);
                        }}
                        disabled={isFull && !isRegistered}
                        className={cn(
                          "w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-md flex items-center justify-center gap-2 transition-all",
                          isRegistered 
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 shadow-none" 
                            : isFull ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/15"
                        )}
                      >
                        {isRegistered ? <CheckCircle size={16} /> : <Star size={16} />}
                        <span>{isRegistered ? 'Inscrito (Salir de Jornada)' : isFull ? 'Cupos Agotados' : 'Separar Cupo / Participar'}</span>
                      </button>
                    );
                  })()}

                  {isAdmin && (
                    <button 
                      type="button"
                      onClick={() => {
                        setShowEventDetailsModal(false);
                        setShowRegistrants(true);
                      }}
                      className="w-full py-3 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Users size={14} /> Ver listado de inscritos ({selectedEvent.registrantsData?.length || 0})
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={showDeleteModal}
        title="¿Eliminar este evento?"
        message="Esta acción no se puede deshacer y todos los registros de participantes se perderán permanentemente."
        onConfirm={() => eventToDelete && deleteEv(eventToDelete)}
        onCancel={() => {
          setShowDeleteModal(false);
          setEventToDelete(null);
        }}
      />
    </motion.div>
  );
}
