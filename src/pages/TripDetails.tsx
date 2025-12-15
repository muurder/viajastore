
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Trip, PassengerDetail } from '../types';
import { MapPin, Clock, Calendar, CheckCircle, User, Star, Share2, Heart, ArrowLeft, MessageCircle, AlertTriangle, ShieldCheck, Tag, Bus, Globe } from 'lucide-react';
import { buildWhatsAppLink } from '../utils/whatsapp';
import { PassengerDataModal } from '../components/PassengerDataModal';
import { BookingWidget } from '../components/BookingWidget';
import { logger } from '../utils/logger';
import { X } from 'lucide-react';

const TripDetails: React.FC = () => {
  const { slug, tripSlug, agencySlug } = useParams<{ slug?: string; tripSlug?: string; agencySlug?: string }>();
  const activeSlug = tripSlug || slug;

  const { getTripBySlug, getAgencyBySlug, getAgencyPublicTrips, getTripById, addBooking, toggleFavorite, clients, getReviewsByTripId, agencies, fetchTripImages, loading } = useData();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [tripLoading, setTripLoading] = useState(true);
  const [tripError, setTripError] = useState<string | null>(null);
  const [trip, setTrip] = useState<Trip | undefined>(undefined);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Enhanced trip loading with timeout, retry, and proper data loading wait
  useEffect(() => {
    if (!activeSlug) {
      setTripLoading(false);
      setTripError('Nenhuma viagem especificada.');
      return;
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Reset retry count when slug changes
    retryCountRef.current = 0;

    const loadTrip = async () => {
      // Re-check activeSlug to satisfy TypeScript in async closure
      if (!activeSlug) {
        setTripLoading(false);
        setTripError('Nenhuma viagem especificada.');
        return;
      }

      setTripLoading(true);
      setTripError(null);

      try {
        // Wait for DataContext to finish loading if it's still loading
        // Check loading state from DataContext by checking if trips array is empty
        let waitCount = 0;
        const maxWait = 20; // 20 * 500ms = 10 seconds
        while (loading && waitCount < maxWait) {
          await new Promise(resolve => setTimeout(resolve, 500));
          waitCount++;
        }

        // Get agency if in microsite context
        const agency = agencySlug ? getAgencyBySlug(agencySlug) : undefined;

        let foundTrip: Trip | undefined = undefined;

        if (agency) {
          // In agency microsite: search within agency's trips first
          const agencyTrips = getAgencyPublicTrips(agency.agencyId);
          foundTrip = agencyTrips.find(t => t.slug === activeSlug);

          // If not found by slug, try by ID (fallback for old links)
          if (!foundTrip) {
            foundTrip = getTripById(activeSlug);
            // Verify it belongs to this agency
            if (foundTrip && foundTrip.agencyId !== agency.agencyId) {
              foundTrip = undefined;
            }
          }
        } else {
          // Global context: search all trips
          foundTrip = getTripBySlug(activeSlug);

          // If not found by slug, try by ID (fallback for old links)
          if (!foundTrip) {
            foundTrip = getTripById(activeSlug);
          }
        }

        if (foundTrip) {
          setTrip(foundTrip);
          setTripError(null);
          setTripLoading(false);
          // Clear timeout if trip was found
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        } else {
          // Retry logic: if we haven't exceeded max retries, retry after a delay
          // This helps when data is still loading in the background
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            // Retry after a short delay (increasing delay with each retry)
            const retryDelay = 1000 * retryCountRef.current;
            timeoutRef.current = setTimeout(() => {
              loadTrip();
            }, retryDelay);
            return;
          }
          setTripError('Viagem não encontrada');
          setTripLoading(false);
        }
      } catch (error: any) {
        logger.error('Error loading trip:', error);
        setTripError('Erro ao carregar viagem');
        setTripLoading(false);
      }
    };

    loadTrip();

    // Timeout after 15 seconds (increased from 5 to give more time for data loading)
    timeoutRef.current = setTimeout(() => {
      // Use a function to check current state, not the closure value
      setTripLoading(prevLoading => {
        if (prevLoading) {
          setTripError('Tempo de carregamento excedido. Tente novamente.');
          return false;
        }
        return prevLoading;
      });
    }, 15000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [activeSlug, agencySlug, getTripBySlug, getAgencyBySlug, getAgencyPublicTrips, getTripById, loading]);

  const currentAgency = agencySlug ? getAgencyBySlug(agencySlug) : undefined;
  const agency = trip ? agencies.find(a => a.agencyId === trip.agencyId) : currentAgency;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [showPassengerModal, setShowPassengerModal] = useState(false);
  const [passengerData, setPassengerData] = useState<PassengerDetail[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [showMobileBooking, setShowMobileBooking] = useState(false);

  const totalPassengers = adults + children;

  // Load images on-demand when trip is loaded
  useEffect(() => {
    if (trip && trip.images.length === 0 && !imagesLoaded) {
      fetchTripImages(trip.id).then(() => {
        setImagesLoaded(true);
      });
    }
  }, [trip, fetchTripImages, imagesLoaded]);

  // Favorites logic
  const currentUserData = user ? clients.find(c => c.id === user.id) : undefined;
  const isFavorite = user?.role === 'CLIENT' && trip && currentUserData?.favorites.includes(trip.id);

  // Loading state with timeout
  if (tripLoading || (loading && !trip)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 font-medium">Carregando viagem...</p>
      </div>
    );
  }

  // Error state with retry
  if (tripError || !trip) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Viagem não encontrada</h2>
        <p className="text-gray-500 mb-4 text-center max-w-md">
          {tripError || (activeSlug ? `A viagem com slug "${activeSlug}" não foi encontrada.` : 'Nenhuma viagem especificada.')}
          {currentAgency && ' Verifique se a viagem pertence a esta agência.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              setTripLoading(true);
              setTripError(null);
              retryCountRef.current = 0;

              // Wait for DataContext to finish loading if it's still loading
              if (loading) {
                let waitCount = 0;
                const maxWait = 20;
                while (loading && waitCount < maxWait) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                  waitCount++;
                }
              }

              // Retry loading with full logic
              const agency = agencySlug ? getAgencyBySlug(agencySlug) : undefined;
              let foundTrip: Trip | undefined = undefined;

              if (agency) {
                const agencyTrips = getAgencyPublicTrips(agency.agencyId);
                foundTrip = agencyTrips.find(t => t.slug === activeSlug);
                if (!foundTrip) {
                  foundTrip = getTripById(activeSlug);
                  if (foundTrip && foundTrip.agencyId !== agency.agencyId) {
                    foundTrip = undefined;
                  }
                }
              } else {
                foundTrip = getTripBySlug(activeSlug);
                if (!foundTrip) {
                  foundTrip = getTripById(activeSlug);
                }
              }

              if (foundTrip) {
                setTrip(foundTrip);
                setTripError(null);
              } else {
                setTripError('Viagem não encontrada');
              }
              setTripLoading(false);
            }}
            className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-primary-700 transition-colors"
          >
            Tentar Novamente
          </button>
          <Link
            to={currentAgency ? `/${currentAgency.slug}/trips` : '/trips'}
            className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg font-bold hover:bg-gray-200 transition-colors"
          >
            {currentAgency ? `Voltar para pacotes de ${currentAgency.name}` : 'Voltar para lista de viagens'}
          </Link>
        </div>
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

    // If more than 1 passenger (total), show modal to collect passenger data
    if (totalPassengers > 1) {
      setShowPassengerModal(true);
      return;
    }

    // Single passenger - proceed directly
    await processBooking([]);
  };

  const processBooking = async (passengersData: PassengerDetail[]) => {
    setIsProcessing(true);
    try {
      // Get passenger config from trip (with defaults)
      const passengerConfig = trip.passengerConfig || {
        allowChildren: trip.allowChildren !== false,
        allowSeniors: true,
        childAgeLimit: 12,
        allowLapChild: false,
        childPriceMultiplier: 0.7
      };

      // Calculate price: adults pay full price, children pay configured price (fixed or multiplier)
      const childPriceValue = passengerConfig.childPriceType === 'fixed' && passengerConfig.childPriceFixed !== undefined
        ? passengerConfig.childPriceFixed
        : (trip.price * (passengerConfig.childPriceMultiplier || 0.7));
      const adultPrice = trip.price * adults;
      const childPrice = childPriceValue * children;
      const totalPrice = adultPrice + childPrice;

      const bookingData = {
        id: crypto.randomUUID(),
        tripId: trip.id,
        clientId: user!.id,
        date: new Date().toISOString(),
        status: 'CONFIRMED' as const,
        totalPrice: totalPrice,
        passengers: totalPassengers,
        voucherCode: `VS-${trip.id.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 10000)}`,
        paymentMethod: 'CREDIT_CARD' as const,
        passengerDetails: passengersData.length > 0 ? passengersData : undefined
      };

      const newBooking = await addBooking(bookingData);

      if (newBooking) {
        // Navigate to success page with passenger data
        const successPath = agencySlug ? `/${agencySlug}/checkout/success` : '/checkout/success';
        navigate(successPath, {
          state: {
            booking: newBooking,
            passengers: passengersData.length > 0 ? passengersData : (newBooking.passengerDetails || [])
          }
        });
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
      }).catch((err) => logger.error(err));
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link copiado!', 'success');
    }
  };

  const whatsappLink = buildWhatsAppLink(agency.whatsapp || agency.phone, trip);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-[fadeIn_0.3s] pb-32 lg:pb-8">
      {/* Breadcrumb / Back */}
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={20} className="mr-2" /> Voltar
        </button>
        <div className="flex gap-2">
          <button onClick={handleFavorite} className={`p-2 rounded-full border transition-colors ${isFavorite ? 'bg-red-50 text-red-500 border-red-100' : 'bg-white text-gray-400 border-gray-200 hover:text-red-500'}`}>
            <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button onClick={handleShare} className="p-2 rounded-full border bg-white text-gray-400 border-gray-200 hover:text-primary-600 transition-colors">
            <Share2 size={20} />
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
                src={trip.images[activeImageIndex] || ''}
                alt={trip.title}
                loading="lazy"
                decoding="async"
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
                    <img src={img} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
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
                    <Tag size={10} className="text-gray-400" /> {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 mb-6">
              <div className="flex items-center"><MapPin size={18} className="mr-2 text-primary-500" /> {trip.destination}</div>
              <div className="flex items-center"><Clock size={18} className="mr-2 text-primary-500" /> {trip.durationDays} dias</div>
              <div className="flex items-center">
                <Star size={18} className="mr-2 text-amber-400 fill-current" />
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
              <h4 className="font-bold text-green-800 mb-4 flex items-center"><CheckCircle size={18} className="mr-2" /> O que está incluso</h4>
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
                <h4 className="font-bold text-red-800 mb-4 flex items-center"><AlertTriangle size={18} className="mr-2" /> O que não está incluso</h4>
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

          {/* Map Location */}
          {trip.latitude && trip.longitude && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Globe size={24} className="text-primary-600" /> Localização no Mapa
              </h3>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <iframe
                  width="100%"
                  height="400"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps/embed/v1/place?key=${(import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBFw0Qbyq9zTFTd-tUY6d-s6U4c37ZJMTI'}&q=${trip.latitude},${trip.longitude}&zoom=13`}
                />
              </div>
            </div>
          )}

          {/* Boarding Points */}
          {trip.boardingPoints && trip.boardingPoints.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Bus size={24} className="text-gray-400" /> Locais de Embarque
              </h3>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
                {trip.boardingPoints.map((bp) => (
                  <div key={bp.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                    <div className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-bold text-gray-900 shadow-sm w-fit flex items-center gap-2">
                      <Clock size={14} className="text-primary-600" /> {bp.time}
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <MapPin size={16} className="text-gray-400 mr-2 flex-shrink-0" /> {bp.location}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agency Info */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
            <img src={agency.logo} alt={agency.name} loading="lazy" decoding="async" className="w-20 h-20 rounded-full object-cover border-4 border-gray-50 shadow-sm" />
            <div className="text-center sm:text-left flex-1">
              <h4 className="font-bold text-lg text-gray-900 mb-1">{agency.name}</h4>
              <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-gray-500 mb-3">
                <ShieldCheck size={16} className="text-green-500" /> Agência Verificada
              </div>
              <p className="text-sm text-gray-500 line-clamp-2">{agency.description}</p>
            </div>
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <Link to={`/${agency.slug}`} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 text-center transition-colors">
                Ver Perfil
              </Link>
              {whatsappLink && (
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 text-center transition-colors flex items-center justify-center gap-2">
                  <MessageCircle size={16} /> WhatsApp
                </a>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Sticky Booking Card (Desktop) */}
        <div className="hidden lg:block lg:col-span-1 relative">
          <div className="sticky top-24 shadow-xl shadow-gray-200/50 border border-gray-100 rounded-2xl z-30">
            <BookingWidget
              trip={trip}
              adults={adults}
              setAdults={setAdults}
              childrenCount={children}
              setChildren={setChildren}
              totalPassengers={totalPassengers}
              handleBooking={handleBooking}
              isProcessing={isProcessing}
            />
          </div>
        </div>

      </div>

      {/* Voltar para ViajaStore - Prominent button for agency microsite context */}
      {agencySlug && (
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col items-center justify-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-3 px-6 py-3 bg-primary-50 hover:bg-primary-100 text-primary-700 hover:text-primary-800 font-bold rounded-xl transition-all shadow-sm hover:shadow-md border border-primary-200 text-sm uppercase tracking-wider"
            >
              <Globe size={16} className="text-primary-600" />
              Voltar para ViajaStore
            </Link>
            <p className="text-xs text-gray-500 text-center max-w-md">
              Explore mais destinos e experiências incríveis no marketplace ViajaStore
            </p>
          </div>
        </div>
      )}

      {/* Passenger Data Modal */}
      {user && (
        <PassengerDataModal
          isOpen={showPassengerModal}
          onClose={() => setShowPassengerModal(false)}
          onConfirm={handlePassengerDataConfirm}
          passengerCount={totalPassengers}
          adultsCount={adults}
          childrenCount={children}
          mainPassengerName={user.name || ''}
          mainPassengerCpf={currentUserData?.cpf}
          mainPassengerPhone={currentUserData?.phone}
          mainPassengerBirthDate={currentUserData?.birthDate}
          passengerConfig={trip.passengerConfig || {
            allowChildren: trip.allowChildren !== false,
            allowSeniors: true,
            childAgeLimit: 12,
            allowLapChild: false,
            childPriceMultiplier: 0.7
          }}
        />
      )}

      {/* Mobile Fixed Booking Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">A partir de</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-semibold text-gray-900">R$</span>
              <span className="text-2xl font-extrabold text-primary-600">{trip.price.toLocaleString('pt-BR')}</span>
            </div>
            <span className="text-[10px] text-gray-400">por pessoa</span>
          </div>
          <button
            onClick={() => setShowMobileBooking(true)}
            className="bg-primary-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary-600/20 active:scale-95 transition-all"
          >
            Reservar
          </button>
        </div>
      </div>

      {/* Mobile Booking Drawer/Modal */}
      {showMobileBooking && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/60 z-50 backdrop-blur-sm animate-[fadeIn_0.2s]"
            onClick={() => setShowMobileBooking(false)}
          />
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[51] animate-[slideUp_0.3s] rounded-t-3xl overflow-hidden max-h-[85vh] overflow-y-auto">
            <div className="bg-white p-1 flex justify-center border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full my-2"></div>
              <button
                onClick={() => setShowMobileBooking(false)}
                className="absolute right-4 top-3 p-2 bg-gray-100 rounded-full"
              >
                <X size={16} />
              </button>
            </div>
            <BookingWidget
              trip={trip}
              adults={adults}
              setAdults={setAdults}
              childrenCount={children}
              setChildren={setChildren}
              totalPassengers={totalPassengers}
              handleBooking={handleBooking}
              isProcessing={isProcessing}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default TripDetails;
