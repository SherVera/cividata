/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  HeartPulse, Plus, Search, SlidersHorizontal, Download, Upload, Lock, 
  ShieldCheck, Eye, Settings, Trash2, LogOut, Edit, Filter, Database, 
  Activity, FileSpreadsheet, AlertTriangle, Heart, Sparkles, Menu, X, Check, RefreshCw, Warehouse
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Session } from '@supabase/supabase-js';
import { Paciente } from './types';
import AuthScreen from './components/AuthScreen';
import PatientForm from './components/PatientForm';
import PatientDetails from './components/PatientDetails';
import DashboardStats, { SuperAdminDashboardStats } from './components/DashboardStats';
import AdminPanel from './components/AdminPanel';
import CollectionCentersPanel from './components/CollectionCentersPanel';
import BottomNav, { BottomNavKey } from './components/BottomNav';
import { supabase } from './lib/supabaseClient';
import { listPatients, savePatient, deletePatient, bulkUpsertPatients } from './lib/patientsApi';
import { listCollectionCenters } from './lib/collectionCentersApi';
import { defaultHomeTab, isAppAdmin, resolveAppRole, canViewStatsDashboard, isSuperAdmin } from './lib/authRoles';

export default function App() {
  // Authentication via Supabase
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const isAuthenticated = !!session;
  const userRole = resolveAppRole(session?.user);
  const isAppAdministrator = isAppAdmin(userRole);
  const canViewStats = canViewStatsDashboard(userRole);
  const [homeTabInitialized, setHomeTabInitialized] = useState(false);

  // Patient database state (source of truth: Supabase)
  const [patients, setPatients] = useState<Paciente[]>([]);
  const [patientsLoading, setPatientsLoading] = useState<boolean>(false);

  // Views state: 'list' | 'create' | 'edit' | 'details' | 'admin' | 'centros'
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit' | 'details' | 'admin' | 'centros'>('list');
  const [selectedPatient, setSelectedPatient] = useState<Paciente | null>(null);
  
  // Tabs state in main list: 'listado' | 'estadisticas'
  const [activeTab, setActiveTab] = useState<'listado' | 'estadisticas'>('listado');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterGender, setFilterGender] = useState<string>('All');
  const [filterVacuna, setFilterVacuna] = useState<string>('All');
  const [filterEscuela, setFilterEscuela] = useState<string>('All');
  const [filterAgeRange, setFilterAgeRange] = useState<string>('All');
  const [filterCentro, setFilterCentro] = useState<string>('All');
  const [collectionCenters, setCollectionCenters] = useState<{ id: string; name: string }[]>([]);
  const [totalCentrosRegistrados, setTotalCentrosRegistrados] = useState(0);
  const [superAdminStats, setSuperAdminStats] = useState<SuperAdminDashboardStats | null>(null);
  const [sortBy, setSortBy] = useState<string>('recent'); // 'recent' | 'alphabetical' | 'age-asc' | 'age-desc'
  const [showFiltersMobile, setShowFiltersMobile] = useState<boolean>(false);

  // Modals state
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [settingsSuccess, setSettingsSuccess] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Paciente | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error', message: string } | null>(null);

  // Hidden file input ref for JSON restore
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync Supabase auth session (login state managed by Supabase, no local password)
  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  // Alert/Notification auto-clear
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
  };

  // Load patients from Supabase
  const loadPatients = async () => {
    if (!supabase) return;
    setPatientsLoading(true);
    try {
      setPatients(await listPatients());
    } catch (err: any) {
      showNotification('error', 'No se pudieron cargar los pacientes: ' + (err?.message || err));
    } finally {
      setPatientsLoading(false);
    }
  };

  // Personal médico: estadísticas como pantalla principal tras login
  useEffect(() => {
    if (!isAuthenticated) {
      setHomeTabInitialized(false);
      return;
    }
    if (!homeTabInitialized) {
      setActiveTab(defaultHomeTab(userRole));
      setCurrentView('list');
      setHomeTabInitialized(true);
    }
  }, [isAuthenticated, homeTabInitialized, userRole]);

  // Sin permisos admin: bloquear vistas de administración
  useEffect(() => {
    if (!isAuthenticated || isAppAdministrator) return;
    if (currentView === 'admin' || currentView === 'centros') {
      setCurrentView('list');
      setActiveTab('listado');
    }
  }, [isAuthenticated, isAppAdministrator, currentView]);

  // Tablero de estadísticas solo para admin y super admin
  useEffect(() => {
    if (!isAuthenticated || canViewStats) return;
    if (activeTab === 'estadisticas') {
      setActiveTab('listado');
    }
  }, [isAuthenticated, canViewStats, activeTab]);

  const refreshCollectionCenters = async () => {
    try {
      const centers = await listCollectionCenters(false);
      setCollectionCenters(
        centers.filter((c) => c.active).map((c) => ({ id: c.id, name: c.name }))
      );
      setTotalCentrosRegistrados(centers.length);
    } catch {
      setCollectionCenters([]);
      setTotalCentrosRegistrados(0);
    }
  };

  // Reload patients whenever the user becomes authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadPatients();
      refreshCollectionCenters();
    } else {
      setPatients([]);
      setCollectionCenters([]);
      setTotalCentrosRegistrados(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const loadSuperAdminStats = async () => {
    if (!session?.access_token || !isSuperAdmin(userRole)) {
      setSuperAdminStats(null);
      return;
    }
    try {
      const response = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.users)) {
        setSuperAdminStats(null);
        return;
      }
      const users = data.users as { role: string; disabled: boolean }[];
      setSuperAdminStats({
        totalUsuarios: users.length,
        personalMedico: users.filter((u) => u.role === 'personal_medico').length,
        admins: users.filter((u) => u.role === 'admin').length,
        deshabilitadas: users.filter((u) => u.disabled).length,
      });
    } catch {
      setSuperAdminStats(null);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isSuperAdmin(userRole)) {
      loadSuperAdminStats();
    } else {
      setSuperAdminStats(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userRole, session?.access_token]);

  // Sign out via Supabase
  const handleLockSession = async () => {
    await supabase?.auth.signOut();
  };

  // Change the signed-in user's password via Supabase
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (!newPasswordInput.trim() || newPasswordInput.length < 6) {
      setSettingsSuccess('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPasswordInput });
    if (error) {
      setSettingsSuccess('Error: ' + error.message);
      return;
    }
    setSettingsSuccess('¡Contraseña actualizada con éxito!');
    setNewPasswordInput('');
    setTimeout(() => {
      setSettingsSuccess('');
      setShowSettingsModal(false);
    }, 2000);
  };

  // Patient CRUD operations (persisted in Supabase)
  const handleSavePatient = async (savedPatient: Paciente) => {
    const wasEditing = currentView === 'edit';
    try {
      await savePatient(savedPatient);
    } catch (err: any) {
      showNotification('error', 'Error al guardar el registro: ' + (err?.message || err));
      return;
    }
    if (wasEditing) {
      setPatients(prev => prev.map(p => p.id === savedPatient.id ? savedPatient : p));
      showNotification('success', `Registro de ${savedPatient.nombres} actualizado correctamente.`);
    } else {
      setPatients(prev => [savedPatient, ...prev]);
      showNotification('success', `Se ha registrado a ${savedPatient.nombres} en el censo.`);
    }
    setSelectedPatient(savedPatient);
    setCurrentView('details');
  };

  const handleUpdatePatientDetails = async (updatedPatient: Paciente) => {
    try {
      await savePatient(updatedPatient);
    } catch (err: any) {
      showNotification('error', 'Error al guardar la evolución: ' + (err?.message || err));
      return;
    }
    setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
    setSelectedPatient(updatedPatient);
    showNotification('success', 'Evolución clínica y nota de consulta registradas con éxito.');
  };

  const handleDeletePatient = async (id: string) => {
    const p = patients.find(patient => patient.id === id);
    try {
      await deletePatient(id);
    } catch (err: any) {
      showNotification('error', 'Error al eliminar el registro: ' + (err?.message || err));
      setShowDeleteConfirm(null);
      return;
    }
    if (p) {
      setPatients(prev => prev.filter(patient => patient.id !== id));
      showNotification('error', `Se eliminó el registro de ${p.nombres} ${p.apellidos}.`);
    }
    setShowDeleteConfirm(null);
    if (currentView === 'details') {
      setCurrentView('list');
    }
  };

  // Export database to JSON file
  const handleExportDatabase = () => {
    const dataStr = JSON.stringify(patients, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `censo_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showNotification('success', 'Copia de seguridad (JSON) descargada con éxito.');
  };

  // Import patients from JSON into Supabase (merge / upsert by id)
  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.readAsText(files[0], "UTF-8");
    fileReader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0 && 'nombres' in parsed[0]) {
          await bulkUpsertPatients(parsed as Paciente[]);
          await loadPatients();
          showNotification('success', `Importación completada: ${parsed.length} pacientes sincronizados.`);
        } else {
          showNotification('error', 'El archivo no tiene el formato de censo válido.');
        }
      } catch (err: any) {
        showNotification('error', 'Error al importar: ' + (err?.message || 'archivo JSON inválido.'));
      }
    };
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Filters & Search processing
  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      // 1. Search Query
      const query = searchQuery.toLowerCase().trim();
      const matchQuery = !query || 
        p.nombres.toLowerCase().includes(query) ||
        p.apellidos.toLowerCase().includes(query) ||
        (p.documentoIdentidad && p.documentoIdentidad.toLowerCase().includes(query)) ||
        p.nombreRepresentante.toLowerCase().includes(query) ||
        p.ciudadMunicipio.toLowerCase().includes(query) ||
        p.estadoProvincia.toLowerCase().includes(query);

      // 2. Gender
      const matchGender = filterGender === 'All' || p.genero === filterGender;

      // 3. Vaccination
      const matchVacuna = filterVacuna === 'All' || p.esquemaVacunacion === filterVacuna;

      // 4. School
      const matchEscuela = filterEscuela === 'All' || 
        (filterEscuela === 'Asiste' && p.asisteEscuela) ||
        (filterEscuela === 'NoAsiste' && !p.asisteEscuela);

      // 5. Age Range
      let matchAge = true;
      if (filterAgeRange !== 'All') {
        const age = p.edadAnios;
        if (filterAgeRange === 'Bebes') matchAge = age <= 2;
        else if (filterAgeRange === 'Preescolar') matchAge = age >= 3 && age <= 5;
        else if (filterAgeRange === 'Escolar') matchAge = age >= 6 && age <= 12;
        else if (filterAgeRange === 'Adolescentes') matchAge = age >= 13;
      }

      const matchCentro =
        filterCentro === 'All' ||
        (filterCentro === 'SinCentro' && !p.centroAcopioId) ||
        p.centroAcopioId === filterCentro;

      return matchQuery && matchGender && matchVacuna && matchEscuela && matchAge && matchCentro;
    }).sort((a, b) => {
      // Sorting
      if (sortBy === 'alphabetical') {
        return `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`);
      }
      if (sortBy === 'age-asc') {
        return (a.edadAnios * 12 + a.edadMeses) - (b.edadAnios * 12 + b.edadMeses);
      }
      if (sortBy === 'age-desc') {
        return (b.edadAnios * 12 + b.edadMeses) - (a.edadAnios * 12 + a.edadMeses);
      }
      // default: recent (by registration date/id reverse order)
      return b.fechaRegistro.localeCompare(a.fechaRegistro) || b.id.localeCompare(a.id);
    });
  }, [patients, searchQuery, filterGender, filterVacuna, filterEscuela, filterAgeRange, filterCentro, sortBy]);

  // Bottom navigation active state (app-like mobile tab bar)
  const bottomNavActive: BottomNavKey =
    currentView === 'admin'
      ? 'admin'
      : currentView === 'create' || currentView === 'edit'
        ? 'create'
        : currentView === 'list' && activeTab === 'estadisticas'
          ? 'estadisticas'
          : 'listado';

  const handleBottomNav = (key: BottomNavKey) => {
    if (key === 'admin' && !isAppAdministrator) return;
    if (key === 'estadisticas' && !canViewStats) return;
    if (key === 'create') {
      setCurrentView('create');
    } else if (key === 'admin') {
      setCurrentView('admin');
    } else {
      setCurrentView('list');
      setActiveTab(key === 'estadisticas' ? 'estadisticas' : 'listado');
    }
  };

  // Wait for Supabase to resolve the current session before deciding what to show
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  // Not authenticated: show Supabase login (email/phone + password)
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none antialiased">
      
      {/* GLOBAL BANNER NOTIFICATIONS */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 print:hidden"
          >
            <div className={`p-4 rounded-xl shadow-lg border flex items-center gap-3 ${
              notification.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                : notification.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border-rose-100'
                  : 'bg-blue-50 text-blue-800 border-blue-100'
            }`}>
              {notification.type === 'success' ? (
                <div className="p-1 bg-emerald-500 rounded-full text-white shrink-0"><Check className="w-4 h-4" /></div>
              ) : (
                <div className="p-1 bg-blue-500 rounded-full text-white shrink-0"><ShieldCheck className="w-4 h-4" /></div>
              )}
              <span className="text-xs font-semibold">{notification.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SYSTEM HEADER (Hidden during printing for clean paper health record formats) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm print:hidden pt-safe">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          
          {/* Logo and App Title */}
          <div className="flex items-center gap-3">
            <div 
              onClick={() => {
                setCurrentView('list');
                setActiveTab(defaultHomeTab(userRole));
              }}
              className="p-2 bg-blue-600 text-white rounded-xl shadow-sm cursor-pointer active:scale-95 transition-transform"
            >
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-sans font-bold text-slate-800 text-sm md:text-base leading-none tracking-tight flex items-center gap-1.5">
                Censo &amp; Historia Clínica
                <span className="text-[10px] bg-blue-50 text-blue-700 font-bold border border-blue-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                  v1.2
                </span>
              </h1>
              <span className="text-[10px] text-slate-400 block mt-1 font-medium">Registro de Pacientes &amp; Censo de Comunidad</span>
            </div>
          </div>

          {/* Quick Actions Header */}
          <div className="flex items-center gap-2">
            {isAppAdministrator && (
              <>
                <button
                  onClick={() => setCurrentView('centros')}
                  title="Centros de acopio"
                  className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                    currentView === 'centros'
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-400 hover:text-teal-600 hover:bg-teal-50'
                  }`}
                >
                  <Warehouse className="w-4 h-4" />
                  <span className="text-xs font-semibold hidden md:inline">Centros</span>
                </button>

                <button
                  onClick={() => setCurrentView('admin')}
                  title="Panel de Administración"
                  className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                    currentView === 'admin'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-xs font-semibold hidden md:inline">Admin</span>
                </button>
              </>
            )}

            <button
              onClick={() => setShowSettingsModal(true)}
              title="Configuración de Clave"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleLockSession}
              title="Cerrar Sesión Segura"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs font-semibold hidden md:inline">Bloquear</span>
            </button>
          </div>

        </div>
      </header>

      {/* MASTER CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 pb-28 md:pb-6 space-y-6">
        
        {/* VIEW ROUTER */}
        <AnimatePresence mode="wait">
          
          {/* 1. LIST VIEW */}
          {currentView === 'list' && (
            <motion.div
              key="list-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Top Banner introducing statistics & interactive patient registration */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                      Registro de Salud Comunitaria
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px] text-blue-600 font-semibold">
                      <Sparkles className="w-3 h-3 animate-pulse text-blue-500" /> Datos en línea
                    </span>
                  </div>
                  <h2 className="font-sans font-bold text-lg md:text-xl text-slate-900 leading-tight tracking-tight">
                    Gestión Integral de Pacientes Pediátricos
                  </h2>
                  <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                    Registre censos escolares, controle esquemas de vacunación, realice el seguimiento pondoestatural de peso/talla y acceda rápidamente a la historia de consultas.
                  </p>
                </div>
                
                <button
                  onClick={() => setCurrentView('create')}
                  className="w-full md:w-auto flex items-center justify-center gap-1.5 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4 stroke-[2px]" /> Registrar Nuevo Paciente
                </button>
              </div>

              {/* View Toggle Bar (Listado vs Estadísticas — solo admin / super admin) */}
              {canViewStats && (
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 gap-4">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab('listado')}
                    className={`px-4 py-2 rounded-md font-semibold text-xs md:text-sm transition-all cursor-pointer ${
                      activeTab === 'listado'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Listado de Pacientes ({filteredPatients.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('estadisticas')}
                    className={`px-4 py-2 rounded-md font-semibold text-xs md:text-sm transition-all cursor-pointer ${
                      activeTab === 'estadisticas'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Tablero de Estadísticas
                  </button>
                </div>

                {/* Database Backup Actions (solo admin) */}
                {isAppAdministrator && (
                  <div className="hidden sm:flex items-center gap-2 text-xs">
                    <button
                      onClick={handleExportDatabase}
                      className="flex items-center gap-1.5 text-slate-500 hover:text-blue-700 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Respaldar
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 text-slate-500 hover:text-blue-700 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" /> Restaurar
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImportDatabase} 
                      accept=".json" 
                      className="hidden" 
                    />
                  </div>
                )}
              </div>
              )}

              {/* LISTADO DE PACIENTES TAB */}
              {(activeTab === 'listado' || !canViewStats) && (
                <div className="space-y-4">
                  
                  {/* Search, Filter, Sort Controls bar */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex flex-col md:flex-row gap-3">
                      
                      {/* Search Bar */}
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Buscar por niño, cédula, representante, ciudad..."
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs md:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Search className="w-4 h-4" />
                        </div>
                        {searchQuery && (
                          <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600 font-medium"
                          >
                            Limpiar
                          </button>
                        )}
                      </div>

                      {/* Sort dropdown */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-slate-400 font-medium hidden md:inline">Ordenar:</span>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="w-full md:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none cursor-pointer"
                        >
                          <option value="recent">Más recientes primero</option>
                          <option value="alphabetical">Alfabético (A-Z)</option>
                          <option value="age-asc">Edad (Menor a Mayor)</option>
                          <option value="age-desc">Edad (Mayor a Menor)</option>
                        </select>

                        {/* Mobile filters toggle button */}
                        <button
                          onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                          className={`p-2.5 rounded-xl border flex items-center justify-center gap-1 md:hidden cursor-pointer transition-colors ${
                            showFiltersMobile 
                              ? 'bg-blue-50 border-blue-200 text-blue-700' 
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          <SlidersHorizontal className="w-4 h-4" />
                          <span className="text-xs font-bold">Filtros</span>
                        </button>
                      </div>

                    </div>

                    {/* Multi-Filters Panel (Expanded on desktop, toggleable on mobile) */}
                    <div className={`${showFiltersMobile ? 'block' : 'hidden'} md:block pt-3 border-t border-slate-200`}>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        
                        {/* Gender filter */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Género</span>
                          <select
                            value={filterGender}
                            onChange={(e) => setFilterGender(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-semibold focus:outline-none cursor-pointer"
                          >
                            <option value="All">Todos</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Femenino">Femenino</option>
                            <option value="Otro">Otro</option>
                          </select>
                        </div>

                        {/* Vaccination filter */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vacunación</span>
                          <select
                            value={filterVacuna}
                            onChange={(e) => setFilterVacuna(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-semibold focus:outline-none cursor-pointer"
                          >
                            <option value="All">Todos los esquemas</option>
                            <option value="Completo">Esquema Completo</option>
                            <option value="Incompleto">Esquema Incompleto</option>
                          </select>
                        </div>

                        {/* School filter */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Escolaridad</span>
                          <select
                            value={filterEscuela}
                            onChange={(e) => setFilterEscuela(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-semibold focus:outline-none cursor-pointer"
                          >
                            <option value="All">Todas</option>
                            <option value="Asiste">Sí asiste a escuela</option>
                            <option value="NoAsiste">No asiste a escuela</option>
                          </select>
                        </div>

                        {/* Collection center filter */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Centro de acopio</span>
                          <select
                            value={filterCentro}
                            onChange={(e) => setFilterCentro(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-semibold focus:outline-none cursor-pointer"
                          >
                            <option value="All">Todos</option>
                            <option value="SinCentro">Sin centro asignado</option>
                            {collectionCenters.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Age range filter */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Grupo de Edad</span>
                          <select
                            value={filterAgeRange}
                            onChange={(e) => setFilterAgeRange(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-semibold focus:outline-none cursor-pointer"
                          >
                            <option value="All">Todos</option>
                            <option value="Bebes">Bebés (0 - 2 años)</option>
                            <option value="Preescolar">Preescolar (3 - 5 años)</option>
                            <option value="Escolar">Escolar (6 - 12 años)</option>
                            <option value="Adolescentes">Adolescentes (13+ años)</option>
                          </select>
                        </div>

                      </div>
                    </div>

                  </div>

                  {/* Backup Options specifically for Mobile (solo admin) */}
                  {isAppAdministrator && (
                    <div className="flex sm:hidden justify-between items-center bg-white p-3 rounded-xl border border-slate-200 text-xs">
                      <span className="text-slate-400 font-semibold uppercase text-[10px]">Respaldos</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={handleExportDatabase} 
                          className="text-blue-600 font-bold bg-blue-50 px-2.5 py-1 rounded-lg"
                        >
                          Exportar
                        </button>
                        <button 
                          onClick={() => fileInputRef.current?.click()} 
                          className="text-blue-600 font-bold bg-blue-50 px-2.5 py-1 rounded-lg"
                        >
                          Importar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Patients List Output (Cards for mobile, sleek grid/table) */}
                  {patientsLoading ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-400 bg-white rounded-xl border border-slate-100 shadow-sm">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-600" /> Cargando pacientes...
                    </div>
                  ) : filteredPatients.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredPatients.map((p, idx) => (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(idx * 0.05, 0.4) }}
                          className="bg-white rounded-xl border border-slate-200 hover:border-blue-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                        >
                          <div className="space-y-2.5">
                            {/* Header: gender and vaccine badge */}
                            <div className="flex justify-between items-center">
                              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                p.genero === 'Masculino' 
                                  ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                                  : p.genero === 'Femenino' 
                                    ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {p.genero}
                              </span>

                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${
                                p.esquemaVacunacion === 'Completo' 
                                  ? 'bg-green-50 text-green-700 border border-green-100' 
                                  : 'bg-red-50 text-red-700 border border-red-100'
                              }`}>
                                Vacunación {p.esquemaVacunacion}
                              </span>
                            </div>

                            {/* Name & Age */}
                            <div>
                              <h3 className="font-sans font-bold text-slate-800 text-sm md:text-base leading-tight group-hover:text-blue-600 transition-colors">
                                {p.nombres} {p.apellidos}
                              </h3>
                              <p className="text-xs text-slate-500 mt-1 font-medium">
                                {p.edadAnios} {p.edadAnios === 1 ? 'año' : 'años'} y {p.edadMeses} {p.edadMeses === 1 ? 'mes' : 'meses'}
                              </p>
                            </div>

                            {/* Key credentials indicators */}
                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-50">
                              <div>
                                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Documento</span>
                                <span className="font-semibold text-slate-700 font-mono truncate block">{p.documentoIdentidad || 'Sin Cédula'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Representante</span>
                                <span className="font-semibold text-slate-700 truncate block">{p.nombreRepresentante.split(' ')[0]} ({p.parentesco})</span>
                              </div>
                            </div>
                          </div>

                          {/* Quick button bar */}
                          <div className="pt-3 border-t border-slate-50 flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono text-slate-400 font-medium truncate">
                              {p.centroAcopioNombre || `${p.ciudadMunicipio}${p.estadoProvincia ? `, ${p.estadoProvincia}` : ''}`}
                            </span>
                            
                            <div className="flex items-center gap-1.5">
                              {isAppAdministrator && (
                                <button
                                  onClick={() => { setShowDeleteConfirm(p); }}
                                  title="Eliminar Registro"
                                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => { setSelectedPatient(p); setCurrentView('edit'); }}
                                title="Editar ficha"
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              
                              <button
                                onClick={() => { setSelectedPatient(p); setCurrentView('details'); }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> Ver Ficha
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-3">
                      <div className="p-4 bg-slate-50 text-slate-400 rounded-full">
                        <Search className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="font-sans font-bold text-slate-700 text-sm">No se encontraron pacientes</h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          No hay ningún registro de niño que coincida con los criterios de búsqueda o filtros activos seleccionados.
                        </p>
                      </div>
                      
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setFilterGender('All');
                          setFilterVacuna('All');
                          setFilterEscuela('All');
                          setFilterAgeRange('All');
                        }}
                        className="text-xs text-teal-700 font-bold hover:underline cursor-pointer"
                      >
                        Limpiar todos los filtros
                      </button>
                    </div>
                  )}

                </div>
              )}

              {/* TABLERO DE ESTADÍSTICAS TAB */}
              {activeTab === 'estadisticas' && canViewStats && (
                <DashboardStats
                  patients={patients}
                  totalCentrosRegistrados={totalCentrosRegistrados}
                  role={userRole}
                  superAdminStats={superAdminStats}
                />
              )}

            </motion.div>
          )}

          {/* 2. CREATE PATIENT VIEW */}
          {currentView === 'create' && (
            <motion.div
              key="create-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <PatientForm 
                onSave={handleSavePatient} 
                onCancel={() => setCurrentView('list')} 
              />
            </motion.div>
          )}

          {/* 3. EDIT PATIENT VIEW */}
          {currentView === 'edit' && (
            <motion.div
              key="edit-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <PatientForm 
                initialPatient={selectedPatient}
                onSave={handleSavePatient} 
                onCancel={() => setCurrentView('details')} 
              />
            </motion.div>
          )}

          {/* 4. DETAILS / CLINICAL FILE VIEW */}
          {currentView === 'details' && selectedPatient && (
            <motion.div
              key="details-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <PatientDetails 
                patient={selectedPatient}
                onEdit={(p) => { setSelectedPatient(p); setCurrentView('edit'); }}
                onBack={() => setCurrentView('list')}
                onUpdatePatient={handleUpdatePatientDetails}
              />
            </motion.div>
          )}

          {/* 5. ADMIN PANEL VIEW */}
          {currentView === 'admin' && isAppAdministrator && (
            <motion.div
              key="admin-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <AdminPanel
                onBack={() => {
                  setCurrentView('list');
                  setActiveTab('listado');
                }}
              />
            </motion.div>
          )}

          {/* 6. COLLECTION CENTERS VIEW */}
          {currentView === 'centros' && isAppAdministrator && (
            <motion.div
              key="centros-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <CollectionCentersPanel
                onBack={() => {
                  setCurrentView('list');
                  setActiveTab('listado');
                  refreshCollectionCenters();
                }}
              />
            </motion.div>
          )}

        </AnimatePresence>

      </main>

      {/* FOOTER METADATA (Hidden during printing) */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-12 print:hidden">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Censo y Archivos Médicos &bull; Registro de Pacientes</span>
          </div>
          <p className="text-[10px] text-slate-300">
            Acceso protegido con autenticación segura. Los datos clínicos se gestionan de forma centralizada.
          </p>
        </div>
      </footer>

      {/* MODAL: SECURITY PASSWORD SETTINGS */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-xl space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <h3 className="font-sans font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-blue-600" /> Ajustes de Seguridad
                </h3>
                <button 
                  onClick={() => { setShowSettingsModal(false); setSettingsSuccess(''); }}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    value={newPasswordInput}
                    onChange={(e) => { setNewPasswordInput(e.target.value); setSettingsSuccess(''); }}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 focus:outline-none"
                    autoComplete="new-password"
                    autoFocus
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Actualiza la contraseña de tu cuenta de acceso.</p>
                </div>

                {settingsSuccess && (
                  <p className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 p-2 rounded-lg text-center">
                    {settingsSuccess}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowSettingsModal(false); setSettingsSuccess(''); }}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!newPasswordInput}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold active:scale-95 transition-all shadow-md shadow-blue-600/10 cursor-pointer disabled:bg-slate-200 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: DELETE CONFIRMATION */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-100 shadow-xl space-y-4"
            >
              <div className="flex items-center gap-2.5 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-sans font-bold text-slate-800 text-base">¿Eliminar Registro?</h3>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Está a punto de eliminar de forma permanente la ficha de censo e historia clínica de:
                <br />
                <strong className="text-slate-800 font-bold block mt-1.5 text-sm">
                  {showDeleteConfirm.nombres} {showDeleteConfirm.apellidos}
                </strong>
                Esta acción no se puede deshacer y borrará todo su historial de consultas.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeletePatient(showDeleteConfirm.id)}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold active:scale-95 transition-all shadow-md shadow-rose-600/10 cursor-pointer"
                >
                  Confirmar Eliminación
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* APP-LIKE BOTTOM NAVIGATION (mobile) */}
      <BottomNav
        active={bottomNavActive}
        onSelect={handleBottomNav}
        showAdmin={isAppAdministrator}
        showStats={canViewStats}
      />

    </div>
  );
}
