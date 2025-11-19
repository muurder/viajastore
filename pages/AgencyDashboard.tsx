
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Trip, UserRole } from '../types';
import { PLANS } from '../services/mockData';
import { Plus, Edit, Trash2, TrendingUp, ShoppingCart, DollarSign, AlertTriangle, Lock, CheckCircle, X, BarChart3, Eye, MapPin, Loader } from 'lucide-react';

const AgencyDashboard: React.FC = () => {
  const { user } = useAuth();
  const { getAgencyTrips, updateAgencySubscription, createTrip, updateTrip, deleteTrip, agencies, getAgencyStats, loading: dataLoading } = useData();
  
  const [activeTab, setActiveTab] = useState<'TRIPS' | 'STATS' | 'SUBSCRIPTION'>('STATS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Trip>>({
    title: '', destination: '', price: 0, category: 'PRAIA', durationDays: 1, included: [], description: '', images: []
  });
  const [imageUrlInput, setImageUrlInput] = useState('');

  if (!user || user.role !== UserRole.AGENCY) return <div className="min-h-screen flex items-center justify-center">Acesso negado.</div>;

  const myAgency = agencies.find(a => a.id === user.id);
  
  if (dataLoading) return <div className="min-h-screen flex items-center justify-center"><Loader className="animate-spin text-primary-600"/></div>;
  if (!myAgency) return <div className="min-h-screen flex items-center justify-center">Agência não encontrada.</div>;

  const myTrips = getAgencyTrips(user.id);
  const stats = getAgencyStats(user.id);

  const now = new Date();
  const expires = new Date(myAgency.subscriptionExpiresAt);
  const isSubscriptionActive = myAgency.subscriptionStatus === 'ACTIVE' && expires > now;

  const handleOpenCreate = () => {
    setEditingTripId(null);
    setFormData({ title: '', destination: '', price: 0, category: 'PRAIA', durationDays: 1, included: [], description: '', images: [] });
    setImageUrlInput('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (trip: Trip) => {
    setEditingTripId(trip.id);
    setFormData({ ...trip });
    setImageUrlInput(trip.images[0] || ''); // Just showing the first one for simple edit
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const images = [...(formData.images || [])];
    if(imageUrlInput && !images.includes(imageUrlInput)) {
        images.push(imageUrlInput);
    }
    if(images.length === 0) images.push('https://images.unsplash.com/photo-1500835556837-99ac94a94552?auto=format&fit=crop&w=800&q=80');

    const tripData = {
        ...formData,
        agencyId: user.id,
        images: images,
    } as Trip;

    try {
        if (editingTripId) {
            await updateTrip(tripData);
            alert('Viagem atualizada com sucesso!');
        } else {
            await createTrip({
              ...tripData,
              id: '', // DB generated
              active: true,
              rating: 0,
              totalReviews: 0,
              startDate: new Date().toISOString(),
              endDate: new Date(new Date().setDate(new Date().getDate() + (formData.durationDays || 5))).toISOString(),
              included: formData.included?.length ? formData.included : ['Hospedagem', 'Guia'],
              views: 0,
              sales: 0
            });
            alert('Viagem criada com sucesso!');
        }
        setIsModalOpen(false);
    } catch (error) {
        alert('Erro ao salvar viagem. Tente novamente.');
        console.error(error);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
        <div className="flex items-center gap-4 w-full md:w-auto">
           <img src={myAgency.logo} alt="Logo" className="w-16 h-16 rounded-full border border-gray-200 object-cover" />
           <div>
             <h1 className="text-2xl font-bold text-gray-900">{myAgency.name}</h1>
             <p className="text-gray-500 text-sm">Painel do Parceiro</p>
           </div>
        </div>
        
        {!isSubscriptionActive ? (
          <div className="w-full md:w-auto bg-red-50 text-red-700 px-6 py-4 rounded-xl flex items-center border border-red-100 shadow-sm animate-pulse">
            <AlertTriangle size={24} className="mr-3 shrink-0" />
            <div>
              <p className="font-bold">Assinatura Inativa</p>
              <p className="text-xs">Seus anúncios estão ocultos. Renove para voltar a vender.</p>
            </div>
            <button onClick={() => setActiveTab('SUBSCRIPTION')} className="ml-4 bg-red-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-red-700">Renovar</button>
          </div>
        ) : (
          <div className="w-full md:w-auto bg-green-50 text-green-700 px-6 py-3 rounded-xl flex items-center border border-green-100">
            <CheckCircle size={24} className="mr-3 shrink-0" />
             <div>
              <p className="font-bold">Plano {myAgency.subscriptionPlan} Ativo</p>
              <p className="text-xs">Vence em {expires.toLocaleDateString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
        <button onClick={() => setActiveTab('STATS')} className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'STATS' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Visão Geral</button>
        <button onClick={() => setActiveTab('TRIPS')} className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'TRIPS' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Meus Pacotes</button>
        <button onClick={() => setActiveTab('SUBSCRIPTION')} className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'SUBSCRIPTION' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Assinatura</button>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'STATS' && (
           <div className="space-y-6 animate-[fadeIn_0.3s]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Faturamento Total</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-1">R$ {stats.totalRevenue.toLocaleString()}</h3>
                        </div>
                        <div className="p-3 bg-green-100 text-green-600 rounded-xl"><DollarSign size={20}/></div>
                    </div>
                    <div className="text-xs text-green-600 font-bold flex items-center"><TrendingUp size={12} className="mr-1"/> +12% este mês</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Vendas Realizadas</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.totalSales}</h3>
                        </div>
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><ShoppingCart size={20}/></div>
                    </div>
                    <div className="text-xs text-gray-500">Ticket médio: R$ {(stats.totalSales > 0 ? stats.totalRevenue / stats.totalSales : 0).toLocaleString()}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Visualizações</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.totalViews}</h3>
                        </div>
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><Eye size={20}/></div>
                    </div>
                    <div className="text-xs text-purple-600 font-bold flex items-center"><TrendingUp size={12} className="mr-1"/> +5% este mês</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Taxa de Conversão</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.conversionRate.toFixed(1)}%</h3>
                        </div>
                        <div className="p-3 bg-orange-100 text-orange-600 rounded-xl"><BarChart3 size={20}/></div>
                    </div>
                    <div className="text-xs text-gray-500">Média do mercado: 2.5%</div>
                </div>
              </div>
           </div>
        )}

        {activeTab === 'TRIPS' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-[fadeIn_0.3s]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Gerenciar Pacotes</h2>
              <button 
                onClick={handleOpenCreate}
                disabled={!isSubscriptionActive}
                className={`flex items-center px-4 py-2 rounded-lg text-white font-bold shadow-sm transition-all ${isSubscriptionActive ? 'bg-primary-600 hover:bg-primary-700' : 'bg-gray-300 cursor-not-allowed'}`}
              >
                {isSubscriptionActive ? <Plus size={18} className="mr-2" /> : <Lock size={18} className="mr-2" />}
                Novo Pacote
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase rounded-l-lg">Pacote</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Vendas</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase rounded-r-lg">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {myTrips.map(trip => (
                    <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <img className="h-12 w-12 rounded-lg object-cover mr-4" src={trip.images[0]} alt="" />
                          <div>
                            <div className="font-bold text-gray-900">{trip.title}</div>
                            <div className="text-xs text-gray-500 flex items-center"><MapPin size={10} className="mr-1"/> {trip.destination}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">{trip.sales || 0}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${trip.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {trip.active ? 'Ativo' : 'Pausado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button onClick={() => handleOpenEdit(trip)} disabled={!isSubscriptionActive} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg disabled:text-gray-300"><Edit size={18}/></button>
                        <button onClick={() => { if(window.confirm('Excluir viagem?')) deleteTrip(trip.id) }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {myTrips.length === 0 && <div className="text-center py-10 text-gray-400">Nenhuma viagem cadastrada.</div>}
            </div>
          </div>
        )}

        {activeTab === 'SUBSCRIPTION' && (
             <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto animate-[fadeIn_0.3s]">
             {PLANS.map(plan => (
               <div key={plan.id} className={`relative border rounded-3xl p-8 bg-white flex flex-col transition-all ${myAgency.subscriptionPlan === plan.id && isSubscriptionActive ? 'ring-2 ring-primary-500 border-transparent shadow-xl scale-105' : 'border-gray-200 hover:shadow-lg'}`}>
                  {myAgency.subscriptionPlan === plan.id && isSubscriptionActive && (
                     <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary-600 text-white px-6 py-1 rounded-full text-sm font-bold uppercase tracking-wider shadow-md">
                       Seu Plano
                     </div>
                  )}
                  <h4 className="text-2xl font-bold text-gray-900 text-center mb-2">{plan.name}</h4>
                  <div className="text-center mb-8">
                    <span className="text-5xl font-extrabold text-gray-900">R$ {Math.floor(plan.price)}</span>
                    <span className="text-xl font-bold text-gray-900">,{plan.price.toFixed(2).split('.')[1]}</span>
                    <span className="text-gray-500 font-medium block mt-1">/mês</span>
                  </div>
                  <ul className="space-y-4 mb-8 flex-1">
                      {plan.features.map((f, i) => (
                          <li key={i} className="flex items-center text-gray-600">
                              <CheckCircle size={18} className="text-green-500 mr-3 shrink-0" /> {f}
                          </li>
                      ))}
                  </ul>
                  <button 
                    onClick={() => { updateAgencySubscription(user.id, 'ACTIVE', plan.id as any); alert('Assinatura renovada!')}}
                    className={`w-full py-4 rounded-xl font-bold transition-all shadow-lg ${
                       myAgency.subscriptionPlan === plan.id && isSubscriptionActive 
                       ? 'bg-gray-100 text-gray-400 cursor-default shadow-none' 
                       : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-95'
                    }`}
                    disabled={myAgency.subscriptionPlan === plan.id && isSubscriptionActive}
                  >
                    {myAgency.subscriptionPlan === plan.id && isSubscriptionActive ? 'Plano Atual' : 'Assinar Agora'}
                  </button>
               </div>
             ))}
           </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl animate-[scaleIn_0.2s] relative">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24}/></button>
                <h2 className="text-2xl font-bold mb-6">{editingTripId ? 'Editar Viagem' : 'Criar Nova Viagem'}</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">Título</label>
                            <input className="w-full border border-gray-300 p-3 rounded-lg" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Destino</label>
                            <input className="w-full border border-gray-300 p-3 rounded-lg" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} required />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Preço (R$)</label>
                            <input type="number" className="w-full border border-gray-300 p-3 rounded-lg" value={formData.price || ''} onChange={e => setFormData({...formData, price: Number(e.target.value)})} required />
                        </div>
                        <div>
                           <label className="block text-sm font-bold text-gray-700 mb-1">Categoria</label>
                           <select className="w-full border border-gray-300 p-3 rounded-lg" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})}>
                               {['PRAIA', 'AVENTURA', 'FAMILIA', 'ROMANTICO', 'URBANO', 'NATUREZA', 'CULTURA', 'GASTRONOMICO'].map(c => <option key={c} value={c}>{c}</option>)}
                           </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Duração (Dias)</label>
                            <input type="number" className="w-full border border-gray-300 p-3 rounded-lg" value={formData.durationDays || 1} onChange={e => setFormData({...formData, durationDays: Number(e.target.value)})} required />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">URL da Imagem (Principal)</label>
                            <input type="url" className="w-full border border-gray-300 p-3 rounded-lg" value={imageUrlInput} onChange={e => setImageUrlInput(e.target.value)} placeholder="https://..." />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label>
                            <textarea rows={4} className="w-full border border-gray-300 p-3 rounded-lg" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required />
                        </div>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 shadow-lg disabled:opacity-50">
                        {isSubmitting ? 'Salvando...' : 'Salvar'}
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default AgencyDashboard;
