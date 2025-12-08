import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Booking, Agency, Trip, UserRole, ItineraryDay, BoardingPoint } from '../types';
// Add ImageIcon to the import
import { MapPin, Calendar, Clock, Star, Share2, Heart, Check, X, ChevronDown, ChevronUp, User, ShoppingBag, ShieldCheck, Info, MessageCircle, ArrowRight, BookOpen, Bus, Loader, Plane, ImageIcon } from 'lucide-react';
import { buildWhatsAppLink } from '../utils/whatsapp';
import { supabase } from '../services/supabase';
import { slugify } from '../utils/slugify';

// Componente de Input Isolado para evitar re-render do pai inteiro a cada tecla
const PassengerInput = React.memo(({ 
  index, 
  field, 
  value, 
  onChange, 
  placeholder, 
  required 
}: { 
  index: number; 
  field: 'name' | 'document'; 
  value: string; 
  onChange: (index: number, field: 'name' | 'document', value: string) => void; 
  placeholder: string;
  required?: boolean;
}) => {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(index, field, e.target.value)}
      className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
      placeholder={placeholder}
      required={required}
    />
  );
});

const TripDetails: React.FC = () => {
  const { slug, tripSlug, agencySlug } = useParams<{ slug?: string; tripSlug?: string; agencySlug?: string }>();
  const navigate = useNavigate();
  const { getTripBySlug, clients, agencies, addBooking, toggleFavorite, incrementTripViews } = useData(); // Added incrementTripViews
  const { user } = useAuth();
  const { showToast } = useToast();

  const [trip, setTrip] = useState<Trip | undefined>(undefined);
  const [agency, setAgency] = useState<Agency | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  // Booking State - Local e Isolado
  const [passengers, setPassengers] = useState(1);
  const [passengerDetails, setPassengerDetails] = useState<{name: string, document: string}[]>([{name: '', document: ''}]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isBookingProcessing, setIsBookingProcessing] = useState(false);

  useEffect(() => {
    const loadData = async () => { // Made loadData async
      setLoading(true);
      const activeTripIdentifier = slug || tripSlug || '';
      if (!activeTripIdentifier) {
        setLoading(false);
        return;
      }

      let foundTrip: Trip | undefined = undefined;
      let foundAgency: Agency | undefined = undefined;

      // 1. Attempt to find trip in local DataContext cache (which contains active public trips)
      let cachedTrip = getTripBySlug(activeTripIdentifier); // This function already checks both slug and id on cached trips
      if (cachedTrip) {
        foundTrip = cachedTrip;
        foundAgency = agencies.find(a => a.agencyId === cachedTrip?.agencyId);
      }

      // 2. If not found in cache, attempt to fetch directly from Supabase
      if (!foundTrip) {
        const sb = supabase;
        if (!sb) {
          console.warn('Supabase not configured, cannot fetch trip from DB.');
          setLoading(false);
          return;
        }

        try {
          // Fetch trip with associated agency data
          const { data: dbData, error: dbError } = await sb
            .from('trips')
            .select('*, agencies:agency_id(*), trip_images(*)') // Also fetch trip_images for consistency
            .or(`slug.eq.${activeTripIdentifier},id.eq.${activeTripIdentifier}`)
            .maybeSingle();

          if (dbError) {
            console.error('Error fetching trip from DB:', dbError);
            setLoading(false);
            return;
          }

          if (dbData) {
            // Map Supabase response to Trip and Agency types
            const mappedTripFromDb: Trip = {
                id: dbData.id,
                agencyId: dbData.agency_id,
                title: dbData.title,
                slug: dbData.slug,
                description: dbData.description,
                destination: dbData.destination,
                price: dbData.price,
                startDate: dbData.start_date,
                endDate: dbData.end_date,
                durationDays: dbData.duration_days,
                images: dbData.trip_images?.sort((a:any,b:any) => a.position - b.position).map((i:any) => i.image_url) || [],
                category: dbData.category,
                tags: dbData.tags || [],
                travelerTypes: dbData.traveler_types || [],
                itinerary: dbData.itinerary || [],
                boardingPoints: dbData.boarding_points || [],
                paymentMethods: dbData.payment_methods || [],
                is_active: dbData.is_active,
                tripRating: dbData.trip_rating || 0,
                tripTotalReviews: dbData.trip_total_reviews || 0,
                included: dbData.included || [],
                notIncluded: dbData.not_included || [],
                views: dbData.views_count,
                sales: dbData.sales_count,
                featured: dbData.featured,
                featuredInHero: dbData.featured_in_hero,
                popularNearSP: dbData.popular_near_sp,
                operationalData: dbData.operational_data || {}
            };

            const mappedAgencyFromDb: Agency | undefined = dbData.agencies ? {
                id: dbData.agencies.user_id, // User ID (from auth)
                agencyId: dbData.agencies.id, // Primary Key of agencies table
                name: dbData.agencies.name,
                email: dbData.agencies.email || '',
                role: UserRole.AGENCY,
                is_active: dbData.agencies.is_active,
                slug: dbData.agencies.slug || slugify(dbData.agencies.name),
                cnpj: dbData.agencies.cnpj || '',
                description: dbData.agencies.description || '',
                logo: dbData.agencies.logo_url || '',
                whatsapp: dbData.agencies.whatsapp,
                heroMode: dbData.agencies.hero_mode || 'TRIPS',
                heroBannerUrl: dbData.agencies.hero_banner_url,
                heroTitle: dbData.agencies.hero_title,
                heroSubtitle: dbData.agencies.hero_subtitle,
                customSettings: dbData.agencies.custom_settings || {},
                subscriptionStatus: dbData.agencies.is_active ? 'ACTIVE' : 'INACTIVE',
                subscriptionPlan: 'BASIC', // Placeholder
                subscriptionExpiresAt: dbData.agencies.subscription_expires_at || new Date().toISOString(),
                website: dbData.agencies.website,
                phone: dbData.agencies.phone,
                address: dbData.agencies.address || {},
                bankInfo: dbData.agencies.bank_info || {}
            } : undefined;

            foundTrip = mappedTripFromDb;
            foundAgency = mappedAgencyFromDb;
          }
        } catch (dbFetchError) {
          console.error('Failed to fetch trip directly from DB:', dbFetchError);
        }
      }

      // 3. If a trip is found (either from cache or DB), set states
      if (foundTrip) {
        // Check if the current user is the agency owner and the trip is inactive
        const isAgencyOwnerViewingInactiveTrip = user?.role === UserRole.AGENCY && user.id === foundTrip.agencyId && !foundTrip.is_active;

        if (foundTrip.is_active || isAgencyOwnerViewingInactiveTrip) {
            setTrip(foundTrip);
            setAgency(foundAgency);

            // Increment views for active trips only, and only if not agency owner viewing their own
            if (foundTrip.is_active && (!user || user.id !== foundTrip.agencyId)) {
                incrementTripViews(foundTrip.id);
            }
        } else {
            // Trip is inactive and not being viewed by its owner
            setTrip(undefined);
            setAgency(undefined);
        }
      } else {
        setTrip(undefined);
        setAgency(undefined);
      }
      
      setLoading(false);
    };
    loadData();
  }, [slug, tripSlug, agencySlug, getTripBySlug, clients, agencies, user, incrementTripViews]); // Added clients and agencies to dependencies


  // Atualiza o array de detalhes quando o número de passageiros muda
  useEffect(() => {
    setPassengerDetails(prev => {
      const newDetails = [...prev];
      if (passengers > prev.length) {
        // Adiciona novos campos vazios
        for (let i = prev.length; i < passengers; i++) {
          newDetails.push({ name: '', document: '' });
        }
      } else if (passengers < prev.length) {
        // Remove excedentes
        return newDetails.slice(0, passengers);
      }
      return newDetails;
    });
  }, [passengers]);

  // Handler Otimizado com useCallback
  const handlePassengerChange = useCallback((index: number, field: 'name' | 'document', value: string) => {
    setPassengerDetails(prev => {
      const newDetails = [...prev];
      newDetails[index] = { ...newDetails[index], [field]: value };
      return newDetails;
    });
  }, []);

  // Pre-fill user data for first passenger
  useEffect(() => {
    if (user && isBookingModalOpen && passengerDetails[0]?.name === '') { // Added optional chaining to passengerDetails[0]
        const clientData = clients.find(c => c.id === user.id);
        if (clientData) {
            handlePassengerChange(0, 'name', clientData.name);
            handlePassengerChange(0, 'document', clientData.cpf || '');
        } else {
            handlePassengerChange(0, 'name', user.name);
        }
    }
  }, [user, isBookingModalOpen, clients, handlePassengerChange, passengerDetails]);


  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Viagem não encontrada</h2>
        <p className="text-gray-500 mb-6">Parece que esta viagem não está mais disponível ou nunca existiu.</p>
        <button onClick={() => navigate(-1)} className="text-primary-600 font-bold hover:underline flex items-center gap-2">
            <ArrowRight className="rotate-180" size={18}/> Voltar
        </button>
      </div>
    );
  }

  const totalPrice = trip.price * passengers;
  const contactNumber = agency?.whatsapp || agency?.phone;
  const whatsappLink = contactNumber ? buildWhatsAppLink(contactNumber, trip) : null;
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

  const handleBookingSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!user) {
          showToast('Faça login para reservar.', 'info');
          // Salva estado para retorno? (Implementação futura)
          navigate('/#login');
          return;
      }
      if (user.role !== 'CLIENT') {
          showToast('Apenas viajantes podem fazer reservas.', 'warning');
          return;
      }

      // Validação Básica
      for (let i = 0; i < passengers; i++) {
          if (!passengerDetails[i].name.trim()) {
              showToast(`Preencha o nome do passageiro ${i + 1}.`, 'warning');
              return;
          }
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
            paymentMethod: 'PIX', // Default hardcoded for now, could be form field
            _trip: trip, 
            _agency: agency 
        };

        // TODO: Em uma implementação real, salvaríamos os detalhes dos passageiros em uma tabela separada 'booking_passengers'
        console.log("Passenger Details:", passengerDetails);

        const createdBooking = await addBooking(bookingData); 

        setIsBookingModalOpen(false);
        showToast('Reserva realizada com sucesso!', 'success');
        
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

  const firstImage = trip.images[0] || 'https://placehold.co/800x600?text=Sem+Imagem';
  const remainingImages = trip.images.slice(1);
  const displayImages = trip.images.length > 0 ? trip.images : ['https://placehold.co/800x600?text=Sem+Imagem'];

  return (
    <div className="max-w-7xl mx-auto pb-12 pt-6 px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-900 mb-6 font-medium transition-colors">
        <ArrowRight className="rotate-180 mr-2" size={18} /> Voltar
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Left Column: Images & Content */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Gallery - Desktop Airbnb Style */}
          <div className="hidden md:grid lg:grid-cols-5 gap-3 rounded-2xl overflow-hidden shadow-xl group">
              <div className="lg:col-span-3 relative h-96">
                  <img 
                      src={firstImage} 
                      alt={trip.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 rounded-l-2xl" 
                  />
                  <button onClick={handleFavorite} className={`absolute top-4 right-4 p-3 rounded-full bg-white shadow-md transition-transform hover:scale-110 ${isFavorite ? 'text-red-500' : 'text-gray-400'}`}>
                      <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
                  </button>
              </div>
              <div className="lg:col-span-2 grid grid-cols-2 gap-3">
                  {remainingImages.slice(0, 4).map((img, idx) => (
                      <img 
                          key={idx} 
                          src={img || 'https://placehold.co/400x300?text=Imagem'} 
                          alt={`Imagem ${idx + 2}`} 
                          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 
                          ${idx === 1 ? 'rounded-tr-2xl' : ''}
                          ${idx === 3 ? 'rounded-br-2xl' : ''}
                          `}
                      />
                  ))}
                  {remainingImages.length < 4 && Array.from({length: 4 - remainingImages.length}).map((_, idx) => (
                      <div key={`placeholder-${idx}`} className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 rounded-lg">
                          <ImageIcon size={32}/>
                      </div>
                  ))}
              </div>
          </div>

          {/* Gallery - Mobile Carousel Style */}
          <div className="block md:hidden space-y-4">
            <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden shadow-sm relative group">
              <img 
                src={displayImages[activeImageIndex]} 
                alt={trip.title} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
              />
              <button onClick={handleFavorite} className={`absolute top-4 right-4 p-3 rounded-full bg-white shadow-md transition-transform hover:scale-110 ${isFavorite ? 'text-red-500' : 'text-gray-400'}`}>
                  <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
              </button>
              {displayImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {displayImages.map((_, idx) => (
                        <div key={idx} className={`w-2 h-2 rounded-full ${activeImageIndex === idx ? 'bg-primary-600' : 'bg-white/50'}`}></div>
                    ))}
                </div>
              )}
            </div>
            {displayImages.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {displayImages.map((img, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setActiveImageIndex(idx)}
                    className={`flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-all ${activeImageIndex === idx ? 'border-primary-600 ring-2 ring-primary-100' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  >
                    <img 
                      src={img} 
                      alt={`Thumbnail ${idx + 1}`} 
                      className="w-full h-full object-cover" 
                    />
                  </button>
                ))}
              </div>
            )}
          </div>


          {/* Trip Details */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-4">{trip.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-gray-500 text-sm mb-6">
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                <MapPin size={16}/> {trip.destination}
              </span>
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 text-green-600 font-medium">
                <Calendar size={16}/> {new Date(trip.startDate).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 text-purple-600 font-medium">
                <Clock size={16}/> {trip.durationDays} dias
              </span>
            </div>

            {/* Price on mobile/tablet */}
            <div className="lg:hidden flex justify-between items-center bg-primary-50 p-4 rounded-xl mb-6 border border-primary-100">
                <div>
                    <p className="text-sm text-primary-700 font-bold uppercase">Preço a partir de</p>
                    <p className="text-3xl font-extrabold text-primary-900">R$ {trip.price.toLocaleString('pt-BR')}</p>
                </div>
                <button 
                    onClick={() => setIsBookingModalOpen(true)}
                    className="bg-primary-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-primary-700 transition-colors active:scale-95 flex items-center gap-2"
                >
                    <ShoppingBag size={18} /> Reservar
                </button>
            </div>

            <p className="text-gray-700 leading-relaxed text-lg mb-8">{trip.description}</p>
            
            {/* Agency Info */}
            {agency && (
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 flex items-center gap-4 mb-8">
                    <img src={agency.logo} alt={agency.name} className="w-14 h-14 rounded-full object-cover border-2 border-gray-200"/>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Organizado por</p>
                        <Link to={`/${agency.slug}`} className="text-lg font-bold text-gray-900 hover:text-primary-600 transition-colors flex items-center gap-2">
                            {agency.name} <ShieldCheck size={16} className="text-green-500" />
                        </Link>
                    </div>
                </div>
            )}

            {/* Included */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-5 flex items-center"><Check size={24} className="mr-3 text-green-500"/> O que está incluso</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {trip.included.map((item, idx) => (
                  <div key={idx} className="flex items-center text-gray-700 text-base">
                    <Check size={20} className="mr-3 text-green-400 flex-shrink-0"/> {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Not Included */}
            {trip.notIncluded && trip.notIncluded.length > 0 && (
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-5 flex items-center"><X size={24} className="mr-3 text-red-500"/> Não está incluso</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {trip.notIncluded.map((item, idx) => (
                    <div key={idx} className="flex items-center text-gray-700 text-base">
                      <X size={20} className="mr-3 text-red-400 flex-shrink-0"/> {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Itinerary - Vertical Timeline */}
            {trip.itinerary && trip.itinerary.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center"><BookOpen size={24} className="mr-3 text-primary-500"/> Roteiro Detalhado</h3>
                    <div className="relative pl-8 md:pl-12">
                        {/* Timeline vertical line */}
                        <div className="absolute left-3 md:left-6 top-0 h-full w-0.5 bg-gray-200"></div>
                        {trip.itinerary.map((day: ItineraryDay, idx: number) => (
                            <div key={idx} className="mb-8 last:mb-0 relative">
                                {/* Timeline day marker */}
                                <div className="absolute -left-5 md:-left-8 top-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary-600 text-white font-bold text-lg shadow-md">
                                    {day.day}
                                </div>
                                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 ml-4 md:ml-0">
                                    <h4 className="font-bold text-gray-900 text-xl mb-2">{day.title}</h4>
                                    <p className="text-gray-700 text-base leading-relaxed">{day.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Boarding Points */}
            {trip.boardingPoints && trip.boardingPoints.length > 0 && (
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-5 flex items-center"><Bus size={24} className="mr-3 text-primary-500"/> Pontos de Embarque</h3>
                    <ul className="space-y-4">
                        {trip.boardingPoints.map((bp: BoardingPoint, idx: number) => (
                            <li key={idx} className="flex items-center text-gray-700 text-base bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm">
                                <Clock size={20} className="mr-4 text-primary-500 flex-shrink-0"/>
                                <span className="font-bold mr-3">{bp.time}</span>
                                <span>{bp.location}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Booking Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 sticky top-28 animate-[fadeInUp_0.5s]">
            <div className="flex justify-between items-center mb-4">
              <p className="text-lg font-bold text-gray-900">Total <span className="text-sm text-gray-500 font-normal">por pessoa</span></p>
              <p className="text-4xl font-extrabold text-primary-600">R$ {totalPrice.toLocaleString('pt-BR')}</p>
            </div>
            <div className="mb-6">
              <label htmlFor="passengers" className="block text-sm font-bold text-gray-700 mb-2">Número de Passageiros</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <button 
                  onClick={() => setPassengers(Math.max(1, passengers - 1))} 
                  className="p-3 bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700 font-bold"
                >
                  <ChevronDown size={20}/>
                </button>
                <input 
                  type="number" 
                  id="passengers" 
                  value={passengers} 
                  onChange={(e) => setPassengers(Math.max(1, parseInt(e.target.value) || 1))} 
                  min="1"
                  className="flex-1 text-center font-bold text-lg border-none focus:ring-0 outline-none"
                />
                <button 
                  onClick={() => setPassengers(passengers + 1)} 
                  className="p-3 bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700 font-bold"
                >
                  <ChevronUp size={20}/>
                </button>
              </div>
            </div>
            <button 
                onClick={() => setIsBookingModalOpen(true)}
                className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold py-3.5 rounded-xl shadow-lg hover:from-primary-700 hover:to-primary-600 transition-all hover:-translate-y-1 active:translate-y-0 active:shadow flex items-center justify-center gap-2"
            >
                <ShoppingBag size={18} /> Reservar Agora
            </button>
            {whatsappLink && (
                <a 
                    href={whatsappLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="w-full bg-[#25D366] text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-[#128C7E] transition-all hover:-translate-y-1 active:translate-y-0 active:shadow flex items-center justify-center gap-2 mt-3"
                >
                    <MessageCircle size={18} className="fill-white/20"/> Falar no WhatsApp
                </a>
            )}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]" onClick={() => setIsBookingModalOpen(false)}>
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative animate-[scaleIn_0.3s] max-h-[95vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsBookingModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Confirmar Reserva</h2>
            
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6 flex items-center gap-4">
                <img src={firstImage} alt={trip.title} className="w-24 h-16 object-cover rounded-xl border border-gray-200"/>
                <div>
                    <h3 className="font-bold text-gray-900 text-lg line-clamp-1">{trip.title}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                        <MapPin size={14} className="text-gray-400"/>{trip.destination} • {trip.durationDays} dias
                    </p>
                </div>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Detalhes dos Passageiros ({passengers})</label>
                <div className="space-y-4">
                  {Array.from({ length: passengers }).map((_, idx) => (
                    <div key={idx} className="bg-gray-100 p-4 rounded-xl border border-gray-200">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Passageiro {idx + 1}</p>
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="flex-1">
                                <PassengerInput 
                                    index={idx} 
                                    field="name" 
                                    value={passengerDetails[idx]?.name || ''} 
                                    onChange={handlePassengerChange} 
                                    placeholder="Nome Completo"
                                    required
                                />
                            </div>
                            <div className="flex-1">
                                <PassengerInput 
                                    index={idx} 
                                    field="document" 
                                    value={passengerDetails[idx]?.document || ''} 
                                    onChange={handlePassengerChange} 
                                    placeholder={idx === 0 ? "CPF (Obrigatório)" : "CPF (Opcional)"}
                                    required={idx === 0}
                                />
                            </div>
                        </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Booking Summary */}
              <div className="bg-primary-50 p-5 rounded-xl border border-primary-100 text-center shadow-md">
                <p className="text-sm text-primary-700 font-bold uppercase mb-2">Valor Total da Reserva</p>
                <p className="text-4xl font-extrabold text-primary-900">R$ {totalPrice.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-primary-600 mt-2 flex items-center justify-center gap-1.5">
                    <Info size={14}/> Pagamento via PIX na confirmação.
                </p>
              </div>

              <button 
                type="submit" 
                disabled={isBookingProcessing}
                className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white font-bold py-3.5 rounded-xl shadow-lg hover:from-green-700 hover:to-green-600 transition-all active:translate-y-0 active:shadow flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isBookingProcessing ? <Loader size={18} className="animate-spin" /> : <Check size={18} />} Finalizar Reserva
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripDetails;