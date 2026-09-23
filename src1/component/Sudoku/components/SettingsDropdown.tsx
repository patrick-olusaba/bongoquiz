import React from 'react';
import { Settings, Volume2, VolumeX, HelpCircle } from 'lucide-react';

type SettingsDropdownProps = {
  isSettingsOpen: boolean;
  setIsSettingsOpen: (isOpen: boolean) => void;
  isMuted: boolean;
  setIsMuted: (isMuted: boolean) => void;
  setIsHowToPlayOpen: (isOpen: boolean) => void;
};

export const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
  isSettingsOpen,
  setIsSettingsOpen,
  isMuted,
  setIsMuted,
  setIsHowToPlayOpen,
}) => {
  return (
    <div className="sudoku-dropdown-container">
      <button 
        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        className="sudoku-icon-btn"
      >
        <Settings size={24} strokeWidth={1.5} />
      </button>
      
      {isSettingsOpen && (
        <>
          <div 
            className="sudoku-dropdown-overlay" 
            onClick={() => setIsSettingsOpen(false)}
          />
          <div className="sudoku-dropdown-menu">
            <button 
              onClick={() => {
                setIsMuted(!isMuted);
                setIsSettingsOpen(false);
              }}
              className="sudoku-dropdown-item"
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              <span>{isMuted ? 'Unmute Sounds' : 'Mute Sounds'}</span>
            </button>
            <div className="sudoku-dropdown-divider" />
            <button 
              onClick={() => {
                setIsHowToPlayOpen(true);
                setIsSettingsOpen(false);
              }}
              className="sudoku-dropdown-item"
            >
              <HelpCircle size={18} />
              <span>How to Play</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
