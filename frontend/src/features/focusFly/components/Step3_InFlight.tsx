import { useFocusFly } from "../FocusFlyProvider";
import { useFocusTimer } from "../hooks/useFocusTimer";
import { Button } from "@/components/ui/button";
import { Pause, Play, Plus } from "lucide-react";
import { SimpleFlightMap } from "./SimpleFlightMap";
import { useTranslation } from 'react-i18next';

export const Step3_InFlight = () => {
    const { session, pause, resume, extend, endFlight } = useFocusFly();
    const { t } = useTranslation();
    const timerDisplay = useFocusTimer();

    // Calculate flight progress based on remaining time - only if timer has actually started
    const totalTime = (session?.durationMin || 25) * 60 * 1000; // Total time in ms
    const remainingTime = session?.remainingMs || totalTime;
    
    // Check different states
    const hasStarted = Boolean(session?.startedAt);
    const isCurrentlyRunning = Boolean(session?.isRunning);
    
    let progress = 0;
    if (hasStarted) {
        // Calculate actual progress based on elapsed time
        progress = Math.max(0, Math.min(1, (totalTime - remainingTime) / totalTime));
    }
    // If timer hasn't started yet, progress stays at 0 (airplane waits at origin)

    return (
        <div className="p-4 text-center bg-background max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-4">{t('focusFly.inFlight.title')}</h2>

            {/* Simple Flight Map */}
            <div className="mb-4 relative">
                <SimpleFlightMap 
                    progress={progress} 
                    isRunning={isCurrentlyRunning}
                    hasStarted={hasStarted}
                    isShowingTicket={false}
                    isTicketTorn={false}
                />
            </div>

            {/* Timer Display */}
            <div className="my-4">
                <p className="text-4xl font-bold font-mono tracking-tighter">{timerDisplay}</p>
                <p className="text-muted-foreground text-sm">
                    {t('focusFly.inFlight.seatInfo')} {session?.seat} • {t('focusFly.inFlight.flightInProgress')}
                </p>
            </div>

            <div className="flex justify-center gap-2 mb-4">
                {session?.isRunning ? (
                    <Button onClick={pause} variant="outline" size="icon" className="w-16 h-16 rounded-full">
                        <Pause className="w-8 h-8" />
                    </Button>
                ) : (
                    <Button onClick={resume} variant="outline" size="icon" className="w-16 h-16 rounded-full">
                        <Play className="w-8 h-8" />
                    </Button>
                )}
                <Button onClick={() => extend(5)} variant="outline" size="icon" className="w-16 h-16 rounded-full">
                    <Plus className="w-8 h-8" />
                    <span className="text-xs">5m</span>
                </Button>
            </div>

            <Button onClick={() => endFlight(false)} className="w-full h-12 text-lg">
                {t('focusFly.inFlight.endFlight')}
            </Button>
        </div>
    );
};
