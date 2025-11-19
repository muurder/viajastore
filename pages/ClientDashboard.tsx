
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole, Booking } from '../types';
import TripCard from '../components/TripCard';
import { User, ShoppingBag, Heart, MapPin, Calendar, Settings, Download, Save, LogOut, X, QrCode } from 'lucide-react';

const ClientDashboard: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const { bookings, getTripById, clients, updateClientProfile } = useData();
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'BOOKINGS' | 'FAVORITES' | 'SETTINGS'>('PROFILE');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null); // For Voucher Modal

  const currentClient = clients.find(c => c.id === user?.id);

  // Settings State
  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: currentClient?.phone || '',
    cpf: currentClient?.cpf || ''
  });

  if (!user || user.role !== UserRole.CLIENT) return <div className="min-h-screen flex items-center justify-center">Acesso negado.</div>;

  const myBookings = bookings.filter(b => b.clientId === user.id);
  
  // Safe navigation for favorites
  const favoriteTrips = currentClient 
    ? currentClient.favorites.map(id => getTripById(id)).filter((t): t is any => t !== undefined) 
    : [];

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ name: editForm.name, email: editForm.email });
    updateClientProfile(user.id, { phone: editForm.phone });
    alert('Perfil atualizado com sucesso!');
  };

  return (
    <div className="max-w-6xl mx-auto py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Minha Área</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center mb-6">
             <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=0D8ABC&color=fff`} alt={user.name} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-primary-50 object-cover" />
             <h2 className="text-xl font-bold text-gray-900 truncate">{user.name}</h2>
             <p className="text-sm text-gray-500 truncate">{user.email}</p>
             <p className="text-xs text-gray-400 mt-1 font-mono">ID: {user.id}</p>
          </div>

          <nav className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {[
                { id: 'PROFILE', icon: User, label: 'Meu Perfil' },
                { id: 'BOOKINGS', icon: ShoppingBag, label: 'Minhas Viagens' },
                { id: 'FAVORITES', icon: Heart, label: 'Favoritos' },
                { id: 'SETTINGS', icon: Settings, label: 'Configurações' }
            ].map((item) => (
                <button 
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center px-6 py-4 text-left text-sm font-medium transition-colors border-l-4 ${activeTab === item.id ? 'bg-primary-50 text-primary-700 border-primary-600' : 'border-transparent text-gray-600 hover:bg-gray-50'}`}
                >
                <item.icon size={18} className="mr-3" /> {item.label}
                </button>
            ))}
            <div className="h-px bg-gray-100 my-1"></div>
            <button onClick={logout} className="w-full flex items-center px-6 py-4 text-left text-sm font-medium text-red-600 hover:bg-red-50 border-l-4 border-transparent transition-colors">
                <LogOut size={18} className="mr-3" /> Sair da Conta
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
           
           {activeTab === 'PROFILE' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
               <div className="flex justify-between items-center mb-6">
                   <h2 className="text-2xl font-bold text-gray-900">Dados Pessoais</h2>
                   <button onClick={() => setActiveTab('SETTINGS')} className="text-primary-600 text-sm font-bold hover:underline">Editar</button>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-gray-50 p-4 rounded-xl">
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome Completo</label>
                   <p className="text-gray-900 font-medium">{user.name}</p>
                 </div>
                 <div className="bg-gray-50 p-4 rounded-xl">
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email</label>
                   <p className="text-gray-900 font-medium">{user.email}</p>
                 </div>
                 <div className="bg-gray-50 p-4 rounded-xl">
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-1">CPF</label>
                   <p className="text-gray-900 font-medium">{currentClient?.cpf || '---'}</p>
                 </div>
                 <div className="bg-gray-50 p-4 rounded-xl">
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Telefone</label>
                   <p className="text-gray-900 font-medium">{currentClient?.phone || '---'}</p>
                 </div>
               </div>

               <div className="mt-10">
                 <h3 className="text-lg font-bold text-gray-900 mb-4">Resumo da Conta</h3>
                 <div className="grid grid-cols-3 gap-4">
                    <div className="border border-gray-100 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-primary-600">{myBookings.length}</p>
                        <p className="text-xs text-gray-500 uppercase font-bold mt-1">Viagens Compradas</p>
                    </div>
                    <div className="border border-gray-100 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-amber-500">{favoriteTrips.length}</p>
                        <p className="text-xs text-gray-500 uppercase font-bold mt-1">Favoritos</p>
                    </div>
                    <div className="border border-gray-100 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-green-500">0</p>
                        <p className="text-xs text-gray-500 uppercase font-bold mt-1">Avaliações Feitas</p>
                    </div>
                 </div>
               </div>
             </div>
           )}

           {activeTab === 'BOOKINGS' && (
             <div className="space-y-6 animate-[fadeIn_0.3s]">
               <h2 className="text-2xl font-bold text-gray-900 mb-4">Minhas Viagens</h2>
               {myBookings.length > 0 ? (
                 myBookings.map(booking => {
                    const trip = getTripById(booking.tripId);
                    if (!trip) return null;
                    return (
                      <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
                        <img src={trip.images[0]} alt={trip.title} className="w-full md:w-48 h-32 object-cover rounded-xl" />
                        <div className="flex-1">
                           <div className="flex justify-between items-start mb-2">
                              <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{trip.title}</h3>
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap ml-2">Confirmado</span>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-y-2 text-sm mb-4">
                             <div className="flex items-center text-gray-600">
                               <MapPin size={16} className="mr-2 text-gray-400" /> {trip.destination}
                             </div>
                             <div className="flex items-center text-gray-600">
                               <Calendar size={16} className="mr-2 text-gray-400" /> 
                               {new Date(trip.startDate).toLocaleDateString()}
                             </div>
                             <div className="text-gray-600 font-medium col-span-2">
                               {booking.passengers} Passageiro(s) • R$ {booking.totalPrice.toLocaleString()}
                             </div>
                           </div>

                           <div className="flex gap-3 mt-auto">
                               <button 
                                onClick={() => setSelectedBooking(booking)}
                                className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold py-2 px-4 rounded-lg flex items-center transition-colors"
                               >
                                <QrCode size={16} className="mr-2" /> Abrir Voucher
                               </button>
                               <button className="text-primary-600 hover:bg-primary-50 text-sm font-bold py-2 px-4 rounded-lg transition-colors">
                                   Avaliar
                               </button>
                           </div>
                        </div>
                      </div>
                    );
                 })
               ) : (
                 <div className="bg-white rounded-2xl p-16 text-center border border-dashed border-gray-200">
                   <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                     <ShoppingBag size={32} className="text-gray-300" />
                   </div>
                   <h3 className="text-lg font-bold text-gray-900">Nenhuma viagem encontrada</h3>
                   <p className="text-gray-500 mb-6">Você ainda não realizou nenhuma compra conosco.</p>
                   <button onClick={() => window.location.href='#/trips'} className="text-primary-600 font-bold hover:underline">Explorar Pacotes</button>
                 </div>
               )}
             </div>
           )}

           {activeTab === 'FAVORITES' && (
             <div className="animate-[fadeIn_0.3s]">
               <h2 className="text-2xl font-bold text-gray-900 mb-6">Meus Favoritos</h2>
               {favoriteTrips.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {favoriteTrips.map(trip => (trip && <TripCard key={trip.id} trip={trip} />))}
                 </div>
               ) : (
                  <div className="bg-white rounded-2xl p-16 text-center border border-dashed border-gray-200">
                   <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Heart size={32} className="text-gray-300" />
                   </div>
                   <h3 className="text-lg font-bold text-gray-900">Lista vazia</h3>
                   <p className="text-gray-500 mb-6">Salve as viagens que você mais gostou para ver depois.</p>
                   <button onClick={() => window.location.href='#/trips'} className="text-primary-600 font-bold hover:underline">Explorar Pacotes</button>
                 </div>
               )}
             </div>
           )}

           {activeTab === 'SETTINGS' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
               <h2 className="text-2xl font-bold text-gray-900 mb-6">Editar Perfil</h2>
               <form onSubmit={handleSaveSettings} className="space-y-6 max-w-lg">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Nome Completo</label>
                    <input 
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                    <input 
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Telefone</label>
                    <input 
                      value={editForm.phone}
                      onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">CPF (Não editável)</label>
                    <input 
                      value={editForm.cpf}
                      disabled
                      className="w-full border border-gray-200 bg-gray-50 rounded-lg p-3 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100">
                    <button type="submit" className="flex items-center justify-center w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-md">
                        <Save className="mr-2" size={18} /> Salvar Alterações
                    </button>
                  </div>
               </form>
             </div>
           )}
        </div>
      </div>

      {/* Voucher Modal */}
      {selectedBooking && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedBooking(null)}>
            <div className="bg-white rounded-3xl max-w-md w-full p-0 overflow-hidden shadow-2xl animate-[scaleIn_0.2s] relative" onClick={e => e.stopPropagation()}>
                <div className="bg-primary-600 p-6 text-white text-center relative">
                    <button onClick={() => setSelectedBooking(null)} className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 p-1 rounded-full"><X size={20}/></button>
                    <h3 className="text-2xl font-bold mb-1">Voucher de Viagem</h3>
                    <p className="text-primary-100 text-sm">Apresente este documento na agência</p>
                </div>
                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="bg-white border-4 border-gray-800 w-48 h-48 mx-auto mb-4 rounded-xl flex items-center justify-center">
                           {/* Mock QR Code */}
                           <QrCode size={120} className="text-gray-800" />
                        </div>
                        <p className="font-mono text-lg font-bold text-gray-800 tracking-widest">{selectedBooking.voucherCode || 'VS-ERROR'}</p>
                        <p className="text-xs text-gray-400 uppercase font-bold mt-1">Código da Reserva</p>
                    </div>
                    
                    <div className="border-t border-dashed border-gray-300 pt-6 space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-500 text-sm">Passageiro</span>
                            <span className="font-bold text-gray-900">{user.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 text-sm">Viagem</span>
                            <span className="font-bold text-gray-900 truncate max-w-[180px]">{getTripById(selectedBooking.tripId)?.title}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 text-sm">Data</span>
                            <span className="font-bold text-gray-900">{getTripById(selectedBooking.tripId)?.startDate ? new Date(getTripById(selectedBooking.tripId)!.startDate).toLocaleDateString() : '---'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 text-sm">Status</span>
                            <span className="text-green-600 font-bold uppercase text-sm bg-green-50 px-2 py-0.5 rounded">Confirmado</span>
                        </div>
                    </div>
                    
                    <button className="w-full mt-8 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 flex items-center justify-center gap-2">
                        <Download size={18} /> Baixar PDF
                    </button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default ClientDashboard;
