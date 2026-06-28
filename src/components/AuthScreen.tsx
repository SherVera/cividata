import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AtSign,
  Loader2,
  AlertTriangle,
  Activity,
  BarChart3,
  ClipboardCheck,
  HelpCircle,
  Stethoscope,
  Mail,
  Phone,
} from 'lucide-react';
import { motion } from 'motion/react';
import { hasSupabaseConfig, supabase } from '../lib/supabaseClient';
import AppLogo from './AppLogo';
import { APP_NAME, CONTACT_EMAIL, CONTACT_PHONE } from '../brand';

const publicInfo = [
  {
    title: 'Sin datos de pacientes',
    description: 'Esta landing no muestra nombres, diagnósticos, teléfonos, direcciones ni documentos.',
    icon: Lock,
  },
  {
    title: 'Acceso con cuenta autorizada',
    description: 'El registro de pacientes y las fichas clínicas se consultan solo después de iniciar sesión.',
    icon: ShieldCheck,
  },
  {
    title: 'Tablero interno protegido',
    description: 'Las estadísticas pertenecen al área privada del sistema.',
    icon: BarChart3,
  },
];

const helpItems = [
  {
    title: 'Registro de pacientes',
    description: 'Organiza fichas y datos de pacientes dentro del sistema protegido.',
    icon: ClipboardCheck,
  },
  {
    title: 'Historia clínica',
    description: 'Guarda datos médicos y notas de consulta para revisión interna autorizada.',
    icon: Stethoscope,
  },
];

export default function AuthScreen() {
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmittingState, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    const cleanIdentity = identity.trim();
    if (!cleanIdentity || !password) return;

    setIsSubmitting(true);
    setError('');

    // Si contiene "@" se trata como correo; si no, como teléfono en formato E.164.
    const credentials = cleanIdentity.includes('@')
      ? { email: cleanIdentity, password }
      : { phone: cleanIdentity.replace(/[\s()-]/g, ''), password };

    const { error: signInError } = await supabase.auth.signInWithPassword(credentials);
    setIsSubmitting(false);

    if (signInError) {
      setError('Credenciales incorrectas. Verifique correo/teléfono y contraseña.');
      if ('vibrate' in navigator) navigator.vibrate(200);
      setTimeout(() => setError(''), 3500);
    }
    // Si tiene éxito, App detecta la sesión vía onAuthStateChange.
  };

  if (!hasSupabaseConfig) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
          <AlertTriangle className="mb-3 h-7 w-7" />
          <h1 className="text-lg font-bold">Servicio no disponible</h1>
          <p className="mt-2 text-sm leading-relaxed">
            No se pudo iniciar la conexión segura. Contacte al administrador del sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-4 md:p-6 relative overflow-hidden select-none pt-safe pb-safe">
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

      <header className="w-full max-w-7xl mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <AppLogo className="h-9 w-auto max-w-[160px] md:max-w-[200px]" />
          <span className="font-sans font-bold text-slate-800 tracking-tight text-sm hidden sm:inline uppercase">{APP_NAME}</span>
        </div>
        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 font-mono px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
          <Lock className="w-3.5 h-3.5" /> Privacidad primero
        </span>
      </header>

      <main className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 lg:gap-10 items-center flex-1 py-8 md:py-12 z-10">
        <section className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="space-y-5"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700">
              <Activity className="w-3.5 h-3.5" /> Salud comunitaria con datos protegidos
            </span>

            <div className="space-y-4">
              <h1 className="font-sans text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.02]">
                Información útil para cuidar mejor, sin exponer datos sensibles.
              </h1>
              <p className="max-w-2xl text-sm md:text-base text-slate-500 leading-relaxed">
                {APP_NAME} gestiona censo de pacientes e historia clínica para equipos de salud en campo. Esta pantalla pública solo explica el propósito del sistema; la información de pacientes permanece dentro del acceso privado.
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {publicInfo.map(({ title, description, icon: Icon }, index) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.06, duration: 0.35 }}
                className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">{title}</h2>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{description}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {helpItems.map(({ title, description, icon: Icon }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <Icon className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-800">{title}</h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{description}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 flex gap-3">
            <HelpCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h2 className="text-sm font-bold">Uso responsable de la información</h2>
              <p className="mt-1 text-xs leading-relaxed">
                Las estadísticas identificables, historias clínicas, teléfonos, direcciones, documentos y notas médicas no se publican en esta landing. Para revisar información operativa real, inicie sesión con una cuenta autorizada.
              </p>
            </div>
          </div>
        </section>

        <motion.aside
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="bg-white rounded-2xl p-6 md:p-8 shadow-xl border border-slate-200"
        >
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/10 mb-4 relative">
              <Lock className="w-7 h-7 text-white" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-white animate-pulse"></div>
            </div>

            <h2 className="font-sans font-bold text-2xl text-slate-800 tracking-tight leading-tight">
              Acceso Seguro
            </h2>
            <p className="text-sm text-slate-500 mt-2 max-w-xs">
              Ingrese sus credenciales para acceder a {APP_NAME}.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Correo o teléfono
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input
                  type="text"
                  value={identity}
                  onChange={(e) => {
                    setIdentity(e.target.value);
                    setError('');
                  }}
                  placeholder="correo@ejemplo.com o +58..."
                  autoComplete="username"
                  autoFocus
                  className="w-full px-4 py-3.5 pl-11 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                />
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <AtSign className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Contraseña
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Ingrese su contraseña..."
                  autoComplete="current-password"
                  className="w-full px-4 py-3.5 pl-11 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                />
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 text-red-700 text-xs font-medium rounded-xl border border-red-100 text-center"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={!identity.trim() || !password || isSubmittingState}
              className={`w-full py-3.5 px-4 font-semibold text-white rounded-lg shadow-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                identity.trim() && password && !isSubmittingState
                  ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] cursor-pointer'
                  : 'bg-slate-300 shadow-none cursor-not-allowed'
              }`}
            >
              {isSubmittingState ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Acceder al Sistema
            </button>
          </form>
        </motion.aside>
      </main>

      <footer className="text-center z-10 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-xs text-slate-500">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-1.5 font-medium hover:text-blue-600 transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            {CONTACT_EMAIL}
          </a>
          {CONTACT_PHONE ? (
            <a
              href={`tel:${CONTACT_PHONE.replace(/[\s()-]/g, '')}`}
              className="inline-flex items-center gap-1.5 font-medium hover:text-blue-600 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              {CONTACT_PHONE}
            </a>
          ) : null}
        </div>
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>{APP_NAME} &bull; Acceso seguro &bull; Sin datos críticos en pantalla pública</span>
        </div>
      </footer>
    </div>
  );
}
