import React, { useEffect, useState, Suspense } from 'react';
import { Trip } from '../types';
import { Link } from 'react-router-dom';
import { MapPin, Loader as LoaderIcon, AlertCircle } from 'lucide-react';

// Lazy load Leaflet to avoid SSR issues
const MapContent = React.lazy(() => import('./TripMapContent'));

interface TripMapProps {
  trips: Trip[];
  highlightedTripId?: string | null;
  onMarkerClick?: (tripId: string) => void;
  center?: [number, number];
  zoom?: number;
}

const TripMap: React.FC<TripMapProps> = ({ 
  trips, 
  highlightedTripId, 
  onMarkerClick,
  center = [-23.5505, -46.6333], // Default: São Paulo
  zoom = 6
}) => {
  const [mapError, setMapError] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Filter trips with valid coordinates
  const tripsWithCoords = trips.filter(t => 
    t.latitude !== undefined && 
    t.longitude !== undefined &&
    typeof t.latitude === 'number' &&
    typeof t.longitude === 'number' &&
    !isNaN(t.latitude) &&
    !isNaN(t.longitude)
  );

  // Calculate center from trips if available
  const calculatedCenter: [number, number] = tripsWithCoords.length > 0
    ? [
        tripsWithCoords.reduce((sum, t) => sum + (t.latitude || 0), 0) / tripsWithCoords.length,
        tripsWithCoords.reduce((sum, t) => sum + (t.longitude || 0), 0) / tripsWithCoords.length
      ]
    : center;

  // Loading fallback
  const LoadingFallback = () => (
    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center border border-gray-200">
      <div className="text-center">
        <LoaderIcon className="animate-spin text-primary-600 mx-auto mb-4" size={48} />
        <p className="text-gray-600 font-medium">Carregando mapa...</p>
      </div>
    </div>
  );

  // Error state
  if (mapError) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center border border-gray-200">
        <div className="text-center max-w-sm px-6">
          <AlertCircle className="text-gray-400 mx-auto mb-4" size={48} />
          <p className="text-gray-700 font-bold mb-2">Erro ao carregar o mapa</p>
          <p className="text-sm text-gray-500">Tente recarregar a página</p>
        </div>
      </div>
    );
  }

  // No trips with coordinates
  if (tripsWithCoords.length === 0) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center border border-gray-200">
        <div className="text-center max-w-sm px-6">
          <MapPin className="text-gray-400 mx-auto mb-4" size={48} />
          <p className="text-gray-700 font-bold mb-2">Nenhuma viagem com localização disponível</p>
          <p className="text-sm text-gray-500">
            Adicione coordenadas (latitude/longitude) nas viagens para visualizá-las no mapa
          </p>
        </div>
      </div>
    );
  }

  // Render map only on client side
  if (!isClient) {
    return <LoadingFallback />;
  }

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-gray-200 shadow-lg bg-white">
      <Suspense fallback={<LoadingFallback />}>
        <MapContent
          trips={tripsWithCoords}
          highlightedTripId={highlightedTripId}
          onMarkerClick={onMarkerClick}
          center={calculatedCenter}
          zoom={zoom}
          onError={() => setMapError(true)}
        />
      </Suspense>
    </div>
  );
};

export default TripMap;