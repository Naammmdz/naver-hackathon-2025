import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

interface GoogleFlightMapProps {
  progress: number; // 0 to 1
  apiKey?: string;
}

export const GoogleFlightMap: React.FC<GoogleFlightMapProps> = ({ 
  progress, 
  apiKey = "YOUR_GOOGLE_MAPS_API_KEY" // Replace with your actual API key
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [flightPath, setFlightPath] = useState<any>(null);
  const [airplaneMarker, setAirplaneMarker] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Flight route coordinates (New York to Los Angeles as example)
  const origin = { lat: 40.7128, lng: -74.0060 }; // New York
  const destination = { lat: 34.0522, lng: -118.2437 }; // Los Angeles
  
  // Calculate intermediate points for smooth curved flight path
  const getFlightPath = (): { lat: number; lng: number }[] => {
    const path: { lat: number; lng: number }[] = [];
    const steps = 100;
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      
      // Create a curved path (great circle route approximation)
      const midLat = (origin.lat + destination.lat) / 2 + Math.sin(t * Math.PI) * 5; // Add curve
      const lat = origin.lat + (destination.lat - origin.lat) * t + Math.sin(t * Math.PI) * 2;
      const lng = origin.lng + (destination.lng - origin.lng) * t;
      
      path.push({ lat, lng });
    }
    
    return path;
  };

  // Load Google Maps API
  useEffect(() => {
    if (window.google) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    
    window.initGoogleMaps = () => {
      setIsLoaded(true);
    };
    
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [apiKey]);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || map) return;

    const googleMap = new window.google.maps.Map(mapRef.current, {
      center: { lat: 37.4, lng: -96 }, // Center of US
      zoom: 4,
      mapTypeId: 'terrain',
      styles: [
        {
          featureType: 'all',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        },
        {
          featureType: 'administrative',
          elementType: 'geometry',
          stylers: [{ visibility: 'off' }]
        }
      ],
      disableDefaultUI: true,
      gestureHandling: 'none',
      zoomControl: false,
    });

    setMap(googleMap);

    // Create flight path polyline
    const pathCoordinates = getFlightPath();
    const flightPathLine = new window.google.maps.Polyline({
      path: pathCoordinates,
      geodesic: true,
      strokeColor: '#3B82F6',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      strokeStyle: 'dashed',
    });

    flightPathLine.setMap(googleMap);
    setFlightPath(pathCoordinates);

    // Create origin marker
    new window.google.maps.Marker({
      position: origin,
      map: googleMap,
      title: 'Focus Start',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#10B981',
        fillOpacity: 1,
        strokeColor: '#059669',
        strokeWeight: 2,
      },
    });

    // Create destination marker
    new window.google.maps.Marker({
      position: destination,
      map: googleMap,
      title: 'Task Complete',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#EF4444',
        fillOpacity: 1,
        strokeColor: '#DC2626',
        strokeWeight: 2,
      },
    });

    // Create airplane marker
    const airplane = new window.google.maps.Marker({
      position: origin,
      map: googleMap,
      title: 'Your Focus Flight',
      icon: {
        path: 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6L8,14H16L12,6Z',
        fillColor: '#1D4ED8',
        fillOpacity: 1,
        strokeColor: '#1E40AF',
        strokeWeight: 1,
        scale: 1.5,
        anchor: new window.google.maps.Point(12, 12),
      },
    });

    setAirplaneMarker(airplane);
  }, [isLoaded, map]);

  // Update airplane position based on progress
  useEffect(() => {
    if (!airplaneMarker || !flightPath) return;

    const currentIndex = Math.floor(progress * (flightPath.length - 1));
    const currentPosition = flightPath[currentIndex];

    if (currentPosition) {
      airplaneMarker.setPosition(currentPosition);
      
      // Calculate rotation based on next position
      if (currentIndex < flightPath.length - 1) {
        const nextPosition = flightPath[currentIndex + 1];
        const heading = window.google.maps.geometry.spherical.computeHeading(
          currentPosition,
          nextPosition
        );
        
        const rotatedIcon = {
          ...airplaneMarker.getIcon(),
          rotation: heading,
        };
        airplaneMarker.setIcon(rotatedIcon);
      }
    }
  }, [progress, airplaneMarker, flightPath]);

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="w-full h-64 rounded-lg border border-gray-300 dark:border-gray-600 shadow-lg"
        style={{ minHeight: '250px' }}
      />
      
      {/* Loading overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading flight map...</p>
          </div>
        </div>
      )}

      {/* Flight Info Overlay */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
          <div className="font-semibold text-green-600 dark:text-green-400">Origin</div>
          <div className="text-muted-foreground">Focus Start</div>
          <div className="text-xs text-muted-foreground">New York, NY</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
          <div className="font-semibold text-red-600 dark:text-red-400">Destination</div>
          <div className="text-muted-foreground">Task Complete</div>
          <div className="text-xs text-muted-foreground">Los Angeles, CA</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-semibold">Flight Progress</span>
          <span className="text-blue-600 dark:text-blue-400">{Math.round(progress * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <motion.div
            className="bg-blue-500 h-2 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Altitude: 35,000 ft</span>
          <span>Speed: 550 mph</span>
          <span>ETA: {Math.round((1 - progress) * 25)} min</span>
        </div>
      </div>
    </div>
  );
};
