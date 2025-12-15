
import React, { useState, useMemo, useEffect } from 'react';
import { Trip } from '../types';
import { MapPin, Star, Heart, Clock, MessageCircle, ArrowRight, Check, TrendingUp } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { buildWhatsAppLink } from '../utils/whatsapp';
import { NoImagePlaceholder } from './NoImagePlaceholder';

interface TripCardProps {
  trip: Trip;
}

export const TripCardSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col animate-pulse">
    <div className="h-48 bg-gray-200 w-full"></div>
    <div className="p-5 flex-1 flex flex-col">
      <div className="flex justify-between mb-3">
        <div className="h-4 bg-gray-200 w-24 rounded"></div>
        <div className="h-4 bg-gray-200 w-12 rounded"></div>
      </div>
      <div className="h-6 bg-gray-200 w-full rounded mb-2"></div>
      <div className="h-6 bg-gray-200 w-2/3 rounded mb-4"></div>
      
      <div className="h-4 bg-gray-200 w-20 rounded mb-4"></div>
      
      <div className="flex gap-2 mb-5">
        <div className="h-5 bg-gray-200 w-16 rounded-full"></div>
        <div className="h-5 bg-gray-200 w-16 rounded-full"></div>
      </div>

      <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-end">
        <div className="h-8 bg-gray-200 w-24 rounded"></div>
        <div className="h-8 bg-gray-200 w-24 rounded-full"></div>
      </div>
    </div>
  </div>
);

