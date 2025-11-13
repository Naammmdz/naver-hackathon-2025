import { useFocusFly } from "../FocusFlyProvider";
import { Button } from "@/components/ui/button";
import { Clock, Plane } from "lucide-react";
import { useTranslation } from 'react-i18next';

export const Step0_TimeSelection = () => {
    const { setDuration, session } = useFocusFly();
    const { t } = useTranslation();

    // Popular time options
    const timeOptions = [
        { minutes: 15, label: `15 ${t('focusFly.timeSelection.minutes')}`, description: t('focusFly.timeSelection.quickSprint') },
        { minutes: 25, label: `25 ${t('focusFly.timeSelection.minutes')}`, description: t('focusFly.timeSelection.classicPomodoro') },
        { minutes: 45, label: `45 ${t('focusFly.timeSelection.minutes')}`, description: t('focusFly.timeSelection.deepWork') },
        { minutes: 60, label: `1 ${t('focusFly.timeSelection.hour')}`, description: t('focusFly.timeSelection.longFocus') },
        { minutes: 90, label: `1.5 ${t('focusFly.timeSelection.hours')}`, description: t('focusFly.timeSelection.extendedSession') },
        { minutes: 120, label: `2 ${t('focusFly.timeSelection.hours')}`, description: t('focusFly.timeSelection.marathonFocus') },
    ];

    const handleTimeSelect = (minutes: number) => {
        setDuration(minutes);
    };

    return (
        <div className="p-6 text-center max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold">{t('focusFly.timeSelection.title')}</h2>
            </div>
            <p className="text-muted-foreground mb-8">
                {t('focusFly.timeSelection.subtitle')}: <strong>{session?.taskTitle}</strong>?
            </p>

            {/* Time Selection Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {timeOptions.map(({ minutes, label, description }) => (
                    <Button
                        key={minutes}
                        onClick={() => handleTimeSelect(minutes)}
                        variant="outline"
                        className="h-20 flex flex-col items-center justify-center gap-1 hover:bg-muted/60 hover:border-primary/40 dark:hover:bg-muted/40"
                    >
                        <div className="text-lg font-bold">{label}</div>
                        <div className="text-xs text-muted-foreground">{description}</div>
                    </Button>
                ))}
            </div>

            {/* Custom Time Input */}
            <div className="border-t pt-6">
                <p className="text-sm text-muted-foreground mb-4">{t('focusFly.timeSelection.customDuration')}:</p>
                <div className="flex items-center justify-center gap-3">
                    <input
                        type="number"
                        min="5"
                        max="240"
                        placeholder="30"
                        className="w-20 px-3 py-2 border rounded-md text-center"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const value = parseInt((e.target as HTMLInputElement).value);
                                if (value >= 5 && value <= 240) {
                                    handleTimeSelect(value);
                                }
                            }
                        }}
                    />
                    <span className="text-sm text-muted-foreground">{t('focusFly.timeSelection.minutes')}</span>
                    <Button
                        size="sm"
                        onClick={() => {
                            const input = document.querySelector('input[type="number"]') as HTMLInputElement;
                            const value = parseInt(input.value);
                            if (value >= 5 && value <= 240) {
                                handleTimeSelect(value);
                            } else {
                                alert(t('focusFly.timeSelection.durationError'));
                            }
                        }}
                    >
                        {t('focusFly.timeSelection.setTime')}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    {t('focusFly.timeSelection.durationRange')}
                </p>
            </div>

            {/* Flight Preview */}
            <div className="mt-8 p-4 bg-gradient-to-r from-secondary to-muted dark:from-secondary dark:to-muted rounded-lg border border-border">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Plane className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                        {t('focusFly.timeSelection.flightRouteReady')}
                    </span>
                </div>
                <p className="text-xs text-muted-foreground">
                    {t('focusFly.timeSelection.journeyDescription')}
                </p>
            </div>
        </div>
    );
};
