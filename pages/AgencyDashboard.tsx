import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Trip, UserRole } from '../types';
import { PLANS } from '../services/mockData';
import { Plus, Edit, Trash2, TrendingUp, Users, DollarSign, AlertTriangle, Lock, CheckCircle, X } from 'lucide-react';

const AgencyDashboard: React.FC = () => {
  const { user } = useAuth();
  const { getAgencyTrips, updateAgencySubscription, createTrip, updateTrip, deleteTrip, agencies, bookings } = useData();
  
  const [activeTab, setActiveTab] = useState<'TRIPS' | 'STATS' | 'SUBSCRIPTION'>('TRIPS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Trip>>({
    title: '', destination: '', price: 0, category: 'PRAIA', durationDays: 1, included: [], description: ''
  });

  if (!user || user.role !== UserRole.AGENCY) return <div className="p-8 text-center">Acesso negado. Faça login como agência.</div>;

  // Get fresh agency data from Context instead of relying on AuthContext's stale user
  const myAgency = agencies.find(a => a.id === user.id);
  if (!myAgency) return <div>Agência não encontrada.</div>;

  const myTrips = getAgencyTrips(user.id);
  const myBookings = bookings.filter(b => myTrips.find(t => t.id === b.tripId));
  const totalSales = myBookings.reduce((acc, curr) => acc + curr.totalPrice, 0);
  const totalViews = myTrips.length * 150; // Mock views

  const now = new Date();
  const expires = new Date(myAgency.subscriptionExpiresAt);
  const isSubscriptionActive = myAgency.subscriptionStatus === 'ACTIVE' && expires > now;

  const handleOpenCreate = () => {
    setEditingTripId(null);
    setFormData({ title: '', destination: '', price: 0, category: 'PRAIA', durationDays: 1, included: [], description: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (trip: Trip) => {
    setEditingTripId(trip.id);
    setFormData({ ...trip });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const tripData = {
        ...formData,
        agencyId: user.id,
        images: formData.images && formData.images.length > 0 ? formData.images : ['https://picsum.photos/800/600?random=' + Date.now()],
    } as Trip;

    if (editingTripId) {
        updateTrip(tripData);
        alert('Viagem atualizada com sucesso!');
    } else {
        createTrip({
          ...tripData,
          id: `t${Date.now()}`,
          active: true,
          rating: 0,
          totalReviews: 0,
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          included: formData.included?.length ? formData.included : ['Hospedagem', 'Guia'],
        });
        alert('Viagem criada com sucesso!');
    }
    
    setIsModalOpen(false);
  };

  const handleRenewSubscription = (planId: 'BASIC' | 'PREMIUM') => {
    updateAgencySubscription(user.id, 'ACTIVE', planId);
    alert('Assinatura ativada/renovada com sucesso! Seus anúncios estão visíveis.');
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
           <img src={myAgency.logo} alt="Logo" className="w-16 h-16 rounded-full border border-gray-200 object-cover" />
           <div>
             <h1 className="text-2xl font-bold text-gray-900">{myAgency.name}</h1>
             <p className="text-gray-500 text-sm">Painel de Gestão</p>
           </div>
        </div>
        {!isSubscriptionActive ? (
          <div className="bg-red-50 text-red-700 px-6 py-3 rounded-xl flex items-center font-medium border border-red-100 shadow-sm animate-pulse">
            <AlertTriangle size={20} className="mr-3" />
            <div>
              <p className="font-bold">Assinatura Inativa</p>
              <p className="text-xs">Seus anúncios estão ocultos. Renove agora.</p>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 text-green-700 px-6 py-3 rounded-xl flex items-center font-medium border border-green-100">
            <CheckCircle size={20} className="mr-3" />
             <div>
              <p className="font-bold">Assinatura Ativa</p>
              <p className="text-xs">Vence em {expires.toLocaleDateString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-gray-500 font-medium">Faturamento</h3>
             <div className="p-2 bg-green-100 text-green-600 rounded-lg"><DollarSign size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-gray-900">R$ {totalSales.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-gray-500 font-medium">Visualizações</h3>
             <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><TrendingUp size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalViews}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-gray-500 font-medium">Pacotes Ativos</h3>
             <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Users size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{isSubscriptionActive ? myTrips.length : 0} <span className="text-lg font-normal text-gray-400">/ {myTrips.length}</span></p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('TRIPS')}
          className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${activeTab === 'TRIPS' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Gerenciar Viagens
        </button>
        <button 
           onClick={() => setActiveTab('SUBSCRIPTION')}
           className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${activeTab === 'SUBSCRIPTION' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Assinatura e Planos
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm min-h-[400px]">
        
        {activeTab === 'TRIPS' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Meus Pacotes de Viagem</h2>
              <button 
                onClick={handleOpenCreate}
                disabled={!isSubscriptionActive}
                className={`flex items-center px-4 py-2 rounded-lg text-white font-bold shadow-sm transition-all ${isSubscriptionActive ? 'bg-primary-600 hover:bg-primary-700 hover:shadow' : 'bg-gray-300 cursor-not-allowed'}`}
              >
                {!isSubscriptionActive ? <Lock size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />}
                Criar Novo Pacote
              </button>
            </div>

            {!isSubscriptionActive && (
               <div className="mb-6 bg-yellow-50 border border-yellow-100 p-4 rounded-xl text-yellow-800 text-sm">
                 ⚠️ Sua assinatura está inativa. Você não pode criar ou editar viagens, e seus anúncios atuais não aparecem para os clientes.
               </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider rounded-l-lg">Pacote</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Preço</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status Público</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider rounded-r-lg">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {myTrips.map(trip => (
                    <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-12 w-12 flex-shrink-0">
                            <img className="h-12 w-12 rounded-lg object-cover shadow-sm" src={trip.images[0]} alt="" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-gray-900">{trip.title}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-gray-400"></div> {trip.destination}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        R$ {trip.price.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${isSubscriptionActive && trip.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {isSubscriptionActive && trip.active ? 'Online' : 'Pausado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleOpenEdit(trip)} disabled={!isSubscriptionActive} className={`mr-4 p-2 rounded-lg transition-colors ${isSubscriptionActive ? 'text-primary-600 bg-primary-50 hover:bg-primary-100' : 'text-gray-300 cursor-not-allowed'}`}><Edit size={18} /></button>
                        <button onClick={() => deleteTrip(trip.id)} className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-lg hover:bg-red-100 transition-colors"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {myTrips.length === 0 && (
                <div className="p-12 text-center text-gray-400 bg-gray-50 rounded-xl mt-4 border border-dashed border-gray-200">
                  Você ainda não cadastrou viagens.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'SUBSCRIPTION' && (
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {PLANS.map(plan => (
                <div key={plan.id} className={`relative border rounded-2xl p-8 bg-white flex flex-col transition-all ${myAgency.subscriptionPlan === plan.id && isSubscriptionActive ? 'ring-2 ring-primary-500 border-transparent shadow-lg' : 'border-gray-200 hover:shadow-lg'}`}>
                   {myAgency.subscriptionPlan === plan.id && isSubscriptionActive && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        Seu Plano Atual
                      </div>
                   )}
                   <h4 className="text-xl font-bold text-gray-900">{plan.name}</h4>
                   <div className="mt-4 mb-8">
                     <span className="text-4xl font-extrabold text-gray-900">R$ {plan.price.toFixed(2)}</span>
                     <span className="text-gray-500 font-medium">/mês</span>
                   </div>
                   <button 
                     onClick={() => handleRenewSubscription(plan.id as 'BASIC' | 'PREMIUM')}
                     className={`w-full py-3 rounded-xl font-bold transition-all transform active:scale-95 ${
                        myAgency.subscriptionPlan === plan.id && isSubscriptionActive 
                        ? 'bg-gray-100 text-gray-600' 
                        : 'bg-primary-600 text-white hover:bg-primary-700 shadow-md hover:shadow-lg'
                     }`}
                   >
                     {myAgency.subscriptionPlan === plan.id && isSubscriptionActive ? 'Renovado' : 'Assinar Agora'}
                   </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal for Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl animate-[fadeIn_0.2s_ease-out] relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                <X size={24} />
            </button>
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-bold text-gray-900">{editingTripId ? 'Editar Viagem' : 'Criar Nova Viagem'}</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título do Pacote</label>
                  <input 
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destino</label>
                  <input 
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" 
                    value={formData.destination} 
                    onChange={e => setFormData({...formData, destination: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
                  <input 
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" 
                    type="number"
                    value={formData.price || ''} 
                    onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select 
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value as any})}
                  >
                     {['PRAIA', 'AVENTURA', 'FAMILIA', 'ROMANCE', 'URBANO'].map(c => (
                       <option key={c} value={c}>{c}</option>
                     ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duração (Dias)</label>
                  <input 
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" 
                    type="number"
                    min="1"
                    value={formData.durationDays || 1} 
                    onChange={e => setFormData({...formData, durationDays: Number(e.target.value)})}
                  />
                </div>
                <div className="col-span-2">
                   <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                   <textarea 
                      className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      rows={4}
                      value={formData.description || ''}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                   />
                </div>
              </div>
              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-bold shadow-md hover:bg-primary-700">
                   {editingTripId ? 'Salvar Alterações' : 'Criar Pacote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgencyDashboard;