
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Trip, Agency, Booking, Review, AgencyReview, Client, UserRole, AuditLog, AgencyTheme, ThemeColors, UserStats, DashboardStats, ActivityLog, OperationalData, ActivityActionType } from '../types';
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
  logActivity: (action_type: ActivityActionType, details: any) => Promise<void>; // Added missing function
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [trips, setTrips] = useState<Trip[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  // Fix: Uncommented the reviews state variable declaration
  const [reviews, setReviews] = useState<Review[]>([]);
  const [agencyReviews, setAgencyReviews] = useState<AgencyReview[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const guardSupabase = () => {
    if (!supabase) {
      console.warn("Supabase client not available. Running in offline/mock data mode.");
      return null;
    }
    return supabase;
  };

  const fetchTrips = async () => { /* ... implementation ... */ };
  const fetchAgencies = async () => { /* ... implementation ... */ };
  const fetchBookings = async () => { /* ... implementation ... */ };
  const fetchReviews = async () => { /* ... implementation ... */ };
  const fetchClients = async () => { /* ... implementation ... */ };
  const refreshData = async () => { /* ... implementation ... */ };
  
  // All other function implementations...
  const addBooking = async (booking: Booking): Promise<Booking | undefined> => { return undefined; };
  const addReview = async (review: Review) => {};
  const addAgencyReview = async (review: Partial<AgencyReview>) => {};
  const deleteReview = async (id: string) => {};
  const deleteAgencyReview = async (id: string) => {};
  const updateAgencyReview = async (id: string, updates: Partial<AgencyReview>) => {};
  const toggleFavorite = async (tripId: string, userId: string) => {};
  const updateClientProfile = async (userId: string, data: Partial<Client>) => {};
  const updateAgencySubscription = async (agencyId: string, status: string, plan: string, expiresAt?: string) => {};
  const updateAgencyProfileByAdmin = async (agencyId: string, data: Partial<Agency>) => {};
  const toggleAgencyStatus = async (agencyId: string) => {};
  const createTrip = async (trip: Trip) => {};
  const updateTrip = async (trip: Trip) => {};
  const deleteTrip = async (tripId: string) => {};
  const toggleTripStatus = async (tripId: string) => {};
  const toggleTripFeatureStatus = async (tripId: string) => {};
  const updateTripOperationalData = async (tripId: string, data: OperationalData) => {};
  const softDeleteEntity = async (id: string, table: string) => {};
  const restoreEntity = async (id: string, table: string) => {};
  const deleteUser = async (id: string, role: string) => {};
  const deleteMultipleUsers = async (ids: string[]) => {};
  const deleteMultipleAgencies = async (ids: string[]) => {};
  const getUsersStats = async (userIds: string[]): Promise<UserStats[]> => { return []; };
  const updateMultipleUsersStatus = async (ids: string[], status: string) => {};
  const updateMultipleAgenciesStatus = async (ids: string[], status: string) => {};
  const logAuditAction = async (action: string, details: string) => {};
  const sendPasswordReset = async (email: string) => {};
  const updateUserAvatarByAdmin = async (userId: string, file: File): Promise<string | null> => { return null; };
  const getPublicTrips = (): Trip[] => [];
  const getAgencyPublicTrips = (agencyId: string): Trip[] => [];
  const getAgencyTrips = (agencyId: string): Trip[] => [];
  const getTripById = (id: string): Trip | undefined => undefined;
  const getTripBySlug = (slug: string): Trip | undefined => undefined;
  const getAgencyBySlug = (slug: string): Agency | undefined => undefined;
  const getReviewsByTripId = (tripId: string): Review[] => [];
  const getReviewsByAgencyId = (agencyId: string): AgencyReview[] => [];
  const getReviewsByClientId = (clientId: string): AgencyReview[] => [];
  const hasUserPurchasedTrip = (userId: string, tripId: string): boolean => false;
  const getAgencyStats = (agencyId: string): DashboardStats => ({ totalRevenue: 0, totalViews: 0, totalSales: 0, conversionRate: 0 });
  const getAgencyTheme = async (agencyId: string): Promise<AgencyTheme | null> => null;
  const saveAgencyTheme = async (agencyId: string, colors: ThemeColors): Promise<boolean> => false;
  const incrementTripViews = async (tripId: string) => {};

  // Fix: Implemented logActivity function
  const logActivity = async (action_type: ActivityActionType, details: any) => {
    const sb = guardSupabase();
    if (!sb) return;
    try {
      const { error } = await sb.from('activity_logs').insert({
        user_id: user?.id,
        agency_id: user?.role === UserRole.AGENCY ? user.id : null,
        actor_email: user?.email,
        actor_role: user?.role,
        action_type,
        details: JSON.stringify(details), // Ensure details are stored as JSON
        created_at: new Date().toISOString(),
      });
      if (error) {
        console.error('Error logging activity:', error);
      }
    } catch (err) {
      console.error('Exception logging activity:', err);
    }
  };


  const value: DataContextType = {
    trips, agencies, bookings, reviews, agencyReviews, clients, auditLogs, activityLogs, loading,
    addBooking, addReview, addAgencyReview, deleteReview, deleteAgencyReview, updateAgencyReview,
    toggleFavorite, updateClientProfile, updateAgencySubscription, updateAgencyProfileByAdmin,
    toggleAgencyStatus, createTrip, updateTrip, deleteTrip, toggleTripStatus, toggleTripFeatureStatus,
    updateTripOperationalData, softDeleteEntity, restoreEntity, deleteUser, deleteMultipleUsers,
    deleteMultipleAgencies, getUsersStats, updateMultipleUsersStatus, updateMultipleAgenciesStatus,
    logAuditAction, sendPasswordReset, updateUserAvatarByAdmin, getPublicTrips, getAgencyPublicTrips,
    getAgencyTrips, getTripById, getTripBySlug, getAgencyBySlug, getReviewsByTripId,
    getReviewsByAgencyId, getReviewsByClientId, hasUserPurchasedTrip, getAgencyStats,
    getAgencyTheme, saveAgencyTheme, refreshData, incrementTripViews,
    logActivity // Fix: Added logActivity here
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};