
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { UserRole, Trip } from '../types';
import { ToggleLeft, ToggleRight, Trash2, MessageCircle, Users, Briefcase, BarChart, AlertOctagon, Database, Loader, Palette, Lock, Eye, Save, RefreshCw, Activity, X, AlertTriangle, Check, Search, MoreHorizontal, DollarSign, Filter, ShoppingBag } from 'lucide-react';
import { migrateData } from '../services/dataMigration';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { agencies, bookings, trips, agencyReviews, clients, auditLogs, updateAgencySubscription, toggleTripStatus, deleteAgencyReview, deleteUser, logAuditAction, refreshData } = useData();
  const { themes, activeTheme, setTheme, addTheme, deleteTheme, previewTheme, resetPreview } = useTheme();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'AGENCIES' | 'USERS' | 'TRIPS' | 'REVIEWS' | 'THEMES' | 'AUDIT' | 'SYSTEM'>('OVERVIEW');
  
  // Master Check
  const isMaster = user?.email === 'juannicolas1@gmail.com';

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Migration State
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);

  // Delete Modal State
  const [userToDelete, setUserToDelete] = useState<{ id: string, role: UserRole, name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Theme Editor State
  const [newTheme, setNewTheme] = useState({
      name: 'Novo Tema',
      colors: { primary: '#3b82f6', secondary: '#f97316', background: '#ffffff', text: '#111827' }
  });
  const [savingTheme, setSavingTheme] = useState(false);

  if (!user || user.role !== UserRole.ADMIN) return <div className="min-h-screen flex items-center justify-center">Acesso negado.</div>;

  // Metrics
  const monthlyRevenue = useMemo(() => {
      return agencies.reduce((total, agency) => {
          if (agency.subscriptionStatus !== 'ACTIVE') return total;
          return total + (agency.subscriptionPlan === 'PREMIUM' ? 199.90 : 99.90);
      }, 0);
  }, [agencies]);

  const totalGMV = bookings.reduce((acc, curr) => acc + curr.totalPrice, 0);

  // Handlers
  const handleRefresh = async () => {
      await refreshData();
  };

  const handleToggleAgency = async (agencyId: string, currentStatus: string, plan: any) => {
      const action = currentStatus === 'ACTIVE' ? 'suspender' : 'ativar';
      if(window.confirm(`Deseja realmente ${action} esta agência?`)) {
          await updateAgencySubscription(agencyId, currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE', plan);
          showToast(`Agência ${action === 'ativar' ? 'ativada' : 'suspensa'} com sucesso!`, 'success');
          handleRefresh();
      }
  };

  const handleToggleTrip = async (tripId: string) => {
      await toggleTripStatus(tripId);
      showToast('Status da viagem alterado.', 'info');
      handleRefresh();
  };

  const openDeleteModal = (id: string, role: UserRole, name: string) => {
      setUserToDelete({ id, role, name });
  };

  const handleConfirmDelete = async () => {
      if (!userToDelete) return;
      setIsDeleting(true);
      try {
          await deleteUser(userToDelete.id, userToDelete.role);
          showToast(`${userToDelete.role === 'AGENCY' ? 'Agência' : 'Usuário'} excluído com sucesso.`, 'success');
          logAuditAction('DELETE_USER', `Deleted ${userToDelete.role} - ${userToDelete.name}`);
          setUserToDelete(null);
      } catch (error: any) {
          showToast(`Erro ao excluir: ${error.message}`, 'error');
      } finally {
          setIsDeleting(false);
          handleRefresh();
      }
  };

  const handleSaveTheme = async () => {
      if (!newTheme.name) return showToast('Nome do tema é obrigatório', 'error');
      setSavingTheme(true);
      try {
        const newId = await addTheme({ name: newTheme.name, colors: newTheme.colors });
        if (newId) {
             await setTheme(newId);
             showToast('Tema salvo e aplicado!', 'success');
             setNewTheme({ name: 'Novo Tema', colors: { primary: '#3b82f6', secondary: '#f97316', background: '#ffffff', text: '#111827' } });
             resetPreview();
        } else showToast('Erro ao salvar.', 'error');
      } catch (error) { console.error(error); } finally { setSavingTheme(false); }
  };

  const handleApplyTheme = (id: string) => {
      if(window.confirm('Isso alterará as cores para TODOS os usuários. Confirmar?')) {
          setTheme(id);
          showToast('Tema aplicado.', 'success');
      }
  };

  const runMigration = async () => {
      if(!window.confirm('Isso criará dados de teste no Supabase. Continuar?')) return;
      setIsMigrating(true);
      setMigrationLogs(['Iniciando...']);
      try {
          const logs = await migrateData();
          setMigrationLogs(logs || []);
          showToast('Migração finalizada.', 'success');
          handleRefresh();
      } catch (error) { console.error(error); showToast('Erro na migração.', 'error'); } finally { setIsMigrating(false); }
  };

  const updateColor = (type: 'primary' | 'secondary', value: string) => {
    let hex = value.startsWith('#') ? value : '#' + value;
    const updatedColors = { ...newTheme.colors, [type]: hex };
    setNewTheme({ ...newTheme, colors: updatedColors });
    if (hex.length === 7) previewTheme({ ...newTheme, id: 'temp', isActive: false, isDefault: false, colors: updatedColors } as any);
  };

  // Filtered Lists
  const filteredUsers = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredAgencies = agencies.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.email.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredTrips = trips.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredReviews = agencyReviews.filter(r => r.comment.toLowerCase().includes(searchTerm.toLowerCase()) || r.agencyName?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen relative animate-[fadeIn_0.3s]">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
         <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                Painel Administrativo {isMaster && <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full border border-purple-200">MASTER</span>}
            </h1>
            <p className="text-gray-500">Gestão do Marketplace</p>
         </div>
         <div className="text-right">
             <p className="text-xs font-bold text-gray-400 uppercase">Logado como</p>
             <p className="font-bold text-gray-900">{user.email}</p>
         </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-xl shadow-sm border border-gray-100 inline-flex mb-8 flex-wrap gap-1">
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
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                >
                    <tab.icon size={16} /> {tab.label}
                </button>
             );
          })}
      </div>

      {/* Search Bar (Available for List Tabs) */}
      {['AGENCIES', 'USERS', 'TRIPS', 'REVIEWS'].includes(activeTab) && (
          <div className="mb-6 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder={`Buscar em ${activeTab.toLowerCase()}...`} 
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
      )}

      {/* CONTENT: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-[fadeIn_0.3s]">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-green-50 rounded-xl text-green-600"><DollarSign size={24}/></div>
                    <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">MRR Estimado</span>
                </div>
                <p className="text-sm text-gray-500 font-medium">Receita Recorrente</p>
                <h3 className="text-3xl font-extrabold text-gray-900 mt-1">R$ {monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                <p className="text-xs text-gray-400 mt-2">Baseado em assinaturas ativas</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><Briefcase size={24}/></div>
                    <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">Parceiros</span>
                </div>
                <p className="text-sm text-gray-500 font-medium">Agências Ativas</p>
                <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{agencies.filter(a => a.subscriptionStatus === 'ACTIVE').length}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-purple-50 rounded-xl text-purple-600"><Users size={24}/></div>
                    <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">Clientes</span>
                </div>
                <p className="text-sm text-gray-500 font-medium">Usuários Cadastrados</p>
                <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{clients.length}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-amber-50 rounded-xl text-amber-600"><ShoppingBag size={24}/></div>
                    <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">GMV</span>
                </div>
                <p className="text-sm text-gray-500 font-medium">Volume de Vendas</p>
                <h3 className="text-3xl font-extrabold text-gray-900 mt-1">R$ {totalGMV.toLocaleString()}</h3>
            </div>
          </div>
      )}

      {/* CONTENT: AGENCIES */}
      {activeTab === 'AGENCIES' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-[fadeIn_0.3s]">
             <table className="min-w-full divide-y divide-gray-100">
                 <thead className="bg-gray-50/50">
                     <tr>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Agência</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Plano</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                         <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 bg-white">
                     {filteredAgencies.map(agency => (
                         <tr key={agency.id} className="hover:bg-gray-50 transition-colors">
                             <td className="px-6 py-4">
                                 <div className="flex items-center">
                                     <img src={agency.logo || `https://ui-avatars.com/api/?name=${agency.name}`} className="w-10 h-10 rounded-full object-cover mr-3 border border-gray-200" alt=""/>
                                     <div>
                                         <p className="font-bold text-gray-900">{agency.name}</p>
                                         <p className="text-xs text-gray-500">{agency.email}</p>
                                     </div>
                                 </div>
                             </td>
                             <td className="px-6 py-4">
                                 <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${agency.subscriptionPlan === 'PREMIUM' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                     {agency.subscriptionPlan}
                                 </span>
                             </td>
                             <td className="px-6 py-4">
                                 <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center w-fit gap-1 ${agency.subscriptionStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                     <div className={`w-1.5 h-1.5 rounded-full ${agency.subscriptionStatus === 'ACTIVE' ? 'bg-green-600' : 'bg-red-600'}`}></div>
                                     {agency.subscriptionStatus === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                                 </span>
                             </td>
                             <td className="px-6 py-4 text-right">
                                 <div className="flex justify-end gap-2">
                                    <button 
                                        onClick={() => handleToggleAgency(agency.id, agency.subscriptionStatus, agency.subscriptionPlan)}
                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${agency.subscriptionStatus === 'ACTIVE' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                                    >
                                        {agency.subscriptionStatus === 'ACTIVE' ? 'Suspender' : 'Ativar'}
                                    </button>
                                    {isMaster && (
                                        <button onClick={() => openDeleteModal(agency.id, UserRole.AGENCY, agency.name)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Excluir"><Trash2 size={16}/></button>
                                    )}
                                 </div>
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
             {filteredAgencies.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">Nenhuma agência encontrada.</div>}
          </div>
      )}
      
      {/* CONTENT: USERS */}
      {activeTab === 'USERS' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-[fadeIn_0.3s]">
              <table className="min-w-full divide-y divide-gray-100">
                 <thead className="bg-gray-50/50">
                     <tr>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Usuário</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Contato</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Cadastro</th>
                         <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Ação</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 bg-white">
                     {filteredUsers.map(c => (
                         <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                             <td className="px-6 py-4">
                                <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xs mr-3">
                                        {c.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{c.name}</p>
                                        <p className="text-xs text-gray-500">{c.cpf || 'CPF não informado'}</p>
                                    </div>
                                </div>
                             </td>
                             <td className="px-6 py-4">
                                <p className="text-sm text-gray-700">{c.email}</p>
                                <p className="text-xs text-gray-500">{c.phone || '-'}</p>
                             </td>
                             <td className="px-6 py-4 text-xs text-gray-500">
                                {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-'}
                             </td>
                             <td className="px-6 py-4 text-right">
                                {isMaster && (
                                     <button onClick={() => openDeleteModal(c.id, UserRole.CLIENT, c.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Excluir Usuário"><Trash2 size={16}/></button>
                                 )}
                             </td>
                         </tr>
                     ))}
                 </tbody>
              </table>
              {filteredUsers.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">Nenhum usuário encontrado.</div>}
          </div>
      )}

      {/* CONTENT: TRIPS */}
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
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${trip.active ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                    {trip.active ? 'Ativo' : 'Pausado'}
                                </span>
                             </td>
                             <td className="px-6 py-4 text-right">
                                <button onClick={() => handleToggleTrip(trip.id)} className="text-gray-400 hover:text-primary-600 transition-colors">
                                    {trip.active ? <ToggleRight size={24} className="text-green-500"/> : <ToggleLeft size={24}/>}
                                </button>
                             </td>
                         </tr>
                     ))}
                 </tbody>
              </table>
              {filteredTrips.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">Nenhuma viagem encontrada.</div>}
          </div>
      )}

      {/* CONTENT: REVIEWS */}
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
                                 <p className="text-gray-600 text-xs italic mt-1">"{review.comment}"</p>
                                 <p className="text-[10px] text-gray-400 mt-1">{new Date(review.createdAt).toLocaleDateString()}</p>
                             </td>
                             <td className="px-6 py-4 text-gray-600 text-sm">{review.agencyName}</td>
                             <td className="px-6 py-4 font-bold text-amber-500">{review.rating.toFixed(1)}</td>
                             <td className="px-6 py-4 text-right">
                                <button onClick={async () => { if(window.confirm('Apagar avaliação permanentemente?')) { await deleteAgencyReview(review.id); handleRefresh(); } }} className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors" title="Excluir Avaliação"><Trash2 size={16}/></button>
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
             {filteredReviews.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">Nenhuma avaliação encontrada.</div>}
          </div>
      )}

      {/* CONTENT: THEMES (Kept mostly as is but cleaner) */}
      {activeTab === 'THEMES' && isMaster && (
          <div className="animate-[fadeIn_0.3s]">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-4 space-y-6">
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Palette size={18}/> Temas Salvos</h2>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                            {themes.map(theme => (
                                <div key={theme.id} className={`group border rounded-xl p-4 transition-all ${activeTheme.id === theme.id ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="font-bold text-gray-900 text-sm">{theme.name}</span>
                                        {activeTheme.id === theme.id && <span className="text-[10px] uppercase tracking-wider font-bold bg-primary-600 text-white px-2 py-0.5 rounded-full">Ativo</span>}
                                    </div>
                                    <div className="flex gap-2 mb-4">
                                        <div className="w-6 h-6 rounded-full shadow-sm ring-1 ring-black/5" style={{backgroundColor: theme.colors.primary}}></div>
                                        <div className="w-6 h-6 rounded-full shadow-sm ring-1 ring-black/5" style={{backgroundColor: theme.colors.secondary}}></div>
                                        <div className="w-6 h-6 rounded-full shadow-sm ring-1 ring-black/5 border border-gray-100" style={{backgroundColor: theme.colors.background}}></div>
                                    </div>
                                    <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                        {activeTheme.id !== theme.id && <button onClick={() => handleApplyTheme(theme.id)} className="flex-1 bg-gray-900 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-black"><Check size={12}/> Aplicar</button>}
                                        <button onClick={() => previewTheme(theme)} className="flex-1 border border-gray-300 text-gray-700 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-50"><Eye size={12}/> Ver</button>
                                        {!theme.isDefault && <button onClick={() => deleteTheme(theme.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                      </div>
                  </div>
                  <div className="lg:col-span-8 space-y-6">
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                          <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
                            <div><h2 className="text-lg font-bold text-gray-900">Novo Tema</h2><p className="text-xs text-gray-500">Personalize as cores da plataforma.</p></div>
                            <button onClick={resetPreview} className="text-xs font-bold text-gray-500 hover:text-gray-900 bg-gray-100 px-3 py-1.5 rounded-lg"><RefreshCw size={12} className="inline mr-1"/> Resetar</button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-5">
                                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Nome</label><input value={newTheme.name} onChange={e => setNewTheme({...newTheme, name: e.target.value})} className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-500 outline-none font-medium text-gray-800 text-sm"/></div>
                                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Primária</label><div className="flex items-center gap-3"><input type="color" value={newTheme.colors.primary} onChange={e => updateColor('primary', e.target.value)} className="w-10 h-10 cursor-pointer rounded-lg border-0"/><input value={newTheme.colors.primary} onChange={e => updateColor('primary', e.target.value)} className="w-full border border-gray-300 rounded-xl p-2.5 font-mono text-sm uppercase"/></div></div>
                                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Secundária</label><div className="flex items-center gap-3"><input type="color" value={newTheme.colors.secondary} onChange={e => updateColor('secondary', e.target.value)} className="w-10 h-10 cursor-pointer rounded-lg border-0"/><input value={newTheme.colors.secondary} onChange={e => updateColor('secondary', e.target.value)} className="w-full border border-gray-300 rounded-xl p-2.5 font-mono text-sm uppercase"/></div></div>
                                  <button onClick={handleSaveTheme} disabled={savingTheme} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 flex items-center justify-center gap-2 mt-4 disabled:opacity-50">{savingTheme ? <Loader className="animate-spin" size={16}/> : <Save size={16}/>} Salvar Tema</button>
                              </div>
                              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 flex flex-col justify-center items-center">
                                  <p className="text-xs font-bold text-gray-400 uppercase mb-4 w-full text-left">Preview</p>
                                  <button className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold shadow-md mb-4">Botão Principal</button>
                                  <span className="font-bold text-lg" style={{color: newTheme.colors.secondary}}>Texto Destaque</span>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* CONTENT: SYSTEM */}
      {activeTab === 'SYSTEM' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
             <div className="flex items-start gap-6 mb-8">
                <div className="bg-blue-50 p-4 rounded-full"><Database size={32} className="text-primary-600" /></div>
                <div><h2 className="text-xl font-bold text-gray-900">Migração de Dados</h2><p className="text-gray-500 mt-1 text-sm">Popule o banco de dados com dados de teste.</p></div>
             </div>
             <div className="bg-gray-900 rounded-xl p-6 font-mono text-xs text-green-400 h-48 overflow-y-auto mb-6 scrollbar-thin">
                 {migrationLogs.length === 0 ? <span className="text-gray-500">// Aguardando início...</span> : migrationLogs.map((log, i) => <div key={i}>{log}</div>)}
             </div>
             <button onClick={runMigration} disabled={isMigrating} className="bg-primary-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors flex items-center disabled:opacity-50"><Database className="mr-2" size={18}/> {isMigrating ? 'Processando...' : 'Iniciar Migração'}</button>
          </div>
      )}

      {/* CONTENT: AUDIT */}
      {activeTab === 'AUDIT' && isMaster && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-[fadeIn_0.3s]">
              <table className="min-w-full divide-y divide-gray-100">
                 <thead className="bg-gray-50"><tr><th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Data</th><th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Admin</th><th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Ação</th><th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Detalhes</th></tr></thead>
                 <tbody className="divide-y divide-gray-100">{auditLogs.map(log => (<tr key={log.id} className="hover:bg-gray-50"><td className="px-6 py-4 text-gray-500 text-xs font-mono">{new Date(log.createdAt).toLocaleString()}</td><td className="px-6 py-4 font-bold text-gray-900 text-xs">{log.adminEmail}</td><td className="px-6 py-4"><span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">{log.action}</span></td><td className="px-6 py-4 text-gray-600 text-xs">{log.details}</td></tr>))}</tbody>
              </table>
          </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {userToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 animate-[scaleIn_0.2s]">
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600"><AlertTriangle size={24}/></div>
                    <h3 className="text-lg font-bold text-gray-900">Excluir {userToDelete.role === 'AGENCY' ? 'Agência' : 'Usuário'}?</h3>
                    <p className="text-sm text-gray-500 mt-2">Você está prestes a remover <strong>{userToDelete.name}</strong>. Esta ação não pode ser desfeita.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setUserToDelete(null)} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-sm">Cancelar</button>
                    <button onClick={handleConfirmDelete} disabled={isDeleting} className="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex justify-center items-center text-sm">{isDeleting ? <Loader className="animate-spin" size={16}/> : 'Sim, Excluir'}</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
