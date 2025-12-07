
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Booking, Agency, Trip } from '../types';
import { MapPin, Calendar, Clock, Star, Share2, Heart, Check, X, ChevronDown, ChevronUp, User, ShoppingBag } from 'lucide-react';
import { buildWhatsAppLink } from '../utils/whatsapp';

const TripDetails: React.FC = () => {
  // Update: Add tripSlug to support agency microsite routes defined in App.tsx
  const { slug, tripSlug, agencySlug } = useParams<{ slug?: string; tripSlug?: string; agencySlug?: string }>();
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
      // Resolve identifier: Global route uses 'slug', Agency route uses 'tripSlug'
      const activeTripIdentifier = slug || tripSlug || '';

      let foundTrip = getTripBySlug(activeTripIdentifier);
      if (!foundTrip && activeTripIdentifier) {
          foundTrip = getTripById(activeTripIdentifier);
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
  }, [slug, tripSlug, agencySlug, getTripBySlug, getTripById, getAgencyBySlug]);

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
                    <div className="flex