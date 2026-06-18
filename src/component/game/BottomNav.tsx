import { FC } from 'react';
import { BarChart3, Gamepad2, Home, Trophy, User } from 'lucide-react';
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
                <Home size={24} strokeWidth={2} />
                <span>Home</span>
            </button>
            <button className={`bottom-nav-item ${active === 'games' ? 'active' : ''}`} onClick={() => onNavigate('games')}>
                <Gamepad2 size={22} strokeWidth={2} />
                <span>Games</span>
            </button>
            <button className={`bottom-nav-item bottom-nav-spin ${active === 'community' ? 'active' : ''}`} onClick={() => onNavigate('community')}>
                <div className="spin-icon-wrapper">
                    <Trophy size={27} strokeWidth={2} />
                </div>
                <span>Tournaments</span>
            </button>
            <button className={`bottom-nav-item ${active === 'leaderboard' ? 'active' : ''}`} onClick={() => onNavigate('leaderboard')}>
                <BarChart3 size={22} strokeWidth={2} />
                <span>Leaderboard</span>
            </button>
            <button className={`bottom-nav-item ${active === 'profile' ? 'active' : ''}`} onClick={() => onNavigate('profile')}>
                <User size={24} strokeWidth={2} />
                <span>Profile</span>
            </button>
        </nav>
    );
};
