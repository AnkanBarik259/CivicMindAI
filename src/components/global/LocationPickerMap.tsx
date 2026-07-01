import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Loader2 } from 'lucide-react';

interface LocationPickerMapProps {
  initialPosition?: { latitude: number; longitude: number };
  onLocationSelected: (lat: number, lng: number, address?: string) => void;
}

const customIcon = L.divIcon({
  className: 'custom-leaflet-icon bg-transparent border-none',
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 drop-shadow-md">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3" fill="white"/>
    </svg>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

function MapEvents({ onLocationSelected }: { onLocationSelected: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelected(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyToLocation({ position }: { position: L.LatLngTuple | null }) {
  const map = useMap();
  useEffect(() => {
    if (map && position) {
      map.flyTo(position, 17);
    }
  }, [position, map]);
  return null;
}

export default function LocationPickerMap({ initialPosition, onLocationSelected }: LocationPickerMapProps) {
  const [position, setPosition] = useState<L.LatLngTuple | null>(
    initialPosition ? [initialPosition.latitude, initialPosition.longitude] : null
  );
  
  useEffect(() => {
    if (initialPosition) {
      setPosition([initialPosition.latitude, initialPosition.longitude]);
    }
  }, [initialPosition?.latitude, initialPosition?.longitude]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleLocationSelected = async (lat: number, lng: number) => {
    setPosition([lat, lng]);
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      onLocationSelected(lat, lng, data.display_name);
    } catch (e) {
      console.error("Reverse geocoding failed", e);
      onLocationSelected(lat, lng);
    }
  };

  const handleSearch = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setPosition([lat, lng]);
    onLocationSelected(lat, lng, result.display_name);
    setSearchResults([]);
    setSearchQuery(result.display_name);
  };

  return (
    <div className="w-full h-full relative z-0 flex flex-col">
      <div className="absolute top-4 left-4 right-4 z-[400] flex flex-col items-center">
        <div className="w-full max-w-md relative flex items-center shadow-lg rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <input 
            type="text" 
            placeholder="Search address or landmark..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch(e);
              }
            }}
            className="flex-1 px-4 py-3 bg-transparent outline-none text-slate-900 dark:text-white"
          />
          <button 
            type="button" 
            onClick={() => handleSearch()}
            disabled={isSearching} 
            className="px-4 py-3 bg-blue-600 hover:bg-blue-700 transition-colors text-white flex items-center justify-center"
          >
            {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </button>
        </div>
        
        {searchResults.length > 0 && (
          <div className="w-full max-w-md mt-2 bg-white dark:bg-slate-900 shadow-xl rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {searchResults.map((result, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectSearchResult(result)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 border-b last:border-0 border-slate-100 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 transition-colors"
              >
                {result.display_name}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <MapContainer 
        center={position || [51.505, -0.09]} 
        zoom={13} 
        scrollWheelZoom={true} 
        className="flex-1 w-full z-0"
        style={{ minHeight: '300px', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <MapEvents onLocationSelected={handleLocationSelected} />
        {position && <Marker position={position} icon={customIcon} />}
        {position && <FlyToLocation position={position} />}
      </MapContainer>
    </div>
  );
}
