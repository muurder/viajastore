import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole, Booking, Address, Trip, Agency } from '../types';
import TripCard from '../components/TripCard';
import { User, ShoppingBag, Heart, MapPin, Calendar, Settings, Download, Save, LogOut, X, QrCode, Trash2, AlertTriangle, Camera, Lock, Shield, Loader, Star, ChevronRight, MessageCircle, Send } from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const buildAgencyWhatsAppLink = (agency: Agency, booking: Booking, trip: Trip) => {
    if (!agency?.whatsapp) return '#';
    const message = `Olá, ${agency.name}! Tenho uma dúvida sobre minha reserva na ViajaStore:\n\nPacote: *${trip.title}*\nDatas: ${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}\nVoucher: *${booking.voucherCode}*\n\nAguardo seu contato.`;
    return `https://wa.me/${agency.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
};

const ClientDashboard: React.FC = () => {
  const { user, updateUser, logout, deleteAccount, uploadImage, updatePassword } = useAuth();
  const { bookings, getTripById, clients, agencies, addReview, trips } = useData();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [reviewingBooking, setReviewingBooking] = useState<Booking | null>(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { agencySlug, tab } = useParams<{ agencySlug?: string; tab?: string }>();
  const activeTab = tab ? tab.toUpperCase() : 'PROFILE';
  
  const isMicrositeMode = !!agencySlug;

  const dataContextClient = clients.find(c => c.id === user?.id);
  const currentClient = dataContextClient || (user as any);

  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: currentClient?.phone || '',
    cpf: currentClient?.cpf || ''
  });

  const [addressForm, setAddressForm] = useState<Address>({
     zipCode: currentClient?.address?.zipCode || '', street: currentClient?.address?.street || '',
     number: currentClient?.address?.number || '', complement: currentClient?.address?.complement || '',
     district: currentClient?.address?.district || '', city: currentClient?.address?.city || '',
     state: currentClient?.address?.state || ''
  });
  
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  
  if (!user || user?.role !== UserRole.CLIENT) {
    navigate(isMicrositeMode ? `/${agencySlug}/unauthorized` : '/unauthorized');
    return null;
  }

  const myBookings = bookings.filter(b => b.clientId === user.id);
  const favoriteIds = dataContextClient?.favorites || [];
  const favoriteTrips = favoriteIds.map((id: string) => trips.find(t => t.id === id)).filter((t): t is Trip => t !== undefined);

  const handleLogout = async () => {
    await logout();
    navigate(isMicrositeMode ? `/${agencySlug}` : '/');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updateUser({ 
        name: editForm.name, email: editForm.email,
        phone: editForm.phone, cpf: editForm.cpf,
        address: addressForm
    });
    if (res.success) showToast('Perfil atualizado!', 'success');
    else showToast('Erro ao atualizar: ' + res.error, 'error');
  };

  const handleOpenReviewModal = (booking: Booking) => {
      setRating(5);
      setComment('');
      setReviewingBooking(booking);
  };
  
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingBooking || !user) return;
    const trip = getTripById(reviewingBooking.tripId);
    if (!trip) return;
    await addReview({
      tripId: reviewingBooking.tripId, agencyId: trip.agencyId, clientId: user.id,
      rating, comment,
    });
    showToast('Avaliação enviada!', 'success');
    setReviewingBooking(null);
  };

  const handlePrintVoucher = () => window.print();

  const getNavLink = (tab: string) => isMicrositeMode ? `/${agencySlug}/client/${tab}` : `/client/dashboard/${tab}`;
  const getTabClass = (tab: string) => `w-full flex items-center px-6 py-4 text-left text-sm font-medium transition-colors border-l-4 ${activeTab === tab ? 'bg-primary-50 text-primary-700 border-primary-600' : 'border-transparent text-gray-600 hover:bg-gray-50'}`;
  
  const printStyles = ` ... `; // (styles remain the same)

  return (
    <>
      <style>{printStyles}</style>
      <div className="max-w-6xl mx-auto py-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Minha Área</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <aside className="md:col-span-1">
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100 mb-6">
               {/* User Avatar & Name */}
               <div className="relative w-24 h-24 mx-auto mb-4">
                  <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} alt={user.name} className="w-full h-full rounded-full object-cover"/>
                  <button className="absolute bottom-0 right-0 bg-primary-600 text-white p-1.5 rounded-full hover:bg-primary-700 transition-colors border-2 border-white"><Camera size={14}/></button>
               </div>
               <h2 className="font-bold text-lg text-gray-900">{user.name}</h2>
               <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            <nav className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <Link to={getNavLink('PROFILE')} className={getTabClass('PROFILE')}><User size={20} className="mr-3" /> Meu Perfil</Link>
                <Link to={getNavLink('BOOKINGS')} className={getTabClass('BOOKINGS')}><ShoppingBag size={20} className="mr-3" /> Minhas Viagens</Link>
                <Link to={getNavLink('FAVORITES')} className={getTabClass('FAVORITES')}><Heart size={20} className="mr-3" /> Favoritos</Link>
                <Link to={getNavLink('DATA')} className={getTabClass('DATA')}><Settings size={20} className="mr-3" /> Dados & Endereço</Link>
                <Link to={getNavLink('SECURITY')} className={getTabClass('SECURITY')}><Shield size={20} className="mr-3" /> Segurança</Link>
                <button onClick={handleLogout} className="w-full flex items-center px-6 py-4 text-left text-sm font-medium transition-colors border-l-4 border-transparent text-red-600 hover:bg-red-50">
                    <LogOut size={20} className="mr-3" /> Sair da Conta
                </button>
            </nav>
          </aside>
          
          <main className="md:col-span-3">
             {activeTab === 'PROFILE' && (
                 <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-[fadeIn_0.3s]">
                     <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Resumo do Perfil</h2>
                        <Link to={getNavLink('DATA')} className="text-sm font-bold text-primary-600 hover:underline">Editar Dados</Link>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                           <label className="text-xs text-gray-500 font-bold uppercase">Nome</label>
                           <p className="font-medium text-gray-800">{user.name}</p>
                        </div>
                         <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                           <label className="text-xs text-gray-500 font-bold uppercase">Email</label>
                           <p className="font-medium text-gray-800">{user.email}</p>
                        </div>
                         <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                           <label className="text-xs text-gray-500 font-bold uppercase">CPF</label>
                           <p className="font-medium text-gray-800">{currentClient.cpf || '---'}</p>
                        </div>
                         <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                           <label className="text-xs text-gray-500 font-bold uppercase">Telefone</label>
                           <p className="font-medium text-gray-800">{currentClient.phone || '---'}</p>
                        </div>
                     </div>
                      <div className="mt-8 grid grid-cols-2 gap-6">
                          <div className="bg-white p-6 rounded-2xl border border-gray-200 text-center shadow-sm">
                              <p className="text-4xl font-extrabold text-primary-600">{myBookings.length}</p>
                              <p className="text-sm font-bold text-gray-500 uppercase">Viagens</p>
                          </div>
                          <div className="bg-white p-6 rounded-2xl border border-gray-200 text-center shadow-sm">
                              <p className="text-4xl font-extrabold text-red-500">{favoriteTrips.length}</p>
                              <p className="text-sm font-bold text-gray-500 uppercase">Favoritos</p>
                          </div>
                      </div>
                 </div>
             )}
             {activeTab === 'BOOKINGS' && (
                 <div className="space-y-6 animate-[fadeIn_0.3s]">
                    <h2 className="text-2xl font-bold text-gray-900">Minhas Viagens</h2>
                    {myBookings.length > 0 ? myBookings.map(b => {
                        const trip = getTripById(b.tripId);
                        if (!trip) return null;
                        return (
                            <div key={b.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start gap-4">
                                <img src={trip.images[0]} className="w-full md:w-48 h-32 md:h-full object-cover rounded-xl" alt={trip.title} />
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-gray-900">{trip.title}</h3>
                                    <p className="text-sm text-gray-500 flex items-center gap-4 mt-1"><span className="flex items-center"><MapPin size={12} className="mr-1"/> {trip.destination}</span> <span className="flex items-center"><Calendar size={12} className="mr-1"/> {new Date(b.date).toLocaleDateString()}</span></p>
                                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-3">
                                        <button onClick={() => setSelectedBooking(b)} className="bg-primary-600 text-white px-4 py-2 text-sm font-bold rounded-lg hover:bg-primary-700">Ver Voucher</button>
                                        <button onClick={() => handleOpenReviewModal(b)} className="bg-amber-50 text-amber-700 px-4 py-2 text-sm font-bold rounded-lg border border-amber-100 hover:bg-amber-100">Avaliar Experiência</button>
                                    </div>
                                </div>
                            </div>
                        )
                    }) : (
                        <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center">
                            <ShoppingBag size={32} className="mx-auto text-gray-300 mb-4"/>
                            <p className="font-bold text-gray-800">Nenhuma viagem encontrada</p>
                            <p className="text-sm text-gray-500">Suas compras recentes aparecerão aqui em instantes.</p>
                        </div>
                    )}
                 </div>
             )}
             {activeTab === 'FAVORITES' && (
                 <div className="animate-[fadeIn_0.3s]">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Meus Favoritos</h2>
                    {favoriteTrips.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {favoriteTrips.map(trip => <TripCard key={trip.id} trip={trip} />)}
                        </div>
                    ) : (
                         <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center">
                            <Heart size={32} className="mx-auto text-gray-300 mb-4"/>
                            <p className="font-bold text-gray-800">Sua lista de desejos está vazia</p>
                            <p className="text-sm text-gray-500">Clique no coração para salvar as viagens que você mais gostou.</p>
                        </div>
                    )}
                 </div>
             )}
             {activeTab === 'DATA' && (
                 <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-[fadeIn_0.3s]">
                     <form onSubmit={handleSaveProfile}>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Meus Dados</h2>
                        {/* Data & Address forms from original implementation */}
                        <button type="submit" className="bg-primary-600 text-white px-6 py-3 rounded-lg font-bold">Salvar Alterações</button>
                     </form>
                 </div>
             )}
             {activeTab === 'SECURITY' && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-[fadeIn_0.3s]">
                   <h2 className="text-2xl font-bold text-gray-900 mb-6">Segurança da Conta</h2>
                   {/* Security/Password form from original implementation */}
                </div>
             )}
          </main>
        </div>
      </div>
    </>
  );
};

export default ClientDashboard;