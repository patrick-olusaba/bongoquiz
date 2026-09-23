// src/types/gamestyles.ts
// Shared inline style objects imported by all game screen components.
// Follows the same pattern as bongotypes.ts — a types file other components import from.

import type React from 'react';

// Full-page dark gradient wrapper (matches canvas bg colour #191425)
export const pageWrap: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0d0d1a 0%, #1a0a2e 50%, #0d1a2e 100%)',
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative',
    overflowX: 'hidden',
};


// Glassmorphic card — used on every screen
export const card: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(16px)',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    padding: '36px',
    maxWidth: '680px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    zIndex: 1,
};

// Small gold pill label (round name, step indicator)
export const badge: React.CSSProperties = {
    display: 'inline-block',
    background: 'rgba(255, 215, 0, 0.10)',
    border: '1px solid rgba(255, 215, 0, 0.35)',
    borderRadius: '20px',
    padding: '4px 14px',
    fontSize: '0.82rem',
    color: '#ffd200',
    marginBottom: '12px',
};

// Same style as badge but sits inline (no bottom margin)
export const scoreChip: React.CSSProperties = {
    ...badge,
    marginBottom: 0,
};

// Question text box
export const questionBox: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.07)',
    borderRadius: '14px',
    padding: '20px',
    marginBottom: '18px',
    fontSize: '1.1rem',
    fontWeight: 600,
    lineHeight: 1.5,
    border: '1px solid rgba(255, 255, 255, 0.10)',
};

// Base button — never used on its own, always spread into a variant
export const btnBase: React.CSSProperties = {
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: '1rem',
    padding: '13px 32px',
    transition: 'all 0.2s',
    color: '#ffffff',
    letterSpacing: '0.5px',
    fontFamily: 'inherit',
};

export const btnPrimary: React.CSSProperties = {
    ...btnBase,
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
};

export const btnGreen: React.CSSProperties = {
    ...btnBase,
    background: 'linear-gradient(135deg, #11998e, #38ef7d)',
    boxShadow: '0 4px 20px rgba(56, 239, 125, 0.4)',
};

export const btnGold: React.CSSProperties = {
    ...btnBase,
    background: 'linear-gradient(135deg, #f7971e, #ffd200)',
    color: '#1a0a2e',
    fontSize: '1.1rem',
    padding: '14px 40px',
    boxShadow: '0 4px 20px rgba(255, 210, 0, 0.4)',
};

// Subtle ghost button (Skip, Hint, Freeze etc.)
export const btnGhost: React.CSSProperties = {
    ...btnBase,
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.20)',
    fontSize: '0.85rem',
    padding: '9px 18px',
    boxShadow: 'none',
};

// Answer option button — returns different styles per state
export function optionBtn(state: 'default' | 'correct' | 'wrong'): React.CSSProperties {
    return {
        width: '100%',
        textAlign: 'left',
        fontFamily: 'inherit',
        background:
            state === 'correct' ? 'rgba(56, 239, 125, 0.20)' :
            state === 'wrong'   ? 'rgba(229, 45, 39, 0.20)'  :
                                  'rgba(255, 255, 255, 0.07)',
        border: `2px solid ${
            state === 'correct' ? '#38ef7d' :
            state === 'wrong'   ? '#e52d27' :
                                  'rgba(255, 255, 255, 0.15)'
        }`,
        borderRadius: '12px',
        padding: '13px 20px',
        color: '#ffffff',
        fontSize: '0.98rem',
        cursor: state === 'default' ? 'pointer' : 'default',
        marginBottom: '10px',
        fontWeight: 500,
        transition: 'all 0.15s',
    };
}
