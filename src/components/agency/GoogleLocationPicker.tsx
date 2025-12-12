import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
  // Use coordinates or default to São Paulo
  const initialCenter = useMemo(() => 
    coordinates && coordinates.lat !== 0 && coordinates.lng !== 0 
      ? coordinates 
      : { lat: -23.5505, lng: -46.6333 },
    [coordinates]
  );

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(initialCenter);
  const [mapZoom, setMapZoom] = useState(10);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(
    coordinates && coordinates.lat !== 0 && coordinates.lng !== 0 ? coordinates : null
  );
  const [isSearching, setIsSearching] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isUpdatingRef = useRef(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || '',
    libraries,
  });

  // Sync input value with prop when it changes externally
  useEffect(() => {
    if (value !== inputValue && !isUpdatingRef.current) {
      setInputValue(value);
      if (inputRef.current) {
        inputRef.current.value = value;
      }
    }
  }, [value, inputValue]);

  // Update map center when coordinates change externally
  useEffect(() => {
    if (coordinates && coordinates.lat !== 0 && coordinates.lng !== 0) {
      if (!isUpdatingRef.current) {
        isUpdatingRef.current = true;
        const newCoords = { lat: coordinates.lat, lng: coordinates.lng };
        setMapCenter(newCoords);
        setMarkerPosition(newCoords);
        setMapZoom(16);
        
        if (mapRef.current) {
          mapRef.current.setCenter(newCoords);
          mapRef.current.setZoom(16);
        }
        
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 300);
      }
    }
  }, [coordinates?.lat, coordinates?.lng]);

  // Handle autocomplete selection
  const onPlaceChanged = useCallback(() => {
    if (!autocompleteRef.current) return;
    
    const place = autocompleteRef.current.getPlace();
    setIsSearching(false);
    
    if (place.geometry?.location) {
      isUpdatingRef.current = true;
      
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const formattedAddress = place.formatted_address || place.name || inputValue || '';
      const newCoords = { lat, lng };
      
      // Determine zoom level based on place type
      let zoomLevel = 16;
      if (place.types) {
        if (place.types.includes('locality') || place.types.includes('administrative_area_level_1')) {
          zoomLevel = 12;
        } else if (place.types.includes('country')) {
          zoomLevel = 6;
        } else if (place.types.includes('establishment') || place.types.includes('point_of_interest')) {
          zoomLevel = 17;
        }
      }
      
      // Update input value
      setInputValue(formattedAddress);
      if (inputRef.current) {
        inputRef.current.value = formattedAddress;
      }
      
      // Update map state
      setMapCenter(newCoords);
      setMarkerPosition(newCoords);
      setMapZoom(zoomLevel);
      
      // Update map view
      if (mapRef.current) {
        mapRef.current.setCenter(newCoords);
        mapRef.current.setZoom(zoomLevel);
      }
      
      // Update parent
      onChange(formattedAddress, newCoords);
      onCoordinatesChange(newCoords);
      
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 200);
    } else {
      logger.warn('Place selected but no geometry available:', place);
      setMapError('Localização não encontrada. Tente ser mais específico.');
    }
  }, [onChange, onCoordinatesChange, inputValue]);

  // Handle marker drag end
  const onMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    
    isUpdatingRef.current = true;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const newCoords = { lat, lng };
    
    setMarkerPosition(newCoords);
    setMapCenter(newCoords);
    onCoordinatesChange(newCoords);
    
    // Reverse geocode
    if (typeof window !== 'undefined' && (window as any).google?.maps) {
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ location: newCoords }, (results: any, status: string) => {
        if (status === 'OK' && results && results[0]) {
          const address = results[0].formatted_address;
          setInputValue(address);
          onChange(address, newCoords);
        } else {
          const coordString = `Lat: ${newCoords.lat.toFixed(6)}, Lng: ${newCoords.lng.toFixed(6)}`;
          setInputValue(coordString);
          onChange(coordString, newCoords);
        }
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 200);
      });
    } else {
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 200);
    }
  }, [onChange, onCoordinatesChange]);

  // Handle use current location
  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setMapError('Geolocalização não suportada pelo navegador.');
      return;
    }

    setIsSearching(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        isUpdatingRef.current = true;
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        
        setMapCenter(userLocation);
        setMarkerPosition(userLocation);
        setMapZoom(16);
        setIsSearching(false);
        
        if (mapRef.current) {
          mapRef.current.setCenter(userLocation);
          mapRef.current.setZoom(16);
        }
        
        // Reverse geocode
        if (typeof window !== 'undefined' && (window as any).google?.maps) {
          const geocoder = new (window as any).google.maps.Geocoder();
          geocoder.geocode({ location: userLocation }, (results: any, status: string) => {
            if (status === 'OK' && results && results[0]) {
              const address = results[0].formatted_address;
              setInputValue(address);
              onChange(address, userLocation);
              onCoordinatesChange(userLocation);
            } else {
              const coordString = `Lat: ${userLocation.lat.toFixed(6)}, Lng: ${userLocation.lng.toFixed(6)}`;
              setInputValue(coordString);
              onChange(coordString, userLocation);
              onCoordinatesChange(userLocation);
            }
            setTimeout(() => {
              isUpdatingRef.current = false;
            }, 200);
          });
        } else {
          setTimeout(() => {
            isUpdatingRef.current = false;
          }, 200);
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
    
    isUpdatingRef.current = true;
    
    if (markerPosition) {
      map.setCenter(markerPosition);
      map.setZoom(mapZoom);
    } else if (coordinates && coordinates.lat !== 0 && coordinates.lng !== 0) {
      map.setCenter(coordinates);
      map.setZoom(16);
    }
    
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 300);
  }, [markerPosition, coordinates, mapZoom]);

  // Handle input change with debounce
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Update parent after debounce (only if not selecting from autocomplete)
    debounceTimeoutRef.current = setTimeout(() => {
      if (!isUpdatingRef.current) {
        onChange(newValue, coordinates || { lat: 0, lng: 0 });
        if (newValue.trim() === '') {
          setMarkerPosition(null);
        }
      }
    }, 300);
  }, [onChange, coordinates]);

  // Error handling
  useEffect(() => {
    if (loadError) {
      logger.error('Google Maps load error:', loadError);
      const errorMessage = loadError.message || String(loadError);
      
      if (errorMessage.includes('CORS') || errorMessage.includes('cross-origin')) {
        setMapError('Erro de CORS ao carregar Google Maps. Verifique as configurações da API e domínios permitidos.');
      } else if (errorMessage.includes('API key')) {
        setMapError('Chave da API do Google Maps inválida ou não configurada.');
      } else {
        setMapError('Erro ao carregar Google Maps. Verifique a chave da API e as configurações.');
      }
    } else if (!apiKey) {
      setMapError('Chave da API do Google Maps não configurada.');
    } else {
      setMapError(null);
    }
  }, [loadError, apiKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Fallback if API key is not available
  if (!apiKey || loadError) {
    return (
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Localização no Mapa</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
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
      </label>
      
      {/* Autocomplete Input */}
      <div className="relative mb-3">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={18} />
        <Autocomplete
          onLoad={(autocomplete) => {
            try {
              autocompleteRef.current = autocomplete;
              if (typeof window !== 'undefined' && (window as any).google?.maps) {
                const brazilBounds = new (window as any).google.maps.LatLngBounds(
                  new (window as any).google.maps.LatLng(-35.0, -74.0),
                  new (window as any).google.maps.LatLng(5.0, -32.0)
                );
                autocomplete.setBounds(brazilBounds);
              }
            } catch (error) {
              logger.error('Error setting autocomplete bounds:', error);
            }
          }}
          onPlaceChanged={onPlaceChanged}
          options={{
            types: ['geocode'],
            componentRestrictions: { country: 'br' },
            fields: ['geometry', 'formatted_address', 'name', 'place_id', 'types'],
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsSearching(true)}
            onBlur={() => {
              setTimeout(() => setIsSearching(false), 200);
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

      {/* Map Preview - Removed onCenterChanged to prevent React errors */}
      <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100 relative">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '400px' }}
          center={mapCenter}
          zoom={mapZoom}
          onLoad={onMapLoad}
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
            gestureHandling: 'greedy',
          }}
        >
          {markerPosition && isMapLoaded && (
            <Marker
              position={markerPosition}
              draggable={true}
              onDragStart={() => {
                isUpdatingRef.current = true;
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
              <p className="text-xs text-gray-600 break-words">{inputValue || 'Sem nome'}</p>
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
