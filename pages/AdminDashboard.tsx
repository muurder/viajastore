import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { ToggleLeft, ToggleRight, Trash2, MessageCircle } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { agencies, bookings, trips, reviews, updateAgencySubscription, toggleTripStatus, deleteReview } = useData();
  const [activeTab, setActiveTab] = useState<'AGENCIES' | 'TRIPS' | 'REVIEWS'>('AGENCIES');

  if (!user || user.role !== UserRole.ADMIN) return <div>Acesso negado.</div>;

  const totalRevenue = bookings.reduce((acc, curr) => acc + curr.totalPrice, 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
         <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
         <div className="text-sm text-gray-500">Bem-vindo, {user.name}</div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-gray-500 text-sm font-medium">Total Vendas</div>
          <div className="text-2xl font-bold">R$ {totalRevenue.toLocaleString('pt-BR')}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-gray-500 text-sm font-medium">Agências</div>
          <div className="text-2xl font-bold">{agencies.length}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-gray-500 text-sm font-medium">Viagens Totais</div>
          <div className="text-2xl font-bold">{trips.length}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-gray-500 text-sm font-medium">Avaliações</div>
          <div className="text-2xl font-bold">{reviews.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('AGENCIES')} 
          className={`pb-3 px-2 text-sm font-bold whitespace-nowrap ${activeTab === 'AGENCIES' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}
        >
          Gerenciar Agências
        </button>
        <button 
          onClick={() => setActiveTab('TRIPS')} 
          className={`pb-3 px-2 text-sm font-bold whitespace-nowrap ${activeTab === 'TRIPS' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}
        >
          Gerenciar Viagens
        </button>
        <button 
          onClick={() => setActiveTab('REVIEWS')} 
          className={`pb-3 px-2 text-sm font-bold whitespace-nowrap ${activeTab === 'REVIEWS' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}
        >
          Moderar Avaliações
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
        
        {activeTab === 'AGENCIES' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plano</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {agencies.map(agency => (
                  <tr key={agency.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{agency.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agency.subscriptionPlan}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${agency.subscriptionStatus === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {agency.subscriptionStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {agency.subscriptionStatus === 'ACTIVE' ? (
                        <button 
                          onClick={() => updateAgencySubscription(agency.id, 'INACTIVE', agency.subscriptionPlan)}
                          className="text-red-600 hover:text-red-900 font-bold text-xs border border-red-200 px-3 py-1 rounded"
                        >
                          Suspender
                        </button>
                      ) : (
                        <button 
                            onClick={() => updateAgencySubscription(agency.id, 'ACTIVE', agency.subscriptionPlan)}
                            className="text-green-600 hover:text-green-900 font-bold text-xs border border-green-200 px-3 py-1 rounded"
                        >
                            Ativar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'TRIPS' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agência</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preço</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Moderar</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trips.map(trip => {
                  const agency = agencies.find(a => a.id === trip.agencyId);
                  return (
                    <tr key={trip.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{trip.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agency?.name || '---'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R$ {trip.price}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${trip.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {trip.active ? 'Ativo' : 'Suspenso/Pausado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => toggleTripStatus(trip.id)}
                          className="text-gray-500 hover:text-primary-600 transition-colors"
                          title={trip.active ? "Suspender Viagem" : "Ativar Viagem"}
                        >
                          {trip.active ? <ToggleRight size={24} className="text-green-500" /> : <ToggleLeft size={24} className="text-gray-400" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'REVIEWS' && (
          <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Viagem</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nota</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comentário</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reviews.map(review => {
                   const trip = trips.find(t => t.id === review.tripId);
                   return (
                    <tr key={review.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{review.clientName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trip?.title || 'Viagem Removida'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-amber-500">{review.rating}/5</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={review.comment}>{review.comment}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                         <button onClick={() => deleteReview(review.id)} className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-lg"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                   );
                })}
                {reviews.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-500">Nenhuma avaliação para moderar.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;