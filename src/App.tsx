/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, SlidersHorizontal, Download, Upload, Lock, 
  ShieldCheck, Eye, Settings, Trash2, LogOut, Edit, Filter, Database, 
  Activity, FileSpreadsheet, AlertTriangle, Heart, Sparkles, Menu, X, Check, RefreshCw, Warehouse, Home, Zap,
  ClipboardList, BarChart3, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Session } from '@supabase/supabase-js';
import { Paciente, puntoRegistroEtiqueta, grupoEtarioLabel, normalizeGrupoEtario, edadPacienteTexto, pacienteTieneEdad, resolveGrupoEtario, grupoEtarioFromAge, pacienteRequiereRepresentante } from './types';
import AuthScreen from './components/AuthScreen';
import PatientForm from './components/PatientForm';
import QuickPatientRegister, { PatientSaveOptions } from './components/QuickPatientRegister';
import { extractPatientCarryOver, PatientCarryOver, patientDisplayName } from './lib/patientDefaults';
import PatientDetails from './components/PatientDetails';
import DashboardStats, { SuperAdminDashboardStats } from './components/DashboardStats';
import AdminPanel from './components/AdminPanel';
import TeamPanel from './components/TeamPanel';
import CollectionCentersPanel from './components/CollectionCentersPanel';
import QuickSupplyRegisterModal from './components/QuickSupplyRegisterModal';
import ExportFormatModal from './components/ExportFormatModal';
import BottomNav, { BottomNavKey } from './components/BottomNav';
import MobileOptionsDrawer, { MobileDrawerItem } from './components/MobileOptionsDrawer';
import AppLogo from './components/AppLogo';
import PatientPhoto from './components/PatientPhoto';
import ListPagination from './components/ListPagination';
import ListViewToggle from './components/ListViewToggle';
import PatientListTable from './components/PatientListTable';
import SelectField from './components/SelectField';
import { supabase } from './lib/supabaseClient';
import { paginate, useListPageSize } from './lib/pagination';
import { useListViewMode } from './lib/listViewMode';
import {
  centroFilterOptions,
  FILTER_AGE_RANGE_OPTIONS,
  FILTER_EDAD_OPTIONS,
  FILTER_ESCUELA_OPTIONS,
  FILTER_GENDER_OPTIONS,
  FILTER_GRUPO_ETARIO_OPTIONS,
  FILTER_HISTORIA_OPTIONS,
  FILTER_REGISTRO_OPTIONS,
  FILTER_SALUD_OPTIONS,
  FILTER_VACUNA_OPTIONS,
  SORT_OPTIONS,
} from './lib/selectOptions';
import {
  DEFAULT_PATIENT_LIST_FILTERS,
  mergePatientListFilters,
  type AdminUserRoleFilter,
  type MetricDrillDown,
} from './lib/metricDrillDown';
import { isRegistroToday, isRegistroWithinDays } from './lib/registroDates';
import { listPatients, savePatient, deletePatient, bulkUpsertPatients } from './lib/patientsApi';
import { useStaffNameMap } from './lib/usersApi';
import { listCollectionCenters } from './lib/collectionCentersApi';
import { computeSupplyDashboardStats, listCenterSupplyEntries, type SupplyDashboardStats } from './lib/centerSupplyApi';
import type { SupplyEntryType } from './lib/centerSupplyApi';
import { defaultHomeTab, isAppAdmin, resolveAppRole, isSuperAdmin, canManageClinicalData, isRegistrador, resolvePatientExportTier } from './lib/authRoles';
import { APP_NAME, APP_TAGLINE, CAPTURE_FULL_LABEL, CAPTURE_LABEL, CAPTURE_QUICK_LABEL, COLLECTION_CENTER_LABEL_PLURAL } from './brand';

