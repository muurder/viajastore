import React from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { agencies, bookings, trips, updateAgencySubscription } = useData();

  if (!user || user.role !== UserRole.ADMIN) return <div>Acesso negado.</div>;

  const totalRevenue = bookings.reduce((acc, curr) => acc + curr.totalPrice, 0);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Administração</h1>

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

      {/* Agency Management */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-bold text-gray-900">Gerenciar Agências</h3>
        </div>
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
                       className="text-red-600 hover:text-red-900 font-bold"
                     >
                       Suspender
                     </button>
                   ) : (
                     <button 
                        onClick={() => updateAgencySubscription(agency.id, 'ACTIVE', agency.subscriptionPlan)}
                        className="text-green-600 hover:text-green-900 font-bold"
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
    </div>
  );
};

export default AdminDashboard;