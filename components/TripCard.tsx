
import React, { useState } from 'react';
import { Trip } from '../types';
import { MapPin, Calendar, Star, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

interface TripCardProps {
  trip: Trip;
}

const TripCard: React.FC<TripCardProps> = ({ trip }) => {
  const { user } = useAuth();
  const { toggleFavorite, clients } = useData();
  const [imgError, setImgError] = useState(false);

  const isFavorite = user?.role === 'CLIENT' && (clients.find(c => c.id === user.id)?.favorites.includes(trip.id));

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (user?.role === 'CLIENT') {
      toggleFavorite(trip.id, user.id);
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

  // Use fallback if imgError is true OR if trip.images is empty/undefined
  const displayImage = (imgError || !trip.images || !trip.images[0])
    ? (categoryImages[trip.category] || categoryImages['PRAIA'])
    : trip.images[0];

  return (
    <Link to={`/trip/${trip.id}`} className="group block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300 h-full flex flex-col">
      <div className="relative h-48 w-full overflow-hidden bg-gray-200">
        <img 
          src={displayImage} 
          alt={trip.title} 
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 right-3">
           <button 
            onClick={handleFavorite}
            className={`p-2 rounded-full backdrop-blur-sm transition-colors ${isFavorite ? 'bg-red-50 text-red-500' : 'bg-white/30 text-white hover:bg-white hover:text-red-500'}`}
          >
            <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
          {trip.category.replace('_', ' ')}
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center text-xs text-gray-500 truncate max-w-[60%]">
             <MapPin size={14} className="mr-1 flex-shrink-0" />
             <span className="truncate">{trip.destination}</span>
          </div>
          <div className="flex items-center text-amber-500 text-xs font-bold flex-shrink-0">
            <Star size={14} className="mr-1 fill-current" />
            {trip.rating.toFixed(1)} ({trip.totalReviews})
          </div>
        </div>

        <h3 className="text-lg font-bold text-gray-800 leading-tight mb-2 group-hover:text-primary-600 transition-colors line-clamp-2 h-12">
          {trip.title}
        </h3>

        <div className="flex items-center text-sm text-gray-500 mb-3">
          <Calendar size={16} className="mr-2" />
          <span>{trip.durationDays} dias</span>
        </div>

        {/* Tags Section */}
        <div className="flex flex-wrap gap-1 mb-4">
          {trip.tags && trip.tags.slice(0, 3).map((tag, index) => (
             <span key={index} className="text-[10px] px-2 py-1 bg-gray-100 text-gray-600 rounded-md font-medium">
               {tag}
             </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
          <div className="text-xs text-gray-500">
            Por pessoa
          </div>
          <div className="text-xl font-bold text-primary-700">
            R$ {trip.price.toLocaleString('pt-BR')}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default TripCard;
