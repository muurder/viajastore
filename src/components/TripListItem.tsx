import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trip } from '../types';
import { MapPin, Star, ChevronRight, Check } from 'lucide-react';
import { NoImagePlaceholder } from './NoImagePlaceholder';

interface TripListItemProps {
  trip: Trip;
  onHover?: (tripId: string | null) => void;
  highlighted?: boolean;
  adults?: number; // Number of adults for price calculation
}

const TripListItem: React.FC<TripListItemProps> = ({ trip, onHover, highlighted, adults = 1 }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const rating = trip.tripRating || trip.rating || 0;
  const totalReviews = trip.tripTotalReviews || trip.totalReviews || 0;
  const totalPrice = trip.price * adults;

  // Get included items for badges
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

  const handleImageClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (trip.images && trip.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % trip.images.length);
    }
  };

  return (
    <Link
      to={`/viagem/${trip.slug || trip.id}`}
      onMouseEnter={() => onHover?.(trip.id)}
      onMouseLeave={() => onHover?.(null)}
      className={`
        block bg-white rounded-2xl border-2 transition-all duration-300 hover:shadow-xl
        ${highlighted ? 'border-primary-500 shadow-lg' : 'border-gray-200 hover:border-primary-300'}
      `}
    >
      <div className="flex flex-col md:flex-row gap-4 p-4">
        {/* Image Section */}
        <div className="relative w-full md:w-64 h-48 md:h-48 rounded-xl overflow-hidden flex-shrink-0 group">
          {trip.images && trip.images.length > 0 ? (
            <>
              <img
                src={trip.images[currentImageIndex]}
                alt={trip.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => {
                  // Hide image on error - will show placeholder below
                  e.currentTarget.style.display = 'none';
                }}
              />
              {trip.images.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                  {currentImageIndex + 1} / {trip.images.length}
                </div>
              )}
              <button
                onClick={handleImageClick}
                className="absolute inset-0 w-full h-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                aria-label="Ver mais fotos"
              />
            </>
          ) : (
            <NoImagePlaceholder 
              title={trip.title}
              category={trip.category}
              size="medium"
              className="w-full h-full"
            />
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div>
            {/* Title and Location */}
            <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
              {trip.title}
            </h3>
            
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
              <MapPin size={14} className="text-gray-400" />
              <span className="truncate">{trip.destination}</span>
              {trip.durationDays && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{trip.durationDays} dias</span>
                </>
              )}
            </div>

            {/* Tags/Badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              {hasBreakfast && (
                <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-200">
                  <Check size={12} />
                  Café da manhã incluso
                </span>
              )}
              {hasFreeCancellation && (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-200">
                  <Check size={12} />
                  Cancelamento Grátis
                </span>
              )}
              {trip.tags.slice(0, 2).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {trip.description}
            </p>
          </div>
        </div>

        {/* Right Section - Rating and Price */}
        <div className="flex flex-col items-end justify-between gap-4 flex-shrink-0 w-full md:w-auto md:min-w-[140px]">
          {/* Rating */}
          <div className="flex items-center gap-2">
            {rating > 0 ? (
              <>
                <div className="bg-primary-600 text-white px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1">
                  <Star size={14} fill="currentColor" />
                  {rating.toFixed(1)}
                </div>
                <div className="text-xs text-gray-600">
                  <div className="font-bold">{totalReviews}</div>
                  <div>avaliações</div>
                </div>
              </>
            ) : (
              <div className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-bold text-xs">
                Novo no ViajaStore
              </div>
            )}
          </div>

          {/* Price */}
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1">Total para {adults} {adults === 1 ? 'pessoa' : 'pessoas'}</div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-semibold text-gray-600">R$</span>
              <span className="text-2xl font-extrabold text-gray-900">
                {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">Impostos e taxas incluídos</div>
            <Link
              to={`/viagem/${trip.slug || trip.id}`}
              className="mt-3 inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Ver disponibilidade
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default TripListItem;

