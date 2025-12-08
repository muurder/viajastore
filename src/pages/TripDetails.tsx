import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Booking, Agency, Trip, UserRole } from '../types';
import { MapPin, Calendar, Clock, Star, Share2, Heart, Check, X, ChevronDown, ChevronUp, User, ShoppingBag, ShieldCheck, Info, MessageCircle, ArrowRight } from 'lucide-react';
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
      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
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
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Viagem não encontrada</h2>
        <button onClick={() => navigate(-1)} className="text-primary-600 font-bold hover:underline">Voltar</button>
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

  return (
    <div className="max-w-7xl mx-auto pb-12 pt-6 px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-900 mb-6 font-medium transition-colors">
        <ChevronDown className="rotate-90 mr-1" size={20} /> Voltar
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Images & Content */}
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

          {/* Title & Info */}
          <div>
             <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">{trip.title}</h1>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center"><MapPin size={16} className="mr-1"/> {trip.destination}</span>
                        <span className="flex items-center"><Clock size={16} className="mr-1"/> {trip.durationDays} dias</span>
                    </div>
                </div>
                {trip.tripRating && (
                    <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                        <Star size={20} className="text-amber-400 fill-current"/>
                        <span className="font-bold text-gray-900">{trip.tripRating.toFixed(1)}</span>
                        <span className="text-gray-400 text-sm">({trip.tripTotalReviews} avaliações)</span>
                    </div>
                )}
             </div>

             <div className="prose prose-blue text-gray-600 max-w-none">
                 <h3 className="text-lg font-bold text-gray-900 mb-2">Sobre a viagem</h3>
                 <p className="leading-relaxed whitespace-pre-line">{trip.description}</p>
             </div>
          </div>

          {/* Included Items */}
          <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                  <h3 className="font-bold text-green-800 mb-4 flex items-center"><Check size={20} className="mr-2"/> O que está incluso</h3>
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
                      <h3 className="font-bold text-red-800 mb-4 flex items-center"><X size={20} className="mr-2"/> O que não está incluso</h3>
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
                          <div key={day.day} className="flex gap-4">
                              <div className="flex flex-col items-center">
                                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm shrink-0">
                                      {day.day}
                                  </div>
                                  <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                              </div>
                              <div className="pb-6">
                                  <h4 className="font-bold text-gray-900 mb-1">{day.title}</h4>
                                  <p className="text-gray-600 text-sm leading-relaxed">{day.description}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}
        </div>

        {/* Right Column: Booking Card */}
        <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="mb-6">
                    <p className="text-sm text-gray-500 font-medium mb-1">Preço por pessoa</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-sm font-semibold text-gray-400">R$</span>
                        <span className="text-4xl font-extrabold text-gray-900">{trip.price.toLocaleString('pt-BR')}</span>
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Calendar className="text-primary-500" size={20}/>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Data</p>
                                <p className="font-bold text-gray-900">{new Date(trip.startDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <User className="text-primary-500" size={20}/>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Passageiros</p>
                                <div className="flex items-center gap-3 mt-1">
                                    <button 
                                        onClick={() => setPassengers(Math.max(1, passengers - 1))}
                                        className="w-6 h-6 rounded-full bg-white shadow flex items-center justify-center hover:bg-gray-100 text-primary-600 font-bold"
                                    >-</button>
                                    <span className="font-bold text-lg w-4 text-center">{passengers}</span>
                                    <button 
                                        onClick={() => setPassengers(Math.min(10, passengers + 1))}
                                        className="w-6 h-6 rounded-full bg-white shadow flex items-center justify-center hover:bg-gray-100 text-primary-600 font-bold"
                                    >+</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 pt-6 border-t border-gray-100">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Subtotal ({passengers}x)</span>
                        <span className="font-medium">R$ {totalPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-lg font-bold text-gray-900 pt-2">
                        <span>Total</span>
                        <span>R$ {totalPrice.toLocaleString()}</span>
                    </div>
                </div>

                <button 
                    onClick={() => setIsBookingModalOpen(true)}
                    className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/30 mt-6 flex items-center justify-center gap-2"
                >
                    <ShoppingBag size={20}/> Reservar Agora
                </button>

                {whatsappLink && (
                    <a 
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-green-50 text-green-700 py-3 rounded-xl font-bold text-sm hover:bg-green-100 transition-colors mt-3 flex items-center justify-center gap-2"
                    >
                        <MessageCircle size={18}/> Dúvidas? Chama no Zap
                    </a>
                )}

                {agency && (
                    <div className="mt-6 pt-6 border-t border-gray-100 flex items-center gap-3">
                        <img src={agency.logo || `https://ui-avatars.com/api/?name=${agency.name}`} className="w-10 h-10 rounded-full object-cover border border-gray-200" alt=""/>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500">Organizado por</p>
                            <Link to={`/${agency.slug || ''}`} className="font-bold text-gray-900 truncate hover:text-primary-600 block">{agency.name}</Link>
                        </div>
                        <div title="Agência Verificada"><ShieldCheck size={20} className="text-green-500" /></div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Booking Modal */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button 
                    onClick={() => setIsBookingModalOpen(false)} 
                    className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                    <X size={20} className="text-gray-600"/>
                </button>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Finalizar Reserva</h2>
                <p className="text-gray-500 text-sm mb-6">Preencha os dados dos passageiros para emitir seu voucher.</p>

                <form onSubmit={handleBookingSubmit} className="space-y-6">
                    {Array.from({ length: passengers }).map((_, idx) => (
                        <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100 animate-[fadeIn_0.3s]">
                            <h4 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
                                <User size={16} className="text-primary-500"/> Passageiro {idx + 1}
                            </h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
                                    <PassengerInput 
                                        index={idx}
                                        field="name"
                                        value={passengerDetails[idx]?.name || ''}
                                        onChange={handlePassengerChange}
                                        placeholder="Ex: João da Silva"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CPF / RG (Opcional)</label>
                                    <PassengerInput 
                                        index={idx}
                                        field="document"
                                        value={passengerDetails[idx]?.document || ''}
                                        onChange={handlePassengerChange}
                                        placeholder="Para seguro viagem"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="pt-4 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-600 font-medium">Total a pagar</span>
                            <span className="text-2xl font-extrabold text-primary-600">R$ {totalPrice.toLocaleString()}</span>
                        </div>
                        <button 
                            type="submit" 
                            disabled={isBookingProcessing}
                            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isBookingProcessing ? 'Processando...' : 'Confirmar Reserva'} <ArrowRight size={20}/>
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default TripDetails;