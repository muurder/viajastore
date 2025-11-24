import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole, Booking } from '../types';
import { QrCode, Star, MapPin, Calendar, CreditCard, User, LogOut, ShoppingBag, Settings, X, ChevronRight, Ticket, Home } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';

const ClientDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const { bookings, trips } = useData();
    const { tab, agencySlug } = useParams<{ tab?: string; agencySlug?: string }>();
    const navigate = useNavigate();
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

    const activeTab = tab || 'BOOKINGS'; // Default to BOOKINGS

    if (!user || user.role !== UserRole.CLIENT) {
         return <div className="min-h-screen flex items-center justify-center">Acesso restrito.</div>;
    }

    // Filter bookings for this client
    // If inside a microsite (agencySlug), we could filter only bookings for that agency, 
    // but usually a client dashboard shows all their bookings. 
    // For consistency with the "Microsite" feel, we might highlight agency-specific ones, 
    // but showing all is safer for the user.
    const myBookings = bookings.filter(b => b.clientId === user.id);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const dashboardBaseUrl = agencySlug ? `/${agencySlug}/client` : '/client/dashboard';

    return (
        <div className="max-w-7xl mx-auto pb-12 pt-4">
             <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                 {/* Sidebar */}
                 <div className="lg:col-span-1">
                     <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                         <div className="text-center mb-6">
                             <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold text-gray-500">
                                 {user.name.charAt(0).toUpperCase()}
                             </div>
                             <h2 className="font-bold text-gray-900">{user.name}</h2>
                             <p className="text-xs text-gray-500">{user.email}</p>
                         </div>
                         
                         <nav className="space-y-2">
                             <Link 
                                to={`${dashboardBaseUrl}/BOOKINGS`}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'BOOKINGS' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
                             >
                                 <ShoppingBag size={18}/> Minhas Viagens
                             </Link>
                             <Link 
                                to={`${dashboardBaseUrl}/PROFILE`}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'PROFILE' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
                             >
                                 <User size={18}/> Meus Dados
                             </Link>
                             <button 
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-600 hover:bg-red-50 transition-colors"
                             >
                                 <LogOut size={18}/> Sair
                             </button>
                         </nav>
                     </div>
                 </div>

                 {/* Main Content */}
                 <div className="lg:col-span-3">
                     {activeTab === 'BOOKINGS' && (
                         <div className="space-y-6 animate-[fadeIn_0.3s]">
                             <h1 className="text-2xl font-bold text-gray-900 mb-6">Minhas Viagens</h1>
                             
                             {myBookings.length > 0 ? (
                                 myBookings.map(booking => {
                                     const trip = trips.find(t => t.id === booking.tripId);
                                     if (!trip) return null;
                                     
                                     const tripLink = agencySlug 
                                        ? `/${agencySlug}/viagem/${trip.slug || trip.id}` 
                                        : `/viagem/${trip.slug || trip.id}`;

                                     return (
                                        <div key={booking.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                            <div className="flex flex-col md:flex-row">
                                                <div className="w-full md:w-48 h-32 md:h-auto relative">
                                                    <img src={trip.images[0]} alt={trip.title} className="w-full h-full object-cover" />
                                                    <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide">
                                                        Confirmado
                                                    </div>
                                                </div>
                                                <div className="p-5 flex-1 flex flex-col md:flex-row justify-between gap-4">
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-lg text-gray-900 mb-1">{trip.title}</h3>
                                                        <p className="text-sm text-gray-500 mb-3 flex items-center gap-1"><MapPin size={14}/> {trip.destination}</p>
                                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md border border-gray-100"><Calendar size={14}/> {new Date(trip.startDate).toLocaleDateString()}</span>
                                                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md border border-gray-100"><User size={14}/> {booking.passengers} pessoa(s)</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex flex-col justify-center gap-2 min-w-[180px]">
                                                        <button 
                                                            onClick={() => setSelectedBooking(booking)} 
                                                            className="flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-black transition-colors"
                                                        >
                                                            <QrCode size={16}/> Ver Voucher
                                                        </button>
                                                        <Link 
                                                            to={tripLink}
                                                            className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors"
                                                        >
                                                            <Star size={16}/> Avaliar / Detalhes
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                     );
                                 })
                             ) : (
                                 <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                                     <Ticket className="mx-auto text-gray-300 mb-4" size={48}/>
                                     <h3 className="text-lg font-bold text-gray-900">Nenhuma viagem encontrada</h3>
                                     <p className="text-gray-500 mb-6">Você ainda não realizou nenhuma compra.</p>
                                     <Link to="/" className="text-primary-600 font-bold hover:underline">Explorar Pacotes</Link>
                                 </div>
                             )}
                         </div>
                     )}

                     {activeTab === 'PROFILE' && (
                         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
                             <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Settings size={20}/> Meus Dados</h2>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <div>
                                     <label className="block text-sm font-bold text-gray-500 mb-1">Nome Completo</label>
                                     <input value={user.name} disabled className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-600"/>
                                 </div>
                                 <div>
                                     <label className="block text-sm font-bold text-gray-500 mb-1">Email</label>
                                     <input value={user.email} disabled className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-600"/>
                                 </div>
                                 <div>
                                     <label className="block text-sm font-bold text-gray-500 mb-1">CPF</label>
                                     <input value={(user as any).cpf || '---'} disabled className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-600"/>
                                 </div>
                                 <div>
                                     <label className="block text-sm font-bold text-gray-500 mb-1">Telefone</label>
                                     <input value={(user as any).phone || '---'} disabled className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-600"/>
                                 </div>
                             </div>
                             <div className="mt-6 pt-6 border-t border-gray-100">
                                 <button disabled className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold opacity-50 cursor-not-allowed">
                                     Editar Dados (Em breve)
                                 </button>
                             </div>
                         </div>
                     )}
                 </div>
             </div>

             {/* Voucher Modal */}
             {selectedBooking && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
                     <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative animate-[scaleIn_0.2s]">
                         <button onClick={() => setSelectedBooking(null)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors z-10"><X size={18}/></button>
                         
                         <div className="bg-primary-600 p-8 text-center text-white relative overflow-hidden">
                             <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                             <h3 className="text-2xl font-bold relative z-10 mb-1">Voucher de Viagem</h3>
                             <p className="text-primary-100 text-sm relative z-10">Apresente este código na agência</p>
                         </div>
                         
                         <div className="p-8 text-center">
                             <div className="bg-white border-2 border-gray-900 p-4 rounded-xl inline-block mb-6 shadow-sm">
                                <QrCode size={120} />
                             </div>
                             <p className="text-xs text-gray-400 uppercase font-bold tracking-widest mb-2">Código da Reserva</p>
                             <p className="text-3xl font-mono font-bold text-gray-900 tracking-wider mb-6">{selectedBooking.voucherCode}</p>
                             
                             <div className="bg-gray-50 rounded-xl p-4 text-left border border-gray-100">
                                 <p className="text-xs text-gray-500 mb-1">Pacote</p>
                                 <p className="font-bold text-gray-900 mb-3">{trips.find(t => t.id === selectedBooking.tripId)?.title}</p>
                                 
                                 <div className="flex justify-between">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Passageiros</p>
                                        <p className="font-bold text-gray-900">{selectedBooking.passengers}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 mb-1">Data</p>
                                        <p className="font-bold text-gray-900">{new Date(selectedBooking.date).toLocaleDateString()}</p>
                                    </div>
                                 </div>
                             </div>
                         </div>
                         
                         <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                             <button onClick={() => setSelectedBooking(null)} className="text-primary-600 font-bold text-sm hover:underline">Fechar</button>
                         </div>
                     </div>
                 </div>
             )}
        </div>
    );
};

export default ClientDashboard;