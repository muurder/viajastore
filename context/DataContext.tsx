
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Trip, Agency, Booking, Review, Client, UserRole, User } from '../types';
import { MOCK_TRIPS, MOCK_AGENCIES, MOCK_BOOKINGS, MOCK_REVIEWS, MOCK_CLIENTS } from '../services/mockData';
import { useAuth } from './AuthContext';

// Increment this version to force a reset of localStorage data on client browsers
const DATA_VERSION = 'v3-mega-update'; 

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

  // Helper to initialize data with version check
  const initializeData = <T,>(key: string, mockData: T): T => {
    const storedVersion = localStorage.getItem('vs_data_version');
    
    if (storedVersion !== DATA_VERSION) {
      // Version mismatch: Clear old data and return mock
      // We only set the version once at the end of initialization, 
      // but since this runs for each state, we rely on the check.
      // To be safe, we just return mockData here. The version set happens in useEffect.
      return mockData;
    }

    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : mockData;
  };

  const [trips, setTrips] = useState<Trip[]>(() => initializeData('vs_trips', MOCK_TRIPS));
  const [agencies, setAgencies] = useState<Agency[]>(() => initializeData('vs_agencies', MOCK_AGENCIES));
  const [bookings, setBookings] = useState<Booking[]>(() => initializeData('vs_bookings', MOCK_BOOKINGS));
  const [reviews, setReviews] = useState<Review[]>(() => initializeData('vs_reviews', MOCK_REVIEWS));
  const [clients, setClients] = useState<Client[]>(() => initializeData('vs_clients', MOCK_CLIENTS));

  // Effect to handle version update and clearing only once on mount
  useEffect(() => {
    const storedVersion = localStorage.getItem('vs_data_version');
    if (storedVersion !== DATA_VERSION) {
      localStorage.setItem('vs_data_version', DATA_VERSION);
      // Force refresh state to mocks if we just detected a version change
      // (Optional if the initializers worked, but good for safety)
      setTrips(MOCK_TRIPS);
      setAgencies(MOCK_AGENCIES);
      setClients(MOCK_CLIENTS);
      // We usually keep bookings/reviews empty or mock defaults on reset
      setBookings(MOCK_BOOKINGS);
      setReviews(MOCK_REVIEWS);
    }
  }, []);

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