// FIX: Changed from default export to named export
// Memoized component to prevent unnecessary re-renders
const TripCardComponent: React.FC<TripCardProps> = ({ trip }) => {
  const { user } = useAuth();
  const { toggleFavorite, clients, agencies, fetchTripImages } = useData();
  const { showToast } = useToast();
  const [imgError, setImgError] = useState(false);
  const [tripWithImages, setTripWithImages] = useState<Trip>(trip);
  
  // Context awareness for link generation
  const { agencySlug } = useParams<{ agencySlug?: string }>();

  // Load images on mount if they don't exist
  useEffect(() => {
    const loadImages = async () => {
      // If trip already has images, use them
      if (trip.images && trip.images.length > 0) {
        setTripWithImages(trip);
        return;
      }
      
      // Otherwise, try to fetch images
      if (fetchTripImages) {
        try {
          const images = await fetchTripImages(trip.id);
          if (images && images.length > 0) {
            setTripWithImages({ ...trip, images });
          } else {
            setTripWithImages(trip);
          }
        } catch (error) {
          // Silently fail - will show placeholder
          setTripWithImages(trip);
        }
      } else {
        setTripWithImages(trip);
      }
    };

    loadImages();
  }, [trip.id, trip.images, fetchTripImages]);

  // Update tripWithImages when trip prop changes (but keep existing images if new trip doesn't have any)
  useEffect(() => {
    if (trip.id !== tripWithImages.id) {
      // New trip - reset
      setTripWithImages(trip);
      setImgError(false);
    } else if (trip.images && trip.images.length > 0) {
      // Same trip but images were updated - check if arrays are different
      const currentImages = tripWithImages.images || [];
      const newImages = trip.images || [];
      if (newImages.length > 0 && (currentImages.length === 0 || currentImages[0] !== newImages[0])) {
        setTripWithImages(trip);
        setImgError(false);
      }
    }
  }, [trip, tripWithImages.id]);

  // Memoize computed values to prevent recalculation
  const linkTarget = useMemo(() => 
    agencySlug ? `/${agencySlug}/viagem/${trip.slug}` : `/viagem/${trip.slug}`,
    [agencySlug, trip.slug]
  );

  // Memoize favorite check
  const isFavorite = useMemo(() => {
    if (!user || user.role !== 'CLIENT') return false;
    const currentUserData = clients.find(c => c.id === user.id);
    return currentUserData?.favorites.includes(trip.id) || false;
  }, [user, clients, trip.id]);

  // Memoize agency and WhatsApp link - use tripWithImages for agencyId
  const { agency, whatsappLink } = useMemo(() => {
    const tripToUse = tripWithImages;
    const foundAgency = agencies.find(a => a.agencyId === tripToUse.agencyId);
    const contactNumber = foundAgency?.whatsapp || foundAgency?.phone;
    return {
      agency: foundAgency,
      whatsappLink: contactNumber ? buildWhatsAppLink(contactNumber, tripToUse) : null
    };
  }, [agencies, tripWithImages.agencyId, tripWithImages]);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent Link navigation
    e.stopPropagation(); // Stop bubbling
    
    if (!user) {
      showToast('Faça login para favoritar.', 'info');
      return;
    }

    if (user.role === 'CLIENT') {
      toggleFavorite(trip.id, user.id);
    } else {
      showToast('Apenas viajantes podem favoritar.', 'warning');
    }
  };

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent Link navigation
    e.stopPropagation(); // Stop bubbling
    if (whatsappLink) {
        window.open(whatsappLink, '_blank');
    }
  };

  // FIX: Rigorously check if trip has valid images
  const hasValidImages = tripWithImages.images && Array.isArray(tripWithImages.images) && tripWithImages.images.length > 0 && tripWithImages.images[0];
  const shouldShowPlaceholder = !hasValidImages || imgError;

  // Get rating value
  const rating = (tripWithImages as any).tripRating || tripWithImages.rating || 0;
  const hasRating = rating > 0;

  // Check for popular features
  const includedItems = tripWithImages.included || [];
  const hasBreakfast = includedItems.some(item => 
    item.toLowerCase().includes('café') || 
    item.toLowerCase().includes('cafe') || 
    item.toLowerCase().includes('café da manhã')
  );
  const hasFreeCancellation = includedItems.some(item => 
    item.toLowerCase().includes('cancelamento') || 
    item.toLowerCase().includes('cancelamento grátis')
  );

  // Check if popular/featured
  const isPopular = tripWithImages.featured || (tripWithImages.views || 0) > 100;

  return (
    <div className="h-full">
      <Link to={linkTarget} className="group block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 h-full flex flex-col">
        <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0">
          {shouldShowPlaceholder ? (
            <NoImagePlaceholder 
              title={tripWithImages.title} 
              category={tripWithImages.category}
              size="medium"
            />
          ) : (
            <>
              <img 
                src={tripWithImages.images[0]} 
                alt={tripWithImages.title} 
                loading="lazy"
                onError={(e) => {
                  setImgError(true);
                  // Fallback: try to hide broken image and show placeholder
                  const target = e.target as HTMLImageElement;
                  if (target) {
                    target.style.display = 'none';
                  }
                }}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              {/* Gradient overlay for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </>
          )}
          
          {/* Favorite button */}
          <div className="absolute top-3 right-3 z-10">
            <button 
              onClick={handleFavorite}
              className={`p-2 rounded-full backdrop-blur-md shadow-lg transition-all duration-200 active:scale-90 ${isFavorite ? 'bg-white text-red-500 shadow-red-200' : 'bg-white/90 text-gray-600 hover:bg-white hover:text-red-500'}`}
            >
              <Heart size={18} fill={isFavorite ? "currentColor" : "none"} className={isFavorite ? "animate-[pulse_0.3s]" : ""} />
            </button>
          </div>

          {/* Badges */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
            {isPopular && (
              <div className="bg-primary-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-lg backdrop-blur-sm border border-primary-400/30">
                <TrendingUp size={10} />
                Em Alta
              </div>
            )}
            <div className="bg-black/70 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-white/20 shadow-lg">
              {tripWithImages.category.replace(/_/g, ' ')}
            </div>
          </div>

          {/* Rating badge */}
          {hasRating && (
            <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md text-gray-900 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg border border-white/50">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
            </div>
          )}
        </div>
        
        <div className="p-6 flex flex-col h-full flex-1 min-h-0 overflow-hidden relative pb-24">
          {/* Location & Duration */}
          <div className="flex items-start justify-between mb-3 gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center text-xs font-semibold text-gray-600 mb-2">
                <MapPin size={13} className="mr-1.5 flex-shrink-0 text-primary-500" />
                <span className="truncate">{tripWithImages.destination}</span>
              </div>
              <div className="flex items-center text-xs text-gray-500">
                <Clock size={13} className="mr-1.5 flex-shrink-0 text-gray-400" />
                <span className="font-medium">{tripWithImages.durationDays} {tripWithImages.durationDays === 1 ? 'dia' : 'dias'}</span>
              </div>
            </div>
          </div>

          {/* Title - Altura fixa para manter consistência */}
          <div className="mb-4 min-h-[4rem] flex flex-col justify-center">
            <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-primary-600 transition-colors line-clamp-2 break-words">
              {tripWithImages.title}
            </h3>
          </div>

          {/* Features highlights */}
          <div className="flex flex-wrap gap-2 mb-4 flex-shrink-0 min-h-[32px]">
            {hasBreakfast && (
              <div className="flex items-center gap-1 text-[10px] px-2.5 py-1 bg-green-50 text-green-700 rounded-full font-semibold border border-green-100">
                <Check size={10} className="text-green-600" />
                Café da manhã
              </div>
            )}
            {hasFreeCancellation && (
              <div className="flex items-center gap-1 text-[10px] px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-semibold border border-blue-100">
                <Check size={10} className="text-blue-600" />
                Cancelamento grátis
              </div>
            )}
            {!hasBreakfast && !hasFreeCancellation && tripWithImages.tags && tripWithImages.tags.slice(0, 2).map((tag, index) => (
              <span key={index} className="text-[10px] px-2.5 py-1 bg-gray-50 text-gray-600 rounded-full font-semibold border border-gray-100">
                {tag}
              </span>
            ))}
          </div>

          {/* Tags Section */}
          {tripWithImages.tags && tripWithImages.tags.length > 0 && (hasBreakfast || hasFreeCancellation || tripWithImages.tags.length > 2) && (
            <div className="flex flex-wrap gap-1.5 mb-5 flex-shrink-0">
              {tripWithImages.tags.slice(hasBreakfast || hasFreeCancellation ? 0 : 2, 5).map((tag, index) => (
                <span key={index} className="text-[10px] px-2 py-0.5 bg-gray-50/80 text-gray-600 rounded-full font-medium border border-gray-100">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Price & CTA - Container que fica sempre no final */}
          <div className="absolute bottom-0 left-0 right-0 p-6 pt-4 border-t border-gray-100 group-hover:border-primary-200 transition-colors flex-shrink-0 bg-white">
            <div className="flex items-end justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">A partir de</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs text-gray-500 font-semibold">R$</span>
                  <span className="text-2xl font-extrabold text-gray-900 group-hover:text-primary-600 transition-colors">{tripWithImages.price.toLocaleString('pt-BR')}</span>
                </div>
                <span className="text-[10px] text-gray-400 mt-0.5">por pessoa</span>
              </div>
              <div className="flex items-center gap-2">
                {whatsappLink && (
                  <button
                    onClick={handleWhatsAppClick}
                    className="p-2.5 rounded-full bg-[#25D366] text-white hover:bg-[#20BA5A] transition-all shadow-md hover:shadow-lg flex-shrink-0 hover:-translate-y-0.5 border-2 border-green-400/30 active:scale-95"
                    style={{
                      transform: 'translateZ(0)',
                      willChange: 'transform',
                      backfaceVisibility: 'hidden'
                    }}
                    title="Falar no WhatsApp"
                  >
                    <MessageCircle size={16} className="fill-white" strokeWidth={0} />
                  </button>
                )}
                <div className="flex items-center gap-1.5 bg-primary-600 text-white px-4 py-2.5 rounded-full hover:bg-primary-700 transition-all shadow-sm hover:shadow-md group-hover:gap-2">
                  <span className="text-xs font-bold">Ver detalhes</span>
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

const arePropsEqual = (prevProps: TripCardProps, nextProps: TripCardProps) => {
  // Custom comparison function for React.memo
  // Only re-render if trip data actually changed
  return (
    prevProps.trip.id === nextProps.trip.id &&
    prevProps.trip.title === nextProps.trip.title &&
    prevProps.trip.price === nextProps.trip.price &&
    prevProps.trip.tripRating === nextProps.trip.tripRating &&
    prevProps.trip.slug === nextProps.trip.slug &&
    prevProps.trip.images?.[0] === nextProps.trip.images?.[0]
  );
};

export const TripCard = React.memo(TripCardComponent, arePropsEqual);