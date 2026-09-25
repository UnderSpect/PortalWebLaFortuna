import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Camera, Save, Loader2, Edit3, Trash2, ShieldAlert } from 'lucide-react';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { DeleteAccountModal } from '../../components/DeleteAccountModal';

export default function ProfilePage() {
  const { profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeletePhotoModal, setShowDeletePhotoModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state for formData matching actual UserProfile fields
  const [formData, setFormData] = useState({
    firstName: '',
    firstSurname: '',
    phone: '',
    street: '',
    sector: '',
    houseNumber: '',
    cedula: '',
    gender: 'Masculino' as 'Masculino' | 'Femenino',
    age: 18,
    email: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        firstSurname: profile.firstSurname || '',
        phone: profile.phone || '',
        street: profile.street || '',
        sector: profile.sector || 'La Fortuna',
        houseNumber: profile.houseNumber || '',
        cedula: profile.cedula || '',
        gender: profile.gender || 'Masculino',
        age: profile.age || 18,
        email: profile.email || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        ...formData,
        updatedAt: new Date(),
      });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('La foto no debe superar los 5MB');
      return;
    }

    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      alert('Solo se permiten archivos JPG, JPEG o PNG');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();

    reader.onerror = () => {
      setIsUploading(false);
      alert("Error al leer el archivo. Intente de nuevo.");
    };

    reader.onload = async (e) => {
      const img = new Image();
      img.onerror = () => {
        setIsUploading(false);
        alert("La imagen está corrupta o no se pudo cargar.");
      };
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const MAX_SIZE = 400;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const base64 = canvas.toDataURL('image/jpeg', 0.7);

        try {
          const userRef = doc(db, 'users', profile.uid);
          await updateDoc(userRef, { photoUrl: base64 });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
        } finally {
          setIsUploading(false);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!profile) return null;

  const isStaff = ['admin', 'jefe_calle'].includes(profile.role);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8 pb-20"
    >
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden relative">
        {/* Banner */}
        <div className={`h-48 relative transition-all duration-500 ${isStaff ? "bg-slate-900" : "bg-emerald-600"}`}>
          <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
          </div>

          <div className="absolute -bottom-16 left-12">
            <div className="relative group">
              <div className="w-36 h-36 bg-slate-900 border-4 border-white rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 flex items-center justify-center text-white">
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-black">{profile.firstName ? profile.firstName[0] : ''}{profile.firstSurname ? profile.firstSurname[0] : ''}</span>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="animate-spin text-white" />
                  </div>
                )}
              </div>
              <div className="absolute bottom-2 right-2 flex flex-col gap-2 z-20">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-110 hover:bg-emerald-400 transition-all border-2 border-white"
                  title="Cambiar Foto"
                >
                  <Camera size={18} />
                </button>
                {profile.photoUrl && (
                  <button
                    onClick={() => setShowDeletePhotoModal(true)}
                    className="w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-110 hover:bg-red-400 transition-all border-2 border-white"
                    title="Eliminar Foto"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".jpg,.jpeg,.png"
                onChange={handlePhotoUpload}
              />
            </div>
          </div>
        </div>

        <ConfirmationModal
          isOpen={showDeletePhotoModal}
          title="¿Eliminar foto de perfil?"
          message="Esta acción no se puede deshacer. Tu perfil volverá a mostrar tus iniciales."
          onConfirm={async () => {
            try {
              await updateDoc(doc(db, 'users', profile.uid), { photoUrl: null });
            } catch (error) {
              handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
            }
          }}
          onCancel={() => setShowDeletePhotoModal(false)}
        />

        <div className="pt-20 pb-12 px-12">
          {/* Header section with Name and Role */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8 text-left">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap text-left">
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">
                  {profile.firstName} {profile.firstSurname}
                </h2>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${
                  isStaff ? "bg-slate-900 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                }`}>
                  {profile.role.replace('_', ' ')}
                </div>
              </div>
              <p className="text-slate-500 font-medium font-sans">Gestión de Datos Personales</p>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-100 flex items-center gap-2"
                >
                  <Edit3 size={18} />
                  Editar Perfil
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-5 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-8 py-3.5 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-100 flex items-center gap-2"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Guardar
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left mt-8">
            {/* Contact Information */}
            <div className="bg-slate-50/50 border border-slate-200/50 p-6 rounded-[2.5rem] space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                Contacto e Identidad
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Nombre Completo</label>
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="bg-white border border-slate-200 outline-none p-2.5 rounded-xl text-sm font-bold text-slate-700 w-full"
                        placeholder="Nombre"
                      />
                      <input
                        value={formData.firstSurname}
                        onChange={(e) => setFormData({ ...formData, firstSurname: e.target.value })}
                        className="bg-white border border-slate-200 outline-none p-2.5 rounded-xl text-sm font-bold text-slate-700 w-full"
                        placeholder="Apellido"
                      />
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-slate-850 bg-white p-3 rounded-xl border border-slate-100">{formData.firstName} {formData.firstSurname}</p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Cédula de Identidad</label>
                  {isEditing ? (
                    <input
                      value={formData.cedula}
                      onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                      className="w-full bg-white border border-slate-200 outline-none p-2.5 rounded-xl text-sm font-bold text-slate-700"
                      placeholder="V-00000000"
                    />
                  ) : (
                    <p className="text-sm font-bold text-slate-850 bg-white p-3 rounded-xl border border-slate-100">{formData.cedula || 'No registrada'}</p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Teléfono / WhatsApp</label>
                  {isEditing ? (
                    <input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-white border border-slate-200 outline-none p-2.5 rounded-xl text-sm font-bold text-slate-700"
                      placeholder="0412-0000000"
                    />
                  ) : (
                    <p className="text-sm font-bold text-slate-850 bg-white p-3 rounded-xl border border-slate-100">{formData.phone || 'No registrado'}</p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Correo Electrónico</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-white border border-slate-200 outline-none p-2.5 rounded-xl text-sm font-bold text-slate-700"
                      placeholder="correo@ejemplo.com"
                    />
                  ) : (
                    <p className="text-sm font-bold text-slate-850 bg-white p-3 rounded-xl border border-slate-100">{formData.email || 'No registrado'}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Edad</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-200 outline-none p-2.5 rounded-xl text-sm font-bold text-slate-700"
                      />
                    ) : (
                      <p className="text-sm font-bold text-slate-850 bg-white p-3 rounded-xl border border-slate-100">{formData.age} años</p>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Género</label>
                    {isEditing ? (
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'Masculino' | 'Femenino' })}
                        className="w-full bg-white border border-slate-200 outline-none p-2.5 rounded-xl text-sm font-bold text-slate-700"
                      >
                        <option value="Masculino">Masculino</option>
                        <option value="Femenino">Femenino</option>
                      </select>
                    ) : (
                      <p className="text-sm font-bold text-slate-850 bg-white p-3 rounded-xl border border-slate-100">{formData.gender}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-slate-50/50 border border-slate-200/50 p-6 rounded-[2.5rem] space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                Ubicación y Sector
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Sector</label>
                  {isEditing ? (
                    <input
                      value={formData.sector}
                      onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                      className="w-full bg-white border border-slate-200 outline-none p-2.5 rounded-xl text-sm font-bold text-slate-700"
                      placeholder="Ej. Sector Único"
                    />
                  ) : (
                    <p className="text-sm font-bold text-slate-850 bg-white p-3 rounded-xl border border-slate-100">{formData.sector || 'La Fortuna'}</p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Calle / Vía</label>
                  {isEditing ? (
                    <input
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      className="w-full bg-white border border-slate-200 outline-none p-2.5 rounded-xl text-sm font-bold text-slate-700"
                      placeholder="Nombre de la calle"
                    />
                  ) : (
                    <p className="text-sm font-bold text-slate-850 bg-white p-3 rounded-xl border border-slate-100">{formData.street || 'No registrada'}</p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Número de Casa</label>
                  {isEditing ? (
                    <input
                      value={formData.houseNumber}
                      onChange={(e) => setFormData({ ...formData, houseNumber: e.target.value })}
                      className="w-full bg-white border border-slate-200 outline-none p-2.5 rounded-xl text-sm font-bold text-slate-700"
                      placeholder="Ej. Casa #4"
                    />
                  ) : (
                    <p className="text-sm font-bold text-slate-850 bg-white p-3 rounded-xl border border-slate-100"># {formData.houseNumber || 'S/N'}</p>
                  )}
                </div>

                <div className="pt-4">
                  <div className="p-4 bg-white border border-slate-150 rounded-2xl text-xs text-slate-500 font-medium">
                    <p>Tus datos son almacenados en un entorno protegido para la planificación de la comunidad.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Apartado de Eliminar Cuenta / Seguridad y Privacidad de la Cuenta */}
            <div className="md:col-span-2 bg-gradient-to-br from-red-50/70 via-rose-50/50 to-orange-50/30 border-2 border-red-200/80 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-200">
                    <ShieldAlert size={14} className="text-red-600" />
                    Apartado de Gestión y Soberanía de Cuenta
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    Eliminar Cuenta de Usuario Definitivamente
                  </h3>
                  <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                    Si decides eliminar tu cuenta, se borrará toda tu información de la base de datos comunitaria: tu ficha en el <strong>Censo Digital Comunitario</strong>, tus registros y reservas en <strong>Eventos y Jornadas</strong>, tus votos emitidos en <strong>Encuestas ciudadanas</strong>, y todos tus <strong>Reportes de incidencias</strong>. Esta acción garantiza que tu usuario deje de existir por completo en la plataforma.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteAccountModal(true)}
                  className="shrink-0 px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-red-600/25 flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Trash2 size={16} />
                  Eliminar Cuenta
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {profile && (
        <DeleteAccountModal
          isOpen={showDeleteAccountModal}
          onClose={() => setShowDeleteAccountModal(false)}
          userId={profile.uid}
          userName={`${profile.firstName} ${profile.firstSurname}`}
          userRole={profile.role}
        />
      )}
    </motion.div>
  );
}
