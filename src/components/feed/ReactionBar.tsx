import React, { useState, useEffect } from 'react';
import { Smile } from 'lucide-react';
import EmojiPicker from './EmojiPicker';

interface ReactionBarProps {
    notificationId: string;
    onReact: (emoji: string | null) => void;
    isProcessing?: boolean;
    className?: string;
}

// Default quick reaction emojis
const DEFAULT_EMOJIS = ['👍', '❤️', '🎉', '🔥', '👏'];
const MAX_VISIBLE = 8;
const STORAGE_KEY_PREFIX = 'reaction_bar_';

/**
 * Get stored bar emojis for a notification
 */
const getStoredBarEmojis = (notificationId: string): string[] => {
    try {
        const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}emojis_${notificationId}`);
        return stored ? JSON.parse(stored) : [...DEFAULT_EMOJIS];
    } catch {
        return [...DEFAULT_EMOJIS];
    }
};

/**
 * Save bar emojis to localStorage
 */
const saveBarEmojis = (notificationId: string, emojis: string[]) => {
    try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}emojis_${notificationId}`, JSON.stringify(emojis));
    } catch {
        // Ignore localStorage errors
    }
};

/**
 * Get stored selected reaction for a notification
 */
const getStoredReaction = (notificationId: string): string | null => {
    try {
        return localStorage.getItem(`reaction_${notificationId}`) || null;
    } catch {
        return null;
    }
};

/**
 * Save selected reaction to localStorage
 */
const saveReaction = (notificationId: string, emoji: string | null) => {
    try {
        if (emoji) {
            localStorage.setItem(`reaction_${notificationId}`, emoji);
        } else {
            localStorage.removeItem(`reaction_${notificationId}`);
        }
    } catch {
        // Ignore localStorage errors
    }
};

/**
 * ReactionBar - Stable layout reaction component
 * 
 * Features:
 * - Consistent flex-row layout regardless of selection state
 * - Max 8 visible emojis
 * - Toggle behavior (click selected to deselect)
 * - Picker adds emoji to bar with FIFO when limit reached
 */
const ReactionBar: React.FC<ReactionBarProps> = ({
    notificationId,
    onReact,
    isProcessing = false,
    className = ''
}) => {
    const [showPicker, setShowPicker] = useState(false);
    const [barEmojis, setBarEmojis] = useState<string[]>(() => getStoredBarEmojis(notificationId));
    const [selectedEmoji, setSelectedEmoji] = useState<string | null>(() => getStoredReaction(notificationId));

    // Sync state when notificationId changes
    useEffect(() => {
        setBarEmojis(getStoredBarEmojis(notificationId));
        setSelectedEmoji(getStoredReaction(notificationId));
    }, [notificationId]);

    /**
     * Handle emoji click (toggle behavior)
     */
    const handleEmojiClick = (emoji: string) => {
        if (isProcessing) return;

        if (selectedEmoji === emoji) {
            // Toggle OFF - deselect
            setSelectedEmoji(null);
            saveReaction(notificationId, null);
            onReact(null);
        } else {
            // Toggle ON - select
            setSelectedEmoji(emoji);
            saveReaction(notificationId, emoji);
            onReact(emoji);

            // Ensure emoji is in bar (might be from picker)
            if (!barEmojis.includes(emoji)) {
                addEmojiToBar(emoji);
            }
        }
    };

    /**
     * Add emoji to bar with FIFO when limit reached
     */
    const addEmojiToBar = (emoji: string) => {
        if (barEmojis.includes(emoji)) return;

        let newBar = [...barEmojis];

        if (newBar.length >= MAX_VISIBLE) {
            // Remove oldest that is NOT currently selected
            const indexToRemove = newBar.findIndex(e => e !== selectedEmoji);
            if (indexToRemove !== -1) {
                newBar.splice(indexToRemove, 1);
            } else {
                // All are selected? Remove first anyway
                newBar.shift();
            }
        }

        // Add new emoji at the end
        newBar.push(emoji);

        setBarEmojis(newBar);
        saveBarEmojis(notificationId, newBar);
    };

    /**
     * Handle picker selection
     */
    const handlePickerSelect = (emoji: string) => {
        setShowPicker(false);

        // Add to bar if not present
        if (!barEmojis.includes(emoji)) {
            addEmojiToBar(emoji);
        }

        // Select it
        handleEmojiClick(emoji);
    };

    // Limit visible emojis
    const visibleEmojis = barEmojis.slice(0, MAX_VISIBLE);

    return (
        <div className={`flex items-center gap-1.5 ${className}`}>
            {/* Emoji Buttons - ALWAYS same layout */}
            {visibleEmojis.map((emoji) => (
                <button
                    key={emoji}
                    onClick={() => handleEmojiClick(emoji)}
                    disabled={isProcessing}
                    className={`w-8 h-8 flex items-center justify-center text-lg rounded-lg transition-all ${selectedEmoji === emoji
                            ? 'bg-primary-100 ring-2 ring-primary-400 scale-105'
                            : 'hover:bg-stone-100 hover:scale-110 active:scale-95'
                        } ${isProcessing ? 'opacity-50 cursor-wait' : ''}`}
                    title={selectedEmoji === emoji ? 'Clique para remover' : 'Reagir'}
                >
                    {emoji}
                </button>
            ))}

            {/* More Emojis Picker Button */}
            <div className="relative">
                <button
                    onClick={() => setShowPicker(!showPicker)}
                    disabled={isProcessing}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-all ${isProcessing ? 'opacity-50 cursor-wait' : ''
                        }`}
                    title="Mais emojis"
                >
                    <Smile size={18} />
                </button>

                {/* Picker - positioned above */}
                {showPicker && (
                    <div className="absolute left-0 z-[200]" style={{ bottom: '100%', marginBottom: '8px' }}>
                        <EmojiPicker
                            isOpen={true}
                            onClose={() => setShowPicker(false)}
                            onSelect={handlePickerSelect}
                            position="top"
                        />
                    </div>
                )}
            </div>

            {/* Selected indicator text */}
            {selectedEmoji && (
                <span className="text-xs text-primary-600 font-medium ml-1">
                    Reagido
                </span>
            )}
        </div>
    );
};

export default ReactionBar;
