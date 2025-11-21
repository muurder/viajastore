
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserRole } from '../types';
import { ToggleLeft, ToggleRight, Trash2, MessageCircle, Users, Briefcase, BarChart, AlertOctagon, Database, Loader, Palette, Lock, Eye, Save, RefreshCw, Activity } from 'lucide-react';
import { migrateData } from '../services/dataMigration';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { agencies, bookings, trips, reviews, clients, auditLogs, updateAgencySubscription, toggleTripStatus, deleteReview, deleteUser, logAuditAction } = useData();
  const { themes, activeTheme, setTheme, addTheme, deleteTheme, previewTheme, resetPreview } = useTheme();
  
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'AGENCIES' | 'USERS' | 'TRIPS' | 'REVIEWS' | 'THEMES' | 'AUDIT' | 'SYSTEM'>('OVERVIEW');
  
  // Master Check
  const isMaster = user?.email === 'juannicolas1@gmail.com';

  // Migration State
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);

  // Theme Editor State
  const [newTheme, setNewTheme] = useState({
      name: 'Novo Tema',
      colors: { primary: '#3b82f6', secondary: '#f97316', background: '#ffffff', text: '#111827' }
  });

  if (!user || user.role !== UserRole.ADMIN) return <div className="min-h-screen flex items-center justify-center">Acesso negado.</div>;

  const totalRevenue = bookings.reduce((acc, curr) => acc + curr.totalPrice, 0);

  const handleToggleAgency = (agencyId: string, currentStatus: string, plan: any) => {
      const action = currentStatus === 'ACTIVE' ? 'suspender' : 'ativar';
      if(window.confirm(`Tem certeza que deseja ${action} esta agência?`)) {
          updateAgencySubscription(agencyId, currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE', plan);
      }
  };

  const handleToggleTrip = (tripId: string) => {
      if(window.confirm('Tem certeza que deseja alterar o status desta viagem?')) {
          toggleTripStatus(tripId);
      }
  };

  const handleDeleteUser = async (id: string, role: UserRole, name: string) => {
      const confirm = prompt(`Para excluir permanentemente ${name}, digite DELETAR abaixo:`);
      if (confirm === 'DELETAR') {
          await deleteUser(id, role);
          alert('Usuário excluído.');
      }
  };

  const handleSaveTheme = () => {
      const id = `theme-${Date.now()}`;
      addTheme({
          id,
          name: newTheme.name,
          colors: newTheme.colors,
          isActive: false,
          isDefault: false
      });
      alert('Tema salvo! Agora você pode ativá-lo.');
      logAuditAction('CREATE_THEME', `Created theme ${newTheme.name}`);
  };

  const handleApplyTheme = (id: string) => {
      if(window.confirm('Atenção: Isso alterará as cores do site para TODOS os usuários. Confirmar?')) {
          setTheme(id);
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
      } catch (error) {
          console.error(error);
          setMigrationLogs(prev => [...prev, 'Erro desconhecido ao executar script.']);
      } finally {
          setIsMigrating(false);
      }
  };

  // Helper for updating color state and preview
  const updateColor = (type: 'primary' | 'secondary', value: string) => {
    let hex = value;
    // If user types manually without hash, add it if it looks like a hex
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
    <div className="max-w-7xl mx-auto pb-12">
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

      {activeTab === 'THEMES' && isMaster && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-[fadeIn_0.3s]">
              {/* Theme List */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 col-span-1">
                  <h2 className="text-xl font-bold mb-4">Temas Disponíveis</h2>
                  <div className="space-y-4">
                      {themes.map(theme => (
                          <div key={theme.id} className={`border rounded-xl p-4 ${activeTheme.id === theme.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                              <div className="flex justify-between items-center mb-3">
                                  <span className="font-bold text-gray-900">{theme.name}</span>
                                  {activeTheme.id === theme.id && <span className="text-xs bg-primary-600 text-white px-2 py-1 rounded-full">Ativo</span>}
                              </div>
                              <div className="flex gap-2 mb-4">
                                  <div className="w-6 h-6 rounded-full shadow-sm" style={{backgroundColor: theme.colors.primary}}></div>
                                  <div className="w-6 h-6 rounded-full shadow-sm" style={{backgroundColor: theme.colors.secondary}}></div>
                                  <div className="w-6 h-6 rounded-full shadow-sm border" style={{backgroundColor: theme.colors.background}}></div>
                              </div>
                              <div className="flex gap-2">
                                  {activeTheme.id !== theme.id && (
                                    <button onClick={() => handleApplyTheme(theme.id)} className="flex-1 bg-gray-900 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-black">Aplicar</button>
                                  )}
                                  <button onClick={() => previewTheme(theme)} className="flex-1 border border-gray-300 text-gray-700 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-50"><Eye size={12} className="inline mr-1"/> Preview</button>
                                  {!theme.isDefault && (
                                      <button onClick={() => deleteTheme(theme.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Theme Creator */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 col-span-2">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold">Criar Novo Tema</h2>
                      <button onClick={resetPreview} className="text-sm text-gray-500 hover:text-gray-900 flex items-center"><RefreshCw size={14} className="mr-1"/> Resetar Preview</button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">Nome do Tema</label>
                              <input 
                                value={newTheme.name} 
                                onChange={e => setNewTheme({...newTheme, name: e.target.value})} 
                                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                                placeholder="Ex: Verão 2024"
                              />
                          </div>
                          
                          {/* Modern Color Picker - Primary */}
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">Cor Primária</label>
                              <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                                  <div className="relative w-12 h-12 flex-shrink-0 overflow-hidden rounded-lg shadow-sm ring-1 ring-black/5 cursor-pointer group">
                                      <input
                                        type="color"
                                        value={newTheme.colors.primary}
                                        onChange={e => updateColor('primary', e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                      />
                                      <div 
                                        className="w-full h-full group-hover:scale-110 transition-transform duration-300" 
                                        style={{ backgroundColor: newTheme.colors.primary }} 
                                      />
                                  </div>
                                  <div className="relative flex-1">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold select-none">#</span>
                                      <input 
                                        type="text"
                                        value={newTheme.colors.primary.replace('#', '')}
                                        onChange={e => updateColor('primary', e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-7 pr-3 text-sm font-mono text-gray-700 uppercase focus:ring-2 focus:ring-primary-500 outline-none"
                                        maxLength={6}
                                      />
                                  </div>
                              </div>
                          </div>

                          {/* Modern Color Picker - Secondary */}
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">Cor Secundária</label>
                              <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                                  <div className="relative w-12 h-12 flex-shrink-0 overflow-hidden rounded-lg shadow-sm ring-1 ring-black/5 cursor-pointer group">
                                      <input
                                        type="color"
                                        value={newTheme.colors.secondary}
                                        onChange={e => updateColor('secondary', e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                      />
                                      <div 
                                        className="w-full h-full group-hover:scale-110 transition-transform duration-300" 
                                        style={{ backgroundColor: newTheme.colors.secondary }} 
                                      />
                                  </div>
                                  <div className="relative flex-1">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold select-none">#</span>
                                      <input 
                                        type="text"
                                        value={newTheme.colors.secondary.replace('#', '')}
                                        onChange={e => updateColor('secondary', e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-7 pr-3 text-sm font-mono text-gray-700 uppercase focus:ring-2 focus:ring-primary-500 outline-none"
                                        maxLength={6}
                                      />
                                  </div>
                              </div>
                          </div>

                          <button onClick={handleSaveTheme} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 flex items-center justify-center gap-2 mt-4 shadow-lg shadow-green-500/20 transition-all active:scale-95">
                              <Save size={18}/> Salvar Tema
                          </button>
                      </div>

                      {/* Live Preview Area */}
                      <div className="border border-gray-200 rounded-xl p-6 bg-gray-50 flex flex-col">
                          <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                              <Activity size={14}/> Preview em Tempo Real
                          </h3>
                          
                          <div className="space-y-6 flex-1">
                              <div className="flex flex-wrap gap-3">
                                  <button className="bg-primary-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-md shadow-primary-500/30 transition-transform hover:-translate-y-0.5">
                                    Botão Primário
                                  </button>
                                  <button className="bg-secondary-500 text-white px-5 py-2.5 rounded-lg font-bold shadow-md shadow-secondary-500/30 transition-transform hover:-translate-y-0.5">
                                    Botão Secundário
                                  </button>
                              </div>
                              
                              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                  <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center mb-3">
                                      <Briefcase size={20} />
                                  </div>
                                  <h4 className="text-primary-700 font-bold text-lg mb-2">Título do Card</h4>
                                  <p className="text-gray-600 text-sm leading-relaxed">
                                      Este é um exemplo de como o texto e os elementos se comportarão com as novas cores definidas. A tipografia e os ícones se adaptam automaticamente.
                                  </p>
                              </div>

                              <div className="bg-primary-50 p-4 rounded-xl border border-primary-100 text-primary-800 text-sm font-medium flex items-start gap-3">
                                  <AlertOctagon className="shrink-0 mt-0.5" size={16}/>
                                  <span>Alertas e fundos suaves usarão a variação de baixa opacidade da cor primária.</span>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

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
                                     <button onClick={() => handleDeleteUser(agency.id, UserRole.AGENCY, agency.name)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                 )}
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
          </div>
      )}
      
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
                                     <button onClick={() => handleDeleteUser(c.id, UserRole.CLIENT, c.name)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                 )}
                             </td>
                         </tr>
                     ))}
                 </tbody>
              </table>
          </div>
      )}

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
    </div>
  );
};

export default AdminDashboard;
