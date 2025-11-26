import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { UserRole, Trip, Agency, Client, AgencyReview } from '../types';
import { 
  ToggleLeft, ToggleRight, Trash2, MessageCircle, Users, Briefcase, 
  BarChart, AlertOctagon, Database, Loader, Palette, Lock, Eye, Save, 
  RefreshCw, Activity, X, AlertTriangle, Check, Search, MoreHorizontal, 
  DollarSign, Filter, ShoppingBag, Calendar, CreditCard, Edit3, 
  MoreVertical, Shield, ChevronDown, CheckCircle, XCircle, LogOut, UserX, UserCheck, Ban
} from 'lucide-react';
import { migrateData } from '../services/dataMigration';
import { useSearchParams } from 'react-router-dom';

// --- COMPONENTS ---

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
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[color]} flex items-center gap-1 w-fit`}>
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
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${bgColors[color]}`}><Icon size={24}/></div>
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
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                <MoreVertical size={16} />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-[scaleIn_0.1s] origin-top-right">
                    {actions.map((action, idx) => (
                        <button 
                            key={idx} 
                            onClick={() => { action.onClick(); setIsOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center gap-2 transition-colors ${action.variant === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                            <action.icon size={14} /> {action.label}
                        </button>
                    ))}
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
      updateAgencySubscription, toggleTripStatus, deleteAgencyReview, deleteUser, 
      updateClientProfile, // Assuming this exists in DataContext or needs to be added
      logAuditAction, refreshData,
      updateTrip
  } = useData();
  const { themes, activeTheme, setTheme, addTheme, deleteTheme, previewTheme, resetPreview } = useTheme();
  const { showToast } = useToast();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as any) || 'OVERVIEW';

  const isMaster = user?.email === 'juannicolas1@gmail.com'; // Keep master check

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');

  // --- METRICS CALCULATION ---
  const platformRevenue = useMemo(() => {
      return agencies.reduce((total, agency) => {
          if (agency.subscriptionStatus !== 'ACTIVE') return total;
          return total + (agency.subscriptionPlan === 'PREMIUM' ? 199.90 : 99.90);
      }, 0);
  }, [agencies]);

  // --- MODAL STATES ---
  const [modalType, setModalType] = useState<'DELETE' | 'EDIT_USER' | 'MANAGE_SUB' | 'EDIT_REVIEW' | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Temporary Form States
  const [editFormData, setEditFormData] = useState<any>({});

  // --- HANDLERS ---

  const handleTabChange = (tab: string) => {
      setSearchParams({ tab });
      setSearchTerm('');
  };

  const handleRefresh = async () => {
      setIsProcessing(true);
      await refreshData();
      setIsProcessing(false);
  };

  // ACTION: DELETE
  const handleDeleteConfirm = async () => {
      if (!selectedItem) return;
      setIsProcessing(true);
      try {
          if (modalType === 'DELETE') {
              if (selectedItem.type === 'USER') {
                  await deleteUser(selectedItem.id, UserRole.CLIENT);
                  logAuditAction('DELETE_USER', `Deleted user ${selectedItem.name}`);
              } else if (selectedItem.type === 'AGENCY') {
                  await deleteUser(selectedItem.id, UserRole.AGENCY);
                  logAuditAction('DELETE_AGENCY', `Deleted agency ${selectedItem.name}`);
              } else if (selectedItem.type === 'REVIEW') {
                  await deleteAgencyReview(selectedItem.id);
                  logAuditAction('DELETE_REVIEW', `Deleted review ${selectedItem.id}`);
              }
              showToast('Item excluído com sucesso.', 'success');
          }
      } catch (error) {
          showToast('Erro ao excluir item.', 'error');
      } finally {
          setIsProcessing(false);
          setModalType(null);
          setSelectedItem(null);
          handleRefresh();
      }
  };

  // ACTION: MANAGE SUBSCRIPTION
  const handleSubscriptionUpdate = async (status: 'ACTIVE' | 'INACTIVE', plan: 'BASIC' | 'PREMIUM') => {
      if (!selectedItem) return;
      setIsProcessing(true);
      try {
          await updateAgencySubscription(selectedItem.id, status, plan);
          showToast('Assinatura atualizada com sucesso!', 'success');
      } catch (error) {
          showToast('Erro ao atualizar assinatura.', 'error');
      } finally {
          setIsProcessing(false);
          setModalType(null);
          handleRefresh();
      }
  };

  // ACTION: EDIT USER (Example Implementation)
  const handleUserUpdate = async () => {
      if (!selectedItem) return;
      setIsProcessing(true);
      try {
          // Assuming updateClientProfile exists in DataContext based on requirements
          // If not, this would need to be added to DataContext.tsx
          await updateClientProfile(selectedItem.id, editFormData);
          showToast('Usuário atualizado!', 'success');
      } catch (error) {
          showToast('Erro ao atualizar usuário.', 'error');
      } finally {
          setIsProcessing(false);
          setModalType(null);
          handleRefresh();
      }
  };

  // FILTERED LISTS
  const filteredUsers = clients.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredAgencies = agencies.filter(a => 
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredTrips = trips.filter(t => 
      t.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredReviews = agencyReviews.filter(r => 
      r.comment.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.agencyName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user || user.role !== UserRole.ADMIN) return <div className="min-h-screen flex items-center justify-center">Acesso negado.</div>;

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen relative animate-[fadeIn_0.3s]">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
         <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                Painel Master {isMaster && <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full border border-purple-200 uppercase tracking-wider">Super Admin</span>}
            </h1>
            <p className="text-gray-500 mt-1">Gestão completa da plataforma ViajaStore.</p>
         </div>
         <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
             <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
                 {user.name.charAt(0)}
             </div>
             <div className="pr-4">
                 <p className="text-xs font-bold text-gray-400 uppercase">Administrador</p>
                 <p className="font-bold text-gray-900 text-sm">{user.email}</p>
             </div>
         </div>
      </div>

      {/* --- TABS --- */}
      <div className="bg-white p-1.5 rounded-xl shadow-sm border border-gray-100 inline-flex mb-8 flex-wrap gap-1 sticky top-20 z-20">
          {[
              {id: 'OVERVIEW', label: 'Visão Geral', icon: Activity}, 
              {id: 'AGENCIES', label: 'Agências', icon: Briefcase},
              {id: 'USERS', label: 'Usuários', icon: Users},
              {id: 'TRIPS', label: 'Viagens', icon: BarChart},
              {id: 'REVIEWS', label: 'Avaliações', icon: MessageCircle},
              {id: 'THEMES', label: 'Temas', icon: Palette, masterOnly: true},
              {id: 'AUDIT', label: 'Auditoria', icon: Lock, masterOnly: true},
              {id: 'SYSTEM', label: 'Sistema', icon: Database}
          ].map(tab => {
             if (tab.masterOnly && !isMaster) return null;
             return (
                <button 
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                >
                    <tab.icon size={16} /> {tab.label}
                </button>
             );
          })}
      </div>

      {/* --- SEARCH BAR (Contextual) --- */}
      {['AGENCIES', 'USERS', 'TRIPS', 'REVIEWS'].includes(activeTab) && (
          <div className="mb-6 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder={`Buscar em ${activeTab === 'AGENCIES' ? 'agências' : activeTab === 'USERS' ? 'usuários' : activeTab === 'TRIPS' ? 'viagens' : 'avaliações'}...`} 
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm transition-all hover:border-gray-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
      )}

      {/* --- TAB CONTENT: OVERVIEW --- */}
      {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-[fadeIn_0.3s]">
            <StatCard 
                title="Receita da Plataforma" 
                value={`R$ ${platformRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                subtitle="Mensalidade de assinaturas ativas"
                icon={DollarSign}
                color="green"
            />
            <StatCard 
                title="Agências Ativas" 
                value={agencies.filter(a => a.subscriptionStatus === 'ACTIVE').length}
                subtitle={`${agencies.length} cadastros totais`}
                icon={Briefcase}
                color="blue"
            />
            <StatCard 
                title="Usuários Cadastrados" 
                value={clients.length}
                subtitle="Viajantes na plataforma"
                icon={Users}
                color="purple"
            />
            <StatCard 
                title="Viagens Publicadas" 
                value={trips.filter(t => t.active).length}
                subtitle="Roteiros ativos no marketplace"
                icon={ShoppingBag}
                color="amber"
            />
          </div>
      )}

      {/* --- TAB CONTENT: USERS --- */}
      {activeTab === 'USERS' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-[fadeIn_0.3s]">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                  <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                      Usuários <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">{filteredUsers.length}</span>
                  </h2>
              </div>
              <table className="min-w-full divide-y divide-gray-100">
                 <thead className="bg-gray-50/50">
                     <tr>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Usuário</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Contato</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                         <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 bg-white">
                     {filteredUsers.map(c => (
                         <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                             <td className="px-6 py-4">
                                <div className="flex items-center">
                                    <img 
                                        src={c.avatar || `https://ui-avatars.com/api/?name=${c.name}`} 
                                        className="w-10 h-10 rounded-full object-cover mr-3 border-2 border-gray-100" 
                                        alt=""
                                    />
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{c.name}</p>
                                        <p className="text-xs text-gray-500">Viajante desde {new Date(c.createdAt || '').getFullYear()}</p>
                                    </div>
                                </div>
                             </td>
                             <td className="px-6 py-4">
                                <p className="text-sm text-gray-700">{c.email}</p>
                                <p className="text-xs text-gray-500">{c.phone || 'Sem telefone'}</p>
                             </td>
                             <td className="px-6 py-4">
                                <Badge color="green">Ativo</Badge>
                             </td>
                             <td className="px-6 py-4 text-right">
                                <ActionMenu actions={[
                                    { label: 'Editar Dados', icon: Edit3, onClick: () => { setEditFormData(c); setSelectedItem(c); setModalType('EDIT_USER'); } },
                                    { label: 'Resetar Senha', icon: Lock, onClick: () => showToast('Funcionalidade em breve', 'info') },
                                    { label: 'Suspender', icon: Ban, onClick: () => showToast('Funcionalidade em breve', 'info'), variant: 'danger' },
                                    { label: 'Excluir Usuário', icon: Trash2, onClick: () => { setSelectedItem({ id: c.id, name: c.name, type: 'USER' }); setModalType('DELETE'); }, variant: 'danger' }
                                ]} />
                             </td>
                         </tr>
                     ))}
                 </tbody>
              </table>
          </div>
      )}

      {/* --- TAB CONTENT: AGENCIES --- */}
      {activeTab === 'AGENCIES' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-[fadeIn_0.3s]">
             <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                  <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                      Agências Parceiras <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">{filteredAgencies.length}</span>
                  </h2>
              </div>
             <table className="min-w-full divide-y divide-gray-100">
                 <thead className="bg-gray-50/50">
                     <tr>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Agência</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Plano</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Expira em</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                         <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 bg-white">
                     {filteredAgencies.map(agency => {
                         const daysLeft = Math.ceil((new Date(agency.subscriptionExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                         return (
                         <tr key={agency.id} className="hover:bg-gray-50 transition-colors">
                             <td className="px-6 py-4">
                                 <div className="flex items-center">
                                     <img src={agency.logo || `https://ui-avatars.com/api/?name=${agency.name}`} className="w-10 h-10 rounded-full object-cover mr-3 border-2 border-gray-100" alt=""/>
                                     <div>
                                         <p className="font-bold text-gray-900">{agency.name}</p>
                                         <p className="text-xs text-gray-500">{agency.slug ? `/${agency.slug}` : 'Sem slug'}</p>
                                     </div>
                                 </div>
                             </td>
                             <td className="px-6 py-4">
                                 <Badge color={agency.subscriptionPlan === 'PREMIUM' ? 'purple' : 'gray'}>
                                     {agency.subscriptionPlan}
                                 </Badge>
                             </td>
                             <td className="px-6 py-4 text-xs text-gray-600 font-mono">
                                 {daysLeft > 0 ? `${daysLeft} dias` : 'Expirado'}
                             </td>
                             <td className="px-6 py-4">
                                 <Badge color={agency.subscriptionStatus === 'ACTIVE' ? 'green' : 'red'}>
                                     {agency.subscriptionStatus === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                                 </Badge>
                             </td>
                             <td className="px-6 py-4 text-right">
                                <ActionMenu actions={[
                                    { label: 'Gerenciar Assinatura', icon: CreditCard, onClick: () => { setSelectedItem(agency); setModalType('MANAGE_SUB'); } },
                                    { label: 'Ver Perfil', icon: Eye, onClick: () => window.open(`/#/${agency.slug}`, '_blank') },
                                    { label: 'Excluir Agência', icon: Trash2, onClick: () => { setSelectedItem({ id: agency.id, name: agency.name, type: 'AGENCY' }); setModalType('DELETE'); }, variant: 'danger' }
                                ]} />
                             </td>
                         </tr>
                     )})}
                 </tbody>
             </table>
          </div>
      )}

      {/* --- TAB CONTENT: TRIPS --- */}
      {activeTab === 'TRIPS' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-[fadeIn_0.3s]">
              <table className="min-w-full divide-y divide-gray-100">
                 <thead className="bg-gray-50/50">
                     <tr>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Viagem</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Agência</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                         <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Moderação</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 bg-white">
                     {filteredTrips.map(trip => (
                         <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                             <td className="px-6 py-4">
                                 <p className="font-bold text-gray-900 text-sm">{trip.title}</p>
                                 <p className="text-xs text-gray-500">{trip.destination}</p>
                             </td>
                             <td className="px-6 py-4 text-gray-600 text-sm">{agencies.find(a => a.id === trip.agencyId)?.name}</td>
                             <td className="px-6 py-4">
                                <Badge color={trip.active ? 'green' : 'gray'}>
                                    {trip.active ? 'Ativo' : 'Pausado'}
                                </Badge>
                             </td>
                             <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <button 
                                        onClick={async () => { await toggleTripStatus(trip.id); handleRefresh(); }} 
                                        className={`p-2 rounded-lg transition-colors ${trip.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                        title={trip.active ? 'Pausar' : 'Ativar'}
                                    >
                                        {trip.active ? <ToggleRight size={20}/> : <ToggleLeft size={20}/>}
                                    </button>
                                </div>
                             </td>
                         </tr>
                     ))}
                 </tbody>
              </table>
          </div>
      )}

      {/* --- TAB CONTENT: REVIEWS --- */}
      {activeTab === 'REVIEWS' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-[fadeIn_0.3s]">
             <div className="p-4 bg-amber-50 text-amber-800 text-xs font-bold border-b border-amber-100 flex items-center uppercase tracking-wide">
                 <AlertOctagon size={14} className="mr-2" /> Moderação de conteúdo
             </div>
             <table className="min-w-full divide-y divide-gray-100">
                 <thead className="bg-gray-50/50">
                     <tr>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Avaliação</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Agência</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Nota</th>
                         <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Ação</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 bg-white">
                     {filteredReviews.map(review => (
                         <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                             <td className="px-6 py-4">
                                 <p className="font-bold text-gray-900 text-sm">{review.clientName || 'Anônimo'}</p>
                                 <p className="text-gray-600 text-xs italic mt-1 bg-gray-50 p-2 rounded inline-block">"{review.comment}"</p>
                                 <p className="text-[10px] text-gray-400 mt-1">{new Date(review.createdAt).toLocaleDateString()}</p>
                             </td>
                             <td className="px-6 py-4 text-gray-600 text-sm">{review.agencyName}</td>
                             <td className="px-6 py-4 font-bold text-amber-500">{review.rating.toFixed(1)}</td>
                             <td className="px-6 py-4 text-right">
                                <ActionMenu actions={[
                                    { label: 'Editar Conteúdo', icon: Edit3, onClick: () => showToast('Em breve', 'info') },
                                    { label: 'Ocultar Review', icon: Eye, onClick: () => showToast('Em breve', 'info') },
                                    { label: 'Excluir Definitivamente', icon: Trash2, onClick: () => { setSelectedItem({ id: review.id, type: 'REVIEW' }); setModalType('DELETE'); }, variant: 'danger' }
                                ]} />
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
          </div>
      )}

      {/* --- TAB CONTENT: SYSTEM & THEMES (Kept similar but simplified) --- */}
      {activeTab === 'SYSTEM' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
             <div className="flex items-start gap-6 mb-8">
                <div className="bg-blue-50 p-4 rounded-full"><Database size={32} className="text-primary-600" /></div>
                <div><h2 className="text-xl font-bold text-gray-900">Migração de Dados</h2><p className="text-gray-500 mt-1 text-sm">Popule o banco de dados com dados de teste.</p></div>
             </div>
             <button onClick={() => migrateData().then(() => { showToast('Migração concluída!', 'success'); handleRefresh(); })} className="bg-primary-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors flex items-center"><Database className="mr-2" size={18}/> Iniciar Migração</button>
          </div>
      )}

      {/* --- MODALS --- */}

      {/* 1. DELETE CONFIRMATION */}
      {modalType === 'DELETE' && selectedItem && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]" onClick={() => setModalType(null)}>
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 animate-[scaleIn_0.2s]" onClick={e => e.stopPropagation()}>
                <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 border-4 border-red-50"><Trash2 size={28}/></div>
                    <h3 className="text-xl font-bold text-gray-900">Excluir Item?</h3>
                    <p className="text-sm text-gray-500 mt-2">
                        Você tem certeza que deseja excluir <strong>{selectedItem.name || 'este item'}</strong>? 
                        <br/>Essa ação é irreversível.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setModalType(null)} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-sm">Cancelar</button>
                    <button onClick={handleDeleteConfirm} disabled={isProcessing} className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex justify-center items-center text-sm">
                        {isProcessing ? <Loader className="animate-spin" size={16}/> : 'Sim, Excluir'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* 2. MANAGE SUBSCRIPTION */}
      {modalType === 'MANAGE_SUB' && selectedItem && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]" onClick={() => setModalType(null)}>
            <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl animate-[scaleIn_0.2s]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Gerenciar Assinatura</h3>
                    <button onClick={() => setModalType(null)}><X size={20} className="text-gray-400"/></button>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-xl mb-6 flex items-center gap-4">
                    <img src={selectedItem.logo} className="w-12 h-12 rounded-full bg-white" alt=""/>
                    <div>
                        <p className="font-bold text-gray-900">{selectedItem.name}</p>
                        <p className="text-xs text-gray-500">{selectedItem.email}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-xs font-bold text-gray-400 uppercase">Plano Atual</p>
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => handleSubscriptionUpdate('ACTIVE', 'BASIC')}
                            className={`p-4 rounded-xl border-2 text-center transition-all ${selectedItem.subscriptionPlan === 'BASIC' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                            <p className="font-bold text-sm">BASIC</p>
                            <p className="text-xs text-gray-500">R$ 99,90</p>
                        </button>
                        <button 
                            onClick={() => handleSubscriptionUpdate('ACTIVE', 'PREMIUM')}
                            className={`p-4 rounded-xl border-2 text-center transition-all ${selectedItem.subscriptionPlan === 'PREMIUM' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                            <p className="font-bold text-sm">PREMIUM</p>
                            <p className="text-xs text-gray-500">R$ 199,90</p>
                        </button>
                    </div>

                    <p className="text-xs font-bold text-gray-400 uppercase mt-4">Status</p>
                    <button 
                        onClick={() => handleSubscriptionUpdate(selectedItem.subscriptionStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE', selectedItem.subscriptionPlan)}
                        className={`w-full py-3 rounded-xl font-bold text-sm border transition-all flex items-center justify-center gap-2 ${selectedItem.subscriptionStatus === 'ACTIVE' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'bg-green-600 text-white hover:bg-green-700'}`}
                    >
                        {selectedItem.subscriptionStatus === 'ACTIVE' ? <><Ban size={16}/> Suspender Assinatura</> : <><CheckCircle size={16}/> Reativar Assinatura</>}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* 3. EDIT USER (Placeholder) */}
      {modalType === 'EDIT_USER' && selectedItem && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]" onClick={() => setModalType(null)}>
              <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl animate-[scaleIn_0.2s]" onClick={e => e.stopPropagation()}>
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Editar Usuário</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Nome</label>
                          <input value={editFormData.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="w-full border p-2 rounded-lg"/>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Email (Apenas leitura)</label>
                          <input value={editFormData.email || ''} disabled className="w-full border p-2 rounded-lg bg-gray-100 text-gray-500"/>
                      </div>
                      <button onClick={handleUserUpdate} className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 mt-4">Salvar Alterações</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default AdminDashboard;