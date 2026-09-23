import { useState } from 'react';
import { X, User, Phone } from 'lucide-react';


export interface UserProfile {
    name: string;
    phone: string;
}

interface ProfileModalProps {
    initialProfile: UserProfile | null;
    onSave: (profile: UserProfile) => void;
    onClose: () => void;
}

export function ProfileModal({ initialProfile, onSave, onClose }: ProfileModalProps) {
    const [name, setName] = useState(initialProfile?.name || '');
    const [phone, setPhone] = useState(initialProfile?.phone || '');

    const handleSave = () => {
        if (name.trim() && phone.trim()) {
            onSave({ name: name.trim(), phone: phone.trim() });
        }
    };

    return (
        <div className="payment-modal-overlay" onClick={onClose}>
            <div className="profile-modal" onClick={e => e.stopPropagation()}>
                <div className="profile-modal-header">
                    <h2 className="profile-modal-title">Edit Profile</h2>
                    <button className="profile-modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <p className="profile-modal-subtitle">
                    Your name shows on the leaderboard. Phone is used for M-Pesa.
                </p>

                <div className="profile-input-group">
                    <label className="profile-input-label">Your Name</label>
                    <div className="profile-input-wrapper">
                        <User size={18} className="profile-input-icon" />
                        <input
                            type="text"
                            className="profile-input"
                            placeholder="e.g. James"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>
                </div>

                <div className="profile-input-group">
                    <label className="profile-input-label">Phone Number</label>
                    <div className="profile-input-wrapper">
                        <Phone size={18} className="profile-input-icon" style={{ transform: 'scaleX(-1)' }} />
                        <input
                            type="text"
                            className="profile-input"
                            placeholder="e.g. 011567895"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                        />
                    </div>
                    <div className="profile-input-hint">
                        Used for M-Pesa payments (format: 0712345678 or 254712345678)
                    </div>
                </div>

                <div className="profile-modal-actions">
                    <button className="profile-btn profile-btn-cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="profile-btn profile-btn-save"
                        onClick={handleSave}
                        disabled={!name.trim() || !phone.trim()}
                    >
                        Save & Play
                    </button>
                </div>
            </div>
        </div>
    );
}
