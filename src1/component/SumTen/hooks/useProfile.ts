import { useState, useEffect } from 'react';

export interface UserProfile {
    name: string;
    phone: string;
}

export function useProfile() {
    const [profile, setProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        try {
            const sharedName = localStorage.getItem('bongo_player_name');
            const sharedPhone = localStorage.getItem('bongo_player_phone');
            if (sharedName && sharedPhone) {
                setProfile({ name: sharedName, phone: sharedPhone });
                return;
            }

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
        localStorage.setItem('bongo_player_name', newProfile.name);
        localStorage.setItem('bongo_player_phone', newProfile.phone);
        localStorage.setItem('bongo_last_activity', Date.now().toString());
        localStorage.setItem('sumten_profile', JSON.stringify(newProfile));
    };

    return { profile, saveProfile };
}
