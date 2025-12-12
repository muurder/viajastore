
import React, { useState, useMemo } from 'react';
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
export const TripCard: React.FC<TripCardProps> = React.memo(({ trip }) => {
  const { user } = useAuth();
  const { toggleFavorite, clients, agencies } = useData();
  const { showToast } = useToast();
  const [imgError, setImgError] = useState(false);
  
  // Context awareness for link generation
  const { agencySlug } = useParams<{ agencySlug?: string }>();

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

  // Memoize agency and WhatsApp link
  const { agency, whatsappLink } = useMemo(() => {
    const foundAgency = agencies.find(a => a.agencyId === trip.agencyId);
    const contactNumber = foundAgency?.whatsapp || foundAgency?.phone;
    return {
      agency: foundAgency,
      whatsappLink: contactNumber ? buildWhatsAppLink(contactNumber, trip) : null
    };
  }, [agencies, trip.agencyId, trip]);

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
  const hasValidImages = trip.images && Array.isArray(trip.images) && trip.images.length > 0 && trip.images[0];
  const shouldShowPlaceholder = !hasValidImages || imgError;

  // Get rating value
  const rating = (trip as any).tripRating || trip.rating || 0;
  const hasRating = rating > 0;

  // Check for popular features
  const includedItems = trip.included || [];
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
  const isPopular = trip.featured || (trip.views || 0) > 100;

  return (
    <Link to={linkTarget} className="group block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 h-full flex flex-col">
      <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
        {shouldShowPlaceholder ? (
          <NoImagePlaceholder 
            title={trip.title} 
            category={trip.category}
            size="medium"
          />
        ) : (
          <>
            <img 
              src={trip.images[0]} 
              alt={trip.title} 
              loading="lazy"
              onError={() => setImgError(true)}
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
            {trip.category.replace(/_/g, ' ')}
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
      
      <div className="p-6 flex flex-col flex-1">
        {/* Location & Duration */}
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center text-xs font-semibold text-gray-600 mb-2">
              <MapPin size={13} className="mr-1.5 flex-shrink-0 text-primary-500" />
              <span className="truncate">{trip.destination}</span>
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <Clock size={13} className="mr-1.5 flex-shrink-0 text-gray-400" />
              <span className="font-medium">{trip.durationDays} {trip.durationDays === 1 ? 'dia' : 'dias'}</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 leading-tight mb-4 group-hover:text-primary-600 transition-colors line-clamp-2 min-h-[3.5rem]">
          {trip.title}
        </h3>

        {/* Features highlights */}
        <div className="flex flex-wrap gap-2 mb-4">
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
          {!hasBreakfast && !hasFreeCancellation && trip.tags && trip.tags.slice(0, 2).map((tag, index) => (
            <span key={index} className="text-[10px] px-2.5 py-1 bg-gray-50 text-gray-600 rounded-full font-semibold border border-gray-100">
              {tag}
            </span>
          ))}
        </div>

        {/* Tags Section */}
        {trip.tags && trip.tags.length > 0 && (hasBreakfast || hasFreeCancellation || trip.tags.length > 2) && (
          <div className="flex flex-wrap gap-1.5 mb-5 flex-1 content-start">
            {trip.tags.slice(hasBreakfast || hasFreeCancellation ? 0 : 2, 5).map((tag, index) => (
              <span key={index} className="text-[10px] px-2 py-0.5 bg-gray-50/80 text-gray-600 rounded-full font-medium border border-gray-100">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Price & CTA */}
        <div className="flex items-end justify-between pt-4 mt-auto border-t border-gray-100 group-hover:border-primary-200 transition-colors">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">A partir de</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-gray-500 font-semibold">R$</span>
              <span className="text-2xl font-extrabold text-gray-900 group-hover:text-primary-600 transition-colors">{trip.price.toLocaleString('pt-BR')}</span>
            </div>
            <span className="text-[10px] text-gray-400 mt-0.5">por pessoa</span>
          </div>
          <div className="flex items-center gap-2">
            {whatsappLink && (
              <button
                onClick={handleWhatsAppClick}
                className="p-2.5 rounded-full bg-[#25D366] text-white hover:bg-[#128C7E] transition-all shadow-md hover:shadow-lg flex-shrink-0 hover:-translate-y-0.5 border border-green-400/20 group-hover:scale-105"
                title="Falar no WhatsApp"
              >
                <MessageCircle size={16} />
              </button>
            )}
            <div className="flex items-center gap-1.5 bg-primary-600 text-white px-4 py-2.5 rounded-full hover:bg-primary-700 transition-all shadow-sm hover:shadow-md group-hover:gap-2">
              <span className="text-xs font-bold">Ver detalhes</span>
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}, (prevProps, nextProps) => {
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
});