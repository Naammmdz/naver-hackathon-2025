import React, { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, Marker, Line } from 'react-simple-maps';
import { useTranslation } from 'react-i18next';

interface SimpleFlightMapProps {
  progress: number;
  isRunning?: boolean;
  hasStarted?: boolean;
  isShowingTicket?: boolean;
  isTicketTorn?: boolean;
}

// OpenStreetMap-based geography data sources
const geoUrls = [
  "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson",
  "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json",
  "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"
];

// Random major cities and airports worldwide for international flights
const majorCities = [
  { name: "New York", code: "JFK", coordinates: [-74.006, 40.7128] as [number, number], country: "USA" },
  { name: "London", code: "LHR", coordinates: [-0.1276, 51.5074] as [number, number], country: "UK" },
  { name: "Tokyo", code: "NRT", coordinates: [139.6917, 35.6895] as [number, number], country: "Japan" },
  { name: "Paris", code: "CDG", coordinates: [2.3522, 48.8566] as [number, number], country: "France" },
  { name: "Dubai", code: "DXB", coordinates: [55.2708, 25.2048] as [number, number], country: "UAE" },
  { name: "Singapore", code: "SIN", coordinates: [103.8198, 1.3521] as [number, number], country: "Singapore" },
  { name: "Sydney", code: "SYD", coordinates: [151.2093, -33.8688] as [number, number], country: "Australia" },
  { name: "Frankfurt", code: "FRA", coordinates: [8.6821, 50.1109] as [number, number], country: "Germany" },
  { name: "Hong Kong", code: "HKG", coordinates: [114.1694, 22.3193] as [number, number], country: "Hong Kong" },
  { name: "Amsterdam", code: "AMS", coordinates: [4.9041, 52.3676] as [number, number], country: "Netherlands" },
  { name: "Los Angeles", code: "LAX", coordinates: [-118.2437, 34.0522] as [number, number], country: "USA" },
  { name: "Istanbul", code: "IST", coordinates: [28.9784, 41.0082] as [number, number], country: "Turkey" },
  { name: "Bangkok", code: "BKK", coordinates: [100.5018, 13.7563] as [number, number], country: "Thailand" },
  { name: "Moscow", code: "SVO", coordinates: [37.6173, 55.7558] as [number, number], country: "Russia" },
  { name: "São Paulo", code: "GRU", coordinates: [-46.6333, -23.5505] as [number, number], country: "Brazil" },
  { name: "Mumbai", code: "BOM", coordinates: [72.8777, 19.0760] as [number, number], country: "India" },
  { name: "Cairo", code: "CAI", coordinates: [31.2357, 30.0444] as [number, number], country: "Egypt" },
  { name: "Beijing", code: "PEK", coordinates: [116.4074, 39.9042] as [number, number], country: "China" },
  { name: "Seoul", code: "ICN", coordinates: [126.9780, 37.5665] as [number, number], country: "South Korea" },
  { name: "Mexico City", code: "MEX", coordinates: [-99.1332, 19.4326] as [number, number], country: "Mexico" }
];

