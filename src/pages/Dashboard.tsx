import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { 
  collection, query, onSnapshot, orderBy, limit, where 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, Users, Calendar, BarChart3, FolderOpen, MessageSquare, 
  Settings, LogOut, Shield, Map, Clock as ClockIcon, Calendar as CalendarIcon, Menu, X, Bell, ShieldCheck, Mountain, Trash2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { DeleteAccountModal } from '../components/DeleteAccountModal';

// Subpages (I'll create these next)
import DashboardHome from './dashboard/Home';
import CensusPage from './dashboard/Census';
import EventsPage from './dashboard/Events';
import SurveysPage from './dashboard/Surveys';
import RepositoryPage from './dashboard/Repository';
import ChatPage from './dashboard/Chat';
import ProfilePage from './dashboard/Profile';

export default function Dashboard() {
  const { profile, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Show login notification
    setNotification({ message: 'Sesión iniciada correctamente', type: 'success' });
    const timer = setTimeout(() => setNotification(null), 3000);
    
    // Show welcome message only once per session
    const hasSeenWelcome = sessionStorage.getItem('welcomeShown');
    if (!hasSeenWelcome) {
      setTimeout(() => setShowWelcome(true), 2000);
      sessionStorage.setItem('welcomeShown', 'true');
    }

    return () => clearTimeout(timer);
  }, []);

  const [hasNewActivity, setHasNewActivity] = useState(false);
  const [resolvedReportAlert, setResolvedReportAlert] = useState<any>(null);

  useEffect(() => {
    // Listener for reports/messages to indicate new activity in Communication
    if (!profile) return;

    const reportsRef = collection(db, 'reports');
    // Staff sees any pending report, neighbors only see THEIR pending reports
    let reportsQuery = query(reportsRef, where('status', '==', 'pending'), limit(1));
    if (profile.role === 'vecino') {
      reportsQuery = query(reportsRef, where('userId', '==', profile.uid), where('status', '==', 'pending'), limit(1));
    }
    
    const unsubscribeReports = onSnapshot(reportsQuery, (snapshot) => {
      setHasNewActivity(!snapshot.empty);
    }, (error) => {
      console.error("Dashboard activity listener error:", error);
    });

    // Special listener for neighbors: notify when a report is resolved
    let unsubscribeResolved = () => {};
    if (profile.role === 'vecino') {
      // Query reports using single field filter to prevent any Firestore composite index issues, filtering status='resolved' in-memory.
      const qUserReports = query(
        reportsRef, 
        where('userId', '==', profile.uid)
      );

      let isFirstLoad = true;

      unsubscribeResolved = onSnapshot(qUserReports, (snapshot) => {
        const seenIds = JSON.parse(localStorage.getItem('seenResolvedReports') || '[]');
        const resolvedDocs = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() as any }))
          .filter(r => r.status === 'resolved');
        
        if (isFirstLoad) {
          // On initial load, mark all existing resolved reports as seen to prevent historical popups
          const initialSeen = Array.from(new Set([...seenIds, ...resolvedDocs.map(r => r.id)]));
          localStorage.setItem('seenResolvedReports', JSON.stringify(initialSeen));
          isFirstLoad = false;
          return;
        }

        // On real-time changes, detect any newly resolved report
        const currentSeen = JSON.parse(localStorage.getItem('seenResolvedReports') || '[]');
        const newResolved = resolvedDocs.filter(r => !currentSeen.includes(r.id));

        if (newResolved.length > 0) {
          // Display the newest resolved report alert
          setResolvedReportAlert(newResolved[0]);
          
          // Mark as seen
          const updatedSeen = Array.from(new Set([...currentSeen, ...newResolved.map(r => r.id)]));
          localStorage.setItem('seenResolvedReports', JSON.stringify(updatedSeen));
          
          // Auto hide after 8 seconds
          setTimeout(() => setResolvedReportAlert(null), 8000);
        }
      });
    }

    return () => {
      unsubscribeReports();
      unsubscribeResolved();
    };
  }, [profile]);

  if (loading) return <div>Cargando...</div>;
  if (!profile) return null;

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const navItems = [
    { label: 'Inicio', icon: Home, path: '/dashboard', roles: ['admin', 'jefe_calle', 'vecino'] },
    { label: 'Censo', icon: Users, path: '/dashboard/census', roles: ['admin', 'jefe_calle'] },
    { label: 'Eventos', icon: Calendar, path: '/dashboard/events', roles: ['admin', 'jefe_calle', 'vecino'] },
    { label: 'Encuestas', icon: BarChart3, path: '/dashboard/surveys', roles: ['admin', 'jefe_calle', 'vecino'] },
    { label: 'Documentos', icon: FolderOpen, path: '/dashboard/repository', roles: ['admin', 'jefe_calle', 'vecino'] },
    { label: 'Comunicación', icon: MessageSquare, path: '/dashboard/chat', roles: ['admin', 'jefe_calle', 'vecino'], badge: hasNewActivity },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      {/* Sidebar */}
      <aside className={cn(
        "bg-slate-900 text-white border-r border-slate-800 transition-all duration-300 flex flex-col z-50",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0 text-emerald-400 font-bold text-xl shadow-lg shadow-emerald-500/10 transition-all group-hover:scale-110">
            <Mountain size={24} />
          </div>
          {isSidebarOpen && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-black leading-tight tracking-tighter truncate">LA FORTUNA</h1>
              <span className="text-[9px] text-emerald-400 font-black block uppercase tracking-widest -mt-0.5">GESTIÓN COMUNITARIA</span>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.filter(item => item.roles.includes(profile.role)).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.label}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative",
                  isActive 
                    ? "bg-slate-800 text-white border-l-4 border-emerald-500 shadow-lg" 
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
              >
                <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-emerald-400")} />
                {isSidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
                {item.badge && !isActive && (
                  <span className="absolute right-3 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-4">
          <div className="bg-slate-800 p-3 rounded-xl">
            <p className="text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-widest">SESIÓN ACTUAL</p>
            <p className="text-xs font-bold text-slate-200">{profile.role.replace('_', ' ').toUpperCase()}</p>
            <div className="mt-3 w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-[100%]"></div>
            </div>
          </div>
          <div className="space-y-1">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2.5 w-full text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            >
              <LogOut className="w-4 h-4 flex-shrink-0 text-slate-400" />
              {isSidebarOpen && <span className="font-medium text-xs">Finalizar Sesión</span>}
            </button>
            <button 
              onClick={() => setShowDeleteAccountModal(true)}
              className="flex items-center gap-3 px-4 py-2.5 w-full text-rose-400/90 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all group"
              title="Eliminar cuenta definitivamente"
            >
              <Trash2 className="w-4 h-4 flex-shrink-0 text-rose-400 group-hover:scale-110 transition-transform" />
              {isSidebarOpen && <span className="font-semibold text-xs">Eliminar Cuenta</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-50 rounded-lg text-slate-400"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="h-6 w-[1px] bg-slate-200" />
            <ClockCalendar />
          </div>

          <Link to="/dashboard/profile" className="flex items-center gap-6 group">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-bold text-slate-700 leading-tight group-hover:text-emerald-600 transition-colors">{profile.firstName} {profile.firstSurname}</span>
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">{profile.role.replace('_', ' ')}</span>
            </div>
            <div className="h-10 w-[1px] bg-slate-200" />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-900 border-2 border-white rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md group-hover:scale-105 transition-transform overflow-hidden">
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt="User Avatar" className="w-full h-full object-cover" />
                ) : (
                  <>{profile.firstName[0]}{profile.firstSurname[0]}</>
                )}
              </div>
            </div>
          </Link>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-8 relative scroll-smooth bg-slate-50">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<DashboardHome />} />
              <Route path="/census" element={<CensusPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/surveys" element={<SurveysPage />} />
              <Route path="/repository" element={<RepositoryPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </AnimatePresence>

          <AnimatePresence>
            {showWelcome && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
              >
                <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-2xl border border-white/10 flex items-center gap-5 relative overflow-hidden group">
                  <div className="shrink-0 w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-3xl group-hover:rotate-12 transition-transform shadow-lg shadow-emerald-500/20">
                    👋
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-black uppercase tracking-widest text-emerald-400">Portal La Fortuna</h4>
                    <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed">Hola {profile.firstName}, bienvenido(a) al sistema de gestión comunitaria.</p>
                  </div>
                  <button 
                    onClick={() => setShowWelcome(false)}
                    className="p-2 text-slate-500 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                </div>
              </motion.div>
            )}

            {resolvedReportAlert && (
              <motion.div 
                initial={{ opacity: 0, x: 100, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.9 }}
                className="fixed bottom-24 right-8 z-[100] w-full max-w-sm"
              >
                <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-2xl border border-emerald-500/30 overflow-hidden relative group">
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-2xl animate-pulse">
                      ✅
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Reporte Resuelto</h4>
                      <p className="text-xs font-bold leading-tight mt-1 text-slate-100">{resolvedReportAlert.title}</p>
                      <p className="text-[10px] text-slate-300 mt-2 font-medium leading-relaxed">
                        Su reporte ha sido resuelto por el{' '}
                        <span className="font-extrabold text-emerald-300">
                          {resolvedReportAlert.resolvedByRole === 'admin' ? 'Administrador' : 'Jefe de Calle'}
                        </span>{' '}
                        con el nombre:{' '}
                        <span className="font-extrabold text-white">
                          {resolvedReportAlert.resolvedByName || 'Liderazgo'}
                        </span>.
                      </p>
                    </div>
                    <button 
                      onClick={() => setResolvedReportAlert(null)}
                      className="absolute -top-2 -right-2 p-2 bg-slate-805 rounded-full text-slate-400 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-12 translate-x-12" />
                </div>
              </motion.div>
            )}

            {notification && (
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className={cn(
                  "fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50 border",
                  notification.type === 'success' ? "bg-emerald-600 text-white border-emerald-400" : "bg-red-600 text-white border-red-400"
                )}
              >
                <Bell className="w-5 h-5" />
                <span className="font-semibold text-sm">{notification.message}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {profile && (
        <DeleteAccountModal
          isOpen={showDeleteAccountModal}
          onClose={() => setShowDeleteAccountModal(false)}
          userId={profile.uid}
          userName={`${profile.firstName} ${profile.firstSurname}`}
          userRole={profile.role}
        />
      )}
    </div>
  );
}

function ClockCalendar() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-6 text-gray-500">
      <div className="flex items-center gap-2">
        <ClockIcon className="w-4 h-4 text-emerald-600" />
        <span className="text-sm font-mono font-bold tracking-tight text-slate-700">
          {time.toLocaleTimeString('es-VE', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          }).toLowerCase().replace(' ', '')}
        </span>
      </div>
      <div className="hidden lg:flex items-center gap-2">
        <CalendarIcon className="w-4 h-4 text-emerald-600" />
        <span className="text-[11px] font-bold uppercase tracking-tight text-slate-500">
          {time.toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })}
        </span>
      </div>
    </div>
  );
}
