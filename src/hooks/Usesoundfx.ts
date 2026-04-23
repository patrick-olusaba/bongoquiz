// src/hooks/useSoundFX.ts
import { useCallback, useRef } from "react";

import correctSfx     from "../assets/sounds/correct.mp3";
import wrongSfx       from "../assets/sounds/wrong.mp3";
import streakSfx      from "../assets/sounds/streak.mp3";
import comboSfx       from "../assets/sounds/combo.mp3";
import tickSfx        from "../assets/sounds/tick.mp3";
import tickUrgentSfx  from "../assets/sounds/tick_urgent.mp3";
import timeoutSfx     from "../assets/sounds/timeout.mp3";
import categorySfx    from "../assets/sounds/category.mp3";
import powerRevealSfx from "../assets/sounds/power_reveal.mp3";
import transitionSfx  from "../assets/sounds/transition.mp3";
import victorySfx     from "../assets/sounds/victory.mp3";
import leaderboardSfx from "../assets/sounds/leaderboard.mp3";
import spinSfx        from "../assets/sounds/spin.mp3";

export type SoundName =
    | "correct" | "wrong" | "streak" | "combo"
    | "tick" | "tick_urgent" | "timeout"
    | "category" | "power_reveal" | "transition"
    | "victory" | "leaderboard" | "spin";

const SOUND_MAP: Record<SoundName, string> = {
    correct:      correctSfx,
    wrong:        wrongSfx,
    streak:       streakSfx,
    combo:        comboSfx,
    tick:         tickSfx,
    tick_urgent:  tickUrgentSfx,
    timeout:      timeoutSfx,
    category:     categorySfx,
    power_reveal: powerRevealSfx,
    transition:   transitionSfx,
    victory:      victorySfx,
    leaderboard:  leaderboardSfx,
    spin:         spinSfx,
};

const VOLUME_MAP: Partial<Record<SoundName, number>> = {
    wrong:       0.5,
    tick:        0.3,
    tick_urgent: 0.2,
    transition:0.8
};

export function useSoundFX(enabled = true) {
    const cache = useRef<Partial<Record<SoundName, HTMLAudioElement>>>({});

    const play = useCallback((name: SoundName, volume = 1, loop = false) => {
        if (!enabled) return;
        try {
            let audio = cache.current[name];
            if (!audio) {
                audio = new Audio(SOUND_MAP[name]);
                cache.current[name] = audio;
            }
            audio.loop = loop;
        audio.volume = Math.min(1, Math.max(0, VOLUME_MAP[name] ?? volume));
            audio.currentTime = 0;
            audio.play().catch(() => {});
        } catch {}
    }, [enabled]);

    const stop = useCallback((name: SoundName) => {
        const audio = cache.current[name];
        if (audio) {
            audio.loop = false;
            audio.pause();
            audio.currentTime = 0;
        }
    }, []);

    return { play, stop };
}