export default function App() {
  // Authentication via Supabase
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const isAuthenticated = !!session;
  const userRole = resolveAppRole(session?.user);
  const isAppAdministrator = isAppAdmin(userRole);
  const canEditPatients = canManageClinicalData(userRole);
  const staffNameMap = useStaffNameMap(session?.access_token);
  const [homeTabInitialized, setHomeTabInitialized] = useState(false);

  // Patient database state (source of truth: Supabase)
  const [patients, setPatients] = useState<Paciente[]>([]);
  const [patientsLoading, setPatientsLoading] = useState<boolean>(false);
  const [dataRefreshing, setDataRefreshing] = useState<boolean>(false);

  // Views state: 'list' | 'quick-create' | 'create' | 'edit' | 'details' | 'admin' | 'centros'
  const [currentView, setCurrentView] = useState<
    'list' | 'quick-create' | 'create' | 'edit' | 'details' | 'admin' | 'centros' | 'equipo'
  >('list');
  const [selectedPatient, setSelectedPatient] = useState<Paciente | null>(null);
  const [quickCarryOver, setQuickCarryOver] = useState<PatientCarryOver | null>(null);
  const [quickFormKey, setQuickFormKey] = useState(0);
  
  // Tabs state in main list: 'listado' | 'estadisticas'
  const [activeTab, setActiveTab] = useState<'listado' | 'estadisticas'>('estadisticas');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterGender, setFilterGender] = useState<string>('All');
  const [filterVacuna, setFilterVacuna] = useState<string>('All');
  const [filterAgeRange, setFilterAgeRange] = useState<string>('All');
  const [filterGrupoEtario, setFilterGrupoEtario] = useState<string>('All');
  const [filterCentro, setFilterCentro] = useState<string>('All');
  const [filterSalud, setFilterSalud] = useState<string>('All');
  const [filterRegistro, setFilterRegistro] = useState<string>('All');
  const [filterHistoria, setFilterHistoria] = useState<string>('All');
  const [filterEdad, setFilterEdad] = useState<string>('All');
  const [filterEscuela, setFilterEscuela] = useState<string>('All');
  const [adminRoleFilter, setAdminRoleFilter] = useState<AdminUserRoleFilter>('all');
  const [collectionCenters, setCollectionCenters] = useState<{ id: string; name: string }[]>([]);
  const [totalCentrosRegistrados, setTotalCentrosRegistrados] = useState(0);
  const [superAdminStats, setSuperAdminStats] = useState<SuperAdminDashboardStats | null>(null);
  const [sortBy, setSortBy] = useState<string>('recent'); // 'recent' | 'alphabetical' | 'age-asc' | 'age-desc'
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useListPageSize();
  const [patientListView, setPatientListView] = useListViewMode('patients');
  const [showFiltersMobile, setShowFiltersMobile] = useState<boolean>(false);
  const [pendingSupplyCount, setPendingSupplyCount] = useState(0);
  const [supplyStats, setSupplyStats] = useState<SupplyDashboardStats | null>(null);
  const [quickSupplyType, setQuickSupplyType] = useState<SupplyEntryType | null>(null);

  // Modals state
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);
  const [centrosFocusCenterId, setCentrosFocusCenterId] = useState<string | null>(null);
  const [centrosPanelView, setCentrosPanelView] = useState<'centros' | 'ledger'>('centros');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [settingsSuccess, setSettingsSuccess] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Paciente | null>(null);
  const [showListExportModal, setShowListExportModal] = useState(false);
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
  const loadPatients = async (options?: { silent?: boolean }) => {
    if (!supabase) return;
    if (!options?.silent) setPatientsLoading(true);
    try {
      setPatients(await listPatients());
    } catch (err: any) {
      showNotification('error', 'No se pudieron cargar los pacientes: ' + (err?.message || err));
      throw err;
    } finally {
      if (!options?.silent) setPatientsLoading(false);
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

  // Sin permisos admin: bloquear panel de administración
  useEffect(() => {
    if (!isAuthenticated || isAppAdministrator) return;
    if (currentView === 'admin') {
      setCurrentView('list');
      setActiveTab('estadisticas');
    }
  }, [isAuthenticated, isAppAdministrator, currentView]);

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

  const refreshPendingSupplyCount = async () => {
    try {
      const entries = await listCenterSupplyEntries();
      const stats = computeSupplyDashboardStats(entries);
      setSupplyStats(stats);
      setPendingSupplyCount(stats.openItems);
    } catch {
      setSupplyStats(null);
      setPendingSupplyCount(0);
    }
  };

  const refreshAllData = async () => {
    if (dataRefreshing) return;
    setDataRefreshing(true);
    try {
      await loadPatients({ silent: true });
      await refreshCollectionCenters();
      await refreshPendingSupplyCount();
      await loadSuperAdminStats();
      showNotification('success', 'Datos actualizados correctamente.');
    } catch {
      // loadPatients ya muestra la notificación de error
    } finally {
      setDataRefreshing(false);
    }
  };

  // Reload patients whenever the user becomes authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadPatients();
      refreshCollectionCenters();
      refreshPendingSupplyCount();
    } else {
      setPatients([]);
      setCollectionCenters([]);
      setTotalCentrosRegistrados(0);
      setPendingSupplyCount(0);
      setSupplyStats(null);
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
        registradores: users.filter((u) => u.role === 'registrador').length,
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
  const handleSavePatient = async (savedPatient: Paciente, options?: PatientSaveOptions) => {
    const wasEditing = currentView === 'edit';
    try {
      await savePatient(savedPatient);
    } catch (err: any) {
      showNotification('error', 'Error al guardar la captura: ' + (err?.message || err));
      return;
    }
    if (wasEditing) {
      setPatients(prev => prev.map(p => p.id === savedPatient.id ? savedPatient : p));
      showNotification('success', `Captura de ${patientDisplayName(savedPatient)} actualizada correctamente.`);
      setSelectedPatient(savedPatient);
      setCurrentView('details');
      return;
    }

    setPatients(prev => [savedPatient, ...prev]);

    if (options?.andContinue) {
      setQuickCarryOver(extractPatientCarryOver(savedPatient));
      setQuickFormKey((k) => k + 1);
      setCurrentView('quick-create');
      showNotification(
        'success',
        `${patientDisplayName(savedPatient)} registrado. Puede agregar otro paciente.`
      );
      return;
    }

    showNotification('success', `Captura de ${patientDisplayName(savedPatient)} guardada en ${APP_NAME}.`);
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
    showNotification('success', 'Seguimiento clínico guardado con éxito.');
  };

  const handleDeletePatient = async (id: string) => {
    const p = patients.find(patient => patient.id === id);
    try {
      await deletePatient(id);
    } catch (err: any) {
      showNotification('error', 'Error al eliminar la captura: ' + (err?.message || err));
      setShowDeleteConfirm(null);
      return;
    }
    if (p) {
      setPatients(prev => prev.filter(patient => patient.id !== id));
      showNotification('error', `Se eliminó la captura de ${p.nombres} ${p.apellidos}.`);
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
    
    const exportFileDefaultName = `cividata_backup_${new Date().toISOString().split('T')[0]}.json`;
    
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
          await bulkUpsertPatients((parsed as Paciente[]).map((p) => ({
            ...p,
            grupoEtario: pacienteTieneEdad(p)
              ? grupoEtarioFromAge(p.edadAnios)
              : normalizeGrupoEtario(p.grupoEtario),
          })));
          await loadPatients();
          showNotification('success', `Importación completada: ${parsed.length} pacientes sincronizados.`);
        } else {
          showNotification('error', 'El archivo no tiene el formato de respaldo de Cividata.');
        }
      } catch (err: any) {
        showNotification('error', 'Error al importar: ' + (err?.message || 'archivo JSON inválido.'));
      }
    };
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Filters & Search processing
  const resetPatientListFilters = () => {
    setSearchQuery(DEFAULT_PATIENT_LIST_FILTERS.searchQuery);
    setFilterGender(DEFAULT_PATIENT_LIST_FILTERS.filterGender);
    setFilterVacuna(DEFAULT_PATIENT_LIST_FILTERS.filterVacuna);
    setFilterAgeRange(DEFAULT_PATIENT_LIST_FILTERS.filterAgeRange);
    setFilterGrupoEtario(DEFAULT_PATIENT_LIST_FILTERS.filterGrupoEtario);
    setFilterCentro(DEFAULT_PATIENT_LIST_FILTERS.filterCentro);
    setFilterSalud(DEFAULT_PATIENT_LIST_FILTERS.filterSalud);
    setFilterRegistro(DEFAULT_PATIENT_LIST_FILTERS.filterRegistro);
    setFilterHistoria(DEFAULT_PATIENT_LIST_FILTERS.filterHistoria);
    setFilterEdad(DEFAULT_PATIENT_LIST_FILTERS.filterEdad);
    setFilterEscuela(DEFAULT_PATIENT_LIST_FILTERS.filterEscuela);
  };

  const applyPatientListFilters = (partial?: Partial<typeof DEFAULT_PATIENT_LIST_FILTERS>) => {
    const filters = mergePatientListFilters(partial);
    setSearchQuery(filters.searchQuery);
    setFilterGender(filters.filterGender);
    setFilterVacuna(filters.filterVacuna);
    setFilterAgeRange(filters.filterAgeRange);
    setFilterGrupoEtario(filters.filterGrupoEtario);
    setFilterCentro(filters.filterCentro);
    setFilterSalud(filters.filterSalud);
    setFilterRegistro(filters.filterRegistro);
    setFilterHistoria(filters.filterHistoria);
    setFilterEdad(filters.filterEdad);
    setFilterEscuela(filters.filterEscuela);
  };

  const handleMetricDrillDown = (action: MetricDrillDown) => {
    if (action.target === 'centros') {
      setCentrosFocusCenterId(action.centerId ?? null);
      setCentrosPanelView(action.panelView ?? 'centros');
      setCurrentView('centros');
      return;
    }
    if (action.target === 'admin') {
      if (isAppAdministrator) {
        setAdminRoleFilter(action.roleFilter ?? 'all');
        setCurrentView('admin');
      }
      return;
    }
    applyPatientListFilters(action.filters);
    setCurrentView('list');
    setActiveTab('listado');
    setShowFiltersMobile(true);
  };

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

      // 4. Age Range
      let matchAge = true;
      if (filterAgeRange !== 'All') {
        if (!pacienteTieneEdad(p)) {
          matchAge = false;
        } else {
          const age = p.edadAnios;
          if (filterAgeRange === 'Bebes') matchAge = age <= 2;
          else if (filterAgeRange === 'Preescolar') matchAge = age >= 3 && age <= 5;
          else if (filterAgeRange === 'Escolar') matchAge = age >= 6 && age <= 12;
          else if (filterAgeRange === 'Adolescentes') matchAge = age >= 13;
        }
      }

      const matchCentro =
        filterCentro === 'All' ||
        (filterCentro === 'AtencionMedico' && p.puntoRegistroTipo === 'medico') ||
        (filterCentro === 'SinCentro' && p.puntoRegistroTipo !== 'medico' && !p.centroAcopioId) ||
        p.centroAcopioId === filterCentro;

      const matchGrupo =
        filterGrupoEtario === 'All' || resolveGrupoEtario(p) === filterGrupoEtario;

      const matchSalud =
        filterSalud === 'All' ||
        (filterSalud === 'AtencionEspecial' && (p.tieneAlergias || p.tieneCondicionMedica));

      const matchRegistro =
        filterRegistro === 'All' ||
        (filterRegistro === 'Hoy' && isRegistroToday(p.fechaRegistro)) ||
        (filterRegistro === 'Ultimos7' && isRegistroWithinDays(p.fechaRegistro, 7));

      const matchHistoria =
        filterHistoria === 'All' ||
        (filterHistoria === 'ConNotas' && p.notasClinicas.length > 0) ||
        (filterHistoria === 'SinNotas' && p.notasClinicas.length === 0);

      const matchEdadKnown =
        filterEdad === 'All' ||
        (filterEdad === 'SinEdad' && !pacienteTieneEdad(p));

      const matchEscuela =
        filterEscuela === 'All' ||
        (filterEscuela === 'Asiste' && p.asisteEscuela) ||
        (filterEscuela === 'NoAsiste' && !p.asisteEscuela);

      return matchQuery && matchGender && matchVacuna && matchAge && matchCentro && matchGrupo
        && matchSalud && matchRegistro && matchHistoria && matchEdadKnown && matchEscuela;
    }).sort((a, b) => {
      // Sorting
      if (sortBy === 'alphabetical') {
        return `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`);
      }
      if (sortBy === 'age-asc') {
        const months = (p: Paciente) => (pacienteTieneEdad(p) ? p.edadAnios * 12 + p.edadMeses : Number.MAX_SAFE_INTEGER);
        return months(a) - months(b);
      }
      if (sortBy === 'age-desc') {
        const months = (p: Paciente) => (pacienteTieneEdad(p) ? p.edadAnios * 12 + p.edadMeses : -1);
        return months(b) - months(a);
      }
      // default: recent (by registration date/id reverse order)
      return b.fechaRegistro.localeCompare(a.fechaRegistro) || b.id.localeCompare(a.id);
    });
  }, [patients, searchQuery, filterGender, filterVacuna, filterAgeRange, filterGrupoEtario, filterCentro, filterSalud, filterRegistro, filterHistoria, filterEdad, filterEscuela, sortBy]);

  useEffect(() => {
    setListPage(1);
  }, [searchQuery, filterGender, filterVacuna, filterAgeRange, filterGrupoEtario, filterCentro, filterSalud, filterRegistro, filterHistoria, filterEdad, filterEscuela, sortBy]);

  const patientListPagination = useMemo(
    () => paginate(filteredPatients, listPage, listPageSize),
    [filteredPatients, listPage, listPageSize]
  );

  const handleListPageSizeChange = (size: number) => {
    setListPageSize(size);
    setListPage(1);
  };

  useEffect(() => {
    if (listPage > patientListPagination.totalPages) {
      setListPage(patientListPagination.totalPages);
    }
  }, [listPage, patientListPagination.totalPages]);

  // Bottom navigation active state (app-like mobile tab bar)
  const bottomNavActive: BottomNavKey =
    currentView === 'admin'
      ? 'admin'
      : currentView === 'quick-create' || currentView === 'create' || currentView === 'edit'
        ? 'create'
        : currentView === 'list' && activeTab === 'estadisticas'
          ? 'estadisticas'
          : 'listado';

  const handleBottomNav = (key: BottomNavKey) => {
    if (key === 'admin' && !isAppAdministrator) return;
    if (key === 'create') {
      goToQuickCreate();
    } else if (key === 'admin') {
      setCurrentView('admin');
    } else {
      setCurrentView('list');
      setActiveTab(key === 'estadisticas' ? 'estadisticas' : 'listado');
    }
  };

  const goToListado = () => {
    setCurrentView('list');
    setActiveTab('listado');
  };

  const goToEstadisticas = () => {
    setCurrentView('list');
    setActiveTab('estadisticas');
  };

  const goToQuickCreate = () => {
    setQuickCarryOver(null);
    setCurrentView('quick-create');
  };

  const goToFullCreate = () => {
    setCurrentView('create');
  };

  const isListadoActive = currentView === 'list' && activeTab === 'listado';
  const isEstadisticasActive = currentView === 'list' && activeTab === 'estadisticas';

  const mobileDrawerItems = useMemo<MobileDrawerItem[]>(() => {
    const items: MobileDrawerItem[] = [
      {
        id: 'quick-create',
        label: CAPTURE_QUICK_LABEL,
        icon: Zap,
        tone: 'default',
        active: currentView === 'quick-create',
        onSelect: goToQuickCreate,
      },
      {
        id: 'full-create',
        label: CAPTURE_FULL_LABEL,
        icon: Plus,
        active: currentView === 'create',
        onSelect: goToFullCreate,
      },
      {
        id: 'listado',
        label: isRegistrador(userRole) ? 'Listado del censo' : 'Listado de pacientes',
        icon: ClipboardList,
        active: isListadoActive,
        onSelect: goToListado,
      },
      {
        id: 'estadisticas',
        label: 'Estadísticas',
        icon: BarChart3,
        active: isEstadisticasActive,
        onSelect: goToEstadisticas,
      },
      {
        id: 'quick-supply',
        label: 'Insumo rápido',
        icon: AlertTriangle,
        tone: 'amber',
        onSelect: () => setQuickSupplyType('necesidad'),
      },
      {
        id: 'equipo',
        label: 'Equipo',
        icon: Users,
        active: currentView === 'equipo',
        onSelect: () => setCurrentView('equipo'),
      },
      {
        id: 'home',
        label: 'Inicio',
        icon: Home,
        active: currentView === 'list' && activeTab === defaultHomeTab(userRole),
        onSelect: () => {
          setCurrentView('list');
          setActiveTab(defaultHomeTab(userRole));
        },
      },
      {
        id: 'centros',
        label: COLLECTION_CENTER_LABEL_PLURAL,
        icon: Warehouse,
        tone: 'teal',
        active: currentView === 'centros',
        badge: pendingSupplyCount > 0 ? (pendingSupplyCount > 9 ? '9+' : pendingSupplyCount) : undefined,
        onSelect: () => setCurrentView('centros'),
      },
    ];

    if (isAppAdministrator) {
      items.push({
        id: 'admin',
        label: 'Administración',
        icon: ShieldCheck,
        active: currentView === 'admin',
        onSelect: () => setCurrentView('admin'),
      });
    }

    items.push(
      {
        id: 'refresh',
        label: 'Actualizar datos',
        icon: RefreshCw,
        loading: dataRefreshing,
        disabled: dataRefreshing,
        onSelect: () => {
          void refreshAllData();
        },
      },
      {
        id: 'settings',
        label: 'Configuración',
        icon: Settings,
        onSelect: () => setShowSettingsModal(true),
      },
      {
        id: 'lock',
        label: 'Bloquear sesión',
        icon: LogOut,
        tone: 'danger',
        onSelect: () => {
          void handleLockSession();
        },
      },
    );

    return items;
  }, [
    currentView,
    activeTab,
    dataRefreshing,
    handleLockSession,
    isAppAdministrator,
    isEstadisticasActive,
    isListadoActive,
    pendingSupplyCount,
    refreshAllData,
    userRole,
  ]);

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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased">
      
      {/* GLOBAL BANNER NOTIFICATIONS */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 pb-safe print:hidden"
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
          
          {/* Logo y subtítulo */}
          <div className="flex items-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => setShowMobileMenu(true)}
              className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 md:hidden"
              aria-label="Abrir opciones"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentView('list');
                setActiveTab(defaultHomeTab(userRole));
              }}
              className="rounded-xl p-1.5 shadow-sm cursor-pointer active:scale-95 transition-transform hover:bg-slate-50"
              aria-label="Ir al inicio"
            >
              <AppLogo className="h-9 w-auto max-w-[140px] md:max-w-[180px]" />
            </button>
            <div className="hidden sm:block min-w-0">
              <span className="text-[10px] text-slate-400 block font-medium">{APP_TAGLINE}</span>
            </div>
          </div>

          {/* Navegación principal + acciones rápidas (desktop) */}
          <div className="hidden md:flex items-center gap-2 flex-1 justify-center max-w-2xl mx-4">
            <div className="flex items-center bg-slate-100 rounded-xl p-1">
              <button
                type="button"
                onClick={goToEstadisticas}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  isEstadisticasActive
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Estadísticas
              </button>
              <button
                type="button"
                onClick={goToListado}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  isListadoActive
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                Listado
              </button>
            </div>

            <button
              type="button"
              onClick={goToQuickCreate}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all shadow-sm ${
                currentView === 'quick-create'
                  ? 'bg-blue-700 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              {CAPTURE_QUICK_LABEL}
            </button>

            <button
              type="button"
              onClick={goToFullCreate}
              className={`hidden lg:flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                currentView === 'create'
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Completo
            </button>

            <button
              type="button"
              onClick={() => setQuickSupplyType('necesidad')}
              className="hidden xl:flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-all"
              title="Registro rápido de insumos"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Insumo
            </button>
          </div>

          {/* Utilidades (desktop) */}
          <div className="hidden md:flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setCurrentView('list');
                setActiveTab(defaultHomeTab(userRole));
              }}
              title="Inicio"
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                currentView === 'list' && activeTab === defaultHomeTab(userRole)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <Home className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('centros')}
              title={COLLECTION_CENTER_LABEL_PLURAL}
              className={`relative p-2 rounded-xl transition-all cursor-pointer ${
                currentView === 'centros'
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-slate-400 hover:text-teal-600 hover:bg-teal-50'
              }`}
            >
              <Warehouse className="w-4 h-4" />
              {pendingSupplyCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
                  {pendingSupplyCount > 9 ? '9+' : pendingSupplyCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('equipo')}
              title="Equipo"
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                currentView === 'equipo'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <Users className="w-4 h-4" />
            </button>

            {isAppAdministrator && (
              <button
                onClick={() => setCurrentView('admin')}
                title="Panel de Administración"
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  currentView === 'admin'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={refreshAllData}
              disabled={dataRefreshing}
              title="Actualizar datos"
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${dataRefreshing ? 'animate-spin' : ''}`} />
            </button>

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
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Acciones rápidas (móvil) */}
        <div className="md:hidden border-t border-slate-100 bg-slate-50/90 px-3 py-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={goToQuickCreate}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm active:scale-95"
            >
              <Zap className="w-3.5 h-3.5" />
              {CAPTURE_QUICK_LABEL}
            </button>
            <button
              type="button"
              onClick={goToListado}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold ${
                isListadoActive
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Listado
            </button>
            <button
              type="button"
              onClick={goToEstadisticas}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold ${
                isEstadisticasActive
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Estadísticas
            </button>
            <button
              type="button"
              onClick={goToFullCreate}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
              Completo
            </button>
            <button
              type="button"
              onClick={() => setQuickSupplyType('necesidad')}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Insumo
            </button>
          </div>
        </div>
      </header>

      <MobileOptionsDrawer
        open={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        title="Acceso rápido"
        items={mobileDrawerItems}
      />

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
              {/* Intro banner — acciones rápidas están en la barra superior */}
              <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                      Captura en censo comunitario
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px] text-blue-600 font-semibold">
                      <Sparkles className="w-3 h-3 animate-pulse text-blue-500" /> Datos en línea
                    </span>
                  </div>
                  <h2 className="font-sans font-bold text-lg md:text-xl text-slate-900 leading-tight tracking-tight">
                    Gestión integral de pacientes
                  </h2>
                  <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                    {isRegistrador(userRole)
                      ? 'Use la barra superior para captura rápida, listado o estadísticas.'
                      : 'Use la barra superior para captura rápida, consultar el listado o revisar estadísticas.'}
                  </p>
                </div>
              </div>

              {/* View Toggle Bar — Estadísticas primero para todos los roles */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 gap-4">
                <div className="flex bg-slate-100 p-1 rounded-lg">
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
                  <button
                    onClick={() => setActiveTab('listado')}
                    className={`px-4 py-2 rounded-md font-semibold text-xs md:text-sm transition-all cursor-pointer ${
                      activeTab === 'listado'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {isAppAdministrator
                      ? `Listado de Pacientes (${filteredPatients.length})`
                      : isRegistrador(userRole)
                        ? `En censo (${filteredPatients.length})`
                        : `Mis capturas (${filteredPatients.length})`}
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

              {/* LISTADO DE PACIENTES TAB */}
              {activeTab === 'listado' && (
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
                          placeholder="Buscar por paciente, cédula, representante, ciudad..."
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
                        <SelectField
                          value={sortBy}
                          onChange={setSortBy}
                          options={SORT_OPTIONS}
                          size="sm"
                          accent="blue"
                          className="w-full md:min-w-[12rem]"
                        />

                        <ListViewToggle value={patientListView} onChange={setPatientListView} />

                        <button
                          type="button"
                          onClick={() => setShowListExportModal(true)}
                          disabled={filteredPatients.length === 0}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Exportar listado filtrado"
                        >
                          <Download className="w-4 h-4" />
                          <span className="hidden sm:inline">Exportar</span>
                        </button>

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
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
                        
                        {/* Gender filter */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Género</span>
                          <SelectField
                            value={filterGender}
                            onChange={setFilterGender}
                            options={FILTER_GENDER_OPTIONS}
                            size="sm"
                            accent="blue"
                          />
                        </div>

                        {/* Vaccination filter */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vacunación</span>
                          <SelectField
                            value={filterVacuna}
                            onChange={setFilterVacuna}
                            options={FILTER_VACUNA_OPTIONS}
                            size="sm"
                            accent="blue"
                          />
                        </div>

                        {/* Collection center filter */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Centro de acopio</span>
                          <SelectField
                            value={filterCentro}
                            onChange={setFilterCentro}
                            options={centroFilterOptions(collectionCenters)}
                            size="sm"
                            accent="blue"
                          />
                        </div>

                        {/* Age group filter */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Clasificación</span>
                          <SelectField
                            value={filterGrupoEtario}
                            onChange={setFilterGrupoEtario}
                            options={FILTER_GRUPO_ETARIO_OPTIONS}
                            size="sm"
                            accent="blue"
                          />
                        </div>

                        {/* Age range filter */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Grupo de Edad</span>
                          <SelectField
                            value={filterAgeRange}
                            onChange={setFilterAgeRange}
                            options={FILTER_AGE_RANGE_OPTIONS}
                            size="sm"
                            accent="blue"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Salud</span>
                          <SelectField
                            value={filterSalud}
                            onChange={setFilterSalud}
                            options={FILTER_SALUD_OPTIONS}
                            size="sm"
                            accent="blue"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fecha registro</span>
                          <SelectField
                            value={filterRegistro}
                            onChange={setFilterRegistro}
                            options={FILTER_REGISTRO_OPTIONS}
                            size="sm"
                            accent="blue"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Historia clínica</span>
                          <SelectField
                            value={filterHistoria}
                            onChange={setFilterHistoria}
                            options={FILTER_HISTORIA_OPTIONS}
                            size="sm"
                            accent="blue"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Edad registrada</span>
                          <SelectField
                            value={filterEdad}
                            onChange={setFilterEdad}
                            options={FILTER_EDAD_OPTIONS}
                            size="sm"
                            accent="blue"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Escolaridad</span>
                          <SelectField
                            value={filterEscuela}
                            onChange={setFilterEscuela}
                            options={FILTER_ESCUELA_OPTIONS}
                            size="sm"
                            accent="blue"
                          />
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
                    <div className="space-y-4">
                      <ListPagination
                        page={patientListPagination.page}
                        totalPages={patientListPagination.totalPages}
                        totalItems={patientListPagination.total}
                        startIndex={patientListPagination.startIndex}
                        endIndex={patientListPagination.endIndex}
                        onPageChange={setListPage}
                        pageSize={listPageSize}
                        onPageSizeChange={handleListPageSizeChange}
                      />
                      {patientListView === 'table' ? (
                        <PatientListTable
                          patients={patientListPagination.pageItems}
                          canEdit={canEditPatients}
                          canDelete={isAppAdministrator}
                          onView={(p) => {
                            setSelectedPatient(p);
                            setCurrentView('details');
                          }}
                          onEdit={(p) => {
                            setSelectedPatient(p);
                            setCurrentView('edit');
                          }}
                          onDelete={(p) => setShowDeleteConfirm(p)}
                        />
                      ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {patientListPagination.pageItems.map((p, idx) => (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(idx * 0.05, 0.4) }}
                          className="bg-white rounded-xl border border-slate-200 hover:border-blue-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                        >
                          <div className="space-y-2.5">
                            {/* Header: gender and vaccine badge */}
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                {p.fotoPath && (
                                  <PatientPhoto
                                    fotoPath={p.fotoPath}
                                    alt={`${p.nombres} ${p.apellidos}`}
                                    className="h-12 w-12 rounded-xl object-cover border border-slate-200 shrink-0"
                                    fallbackClassName="hidden"
                                  />
                                )}
                                <div className="min-w-0">
                                  <h3 className="font-sans font-bold text-slate-800 text-sm md:text-base leading-tight group-hover:text-blue-600 transition-colors truncate">
                                    {p.nombres} {p.apellidos}
                                  </h3>
                                  <p className="text-xs text-slate-500 mt-1 font-medium">
                                    {edadPacienteTexto(p)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-1 shrink-0">
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
                            </div>

                            {/* Key credentials indicators */}
                            <div className={`grid gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-50 ${canEditPatients ? 'grid-cols-2' : 'grid-cols-1'}`}>
                              {canEditPatients && (
                              <div>
                                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Documento</span>
                                <span className="font-semibold text-slate-700 font-mono truncate block">{p.documentoIdentidad || 'Sin Cédula'}</span>
                              </div>
                              )}
                              <div>
                                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Representante</span>
                                <span className="font-semibold text-slate-700 truncate block">
                                  {pacienteRequiereRepresentante(p)
                                    ? p.nombreRepresentante
                                      ? `${p.nombreRepresentante.split(' ')[0]} (${p.parentesco})`
                                      : 'Sin registrar'
                                    : 'No aplica'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Quick button bar */}
                          <div className="pt-3 border-t border-slate-50 flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono text-slate-400 font-medium truncate">
                              {puntoRegistroEtiqueta(p) || `${p.ciudadMunicipio}${p.estadoProvincia ? `, ${p.estadoProvincia}` : ''}`}
                            </span>
                            
                            <div className="flex items-center gap-1.5">
                              {isAppAdministrator && (
                                <button
                                  onClick={() => { setShowDeleteConfirm(p); }}
                                  title="Eliminar captura"
                                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {canEditPatients && (
                              <button
                                onClick={() => { setSelectedPatient(p); setCurrentView('edit'); }}
                                title="Editar ficha"
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              )}
                              
                              <button
                                onClick={() => { setSelectedPatient(p); setCurrentView('details'); }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> Ver ficha
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      </div>
                      )}
                      <ListPagination
                        page={patientListPagination.page}
                        totalPages={patientListPagination.totalPages}
                        totalItems={patientListPagination.total}
                        startIndex={patientListPagination.startIndex}
                        endIndex={patientListPagination.endIndex}
                        onPageChange={setListPage}
                        pageSize={listPageSize}
                        onPageSizeChange={handleListPageSizeChange}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-3">
                      <div className="p-4 bg-slate-50 text-slate-400 rounded-full">
                        <Search className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="font-sans font-bold text-slate-700 text-sm">No se encontraron pacientes</h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          No hay ninguna captura que coincida con los criterios de búsqueda o filtros activos seleccionados.
                        </p>
                      </div>
                      
                      <button
                        onClick={resetPatientListFilters}
                        className="text-xs text-teal-700 font-bold hover:underline cursor-pointer"
                      >
                        Limpiar todos los filtros
                      </button>
                    </div>
                  )}

                </div>
              )}

              {/* TABLERO DE ESTADÍSTICAS TAB */}
              {activeTab === 'estadisticas' && (
                <DashboardStats
                  patients={patients}
                  totalCentrosRegistrados={totalCentrosRegistrados}
                  role={userRole}
                  superAdminStats={superAdminStats}
                  supplyStats={supplyStats}
                  onDrillDown={handleMetricDrillDown}
                />
              )}

            </motion.div>
          )}

          {/* 2. QUICK CREATE PATIENT VIEW */}
          {currentView === 'quick-create' && (
            <motion.div
              key="quick-create-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <QuickPatientRegister
                formKey={quickFormKey}
                carryOver={quickCarryOver}
                onSave={handleSavePatient}
                onOpenFullForm={() => setCurrentView('create')}
                onCancel={() => {
                  setQuickCarryOver(null);
                  setCurrentView('list');
                }}
              />
            </motion.div>
          )}

          {/* 3. CREATE PATIENT VIEW (full form) */}
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

          {/* 4. EDIT PATIENT VIEW */}
          {currentView === 'edit' && canEditPatients && (
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

          {/* 5. DETAILS / CLINICAL FILE VIEW */}
          {currentView === 'details' && selectedPatient && (
            <motion.div
              key="details-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <PatientDetails 
                patient={selectedPatient}
                userRole={userRole}
                canEdit={canEditPatients}
                canAddClinicalNotes={canEditPatients}
                exportTier={resolvePatientExportTier(userRole)}
                staffNameMap={staffNameMap}
                onEdit={(p) => { setSelectedPatient(p); setCurrentView('edit'); }}
                onBack={() => setCurrentView('list')}
                onUpdatePatient={handleUpdatePatientDetails}
              />
            </motion.div>
          )}

          {/* 6. ADMIN PANEL VIEW */}
          {currentView === 'admin' && isAppAdministrator && (
            <motion.div
              key="admin-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <AdminPanel
                initialRoleFilter={adminRoleFilter}
                onBack={() => {
                  setCurrentView('list');
                  setActiveTab('listado');
                  setAdminRoleFilter('all');
                }}
              />
            </motion.div>
          )}

          {currentView === 'equipo' && (
            <motion.div
              key="equipo-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <TeamPanel
                currentUserId={session?.user?.id}
                onBack={() => {
                  setCurrentView('list');
                  setActiveTab(defaultHomeTab(userRole));
                }}
              />
            </motion.div>
          )}

          {/* 6. COLLECTION CENTERS VIEW */}
          {currentView === 'centros' && (
            <motion.div
              key="centros-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <CollectionCentersPanel
                canManageCenters={isAppAdministrator}
                initialCenterId={centrosFocusCenterId}
                onInitialCenterConsumed={() => setCentrosFocusCenterId(null)}
                initialPanelView={centrosPanelView}
                onInitialPanelViewConsumed={() => setCentrosPanelView('centros')}
                onBack={() => {
                  setCentrosFocusCenterId(null);
                  setCentrosPanelView('centros');
                  setCurrentView('list');
                  setActiveTab(defaultHomeTab(userRole));
                  refreshCollectionCenters();
                  refreshPendingSupplyCount();
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
            <span>{APP_NAME} &bull; {APP_TAGLINE}</span>
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
                <h3 className="font-sans font-bold text-slate-800 text-base">¿Eliminar captura?</h3>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Está a punto de eliminar de forma permanente la captura de:
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

      <QuickSupplyRegisterModal
        open={quickSupplyType !== null}
        entryType={quickSupplyType ?? 'necesidad'}
        onClose={() => setQuickSupplyType(null)}
        onSaved={() => {
          refreshPendingSupplyCount();
          showNotification('success', 'Registro de insumo guardado.');
        }}
      />

      <ExportFormatModal
        open={showListExportModal}
        title="Exportar listado"
        description="Incluye todos los pacientes que coinciden con la búsqueda y los filtros actuales."
        itemCount={filteredPatients.length}
        onClose={() => setShowListExportModal(false)}
        onExport={async (format) => {
          const { exportPatientList } = await import('./lib/documentExport');
          await exportPatientList(filteredPatients, format, {
            title: isRegistrador(userRole) ? 'Censo de pacientes' : 'Listado de pacientes',
          });
          showNotification(
            'success',
            format === 'pdf' ? 'Documento PDF generado.' : 'Archivo CSV descargado.'
          );
        }}
      />

      {/* APP-LIKE BOTTOM NAVIGATION (mobile) */}
      <BottomNav
        active={bottomNavActive}
        onSelect={handleBottomNav}
        showAdmin={isAppAdministrator}
      />

    </div>
  );
}
