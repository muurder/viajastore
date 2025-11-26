import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { UserRole, Trip, Agency, Client, AgencyReview, ThemePalette, TripCategory, UserStats } from '../types';
import { 
  Trash2, MessageCircle, Users, Briefcase, 
  BarChart, AlertOctagon, Database, Loader, Palette, Lock, Eye, Save, 
  Activity, X, Search, MoreVertical, 
  DollarSign, ShoppingBag, Edit3, 
  CreditCard, CheckCircle, XCircle, Ban, Star, UserX, UserCheck, Key,
  Sparkles, Filter, ChevronDown, MonitorPlay, Download, BarChart2 as StatsIcon, ExternalLink,
  LayoutGrid, List, Archive, ArchiveRestore, Trash
} from 'lucide-react';
import { migrateData } from '../services/dataMigration';
import { useSearchParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
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

const StatCard: React.FC<{ title: string; value: string | number; subtitle: string; icon: any; color: 'green' | 'blue' | 'purple' | 'amber' }> = ({ title, value, subtitle, icon: Icon, color }) => {
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

const ActionMenu: React.FC<{ actions: { label: string; onClick: () => void; icon: any; variant?: 'danger' | 'default' }[] }> = ({ actions }) => {
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

// --- MAIN COMPONENT ---

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { 
      agencies, trips, agencyReviews, clients, auditLogs, 
      updateAgencySubscription, toggleTripStatus, toggleTripFeatureStatus, deleteAgencyReview, 
      deleteUser, deleteMultipleUsers, getUsersStats,
      updateClientProfile, updateTrip, deleteTrip, updateMultipleUsersStatus, updateMultipleAgenciesStatus,
      logAuditAction, refreshData, updateAgencyReview, updateAgencyProfileByAdmin,
      softDeleteEntity, restoreEntity,
  } = useData();
  const { themes, activeTheme, setTheme, addTheme, deleteTheme, previewTheme, resetPreview } = useTheme();
  const { showToast } = useToast();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as any) || 'OVERVIEW';

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
    () => (localStorage.getItem('adminUserView') as 'cards' | 'list') || 'cards'
  );
  const [showAgencyTrash, setShowAgencyTrash] = useState(false);
  const [showUserTrash, setShowUserTrash] = useState(false);

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


  const handleTabChange = (tab: string) => {
      setSearchParams({ tab });
      setSearchTerm('');
      setAgencyFilter('');
      setCategoryFilter('');
      setSelectedUsers([]);
      setSelectedAgencies([]);
      setShowAgencyTrash(false);
      setShowUserTrash(false);
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
        try {
            await softDeleteEntity(id, type === 'user' ? 'profiles' : 'agencies');
            showToast(`${type === 'user' ? 'Usuário' : 'Agência'} movido para a lixeira.`, 'success');
            if (type === 'user') {
                setShowUserTrash(true);
            } else {
                setShowAgencyTrash(true);
            }
        } catch (error) {
            // Error toast is handled in context
        } finally {
            setIsProcessing(false);
        }
    }
  };

  const handleRestore = async (id: string, type: 'user' | 'agency') => {
    setIsProcessing(true);
    try {
        await restoreEntity(id, type === 'user' ? 'profiles' : 'agencies');
        showToast(`${type === 'user' ? 'Usuário' : 'Agência'} restaurado(a).`, 'success');
    } catch (error) {
        // Error toast is handled in context
    } finally {
        setIsProcessing(false);
    }
  };

  const handlePermanentDelete = async (id: string, role: UserRole) => {
    if (window.confirm('Excluir permanentemente? Esta ação não pode ser desfeita.')) {
        setIsProcessing(true);
        try {
            await deleteUser(id, role);
            showToast('Excluído permanentemente.', 'success');
        } catch (error) {
            showToast('Erro ao excluir permanentemente.', 'error');
        } finally {
            setIsProcessing(false);
        }
    }
  };
  
  const handleEmptyTrash = async (type: 'user' | 'agency') => {
      const itemsToDelete = type === 'user' ? deletedUsers : deletedAgencies;
      if (itemsToDelete.length > 0 && window.confirm(`Excluir permanentemente ${itemsToDelete.length} item(ns) da lixeira? Esta ação não pode ser desfeita.`)) {
          setIsProcessing(true);
          try {
              await deleteMultipleUsers(itemsToDelete.map(i => i.id));
              showToast('Lixeira esvaziada.', 'success');
          } catch (e) {
              showToast('Erro ao esvaziar a lixeira.', 'error');
          } finally {
              setIsProcessing(false);
          }
      }
  };

  const handleSubscriptionUpdate = async () => {
    if (!selectedItem || !editFormData.plan) return;
    setIsProcessing(true);
    try {
        await updateAgencySubscription(selectedItem.id, editFormData.status, editFormData.plan);
    } catch (error) {
        // Toast is already handled in DataContext
    } finally {
        setIsProcessing(false);
        setModalType(null);
    }
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
        await updateAgencyProfileByAdmin(selectedItem.id, editFormData);
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
    } catch (error) {
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

  const handleAddTheme = async (e: React.FormEvent) => { e.preventDefault(); if (!newThemeForm.name) { showToast('O nome do tema é obrigatório.', 'error'); return; } setIsProcessing(true); const newTheme: Partial<ThemePalette> = { name: newThemeForm.name, colors: { primary: newThemeForm.primary, secondary: newThemeForm.secondary, background: '#f9fafb', text: '#111827' } }; const id = await addTheme(newTheme); if (id) { showToast('Tema adicionado com sucesso!', 'success'); setNewThemeForm({ name: '', primary: '#3b82f6', secondary: '#f97316' }); } else { showToast('Erro ao adicionar tema.', 'error'); } setIsProcessing(false); };
  const handleDeleteTheme = async (themeId: string, themeName: string) => { if (window.confirm(`Tem certeza que deseja excluir o tema "${themeName}"?`)) { await deleteTheme(themeId); showToast('Tema excluído com sucesso.', 'success'); } };
  
  const tripCategories = useMemo(() => Array.from(new Set(trips.map(t => t.category))), [trips]);
  const platformRevenue = useMemo(() => activeAgencies.reduce((total, agency) => total + (agency.subscriptionStatus === 'ACTIVE' ? (agency.subscriptionPlan === 'PREMIUM' ? 199.90 : 99.90) : 0), 0), [activeAgencies]);

  const filteredUsers = useMemo(() => (showUserTrash ? deletedUsers : activeUsers).filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase())), [activeUsers, deletedUsers, showUserTrash, searchTerm]);
  const filteredAgencies = useMemo(() => (showAgencyTrash ? deletedAgencies : activeAgencies).filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()) || (a.email && a.email.toLowerCase().includes(searchTerm.toLowerCase()))), [activeAgencies, deletedAgencies, showAgencyTrash, searchTerm]);
  const filteredTrips = useMemo(() => trips.filter(t => (t.title.toLowerCase().includes(searchTerm.toLowerCase())) && (agencyFilter ? t.agencyId === agencyFilter : true) && (categoryFilter ? t.category === categoryFilter : true)), [trips, searchTerm, agencyFilter, categoryFilter]);
  const filteredReviews = useMemo(() => agencyReviews.filter(r => r.comment.toLowerCase().includes(searchTerm.toLowerCase()) || r.agencyName?.toLowerCase().includes(searchTerm.toLowerCase())), [agencyReviews, searchTerm]);
  
  const handleToggleUser = (id: string) => setSelectedUsers(prev => prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]);
  const handleToggleAllUsers = () => setSelectedUsers(prev => prev.length === filteredUsers.length ? [] : filteredUsers.map(u => u.id));
  const handleToggleAgency = (id: string) => setSelectedAgencies(prev => prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]);
  const handleToggleAllAgencies = () => setSelectedAgencies(prev => prev.length === filteredAgencies.length ? [] : filteredAgencies.map(a => a.id));

  const handleMassDeleteUsers = async () => { if (window.confirm(`Excluir ${selectedUsers.length} usuários?`)) { await deleteMultipleUsers(selectedUsers); setSelectedUsers([]); showToast('Usuários excluídos.', 'success'); } };
  const handleMassDeleteAgencies = async () => { if (window.confirm(`Excluir ${selectedAgencies.length} agências?`)) { await deleteMultipleUsers(selectedAgencies); setSelectedAgencies([]); showToast('Agências excluídas.', 'success'); } };
  const handleMassUpdateUserStatus = async (status: 'ACTIVE' | 'SUSPENDED') => { await updateMultipleUsersStatus(selectedUsers, status); setSelectedUsers([]); showToast('Status atualizado.', 'success'); };
  const handleMassUpdateAgencyStatus = async (status: 'ACTIVE' | 'INACTIVE') => { await updateMultipleAgenciesStatus(selectedAgencies, status); setSelectedAgencies([]); showToast('Status atualizado.', 'success'); };
  const handleViewStats = async () => { const stats = await getUsersStats(selectedUsers); setUserStats(stats); setModalType('VIEW_STATS'); };

  const downloadPdf = (type: 'users' | 'agencies') => { const doc = new jsPDF(); doc.setFontSize(18); doc.text(`Relatório de ${type === 'users' ? 'Usuários' : 'Agências'}`, 14, 22); doc.setFontSize(11); doc.setTextColor(100); const headers = type === 'users' ? [["NOME", "EMAIL", "STATUS"]] : [["NOME", "PLANO", "STATUS"]]; const data = type === 'users' ? filteredUsers.filter(u => selectedUsers.includes(u.id)).map(u => [u.name, u.email, u.status]) : filteredAgencies.filter(a => selectedAgencies.includes(a.id)).map(a => [a.name, a.subscriptionPlan, a.subscriptionStatus]); (doc as any).autoTable({ head: headers, body: data, startY: 30, }); doc.save(`relatorio_${type}.pdf`); };

  if (!user || user.role !== UserRole.ADMIN) return <div className="min-h-screen flex items-center justify-center">Acesso negado.</div>;

  const renderContent = () => {
    switch(activeTab) {
      case 'USERS':
        return (
          <div className="animate-[fadeIn_0.3s]">
            {userView === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredUsers.map(c => (
                    <div key={c.id} className={`bg-white rounded-2xl shadow-sm border ${selectedUsers.includes(c.id) ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-100'} p-5 transition-all relative`}>
                      <input type="checkbox" checked={selectedUsers.includes(c.id)} onChange={() => handleToggleUser(c.id)} className="absolute top-4 left-4 h-5 w-5 rounded text-primary-600 border-gray-300 focus:ring-primary-500"/>
                      <div className="absolute top-4 right-4"><ActionMenu actions={showUserTrash ? [{label: 'Restaurar', icon: ArchiveRestore, onClick: () => handleRestore(c.id, 'user')}, {label: 'Excluir Perm.', icon: Trash, onClick: () => handlePermanentDelete(c.id, c.role), variant: 'danger'}] : [{ label: 'Editar Dados', icon: Edit3, onClick: () => { setEditFormData(c); setSelectedItem(c); setModalType('EDIT_USER'); } }, { label: c.status === 'ACTIVE' ? 'Suspender' : 'Reativar', icon: c.status === 'ACTIVE' ? Ban : UserCheck, onClick: () => handleUserStatusToggle(c), variant: c.status === 'ACTIVE' ? 'default' : 'default' }, { label: 'Mover para Lixeira', icon: Trash2, onClick: () => handleSoftDelete(c.id, 'user'), variant: 'danger' }]} /></div>
                      <div className="flex flex-col items-center text-center pt-8">
                        <img src={c.avatar || `https://ui-avatars.com/api/?name=${c.name}`} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md mb-3" alt=""/>
                        <p className="font-bold text-gray-900 text-lg">{c.name}</p>
                        <p className="text-sm text-gray-500 mb-4">{c.email}</p>
                        <Badge color={c.status === 'ACTIVE' ? 'green' : 'red'}>{c.status === 'SUSPENDED' ? 'SUSPENSO' : 'ATIVO'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50"><tr><th className="w-10 px-6 py-4"><input type="checkbox" onChange={handleToggleAllUsers} checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0} className="h-4 w-4 rounded text-primary-600 border-gray-300 focus:ring-primary-500"/></th><th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Usuário</th><th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Contato</th><th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th><th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th></tr></thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {filteredUsers.map(c => (<tr key={c.id} className="hover:bg-gray-50 transition-colors"><td className="px-6 py-4"><input type="checkbox" checked={selectedUsers.includes(c.id)} onChange={() => handleToggleUser(c.id)} className="h-4 w-4 rounded text-primary-600 border-gray-300 focus:ring-primary-500"/></td><td className="px-6 py-4"><div className="flex items-center gap-3"><img src={c.avatar || `https://ui-avatars.com/api/?name=${c.name}`} className="w-10 h-10 rounded-full" alt=""/><p className="font-bold text-gray-900 text-sm">{c.name}</p></div></td><td className="px-6 py-4"><p className="text-sm text-gray-600">{c.email}</p><p className="text-xs text-gray-400">{c.phone}</p></td><td className="px-6 py-4"><Badge color={c.status === 'ACTIVE' ? 'green' : 'red'}>{c.status === 'SUSPENDED' ? 'SUSPENSO' : 'ATIVO'}</Badge></td><td className="px-6 py-4 text-right"><ActionMenu actions={showUserTrash ? [{label: 'Restaurar', icon: ArchiveRestore, onClick: () => handleRestore(c.id, 'user')}, {label: 'Excluir Perm.', icon: Trash, onClick: () => handlePermanentDelete(c.id, c.role), variant: 'danger'}] : [{ label: 'Editar', icon: Edit3, onClick: () => { setEditFormData(c); setSelectedItem(c); setModalType('EDIT_USER'); } }, { label: 'Mover para Lixeira', icon: Trash2, onClick: () => handleSoftDelete(c.id, 'user'), variant: 'danger' }]} /></td></tr>))}
                        </tbody>
                    </table>
                </div>
            )}
          </div>
        );
      case 'AGENCIES':
        return (
          <div className="animate-[fadeIn_0.3s]">
            {agencyView === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAgencies.map(agency => { const daysLeft = Math.round((new Date(agency.subscriptionExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)); return (
                <div key={agency.id} className={`bg-white rounded-2xl shadow-sm border ${selectedAgencies.includes(agency.id) ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-100'} p-5 transition-all relative`}>
                    <input type="checkbox" checked={selectedAgencies.includes(agency.id)} onChange={() => handleToggleAgency(agency.id)} className="absolute top-4 left-4 h-5 w-5 rounded text-primary-600 border-gray-300 focus:ring-primary-500"/>
                    <div className="absolute top-4 right-4"><ActionMenu actions={showAgencyTrash ? [{label: 'Restaurar', icon: ArchiveRestore, onClick: () => handleRestore(agency.id, 'agency')}, {label: 'Excluir Perm.', icon: Trash, onClick: () => handlePermanentDelete(agency.id, agency.role), variant: 'danger'}] : [{ label: 'Editar Dados', icon: Edit3, onClick: () => { setSelectedItem(agency); setEditFormData({ name: agency.name, description: agency.description, cnpj: agency.cnpj, slug: agency.slug, phone: agency.phone }); setModalType('EDIT_AGENCY'); }}, { label: 'Gerenciar Assinatura', icon: CreditCard, onClick: () => { setSelectedItem(agency); setEditFormData({ plan: agency.subscriptionPlan, status: agency.subscriptionStatus }); setModalType('MANAGE_SUB'); } }, { label: 'Ver Perfil', icon: Eye, onClick: () => window.open(`/#/${agency.slug}`, '_blank') }, { label: 'Mover para Lixeira', icon: Trash2, onClick: () => handleSoftDelete(agency.id, 'agency'), variant: 'danger' }]} /></div>
                    <div className="flex flex-col items-center text-center pt-8">
                        <img src={agency.logo || `https://ui-avatars.com/api/?name=${agency.name}`} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md mb-3" alt=""/>
                        <p className="font-bold text-gray-900 text-lg">{agency.name}</p>
                        <p className="text-sm text-gray-500 mb-2 font-mono">{`/${agency.slug}`}</p>
                        <div className="flex items-center gap-2">
                          <Badge color={agency.subscriptionPlan === 'PREMIUM' ? 'purple' : 'gray'}>{agency.subscriptionPlan}</Badge>
                          <Badge color={agency.subscriptionStatus === 'ACTIVE' ? 'green' : 'red'}>{agency.subscriptionStatus === 'ACTIVE' ? 'Ativo' : 'Inativo'}</Badge>
                        </div>
                        <p className={`text-xs mt-3 font-mono ${daysLeft < 30 && daysLeft > 0 ? 'text-amber-600' : 'text-gray-500'}`}>{daysLeft > 0 ? `Expira em ${daysLeft} dias` : 'Expirado'}</p>
                    </div>
                </div>
            )})}
              </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50"><tr><th className="w-10 px-6 py-4"><input type="checkbox" onChange={handleToggleAllAgencies} checked={selectedAgencies.length === filteredAgencies.length && filteredAgencies.length > 0} className="h-4 w-4 rounded text-primary-600 border-gray-300 focus:ring-primary-500"/></th><th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Agência</th><th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Plano</th><th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th><th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Expira em</th><th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th></tr></thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {filteredAgencies.map(agency => { const daysLeft = Math.round((new Date(agency.subscriptionExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)); return (<tr key={agency.id} className="hover:bg-gray-50 transition-colors"><td className="px-6 py-4"><input type="checkbox" checked={selectedAgencies.includes(agency.id)} onChange={() => handleToggleAgency(agency.id)} className="h-4 w-4 rounded text-primary-600 border-gray-300 focus:ring-primary-500"/></td><td className="px-6 py-4"><div className="flex items-center gap-3"><img src={agency.logo || `https://ui-avatars.com/api/?name=${agency.name}`} className="w-10 h-10 rounded-full" alt=""/><div className="truncate"><p className="font-bold text-gray-900 text-sm truncate max-w-[200px]">{agency.name}</p><a href={`/#/${agency.slug}`} target="_blank" className="text-xs text-primary-600 hover:underline flex items-center gap-1 font-mono">{`/${agency.slug}`} <ExternalLink size={10}/></a></div></div></td><td className="px-6 py-4"><Badge color={agency.subscriptionPlan === 'PREMIUM' ? 'purple' : 'gray'}>{agency.subscriptionPlan}</Badge></td><td className="px-6 py-4"><Badge color={agency.subscriptionStatus === 'ACTIVE' ? 'green' : 'red'}>{agency.subscriptionStatus === 'ACTIVE' ? 'Ativo' : 'Inativo'}</Badge></td><td className="px-6 py-4 text-sm text-gray-500 font-mono">{daysLeft > 0 ? `${daysLeft} dias` : 'Expirado'}</td><td className="px-6 py-4 text-right">
    <div className="flex items-center justify-end gap-1">
        {showAgencyTrash ? (
            <>
                <button title="Restaurar" onClick={() => handleRestore(agency.id, 'agency')} className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                    <ArchiveRestore size={18} />
                </button>
                <button title="Excluir Permanentemente" onClick={() => handlePermanentDelete(agency.id, agency.role)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash size={18} />
                </button>
            </>
        ) : (
            <>
                <button title="Editar Dados" onClick={() => { setSelectedItem(agency); setEditFormData({ name: agency.name, description: agency.description, cnpj: agency.cnpj, slug: agency.slug, phone: agency.phone }); setModalType('EDIT_AGENCY'); }} className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                    <Edit3 size={18} />
                </button>
                <button title="Gerenciar Assinatura" onClick={() => { setSelectedItem(agency); setEditFormData({ plan: agency.subscriptionPlan, status: agency.subscriptionStatus }); setModalType('MANAGE_SUB'); }} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <CreditCard size={18} />
                </button>
                <button title="Mover para Lixeira" onClick={() => handleSoftDelete(agency.id, 'agency')} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={18} />
                </button>
            </>
        )}
    </div>
</td></tr>);})}
                        </tbody>
                    </table>
                </div>
            )}
          </div>
        );
      case 'TRIPS':
        return ( <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto animate-[fadeIn_0.3s]"> <table className="min-w-full divide-y divide-gray-100"> <thead className="bg-gray-50/50"> <tr> <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Viagem</th> <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Agência</th> <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th> <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th> </tr> </thead> <tbody className="divide-y divide-gray-100 bg-white"> {filteredTrips.map(trip => ( <tr key={trip.id} className="hover:bg-gray-50 transition-colors"> <td className="px-6 py-4"><p className="font-bold text-gray-900 text-sm flex items-center gap-2">{trip.title}{trip.featured && <span title="Destaque Global"><Sparkles size={16} className="text-amber-400 fill-amber-400" /></span>}</p><p className="text-xs text-gray-500">{trip.destination}</p></td> <td className="px-6 py-4 text-gray-600 text-sm">{agencies.find(a => a.id === trip.agencyId)?.name}</td> <td className="px-6 py-4"><Badge color={trip.active ? 'green' : 'gray'}>{trip.active ? 'Ativo' : 'Pausado'}</Badge></td> <td className="px-6 py-4 text-right"><ActionMenu actions={[ { label: 'Excluir Viagem', icon: Trash2, onClick: () => handleDeleteTrip(trip.id), variant: 'danger'}, { label: 'Editar Viagem', icon: Edit3, onClick: () => { setSelectedItem(trip); setEditFormData({ title: trip.title, description: trip.description, price: trip.price }); setModalType('EDIT_TRIP'); }}, { label: trip.active ? 'Pausar Viagem' : 'Ativar Viagem', icon: trip.active ? Ban : CheckCircle, onClick: async () => { await toggleTripStatus(trip.id); } }, { label: trip.featured ? 'Remover Destaque' : 'Destacar Viagem', icon: Sparkles, onClick: async () => { await toggleTripFeatureStatus(trip.id); } }, { label: 'Ver Página', icon: Eye, onClick: () => window.open(`/#/viagem/${trip.slug}`, '_blank') }]} /></td> </tr> ))} </tbody> </table> </div> );
      case 'REVIEWS':
        return ( <div className="space-y-4 animate-[fadeIn_0.3s]"> {filteredReviews.map(review => ( <div key={review.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-start gap-6"> <img src={review.agencyLogo || `https://ui-avatars.com/api/?name=${review.agencyName || 'A'}`} className="w-10 h-10 rounded-full" alt="" /> <div className="flex-1"> <div className="flex justify-between items-start"> <div> <p className="font-bold text-gray-900">{review.clientName || 'Anônimo'}</p> <a href={`/#/${slugify(review.agencyName || '')}`} target="_blank" className="text-xs text-gray-400 hover:text-primary-600">em <span className="font-medium text-gray-600 hover:underline">{review.agencyName}</span> • {new Date(review.createdAt).toLocaleDateString()}</a> </div> <div className="flex items-center gap-1 font-bold text-amber-500 text-lg"> <Star size={18} className="fill-current"/> {review.rating.toFixed(1)} </div> </div> <blockquote className="mt-4 text-gray-600 text-sm italic border-l-4 border-gray-100 pl-4 py-2 bg-gray-50/50 rounded-r-lg">"{review.comment}"</blockquote> </div> <ActionMenu actions={[{ label: 'Editar Conteúdo', icon: Edit3, onClick: () => { setSelectedItem(review); setEditFormData({ comment: review.comment, rating: review.rating }); setModalType('EDIT_REVIEW'); } }, { label: 'Excluir Definitivamente', icon: Trash2, onClick: async () => { if(window.confirm('Excluir esta avaliação?')) await deleteAgencyReview(review.id) }, variant: 'danger' }]} /> </div> ))} </div> );
      case 'THEMES':
        if (!isMaster) return null;
        return ( <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-[fadeIn_0.3s]"> <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3"> <h2 className="text-lg font-bold text-gray-900 mb-2">Gerenciar Temas Globais</h2> {themes.map(theme => ( <div key={theme.id} className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${activeTheme.id === theme.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}> <div className="flex items-center gap-4"><div className="flex -space-x-2"><div className="w-8 h-8 rounded-full border-2 border-white shadow" style={{ backgroundColor: theme.colors.primary }}></div><div className="w-8 h-8 rounded-full border-2 border-white shadow" style={{ backgroundColor: theme.colors.secondary }}></div></div><div><p className={`font-bold text-sm ${activeTheme.id === theme.id ? 'text-primary-800' : 'text-gray-800'}`}>{theme.name}</p><p className="text-xs text-gray-500 font-mono">ID: {theme.id.substring(0, 8)}</p></div></div> <div className="flex items-center gap-2"> <button onMouseEnter={() => previewTheme(theme)} onMouseLeave={resetPreview} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-white rounded-lg" title="Preview"><MonitorPlay size={16}/></button> {activeTheme.id === theme.id ? (<Badge color="green"><CheckCircle size={12}/> Ativo</Badge>) : (<button onClick={() => setTheme(theme.id)} className="text-xs font-bold bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-full hover:bg-gray-50">Ativar</button>)} {!theme.isDefault && (<button onClick={() => handleDeleteTheme(theme.id, theme.name)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>)} </div> </div> ))} </div> <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-fit"> <h3 className="text-lg font-bold text-gray-900 mb-4">Novo Tema</h3> <form onSubmit={handleAddTheme} className="space-y-4"> <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nome</label><input value={newThemeForm.name} onChange={e => setNewThemeForm({...newThemeForm, name: e.target.value})} placeholder="Ex: Verão Tropical" className="w-full border p-2.5 rounded-lg border-gray-200 focus:ring-primary-500 focus:border-primary-500" /></div> <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Cor Primária</label><div className="flex items-center gap-2"><input type="color" value={newThemeForm.primary} onChange={e => setNewThemeForm({...newThemeForm, primary: e.target.value})} className="w-12 h-12 p-1 rounded-lg bg-white border border-gray-200" /><input value={newThemeForm.primary} onChange={e => setNewThemeForm({...newThemeForm, primary: e.target.value})} className="w-full border p-2.5 rounded-lg border-gray-200 font-mono text-sm" /></div></div> <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Cor Secundária</label><div className="flex items-center gap-2"><input type="color" value={newThemeForm.secondary} onChange={e => setNewThemeForm({...newThemeForm, secondary: e.target.value})} className="w-12 h-12 p-1 rounded-lg bg-white border border-gray-200" /><input value={newThemeForm.secondary} onChange={e => setNewThemeForm({...newThemeForm, secondary: e.target.value})} className="w-full border p-2.5 rounded-lg border-gray-200 font-mono text-sm" /></div></div> <button type="submit" disabled={isProcessing} className="w-full bg-gray-800 text-white font-bold py-3 rounded-lg hover:bg-black disabled:opacity-50 flex items-center justify-center gap-2">{isProcessing ? <Loader className="animate-spin" size={16}/> : 'Salvar Tema'}</button> </form> </div> </div> );
      case 'AUDIT':
        if (!isMaster) return null;
        return ( <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto animate-[fadeIn_0.3s]"> <table className="min-w-full divide-y divide-gray-100"> <thead className="bg-gray-50/50"><tr><th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Ação</th><th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Detalhes</th><th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Admin</th><th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Data</th></tr></thead> <tbody className="divide-y divide-gray-100 bg-white"> {auditLogs.map(log => ( <tr key={log.id}><td className="px-6 py-4 font-mono text-xs text-purple-700">{log.action}</td><td className="px-6 py-4 text-sm text-gray-600">{log.details}</td><td className="px-6 py-4 text-xs font-medium text-gray-500">{log.adminEmail}</td><td className="px-6 py-4 text-xs text-gray-400">{new Date(log.createdAt).toLocaleString()}</td></tr> ))} </tbody> </table> </div> );
      case 'SYSTEM':
        return ( <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s] max-w-2xl"> <div className="flex items-start gap-6 mb-8"><div className="bg-blue-50 p-4 rounded-full"><Database size={32} className="text-blue-600" /></div><div><h2 className="text-xl font-bold text-gray-900">Migração de Dados</h2><p className="text-gray-500 mt-1 text-sm">Popule o banco de dados com dados de teste para desenvolvimento e demonstração. Esta ação criará agências e viagens de exemplo.</p></div></div> <button onClick={() => migrateData().then(() => { showToast('Migração concluída!', 'success'); handleRefresh(); })} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"><Database size={18}/> Iniciar Migração</button> </div> );
      default:
        return ( <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-[fadeIn_0.3s]"> <StatCard title="Receita da Plataforma" value={`R$ ${platformRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} subtitle="Assinaturas ativas" icon={DollarSign} color="green" /> <StatCard title="Agências Ativas" value={activeAgencies.length} subtitle={`${agencies.length} cadastradas`} icon={Briefcase} color="blue" /> <StatCard title="Usuários" value={activeUsers.length} subtitle="Viajantes na plataforma" icon={Users} color="purple" /> <StatCard title="Viagens Publicadas" value={trips.filter(t => t.active).length} subtitle="Roteiros ativos" icon={ShoppingBag} color="amber" /> </div> );
    }
  };

  const renderToolbar = () => {
    if (activeTab === 'USERS') {
      const selectionCount = selectedUsers.length;
      if (selectionCount > 0 && !showUserTrash) {
        return (
            <div className="bg-white/80 backdrop-blur-md rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-4 mb-6 border border-gray-200 animate-[fadeIn_0.2s]">
                <p className="text-sm font-bold text-gray-700">{selectionCount} usuário(s) selecionado(s)</p>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleMassUpdateUserStatus('ACTIVE')} className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-100 rounded-lg hover:bg-green-200 flex items-center gap-1"><UserCheck size={14}/> Reativar</button>
                    <button onClick={() => handleMassUpdateUserStatus('SUSPENDED')} className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 flex items-center gap-1"><Ban size={14}/> Suspender</button>
                    <button onClick={handleViewStats} className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 flex items-center gap-1"><StatsIcon size={14}/> Ver Stats</button>
                    <button onClick={() => downloadPdf('users')} className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-1"><Download size={14}/> Baixar PDF</button>
                    <button onClick={() => { if(window.confirm(`Mover ${selectionCount} usuários para a lixeira?`)) selectedUsers.forEach(id => softDeleteEntity(id, 'profiles')) }} className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-100 rounded-lg hover:bg-red-200 flex items-center gap-1"><Trash2 size={14}/> Lixeira</button>
                </div>
            </div>
        );
      }
    }
    if (activeTab === 'AGENCIES') {
      const selectionCount = selectedAgencies.length;
      if (selectionCount > 0 && !showAgencyTrash) {
        return (
            <div className="bg-white/80 backdrop-blur-md rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-4 mb-6 border border-gray-200 animate-[fadeIn_0.2s]">
                <p className="text-sm font-bold text-gray-700">{selectionCount} agência(s) selecionada(s)</p>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleMassUpdateAgencyStatus('ACTIVE')} className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-100 rounded-lg hover:bg-green-200 flex items-center gap-1"><CheckCircle size={14}/> Reativar</button>
                    <button onClick={() => handleMassUpdateAgencyStatus('INACTIVE')} className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 flex items-center gap-1"><Ban size={14}/> Suspender</button>
                    <button onClick={() => downloadPdf('agencies')} className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-1"><Download size={14}/> Baixar PDF</button>
                    <button onClick={() => { if(window.confirm(`Mover ${selectionCount} agências para a lixeira?`)) selectedAgencies.forEach(id => softDeleteEntity(id, 'agencies')) }} className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-100 rounded-lg hover:bg-red-200 flex items-center gap-1"><Trash2 size={14}/> Lixeira</button>
                </div>
            </div>
        );
      }
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen relative animate-[fadeIn_0.3s]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"> <div> <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2"> Painel Master {isMaster && <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full border border-purple-200 uppercase tracking-wider">Super Admin</span>} </h1> <p className="text-gray-500 mt-1">Gestão completa da plataforma ViajaStore.</p> </div> <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-100"> <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">{user.name.charAt(0)}</div> <div className="pr-4"><p className="text-xs font-bold text-gray-400 uppercase">Administrador</p><p className="font-bold text-gray-900 text-sm">{user.email}</p></div> </div> </div>
      <div className="bg-white p-1.5 rounded-xl shadow-sm border border-gray-100 inline-flex mb-8 flex-wrap gap-1 sticky top-20 z-20">
          {[ {id: 'OVERVIEW', label: 'Visão Geral', icon: Activity}, {id: 'AGENCIES', label: 'Agências', icon: Briefcase}, {id: 'USERS', label: 'Usuários', icon: Users}, {id: 'TRIPS', label: 'Viagens', icon: BarChart}, {id: 'REVIEWS', label: 'Avaliações', icon: MessageCircle}, {id: 'THEMES', label: 'Temas', icon: Palette, masterOnly: true}, {id: 'AUDIT', label: 'Auditoria', icon: Lock, masterOnly: true}, {id: 'SYSTEM', label: 'Sistema', icon: Database} ].map(tab => (tab.masterOnly && !isMaster) ? null : (<button key={tab.id} onClick={() => handleTabChange(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}><tab.icon size={16} /> {tab.label}</button>))}
      </div>

      {['AGENCIES', 'USERS'].includes(activeTab) && (
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <div className="relative flex-1 max-w-lg w-full"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder={`Buscar em ${activeTab.toLowerCase()}...`} className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm transition-all hover:border-gray-300" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
              <div className="flex items-center gap-2">
                  <div className="p-1 bg-gray-100 rounded-lg flex items-center">
                    {activeTab === 'USERS' ? (
                        <>
                        <button onClick={() => handleSetUserView('cards')} className={`p-2 rounded-md transition-colors ${userView === 'cards' ? 'bg-white shadow text-primary-600' : 'text-gray-500'}`}><LayoutGrid size={18}/></button>
                        <button onClick={() => handleSetUserView('list')} className={`p-2 rounded-md transition-colors ${userView === 'list' ? 'bg-white shadow text-primary-600' : 'text-gray-500'}`}><List size={18}/></button>
                        </>
                    ) : (
                        <>
                        <button onClick={() => handleSetAgencyView('cards')} className={`p-2 rounded-md transition-colors ${agencyView === 'cards' ? 'bg-white shadow text-primary-600' : 'text-gray-500'}`}><LayoutGrid size={18}/></button>
                        <button onClick={() => handleSetAgencyView('list')} className={`p-2 rounded-md transition-colors ${agencyView === 'list' ? 'bg-white shadow text-primary-600' : 'text-gray-500'}`}><List size={18}/></button>
                        </>
                    )}
                  </div>
                  <button onClick={() => activeTab === 'USERS' ? setShowUserTrash(!showUserTrash) : setShowAgencyTrash(!showAgencyTrash)} className={`px-4 py-2.5 text-sm font-bold rounded-lg flex items-center gap-2 transition-colors border ${(activeTab === 'USERS' && showUserTrash) || (activeTab === 'AGENCIES' && showAgencyTrash) ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}><Archive size={16}/> Lixeira</button>
              </div>
          </div>
      )}

      {((showUserTrash && activeTab === 'USERS') || (showAgencyTrash && activeTab === 'AGENCIES')) && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6 flex items-center justify-between"><div className="flex items-center gap-2"><Archive size={16} className="text-amber-700"/><p className="text-sm font-bold text-amber-800">Visualizando itens na lixeira.</p></div><button onClick={() => handleEmptyTrash(activeTab === 'USERS' ? 'user' : 'agency')} className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-100 px-3 py-1.5 rounded-lg hover:bg-red-200"><Trash size={12}/> Esvaziar Lixeira</button></div>
      )}

      {['TRIPS', 'REVIEWS'].includes(activeTab) && (<div className="mb-6 relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder={`Buscar em ${activeTab.toLowerCase()}...`} className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm transition-all hover:border-gray-300" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>)}
      {activeTab === 'TRIPS' && (<div className="flex flex-col md:flex-row gap-4 mb-6"><div className="relative flex-1"><Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/><select value={agencyFilter} onChange={e => setAgencyFilter(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 pl-10 focus:ring-2 focus:ring-primary-500 outline-none shadow-sm appearance-none"><option value="">Todas as Agências</option>{agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/></div><div className="relative flex-1"><Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 pl-10 focus:ring-2 focus:ring-primary-500 outline-none shadow-sm appearance-none"><option value="">Todas as Categorias</option>{tripCategories.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/></div></div>)}

      {renderToolbar()}
      {renderContent()}

      {modalType === 'VIEW_STATS' && ( <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]" onClick={() => setModalType(null)}> <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 animate-[scaleIn_0.2s]" onClick={e => e.stopPropagation()}> <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-gray-900">Estatísticas dos Usuários Selecionados</h3><button onClick={() => setModalType(null)} className="p-2 rounded-full hover:bg-gray-100"><X size={20} className="text-gray-400"/></button></div> <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2 scrollbar-thin"> {userStats.map(stat => (<div key={stat.userId} className="grid grid-cols-4 gap-4 items-center bg-gray-50 p-3 rounded-lg border border-gray-100"><p className="font-bold col-span-1">{stat.userName}</p><p className="text-sm text-center"><span className="font-bold">{stat.totalBookings}</span> Viagens</p><p className="text-sm text-center"><span className="font-bold text-green-600">R$ {stat.totalSpent.toLocaleString()}</span> Gastos</p><p className="text-sm text-center"><span className="font-bold">{stat.totalReviews}</span> Avaliações</p></div>))} </div> </div> </div> )}
      {modalType === 'MANAGE_SUB' && selectedItem && ( <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]" onClick={() => setModalType(null)}> <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl animate-[scaleIn_0.2s]" onClick={e => e.stopPropagation()}> <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-gray-900">Gerenciar Assinatura</h3><button onClick={() => setModalType(null)} className="p-2 rounded-full hover:bg-gray-100"><X size={20} className="text-gray-400"/></button></div><div className="bg-gray-50 p-4 rounded-xl mb-6 flex items-center gap-4"><img src={selectedItem.logo} className="w-12 h-12 rounded-full bg-white" alt=""/><div className="truncate"><p className="font-bold text-gray-900 truncate">{selectedItem.name}</p><p className="text-xs text-gray-500 truncate">{selectedItem.email}</p></div></div> <div className="space-y-4"><p className="text-xs font-bold text-gray-400 uppercase">Plano</p><div className="grid grid-cols-2 gap-4"><button onClick={() => setEditFormData({...editFormData, plan: 'BASIC'})} className={`p-4 rounded-xl border-2 text-center transition-all ${editFormData.plan === 'BASIC' ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}><p className="font-bold text-sm">BASIC</p></button><button onClick={() => setEditFormData({...editFormData, plan: 'PREMIUM'})} className={`p-4 rounded-xl border-2 text-center transition-all ${editFormData.plan === 'PREMIUM' ? 'border-purple-500 bg-purple-50 text-purple-700 ring-2 ring-purple-200' : 'border-gray-200 hover:border-gray-300'}`}><p className="font-bold text-sm">PREMIUM</p></button></div><p className="text-xs font-bold text-gray-400 uppercase mt-4">Status</p><button onClick={() => setEditFormData({...editFormData, status: editFormData.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })} className={`w-full py-3 rounded-xl font-bold text-sm border transition-all flex items-center justify-center gap-2 ${editFormData.status === 'ACTIVE' ? 'border-green-200 bg-green-50 text-green-600' : 'border-red-200 bg-red-50 text-red-600'}`}>{editFormData.status === 'ACTIVE' ? <><CheckCircle size={16}/> Ativo</> : <><Ban size={16}/> Inativo</>}</button> <button onClick={handleSubscriptionUpdate} disabled={isProcessing} className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 mt-4">{isProcessing ? <Loader className="animate-spin mx-auto"/> : 'Salvar Alterações'}</button> </div> </div> </div> )}
      {modalType === 'EDIT_USER' && selectedItem && ( <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]" onClick={() => setModalType(null)}> <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl animate-[scaleIn_0.2s]" onClick={e => e.stopPropagation()}> <h3 className="text-xl font-bold text-gray-900 mb-6">Editar Usuário</h3> <div className="space-y-4"> <div><label className="block text-sm font-bold text-gray-700 mb-1">Nome</label><input value={editFormData.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="w-full border p-3 rounded-lg border-gray-200 focus:ring-primary-500 focus:border-primary-500"/></div> <div><label className="block text-sm font-bold text-gray-700 mb-1">Email (Apenas leitura)</label><input value={editFormData.email || ''} disabled className="w-full border p-3 rounded-lg bg-gray-100 text-gray-500"/></div> <div><label className="block text-sm font-bold text-gray-700 mb-1">CPF</label><input value={editFormData.cpf || ''} onChange={e => setEditFormData({...editFormData, cpf: e.target.value})} className="w-full border p-3 rounded-lg border-gray-200 focus:ring-primary-500 focus:border-primary-500"/></div> <div><label className="block text-sm font-bold text-gray-700 mb-1">Telefone</label><input value={editFormData.phone || ''} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} className="w-full border p-3 rounded-lg border-gray-200 focus:ring-primary-500 focus:border-primary-500"/></div> <button onClick={handleUserUpdate} className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 mt-4">Salvar Alterações</button> </div> </div> </div> )}
      {modalType === 'EDIT_AGENCY' && selectedItem && ( <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]" onClick={() => setModalType(null)}> <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl animate-[scaleIn_0.2s]" onClick={e => e.stopPropagation()}> <h3 className="text-xl font-bold text-gray-900 mb-6">Editar Agência</h3> <div className="space-y-4"> <div><label className="block text-sm font-bold text-gray-700 mb-1">Nome</label><input value={editFormData.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="w-full border p-3 rounded-lg border-gray-200 focus:ring-primary-500 focus:border-primary-500"/></div> <div><label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label><textarea value={editFormData.description || ''} onChange={e => setEditFormData({...editFormData, description: e.target.value})} className="w-full border p-3 rounded-lg h-24 border-gray-200 focus:ring-primary-500 focus:border-primary-500"/></div> <div><label className="block text-sm font-bold text-gray-700 mb-1">CNPJ</label><input value={editFormData.cnpj || ''} onChange={e => setEditFormData({...editFormData, cnpj: e.target.value})} className="w-full border p-3 rounded-lg border-gray-200 focus:ring-primary-500 focus:border-primary-500"/></div> <div><label className="block text-sm font-bold text-gray-700 mb-1">Telefone</label><input value={editFormData.phone || ''} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} className="w-full border p-3 rounded-lg border-gray-200 focus:ring-primary-500 focus:border-primary-500"/></div> <div><label className="block text-sm font-bold text-gray-700 mb-1">Slug (URL)</label><input value={editFormData.slug || ''} onChange={e => setEditFormData({...editFormData, slug: e.target.value})} className="w-full border p-3 rounded-lg border-gray-200 focus:ring-primary-500 focus:border-primary-500"/></div> <button onClick={handleAgencyUpdate} disabled={isProcessing} className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 mt-4">{isProcessing ? <Loader className="animate-spin mx-auto"/> : 'Salvar Alterações'}</button> </div> </div> </div> )}
      {modalType === 'EDIT_REVIEW' && selectedItem && ( <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]" onClick={() => setModalType(null)}> <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl animate-[scaleIn_0.2s]" onClick={e => e.stopPropagation()}> <h3 className="text-xl font-bold text-gray-900 mb-6">Editar Avaliação</h3> <form onSubmit={(e) => { e.preventDefault(); handleReviewUpdate(); }} className="space-y-4"> <div> <label className="block text-sm font-bold text-gray-700 mb-2">Nota (1-5)</label> <div className="flex gap-1"> {[1, 2, 3, 4, 5].map(star => (<button key={star} type="button" onClick={() => setEditFormData({...editFormData, rating: star})}><Star className={`transition-colors h-8 w-8 ${editFormData.rating >= star ? 'text-amber-400 fill-current' : 'text-gray-300'}`} /></button>))} </div> </div> <div><label className="block text-sm font-bold text-gray-700 mb-1">Comentário</label><textarea value={editFormData.comment || ''} onChange={e => setEditFormData({...editFormData, comment: e.target.value})} className="w-full border p-3 rounded-lg h-32 border-gray-200 focus:ring-primary-500 focus:border-primary-500"/></div> <button type="submit" disabled={isProcessing} className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 mt-4">{isProcessing ? <Loader className="animate-spin mx-auto"/> : 'Salvar Alterações'}</button> </form> </div> </div> )}
      {modalType === 'EDIT_TRIP' && selectedItem && ( <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]" onClick={() => setModalType(null)}> <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl animate-[scaleIn_0.2s]" onClick={e => e.stopPropagation()}> <h3 className="text-xl font-bold text-gray-900 mb-6">Edição Moderada de Viagem</h3> <div className="space-y-4"> <div><label className="block text-sm font-bold text-gray-700 mb-1">Título</label><input value={editFormData.title || ''} onChange={e => setEditFormData({...editFormData, title: e.target.value})} className="w-full border p-3 rounded-lg border-gray-200 focus:ring-primary-500 focus:border-primary-500"/></div> <div><label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label><textarea value={editFormData.description || ''} onChange={e => setEditFormData({...editFormData, description: e.target.value})} className="w-full border p-3 rounded-lg h-24 border-gray-200 focus:ring-primary-500 focus:border-primary-500"/></div> <div><label className="block text-sm font-bold text-gray-700 mb-1">Preço (R$)</label><input type="number" value={editFormData.price || ''} onChange={e => setEditFormData({...editFormData, price: Number(e.target.value)})} className="w-full border p-3 rounded-lg border-gray-200 focus:ring-primary-500 focus:border-primary-500"/></div> <button onClick={handleTripUpdate} disabled={isProcessing} className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 mt-4">{isProcessing ? <Loader className="animate-spin mx-auto"/> : 'Salvar Alterações'}</button> </div> </div> </div> )}

    </div>
  );
};

export default AdminDashboard;