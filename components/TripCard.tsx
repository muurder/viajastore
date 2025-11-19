
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
    'ROMANCE': 'https://images.unsplash.com/photo-1510097477421-e5456cd63d64?auto=format&fit=crop&w=800&q=80',
    'URBANO': 'https://images.unsplash.com/photo-1449824913929-6513b64e301f?auto=format&fit=crop&w=800&q=80'
  };

  const displayImage = imgError 
    ? (categoryImages[trip.category] || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80')
    : trip.images[0];

  return (
    <Link to={`/trip/${trip.id}`} className="group block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300">
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
        <div className="absolute bottom-3 left-3 bg-black/60 text-white px-2 py-1 rounded text-xs font-semibold">
          {trip.category}
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center text-xs text-gray-500">
             <MapPin size={14} className="mr-1" />
             {trip.destination}
          </div>
          <div className="flex items-center text-amber-500 text-xs font-bold">
            <Star size={14} className="mr-1 fill-current" />
            {trip.rating.toFixed(1)} ({trip.totalReviews})
          </div>
        </div>

        <h3 className="text-lg font-bold text-gray-800 leading-tight mb-2 group-hover:text-primary-600 transition-colors">
          {trip.title}
        </h3>

        <div className="flex items-center text-sm text-gray-500 mb-4">
          <Calendar size={16} className="mr-2" />
          <span>{trip.durationDays} dias</span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            A partir de
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
