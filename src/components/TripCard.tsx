
import React, { useState } from 'react';
import { Trip } from '../types';
import { MapPin, Star, Heart, Clock, MessageCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { buildWhatsAppLink } from '../utils/whatsapp';

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
export const TripCard: React.FC<TripCardProps> = ({ trip }) => {
  const { user } = useAuth();
  const { toggleFavorite, clients, agencies } = useData();
  const { showToast } = useToast();
  const [imgError, setImgError] = useState(false);
  
  // Context awareness for link generation
  const { agencySlug } = useParams<{ agencySlug?: string }>();

  // Determine the link target based on context
  // If we are inside an agency route, keep the context. If global, keep global.
  const linkTarget = agencySlug 
    ? `/${agencySlug}/viagem/${trip.slug || trip.id}` 
    : `/viagem/${trip.slug || trip.id}`;

  // Ensure clients data is loaded and use current user's favorites
  const currentUserData = clients.find(c => c.id === user?.id);
  const isFavorite = user?.role === 'CLIENT' && currentUserData?.favorites.includes(trip.id);

  // Find Agency for WhatsApp
  // FIX: Find agency by 'agencyId' (PK) to match trip.agencyId, not by user 'id'.
  const agency = agencies.find(a => a.agencyId === trip.agencyId);
  // UPDATE: Check for both whatsapp and phone fields for robustness
  const contactNumber = agency?.whatsapp || agency?.phone;
  const whatsappLink = contactNumber ? buildWhatsAppLink(contactNumber, trip) : null;

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

  // Fallback images by category if the main image fails
  const categoryImages: Record<string, string> = {
    'PRAIA': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    'AVENTURA': 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=800&q=80',
    'FAMILIA': 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=800&q=80',
    'ROMANTICO': 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=800&q=80',
    'URBANO': 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=800&q=80',
    'NATUREZA': 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80',
    'CULTURA': 'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?auto=format&fit=crop&w=800&q=80',
    'GASTRONOMICO': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    'VIDA_NOTURNA': 'https://images.unsplash.com/photo-1514525253440-b393452e233e?auto=format&fit=crop&w=800&q=80',
    'VIAGEM_BARATA': 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80',
    'ARTE': 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=800&q=80',
  };

  const displayImage = (imgError || !trip.images || !trip.images[0])
    ? (categoryImages[trip.category] || categoryImages['PRAIA'])
    : trip.images[0];

  return (
    <Link to={linkTarget} className="group block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
      <div className="relative h-48 w-full overflow-hidden bg-gray-100">
        <img 
          src={displayImage} 
          alt={trip.title} 
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        
        <div className="absolute top-3 right-3 z-10">
        <button 
            onClick={handleFavorite}
            className={`p-2 rounded-full backdrop-blur-md shadow-sm transition-all duration-200 active:scale-90 ${isFavorite ? 'bg-white text-red-500 shadow-red-100' : 'bg-white/80 text-gray-500 hover:bg-white hover:text-red-500'}`}
        >
            <Heart size={18} fill={isFavorite ? "currentColor" : "none"} className={isFavorite ? "animate-[pulse_0.3s]" : ""} />
        </button>
        </div>

        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-white/10 shadow-lg">
          {trip.category.replace('_', ' ')}
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center text-xs font-medium text-gray-500 truncate">
             <MapPin size={14} className="mr-1.5 flex-shrink-0 text-gray-400 group-hover:text-primary-500 transition-colors" />
             <span className="truncate">{trip.destination}</span>
          </div>
          <div className="flex items-center text-amber-500 text-xs font-bold flex-shrink-0 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
            <Star size={12} className="mr-1 fill-current" />
            {trip.tripRating?.toFixed(1) || '5.0'}
          </div>
        </div>

        <h3 className="text-lg font-bold text-gray-900 leading-snug mb-2 group-hover:text-primary-600 transition-colors line-clamp-2 min-h-[3.5rem]">
          {trip.title}
        </h3>

        <div className="flex items-center text-sm text-gray-500 mb-4">
          <Clock size={16} className="mr-2 text-gray-400" />
          <span className="font-medium">{trip.durationDays} dias</span>
        </div>

        {/* Tags Section */}
        <div className="flex flex-wrap gap-2 mb-5 flex-1 content-start">
          {trip.tags && trip.tags.slice(0, 3).map((tag, index) => (
             <span key={index} className="text-[10px] px-2.5 py-1 bg-gray-50 text-gray-600 rounded-full font-semibold border border-gray-100">
               {tag}
             </span>
          ))}
        </div>

        <div className="flex items-end justify-between pt-4 border-t border-gray-100 mt-auto group-hover:border-primary-100 transition-colors">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">A partir de</span>
            <div className="flex items-baseline gap-0.5">
                <span className="text-xs text-gray-500 font-semibold">R$</span>
                <span className="text-xl font-extrabold text-gray-900 group-hover:text-primary-700 transition-colors">{trip.price.toLocaleString('pt-BR')}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
              {whatsappLink && (
                  <button
                    onClick={handleWhatsAppClick}
                    className="p-2.5 rounded-full bg-[#25D366] text-white hover:bg-[#128C7E] transition-all shadow-sm hover:shadow-md flex-shrink-0 hover:-translate-y-0.5 border border-green-400/20"
                    title="Falar no WhatsApp"
                  >
                    <MessageCircle size={18} className="fill-white/20" />
                  </button>
              )}
              <span className="text-xs font-bold text-primary-600 flex items-center bg-primary-50 px-3 py-2 rounded-full hover:bg-primary-100 transition-colors">
                Detalhes &rarr;
              </span>
          </div>
        </div>
      </div>
    </Link>
  );
};