import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Trip } from '../types';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in react-leaflet
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface TripMapContentProps {
  trips: Trip[];
  highlightedTripId?: string | null;
  onMarkerClick?: (tripId: string) => void;
  center: [number, number];
  zoom: number;
  onError?: () => void;
}

// Component to update map view when highlighted trip changes
const MapUpdater: React.FC<{ highlightedTrip: Trip | null; zoom?: number }> = ({ highlightedTrip, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (highlightedTrip && highlightedTrip.latitude && highlightedTrip.longitude) {
      map.setView([highlightedTrip.latitude, highlightedTrip.longitude], zoom || 12, {
        animate: true,
        duration: 0.5
      });
    }
  }, [highlightedTrip, map, zoom]);
  
  return null;
};

const TripMapContent: React.FC<TripMapContentProps> = ({ 
  trips, 
  highlightedTripId, 
  onMarkerClick,
  center,
  zoom,
  onError
}) => {
  const highlightedTrip = trips.find(t => t.id === highlightedTripId) || null;

  // Create premium custom marker icon with price and image
  const createPriceMarker = (trip: Trip, isHighlighted: boolean) => {
    const price = trip.price.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const hasImage = trip.images && trip.images.length > 0;
    
    return L.divIcon({
      className: 'custom-price-marker',
      html: `
        <div class="relative marker-container ${isHighlighted ? 'highlighted' : ''}">
          ${hasImage ? `
            <div class="marker-image-wrapper">
              <img src="${trip.images[0]}" alt="${trip.title}" class="marker-image" />
              <div class="marker-image-overlay"></div>
            </div>
          ` : ''}
          <div class="marker-price-badge ${isHighlighted ? 'highlighted' : ''}">
            <div class="marker-price-text">R$ ${price}</div>
            <div class="marker-price-arrow"></div>
          </div>
        </div>
      `,
      iconSize: [hasImage ? 120 : 100, hasImage ? 80 : 40],
      iconAnchor: hasImage ? [60, 80] : [50, 40],
      popupAnchor: hasImage ? [0, -80] : [0, -40],
    });
  };

  // Handle map initialization errors
  useEffect(() => {
    const handleError = () => {
      onError?.();
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [onError]);

  // Calculate optimal zoom based on trips spread
  const calculateOptimalZoom = useMemo(() => {
    if (trips.length === 0) return zoom;
    if (trips.length === 1) return 12;
    
    const latitudes = trips.map(t => t.latitude!);
    const longitudes = trips.map(t => t.longitude!);
    
    const latDiff = Math.max(...latitudes) - Math.min(...latitudes);
    const lonDiff = Math.max(...longitudes) - Math.min(...longitudes);
    
    const maxDiff = Math.max(latDiff, lonDiff);
    
    if (maxDiff > 10) return 4;
    if (maxDiff > 5) return 5;
    if (maxDiff > 2) return 6;
    if (maxDiff > 1) return 7;
    if (maxDiff > 0.5) return 8;
    return 9;
  }, [trips, zoom]);

  return (
    <>
      <MapContainer
        center={center}
        zoom={calculateOptimalZoom}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        scrollWheelZoom={true}
        zoomControl={true}
        attributionControl={true}
        className="trip-map-container"
      >
        {/* Premium tile layer with better styling */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          minZoom={3}
        />
        
        <MapUpdater highlightedTrip={highlightedTrip} zoom={12} />
        
        {trips.map(trip => {
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
              <Popup className="custom-popup" maxWidth={300} minWidth={250}>
                <Link 
                  to={`/viagem/${trip.slug || trip.id}`}
                  className="block group"
                >
                  {trip.images && trip.images.length > 0 && (
                    <div className="relative w-full h-40 rounded-t-lg overflow-hidden mb-3 -mx-3 -mt-3">
                      <img
                        src={trip.images[0]}
                        alt={trip.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    </div>
                  )}
                  <div className="p-2">
                    <h3 className="font-bold text-gray-900 mb-1.5 line-clamp-2 group-hover:text-primary-600 transition-colors">
                      {trip.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-3">
                      <MapPin size={14} className="text-primary-500 flex-shrink-0" />
                      <span className="truncate">{trip.destination}</span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">A partir de</div>
                        <div className="text-xl font-extrabold text-primary-600">
                          R$ {trip.price.toLocaleString('pt-BR')}
                        </div>
                      </div>
                      <div className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary-700 transition-colors">
                        Ver detalhes →
                      </div>
                    </div>
                  </div>
                </Link>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      <style>{`
        .trip-map-container {
          border-radius: 1rem;
        }
        
        .custom-price-marker {
          background: transparent !important;
          border: none !important;
          cursor: pointer;
        }
        
        .marker-container {
          transition: transform 0.2s ease;
        }
        
        .marker-container:hover {
          transform: scale(1.1);
          z-index: 1000 !important;
        }
        
        .marker-container.highlighted {
          transform: scale(1.15);
          z-index: 1001 !important;
        }
        
        .marker-image-wrapper {
          position: relative;
          width: 120px;
          height: 60px;
          border-radius: 12px 12px 0 0;
          overflow: hidden;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .marker-container.highlighted .marker-image-wrapper {
          border-color: #2563eb;
          box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4);
        }
        
        .marker-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .marker-image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.3) 100%);
        }
        
        .marker-price-badge {
          background: white;
          border-radius: 8px;
          padding: 6px 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border: 2px solid #e5e7eb;
          position: relative;
          margin-top: -2px;
        }
        
        .marker-price-badge.highlighted {
          border-color: #2563eb;
          box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4);
          background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%);
        }
        
        .marker-price-text {
          font-weight: 700;
          font-size: 13px;
          color: #111827;
          white-space: nowrap;
        }
        
        .marker-price-badge.highlighted .marker-price-text {
          color: #2563eb;
        }
        
        .marker-price-arrow {
          position: absolute;
          left: 50%;
          bottom: -8px;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 8px solid white;
        }
        
        .marker-price-badge.highlighted .marker-price-arrow {
          border-top-color: #eff6ff;
        }
        
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }
        
        .custom-popup .leaflet-popup-content {
          margin: 0;
          width: auto !important;
        }
        
        .custom-popup .leaflet-popup-tip {
          background: white;
          border: 1px solid #e5e7eb;
        }
      `}</style>
    </>
  );
};

export default TripMapContent;