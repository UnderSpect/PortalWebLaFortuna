import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ChevronRight, 
  Users, 
  Calendar, 
  FileText, 
  MessageSquare, 
  Heart,
  ShieldCheck,
  Zap,
  LayoutDashboard,
  Mountain,
  MapPin,
  Compass,
  Navigation,
  Car,
  Bus
} from 'lucide-react';
import { cn } from '../lib/utils';
import mapaLaFortuna from '../assets/images/mapa_satelital_la_fortuna_es_1779918753497.png';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-emerald-100">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-emerald-400 text-xl font-bold shadow-lg shadow-emerald-200 overflow-hidden">
              <Mountain size={24} className="text-emerald-400" />
            </div>
            <div>
              <span className="font-black text-xl tracking-tighter uppercase">La Fortuna</span>
              <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em] -mt-1">Gestión Comunitaria</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="text-sm font-bold text-slate-600 hover:text-emerald-600 transition-colors">Iniciar Sesión</Link>
            <Link to="/register" className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
              Registrarme
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative z-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-emerald-100">
              <Zap size={12} className="fill-emerald-700" />
              Gestión Comunitaria
            </div>
            <h1 className="text-6xl md:text-7xl font-black tracking-tighter mb-6 leading-[0.9]">
              Construyendo <br />
              <span className="text-emerald-500">Comunidad</span> <br />
              Desde el Corazón.
            </h1>
            <p className="text-xl text-slate-500 mb-10 leading-relaxed max-w-lg">
              Bienvenido al portal oficial del Consejo Comunal La Fortuna. Gestiona tu censo, mantente informado y participa activamente en el crecimiento de nuestro sector.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/register" className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-500 transition-all shadow-2xl shadow-emerald-100 flex items-center gap-2 group">
                Unirme Ahora <ChevronRight className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/login" className="px-8 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all flex items-center gap-2">
                Acceder al Portal <LayoutDashboard size={20} />
              </Link>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <div className="relative z-10 bg-slate-900 rounded-[3rem] p-4 shadow-2xl shadow-emerald-200">
              <img 
                src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=1000" 
                alt="Community Group" 
                className="rounded-[2.5rem] w-full h-[500px] object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent text-white p-12 flex flex-col justify-end">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex -space-x-4">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                        {i === 4 ? '+500' : '👤'}
                      </div>
                    ))}
                  </div>
                  <span className="text-sm font-medium text-slate-300">Más de 500 vecinos registrados</span>
                </div>
              </div>
            </div>
            
            {/* Decors */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-100 rounded-full blur-3xl opacity-60" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-60" />
          </motion.div>
        </div>
      </section>

      {/* Geolocation Section */}
      <section className="py-20 bg-white border-t border-b border-slate-100 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-100">
                <MapPin size={12} className="fill-red-700 text-red-700" />
                Ubicación de la Comunidad
              </div>
              
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-[1.1]">
                Sector La Fortuna <br />
                <span className="text-emerald-500">¿Cómo llegar?</span>
              </h2>
              
              <p className="text-slate-500 leading-relaxed text-base">
                Nuestra comunidad de <span className="font-bold text-slate-800">La Fortuna</span> se encuentra estratégicamente ubicada en la pintoresca vía de <span className="font-bold text-slate-800">El Junquito</span>, un sector privilegiado por su agradable clima de montaña y su cercanía a Caracas.
              </p>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex gap-4 items-start">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0 text-white shadow-md shadow-emerald-100">
                  <Compass size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Punto de Referencia Exacto</h4>
                  <p className="text-slate-500 text-xs mt-1 font-medium leading-relaxed">
                    Estamos ubicados exactamente <span className="text-emerald-600 font-extrabold">entre el Km 4 y el Km 5 de la vía El Junquito</span>, en un sector de montaña caracterizado por su agradable clima y su comunidad unida.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h4 className="font-black text-xs uppercase tracking-widest text-slate-400">Instrucciones de Acceso</h4>
                
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Bus size={16} />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-800">Transporte Público</span>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Tomar las unidades de autobuses o jeeps con ruta hacia "El Junquito" desde la estación de metro <span className="font-semibold text-slate-700">Yaguara</span> o la estación <span className="font-semibold text-slate-700">Propatria</span>, desembarcando entre el kilómetro 4 y 5.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <Car size={16} />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-800">Vehículo Particular</span>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Subiendo por la vía principal de El Junquito (Av. Principal del Junquito) desde Catia o Antímano. La entrada del sector se encuentra a mano derecha poco después de rebasar el Km 4.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Map Card Column */}
            <div className="lg:col-span-7">
              <div className="relative group animate-fade-in">
                <div className="absolute inset-0 bg-emerald-500/10 rounded-[2.5rem] blur-3xl group-hover:bg-emerald-500/15 transition-all duration-500 -z-10" />
                
                <div className="bg-slate-900 p-4 rounded-[2.5rem] border border-slate-800/25 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-6 left-6 z-20 bg-slate-900/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/50 flex items-center gap-1.5 shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-200">Ubicación Satelital</span>
                  </div>

                  <img 
                    src={mapaLaFortuna} 
                    alt="Mapa Satelital de La Fortuna, El Junquito" 
                    className="rounded-[2rem] w-full h-[400px] object-cover transition-transform duration-700 group-hover:scale-[1.025]"
                    referrerPolicy="no-referrer"
                  />
                  
                  <div className="mt-4 p-4 bg-slate-950/40 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">Coordenadas de Referencia</p>
                      <p className="text-xs font-mono font-bold text-slate-300 mt-1.5">10°29'41.51"N  66°58'52.02"W  •  Elev. 1,227m</p>
                    </div>
                    <a 
                      href="https://www.google.com/maps/place/10%C2%B029'41.5%22N+66%C2%B058'52.0%22W" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl transition-all shadow-md shrink-0"
                    >
                      <Navigation size={14} />
                      Abrir Maps
                    </a>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-slate-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <h2 className="text-4xl font-bold tracking-tight mb-4">Todo lo que necesitas <br />para tu gestión ciudadana</h2>
            <div className="h-1.5 w-24 bg-emerald-500 rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { 
                title: 'Censo Digital', 
                desc: 'Actualiza tus datos y los de tu carga familiar de forma rápida y segura.', 
                icon: Users,
                color: 'bg-blue-50 text-blue-600'
              },
              { 
                title: 'Agenda de Eventos', 
                desc: 'Entérate de jornadas de salud, entrega de beneficios y reuniones.', 
                icon: Calendar,
                color: 'bg-emerald-50 text-emerald-600'
              },
              { 
                title: 'Repositorio', 
                desc: 'Accede a actas de asambleas y documentos oficiales del consejo.', 
                icon: FileText,
                color: 'bg-purple-50 text-purple-600'
              },
              { 
                title: 'Canales de Atención', 
                desc: 'Comunícate directamente con tus voceros y administradores.', 
                icon: MessageSquare,
                color: 'bg-amber-50 text-amber-600'
              },
            ].map((feature, i) => (
              <motion.div 
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-8 rounded-[2rem] border border-slate-200 hover:shadow-xl hover:shadow-slate-200 transition-all group"
              >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:rotate-6", feature.color)}>
                  <feature.icon size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 px-6 bg-slate-900 text-white overflow-hidden relative">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <Heart size={64} className="mx-auto mb-8 text-red-500 fill-red-500 animate-pulse" />
          <h2 className="text-5xl font-black tracking-tight mb-8">Unidos por La Fortuna</h2>
          <p className="text-xl text-slate-400 mb-12 leading-relaxed">
            Nuestra misión es fortalecer el tejido social y garantizar que cada vecino tenga voz y voto en las decisiones que afectan nuestro entorno. Juntos, hacemos la diferencia.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center pt-12 border-t border-slate-800">
            <div>
              <ShieldCheck size={32} className="mx-auto mb-4 text-emerald-400" />
              <p className="font-bold text-2xl">Seguro</p>
              <p className="text-slate-500 text-sm">Datos encriptados</p>
            </div>
            <div>
              <Users size={32} className="mx-auto mb-4 text-blue-400" />
              <p className="font-bold text-2xl">Abierto</p>
              <p className="text-slate-500 text-sm">Para todos los vecinos</p>
            </div>
            <div>
              <Zap size={32} className="mx-auto mb-4 text-amber-400" />
              <p className="font-bold text-2xl">Rápido</p>
              <p className="text-slate-500 text-sm">Gestión en tiempo real</p>
            </div>
          </div>
        </div>
        
        {/* Abstract Background */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">
              <Mountain size={16} className="text-emerald-400" />
            </div>
            <span className="font-bold text-slate-900">La Fortuna Comunal © 2026</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-emerald-500 transition-colors" onClick={() => alert('Respaldo de Seguridad Activo: Todos los documentos son cifrados y respaldados automáticamente en servidores seguros. El sistema cumple con los estándares de seguridad de grado bancario para la protección de datos comunitarios.')}>
            <ShieldCheck size={14} /> Respaldo de Seguridad Activo
          </div>
        </div>
      </footer>
    </div>
  );
}
