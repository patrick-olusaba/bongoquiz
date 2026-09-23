import { useState } from 'react';
import { User, Phone, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type {UserProfile} from '../hooks/useProfile';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (profile: UserProfile) => void;
    initialProfile: UserProfile | null;
    isAttemptingPlay?: boolean;
}

export function ProfileModal({ isOpen, onClose, onSave, initialProfile, isAttemptingPlay }: ProfileModalProps) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [prevIsOpen, setPrevIsOpen] = useState(false);

    if (isOpen !== prevIsOpen) {
        setPrevIsOpen(isOpen);
        if (isOpen) {
            setName(initialProfile?.name || '');
            setPhone(initialProfile?.phone || '');
        }
    }

    const handleSave = () => {
        onSave({ name, phone });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="sum-profile-overlay">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="sum-profile-modal"
                    >
                        {/* Header */}
                        <div className="sum-profile-header">
                            <h2 className="sum-profile-title">Edit Profile</h2>
                            <button
                                onClick={onClose}
                                className="sum-profile-close-btn"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="sum-profile-content">
                            <p className="sum-profile-desc">
                                Your name shows on the leaderboard. Phone is used for M-Pesa.
                            </p>

                            {/* Name Input */}
                            <div className="sum-profile-field">
                                <label className="sum-profile-label">YOUR NAME</label>
                                <div className="sum-profile-input-wrapper">
                                    <div className="sum-profile-input-icon">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="John"
                                        className="sum-profile-input placeholder:text-gray-400"
                                    />
                                </div>
                            </div>

                            {/* Phone Input */}
                            <div className="sum-profile-field">
                                <label className="sum-profile-label">PHONE NUMBER</label>
                                <div className="sum-profile-input-wrapper">
                                    <div className="sum-profile-input-icon">
                                        <Phone size={18} />
                                    </div>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="0700... or 011..."
                                        className="sum-profile-input placeholder:text-gray-400"
                                    />
                                </div>
                                <p className="sum-profile-hint">
                                    Used for M-Pesa payments (format: 0712345678 or<br/>254712345678)
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="sum-profile-actions">
                            <button
                                onClick={onClose}
                                className="sum-profile-cancel-btn"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!name.trim() || !phone.trim()}
                                className="sum-profile-save-btn"
                            >
                                {isAttemptingPlay ? 'Save & Play' : 'Save'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
