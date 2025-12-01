import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Trip, Agency } from '../types';
import { MapPin, Clock, Share2, Heart, MessageCircle, ArrowLeft, Star, ShieldCheck, CheckCircle, XCircle } from 'lucide-react';
import { buildWhatsAppLink } from '../utils/whatsapp';

const TripDetails: React.FC = () => {
  const { slug, agencySlug, tripSlug } = useParams<{ slug?: string; agencySlug?: string; tripSlug?: string }>();
  // Handling both global route /viagem/:slug and microsite route /:agencySlug/viagem/:tripSlug
  const activeTripSlug = tripSlug || slug;
  
  const { getTripBySlug, getTripById, agencies, toggleFavorite, clients, addBooking } = useData();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [trip, setTrip] = useState<Trip | undefined>(undefined);
  const [agency, setAgency] = useState<Agency | undefined>(undefined);
  const [activeImage, setActiveImage] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (activeTripSlug) {
      // Try finding by slug first, then by ID (legacy support)
      let foundTrip = getTripBySlug(activeTripSlug) || getTripById(activeTripSlug);
      
      if (foundTrip) {
        setTrip(foundTrip);
        setActiveImage(foundTrip.images?.[0] || '');
        
        // Find associated agency
        const foundAgency = agencies.find(a => a.agencyId === foundTrip?.agencyId);
        setAgency(foundAgency);
      }
    }
  }, [activeTripSlug, getTripBySlug, getTripById, agencies]);

  useEffect(() => {
    if (user && trip) {
        const client = clients.find(c => c.id === user.id);
        setIsFavorite(client?.favorites.includes(trip.id) || false);
    }
  }, [user, trip, clients]);

  if (!trip) {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Viagem não encontrada</h2>
            <Link to="/trips" className="text-primary-600 hover:underline">Voltar para lista de viagens</Link>
        </div>
    );
  }

  const handleToggleFavorite = () => {
      if (!user) {
          showToast('Faça login para favoritar.', 'info');
          return;
      }
      if (user.role !== 'CLIENT') {
          showToast('Apenas viajantes podem favoritar.', 'warning');
          return;
      }
      toggleFavorite(trip.id, user.id);
      setIsFavorite(!isFavorite);
  };

  const handleShare = () => {
      if (navigator.share) {
          navigator.share({
              title: trip.title,
              text: `Confira esta viagem incrível: ${trip.title}`,
              url: window.location.href,
          }).catch(console.error);
      } else {
          navigator.clipboard.writeText(window.location.href);
          showToast('Link copiado para a área de transferência!', 'success');
      }
  };

  const handleReserve = async () => {
      if (!user) {
          showToast('Faça login para reservar.', 'info');
          navigate('/#login');
          return;
      }
      if (user.role !== 'CLIENT') {
          showToast('Apenas viajantes podem fazer reservas.', 'warning');
          return;
      }

      // Create a booking record
      const bookingData = {
          id: crypto.randomUUID(),
          tripId: trip.id,
          clientId: user.id,
          date: new Date().toISOString(),
          status: 'CONFIRMED' as const, 
          totalPrice: trip.price,
          passengers: 1,
          voucherCode: `VS-${Math.floor(Math.random() * 100000)}`,
          paymentMethod: 'PIX' as const 
      };

      await addBooking(bookingData);
      
      const successLink = agencySlug 
        ? `/${agencySlug}/checkout/success` 
        : `/checkout/success`;
        
      navigate(successLink);
  };

  const whatsappLink = buildWhatsAppLink(agency?.whatsapp || agency?.phone, trip);
  
  // Breadcrumb Logic
  const homeLink = agencySlug ? `/${agencySlug}` : '/';
  const homeLabel = agencySlug ? (agency?.name || 'Início') : 'Home';
  const tripsLink = agencySlug ? `/${agencySlug}/trips` : '/trips';
  const tripsLabel = 'Pacotes';

  return (
    <div className="max-w-6xl mx-auto pb-12 relative animate-[fadeIn_0.3s]">
      {/* Floating WhatsApp */}
      {whatsappLink && (
        <a 
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-24 md:bottom-6 right-6 z-[60] p-4 bg-[#25D366] rounded-full text-white shadow-lg hover:bg-[#128C7E] hover:scale-110 transition-all lg:hidden animate-[scaleIn_0.5s]"
            title="Falar no WhatsApp"
        >
            <MessageCircle size={28} className="fill-current" />
        </a>
      )}

      <div className="flex items-center text-sm text-gray-500 mb-6">
          <Link to={homeLink} className="hover:text-primary-600 flex items-center"><ArrowLeft size={12} className="mr-1"/> {homeLabel}</Link> 
          <span className="mx-2">/</span>
          <Link to={tripsLink} className="hover:text-primary-600">{tripsLabel}</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium truncate max-w-[200px]">{trip.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Image Gallery */}
          <div className="space-y-4">
              <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden shadow-sm bg-gray-100 relative group">
                  <img src={activeImage} alt={trip.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute top-4 right-4 flex gap-2">
                      <button onClick={handleToggleFavorite} className="p-2 bg-white/80 hover:bg-white backdrop-blur-sm rounded-full text-gray-600 hover:text-red-500 transition-colors shadow-sm">
                          <Heart size={20} className={isFavorite ? "fill-red-500 text-red-500" : ""} />
                      </button>
                      <button onClick={handleShare} className="p-2 bg-white/80 hover:bg-white backdrop-blur-sm rounded-full text-gray-600 hover:text-blue-600 transition-colors shadow-sm">
                          <Share2 size={20} />
                      </button>
                  </div>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  {trip.images.map((img, index) => (
                      <button 
                        key={index} 
                        onClick={() => setActiveImage(img)}
                        className={`w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${activeImage === img ? 'border-primary-600 shadow-md scale-105' : 'border-transparent opacity-70 hover:opacity-100'}`}
                      >
                          <img src={img} alt={`Thumb ${index}`} className="w-full h-full object-cover" />
                      </button>
                  ))}
              </div>
          </div>

          {/* Info Side */}
          <div className="space-y-6">
              <div>
                  <div className="flex items-center gap-2 mb-3">
                      <span className="px-3 py-1 bg-primary-50 text-primary-700 text-xs font-bold uppercase tracking-wider rounded-full border border-primary-100">
                          {trip.category}
                      </span>
                      <div className="flex items-center text-amber-500 font-bold text-sm bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                          <Star size={14} className="fill-current mr-1" />
                          {trip.rating ? trip.rating.toFixed(1) : '5.0'}
                      </div>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-4">{trip.title}</h1>
                  <div className="flex items-center text-gray-600 text-sm mb-6">
                      <MapPin size={18} className="mr-2 text-gray-400" /> {trip.destination}
                      <span className="mx-3 text-gray-300">|</span>
                      <Clock size={18} className="mr-2 text-gray-400" /> {trip.durationDays} dias
                  </div>
              </div>

              {agency && (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <img src={agency.logo} alt={agency.name} className="w-12 h-12 rounded-full object-cover border border-white shadow-sm" />
                      <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 uppercase font-bold">Organizado por</p>
                          <h3 className="text-sm font-bold text-gray-900 truncate flex items-center gap-1">
                              {agency.name} 
                              {agency.subscriptionStatus === 'ACTIVE' && <ShieldCheck size={14} className="text-green-500" />}
                          </h3>
                      </div>
                      {whatsappLink && (
                          <a 
                            href={whatsappLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                            title="WhatsApp da Agência"
                          >
                              <MessageCircle size={20} />
                          </a>
                      )}
                  </div>
              )}

              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-end mb-6">
                      <div>
                          <p className="text-sm text-gray-500 font-medium">Preço por pessoa</p>
                          <div className="flex items-baseline gap-1">
                              <span className="text-sm font-bold text-gray-400">R$</span>
                              <span className="text-4xl font-extrabold text-gray-900">{trip.price.toLocaleString('pt-BR')}</span>
                          </div>
                      </div>
                  </div>
                  
                  <button 
                    onClick={handleReserve}
                    className="w-full bg-primary-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                      Reservar Agora
                  </button>
                  <p className="text-xs text-center text-gray-400 mt-3">
                      Cancelamento grátis até 7 dias antes da viagem.
                  </p>
              </div>
          </div>
      </div>

      {/* Details Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
              {/* Description */}
              <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Sobre a experiência</h3>
                  <div className="prose prose-blue text-gray-600 leading-relaxed max-w-none" dangerouslySetInnerHTML={{__html: trip.description}} />
              </section>

              {/* Itinerary */}
              {trip.itinerary && trip.itinerary.length > 0 && (
                  <section>
                      <h3 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-2">Roteiro</h3>
                      <div className="space-y-6 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-200">
                          {trip.itinerary.map((item, index) => (
                              <div key={index} className="relative pl-10">
                                  <div className="absolute left-0 top-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold text-sm border-4 border-white shadow-sm z-10">
                                      {item.day}
                                  </div>
                                  <h4 className="font-bold text-gray-900 text-lg mb-2">{item.title}</h4>
                                  <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
                              </div>
                          ))}
                      </div>
                  </section>
              )}
          </div>

          <div className="lg:col-span-1 space-y-8">
              {/* Included / Not Included */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-4">O que está incluído</h3>
                  <ul className="space-y-3 mb-6">
                      {trip.included && trip.included.map((item, i) => (
                          <li key={i} className="flex items-start text-sm text-gray-700">
                              <CheckCircle size={18} className="text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                              {item}
                          </li>
                      ))}
                  </ul>

                  {trip.notIncluded && trip.notIncluded.length > 0 && (
                      <>
                          <h3 className="font-bold text-gray-900 mb-4 border-t border-gray-200 pt-4">Não incluído</h3>
                          <ul className="space-y-3">
                              {trip.notIncluded.map((item, i) => (
                                  <li key={i} className="flex items-start text-sm text-gray-500">
                                      <XCircle size={18} className="text-red-400 mr-2 flex-shrink-0 mt-0.5" />
                                      {item}
                                  </li>
                              ))}
                          </ul>
                      </>
                  )}
              </div>

              {/* Tags */}
              <div>
                  <h3 className="font-bold text-gray-900 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                      {trip.tags && trip.tags.map((tag, i) => (
                          <span key={i} className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-600">
                              {tag}
                          </span>
                      ))}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default TripDetails;