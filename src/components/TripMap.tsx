import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Trip } from '../types';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface TripMapProps {
  trips: Trip[];
  highlightedTripId?: string | null;
  onMarkerClick?: (tripId: string) => void;
  center?: [number, number];
  zoom?: number;
}

// Component to update map view when highlighted trip changes
const MapUpdater: React.FC<{ highlightedTrip: Trip | null }> = ({ highlightedTrip }) => {
  const map = useMap();
  
  useEffect(() => {
    if (highlightedTrip && highlightedTrip.latitude && highlightedTrip.longitude) {
      map.setView([highlightedTrip.latitude, highlightedTrip.longitude], map.getZoom(), {
        animate: true,
        duration: 0.5
      });
    }
  }, [highlightedTrip, map]);
  
  return null;
};

const TripMap: React.FC<TripMapProps> = ({ 
  trips, 
  highlightedTripId, 
  onMarkerClick,
  center = [-23.5505, -46.6333], // Default: São Paulo
  zoom = 6
}) => {
  // Filter trips with valid coordinates
  const tripsWithCoords = trips.filter(t => t.latitude !== undefined && t.longitude !== undefined);
  
  // Calculate center from trips if available
  const calculatedCenter: [number, number] = tripsWithCoords.length > 0
    ? [
        tripsWithCoords.reduce((sum, t) => sum + (t.latitude || 0), 0) / tripsWithCoords.length,
        tripsWithCoords.reduce((sum, t) => sum + (t.longitude || 0), 0) / tripsWithCoords.length
      ]
    : center;

  const highlightedTrip = trips.find(t => t.id === highlightedTripId) || null;

  // Create custom marker icon with price
  const createPriceMarker = (trip: Trip, isHighlighted: boolean) => {
    const price = trip.price.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    
    return L.divIcon({
      className: 'custom-price-marker',
      html: `
        <div class="relative">
          <div class="bg-white rounded-lg shadow-lg border-2 ${isHighlighted ? 'border-primary-500' : 'border-gray-300'} px-3 py-1.5 font-bold text-sm text-gray-900 whitespace-nowrap">
            R$ ${price}
          </div>
          <div class="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${isHighlighted ? 'border-t-primary-500' : 'border-t-gray-300'}"></div>
        </div>
      `,
      iconSize: [80, 40],
      iconAnchor: [40, 40],
      popupAnchor: [0, -40],
    });
  };

  if (tripsWithCoords.length === 0) {
    return (
      <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="font-bold mb-2">Nenhuma viagem com localização disponível</p>
          <p className="text-sm">Adicione coordenadas (latitude/longitude) nas viagens para visualizá-las no mapa</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-gray-200">
      <MapContainer
        center={calculatedCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater highlightedTrip={highlightedTrip} />
        
        {tripsWithCoords.map(trip => {
          const isHighlighted = trip.id === highlightedTripId;
          return (
            <Marker
              key={trip.id}
              position={[trip.latitude!, trip.longitude!]}
              icon={createPriceMarker(trip, isHighlighted)}
              eventHandlers={{
                click: () => onMarkerClick?.(trip.id),
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  {trip.images && trip.images.length > 0 && (
                    <img
                      src={trip.images[0]}
                      alt={trip.title}
                      className="w-full h-32 object-cover rounded-lg mb-2"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop';
                      }}
                    />
                  )}
                  <h3 className="font-bold text-gray-900 mb-1 line-clamp-2">{trip.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{trip.destination}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary-600">
                      R$ {trip.price.toLocaleString('pt-BR')}
                    </span>
                    <Link
                      to={`/viagem/${trip.slug || trip.id}`}
                      className="text-xs bg-primary-600 text-white px-3 py-1 rounded-lg font-bold hover:bg-primary-700 transition-colors"
                    >
                      Ver detalhes
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      <style>{`
        .custom-price-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
};

export default TripMap;

