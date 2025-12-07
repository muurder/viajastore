
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
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
  const { user } = useAuth();
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
                agencyName: agenciesData?.find((a:any) => a.id === r.agency_id)?.name || 'Agência'
            })));
        }

        // 4. Fetch Clients (Admin only ideally, but simplified for dashboard list)
        if (user?.role === 'ADMIN') {
            const { data: profiles } = await sb.from('profiles').select('*').eq('role', 'CLIENT');
            if(profiles) {
                setClients(profiles.map((p: any) => ({
                    id: p.id,
                    name: p.full_name,
                    email: p.email,
                    role: UserRole.CLIENT,
                    avatar: p.avatar_url,
                    phone: p.phone,
                    cpf: p.cpf,
                    favorites: [],
                    address: p.address || {},
                    status: p.status || 'ACTIVE'
                } as Client)));
            }
        }

    } catch (e) {
        console.error("Error fetching global data:", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
      fetchGlobalData();
  }, [user]); // Re-fetch on user change (login/logout)

  const refreshData = async () => {
      await fetchGlobalData();
      await refreshUserData();
  };

  // --- SERVER-SIDE SEARCH IMPLEMENTATION ---

  const searchTrips = async (params: SearchTripsParams): Promise<PaginatedResult<Trip>> => {
    const sb = guardSupabase();
    if (!sb) return { data: [], count: 0, error: 'Offline' };

    const page = params.page || 1;
    const limit = params.limit || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = sb
      .from('trips')
      .select(`*, trip_images(*)`, { count: 'exact' });

    // Filters
    if (params.query) {
      const q = `%${params.query}%`;
      query = query.or(`title.ilike.${q},description.ilike.${q},destination.ilike.${q}`);
    }
    if (params.category && params.category !== 'Todos') {
      query = query.eq('category', params.category);
    }
    if (params.agencyId) {
      query = query.eq('agency_id', params.agencyId);
    }
    if (params.featured) {
      query = query.eq('featured', true);
    }
    // Price Range
    if (params.minPrice !== undefined) query = query.gte('price', params.minPrice);
    if (params.maxPrice !== undefined) query = query.lte('price', params.maxPrice);

    query = query.eq('is_active', true);

    // Sorting
    if (params.sort === 'LOW_PRICE') query = query.order('price', { ascending: true });
    else if (params.sort === 'HIGH_PRICE') query = query.order('price', { ascending: false });
    else if (params.sort === 'DATE_ASC') query = query.order('start_date', { ascending: true });
    else query = query.order('created_at', { ascending: false });

    // Pagination
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      return { data: [], count: 0, error: error.message };
    }

    const formattedTrips: Trip[] = (data || []).map((t: any) => ({
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
      images: t.trip_images?.map((i:any) => i.image_url) || [],
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

    return { data: formattedTrips, count: count || 0 };
  };

  const searchAgencies = async (params: SearchAgenciesParams): Promise<PaginatedResult<Agency>> => {
    const sb = guardSupabase();
    if (!sb) return { data: [], count: 0, error: 'Offline' };

    const page = params.page || 1;
    const limit = params.limit || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = sb.from('agencies').select('*', { count: 'exact' }).eq('is_active', true);

    if (params.query) {
      query = query.ilike('name', `%${params.query}%`);
    }
    
    // Sort
    if (params.sort === 'NAME') query = query.order('name', { ascending: true });
    else query = query.order('created_at', { ascending: false });

    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      return { data: [], count: 0, error: error.message };
    }

    const formattedAgencies: Agency[] = (data || []).map((a: any) => ({
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

    return { data: formattedAgencies, count: count || 0 };
  };

  // --- SYNC GETTERS (From Cache) ---

  const getTripBySlug = (slug: string): Trip | undefined => {
    return trips.find(t => t.slug === slug || t.id === slug);
  };

  const getAgencyBySlug = (slug: string): Agency | undefined => {
      return agencies.find(a => a.slug === slug || a.agencyId === slug);
  };

  const getTripById = (id: string): Trip | undefined => {
      return trips.find(t => t.id === id);
  };

  const getAgencyPublicTrips = (agencyId: string): Trip[] => {
      return trips.filter(t => t.agencyId === agencyId && t.is_active);
  };

  const getPublicTrips = (): Trip[] => {
      return trips.filter(t => t.is_active);
  };

  // --- USER DATA FETCHING (Only if logged in) ---

  const refreshUserData = async () => {
    if (!supabase || !user) return;
    
    try {
        if (user.role === UserRole.CLIENT) {
            const { data: bookingsData } = await supabase.from('bookings').select('*, trips:trip_id(*), agencies:agency_id(*)').eq('client_id', user.id);
            if (bookingsData) {
                const mappedBookings: Booking[] = bookingsData.map((b:any) => ({
                    id: b.id,
                    tripId: b.trip_id,
                    clientId: b.client_id,
                    date: b.booking_date,
                    status: b.status,
                    totalPrice: b.total_price,
                    passengers: b.passengers,
                    voucherCode: b.voucher_code,
                    paymentMethod: b.payment_method,
                    _trip: b.trips,
                    _agency: b.agencies
                }));
                setBookings(mappedBookings);
            }
        } else if (user.role === UserRole.AGENCY) {
             const agencyUser = user as Agency;
             const { data: agencyBookings } = await supabase.from('bookings').select('*, trips:trip_id(*)').eq('agency_id', agencyUser.agencyId);
             if (agencyBookings) {
                 const mappedBookings: Booking[] = agencyBookings.map((b:any) => ({
                    id: b.id,
                    tripId: b.trip_id,
                    clientId: b.client_id,
                    date: b.booking_date,
                    status: b.status,
                    totalPrice: b.total_price,
                    passengers: b.passengers,
                    voucherCode: b.voucher_code,
                    paymentMethod: b.payment_method,
                    _trip: b.trips
                }));
                setBookings(mappedBookings);
             }
        }
        
    } catch (e) {
        console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
        refreshUserData();
    }
  }, [user]);

  // --- ACTION IMPLEMENTATIONS (Placeholders/Implementations) ---

  const getReviewsByTripId = (id: string) => agencyReviews.filter(r => r.trip_id === id); // simplified
  const getReviewsByAgencyId = (id: string) => agencyReviews.filter(r => r.agencyId === id);
  const getReviewsByClientId = (id: string) => agencyReviews.filter(r => r.clientId === id);

  const getAgencyStats = async (agencyId: string): Promise<DashboardStats> => {
      // In a real app, this would be an aggregation query
      // For now, aggregate locally if data is loaded, or return defaults
      const agencyTrips = trips.filter(t => t.agencyId === agencyId);
      const agencyBookings = bookings.filter(b => b._trip?.agencyId === agencyId);
      
      const totalRevenue = agencyBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
      const totalSales = agencyBookings.length;
      const totalViews = agencyTrips.reduce((sum, t) => sum + (t.views || 0), 0);
      const reviews = getReviewsByAgencyId(agencyId);
      const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

      return { totalRevenue, totalViews, totalSales, conversionRate: 2.5, averageRating: avgRating, totalReviews: reviews.length };
  };

  // Implement other actions with empty/mock logic for now to satisfy interface
  const createTrip = async (trip: Trip) => { 
      const sb = guardSupabase();
      if (!sb) return;
      // Real implementation would insert into 'trips'
      const { data, error } = await sb.from('trips').insert({
          agency_id: trip.agencyId,
          title: trip.title,
          slug: trip.slug || trip.title.toLowerCase().replace(/ /g, '-'),
          // ... map fields ...
          price: trip.price,
          start_date: trip.startDate,
          duration_days: trip.durationDays,
          category: trip.category,
          is_active: trip.is_active
      }).select();
      if (!error) await refreshData();
  };
  
  const updateTrip = async (trip: Trip) => { 
      const sb = guardSupabase();
      if (!sb) return;
      await sb.from('trips').update({ title: trip.title, price: trip.price }).eq('id', trip.id);
      await refreshData();
  };
  
  const deleteTrip = async (id: string) => {
      const sb = guardSupabase();
      if (!sb) return;
      await sb.from('trips').delete().eq('id', id);
      await refreshData();
  };

  // Minimal Stubs for others
  const toggleTripStatus = async (id: string) => { 
      const t = getTripById(id);
      if(t && guardSupabase()) {
          await guardSupabase()!.from('trips').update({ is_active: !t.is_active }).eq('id', id);
          await refreshData();
      }
  };
  const toggleTripFeatureStatus = async (id: string) => {};
  const updateTripOperationalData = async (id: string, data: OperationalData) => {
      if(guardSupabase()) {
          await guardSupabase()!.from('trips').update({ operational_data: data }).eq('id', id);
          await refreshData();
      }
  };
  
  const addBooking = async (b: Booking) => {
      if(guardSupabase()) {
          const { data, error } = await guardSupabase()!.from('bookings').insert({
              id: b.id,
              trip_id: b.tripId,
              client_id: b.clientId,
              booking_date: b.date,
              status: b.status,
              total_price: b.totalPrice,
              passengers: b.passengers,
              voucher_code: b.voucherCode,
              payment_method: b.paymentMethod
          }).select().single();
          if(!error) {
              await refreshUserData();
              // return mapped booking
              return { ...b, _trip: b._trip, _agency: b._agency };
          }
      }
      return undefined;
  };

  // ... (Other action stubs) ...
  const addReview = async () => {};
  const addAgencyReview = async (review: Partial<AgencyReview>) => {
      if(guardSupabase()) {
          await guardSupabase()!.from('agency_reviews').insert({
              agency_id: review.agencyId,
              client_id: review.clientId,
              booking_id: review.bookingId,
              rating: review.rating,
              comment: review.comment,
              tags: review.tags
          });
          await refreshData();
      }
  };
  const deleteReview = async () => {};
  const deleteAgencyReview = async (id: string) => {
      if(guardSupabase()) {
          await guardSupabase()!.from('agency_reviews').delete().eq('id', id);
          await refreshData();
      }
  };
  const updateAgencyReview = async (id: string, updates: Partial<AgencyReview>) => {
      if(guardSupabase()) {
          await guardSupabase()!.from('agency_reviews').update(updates).eq('id', id);
          await refreshData();
      }
  };
  const toggleFavorite = async (tripId: string, userId: string) => {
      // In real app, update profile favorites array
      showToast('Favorito atualizado (simulado)', 'success');
  };
  const updateClientProfile = async (userId: string, data: Partial<Client>) => {
      if(guardSupabase()) {
          await guardSupabase()!.from('profiles').update(data).eq('id', userId);
          await refreshData();
      }
  };
  const updateAgencySubscription = async (agencyId: string, status: string, plan: string, expiresAt?: string) => {
      if(guardSupabase()) {
          await guardSupabase()!.from('agencies').update({ subscription_status: status, subscription_plan: plan, subscription_expires_at: expiresAt }).eq('id', agencyId);
          await refreshData();
      }
  };
  const updateAgencyProfileByAdmin = async (agencyId: string, data: Partial<Agency>) => {
      if(guardSupabase()) {
          await guardSupabase()!.from('agencies').update(data).eq('id', agencyId);
          await refreshData();
      }
  };
  const toggleAgencyStatus = async (agencyId: string) => {};
  const softDeleteEntity = async () => {};
  const restoreEntity = async () => {};
  const deleteUser = async () => {};
  const deleteMultipleUsers = async () => {};
  const deleteMultipleAgencies = async () => {};
  const getUsersStats = async () => [];
  const updateMultipleUsersStatus = async () => {};
  const updateMultipleAgenciesStatus = async () => {};
  const logAuditAction = async () => {};
  const sendPasswordReset = async () => {};
  const updateUserAvatarByAdmin = async () => null;
  const getAgencyTheme = async (id: string) => null;
  const saveAgencyTheme = async () => false;
  const incrementTripViews = async () => {};

  const values: DataContextType = {
    agencies, trips, bookings, reviews: MOCK_REVIEWS, agencyReviews, clients, auditLogs, activityLogs, loading,
    searchTrips, searchAgencies,
    getTripBySlug, getAgencyBySlug, getTripById, getAgencyPublicTrips, getPublicTrips,
    refreshData,
    createTrip, updateTrip, deleteTrip, toggleTripStatus, toggleTripFeatureStatus, updateTripOperationalData,
    addBooking, addReview, addAgencyReview, deleteReview, deleteAgencyReview, updateAgencyReview,
    toggleFavorite, updateClientProfile, updateAgencySubscription, updateAgencyProfileByAdmin, toggleAgencyStatus,
    softDeleteEntity, restoreEntity, deleteUser, deleteMultipleUsers, deleteMultipleAgencies, getUsersStats,
    updateMultipleUsersStatus, updateMultipleAgenciesStatus, logAuditAction, sendPasswordReset, updateUserAvatarByAdmin,
    getReviewsByTripId, getReviewsByAgencyId, getReviewsByClientId, getAgencyStats,
    getAgencyTheme, saveAgencyTheme, refreshUserData, incrementTripViews
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