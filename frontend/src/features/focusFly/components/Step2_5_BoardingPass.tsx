import { useFocusFly } from "../FocusFlyProvider";
import { AirlineTicket } from "./AirlineTicket";
import { Plane } from "lucide-react";
import { useTranslation } from 'react-i18next';

export const Step2_5_BoardingPass = () => {
    const { session, tearTicketAndStartFlight } = useFocusFly();
    const { t } = useTranslation();

    return (
        <div className="p-6 text-center bg-background max-w-lg mx-auto">
            <div className="flex items-center justify-center gap-2 mb-2">
                <Plane className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold">{t('focusFly.boardingPass.title')}</h2>
            </div>
            <p className="text-muted-foreground mb-6">
                {t('focusFly.boardingPass.subtitle')}
            </p>

            {/* Boarding Pass Ticket */}
            <div className="flex justify-center mb-6">
                <AirlineTicket 
                    variant="light"
                    onTearTicket={tearTicketAndStartFlight}
                />
            </div>

            <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                    ✈️ {t('focusFly.boardingPass.readyForTakeoff')}
                </p>
                <p className="text-xs text-muted-foreground">
                    {t('focusFly.boardingPass.swipeInstruction')}
                </p>
            </div>
        </div>
    );
};
