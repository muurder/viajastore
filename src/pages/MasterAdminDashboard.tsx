

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { UserRole, Trip, Agency, Client, AgencyReview, ThemePalette, TripCategory, UserStats, Booking, ActivityLog, ActivityActorRole, ActivityActionType } from '../types';
import { 
  Trash2, MessageCircle, Users, Briefcase, 
  BarChart, AlertOctagon, Database, Loader, Palette, Lock, Eye, Save, 
  Activity, X, Search, MoreVertical, 
  DollarSign, ShoppingBag, Edit3, 
  CreditCard, CheckCircle, XCircle, Ban, Star, UserX, UserCheck, Key,
  Sparkles, Filter, ChevronDown, MonitorPlay, Download, BarChart2 as StatsIcon, ExternalLink,
  LayoutGrid, List, Archive, ArchiveRestore, Trash, Camera, Upload, History as HistoryIcon, PauseCircle, PlayCircle, Plane, RefreshCw, AlertCircle, LucideProps, CalendarDays, User, Building, MapPin, Clock, Heart, ShieldCheck,
  Plus, LogOut, LayoutDashboard, Settings // Added missing imports for NavButton and actions
} from 'lucide-react';
import { migrateData } from '../services/dataMigration'; // Import migrateData to call it
import { useSearchParams, Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { slugify } from '../utils/slugify';

// --- STYLED COMPONENTS (LOCAL) ---

const Badge: React.FC<{ children: React.ReactNode; color: 'green' | 'red' | 'blue' | 'purple' | 'gray' | 'amber' }> = ({ children, color }) => {
  const colors = {
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[color]} inline-flex items-center gap-1.5 w-fit`}>
      {children}
    </span>
  );
};

interface StatCardProps { title: string; value: string | number; subtitle: string; icon: React.ComponentType<LucideProps>; color: 'green' | 'blue' | 'purple' | 'amber' }
const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon: Icon, color }) => {
    const bgColors = {
        green: 'bg-green-50 text-green-600',
        blue: 'bg-blue-50 text-blue-600',
        purple: 'bg-purple-50 text-purple-600',
        amber: 'bg-amber-50 text-amber-600',
    };
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-100 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${bgColors[color]} group-hover:scale-105 transition-transform`}><Icon size={24}/></div>
            </div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{value}</h3>
            <p className="text-xs text-gray-400 mt-2">{subtitle}</p>
        </div>
    );
};

