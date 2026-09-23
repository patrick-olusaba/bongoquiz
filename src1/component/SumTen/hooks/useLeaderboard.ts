import { useState, useCallback } from 'react';
import { useProfile } from './useProfile';

export interface LeaderboardEntry {
    id: string;
    name: string;
    phone: string;
    points: number;
    date: string;
}

const INITIAL_MOCK_DATA: LeaderboardEntry[] = [];

export function useLeaderboard() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>(() => {
        try {
            const stored = localStorage.getItem('sumten_leaderboard_v2');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load leaderboard', e);
        }
        return INITIAL_MOCK_DATA;
    });
    const { profile } = useProfile();

    const addScore = useCallback((score: number) => {
        if (!profile) return;

        try {
            const stored = localStorage.getItem('sumten_leaderboard_v2');
            const currentEntries: LeaderboardEntry[] = stored ? JSON.parse(stored) : INITIAL_MOCK_DATA;

            const existingUserIdx = currentEntries.findIndex(
                entry => entry.name === profile.name && entry.phone === profile.phone
            );

            const newEntries = [...currentEntries];
            const today = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'numeric', year: 'numeric' });

            if (existingUserIdx >= 0) {
                newEntries[existingUserIdx].points += score;
                newEntries[existingUserIdx].date = today;
            } else {
                newEntries.push({
                    id: Date.now().toString(),
                    name: profile.name,
                    phone: profile.phone,
                    points: score,
                    date: today
                });
            }

            newEntries.sort((a, b) => b.points - a.points);
            localStorage.setItem('sumten_leaderboard_v2', JSON.stringify(newEntries));
            setEntries(newEntries);
        } catch (e) {
            console.error('Failed to save leaderboard', e);
        }
    }, [profile]);

    return { entries, addScore };
}
