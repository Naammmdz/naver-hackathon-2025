import { AnimatePresence, motion } from 'framer-motion';
import { useFocusFly } from '../FocusFlyProvider';
import { Step0_TimeSelection } from './Step0_TimeSelection';
import { Step1_Ready } from './Step1_Ready';
import { Step2_SeatSelection } from './Step2_SeatSelection';
import { Step2_5_BoardingPass } from './Step2_5_BoardingPass';
import { Step3_InFlight } from './Step3_InFlight';
import { Step4_Landed } from './Step4_Landed';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const getStepComponent = (step: number) => {
    switch (step) {
        case 0: return Step0_TimeSelection;
        case 1: return Step1_Ready;
        case 2: return Step2_SeatSelection;
        case 2.5: return Step2_5_BoardingPass;
        case 3: return Step3_InFlight;
        case 4: return Step4_Landed;
        default: return Step0_TimeSelection;
    }
};

export const FocusFlyModal = ({ onComplete }: { onComplete: (taskId: string) => void }) => {
    const { isOpen, closeModal, session } = useFocusFly();

    if (!session) return null;

    const CurrentStep = getStepComponent(session.step);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
            <DialogContent className="p-0 border-none overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={session.step}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                    >
                        <CurrentStep onComplete={onComplete} />
                    </motion.div>
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
};
