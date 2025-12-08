
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
