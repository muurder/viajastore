import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Trip, Agency, Booking, Review, Client } from '../types';
import { MOCK_TRIPS, MOCK_AGENCIES, MOCK_BOOKINGS, MOCK_REVIEWS, MOCK_CLIENTS } from '../services/mockData';

interface DataContextType {
  trips: Trip[];
  agencies: Agency[];
  bookings: Booking[];
  reviews: Review[];
  clients: Client[];
  
  // Actions
  addBooking: (booking: Booking) => void;
  addReview: (review: Review) => void;
  toggleFavorite: (tripId: string, clientId: string) => void;
  
  // Agency Actions
  updateAgencySubscription: (agencyId: string, status: 'ACTIVE' | 'INACTIVE', plan: 'BASIC' | 'PREMIUM') => void;
  createTrip: (trip: Trip) => void;
  updateTrip: (trip: Trip) => void;
  deleteTrip: (tripId: string) => void;
  
  // Getters
  getPublicTrips: () => Trip[]; // Filters out inactive agency trips
  getAgencyTrips: (agencyId: string) => Trip[];
  getTripById: (id: string) => Trip | undefined;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [trips, setTrips] = useState<Trip[]>(MOCK_TRIPS);
  const [agencies, setAgencies] = useState<Agency[]>(MOCK_AGENCIES);
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const [reviews, setReviews] = useState<Review[]>(MOCK_REVIEWS);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);

  // Helper: Check if agency has active subscription
  const isAgencyActive = (agencyId: string) => {
    const agency = agencies.find(a => a.id === agencyId);
    if (!agency) return false;
    
    // Check if date is expired
    const now = new Date();
    const expires = new Date(agency.subscriptionExpiresAt);
    
    return agency.subscriptionStatus === 'ACTIVE' && expires > now;
  };

  const getPublicTrips = () => {
    return trips.filter(trip => {
      // Trip must be manually active AND agency must be subscription active
      return trip.active && isAgencyActive(trip.agencyId);
    });
  };

  const getAgencyTrips = (agencyId: string) => {
    return trips.filter(t => t.agencyId === agencyId);
  };

  const getTripById = (id: string) => trips.find(t => t.id === id);

  const addBooking = (booking: Booking) => {
    setBookings(prev => [...prev, booking]);
  };

  const addReview = (review: Review) => {
    setReviews(prev => [...prev, review]);
    // Update trip rating logic would go here in a real app
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

  const updateAgencySubscription = (agencyId: string, status: 'ACTIVE' | 'INACTIVE', plan: 'BASIC' | 'PREMIUM') => {
    setAgencies(prev => prev.map(a => {
      if (a.id === agencyId) {
        const newExpiry = new Date();
        newExpiry.setMonth(newExpiry.getMonth() + 1); // Add 1 month
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
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const isFav = c.favorites.includes(tripId);
        return {
          ...c,
          favorites: isFav ? c.favorites.filter(id => id !== tripId) : [...c.favorites, tripId]
        };
      }
      return c;
    }));
  };

  return (
    <DataContext.Provider value={{
      trips,
      agencies,
      bookings,
      reviews,
      clients,
      addBooking,
      addReview,
      toggleFavorite,
      updateAgencySubscription,
      createTrip,
      updateTrip,
      deleteTrip,
      getPublicTrips,
      getAgencyTrips,
      getTripById
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