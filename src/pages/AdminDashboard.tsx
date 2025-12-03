
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { TripCategory, UserRole, Trip, Agency, Client, AgencyReview, ThemePalette, UserStats, Booking, ActivityLog, ActivityActorRole, ActivityActionType } from '../types';
import { 
  Trash2, MessageCircle, Users, Briefcase, 
  BarChart, AlertOctagon, Database, Loader, Palette, Lock, Eye, Save, 
  Activity, X, Search, MoreVertical, 
  DollarSign, ShoppingBag, Edit3, 
  CreditCard, CheckCircle, XCircle, Ban, Star, UserX, UserCheck, Key,
  Sparkles, Filter, ChevronDown, MonitorPlay, Download, BarChart2 as StatsIcon, ExternalLink,
  LayoutGrid, List, Archive, ArchiveRestore, Trash, Camera, Upload, History, PauseCircle, PlayCircle, Plane, RefreshCw, AlertCircle, LucideProps, CalendarDays, User, Building, MapPin, Clock, Heart, ShieldCheck, ArrowRight, Bold, Italic, Underline, Heading1, Heading2, AlignLeft, AlignCenter, AlignRight, Quote, Smile, Link as LinkIcon, Image as ImageIcon
} from 'lucide-react';
import { migrateData } from '../services/dataMigration';
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

// FIX: NavButton component definition to ensure correct typing and usage
interface NavButtonProps {
  tabId: string;
  label: string;
  icon: React.ComponentType<LucideProps>;
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

const RichTextEditor: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const execCmd = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    if (contentRef.current) onChange(contentRef.current.innerHTML);
  };
  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== value && document.activeElement !== contentRef.current) contentRef.current.innerHTML = value;
    if (value === '' && contentRef.current) contentRef.current.innerHTML = '';
  }, [value]);
  const handleInput = () => contentRef.current && onChange(contentRef.current.innerHTML);
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
      if (contentRef.current) onChange(contentRef.current.innerHTML);
  };
  const addLink = () => { const url = prompt('Digite a URL do link:'); if(url) execCmd('createLink', url); };
  const addImage = () => { const url = prompt('Cole a URL da imagem (ex: https://...):'); if(url) execCmd('insertImage', url); };
  const addEmoji = (emoji: string) => { execCmd('insertText', emoji); setShowEmojiPicker(false); };
  // Fix: ToolbarButton definition updated to accept an `onClick` prop
  const ToolbarButton = ({ cmd, icon: Icon, title, arg, active = false, onClick }: any) => (<button type="button" onClick={() => onClick ? onClick() : (cmd && execCmd(cmd, arg))} className={`p-2 rounded-lg transition-all ${active ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:text-primary-600 hover:bg-gray-100'}`} title={title}><Icon size={18}/></button>);
  const Divider = () => <div className="w-px h-5 bg-gray-300 mx-1"></div>;
  const COMMON_EMOJIS = ['✈️', '🏖️', '🗺️', '📸', '🧳', '🌟', '🔥', '❤️', '✅', '❌', '📍', '📅', '🚌', '🏨', '🍷', '⛰️'];

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 transition-shadow bg-white shadow-sm flex flex-col">
      <div className="bg-gray-50 border-b border-gray-200 p-2 flex flex-wrap gap-1 items-center sticky top-0 z-10">
        <ToolbarButton cmd="bold" icon={Bold} title="Negrito" />
        <ToolbarButton cmd="italic" icon={Italic} title="Itálico" />
        <ToolbarButton cmd="underline" icon={Underline} title="Sublinhado" />
        <Divider />
        <ToolbarButton cmd="formatBlock" arg="h2" icon={Heading1} title="Título Grande" />
        <ToolbarButton cmd="formatBlock" arg="h3" icon={Heading2} title="Título Médio" />
        <ToolbarButton cmd="formatBlock" arg="blockquote" icon={Quote} title="Citação" />
        <Divider />
        <ToolbarButton cmd="justifyLeft" icon={AlignLeft} title="Alinhar Esquerda" />
        <ToolbarButton cmd="justifyCenter" icon={AlignCenter} title="Centralizar" />
        <ToolbarButton cmd="justifyRight" icon={AlignRight} title="Alinhar Direita" />
        <Divider />
        {/* Fix: Pass addImage and addLink functions as onClick prop */}
        <ToolbarButton icon={ImageIcon} title="Inserir Imagem" onClick={addImage} />
        <ToolbarButton icon={LinkIcon} title="Inserir Link" onClick={addLink} />
        <ToolbarButton icon={Smile} title="Inserir Emoji" onClick={() => setShowEmojiPicker(!showEmojiPicker)} />
      </div>
      <div
        ref={contentRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className="flex-1 p-4 outline-none min-h-[150px] resize-y overflow-auto text-gray-800 prose max-w-none"
        data-placeholder="Descreva a experiência em detalhes..."
        role="textbox"
        aria-multiline="true"
        aria-label="Editor de texto rico para descrição"
      />
      {showEmojiPicker && (
        <div className="absolute bottom-full left-0 mb-2 p-3 bg-white border border-gray-200 rounded-xl shadow-lg flex flex-wrap gap-2 animate-[fadeInUp_0.1s]">
          {COMMON_EMOJIS.map(emoji => (
            <button key={emoji} type="button" onClick={() => addEmoji(emoji)} className="text-xl p-1 hover:bg-gray-100 rounded-md">{emoji}</button>
          ))}
        </div>
      )}
    </div>
  );
};


