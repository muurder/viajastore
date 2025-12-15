import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

export const useAgencyData = () => {
    const { user } = useAuth();
    const { agencies, trips, bookings, agencyReviews } = useData();

    const currentAgency = useMemo(() => {
        return agencies.find(a => a.id === user?.id);
    }, [agencies, user]);

    const myTrips = useMemo(() => {
        if (!currentAgency) return [];
        return trips.filter(t => t.agencyId === currentAgency.agencyId);
    }, [trips, currentAgency]);

    const myBookings = useMemo(() => {
        // DataContext handles fetching the correct bookings for the logged-in user
        if (!currentAgency) return [];
        // Double check they belong to agency trips just in case
        const myTripIds = new Set(myTrips.map(t => t.id));
        return bookings.filter(b => myTripIds.has(b.tripId));
    }, [bookings, myTrips, currentAgency]);

    // Filter reviews specific to this agency
    const myReviews = useMemo(() => {
        if (!currentAgency) return [];
        return agencyReviews.filter(r => r.agencyId === currentAgency.agencyId);
    }, [agencyReviews, currentAgency]);

    return {
        currentAgency,
        myTrips,
        myBookings,
        agencyReviews: myReviews
    };
};
