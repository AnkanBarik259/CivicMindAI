import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { MapPin, Navigation, Search, Navigation2, Loader2, Target, AlertTriangle, Info, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LocationResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

const createCustomIcon = (status: string, isOnRoute: boolean = false) => {
  const color = status === 'pending' ? '#ef4444' // red
              : status === 'in_progress' ? '#f59e0b' // yellow
              : status === 'escalated' ? '#8b5cf6' // purple
              : '#10b981'; // green
              
  const scale = isOnRoute ? 'scale(1.3)' : 'scale(1)';
  const pulseAnim = isOnRoute ? `<style>
    @keyframes pulse-ring {
      0% { transform: scale(0.8); opacity: 0.5; }
      100% { transform: scale(1.5); opacity: 0; }
    }
    .ring-${status} {
      animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
      transform-origin: center bottom;
    }
  </style>` : '';

  const svgIcon = `
    ${pulseAnim}
    <div style="position: relative; transform: ${scale}; transition: transform 0.3s ease;">
      ${isOnRoute ? `<div class="ring-${status}" style="position: absolute; bottom: 0; left: 50%; width: 40px; height: 40px; margin-left: -20px; border-radius: 50%; background-color: ${color}; z-index: -1;"></div>` : ''}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 drop-shadow-md relative z-10">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3" fill="white"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    className: 'custom-leaflet-icon bg-transparent border-none',
    html: svgIcon,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const userIcon = L.divIcon({
  className: 'custom-leaflet-icon bg-transparent border-none',
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3b82f6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 drop-shadow-md">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

function LocationMarker() {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const map = useMap();

  useEffect(() => {
    map.locate().on("locationfound", function (e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    });
  }, [map]);

  return position === null ? null : (
    <Marker position={position} icon={userIcon}>
      <Popup>You are here</Popup>
    </Marker>
  );
}

function isPointNearRoute(point: {lat: number, lng: number}, routeCoords: [number, number][], thresholdDeg: number = 0.005) {
  if (!routeCoords || routeCoords.length === 0) return false;
  for (let i = 0; i < routeCoords.length; i += 5) {
    const dLat = point.lat - routeCoords[i][0];
    const dLng = point.lng - routeCoords[i][1];
    if (dLat * dLat + dLng * dLng < thresholdDeg * thresholdDeg) {
      return true;
    }
  }
  return false;
}

function getPredictedHighRiskAreas(reports: any[]) {
  if (!reports || reports.length === 0) return [];
  const clusters: any[] = [];
  
  reports.forEach(report => {
    let found = false;
    for (let cluster of clusters) {
      const dLat = cluster.lat - report.location.latitude;
      const dLng = cluster.lng - report.location.longitude;
      if (dLat * dLat + dLng * dLng < 0.0001) { // roughly ~1km radius
        cluster.count++;
        cluster.reports.push(report);
        found = true;
        break;
      }
    }
    if (!found) {
      clusters.push({
        id: report.id + '_cluster',
        lat: report.location.latitude,
        lng: report.location.longitude,
        count: 1,
        reports: [report]
      });
    }
  });
  
  return clusters.filter(c => c.count > 1);
}

function MapBoundsUpdater({ routePath }: { routePath: [number, number][] | null }) {
  const map = useMap();
  useEffect(() => {
    if (routePath && routePath.length > 0) {
      const bounds = L.latLngBounds(routePath);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routePath, map]);
  return null;
}

export default function MapComponent() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [startQuery, setStartQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  
  const [startResults, setStartResults] = useState<LocationResult[]>([]);
  const [destResults, setDestResults] = useState<LocationResult[]>([]);
  
  const [isSearchingStart, setIsSearchingStart] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  
  const [selectedStart, setSelectedStart] = useState<LocationResult | null>(null);
  const [selectedDest, setSelectedDest] = useState<LocationResult | null>(null);
  
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routePath, setRoutePath] = useState<[number, number][] | null>(null);
  const [alternativePaths, setAlternativePaths] = useState<[number, number][][]>([]);
  const [routeDistance, setRouteDistance] = useState(0);
  const [routeDuration, setRouteDuration] = useState(0);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [routeAnalysis, setRouteAnalysis] = useState<any>(null);
  
  const [selectedHazard, setSelectedHazard] = useState<any>(null);
  const [newHazardNotification, setNewHazardNotification] = useState(false);

  const [isNavigating, setIsNavigating] = useState(false);
  const [liveLocation, setLiveLocation] = useState<{lat: number, lng: number} | null>(null);
  const [navWatchId, setNavWatchId] = useState<number | null>(null);
  const [remainingDistance, setRemainingDistance] = useState<number>(0);
  const [remainingETA, setRemainingETA] = useState<number>(0);

  const calculateHaversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const formatDistance = (meters: number) => (meters / 1000).toFixed(1) + ' km';
  const formatDuration = (seconds: number) => {
    const m = Math.round(seconds / 60);
    if (m < 60) return m + ' mins';
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return `${h}h ${rem}m`;
  };

  const startSearchTimeout = useRef<NodeJS.Timeout | null>(null);
  const destSearchTimeout = useRef<NodeJS.Timeout | null>(null);

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => api.reports.getAll(),
    refetchInterval: 5000,
  });

  const prevReportsLength = useRef(reports?.length || 0);

  useEffect(() => {
    if (reports && routePath) {
      if (reports.length > prevReportsLength.current) {
        setNewHazardNotification(true);
        handleFindRoute();
        setTimeout(() => setNewHazardNotification(false), 5000);
      }
      prevReportsLength.current = reports.length;
    } else if (reports) {
      prevReportsLength.current = reports.length;
    }
  }, [reports, routePath]);

  const validReports = Array.isArray(reports) ? reports.filter(r => r.location && r.location.latitude && r.location.longitude) : [];
  const predictedHighRiskAreas = getPredictedHighRiskAreas(validReports);

  const activeHazards = React.useMemo(() => {
    return routePath ? validReports.filter(r => {
      const status = r.status || 'pending';
      if (status === 'resolved' || status === 'rejected') return false;
      return isPointNearRoute({ lat: r.location.latitude, lng: r.location.longitude }, routePath);
    }) : [];
  }, [validReports, routePath]);

  const hazardBreakdown = React.useMemo(() => {
    const counts: Record<string, number> = {};
    activeHazards.forEach(h => {
      const cat = h.aiDecision?.category || 'Unknown';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [activeHazards]);

  const searchNominatim = async (query: string, setResults: (results: LocationResult[]) => void, setLoading: (loading: boolean) => void) => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`, {
        headers: { 'Accept-Language': 'en-US,en;q=0.9' }
      });
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Nominatim search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (useCurrentLocation) {
      setStartQuery('Current Location');
      setSelectedStart({ place_id: 0, display_name: 'Current Location', lat: '0', lon: '0' });
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          setSelectedStart({
            place_id: 0,
            display_name: 'Current Location',
            lat: position.coords.latitude.toString(),
            lon: position.coords.longitude.toString()
          });
        });
      }
    } else if (startQuery === 'Current Location') {
      setStartQuery('');
      setSelectedStart(null);
    }
  }, [useCurrentLocation]);

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStartQuery(val);
    setSelectedStart(null);
    if (useCurrentLocation) setUseCurrentLocation(false);
    
    if (startSearchTimeout.current) clearTimeout(startSearchTimeout.current);
    startSearchTimeout.current = setTimeout(() => searchNominatim(val, setStartResults, setIsSearchingStart), 500);
  };

  const handleDestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDestQuery(val);
    setSelectedDest(null);
    
    if (destSearchTimeout.current) clearTimeout(destSearchTimeout.current);
    destSearchTimeout.current = setTimeout(() => searchNominatim(val, setDestResults, setIsSearchingDest), 500);
  };

  const handleFindRouteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    handleFindRoute();
  };

  const handleFindRoute = async (skipStopNavigation: boolean = false) => {
    if (!selectedStart || !selectedDest) return;
    setIsLoadingRoute(true);
    setRouteAnalysis(null);
    if (!skipStopNavigation) stopNavigation();
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${selectedStart.lon},${selectedStart.lat};${selectedDest.lon},${selectedDest.lat}?overview=full&geometries=geojson&alternatives=true`);
      if (res.ok) {
        const data = await res.json();
        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
          setRoutePath(coords);
          
          const distance = data.routes[0].distance || 0;
          const duration = data.routes[0].duration || 0;
          setRouteDistance(distance);
          setRouteDuration(duration);

          const currentNearbyHazards = validReports.filter(r => {
            const status = r.status || 'pending';
            if (status === 'resolved' || status === 'rejected') return false;
            return isPointNearRoute({ lat: r.location.latitude, lng: r.location.longitude }, coords);
          });
          
          const primaryRouteData = { distance, duration, hazards: currentNearbyHazards };
          
          const alternativeRoutesData = [];
          const altPathsList = [];
          if (data.routes.length > 1) {
             for (let i = 1; i < data.routes.length; i++) {
                 const altCoords = data.routes[i].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
                 altPathsList.push(altCoords);
                 const altHazards = validReports.filter(r => {
                   const status = r.status || 'pending';
                   if (status === 'resolved' || status === 'rejected') return false;
                   return isPointNearRoute({ lat: r.location.latitude, lng: r.location.longitude }, altCoords);
                 });
                 alternativeRoutesData.push({
                     distance: data.routes[i].distance || 0,
                     duration: data.routes[i].duration || 0,
                     hazards: altHazards,
                     coords: altCoords
                 });
             }
          }
          setAlternativePaths(altPathsList);
          
          setIsAnalyzing(true);
          try {
             const delayMap: Record<string, number> = {
               low: 60,
               medium: 180,
               high: 600,
               critical: 1200
             };
             
             let totalDelay = 0;
             let healthScore = 100;
             
             currentNearbyHazards.forEach((hazard: any) => {
               const status = hazard.status || 'pending';
               const severity = (hazard.aiDecision?.severity || 'medium').toLowerCase();
               let delay = delayMap[severity] || 180;
               let penalty = severity === 'low' ? 2 : severity === 'medium' ? 5 : severity === 'high' ? 10 : 20;

               if (status === 'needs_reverification') {
                 // Minimize impact by 10x for needs_reverification status
                 delay = Math.round(delay / 10);
                 penalty = penalty / 10;
               }

               totalDelay += delay;
               healthScore -= penalty;
             });
             
             healthScore = Math.max(0, healthScore);
             
             let summary = currentNearbyHazards.length === 0 
               ? "Clear route ahead." 
               : `Your route contains ${currentNearbyHazards.length} reported hazard(s). Proceed with caution.`;
               
             setRouteAnalysis({
               estimatedDelaySeconds: totalDelay,
               roadHealthScore: healthScore,
               summary: summary,
               hasSaferAlternative: false
             });
          } catch (e) {
             console.error("AI Analysis failed", e);
          } finally {
             setIsAnalyzing(false);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch route", err);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  useEffect(() => {
    if (isNavigating && liveLocation && routePath && routePath.length > 0) {
      const dest = routePath[routePath.length - 1];
      const dist = calculateHaversineMeters(liveLocation.lat, liveLocation.lng, dest[0], dest[1]) * 1.3;
      setRemainingDistance(dist);
      
      if (routeDistance > 0 && routeDuration > 0) {
         const remainingRatio = dist / routeDistance;
         const baseETA = routeDuration * remainingRatio;
         const delay = routeAnalysis?.estimatedDelaySeconds || 0;
         setRemainingETA(baseETA + (delay * remainingRatio));
      }
    }
  }, [liveLocation, isNavigating, routePath, routeDistance, routeDuration, routeAnalysis]);

  const recalculateRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    recalculateRef.current = () => handleFindRoute(true);
  });

  const startNavigation = () => {
    if (!navigator.geolocation) return;
    setIsNavigating(true);
    
    navigator.geolocation.getCurrentPosition((pos) => {
      setLiveLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });

    const id = navigator.geolocation.watchPosition((pos) => {
      const currentLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setLiveLocation(currentLoc);
      
      setRoutePath(prevRoute => {
        if (prevRoute && prevRoute.length > 0) {
          if (!isPointNearRoute(currentLoc, prevRoute, 0.001)) {
              console.log("User is off route! Recalculating...");
              setSelectedStart({
                place_id: 0,
                display_name: 'Current Location',
                lat: currentLoc.lat.toString(),
                lon: currentLoc.lng.toString()
              });
              setStartQuery('Current Location');
              
              if (recalculateRef.current) {
                 recalculateRef.current();
              }
          }
        }
        return prevRoute;
      });
    }, (err) => {
      console.error("GPS Error", err);
    }, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 5000
    });
    setNavWatchId(id);
  };

  const stopNavigation = () => {
    if (navWatchId !== null) {
      navigator.geolocation.clearWatch(navWatchId);
      setNavWatchId(null);
    }
    setIsNavigating(false);
    setLiveLocation(null);
  };

  return (
    <div className="flex-1 w-full relative flex flex-col z-0 overflow-hidden">
      
      {/* Route Navigation Collapsible Panel Over Map */}
      <div className="absolute top-4 left-4 z-[1000] w-[400px] max-w-[calc(100vw-32px)]">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[calc(100vh-100px)] transition-all">
          
          <button 
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className="w-full p-4 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors border-b border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="font-bold text-slate-900 dark:text-white">AI Route Navigation</span>
            </div>
            {isPanelOpen ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
          </button>
          
          <AnimatePresence>
            {isPanelOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-y-auto overflow-x-hidden p-4 space-y-6"
              >
                
                <div className="space-y-4">
                  {/* Start Location */}
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Start
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Target className="w-4 h-4 text-slate-400" />
                        </div>
                        <input
                          type="text"
                          value={startQuery}
                          onChange={handleStartChange}
                          placeholder="Current location or search..."
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:text-white"
                        />
                        {isSearchingStart && (
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setUseCurrentLocation(!useCurrentLocation)}
                        className={`px-3 py-2 rounded-lg border flex items-center justify-center transition-colors ${
                          useCurrentLocation 
                            ? 'bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Navigation2 className="w-4 h-4" />
                      </button>
                    </div>

                    <AnimatePresence>
                      {startResults.length > 0 && !selectedStart && !useCurrentLocation && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute z-[2000] w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto"
                        >
                          {startResults.map((result) => (
                            <button
                              key={result.place_id}
                              type="button"
                              onClick={() => { setSelectedStart(result); setStartQuery(result.display_name); setStartResults([]); }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 flex items-start gap-2"
                            >
                              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                              <span className="text-xs text-slate-700 dark:text-slate-200 line-clamp-2">{result.display_name}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Destination */}
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Destination
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin className="w-4 h-4 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        value={destQuery}
                        onChange={handleDestChange}
                        placeholder="Search destination..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:text-white"
                      />
                      {isSearchingDest && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        </div>
                      )}
                    </div>

                    <AnimatePresence>
                      {destResults.length > 0 && !selectedDest && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute z-[2000] w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto"
                        >
                          {destResults.map((result) => (
                            <button
                              key={result.place_id}
                              type="button"
                              onClick={() => { setSelectedDest(result); setDestQuery(result.display_name); setDestResults([]); }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 flex items-start gap-2"
                            >
                              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                              <span className="text-xs text-slate-700 dark:text-slate-200 line-clamp-2">{result.display_name}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="pt-2">
                  {!isNavigating ? (
                    <button
                      onClick={handleFindRouteClick}
                      disabled={!selectedStart || !selectedDest || isLoadingRoute}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      {isLoadingRoute ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      {isLoadingRoute ? 'Routing...' : 'Find Route'}
                    </button>
                  ) : (
                    <button
                      onClick={stopNavigation}
                      className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      Stop Navigation
                    </button>
                  )}
                </div>
                
                {routePath && !isLoadingRoute && !isNavigating && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={startNavigation}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <Navigation2 className="w-4 h-4" />
                      Start Live Navigation
                    </button>
                  </div>
                )}
                
                {/* Civic Travel Intelligence Report Block inside panel */}
                {routePath && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-indigo-500" />
                      Civic Travel Intelligence Report
                    </h3>
                    
                    {isAnalyzing ? (
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                        Analyzing route...
                      </div>
                    ) : routeAnalysis ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">{isNavigating ? 'Rem Distance' : 'Total Distance'}</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-white">{isNavigating ? formatDistance(remainingDistance) : formatDistance(routeDistance)}</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Normal ETA</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-white">{isNavigating ? formatDuration(remainingDistance / (routeDistance || 1) * routeDuration) : formatDuration(routeDuration)}</p>
                          </div>
                          
                          {(routeAnalysis?.estimatedDelaySeconds || 0) > 0 && (
                            <>
                              <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-800">
                                <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold tracking-wider mb-1">Estimated Delay</p>
                                <p className="text-lg font-bold text-amber-700 dark:text-amber-500">+{formatDuration(isNavigating ? Math.max(0, remainingETA - (remainingDistance / (routeDistance || 1) * routeDuration)) : routeAnalysis.estimatedDelaySeconds)}</p>
                              </div>
                              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                                <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold tracking-wider mb-1">{isNavigating ? 'Rem ETA (Adj)' : 'AI Adjusted ETA'}</p>
                                <p className="text-lg font-bold text-blue-700 dark:text-blue-500">{isNavigating ? formatDuration(remainingETA) : formatDuration(routeDuration + routeAnalysis.estimatedDelaySeconds)}</p>
                              </div>
                            </>
                          )}

                          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Road Health Score</p>
                            <p className={`text-xl font-bold flex items-center gap-1 ${routeAnalysis.roadHealthScore >= 80 ? 'text-emerald-500' : routeAnalysis.roadHealthScore >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                              {routeAnalysis.roadHealthScore}<span className="text-sm">/100</span>
                            </p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Overall Risk</p>
                            <p className={`text-xl font-bold flex items-center gap-1 ${routeAnalysis.roadHealthScore >= 80 ? 'text-emerald-500' : routeAnalysis.roadHealthScore >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                              {routeAnalysis.roadHealthScore >= 80 ? 'Low' : routeAnalysis.roadHealthScore >= 50 ? 'Medium' : 'High'}
                            </p>
                          </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                           <div className="flex items-center justify-between mb-2">
                             <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Hazard Count</p>
                             <p className="text-xs font-bold text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{activeHazards.length}</p>
                           </div>
                           {hazardBreakdown.length > 0 ? (
                             <div className="space-y-1.5">
                               {hazardBreakdown.map(([cat, count]) => (
                                 <div key={cat} className="flex justify-between items-center text-xs">
                                   <span className="text-slate-700 dark:text-slate-300 capitalize">{cat}</span>
                                   <span className="font-bold text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{count}</span>
                                 </div>
                               ))}
                             </div>
                           ) : (
                             <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">No active hazards detected on this route.</p>
                           )}
                        </div>

                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-bold tracking-wider mb-1">AI Recommendation</p>
                          <p className="text-xs leading-relaxed text-indigo-900 dark:text-indigo-100 italic">
                            "{routeAnalysis.summary}"
                          </p>
                        </div>

                        {routeAnalysis.hasSaferAlternative && routeAnalysis.saferAlternative && (
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 space-y-2">
                            <h4 className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1 text-xs uppercase tracking-wider">
                              <Navigation2 className="w-3 h-3" /> Recommended Route Available
                            </h4>
                            <p className="text-xs text-emerald-700 dark:text-emerald-300">
                              {routeAnalysis.saferAlternative.reason}
                            </p>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              <div className="bg-white/50 dark:bg-black/20 p-2 rounded text-xs text-center border border-emerald-100/50 dark:border-emerald-800/30">
                                <span className="block text-emerald-600/70 dark:text-emerald-400/70 font-bold uppercase text-[9px] mb-0.5">Dist Diff</span>
                                <span className="font-bold text-emerald-800 dark:text-emerald-300">+{routeAnalysis.saferAlternative.extraDistance}</span>
                              </div>
                              <div className="bg-white/50 dark:bg-black/20 p-2 rounded text-xs text-center border border-emerald-100/50 dark:border-emerald-800/30">
                                <span className="block text-emerald-600/70 dark:text-emerald-400/70 font-bold uppercase text-[9px] mb-0.5">Time Diff</span>
                                <span className="font-bold text-emerald-800 dark:text-emerald-300">+{routeAnalysis.saferAlternative.extraTime}</span>
                              </div>
                              <div className="bg-emerald-100/50 dark:bg-emerald-800/50 p-2 rounded text-xs text-center border border-emerald-200 dark:border-emerald-700">
                                <span className="block text-emerald-700 dark:text-emerald-300 font-bold uppercase text-[9px] mb-0.5">Risk</span>
                                <span className="font-bold text-emerald-900 dark:text-emerald-100 line-clamp-1" title={routeAnalysis.saferAlternative.riskReduction}>
                                  {routeAnalysis.saferAlternative.riskReduction || "Lower Risk"}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
                
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {newHazardNotification && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-500 text-white px-4 py-2 rounded-full shadow-lg font-bold flex items-center gap-2 text-sm"
          >
            ⚠️ New hazard! Updating analysis...
          </motion.div>
        </div>
      )}

      {/* The actual Map Container */}
      <MapContainer 
        center={[51.505, -0.09]} 
        zoom={13} 
        scrollWheelZoom={true} 
        className="w-full h-full absolute inset-0 z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <LocationMarker />
        
        {routePath && routePath.length > 0 && (
          <>
            <Polyline positions={routePath} color="#3b82f6" weight={6} opacity={0.8} />
            
            {routeAnalysis?.hasSaferAlternative && routeAnalysis.saferAlternative && alternativePaths[routeAnalysis.saferAlternative.routeIndex] && (
              <Polyline 
                positions={alternativePaths[routeAnalysis.saferAlternative.routeIndex]} 
                color="#10b981" 
                weight={6} 
                opacity={0.9} 
                dashArray="10, 10" 
              />
            )}

            <MapBoundsUpdater routePath={routePath} />
            
            <Marker position={routePath[0]} icon={L.divIcon({ className: 'bg-transparent', html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#10b981" stroke="white" stroke-width="2" class="w-8 h-8 drop-shadow-md"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4" fill="white"/></svg>`, iconSize: [32, 32], iconAnchor: [16, 16] })}>
              <Popup>Start</Popup>
            </Marker>
            
            <Marker position={routePath[routePath.length - 1]} icon={L.divIcon({ className: 'bg-transparent', html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" stroke="white" stroke-width="2" class="w-8 h-8 drop-shadow-md"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" stroke="white" stroke-width="2"/></svg>`, iconSize: [32, 32], iconAnchor: [16, 16] })}>
              <Popup>Destination</Popup>
            </Marker>
          </>
        )}

        {isNavigating && liveLocation && (
          <Marker 
            position={[liveLocation.lat, liveLocation.lng]} 
            icon={L.divIcon({ 
              className: 'bg-transparent', 
              html: `<div class="w-10 h-10 bg-indigo-500/30 rounded-full flex items-center justify-center animate-pulse"><div class="w-4 h-4 bg-indigo-600 border-2 border-white rounded-full shadow-lg"></div></div>`, 
              iconSize: [40, 40], 
              iconAnchor: [20, 20] 
            })}
            zIndexOffset={1000}
          >
            <Popup>Current Location</Popup>
          </Marker>
        )}
        
        {/* Render all valid reports. If we have a route, use existing map functionality but we also have Hazard Details overlay */}
        {!isLoading && validReports.map(issue => {
          const isOnRoute = routePath ? isPointNearRoute({ lat: issue.location.latitude, lng: issue.location.longitude }, routePath) : false;
          return (
          <Marker 
            key={issue.id} 
            position={[issue.location.latitude, issue.location.longitude]}
            icon={createCustomIcon(issue.status, isOnRoute)}
            zIndexOffset={isOnRoute ? 500 : 0}
          >
            <Popup className="custom-popup">
              <div className="font-sans min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider 
                    ${issue.status === 'pending' ? 'bg-red-100 text-red-800' : 
                      issue.status === 'in_progress' ? 'bg-amber-100 text-amber-800' :
                      issue.status === 'escalated' ? 'bg-purple-100 text-purple-800' :
                      'bg-emerald-100 text-emerald-800'}
                  `}>
                    {issue.status.replace('_', ' ')}
                  </span>
                  {issue.aiDecision?.category && (
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{issue.aiDecision.category}</span>
                  )}
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-2 leading-tight">{issue.title}</h3>
                <Link to={`/reports/${issue.id}`} className="text-blue-600 text-sm font-medium hover:underline block mb-2">
                  View full report &rarr;
                </Link>
                <button 
                  onClick={() => setSelectedHazard(issue)}
                  className="w-full text-center py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-xs font-bold transition-colors"
                >
                  Quick Details
                </button>
              </div>
            </Popup>
          </Marker>
          );
        })}

        {predictedHighRiskAreas.map((area: any) => (
          <Circle
            key={area.id}
            center={[area.lat, area.lng]}
            radius={400}
            pathOptions={{ color: '#8b5cf6', fillColor: '#8b5cf6', fillOpacity: 0.2, weight: 2, dashArray: '5, 5' }}
          >
            <Popup>
              <div className="text-sm font-sans">
                <strong className="text-violet-700 dark:text-violet-400 block mb-1">Predicted High-Risk Zone</strong>
                <p className="text-slate-600 dark:text-slate-300">Based on {area.count} recurring historical reports.</p>
              </div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>

      {/* Route Legend */}
      <div className={`absolute z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 text-xs pointer-events-none transition-all duration-300
        ${isPanelOpen ? 'hidden md:block' : 'block'}
        ${selectedHazard 
          ? 'bottom-4 left-4 right-auto md:bottom-6 md:right-[344px] md:left-auto' 
          : 'bottom-4 right-4 left-auto md:bottom-6 md:right-6 md:left-auto'
        }
      `}>
        <h4 className="font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wider">Route Legend</h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-blue-500 rounded-full"></div>
            <span className="text-slate-600 dark:text-slate-300 font-medium">Selected Route</span>
          </div>
          {routeAnalysis?.hasSaferAlternative && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-emerald-500 rounded-full border border-dashed border-white"></div>
              <span className="text-slate-600 dark:text-slate-300 font-medium">Safer Alternative</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-violet-500/20 border border-violet-500 border-dashed"></div>
            <span className="text-slate-600 dark:text-slate-300 font-medium">Risk Zone</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center">
              <div className="w-1 h-1 bg-white rounded-full"></div>
            </div>
            <span className="text-slate-600 dark:text-slate-300 font-medium">Resolved/Safe</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center">
              <div className="w-1 h-1 bg-white rounded-full"></div>
            </div>
            <span className="text-slate-600 dark:text-slate-300 font-medium">Pending/Hazard</span>
          </div>
        </div>
      </div>

      {/* Hazard side panel */}
      <AnimatePresence>
        {selectedHazard && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-0 right-0 bottom-0 w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-[1001] flex flex-col"
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Hazard Details</h3>
              <button onClick={() => setSelectedHazard(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedHazard.imageUrls && selectedHazard.imageUrls.length > 0 && (
                <img src={selectedHazard.imageUrls[0]} alt="Hazard" className="w-full h-40 object-cover rounded-lg mb-4 border border-slate-200 dark:border-slate-800" />
              )}
              
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded
                    ${selectedHazard.status === 'pending' ? 'bg-red-100 text-red-800' : 
                      selectedHazard.status === 'in_progress' ? 'bg-amber-100 text-amber-800' :
                      selectedHazard.status === 'escalated' ? 'bg-purple-100 text-purple-800' :
                      'bg-emerald-100 text-emerald-800'}
                  `}>
                    {selectedHazard.status.replace('_', ' ')}
                  </span>
                  {selectedHazard.aiDecision?.category && (
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{selectedHazard.aiDecision.category}</span>
                  )}
                  {selectedHazard.aiDecision?.severity && (
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                      selectedHazard.aiDecision.severity === 'critical' ? 'bg-red-100 text-red-700' : 
                      selectedHazard.aiDecision.severity === 'high' ? 'bg-orange-100 text-orange-700' : 
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {selectedHazard.aiDecision.severity} Risk
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-2">{selectedHazard.title}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">{selectedHazard.description}</p>
              </div>
              
              {selectedHazard.aiDecision && selectedHazard.aiDecision.priorityReasoning && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800/50">
                  <p className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-1">AI Analysis</p>
                  <p className="text-sm text-blue-700 dark:text-blue-400 italic">"{selectedHazard.aiDecision.priorityReasoning}"</p>
                </div>
              )}
              
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <p className="text-sm text-slate-500 flex justify-between items-center">
                  Community Verification 
                  <span className="font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{selectedHazard.upvotes || 0} Upvotes</span>
                </p>
                
                <Link 
                  to={`/reports/${selectedHazard.id}`}
                  className="block w-full text-center py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 text-white rounded-lg font-bold transition-colors text-sm"
                >
                  Go to Full Report
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
