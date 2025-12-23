import { useState, useMemo, useCallback } from 'react';
import { Agency, Client, Trip } from '../../../types';

/**
 * Custom hook for managing filters and search in AdminDashboard
 * Handles all filter states and filtering logic
 */
export const useAdminFilters = () => {
    // Search queries
    const [userSearch, setUserSearch] = useState('');
    const [agencySearch, setAgencySearch] = useState('');
    const [tripSearch, setTripSearch] = useState('');

    // Filter states
    const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
    const [agencyStatusFilter, setAgencyStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
    const [agencyPlanFilter, setAgencyPlanFilter] = useState<'ALL' | 'FREE' | 'BASIC' | 'PREMIUM'>('ALL');
    const [tripStatusFilter, setTripStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

    // Show trash toggles
    const [showUserTrash, setShowUserTrash] = useState(false);
    const [showAgencyTrash, setShowAgencyTrash] = useState(false);
    const [showTripTrash, setShowTripTrash] = useState(false);

    /**
     * Filter users based on search and filters
     */
    const filterUsers = useCallback((users: Client[]) => {
        return users.filter(user => {
            // Search filter
            const searchMatch = !userSearch ||
                user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                user.email.toLowerCase().includes(userSearch.toLowerCase());

            // Status filter
            const statusMatch = userStatusFilter === 'ALL' || user.status === userStatusFilter;

            // Trash filter
            const trashMatch = showUserTrash
                ? user.deletedAt !== null && user.deletedAt !== undefined
                : !user.deletedAt;

            return searchMatch && statusMatch && trashMatch;
        });
    }, [userSearch, userStatusFilter, showUserTrash]);

    /**
     * Filter agencies based on search and filters
     */
    const filterAgencies = useCallback((agencies: Agency[]) => {
        return agencies.filter(agency => {
            // Search filter
            const searchMatch = !agencySearch ||
                agency.name.toLowerCase().includes(agencySearch.toLowerCase()) ||
                (agency.email && agency.email.toLowerCase().includes(agencySearch.toLowerCase()));

            // Status filter
            const statusMatch = agencyStatusFilter === 'ALL' || agency.subscriptionStatus === agencyStatusFilter;

            // Plan filter
            const planMatch = agencyPlanFilter === 'ALL' || agency.subscriptionPlan === agencyPlanFilter;

            // Trash filter
            const trashMatch = showAgencyTrash
                ? agency.deletedAt !== null && agency.deletedAt !== undefined
                : !agency.deletedAt;

            return searchMatch && statusMatch && planMatch && trashMatch;
        });
    }, [agencySearch, agencyStatusFilter, agencyPlanFilter, showAgencyTrash]);

    /**
     * Filter trips based on search and filters
     */
    const filterTrips = useCallback((trips: Trip[]) => {
        return trips.filter(trip => {
            // Search filter
            const searchMatch = !tripSearch ||
                trip.title.toLowerCase().includes(tripSearch.toLowerCase()) ||
                (trip.destination && trip.destination.toLowerCase().includes(tripSearch.toLowerCase()));

            // Status filter
            const statusMatch = tripStatusFilter === 'ALL' || trip.status === tripStatusFilter;

            // Trash filter
            const trashMatch = showTripTrash
                ? trip.deletedAt !== null && trip.deletedAt !== undefined
                : !trip.deletedAt;

            return searchMatch && statusMatch && trashMatch;
        });
    }, [tripSearch, tripStatusFilter, showTripTrash]);

    /**
     * Reset all filters to default
     */
    const resetAllFilters = useCallback(() => {
        setUserSearch('');
        setAgencySearch('');
        setTripSearch('');
        setUserStatusFilter('ALL');
        setAgencyStatusFilter('ALL');
        setAgencyPlanFilter('ALL');
        setTripStatusFilter('ALL');
        setShowUserTrash(false);
        setShowAgencyTrash(false);
        setShowTripTrash(false);
    }, []);

    /**
     * Reset user filters
     */
    const resetUserFilters = useCallback(() => {
        setUserSearch('');
        setUserStatusFilter('ALL');
        setShowUserTrash(false);
    }, []);

    /**
     * Reset agency filters
     */
    const resetAgencyFilters = useCallback(() => {
        setAgencySearch('');
        setAgencyStatusFilter('ALL');
        setAgencyPlanFilter('ALL');
        setShowAgencyTrash(false);
    }, []);

    /**
     * Reset trip filters
     */
    const resetTripFilters = useCallback(() => {
        setTripSearch('');
        setTripStatusFilter('ALL');
        setShowTripTrash(false);
    }, []);

    return {
        // Search states
        userSearch,
        agencySearch,
        tripSearch,
        setUserSearch,
        setAgencySearch,
        setTripSearch,

        // Filter states
        userStatusFilter,
        agencyStatusFilter,
        agencyPlanFilter,
        tripStatusFilter,
        setUserStatusFilter,
        setAgencyStatusFilter,
        setAgencyPlanFilter,
        setTripStatusFilter,

        // Trash toggles
        showUserTrash,
        showAgencyTrash,
        showTripTrash,
        setShowUserTrash,
        setShowAgencyTrash,
        setShowTripTrash,

        // Filter functions
        filterUsers,
        filterAgencies,
        filterTrips,

        // Reset functions
        resetAllFilters,
        resetUserFilters,
        resetAgencyFilters,
        resetTripFilters
    };
};
