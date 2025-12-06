
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Trip, Agency, Booking, Review, AgencyReview, Client, UserRole, AuditLog, AgencyTheme, ThemeColors, UserStats, DashboardStats, ActivityLog, OperationalData } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { MOCK_AGENCIES, MOCK_TRIPS, MOCK_BOOKINGS, MOCK_REVIEWS, MOCK_CLIENTS } from '../services/mockData';
import { useToast } from './ToastContext';

interface DataContextType {
  trips: Trip[];
  agencies: Agency[];
  bookings: Booking[];
  reviews: Review[];
  agencyReviews: AgencyReview[];
  clients: Client[];
  auditLogs: AuditLog[];
  activityLogs: ActivityLog[];
  loading: boolean;
  addBooking: (booking: Booking) => Promise<Booking | undefined>;
  addReview: (review: Review) => Promise<void>;
  addAgencyReview: (review: Partial<AgencyReview>) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
  deleteAgencyReview: (id: string) => Promise<void>;
  updateAgencyReview: (id: string, updates: Partial<AgencyReview>) => Promise<void>;
  toggleFavorite: (tripId: string, userId: string) => Promise<void>;
  updateClientProfile: (userId: string, data: Partial<Client>) => Promise<void>;
  updateAgencySubscription: (agencyId: string, status: string, plan: string, expiresAt?: string) => Promise<void>;
  updateAgencyProfileByAdmin: (agencyId: string, data: Partial<Agency>) => Promise<void>;
  toggleAgencyStatus: (agencyId: string) => Promise<void>;
  createTrip: (trip: Trip) => Promise<void>;
  updateTrip: (trip: Trip) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  toggleTripStatus: (tripId: string) => Promise<void>;
  toggleTripFeatureStatus: (tripId: string) => Promise<void>;
  updateTripOperationalData: (tripId: string, data: OperationalData) => Promise<void>;
  softDeleteEntity: (id: string, table: string) => Promise<void>;
  restoreEntity: (id: string, table: string) => Promise<void>;
  deleteUser: (id: string, role: string) => Promise<void>;
  deleteMultipleUsers: (ids: string[]) => Promise<void>;
  deleteMultipleAgencies: (ids: string[]) => Promise<void>;
  getUsersStats: (userIds: string[]) => Promise<UserStats[]>;
  updateMultipleUsersStatus: (ids: string[], status: string) => Promise<void>;
  updateMultipleAgenciesStatus: (ids: string[], status: string) => Promise<void>;
  logAuditAction: (action: string, details: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateUserAvatarByAdmin: (userId: string, file: File) => Promise<string | null>;
  getPublicTrips: () => Trip[];
  getAgencyPublicTrips: (agencyId: string) => Trip[];
  getAgencyTrips: (agencyId: string) => Trip[];
  getTripById: (id: string) => Trip | undefined;
  getTripBySlug: (slug: string) => Trip | undefined;
  getAgencyBySlug: (slug: string) => Agency | undefined;
  getReviewsByTripId: (tripId: string) => Review[];
  getReviewsByAgencyId: (agencyId: string) => AgencyReview[];
  getReviewsByClientId: (clientId: string) => AgencyReview[];
  hasUserPurchasedTrip: (userId: string, tripId: string) => boolean;
  getAgencyStats: (agencyId: string) => DashboardStats;
  getAgencyTheme: (agencyId: string) => Promise<AgencyTheme | null>;
  saveAgencyTheme: (agencyId: string, colors: ThemeColors) => Promise<boolean>;
  refreshData: () => Promise<void>;
  incrementTripViews: (tripId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [trips, setTrips] = useState<Trip[]>(MOCK_TRIPS);
  const [agencies, setAgencies] = useState<Agency[]>(MOCK_AGENCIES);
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const [agencyReviews, setAgencyReviews] = useState<AgencyReview[]>([]);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
        setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const guardSupabase = () => {
    if (!supabase) {
      showToast('Funcionalidade indisponível no modo offline.', 'info');
      throw new Error('Supabase client not available.');
    }
    return supabase;
  };

  const updateTripOperationalData = async (tripId: string, data: OperationalData) => {
    setTrips(prev => prev.map(t => t.id === tripId ? { ...t, operationalData: data } : t));
    try {
        if (supabase) {
            const { error } = await supabase.from('trips').update({ operational_data: data }).eq('id', tripId);
            if (error) throw error;
        }
    } catch (error) {
        console.error(error);
        showToast('Erro ao salvar dados operacionais no backend (modo local mantido).', 'warning');
    }
  };

  const values: DataContextType = {
    trips, agencies, bookings, reviews: MOCK_REVIEWS, agencyReviews, clients, auditLogs, activityLogs, loading,
    addBooking: async (b) => { setBookings([...bookings, b]); return b; },
    addReview: async () => {},
    addAgencyReview: async (r) => {
        const newReview: AgencyReview = {
            id: crypto.randomUUID(),
            agencyId: r.agencyId!,
            clientId: r.clientId!,
            rating: r.rating!,
            comment: r.comment!,
            createdAt: new Date().toISOString(),
            ...r
        };
        setAgencyReviews([...agencyReviews, newReview]);
    },
    deleteReview: async () => {},
    deleteAgencyReview: async (id) => setAgencyReviews(prev => prev.filter(r => r.id !== id)),
    updateAgencyReview: async (id, updates) => setAgencyReviews(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r)),
    toggleFavorite: async (tripId, userId) => {
        setClients(prev => prev.map(c => c.id === userId ? { ...c, favorites: c.favorites.includes(tripId) ? c.favorites.filter(id => id !== tripId) : [...c.favorites, tripId] } : c));
    },
    updateClientProfile: async (userId, data) => setClients(prev => prev.map(c => c.id === userId ? { ...c, ...data } : c)),
    updateAgencySubscription: async (agencyId, status, plan, expiresAt) => setAgencies(prev => prev.map(a => a.agencyId === agencyId ? { ...a, subscriptionStatus: status as any, subscriptionPlan: plan as any, subscriptionExpiresAt: expiresAt || a.subscriptionExpiresAt } : a)),
    updateAgencyProfileByAdmin: async (agencyId, data) => setAgencies(prev => prev.map(a => a.agencyId === agencyId ? { ...a, ...data } : a)),
    toggleAgencyStatus: async (agencyId) => setAgencies(prev => prev.map(a => a.agencyId === agencyId ? { ...a, subscriptionStatus: a.subscriptionStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : a)),
    createTrip: async (t) => setTrips([...trips, t]),
    updateTrip: async (t) => setTrips(prev => prev.map(trip => trip.id === t.id ? t : trip)),
    deleteTrip: async (id) => setTrips(prev => prev.filter(t => t.id !== id)),
    toggleTripStatus: async (id) => setTrips(prev => prev.map(t => t.id === id ? { ...t, is_active: !t.is_active } : t)),
    toggleTripFeatureStatus: async (id) => setTrips(prev => prev.map(t => t.id === id ? { ...t, featured: !t.featured } : t)),
    updateTripOperationalData,
    softDeleteEntity: async () => {},
    restoreEntity: async () => {},
    deleteUser: async (id) => setClients(prev => prev.filter(c => c.id !== id)),
    deleteMultipleUsers: async (ids) => setClients(prev => prev.filter(c => !ids.includes(c.id))),
    deleteMultipleAgencies: async (ids) => setAgencies(prev => prev.filter(a => !ids.includes(a.agencyId))),
    getUsersStats: async () => [],
    updateMultipleUsersStatus: async () => {},
    updateMultipleAgenciesStatus: async () => {},
    logAuditAction: async () => {},
    sendPasswordReset: async () => {},
    updateUserAvatarByAdmin: async () => null,
    getPublicTrips: () => trips.filter(t => t.is_active),
    getAgencyPublicTrips: (id) => trips.filter(t => t.agencyId === id && t.is_active),
    getAgencyTrips: (id) => trips.filter(t => t.agencyId === id),
    getTripById: (id) => trips.find(t => t.id === id),
    getTripBySlug: (slug) => trips.find(t => t.slug === slug),
    getAgencyBySlug: (slug) => agencies.find(a => a.slug === slug),
    getReviewsByTripId: () => [],
    getReviewsByAgencyId: (id) => agencyReviews.filter(r => r.agencyId === id),
    getReviewsByClientId: (id) => agencyReviews.filter(r => r.clientId === id),
    hasUserPurchasedTrip: () => false,
    getAgencyStats: () => ({ totalRevenue: 0, totalViews: 0, totalSales: 0, conversionRate: 0, averageRating: 0, totalReviews: 0 }),
    getAgencyTheme: async () => null,
    saveAgencyTheme: async () => false,
    refreshData: async () => {},
    incrementTripViews: async () => {}
  };

  return (
    <DataContext.Provider value={values}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
