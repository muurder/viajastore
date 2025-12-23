import { useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';

/**
 * Custom hook for AdminDashboard data management
 * Centralizes all data fetching, computed stats, and data transformations
 */
export const useAdminDashboardData = () => {
    const {
        clients,
        agencies,
        trips,
        bookings,
        agencyReviews,
        broadcasts
    } = useData();

    const { user } = useAuth();

    // Compute aggregated statistics
    const stats = useMemo(() => {
        const activeUsers = clients?.filter(c => c.status === 'ACTIVE').length || 0;
        const activeAgencies = agencies?.filter(a => a.subscriptionStatus === 'ACTIVE').length || 0;
        const totalRevenue = bookings?.reduce((sum, b) => sum + (b.totalPrice || 0), 0) || 0;
        const totalTrips = trips?.length || 0;
        const totalBookings = bookings?.length || 0;

        return {
            totalUsers: clients?.length || 0,
            activeUsers,
            suspendedUsers: (clients?.length || 0) - activeUsers,
            totalAgencies: agencies?.length || 0,
            activeAgencies,
            premiumAgencies: agencies?.filter(a => a.subscriptionPlan === 'PREMIUM').length || 0,
            totalRevenue,
            averageBookingValue: totalBookings > 0 ? totalRevenue / totalBookings : 0,
            totalTrips,
            activeTrips: trips?.filter(t => t.status === 'ACTIVE').length || 0,
            totalBookings,
            confirmedBookings: bookings?.filter(b => b.status === 'CONFIRMED').length || 0,
            totalReviews: agencyReviews?.length || 0,
            averageRating: agencyReviews?.length
                ? agencyReviews.reduce((sum, r) => sum + r.rating, 0) / agencyReviews.length
                : 0,
            totalBroadcasts: broadcasts?.length || 0
        };
    }, [clients, agencies, trips, bookings, agencyReviews, broadcasts]);

    // User-specific data
    const currentUser = user;

    return {
        // Raw data from context
        clients: clients || [],
        agencies: agencies || [],
        trips: trips || [],
        bookings: bookings || [],
        agencyReviews: agencyReviews || [],
        broadcasts: broadcasts || [],

        // Computed stats
        stats,

        // Current user
        currentUser
    };
};
