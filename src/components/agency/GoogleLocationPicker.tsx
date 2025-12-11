import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLoadScript, GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';
import { MapPin, Loader, AlertCircle } from 'lucide-react';
import { logger } from '../../utils/logger';

const libraries: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ['places'];

interface GoogleLocationPickerProps {
  value: string;
  coordinates: { lat: number; lng: number } | null;
  onChange: (location: string, coords: { lat: number; lng: number }) => void;
  onCoordinatesChange: (coords: { lat: number; lng: number }) => void;
  placeholder?: string;
  error?: string;
}

const GoogleLocationPicker: React.FC<GoogleLocationPickerProps> = ({
  value,
  coordinates,
  onChange,
  onCoordinatesChange,
  placeholder = "Digite o nome do local...",
  error
}) => {
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: -23.5505, lng: -46.6333 }); // São Paulo default
  const [mapZoom, setMapZoom] = useState(13);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || '',
    libraries,
  });

  // Initialize map center and marker from coordinates
  useEffect(() => {
    if (coordinates) {
      setMapCenter(coordinates);
      setMarkerPosition(coordinates);
      setMapZoom(15);
    } else {
      setMarkerPosition(null);
    }
  }, [coordinates]);

  // Handle autocomplete selection
  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const formattedAddress = place.formatted_address || place.name || value;
        
        const newCoords = { lat, lng };
        
        // Update map center and marker
        setMapCenter(newCoords);
        setMarkerPosition(newCoords);
        setMapZoom(15);
        
        // Update form data
        onChange(formattedAddress, newCoords);
        onCoordinatesChange(newCoords);
        
        // Update map view
        if (mapRef.current) {
          mapRef.current.setCenter(newCoords);
          mapRef.current.setZoom(15);
        }
      }
    }
  }, [onChange, onCoordinatesChange, value]);

  // Handle marker drag end
  const onMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const newCoords = { lat, lng };
      
      // Update marker position
      setMarkerPosition(newCoords);
      setMapCenter(newCoords);
      
      // Update coordinates
      onCoordinatesChange(newCoords);
      
      // Reverse geocode to get address
      if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps) {
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ location: newCoords }, (results: any, status: string) => {
          if (status === 'OK' && results && results[0]) {
            onChange(results[0].formatted_address, newCoords);
          }
        });
      }
    }
  }, [onChange, onCoordinatesChange]);

  // Handle map load
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setIsMapLoaded(true);
    
    // Center map on marker if exists
    if (markerPosition) {
      map.setCenter(markerPosition);
      map.setZoom(15);
    }
  }, [markerPosition]);

  // Error handling
  useEffect(() => {
    if (loadError) {
      logger.error('Google Maps load error:', loadError);
      setMapError('Erro ao carregar Google Maps. Verifique a chave da API.');
    } else if (!apiKey) {
      setMapError('Chave da API do Google Maps não configurada.');
    } else {
      setMapError(null);
    }
  }, [loadError, apiKey]);

  // Fallback if API key is not available
  if (!apiKey || loadError) {
    return (
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Localização no Mapa</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={value}
            onChange={(e) => {
              const newValue = e.target.value;
              onChange(newValue, coordinates || { lat: 0, lng: 0 });
            }}
            className={`w-full border ${error ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 pl-10 bg-white text-gray-900 outline-none focus:ring-2 focus:ring-primary-500`}
            placeholder={placeholder}
          />
        </div>
        {mapError && (
          <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
            <AlertCircle size={14} />
            <span>{mapError}</span>
          </div>
        )}
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Localização no Mapa</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <div className="w-full border border-gray-300 rounded-lg p-3 pl-10 bg-gray-50 flex items-center gap-2">
            <Loader className="animate-spin text-gray-400" size={18} />
            <span className="text-sm text-gray-500">Carregando mapa...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">Localização no Mapa</label>
      
      {/* Autocomplete Input */}
      <div className="relative mb-3">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={18} />
        <Autocomplete
          onLoad={(autocomplete) => {
            autocompleteRef.current = autocomplete;
          }}
          onPlaceChanged={onPlaceChanged}
          options={{
            types: ['establishment', 'geocode'],
            componentRestrictions: { country: 'br' }, // Restrict to Brazil
          }}
        >
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value, coordinates || { lat: 0, lng: 0 })}
            className={`w-full border ${error ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 pl-10 pr-3 bg-white text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
            placeholder={placeholder}
          />
        </Autocomplete>
      </div>

      {/* Map Preview */}
      <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '320px' }}
          center={mapCenter}
          zoom={mapZoom}
          onLoad={onMapLoad}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'on' }]
              }
            ]
          }}
        >
          {markerPosition && isMapLoaded && (
            <Marker
              position={markerPosition}
              draggable={true}
              onDragEnd={onMarkerDragEnd}
              icon={(() => {
                if (typeof window !== 'undefined' && (window as any).google?.maps) {
                  return {
                    path: (window as any).google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#EF4444',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2,
                  };
                }
                return undefined;
              })()}
            />
          )}
        </GoogleMap>
      </div>

      {/* Coordinates Display */}
      {markerPosition && (
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
          <MapPin size={12} />
          <span>
            Coordenadas: {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
          </span>
          <span className="text-gray-400 ml-2">• Arraste o pino para ajustar</span>
        </p>
      )}

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};

export default GoogleLocationPicker;

