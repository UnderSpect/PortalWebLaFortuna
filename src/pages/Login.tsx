import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { motion } from 'motion/react';
import { LogIn, Mail, Lock, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const navigate = useNavigate();

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars O, 0, I, 1
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(result);
    setCaptchaInput('');
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  useEffect(() => {
    if (lockoutTime) {
      const timer = setInterval(() => {
        const now = Date.now();
        if (now >= lockoutTime) {
          setLockoutTime(null);
          setAttempts(0);
          setError('');
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutTime]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTime) return;

    if (captchaInput.trim().toUpperCase() !== captchaCode) {
      setError('Código CAPTCHA incorrecto. Por favor, vuelve a intentarlo.');
      generateCaptcha();
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Successful login notification would go here
      navigate('/dashboard');
    } catch (err: any) {
      if (err.message.includes('auth/network-request-failed')) {
        setError('Error de conexión: Verifica tu internet o intenta abrir la app en una pestaña nueva.');
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= 3) {
          const until = Date.now() + 60000;
          setLockoutTime(until);
          setError('Demasiados intentos fallidos. Sistema bloqueado por 1 minuto.');
        } else {
          setError('Correo o contraseña incorrectos. Intento ' + newAttempts + ' de 3.');
        }
        generateCaptcha();
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Por favor ingresa tu correo para recuperar la contraseña.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setError('');
    } catch (err) {
      setError('Error al enviar el correo de recuperación.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-100 via-white to-sky-100">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-gray-100"
      >
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-2xl bg-emerald-50 mb-4">
            <LogIn className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Portal La Fortuna</h1>
          <p className="text-gray-500 mt-2">Bienvenido al portal de tu comunidad</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 ml-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
                placeholder="ejemplo@correo.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 ml-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* CAPTCHA de Seguridad */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Seguridad CAPTCHA
              </label>
              <button
                type="button"
                onClick={generateCaptcha}
                className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-bold bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 transition-all active:scale-95 shadow-sm"
                title="Siguiente código"
              >
                <RefreshCw className="w-3 h-3" />
                Recargar
              </button>
            </div>

            <div className="flex gap-3 items-center">
              {/* Recuadro estilizado con ruido visual analógico */}
              <div 
                className="flex-shrink-0 select-none bg-slate-200 text-slate-850 font-mono tracking-widest text-lg font-black px-5 py-2.5 rounded-xl border border-slate-300 flex items-center justify-center relative overflow-hidden h-12 w-28"
                style={{
                  backgroundImage: 'radial-gradient(circle, #cbd5e1 15%, transparent 20%), radial-gradient(circle, #cbd5e1 15%, transparent 20%)',
                  backgroundSize: '8px 8px',
                  backgroundPosition: '0 0, 4px 4px'
                }}
              >
                <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-slate-400 rotate-6 transform -translate-y-1/2 opacity-70" />
                <div className="absolute top-1/3 left-0 right-0 h-[1px] bg-slate-400 -rotate-3 transform -translate-y-1/2 opacity-55" />
                
                <span className="relative font-black italic tracking-[0.25em] font-sans pr-1 blur-[0.3px] select-none text-slate-800 drop-shadow">
                  {captchaCode}
                </span>
              </div>

              {/* Campo para ingresar el CAPTCHA */}
              <input 
                type="text"
                required
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                placeholder="Ingresar"
                maxLength={5}
                className="w-full px-4 h-12 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none font-mono text-center text-sm font-black tracking-widest placeholder:font-sans placeholder:tracking-normal placeholder:text-gray-400 uppercase"
              />
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Escribe las 5 letras de la izquierda para verificar tu identidad de forma segura.
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          {resetSent && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm">
              Correo de recuperación enviado. Revisa tu spam.
            </div>
          )}

          <button 
            type="submit"
            disabled={!!lockoutTime}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all transform active:scale-95 disabled:bg-gray-300 disabled:shadow-none"
          >
            {lockoutTime ? `Bloqueado (${Math.ceil((lockoutTime - Date.now()) / 1000)}s)` : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-8 space-y-4 text-center">
          <button 
            onClick={handleForgotPassword}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            ¿Olvidaste tu contraseña?
          </button>
          <div className="pt-4 border-t border-gray-100">
            <p className="text-gray-500 text-sm">
              ¿No tienes una cuenta? {' '}
              <Link to="/register" className="text-emerald-600 font-bold hover:underline">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
