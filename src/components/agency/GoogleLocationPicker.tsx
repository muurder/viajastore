import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLoadScript, GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';
import { MapPin, Loader, AlertCircle, Navigation, Search } from 'lucide-react';
import { logger } from '../../utils/logger';

const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ['places'];

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
  const [mapZoom, setMapZoom] = useState(10); // Zoom inicial mais amplo
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || '',
    libraries,
  });

  // Sync input value with prop when it changes externally
  useEffect(() => {
    if (inputRef.current && value !== inputRef.current.value) {
      inputRef.current.value = value;
    }
  }, [value]);

  // Initialize map center and marker from coordinates
  useEffect(() => {
    if (coordinates && coordinates.lat !== 0 && coordinates.lng !== 0) {
      setMapCenter(coordinates);
      setMarkerPosition(coordinates);
      setMapZoom(16); // Zoom mais próximo para coordenadas existentes
      
      // Update map view if already loaded
      if (mapRef.current) {
        mapRef.current.setCenter(coordinates);
        mapRef.current.setZoom(16);
      }
    } else {
      // Não remove o marcador se houver valor no input, apenas se não houver coordenadas válidas
      if (!value || value.trim() === '') {
        setMarkerPosition(null);
      }
    }
  }, [coordinates, value]);

  // Handle autocomplete selection
  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      setIsSearching(false);
      
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const formattedAddress = place.formatted_address || place.name || value || '';
        
        const newCoords = { lat, lng };
        
        // Update input value to show selected place
        if (inputRef.current) {
          inputRef.current.value = formattedAddress;
        }
        
        // Determine zoom level based on place type
        let zoomLevel = 16; // Default for establishments
        if (place.types) {
          if (place.types.includes('locality') || place.types.includes('administrative_area_level_1')) {
            zoomLevel = 12; // Cities/states - zoom out
          } else if (place.types.includes('country')) {
            zoomLevel = 6; // Countries - zoom out more
          } else if (place.types.includes('establishment') || place.types.includes('point_of_interest')) {
            zoomLevel = 17; // Specific places - zoom in more
          }
        }
        
        // Update map center and marker
        setMapCenter(newCoords);
        setMarkerPosition(newCoords);
        setMapZoom(zoomLevel);
        
        // Update form data
        onChange(formattedAddress, newCoords);
        onCoordinatesChange(newCoords);
        
        // Update map view with smooth animation
        if (mapRef.current) {
          mapRef.current.setCenter(newCoords);
          mapRef.current.setZoom(zoomLevel);
        }
      } else {
        logger.warn('Place selected but no geometry available:', place);
        setMapError('Localização não encontrada. Tente ser mais específico.');
        setIsSearching(false);
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
      
      // Update coordinates immediately
      onCoordinatesChange(newCoords);
      
      // Reverse geocode to get address (with better error handling)
      if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps) {
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ location: newCoords }, (results: any, status: string) => {
          if (status === 'OK' && results && results[0]) {
            onChange(results[0].formatted_address, newCoords);
          } else {
            // Fallback: use coordinates as location name
            onChange(`Lat: ${newCoords.lat.toFixed(6)}, Lng: ${newCoords.lng.toFixed(6)}`, newCoords);
            logger.warn('Geocoder failed:', status);
          }
        });
      }
    }
  }, [onChange, onCoordinatesChange]);

  // Handle use current location button
  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setMapError('Geolocalização não suportada pelo navegador.');
      return;
    }

    setIsSearching(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        
        setMapCenter(userLocation);
        setMarkerPosition(userLocation);
        setMapZoom(16);
        setIsSearching(false);
        
        // Update map view
        if (mapRef.current) {
          mapRef.current.setCenter(userLocation);
          mapRef.current.setZoom(16);
        }
        
        // Reverse geocode to get address
        if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps) {
          const geocoder = new (window as any).google.maps.Geocoder();
          geocoder.geocode({ location: userLocation }, (results: any, status: string) => {
            if (status === 'OK' && results && results[0]) {
              onChange(results[0].formatted_address, userLocation);
              onCoordinatesChange(userLocation);
            } else {
              onChange(`Lat: ${userLocation.lat.toFixed(6)}, Lng: ${userLocation.lng.toFixed(6)}`, userLocation);
              onCoordinatesChange(userLocation);
            }
          });
        } else {
          onChange(`Lat: ${userLocation.lat.toFixed(6)}, Lng: ${userLocation.lng.toFixed(6)}`, userLocation);
          onCoordinatesChange(userLocation);
        }
      },
      (err) => {
        logger.warn('Geolocation failed:', err);
        setMapError('Não foi possível obter sua localização. Verifique as permissões do navegador.');
        setIsSearching(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [onChange, onCoordinatesChange]);

  // Handle map load
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setIsMapLoaded(true);
    
    // Center map on marker if exists, otherwise use current center
    if (markerPosition) {
      map.setCenter(markerPosition);
      map.setZoom(mapZoom);
    } else if (coordinates && coordinates.lat !== 0 && coordinates.lng !== 0) {
      map.setCenter(coordinates);
      map.setZoom(16);
    }
  }, [markerPosition, coordinates, mapZoom]);

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
      <label className="block text-sm font-bold text-gray-700 mb-2">
        Localização no Mapa
        {!apiKey && (
          <span className="ml-2 text-xs font-normal text-amber-600">
            (Configure VITE_GOOGLE_MAPS_API_KEY para usar o mapa interativo)
          </span>
        )}
      </label>
      
      {/* Autocomplete Input */}
      <div className="relative mb-3">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={18} />
        <Autocomplete
          onLoad={(autocomplete) => {
            autocompleteRef.current = autocomplete;
            // Set bounds to Brazil for better results
            const brazilBounds = new (window as any).google.maps.LatLngBounds(
              new (window as any).google.maps.LatLng(-35.0, -74.0), // Southwest
              new (window as any).google.maps.LatLng(5.0, -32.0)   // Northeast
            );
            autocomplete.setBounds(brazilBounds);
          }}
          onPlaceChanged={onPlaceChanged}
          options={{
            types: ['establishment', 'geocode', 'point_of_interest', '(cities)'],
            componentRestrictions: { country: 'br' }, // Restrict to Brazil
            fields: ['geometry', 'formatted_address', 'name', 'place_id', 'types'],
          }}
        >
          <input
            ref={inputRef}
            type="text"
            defaultValue={value}
            onChange={(e) => {
              const newValue = e.target.value;
              // Update parent on manual input
              onChange(newValue, coordinates || { lat: 0, lng: 0 });
              if (newValue.trim() === '') {
                setMarkerPosition(null);
              }
            }}
            onFocus={() => {
              setIsSearching(true);
            }}
            onBlur={() => {
              // Reset searching state after a delay to allow autocomplete selection
              setTimeout(() => {
                setIsSearching(false);
              }, 200);
            }}
            className={`w-full border ${error ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 pl-10 pr-12 bg-white text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
            placeholder={placeholder}
          />
        </Autocomplete>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isSearching}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Usar minha localização atual"
        >
          {isSearching ? (
            <Loader className="animate-spin" size={16} />
          ) : (
            <Navigation size={16} />
          )}
        </button>
      </div>

      {/* Map Preview */}
      <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100 relative">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '400px' }}
          center={mapCenter}
          zoom={mapZoom}
          onLoad={onMapLoad}
          onCenterChanged={() => {
            // Update center when user pans the map
            if (mapRef.current) {
              const center = mapRef.current.getCenter();
              if (center) {
                setMapCenter({ lat: center.lat(), lng: center.lng() });
              }
            }
          }}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: true,
            mapTypeControlOptions: {
              style: (window as any).google?.maps?.MapTypeControlStyle?.HORIZONTAL_BAR,
              position: (window as any).google?.maps?.ControlPosition?.TOP_RIGHT,
            },
            fullscreenControl: true,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'on' }]
              }
            ],
            gestureHandling: 'greedy', // Allow zoom with mouse wheel
          }}
        >
          {markerPosition && isMapLoaded && (
            <Marker
              position={markerPosition}
              draggable={true}
              onDragStart={() => {
                // Visual feedback when dragging starts
              }}
              onDragEnd={onMarkerDragEnd}
              icon={(() => {
                if (typeof window !== 'undefined' && (window as any).google?.maps) {
                  return {
                    path: (window as any).google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#EF4444',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 3,
                  };
                }
                return undefined;
              })()}
              title="Arraste para ajustar a localização"
            />
          )}
        </GoogleMap>
        {!markerPosition && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 pointer-events-none">
            <div className="text-center p-4 bg-white/90 rounded-lg shadow-sm">
              <Search className="mx-auto mb-2 text-gray-400" size={24} />
              <p className="text-sm text-gray-600">Digite um local ou use o botão de navegação</p>
            </div>
          </div>
        )}
      </div>

      {/* Coordinates Display */}
      {markerPosition && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start gap-2">
            <MapPin className="text-primary-600 mt-0.5 flex-shrink-0" size={14} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700 mb-1">Localização selecionada:</p>
              <p className="text-xs text-gray-600 break-words">{value || 'Sem nome'}</p>
              <p className="text-xs text-gray-500 mt-1">
                Coordenadas: {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
              </p>
              <p className="text-xs text-gray-400 mt-1 italic">
                💡 Arraste o pino vermelho no mapa para ajustar a posição exata
              </p>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};

export default GoogleLocationPicker;

