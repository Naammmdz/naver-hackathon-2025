import { useFocusFly } from "../FocusFlyProvider";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';

export const Step4_Landed = ({ onComplete }: { onComplete: (taskId: string) => void }) => {
    const { session, reset } = useFocusFly();
    const { t } = useTranslation();

    const handleComplete = () => {
        if (session?.taskId) {
            onComplete(session.taskId);
        }
        reset();
    };

    return (
        <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">{t('focusFly.landed.title')}</h2>
            <p className="text-muted-foreground mb-6">
                {t('focusFly.landed.subtitle')}: <br />
                <span className="font-semibold text-foreground">{session?.taskTitle}</span>
            </p>
            <p className="text-lg mb-6">
                {t('focusFly.landed.totalFlightTime')}: <span className="font-bold">{session?.durationMin} {t('focusFly.timeSelection.minutes')}</span>
            </p>
            <div className="flex flex-col gap-2">
                <Button onClick={handleComplete} className="w-full h-12 text-lg">
                    {t('focusFly.landed.markComplete')}
                </Button>
                <Button onClick={reset} variant="outline" className="w-full">
                    {t('focusFly.landed.closeWithoutMarking')}
                </Button>
            </div>
        </div>
    );
};
