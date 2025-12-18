import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { BroadcastMessage, UserRole } from '../types';
import { Info, X, ArrowRight, Sparkles } from 'lucide-react';
import { logger } from '../utils/logger';

interface BroadcastSpotlightProps {
    className?: string;
}

/**
 * BroadcastSpotlight - Premium slim card that appears at the top of dashboards
 * Shows the most recent unread notification as a highlight
 * Can be dismissed and will persist the dismissal in localStorage
 */
const BroadcastSpotlight: React.FC<BroadcastSpotlightProps> = ({ className = '' }) => {
    const { user } = useAuth();
    const { getUserNotifications, interactWithBroadcast } = useData();

    const [latestNotification, setLatestNotification] = useState<BroadcastMessage | null>(null);
    const [isDismissed, setIsDismissed] = useState(false);
    const [loading, setLoading] = useState(true);

    // Get dismissed IDs from localStorage
    const getDismissedIds = (): Set<string> => {
        if (!user?.id) return new Set();
        const stored = localStorage.getItem(`broadcast_spotlight_dismissed_${user.id}`);
        if (stored) {
            try {
                return new Set(JSON.parse(stored));
            } catch {
                return new Set();
            }
        }
        return new Set();
    };

    // Save dismissed IDs to localStorage
    const saveDismissedId = (id: string) => {
        if (!user?.id) return;
        const dismissed = getDismissedIds();
        dismissed.add(id);
        localStorage.setItem(`broadcast_spotlight_dismissed_${user.id}`, JSON.stringify([...dismissed]));
    };

    useEffect(() => {
        if (user && (user.role === UserRole.CLIENT || user.role === UserRole.AGENCY || user.role === UserRole.GUIDE)) {
            loadLatestNotification();
        } else {
            setLoading(false);
        }
    }, [user]);

    const loadLatestNotification = async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            const data = await getUserNotifications(user.id, user.role);
            const dismissedIds = getDismissedIds();

            // Get read IDs from localStorage
            const readIdsStored = localStorage.getItem(`notifications_read_${user.id}`);
            const readIds = readIdsStored ? new Set(JSON.parse(readIdsStored)) : new Set();

            // Find the most recent unread and not dismissed notification
            const unreadNotifications = data.filter(n =>
                !readIds.has(n.id) && !dismissedIds.has(n.id)
            );

            if (unreadNotifications.length > 0) {
                // Sort by created_at descending and get the first one
                const sorted = [...unreadNotifications].sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                setLatestNotification(sorted[0]);
            } else {
                setLatestNotification(null);
            }
        } catch (error: any) {
            logger.error("[BroadcastSpotlight] Error loading notifications:", error);
            setLatestNotification(null);
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = () => {
        if (latestNotification) {
            saveDismissedId(latestNotification.id);
        }
        setIsDismissed(true);
    };

    const handleRead = async () => {
        if (!latestNotification) return;

        try {
            await interactWithBroadcast(latestNotification.id, 'READ');

            // Mark as read in localStorage
            const readIdsStored = localStorage.getItem(`notifications_read_${user?.id}`);
            const readIds = readIdsStored ? new Set(JSON.parse(readIdsStored)) : new Set();
            readIds.add(latestNotification.id);
            localStorage.setItem(`notifications_read_${user?.id}`, JSON.stringify([...readIds]));
        } catch (error) {
            logger.error("[BroadcastSpotlight] Error marking as read:", error);
        }

        setIsDismissed(true);
    };

    // Don't render if not applicable
    if (!user || (user.role !== UserRole.CLIENT && user.role !== UserRole.AGENCY && user.role !== UserRole.GUIDE)) {
        return null;
    }

    // Don't render while loading
    if (loading) {
        return null;
    }

    // Don't render if no notification or dismissed
    if (!latestNotification || isDismissed) {
        return null;
    }

    return (
        <div className={`relative overflow-hidden bg-white border border-stone-200 border-l-4 border-l-primary-500 rounded-xl shadow-sm ${className}`}>
            {/* Subtle gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary-50/50 to-transparent pointer-events-none" />

            <div className="relative flex items-center gap-4 px-5 py-4">
                {/* Icon */}
                <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <Sparkles size={20} className="text-primary-600" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">
                        {latestNotification.title}
                    </p>
                    <p className="text-sm text-stone-500 truncate">
                        {latestNotification.message.substring(0, 80)}{latestNotification.message.length > 80 ? '...' : ''}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                        onClick={handleRead}
                        className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                    >
                        Ler
                        <ArrowRight size={14} />
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-all"
                        aria-label="Fechar"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BroadcastSpotlight;
