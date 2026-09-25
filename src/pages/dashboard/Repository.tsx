import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FolderOpen, FileText, Download, Trash2, Upload, Search, FileCode, FileImage, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { 
  collection, addDoc, query, orderBy, onSnapshot, 
  doc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';
import { ConfirmationModal } from '../../components/ConfirmationModal';

export default function RepositoryPage() {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadFile = async (url: string, fileName: string, docId: string) => {
    if (url === '#' || !url) {
      alert('Este documento de prueba fue subido anteriormente y no contiene un archivo físico respaldado en el servidor. Por favor, elimínelo y vuelva a subirlo para poder descargarlo sin problemas.');
      return;
    }

    setDownloadingId(docId);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error del servidor al descargar. Código ${response.status}`);
      }
      const blob = await response.blob();
      
      // Check if we received an HTML error instead of a binary file
      if (blob.type.includes('text/html')) {
        const text = await blob.text();
        if (text.includes('Error') || text.includes('Not Found') || text.includes('Cannot GET')) {
          throw new Error('El archivo físico no fue encontrado en el servidor (posiblemente se eliminó o el servidor se reinició).');
        }
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download wrapper error:', error);
      alert('No se pudo descargar o abrir el archivo: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'repository'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'repository');
    });
    return () => unsubscribe();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(1) + ' KB';
    const mb = kb / 1024;
    return mb.toFixed(1) + ' MB';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      // 1. Convert file to Base64 to send to our Express backend
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      // 2. Upload file to our backend server
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: file.name,
          data: base64Data,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al guardar el archivo en el servidor.');
      }

      const uploadResult = await response.json();

      // 3. Store metadata in Firestore
      await addDoc(collection(db, 'repository'), {
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type.split('/')[1] || 'file',
        date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
        url: uploadResult.url,
        fileId: uploadResult.id,
        createdAt: serverTimestamp(),
        authorId: profile?.uid,
        authorName: profile?.firstName + ' ' + profile?.firstSurname,
        authorRole: profile?.role
      });
    } catch (error) {
      console.error(error);
      alert('Error de carga: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsUploading(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const docRef = doc(db, 'repository', id);
      const d = docs.find(doc => doc.id === id);
      if (d && d.fileId) {
        // Delete the physical file from the server
        await fetch(`/api/files/${d.fileId}`, { method: 'DELETE' }).catch(err => {
          console.error("No se pudo eliminar el archivo del servidor:", err);
        });
      }
      await deleteDoc(docRef);
      setDocToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `repository/${id}`);
    }
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'jefe_calle';

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="space-y-8 max-w-7xl mx-auto"
    >
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 inline-block">
            Gestión Documental
          </div>
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">Repositorio Oficial</h2>
          <p className="text-slate-500 max-w-lg">Archivos, actas y documentos legales vinculados al Consejo Comunal La Fortuna.</p>
        </div>
        <div className="flex flex-wrap gap-4 relative z-10 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input 
              placeholder="Buscar documento..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white w-full text-sm outline-none shadow-sm"
            />
          </div>
          <div className="relative">
            <input 
              type="file" 
              id="file-upload" 
              className="hidden" 
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            <label 
              htmlFor="file-upload" 
              className={cn(
                "btn-primary cursor-pointer",
                isUploading && "opacity-50 cursor-not-allowed"
              )}
            >
              {isUploading ? <Loader2 className="animate-spin h-5 w-5" /> : <Upload className="w-5 h-5" />}
              <span className="hidden sm:inline">{isUploading ? 'Subiendo...' : 'Subir Archivo'}</span>
            </label>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-50 rounded-full blur-3xl opacity-50 translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        {loading ? (
          <div className="p-20 flex justify-center">
            <Loader2 className="animate-spin text-emerald-500" size={40} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-5">Documento</th>
                  <th className="px-8 py-5 pl-0">Autor</th>
                  <th className="px-8 py-5 pl-0">Info</th>
                  <th className="px-8 py-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {docs.filter(d => d.name.toLowerCase().includes(search.toLowerCase())).map((doc, i) => (
                  <tr key={doc.id || `doc-${i}`} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-emerald-600 group-hover:bg-white group-hover:scale-110 transition-all shadow-sm">
                          {doc.type === 'pdf' ? <FileText className="w-6 h-6" /> : doc.type.includes('image') ? <FileImage className="w-6 h-6" /> : <FileCode className="w-6 h-6" />}
                        </div>
                        <span className="font-bold text-slate-700">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 pl-0">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-600">{doc.authorName || 'Sistema'}</span>
                        <span className="text-[9px] uppercase tracking-tighter text-emerald-600 font-black">{doc.authorRole || 'admin'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 pl-0">
                       <div className="flex flex-col">
                        <span className="text-[10px] font-mono text-slate-400 font-bold">
                          {doc.size === '0.0 MB' ? '< 0.1 MB' : doc.size}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{doc.date}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-3">
                         <button 
                          onClick={() => handleDownloadFile(doc.url, doc.name, doc.id)}
                          disabled={downloadingId === doc.id}
                          className="p-3 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100 disabled:opacity-50"
                          title="Descargar documento"
                        >
                          {downloadingId === doc.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Download className="w-5 h-5" />
                          )}
                        </button>
                        {(isAdmin || doc.authorId === profile?.uid) && (
                          <button 
                            onClick={() => { setDocToDelete(doc.id); setShowDeleteModal(true); }}
                            className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && docs.length === 0 && (
          <div className="p-20 text-center space-y-6">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
              <FolderOpen className="w-10 h-10 text-slate-200" />
            </div>
            <div>
              <p className="text-slate-900 font-bold text-xl">Sin archivos</p>
              <p className="text-slate-400 text-sm font-medium">No se han cargado documentos en este repositorio.</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex flex-col md:flex-row items-center gap-6 shadow-2xl shadow-slate-200 border border-white/5">
        <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-900/40">
          <Download className="w-7 h-7" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <p className="text-lg font-bold">Respaldo de Seguridad Activo</p>
          <p className="text-sm text-slate-400 font-medium leading-relaxed">
            Todos los documentos son encriptados y respaldados automáticamente. El sistema cumple con los estándares de seguridad para protección de datos comunitarios.
          </p>
        </div>
      </div>

      <ConfirmationModal 
        isOpen={showDeleteModal}
        title="¿Eliminar documento definitivamente?"
        message="Esta acción no se puede deshacer. El archivo y su registro histórico serán removidos del repositorio comunitario."
        onConfirm={() => docToDelete && handleDelete(docToDelete)}
        onCancel={() => {
          setShowDeleteModal(false);
          setDocToDelete(null);
        }}
      />
    </motion.div>
  );
}