export const AdminDashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth(); // Destructure authLoading
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


  const handleTabChange = (tab: string) => {
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
                  // FIX: Pass agencyId (PK) for deletion from agencies table, not user ID
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
      // FIX: Ensure correct ISO string format for datetime-local (YYYY-MM-DDTHH:MM)
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

  const handleUserUpdate = async (e: React.FormEvent) => { // Added e: React.FormEvent parameter
      e.preventDefault(); // Prevent default form submission
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
  }; // <--- THIS WAS THE MISSING CLOSING BRACE

  const handleAgencyUpdate = async (e: React.FormEvent) => { // Added e: React.FormEvent parameter
    e.preventDefault(); // Prevent default form submission
    if (!selectedItem) return;
    setIsProcessing(true);
    try {
        // Pass agencyId to updateAgencyProfileByAdmin
        await updateAgencyProfileByAdmin(selectedItem.agencyId, editFormData);
    } catch (error) {
        // Toast handled in context
    } finally {
        setIsProcessing(false);
        setModalType(null);
    }
  };

  const handleReviewUpdate = async (e: React.FormEvent) => { // Added e: React.FormEvent parameter
    e.preventDefault(); // Prevent default form submission
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

  const handleTripUpdate = async (e: React.FormEvent) => { // Added e: React.FormEvent parameter
    e.preventDefault(); // Prevent default form submission
    if (!selectedItem) return;
    setIsProcessing(true);
    try {
        // @FIX: Ensure price is a number before passing to updateTrip
        await updateTrip({ ...selectedItem, ...editFormData, price: Number(editFormData.price) });
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
  
  const tripCategories = useMemo(() => Object.values(TripCategory), []); // Fix: Use Object.values with the enum
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
      log.action_type.replace(/_/g, ' '),
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


  // FIX: AdminDashboard should be accessible by both ADMIN and AGENCY users.
  // The content displayed then depends on the user's role.
  // Add loading check here to prevent premature "Acesso negado" message
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader className="animate-spin text-primary-600" size={32} /></div>;
  }

  if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.AGENCY)) {
    return <div className="min-h-screen flex items-center justify-center">Acesso negado.</div>;
  }

  // Determine if the current user is an agency to adjust tabs and data.
  const isAgencyUser = user.role === UserRole.AGENCY;
  const currentUserAgencyId = isAgencyUser ? (user as Agency).agencyId : undefined;


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
                            onChange={e => setActivitySearchTerm(e.target.value)}
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
                                onClick={() => { setActivitySearchTerm(''); setActivityActorRoleFilter('ALL'); setActivityActionTypeFilter('ALL'); setActivityStartDate(''); setActivityEndDate(''); }}
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
                                            <span className="font-semibold">{log.action_type.replace(/_/g, ' ')}</span>
                                            {log.trip_title && ` na viagem "${log.trip_title}"`}
                                            {log.agency_name && ` da agência "${log.agency_name}"`}
                                            {log.details.action === 'soft_delete' && ` (movido para lixeira)`}
                                            {log.details.action === 'restore' && ` (restaurado)`}
                                            {log.details.action === 'permanent_delete' && ` (excluído permanentemente)`}
                                            {log.details.newStatus && ` (novo status: ${log.details.newStatus})`}
                                            {log.details.rating && ` (nota: ${log.details.rating})`}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-1 flex items-center">
                                                    <CalendarDays size={12} className="mr-1"/> {new Date(log.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-400 text-sm">Nenhuma atividade encontrada com os filtros selecionados.</div>
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
                                onClick={migrateData} 
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
        // Only Master Admin can see this tab
        if (!isMaster) return <div className="text-center py-20 text-gray-500">Acesso negado para esta aba.</div>;
        return (
          <div className="animate-[fadeIn_0.3s]">
            {userView === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredUsers.map(c => (
                    <div key={c.id} className={`bg-white rounded-2xl shadow-sm border ${selectedUsers.includes(c.id) ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-100'} p-5 transition-all relative`}>
                      <input type="checkbox" checked={selectedUsers.includes(c.id)} onChange={() => handleToggleUser(c.id)} className="absolute top-4 left-4 h-5 w-5 rounded text-primary-600 border-gray-300 focus:ring-primary-500"/>
                      <div className="absolute top-4 right-4"><ActionMenu actions={showUserTrash ? [{label: 'Restaurar', icon: ArchiveRestore, onClick: () => handleRestore(c.id, 'user')}, {label: 'Excluir Perm.', icon: Trash, onClick: () => handlePermanentDelete(c.id, c.role), variant: 'danger'}] : [{ label: 'Editar Dados', icon: Edit3, onClick: () => { setEditFormData(c); setSelectedItem(c); setModalType('EDIT_USER'); setModalTab('PROFILE'); } }, { label: c.status === 'ACTIVE' ? 'Suspender' : 'Reativar', icon: c.status === 'ACTIVE' ? Ban : UserCheck, onClick: () => handleUserStatusToggle(c) }, { label: 'Mover para Lixeira', icon: Trash2, onClick: () => handleSoftDelete(c.id, 'user'), variant: 'danger' }]} /></div>
                      <div className="flex flex-col items-center text-center pt-8">
                        <img src={c.avatar || `https://ui-avatars.com/api/?name=${c.name}`} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md mb-3" alt=""/>
                        <p className="font-bold text-gray-900 text-lg">{c.name}</p>
                        <p className="text-sm text-gray-500 mb-4">{c.email}</p>
                        {/* Fix: Changed 'SUSPENSO' to 'SUSPENDED' for comparison with UserRole.SUSPENDED */}
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
                            {filteredUsers.map(c => (<tr key={c.id} className="hover:bg-gray-50 transition-colors"><td className="px-6 py-4"><input type="checkbox" checked={selectedUsers.includes(c.id)} onChange={() => handleToggleUser(c.id)} className="h-4 w-4 rounded text-primary-600 border-gray-300 focus:ring-primary-500"/></td><td className="px-6 py-4"><div className="flex items-center gap-3"><img src={c.avatar || `https://ui-avatars.com/api/?name=${c.name}`} className="w-10 h-10 rounded-full" alt=""/><p className="font-bold text-gray-900 text-sm">{c.name}</p></div></td><td className="px-6 py-4"><p className="text-sm text-gray-600">{c.email}</p><p className="text-xs text-gray-400">{c.phone}</p></td><td className="px-6 py-4"><Badge color={c.status === 'ACTIVE' ? 'green' : 'red'}>{c.status === 'SUSPENDED' ? 'SUSPENSO' : 'ATIVO'}</Badge></td><td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    {showUserTrash ? (
                                        <>
                                            <button title="Restaurar" onClick={() => handleRestore(c.id, 'user')} className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                                <ArchiveRestore size={18} />
                                            </button>
                                            <button title="Excluir Permanentemente" onClick={() => handlePermanentDelete(c.id, c.role)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash size={18} />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button title="Editar" onClick={() => { setEditFormData(c); setSelectedItem(c); setModalType('EDIT_USER'); setModalTab('PROFILE'); }} className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                                                <Edit3 size={18} />
                                            </button>
                                            <button title={c.status === 'ACTIVE' ? 'Suspender' : 'Reativar'} onClick={() => handleUserStatusToggle(c)} className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                                                {c.status === 'ACTIVE' ? <Ban size={18}/> : <UserCheck size={18}/>}
                                            </button>
                                            <button title="Mover para Lixeira" onClick={() => handleSoftDelete(c.id, 'user')} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </td></tr>))}
                        </tbody>
                    </table>
                </div>
            )}
          </div>
        );
      case 'AGENCIES':
        // Only Master Admin can see this tab
        if (!isMaster) return <div className="text-center py-20 text-gray-500">Acesso negado para esta aba.</div>;
        return (
          <div className="animate-[fadeIn_0.3s]">
            {agencyView === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAgencies.map(agency => { const daysLeft = Math.round((new Date(agency.subscriptionExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)); return (
                <div key={agency.id} className={`bg-white rounded-2xl shadow-sm border ${selectedAgencies.includes(agency.agencyId) ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-100'} p-5 transition-all relative`}>
                    <input type="checkbox" checked={selectedAgencies.includes(agency.agencyId)} onChange={() => handleToggleAgency(agency.agencyId)} className="absolute top-4 left-4 h-5 w-5 rounded text-primary-600 border-gray-300 focus:ring-primary-500"/>
                    <div className="absolute top-4 right-4">
                        <ActionMenu 
                            actions={showAgencyTrash ? [
                                {label: 'Restaurar', icon: ArchiveRestore, onClick: () => handleRestore(agency.id, 'agency')}, 
                                {label: 'Excluir Perm.', icon: Trash, onClick: () => handlePermanentDelete(agency.id, agency.role), variant: 'danger'}
                            ] : [
                                { label: 'Editar Dados', icon: Edit3, onClick: () => { setSelectedItem(agency); setEditFormData({ name: agency.name, description: agency.description, cnpj: agency.cnpj, slug: agency.slug, phone: agency.phone, whatsapp: agency.whatsapp, website: agency.website, address: agency.address, bankInfo: agency.bankInfo }); setModalType('EDIT_AGENCY'); }},
                                { label: 'Gerenciar Assinatura', icon: CreditCard, onClick: () => { setSelectedItem(agency); setEditFormData({ plan: agency.subscriptionPlan, status: agency.subscriptionStatus, expiresAt: agency.subscriptionExpiresAt }); setModalType('MANAGE_SUB'); } },
                                { label: agency.subscriptionStatus === 'ACTIVE' ? 'Suspender Agência' : 'Reativar Agência', icon: agency.subscriptionStatus === 'ACTIVE' ? Ban : CheckCircle, onClick: () => toggleAgencyStatus(agency.agencyId) },
                                { label: 'Ver Perfil', icon: Eye, onClick: () => window.open(`/#/${agency.slug}`, '_blank') },
                                { label: 'Mover para Lixeira', icon: Trash2, onClick: () => handleSoftDelete(agency.id, 'agency'), variant: 'danger' }
                            ]} 
                        />
                    </div>
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
                            {filteredAgencies.map(agency => { const daysLeft = Math.round((new Date(agency.subscriptionExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)); return (<tr key={agency.id} className="hover:bg-gray-50 transition-colors"><td className="px-6 py-4"><input type="checkbox" checked={selectedAgencies.includes(agency.agencyId)} onChange={() => handleToggleAgency(agency.agencyId)} className="h-4 w-4 rounded text-primary-600 border-gray-300 focus:ring-primary-500"/></td><td className="px-6 py-4"><div className="flex items-center gap-3"><img src={agency.logo || `https://ui-avatars.com/api/?name=${agency.name}`} className="w-10 h-10 rounded-full" alt=""/><div className="truncate"><p className="font-bold text-gray-900 text-sm truncate max-w-[200px]">{agency.name}</p><a href={`/#/${agency.slug}`} target="_blank" className="text-xs text-primary-600 hover:underline flex items-center gap-1 font-mono">{`/${agency.slug}`} <ExternalLink size={10}/></a></div></div></td><td className="px-6 py-4"><Badge color={agency.subscriptionPlan === 'PREMIUM' ? 'purple' : 'gray'}>{agency.subscriptionPlan}</Badge></td><td className="px-6 py-4"><Badge color={agency.subscriptionStatus === 'ACTIVE' ? 'green' : 'red'}>{agency.subscriptionStatus === 'ACTIVE' ? 'Ativo' : 'Inativo'}</Badge></td><td className="px-6 py-4 text-sm text-gray-500 font-mono">{daysLeft > 0 ? `${daysLeft} dias` : 'Expirado'}</td><td className="px-6 py-4 text-right">
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
                                            <button title="Editar" onClick={() => { setSelectedItem(agency); setEditFormData({ name: agency.name, description: agency.description, cnpj: agency.cnpj, slug: agency.slug, phone: agency.phone, whatsapp: agency.whatsapp, website: agency.website, address: agency.address, bankInfo: agency.bankInfo }); setModalType('EDIT_AGENCY'); }} className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                                                <Edit3 size={18} />
                                            </button>
                                            <button title="Gerenciar Assinatura" onClick={() => { setSelectedItem(agency); setEditFormData({ plan: agency.subscriptionPlan, status: agency.subscriptionStatus, expiresAt: agency.subscriptionExpiresAt }); setModalType('MANAGE_SUB'); }} className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                                                <CreditCard size={18} />
                                            </button>
                                            <button title={agency.subscriptionStatus === 'ACTIVE' ? 'Suspender Agência' : 'Reativar Agência'} onClick={() => toggleAgencyStatus(agency.agencyId)} className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                                                {agency.subscriptionStatus === 'ACTIVE' ? <Ban size={18}/> : <CheckCircle size={18}/>}
                                            </button>
                                            <button title="Mover para Lixeira" onClick={() => handleSoftDelete(agency.id, 'agency')} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </td></tr>); })}
                        </tbody>
                    </table>
                </div>
            )}
          </div>
        );
      case 'TRIPS':
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto animate-[fadeIn_0.3s]">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Pacote</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Agência</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Preço</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Destaque</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Performance</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {filteredTrips.map(trip => {
                            const agency = agencies.find(a => a.agencyId === trip.agencyId);
                            return (
                                <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                <img src={trip.images[0] || 'https://placehold.co/100x100/e2e8f0/e2e8f0'} className="w-full h-full object-cover" alt={trip.title} />
                                            </div>
                                            <div className="truncate">
                                                <p className="font-bold text-gray-900 text-sm line-clamp-1 max-w-[200px]">{trip.title}</p>
                                                <p className="text-xs text-gray-500">{trip.destination}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">
                                        {agency ? (
                                            <Link to={`/#/${agency.slug}`} target="_blank" className="flex items-center hover:underline max-w-[150px] truncate">
                                                {agency.name} <ExternalLink size={10} className="ml-1 flex-shrink-0" />
                                            </Link>
                                        ) : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-700">R$ {trip.price.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <Badge color={trip.is_active ? 'green' : 'gray'}>{trip.is_active ? 'ATIVO' : 'INATIVO'}</Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge color={trip.featured ? 'amber' : 'gray'}>{trip.featured ? 'SIM' : 'NÃO'}</Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                                            <div className="flex items-center" title="Visualizações"><Eye size={14} className="mr-1.5 text-blue-400"/> {trip.views || 0}</div>
                                            <div className="flex items-center" title="Vendas"><ShoppingBag size={14} className="mr-1.5 text-green-500"/> {trip.sales || 0}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <ActionMenu
                                            actions={[
                                                { label: 'Editar', icon: Edit3, onClick: () => { setSelectedItem(trip); setEditFormData(trip); setModalType('EDIT_TRIP'); } },
                                                { label: trip.is_active ? 'Pausar' : 'Publicar', icon: trip.is_active ? PauseCircle : PlayCircle, onClick: () => toggleTripStatus(trip.id) },
                                                { label: trip.featured ? 'Remover Destaque' : 'Destacar', icon: Sparkles, onClick: () => toggleTripFeatureStatus(trip.id) },
                                                { label: 'Excluir', icon: Trash2, onClick: () => handleDeleteTrip(trip.id), variant: 'danger' }
                                            ]}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
      case 'REVIEWS':
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto animate-[fadeIn_0.3s]">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Agência</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Pacote</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Avaliação</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {filteredReviews.map(review => (
                            <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-bold text-gray-900">{review.agencyName}</td>
                                <td className="px-6 py-4 text-sm text-gray-700">{review.clientName}</td>
                                <td className="px-6 py-4 text-sm text-gray-700">{review.tripTitle || 'N/A'}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={14} className={i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
                                        ))}
                                        <span className="text-xs text-gray-500">({review.rating})</span>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{review.comment}</p>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <ActionMenu
                                        actions={[
                                            { label: 'Editar', icon: Edit3, onClick: () => { setSelectedItem(review); setEditFormData(review); setModalType('EDIT_REVIEW'); } },
                                            { label: 'Excluir', icon: Trash2, onClick: () => deleteAgencyReview(review.id), variant: 'danger' }
                                        ]}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
      case 'SETTINGS':
        // Only Master Admin can see this tab
        if (!isMaster) return <div className="text-center py-20 text-gray-500">Acesso negado para esta aba.</div>;
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Configurações de Tema</h2>
                <form onSubmit={handleAddTheme} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 p-6 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Nome do Tema</label>
                        <input value={newThemeForm.name} onChange={e => setNewThemeForm({ ...newThemeForm, name: e.target.value })} className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required/>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Cor Primária</label>
                        <div className="flex gap-2 items-center">
                            <input type="color" value={newThemeForm.primary} onChange={e => setNewThemeForm({ ...newThemeForm, primary: e.target.value })} className="w-8 h-8 rounded-full border" />
                            <input value={newThemeForm.primary} onChange={e => setNewThemeForm({ ...newThemeForm, primary: e.target.value })} className="flex-1 border p-2.5 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Cor Secundária</label>
                        <div className="flex gap-2 items-center">
                            <input type="color" value={newThemeForm.secondary} onChange={e => setNewThemeForm({ ...newThemeForm, secondary: e.target.value })} className="w-8 h-8 rounded-full border" />
                            <input value={newThemeForm.secondary} onChange={e => setNewThemeForm({ ...newThemeForm, secondary: e.target.value })} className="flex-1 border p-2.5 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 outline-none" />
                        </div>
                    </div>
                    <div className="md:col-span-3">
                        <button type="submit" disabled={isProcessing} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50">
                            {isProcessing ? <Loader size={18} className="animate-spin" /> : <Palette size={18}/>} Adicionar Novo Tema
                        </button>
                    </div>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {themes.map(theme => (
                        <div key={theme.id} className={`bg-white p-6 rounded-2xl shadow-sm border ${activeTheme.id === theme.id ? 'border-primary-600 ring-2 ring-primary-200' : 'border-gray-100'} relative`}>
                            <h3 className="font-bold text-gray-900 text-lg mb-2">{theme.name}</h3>
                            <div className="flex gap-2 mb-4">
                                <div className="w-8 h-8 rounded-full shadow" style={{ backgroundColor: theme.colors.primary }}></div>
                                <div className="w-8 h-8 rounded-full shadow" style={{ backgroundColor: theme.colors.secondary }}></div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                {theme.isDefault && <Badge color="blue">Padrão</Badge>}
                                {theme.isActive && <Badge color="green">Ativo</Badge>}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setTheme(theme.id)} disabled={activeTheme.id === theme.id || isProcessing} className="flex-1 bg-primary-50 text-primary-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-100 disabled:opacity-50">
                                    Aplicar
                                </button>
                                <button onClick={() => previewTheme(theme)} disabled={isProcessing} className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 disabled:opacity-50">
                                    Prévia
                                </button>
                                <ActionMenu actions={[ {label: 'Excluir', icon: Trash2, onClick: () => handleDeleteTheme(theme.id, theme.name), variant: 'danger'} ]}/>
                            </div>
                        </div>
                    ))}
                    {/* Access previewMode from useTheme() */}
                    {previewMode && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-primary-500 ring-2 ring-primary-200 relative">
                            <h3 className="font-bold text-gray-900 text-lg mb-2">Tema em Prévia</h3>
                            <div className="flex gap-2 mb-4">
                                <div className="w-8 h-8 rounded-full shadow" style={{ backgroundColor: previewMode.colors.primary }}></div>
                                <div className="w-8 h-8 rounded-full shadow" style={{ backgroundColor: previewMode.colors.secondary }}></div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                <Badge color="amber">Em Prévia</Badge>
                            </div>
                            <button onClick={resetPreview} className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200">
                                Sair da Prévia
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
      default: // OVERVIEW for Agency User
        // Agency-specific overview if not Master Admin, otherwise default to master overview
        if (isAgencyUser) {
            const agencyStats = currentUserAgencyId ? (agencies.find(a => a.agencyId === currentUserAgencyId) ? useData().getAgencyStats(currentUserAgencyId) : {totalRevenue: 0, totalViews: 0, totalSales: 0, conversionRate: 0, averageRating: 0, totalReviews: 0}) : {totalRevenue: 0, totalViews: 0, totalSales: 0, conversionRate: 0, averageRating: 0, totalReviews: 0};
            const agencyTrips = currentUserAgencyId ? trips.filter(t => t.agencyId === currentUserAgencyId) : [];
            const agencyBookings = currentUserAgencyId ? bookings.filter(b => agencyTrips.some(t => t.id === b.tripId)) : [];
            const agencyReviewsFiltered = currentUserAgencyId ? agencyReviews.filter(r => r.agencyId === currentUserAgencyId) : [];

            return (
                <div className="space-y-8 animate-[fadeIn_0.3s]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Receita Total" value={`R$ ${agencyStats.totalRevenue.toLocaleString('pt-BR')}`} subtitle="Vendas confirmadas" icon={DollarSign} color="green"/>
                        <StatCard title="Total de Vendas" value={agencyStats.totalSales} subtitle="Reservas efetuadas" icon={ShoppingBag} color="blue"/>
                        <StatCard title="Visualizações" value={agencyStats.totalViews} subtitle="Alcance dos pacotes" icon={Eye} color="purple"/>
                        <StatCard title="Avaliação Média" value={`${agencyStats.averageRating?.toFixed(1) || '0.0'}/5`} subtitle={`${agencyStats.totalReviews} avaliações`} icon={Star} color="amber"/>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Pacotes Mais Populares */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><MonitorPlay size={20} className="mr-2 text-primary-600"/> Pacotes Populares</h3>
                            {agencyTrips.length > 0 ? (
                                <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
                                    {agencyTrips.sort((a,b) => (b.views || 0) - (a.views || 0)).slice(0, 5).map(trip => (
                                        <div key={trip.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                            <div className="w-12 h-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                                                <img src={trip.images[0] || 'https://placehold.co/100x100/e2e8f0/e2e8f0'} className="w-full h-full object-cover" alt={trip.title} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-900 text-sm line-clamp-1">{trip.title}</p>
                                                <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                                                    <Eye size={12} className="text-blue-400"/> {trip.views || 0}
                                                    <ShoppingBag size={12} className="text-green-500 ml-2"/> {trip.sales || 0}
                                                </p>
                                            </div>
                                            <Link to={`/agency/dashboard?tab=TRIPS`} className="text-xs text-primary-600 font-bold hover:underline flex items-center gap-1">Gerenciar <ArrowRight size={12}/></Link>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-400 text-sm">Nenhum pacote cadastrado ainda.</div>
                            )}
                        </div>
                        {/* Últimas Avaliações */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><MessageCircle size={20} className="mr-2 text-amber-600"/> Últimas Avaliações</h3>
                            {agencyReviewsFiltered.length > 0 ? (
                                <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
                                    {agencyReviewsFiltered.slice(0,5).map(review => (
                                        <div key={review.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="font-bold text-gray-900 text-sm">{review.clientName}</p>
                                                <div className="flex text-amber-400">
                                                    {[...Array(5)].map((_, i) => <Star key={i} size={12} className={i < review.rating ? 'fill-current' : 'text-gray-300'} />)}
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-600 line-clamp-2">{review.comment}</p>
                                            <p className="text-[10px] text-gray-400 mt-1">{new Date(review.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-400 text-sm">Nenhuma avaliação recebida ainda.</div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900">{isAgencyUser ? 'Meu Painel de Agência' : 'Painel Master'}</h1>
        <div className="flex flex-wrap gap-3">
            <button onClick={handleRefresh} disabled={isProcessing} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold flex items-center hover:bg-gray-200 transition-colors disabled:opacity-50">
                {isProcessing ? <Loader size={18} className="animate-spin mr-2"/> : <RefreshCw size={18} className="mr-2"/>}
                Atualizar Dados
            </button>
            <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 outline-none"/>
            </div>
        </div>
      </div>
      
      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-xl px-2 scrollbar-hide shadow-sm">
        <NavButton tabId="OVERVIEW" label="Visão Geral" icon={LayoutGrid} activeTab={activeTab} onClick={handleTabChange} />
        {isMaster && <NavButton tabId="USERS" label={`Usuários ${deletedUsers.length > 0 ? `(${deletedUsers.length})` : ''}`} icon={Users} activeTab={activeTab} onClick={handleTabChange} hasNotification={deletedUsers.length > 0} />}
        {isMaster && <NavButton tabId="AGENCIES" label={`Agências ${deletedAgencies.length > 0 ? `(${deletedAgencies.length})` : ''}`} icon={Briefcase} activeTab={activeTab} onClick={handleTabChange} hasNotification={deletedAgencies.length > 0} />}
        <NavButton tabId="TRIPS" label="Viagens" icon={Plane} activeTab={activeTab} onClick={handleTabChange} />
        <NavButton tabId="REVIEWS" label="Avaliações" icon={Star} activeTab={activeTab} onClick={handleTabChange} />
        {isMaster && <NavButton tabId="SETTINGS" label="Temas" icon={Palette} activeTab={activeTab} onClick={handleTabChange} />}
      </div>

      {/* Bulk Actions & View Toggles */}
      {(activeTab === 'USERS' || activeTab === 'AGENCIES') && isMaster && (
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
                <span className="text-gray-600 text-sm font-medium">Selecionados: <span className="font-bold">{activeTab === 'USERS' ? selectedUsers.length : selectedAgencies.length}</span></span>
                {activeTab === 'USERS' && selectedUsers.length > 0 && (
                    <div className="flex gap-2">
                        <button onClick={() => handleMassUpdateUserStatus('ACTIVE')} className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-100">Ativar</button>
                        <button onClick={() => handleMassUpdateUserStatus('SUSPENDED')} className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-100">Suspender</button>
                        <button onClick={() => handleMassDeleteUsers()} className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100">Excluir</button>
                        <button onClick={handleViewStats} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100">Ver Stats</button>
                    </div>
                )}
                {activeTab === 'AGENCIES' && selectedAgencies.length > 0 && (
                    <div className="flex gap-2">
                        <button onClick={() => handleMassUpdateAgencyStatus('ACTIVE')} className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-100">Ativar</button>
                        <button onClick={() => handleMassUpdateAgencyStatus('INACTIVE')} className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-100">Inativar</button>
                        <button onClick={() => handleMassDeleteAgencies()} className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100">Excluir</button>
                    </div>
                )}
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button onClick={() => { if (activeTab === 'USERS') setShowUserTrash(!showUserTrash); else setShowAgencyTrash(!showAgencyTrash); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${((activeTab === 'USERS' && showUserTrash) || (activeTab === 'AGENCIES' && showAgencyTrash)) ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    <Archive size={14}/> Lixeira
                </button>
                {((activeTab === 'USERS' && showUserTrash && deletedUsers.length > 0) || (activeTab === 'AGENCIES' && showAgencyTrash && deletedAgencies.length > 0)) && (
                    <button onClick={() => handleEmptyTrash(activeTab === 'USERS' ? 'user' : 'agency')} className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100">Esvaziar Lixeira</button>
                )}
              </div>
              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <button onClick={() => { if (activeTab === 'USERS') handleSetUserView('cards'); else handleSetAgencyView('cards'); }} className={`p-2 rounded-md ${((activeTab === 'USERS' && userView === 'cards') || (activeTab === 'AGENCIES' && agencyView === 'cards')) ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}><LayoutGrid size={18}/></button>
                <button onClick={() => { if (activeTab === 'USERS') handleSetUserView('list'); else handleSetAgencyView('list'); }} className={`p-2 rounded-md ${((activeTab === 'USERS' && userView === 'list') || (activeTab === 'AGENCIES' && agencyView === 'list')) ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}><List size={18}/></button>
              </div>
            </div>
        </div>
      )}

      {/* Filter Bar for Trips */}
      {activeTab === 'TRIPS' && (
        <div className="flex flex-wrap items-center gap-4 mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-500"/>
                <span className="text-sm font-bold text-gray-700">Filtros:</span>
            </div>
            
            <div className="w-48">
                <select value={agencyFilter} onChange={e => setAgencyFilter(e.target.value)} className="w-full border border-gray-200 rounded-lg text-sm p-2.5 outline-none focus:ring-primary-500 focus:border-primary-500 bg-gray-50">
                    <option value="">Todas as Agências</option>
                    {activeAgencies.map(agency => <option key={agency.id} value={agency.agencyId}>{agency.name}</option>)}
                </select>
            </div>
            <div className="w-48">
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full border border-gray-200 rounded-lg text-sm p-2.5 outline-none focus:ring-primary-500 focus:border-primary-500 bg-gray-50">
                    <option value="">Todas as Categorias</option>
                    {tripCategories.map(category => <option key={category} value={category}>{category.replace('_', ' ')}</option>)}
                </select>
            </div>
            {(agencyFilter || categoryFilter) && (
                <button onClick={() => { setAgencyFilter(''); setCategoryFilter(''); }} className="text-sm font-bold text-red-500 hover:underline">Limpar Filtros</button>
            )}
        </div>
      )}

      {renderContent()}

      {/* Modals */}
      {modalType === 'EDIT_USER' && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Editar Usuário</h2>
                
                <div className="flex border-b border-gray-200 mb-6">
                    <button onClick={() => setModalTab('PROFILE')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${modalTab === 'PROFILE' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Perfil</button>
                    <button onClick={() => setModalTab('SECURITY')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${modalTab === 'SECURITY' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Segurança</button>
                    <button onClick={() => setModalTab('HISTORY')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${modalTab === 'HISTORY' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Histórico</button>
                </div>

                {modalTab === 'PROFILE' && (
                    <form onSubmit={handleUserUpdate} className="space-y-6">
                        <div className="flex flex-col items-center gap-4 mb-6">
                            <div className="relative w-24 h-24 rounded-full group">
                                <img src={editFormData.avatar || `https://ui-avatars.com/api/?name=${editFormData.name}`} alt="" className="w-full h-full object-cover rounded-full border-4 border-gray-200" />
                                <label className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full cursor-pointer hover:bg-primary-700 shadow-md transition-transform hover:scale-110">
                                    {isUploadingAvatar ? <Loader className="animate-spin" size={20}/> : <Camera size={20} />}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isUploadingAvatar}/>
                                </label>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">{editFormData.name}</h3>
                        </div>

                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label><input value={editFormData.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Email</label><input type="email" value={editFormData.email || ''} onChange={e => setEditFormData({...editFormData, email: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Telefone</label><input value={editFormData.phone || ''} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-1">CPF</label><input value={editFormData.cpf || ''} onChange={e => setEditFormData({...editFormData, cpf: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                        <button type="submit" disabled={isProcessing} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50"><Save size={18}/> Salvar Alterações</button>
                    </form>
                )}
                {modalTab === 'SECURITY' && (
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                            <p className="text-sm text-gray-700 font-medium">Resetar Senha</p>
                            <button onClick={() => sendPasswordReset(selectedItem.email)} disabled={isProcessing} className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-amber-100 flex items-center gap-2 disabled:opacity-50">
                                <Key size={16}/> Enviar Link
                            </button>
                        </div>
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center justify-between">
                            <p className="text-sm text-red-700 font-medium">Excluir Conta</p>
                            <button onClick={() => handlePermanentDelete(selectedItem.id, selectedItem.role)} disabled={isProcessing} className="bg-white text-red-600 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-red-100 flex items-center gap-2 disabled:opacity-50">
                                <Trash2 size={16}/> Excluir
                            </button>
                        </div>
                    </div>
                )}
                {modalTab === 'HISTORY' && (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
                        <p className="text-sm text-gray-500 text-center">Nenhum histórico disponível.</p>
                    </div>
                )}
            </div>
        </div>
      )}

      {modalType === 'MANAGE_SUB' && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Gerenciar Assinatura</h2>
            <div className="flex items-center gap-4 mb-6">
                <img src={selectedItem.logo || `https://ui-avatars.com/api/?name=${selectedItem.name}`} className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" alt=""/>
                <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedItem.name}</h3>
                    <p className="text-sm text-gray-500">{selectedItem.email}</p>
                </div>
            </div>
            <form onSubmit={handleSubscriptionUpdate} className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Plano</label>
                    <select value={editFormData.plan} onChange={e => setEditFormData({...editFormData, plan: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500">
                        <option value="BASIC">Básico</option>
                        <option value="PREMIUM">Premium</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
                    <select value={editFormData.status} onChange={e => setEditFormData({...editFormData, status: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500">
                        <option value="ACTIVE">Ativo</option>
                        <option value="INACTIVE">Inativo</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Expira em</label>
                    <div className="flex gap-2 items-center">
                        <input type="datetime-local" value={editFormData.expiresAt?.slice(0, 16)} onChange={e => setEditFormData({...editFormData, expiresAt: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500"/>
                        <button type="button" onClick={() => addSubscriptionTime(30)} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-200">+30d</button>
                        <button type="button" onClick={() => addSubscriptionTime(365)} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-200">+1a</button>
                    </div>
                </div>
                <button type="submit" disabled={isProcessing} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50"><Save size={18}/> Salvar Assinatura</button>
            </form>
          </div>
        </div>
      )}

      {modalType === 'EDIT_AGENCY' && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Editar Agência</h2>
            <form onSubmit={handleAgencyUpdate} className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Nome da Agência</label>
                    <input value={editFormData.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Slug (URL)</label>
                    <input value={editFormData.slug || ''} onChange={e => setEditFormData({...editFormData, slug: slugify(e.target.value)})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500 font-mono" readOnly={!isMaster} disabled={!isMaster}/>
                    {!isMaster && <p className="text-xs text-gray-500 mt-1">O slug da agência só pode ser alterado pelo Admin Master.</p>}
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label>
                    <textarea value={editFormData.description || ''} onChange={e => setEditFormData({...editFormData, description: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500 h-24" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">CNPJ</label>
                    <input value={editFormData.cnpj || ''} onChange={e => setEditFormData({...editFormData, cnpj: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Telefone</label>
                    <input value={editFormData.phone || ''} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">WhatsApp</label>
                    <input value={editFormData.whatsapp || ''} onChange={e => setEditFormData({...editFormData, whatsapp: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Website</label>
                    <input value={editFormData.website || ''} onChange={e => setEditFormData({...editFormData, website: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div className="space-y-4 rounded-xl p-4 bg-gray-50 border border-gray-100">
                    <h4 className="text-sm font-bold text-gray-900">Endereço</h4>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">CEP</label><input value={editFormData.address?.zipCode || ''} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, zipCode: e.target.value}})} className="w-full border p-2 rounded-lg"/></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rua</label><input value={editFormData.address?.street || ''} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, street: e.target.value}})} className="w-full border p-2 rounded-lg"/></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número</label><input value={editFormData.address?.number || ''} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, number: e.target.value}})} className="w-full border p-2 rounded-lg"/></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cidade</label><input value={editFormData.address?.city || ''} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, city: e.target.value}})} className="w-full border p-2 rounded-lg"/></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado</label><input value={editFormData.address?.state || ''} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, state: e.target.value}})} className="w-full border p-2 rounded-lg"/></div>
                </div>
                <div className="space-y-4 rounded-xl p-4 bg-gray-50 border border-gray-100">
                    <h4 className="text-sm font-bold text-gray-900">Informações Bancárias</h4>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Banco</label><input value={editFormData.bankInfo?.bank || ''} onChange={e => setEditFormData({...editFormData, bankInfo: {...editFormData.bankInfo, bank: e.target.value}})} className="w-full border p-2 rounded-lg"/></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Agência</label><input value={editFormData.bankInfo?.agency || ''} onChange={e => setEditFormData({...editFormData, bankInfo: {...editFormData.bankInfo, agency: e.target.value}})} className="w-full border p-2 rounded-lg"/></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Conta</label><input value={editFormData.bankInfo?.account || ''} onChange={e => setEditFormData({...editFormData, bankInfo: {...editFormData.bankInfo, account: e.target.value}})} className="w-full border p-2 rounded-lg"/></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Chave PIX</label><input value={editFormData.bankInfo?.pixKey || ''} onChange={e => setEditFormData({...editFormData, bankInfo: {...editFormData.bankInfo, pixKey: e.target.value}})} className="w-full border p-2 rounded-lg"/></div>
                </div>
                <button type="submit" disabled={isProcessing} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50"><Save size={18}/> Salvar Alterações</button>
            </form>
          </div>
        </div>
      )}

      {modalType === 'EDIT_TRIP' && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Editar Pacote</h2>
            <form onSubmit={handleTripUpdate} className="space-y-6">
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Título</label><input value={editFormData.title || ''} onChange={e => setEditFormData({...editFormData, title: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500"/></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Destino</label><input value={editFormData.destination || ''} onChange={e => setEditFormData({...editFormData, destination: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500"/></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Preço</label><input type="number" min="0" value={editFormData.price || ''} onChange={e => setEditFormData({...editFormData, price: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500"/></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label><textarea value={editFormData.description || ''} onChange={e => setEditFormData({...editFormData, description: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500 h-32"/></div>
                <button type="submit" disabled={isProcessing} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50"><Save size={18}/> Salvar Alterações</button>
            </form>
          </div>
        </div>
      )}

      {modalType === 'EDIT_REVIEW' && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Editar Avaliação</h2>
            <form onSubmit={handleReviewUpdate} className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Comentário</label>
                    <textarea value={editFormData.comment || ''} onChange={e => setEditFormData({...editFormData, comment: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500 h-32"/>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Nota</label>
                    <input type="number" min="1" max="5" value={editFormData.rating || ''} onChange={e => setEditFormData({...editFormData, rating: Number(e.target.value)})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500"/>
                </div>
                <button type="submit" disabled={isProcessing} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50"><Save size={18}/> Salvar Alterações</button>
            </form>
          </div>
        </div>
      )}

      {modalType === 'VIEW_STATS' && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Estatísticas de Usuários</h2>
            <div className="space-y-6">
                {userStats.length > 0 ? (
                    userStats.map(stats => (
                        <div key={stats.userId} className="bg-gray-50 p-4 rounded-xl border border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <p className="font-bold text-gray-900 text-lg sm:col-span-3">{stats.userName}</p>
                            <div><p className="text-xs font-bold text-gray-500 uppercase mb-1">Total Gasto</p><p className="font-bold text-gray-900">R$ {stats.totalSpent.toLocaleString('pt-BR')}</p></div>
                            <div><p className="text-xs font-bold text-gray-500 uppercase mb-1">Total Reservas</p><p className="font-bold text-gray-900">{stats.totalBookings}</p></div>
                            <div><p className="text-xs font-bold text-gray-500 uppercase mb-1">Total Aval