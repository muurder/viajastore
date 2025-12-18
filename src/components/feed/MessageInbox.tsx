import React, { useState, useEffect } from 'react';
import { BroadcastMessage } from '../../types';
import { Megaphone, ChevronLeft, ChevronRight, X, Check, Clock, Heart, MessageSquare, Bell, BellOff, Archive, CheckCircle, Inbox } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../utils/logger';
import ReactionBar from './ReactionBar';

interface MessageInboxProps {
    notifications: BroadcastMessage[];
    onDismiss: (id: string) => void;
    onRead: (id: string) => void;
    readIds: Set<string>;
    className?: string;
}

// Format relative time
const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

/**
 * MessageInbox - Single message display with tabs for New/Read
 * Shows one message at a time, carousel style navigation
 */
const MessageInbox: React.FC<MessageInboxProps> = ({
    notifications,
    onDismiss,
    onRead,
    readIds,
    className = ''
}) => {
    // Explicit filter state - no auto-switching
    const [filterType, setFilterType] = useState<'unread' | 'read'>('unread');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const { interactWithBroadcast } = useData();
    const { showToast } = useToast();

    // Separate notifications into unread and read
    const unreadNotifications = notifications
        .filter(n => !readIds.has(n.id))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const readNotifications = notifications
        .filter(n => readIds.has(n.id))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const currentList = filterType === 'unread' ? unreadNotifications : readNotifications;
    const currentNotification = currentList[currentIndex];

    // Reset index when switching tabs
    useEffect(() => {
        setCurrentIndex(0);
    }, [filterType]);

    // Also reset if list changes significantly
    useEffect(() => {
        if (currentIndex >= currentList.length && currentList.length > 0) {
            setCurrentIndex(currentList.length - 1);
        }
    }, [currentList.length, currentIndex]);

    const handlePrev = () => {
        setCurrentIndex(prev => Math.max(0, prev - 1));
    };

    const handleNext = () => {
        setCurrentIndex(prev => Math.min(currentList.length - 1, prev + 1));
    };

    const handleReaction = async (emoji: string | null) => {
        if (!currentNotification) return;

        setIsProcessing(true);
        try {
            if (emoji) {
                await interactWithBroadcast(currentNotification.id, 'LIKE');
                showToast(`Você reagiu com ${emoji}`, 'success');
            } else {
                showToast('Reação removida', 'info');
            }
        } catch (error) {
            logger.error("[MessageInbox] Error reacting:", error);
            showToast('Erro ao reagir', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMarkAsRead = async () => {
        if (!currentNotification) return;

        setIsProcessing(true);
        try {
            await interactWithBroadcast(currentNotification.id, 'READ');
            onRead(currentNotification.id);
            showToast('Marcado como lido', 'success');

            // Adjust index if needed
            if (currentIndex >= unreadNotifications.length - 1 && currentIndex > 0) {
                setCurrentIndex(prev => prev - 1);
            }
        } catch (error) {
            logger.error("[MessageInbox] Error marking read:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDismiss = () => {
        if (!currentNotification) return;
        onDismiss(currentNotification.id);

        // Adjust index if needed
        if (currentIndex >= currentList.length - 1 && currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    // No notifications at all
    if (notifications.length === 0) {
        return null;
    }

    const totalUnread = unreadNotifications.length;
    const totalRead = readNotifications.length;

    return (
        <div className={`bg-white rounded-2xl border border-stone-200 shadow-sm overflow-visible ${className}`}>
            {/* Header with Tabs */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-gradient-to-r from-stone-50 to-white rounded-t-2xl">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Megaphone size={16} className="text-primary-600" />
                    </div>
                    <h3 className="font-semibold text-stone-800 text-sm">Comunicados</h3>
                </div>

                {/* Explicit Tab Buttons - Clear state management */}
                <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1">
                    <button
                        onClick={() => setFilterType('unread')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterType === 'unread'
                                ? 'bg-white text-primary-700 shadow-sm'
                                : 'text-stone-600 hover:text-stone-800 hover:bg-stone-50'
                            }`}
                    >
                        <Bell size={12} />
                        Novas
                        {totalUnread > 0 && (
                            <span className="px-1.5 py-0.5 bg-primary-500 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
                                {totalUnread}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setFilterType('read')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterType === 'read'
                                ? 'bg-white text-stone-700 shadow-sm'
                                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                            }`}
                    >
                        <Archive size={12} />
                        Lidas
                        {totalRead > 0 && (
                            <span className="px-1.5 py-0.5 bg-stone-300 text-stone-700 text-[10px] font-bold rounded-full min-w-[18px] text-center">
                                {totalRead}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Message Content or Empty State */}
            {currentList.length === 0 ? (
                /* Empty States */
                <div className="p-8 text-center">
                    {filterType === 'unread' ? (
                        /* Cenário A: Aba "Novas" vazia */
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle size={32} className="text-green-500" />
                            </div>
                            <p className="text-base font-semibold text-stone-700 mb-1">
                                Tudo limpo por aqui!
                            </p>
                            <p className="text-sm text-stone-500">
                                Nenhuma nova mensagem do sistema.
                            </p>
                            {totalRead > 0 && (
                                <button
                                    onClick={() => setFilterType('read')}
                                    className="mt-4 text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                                >
                                    <Archive size={12} />
                                    Ver mensagens lidas ({totalRead})
                                </button>
                            )}
                        </div>
                    ) : (
                        /* Cenário B: Aba "Lidas" vazia */
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                                <Inbox size={32} className="text-stone-400" />
                            </div>
                            <p className="text-base font-semibold text-stone-700 mb-1">
                                Nenhuma mensagem arquivada
                            </p>
                            <p className="text-sm text-stone-500">
                                Você ainda não possui mensagens arquivadas.
                            </p>
                            {totalUnread > 0 && (
                                <button
                                    onClick={() => setFilterType('unread')}
                                    className="mt-4 text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                                >
                                    <Bell size={12} />
                                    Ver novas mensagens ({totalUnread})
                                </button>
                            )}
                        </div>
                    )}
                </div>
            ) : currentNotification ? (
                <div className="p-4">
                    {/* Navigation & Counter */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${filterType === 'unread'
                                    ? 'bg-primary-100 text-primary-700'
                                    : 'bg-stone-100 text-stone-600'
                                }`}>
                                {currentIndex + 1} de {currentList.length}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-stone-500">
                                <Clock size={10} />
                                {formatRelativeTime(currentNotification.created_at)}
                            </span>
                            {currentNotification.liked_count && currentNotification.liked_count > 0 && (
                                <span className="flex items-center gap-1 text-[11px] text-rose-500">
                                    <Heart size={10} className="fill-current" />
                                    {currentNotification.liked_count}
                                </span>
                            )}
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handlePrev}
                                disabled={currentIndex === 0}
                                className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={currentIndex === currentList.length - 1}
                                className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={16} />
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1"
                                title="Ocultar"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Message Card */}
                    <div className={`p-4 rounded-xl border transition-all ${filterType === 'unread'
                            ? 'bg-gradient-to-br from-primary-50 to-white border-primary-200'
                            : 'bg-stone-50 border-stone-200'
                        }`}>
                        <h4 className="font-semibold text-stone-900 text-sm mb-1">
                            {currentNotification.title}
                        </h4>
                        <p className="text-stone-700 text-sm leading-relaxed">
                            {currentNotification.message}
                        </p>
                    </div>

                    {/* Actions - Stable Layout */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
                        {/* Reaction Bar - Always same layout */}
                        <ReactionBar
                            notificationId={currentNotification.id}
                            onReact={handleReaction}
                            isProcessing={isProcessing}
                        />

                        {/* Mark as Read (only for unread) */}
                        {filterType === 'unread' && (
                            <button
                                onClick={handleMarkAsRead}
                                disabled={isProcessing}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <Check size={14} />
                                Marcar como lida
                            </button>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default MessageInbox;
