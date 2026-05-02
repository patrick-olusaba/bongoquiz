import React, { useState, useEffect } from 'react';
import { X, User, Phone, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentName: string;
    currentPhone: string;
    onSave: (name: string, phone: string) => void;
    onStartGame?: (name: string, phone: string) => void; // New prop for auto-start
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
                                                                      isOpen,
                                                                      onClose,
                                                                      currentName,
                                                                      currentPhone,
                                                                      onSave,
                                                                      onStartGame,
                                                                  }) => {
    const [name, setName] = useState(currentName);
    const [phone, setPhone] = useState(currentPhone);
    const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

    // Reset form when modal opens with latest values
    useEffect(() => {
        if (isOpen) {
            setName(currentName);
            setPhone(currentPhone);
            setErrors({});
        }
    }, [isOpen, currentName, currentPhone]);

    const validateForm = (): boolean => {
        const newErrors: { name?: string; phone?: string } = {};

        if (!name.trim()) {
            newErrors.name = 'Name is required';
        } else if (name.trim().length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        } else if (name.trim().length > 30) {
            newErrors.name = 'Name must be less than 30 characters';
        }

        if (!phone.trim()) {
            newErrors.phone = 'Phone number is required';
        } else {
            const cleanPhone = phone.trim().replace(/\D/g, '');
            if (cleanPhone.length < 10 || cleanPhone.length > 12) {
                newErrors.phone = 'Enter a valid phone number (10-12 digits)';
            } else if (!cleanPhone.startsWith('0') && !cleanPhone.startsWith('254')) {
                newErrors.phone = 'Phone should start with 0 or 254';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (validateForm()) {
            const cleanPhone = phone.trim().replace(/\D/g, '');
            const trimmedName = name.trim();

            // Save the profile data
            onSave(trimmedName, cleanPhone);

            // Close the modal
            onClose();

            // Automatically start the game if onStartGame prop is provided
            if (onStartGame) {
                onStartGame(trimmedName, cleanPhone);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="edit-profile-overlay"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1000,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        background: 'rgba(0, 0, 0, 0.85)',
                        backdropFilter: 'blur(8px)',
                        padding: '1rem',
                    }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                        style={{
                            background: 'linear-gradient(135deg, #1e1b2e 0%, #0f0a21 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '1.5rem',
                            width: '100%',
                            maxWidth: '420px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(244, 63, 94, 0.15)',
                            overflow: 'hidden',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div
                            style={{
                                padding: '1.5rem 1.5rem 1rem 1.5rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                background: 'rgba(244, 63, 94, 0.04)',
                            }}
                        >
                            <div>
                                <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '1.35rem', margin: 0, letterSpacing: '-0.3px' }}>
                                    Edit Profile
                                </h3>
                                <p style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '0.75rem', margin: '0.35rem 0 0' }}>
                                    Your name shows on the leaderboard. Phone is used for M-Pesa.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '0.75rem',
                                    width: '34px',
                                    height: '34px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#cbd5e1',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(244, 63, 94, 0.2)';
                                    e.currentTarget.style.color = '#fff';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.color = '#cbd5e1';
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '1.5rem' }}>
                            {/* Name Field */}
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label
                                    htmlFor="profile-name"
                                    style={{
                                        display: 'block',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        marginBottom: '0.5rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                    }}
                                >
                                    Your Name
                                </label>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        background: 'rgba(0, 0, 0, 0.35)',
                                        borderRadius: '0.75rem',
                                        border: `1px solid ${errors.name ? 'rgba(244, 63, 94, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                                        transition: 'border-color 0.2s',
                                    }}
                                >
                                    <User size={18} style={{ marginLeft: '0.75rem', color: 'rgba(255, 255, 255, 0.4)' }} />
                                    <input
                                        id="profile-name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="e.g., John Doe"
                                        autoComplete="off"
                                        style={{
                                            flex: 1,
                                            background: 'transparent',
                                            padding: '0.9rem 0.75rem 0.9rem 0',
                                            border: 'none',
                                            outline: 'none',
                                            color: '#fff',
                                            fontSize: '0.95rem',
                                            fontWeight: 500,
                                        }}
                                    />
                                </div>
                                {errors.name && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.35rem' }}>
                                        <AlertCircle size={12} style={{ color: '#f43f5e' }} />
                                        <p style={{ color: '#f43f5e', fontSize: '0.7rem', margin: 0 }}>{errors.name}</p>
                                    </div>
                                )}
                            </div>

                            {/* Phone Field */}
                            <div style={{ marginBottom: '1.75rem' }}>
                                <label
                                    htmlFor="profile-phone"
                                    style={{
                                        display: 'block',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        marginBottom: '0.5rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                    }}
                                >
                                    Phone Number
                                </label>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        background: 'rgba(0, 0, 0, 0.35)',
                                        borderRadius: '0.75rem',
                                        border: `1px solid ${errors.phone ? 'rgba(244, 63, 94, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                                        transition: 'border-color 0.2s',
                                    }}
                                >
                                    <Phone size={18} style={{ marginLeft: '0.75rem', color: 'rgba(255, 255, 255, 0.4)' }} />
                                    <input
                                        id="profile-phone"
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="0712345678"
                                        autoComplete="off"
                                        style={{
                                            flex: 1,
                                            background: 'transparent',
                                            padding: '0.9rem 0.75rem 0.9rem 0',
                                            border: 'none',
                                            outline: 'none',
                                            color: '#fff',
                                            fontSize: '0.95rem',
                                            fontWeight: 500,
                                        }}
                                    />
                                </div>
                                {errors.phone ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.35rem' }}>
                                        <AlertCircle size={12} style={{ color: '#f43f5e' }} />
                                        <p style={{ color: '#f43f5e', fontSize: '0.7rem', margin: 0 }}>{errors.phone}</p>
                                    </div>
                                ) : (
                                    <p style={{ color: 'rgba(255, 255, 255, 0.35)', fontSize: '0.65rem', marginTop: '0.35rem', marginBottom: 0 }}>
                                        Used for M-Pesa payments (format: 0712345678 or 254712345678)
                                    </p>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                                <button
                                    onClick={onClose}
                                    style={{
                                        flex: 1,
                                        padding: '0.85rem',
                                        borderRadius: '0.75rem',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        cursor: 'pointer',
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                        e.currentTarget.style.color = '#fff';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    style={{
                                        flex: 1,
                                        padding: '0.85rem',
                                        borderRadius: '0.75rem',
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                        cursor: 'pointer',
                                        background: 'linear-gradient(135deg, #f43f5e 0%, #db2777 100%)',
                                        border: 'none',
                                        color: '#fff',
                                        boxShadow: '0 4px 12px rgba(244, 63, 94, 0.3)',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(244, 63, 94, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(244, 63, 94, 0.3)';
                                    }}
                                >
                                    Save & Play
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default EditProfileModal;