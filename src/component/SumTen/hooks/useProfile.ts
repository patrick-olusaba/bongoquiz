import { useState, useEffect } from 'react';

export interface UserProfile {
    name: string;
    phone: string;
}

export function useProfile() {
    const [profile, setProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('sumten_profile');
            if (stored) {
                setProfile(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load profile', e);
        }
    }, []);

    const saveProfile = (newProfile: UserProfile) => {
        setProfile(newProfile);
        localStorage.setItem('sumten_profile', JSON.stringify(newProfile));
    };

    return { profile, saveProfile };
}
