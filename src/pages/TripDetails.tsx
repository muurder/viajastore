
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Trip, PassengerDetail } from '../types';
import { MapPin, Clock, Calendar, CheckCircle, User, Star, Share2, Heart, ArrowLeft, MessageCircle, AlertTriangle, ShieldCheck, Tag, Bus } from 'lucide-react';
import { buildWhatsAppLink } from '../utils/whatsapp';
import { PassengerDataModal } from '../components/PassengerDataModal';

const TripDetails: React.FC = () => {
  const { slug, tripSlug, agencySlug } = useParams<{ slug?: string; tripSlug?: string; agencySlug?: string }>();
  const activeSlug = tripSlug || slug;
  
  const { getTripBySlug, getAgencyBySlug, getAgencyPublicTrips, getTripById, addBooking, toggleFavorite, clients, getReviewsByTripId, agencies } = useData();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // FIX: When in agency microsite context, search trips within that agency first
  // This prevents issues with duplicate slugs across different agencies
  const currentAgency = agencySlug ? getAgencyBySlug(agencySlug) : undefined;
  
  let trip: Trip | undefined = undefined;
  
  if (activeSlug) {
    if (currentAgency) {
      // In agency microsite: search within agency's trips first
      const agencyTrips = getAgencyPublicTrips(currentAgency.agencyId);
      trip = agencyTrips.find(t => t.slug === activeSlug);
      
      // If not found by slug, try by ID (fallback for old links)
      if (!trip && activeSlug.length === 36) { // UUIDs are 36 chars
        trip = getTripById(activeSlug);
        // Verify it belongs to this agency
        if (trip && trip.agencyId !== currentAgency.agencyId) {
          trip = undefined;
        }
      }
    } else {
      // Global context: search all trips
      trip = getTripBySlug(activeSlug);
      
      // If not found by slug, try by ID (fallback for old links)
      if (!trip && activeSlug.length === 36) { // UUIDs are 36 chars
        trip = getTripById(activeSlug);
      }
    }
  }
  
  const agency = trip ? agencies.find(a => a.agencyId === trip.agencyId) : currentAgency;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [passengers, setPassengers] = useState(1);
  const [showPassengerModal, setShowPassengerModal] = useState(false);
  const [passengerData, setPassengerData] = useState<PassengerDetail[]>([]);

  // Favorites logic
  const currentUserData = user ? clients.find(c => c.id === user.id) : undefined;
  const isFavorite = user?.role === 'CLIENT' && trip && currentUserData?.favorites.includes(trip.id);

  if (!trip) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Viagem não encontrada</h2>
        <p className="text-gray-500 mb-4 text-center max-w-md">
          {activeSlug ? `A viagem com slug "${activeSlug}" não foi encontrada.` : 'Nenhuma viagem especificada.'}
          {currentAgency && ' Verifique se a viagem pertence a esta agência.'}
        </p>
        <Link 
          to={currentAgency ? `/${currentAgency.slug}/trips` : '/trips'} 
          className="text-primary-600 hover:underline font-medium"
        >
          {currentAgency ? `Voltar para pacotes de ${currentAgency.name}` : 'Voltar para lista de viagens'}
        </Link>
      </div>
    );
  }
  
  if (!agency) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Agência não encontrada</h2>
        <p className="text-gray-500 mb-4">A agência desta viagem não foi encontrada.</p>
        <Link to="/trips" className="text-primary-600 hover:underline font-medium">Voltar para lista</Link>
      </div>
    );
  }

  const reviews = getReviewsByTripId(trip.id);
  const avgRating = reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;

  const handleBooking = async () => {
    if (!user) {
        showToast('Faça login para reservar.', 'info');
        navigate('/#login');
        return;
    }
    if (user.role !== 'CLIENT') {
        showToast('Apenas clientes podem fazer reservas.', 'warning');
        return;
    }

    // If more than 1 passenger, show modal to collect passenger data
    if (passengers > 1) {
        setShowPassengerModal(true);
        return;
    }

    // Single passenger - proceed directly
    await processBooking([]);
  };

  const processBooking = async (passengersData: PassengerDetail[]) => {
    setIsProcessing(true);
    try {
        const bookingData = {
            id: crypto.randomUUID(),
            tripId: trip.id,
            clientId: user!.id,
            date: new Date().toISOString(),
            status: 'CONFIRMED' as const,
            totalPrice: trip.price * passengers,
            passengers: passengers,
            voucherCode: `VS-${trip.id.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 10000)}`,
            paymentMethod: 'CREDIT_CARD' as const,
            passengerDetails: passengersData.length > 0 ? passengersData : undefined
        };

        const newBooking = await addBooking(bookingData);
        
        if (newBooking) {
            // Navigate to success page
            const successPath = agencySlug ? `/${agencySlug}/checkout/success` : '/checkout/success';
            navigate(successPath, { state: { booking: newBooking } });
        }
    } catch (error) {
        // Error handled in addBooking
    } finally {
        setIsProcessing(false);
    }
  };

  const handlePassengerDataConfirm = async (passengersData: PassengerDetail[]) => {
    setShowPassengerModal(false);
    setPassengerData(passengersData);
    await processBooking(passengersData);
  };

  const handleFavorite = () => {
      if (!user) {
          showToast('Faça login para favoritar.', 'info');
          return;
      }
      if (user.role === 'CLIENT') {
          toggleFavorite(trip.id, user.id);
      }
  };

  const handleShare = () => {
      if (navigator.share) {
          navigator.share({
              title: trip.title,
              text: `Confira essa viagem incrível: ${trip.title}`,
              url: window.location.href,
          }).catch(console.error);
      } else {
          navigator.clipboard.writeText(window.location.href);
          showToast('Link copiado!', 'success');
      }
  };

  const whatsappLink = buildWhatsAppLink(agency.whatsapp || agency.phone, trip);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-[fadeIn_0.3s]">
      {/* Breadcrumb / Back */}
      <div className="mb-6 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft size={20} className="mr-2"/> Voltar
          </button>
          <div className="flex gap-2">
              <button onClick={handleFavorite} className={`p-2 rounded-full border transition-colors ${isFavorite ? 'bg-red-50 text-red-500 border-red-100' : 'bg-white text-gray-400 border-gray-200 hover:text-red-500'}`}>
                  <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'}/>
              </button>
              <button onClick={handleShare} className="p-2 rounded-full border bg-white text-gray-400 border-gray-200 hover:text-primary-600 transition-colors">
                  <Share2 size={20}/>
              </button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Left Column: Content */}
          <div className="lg:col-span-2 space-y-8">
              
              {/* Gallery */}
              <div className="space-y-4">
                  <div className="aspect-video w-full rounded-3xl overflow-hidden bg-gray-100 shadow-sm relative group">
                      <img 
                        src={trip.images[activeImageIndex]} 
                        alt={trip.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute top-4 left-4">
                          <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-gray-800 shadow-sm">
                              {trip.category}
                          </span>
                      </div>
                  </div>
                  {trip.images.length > 1 && (
                      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                          {trip.images.map((img, idx) => (
                              <button 
                                key={idx} 
                                onClick={() => setActiveImageIndex(idx)}
                                className={`relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${activeImageIndex === idx ? 'border-primary-600 ring-2 ring-primary-100' : 'border-transparent opacity-70 hover:opacity-100'}`}
                              >
                                  <img src={img} alt="" className="w-full h-full object-cover" />
                              </button>
                          ))}
                      </div>
                  )}
              </div>

              {/* Header Info */}
              <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2 leading-tight">{trip.title}</h1>
                  
                  {/* Tags Pills */}
                  {trip.tags && trip.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                          {trip.tags.map(tag => (
                              <span key={tag} className="text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200 flex items-center gap-1">
                                  <Tag size={10} className="text-gray-400"/> {tag}
                              </span>
                          ))}
                      </div>
                  )}

                  <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 mb-6">
                      <div className="flex items-center"><MapPin size={18} className="mr-2 text-primary-500"/> {trip.destination}</div>
                      <div className="flex items-center"><Clock size={18} className="mr-2 text-primary-500"/> {trip.durationDays} dias</div>
                      <div className="flex items-center">
                          <Star size={18} className="mr-2 text-amber-400 fill-current"/> 
                          <span className="font-bold text-gray-900 mr-1">{avgRating > 0 ? avgRating.toFixed(1) : 'Novidade'}</span> 
                          <span className="text-gray-400">({reviews.length} avaliações)</span>
                      </div>
                  </div>
              </div>

              {/* Description */}
              <div className="prose prose-blue max-w-none text-gray-600">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Sobre a experiência</h3>
                  <p className="whitespace-pre-line leading-relaxed">{trip.description}</p>
              </div>

              {/* Included / Not Included */}
              <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                      <h4 className="font-bold text-green-800 mb-4 flex items-center"><CheckCircle size={18} className="mr-2"/> O que está incluso</h4>
                      <ul className="space-y-2">
                          {trip.included.map((item, i) => (
                              <li key={i} className="flex items-start text-sm text-green-700">
                                  <span className="mr-2">•</span> {item}
                              </li>
                          ))}
                      </ul>
                  </div>
                  {trip.notIncluded && trip.notIncluded.length > 0 && (
                      <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                          <h4 className="font-bold text-red-800 mb-4 flex items-center"><AlertTriangle size={18} className="mr-2"/> O que não está incluso</h4>
                          <ul className="space-y-2">
                              {trip.notIncluded.map((item, i) => (
                                  <li key={i} className="flex items-start text-sm text-red-700">
                                      <span className="mr-2">•</span> {item}
                                  </li>
                              ))}
                          </ul>
                      </div>
                  )}
              </div>

              {/* Itinerary */}
              {trip.itinerary && trip.itinerary.length > 0 && (
                  <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-6">Roteiro Dia a Dia</h3>
                      <div className="space-y-4">
                          {trip.itinerary.map((day) => (
                              <div key={day.day} className="border border-gray-200 rounded-xl p-5 hover:border-primary-200 transition-colors bg-white">
                                  <h4 className="font-bold text-lg text-primary-700 mb-2">Dia {day.day}: {day.title}</h4>
                                  <p className="text-gray-600 text-sm leading-relaxed">{day.description}</p>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {/* Boarding Points */}
              {trip.boardingPoints && trip.boardingPoints.length > 0 && (
                  <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                          <Bus size={24} className="text-gray-400"/> Locais de Embarque
                      </h3>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
                          {trip.boardingPoints.map((bp) => (
                              <div key={bp.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                                  <div className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-bold text-gray-900 shadow-sm w-fit flex items-center gap-2">
                                      <Clock size={14} className="text-primary-600"/> {bp.time}
                                  </div>
                                  <div className="flex items-center text-sm text-gray-700">
                                      <MapPin size={16} className="text-gray-400 mr-2 flex-shrink-0"/> {bp.location}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {/* Agency Info */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
                  <img src={agency.logo} alt={agency.name} className="w-20 h-20 rounded-full object-cover border-4 border-gray-50 shadow-sm" />
                  <div className="text-center sm:text-left flex-1">
                      <h4 className="font-bold text-lg text-gray-900 mb-1">{agency.name}</h4>
                      <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-gray-500 mb-3">
                          <ShieldCheck size={16} className="text-green-500"/> Agência Verificada
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2">{agency.description}</p>
                  </div>
                  <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <Link to={`/${agency.slug}`} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 text-center transition-colors">
                          Ver Perfil
                      </Link>
                      {whatsappLink && (
                          <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 text-center transition-colors flex items-center justify-center gap-2">
                              <MessageCircle size={16}/> WhatsApp
                          </a>
                      )}
                  </div>
              </div>

          </div>

          {/* Right Column: Sticky Booking Card */}
          <div className="lg:col-span-1 relative">
              <div className="sticky top-24 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 z-30">
                  <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-gray-900">Por:</span>
                          <span className="text-xs font-semibold text-gray-500 self-start mt-2">R$</span>
                          <span className="text-4xl font-extrabold text-gray-900">{trip.price.toLocaleString('pt-BR')}</span>
                          <span className="text-sm text-gray-500 font-normal">/ pessoa</span>
                      </div>
                  </div>

                  <div className="space-y-4 mb-6">
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="flex items-center gap-3 mb-3">
                              <Calendar className="text-primary-600" size={20}/>
                              <div>
                                  <p className="text-xs font-bold text-gray-500 uppercase">Data da Viagem</p>
                                  <p className="font-bold text-gray-900 text-sm">
                                      {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                                  </p>
                              </div>
                          </div>
                          <div className="flex items-center gap-3">
                              <User className="text-primary-600" size={20}/>
                              <div className="flex-1">
                                  <p className="text-xs font-bold text-gray-500 uppercase">Passageiros</p>
                                  <div className="flex items-center gap-3 mt-1">
                                      <button onClick={() => setPassengers(Math.max(1, passengers - 1))} className="w-6 h-6 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-sm font-bold">-</button>
                                      <span className="font-bold text-gray-900 w-4 text-center">{passengers}</span>
                                      <button onClick={() => setPassengers(passengers + 1)} className="w-6 h-6 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-sm font-bold">+</button>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Total ({passengers}x)</span>
                          <span className="font-bold text-gray-900">R$ {(trip.price * passengers).toLocaleString('pt-BR')}</span>
                      </div>
                  </div>

                  <button 
                    onClick={handleBooking}
                    disabled={isProcessing}
                    className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                      {isProcessing ? 'Processando...' : 'Reservar Agora'}
                  </button>
                  
                  <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
                      <ShieldCheck size={12}/> Pagamento 100% Seguro
                  </p>
              </div>
          </div>

      </div>

      {/* Passenger Data Modal */}
      {user && (
        <PassengerDataModal
          isOpen={showPassengerModal}
          onClose={() => setShowPassengerModal(false)}
          onConfirm={handlePassengerDataConfirm}
          passengerCount={passengers}
          mainPassengerName={user.name || ''}
          mainPassengerCpf={currentUserData?.cpf}
          mainPassengerPhone={currentUserData?.phone}
          mainPassengerBirthDate={currentUserData?.birthDate}
        />
      )}
    </div>
  );
};

export default TripDetails;
