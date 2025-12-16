
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
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden h-full flex flex-col animate-pulse">
    {/* Image - Full Bleed, Tall */}
    <div className="h-64 md:aspect-[4/5] bg-gray-200 w-full"></div>
    {/* Content */}
    <div className="p-5 flex-1 flex flex-col">
      <div className="h-3 bg-gray-200 w-32 rounded mb-2"></div>
      <div className="h-5 bg-gray-200 w-full rounded mb-1"></div>
      <div className="h-5 bg-gray-200 w-3/4 rounded mb-3"></div>
      <div className="h-3 bg-gray-200 w-24 rounded mb-4"></div>
      <div className="flex gap-2 mb-4">
        <div className="h-4 bg-gray-200 w-20 rounded-full"></div>
      </div>
      <div className="mt-auto pt-4 border-t border-gray-100 flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="h-2 bg-gray-200 w-16 rounded"></div>
          <div className="h-6 bg-gray-200 w-20 rounded"></div>
          <div className="h-2 bg-gray-200 w-24 rounded"></div>
        </div>
        <div className="h-9 bg-gray-200 w-28 rounded-full"></div>
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

  // Capitalize first letter helper
  const capitalizeTitle = (title: string) => {
    return title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
  };

  return (
    <div className="h-full">
      <Link to={linkTarget} className="group block bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-500 h-full flex flex-col relative z-0 border border-gray-100 hover:border-primary-200">
        {/* Image Section - Full Bleed, Tall Format */}
        <div className="relative h-64 md:aspect-[4/5] w-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0">
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
                  const target = e.target as HTMLImageElement;
                  if (target) {
                    target.style.display = 'none';
                  }
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              {/* Subtle gradient overlay at base for depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </>
          )}

          {/* Top Right Actions - Favorite & WhatsApp */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            {/* WhatsApp Icon Button - Floating */}
            {whatsappLink && (
              <button
                onClick={handleWhatsAppClick}
                className="p-2.5 rounded-full bg-white/95 backdrop-blur-md text-green-600 hover:bg-white hover:text-green-700 transition-all shadow-lg hover:shadow-xl border border-white/50 active:scale-95"
                title="Falar no WhatsApp"
              >
                <MessageCircle size={18} className="fill-current" strokeWidth={0} />
              </button>
            )}
            {/* Favorite button */}
            <button
              onClick={handleFavorite}
              className={`p-2.5 rounded-full backdrop-blur-md shadow-xl transition-all duration-200 active:scale-90 ${isFavorite ? 'bg-white text-red-500 shadow-red-200/50' : 'bg-white/95 text-gray-600 hover:bg-white hover:text-red-500'}`}
            >
              <Heart size={18} fill={isFavorite ? "currentColor" : "none"} className={isFavorite ? "animate-[pulse_0.3s]" : ""} />
            </button>
          </div>

          {/* Badges - Top Left - White Translucent */}
          <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
            {isPopular && (
              <div className="bg-white/90 backdrop-blur-md text-primary-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg border border-white/50 uppercase tracking-wide">
                <TrendingUp size={12} />
                Em Alta
              </div>
            )}
            <div className="bg-white/90 backdrop-blur-md text-primary-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg border border-white/50">
              {tripWithImages.category.replace(/_/g, ' ')}
            </div>
          </div>

          {/* Rating badge - Bottom Right */}
          {hasRating && (
            <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md text-gray-900 px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 shadow-xl border border-white/50">
              <Star size={14} className="fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-5 flex flex-col h-full flex-1 min-h-0">
          {/* Location - Compact */}
          <div className="flex items-center text-xs text-gray-600 mb-2">
            <MapPin size={12} className="mr-1.5 flex-shrink-0 text-primary-600" />
            <span className="truncate font-medium">{tripWithImages.destination}</span>
          </div>

          {/* Title - Capitalized, Bold, Stone-900 */}
          <h3 className="text-lg font-bold text-stone-900 leading-tight group-hover:text-primary-800 transition-colors line-clamp-2 mb-3">
            {capitalizeTitle(tripWithImages.title)}
          </h3>

          {/* Duration - Subtle */}
          <div className="flex items-center text-xs text-gray-500 mb-4">
            <Clock size={12} className="mr-1.5 flex-shrink-0 text-gray-400" />
            <span className="font-medium">{tripWithImages.durationDays} {tripWithImages.durationDays === 1 ? 'dia' : 'dias'}</span>
          </div>

          {/* Features highlights - Compact */}
          {(hasBreakfast || hasFreeCancellation) && (
            <div className="flex flex-wrap gap-1.5 mb-4 flex-shrink-0">
              {hasBreakfast && (
                <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-green-50 text-green-700 rounded-full font-semibold border border-green-100">
                  <Check size={9} className="text-green-600" />
                  Café da manhã
                </div>
              )}
              {hasFreeCancellation && (
                <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-semibold border border-blue-100">
                  <Check size={9} className="text-blue-600" />
                  Cancelamento grátis
                </div>
              )}
            </div>
          )}

          {/* Price & CTA - Bottom Section */}
          <div className="mt-auto pt-4 border-t border-gray-100 flex items-end justify-between gap-3">
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">A partir de</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xs text-gray-500 font-semibold">R$</span>
                <span className="text-2xl font-extrabold text-primary-800 group-hover:text-primary-900 transition-colors">{tripWithImages.price.toLocaleString('pt-BR')}</span>
              </div>
              <span className="text-[10px] text-gray-400 mt-0.5">por pessoa</span>
            </div>
            {/* Main CTA Button - Terracota, Full Width or Large */}
            <div className="flex items-center gap-1.5 bg-secondary-500 hover:bg-secondary-600 text-white px-5 py-2.5 rounded-full transition-all shadow-md hover:shadow-lg group-hover:gap-2 font-bold text-sm whitespace-nowrap">
              <span>Ver detalhes</span>
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
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