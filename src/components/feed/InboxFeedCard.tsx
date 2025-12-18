import React, { useState, useRef } from 'react';
import { BroadcastMessage } from '../../types';
import { Megaphone, X, ChevronDown, ChevronUp, Loader, Clock, Heart, Check, Smile } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../utils/logger';
import EmojiPicker from './EmojiPicker';

interface InboxFeedCardProps {
    notification: BroadcastMessage;
    onDismiss: (id: string) => void;
    onRead: (id: string) => void;
    isRead?: boolean;
    className?: string;
}

// Quick reaction emojis (shown inline)
const QUICK_REACTIONS = ['👍', '❤️', '🎉', '👏', '🔥'];

// Helper to format relative time
const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `Há ${diffMins} min`;
    if (diffHours < 24) return `Há ${diffHours}h`;
    if (diffDays < 7) return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

/**
 * InboxFeedCard - Notification card with emoji reactions
 * Premium design with full emoji picker
 */
const InboxFeedCard: React.FC<InboxFeedCardProps> = ({
    notification,
    onDismiss,
    onRead,
    isRead = false,
    className = ''
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [markedAsRead, setMarkedAsRead] = useState(isRead);
    const { interactWithBroadcast } = useData();
    const { showToast } = useToast();
    const emojiButtonRef = useRef<HTMLButtonElement>(null);

    // Load reaction from localStorage
    const getStoredReaction = (): string | null => {
        try {
            return localStorage.getItem(`reaction_${notification.id}`) || null;
        } catch {
            return null;
        }
    };

    const [selectedReaction, setSelectedReaction] = useState<string | null>(getStoredReaction);

    // Get like count from notification
    const likeCount = notification.liked_count || 0;

    const handleToggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    const handleReaction = async (emoji: string) => {
        if (selectedReaction) return; // Already reacted

        setIsProcessing(true);
        try {
            await interactWithBroadcast(notification.id, 'LIKE');
            setSelectedReaction(emoji);
            setShowEmojiPicker(false);
            localStorage.setItem(`reaction_${notification.id}`, emoji);
            showToast(`Você reagiu com ${emoji}`, 'success');
        } catch (error) {
            logger.error("[InboxFeedCard] Error reacting:", error);
            showToast('Erro ao reagir', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMarkAsRead = async () => {
        setIsProcessing(true);
        try {
            await interactWithBroadcast(notification.id, 'READ');
            setMarkedAsRead(true);
            onRead(notification.id);
            showToast('Marcado como lido ✓', 'success');
        } catch (error) {
            logger.error("[InboxFeedCard] Error marking read:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClose = () => {
        onDismiss(notification.id);
    };

    return (
        <div className={`relative bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden transition-all hover:shadow-md ${markedAsRead ? 'opacity-70' : ''} ${className}`}>
            {/* Left accent border */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-500 to-primary-600" />

            <div className="relative pl-4 pr-4 py-4">
                {/* Header Row */}
                <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="w-9 h-9 bg-gradient-to-br from-primary-100 to-primary-50 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Megaphone size={18} className="text-primary-600" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        {/* Title & Meta */}
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <h3 className="font-semibold text-stone-900 text-sm">{notification.title}</h3>
                                <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mt-0.5">
                                    <Clock size={10} />
                                    <span>{formatRelativeTime(notification.created_at)}</span>
                                    <span className="text-stone-300">•</span>
                                    <span className="text-primary-600 font-medium">Comunicado</span>
                                    {markedAsRead && (
                                        <>
                                            <span className="text-stone-300">•</span>
                                            <span className="text-green-600 flex items-center gap-0.5">
                                                <Check size={10} />
                                                Lido
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Close button */}
                            <button
                                onClick={handleClose}
                                className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                                title="Ocultar"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Message Content */}
                        <div
                            className={`text-stone-700 text-sm mt-2 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}
                        >
                            {notification.message}
                        </div>

                        {/* Expand/Collapse */}
                        {notification.message.length > 100 && (
                            <button
                                onClick={handleToggleExpand}
                                className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-xs font-medium mt-1.5 transition-colors"
                            >
                                {isExpanded ? (
                                    <>
                                        Mostrar menos
                                        <ChevronUp size={12} />
                                    </>
                                ) : (
                                    <>
                                        Ler mais
                                        <ChevronDown size={12} />
                                    </>
                                )}
                            </button>
                        )}

                        {/* Reactions Row - ALWAYS VISIBLE */}
                        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-stone-100">
                            {/* Emoji Reactions */}
                            <div className="flex items-center gap-1.5">
                                {/* Quick reaction buttons */}
                                {QUICK_REACTIONS.map((emoji) => (
                                    <button
                                        key={emoji}
                                        onClick={() => handleReaction(emoji)}
                                        disabled={isProcessing || !!selectedReaction}
                                        className={`w-7 h-7 flex items-center justify-center text-base rounded-lg transition-all ${selectedReaction === emoji
                                                ? 'bg-primary-100 ring-2 ring-primary-400 scale-110'
                                                : selectedReaction
                                                    ? 'opacity-30 cursor-not-allowed'
                                                    : 'hover:bg-stone-100 hover:scale-110 active:scale-95'
                                            }`}
                                        title={emoji}
                                    >
                                        {emoji}
                                    </button>
                                ))}

                                {/* More emojis button */}
                                <div className="relative">
                                    <button
                                        ref={emojiButtonRef}
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        disabled={isProcessing || !!selectedReaction}
                                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${selectedReaction
                                                ? 'opacity-30 cursor-not-allowed'
                                                : 'text-stone-400 hover:bg-stone-100 hover:text-stone-600'
                                            }`}
                                        title="Mais emojis"
                                    >
                                        <Smile size={16} />
                                    </button>

                                    {/* Emoji Picker */}
                                    <EmojiPicker
                                        isOpen={showEmojiPicker && !selectedReaction}
                                        onClose={() => setShowEmojiPicker(false)}
                                        onSelect={handleReaction}
                                        triggerRef={emojiButtonRef}
                                    />
                                </div>

                                {/* Like counter */}
                                {likeCount > 0 && (
                                    <span className="flex items-center gap-1 text-xs text-stone-500 ml-1 px-2 py-1 bg-stone-50 rounded-full">
                                        <Heart size={10} className="text-rose-500 fill-current" />
                                        {likeCount}
                                    </span>
                                )}
                            </div>

                            {/* Mark as Read */}
                            {!markedAsRead && (
                                <button
                                    onClick={handleMarkAsRead}
                                    disabled={isProcessing}
                                    className="flex items-center gap-1 px-2 py-1 text-xs text-stone-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isProcessing ? (
                                        <Loader size={12} className="animate-spin" />
                                    ) : (
                                        <Check size={12} />
                                    )}
                                    Lido
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InboxFeedCard;
