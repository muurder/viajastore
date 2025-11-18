import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { agencies, bookings, trips, updateAgencySubscription, toggleTripStatus } = useData();
  const [activeTab, setActiveTab] = useState<'AGENCIES' | 'TRIPS'>('AGENCIES');

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
          <div className="text-gray-500 text-sm font-medium">Reservas</div>
          <div className="text-2xl font-bold">{bookings.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('AGENCIES')} 
          className={`pb-3 px-2 text-sm font-bold ${activeTab === 'AGENCIES' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}
        >
          Gerenciar Agências
        </button>
        <button 
          onClick={() => setActiveTab('TRIPS')} 
          className={`pb-3 px-2 text-sm font-bold ${activeTab === 'TRIPS' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}
        >
          Gerenciar Viagens
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        {activeTab === 'AGENCIES' && (
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
        )}

        {activeTab === 'TRIPS' && (
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
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;