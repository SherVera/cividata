import React, { useEffect, useRef, useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AtSign,
  Loader2,
  AlertTriangle,
  Stethoscope,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { hasSupabaseConfig, supabase } from '../lib/supabaseClient';
import AppLogo from './AppLogo';
import { APP_NAME, APP_VERSION } from '../brand';
import { fetchLandingStats, type LandingStats } from '../lib/landingStatsApi';
import { submitPreSignup } from '../lib/preSignupApi';
import SelectField from './SelectField';
import { formatSpecialty, normalizeSpecialty } from '../lib/specialty';

const numberFormatter = new Intl.NumberFormat('es');
const SPECIALTY_SUGGESTIONS = ['Medicina general', 'Pediatría', 'Enfermería', 'Odontología', 'Ginecología'];
const SPECIALTY_OPTIONS = [
  ...SPECIALTY_SUGGESTIONS.map((item) => ({
    value: normalizeSpecialty(item),
    label: formatSpecialty(item),
  })),
  { value: '__other__', label: 'Otra…' },
];

type AuthMode = 'login' | 'signup';

export default function AuthScreen() {
  const asideRef = useRef<HTMLElement>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmittingState, setIsSubmitting] = useState(false);
  const [usageStats, setUsageStats] = useState<LandingStats | null>(null);
  const [usageStatsLoading, setUsageStatsLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [specialtyOther, setSpecialtyOther] = useState('');
  const [workplace, setWorkplace] = useState('');
  const [signupHoneypot, setSignupHoneypot] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupSubmitting, setSignupSubmitting] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setUsageStatsLoading(true);
      const stats = await fetchLandingStats();
      if (!cancelled) {
        setUsageStats(stats);
        setUsageStatsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalPatients = usageStats?.totalPatients ?? 0;
  const registeredToday = usageStats?.registeredToday ?? 0;
  const resolvedSpecialty =
    specialty === '__other__' ? specialtyOther : formatSpecialty(specialty);
  const canSubmitSignup =
    fullName.trim().length >= 3 &&
    contactPhone.trim().length >= 10 &&
    normalizeSpecialty(resolvedSpecialty).length >= 2 &&
    workplace.trim().length >= 2;

  const openSignup = () => {
    setAuthMode('signup');
    setSignupDone(false);
    setSignupError('');
    asideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    const cleanIdentity = identity.trim();
    if (!cleanIdentity || !password) return;

    setIsSubmitting(true);
    setError('');

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
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitSignup || signupSubmitting) return;

    setSignupSubmitting(true);
    setSignupError('');

    const result = await submitPreSignup({
      fullName,
      contactPhone,
      specialty: normalizeSpecialty(resolvedSpecialty),
      workplace,
      website: signupHoneypot,
    });

    setSignupSubmitting(false);

    if (result.ok === false) {
      setSignupError(result.error);
      return;
    }

    setSignupDone(true);
    setFullName('');
    setContactPhone('');
    setSpecialty('');
    setSpecialtyOther('');
    setWorkplace('');
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
        <AppLogo className="h-9 w-auto max-w-[160px] md:max-w-[200px]" />
        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 font-mono px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
          <Stethoscope className="w-3.5 h-3.5" /> Personal médico
        </span>
      </header>

      <main className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 lg:gap-14 items-center flex-1 py-10 md:py-16 z-10">
        <section className="flex flex-col justify-center space-y-8 lg:py-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="space-y-5"
          >
            <h1 className="font-sans text-[2.5rem] sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-[1.02]">
              ¿Cuántos pacientes atendió{' '}
              <span className="text-blue-600">hoy</span>?
            </h1>
            <p className="text-xl md:text-2xl font-semibold text-slate-600 max-w-lg leading-snug">
              ¿Los tiene todos registrados?
            </p>
            <button
              type="button"
              onClick={openSignup}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-[0.98]"
            >
              <UserPlus className="w-4 h-4" />
              Registrarme — menos de 30 seg
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.45 }}
            className="flex flex-wrap items-end gap-5"
          >
            <div>
              {usageStatsLoading ? (
                <div className="h-14 w-36 rounded-xl bg-slate-200/80 animate-pulse" aria-hidden="true" />
              ) : (
                <p className="text-5xl md:text-6xl font-bold font-mono text-slate-900 tabular-nums tracking-tight">
                  {numberFormatter.format(totalPatients)}
                </p>
              )}
              <p className="mt-2 text-sm font-medium text-slate-500">
                pacientes en {APP_NAME}
              </p>
            </div>
            {!usageStatsLoading && registeredToday > 0 && (
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                +{numberFormatter.format(registeredToday)} hoy
              </span>
            )}
          </motion.div>
        </section>

        <motion.aside
          ref={asideRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="bg-white rounded-2xl p-6 md:p-8 shadow-xl border border-slate-200 lg:shadow-2xl"
        >
          <div className="mb-5 flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setSignupError('');
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                authMode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setSignupDone(false);
                setSignupError('');
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                authMode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Solicitar acceso
            </button>
          </div>

          <AnimatePresence mode="wait">
            {authMode === 'login' ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                    Correo o teléfono
                  </label>
                  <div className="relative">
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
                      className="w-full px-4 py-3.5 pl-11 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                      }}
                      placeholder="Ingrese su contraseña..."
                      autoComplete="current-password"
                      className="w-full px-4 py-3.5 pl-11 pr-11 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="p-3 bg-red-50 text-red-700 text-xs font-medium rounded-xl border border-red-100 text-center">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!identity.trim() || !password || isSubmittingState}
                  className={`w-full py-3.5 px-4 font-semibold text-white rounded-lg transition-all flex items-center justify-center gap-2 ${
                    identity.trim() && password && !isSubmittingState
                      ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] cursor-pointer'
                      : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  {isSubmittingState ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Entrar
                </button>

                <p className="text-center text-xs text-slate-500">
                  ¿Aún no tiene cuenta?{' '}
                  <button type="button" onClick={openSignup} className="font-semibold text-blue-700 hover:text-blue-800">
                    Solicítela aquí
                  </button>
                </p>
              </motion.form>
            ) : signupDone ? (
              <motion.div
                key="signup-done"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-4 text-center space-y-3"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Solicitud enviada</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Un administrador revisará su solicitud y le activará el acceso. Hasta entonces no podrá entrar.
                </p>
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  Volver a entrar
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="signup"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSignup}
                className="space-y-3"
              >
                <p className="text-xs text-slate-500 leading-relaxed">
                  4 datos. Menos de 30 segundos. El administrador activa su cuenta.
                </p>

                <input
                  type="text"
                  name="website"
                  value={signupHoneypot}
                  onChange={(e) => setSignupHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="hidden"
                />

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej. Dra. María Pérez"
                    autoComplete="name"
                    autoFocus
                    className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+58 412..."
                    autoComplete="tel"
                    className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                    Especialidad / cargo
                  </label>
                  <SelectField
                    value={specialty}
                    onChange={setSpecialty}
                    options={SPECIALTY_OPTIONS}
                    placeholder="Seleccionar especialidad"
                    accent="blue"
                  />
                  {specialty === '__other__' && (
                    <input
                      type="text"
                      value={specialtyOther}
                      onChange={(e) => setSpecialtyOther(e.target.value)}
                      placeholder="Indique su especialidad o cargo"
                      className="mt-2 w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                    Centro de trabajo
                  </label>
                  <input
                    type="text"
                    value={workplace}
                    onChange={(e) => setWorkplace(e.target.value)}
                    placeholder="Hospital, ambulatorio..."
                    className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                {signupError && (
                  <p className="p-3 bg-red-50 text-red-700 text-xs font-medium rounded-xl border border-red-100 text-center">
                    {signupError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!canSubmitSignup || signupSubmitting}
                  className={`w-full py-3.5 px-4 font-semibold text-white rounded-lg transition-all flex items-center justify-center gap-2 ${
                    canSubmitSignup && !signupSubmitting
                      ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] cursor-pointer'
                      : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  {signupSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  Enviar solicitud
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.aside>
      </main>

      <footer className="text-center z-10 pb-2">
        <span className="font-mono text-[10px] text-slate-400/90">v{APP_VERSION}</span>
      </footer>
    </div>
  );
}
