import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, Send, Phone, MessageCircle, ExternalLink, ShieldCheck, Mail,
  User, Search, Clock, AlertTriangle, X, CheckCircle, Trash2
} from 'lucide-react';
import { 
  collection, addDoc, query, orderBy, limit, onSnapshot, 
  serverTimestamp, where, doc, updateDoc, deleteDoc, getDocs 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

export default function ChatPage() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [chatType, setChatType] = useState<'community' | 'private'>('community');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState({ title: '', desc: '', type: 'servicios', imageUrl: '', priority: 'media' });
  const [isUploadingReport, setIsUploadingReport] = useState(false);
  const [privateMessages, setPrivateMessages] = useState<any[]>([]);
  const [streetLeader, setStreetLeader] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [usersToChatWith, setUsersToChatWith] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;

    // Community Messages
    const messagesRef = collection(db, 'messages');
    const qMessages = query(messagesRef, orderBy('createdAt', 'asc'), limit(50));

    const unsubscribeMessages = onSnapshot(qMessages, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      if (chatType === 'community') {
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'messages'));

    // Reports subscription - ALL reports visible to all
    const reportsRef = collection(db, 'reports');
    const qReports = query(reportsRef, orderBy('createdAt', 'desc'));

    const unsubscribeReports = onSnapshot(qReports, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'reports'));

    // Private Messages logic
    let unsubscribePrivate: any = () => {};
    if (chatType === 'private') {
      const usersRef = collection(db, 'users');
      
      if (profile.role === 'vecino') {
        // Neighbors can see ALL Admins and ALL Street Leaders (as requested)
        const qStaff = query(usersRef, where('role', 'in', ['admin', 'jefe_calle']));
        getDocs(qStaff).then(snap => {
          const staff = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          setUsersToChatWith(staff);
          if (staff.length > 0 && !selectedUser) {
            setSelectedUser(staff[0]);
          }
        });
      } else {
        // Staff can see neighbors
        // Admins see everyone, Street Leaders see their street
        let qUsers;
        if (profile.role === 'admin') {
          qUsers = query(usersRef, where('role', 'in', ['vecino', 'jefe_calle']));
        } else {
          qUsers = query(usersRef, where('street', '==', profile.street), where('role', '==', 'vecino'));
        }
        
        getDocs(qUsers).then(snap => {
          setUsersToChatWith(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
        });
      }

      // Listen for messages if someone is selected
      const targetId = selectedUser?.id;
      if (targetId) {
        const pmsRef = collection(db, 'direct_messages');
        const qPrivate = query(
          pmsRef,
          where('members', 'array-contains', profile.uid),
          orderBy('createdAt', 'asc')
        );
        unsubscribePrivate = onSnapshot(qPrivate, (snapshot) => {
          const allMsgs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
          // Filter client-side for the specific 1:1 pair to avoid complex composite indexes
          const pairs = allMsgs.filter((m: any) => m.members.includes(targetId));
          setPrivateMessages(pairs);
          setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });
      }
    }

    setLoading(false);

    return () => {
      unsubscribeMessages();
      unsubscribeReports();
      unsubscribePrivate();
    };
  }, [profile, chatType, streetLeader?.id, selectedUser?.id]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;
    try {
      const text = newMessage;
      setNewMessage('');
      
      if (chatType === 'community') {
        await addDoc(collection(db, 'messages'), {
          text,
          senderId: profile.uid,
          senderName: `${profile.firstName} ${profile.firstSurname}`,
          senderRole: profile.role,
          createdAt: serverTimestamp(),
        });
      } else {
        const targetId = selectedUser?.id;
        if (!targetId) return;
        
        await addDoc(collection(db, 'direct_messages'), {
          text,
          senderId: profile.uid,
          senderName: `${profile.firstName} ${profile.firstSurname}`,
          senderRole: profile.role,
          receiverId: targetId,
          members: [profile.uid, targetId],
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, chatType === 'community' ? 'messages' : 'direct_messages');
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !reportData.title || !reportData.desc) return;
    try {
      await addDoc(collection(db, 'reports'), {
        ...reportData,
        status: 'pending',
        userId: profile.uid,
        userName: `${profile.firstName} ${profile.firstSurname}`,
        userPhoto: profile.photoUrl || null,
        street: profile.street,
        createdAt: serverTimestamp(),
      });
      setShowReportModal(false);
      setReportData({ title: '', desc: '', type: 'servicios', imageUrl: '', priority: 'media' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reports');
    }
  };

  const handleReportImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingReport(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.7);
        setReportData(prev => ({ ...prev, imageUrl: base64 }));
        setIsUploadingReport(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);
  const [resolutionImg, setResolutionImg] = useState<string>('');
  const [isUploadingResolution, setIsUploadingResolution] = useState(false);

  const handleResolutionImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingResolution(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const max_size = 800; // Resize to max 800px width/height

        if (width > height) {
          if (width > max_size) {
            height *= max_size / width;
            width = max_size;
          }
        } else {
          if (height > max_size) {
            width *= max_size / height;
            height = max_size;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', 0.7);
        setResolutionImg(base64);
        setIsUploadingResolution(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const resolveReport = async (id: string) => {
    try {
      const updateData: any = { 
        status: 'resolved', 
        resolvedAt: new Date().toISOString(),
        resolvedByName: `${profile?.firstName} ${profile?.firstSurname}`,
        resolvedByRole: profile?.role || 'admin',
        adminNotes: noteText || 'Reporte marcado como resuelto.' // Auto-add note if resolving
      };
      if (resolutionImg) {
        updateData.resolutionImageUrl = resolutionImg;
      }
      await updateDoc(doc(db, 'reports', id), updateData);
      setEditingNoteId(null);
      setNoteText('');
      setResolutionImg('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${id}`);
    }
  };

  const deleteReport = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reports', id));
      setDeleteReportId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reports/${id}`);
    }
  };

  const saveNote = async (id: string) => {
    try {
      await updateDoc(doc(db, 'reports', id), { adminNotes: noteText });
      setEditingNoteId(null);
      setNoteText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${id}`);
    }
  };

  const channels = [
    { name: 'Grupo Informativo WhatsApp', platform: 'WhatsApp', color: 'bg-[#25D366]', text: 'Ideal para recibir avisos rápidos de la calle.', icon: MessageCircle, link: 'https://chat.whatsapp.com/KlNfypuZda3Cj0gbXl5VE6?s=sh&p=a&iam=0' },
    { name: 'Portal Telegram Oficial', platform: 'Telegram', color: 'bg-[#0088cc]', text: 'Repositorio de información y chat grupal.', icon: Send, link: 'https://t.me/+2D7fWgkw_zMwMWMx' },
  ];

  const isStaff = ['admin', 'jefe_calle'].includes(profile?.role || '');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-10 max-w-7xl mx-auto pb-20"
    >
      <div className="max-w-4xl mx-auto text-center space-y-4">
        <div className="inline-flex py-1 px-3 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest mb-2 border border-emerald-200">Comunicaciones</div>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Centro de Comunicación</h2>
        <p className="text-slate-500 text-lg">
          {isStaff 
            ? "Gestiona las inquietudes de los vecinos y mantén informada a la comunidad." 
            : "Conéctate directamente con las autoridades de La Fortuna y mantente al día."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chat Module */}
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[650px]">
          <div className="p-6 border-b border-slate-100 bg-slate-900 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-xl">
                {chatType === 'community' ? '💬' : '🔒'}
              </div>
              <div>
                <h3 className="font-bold text-sm">
                  {chatType === 'community' ? 'Chat Comunitario' : 
                   selectedUser ? (
                     <div className="flex items-center gap-2">
                       {selectedUser.firstName} {selectedUser.firstSurname}
                       <span className="px-1.5 py-0.5 bg-white/20 rounded text-[7px] font-black uppercase tracking-widest">
                         {selectedUser.role === 'admin' ? 'Admin' : selectedUser.role === 'jefe_calle' ? 'Liderazgo' : 'Vecino'}
                       </span>
                     </div>
                   ) : (
                     'Selecciona un contacto'
                   )}
                </h3>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                  {chatType === 'community' ? 'Todos participan' : 'Conversación Privada'}
                </p>
              </div>
            </div>
            <div className="flex bg-white/10 p-1 rounded-xl">
              <button 
                onClick={() => setChatType('community')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  chatType === 'community' ? "bg-emerald-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
                )}
              >
                Comunidad
              </button>
              <button 
                onClick={() => setChatType('private')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  chatType === 'private' ? "bg-emerald-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
                )}
              >
                Privado
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {chatType === 'private' && (
              <div className="w-64 border-r border-slate-100 overflow-y-auto hidden md:block bg-slate-50">
                <div className="p-4 border-b border-slate-100 bg-white">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    {profile.role === 'vecino' ? 'Atención Garantizada' : 'Vecinos de tu Calle'}
                  </span>
                </div>
                {usersToChatWith.map(u => (
                  <button 
                    key={`user-choice-${u.id}`}
                    onClick={() => setSelectedUser(u)}
                    className={cn(
                      "w-full p-4 flex items-center gap-3 transition-all text-left",
                      selectedUser?.id === u.id ? "bg-emerald-50 border-r-4 border-emerald-500" : "hover:bg-white"
                    )}
                  >
                    <div className="w-10 h-10 bg-slate-200 rounded-xl overflow-hidden shrink-0 relative">
                      {u.photoUrl ? (
                        <img src={u.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold bg-slate-100">{u.firstName[0]}</div>
                      )}
                      {u.role !== 'vecino' && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                           <ShieldCheck size={8} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{u.firstName} {u.firstSurname}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">
                        {u.role === 'admin' ? 'Administrador' : u.role === 'jefe_calle' ? 'Jefe de Calle' : `Vecino Calle ${u.street}`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
                </div>
              ) : (chatType === 'community' ? messages : privateMessages).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <MessageSquare size={40} className="opacity-20" />
                  <p className="font-medium text-sm">
                    {chatType === 'community' ? 'No hay mensajes aún. ¡Sé el primero!' : 
                     profile?.role === 'vecino' ? 'Inicia una conversación privada con tu jefe de calle.' : 
                     'Selecciona un vecino para ver la conversación.'}
                  </p>
                </div>
              ) : (
                (chatType === 'community' ? messages : privateMessages).map((m, index) => {
                  const isMe = m.senderId === profile?.uid;
                  const isStaffMsg = ['admin', 'jefe_calle'].includes(m.senderRole || '');
                  const messageKey = m.id || `msg-${index}-${m.createdAt?.seconds || index}`;
                  
                  return (
                    <motion.div 
                      key={messageKey}
                      initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "flex flex-col max-w-[85%]",
                        isMe ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      {!isMe && (
                        <div className="flex items-center gap-2 mb-1 ml-1">
                          <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">
                            {chatType === 'community' ? m.senderName : selectedUser?.firstName}
                          </span>
                          <span className={cn(
                            "text-[7px] font-black uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border",
                            isStaffMsg ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200"
                          )}>
                            {(m.senderRole || selectedUser?.role) === 'admin' ? 'Admin' : (m.senderRole || selectedUser?.role) === 'jefe_calle' ? 'Jefe' : 'Vecino'}
                          </span>
                        </div>
                      )}
                      <div className={cn(
                        "px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm",
                        isMe 
                          ? "bg-slate-900 text-white rounded-tr-none" 
                          : "bg-white border border-slate-200 text-slate-700 rounded-tl-none"
                      )}>
                        {m.text}
                      </div>
                      {m.createdAt && (
                        <span className="text-[9px] text-slate-400 mt-1 font-bold">
                          {m.createdAt?.toDate ? new Date(m.createdAt.toDate()).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '...'}
                        </span>
                      )}
                    </motion.div>
                  );
                })
              )}
              <div ref={scrollRef} />
            </div>
          </div>

          <form onSubmit={sendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-2">
            <input 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={chatType === 'private' && profile?.role === 'jefe_calle' && !selectedUser ? "Selecciona un vecino primero..." : "Escribe un mensaje..."}
              disabled={chatType === 'private' && profile?.role === 'jefe_calle' && !selectedUser}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
            <button 
              type="submit"
              disabled={!newMessage.trim() || (chatType === 'private' && profile?.role === 'jefe_calle' && !selectedUser)}
              className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20"
            >
              <Send size={20} />
            </button>
          </form>
        </div>

        {/* Channels & Info */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden group">
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
                📢
              </div>
              <h4 className="text-xl font-bold mb-2">Canales Oficiales</h4>
              <p className="text-slate-400 text-sm mb-6">Información exclusiva y alertas de último minuto.</p>
              
              <div className="w-full space-y-3">
                {channels.map(c => (
                  <a 
                    key={c.platform} 
                    href={c.link} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between w-full p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <c.icon size={20} className={cn("text-white", c.color.replace('bg-', 'text-'))} />
                      <span className="font-bold text-xs">{c.name}</span>
                    </div>
                    <ExternalLink size={14} className="text-slate-500" />
                  </a>
                ))}
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -translate-y-12 translate-x-12" />
          </div>

          <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm relative group overflow-hidden">
             <div className="relative z-10">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <ShieldCheck size={20} className="text-emerald-500" />
                  Atención Segura
                </h4>
                <p className="text-slate-500 text-xs leading-relaxed mb-6 font-medium">
                  Reporta emergencias o situaciones sospechosas. Tu reporte será procesado por el equipo de seguridad y administración.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 group/item">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 transition-all">
                      <Mail size={18} />
                    </div>
                    <span className="text-[10px] font-bold font-mono text-slate-500">lafortuna@gmail.com</span>
                  </div>
                  <div className="flex items-center gap-4 group/item">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 transition-all">
                      <Phone size={18} />
                    </div>
                    <span className="text-[10px] font-bold font-mono text-slate-500">+58 4164040093</span>
                  </div>
                </div>
                {profile?.role === 'vecino' && (
                  <button 
                    onClick={() => setShowReportModal(true)}
                    className="mt-6 w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    <AlertTriangle size={14} /> Reportar Novedad
                  </button>
                )}
             </div>
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-2xl -translate-y-12 translate-x-12" />
          </div>

          {/* Community Reports List */}
          <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm space-y-4 max-h-[500px] overflow-y-auto">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-emerald-500" />
              Incidencias de la Comunidad
            </h4>
            <div className="space-y-4">
              {reports.length === 0 ? (
                <p className="text-[10px] text-slate-400 italic text-center py-4">No hay reportes registrados.</p>
              ) : (
                reports.map((r, rIndex) => {
                  const isStaff = ['admin', 'jefe_calle'].includes(profile.role);
                  const isOwner = r.userId === profile.uid;
                  const isUnattended = r.status === 'pending' && !r.adminNotes;
                  const reportKey = r.id || `report-${rIndex}-${r.createdAt?.seconds}`;

                  return (
                    <div key={reportKey} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col gap-3 group hover:border-emerald-200 hover:bg-white transition-all shadow-sm">
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100/80 pb-3">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-slate-200 rounded-xl overflow-hidden border border-white shadow-sm flex items-center justify-center shrink-0">
                             {r.userPhoto ? <img src={r.userPhoto} alt="" className="w-full h-full object-cover" /> : <div className="text-[10px] font-bold text-slate-400">{r.userName?.[0]}</div>}
                           </div>
                           <div className="min-w-0">
                              <span className="text-[10px] font-black text-slate-900 block uppercase tracking-tight truncate">{r.userName}</span>
                              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest block mt-0.5">Calle {r.street}</span>
                           </div>
                        </div>
                        
                        <div className="flex items-center gap-3 sm:justify-end shrink-0">
                          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                            {isStaff && isUnattended && (
                              <div className="flex items-center gap-1.5 bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg border border-red-100 animate-pulse">
                                <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                                <span className="text-[8px] font-black uppercase tracking-widest">Sin Atención</span>
                              </div>
                            )}
                            
                            {/* Priority Badge */}
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border",
                              (r.priority || 'media') === 'alta' ? "bg-red-50 text-red-700 border-red-200" :
                              (r.priority || 'media') === 'media' ? "bg-amber-50 text-amber-700 border-amber-200" :
                              "bg-slate-50 text-slate-600 border-slate-200"
                            )}>
                              {(r.priority || 'media') === 'alta' ? '🔴 ALTA' :
                               (r.priority || 'media') === 'media' ? '🟡 MEDIA' : '🟢 BAJA'}
                            </span>

                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border",
                              r.status === 'pending' ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"
                            )}>
                              {r.status === 'pending' ? 'Pendiente' : 'Resuelto'}
                            </span>
                          </div>

                          {((isStaff && r.status === 'resolved') || isOwner) && (
                            <div className="flex items-center shrink-0 ml-3 pl-3 border-l border-slate-200">
                              {deleteReportId === r.id ? (
                                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-red-200 shadow-sm animate-in fade-in zoom-in-95">
                                   <button 
                                     onClick={() => deleteReport(r.id)} 
                                     className="px-2 py-0.5 bg-red-600 text-white text-[8px] font-bold rounded uppercase hover:bg-red-700 transition-all"
                                   >
                                     Borrar
                                   </button>
                                   <button 
                                     onClick={() => setDeleteReportId(null)} 
                                     className="p-0.5 text-slate-400 hover:text-slate-600"
                                   >
                                     <X size={10} />
                                   </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => setDeleteReportId(r.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                  title="Eliminar Reporte"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[8px] text-slate-400 font-bold opacity-60 uppercase tracking-widest">{r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : '...'}</span>
                      </div>
                      
                      <div className="space-y-1">
                        <h5 className="text-xs font-black text-slate-800 leading-tight">{r.title}</h5>
                        <p className="text-[10px] text-slate-500 leading-relaxed">{r.desc}</p>
                      </div>

                      {r.imageUrl && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video group/img">
                           <img src={r.imageUrl} alt="Evidencia" className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-700" />
                        </div>
                      )}

                      {r.resolutionImageUrl && (
                        <div className="space-y-1.5 p-3 bg-emerald-50/20 rounded-2xl border border-emerald-100/60">
                          <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block">Evidencia de Solución:</span>
                          <div className="rounded-xl overflow-hidden border border-emerald-200 bg-slate-900 aspect-video group/resImg">
                             <img src={r.resolutionImageUrl} alt="Evidencia de Solución" className="w-full h-full object-cover group-hover/resImg:scale-105 transition-transform duration-500" />
                          </div>
                        </div>
                      )}
                      
                      {r.adminNotes && (
                        <div className="bg-white/80 p-3 rounded-xl border border-emerald-100 shadow-sm relative overflow-hidden">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5 relative z-10">
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck size={10} className="text-emerald-500" />
                              <span className="text-[7px] font-black text-emerald-600 uppercase tracking-[0.15em]">Seguimiento de Gestión</span>
                            </div>
                            {r.status === 'resolved' && (
                              <span className="text-[8px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                Resuelto por: {r.resolvedByName || 'Liderazgo'} ({r.resolvedByRole === 'admin' ? 'Administrador' : 'Jefe de Calle'})
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] text-slate-600 font-medium italic relative z-10 leading-relaxed">"{r.adminNotes}"</p>
                          <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-50 rounded-full blur-xl -translate-y-4 translate-x-4 opacity-50" />
                        </div>
                      )}

                      {r.status === 'resolved' && !r.adminNotes && (
                        <div className="bg-emerald-50/30 p-2.5 rounded-xl border border-emerald-100/40 flex items-center gap-2 relative overflow-hidden">
                          <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
                          <p className="text-[9px] text-emerald-700 font-semibold leading-tight">
                            Caso resuelto por: <span className="font-extrabold text-slate-800 uppercase">{r.resolvedByName || 'Liderazgo'}</span> {' '}
                            <span className="text-slate-400 font-bold">({r.resolvedByRole === 'admin' ? 'Administrador' : 'Jefe de Calle'})</span>
                          </p>
                        </div>
                      )}

                      {profile?.role === 'jefe_calle' && r.status !== 'resolved' && (
                        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                          {editingNoteId === r.id ? (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                              <textarea 
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="Escribe el seguimiento o reporte de solución..."
                                className="w-full bg-white border border-emerald-100 rounded-xl p-3 text-[10px] font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                                rows={2}
                              />

                              <div className="space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Adjuntar Foto de Solución (Opcional)</label>
                                <div className="flex gap-3 items-center">
                                  <label className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border-2 border-dashed rounded-xl transition-all cursor-pointer text-[9px] font-extrabold uppercase tracking-wide",
                                    resolutionImg ? "border-emerald-500 bg-emerald-50/50 text-emerald-700" : "border-slate-200 hover:border-emerald-400 bg-white text-slate-500"
                                  )}>
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      accept="image/*"
                                      onChange={handleResolutionImageUpload}
                                      disabled={isUploadingResolution}
                                    />
                                    {isUploadingResolution ? (
                                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-emerald-500 border-t-transparent" />
                                    ) : resolutionImg ? (
                                      <span>✓ Foto Cargada</span>
                                    ) : (
                                      <span>Subir Foto Evidencia</span>
                                    )}
                                  </label>
                                  {resolutionImg && (
                                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-emerald-300 shrink-0 relative">
                                      <img src={resolutionImg} alt="Solución" className="w-full h-full object-cover" />
                                      <button 
                                        type="button" 
                                        onClick={() => setResolutionImg('')} 
                                        className="absolute top-0 right-0 bg-red-600 text-white rounded-bl p-1 shadow hover:bg-red-700 transition-colors"
                                      >
                                        <X size={10} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <button 
                                  onClick={() => saveNote(r.id)}
                                  className="px-3 py-1.5 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg flex-1 shadow-lg shadow-emerald-900/10 hover:bg-emerald-700 transition-colors"
                                >
                                  Guardar Nota
                                </button>
                                {r.status === 'pending' && (
                                  <button 
                                    onClick={() => resolveReport(r.id)}
                                    className="px-3 py-1.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg flex-1 hover:bg-slate-800 transition-colors"
                                  >
                                    Resolver Caso
                                  </button>
                                )}
                                <button 
                                  onClick={() => { setEditingNoteId(null); setNoteText(''); setResolutionImg(''); }}
                                  className="p-1.5 text-slate-400 hover:text-slate-600"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-3">
                              <button 
                                onClick={() => {
                                  setEditingNoteId(r.id);
                                  setNoteText(r.adminNotes || '');
                                }}
                                className="text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-emerald-600 flex items-center justify-center gap-1.5 bg-white px-4 py-2 rounded-xl border border-slate-200 hover:border-emerald-200 shadow-sm transition-all"
                              >
                                <Clock size={12} /> {r.adminNotes ? 'Actualizar' : 'Atender'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-white max-w-md w-full rounded-[2.5rem] p-10 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Reportar Novedad</h3>
                <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X /></button>
              </div>

              <form onSubmit={handleReport} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Asunto de la Alerta</label>
                  <input 
                    required
                    placeholder="Ej. Vehículo sospechoso, Bote de agua..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                    value={reportData.title}
                    onChange={(e) => setReportData({...reportData, title: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Foto de Evidencia (Recomendado)</label>
                  <div className="flex gap-3 items-center">
                     <label className={cn(
                       "flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-3xl transition-all cursor-pointer",
                       reportData.imageUrl ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-emerald-400 bg-slate-50"
                     )}>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleReportImageUpload}
                          disabled={isUploadingReport}
                        />
                        {isUploadingReport ? (
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
                        ) : reportData.imageUrl ? (
                          <div className="flex flex-col items-center gap-2">
                             <CheckCircle className="text-emerald-500" size={24} />
                             <span className="text-[9px] font-black text-emerald-600 uppercase">Cambiar Foto</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Search className="text-slate-300" size={24} />
                            <span className="text-[9px] font-black text-slate-400 uppercase">Subir Foto</span>
                          </div>
                        )}
                     </label>
                     {reportData.imageUrl && (
                       <div className="w-24 h-24 rounded-2xl overflow-hidden border border-emerald-200 shadow-xl shrink-0">
                         <img src={reportData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                       </div>
                     )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Categoría</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                      value={reportData.type}
                      onChange={(e) => setReportData({...reportData, type: e.target.value})}
                    >
                      <option value="servicios">🚗 Servicios Públicos</option>
                      <option value="seguridad">👮 Seguridad Ciudadana</option>
                      <option value="salud">🚨 Emergencia Médica</option>
                      <option value="infraestructura">🏗️ Infraestructura</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Prioridad</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                      value={reportData.priority}
                      onChange={(e) => setReportData({...reportData, priority: e.target.value})}
                    >
                      <option value="baja">🟢 Baja</option>
                      <option value="media">🟡 Media</option>
                      <option value="alta">🔴 Alta</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Descripción del Suceso</label>
                  <textarea 
                    required
                    placeholder="Indique detalles específicos..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold"
                    rows={3}
                    value={reportData.desc}
                    onChange={(e) => setReportData({...reportData, desc: e.target.value})}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowReportModal(false)}
                    className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-2xl transition-all"
                  >
                    Cerrar
                  </button>
                  <button 
                    type="submit"
                    disabled={isUploadingReport}
                    className="flex-1 py-4 bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-emerald-500 shadow-xl shadow-emerald-900/20 transition-all disabled:opacity-50"
                  >
                    Emitir Alerta
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
