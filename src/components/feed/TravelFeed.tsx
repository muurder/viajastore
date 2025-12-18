import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { BroadcastMessage, BookingWithDetails, Trip, UserRole } from '../../types';
import WelcomeHero from './WelcomeHero';
import MessageInbox from './MessageInbox';
import ActiveTripCard from './ActiveTripCard';
import DiscoveryFeed from './DiscoveryFeed';
import { logger } from '../../utils/logger';

interface TravelFeedProps {
    bookings: BookingWithDetails[];
    favoriteTrips: Trip[];
    myReviews: any[];
    getNavLink: (tab: string) => string;
    onLogout: () => void;
    className?: string;
}

/**
 * TravelFeed - Main feed component for the Client Dashboard
 * Replaces the traditional admin-style dashboard with a modern feed experience
 */
const TravelFeed: React.FC<TravelFeedProps> = ({
    bookings,
    favoriteTrips,
    myReviews,
    getNavLink,
    onLogout,
    className = ''
}) => {
    const { user } = useAuth();
    const { getUserNotifications, getTripById, interactWithBroadcast, trips } = useData();

    const [notifications, setNotifications] = useState<BroadcastMessage[]>([]);
    const [readIds, setReadIds] = useState<Set<string>>(new Set());
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

    // Load read/dismissed IDs from localStorage
    useEffect(() => {
        if (user?.id) {
            const storedRead = localStorage.getItem(`notifications_read_${user.id}`);
            const storedDismissed = localStorage.getItem(`feed_dismissed_${user.id}`);

            if (storedRead) {
                try {
                    setReadIds(new Set(JSON.parse(storedRead)));
                } catch {
                    setReadIds(new Set());
                }
            }

            if (storedDismissed) {
                try {
                    setDismissedIds(new Set(JSON.parse(storedDismissed)));
                } catch {
                    setDismissedIds(new Set());
                }
            }
        }
    }, [user?.id]);

    // Load notifications
    useEffect(() => {
        if (user && (user.role === UserRole.CLIENT || user.role === UserRole.AGENCY || user.role === UserRole.GUIDE)) {
            loadNotifications();
        }
    }, [user]);

    const loadNotifications = async () => {
        if (!user) return;
        try {
            const data = await getUserNotifications(user.id, user.role);
            setNotifications(data);
        } catch (error) {
            logger.error("[TravelFeed] Error loading notifications:", error);
        }
    };

    const handleDismiss = useCallback((id: string) => {
        setDismissedIds(prev => {
            const updated = new Set(prev).add(id);
            if (user?.id) {
                localStorage.setItem(`feed_dismissed_${user.id}`, JSON.stringify([...updated]));
            }
            return updated;
        });
    }, [user?.id]);

    const handleRead = useCallback((id: string) => {
        setReadIds(prev => {
            const updated = new Set(prev).add(id);
            if (user?.id) {
                localStorage.setItem(`notifications_read_${user.id}`, JSON.stringify([...updated]));
            }
            return updated;
        });

        // Also mark as read in backend
        interactWithBroadcast(id, 'READ').catch(err =>
            logger.error("[TravelFeed] Error marking as read:", err)
        );
    }, [user?.id, interactWithBroadcast]);

    // Filter notifications - show all except dismissed ones
    // Read notifications still appear but with visual indicator
    const visibleNotifications = notifications.filter(n =>
        !dismissedIds.has(n.id)
    );

    // Get upcoming trips (confirmed, future date)
    const upcomingBookings = bookings
        .filter(b => {
            if (b.status !== 'CONFIRMED') return false;
            const trip = getTripById(b.tripId);
            if (!trip?.startDate) return false;
            return new Date(trip.startDate) > new Date();
        })
        .sort((a, b) => {
            const tripA = getTripById(a.tripId);
            const tripB = getTripById(b.tripId);
            return new Date(tripA?.startDate || 0).getTime() - new Date(tripB?.startDate || 0).getTime();
        })
        .slice(0, 2); // Show up to 2 upcoming trips

    const userName = user?.name || 'Viajante';
    const userAvatar = user?.avatar;

    return (
        <div className={`${className}`}>
            {/* Main Feed Content - Full width */}
            <div className="space-y-6">

                {/* Welcome Hero */}
                <WelcomeHero
                    userName={userName}
                    userAvatar={userAvatar}
                    stats={{
                        totalTrips: bookings.length,
                        upcomingTrips: upcomingBookings.length
                    }}
                    trips={trips}
                />

                {/* Message Inbox - Comunicados */}
                {visibleNotifications.length > 0 && (
                    <MessageInbox
                        notifications={visibleNotifications}
                        onDismiss={handleDismiss}
                        onRead={handleRead}
                        readIds={readIds}
                    />
                )}

                {/* Active Trips */}
                {upcomingBookings.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide px-1">
                            🎫 Suas próximas viagens
                        </h3>
                        {upcomingBookings.map(booking => {
                            const trip = getTripById(booking.tripId);

                            if (!trip) return null;

                            return (
                                <ActiveTripCard
                                    key={booking.id}
                                    booking={booking}
                                    trip={trip}
                                    agency={null}
                                />
                            );
                        })}
                    </div>
                )}

                {/* Discovery Feed */}
                <DiscoveryFeed
                    limit={3}
                    excludeTripIds={upcomingBookings.map(b => b.tripId)}
                />
            </div>
        </div>
    );
};

export default TravelFeed;
