import React, { useState } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, AtSign, Loader2, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { hasSupabaseConfig, supabase } from '../lib/supabaseClient';

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
      : { phone: cleanIdentity.replace(/[\s-]/g, ''), password };

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
          <h1 className="text-lg font-bold">Falta configurar Supabase</h1>
          <p className="mt-2 text-sm leading-relaxed">
            Define <code className="font-mono">VITE_SUPABASE_URL</code> y{' '}
            <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> para habilitar el inicio de sesión.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between items-center p-4 relative overflow-hidden select-none pt-safe pb-safe">
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

      <div className="w-full max-w-md flex items-center justify-between mt-4 z-10 px-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-600 rounded-lg text-white">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="font-sans font-bold text-slate-800 tracking-tight text-sm">CENSO &amp; REGISTRO</span>
        </div>
        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 font-mono px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
          <Lock className="w-3.5 h-3.5" /> Acceso Seguro
        </span>
      </div>

      <div className="w-full max-w-md my-auto z-10">
        <motion.div
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

            <h1 className="font-sans font-bold text-2xl text-slate-800 tracking-tight leading-tight">
              Censo &amp; Historia Clínica
            </h1>
            <p className="text-sm text-slate-500 mt-2 max-w-xs">
              Ingrese sus credenciales para gestionar el registro de pacientes.
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
                  placeholder="correo@ejemplo.com o +58…"
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
                  placeholder="Ingrese su contraseña…"
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
        </motion.div>
      </div>

      <div className="text-center z-10 mb-2 mt-4">
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Sistema de Censo &amp; Registro &bull; Autenticación gestionada por Supabase</span>
        </div>
      </div>
    </div>
  );
}
