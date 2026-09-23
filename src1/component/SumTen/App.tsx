import { useState, useEffect } from 'react';
import MatchMain from './components/MatchMain';
import { LandingPage } from './components/LandingPage';
import { LiveBackground } from './components/LiveBackground';
import './styles/styles.css';

export default function App() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [activePaymentId, setActivePaymentId] = useState<string | undefined>();

    useEffect(() => {
        // Ensure initial history state is set
        if (!window.history.state) {
            window.history.replaceState({ playing: false }, '');
        }

        const handlePopState = (event: PopStateEvent) => {
            if (event.state && event.state.playing) {
                setIsPlaying(true);
            } else {
                setIsPlaying(false);
            }
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    const handleStartGame = (paymentId?: string) => {
        setActivePaymentId(paymentId);
        window.history.pushState({ playing: true }, '');
        setIsPlaying(true);
    };

    const handleBack = () => {
        if (window.history.state && window.history.state.playing) {
            window.history.back();
        } else {
            setIsPlaying(false);
            setActivePaymentId(undefined);
        }
    };

    return (
        <div className="sum-ten-page relative w-full h-[100dvh] overflow-hidden">
            {!isPlaying && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <LiveBackground />
                </div>
            )}
            <div className="relative z-10 w-full h-full">
                {isPlaying ? (
                    <MatchMain onBack={handleBack} paymentId={activePaymentId} onPaymentConfirmed={setActivePaymentId} />
                ) : (
                    <LandingPage onStartGame={handleStartGame} />
                )}
            </div>
        </div>
    );
}
