import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Trip, UserRole } from '../types';
import { PLANS } from '../services/mockData';
import { Plus, Edit, Trash2, TrendingUp, Users, DollarSign, AlertTriangle } from 'lucide-react';

const AgencyDashboard: React.FC = () => {
  const { user } = useAuth();
  const { getAgencyTrips, updateAgencySubscription, createTrip, deleteTrip, agencies, bookings } = useData();
  
  // States for Tab Navigation
  const [activeTab, setActiveTab] = useState<'TRIPS' | 'STATS' | 'SUBSCRIPTION'>('TRIPS');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Create Trip Form State
  const [newTrip, setNewTrip] = useState<Partial<Trip>>({
    title: '', destination: '', price: 0, category: 'PRAIA', durationDays: 1, included: []
  });

  if (!user || user.role !== UserRole.AGENCY) return <div>Acesso negado.</div>;

  const myAgency = agencies.find(a => a.id === user.id);
  if (!myAgency) return <div>Agência não encontrada.</div>;

  const myTrips = getAgencyTrips(user.id);
  
  // Mock Stats Calculation
  const myBookings = bookings.filter(b => myTrips.find(t => t.id === b.tripId));
  const totalSales = myBookings.reduce((acc, curr) => acc + curr.totalPrice, 0);
  const totalViews = myTrips.length * 150; // Mock views

  const isSubscriptionActive = myAgency.subscriptionStatus === 'ACTIVE' && new Date(myAgency.subscriptionExpiresAt) > new Date();

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrip.title) return;
    
    createTrip({
      ...newTrip,
      id: `t${Date.now()}`,
      agencyId: user.id,
      active: true,
      rating: 0,
      totalReviews: 0,
      images: ['https://picsum.photos/800/600?random=' + Date.now()],
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      description: 'Descrição automática para teste.',
    } as Trip);
    
    setIsCreateModalOpen(false);
    setNewTrip({ title: '', destination: '', price: 0, category: 'PRAIA' });
  };

  const handleRenewSubscription = (planId: 'BASIC' | 'PREMIUM') => {
    updateAgencySubscription(user.id, 'ACTIVE', planId);
    alert('Assinatura renovada com sucesso!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel da Agência</h1>
          <p className="text-gray-500">Bem-vindo, {myAgency.name}</p>
        </div>
        {!isSubscriptionActive && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg flex items-center font-medium">
            <AlertTriangle size={18} className="mr-2" />
            Assinatura Vencida - Seus anúncios estão pausados!
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-gray-500 font-medium">Vendas Totais</h3>
             <div className="p-2 bg-green-100 text-green-600 rounded-lg"><DollarSign size={20} /></div>
          </div>
          <p className="text-2xl font-bold">R$ {totalSales.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-gray-500 font-medium">Visualizações</h3>
             <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><TrendingUp size={20} /></div>
          </div>
          <p className="text-2xl font-bold">{totalViews}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-gray-500 font-medium">Pacotes Ativos</h3>
             <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Users size={20} /></div>
          </div>
          <p className="text-2xl font-bold">{isSubscriptionActive ? myTrips.length : 0} <span className="text-sm font-normal text-gray-400">/ {myTrips.length} total</span></p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button 
            onClick={() => setActiveTab('TRIPS')}
            className={`${activeTab === 'TRIPS' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Meus Pacotes
          </button>
          <button 
             onClick={() => setActiveTab('SUBSCRIPTION')}
             className={`${activeTab === 'SUBSCRIPTION' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Assinatura
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'TRIPS' && (
        <div>
          <div className="flex justify-end mb-4">
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              disabled={!isSubscriptionActive}
              className={`flex items-center px-4 py-2 rounded-lg text-white font-medium ${isSubscriptionActive ? 'bg-primary-600 hover:bg-primary-700' : 'bg-gray-300 cursor-not-allowed'}`}
            >
              <Plus size={18} className="mr-2" /> Criar Pacote
            </button>
          </div>

          <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pacote</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preço</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {myTrips.map(trip => (
                  <tr key={trip.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <img className="h-10 w-10 rounded-lg object-cover" src={trip.images[0]} alt="" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{trip.title}</div>
                          <div className="text-sm text-gray-500">{trip.destination}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      R$ {trip.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isSubscriptionActive && trip.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {isSubscriptionActive && trip.active ? 'Ativo' : 'Pausado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-primary-600 hover:text-primary-900 mr-3"><Edit size={18} /></button>
                      <button onClick={() => deleteTrip(trip.id)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {myTrips.length === 0 && (
              <div className="p-6 text-center text-gray-500">Você ainda não cadastrou viagens.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'SUBSCRIPTION' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-bold mb-4">Status Atual</h2>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
               <div>
                 <p className="text-sm text-gray-500">Plano Atual</p>
                 <p className="font-bold text-xl">{myAgency.subscriptionPlan === 'BASIC' ? 'Básico' : 'Premium'}</p>
               </div>
               <div>
                 <p className="text-sm text-gray-500">Expira em</p>
                 <p className="font-bold text-xl">{new Date(myAgency.subscriptionExpiresAt).toLocaleDateString('pt-BR')}</p>
               </div>
               <div>
                 <p className="text-sm text-gray-500">Status</p>
                 <span className={`px-3 py-1 rounded-full text-sm font-bold ${isSubscriptionActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {isSubscriptionActive ? 'Ativo' : 'Vencido'}
                 </span>
               </div>
            </div>
          </div>

          <h3 className="text-xl font-bold mb-6 text-center">Planos Disponíveis</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {PLANS.map(plan => (
              <div key={plan.id} className={`border rounded-xl p-6 bg-white flex flex-col ${myAgency.subscriptionPlan === plan.id ? 'ring-2 ring-primary-500 border-transparent' : 'border-gray-200'}`}>
                 <h4 className="text-lg font-bold text-gray-900">{plan.name}</h4>
                 <div className="mt-2 mb-6">
                   <span className="text-3xl font-bold">R$ {plan.price.toFixed(2)}</span>
                   <span className="text-gray-500">/mês</span>
                 </div>
                 <ul className="space-y-3 mb-8 flex-1">
                   {plan.features.map((feat, idx) => (
                     <li key={idx} className="flex items-center text-gray-600 text-sm">
                       <div className="h-1.5 w-1.5 rounded-full bg-primary-500 mr-2"></div>
                       {feat}
                     </li>
                   ))}
                 </ul>
                 <button 
                   onClick={() => handleRenewSubscription(plan.id as 'BASIC' | 'PREMIUM')}
                   className="w-full py-2 rounded-lg border border-primary-600 text-primary-600 font-bold hover:bg-primary-50 transition-colors"
                 >
                   {myAgency.subscriptionPlan === plan.id && isSubscriptionActive ? 'Plano Atual' : 'Assinar Agora'}
                 </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Criar Nova Viagem</h2>
            <form onSubmit={handleCreateTrip} className="space-y-4">
              <input 
                className="w-full border p-2 rounded" 
                placeholder="Título da Viagem" 
                value={newTrip.title} 
                onChange={e => setNewTrip({...newTrip, title: e.target.value})}
              />
              <input 
                className="w-full border p-2 rounded" 
                placeholder="Destino" 
                value={newTrip.destination} 
                onChange={e => setNewTrip({...newTrip, destination: e.target.value})}
              />
              <input 
                className="w-full border p-2 rounded" 
                placeholder="Preço" 
                type="number"
                value={newTrip.price || ''} 
                onChange={e => setNewTrip({...newTrip, price: Number(e.target.value)})}
              />
              <select 
                className="w-full border p-2 rounded"
                value={newTrip.category}
                onChange={e => setNewTrip({...newTrip, category: e.target.value as any})}
              >
                 {['PRAIA', 'AVENTURA', 'FAMILIA', 'ROMANCE', 'URBANO'].map(c => (
                   <option key={c} value={c}>{c}</option>
                 ))}
              </select>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-2 border rounded text-gray-600">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded font-bold">Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgencyDashboard;