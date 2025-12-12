import React, { useMemo } from 'react';
import { Trip } from '../../../../types';
import { Plane, ShoppingBag, Eye, Star } from 'lucide-react';

interface TopTripsCardProps {
    trips: Trip[];
}

const TopTripsCard: React.FC<TopTripsCardProps> = ({ trips }) => {
  const topTrips = useMemo(() => {
    return [...trips].sort((a, b) => ((b.sales || 0) - (a.sales || 0))).slice(0, 5);
  }, [trips]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
        <Plane size={20} className="mr-2 text-primary-600"/> Top Pacotes
      </h3>
      {topTrips.length > 0 && topTrips[0].sales && topTrips[0].sales > 0 ? (
        <div className="space-y-4">
          {topTrips.map((trip, idx) => (
            <div key={trip.id} className="flex items-center gap-4 p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer" onClick={() => window.open(`/#/${trip.slug}`, '_blank')}>
              <span className={`font-bold text-lg w-6 text-center ${idx < 3 ? 'text-amber-500' : 'text-gray-300'}`}>{idx + 1}</span>
              <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                 <img 
                   src={trip.images?.[0] || 'https://placehold.co/100x100?text=IMG'} 
                   className="w-full h-full object-cover" 
                   alt={trip.title}
                   onError={(e) => {
                     const target = e.target as HTMLImageElement;
                     if (target) {
                       target.src = 'https://placehold.co/100x100?text=IMG';
                     }
                   }}
                 />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{trip.title}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="flex items-center"><ShoppingBag size={10} className="mr-1"/> {trip.sales || 0} vendas</span>
                    <span className="flex items-center"><Eye size={10} className="mr-1"/> {trip.views || 0} views</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 text-sm">R$ {trip.price.toLocaleString()}</p>
                <div className="flex items-center justify-end text-amber-500 text-xs font-bold">
                    <Star size={10} className="fill-current mr-0.5"/> {(trip as any).tripRating?.toFixed(1) || 'N/A'}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400 text-sm">
          <Plane size={32} className="mx-auto mb-3 opacity-50" />
          <p>Seus pacotes mais vendidos aparecerão aqui.</p>
        </div>
      )}
    </div>
  );
};

export default TopTripsCard;
