import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole, Booking, Address, Trip, Agency } from '../types';
import TripCard from '../components/TripCard';
import { User, ShoppingBag, Heart, MapPin, Calendar, Settings, Download, Save, LogOut, X, QrCode, Trash2, AlertTriangle, Camera, Lock, Shield, Loader, Star, ChevronRight, MessageCircle, Send } from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

// Helper to build WhatsApp link for the agency
const buildAgencyWhatsAppLink = (agency: Agency, booking: Booking, trip: Trip) => {
    if (!agency?.whatsapp) return '#';
    const message = `Olá, ${agency.name}! Tenho uma dúvida sobre minha reserva na ViajaStore:
    
Pacote: *${trip.title}*
Datas: ${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}
Valor: R$ ${booking.totalPrice.toLocaleString()}
Voucher: *${booking.voucherCode}*

Aguardo seu contato.`;
    return `https://wa.me/${agency.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
};

const ClientDashboard: React.FC = () => {
  const { user, updateUser, logout, deleteAccount, uploadImage, updatePassword } = useAuth();
  const { bookings, getTripById, clients, agencies, addReview } = useData();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [reviewingBooking, setReviewingBooking] = useState<Booking | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const navigate = useNavigate();

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
     zipCode: currentClient?.address?.zipCode || '',
     street: currentClient?.address?.street || '',
     number: currentClient?.address?.number || '',
     complement: currentClient?.address?.complement || '',
     district: currentClient?.address?.district || '',
     city: currentClient?.address?.city || '',
     state: currentClient?.address?.state || ''
  });
  
  // Review Modal State
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const { showToast } = useToast();

  if (!user || user?.role !== UserRole.CLIENT) {
    navigate(isMicrositeMode ? `/${agencySlug}/unauthorized` : '/unauthorized');
    return null;
  }

  const myBookings = bookings.filter(b => b.clientId === user.id);
  
  const favoriteIds = dataContextClient?.favorites || [];
  const favoriteTrips = favoriteIds.map((id: string) => getTripById(id)).filter((t): t is Trip => t !== undefined);

  const handleLogout = async () => {
    await logout();
    navigate(isMicrositeMode ? `/${agencySlug}` : '/');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      setUploading(true);
      const url = await uploadImage(e.target.files[0], 'avatars');
      if (url) {
          await updateUser({ avatar: url });
      }
      setUploading(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updateUser({ 
        name: editForm.name, 
        email: editForm.email,
        phone: editForm.phone,
        cpf: editForm.cpf,
        address: addressForm
    });
    if (res.success) showToast('Perfil atualizado com sucesso!', 'success');
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
      id: '', // DB will generate
      tripId: reviewingBooking.tripId,
      agencyId: trip.agencyId,
      clientId: user.id,
      clientName: user.name,
      rating,
      comment,
      date: new Date().toISOString()
    });
    showToast('Avaliação enviada com sucesso!', 'success');
    setReviewingBooking(null);
  };
  
  const handlePrintVoucher = () => {
      window.print();
  };

  // ... (other handlers like password change, delete account, cep)

  const getNavLink = (tab: string) => isMicrositeMode ? `/${agencySlug}/client/${tab}` : `/client/dashboard/${tab}`;
  const getTabClass = (tab: string) => `w-full flex items-center px-6 py-4 text-left text-sm font-medium transition-colors border-l-4 ${activeTab === tab ? 'bg-primary-50 text-primary-700 border-primary-600' : 'border-transparent text-gray-600 hover:bg-gray-50'}`;

  // This CSS will be applied only when printing
  const printStyles = `
    @media print {
      body * {
        visibility: hidden;
      }
      #voucher-to-print, #voucher-to-print * {
        visibility: visible;
      }
      #voucher-to-print {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        margin: 0;
        padding: 0;
        border: none;
        box-shadow: none;
      }
      @page {
        size: A4;
        margin: 20mm;
      }
    }
  `;

  return (
    <>
      <style>{printStyles}</style>
      <div className="max-w-6xl mx-auto py-6">
        {/* ... (Rest of the dashboard JSX) ... */}
        {activeTab === 'BOOKINGS' && (
             <div className="space-y-6 animate-[fadeIn_0.3s]">
               <h2 className="text-2xl font-bold text-gray-900 mb-4">Minhas Viagens</h2>
               {myBookings.length > 0 ? (
                 myBookings.map(booking => {
                    const trip = getTripById(booking.tripId);
                    if (!trip) return null;
                    const isPastTrip = new Date(trip.endDate) < new Date();
                    
                    return (
                      <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
                        <img src={trip.images[0]} alt={trip.title} className="w-full md:w-48 h-32 object-cover rounded-xl" />
                        <div className="flex-1">
                           <div className="flex justify-between items-start">
                               <h3 className="text-lg font-bold text-gray-900 line-clamp-1 mb-2">{trip.title}</h3>
                               <span className="text-xs font-bold bg-green-50 text-green-700 px-2 py-1 rounded-md border border-green-100">Confirmado</span>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-y-2 text-sm mb-4 mt-2">
                             <div className="flex items-center text-gray-600"><MapPin size={16} className="mr-2 text-gray-400" /> {trip.destination}</div>
                             <div className="flex items-center text-gray-600"><Calendar size={16} className="mr-2 text-gray-400" /> {new Date(trip.startDate).toLocaleDateString()}</div>
                           </div>
                           
                           <div className="flex gap-3 mt-auto">
                               <button onClick={() => setSelectedBooking(booking)} className="flex-1 bg-gray-900 text-white text-sm font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-black transition-colors shadow-sm">
                                    <QrCode size={16} /> Ver Voucher
                               </button>
                               {isPastTrip && (
                                   <button onClick={() => handleOpenReviewModal(booking)} className="flex-1 bg-amber-50 text-amber-700 text-sm font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-amber-100 transition-colors border border-amber-100">
                                        <Star size={16} /> Avaliar Experiência
                                   </button>
                               )}
                           </div>
                        </div>
                      </div>
                    );
                 })
               ) : (
                 <div className="bg-white rounded-2xl p-16 text-center border border-dashed border-gray-200">
                   <ShoppingBag size={32} className="text-gray-300 mx-auto mb-4" />
                   <h3 className="text-lg font-bold text-gray-900">Nenhuma viagem encontrada</h3>
                   <p className="text-gray-500 mt-2 text-sm">Suas compras recentes aparecerão aqui em instantes.</p>
                 </div>
               )}
             </div>
           )}
           {activeTab === 'FAVORITES' && (
             <div className="animate-[fadeIn_0.3s]">
               <h2 className="text-2xl font-bold text-gray-900 mb-6">Meus Favoritos ({favoriteTrips.length})</h2>
               {favoriteTrips.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {favoriteTrips.map((trip) => (trip && <TripCard key={trip.id} trip={trip} />))}
                 </div>
               ) : (
                  <div className="bg-white rounded-2xl p-16 text-center border border-dashed border-gray-200">
                   <Heart size={32} className="text-gray-300 mx-auto mb-4" />
                   <h3 className="text-lg font-bold text-gray-900">Lista vazia</h3>
                   <p className="text-gray-500 mt-2">Você ainda não favoritou nenhuma viagem.</p>
                 </div>
               )}
             </div>
           )}
           {/* Other tabs remain the same */}
      </div>
      
      {/* VOUCHER MODAL */}
      {selectedBooking && (() => {
          const trip = getTripById(selectedBooking.tripId);
          const agency = trip ? agencies.find(a => a.id === trip.agencyId) : null;
          const voucherUrl = `${window.location.origin}/#/voucher/${selectedBooking.id}`;
          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(voucherUrl)}`;
          
          if(!trip || !agency) return null;
          
          return (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedBooking(null)}>
                <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative animate-[scaleIn_0.2s]" onClick={e => e.stopPropagation()}>
                    <div id="voucher-to-print">
                        <div className="bg-primary-600 p-6 text-white text-center">
                            <h3 className="text-2xl font-bold">Voucher de Viagem</h3>
                            <p className="text-primary-100 text-sm">{selectedBooking.voucherCode}</p>
                        </div>
                        <div className="p-8">
                            <div className="text-center mb-6">
                                <img src={qrCodeUrl} alt="QR Code do Voucher" className="mx-auto mb-4 border-4 border-gray-100 rounded-lg"/>
                                <p className="font-bold text-gray-900">{user.name}</p>
                                <p className="text-sm text-gray-500 mb-4">{trip.title}</p>
                                <div className="grid grid-cols-2 gap-4 text-left text-sm bg-gray-50 p-4 rounded-lg">
                                    <div><p className="text-xs text-gray-400">Data da Viagem</p><p className="font-bold">{new Date(trip.startDate).toLocaleDateString()}</p></div>
                                    <div><p className="text-xs text-gray-400">Passageiros</p><p className="font-bold">{selectedBooking.passengers}</p></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-8 pt-0">
                         <div className="space-y-3">
                            <a href={buildAgencyWhatsAppLink(agency, selectedBooking, trip)} target="_blank" rel="noopener noreferrer" className="w-full bg-green-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-green-700 transition-colors">
                                <MessageCircle size={18}/> Falar com a Agência
                            </a>
                            <button onClick={handlePrintVoucher} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-black transition-colors">
                                <Download size={18}/> Baixar PDF
                            </button>
                        </div>
                    </div>
                </div>
             </div>
          );
      })()}

      {/* REVIEW MODAL */}
      {reviewingBooking && (() => {
          const trip = getTripById(reviewingBooking.tripId);
          if(!trip) return null;
          return (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setReviewingBooking(null)}>
                <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative animate-[scaleIn_0.2s]" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setReviewingBooking(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
                    <h2 className="text-2xl font-bold mb-2 text-gray-900">Avalie sua experiência</h2>
                    <p className="text-sm text-gray-500 mb-6">Sua opinião sobre a viagem <strong>{trip.title}</strong> é muito importante!</p>
                    <form onSubmit={handleSubmitReview}>
                        <div className="flex items-center justify-center gap-4 mb-6">
                            {[1,2,3,4,5].map(star => (
                                <button type="button" key={star} onClick={() => setRating(star)} className="transition-transform hover:scale-125 focus:outline-none">
                                    <Star size={36} className={`${star <= rating ? 'text-amber-400 fill-current' : 'text-gray-300'}`} />
                                </button>
                            ))}
                        </div>
                        <textarea 
                            className="w-full border border-gray-300 rounded-xl p-4 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4" 
                            placeholder="Conte mais detalhes sobre os passeios, a organização, o guia, etc."
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            required
                        />
                        <button type="submit" className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-primary-700 transition-colors">
                            <Send size={18}/> Enviar Avaliação
                        </button>
                    </form>
                </div>
             </div>
          );
      })()}
    </>
  );
};

export default ClientDashboard;