interface ActionMenuProps { actions: { label: string; onClick: () => void; icon: React.ComponentType<LucideProps>; variant?: 'danger' | 'default' }[] }
const ActionMenu: React.FC<ActionMenuProps> = ({ actions }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical size={18} />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-[scaleIn_0.1s] origin-top-right ring-1 ring-black/5">
                    <div className="py-1">
                        {actions.map((action, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => { action.onClick(); setIsOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-3 transition-colors ${action.variant === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}
                            >
                                <action.icon size={16} /> {action.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Navigation Button component for Admin Dashboard (moved here for local scope)
interface NavButtonProps {
  tabId: string;
  label: string;
  icon: React.ComponentType<LucideProps>; // Using LucideProps for icon type
  activeTab: string;
  onClick: (tabId: string) => void;
  hasNotification?: boolean;
}

const NavButton: React.FC<NavButtonProps> = ({ tabId, label, icon: Icon, activeTab, onClick, hasNotification }) => (
  <button 
    onClick={() => onClick(tabId)} 
    className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors relative ${activeTab === tabId ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
  >
    <Icon size={16} /> 
    {label} 
    {hasNotification && ( 
      <span className="absolute top-2 right-2 flex h-2.5 w-2.5"> 
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span> 
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span> 
      </span> 
    )} 
  </button>
);


export const MasterAdminDashboard: React.FC = () => { // Renamed from AdminDashboard to MasterAdminDashboard
  const { user, logout } = useAuth(); // Added logout from useAuth
  const { 
      agencies, trips, agencyReviews, clients, auditLogs, bookings, activityLogs,
      updateAgencySubscription, toggleTripStatus, toggleTripFeatureStatus, deleteAgencyReview, 
      deleteUser, deleteMultipleUsers, deleteMultipleAgencies, getUsersStats,
      updateClientProfile, updateTrip, deleteTrip, updateMultipleUsersStatus, updateMultipleAgenciesStatus,
      logAuditAction, refreshData, updateAgencyReview, updateAgencyProfileByAdmin,
      softDeleteEntity, restoreEntity, sendPasswordReset, updateUserAvatarByAdmin,
      toggleAgencyStatus
  } = useData();
  const { themes, activeTheme, setTheme, addTheme, deleteTheme, previewTheme, resetPreview, previewMode } = useTheme();
  const { showToast } = useToast();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as string || 'OVERVIEW') as 'OVERVIEW' | 'USERS' | 'AGENCIES' | 'TRIPS' | 'REVIEWS' | 'AUDIT_LOGS' | 'THEMES'; // Explicitly type activeTab

  const isMaster = user?.email === 'juannicolas1@gmail.com';

  const [searchTerm, setSearchTerm] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [newThemeForm, setNewThemeForm] = useState({ name: '', primary: '#3b82f6', secondary: '#f97316' });

  const [modalType, setModalType] = useState<'DELETE' | 'EDIT_USER' | 'MANAGE_SUB' | 'EDIT_REVIEW' | 'EDIT_AGENCY' | 'EDIT_TRIP' | 'VIEW_STATS' | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);

  const [agencyView, setAgencyView] = useState<'cards' | 'list'>(
    () => (localStorage.getItem('adminAgencyView') as 'cards' | 'list') || 'cards'
  );
  const [userView, setUserView] = useState<'cards' | 'list'>(
    () => (localStorage.getItem('adminUserView') as 'cards' | 'list') || 'list' // Default to list for better overview
  );
  const [showAgencyTrash, setShowAgencyTrash] = useState(false);
  const [showUserTrash, setShowUserTrash] = useState(false);

  const [modalTab, setModalTab] = useState('PROFILE');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // NEW: State for Activity Log Filters
  const [activitySearchTerm, setActivitySearchTerm] = useState('');
  const [activityActorRoleFilter, setActivityActorRoleFilter] = useState<ActivityActorRole | 'ALL'>('ALL');
  const [activityActionTypeFilter, setActivityActionTypeFilter] = useState<ActivityActionType | 'ALL'>('ALL');
  const [activityStartDate, setActivityStartDate] = useState<string>('');
  const [activityEndDate, setActivityEndDate] = useState<string>('');


  const handleSetAgencyView = (view: 'cards' | 'list') => {
    setAgencyView(view);
    localStorage.setItem('adminAgencyView', view);
  };

  const handleSetUserView = (view: 'cards' | 'list') => {
    setUserView(view);
    localStorage.setItem('adminUserView', view);
  };

  const activeAgencies = useMemo(() => agencies.filter(a => !a.deleted_at), [agencies]);
  const deletedAgencies = useMemo(() => agencies.filter(a => !!a.deleted_at), [agencies]);
  const activeUsers = useMemo(() => clients.filter(c => c.role === UserRole.CLIENT && !c.deleted_at), [clients]);
  const deletedUsers = useMemo(() => clients.filter(c => c.role === UserRole.CLIENT && !!c.deleted_at), [clients]);


  const handleTabChange = (tab: typeof activeTab) => { // Type explicitly here as well
      setSearchParams({ tab });
      setSearchTerm('');
      setAgencyFilter('');
      setCategoryFilter('');
      setSelectedUsers([]);
      setSelectedAgencies([]);
      setShowAgencyTrash(false);
      setShowUserTrash(false);
      // Reset activity log filters when changing tabs
      setActivitySearchTerm('');
      setActivityActorRoleFilter('ALL');
      setActivityActionTypeFilter('ALL');
      setActivityStartDate('');
      setActivityEndDate('');
  };

  const handleRefresh = async () => {
      setIsProcessing(true);
      await refreshData();
      setIsProcessing(false);
  };
  
  const handleSoftDelete = async (id: string, type: 'user' | 'agency') => {
    const name = type === 'user' ? clients.find(c => c.id === id)?.name : agencies.find(a => a.id === id)?.name;
    if (window.confirm(`Mover "${name}" para a lixeira?`)) {
        setIsProcessing(true);
        await softDeleteEntity(id, type === 'user' ? 'profiles' : 'agencies');
        setIsProcessing(false);
        showToast(`${type === 'user' ? 'Usuário' : 'Agência'} movido para a lixeira.`, 'success');
        if (type === 'user') {
            setShowUserTrash(true);
        } else {
            setShowAgencyTrash(true);
        }
    }
  };

  const handleRestore = async (id: string, type: 'user' | 'agency') => {
    setIsProcessing(true);
    await restoreEntity(id, type === 'user' ? 'profiles' : 'agencies');
    setIsProcessing(false);
    showToast(`${type === 'user' ? 'Usuário' : 'Agência'} restaurado(a).`, 'success');
  };

  const handlePermanentDelete = async (id: string, role: UserRole) => {
    if (window.confirm('Excluir permanentemente? Esta ação não pode ser desfeita.')) {
        setIsProcessing(true);
        await deleteUser(id, role);
        setIsProcessing(false);
        showToast('Exclído permanentemente.', 'success');
    }
  };
  
  const handleEmptyTrash = async (type: 'user' | 'agency') => {
      const itemsToDelete = type === 'user' ? deletedUsers : deletedAgencies;
      if (itemsToDelete.length > 0 && window.confirm(`Excluir permanentemente ${itemsToDelete.length} item(ns) da lixeira? Esta ação não pode ser desfeita.`)) {
          setIsProcessing(true);
          try {
              if (type === 'user') {
                  await deleteMultipleUsers(itemsToDelete.map(i => i.id));
              } else {
                  await deleteMultipleAgencies(itemsToDelete.map(i => i.agencyId));
              }
          } catch (e: any) {
              showToast(e.message || 'Erro ao esvaziar a lixeira.', 'error');
          } finally {
              setIsProcessing(false);
          }
      }
  };

  const handleSubscriptionUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !editFormData.plan) return;
    setIsProcessing(true);
    try {
        await updateAgencySubscription(selectedItem.agencyId, editFormData.status, editFormData.plan, editFormData.expiresAt);
    } catch (error) {
        // Toast is already handled in DataContext
    } finally {
        setIsProcessing(false);
        setModalType(null);
    }
  };

  const addSubscriptionTime = (days: number) => {
      const current = editFormData.expiresAt ? new Date(editFormData.expiresAt) : new Date();
      const baseDate = (current.getTime() > Date.now()) ? current : new Date();
      
      const newDate = new Date(baseDate);
      newDate.setDate(newDate.getDate() + days);
      setEditFormData({ ...editFormData, expiresAt: newDate.toISOString().slice(0, 16) });
  };
  
  const handleUserStatusToggle = async (user: Client) => {
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setIsProcessing(true);
    try {
        await updateClientProfile(user.id, { status: newStatus });
        showToast(`Usuário ${newStatus === 'ACTIVE' ? 'reativado' : 'suspenso'}.`, 'success');
    } catch (e) {
        showToast('Erro ao alterar status.', 'error');
    } finally {
        setIsProcessing(false);
    }
  };

  const handleUserUpdate = async () => {
      if (!selectedItem) return;
      setIsProcessing(true);
      try {
          await updateClientProfile(selectedItem.id, editFormData);
          showToast('Usuário atualizado!', 'success');
          setModalType(null);
      } catch (error) {
          showToast('Erro ao atualizar usuário.', 'error');
      } finally {
          setIsProcessing(false);
          setModalType(null);
      }
  };

  const handleAgencyUpdate = async () => {
    if (!selectedItem) return;
    setIsProcessing(true);
    try {
        await updateAgencyProfileByAdmin(selectedItem.agencyId, editFormData);
    } catch (error) {
        // Toast handled in context
    } finally {
        setIsProcessing(false);
        setModalType(null);
    }
  };

  const handleReviewUpdate = async () => {
    if (!selectedItem) return;
    setIsProcessing(true);
    try {
        await updateAgencyReview(selectedItem.id, {
            comment: editFormData.comment,
            rating: editFormData.rating,
        });
    }  catch (error) {
        // Toast handled in context
    } finally {
        setIsProcessing(false);
        setModalType(null);
    }
  };

  const handleTripUpdate = async () => {
    if (!selectedItem) return;
    setIsProcessing(true);
    try {
        await updateTrip({ ...selectedItem, ...editFormData });
        showToast('Viagem atualizada!', 'success');
    } catch (error) {
        showToast('Erro ao atualizar viagem.', 'error');
    } finally {
        setIsProcessing(false);
        setModalType(null);
    }
  };
  
  const handleDeleteTrip = async (tripId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta viagem? A ação não pode ser desfeita.')) {
        setIsProcessing(true);
        try {
            await deleteTrip(tripId);
            showToast('Viagem excluída com sucesso.', 'success');
        } catch (error) {
            showToast('Erro ao excluir viagem.', 'error');
        } finally {
            setIsProcessing(false);
        }
    }
  };

  const handleAddTheme = async (e: React.FormEvent) => { e.preventDefault(); if (!newThemeForm.name) { showToast('O nome do tema é obrigatório.', 'error'); return; } setIsProcessing(true); const newTheme: Partial<ThemePalette> = { name: newThemeForm.name, colors: { primary: newThemeForm.primary, secondary: newThemeForm.secondary, background: '#f9fafb', text: '#111827' } }; const id = await addTheme(newTheme); if (id) { showToast('Tema adicionado com sucesso!', 'success'); setNewThemeForm({ name: '', primary: '#3b82f6', secondary: '#f97316' }); logAuditAction('ADMIN_THEME_MANAGED', `Created new theme: ${newTheme.name} (ID: ${id})`); } else { showToast('Erro ao adicionar tema.', 'error'); } setIsProcessing(false); };
  const handleDeleteTheme = async (themeId: string, themeName: string) => { if (window.confirm(`Tem certeza que deseja excluir o tema "${themeName}"?`)) { await deleteTheme(themeId); showToast('Tema excluído com sucesso!', 'success'); logAuditAction('ADMIN_THEME_MANAGED', `Deleted theme: ${themeName} (ID: ${themeId})`); } };
  
  const tripCategories = useMemo(() => Array.from(new Set(trips.map(t => t.category))), [trips]);
  const platformRevenue = useMemo(() => activeAgencies.reduce((total, agency) => total + (agency.subscriptionStatus === 'ACTIVE' ? (agency.subscriptionPlan === 'PREMIUM' ? 199.90 : 99.90) : 0), 0), [activeAgencies]);

  const filteredUsers = useMemo(() => (showUserTrash ? deletedUsers : activeUsers).filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase())), [activeUsers, deletedUsers, showUserTrash, searchTerm]);
  const filteredAgencies = useMemo(() => (showAgencyTrash ? deletedAgencies : activeAgencies).filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()) || (a.email && a.email.toLowerCase().includes(searchTerm.toLowerCase()))), [activeAgencies, deletedAgencies, showAgencyTrash, searchTerm]);
  const filteredTrips = useMemo(() => trips.filter(t => (t.title.toLowerCase().includes(searchTerm.toLowerCase())) && (agencyFilter ? t.agencyId === agencyFilter : true) && (categoryFilter ? t.category === categoryFilter : true)), [trips, searchTerm, agencyFilter, categoryFilter]);
  const filteredReviews = useMemo(() => agencyReviews.filter(r => r.comment.toLowerCase().includes(searchTerm.toLowerCase()) || r.agencyName?.toLowerCase().includes(searchTerm.toLowerCase())), [agencyReviews, searchTerm]);
  
  const handleToggleUser = (id: string) => setSelectedUsers(prev => prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]);
  const handleToggleAllUsers = () => setSelectedUsers(prev => prev.length === filteredUsers.length && filteredUsers.length > 0 ? [] : filteredUsers.map(u => u.id));
  const handleToggleAgency = (id: string) => setSelectedAgencies(prev => prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]);
  const handleToggleAllAgencies = () => setSelectedAgencies(prev => prev.length === filteredAgencies.length && filteredAgencies.length > 0 ? [] : filteredAgencies.map(a => a.agencyId));

  const handleMassDeleteUsers = async () => { if (window.confirm(`Excluir ${selectedUsers.length} usuários?`)) { await deleteMultipleUsers(selectedUsers); setSelectedUsers([]); showToast('Usuários excluídos.', 'success'); } };
  const handleMassDeleteAgencies = async () => { if (window.confirm(`Excluir ${selectedAgencies.length} agências?`)) { await deleteMultipleAgencies(selectedAgencies); setSelectedAgencies([]); showToast('Agências excluídas.', 'success'); } };
  const handleMassUpdateUserStatus = async (status: 'ACTIVE' | 'SUSPENDED') => { await updateMultipleUsersStatus(selectedUsers, status); setSelectedUsers([]); showToast('Status atualizado.', 'success'); };
  const handleMassUpdateAgencyStatus = async (status: 'ACTIVE' | 'INACTIVE') => { await updateMultipleAgenciesStatus(selectedAgencies, status); setSelectedAgencies([]); showToast('Status atualizado.', 'success'); };
  const handleViewStats = async () => { const stats = await getUsersStats(selectedUsers); setUserStats(stats); setModalType('VIEW_STATS'); };
  
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && selectedItem) {
        setIsUploadingAvatar(true);
        const newAvatarUrl = await updateUserAvatarByAdmin(selectedItem.id, e.target.files[0]);
        if (newAvatarUrl) {
            setEditFormData({ ...editFormData, avatar: newAvatarUrl });
            setSelectedItem({ ...selectedItem, avatar: newAvatarUrl });
        }
        setIsUploadingAvatar(false);
    }
  };

  const downloadPdf = (type: 'users' | 'agencies') => { 
    const doc = new jsPDF(); 
    doc.setFontSize(18); 
    doc.text(`Relatório de ${type === 'users' ? 'Usuários' : 'Agências'}`, 14, 22); 
    doc.setFontSize(11); 
    doc.setTextColor(100); 
    const headers = type === 'users' ? [["NOME", "EMAIL", "STATUS"]] : [["NOME", "PLANO", "STATUS"]]; 
    const data = type === 'users' ? filteredUsers.filter(u => selectedUsers.includes(u.id)).map(u => [u.name, u.email, u.status]) : filteredAgencies.filter(a => selectedAgencies.includes(a.agencyId)).map(a => [a.name, a.subscriptionPlan, a.subscriptionStatus]); 
    (doc as any).autoTable({ head: headers, body: data, startY: 30, }); 
    doc.save(`relatorio_${type}.pdf`); 
  };

  // NEW: Filtered Activity Logs
  const filteredActivityLogs = useMemo(() => {
    let result = [...activityLogs];

    if (activitySearchTerm) {
      const searchLower = activitySearchTerm.toLowerCase();
      result = result.filter(log => 
        log.actor_email.toLowerCase().includes(searchLower) ||
        log.user_name?.toLowerCase().includes(searchLower) ||
        log.agency_name?.toLowerCase().includes(searchLower) ||
        log.trip_title?.toLowerCase().includes(searchLower) ||
        log.action_type.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.details).toLowerCase().includes(searchLower)
      );
    }

    if (activityActorRoleFilter !== 'ALL') {
      result = result.filter(log => log.actor_role === activityActorRoleFilter);
    }

    if (activityActionTypeFilter !== 'ALL') {
      // Fix: Direct comparison with activityActionTypeFilter which is already of type ActivityActionType | 'ALL'
      result = result.filter(log => log.action_type === activityActionTypeFilter);
    }

    if (activityStartDate) {
      const start = new Date(activityStartDate).getTime();
      result = result.filter(log => new Date(log.created_at).getTime() >= start);
    }

    if (activityEndDate) {
      const end = new Date(activityEndDate).setHours(23, 59, 59, 999); // End of the day
      result = result.filter(log => new Date(log.created_at).getTime() <= end);
    }

    return result;
  }, [activityLogs, activitySearchTerm, activityActorRoleFilter, activityActionTypeFilter, activityStartDate, activityEndDate]);


  const exportActivityLogsToPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório de Atividades", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);

    const headers = [
      ["DATA", "ATOR", "PERFIL", "AÇÃO", "DETALHES"]
    ];

    const data = filteredActivityLogs.map(log => [
      new Date(log.created_at).toLocaleString('pt-BR'),
      log.user_name || log.actor_email,
      log.actor_role,
      (log.action_type as string).replace(/_/g, ' '), // Cast to string before replace
      JSON.stringify(log.details)
    ]);

    (doc as any).autoTable({
      head: headers,
      body: data,
      startY: 30,
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 },
        2: { cellWidth: 20 },
        3: { cellWidth: 40 },
        4: { cellWidth: 'auto' },
      }
    });

    doc.save("relatorio_atividades.pdf");
    logAuditAction('ADMIN_ACTIVITY_EXPORTED', 'Exported activity logs to PDF');
  };

  const getActionIcon = (actionType: ActivityActionType) => {
    switch (actionType) {
      case 'TRIP_VIEWED': return <Eye size={16} className="text-blue-500" />;
      case 'BOOKING_CREATED': return <ShoppingBag size={16} className="text-green-500" />;
      case 'REVIEW_SUBMITTED': return <Star size={16} className="text-amber-500" />;
      case 'FAVORITE_TOGGLED': return <Heart size={16} className="text-red-500" />; 
      case 'TRIP_CREATED': return <Plane size={16} className="text-primary-500" />;
      case 'TRIP_UPDATED': return <Edit3 size={16} className="text-primary-500" />;
      case 'TRIP_DELETED': return <Trash2 size={16} className="text-red-500" />;
      case 'TRIP_STATUS_TOGGLED': return <PauseCircle size={16} className="text-orange-500" />;
      case 'AGENCY_PROFILE_UPDATED': return <Building size={16} className="text-purple-500" />;
      case 'CLIENT_PROFILE_UPDATED': return <User size={16} className="text-purple-500" />;
      case 'PASSWORD_RESET_INITIATED': return <Lock size={16} className="text-gray-500" />;
      case 'ACCOUNT_DELETED': return <UserX size={16} className="text-red-500" />;
      case 'ADMIN_ACTION': return <ShieldCheck size={16} className="text-blue-600" />;
      case 'ADMIN_USER_MANAGED': return <Users size={16} className="text-blue-600" />;
      case 'ADMIN_AGENCY_MANAGED': return <Briefcase size={16} className="text-blue-600" />;
      case 'ADMIN_THEME_MANAGED': return <Palette size={16} className="text-blue-600" />;
      case 'ADMIN_MOCK_DATA_MIGRATED': return <Database size={16} className="text-primary-600" />;
      default: return <Activity size={16} className="text-gray-400" />;
    }
  };


  if (!user || user.role !== UserRole.ADMIN) return <div className="min-h-screen flex items-center justify-center">Acesso negado.</div>;

  const renderContent = () => {
    switch(activeTab) {
      case 'OVERVIEW':
        return (
          <div className="space-y-8 animate-[fadeIn_0.3s]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Receita Total" value={`R$ ${platformRevenue.toLocaleString()}`} subtitle="Receita bruta da plataforma" icon={DollarSign} color="green"/>
                <StatCard title="Agências Ativas" value={activeAgencies.length} subtitle="Parceiros verificados" icon={Briefcase} color="blue"/>
                <StatCard title="Usuários Ativos" value={activeUsers.length} subtitle="Clientes da plataforma" icon={Users} color="purple"/>
                <StatCard title="Pacotes Ativos" value={trips.length} subtitle="Viagens disponíveis" icon={Plane} color="amber"/>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Atividade Recente - Agora com todos os logs */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center"><Activity size={20} className="mr-2 text-blue-600"/> Atividade Recente</h3>
                        <button onClick={exportActivityLogsToPdf} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200 flex items-center gap-1.5">
                            <Download size={14}/> Exportar PDF
                        </button>
                    </div>
                    
                    {/* Activity Log Filters */}
                    <div className="flex flex-wrap gap-3 mb-4">
                        <input 
                            type="text" 
                            placeholder="Buscar no log..." 
                            value={activitySearchTerm} 
                            onChange={e => setSearchTerm(e.target.value)}
                            className="flex-1 min-w-[150px] border border-gray-200 rounded-lg text-sm p-2.5 outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                        <select 
                            value={activityActorRoleFilter} 
                            onChange={e => setActivityActorRoleFilter(e.target.value as ActivityActorRole | 'ALL')}
                            className="border border-gray-200 rounded-lg text-sm p-2.5 outline-none focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="ALL">Todos os Perfis</option>
                            <option value="CLIENT">Cliente</option>
                            <option value="AGENCY">Agência</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                        <select 
                            value={activityActionTypeFilter} 
                            onChange={e => setActivityActionTypeFilter(e.target.value as ActivityActionType | 'ALL')}
                            className="border border-gray-200 rounded-lg text-sm p-2.5 outline-none focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="ALL">Todos os Eventos</option>
                            <option value="TRIP_VIEWED">Viagem Visualizada</option>
                            <option value="BOOKING_CREATED">Reserva Criada</option>
                            <option value="REVIEW_SUBMITTED">Avaliação Enviada</option>
                            <option value="FAVORITE_TOGGLED">Favorito Alterado</option>
                            <option value="TRIP_CREATED">Viagem Criada</option>
                            <option value="TRIP_UPDATED">Viagem Atualizada</option>
                            <option value="TRIP_DELETED">Viagem Excluída</option>
                            <option value="TRIP_STATUS_TOGGLED">Status da Viagem Alterado</option>
                            <option value="TRIP_FEATURE_TOGGLED">Destaque da Viagem Alterado</option>
                            <option value="AGENCY_PROFILE_UPDATED">Perfil da Agência Atualizado</option>
                            <option value="AGENCY_STATUS_TOGGLED">Status da Agência Alterado</option>
                            <option value="AGENCY_SUBSCRIPTION_UPDATED">Assinatura da Agência Atualizada</option>
                            <option value="CLIENT_PROFILE_UPDATED">Perfil do Cliente Atualizado</option>
                            <option value="PASSWORD_RESET_INITIATED">Reset de Senha Iniciado</option>
                            <option value="ACCOUNT_DELETED">Conta Excluída</option>
                            <option value="ADMIN_USER_MANAGED">Usuário (Admin) Gerenciado</option>
                            <option value="ADMIN_AGENCY_MANAGED">Agência (Admin) Gerenciada</option>
                            <option value="ADMIN_THEME_MANAGED">Tema (Admin) Gerenciado</option>
                            <option value="ADMIN_MOCK_DATA_MIGRATED">Dados Mock Migrados (Admin)</option>
                            <option value="ADMIN_ACTION">Ação Administrativa</option>
                        </select>
                        <input 
                            type="date" 
                            value={activityStartDate} 
                            onChange={e => setActivityStartDate(e.target.value)}
                            className="border border-gray-200 rounded-lg text-sm p-2.5 outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                        <input 
                            type="date" 
                            value={activityEndDate} 
                            onChange={e => setActivityEndDate(e.target.value)}
                            className="border border-gray-200 rounded-lg text-sm p-2.5 outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                        {(activitySearchTerm || activityActorRoleFilter !== 'ALL' || activityActionTypeFilter !== 'ALL' || activityStartDate || activityEndDate) && (
                            <button 
                                onClick={() => { setSearchTerm(''); setActivityActorRoleFilter('ALL'); setActivityActionTypeFilter('ALL'); setActivityStartDate(''); setActivityEndDate(''); }}
                                className="text-red-500 text-sm font-bold hover:underline px-2"
                            >
                                Limpar Filtros
                            </button>
                        )}
                    </div>


                    {filteredActivityLogs.length > 0 ? (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
                            {filteredActivityLogs.map(log => (
                                <div key={log.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-start gap-3">
                                    <div className="flex-shrink-0">
                                        {getActionIcon(log.action_type)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-900 line-clamp-1 flex items-center gap-1.5">
                                            {log.user_avatar && <img src={log.user_avatar} alt="Avatar" className="w-5 h-5 rounded-full object-cover"/>}
                                            {log.user_name}
                                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{log.actor_role}</span>
                                        </p>
                                        <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                                            <span className="font-semibold">{(log.action_type as string).replace(/_/g, ' ')}</span>
                                            {log.trip_title && ` na viagem "${log.trip_title}"`}
                                            {log.agency_name && ` da agência "${log.agency_name}"`}
                                            {log.details.action === 'soft_delete' && ` (movido para lixeira)`}
                                            {log.details.action === 'restore' && ` (restaurado)`}
                                            {log.details.action === 'permanent_delete' && ` (excluído permanentemente)`}
                                            {log.details.newStatus && ` (novo status: ${log.details.newStatus})`}
                                            {log.details.rating && ` (nota: ${log.details.rating})`}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1.5">
                                            <CalendarDays size={12} /> {new Date(log.created_at).toLocaleString('pt-BR')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400 text-sm">Nenhuma atividade recente encontrada.</div>
                    )}
                </div>

                {/* Migrar Dados Mock */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Database size={20} className="mr-2 text-primary-600"/> Ferramentas de Dados</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Use para popular seu banco de dados de desenvolvimento com informações de exemplo.
                        <br/>(Não use em produção!)
                    </p>
                    <button 
                        onClick={async () => { // Make onClick async
                            setIsProcessing(true);
                            await migrateData();
                            logAuditAction('ADMIN_MOCK_DATA_MIGRATED', 'Migrated mock data to database'); // Log the migration
                            await refreshData(); // Refresh data context after migration
                            setIsProcessing(false);
                        }} 
                        disabled={isProcessing}
                        className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isProcessing ? <Loader size={18} className="animate-spin" /> : <Sparkles size={18}/>} Migrar Dados Mock
                    </button>
                    {isMaster && (
                        <div className="mt-4">
                            <h4 className="text-sm font-bold text-red-600 flex items-center mb-2"><AlertOctagon size={16} className="mr-2"/> Ferramentas de Limpeza (Master Admin)</h4>
                            <p className="text-xs text-gray-500 mb-3">
                                CUIDADO! Estas ações são irreversíveis e APAGAM DADOS DO BANCO.
                            </p>
                            <div className="space-y-2">
                                <button onClick={() => { if (window.confirm('Excluir TODOS os usuários (clientes e agências)?')) deleteMultipleUsers(clients.map(c => c.id)); }} className="w-full bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100">Excluir Todos os Usuários</button>
                                <button onClick={() => { if (window.confirm('Excluir TODAS as agências e viagens?')) deleteMultipleAgencies(agencies.map(a => a.agencyId)); }} className="w-full bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100">Excluir Todas as Agências</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </div>
        );
      case 'USERS':
        return (
          <div className="animate-[fadeIn_0.3s]">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Usuários ({filteredUsers.length})</h2>
                <div className="flex items-center gap-3">
                    <button onClick={() => handleSetUserView('list')} className={`p-2 rounded-lg ${userView === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}><List size={20}/></button>
                    <button onClick={() => handleSetUserView('cards')} className={`p-2 rounded-lg ${userView === 'cards' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}><LayoutGrid size={20}/></button>
                </div>
            </div>

            <div className="mb-6 flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                    <input type="text" placeholder="Buscar usuário por nome ou email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"/>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowUserTrash(!showUserTrash)} className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors ${showUserTrash ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        {showUserTrash ? <Trash size={18}/> : <Archive size={18}/>}
                        {showUserTrash ? `Lixeira (${deletedUsers.length})` : 'Ver Lixeira'}
                    </button>
                    <button onClick={handleRefresh} disabled={isProcessing} className="px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50">
                        {isProcessing ? <Loader size={18} className="animate-spin"/> : <RefreshCw size={18}/>} Atualizar
                    </button>
                </div>
            </div>
            
            {selectedUsers.length > 0 && (
                <div className="bg-primary-50 border border-primary-100 p-4 rounded-xl mb-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-[fadeIn_0.3s]">
                    <p className="text-sm text-primary-800 font-bold">{selectedUsers.length} usuário(s) selecionado(s)</p>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={handleMassUpdateUserStatus.bind(null, 'ACTIVE')} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 text-green-700 hover:bg-green-100 flex items-center gap-1"><UserCheck size={14}/> Ativar</button>
                        <button onClick={handleMassUpdateUserStatus.bind(null, 'SUSPENDED')} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 flex items-center gap-1"><UserX size={14}/> Suspender</button>
                        <button onClick={handleViewStats} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1"><StatsIcon size={14}/> Ver Estatísticas</button>
                        <button onClick={downloadPdf.bind(null, 'users')} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-50 text-gray-700 hover:bg-gray-100 flex items-center gap-1"><Download size={14}/> Exportar PDF</button>
                    </div>
                </div>
            )}

            {filteredUsers.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <Users size={32} className="text-gray-300 mx-auto mb-4"/>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum usuário encontrado</h3>
                    <p className="text-gray-500 mb-6">Ajuste seus filtros ou limpe a busca.</p>
                </div>
            ) : userView === 'list' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <input type="checkbox" onChange={handleToggleAllUsers} checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0} className="rounded text-primary-600"/>
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Função</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.map((client: Client) => (
                                <tr key={client.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input type="checkbox" onChange={() => handleToggleUser(client.id)} checked={selectedUsers.includes(client.id)} className="rounded text-primary-600"/>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <img className="h-10 w-10 rounded-full object-cover" src={client.avatar || `https://ui-avatars.com/api/?name=${client.name}`} alt=""/>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{client.name}</div>
                                                <div className="text-sm text-gray-500">{client.phone || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Badge color={client.status === 'ACTIVE' ? 'green' : 'red'}>{client.status}</Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.role}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <ActionMenu actions={[
                                            { label: 'Editar', onClick: () => { setSelectedItem(client); setEditFormData({ name: client.name, email: client.email, phone: client.phone, cpf: client.cpf, avatar: client.avatar, address: client.address }); setModalType('EDIT_USER'); setModalTab('PROFILE'); }, icon: Edit3 },
                                            { label: client.status === 'ACTIVE' ? 'Suspender' : 'Ativar', onClick: () => handleUserStatusToggle(client), icon: client.status === 'ACTIVE' ? UserX : UserCheck },
                                            { label: 'Resetar Senha', onClick: () => sendPasswordReset(client.email), icon: Lock },
                                            { label: showUserTrash ? 'Excluir Perm.' : 'Mover para Lixeira', onClick: () => showUserTrash ? handlePermanentDelete(client.id, client.role) : handleSoftDelete(client.id, 'user'), icon: showUserTrash ? Trash2 : Archive, variant: 'danger' },
                                            ...(showUserTrash ? [{ label: 'Restaurar', onClick: () => handleRestore(client.id, 'user'), icon: ArchiveRestore }] : [])
                                        ]}/>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredUsers.map((client: Client) => (
                        <div key={client.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative">
                            <input type="checkbox" onChange={() => handleToggleUser(client.id)} checked={selectedUsers.includes(client.id)} className="absolute top-4 left-4 rounded text-primary-600"/>
                            <div className="flex flex-col items-center text-center pb-4 mb-4 border-b border-gray-100">
                                <img className="h-16 w-16 rounded-full object-cover mb-3" src={client.avatar || `https://ui-avatars.com/api/?name=${client.name}`} alt=""/>
                                <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{client.name}</h3>
                                <p className="text-sm text-gray-500 line-clamp-1">{client.email}</p>
                            </div>
                            <div className="flex justify-around items-center text-sm text-gray-600">
                                <Badge color={client.status === 'ACTIVE' ? 'green' : 'red'}>{client.status}</Badge>
                                <Badge color="blue">{client.role}</Badge>
                            </div>
                            <div className="flex justify-center gap-2 mt-4">
                                <button onClick={() => { setSelectedItem(client); setEditFormData({ name: client.name, email: client.email, phone: client.phone, cpf: client.cpf, avatar: client.avatar, address: client.address }); setModalType('EDIT_USER'); setModalTab('PROFILE'); }} className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-50"><Edit3 size={18}/></button>
                                <button onClick={() => handleUserStatusToggle(client)} className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-50">{client.status === 'ACTIVE' ? <UserX size={18}/> : <UserCheck size={18}/>}</button>
                            </div>
                            <div className="absolute top-4 right-4">
                                <ActionMenu actions={[
                                    { label: 'Resetar Senha', onClick: () => sendPasswordReset(client.email), icon: Lock },
                                    { label: showUserTrash ? 'Excluir Perm.' : 'Mover para Lixeira', onClick: () => showUserTrash ? handlePermanentDelete(client.id, client.role) : handleSoftDelete(client.id, 'user'), icon: showUserTrash ? Trash2 : Archive, variant: 'danger' },
                                    ...(showUserTrash ? [{ label: 'Restaurar', onClick: () => handleRestore(client.id, 'user'), icon: ArchiveRestore }] : [])
                                ]}/>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        );
      case 'AGENCIES':
        return (
          <div className="animate-[fadeIn_0.3s]">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Agências ({filteredAgencies.length})</h2>
                <div className="flex items-center gap-3">
                    <button onClick={() => handleSetAgencyView('list')} className={`p-2 rounded-lg ${agencyView === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}><List size={20}/></button>
                    <button onClick={() => handleSetAgencyView('cards')} className={`p-2 rounded-lg ${agencyView === 'cards' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}><LayoutGrid size={20}/></button>
                </div>
            </div>

            <div className="mb-6 flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                    <input type="text" placeholder="Buscar agência por nome ou email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"/>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowAgencyTrash(!showAgencyTrash)} className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors ${showAgencyTrash ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        {showAgencyTrash ? <Trash size={18}/> : <Archive size={18}/>}
                        {showAgencyTrash ? `Lixeira (${deletedAgencies.length})` : 'Ver Lixeira'}
                    </button>
                    <button onClick={handleRefresh} disabled={isProcessing} className="px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50">
                        {isProcessing ? <Loader size={18} className="animate-spin"/> : <RefreshCw size={18}/>} Atualizar
                    </button>
                </div>
            </div>
            
            {selectedAgencies.length > 0 && (
                <div className="bg-primary-50 border border-primary-100 p-4 rounded-xl mb-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-[fadeIn_0.3s]">
                    <p className="text-sm text-primary-800 font-bold">{selectedAgencies.length} agência(s) selecionada(s)</p>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={handleMassUpdateAgencyStatus.bind(null, 'ACTIVE')} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 text-green-700 hover:bg-green-100 flex items-center gap-1"><CheckCircle size={14}/> Ativar</button>
                        <button onClick={handleMassUpdateAgencyStatus.bind(null, 'INACTIVE')} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1"><Ban size={14}/> Inativar</button>
                        <button onClick={handleMassDeleteAgencies} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1"><Trash2 size={14}/> Excluir</button>
                        <button onClick={downloadPdf.bind(null, 'agencies')} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-50 text-gray-700 hover:bg-gray-100 flex items-center gap-1"><Download size={14}/> Exportar PDF</button>
                    </div>
                </div>
            )}

            {filteredAgencies.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <Building size={32} className="text-gray-300 mx-auto mb-4"/>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhuma agência encontrada</h3>
                    <p className="text-gray-500 mb-6">Ajuste seus filtros ou limpe a busca.</p>
                </div>
            ) : agencyView === 'list' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <input type="checkbox" onChange={handleToggleAllAgencies} checked={selectedAgencies.length === filteredAgencies.length && filteredAgencies.length > 0} className="rounded text-primary-600"/>
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agência</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plano</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredAgencies.map((agency: Agency) => (
                                <tr key={agency.agencyId} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input type="checkbox" onChange={() => handleToggleAgency(agency.agencyId)} checked={selectedAgencies.includes(agency.agencyId)} className="rounded text-primary-600"/>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <img className="h-10 w-10 rounded-full object-cover" src={agency.logo || `https://ui-avatars.com/api/?name=${agency.name}`} alt=""/>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{agency.name}</div>
                                                <div className="text-sm text-gray-500">{agency.slug}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agency.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <Badge color={agency.subscriptionPlan === 'PREMIUM' ? 'purple' : 'blue'}>{agency.subscriptionPlan}</Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Badge color={agency.subscriptionStatus === 'ACTIVE' ? 'green' : 'red'}>{agency.subscriptionStatus}</Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <ActionMenu actions={[
                                            { label: 'Editar', onClick: () => { setSelectedItem(agency); setEditFormData({ ...agency }); setModalType('EDIT_AGENCY'); }, icon: Edit3 },
                                            { label: agency.is_active ? 'Inativar' : 'Ativar', onClick: () => toggleAgencyStatus(agency.agencyId), icon: agency.is_active ? Ban : CheckCircle },
                                            { label: 'Gerenciar Assinatura', onClick: () => { setSelectedItem(agency); setEditFormData({ plan: agency.subscriptionPlan, status: agency.subscriptionStatus, expiresAt: agency.subscriptionExpiresAt.slice(0, 16) }); setModalType('MANAGE_SUB'); }, icon: CreditCard },
                                            { label: showAgencyTrash ? 'Excluir Perm.' : 'Mover para Lixeira', onClick: () => showAgencyTrash ? handlePermanentDelete(agency.id, agency.role) : handleSoftDelete(agency.id, 'agency'), icon: showAgencyTrash ? Trash2 : Archive, variant: 'danger' },
                                            ...(showAgencyTrash ? [{ label: 'Restaurar', onClick: () => handleRestore(agency.id, 'agency'), icon: ArchiveRestore }] : [])
                                        ]}/>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAgencies.map((agency: Agency) => (
                        <div key={agency.agencyId} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative">
                            <input type="checkbox" onChange={() => handleToggleAgency(agency.agencyId)} checked={selectedAgencies.includes(agency.agencyId)} className="absolute top-4 left-4 rounded text-primary-600"/>
                            <div className="flex flex-col items-center text-center pb-4 mb-4 border-b border-gray-100">
                                <img className="h-16 w-16 rounded-full object-cover mb-3" src={agency.logo || `https://ui-avatars.com/api/?name=${agency.name}`} alt=""/>
                                <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{agency.name}</h3>
                                <p className="text-sm text-gray-500 line-clamp-1">{agency.email}</p>
                            </div>
                            <div className="flex justify-around items-center text-sm text-gray-600">
                                <Badge color={agency.subscriptionPlan === 'PREMIUM' ? 'purple' : 'blue'}>{agency.subscriptionPlan}</Badge>
                                <Badge color={agency.subscriptionStatus === 'ACTIVE' ? 'green' : 'red'}>{agency.subscriptionStatus}</Badge>
                            </div>
                            <div className="flex justify-center gap-2 mt-4">
                                <button onClick={() => { setSelectedItem(agency); setEditFormData({ ...agency }); setModalType('EDIT_AGENCY'); }} className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-50"><Edit3 size={18}/></button>
                                <button onClick={() => toggleAgencyStatus(agency.agencyId)} className="p-2 rounded