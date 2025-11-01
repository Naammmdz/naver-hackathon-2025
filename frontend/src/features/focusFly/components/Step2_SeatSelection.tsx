import { useFocusFly } from "../FocusFlyProvider";
import { Button } from "@/components/ui/button";
import { Plane } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from 'react-i18next';

export const Step2_SeatSelection = () => {
    const { checkIn, session, selectSeat } = useFocusFly();
    const { t } = useTranslation();

    // Generate stable occupied seats that won't change during re-renders
    const occupiedSeats = useMemo(() => {
        const occupied = new Set<string>();
        const allSeats = [];
        
        // Generate all possible seat IDs
        for (let row = 1; row <= 12; row++) {
            for (const letter of ['A', 'B', 'C', 'D', 'E', 'F']) {
                allSeats.push(`${row}${letter}`);
            }
        }
        
        // Randomly select about 40% of seats to be occupied
        const numOccupied = Math.floor(allSeats.length * 0.4);
        const shuffled = allSeats.sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < numOccupied; i++) {
            occupied.add(shuffled[i]);
        }
        
        return occupied;
    }, []); // Empty dependency array means this only runs once

    return (
        <div className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
                <Plane className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold">{t('focusFly.seatSelection.title')}</h2>
            </div>
            <p className="text-muted-foreground mb-8">
                {t('focusFly.seatSelection.subtitle')}
            </p>

            {/* Airplane Layout - Top View */}
            <div className="relative mx-auto" style={{ width: '280px' }}>
                {/* Airplane Body - Original Size (Not Elongated) */}
                <div className="relative bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg border-2 border-gray-300 dark:border-gray-500" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
                    
                    
                    {/* Main Cabin Area with Seats */}
                    <div className="px-8 py-4">
                        {/* Seat Rows - Back to Original 12 Rows */}
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(row => (
                            <div key={row} className="flex justify-between items-center mb-2">
                                {/* Left Side - 3 Seats (A, B, C) */}
                                <div className="flex gap-1">
                                    {['A', 'B', 'C'].map(letter => {
                                        const seatId = `${row}${letter}`;
                                        const isOccupied = occupiedSeats.has(seatId);
                                        const isSelected = session?.seat === seatId;
                                        
                                        return (
                                            <div
                                                key={seatId}
                                                className={`w-6 h-6 rounded-t-lg cursor-pointer transition-all ${
                                                    isSelected 
                                                        ? 'bg-primary text-primary-foreground shadow-lg scale-110' 
                                                        : isOccupied 
                                                        ? 'bg-accent text-accent-foreground' 
                                                        : 'bg-muted dark:bg-muted hover:bg-primary/40'
                                                }`}
                                                onClick={() => !isOccupied && selectSeat(seatId)}
                                                title={`${t('focusFly.seatSelection.seat')} ${seatId} ${isOccupied ? `(${t('focusFly.seatSelection.occupied')})` : `(${t('focusFly.seatSelection.available')})`}`}
                                            >
                                                {/* Seat back */}
                                                <div className={`w-full h-1 ${
                                                    isSelected 
                                                        ? 'bg-primary-dark' 
                                                        : isOccupied 
                                                        ? 'bg-accent' 
                                                        : 'bg-muted'
                                                } rounded-t-lg`}></div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Aisle Space */}
                                <div className="w-8 flex justify-center">
                                    <div className="text-xs text-gray-500 font-mono">{row}</div>
                                </div>

                                {/* Right Side - 3 Seats (D, E, F) */}
                                <div className="flex gap-1">
                                    {['D', 'E', 'F'].map(letter => {
                                        const seatId = `${row}${letter}`;
                                        const isOccupied = occupiedSeats.has(seatId);
                                        const isSelected = session?.seat === seatId;
                                        
                                        return (
                                            <div
                                                key={seatId}
                                                className={`w-6 h-6 rounded-t-lg cursor-pointer transition-all ${
                                                    isSelected 
                                                        ? 'bg-primary text-primary-foreground shadow-lg scale-110' 
                                                        : isOccupied 
                                                        ? 'bg-accent text-accent-foreground' 
                                                        : 'bg-muted dark:bg-muted hover:bg-primary/40'
                                                }`}
                                                onClick={() => !isOccupied && selectSeat(seatId)}
                                                title={`${t('focusFly.seatSelection.seat')} ${seatId} ${isOccupied ? `(${t('focusFly.seatSelection.occupied')})` : `(${t('focusFly.seatSelection.available')})`}`}
                                            >
                                                {/* Seat back */}
                                                <div className={`w-full h-1 ${
                                                    isSelected 
                                                        ? 'bg-primary-dark' 
                                                        : isOccupied 
                                                        ? 'bg-accent' 
                                                        : 'bg-muted'
                                                } rounded-t-lg`}></div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="absolute top-1/2 -left-44 w-44 h-72 bg-gray-300 dark:bg-gray-600 shadow-lg transform -translate-y-1/2" style={{
                    clipPath: 'polygon(100% 65%, 20% 65%, 35% 35%, 100% 15%)'
                }}></div>
                <div className="absolute top-1/2 -right-44 w-44 h-72 bg-gray-300 dark:bg-gray-600 shadow-lg transform -translate-y-1/2" style={{
                    clipPath: 'polygon(0% 65%, 80% 65%, 65% 35%, 0% 15%)'
                }}></div>
            </div>

            {/* Legend */}
            <div className="mt-6 flex justify-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-muted rounded-t-lg"></div>
                    <span>Available</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-accent rounded-t-lg"></div>
                    <span>Occupied</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-primary rounded-t-lg"></div>
                    <span>Selected</span>
                </div>
            </div>

            <Button onClick={checkIn} className="w-full h-10 text-base mt-6" disabled={!session?.seat}>
                Check-in and Start Flight
            </Button>
        </div>
    );
};
