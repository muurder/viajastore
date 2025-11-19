
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Trip, Agency, Booking, Review, Client, UserRole, User } from '../types';
import { MOCK_TRIPS, MOCK_AGENCIES, MOCK_BOOKINGS, MOCK_REVIEWS, MOCK_CLIENTS } from '../services/mockData';
import { useAuth } from './AuthContext';

interface DashboardStats {
  totalRevenue: number;
  totalViews: number;
  totalSales: number;
  conversionRate: number;
}

interface DataContextType {
  trips: Trip[];
  agencies: Agency[];
  bookings: Booking[];
  reviews: Review[];
  clients: Client[];
  
  addBooking: (booking: Booking) => void;
  addReview: (review: Review) => void;
  deleteReview: (reviewId: string) => void;
  toggleFavorite: (tripId: string, clientId: string) => void;
  updateClientProfile: (clientId: string, data: Partial<Client>) => void;
  
  updateAgencySubscription: (agencyId: string, status: 'ACTIVE' | 'INACTIVE', plan: 'BASIC' | 'PREMIUM') => void;
  createTrip: (trip: Trip) => void;
  updateTrip: (trip: Trip) => void;
  deleteTrip: (tripId: string) => void;
  toggleTripStatus: (tripId: string) => void; 
  
  getPublicTrips: () => Trip[]; 
  getAgencyPublicTrips: (agencyId: string) => Trip[];
  getAgencyTrips: (agencyId: string) => Trip[]; 
  getTripById: (id: string) => Trip | undefined;
  getReviewsByTripId: (tripId: string) => Review[];
  hasUserPurchasedTrip: (userId: string, tripId: string) => boolean;
  getAgencyStats: (agencyId: string) => DashboardStats;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, updateUser } = useAuth(); // To sync favorite changes to session

  // Initialize State from LocalStorage with fallback to Mock Data
  const [trips, setTrips] = useState<Trip[]>(() => {
    const s = localStorage.getItem('vs_trips');
    return s ? JSON.parse(s) : MOCK_TRIPS;
  });

  // Sync agencies/clients with what AuthContext uses (same keys)
  const [agencies, setAgencies] = useState<Agency[]>(() => {
    const s = localStorage.getItem('vs_agencies');
    return s ? JSON.parse(s) : MOCK_AGENCIES;
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const s = localStorage.getItem('vs_bookings');
    return s ? JSON.parse(s) : MOCK_BOOKINGS;
  });

  const [reviews, setReviews] = useState<Review[]>(() => {
    const s = localStorage.getItem('vs_reviews');
    return s ? JSON.parse(s) : MOCK_REVIEWS;
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const s = localStorage.getItem('vs_clients');
    return s ? JSON.parse(s) : MOCK_CLIENTS;
  });

  // Persistence Effects
  useEffect(() => localStorage.setItem('vs_trips', JSON.stringify(trips)), [trips]);
  useEffect(() => localStorage.setItem('vs_bookings', JSON.stringify(bookings)), [bookings]);
  useEffect(() => localStorage.setItem('vs_reviews', JSON.stringify(reviews)), [reviews]);
  useEffect(() => localStorage.setItem('vs_clients', JSON.stringify(clients)), [clients]);
  useEffect(() => localStorage.setItem('vs_agencies', JSON.stringify(agencies)), [agencies]);

  const isAgencyActive = (agencyId: string) => {
    const agency = agencies.find(a => a.id === agencyId);
    if (!agency) return false;
    const now = new Date();
    const expires = new Date(agency.subscriptionExpiresAt);
    return agency.subscriptionStatus === 'ACTIVE' && expires > now;
  };

  const getPublicTrips = () => {
    return trips.filter(trip => trip.active && isAgencyActive(trip.agencyId));
  };

  const getAgencyPublicTrips = (agencyId: string) => {
    if (!isAgencyActive(agencyId)) return [];
    return trips.filter(t => t.agencyId === agencyId && t.active);
  };

  const getAgencyTrips = (agencyId: string) => {
    return trips.filter(t => t.agencyId === agencyId);
  };

  const getTripById = (id: string) => trips.find(t => t.id === id);

  const getReviewsByTripId = (tripId: string) => reviews.filter(r => r.tripId === tripId);

  const hasUserPurchasedTrip = (userId: string, tripId: string) => {
    return bookings.some(b => b.clientId === userId && b.tripId === tripId && b.status === 'CONFIRMED');
  };

  const addBooking = (booking: Booking) => {
    setBookings(prev => [...prev, booking]);
    // Increment sales counter on trip
    setTrips(prev => prev.map(t => t.id === booking.tripId ? { ...t, sales: (t.sales || 0) + 1 } : t));
  };

  const addReview = (review: Review) => {
    setReviews(prev => [...prev, review]);
    const tripReviews = [...reviews.filter(r => r.tripId === review.tripId), review];
    const avg = tripReviews.reduce((acc, curr) => acc + curr.rating, 0) / tripReviews.length;
    setTrips(prev => prev.map(t => t.id === review.tripId ? { ...t, rating: avg, totalReviews: tripReviews.length } : t));
  };

  const deleteReview = (reviewId: string) => {
     setReviews(prev => prev.filter(r => r.id !== reviewId));
  };

  const createTrip = (trip: Trip) => {
    setTrips(prev => [...prev, trip]);
  };

  const updateTrip = (updatedTrip: Trip) => {
    setTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));
  };

  const deleteTrip = (tripId: string) => {
    setTrips(prev => prev.filter(t => t.id !== tripId));
  };

  const toggleTripStatus = (tripId: string) => {
    setTrips(prev => prev.map(t => t.id === tripId ? { ...t, active: !t.active } : t));
  };

  const updateAgencySubscription = (agencyId: string, status: 'ACTIVE' | 'INACTIVE', plan: 'BASIC' | 'PREMIUM') => {
    setAgencies(prev => prev.map(a => {
      if (a.id === agencyId) {
        const newExpiry = new Date();
        if (status === 'ACTIVE') newExpiry.setMonth(newExpiry.getMonth() + 1); 
        return {
          ...a,
          subscriptionStatus: status,
          subscriptionPlan: plan,
          subscriptionExpiresAt: status === 'ACTIVE' ? newExpiry.toISOString() : a.subscriptionExpiresAt
        };
      }
      return a;
    }));
  };

  const toggleFavorite = (tripId: string, clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const isFav = client.favorites.includes(tripId);
    const newFavorites = isFav 
        ? client.favorites.filter(id => id !== tripId)
        : [...client.favorites, tripId];
    
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, favorites: newFavorites } : c));
    
    // Sync with Auth Context if current user is this client
    if (user && user.id === clientId) {
        updateUser({ favorites: newFavorites } as Partial<User>);
    }
  };

  const updateClientProfile = (clientId: string, data: Partial<Client>) => {
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, ...data } : c));
  };

  const getAgencyStats = (agencyId: string): DashboardStats => {
     const agencyTrips = trips.filter(t => t.agencyId === agencyId);
     const agencyBookings = bookings.filter(b => agencyTrips.find(t => t.id === b.tripId));
     
     const totalRevenue = agencyBookings.reduce((acc, curr) => acc + curr.totalPrice, 0);
     const totalSales = agencyBookings.length;
     const totalViews = agencyTrips.reduce((acc, curr) => acc + (curr.views || 0), 0);
     // Fake conversation rate calculation
     const conversionRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;

     return { totalRevenue, totalSales, totalViews, conversionRate };
  };

  return (
    <DataContext.Provider value={{
      trips, agencies, bookings, reviews, clients,
      addBooking, addReview, deleteReview, toggleFavorite, updateClientProfile,
      updateAgencySubscription, createTrip, updateTrip, deleteTrip, toggleTripStatus,
      getPublicTrips, getAgencyPublicTrips, getAgencyTrips, getTripById, getReviewsByTripId,
      hasUserPurchasedTrip, getAgencyStats
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};