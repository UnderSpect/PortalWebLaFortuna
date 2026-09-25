import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { motion } from 'motion/react';
import { UserPlus, Timer, ChevronRight, User, Phone, MapPin, Calendar, Mail, Lock } from 'lucide-react';
import { UserRole } from '../types';

export default function Register() {
  const [step, setStep] = useState(1);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [formData, setFormData] = useState({
    firstName: '',
    secondName: '',
    firstSurname: '',
    secondSurname: '',
    cedula: '',
    phone: '',
    age: '',
    street: '',
    sector: 'Sector A',
    houseNumber: '',
    gender: 'Masculino' as 'Masculino' | 'Femenino',
    role: 'vecino' as UserRole,
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setLoading(true);
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        firstName: formData.firstName,
        secondName: formData.secondName || '',
        firstSurname: formData.firstSurname,
        secondSurname: formData.secondSurname || '',
        cedula: formData.cedula,
        phone: formData.phone,
        age: parseInt(formData.age),
        sector: formData.sector,
        street: formData.street,
        houseNumber: formData.houseNumber,
        gender: formData.gender,
        role: formData.role,
        email: formData.email,
        createdAt: serverTimestamp(),
        isBlocked: false,
      });

      navigate('/dashboard');
    } catch (err: any) {
      if (err.message.includes('auth/network-request-failed')) {
        setError('Error de conexión: El navegador bloqueó la solicitud de Firebase. Intenta abrir la aplicación en una pestaña nueva o revisa tu conexión a internet.');
      } else {
        setError(err.message === 'Firebase: Error (auth/email-already-in-use).' ? 'Este correo ya está en uso.' : err.message);
      }
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        {/* Sidebar Info */}
        <div className="bg-emerald-600 p-8 text-white md:w-1/3 flex flex-col justify-between">
          <div>
            <UserPlus className="w-12 h-12 mb-6" />
            <h2 className="text-2xl font-bold mb-2">Registro de Ciudadano</h2>
            <p className="text-emerald-100 text-sm">Completa tu información para ser parte del censo comunal.</p>
          </div>
          
          <div className="mt-8 p-4 bg-emerald-500/50 rounded-2xl flex items-center gap-3">
            <Timer className="w-6 h-6" />
            <div>
              <p className="text-xs text-emerald-100 italic">Tiempo restante</p>
              <p className="font-mono text-xl font-bold">{formatTime(timeLeft)}</p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8 md:w-2/3">
          <div className="flex justify-between items-center mb-8">
            <div className="flex gap-2">
              {[1, 2, 3].map((s) => (
                <div 
                  key={s} 
                  className={`h-2 rounded-full transition-all ${s <= step ? 'w-8 bg-emerald-600' : 'w-2 bg-gray-200'}`} 
                />
              ))}
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Paso {step} de 3</span>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {step === 1 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-600" />
                  Datos Personales
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <input name="firstName" placeholder="Primer Nombre*" required onChange={handleChange} className="input-field" />
                  <input name="secondName" placeholder="Segundo Nombre" onChange={handleChange} className="input-field" />
                  <input name="firstSurname" placeholder="Primer Apellido*" required onChange={handleChange} className="input-field" />
                  <input name="secondSurname" placeholder="Segundo Apellido" onChange={handleChange} className="input-field" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input name="cedula" placeholder="Cédula de Identidad*" required onChange={handleChange} className="input-field" />
                  <select name="gender" onChange={handleChange} className="input-field">
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                  </select>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  Ubicación y Contacto
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <input name="phone" placeholder="Teléfono*" required onChange={handleChange} className="input-field" />
                  <input name="age" type="number" placeholder="Edad*" required onChange={handleChange} className="input-field" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <select name="sector" onChange={handleChange} className="input-field">
                    <option value="Sector A">Sector A</option>
                    <option value="Sector B">Sector B</option>
                    <option value="Sector C">Sector C</option>
                    <option value="Casco Central">Casco Central</option>
                  </select>
                  <input name="street" placeholder="Calle o Vereda*" required onChange={handleChange} className="input-field" />
                </div>
                <input name="houseNumber" placeholder="Número de Vivienda*" required onChange={handleChange} className="input-field" />
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-600" />
                  Cuenta y Rol
                </h3>
                <select name="role" onChange={handleChange} className="input-field">
                  <option value="vecino">Vecino</option>
                  <option value="jefe_calle">Jefe de Calle</option>
                  <option value="admin">Administrador</option>
                </select>
                <input name="email" type="email" placeholder="Correo Electrónico*" required onChange={handleChange} className="input-field" />
                <input name="password" type="password" placeholder="Contraseña*" required onChange={handleChange} className="input-field" />
                <input name="confirmPassword" type="password" placeholder="Confirmar Contraseña*" required onChange={handleChange} className="input-field" />
              </motion.div>
            )}

            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

            <div className="flex gap-4 pt-6">
              {step > 1 && (
                <button 
                  type="button" 
                  onClick={() => setStep(step - 1)}
                  className="w-1/3 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Atrás
                </button>
              )}
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
              >
                {loading ? 'Procesando...' : step === 3 ? 'Completar Registro' : 'Siguiente'}
                {step < 3 && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
            
            <div className="text-center mt-4">
              <Link to="/login" className="text-sm text-gray-500 hover:text-emerald-600">
                ¿Ya tienes una cuenta? Inicia sesión
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
