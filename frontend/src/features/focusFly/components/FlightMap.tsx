import React from 'react';
import { motion } from 'framer-motion';
import { Plane } from 'lucide-react';

interface FlightMapProps {
  progress: number; // 0 to 1
  origin: string;
  destination: string;
}

export const FlightMap: React.FC<FlightMapProps> = ({ progress, origin, destination }) => {
  // SVG path for curved route
  const pathD = "M 50 150 Q 200 50 350 150";
  
  // Calculate airplane position and rotation along the path
  const getPointAtProgress = (progress: number) => {
    // Cubic bezier approximation for the curved path
    const t = Math.max(0, Math.min(1, progress));
    
    // Control points for the curve
    const startX = 50, startY = 150;
    const controlX = 200, controlY = 50;
    const endX = 350, endY = 150;
    
    // Quadratic bezier formula
    const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * endX;
    const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * endY;
    
    // Calculate rotation based on tangent
    const tangentT = Math.max(0.01, Math.min(0.99, t));
    const dx = 2 * (1 - tangentT) * (controlX - startX) + 2 * tangentT * (endX - controlX);
    const dy = 2 * (1 - tangentT) * (controlY - startY) + 2 * tangentT * (endY - controlY);
    const rotation = Math.atan2(dy, dx) * (180 / Math.PI);
    
    return { x, y, rotation };
  };

  const airplanePos = getPointAtProgress(progress);

  return (
    <div className="relative w-full max-w-md mx-auto bg-gradient-to-b from-secondary to-muted dark:from-secondary dark:to-muted rounded-lg p-6 border border-border dark:border-border">
      {/* Map Header */}
      <div className="flex justify-between items-center mb-4 text-sm font-semibold">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary rounded-full"></div>
          <span className="text-primary">{origin}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-destructive">{destination}</span>
          <div className="w-3 h-3 bg-destructive rounded-full"></div>
        </div>
      </div>

      {/* Flight Route SVG */}
      <div className="relative">
        <svg
          viewBox="0 0 400 200"
          className="w-full h-32"
          style={{ overflow: 'visible' }}
        >
          {/* Dotted route path */}
          <path
            d={pathD}
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="8 4"
            fill="none"
            className="text-accent"
            opacity="0.7"
          />
          
          {/* Origin marker */}
          <circle
            cx="50"
            cy="150"
            r="8"
            fill="currentColor"
            className="text-primary"
          />
          
          {/* Destination marker */}
          <circle
            cx="350"
            cy="150"
            r="8"
            fill="currentColor"
            className="text-destructive"
          />

          {/* Animated airplane */}
          <motion.g
            animate={{
              x: airplanePos.x,
              y: airplanePos.y,
              rotate: airplanePos.rotation,
            }}
            transition={{
              type: "tween",
              ease: "linear",
              duration: 0.5,
            }}
            style={{
              transformOrigin: "0 0",
            }}
          >
            <g transform="translate(-12, -8)">
              {/* Airplane shadow */}
              <g transform="translate(2, 2)" opacity="0.3">
                <path
                  d="M2 8 L10 6 L18 4 L22 6 L18 8 L22 10 L18 12 L10 10 L2 8 Z"
                  fill="currentColor"
                  className="text-gray-600"
                />
              </g>
              
              {/* Airplane body */}
              <path
                d="M2 8 L10 6 L18 4 L22 6 L18 8 L22 10 L18 12 L10 10 L2 8 Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1"
                className="text-primary"
              />
              
              {/* Airplane details */}
              <circle
                cx="18"
                cy="8"
                r="1"
                fill="currentColor"
                className="text-foreground"
              />
            </g>
          </motion.g>
        </svg>
      </div>

      {/* Progress indicator */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Flight Progress</span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
        <div className="w-full bg-muted dark:bg-muted rounded-full h-2">
          <motion.div
            className="bg-primary h-2 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Flight info */}
      <div className="mt-3 flex justify-between text-xs text-muted-foreground">
        <span>Altitude: 35,000 ft</span>
        <span>Speed: 550 mph</span>
      </div>
    </div>
  );
};
