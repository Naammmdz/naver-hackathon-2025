import React, { useState, useMemo } from 'react';
import { Plane } from 'lucide-react';
import { useFocusFly } from '../FocusFlyProvider';
import { useTranslation } from 'react-i18next';

interface AirlineTicketProps {
  variant?: 'light' | 'dark';
  onTearTicket?: () => void;
}

export const AirlineTicket: React.FC<AirlineTicketProps> = ({ 
  variant = 'light',
  onTearTicket 
}) => {
  const { session } = useFocusFly();
  const { t } = useTranslation();
  const [isBeingTorn, setIsBeingTorn] = useState(false);
  const [tearOffset, setTearOffset] = useState(0);
  const [startX, setStartX] = useState(0);
  
  // Generate stable flight number and seat (won't change during re-renders)
  const flightNumber = useMemo(() => `FF${Math.floor(Math.random() * 999) + 100}`, []);
  const seat = session?.seat || useMemo(() => 
    `${String.fromCharCode(65 + Math.floor(Math.random() * 6))}${Math.floor(Math.random() * 30) + 1}`, 
    []
  );
  const currentDate = useMemo(() => 
    new Date().toLocaleDateString('en-US', { 
      month: 'short', 
      day: '2-digit', 
      year: 'numeric' 
    }).toLowerCase().replace(/,/g, '-').replace(/ /g, '-'),
    []
  );
  
  const duration = session?.durationMin ? `${session.durationMin} ${t('focusFly.timeSelection.minutes')}` : `25 ${t('focusFly.timeSelection.minutes')}`;

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsBeingTorn(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isBeingTorn) return;
    
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - startX;
    
    // Only allow rightward swiping
    if (deltaX > 0) {
      setTearOffset(Math.min(deltaX, 100)); // Max tear distance
    }
  };

  const handleTouchEnd = () => {
    if (tearOffset > 50) { // Threshold for successful tear
      // Complete the tear animation
      setTearOffset(200);
      setTimeout(() => {
        onTearTicket?.();
      }, 500);
    } else {
      // Snap back to original position
      setTearOffset(0);
    }
    setIsBeingTorn(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setStartX(e.clientX);
    setIsBeingTorn(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isBeingTorn) return;
    
    const currentX = e.clientX;
    const deltaX = currentX - startX;
    
    // Only allow rightward dragging
    if (deltaX > 0) {
      setTearOffset(Math.min(deltaX, 100));
    }
  };

  const handleMouseUp = () => {
    if (tearOffset > 50) {
      setTearOffset(200);
      setTimeout(() => {
        onTearTicket?.();
      }, 500);
    } else {
      setTearOffset(0);
    }
    setIsBeingTorn(false);
  };

  return (
    <div 
      className={`inline-block max-w-80 w-full text-left uppercase cursor-pointer transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-2xl font-light rounded-lg overflow-hidden shadow-lg ${
        variant === 'dark' 
          ? 'bg-gray-800 text-white' 
          : 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white'
      }`}
    >
      {/* Ticket Head */}
      <div className="relative h-35 bg-gradient-to-br from-green-600 via-green-700 to-green-800 text-white flex items-center justify-center rounded-t-lg">
        <div className="absolute inset-0 bg-black bg-opacity-10 rounded-t-lg"></div>
        <div className="relative z-10 text-2xl font-semibold flex items-center gap-5">
          <span>NYC</span>
          <Plane className="w-6 h-6 transform rotate-90 opacity-90" />
          <span>LAX</span>
        </div>
      </div>
      
      {/* Ticket Body */}
      <div className={`relative px-8 py-5 border-b border-dashed ${variant === 'dark' ? 'border-gray-600' : 'border-gray-400 dark:border-gray-600'}`}>
        {/* Side circles */}
        <div className="absolute -left-2.5 top-full w-5 h-4 bg-background rounded-full transform -translate-y-1/2"></div>
        <div className="absolute -right-2.5 top-full w-5 h-4 bg-background rounded-full transform -translate-y-1/2"></div>
        
        <div className="passenger mb-5">
          <p className="text-gray-500 dark:text-gray-400 text-xs m-0">{t('focusFly.ticket.passenger').toUpperCase()}</p>
          <h4 className="text-base font-semibold mt-1 m-0">{t('focusFly.ticket.focusFlyer').toUpperCase()}</h4>
        </div>
        
        <div className="flex gap-10 mt-5">
          <div className="flight-detail">
            <p className="text-gray-500 dark:text-gray-400 text-xs m-0">{t('focusFly.ticket.flight').toUpperCase()}</p>
            <h4 className="text-base font-semibold mt-1 m-0">{flightNumber}</h4>
          </div>
          <div className="flight-detail">
            <p className="text-gray-500 dark:text-gray-400 text-xs m-0">{t('focusFly.ticket.seat').toUpperCase()}</p>
            <h4 className="text-base font-semibold mt-1 m-0">{seat}</h4>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-5">
          {currentDate} - {t('focusFly.ticket.focusSession')} ({duration})
        </div>
        
        {/* Barcode */}
        <div className="mt-5 h-8 w-45 opacity-60 bg-gradient-to-r from-current via-transparent to-current bg-no-repeat" 
             style={{
               backgroundImage: `repeating-linear-gradient(to right, currentColor 0px, currentColor 1px, transparent 1px, transparent 3px, currentColor 3px, currentColor 4px, transparent 4px, transparent 7px)`
             }}>
        </div>
      </div>
      
      {/* Tearable Bottom Section */}
      <div 
        className={`px-8 py-5 transition-transform duration-300 ease-out select-none ${
          tearOffset > 50 ? 'opacity-70' : ''
        }`}
        style={{
          transform: `translateX(${tearOffset}px) rotate(${tearOffset / 20}deg)`,
          transformOrigin: 'left center'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={isBeingTorn ? handleMouseMove : undefined}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Tear line indicator */}
        {tearOffset > 0 && (
          <div className="absolute top-0 left-0 bottom-0 w-px bg-red-400 opacity-50"></div>
        )}
        
        <div className="text-gray-500 dark:text-gray-400 text-sm italic leading-relaxed normal-case">
          {tearOffset === 0 ? (
            <>
              <span className="block text-center mb-2">✂️ {t('focusFly.ticket.swipeRight')}</span>
              <span className="block text-xs text-center">{t('focusFly.ticket.dragInstruction')}</span>
            </>
          ) : tearOffset < 50 ? (
            <span className="block text-center">{t('focusFly.ticket.keepSwiping')}</span>
          ) : (
            <span className="block text-center">{t('focusFly.ticket.releaseToStart')} ✈️</span>
          )}
        </div>
      </div>
    </div>
  );
};
