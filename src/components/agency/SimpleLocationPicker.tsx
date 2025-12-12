import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Loader, AlertCircle, Search } from 'lucide-react';
import { logger } from '../../utils/logger';

interface SimpleLocationPickerProps {
  value: string;
  coordinates: { lat: number; lng: number } | null;
  onChange: (location: string, coords: { lat: number; lng: number }) => void;
  onCoordinatesChange?: (coords: { lat: number; lng: number }) => void;
  placeholder?: string;
  error?: string;
}

const SimpleLocationPicker: React.FC<SimpleLocationPickerProps> = ({
  value,
  coordinates,
  onChange,
  onCoordinatesChange,
  placeholder = "Digite o nome do local...",
  error
}) => {
  const [searchQuery, setSearchQuery] = useState(value);
  const [isSearching, setIsSearching] = useState(false);
  const [mapUrl, setMapUrl] = useState<string>('');
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Update map URL when coordinates change
  useEffect(() => {
    if (coordinates && coordinates.lat && coordinates.lng) {
      const url = `https://www.google.com/maps/embed/v1/place?key=${apiKey || ''}&q=${coordinates.lat},${coordinates.lng}&zoom=15`;
      setMapUrl(url);
    } else if (value) {
      // Try to show map by location name
      const encodedLocation = encodeURIComponent(value);
      const url = `https://www.google.com/maps/embed/v1/place?key=${apiKey || ''}&q=${encodedLocation}&zoom=13`;
      setMapUrl(url);
    } else {
      setMapUrl('');
    }
  }, [coordinates, value, apiKey]);

  // Geocode search query using Google Geocoding API
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !apiKey) {
      // If no API key, just update the location text
      onChange(searchQuery, coordinates || { lat: 0, lng: 0 });
      return;
    }

    setIsSearching(true);
    try {
      const encodedQuery = encodeURIComponent(searchQuery);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedQuery}&key=${apiKey}&region=br`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;
        const coords = {
          lat: location.lat,
          lng: location.lng
        };
        
        onChange(result.formatted_address || searchQuery, coords);
        if (onCoordinatesChange) {
          onCoordinatesChange(coords);
        }
      } else {
        // If geocoding fails, still update the text
        onChange(searchQuery, coordinates || { lat: 0, lng: 0 });
      }
    } catch (error) {
      logger.error('Geocoding error:', error);
      // On error, still update the text
      onChange(searchQuery, coordinates || { lat: 0, lng: 0 });
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, apiKey, coordinates, onChange, onCoordinatesChange]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    // Update immediately for better UX
    onChange(newValue, coordinates || { lat: 0, lng: 0 });
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // Sync searchQuery with value prop
  useEffect(() => {
    if (value !== searchQuery) {
      setSearchQuery(value);
    }
  }, [value]);

  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">
        Localização no Mapa
        {!apiKey && (
          <span className="ml-2 text-xs font-normal text-amber-600">
            (Configure VITE_GOOGLE_MAPS_API_KEY para busca automática)
          </span>
        )}
      </label>
      
      {/* Search Input */}
      <div className="relative mb-3">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          className={`w-full border ${error ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 pl-10 pr-20 bg-white text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
          placeholder={placeholder}
          disabled={isSearching}
        />
        {apiKey && (
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
          >
            {isSearching ? (
              <>
                <Loader className="animate-spin" size={14} />
                Buscando...
              </>
            ) : (
              <>
                <Search size={14} />
                Buscar
              </>
            )}
          </button>
        )}
      </div>

      {/* Map Preview using iframe */}
      {mapUrl && apiKey ? (
        <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100">
          <iframe
            width="100%"
            height="320"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={mapUrl}
            title="Localização no mapa"
          />
        </div>
      ) : searchQuery ? (
        <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center h-64">
          <div className="text-center px-6">
            {apiKey ? (
              <>
                <MapPin className="text-gray-400 mx-auto mb-2" size={32} />
                <p className="text-sm text-gray-600 font-medium">Clique em "Buscar" para ver o mapa</p>
              </>
            ) : (
              <>
                <MapPin className="text-gray-400 mx-auto mb-2" size={32} />
                <p className="text-sm text-gray-600 font-medium">Configure a API key para visualizar o mapa</p>
              </>
            )}
          </div>
        </div>
      ) : null}

      {/* Coordinates Display */}
      {coordinates && coordinates.lat !== 0 && coordinates.lng !== 0 && (
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
          <MapPin size={12} />
          <span>
            Coordenadas: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
          </span>
        </p>
      )}

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};

export default SimpleLocationPicker;
