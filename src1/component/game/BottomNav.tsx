import { FC } from 'react';
import { BarChart3, Home, Trophy, User } from 'lucide-react';
import '../../styles/BottomNav.css';
import type { MainNavTab } from '../../types/gametypes.ts';

interface Props {
    active: MainNavTab;
    onNavigate: (tab: MainNavTab) => void;
}

export const BottomNav: FC<Props> = ({ active, onNavigate }) => {
    return (
        <nav className="bottom-nav">
            <button className={`bottom-nav-item ${active === 'home' ? 'active' : ''}`} onClick={() => onNavigate('home')}>
                <span className="bottom-nav-indicator" aria-hidden="true" />
                <Home size={22} strokeWidth={2.2} />
                <span className="bottom-nav-label">Home</span>
            </button>
            <button className={`bottom-nav-item ${active === 'community' ? 'active' : ''}`} onClick={() => onNavigate('community')}>
                <span className="bottom-nav-indicator" aria-hidden="true" />
                <Trophy size={22} strokeWidth={2.2} />
                <span className="bottom-nav-label">Tournaments</span>
            </button>
            <button className={`bottom-nav-item ${active === 'leaderboard' ? 'active' : ''}`} onClick={() => onNavigate('leaderboard')}>
                <span className="bottom-nav-indicator" aria-hidden="true" />
                <BarChart3 size={22} strokeWidth={2.2} />
                <span className="bottom-nav-label">Leaderboard</span>
            </button>
            <button className={`bottom-nav-item ${active === 'profile' ? 'active' : ''}`} onClick={() => onNavigate('profile')}>
                <span className="bottom-nav-indicator" aria-hidden="true" />
                <User size={22} strokeWidth={2.2} />
                <span className="bottom-nav-label">Profile</span>
            </button>
        </nav>
    );
};
