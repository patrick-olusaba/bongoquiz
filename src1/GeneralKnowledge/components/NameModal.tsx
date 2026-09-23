import { type FC, useState } from 'react';

interface Props {
    current: string;
    onSave: (name: string) => void;
    onCancel?: () => void;
}

const NameModal: FC<Props> = ({ current, onSave, onCancel }) => {
    const [value, setValue] = useState(current === 'Quiz Master' ? '' : current);

    const submit = () => {
        const name = value.trim();
        if (name) onSave(name);
    };

    return (
        <div style={overlay}>
            <div style={card}>
                <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>👤 Your Name</h2>
                <p style={{ margin: '0 0 16px', color: '#aaa', fontSize: 14 }}>
                    Enter a name to appear on the leaderboard.
                </p>
                <input
                    autoFocus
                    maxLength={20}
                    placeholder="e.g. QuizKing"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submit()}
                    style={input}
                />
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button onClick={submit} disabled={!value.trim()} style={btnPrimary}>
                        Save
                    </button>
                    {onCancel && (
                        <button onClick={onCancel} style={btnSecondary}>Cancel</button>
                    )}
                </div>
            </div>
        </div>
    );
};

const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const card: React.CSSProperties = {
    background: '#1a1a2e', border: '1px solid #333', borderRadius: 16,
    padding: '28px 24px', width: 320, maxWidth: '90vw', color: '#fff',
};
const input: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #444',
    background: '#0f0f1a', color: '#fff', fontSize: 16, boxSizing: 'border-box',
    outline: 'none',
};
const btnPrimary: React.CSSProperties = {
    flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
    background: 'linear-gradient(135deg,#6c63ff,#4ecdc4)', color: '#fff',
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
    flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #444',
    background: 'transparent', color: '#aaa', fontSize: 15, cursor: 'pointer',
};

export default NameModal;
