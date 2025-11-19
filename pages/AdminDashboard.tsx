
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { ToggleLeft, ToggleRight, Trash2, MessageCircle, Users, Briefcase, BarChart, AlertOctagon } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { agencies, bookings, trips, reviews, clients, updateAgencySubscription, toggleTripStatus, deleteReview } = useData();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'AGENCIES' | 'USERS' | 'TRIPS' | 'REVIEWS'>('OVERVIEW');

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

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-8">
         <div>
            <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
            <p className="text-gray-500">Visão geral do marketplace</p>
         </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 inline-flex mb-8">
          {[
              {id: 'OVERVIEW', label: 'Visão Geral'}, 
              {id: 'AGENCIES', label: 'Agências'},
              {id: 'USERS', label: 'Usuários'},
              {id: 'TRIPS', label: 'Viagens'},
              {id: 'REVIEWS', label: 'Avaliações'}
          ].map(tab => (
            <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                {tab.label}
            </button>
          ))}
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
                             <td className="px-6 py-4 text-right">
                                 <button 
                                     onClick={() => handleToggleAgency(agency.id, agency.subscriptionStatus, agency.subscriptionPlan)}
                                     className={`text-xs font-bold px-3 py-1 rounded border ${agency.subscriptionStatus === 'ACTIVE' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                                 >
                                     {agency.subscriptionStatus === 'ACTIVE' ? 'Suspender' : 'Ativar'}
                                 </button>
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
                         <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Cadastro</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                     {clients.map(c => (
                         <tr key={c.id} className="hover:bg-gray-50">
                             <td className="px-6 py-4 font-bold text-gray-900">{c.name}</td>
                             <td className="px-6 py-4 text-gray-600 text-sm">{c.email}</td>
                             <td className="px-6 py-4 text-gray-600 text-sm">{c.cpf || '---'}</td>
                             <td className="px-6 py-4 text-right text-gray-400 text-sm">{new Date(c.createdAt || Date.now()).toLocaleDateString()}</td>
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
    </div>
  );
};

export default AdminDashboard;
