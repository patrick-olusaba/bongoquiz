import { FC } from 'react';
import { Home, User } from 'lucide-react';
import '../../styles/BottomNav.css';

interface Props {
    active: 'home' | 'games' | 'spin' | 'leaderboard' | 'profile';
    onNavigate: (tab: 'home' | 'games' | 'spin' | 'leaderboard' | 'profile') => void;
}

export const BottomNav: FC<Props> = ({ active, onNavigate }) => {
    return (
        <nav className="bottom-nav">
            <button className={`bottom-nav-item ${active === 'home' ? 'active' : ''}`} onClick={() => onNavigate('home')}>
                <Home size={24} strokeWidth={2} />
                <span>Home</span>
            </button>
            <button className={`bottom-nav-item ${active === 'games' ? 'active' : ''}`} onClick={() => onNavigate('games')}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="13" rx="2"/>
                    <path d="M8 12h2m-1-1v2"/>
                    <circle cx="16" cy="12" r="1" fill="currentColor" stroke="none"/>
                    <circle cx="14" cy="14" r="1" fill="currentColor" stroke="none"/>
                </svg>
                <span>Games</span>
            </button>
            <button className={`bottom-nav-item bottom-nav-spin ${active === 'spin' ? 'active' : ''}`} onClick={() => onNavigate('spin')}>
                <div className="spin-icon-wrapper">
                    {/* Wheel SVG matching reference */}
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <circle cx="12" cy="12" r="3"/>
                        <line x1="12" y1="2" x2="12" y2="9"/>
                        <line x1="12" y1="15" x2="12" y2="22"/>
                        <line x1="2" y1="12" x2="9" y2="12"/>
                        <line x1="15" y1="12" x2="22" y2="12"/>
                        <line x1="4.22" y1="4.22" x2="9.17" y2="9.17"/>
                        <line x1="14.83" y1="14.83" x2="19.78" y2="19.78"/>
                        <line x1="19.78" y1="4.22" x2="14.83" y2="9.17"/>
                        <line x1="9.17" y1="14.83" x2="4.22" y2="19.78"/>
                    </svg>
                </div>
                <span>Spin</span>
            </button>
            <button className={`bottom-nav-item ${active === 'leaderboard' ? 'active' : ''}`} onClick={() => onNavigate('leaderboard')}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="12" width="4" height="9" rx="1"/>
                    <rect x="10" y="7" width="4" height="14" rx="1"/>
                    <rect x="17" y="3" width="4" height="18" rx="1"/>
                </svg>
                <span>Leaderboard</span>
            </button>
            <button className={`bottom-nav-item ${active === 'profile' ? 'active' : ''}`} onClick={() => onNavigate('profile')}>
                <User size={24} strokeWidth={2} />
                <span>Profile</span>
            </button>
        </nav>
    );
};
