/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, Sparkles, HeartPulse, Stethoscope } from 'lucide-react';
import { motion } from 'motion/react';

interface LockScreenProps {
  onUnlock: () => void;
  savedPasswordHash: string; // we can compare string passwords
}

export default function LockScreen({ onUnlock, savedPasswordHash }: LockScreenProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLocked, setIsLocked] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === savedPasswordHash) {
      setIsLocked(false);
      onUnlock();
    } else {
      setError('Clave de acceso incorrecta. Intente nuevamente.');
      // Vibrate if mobile supports it
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleQuickPin = (num: string) => {
    setPassword(prev => prev + num);
    setError('');
  };

  const handleBackspace = () => {
    setPassword(prev => prev.slice(0, -1));
  };

  return (
    <div id="lock-screen-container" className="min-h-screen bg-slate-50 flex flex-col justify-between items-center p-4 relative overflow-hidden select-none">
      {/* Decorative medical background bubbles */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

      {/* Top Header */}
      <div className="w-full max-w-md flex items-center justify-between mt-4 z-10 px-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-600 rounded-lg text-white">
            <HeartPulse className="w-5 h-5" />
          </div>
          <span className="font-sans font-bold text-slate-800 tracking-tight text-sm">CENSO PEDIÁTRICO</span>
        </div>
        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 font-mono px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" /> Enlace Seguro
        </span>
      </div>

      {/* Main Glassmorphic Card */}
      <div className="w-full max-w-md my-auto z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white rounded-2xl p-6 md:p-8 shadow-xl border border-slate-200"
        >
          {/* Logo / Shield Area */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/10 mb-4 relative">
              <Lock className="w-7 h-7 text-white" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            
            <h1 className="font-sans font-bold text-2xl text-slate-800 tracking-tight leading-tight">
              Control Clínico &amp; Censo Infantil
            </h1>
            <p className="text-sm text-slate-500 mt-2 max-w-xs">
              Ingrese la clave de seguridad para gestionar las historias clínicas de los pacientes.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password Input */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Clave de Seguridad
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input
                  id="lock-password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Ingrese clave..."
                  className="w-full px-4 py-3.5 pl-11 bg-slate-50 border border-slate-200 rounded-lg font-mono text-center text-lg tracking-widest text-slate-800 placeholder:text-slate-400/80 placeholder:tracking-normal focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                  autoFocus
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

            {/* Error Message */}
            {error ? (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 text-red-700 text-xs font-medium rounded-xl border border-red-100 text-center"
              >
                {error}
              </motion.div>
            ) : (
              <div className="p-3 bg-slate-50 text-slate-500 text-xs font-medium rounded-lg border border-slate-200 text-center flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                <span>Clave por defecto: <strong className="font-mono text-blue-700 select-all">admin123</strong></span>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="unlock-submit-button"
              type="submit"
              disabled={!password}
              className={`w-full py-3.5 px-4 font-semibold text-white rounded-lg shadow-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                password 
                  ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]' 
                  : 'bg-slate-300 shadow-none cursor-not-allowed'
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> Acceder al Sistema
            </button>
          </form>

          {/* Quick numeric keypad for mobile touch screens */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <p className="text-[11px] text-center font-semibold text-slate-400 uppercase tracking-widest mb-3">Teclado de Acceso Rápido</p>
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleQuickPin(num)}
                  className="py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 font-sans font-semibold text-slate-700 text-base active:bg-blue-50 active:text-blue-700 transition-colors cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleQuickPin('0')}
                className="py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 font-sans font-semibold text-slate-700 text-base col-start-2 active:bg-blue-50 active:text-blue-700 transition-colors cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="py-2.5 rounded-lg bg-slate-50 hover:bg-red-50 hover:text-red-600 border border-slate-200 font-sans font-semibold text-slate-500 text-xs flex items-center justify-center active:bg-red-100 transition-colors cursor-pointer"
              >
                Borrar
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer credits and system metadata */}
      <div className="text-center z-10 mb-2 mt-4">
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
          <span>Sistema de Censo Infantil &bull; Diseñado para Móviles &amp; Escritorio</span>
        </div>
      </div>
    </div>
  );
}
