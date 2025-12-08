
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Booking, Agency, Trip, UserRole, ItineraryDay, BoardingPoint } from '../types';
import { 
  MapPin, Calendar, Clock, Star, Share2, Heart, Check, X, ChevronDown, ChevronUp, 
  User, ShoppingBag, ShieldCheck, Info, MessageCircle, ArrowRight, BookOpen, 
  Bus, Loader, Grid, ChevronLeft, ChevronRight
} from 'lucide-react';
import { buildWhatsAppLink } from '../utils/whatsapp';
import { supabase } from '../services/supabase';
import { slugify } from '../utils/slugify';

// --- Componente de Input Isolado (Modernizado) ---
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
    <div className="relative group">
        <input
        type="text"
        value={value}
        onChange={(e) => onChange(index, field, e.target.value)}
        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-4 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all placeholder-gray-400 group-hover:bg-white"
        placeholder={placeholder}
        required={required}
        />
    </div>
  );
});

const TripDetails: React.FC = () => {
  const { slug, tripSlug, agencySlug } = useParams<{ slug?: string; tripSlug?: string; agencySlug?: string }>();
  const navigate = useNavigate();
  const { getTripBySlug, clients, agencies, addBooking, toggleFavorite, incrementTripViews } = useData();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [trip, setTrip] = useState<Trip | undefined>(undefined);
  const [agency, setAgency] = useState<Agency | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  
  // Gallery State
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  
  // Booking State
  const [passengers, setPassengers] = useState(1);
  const [passengerDetails, setPassengerDetails] = useState<{name: string, document: string}[]>([{name: '', document: ''}]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isBookingProcessing, setIsBookingProcessing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const activeTripIdentifier = slug || tripSlug || '';
      if (!activeTripIdentifier) {
        setLoading(false);
        return;
      }

      let foundTrip: Trip | undefined = undefined;
      let foundAgency: Agency | undefined = undefined;

      let cachedTrip = getTripBySlug(activeTripIdentifier);
      if (cachedTrip) {
        foundTrip = cachedTrip;
        foundAgency = agencies.find(a => a.agencyId === cachedTrip?.agencyId);
      }

      if (!foundTrip) {
        const sb = supabase;
        if (!sb) {
          setLoading(false);
          return;
        }

        try {
          const { data: dbData, error: dbError } = await sb
            .from('trips')
            .select('*, agencies:agency_id(*), trip_images(*)')
            .or(`slug.eq.${activeTripIdentifier},id.eq.${activeTripIdentifier}`)
            .maybeSingle();

          if (dbData) {
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
                id: dbData.agencies.user_id,
                agencyId: dbData.agencies.id,
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
                subscriptionPlan: 'BASIC',
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

      if (foundTrip) {
        const isAgencyOwnerViewingInactiveTrip = user?.role === UserRole.AGENCY && user.id === foundTrip.agencyId && !foundTrip.is_active;

        if (foundTrip.is_active || isAgencyOwnerViewingInactiveTrip) {
            setTrip(foundTrip);
            setAgency(foundAgency);
            if (foundTrip.is_active && (!user || user.id !== foundTrip.agencyId)) {
                incrementTripViews(foundTrip.id);
            }
        } else {
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
  }, [slug, tripSlug, agencySlug, getTripBySlug, clients, agencies, user, incrementTripViews]);

  useEffect(() => {
    setPassengerDetails(prev => {
      const newDetails = [...prev];
      if (passengers > prev.length) {
        for (let i = prev.length; i < passengers; i++) {
          newDetails.push({ name: '', document: '' });
        }
      } else if (passengers < prev.length) {
        return newDetails.slice(0, passengers);
      }
      return newDetails;
    });
  }, [passengers]);

  const handlePassengerChange = useCallback((index: number, field: 'name' | 'document', value: string) => {
    setPassengerDetails(prev => {
      const newDetails = [...prev];
      newDetails[index] = { ...newDetails[index], [field]: value };
      return newDetails;
    });
  }, []);

  useEffect(() => {
    if (user && isBookingModalOpen && passengerDetails[0]?.name === '') {
        const clientData = clients.find(c => c.id === user.id);
        if (clientData) {
            handlePassengerChange(0, 'name', clientData.name);
            handlePassengerChange(0, 'document', clientData.cpf || '');
        } else {
            handlePassengerChange(0, 'name', user.name);
        }
    }
  }, [user, isBookingModalOpen, clients, handlePassengerChange, passengerDetails]);

  // --- Lightbox Functions ---
  const openLightbox = (index: number) => {
    setPhotoIndex(index);
    setIsLightboxOpen(true);
    document.body.style.overflow = 'hidden'; // Prevent scrolling
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
    document.body.style.overflow = 'auto'; // Restore scrolling
  };

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((prev) => (prev + 1) % (trip?.images?.length || 1));
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((prev) => (prev - 1 + (trip?.images?.length || 1)) % (trip?.images?.length || 1));
  };

  // --- Handler Functions ---
  const handleFavorite = () => {
      if (!user) { showToast('Faça login para favoritar.', 'info'); return; }
      if (user.role !== 'CLIENT') { showToast('Apenas viajantes podem favoritar.', 'warning'); return; }
      toggleFavorite(trip!.id, user.id);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) { showToast('Faça login para reservar.', 'info'); navigate('/#login'); return; }
      if (user.role !== 'CLIENT') { showToast('Apenas viajantes podem fazer reservas.', 'warning'); return; }

      for (let i = 0; i < passengers; i++) {
          if (!passengerDetails[i].name.trim()) { showToast(`Preencha o nome do passageiro ${i + 1}.`, 'warning'); return; }
      }

      setIsBookingProcessing(true); 
      try {
        const newBookingId = crypto.randomUUID();
        const voucherCode = `VS-${Math.floor(Math.random() * 100000)}`;
        const bookingData: Booking = {
            id: newBookingId,
            tripId: trip!.id,
            clientId: user.id,
            date: new Date().toISOString(),
            status: 'CONFIRMED', 
            totalPrice: (trip!.price * passengers),
            passengers: passengers,
            voucherCode: voucherCode,
            paymentMethod: 'PIX',
            _trip: trip, _agency: agency 
        };
        const createdBooking = await addBooking(bookingData); 
        setIsBookingModalOpen(false);
        showToast('Reserva realizada com sucesso!', 'success');
        const successLink = agencySlug ? `/${agencySlug}/checkout/success` : `/checkout/success`;
        navigate(successLink, { state: { booking: createdBooking } });
      } catch (error: any) {
        showToast(`Erro ao criar reserva: ${error.message}`, 'error');
      } finally {
        setIsBookingProcessing(false);
      }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader className="animate-spin text-primary-600" size={32} /></div>;
  if (!trip) return <div className="min-h-screen flex flex-col items-center justify-center text-center p-8"><h2 className="text-2xl font-bold mb-4">Viagem não encontrada</h2><button onClick={() => navigate(-1)} className="text-primary-600 font-bold hover:underline">Voltar</button></div>;

  const totalPrice = trip.price * passengers;
  const contactNumber = agency?.whatsapp || agency?.phone;
  const whatsappLink = contactNumber ? buildWhatsAppLink(contactNumber, trip) : null;
  const clientData = clients.find(c => c.id === user?.id);
  const isFavorite = clientData?.favorites?.includes(trip.id);
  const images = trip.images && trip.images.length > 0 ? trip.images : ['https://placehold.co/1200x800?text=Sem+Imagem'];

  return (
    <div className="bg-white min-h-screen pb-20">
      
      {/* --- LIGHTBOX --- */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-[fadeIn_0.2s]" onClick={closeLightbox}>
            <button onClick={closeLightbox} className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors z-50"><X size={32}/></button>
            
            <button onClick={prevPhoto} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 rounded-full hover:bg-white/10 transition-colors hidden md:block"><ChevronLeft size={48}/></button>
            <button onClick={nextPhoto} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 rounded-full hover:bg-white/10 transition-colors hidden md:block"><ChevronRight size={48}/></button>
            
            <div className="max-w-7xl max-h-[90vh] w-full px-4 flex items-center justify-center relative">
                <img src={images[photoIndex]} alt="" className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl" onClick={(e) => e.stopPropagation()} />
            </div>
            
            <div className="absolute bottom-6 left-0 right-0 text-center text-white/80 font-medium">
                {photoIndex + 1} / {images.length}
            </div>
        </div>
      )}

      {/* --- HEADER NAVIGATION --- */}
      <div className="border-b border-gray-100 bg-white sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-900 font-medium transition-colors">
                  <ArrowRight className="rotate-180 mr-2" size={18} /> Voltar
              </button>
              <div className="flex gap-4">
                  <button className="text-gray-400 hover:text-gray-900 transition-colors"><Share2 size={20}/></button>
                  <button onClick={handleFavorite} className={`text-gray-400 transition-colors ${isFavorite ? 'text-red-500 fill-current' : 'hover:text-red-500'}`}>
                      <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
                  </button>
              </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          
          {/* --- TITLE & RATING --- */}
          <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2 leading-tight">{trip.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1 font-bold text-gray-900"><Star size={14} className="fill-gray-900"/> {trip.tripRating?.toFixed(1) || '5.0'}</div>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <span className="underline decoration-gray-300 underline-offset-4">{trip.tripTotalReviews || 0} avaliações</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <span className="flex items-center gap-1"><MapPin size={14}/> {trip.destination}</span>
              </div>
          </div>

          {/* --- IMAGE GALLERY (Grid Desktop / Carousel Mobile) --- */}
          <div className="relative mb-10 group">
              {/* Desktop Grid */}
              <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-[450px] rounded-2xl overflow-hidden cursor-pointer" onClick={() => openLightbox(0)}>
                  <div className="col-span-2 row-span-2 relative overflow-hidden group/img">
                      <img src={images[0]} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105" />
                      <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors"></div>
                  </div>
                  {images.slice(1, 5).map((img, idx) => (
                      <div key={idx} className="col-span-1 row-span-1 relative overflow-hidden group/img">
                          <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105" />
                          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors"></div>
                          {idx === 3 && images.length > 5 && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-lg backdrop-blur-sm">
                                  +{images.length - 5} fotos
                              </div>
                          )}
                      </div>
                  ))}
              </div>

              {/* Mobile Carousel */}
              <div className="md:hidden -mx-4 overflow-x-auto snap-x snap-mandatory flex scrollbar-hide h-80">
                  {images.map((img, idx) => (
                      <div key={idx} className="snap-center w-full flex-shrink-0 relative" onClick={() => openLightbox(idx)}>
                          <img src={img} alt="" className="w-full h-full object-cover" />
                      </div>
                  ))}
                  <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-md">
                      1 / {images.length}
                  </div>
              </div>

              {/* Show All Photos Button (Desktop) */}
              <button 
                onClick={() => openLightbox(0)}
                className="hidden md:flex absolute bottom-4 right-4 bg-white border border-gray-900/10 shadow-lg px-4 py-2 rounded-lg text-sm font-bold items-center gap-2 hover:bg-gray-50 hover:scale-105 transition-all"
              >
                  <Grid size={16}/> Mostrar todas as fotos
              </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative">
              
              {/* --- LEFT COLUMN: DETAILS --- */}
              <div className="lg:col-span-2 space-y-10">
                  
                  {/* Highlights */}
                  <div className="flex flex-wrap gap-4 pb-8 border-b border-gray-100">
                      <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-2xl flex items-center gap-3 font-medium text-sm">
                          <Calendar size={20}/>
                          <div>
                              <p className="text-[10px] uppercase font-bold text-blue-400">Data</p>
                              {new Date(trip.startDate).toLocaleDateString()}
                          </div>
                      </div>
                      <div className="bg-purple-50 text-purple-700 px-4 py-3 rounded-2xl flex items-center gap-3 font-medium text-sm">
                          <Clock size={20}/>
                          <div>
                              <p className="text-[10px] uppercase font-bold text-purple-400">Duração</p>
                              {trip.durationDays} dias
                          </div>
                      </div>
                      <div className="bg-green-50 text-green-700 px-4 py-3 rounded-2xl flex items-center gap-3 font-medium text-sm">
                          <User size={20}/>
                          <div>
                              <p className="text-[10px] uppercase font-bold text-green-500">Vagas</p>
                              Limitadas
                          </div>
                      </div>
                  </div>

                  {/* Description */}
                  <div className="prose prose-blue text-gray-600 leading-relaxed text-base max-w-none">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Sobre a experiência</h3>
                      <p>{trip.description}</p>
                  </div>

                  {/* Included / Not Included */}
                  <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-6">O que está incluso</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {trip.included.map((item, idx) => (
                              <div key={idx} className="flex items-start gap-3">
                                  <div className="mt-0.5 bg-green-100 text-green-600 rounded-full p-1"><Check size={12}/></div>
                                  <span className="text-gray-600 text-sm">{item}</span>
                              </div>
                          ))}
                          {trip.notIncluded?.map((item, idx) => (
                              <div key={`not-${idx}`} className="flex items-start gap-3">
                                  <div className="mt-0.5 bg-red-100 text-red-500 rounded-full p-1"><X size={12}/></div>
                                  <span className="text-gray-500 text-sm line-through decoration-gray-300">{item}</span>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* Itinerary */}
                  {trip.itinerary && trip.itinerary.length > 0 && (
                      <div className="pt-8 border-t border-gray-100">
                          <h3 className="text-xl font-bold text-gray-900 mb-8">Roteiro Dia a Dia</h3>
                          <div className="space-y-0 relative pl-8 border-l-2 border-gray-100 ml-4">
                              {trip.itinerary.map((day: ItineraryDay, idx: number) => (
                                  <div key={idx} className="mb-10 last:mb-0 relative">
                                      <div className="absolute -left-[41px] top-0 w-5 h-5 bg-gray-900 rounded-full border-4 border-white shadow-sm flex items-center justify-center">
                                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                      </div>
                                      <h4 className="font-bold text-gray-900 text-lg mb-2 flex items-center gap-3">
                                          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded uppercase tracking-wider font-bold">Dia {day.day}</span>
                                          {day.title}
                                      </h4>
                                      <p className="text-gray-600 leading-relaxed text-sm">{day.description}</p>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* Boarding Points */}
                  {trip.boardingPoints && trip.boardingPoints.length > 0 && (
                      <div className="pt-8 border-t border-gray-100">
                          <h3 className="text-xl font-bold text-gray-900 mb-6">Locais de Embarque</h3>
                          <div className="space-y-3">
                              {trip.boardingPoints.map((bp: BoardingPoint, idx: number) => (
                                  <div key={idx} className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                      <div className="bg-white p-2 rounded-lg text-primary-600 shadow-sm"><Bus size={20}/></div>
                                      <div>
                                          <p className="text-sm font-bold text-gray-900">{bp.time}</p>
                                          <p className="text-sm text-gray-600">{bp.location}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* Agency Card */}
                  {agency && (
                      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center gap-6 mt-12">
                          <img src={agency.logo} alt={agency.name} className="w-20 h-20 rounded-full object-cover border-4 border-gray-50"/>
                          <div>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Organizado por</p>
                              <h3 className="text-xl font-bold text-gray-900 mb-1">{agency.name}</h3>
                              <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                                  <ShieldCheck size={16}/> Agência Verificada
                              </div>
                              <Link to={`/${agency.slug}`} className="mt-3 inline-block text-primary-600 text-sm font-bold hover:underline">Ver perfil da agência</Link>
                          </div>
                      </div>
                  )}
              </div>

              {/* --- RIGHT COLUMN: STICKY BOOKING CARD --- */}
              <div className="lg:col-span-1 relative">
                  <div className="sticky top-24 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 z-30">
                      <div className="mb-6">
                          <p className="text-sm text-gray-500 font-medium line-through decoration-gray-400">de R$ {(trip.price * 1.2).toLocaleString('pt-BR')}</p>
                          <div className="flex items-baseline gap-1">
                              <span className="text-sm font-bold text-gray-900">R$</span>
                              <span className="text-4xl font-extrabold text-gray-900">{trip.price.toLocaleString('pt-BR')}</span>
                              <span className="text-sm text-gray-500 font-normal">/ pessoa</span>
                          </div>
                      </div>

                      <div className="space-y-4 mb-6">
                          <div className="border border-gray-200 rounded-xl p-3 flex justify-between items-center bg-gray-50/50">
                              <div className="flex items-center gap-3">
                                  <div className="bg-white p-2 rounded-lg text-gray-500 shadow-sm"><User size={16}/></div>
                                  <span className="text-sm font-bold text-gray-700">Passageiros</span>
                              </div>
                              <div className="flex items-center gap-3 bg-white rounded-lg px-2 py-1 shadow-sm border border-gray-100">
                                  <button onClick={() => setPassengers(Math.max(1, passengers - 1))} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-primary-600 transition-colors font-bold disabled:opacity-50">-</button>
                                  <span className="font-bold text-gray-900 w-4 text-center">{passengers}</span>
                                  <button onClick={() => setPassengers(passengers + 1)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-primary-600 transition-colors font-bold">+</button>
                              </div>
                          </div>
                          
                          <div className="flex justify-between items-center text-sm px-1">
                              <span className="text-gray-500">Total estimado</span>
                              <span className="font-bold text-gray-900">R$ {(trip.price * passengers).toLocaleString('pt-BR')}</span>
                          </div>
                      </div>

                      <button 
                          onClick={() => setIsBookingModalOpen(true)}
                          className="w-full bg-gradient-to-r from-primary-600 to-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary-600/30 hover:shadow-primary-600/50 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                          <ShoppingBag size={20}/> Reservar Agora
                      </button>

                      {whatsappLink && (
                          <a 
                              href={whatsappLink} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="mt-3 w-full bg-white border-2 border-[#25D366] text-[#25D366] font-bold py-3.5 rounded-xl hover:bg-[#25D366] hover:text-white transition-all flex items-center justify-center gap-2 group"
                          >
                              <MessageCircle size={20} className="group-hover:fill-white/20 transition-colors"/> Dúvidas no WhatsApp
                          </a>
                      )}
                      
                      <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                          <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                              <ShieldCheck size={12}/> Pagamento Seguro via PIX
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* --- BOOKING MODAL --- */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]" onClick={() => setIsBookingModalOpen(false)}>
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative animate-[scaleIn_0.3s] max-h-[95vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsBookingModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition-colors"><X size={20}/></button>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Confirmar Reserva</h2>
            
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-8 flex items-center gap-4">
                <img src={images[0]} alt={trip.title} className="w-20 h-20 object-cover rounded-xl shadow-sm"/>
                <div>
                    <h3 className="font-bold text-gray-900 text-base line-clamp-1">{trip.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{new Date(trip.startDate).toLocaleDateString()} • {passengers} pessoas</p>
                    <p className="text-sm font-bold text-primary-600 mt-1">Total: R$ {totalPrice.toLocaleString('pt-BR')}</p>
                </div>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-4">Dados dos Passageiros</label>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {Array.from({ length: passengers }).map((_, idx) => (
                    <div key={idx} className="space-y-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Passageiro {idx + 1}</p>
                        <PassengerInput 
                            index={idx} 
                            field="name" 
                            value={passengerDetails[idx]?.name || ''} 
                            onChange={handlePassengerChange} 
                            placeholder="Nome Completo"
                            required
                        />
                        <PassengerInput 
                            index={idx} 
                            field="document" 
                            value={passengerDetails[idx]?.document || ''} 
                            onChange={handlePassengerChange} 
                            placeholder={idx === 0 ? "CPF (Obrigatório)" : "CPF (Opcional)"}
                            required={idx === 0}
                        />
                    </div>
                  ))}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isBookingProcessing}
                className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBookingProcessing ? <Loader size={20} className="animate-spin" /> : <Check size={20} />} Confirmar e Pagar
              </button>
              <p className="text-center text-xs text-gray-400">Ao confirmar, você concorda com os termos de uso.</p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripDetails;
