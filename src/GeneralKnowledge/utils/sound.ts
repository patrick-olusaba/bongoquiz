import correctSrc from '../assets/sounds/correct.mp3';
import wrongSrc from '../assets/sounds/wrong.mp3';
import tickSrc from '../assets/sounds/tick.mp3';
import tickUrgentSrc from '../assets/sounds/tick_urgent.mp3';
import timeoutSrc from '../assets/sounds/timeout.mp3';
import victorySrc from '../assets/sounds/victory.mp3';

const cache: Record<string, HTMLAudioElement> = {};

function get(src: string): HTMLAudioElement {
    if (!cache[src]) {
        cache[src] = new Audio(src);
    }
    return cache[src];
}

function play(src: string, volume = 1) {
    const audio = get(src);
    audio.currentTime = 0;
    audio.volume = volume;
    audio.play().catch(() => {});
}

export const sound = {
    correct:    () => play(correctSrc, 0.8),
    wrong:      () => play(wrongSrc, 0.8),
    tick:       () => play(tickSrc, 0.4),
    tickUrgent: () => play(tickUrgentSrc, 0.5),
    timeout:    () => play(timeoutSrc, 0.7),
    victory:    () => play(victorySrc, 0.7),
};
