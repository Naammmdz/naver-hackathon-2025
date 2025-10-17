import { useFocusFly } from "../FocusFlyProvider";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';

export const Step1_Ready = () => {
    const { session, selectSeat } = useFocusFly();
    const { t } = useTranslation();

    return (
        <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">{t('focusFly.ready.title')}</h2>
            <p className="text-muted-foreground mb-6">
                {t('focusFly.ready.subtitle')}: <br />
                <span className="font-semibold text-foreground">{session?.taskTitle}</span>
            </p>
            <p className="text-lg mb-1">{t('focusFly.ready.defaultDuration')}:</p>
            <p className="text-5xl font-bold mb-8">{session?.durationMin} {t('focusFly.timeSelection.minutes')}</p>
            <Button onClick={() => selectSeat('A1')} className="w-full h-12 text-lg">
                {t('focusFly.ready.proceedToSeatSelection')}
            </Button>
        </div>
    );
};
