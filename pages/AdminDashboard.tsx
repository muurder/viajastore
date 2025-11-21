
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { UserRole } from '../types';
import { ToggleLeft, ToggleRight, Trash2, MessageCircle, Users, Briefcase, BarChart, AlertOctagon, Database, Loader, Palette, Lock, Eye, Save, RefreshCw, Activity, X, AlertTriangle, Check } from 'lucide-react';
import { migrateData } from '../services/dataMigration';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { agencies, bookings, trips, reviews, clients, auditLogs, updateAgencySubscription, toggleTripStatus, deleteReview, deleteUser, logAuditAction } = useData();
  const { themes, activeTheme, setTheme, addTheme, deleteTheme, previewTheme, resetPreview } = useTheme();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'AGENCIES' | 'USERS' | 'TRIPS' | 'REVIEWS' | 'THEMES' | 'AUDIT' | 'SYSTEM'>('OVERVIEW');
  
  // Master Check
  const isMaster = user?.email === 'juannicolas1@gmail.com';

  // Migration State
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);

  // Delete Modal State
  const [userToDelete, setUserToDelete] = useState<{ id: string, role: UserRole, name: string } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Theme Editor State
  const [newTheme, setNewTheme] = useState({
      name: 'Novo Tema',
      colors: { primary: '#3b82f6', secondary: '#f97316', background: '#ffffff', text: '#111827' }
  });
  const [savingTheme, setSavingTheme] = useState(false);

  if (!user || user.role !== UserRole.ADMIN) return <div className="min-h-screen flex items-center justify-center">Acesso negado.</div>;

  const totalRevenue = bookings.reduce((acc, curr) => acc + curr.totalPrice, 0);

  const handleToggleAgency = (agencyId: string, currentStatus: string, plan: any) => {
      const action = currentStatus === 'ACTIVE' ? 'suspender' : 'ativar';
      if(window.confirm(`Tem certeza que deseja ${action} esta agência?`)) {
          updateAgencySubscription(agencyId, currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE', plan);
          showToast(`Agência ${action === 'ativar' ? 'ativada' : 'suspensa'} com sucesso!`, 'success');
      }
  };

  const handleToggleTrip = (tripId: string) => {
      // Quick toggle, toast feedback
      toggleTripStatus(tripId);
      showToast('Status da viagem alterado.', 'info');
  };

  // Open Delete Modal
  const openDeleteModal = (id: string, role: UserRole, name: string) => {
      setUserToDelete({ id, role, name });
      setDeleteConfirmation('');
  };

  // Execute Delete
  const handleConfirmDelete = async () => {
      if (!userToDelete) return;
      if (deleteConfirmation !== 'DELETAR') return;

      setIsDeleting(true);
      try {
          await deleteUser(userToDelete.id, userToDelete.role);
          showToast(`Usuário ${userToDelete.name} excluído com sucesso.`, 'success');
          logAuditAction('DELETE_USER', `Deleted ${userToDelete.role} - ${userToDelete.name}`);
          setUserToDelete(null);
      } catch (error: any) {
          showToast(`Erro ao excluir: ${error.message}`, 'error');
      } finally {
          setIsDeleting(false);
      }
  };

  const handleSaveTheme = async () => {
      if (!newTheme.name) {
          showToast('Nome do tema é obrigatório', 'error');
          return;
      }
      
      setSavingTheme(true);
      try {
        // 1. Create Theme in DB
        const newId = await addTheme({
            name: newTheme.name,
            colors: newTheme.colors,
        });

        if (newId) {
             // 2. Apply it globally
             await setTheme(newId);
             showToast('Tema salvo e aplicado para todos os usuários!', 'success');
             logAuditAction('CREATE_THEME', `Created and applied theme ${newTheme.name}`);
             
             // Reset
             setNewTheme({
                 name: 'Novo Tema',
                 colors: { primary: '#3b82f6', secondary: '#f97316', background: '#ffffff', text: '#111827' }
             });
             resetPreview();
        } else {
            showToast('Erro ao salvar tema no banco.', 'error');
        }
      } catch (error) {
          console.error(error);
          showToast('Erro inesperado.', 'error');
      } finally {
          setSavingTheme(false);
      }
  };

  const handleApplyTheme = (id: string) => {
      // Simple confirm browser alert is okay here for global action, or could be a modal too.
      if(window.confirm('Atenção: Isso alterará as cores do site para TODOS os usuários. Confirmar?')) {
          setTheme(id);
          showToast('Tema aplicado globalmente.', 'success');
          logAuditAction('CHANGE_THEME', `Applied theme ${id} globally`);
      }
  };

  const runMigration = async () => {
      if(!window.confirm('ATENÇÃO: Isso tentará criar usuários no Supabase e inserir dados.')) return;
      setIsMigrating(true);
      setMigrationLogs(['Iniciando...']);
      try {
          const logs = await migrateData();
          setMigrationLogs(logs || []);
          showToast('Migração finalizada.', 'success');
      } catch (error) {
          console.error(error);
          setMigrationLogs(prev => [...prev, 'Erro desconhecido ao executar script.']);
          showToast('Erro na migração.', 'error');
      } finally {
          setIsMigrating(false);
      }
  };

  // Helper for updating color state and preview
  const updateColor = (type: 'primary' | 'secondary', value: string) => {
    let hex = value;
    if (!hex.startsWith('#')) {
        hex = '#' + hex;
    }

    const updatedColors = { ...newTheme.colors, [type]: hex };
    setNewTheme({ ...newTheme, colors: updatedColors });
    
    // Only update preview if it's a valid hex length
    if (hex.length === 4 || hex.length === 7) {
        previewTheme({
            ...newTheme,
            id: 'temp',
            isActive: false,
            isDefault: false,
            colors: updatedColors
        } as any);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen relative">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
         <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                Painel Administrativo {isMaster && <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full border border-purple-200">MASTER</span>}
            </h1>
            <p className="text-gray-500">Visão geral do marketplace</p>
         </div>
         <div className="text-right">
             <p className="text-sm text-gray-500">Logado como</p>
             <p className="font-bold text-gray-900">{user.email}</p>
         </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 inline-flex mb-8 flex-wrap gap-2">
          {[
              {id: 'OVERVIEW', label: 'Visão Geral', icon: Activity}, 
              {id: 'AGENCIES', label: 'Agências', icon: Briefcase},
              {id: 'USERS', label: 'Usuários', icon: Users},
              {id: 'TRIPS', label: 'Viagens', icon: BarChart},
              {id: 'REVIEWS', label: 'Avaliações', icon: MessageCircle},
              {id: 'THEMES', label: 'Temas & Cores', icon: Palette, masterOnly: true},
              {id: 'AUDIT', label: 'Auditoria', icon: Lock, masterOnly: true},
              {id: 'SYSTEM', label: 'Sistema', icon: Database}
          ].map(tab => {
             if (tab.masterOnly && !isMaster) return null;
             return (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <tab.icon size={16} /> {tab.label}
                </button>
             );
          })}
      </div>

      {/* CONTENT: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-[fadeIn_0.3s]">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-sm font-bold text-gray-400 uppercase">Receita Total (GMV)</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-2">R$ {totalRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-sm font-bold text-gray-400 uppercase">Agências Ativas</p>
                <p className="text-3xl font-extrabold text-primary-600 mt-2">{agencies.filter(a => a.subscriptionStatus === 'ACTIVE').length} <span className="text-lg text-gray-400 font-medium">/ {agencies.length}</span></p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-sm font-bold text-gray-400 uppercase">Viagens Publicadas</p>
                <p className="text-3xl font-extrabold text-green-600 mt-2">{trips.filter(t => t.active).length}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-sm font-bold text-gray-400 uppercase">Total de Clientes</p>
                <p className="text-3xl font-extrabold text-purple-600 mt-2">{clients.length}</p>
            </div>
          </div>
      )}

      {/* CONTENT: THEMES */}
      {activeTab === 'THEMES' && isMaster && (
          <div className="animate-[fadeIn_0.3s]">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Sidebar: List of Themes */}
                  <div className="lg:col-span-4 space-y-6">
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Palette size={20}/> Biblioteca de Temas</h2>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
                            {themes.map(theme => (
                                <div key={theme.id} className={`group border rounded-xl p-4 transition-all ${activeTheme.id === theme.id ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="font-bold text-gray-900">{theme.name}</span>
                                        {activeTheme.id === theme.id && <span className="text-[10px] uppercase tracking-wider font-bold bg-primary-600 text-white px-2 py-0.5 rounded-full">Ativo</span>}
                                    </div>
                                    
                                    {/* Color Dots */}
                                    <div className="flex gap-2 mb-4">
                                        <div className="w-8 h-8 rounded-full shadow-sm ring-1 ring-black/5" title="Primária" style={{backgroundColor: theme.colors.primary}}></div>
                                        <div className="w-8 h-8 rounded-full shadow-sm ring-1 ring-black/5" title="Secundária" style={{backgroundColor: theme.colors.secondary}}></div>
                                        <div className="w-8 h-8 rounded-full shadow-sm ring-1 ring-black/5 border border-gray-100" title="Fundo" style={{backgroundColor: theme.colors.background}}></div>
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex gap-2 opacity-100 sm:opacity-60 group-hover:opacity-100 transition-opacity">
                                        {activeTheme.id !== theme.id && (
                                            <button onClick={() => handleApplyTheme(theme.id)} className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-xs font-bold hover:bg-black transition-colors flex items-center justify-center gap-1">
                                                <Check size={12}/> Aplicar
                                            </button>
                                        )}
                                        <button onClick={() => previewTheme(theme)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-1">
                                            <Eye size={12}/> Preview
                                        </button>
                                        {!theme.isDefault && (
                                            <button onClick={() => deleteTheme(theme.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-colors" title="Excluir Tema">
                                                <Trash2 size={14}/>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                      </div>
                  </div>

                  {/* Main: Editor & Preview */}
                  <div className="lg:col-span-8 space-y-6">
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                          <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Criar / Editar Tema</h2>
                                <p className="text-sm text-gray-500">Personalize as cores da plataforma em tempo real.</p>
                            </div>
                            <button onClick={resetPreview} className="text-sm font-bold text-gray-500 hover:text-gray-900 flex items-center bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"><RefreshCw size={14} className="mr-2"/> Resetar</button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              {/* Inputs */}
                              <div className="space-y-5">
                                  <div>
                                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Nome do Tema</label>
                                      <input 
                                          value={newTheme.name} 
                                          onChange={e => setNewTheme({...newTheme, name: e.target.value})} 
                                          className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-500 outline-none font-medium text-gray-800"
                                          placeholder="Ex: Verão 2024"
                                      />
                                  </div>
                                  
                                  {/* Color Picker: Primary */}
                                  <div>
                                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Cor Primária (Marca)</label>
                                      <div className="flex items-center gap-3">
                                          <div className="relative w-14 h-12 rounded-xl shadow-sm ring-1 ring-black/10 overflow-hidden cursor-pointer hover:ring-primary-500 transition-all">
                                              <input 
                                                type="color" 
                                                value={newTheme.colors.primary} 
                                                onChange={e => updateColor('primary', e.target.value)}
                                                className="absolute inset-0 w-[200%] h-[200%] -top-[50%] -left-[50%] cursor-pointer"
                                              />
                                          </div>
                                          <div className="flex-1 relative">
                                               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-sm">#</span>
                                               <input 
                                                 value={newTheme.colors.primary.replace('#', '')}
                                                 onChange={e => updateColor('primary', e.target.value)}
                                                 maxLength={6}
                                                 className="w-full border border-gray-300 rounded-xl py-3 pl-7 pr-3 font-mono text-sm uppercase focus:ring-2 focus:ring-primary-500 outline-none"
                                               />
                                          </div>
                                      </div>
                                  </div>

                                  {/* Color Picker: Secondary */}
                                  <div>
                                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Cor Secundária (Destaque)</label>
                                      <div className="flex items-center gap-3">
                                          <div className="relative w-14 h-12 rounded-xl shadow-sm ring-1 ring-black/10 overflow-hidden cursor-pointer hover:ring-primary-500 transition-all">
                                              <input 
                                                type="color" 
                                                value={newTheme.colors.secondary} 
                                                onChange={e => updateColor('secondary', e.target.value)}
                                                className="absolute inset-0 w-[200%] h-[200%] -top-[50%] -left-[50%] cursor-pointer"
                                              />
                                          </div>
                                          <div className="flex-1 relative">
                                               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-sm">#</span>
                                               <input 
                                                 value={newTheme.colors.secondary.replace('#', '')}
                                                 onChange={e => updateColor('secondary', e.target.value)}
                                                 maxLength={6}
                                                 className="w-full border border-gray-300 rounded-xl py-3 pl-7 pr-3 font-mono text-sm uppercase focus:ring-2 focus:ring-primary-500 outline-none"
                                               />
                                          </div>
                                      </div>
                                  </div>

                                  <button 
                                      onClick={handleSaveTheme} 
                                      disabled={savingTheme}
                                      className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 flex items-center justify-center gap-2 mt-2 shadow-lg shadow-green-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                      {savingTheme ? <Loader className="animate-spin" size={18} /> : <Save size={18}/>} 
                                      Salvar e Aplicar
                                  </button>
                              </div>

                              {/* Live Preview Area */}
                              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 flex flex-col">
                                  <div className="flex items-center gap-2 mb-4">
                                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Live Preview</span>
                                  </div>

                                  <div className="space-y-4 flex-1 flex flex-col justify-center">
                                      {/* Buttons */}
                                      <div className="flex gap-2 flex-wrap">
                                          <button className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold shadow-md shadow-primary-500/20 text-sm">Botão Primário</button>
                                          <button className="bg-secondary-500 text-white px-4 py-2 rounded-lg font-bold shadow-md shadow-secondary-500/20 text-sm">Destaque</button>
                                          <button className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg font-bold text-sm">Neutro</button>
                                      </div>

                                      {/* Card */}
                                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                          <h4 className="text-primary-700 font-bold text-base mb-1">Título do Exemplo</h4>
                                          <p className="text-gray-500 text-xs leading-relaxed">
                                              Assim ficarão os elementos com as novas cores. O sistema gera automaticamente as variações de tom (claro/escuro).
                                          </p>
                                          <div className="mt-3 h-1 w-12 bg-secondary-500 rounded-full"></div>
                                      </div>

                                      {/* Alert */}
                                      <div className="bg-primary-50 border border-primary-100 text-primary-700 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2">
                                          <AlertOctagon size={16}/>
                                          <span>Mensagem de alerta ou info.</span>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* CONTENT: AUDIT */}
      {activeTab === 'AUDIT' && isMaster && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-[fadeIn_0.3s]">
              <table className="min-w-full divide-y divide-gray-100">
                 <thead className="bg-gray-50">
                     <tr>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Data</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Admin</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Ação</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Detalhes</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                     {auditLogs.map(log => (
                         <tr key={log.id} className="hover:bg-gray-50">
                             <td className="px-6 py-4 text-gray-500 text-xs font-mono">{new Date(log.createdAt).toLocaleString()}</td>
                             <td className="px-6 py-4 font-bold text-gray-900 text-sm">{log.adminEmail}</td>
                             <td className="px-6 py-4">
                                 <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">{log.action}</span>
                             </td>
                             <td className="px-6 py-4 text-gray-600 text-sm">{log.details}</td>
                         </tr>
                     ))}
                     {auditLogs.length === 0 && (
                         <tr><td colSpan={4} className="text-center py-8 text-gray-400">Nenhuma ação registrada.</td></tr>
                     )}
                 </tbody>
              </table>
          </div>
      )}

      {/* CONTENT: AGENCIES */}
      {activeTab === 'AGENCIES' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-[fadeIn_0.3s]">
             <table className="min-w-full divide-y divide-gray-100">
                 <thead className="bg-gray-50">
                     <tr>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Agência</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Plano</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                         <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Ação</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                     {agencies.map(agency => (
                         <tr key={agency.id} className="hover:bg-gray-50">
                             <td className="px-6 py-4">
                                 <div className="flex items-center">
                                     <img src={agency.logo} className="w-10 h-10 rounded-full object-cover mr-3" alt=""/>
                                     <span className="font-bold text-gray-900">{agency.name}</span>
                                 </div>
                             </td>
                             <td className="px-6 py-4 text-sm text-gray-600">{agency.subscriptionPlan}</td>
                             <td className="px-6 py-4">
                                 <span className={`px-3 py-1 rounded-full text-xs font-bold ${agency.subscriptionStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                     {agency.subscriptionStatus}
                                 </span>
                             </td>
                             <td className="px-6 py-4 text-right flex justify-end gap-2">
                                 <button 
                                     onClick={() => handleToggleAgency(agency.id, agency.subscriptionStatus, agency.subscriptionPlan)}
                                     className={`text-xs font-bold px-3 py-1 rounded border ${agency.subscriptionStatus === 'ACTIVE' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                                 >
                                     {agency.subscriptionStatus === 'ACTIVE' ? 'Suspender' : 'Ativar'}
                                 </button>
                                 {isMaster && (
                                     <button onClick={() => openDeleteModal(agency.id, UserRole.AGENCY, agency.name)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                 )}
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
          </div>
      )}
      
      {/* CONTENT: USERS */}
      {activeTab === 'USERS' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-[fadeIn_0.3s]">
              <table className="min-w-full divide-y divide-gray-100">
                 <thead className="bg-gray-50">
                     <tr>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Nome</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Email</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">CPF</th>
                         <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Ação</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                     {clients.map(c => (
                         <tr key={c.id} className="hover:bg-gray-50">
                             <td className="px-6 py-4 font-bold text-gray-900">{c.name}</td>
                             <td className="px-6 py-4 text-gray-600 text-sm">{c.email}</td>
                             <td className="px-6 py-4 text-gray-600 text-sm">{c.cpf || '---'}</td>
                             <td className="px-6 py-4 text-right">
                                {isMaster && (
                                     <button onClick={() => openDeleteModal(c.id, UserRole.CLIENT, c.name)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                 )}
                             </td>
                         </tr>
                     ))}
                 </tbody>
              </table>
          </div>
      )}

      {/* CONTENT: TRIPS */}
      {activeTab === 'TRIPS' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-[fadeIn_0.3s]">
              <table className="min-w-full divide-y divide-gray-100">
                 <thead className="bg-gray-50">
                     <tr>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Viagem</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Agência</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                         <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Moderação</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                     {trips.map(trip => (
                         <tr key={trip.id} className="hover:bg-gray-50">
                             <td className="px-6 py-4 font-bold text-gray-900 text-sm">{trip.title}</td>
                             <td className="px-6 py-4 text-gray-600 text-sm">{agencies.find(a => a.id === trip.agencyId)?.name}</td>
                             <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${trip.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {trip.active ? 'Ativo' : 'Pausado'}
                                </span>
                             </td>
                             <td className="px-6 py-4 text-right">
                                <button onClick={() => handleToggleTrip(trip.id)} className="text-gray-400 hover:text-primary-600">
                                    {trip.active ? <ToggleRight size={24} className="text-green-500"/> : <ToggleLeft size={24}/>}
                                </button>
                             </td>
                         </tr>
                     ))}
                 </tbody>
              </table>
          </div>
      )}

      {/* CONTENT: REVIEWS */}
      {activeTab === 'REVIEWS' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-[fadeIn_0.3s]">
             <div className="p-4 bg-yellow-50 text-yellow-800 text-sm border-b border-yellow-100 flex items-center">
                 <AlertOctagon size={16} className="mr-2" /> Moderação de conteúdo: Remova avaliações ofensivas ou spam.
             </div>
             <table className="min-w-full divide-y divide-gray-100">
                 <thead className="bg-gray-50">
                     <tr>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Autor</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Comentário</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Nota</th>
                         <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Ação</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                     {reviews.map(review => (
                         <tr key={review.id} className="hover:bg-gray-50">
                             <td className="px-6 py-4 font-bold text-gray-900 text-sm">{review.clientName}</td>
                             <td className="px-6 py-4 text-gray-600 text-sm italic">"{review.comment}"</td>
                             <td className="px-6 py-4 font-bold text-amber-500">{review.rating}/5</td>
                             <td className="px-6 py-4 text-right">
                                <button onClick={() => { if(window.confirm('Apagar avaliação?')) deleteReview(review.id) }} className="text-red-400 hover:text-red-600 bg-red-50 p-2 rounded"><Trash2 size={16}/></button>
                             </td>
                         </tr>
                     ))}
                     {reviews.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400">Sem avaliações recentes.</td></tr>}
                 </tbody>
             </table>
          </div>
      )}

      {/* CONTENT: SYSTEM */}
      {activeTab === 'SYSTEM' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
             <div className="flex items-start gap-6 mb-8">
                <div className="bg-blue-50 p-4 rounded-full">
                   <Database size={32} className="text-primary-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Migração de Dados (Supabase)</h2>
                    <p className="text-gray-500 mt-1">
                        Use esta ferramenta para popular seu banco de dados Supabase recém-criado com os dados de teste (Agências e Viagens).
                        <br/><strong>Nota:</strong> Certifique-se de ter inserido suas chaves de API em <code>services/supabase.ts</code>.
                    </p>
                </div>
             </div>

             <div className="bg-gray-900 rounded-xl p-6 font-mono text-sm text-green-400 h-64 overflow-y-auto mb-6">
                 {migrationLogs.length === 0 ? (
                     <span className="text-gray-500">// Logs de migração aparecerão aqui...</span>
                 ) : (
                     migrationLogs.map((log, i) => <div key={i}>{log}</div>)
                 )}
             </div>

             <button 
                onClick={runMigration}
                disabled={isMigrating}
                className="bg-primary-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
             >
                {isMigrating ? <Loader className="animate-spin mr-2" size={20}/> : <Database className="mr-2" size={20}/>}
                {isMigrating ? 'Migrando...' : 'Iniciar Migração'}
             </button>
          </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {userToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-[scaleIn_0.2s]">
                <div className="flex items-center gap-4 mb-4">
                    <div className="bg-red-100 p-3 rounded-full text-red-600">
                        <AlertTriangle size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Confirmar Exclusão</h3>
                        <p className="text-sm text-gray-500">Esta ação é irreversível.</p>
                    </div>
                </div>
                
                <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                    Você está prestes a excluir permanentemente a conta de <strong>{userToDelete.name}</strong> e todos os dados associados.
                </p>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                        Digite <span className="text-gray-900">DELETAR</span> para confirmar:
                    </label>
                    <input 
                        type="text" 
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-500 font-mono text-center uppercase placeholder-gray-300"
                        placeholder="DELETAR"
                    />
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => setUserToDelete(null)} 
                        className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleConfirmDelete}
                        disabled={deleteConfirmation !== 'DELETAR' || isDeleting}
                        className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                    >
                        {isDeleting ? <Loader className="animate-spin" size={18}/> : 'Confirmar Exclusão'}
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
