
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Booking, Agency, Trip } from '../types';
import { MapPin, Calendar, Clock, Star, Share2, Heart, Check, X, ChevronDown, ChevronUp, User, ShoppingBag } from 'lucide-react';
import { buildWhatsAppLink } from '../utils/whatsapp';

const TripDetails: React.FC = () => {
  const { slug, agencySlug } = useParams<{ slug: string; agencySlug?: string }>();
  const navigate = useNavigate();
  const { getTripBySlug, getTripById, getAgencyBySlug, addBooking, toggleFavorite, clients } = useData();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [trip, setTrip] = useState<Trip | undefined>(undefined);
  const [agency, setAgency] = useState<Agency | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [passengers, setPassengers] = useState(1);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isBookingProcessing, setIsBookingProcessing] = useState(false);

  useEffect(() => {
    const loadData = () => {
      setLoading(true);
      let foundTrip = getTripBySlug(slug || '');
      if (!foundTrip && slug) {
          foundTrip = getTripById(slug);
      }

      if (foundTrip) {
        setTrip(foundTrip);
        if (agencySlug) {
            const foundAgency = getAgencyBySlug(agencySlug);
            setAgency(foundAgency);
        } else {
            // Find agency from data context if not in params
            // Assuming getAgencyBySlug or we need to find it from agencies list in DataContext
            // For now, we will rely on DataContext providing agency details inside trip if possible, 
            // or fetch it separately. Since we don't have getAgencyById exposed directly in the interface used here easily,
            // we will fetch it via the trip's agencyId if possible.
            // However, the component needs to be robust.
        }
      }
      setLoading(false);
    };
    loadData();
  }, [slug, agencySlug, getTripBySlug, getTripById, getAgencyBySlug]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Viagem não encontrada</h2>
        <button onClick={() => navigate(-1)} className="text-primary-600 font-bold hover:underline">Voltar</button>
      </div>
    );
  }

  const totalPrice = trip.price * passengers;
  const whatsappLink = buildWhatsAppLink(agency?.whatsapp, trip);
  const clientData = clients.find(c => c.id === user?.id);
  const isFavorite = clientData?.favorites?.includes(trip.id);

  const handleFavorite = () => {
      if (!user) {
          showToast('Faça login para favoritar.', 'info');
          return;
      }
      if (user.role !== 'CLIENT') {
          showToast('Apenas viajantes podem favoritar.', 'warning');
          return;
      }
      toggleFavorite(trip.id, user.id);
  };

  const handleBooking = async () => {
      if (!user) {
          showToast('Faça login para reservar.', 'info');
          navigate('/#login');
          return;
      }
      if (user.role !== 'CLIENT') {
          showToast('Apenas viajantes podem fazer reservas.', 'warning');
          return;
      }

      setIsBookingProcessing(true); 
      
      try {
        const newBookingId = crypto.randomUUID();
        const voucherCode = `VS-${Math.floor(Math.random() * 100000)}`;

        const bookingData: Booking = {
            id: newBookingId,
            tripId: trip.id,
            clientId: user.id,
            date: new Date().toISOString(),
            status: 'CONFIRMED', 
            totalPrice: totalPrice,
            passengers: passengers,
            voucherCode: voucherCode,
            paymentMethod: 'PIX',
            _trip: trip, 
            _agency: agency 
        };

        const createdBooking = await addBooking(bookingData); 

        setIsBookingModalOpen(false);
        showToast('Reserva realizada com sucesso!', 'success');
        
        // Navigate immediately
        const successLink = agencySlug 
          ? `/${agencySlug}/checkout/success` 
          : `/checkout/success`;
          
        navigate(successLink, { state: { booking: createdBooking } });

      } catch (error: any) {
        showToast(`Erro ao criar reserva: ${error.message || 'Erro desconhecido'}`, 'error');
        console.error("Booking failed:", error);
      } finally {
        setIsBookingProcessing(false);
      }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 pt-6 px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb / Back */}
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-900 mb-6 font-medium transition-colors">
        <ChevronDown className="rotate-90 mr-1" size={20} /> Voltar
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Images & Info */}
        <div className="lg:col-span-2 space-y-8">
          {/* Gallery */}
          <div className="space-y-4">
            <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden shadow-sm relative group">
              <img 
                src={trip.images[activeImageIndex] || 'https://placehold.co/800x600?text=Sem+Imagem'} 
                alt={trip.title} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
              />
              <button onClick={handleFavorite} className={`absolute top-4 right-4 p-3 rounded-full bg-white shadow-md transition-transform hover:scale-110 ${isFavorite ? 'text-red-500' : 'text-gray-400'}`}>
                  <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
              </button>
            </div>
            {trip.images.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {trip.images.map((img, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setActiveImageIndex(idx)}
                    className={`flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-all ${activeImageIndex === idx ? 'border-primary-600 ring-2 ring-primary-100' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title & Stats */}
          <div>
             <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">{trip.title}</h1>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center"><MapPin size={16} className="mr-1"/> {trip.destination}</span>
                        <span className="flex items-center"><Clock size={16} className="mr-1"/> {trip.durationDays} dias</span>
                        <span className="flex items-center text-amber-500 font-bold"><Star size={16} className="mr-1 fill-current"/> {trip.tripRating?.toFixed(1) || '5.0'} <span className="text-gray-400 font-normal ml-1">({trip.tripTotalReviews || 0} avaliações)</span></span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200" title="Compartilhar"><Share2 size={20}/></button>
                </div>
             </div>
             
             {/* Tags */}
             <div className="flex flex-wrap gap-2 mb-6">
                 <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-bold uppercase tracking-wide">{trip.category.replace('_', ' ')}</span>
                 {trip.tags.map(tag => (
                     <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">{tag}</span>
                 ))}
             </div>

             <div className="prose prose-blue max-w-none text-gray-600 leading-relaxed">
                 <h3 className="text-xl font-bold text-gray-900 mb-3">Sobre a viagem</h3>
                 <p className="whitespace-pre-line">{trip.description}</p>
             </div>
          </div>

          {/* Itinerary */}
          {trip.itinerary && trip.itinerary.length > 0 && (
              <div className="border-t border-gray-200 pt-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Roteiro</h3>
                  <div className="space-y-4">
                      {trip.itinerary.map((day) => (
                          <div key={day.day} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                              <h4 className="font-bold text-primary-700 mb-2 flex items-center">
                                  <span className="bg-primary-100 w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">{day.day}</span>
                                  {day.title}
                              </h4>
                              <p className="text-sm text-gray-600 ml-8">{day.description}</p>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* Included / Not Included */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-200 pt-8">
              <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Check size={20} className="text-green-500"/> O que está incluso</h3>
                  <ul className="space-y-2">
                      {trip.included.map((item, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></span> {item}
                          </li>
                      ))}
                  </ul>
              </div>
              <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><X size={20} className="text-red-500"/> O que não está incluso</h3>
                  <ul className="space-y-2">
                      {trip.notIncluded?.map((item, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5 flex-shrink-0"></span> {item}
                          </li>
                      ))}
                  </ul>
              </div>
          </div>
        </div>

        {/* Right Column: Booking Card */}
        <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-6">
                <div>
                    <p className="text-sm text-gray-500 mb-1">A partir de</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-sm font-semibold text-gray-500">R$</span>
                        <span className="text-4xl font-extrabold text-gray-900">{trip.price.toLocaleString('pt-BR')}</span>
                        <span className="text-sm text-gray-500">/ pessoa</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex justify-between items-center cursor-pointer">
                        <div className="flex items-center gap-3">
                            <Calendar className="text-gray-400" size={20}/>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">Data</p>
                                <p className="text-sm font-bold text-gray-900">{new Date(trip.startDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <User className="text-gray-400" size={20}/>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">Passageiros</p>
                                <div className="flex items-center gap-3 mt-1">
                                    <button onClick={() => setPassengers(Math.max(1, passengers - 1))} className="w-6 h-6 rounded bg-white shadow flex items-center justify-center hover:bg-gray-100">-</button>
                                    <span className="font-bold text-gray-900">{passengers}</span>
                                    <button onClick={() => setPassengers(passengers + 1)} className="w-6 h-6 rounded bg-white shadow flex items-center justify-center hover:bg-gray-100">+</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                    <div className="flex justify-between mb-4 text-sm">
                        <span className="text-gray-600">R$ {trip.price.toLocaleString()} x {passengers}</span>
                        <span className="font-bold text-gray-900">R$ {totalPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between mb-6 text-lg font-bold">
                        <span>Total</span>
                        <span className="text-primary-600">R$ {totalPrice.toLocaleString()}</span>
                    </div>
                    
                    <button 
                        onClick={() => setIsBookingModalOpen(true)}
                        className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-700 shadow-lg shadow-primary-500/30 transition-transform active:scale-95 flex items-center justify-center gap-2"
                    >
                        <ShoppingBag size={20}/> Reservar Agora
                    </button>
                    
                    {whatsappLink && (
                        <a 
                            href={whatsappLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block w-full text-center mt-3 text-sm text-green-600 font-bold hover:underline"
                        >
                            Falar com o organizador no WhatsApp
                        </a>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* Booking Confirmation Modal */}
      {isBookingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Confirmar Reserva</h3>
                  <div className="space-y-4 mb-6">
                      <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Pacote:</span>
                          <span className="font-bold text-gray-900 text-right">{trip.title}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Data:</span>
                          <span className="font-bold text-gray-900">{new Date(trip.startDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Passageiros:</span>
                          <span className="font-bold text-gray-900">{passengers}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between text-lg font-bold">
                          <span>Total:</span>
                          <span className="text-primary-600">R$ {totalPrice.toLocaleString()}</span>
                      </div>
                  </div>
                  
                  <div className="flex gap-3">
                      <button onClick={() => setIsBookingModalOpen(false)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200">Cancelar</button>
                      <button onClick={handleBooking} disabled={isBookingProcessing} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50">
                          {isBookingProcessing ? 'Processando...' : 'Confirmar'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default TripDetails;