export const SimpleFlightMap: React.FC<SimpleFlightMapProps> = ({ 
  progress, 
  isRunning = true, 
  hasStarted = true, 
  isShowingTicket = false, 
  isTicketTorn = false 
}) => {
  const { t } = useTranslation();
  const [geoUrl, setGeoUrl] = useState(geoUrls[0]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  // Generate random flight route on component mount
  const { origin, destination } = useMemo(() => {
    // Ensure we get different cities
    const shuffled = [...majorCities].sort(() => Math.random() - 0.5);
    const originCity = shuffled[0];
    const destinationCity = shuffled[1];
    
    return {
      origin: originCity,
      destination: destinationCity
    };
  }, []); // Empty dependency array means this only runs once per component mount

  // Calculate airplane position based on progress - follow the exact flight path
  const airplanePosition: [number, number] = useMemo(() => {
    // Simple linear interpolation along the exact flight path
    const baseX = origin.coordinates[0] + (destination.coordinates[0] - origin.coordinates[0]) * progress;
    const baseY = origin.coordinates[1] + (destination.coordinates[1] - origin.coordinates[1]) * progress;
    
    // Add very subtle turbulence effect (much smaller)
    const turbulenceX = Math.sin(progress * Math.PI * 4) * 0.05; // Reduced from 0.2
    const turbulenceY = Math.cos(progress * Math.PI * 3) * 0.03; // Reduced from 0.15
    
    return [baseX + turbulenceX, baseY + turbulenceY];
  }, [progress, origin, destination]);

  // Calculate airplane rotation based on flight direction
  const airplaneRotation = useMemo(() => {
    const dx = destination.coordinates[0] - origin.coordinates[0];
    const dy = destination.coordinates[1] - origin.coordinates[1];
    // Calculate angle where airplane points toward destination
    // Since your icon is vertical (pointing up), we don't need to add 90°
    const angle = Math.atan2(dx, -dy) * (180 / Math.PI);
    return angle;
  }, [origin, destination]);

  // Calculate flight distance for display (more accurate for international flights)
  const flightDistance = useMemo(() => {
    const lat1 = origin.coordinates[1] * Math.PI / 180;
    const lat2 = destination.coordinates[1] * Math.PI / 180;
    const deltaLat = (destination.coordinates[1] - origin.coordinates[1]) * Math.PI / 180;
    const deltaLng = (destination.coordinates[0] - origin.coordinates[0]) * Math.PI / 180;

    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = 6371 * c; // Earth's radius in kilometers
    
    return Math.round(distance);
  }, [origin, destination]);

  // Handle map loading errors and try fallbacks
  const handleMapError = () => {
    const currentIndex = geoUrls.indexOf(geoUrl);
    if (currentIndex < geoUrls.length - 1) {
      setGeoUrl(geoUrls[currentIndex + 1]);
      setMapError(false);
    } else {
      setMapError(true);
    }
  };

  return (
    <div className="w-full h-80 bg-slate-100 rounded-lg overflow-hidden border relative">
      {/* OpenStreetMap-style background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23059669' fill-opacity='0.1'%3E%3Cpath d='M30 30c0-1.7-1.3-3-3-3s-3 1.3-3 3 1.3 3 3 3 3-1.3 3-3zM15 15c0-.6-.4-1-1-1s-1 .4-1 1 .4 1 1 1 1-.4 1-1zM45 45c0-.6-.4-1-1-1s-1 .4-1 1 .4 1 1 1 1-.4 1-1z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          center: [0, 20],
          scale: 120,
        }}
        width={800}
        height={400}
        className="w-full h-full"
      >
        <Geographies 
          geography={geoUrl}
          onError={handleMapError}
        >
          {({ geographies }) => {
            // Set map as loaded when geographies are available
            if (geographies.length > 0 && !mapLoaded) {
              setMapLoaded(true);
            }
            
            return geographies
              .filter((geo) => {
                // Show all countries for world map
                return geo.properties?.TYPE !== 'Dependency' && geo.properties?.TYPE !== 'Lease';
              })
              .map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#e8f5e8"
                  stroke="#059669"
                  strokeWidth={0.5}
                  style={{
                    default: {
                      fill: "#e8f5e8",
                      stroke: "#059669",
                      strokeWidth: 0.5,
                      outline: "none"
                    },
                    hover: {
                      fill: "#d1fae5",
                      stroke: "#047857",
                      strokeWidth: 0.8,
                      outline: "none"
                    },
                    pressed: {
                      fill: "#e8f5e8",
                      outline: "none"
                    }
                  }}
                />
              ));
          }}
        </Geographies>

        {/* Flight Path with Airplane Icon - Visual flight line (completed route) */}
        {hasStarted && progress > 0 && (
          <Line
            from={origin.coordinates}
            to={airplanePosition}
            stroke="#10b981"
            strokeWidth={3}
            opacity={0.8}
            strokeLinecap="round"
          />
        )}

        {/* Origin Marker */}
        <Marker coordinates={origin.coordinates}>
          <g>
            <circle r={12} fill="#10b981" stroke="#fff" strokeWidth={4} />
            <circle r={5} fill="#fff" opacity={0.9} />
            <text
              textAnchor="middle"
              y={-20}
              style={{ 
                fontFamily: "system-ui", 
                fill: "#1f2937", 
                fontSize: "12px", 
                fontWeight: "800",
                textShadow: "2px 2px 4px rgba(255,255,255,0.9)"
              }}
            >
              {origin.code}
            </text>
            <text
              textAnchor="middle"
              y={-8}
              style={{ 
                fontFamily: "system-ui", 
                fill: "#374151", 
                fontSize: "9px", 
                fontWeight: "600",
                textShadow: "1px 1px 2px rgba(255,255,255,0.8)"
              }}
            >
              {origin.name}
            </text>
            <text
              textAnchor="middle"
              y={4}
              style={{ 
                fontFamily: "system-ui", 
                fill: "#6b7280", 
                fontSize: "8px", 
                fontWeight: "500",
                textShadow: "1px 1px 2px rgba(255,255,255,0.8)"
              }}
            >
              {origin.country}
            </text>
          </g>
        </Marker>

        {/* Destination Marker */}
        <Marker coordinates={destination.coordinates}>
          <g>
            <circle r={12} fill="#ef4444" stroke="#fff" strokeWidth={4} />
            <circle r={5} fill="#fff" opacity={0.9} />
            <text
              textAnchor="middle"
              y={-20}
              style={{ 
                fontFamily: "system-ui", 
                fill: "#1f2937", 
                fontSize: "12px", 
                fontWeight: "800",
                textShadow: "2px 2px 4px rgba(255,255,255,0.9)"
              }}
            >
              {destination.code}
            </text>
            <text
              textAnchor="middle"
              y={-8}
              style={{ 
                fontFamily: "system-ui", 
                fill: "#374151", 
                fontSize: "9px", 
                fontWeight: "600",
                textShadow: "1px 1px 2px rgba(255,255,255,0.8)"
              }}
            >
              {destination.name}
            </text>
            <text
              textAnchor="middle"
              y={4}
              style={{ 
                fontFamily: "system-ui", 
                fill: "#6b7280", 
                fontSize: "8px", 
                fontWeight: "500",
                textShadow: "1px 1px 2px rgba(255,255,255,0.8)"
              }}
            >
              {destination.country}
            </text>
          </g>
        </Marker>

        {/* Airplane Marker with turbulence - only show if flight has started */}
        {hasStarted && progress > 0 && progress <= 1 && (
          <Marker coordinates={airplanePosition}>
            <g transform={`translate(-16, -16) rotate(${airplaneRotation} 16 16)`}>
              {/* Airplane Shadow */}
              <image
                x="1"
                y="1"
                width="30"
                height="30"
                href="/src/assets/icons/airplane-icon-png-2503.png"
                opacity="0.3"
              />
              {/* Main Airplane Icon */}
              <image
                x="0"
                y="0"
                width="32"
                height="32"
                href="/src/assets/icons/airplane-icon-png-2503.png"
                style={{ filter: 'hue-rotate(200deg) saturate(1.5)' }}
              />
              
              {/* Dynamic Contrail with turbulence - only if flying */}
              {progress > 0.1 && isRunning && (
                <line
                  x1="16"
                  y1="32"
                  x2="16"
                  y2={32 + (progress * 30 + Math.sin(progress * 10) * 6)}
                  stroke="#e0f2fe"
                  strokeWidth="2"
                  opacity={Math.max(0.2, 0.5 - progress * 0.3)}
                  strokeLinecap="round"
                />
              )}
            </g>
          </Marker>
        )}

        {/* Airplane at origin (waiting) - show if flight hasn't started yet or showing ticket */}
        {(!hasStarted || isShowingTicket) && (
          <Marker coordinates={origin.coordinates}>
            <g transform="translate(-16, -16)">
              {/* Airplane Icon from assets */}
              <image
                x="0"
                y="0"
                width="32"
                height="32"
                href="/src/assets/icons/airplane-icon-png-2503.png"
                opacity={isShowingTicket ? 0.9 : 0.6}
                style={{ 
                  filter: isShowingTicket 
                    ? 'hue-rotate(45deg) saturate(1.5)' 
                    : 'grayscale(0.5) opacity(0.8)'
                }}
              />
              
              {/* Ticket indicator */}
              {isShowingTicket && (
                <text
                  x="16"
                  y="-5"
                  textAnchor="middle"
                  style={{ 
                    fontFamily: "system-ui", 
                    fill: "#111111", 
                    fontSize: "14px", 
                    fontWeight: "900",
                    textShadow: "2px 2px 4px rgba(255,255,255,0.9)"
                  }}
                >
                  🎫
                </text>
              )}
            </g>
          </Marker>
        )}
      </ComposableMap>

      {/* Loading indicator */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/90">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
            <div className="text-sm text-foreground font-medium">{t('focusFly.map.loadingRoute')}</div>
            <div className="text-xs text-muted-foreground mt-1">Powered by OSM</div>
          </div>
        </div>
      )}

      {/* Error fallback */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
          <div className="text-center p-6">
            <div className="text-gray-600 mb-2">📍 Map temporarily unavailable</div>
            <div className="text-sm text-gray-500">Using OpenStreetMap fallback</div>
          </div>
        </div>
      )}

      {/* Compact Flight Info Panel */}
      <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur-sm rounded-md p-2 shadow-md border border-border text-xs">
        <div className="flex items-center gap-1 mb-1">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          <div className="text-xs font-medium text-foreground">Flight Info</div>
        </div>
        <div className="w-24 h-1 bg-muted rounded-full overflow-hidden mb-2">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground space-y-0.5">
          <div className="flex justify-between">
            <span>{origin.code}</span>
            <span>→</span>
            <span>{destination.code}</span>
          </div>
          <div className="flex justify-between">
            <span>{Math.round(progress * 100)}%</span>
            <span>{flightDistance}km</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t('focusFly.map.status')}:</span>
            <div className="flex items-center gap-1">
              {isShowingTicket ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div>
                  <span className="font-medium text-accent-foreground text-xs">Ready</span>
                </>
              ) : !hasStarted ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-muted"></div>
                  <span className="font-medium text-foreground text-xs">Wait</span>
                </>
              ) : !isRunning ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive"></div>
                  <span className="font-medium text-destructive text-xs">Pause</span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                  <span className="font-medium text-primary text-xs">Flying</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* OpenStreetMap Attribution */}
      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-card/90 px-2 py-1 rounded border border-border">
        <a 
          href="https://www.openstreetmap.org/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-primary"
        >
          © OpenStreetMap
        </a>
      </div>
    </div>
  );
};
