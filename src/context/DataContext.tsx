import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Trip, Agency, Booking, Review, AgencyReview, Client, UserRole, AuditLog, AgencyTheme, ThemeColors, UserStats, DashboardStats, ActivityLog, OperationalData, ActivityActionType } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { MOCK_AGENCIES, MOCK_TRIPS, MOCK_BOOKINGS, MOCK_REVIEWS, MOCK_CLIENTS } from '../services/mockData';
import { useToast } from './ToastContext';

// --- NEW SERVER-SIDE SEARCH TYPES ---
export interface SearchTripsParams {
  page?: number;
  limit?: number;
  query?: string;
  category?: string;
  tags?: string[];
  agencyId?: string;
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'RELEVANCE' | 'LOW_PRICE' | 'HIGH_PRICE' | 'DATE_ASC' | 'RATING';
}

export interface SearchAgenciesParams {
  page?: number;
  limit?: number;
  query?: string;
  specialty?: string; // Search in tags or description
  sort?: 'NAME' | 'RELEVANCE' | 'RATING';
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  error?: string;
}

interface DataContextType {
  // Global/User Context Data
  agencies: Agency[];
  trips: Trip[];
  bookings: Booking[];
  reviews: Review[];
  agencyReviews: AgencyReview[];
  clients: Client[];
  auditLogs: AuditLog[];
  activityLogs: ActivityLog[];
  loading: boolean; 

  // Server-Side Search Methods 
  searchTrips: (params: SearchTripsParams) => Promise<PaginatedResult<Trip>>;
  searchAgencies: (params: SearchAgenciesParams) => Promise<PaginatedResult<Agency>>;
  
  // Specific Getters (Synchronous from cache)
  getTripBySlug: (slug: string) => Trip | undefined;
  getAgencyBySlug: (slug: string) => Agency | undefined;
  getTripById: (id: string) => Trip | undefined;
  getAgencyPublicTrips: (agencyId: string) => Trip[];
  getPublicTrips: () => Trip[];
  
  // Actions
  refreshData: () => Promise<void>;
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
  
  // Helpers
  getReviewsByTripId: (tripId: string) => AgencyReview[];
  getReviewsByAgencyId: (agencyId: string) => AgencyReview[];
  getReviewsByClientId: (clientId: string) => AgencyReview[];
  getAgencyStats: (agencyId: string) => Promise<DashboardStats>;
  getAgencyTheme: (agencyId: string) => Promise<AgencyTheme | null>;
  saveAgencyTheme: (agencyId: string, colors: ThemeColors) => Promise<boolean>;
  refreshUserData: () => Promise<void>;
  incrementTripViews: (tripId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, reloadUser, loading: authLoading } = useAuth(); // Import reloadUser from AuthContext
  const { showToast } = useToast();
  
  // State
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [agencyReviews, setAgencyReviews] = useState<AgencyReview[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const guardSupabase = () => {
    if (!supabase) return null;
    return supabase;
  };

  const fetchGlobalData = async () => {
    setLoading(true);
    const sb = guardSupabase();
    
    if (!sb) {
        // Fallback to Mocks if offline/no Supabase
        setAgencies(MOCK_AGENCIES);
        setTrips(MOCK_TRIPS);
        setBookings(MOCK_BOOKINGS);
        setAgencyReviews([]); // or MOCK_REVIEWS adapted
        setClients(MOCK_CLIENTS);
        setLoading(false);
        return;
    }

    try {
        // 1. Fetch Agencies
        const { data: agenciesData } = await sb.from('agencies').select('*');
        if (agenciesData) {
            const mappedAgencies: Agency[] = agenciesData.map((a: any) => ({
                id: a.user_id,
                agencyId: a.id,
                name: a.name,
                email: a.email || '',
                role: UserRole.AGENCY,
                slug: a.slug || '',
                whatsapp: a.whatsapp,
                cnpj: a.cnpj,
                description: a.description || '',
                logo: a.logo_url || '',
                is_active: a.is_active,
                heroMode: a.hero_mode || 'TRIPS',
                heroBannerUrl: a.hero_banner_url,
                heroTitle: a.hero_title,
                heroSubtitle: a.hero_subtitle,
                customSettings: a.custom_settings || {},
                subscriptionStatus: a.subscription_status || 'ACTIVE',
                subscriptionPlan: a.subscription_plan || 'BASIC',
                subscriptionExpiresAt: a.subscription_expires_at || new Date().toISOString(),
                website: a.website,
                phone: a.phone,
                address: a.address || {},
                bankInfo: a.bank_info || {}
            }));
            setAgencies(mappedAgencies);
        }

        // 2. Fetch Trips (and images)
        const { data: tripsData } = await sb.from('trips').select('*, trip_images(*)');
        if (tripsData) {
            const mappedTrips: Trip[] = tripsData.map((t: any) => ({
                id: t.id,
                agencyId: t.agency_id,
                title: t.title,
                slug: t.slug,
                description: t.description,
                destination: t.destination,
                price: t.price,
                startDate: t.start_date,
                endDate: t.end_date,
                durationDays: t.duration_days,
                images: t.trip_images?.sort((a:any,b:any) => a.position - b.position).map((i:any) => i.image_url) || [],
                category: t.category,
                tags: t.tags || [],
                travelerTypes: t.traveler_types || [],
                itinerary: t.itinerary,
                boardingPoints: t.boarding_points,
                paymentMethods: t.payment_methods,
                is_active: t.is_active,
                tripRating: t.trip_rating || 0,
                tripTotalReviews: t.trip_total_reviews || 0,
                included: t.included || [],
                notIncluded: t.not_included || [],
                views: t.views_count,
                sales: t.sales_count,
                featured: t.featured,
                featuredInHero: t.featured_in_hero,
                popularNearSP: t.popular_near_sp,
                operationalData: t.operational_data || {}
            }));
            setTrips(mappedTrips);
        }

        // 3. Fetch Agency Reviews
        const { data: reviewsData } = await sb.from('agency_reviews').select('*');
        if (reviewsData) {
            // We need to join client info manually or via query if not joined
            // For now mapping raw
            setAgencyReviews(reviewsData.map((r: any) => ({
                id: r.id,
                agencyId: r.agency_id,
                clientId: r.client_id,
                bookingId: r.booking_id,
                rating: r.rating,
                comment: r.comment,
                tags: r.tags,
                createdAt: r.created_at,
                response: r.response,
                clientName: 'Viajante', // Placeholder until joined
                agencyName: agenciesData?.find((