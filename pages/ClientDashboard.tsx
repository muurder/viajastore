import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole } from '../types';
import TripCard from '../components/TripCard';
import { User, ShoppingBag, Heart, MapPin, Calendar, Settings, Download, Save } from 'lucide-react';

const ClientDashboard: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { bookings, getTripById, clients, updateClientProfile } = useData();
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'BOOKINGS' | 'FAVORITES' | 'SETTINGS'>('PROFILE');

  // Settings State
  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: (user as any)?.phone || '',
  });

  if (!user || user.role !== UserRole.CLIENT) return <div className="p-8 text-center">Acesso negado.</div>;

  const myBookings = bookings.filter(b => b.clientId === user.id);
  const currentClient = clients.find(c => c.id === user.id);
  const favoriteTrips = currentClient ? currentClient.favorites.map(id => getTripById(id)).filter(t => t !== undefined) : [];

  const handleDownloadVoucher = () => {
    alert("Voucher baixado com sucesso! (Simulação)");
  }

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ name: editForm.name, email: editForm.email });
    updateClientProfile(user.id, { phone: editForm.phone });
    alert('Perfil atualizado com sucesso!');
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Sidebar Navigation */}
        <div className="col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center mb-6">
             <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=0D8ABC&color=fff`} alt={user.name} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-primary-50" />
             <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
             <p className="text-sm text-gray-500">{user.email}</p>
          </div>

          <nav className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button 
              onClick={() => setActiveTab('PROFILE')}
              className={`w-full flex items-center px-6 py-4 text-left text-sm font-medium transition-colors ${activeTab === 'PROFILE' ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <User size={18} className="mr-3" /> Meu Perfil
            </button>
            <button 
              onClick={() => setActiveTab('BOOKINGS')}
              className={`w-full flex items-center px-6 py-4 text-left text-sm font-medium transition-colors ${activeTab === 'BOOKINGS' ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <ShoppingBag size={18} className="mr-3" /> Minhas Compras
            </button>
            <button 
              onClick={() => setActiveTab('FAVORITES')}
              className={`w-full flex items-center px-6 py-4 text-left text-sm font-medium transition-colors ${activeTab === 'FAVORITES' ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Heart size={18} className="mr-3" /> Favoritos
            </button>
            <button 
              onClick={() => setActiveTab('SETTINGS')}
              className={`w-full flex items-center px-6 py-4 text-left text-sm font-medium transition-colors ${activeTab === 'SETTINGS' ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Settings size={18} className="mr-3" /> Configurações
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="col-span-1 md:col-span-3">
           
           {activeTab === 'PROFILE' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
               <h2 className="text-2xl font-bold text-gray-900 mb-6">Dados Pessoais</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-sm font-medium text-gray-500 mb-1">Nome Completo</label>
                   <input disabled value={user.name} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-800" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                   <input disabled value={user.email} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-800" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-500 mb-1">CPF</label>
                   <input disabled value={(currentClient as any)?.cpf || '---'} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-800" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-500 mb-1">Telefone</label>
                   <input disabled value={(currentClient as any)?.phone || '---'} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-800" />
                 </div>
               </div>
               <div className="mt-8 flex justify-end">
                 <button onClick={() => setActiveTab('SETTINGS')} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">Editar Perfil</button>
               </div>
             </div>
           )}

           {activeTab === 'BOOKINGS' && (
             <div className="space-y-6">
               <h2 className="text-2xl font-bold text-gray-900">Minhas Viagens</h2>
               {myBookings.length > 0 ? (
                 myBookings.map(booking => {
                    const trip = getTripById(booking.tripId);
                    if (!trip) return null;
                    return (
                      <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6">
                        <img src={trip.images[0]} alt={trip.title} className="w-full md:w-48 h-32 object-cover rounded-xl" />
                        <div className="flex-1">
                           <div className="flex justify-between items-start">
                              <div>
                                <h3 className="text-lg font-bold text-gray-900">{trip.title}</h3>
                                <p className="text-gray-500 text-sm flex items-center mt-1"><MapPin size={14} className="mr-1" /> {trip.destination}</p>
                              </div>
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase">Confirmado</span>
                           </div>
                           
                           <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                             <div className="flex items-center text-gray-600">
                               <Calendar size={16} className="mr-2 text-primary-500" /> 
                               {new Date(trip.startDate).toLocaleDateString()}
                             </div>
                             <div className="text-gray-600 font-medium">
                               {booking.passengers} Passageiro(s)
                             </div>
                           </div>
                        </div>
                        <div className="flex flex-col justify-between items-end border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                           <div className="text-right">
                             <p className="text-sm text-gray-500">Total Pago</p>
                             <p className="text-xl font-bold text-gray-900">R$ {booking.totalPrice}</p>
                           </div>
                           <button 
                            onClick={handleDownloadVoucher}
                            className="mt-4 text-primary-600 text-sm font-bold hover:underline flex items-center"
                           >
                            <Download size={16} className="mr-1" /> Ver Voucher
                           </button>
                        </div>
                      </div>
                    );
                 })
               ) : (
                 <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
                   <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
                   <p className="text-gray-500">Você ainda não comprou nenhuma viagem.</p>
                 </div>
               )}
             </div>
           )}

           {activeTab === 'FAVORITES' && (
             <div className="space-y-6">
               <h2 className="text-2xl font-bold text-gray-900">Meus Favoritos</h2>
               {favoriteTrips.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   {favoriteTrips.map(trip => (trip && <TripCard key={trip.id} trip={trip} />))}
                 </div>
               ) : (
                  <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
                   <Heart size={48} className="mx-auto text-gray-300 mb-4" />
                   <p className="text-gray-500">Você não favoritou nenhuma viagem ainda.</p>
                 </div>
               )}
             </div>
           )}

           {activeTab === 'SETTINGS' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
               <h2 className="text-2xl font-bold text-gray-900 mb-6">Configurações da Conta</h2>
               <form onSubmit={handleSaveSettings} className="space-y-6 max-w-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                    <input 
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input 
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                    <input 
                      value={editForm.phone}
                      onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  <button type="submit" className="flex items-center justify-center w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 transition-colors">
                    <Save className="mr-2" size={18} /> Salvar Alterações
                  </button>
               </form>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;