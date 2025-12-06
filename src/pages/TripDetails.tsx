
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Trip } from '../types';
import { Star, MapPin } from 'lucide-react';

const TripDetails: React.FC = () => {
  const { slug, tripSlug } = useParams<{ slug?: string, tripSlug?: string }>();
  const { trips } = useData();
  const [trip, setTrip] = useState<Trip | undefined>(undefined);

  useEffect(() => {
    const currentSlug = tripSlug || slug;
    if (currentSlug) {
      const foundTrip = trips.find(t => t.slug === currentSlug);
      setTrip(foundTrip);
       if (foundTrip) {
        document.title = `${foundTrip.title} | ViajaStore`;
      }
    }
  }, [slug, tripSlug, trips]);

  if (!trip) {
    return <div className="text-center py-20">Viagem não encontrada ou carregando...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">{trip.title}</h1>
        <div className="flex items-center gap-4 mt-2 text-gray-500">
            <span className="flex items-center text-amber-500 font-bold">
              <Star size={16} className="mr-1 fill-current"/> 
              {trip.tripRating?.toFixed(1) || '5.0'} 
              <span className="text-gray-400 font-normal ml-1">({trip.tripTotalReviews || 0} avaliações)</span>
            </span>
            <span className="text-gray-300">•</span>
            <span className="flex items-center"><MapPin size={16} className="mr-1"/> {trip.destination}</span>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
          <img src={trip.images[0]} alt={trip.title} className="w-full h-80 object-cover rounded-xl mb-6" />
          <h2 className="text-2xl font-bold mb-4">Sobre esta viagem</h2>
          <p className="text-gray-600 leading-relaxed">{trip.description}</p>
      </div>

    </div>
  );
};

export default TripDetails;
