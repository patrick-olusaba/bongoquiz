import { useCallback } from 'react';

const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
let globalAudioCtx: AudioContext | null = null;

export const initAudio = () => {
    if (!globalAudioCtx && AudioContextClass) {
        globalAudioCtx = new AudioContextClass();
    }
    if (globalAudioCtx?.state === 'suspended') {
        globalAudioCtx.resume();
    }
};

export const useSoundEffects = (isMuted: boolean = false) => {
    const getAudioContext = () => {
        if (!globalAudioCtx && AudioContextClass) {
            globalAudioCtx = new AudioContextClass();
        }
        if (globalAudioCtx?.state === 'suspended') {
            globalAudioCtx.resume();
        }
        return globalAudioCtx;
    };

    const playOscillator = useCallback((type: OscillatorType, frequency: number, duration: number) => {
        if (isMuted) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;

            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(frequency, ctx.currentTime);

            gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            console.error("Audio error", e);
        }
    }, [isMuted]);

    const playMultiOscillator = useCallback((notes: { freq: number, time: number }[], duration: number, type: OscillatorType = 'sine') => {
        if (isMuted) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;

            notes.forEach(note => {
                const osc = ctx.createOscillator();
                const gainNode = ctx.createGain();

                osc.type = type;
                osc.frequency.value = note.freq;

                gainNode.gain.setValueAtTime(0, ctx.currentTime + note.time);
                gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + note.time + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.time + duration);

                osc.connect(gainNode);
                gainNode.connect(ctx.destination);

                osc.start(ctx.currentTime + note.time);
                osc.stop(ctx.currentTime + note.time + duration);
            });
        } catch (e) {
            console.error("Audio error", e);
        }
    }, [isMuted]);

    const playConnectSound = useCallback((isNode: boolean = false) => {
        if (isNode) {
            playOscillator('sine', 600, 0.4);
        } else {
            playOscillator('sine', 300, 0.2);
        }
    }, [playOscillator]);

    const playErrorSound = useCallback(() => {
        playOscillator('sawtooth', 150, 0.3);
    }, [playOscillator]);

    const playStageCompleteSound = useCallback(() => {
        playMultiOscillator([
            { freq: 440, time: 0 },
            { freq: 554.37, time: 0.1 },
            { freq: 659.25, time: 0.2 },
            { freq: 880, time: 0.3 }
        ], 0.5);
    }, [playMultiOscillator]);

    const playLevelCompleteSound = useCallback(() => {
        playMultiOscillator([
            { freq: 523.25, time: 0 },
            { freq: 659.25, time: 0.15 },
            { freq: 783.99, time: 0.3 },
            { freq: 1046.50, time: 0.45 },
            { freq: 1318.51, time: 0.6 }
        ], 0.8, 'triangle');
    }, [playMultiOscillator]);

    return {
        playConnectSound,
        playErrorSound,
        playStageCompleteSound,
        playLevelCompleteSound
    };
};
