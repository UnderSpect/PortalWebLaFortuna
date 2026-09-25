import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { Users, Calendar, BarChart3, Heart, Info, ChevronRight, MessageSquare, ShieldCheck, Shield, X, Bell, MapPin, Compass, Navigation, Car, Bus, Server, Radio, BookOpen, Lock, TrendingUp, Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import mapaLaFortuna from '../../assets/images/mapa_satelital_la_fortuna_es_1779918753497.png';

export default function DashboardHome() {
  const { profile } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [counts, setCounts] = useState({
    census: 0,
    events: 0,
    surveys: 0,
    docs: 0,
    pendingReports: 0
  });

  const [expiringEvents, setExpiringEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        let vecCount = 1;
        if (profile?.role === 'admin') {
          const usersSnap = await getDocs(collection(db, 'users'));
          vecCount = usersSnap.docs.filter(d => d.data().role === 'vecino').length;
        } else if (profile?.role === 'jefe_calle' && profile?.street) {
          const qUsers = query(collection(db, 'users'), where('street', '==', profile.street));
          const usersSnap = await getDocs(qUsers);
          vecCount = usersSnap.docs.filter(d => d.data().role === 'vecino').length;
        }

        const eventsSnap = await getDocs(collection(db, 'events'));
        const surveysSnap = await getDocs(collection(db, 'surveys'));
        const docsSnap = await getDocs(collection(db, 'repository'));
        
        // Find active unconfirmed events for neighbor
        const now = new Date();
        const available = eventsSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter(event => {
            if (!event.date) return false;
            const eventDate = new Date(event.date + 'T23:59:59');
            return eventDate > now && !event.registrants?.includes(profile?.uid);
          });
        setExpiringEvents(available);

        // Count truly active, non-expired surveys
        const activeSurveysCount = surveysSnap.docs.filter(d => {
          const s = d.data();
          if (s.active === false) return false;
          if (s.expiresAt) {
            const parts = s.expiresAt.split('-');
            if (parts.length === 3) {
              const expDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 23, 59, 59, 999);
              if (now.getTime() > expDate.getTime()) return false;
            }
          }
          return true;
        }).length;

        let pendingReports = 0;
        if (profile?.role === 'admin' || profile?.role === 'jefe_calle') {
          const reportsSnap = await getDocs(query(collection(db, 'reports'), where('status', '==', 'pending')));
          pendingReports = reportsSnap.size;
        }

        setCounts({
          census: vecCount,
          events: eventsSnap.size,
          surveys: activeSurveysCount,
          docs: docsSnap.size,
          pendingReports
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    };
    fetchCounts();
    
    // Show welcome message only once per session or after login
    const hasSeenWelcome = sessionStorage.getItem('welcomeShown');
    if (!hasSeenWelcome) {
      setTimeout(() => setShowWelcome(true), 1500);
      sessionStorage.setItem('welcomeShown', 'true');
    }
  }, [profile]);

  if (!profile) return null;

  const stats = [
    { label: 'Censo Familiar', value: counts.census.toString(), icon: Users, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Próximos Eventos', value: counts.events.toString(), icon: Calendar, color: 'bg-sky-50 text-sky-600' },
    { label: 'Encuestas Activas', value: counts.surveys.toString(), icon: BarChart3, color: 'bg-amber-50 text-amber-600' },
    { label: 'Documentos', value: counts.docs.toString(), icon: Info, color: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-7xl mx-auto pb-12"
    >
      {expiringEvents.length > 0 && profile.role === 'vecino' && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <Bell className="animate-bounce" />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">¡Nueva Notificación!</p>
              <p className="text-sm font-bold text-slate-800">Tienes {expiringEvents.length} evento(s) o jornada(s) disponibles. ¡Confirma tu participación!</p>
            </div>
          </div>
          <Link to="/dashboard/events" className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-500 transition-all shadow-md">
            Ver Agenda
          </Link>
        </motion.div>
      )}

      {counts.pendingReports > 0 && (profile.role === 'admin' || profile.role === 'jefe_calle') && (
        <Link to="/dashboard/chat" className="block bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
              <Info className="animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-black text-amber-600 uppercase tracking-widest">Atención Requerida</p>
              <p className="text-sm font-bold text-slate-700">Tienes {counts.pendingReports} reporte(s) ciudadano(s) pendiente(s).</p>
            </div>
          </div>
          <ChevronRight className="text-amber-400 group-hover:translate-x-1 transition-transform" />
        </Link>
      )}

      {profile.role === 'jefe_calle' && (
        <div className="bg-emerald-600 p-8 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-emerald-500/10">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-2xl font-bold flex items-center gap-2 justify-center md:justify-start uppercase tracking-tighter">
              <ShieldCheck className="text-emerald-300" />
              Liderazgo de Calle
            </h3>
            <p className="text-emerald-100 text-sm font-medium">Estás encargado de la calle <span className="font-black underline">{profile.street}</span>. Asegúrate de verificar a tus vecinos y comunicar las nuevas jornadas.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/dashboard/census" className="px-6 py-2.5 bg-white text-emerald-600 rounded-xl font-bold text-xs hover:bg-emerald-50 transition-all">Gestionar Censo</Link>
            <Link to="/dashboard/chat" className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-xs hover:bg-emerald-400 border border-emerald-400/30 transition-all">Comunicados</Link>
          </div>
        </div>
      )}

      {profile.role === 'admin' && (
        <div className="bg-slate-900 p-8 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-2xl font-bold flex items-center gap-2 justify-center md:justify-start uppercase tracking-tighter">
              <Shield className="text-emerald-500" />
              Panel de Control Admin
            </h3>
            <p className="text-slate-400 text-sm font-medium">Supervisión total de La Fortuna. Pendiente de los reportes ciudadanos y la gestión de los jefes de calle.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/dashboard/chat" className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-500 transition-all">Ver Reportes</Link>
            <Link to="/dashboard/events" className="px-6 py-2.5 bg-white/10 text-white rounded-xl font-bold text-xs hover:bg-white/20 transition-all">Agenda Global</Link>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showWelcome && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-8 left-8 right-8 md:left-auto md:right-8 md:w-96 z-50 bg-slate-900 text-white p-6 rounded-3xl shadow-2xl border border-white/10"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/20">
                ✨
              </div>
              <button onClick={() => setShowWelcome(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <h4 className="text-xl font-bold mb-2 uppercase tracking-tighter">¡Bienvenido a La Fortuna!</h4>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              {profile.role === 'admin' 
                ? "Como administrador central, tienes acceso total a los censos, reportes y eventos de toda la comunidad."
                : profile.role === 'jefe_calle'
                ? `Eres el líder de la calle ${profile.street}. Tu misión es velar por el bienestar de tus vecinos.`
                : "Estamos felices de tenerte aquí. Mantén tu información actualizada en el censo para recibir todos los beneficios."}
            </p>
            <button 
              onClick={() => setShowWelcome(false)}
              className="w-full py-3 bg-white text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-50 transition-colors"
            >
              Comenzar ahora
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-slate-900 p-10 rounded-[3rem] text-white border border-slate-800 relative overflow-hidden shadow-2xl">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 border border-emerald-500/30">
            Resumen General
          </div>
          <h2 className="text-4xl font-black mb-3 tracking-tighter uppercase">¡Hola, {profile.firstName}! 👋</h2>
          <p className="text-slate-300 max-w-lg text-sm leading-relaxed">
            {profile.role === 'admin' || profile.role === 'jefe_calle' 
              ? "Gestiona tu calle, responde a tus vecinos y mantén informada a la comunidad de La Fortuna." 
              : "Mantente al tanto de todo lo que ocurre en tu comunidad y participa en las decisiones de La Fortuna."}
          </p>
          <div className="flex flex-wrap gap-4 mt-10">
            <Link to="/dashboard/events" className="px-8 py-3.5 bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20">
              Ver Agenda <ChevronRight size={18} />
            </Link>
            <Link to="/dashboard/profile" className="px-8 py-3.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-xl font-bold text-white hover:bg-white/20 transition-all">
              Mi Perfil
            </Link>
          </div>
        </div>
        
        {/* Abstract shapes for theme */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5 group hover:shadow-lg transition-all">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Activity Log */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Info className="w-6 h-6 text-emerald-600" />
                Noticias y Avisos
              </h3>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">SISTEMA ACTIVO</span>
            </div>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 text-slate-300">
                <MessageSquare size={32} />
              </div>
              <h4 className="font-bold text-slate-900 mb-2">No hay avisos recientes</h4>
              <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                Las notificaciones importantes de tu comunidad aparecerán aquí cuando los administradores realicen publicaciones.
              </p>
            </div>
            {/* Abstract backgrounds */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-slate-50 rounded-full blur-3xl opacity-50" />
          </div>
        </div>

        {/* Community Message */}
        <div className="flex flex-col gap-6">
          <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white relative flex flex-col justify-center overflow-hidden shadow-2xl shadow-emerald-200 group flex-1">
            <div className="relative z-10">
              <Heart className="w-12 h-12 mb-6 text-emerald-300 drop-shadow-lg group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-4 tracking-tight">¡Unidos somos más fuertes!</h3>
              <p className="text-emerald-100 leading-relaxed font-medium text-sm">
                Tu participación en las encuestas y eventos es el motor que impulsa las mejoras en La Fortuna.
              </p>
              <div className="inline-block mt-10 text-[9px] font-black uppercase tracking-[0.2em] opacity-60">
                GOBIERNO COMUNITARIO
              </div>
            </div>
            
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          </div>

          {/* Ubicación de la Comunidad Card */}
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col justify-between group overflow-hidden relative border border-slate-800">
            <div className="z-10 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 text-red-400 rounded-full text-[9px] font-bold uppercase tracking-widest border border-red-500/20">
                <MapPin size={10} className="fill-red-400" />
                Ubicación Real
              </div>
              <h4 className="text-lg font-black uppercase tracking-tight">Km 4 y 5, El Junquito</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                La Fortuna está construida sobre las montañas de El Junquito, ubicada entre el <span className="text-emerald-400 font-extrabold">Km 4 y el Km 5</span>.
              </p>
              
              <div className="relative rounded-2xl overflow-hidden border border-slate-850 h-24 mt-2">
                <img 
                  src={mapaLaFortuna} 
                  alt="La Fortuna Map" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent flex items-end p-2 justify-between">
                  <span className="text-[8px] font-mono font-bold text-slate-300">10°29'41.51"N 66°58'52.02"W</span>
                  <a 
                    href="https://www.google.com/maps/place/10%C2%B029'41.5%22N+66%C2%B058'52.0%22W" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[9px] text-emerald-400 font-bold flex items-center gap-1 hover:underline"
                  >
                    <Navigation size={10} />
                    Ver Mapa
                  </a>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -z-10" />
          </div>

          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col justify-between group overflow-hidden relative border border-slate-800">
            <div className="z-10">
              <h4 className="text-lg font-bold mb-2">Ayuda y Soporte</h4>
              <p className="text-slate-400 text-xs">¿Tienes alguna duda técnica? Contáctanos.</p>
            </div>
            <Link to="/dashboard/chat" className="mt-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-center text-sm font-bold transition-all relative z-10 border border-white/5">
              Ir al Soporte
            </Link>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-500/30 transition-all" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
