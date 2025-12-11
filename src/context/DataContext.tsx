import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { Trip, Agency, Booking, Review, AgencyReview, Client, UserRole, AuditLog, AgencyTheme, ThemeColors, UserStats, DashboardStats, ActivityLog, OperationalData, User, ActivityActionType, PlatformSettings } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { MOCK_AGENCIES, MOCK_TRIPS, MOCK_BOOKINGS, MOCK_REVIEWS, MOCK_CLIENTS } from '../services/mockData';
import { useToast } from './ToastContext';
import { slugify } from '../utils/slugify';
import { validateSlug, generateUniqueSlug } from '../utils/slugUtils';

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
  // Date range filtering
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  // Guest filtering
  adults?: number;
  children?: number;
  // Geolocation
  latitude?: number;
  longitude?: number;
  radius?: number; // in kilometers
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
  platformSettings: PlatformSettings | null;
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
  refreshData: () => Promise<void>; // Full refresh
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
  // Admin-specific functions
  adminChangePlan: (agencyId: string, newPlan: 'BASIC' | 'PREMIUM') => Promise<void>;
  adminBulkDeleteAgencies: (agencyIds: string[]) => Promise<void>;
  adminBulkArchiveAgencies: (agencyIds: string[]) => Promise<void>;
  adminBulkChangePlan: (agencyIds: string[], newPlan: 'BASIC' | 'PREMIUM') => Promise<void>;
  adminSuspendAgency: (agencyId: string) => Promise<void>;
  
  // Helpers
  getReviewsByTripId: (tripId: string) => AgencyReview[];
  getReviewsByAgencyId: (agencyId: string) => AgencyReview[];
  getReviewsByClientId: (clientId: string) => AgencyReview[];
  getAgencyStats: (agencyId: string) => Promise<DashboardStats>;
  getAgencyTheme: (agencyId: string) => Promise<AgencyTheme | null>;
  saveAgencyTheme: (agencyId: string, theme: Partial<AgencyTheme>) => Promise<boolean>;
  refreshUserData: () => Promise<void>; // Alias for _fetchBookingsForCurrentUser or specific user data refresh
  incrementTripViews: (tripId: string) => Promise<void>;
  fetchTripImages: (tripId: string, forceRefresh?: boolean) => Promise<string[]>; // Load images on-demand
  updatePlatformSettings: (data: Partial<PlatformSettings>) => Promise<void>; // Admin only - Update platform settings
  uploadPlatformLogo: (file: File) => Promise<string | null>; // Admin only - Upload platform logo
  restoreDefaultSettings: () => Promise<void>; // Admin only - Restore default settings
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helper to normalize strings for comparison (remove accents, lowercase)
const normalizeText = (text: string) => {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth(); // Import reloadUser from AuthContext
  const { showToast } = useToast();
  
  // State
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [agencyReviews, setAgencyReviews] = useState<AgencyReview[]>([]);
  const [clients, setClients] = useState<Client[]>([]); // Now holds all client profiles
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Refs to hold latest state values without being useCallback dependencies
  const tripsRef = useRef<Trip[]>([]);
  const agenciesRef = useRef<Agency[]>([]);
  const clientsRef = useRef<Client[]>([]); // New ref for clients
  useEffect(() => { tripsRef.current = trips; }, [trips]);
  useEffect(() => { agenciesRef.current = agencies; }, [agencies]);
  useEffect(() => { clientsRef.current = clients; }, [clients]); // Update clients ref

  const guardSupabase = useCallback(() => {
    if (!supabase) return null;
    return supabase;
  }, []);

  // --- Internal Data Fetching Functions ---

  // Fetches all global data and client profiles (for admin/global context)
  const _fetchGlobalAndClientProfiles = useCallback(async () => {
    setLoading(true);
    const sb = guardSupabase();
    console.log("[DataContext] Fetching GLOBAL data (agencies, trips, clients, reviews, logs)..."); // Debug Log
    
    if (!sb) {
        console.warn("[DataContext] Supabase not configured. Falling back to mock data for global profiles."); // Debug Log
        setAgencies(MOCK_AGENCIES);
        setTrips(MOCK_TRIPS);
        setAgencyReviews([]); // MOCK_REVIEWS is for old `Review` interface, so keep empty for `AgencyReview`
        setClients(MOCK_CLIENTS);
        setAuditLogs([]);
        setActivityLogs([]);
        setLoading(false);
        return;
    }

    try {
        // 1. Fetch Agencies (exclude soft-deleted) (OPTIMIZED: only needed fields)
        const { data: agenciesData } = await sb.from('agencies')
          .select('id, user_id, name, email, slug, whatsapp, cnpj, description, logo_url, is_active, hero_mode, hero_banner_url, hero_title, hero_subtitle, custom_settings, subscription_status, subscription_plan, subscription_expires_at, website, phone, address, bank_info, deleted_at')
          .is('deleted_at', null); // FIX: Only fetch non-deleted agencies
        if (agenciesData) {
            const mappedAgencies: Agency[] = agenciesData.map((a: any) => ({
                id: a.user_id, agencyId: a.id, name: a.name, email: a.email || '', role: UserRole.AGENCY, slug: a.slug || '', whatsapp: a.whatsapp, cnpj: a.cnpj, description: a.description || '', logo: a.logo_url || '', is_active: a.is_active ?? false, heroMode: a.hero_mode || 'TRIPS', heroBannerUrl: a.hero_banner_url, heroTitle: a.hero_title, heroSubtitle: a.hero_subtitle, customSettings: a.custom_settings || {}, subscriptionStatus: a.subscription_status || 'ACTIVE', subscriptionPlan: a.subscription_plan || 'BASIC', subscriptionExpiresAt: a.subscription_expires_at || new Date().toISOString(), website: a.website, phone: a.phone, address: a.address || {}, bankInfo: a.bank_info || {}, deleted_at: a.deleted_at
            }));
            setAgencies(mappedAgencies);
        }

        // 2. Fetch Trips (OPTIMIZED: without images to reduce egress)
        // Images will be loaded on-demand when needed
        const { data: tripsData } = await sb.from('trips')
          .select(`
            id, agency_id, title, slug, description, destination, price,
            start_date, end_date, duration_days, category, tags, traveler_types,
            itinerary, boarding_points, payment_methods, is_active,
            trip_rating, trip_total_reviews, included, not_included,
            views_count, sales_count, featured, featured_in_hero,
            popular_near_sp, operational_data, latitude, longitude, passenger_config, created_at, updated_at
          `);
        if (tripsData) {
            const mappedTrips: Trip[] = tripsData.map((t: any) => ({
                id: t.id, agencyId: t.agency_id, title: t.title, slug: t.slug, description: t.description, destination: t.destination, price: t.price, startDate: t.start_date, endDate: t.end_date, durationDays: t.duration_days, images: [], // Images loaded on-demand via fetchTripImages
                category: t.category, tags: t.tags || [], travelerTypes: t.traveler_types || [], itinerary: t.itinerary, boardingPoints: t.boarding_points, paymentMethods: t.payment_methods, is_active: t.is_active, tripRating: t.trip_rating || 0, tripTotalReviews: t.trip_total_reviews || 0, included: t.included || [], notIncluded: t.not_included || [], views: t.views_count, sales: t.sales_count, featured: t.featured, featuredInHero: t.featured_in_hero, popularNearSP: t.popular_near_sp, operationalData: t.operational_data || {},
                latitude: t.latitude, longitude: t.longitude, passengerConfig: t.passenger_config
            }));
            setTrips(mappedTrips);
        }

        // 3. Fetch all Favorites (OPTIMIZED: only needed fields)
        const { data: favsData, error: favsError } = await sb.from('favorites')
          .select('user_id, trip_id');
        if (favsError) {
            console.error("[DataContext] Error fetching favorites:", favsError);
        }
        const allFavorites = favsData || [];

        // 4. Fetch Clients (Profiles with CLIENT role) - Global list of all clients (OPTIMIZED: only needed fields)
        const { data: profilesData } = await sb.from('profiles')
          .select('id, full_name, email, role, avatar_url, cpf, phone, birth_date, address, status, created_at')
          .eq('role', UserRole.CLIENT);
        if (profilesData) {
            const mappedClients: Client[] = profilesData.map((c: any) => ({
                id: c.id, 
                name: c.full_name, 
                email: c.email, 
                role: UserRole.CLIENT, 
                avatar: c.avatar_url, 
                cpf: c.cpf || null, 
                phone: c.phone || null, 
                birthDate: c.birth_date || null,
                // Populate favorites from the separate favorites table
                favorites: allFavorites.filter((f: any) => f.user_id === c.id).map((f: any) => f.trip_id) || [], 
                address: c.address || {}, 
                status: c.status, 
                createdAt: c.created_at
            }));
            setClients(mappedClients);
        }

        // 5. Fetch Agency Reviews (JOIN with profiles to get name/avatar) (OPTIMIZED: only needed fields)
        const { data: reviewsData } = await sb.from('agency_reviews')
          .select('id, agency_id, client_id, booking_id, trip_id, rating, comment, tags, created_at, response, client:client_id(full_name, avatar_url)'); // Join with profiles
        
        if (reviewsData) {
            setAgencyReviews(reviewsData.map((r: any) => ({
                id: r.id, 
                agencyId: r.agency_id, 
                clientId: r.client_id, 
                bookingId: r.booking_id, 
                trip_id: r.trip_id, 
                rating: r.rating, 
                comment: r.comment, 
                tags: r.tags, 
                createdAt: r.created_at, 
                response: r.response, 
                // Map joined data
                clientName: r.client?.full_name || 'Viajante', 
                clientAvatar: r.client?.avatar_url,
                agencyName: undefined, 
                tripTitle: undefined,
            })));
        }
        
        // 6. Fetch Audit Logs (OPTIMIZED: only needed fields)
        const { data: auditLogsData } = await sb.from('audit_logs')
          .select('id, admin_email, action, details, created_at')
          .order('created_at', { ascending: false });
        if (auditLogsData) {
            setAuditLogs(auditLogsData.map((log: any) => ({
                id: log.id, adminEmail: log.admin_email, action: log.action, details: log.details, createdAt: log.created_at
            })));
        }

        // 7. Fetch Activity Logs (OPTIMIZED: only needed fields)
        const { data: activityLogsData } = await sb.from('activity_logs')
          .select('id, user_id, action_type, details, created_at')
          .order('created_at', { ascending: false });
        if (activityLogsData) {
            setActivityLogs(activityLogsData.map((log: any) => ({
                id: log.id, userId: log.user_id, actionType: log.action_type, details: log.details, createdAt: log.created_at
            })));
        }

        // 8. Fetch Platform Settings (Singleton - always id = 1)
        const { data: platformSettingsData, error: platformSettingsError } = await sb.from('platform_settings')
          .select('*')
          .eq('id', 1)
          .single();
        if (platformSettingsData && !platformSettingsError) {
            setPlatformSettings({
                id: platformSettingsData.id,
                platform_name: platformSettingsData.platform_name || 'ViajaStore',
                platform_logo_url: platformSettingsData.platform_logo_url,
                maintenance_mode: platformSettingsData.maintenance_mode || false,
                created_at: platformSettingsData.created_at,
                updated_at: platformSettingsData.updated_at
            });
        } else {
            // Fallback to default if not found
            setPlatformSettings({
                id: 1,
                platform_name: 'ViajaStore',
                platform_logo_url: null,
                maintenance_mode: false
            });
        }
        
        console.log("[DataContext] Global data loaded. Agencies:", agenciesData?.length, "Trips:", tripsData?.length, "Clients:", profilesData?.length); // Debug Log

    } catch (error: any) {
        console.error("[DataContext] Error fetching global and client profiles data:", error.message); // Debug Log
        console.warn("[DataContext] Entrando em modo Offline/Fallback devido a erro de rede ou Supabase."); // Debug Log
        showToast(`Erro ao carregar dados: ${error.message}. Carregando dados de exemplo.`, 'error');
        setAgencies(MOCK_AGENCIES);
        setTrips(MOCK_TRIPS);
        setAgencyReviews([]);
        setClients(MOCK_CLIENTS);
        setAuditLogs([]);
        setActivityLogs([]);
    } finally {
        setLoading(false);
    }
  }, [guardSupabase, showToast]); // clients removed from dependencies

  // Fetches bookings specific to the currently logged-in user (client or agency)
  const _fetchBookingsForCurrentUser = useCallback(async () => {
    // Guard: If no user is logged in, clear bookings and stop loading.
    if (!user?.id) {
        console.log("[DataContext] _fetchBookingsForCurrentUser: No user ID, clearing bookings."); // Debug Log
        setBookings([]);
        setLoading(false);
        return;
    }

    setLoading(true);
    const sb = guardSupabase();
    console.log("[DataContext] Fetching USER-SPECIFIC data (bookings) for user:", user?.id); // Debug Log
    if (!sb) {
        console.warn("[DataContext] Supabase not configured. Cannot fetch user-specific data, clearing bookings."); // Debug Log
        setBookings([]); // Clear bookings if no supabase
        setLoading(false);
        return;
    }

    // Use refs to access latest trips and agencies without making them dependencies of useCallback
    const currentTrips = tripsRef.current;
    
    try {
        let bookingsData: any[] | null = null;
        let bookingsError: any = null;

        if (user.role === UserRole.AGENCY) {
            const agencyUser = user as Agency;
            // Filter trips by agencyId (which is the agency's PK `id` in the `agencies` table)
            const myAgencyTrips = currentTrips.filter(t => t.agencyId === agencyUser.agencyId);
            const myTripIds = myAgencyTrips.map(t => t.id);
            console.log("[DataContext] _fetchBookingsForCurrentUser: Agency user, fetching bookings for trip IDs:", myTripIds); // Debug Log

            // FIX: Join with profiles (client:client_id) to get client name and avatar
            ({ data: bookingsData, error: bookingsError } = await sb.from('bookings')
                .select('*, trips:trip_id(*, agencies:agency_id(*)), client:client_id(full_name, avatar_url)') // Deep nesting + client join
                .in('trip_id', myTripIds)); 
            
        } else if (user.role === UserRole.CLIENT) {
            console.log("[DataContext] _fetchBookingsForCurrentUser: Client user, fetching bookings for client ID:", user.id); // Debug Log
            ({ data: bookingsData, error: bookingsError } = await sb.from('bookings')
                .select('*, trips:trip_id(*, agencies:agency_id(*))')
                .eq('client_id', user.id)); // Use user.id directly here
        }

        if (bookingsError) throw bookingsError;

        if (bookingsData) {
            const augmentedBookings: Booking[] = bookingsData.map((b: any) => {
                // CORREÇÃO CRÍTICA: Mapear _trip usando o estado global `tripsRef` para garantir camelCase.
                // O join `b.trips` retorna dados em snake_case (banco), o que quebra filtros no frontend.
                const foundTrip = tripsRef.current.find(t => t.id === b.trip_id);
                const foundAgency = agenciesRef.current.find(a => a.agencyId === foundTrip?.agencyId);

                return {
                    id: b.id,
                    tripId: b.trip_id,
                    clientId: b.client_id,
                    date: b.created_at,
                    status: b.status,
                    totalPrice: b.total_price,
                    passengers: b.passengers,
                    voucherCode: b.voucher_code,
                    paymentMethod: b.payment_method,
                    _trip: foundTrip, // Use o objeto trip normalizado (camelCase)
                    _agency: foundAgency, // Use o objeto agency normalizado
                    // Add _client property (custom extension for Dashboard usage)
                    _client: b.client ? { name: b.client.full_name, avatar: b.client.avatar_url } : undefined 
                } as any;
            });
            setBookings(augmentedBookings);
            console.log("[DataContext] User-specific data loaded. Bookings:", augmentedBookings.length); // Debug Log
        } else {
            setBookings([]);
            console.log("[DataContext] No user-specific bookings data found."); // Debug Log
        }

    } catch (error: any) {
        console.error("[DataContext] Error fetching user-specific data:", error.message); // Debug Log
        showToast(`Erro ao carregar dados do usuário: ${error.message}`, 'error');
        setBookings([]); // Clear bookings on error
    } finally {
        setLoading(false);
    }
  }, [user, authLoading, showToast, guardSupabase, tripsRef, agenciesRef]); 

  // --- Main Effect Hook for Global Data (runs once on mount + subscribes) ---
  useEffect(() => {
    console.log("[DataContext] Global data effect triggered."); // Debug Log
    _fetchGlobalAndClientProfiles();

    const sb = guardSupabase();
    if (sb) {
        const subscriptions: any[] = [];
        
        // Subscribe to global data changes, triggering _fetchGlobalAndClientProfiles
        const globalTablesToSubscribe = ['agencies', 'trips', 'agency_reviews', 'profiles', 'activity_logs', 'trip_images', 'favorites']; // Added trip_images, favorites
        globalTablesToSubscribe.forEach(table => {
            subscriptions.push(sb.channel(`${table}_changes`).on('postgres_changes', { event: '*', schema: 'public', table: table }, payload => {
                console.log(`[DataContext] Supabase Subscription: ${table} change received!`, payload); // Debug Log
                _fetchGlobalAndClientProfiles();
            }).subscribe());
        });

        return () => {
            console.log("[DataContext] Unsubscribing from global data channels."); // Debug Log
            subscriptions.forEach(sub => sb.removeChannel(sub));
        };
    }
  }, [_fetchGlobalAndClientProfiles, guardSupabase]); // Global data fetching runs ONCE.

  // --- Second Effect Hook for User-Specific Data (runs when user or authLoading changes) ---
  useEffect(() => {
    console.log("[DataContext] User-specific data effect triggered. User:", user?.id, "AuthLoading:", authLoading); // Debug Log
    // This effect runs when user.id changes, or after initial auth loading completes and user is available
    // Also added trips.length check to ensure bookings for Agencies are fetched only after trips are loaded (needed for filtering)
    if (user?.id && !authLoading) {
        _fetchBookingsForCurrentUser(); // FIX: Call without argument
    } else if (!user && !authLoading) {
        // If user logs out, clear user-specific data (bookings)
        console.log("[DataContext] User logged out, clearing user-specific data."); // Debug Log
        setBookings([]);
    }
    // Bookings changes should specifically trigger a refresh of user-dependent data
    const sb = guardSupabase();
    if (sb && user?.id) {
        console.log("[DataContext] Subscribing to user-specific bookings changes for user:", user.id); // Debug Log
        const bookingChannel = sb.channel('bookings_changes_user_specific').on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, payload => {
            console.log('[DataContext] Supabase Subscription: Booking change received for user-specific data!', payload); // Debug Log
            _fetchBookingsForCurrentUser(); // FIX: Call without argument
        }).subscribe();
        return () => {
            console.log("[DataContext] Unsubscribing from user-specific bookings channel."); // Debug Log
            sb.removeChannel(bookingChannel);
        };
    }
  }, [user, authLoading, _fetchBookingsForCurrentUser, guardSupabase, trips.length]); // Added trips.length dependency


  // --- Exported Refresh Function (Full Data Refresh) ---
  const refreshData = useCallback(async () => {
      console.log("[DataContext] refreshData: Initiating full data refresh."); // Debug Log
      // Ensure global data is fetched first, then user-specific data
      await _fetchGlobalAndClientProfiles(); 
      if (user) {
          await _fetchBookingsForCurrentUser(); 
      } else {
          setBookings([]); 
      }
      console.log("[DataContext] refreshData: Full data refresh complete."); // Debug Log
  }, [_fetchGlobalAndClientProfiles, user, _fetchBookingsForCurrentUser]);


  // Data Getters
  // FIX: Separated getTripBySlug from getTripById to enforce proper slug usage
  // getTripBySlug now only accepts slugs, not IDs (prevents masking slug issues)
  const getTripBySlug = useCallback((slugToFind: string) => {
    if (!slugToFind || slugToFind.trim() === '') {
      return undefined;
    }
    // Only search by slug, not by ID (to catch missing/invalid slugs)
    return trips.find(t => t.slug === slugToFind);
  }, [trips]);

  const getAgencyBySlug = useCallback((slugToFind: string) => {
    if (!slugToFind || slugToFind.trim() === '') {
      return undefined;
    }
    return agencies.find(a => a.slug === slugToFind);
  }, [agencies]);

  const getTripById = useCallback((id: string) => {
    return trips.find(t => t.id === id);
  }, [trips]);
  
  const getAgencyPublicTrips = useCallback((agencyId: string) => {
      // Filter by agencyId and ensure only active trips are public
      return trips.filter(t => t.agencyId === agencyId && t.is_active);
  }, [trips]);

  const getPublicTrips = useCallback(() => {
      return trips.filter(t => t.is_active);
  }, [trips]);

  const getReviewsByTripId = useCallback((tripId: string) => {
    // Resolve clientName and agencyName dynamically when consuming reviews
    const currentClients = clientsRef.current;
    const currentAgencies = agenciesRef.current;
    const currentTrips = tripsRef.current;
    return agencyReviews
      .filter(r => r.trip_id === tripId)
      .map(r => ({
        ...r,
        // Prefer the pre-joined data if available, else fallback to lookup
        clientName: r.clientName || currentClients.find(c => c.id === r.clientId)?.name || 'Cliente Desconhecido',
        clientAvatar: r.clientAvatar || currentClients.find(c => c.id === r.clientId)?.avatar || undefined,
        agencyName: currentAgencies.find(a => a.agencyId === r.agencyId)?.name || 'Agência Desconhecida',
        agencyLogo: currentAgencies.find(a => a.agencyId === r.agencyId)?.logo || undefined,
        tripTitle: currentTrips.find(t => t.id === r.trip_id)?.title || undefined,
      }));
  }, [agencyReviews, clientsRef, agenciesRef, tripsRef]);

  const getReviewsByAgencyId = useCallback((agencyId: string) => {
    // Resolve clientName and agencyName dynamically when consuming reviews
    const currentClients = clientsRef.current;
    const currentAgencies = agenciesRef.current;
    const currentTrips = tripsRef.current;
    return agencyReviews
      .filter(r => r.agencyId === agencyId)
      .map(r => ({
        ...r,
        clientName: r.clientName || currentClients.find(c => c.id === r.clientId)?.name || 'Cliente Desconhecido',
        clientAvatar: r.clientAvatar || currentClients.find(c => c.id === r.clientId)?.avatar || undefined,
        agencyName: currentAgencies.find(a => a.agencyId === r.agencyId)?.name || 'Agência Desconhecida',
        agencyLogo: currentAgencies.find(a => a.agencyId === r.agencyId)?.logo || undefined,
        tripTitle: currentTrips.find(t => t.id === r.trip_id)?.title || undefined,
      }));
  }, [agencyReviews, clientsRef, agenciesRef, tripsRef]);

  const getReviewsByClientId = useCallback((clientId: string) => {
    // Resolve clientName and agencyName dynamically when consuming reviews
    const currentClients = clientsRef.current;
    const currentAgencies = agenciesRef.current;
    const currentTrips = tripsRef.current;
    return agencyReviews
      .filter(r => r.clientId === clientId)
      .map(r => ({
        ...r,
        clientName: currentClients.find(c => c.id === r.clientId)?.name || 'Cliente Desconhecido',
        clientAvatar: currentClients.find(c => c.id === r.clientId)?.avatar || undefined,
        agencyName: currentAgencies.find(a => a.agencyId === r.agencyId)?.name || 'Agência Desconhecida',
        agencyLogo: currentAgencies.find(a => a.agencyId === r.agencyId)?.logo || undefined,
        tripTitle: currentTrips.find(t => t.id === r.trip_id)?.title || undefined,
      }));
  }, [agencyReviews, clientsRef, agenciesRef, tripsRef]);


  // Data Actions
  const logActivity = useCallback(async (actionType: ActivityActionType, details: any) => {
    const sb = guardSupabase();
    if (sb && user?.id) {
        console.log(`[DataContext] Logging activity: ${actionType} by user ${user.id}`, details); // Debug Log
        await sb.from('activity_logs').insert({
            user_id: user.id,
            action_type: actionType,
            details: details,
        });
        _fetchGlobalAndClientProfiles(); 
    }
  }, [user, _fetchGlobalAndClientProfiles, guardSupabase]);

  const addBooking = useCallback(async (booking: Booking): Promise<Booking | undefined> => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot add booking."); // Debug Log
        return undefined;
    }
    console.log("[DataContext] Adding booking:", booking); // Debug Log
    try {
        const { data, error } = await sb.from('bookings').insert({
            id: booking.id,
            trip_id: booking.tripId,
            client_id: booking.clientId,
            status: booking.status,
            total_price: booking.totalPrice,
            passengers: booking.passengers,
            voucher_code: booking.voucherCode,
            payment_method: booking.paymentMethod
        }).select().single();

        if (error) throw error;

        // Save passenger details if provided
        if (booking.passengerDetails && booking.passengerDetails.length > 0) {
            const passengerRecords = booking.passengerDetails.map((passenger, index) => ({
                booking_id: booking.id,
                passenger_index: index,
                full_name: passenger.name,
                cpf: passenger.document?.replace(/\D/g, '') || null,
                birth_date: passenger.birthDate || null,
                whatsapp: passenger.whatsapp || passenger.phone?.replace(/\D/g, '') || null
            }));

            const { error: passengerError } = await sb
                .from('booking_passengers')
                .insert(passengerRecords);

            if (passengerError) {
                console.error("[DataContext] Error saving passenger details:", passengerError);
                // Don't fail the booking if passenger details fail - log and continue
            } else {
                console.log("[DataContext] Passenger details saved successfully");
            }
        }
        
        showToast('Reserva criada com sucesso!', 'success');
        
        // Increment sales count for the trip
        const { error: tripUpdateError } = await sb.rpc('increment_sales', { trip_id_param: booking.tripId, increment_value: 1 }); // Call RPC function
        if (tripUpdateError) console.error("[DataContext] Error incrementing sales:", tripUpdateError); // Debug Log

        // Augment data before returning (using refs for stability)
        const newBooking = {
            ...booking,
            _trip: tripsRef.current.find(t => t.id === booking.tripId),
            _agency: agenciesRef.current.find(a => a.agencyId === tripsRef.current.find(t => t.id === booking.tripId)?.agencyId)
        };

        logActivity(ActivityActionType.BOOKING_CREATED, { bookingId: newBooking.id, tripId: newBooking.tripId, totalPrice: newBooking.totalPrice });
        if (user) _fetchBookingsForCurrentUser(); 
        console.log("[DataContext] Booking added successfully:", newBooking.id); // Debug Log
        return newBooking;

    } catch (error: any) {
        console.error("[DataContext] Error adding booking:", error.message); // Debug Log
        showToast(`Erro ao adicionar reserva: ${error.message}`, 'error');
        throw error;
    }
  }, [showToast, logActivity, _fetchBookingsForCurrentUser, user, guardSupabase, tripsRef, agenciesRef]); // tripsRef, agenciesRef added to dependencies

  const addReview = useCallback(async (review: Review) => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot add review."); // Debug Log
        return;
    }
    console.log("[DataContext] Adding review:", review); // Debug Log
    try {
        await sb.from('reviews').insert({
            trip_id: review.tripId,
            client_id: review.clientId,
            rating: review.rating,
            comment: review.comment,
            date: review.date,
            client_name: review.clientName,
        });
        showToast('Avaliação enviada com sucesso!', 'success');
        logActivity(ActivityActionType.REVIEW_SUBMITTED, { reviewId: review.id, tripId: review.tripId, rating: review.rating });
        _fetchGlobalAndClientProfiles(); // Update local cache
        console.log("[DataContext] Review added successfully for trip:", review.tripId); // Debug Log
    } catch (error: any) {
        console.error("[DataContext] Error adding review:", error.message); // Debug Log
        showToast(`Erro ao adicionar avaliação: ${error.message}`, 'error');
    }
  }, [showToast, logActivity, _fetchGlobalAndClientProfiles, guardSupabase]);

  const addAgencyReview = useCallback(async (review: Partial<AgencyReview>) => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot add agency review."); // Debug Log
        return;
    }
    if (!review.agencyId || !review.clientId) {
        showToast('Dados de agência ou cliente ausentes para avaliação.', 'error');
        console.error("[DataContext] Missing agencyId or clientId for agency review."); // Debug Log
        return;
    }
    console.log("[DataContext] Adding/updating agency review:", review); // Debug Log
    try {
        // Check if review already exists
        const { data: existingReview, error: checkError } = await sb
            .from('agency_reviews')
            .select('id')
            .eq('agency_id', review.agencyId)
            .eq('client_id', review.clientId)
            .maybeSingle();
        
        if (checkError) {
            console.error("[DataContext] Error checking existing review:", checkError); // Debug Log
            throw checkError;
        }
        
        if (existingReview) {
            // Update existing review
            const { error: updateError } = await sb
                .from('agency_reviews')
                .update({
                    rating: review.rating,
                    comment: review.comment,
                    tags: review.tags,
                    booking_id: review.bookingId,
                    trip_id: review.trip_id,
                })
                .eq('id', existingReview.id);
            
            if (updateError) {
                console.error("[DataContext] Error updating review:", updateError); // Debug Log
                throw updateError;
            }
        } else {
            // Insert new review
            const { error: insertError } = await sb
                .from('agency_reviews')
                .insert({
                    agency_id: review.agencyId,
                    client_id: review.clientId,
                    booking_id: review.bookingId, // Optional
                    trip_id: review.trip_id, // Optional
                    rating: review.rating,
                    comment: review.comment,
                    tags: review.tags,
                });
            
            if (insertError) {
                console.error("[DataContext] Error inserting review:", insertError); // Debug Log
                throw insertError;
            }
        }
        
        showToast('Avaliação enviada/atualizada com sucesso!', 'success');
        logActivity(ActivityActionType.REVIEW_SUBMITTED, { agencyId: review.agencyId, clientId: review.clientId, rating: review.rating });
        // Await the fetch to ensure data is updated before returning
        await _fetchGlobalAndClientProfiles();
        console.log("[DataContext] Agency review added/updated successfully for agency:", review.agencyId); // Debug Log
    } catch (error: any) {
        console.error("[DataContext] Error adding/updating agency review:", error.message); // Debug Log
        showToast(`Erro ao enviar avaliação: ${error.message}`, 'error');
    }
  }, [showToast, logActivity, _fetchGlobalAndClientProfiles, guardSupabase]);

  const deleteReview = useCallback(async (id: string) => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot delete review."); // Debug Log
        return;
    }
    console.log("[DataContext] Deleting review with ID:", id); // Debug Log
    try {
        await sb.from('reviews').delete().eq('id', id);
        showToast('Avaliação excluída.', 'success');
        logActivity(ActivityActionType.REVIEW_DELETED, { reviewId: id }); // Corrected enum usage
        _fetchGlobalAndClientProfiles();
        console.log("[DataContext] Review deleted successfully:", id); // Debug Log
    } catch (error: any) {
        console.error("[DataContext] Error deleting review:", error.message); // Debug Log
        showToast(`Erro ao excluir avaliação: ${error.message}`, 'error');
    }
  }, [showToast, logActivity, _fetchGlobalAndClientProfiles, guardSupabase]);

  const deleteAgencyReview = useCallback(async (id: string) => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot delete agency review."); // Debug Log
        return;
    }
    console.log("[DataContext] Deleting agency review with ID:", id); // Debug Log
    try {
        await sb.from('agency_reviews').delete().eq('id', id);
        showToast('Avaliação excluída.', 'success');
        logActivity(ActivityActionType.REVIEW_DELETED, { reviewId: id }); // Corrected enum usage
        _fetchGlobalAndClientProfiles();
        console.log("[DataContext] Agency review deleted successfully:", id); // Debug Log
    } catch (error: any) {
        console.error("[DataContext] Error deleting agency review:", error.message); // Debug Log
        showToast(`Erro ao excluir avaliação: ${error.message}`, 'error');
    }
  }, [showToast, logActivity, _fetchGlobalAndClientProfiles, guardSupabase]);

  const updateAgencyReview = useCallback(async (id: string, updates: Partial<AgencyReview>) => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot update agency review."); // Debug Log
        return;
    }
    console.log("[DataContext] Updating agency review ID:", id, "with updates:", updates); // Debug Log
    try {
        await sb.from('agency_reviews').update({
            rating: updates.rating,
            comment: updates.comment,
            tags: updates.tags,
            response: updates.response
        }).eq('id', id);
        showToast('Avaliação atualizada.', 'success');
        logActivity(ActivityActionType.REVIEW_UPDATED, { reviewId: id, updates });
        // Await the fetch to ensure data is updated before returning
        await _fetchGlobalAndClientProfiles();
        console.log("[DataContext] Agency review updated successfully:", id); // Debug Log
    } catch (error: any) {
        console.error("[DataContext] Error updating agency review:", error.message); // Debug Log
        showToast(`Erro ao atualizar avaliação: ${error.message}`, 'error');
    }
  }, [showToast, logActivity, _fetchGlobalAndClientProfiles, guardSupabase]);


  const toggleFavorite = useCallback(async (tripId: string, userId: string) => {
      const sb = guardSupabase();
      if (!sb) {
          console.warn("[DataContext] Supabase not configured, cannot toggle favorite.");
          showToast('Erro de conexão. Não foi possível favoritar.', 'error');
          return;
      }
      if (!userId) {
          showToast('Usuário não autenticado.', 'info');
          return;
      }
      
      console.log(`[DataContext] Toggling favorite for trip ${tripId} by user ${userId}.`);

      // 1. Optimistic UI update on 'clients' state
      setClients(prevClients => prevClients.map(client => {
          if (client.id === userId) {
              const currentFavorites = client.favorites || [];
              const isCurrentlyFavorite = currentFavorites.includes(tripId);
              const newFavorites = isCurrentlyFavorite
                  ? currentFavorites.filter(id => id !== tripId)
                  : [...currentFavorites, tripId];
              
              // Only show toast if state changed
              if (isCurrentlyFavorite !== newFavorites.includes(tripId)) {
                  showToast(isCurrentlyFavorite ? 'Removido dos favoritos.' : 'Adicionado aos favoritos!', isCurrentlyFavorite ? 'info' : 'success');
              }
              return { ...client, favorites: newFavorites };
          }
          return client;
      }));

      try {
          // 2. DB Operations - Check existence first
          const { data: existingFav, error: selectError } = await sb
              .from('favorites')
              .select('user_id')
              .eq('user_id', userId)
              .eq('trip_id', tripId)
              .maybeSingle();

          if (selectError) throw selectError;

          if (existingFav) {
              // Remove
              const { error: deleteError } = await sb
                  .from('favorites')
                  .delete()
                  .eq('user_id', userId)
                  .eq('trip_id', tripId);
              if (deleteError) throw deleteError;
              logActivity(ActivityActionType.FAVORITE_TOGGLED, { tripId, userId, isFavorite: false });
          } else {
              // Add
              const { error: insertError } = await sb
                  .from('favorites')
                  .insert({ user_id: userId, trip_id: tripId });
              if (insertError) throw insertError;
              logActivity(ActivityActionType.FAVORITE_TOGGLED, { tripId, userId, isFavorite: true });
          }
          
          // CRITICAL: Do NOT call _fetchGlobalAndClientProfiles() here. 
          // The optimistic update handles the UI, and background subscriptions will eventually sync if needed.
          // Calling fetchGlobal causes a full re-render/flash of the app.

      } catch (error: any) {
          console.error("[DataContext] Error toggling favorite in DB:", error.message);
          
          // Rollback Optimistic Update
          setClients(prevClients => prevClients.map(client => {
              if (client.id === userId) {
                  const currentFavorites = client.favorites || [];
                  const isCurrentlyFavorite = currentFavorites.includes(tripId); 
                  // If currently has it (meaning we optimistically added it), remove it. 
                  // If currently doesn't have it (meaning we optimistically removed it), add it back.
                  // Wait, 'currentFavorites' is the *new* state from optimistic update.
                  // We need to revert to the *old* state.
                  // Actually, simply checking if it's there and toggling again works as rollback logic:
                  const rolledBackFavorites = isCurrentlyFavorite
                      ? currentFavorites.filter(id => id !== tripId) // It was added, so remove
                      : [...currentFavorites, tripId]; // It was removed, so add back
                  return { ...client, favorites: rolledBackFavorites };
              }
              return client;
          }));
          showToast(`Erro ao atualizar favoritos: ${error.message}.`, 'error');
      }
  }, [showToast, logActivity, guardSupabase, setClients]);

  const updateClientProfile = useCallback(async (userId: string, data: Partial<Client>) => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot update client profile."); // Debug Log
        return;
    }
    console.log("[DataContext] Updating client profile ID:", userId, "with data:", data); // Debug Log
    try {
        const updates: any = {};
        if (data.name !== undefined) updates.full_name = data.name;
        if (data.email !== undefined) updates.email = data.email;
        if (data.phone !== undefined) updates.phone = data.phone;
        if (data.cpf !== undefined) updates.cpf = data.cpf;
        if (data.birthDate !== undefined) updates.birth_date = data.birthDate;
        if (data.avatar !== undefined) updates.avatar_url = data.avatar;
        if (data.address !== undefined) updates.address = data.address;
        if (data.status !== undefined) updates.status = data.status;

        await sb.from('profiles').update(updates).eq('id', userId);
        showToast('Perfil do cliente atualizado!', 'success');
        logActivity(ActivityActionType.CLIENT_PROFILE_UPDATED, { userId, updates });
        _fetchGlobalAndClientProfiles(); // Update local cache
        console.log("[DataContext] Client profile updated successfully:", userId); // Debug Log
    } catch (error: any) {
        console.error("[DataContext] Error updating client profile:", error.message); // Debug Log
        showToast(`Erro ao atualizar perfil do cliente: ${error.message}`, 'error');
        throw error; // Re-throw to allow component to handle loading state
    }
  }, [showToast, logActivity, _fetchGlobalAndClientProfiles, guardSupabase]);

  const updateAgencySubscription = useCallback(async (agencyId: string, status: string, plan: string, expiresAt?: string) => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot update agency subscription."); // Debug Log
        return;
    }
    console.log("[DataContext] Updating agency subscription ID:", agencyId, "Status:", status, "Plan:", plan, "Expires:", expiresAt); // Debug Log
    try {
        const updates: any = {
            subscription_status: status,
            subscription_plan: plan,
        };
        if (expiresAt) {
            updates.subscription_expires_at = expiresAt;
        }

        await sb.from('agencies').update(updates).eq('id', agencyId);
        showToast('Assinatura da agência atualizada!', 'success');
        logActivity(ActivityActionType.AGENCY_SUBSCRIPTION_UPDATED, { agencyId, updates });
        _fetchGlobalAndClientProfiles();
        console.log("[DataContext] Agency subscription updated successfully:", agencyId); // Debug Log
    } catch (error: any) {
        console.error("[DataContext] Error updating agency subscription:", error.message); // Debug Log
        showToast(`Erro ao atualizar assinatura da agência: ${error.message}`, 'error');
        throw error;
    }
  }, [showToast, logActivity, _fetchGlobalAndClientProfiles, guardSupabase]);

  const updateAgencyProfileByAdmin = useCallback(async (agencyId: string, data: Partial<Agency>) => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot update agency profile by admin."); // Debug Log
        return;
    }
    console.log("[DataContext] Admin updating agency profile ID:", agencyId, "with data:", data); // Debug Log
    try {
        const updates: any = {};
        if (data.name !== undefined) updates.name = data.name;
        if (data.description !== undefined) updates.description = data.description;
        if (data.cnpj !== undefined) updates.cnpj = data.cnpj;
        if (data.slug !== undefined) updates.slug = data.slug;
        if (data.phone !== undefined) updates.phone = data.phone;
        if (data.whatsapp !== undefined) updates.whatsapp = data.whatsapp;
        if (data.website !== undefined) updates.website = data.website;
        if (data.address !== undefined) updates.address = data.address;
        if (data.bankInfo !== undefined) updates.bank_info = data.bankInfo;

        await sb.from('agencies').update(updates).eq('id', agencyId);
        showToast('Perfil da agência atualizado pelo Admin!', 'success');
        logActivity(ActivityActionType.AGENCY_PROFILE_UPDATED, { agencyId, updates });
        _fetchGlobalAndClientProfiles();
        console.log("[DataContext] Agency profile updated by Admin successfully:", agencyId); // Debug Log
    } catch (error: any) {
        console.error("[DataContext] Error updating agency profile by admin:", error.message); // Debug Log
        showToast(`Erro ao atualizar perfil da agência: ${error.message}`, 'error');
        throw error;
    }
  }, [showToast, logActivity, _fetchGlobalAndClientProfiles, guardSupabase]);

  const toggleAgencyStatus = useCallback(async (agencyId: string) => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot toggle agency status."); // Debug Log
        return;
    }
    try {
        const currentAgencies = agenciesRef.current; // Use ref
        const agency = currentAgencies.find(a => a.agencyId === agencyId);
        if (!agency) {
            showToast('Agência não encontrada.', 'error');
            console.error("[DataContext] Agency not found for toggleAgencyStatus:", agencyId); // Debug Log
            return;
        }
        const newStatus = !agency.is_active;
        console.log(`[DataContext] Toggling status for agency ${agencyId} to ${newStatus}`); // Debug Log
        await sb.from('agencies').update({ is_active: newStatus }).eq('id', agencyId);
        showToast(`Agência ${newStatus ? 'ativada' : 'desativada'} com sucesso!`, 'success');
        logActivity(ActivityActionType.AGENCY_STATUS_TOGGLED, { agencyId, newStatus });
        _fetchGlobalAndClientProfiles();
        console.log("[DataContext] Agency status toggled successfully:", agencyId); // Debug Log
    } catch (error: any) {
        console.error("[DataContext] Error toggling agency status:", error.message); // Debug Log
        showToast(`Erro ao alterar status da agência: ${error.message}`, 'error');
    }
  }, [showToast, logActivity, _fetchGlobalAndClientProfiles, guardSupabase, agenciesRef]);

  const createTrip = useCallback(async (trip: Trip) => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot create trip."); // Debug Log
        throw new Error('Backend não configurado');
    }
    console.log("[DataContext] Creating trip:", trip.title); // Debug Log
    
    try {
        // FIX: Validate and generate unique slug before inserting
        const { normalizeSlug, validateSlug, generateUniqueSlug } = await import('../utils/slugUtils');
        const normalizedSlug = normalizeSlug(trip.slug, trip.title);
        const slugValidation = validateSlug(normalizedSlug);
        
        if (!slugValidation.valid) {
            throw new Error(`Slug inválido: ${slugValidation.error}`);
        }
        
        const uniqueSlug = await generateUniqueSlug(normalizedSlug, 'trips');
        console.log("[DataContext] Generated unique slug for trip:", uniqueSlug); // Debug Log
        
        // Timeout protection: 15 seconds for trip creation
        const insertPromise = sb.from('trips').insert({
            agency_id: trip.agencyId,
            title: trip.title,
            slug: uniqueSlug,
            description: trip.description,
            destination: trip.destination,
            price: trip.price,
            start_date: trip.startDate,
            end_date: trip.endDate,
            duration_days: trip.durationDays,
            category: trip.category,
            tags: trip.tags,
            traveler_types: trip.travelerTypes,
            itinerary: trip.itinerary,
            boarding_points: trip.boardingPoints,
            payment_methods: trip.paymentMethods,
            is_active: trip.is_active,
            included: trip.included,
            not_included: trip.notIncluded,
            featured: trip.featured,
            featured_in_hero: trip.featuredInHero, // FIX: Corrected column name
            popular_near_sp: trip.popularNearSP, // FIX: Corrected column name
            operational_data: trip.operationalData,
            latitude: trip.latitude,
            longitude: trip.longitude,
            passenger_config: trip.passengerConfig,
        }).select().single();

        const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('O servidor demorou muito para criar o pacote. Tente novamente.')), 15000)
        );

        const { data, error } = await Promise.race([insertPromise, timeoutPromise]);

        if (error) throw error;

        // Insert images
        if (trip.images && trip.images.length > 0) {
            console.log("[DataContext] Inserting trip images..."); // Debug Log
            const imagesPayload = trip.images.map((url, index) => ({
                trip_id: data.id,
                image_url: url,
                position: index
            }));
            const { error: imgError } = await sb.from('trip_images').insert(imagesPayload);
            if (imgError) console.error("[DataContext] Error inserting trip images:", imgError); // Debug Log
        }

        showToast('Pacote criado com sucesso!', 'success');
        logActivity(ActivityActionType.TRIP_CREATED, { tripId: data.id, title: data.title });
        _fetchGlobalAndClientProfiles();
        console.log("[DataContext] Trip created successfully:", data.id); // Debug Log
    } catch (error: any) {
        console.error("[DataContext] Error creating trip:", error.message); // Debug Log
        showToast(`Erro ao criar pacote: ${error.message}`, 'error');
        throw error;
    }
  }, [showToast, logActivity, _fetchGlobalAndClientProfiles, guardSupabase]);

  const updateTrip = useCallback(async (trip: Trip) => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot update trip."); // Debug Log
        throw new Error('Backend não configurado');
    }
    console.log("[DataContext] Updating trip:", trip.id, trip.title); // Debug Log
    
    // Validate slug before updating
    const slugValidation = validateSlug(trip.slug);
    if (!slugValidation.valid) {
        console.error("[DataContext] Invalid slug for trip update:", slugValidation.error);
        throw new Error(`Slug inválido: ${slugValidation.error}`);
    }
    
    // Ensure slug is unique (excluding current trip)
    const uniqueSlug = await generateUniqueSlug(trip.slug, 'trips', trip.id);
    
    try {
        // Timeout protection: 15 seconds for trip update
        const updatePromise = sb.from('trips').update({
            title: trip.title,
            slug: uniqueSlug,
            description: trip.description,
            destination: trip.destination,
            price: trip.price,
            start_date: trip.startDate,
            end_date: trip.endDate,
            duration_days: trip.durationDays,
            category: trip.category,
            tags: trip.tags,
            traveler_types: trip.travelerTypes,
            itinerary: trip.itinerary,
            boarding_points: trip.boardingPoints,
            payment_methods: trip.paymentMethods,
            is_active: trip.is_active,
            included: trip.included,
            not_included: trip.notIncluded,
            featured: trip.featured,
            featured_in_hero: trip.featuredInHero, // FIX: Corrected column name
            popular_near_sp: trip.popularNearSP, // FIX: Corrected column name
            operational_data: trip.operationalData,
            latitude: trip.latitude,
            longitude: trip.longitude,
            passenger_config: trip.passengerConfig,
        }).eq('id', trip.id);

        const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('O servidor demorou muito para atualizar o pacote. Tente novamente.')), 15000)
        );

        const { error } = await Promise.race([updatePromise, timeoutPromise]);

        if (error) throw error;

        // Handle images: delete old and insert new
        console.log("[DataContext] Updating trip images: deleting old..."); // Debug Log
        await sb.from('trip_images').delete().eq('trip_id', trip.id);
        if (trip.images && trip.images.length > 0) {
            console.log("[DataContext] Updating trip images: inserting new..."); // Debug Log
            const imagesPayload = trip.images.map((url, index) => ({
                trip_id: trip.id,
                image_url: url,
                position: index
            }));
            const { error: imgError } = await sb.from('trip_images').insert(imagesPayload);
            if (imgError) console.error("[DataContext] Error re-inserting trip images:", imgError); // Debug Log
        }

        showToast('Pacote atualizado com sucesso!', 'success');
        logActivity(ActivityActionType.TRIP_UPDATED, { tripId: trip.id, title: trip.title });
        _fetchGlobalAndClientProfiles();
        console.log("[DataContext] Trip updated successfully:", trip.id); // Debug Log
    } catch (error: any) {
        console.error("[DataContext] Error updating trip:", error.message); // Debug Log
        showToast(`Erro ao atualizar pacote: ${error.message}`, 'error');
        throw error;
    }
  }, [showToast, logActivity, _fetchGlobalAndClientProfiles, guardSupabase]);

  const deleteTrip = useCallback(async (tripId: string) => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot delete trip."); // Debug Log
        return;
    }
    console.log("[DataContext] Deleting trip:", tripId); // Debug Log
    try {
        // Delete related images first
        await sb.from('trip_images').delete().eq('trip_id', tripId);
        await sb.from('trips').delete().eq('id', tripId);
        showToast('Pacote excluído com sucesso!', 'success');
        logActivity(ActivityActionType.TRIP_DELETED, { tripId });
        _fetchGlobalAndClientProfiles();
        console.log("[DataContext] Trip deleted successfully:", tripId); // Debug Log
    } catch (error: any) {
        console.error("[DataContext] Error deleting trip:", error.message); // Debug Log
        showToast(`Erro ao excluir pacote: ${error.message}`, 'error');
    }
  }, [showToast, logActivity, _fetchGlobalAndClientProfiles, guardSupabase]);

  const toggleTripStatus = useCallback(async (tripId: string) => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot toggle trip status."); // Debug Log
        return;
    }
    try {
        const currentTrips = tripsRef.current; // Use ref
        const trip = currentTrips.find(t => t.id === tripId);
        if (!trip) {
            showToast('Viagem não encontrada.', 'error');
            console.error("[DataContext] Trip not found for toggleTripStatus:", tripId); // Debug Log
            return;
        }
        const newStatus = !trip.is_active;
        console.log(`[DataContext] Toggling status for trip ${tripId} to ${newStatus}`); // Debug Log
        await sb.from('trips').update({ is_active: newStatus }).eq('id', tripId);
        showToast(`Viagem ${newStatus ? 'publicada' : 'pausada'} com sucesso!`, 'success');
        logActivity(ActivityActionType.TRIP_STATUS_TOGGLED, { tripId, newStatus });
        _fetchGlobalAndClientProfiles();
        console.log("[DataContext] Trip status toggled successfully:", tripId); // Debug Log
    } catch (error: any) {
        console.error("[DataContext] Error toggling trip status:", error.message); // Debug Log
        showToast(`Erro ao alterar status da viagem: ${error.message}`, 'error');
    }
  }, [showToast, logActivity, _fetchGlobalAndClientProfiles, guardSupabase, tripsRef]);

  const toggleTripFeatureStatus = useCallback(async (tripId: string) => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot toggle trip feature status."); // Debug Log
        return;
    }
    try {
        const currentTrips = tripsRef.current; // Use ref
        const trip = currentTrips.find(t => t.id === tripId);
        if (!trip) {
            showToast('Viagem não encontrada.', 'error');
            console.error("[DataContext] Trip not found for toggleTripFeatureStatus:", tripId); // Debug Log
            return;
        }
        const newFeaturedStatus = !trip.featured;
        console.log(`[DataContext] Toggling featured status for trip ${tripId} to ${newFeaturedStatus}`); // Debug Log
        await sb.from('trips').update({ featured: newFeaturedStatus }).eq('id', trip.id);
        showToast(`Viagem ${newFeaturedStatus ? 'destacada' : 'removida do destaque'} com sucesso!`, 'success');
        logActivity(ActivityActionType.TRIP_UPDATED, { tripId, featured: newFeaturedStatus });
        _fetchGlobalAndClientProfiles();
        console.log("[DataContext] Trip feature status toggled successfully:", tripId); // Debug Log
    } catch (error: any) {
        console.error("[DataContext] Error toggling trip feature status:", error.message); // Debug Log
        showToast(`Erro ao alterar destaque da viagem: ${error.message}`, 'error');
    }
  }, [showToast, logActivity, _fetchGlobalAndClientProfiles, guardSupabase, tripsRef]);

  const updateTripOperationalData = useCallback(async (tripId: string, data: OperationalData) => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot update trip operational data."); // Debug Log
        return;
    }
    console.log("[DataContext] Updating operational data for trip:", tripId, "Data:", data); // Debug Log
    try {
        await sb.from('trips').update({ operational_data: data }).eq('id', tripId);
        showToast('Dados operacionais atualizados!', 'success');
        _fetchGlobalAndClientProfiles(); // To ensure local cache is up-to-date
        console.log("[DataContext] Operational data updated successfully:", tripId); // Debug Log
    } catch (error: any) {
        console.error("[DataContext] Error updating operational data:", error.message); // Debug Log
        showToast(`Erro ao atualizar dados operacionais: ${error.message}`, 'error');
        throw error;
    }
  }, [showToast, _fetchGlobalAndClientProfiles, guardSupabase]);

  const softDeleteEntity = useCallback(async (id: string, table: string) => {
      const sb = guardSupabase();
      if (!sb) {
          console.warn("[DataContext] Supabase not configured, cannot soft delete entity."); // Debug Log
          return;
      }
      console.log(`[DataContext] Soft deleting entity ID: ${id} from table: ${table}`); // Debug Log
      try {
          await sb.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id);
          showToast('Movido para a lixeira.', 'success');
          logActivity(ActivityActionType.DELETE_USER, { entityId: id, table, softDelete: true }); // Corrected enum usage
          _fetchGlobalAndClientProfiles();
          console.log("[DataContext] Entity soft deleted successfully:", id); // Debug Log
      } catch (error: any) {
          console.error("[DataContext] Error soft deleting entity:", error.message); // Debug Log
          showToast(`Erro ao mover para a lixeira: ${error.message}`, 'error');
      }
  }, [showToast, logActivity, _fetchGlobalAndClientProfiles, guardSupabase]);

  const restoreEntity = useCallback(async (id: string, table: string) => {
      const sb = guardSupabase();
      if (!sb) {
          console.warn("[DataContext] Supabase not configured, cannot restore entity."); // Debug Log
          return;
      }
      console.log(`[DataContext] Restoring entity ID: ${id} from table: ${table}`); // Debug Log
      try {
          await sb.from(table).update({ deleted_at: null }).eq('id', id);
          showToast('Restaurado com sucesso.', 'success');
          _fetchGlobalAndClientProfiles();
          console.log("[DataContext] Entity restored successfully:", id); // Debug Log
      } catch (error: any) {
          console.error("[DataContext] Error restoring entity:", error.message); // Debug Log
          showToast(`Erro ao restaurar: ${error.message}`, 'error');
      }
  }, [showToast, _fetchGlobalAndClientProfiles, guardSupabase]);

  const deleteUser = useCallback(async (id: string, role: string) => {
      const sb = guardSupabase();
      if (!sb) {
          console.warn("[DataContext] Supabase not configured, cannot delete user."); // Debug Log
          return;
      }
      console.log(`[DataContext] Deleting user ID: ${id} with role: ${role}`); // Debug Log
      try {
          // Delete associated records first
          if (role === UserRole.AGENCY) {
              console.log("[DataContext] Deleting associated agency data..."); // Debug Log
              await sb.from('agencies').delete().eq('user_id', id);
              const agencyTrips = tripsRef.current.filter(t => t.agencyId === id); // Use ref here
              for (const trip of agencyTrips) {
                  await deleteTrip(trip.id); // Reuses deleteTrip logic
              }
              await sb.from('agency_reviews').delete().eq('agency_id', id); // assuming agency_id in reviews is user_id
          } else if (role === UserRole.CLIENT) {
              console.log("[DataContext] Deleting associated client data..."); // Debug Log
              await sb.from('bookings').delete().eq('client_id', id);
              await sb.from('agency_reviews').delete().eq('client_id', id);
              await sb.from('favorites').delete().eq('user_id', id); // Delete favorites
          }
          await sb.from('profiles').delete().eq('id', id);
          
          // Delete from auth.users (requires admin)
          // For frontend, assume logic handled or soft delete is primary
          // If we really want to delete auth user from client, we need a backend function or service role
          const { error: authError } = await sb.auth.admin.deleteUser(id);
          if (authError) {
             console.warn(`[DataContext] Could not delete Auth user ${id}: ${authError.message}`); // Debug Log
             // Try self-delete fallback for current user not applicable here as this is admin action
             // Just warn
             showToast(`Usuário DB excluído, mas conta de autenticação pode persistir: ${authError.message}`, 'warning');
          } else {
             showToast('Usuário excluído permanentemente.', 'success');
          }

          logActivity(ActivityActionType.DELETE_USER, { userId: id, role, permanent: true }); // Corrected enum usage
          _fetchGlobalAndClientProfiles();
          console.log("[DataContext] User deleted successfully:", id); // Debug Log
      } catch (error: any) {
          console.error("[DataContext] Error deleting user permanently:", error.message); // Debug Log
          showToast(`Erro ao excluir usuário: ${error.message}`, 'error');
      }
  }, [showToast, deleteTrip, logActivity, _fetchGlobalAndClientProfiles, guardSupabase, tripsRef]); // tripsRef.current is used inside deleteUser, but not as dependency

  const deleteMultipleUsers = useCallback(async (ids: string[]) => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot delete multiple users."); // Debug Log
        return;
    }
    console.log("[DataContext] Deleting multiple users:", ids); // Debug Log
    try {
        // Delete all associated profiles
        await sb.from('profiles').delete().in('id', ids);
        await sb.from('favorites').delete().in('user_id', ids); // Delete favorites for multiple users
        // Delete from auth.users (if service_role key is available and policies allow)
        for (const id of ids) {
            const { error: authError } = await sb.auth.admin.deleteUser(id);
            if (authError) console.warn(`[DataContext] Could not delete Auth user ${id}: ${authError.message}`); // Debug Log
        }
        showToast('Usuários selecionados excluídos.', 'success');
        logActivity(ActivityActionType.DELETE_MULTIPLE_USERS, { userIds: ids }); // Corrected enum usage
        _fetchGlobalAndClientProfiles();
        console.log("[DataContext] Multiple users deleted successfully."); // Debug Log
    } catch (error: any) {
        console.error("[DataContext] Error deleting multiple users:", error.message); // Debug Log
        showToast(`Erro ao excluir múltiplos usuários: ${error.message}`, 'error');
    }
  }, [showToast, logActivity, _fetchGlobalAndClientProfiles, guardSupabase]);

  const deleteMultipleAgencies = useCallback(async (agencyPks: string[]) => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot delete multiple agencies."); // Debug Log
        return;
    }
    console.log("[DataContext] Deleting multiple agencies:", agencyPks); // Debug Log
    try {
        // Find the user_ids associated with these agencyPks
        const { data: agencyData, error: fetchError } = await sb.from('agencies').select('user_id, id').in('id', agencyPks);
        if (fetchError) throw fetchError;
        const userIdsToDelete = agencyData.map(a => a.user_id);
        const agencyIdsToDelete = agencyData.map(a => a.id);

        // Delete associated trips and reviews for each agency
        for (const agencyId of agencyIdsToDelete) {
            console.log("[DataContext] Deleting associated trips and reviews for agency:", agencyId); // Debug Log
            const agencyTrips = tripsRef.current.filter(t => t.agencyId === agencyId); // Use ref here
            for (const trip of agencyTrips) {
                await deleteTrip(trip.id);
            }
            await sb.from('agency_reviews').delete().eq('agency_id', agencyId);
        }

        // Delete the agencies themselves
        await sb.from('agencies').delete().in('id', agencyIdsToDelete);
        // Delete the corresponding profiles
        await sb.from('profiles').delete().in('id', userIdsToDelete);
        // Delete from auth.users
        for (const userId of userIdsToDelete) {
            const { error: authError } = await sb.auth.admin.deleteUser(userId);
            if (authError) console.warn(`[DataContext] Could not delete Auth user ${userId}: ${authError.message}`); // Debug Log
        }

        showToast('Agências selecionadas excluídas.', 'success');
        logActivity(ActivityActionType.DELETE_MULTIPLE_AGENCIES, { agencyPks, userIds: userIdsToDelete }); // Corrected enum usage
        _fetchGlobalAndClientProfiles();
        console.log("[DataContext] Multiple agencies deleted successfully."); // Debug Log
    } catch (error: any) {
        console.error("[DataContext] Error deleting multiple agencies:", error.message); // Debug Log
        showToast(`Erro ao excluir múltiplas agências: ${error.message}`, 'error');
    }
  }, [showToast, deleteTrip, logActivity, _fetchGlobalAndClientProfiles, guardSupabase, tripsRef]); // tripsRef.current is used here too

  // Admin-specific functions
  const adminChangePlan = useCallback(async (agencyId: string, newPlan: 'BASIC' | 'PREMIUM') => {
    const sb = guardSupabase();
    if (!sb) {
      console.warn("[DataContext] Supabase not configured, cannot change plan.");
      return;
    }
    try {
      await sb.from('agencies').update({ subscription_plan: newPlan }).eq('id', agencyId);
      showToast(`Plano alterado para ${newPlan}`, 'success');
      logActivity(ActivityActionType.AGENCY_SUBSCRIPTION_UPDATED, { agencyId, newPlan });
      _fetchGlobalAndClientProfiles();
    } catch (error: any) {
      console.error("[DataContext] Error changing plan:", error.message);
      showToast(`Erro ao alterar plano: ${error.message}`, 'error');
      throw error;
    }
  }, [showToast, logActivity, _fetchGlobalAndClientProfiles, guardSupabase]);

  const adminBulkDeleteAgencies = useCallback(async (agencyIds: string[]) => {
    // Alias for deleteMultipleAgencies
    await deleteMultipleAgencies(agencyIds);
  }, [deleteMultipleAgencies]);

  const adminBulkArchiveAgencies = useCallback(async (agencyIds: string[]) => {
    const sb = guardSupabase();
    if (!sb) {
      console.warn("[DataContext] Supabase not configured, cannot archive agencies.");
      return;
    }
    try {
      const now = new Date().toISOString();
      await sb.from('agencies').update({ deleted_at: now }).in('id', agencyIds);
      showToast(`${agencyIds.length} agência(s) arquivada(s)`, 'success');
      logActivity(ActivityActionType.SOFT_DELETE_ENTITY, { table: 'agencies', ids: agencyIds });
      _fetchGlobalAndClientProfiles();
    } catch (error: any) {
      console.error("[DataContext] Error archiving agencies:", error.message);
      showToast(`Erro ao arquivar agências: ${error.message}`, 'error');
      throw error;
    }
  }, [showToast, logActivity, _fetchGlobalAndClientProfiles, guardSupabase]);

  const adminBulkChangePlan = useCallback(async (agencyIds: string[], newPlan: 'BASIC' | 'PREMIUM') => {
    const sb = guardSupabase();
    if (!sb) {
      console.warn("[DataContext] Supabase not configured, cannot bulk change plan.");
      return;
    }
    try {
      await sb.from('agencies').update({ subscription_plan: newPlan }).in('id', agencyIds);
      showToast(`${agencyIds.length} agência(s) atualizada(s) para ${newPlan}`, 'success');
      logActivity(ActivityActionType.AGENCY_SUBSCRIPTION_UPDATED, { agencyIds, newPlan, bulk: true });
      _fetchGlobalAndClientProfiles();
    } catch (error: any) {
      console.error("[DataContext] Error bulk changing plan:", error.message);
      showToast(`Erro ao alterar planos: ${error.message}`, 'error');
      throw error;
    }
  }, [showToast, logActivity, _fetchGlobalAndClientProfiles, guardSupabase]);

  const adminSuspendAgency = useCallback(async (agencyId: string) => {
    const sb = guardSupabase();
    if (!sb) {
      console.warn("[DataContext] Supabase not configured, cannot suspend agency.");
      return;
    }
    try {
      await sb.from('agencies').update({ subscription_status: 'INACTIVE', is_active: false }).eq('id', agencyId);
      showToast('Agência suspensa', 'success');
      logActivity(ActivityActionType.AGENCY_STATUS_TOGGLED, { agencyId, status: 'SUSPENDED' });
      _fetchGlobalAndClientProfiles();
    } catch (error: any) {
      console.error("[DataContext] Error suspending agency:", error.message);
      showToast(`Erro ao suspender agência: ${error.message}`, 'error');
      throw error;
    }
  }, [showToast, logActivity, _fetchGlobalAndClientProfiles, guardSupabase]);

  const getUsersStats = useCallback(async (userIds: string[]): Promise<UserStats[]> => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot get user stats."); // Debug Log
        return [];
    }
    console.log("[DataContext] Getting user stats for user IDs:", userIds); // Debug Log
    try {
        const statsPromises = userIds.map(async userId => {
            const currentClients = clientsRef.current; // Use ref
            const client = currentClients.find(c => c.id === userId);
            if (!client) return null;

            const userBookings = bookings.filter(b => b.clientId === userId);
            const totalSpent = userBookings.reduce((sum, b) => sum + b.totalPrice, 0);
            const totalBookings = userBookings.length;
            const totalReviews = agencyReviews.filter(r => r.clientId === userId).length;

            return {
                userId: client.id,
                userName: client.name,
                totalSpent,
                totalBookings,
                totalReviews
            };
        });
        const results = await Promise.all(statsPromises);
        console.log("[DataContext] User stats retrieved successfully."); // Debug Log
        return results.filter(s => s !== null) as UserStats[];
    } catch (error: any) {
        console.error("[DataContext] Error getting user stats:", error.message); // Debug Log
        showToast(`Erro ao buscar estatísticas de usuários: ${error.message}`, 'error');
        return [];
    }
  }, [bookings, agencyReviews, showToast, guardSupabase, clientsRef]); // clientsRef added

  const updateMultipleUsersStatus = useCallback(async (ids: string[], status: string) => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot update multiple users status."); // Debug Log
        return;
    }
    console.log(`[DataContext] Updating status for multiple users ${ids} to ${status}`); // Debug Log
    try {
        await sb.from('profiles').update({ status: status }).in('id', ids);
        showToast('Status dos usuários atualizado.', 'success');
        logActivity(ActivityActionType.CLIENT_PROFILE_UPDATED, { userIds: ids, status }); // Corrected enum usage
        _fetchGlobalAndClientProfiles();
        console.log("[DataContext] Multiple users status updated successfully."); // Debug Log
    } catch (error: any) {
        console.error("[DataContext] Error updating multiple users status:", error.message); // Debug Log
        showToast(`Erro ao atualizar status de múltiplos usuários: ${error.message}`, 'error');
    }
  }, [showToast, logActivity, _fetchGlobalAndClientProfiles, guardSupabase]);

  const updateMultipleAgenciesStatus = useCallback(async (ids: string[], status: string) => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot update multiple agencies status."); // Debug Log
        return;
    }
    console.log(`[DataContext] Updating status for multiple agencies ${ids} to ${status}`); // Debug Log
    try {
        await sb.from('agencies').update({ is_active: status === 'ACTIVE' }).in('id', ids);
        showToast('Status das agências atualizado.', 'success');
        logActivity(ActivityActionType.AGENCY_STATUS_TOGGLED, { agencyIds: ids, newStatus: status === 'ACTIVE' });
        _fetchGlobalAndClientProfiles();
        console.log("[DataContext] Multiple agencies status updated successfully."); // Debug Log
    } catch (error: any) {
        console.error("[DataContext] Error updating multiple agencies status:", error.message); // Debug Log
        showToast(`Erro ao atualizar status de múltiplas agências: ${error.message}`, 'error');
    }
  }, [showToast, logActivity, _fetchGlobalAndClientProfiles, guardSupabase]);

  const logAuditAction = useCallback(async (action: string, details: string) => {
      const sb = guardSupabase();
      if (!sb || !user?.email) {
          console.warn("[DataContext] Supabase not configured or user email missing, cannot log audit action."); // Debug Log
          return;
      }
      console.log(`[DataContext] Logging audit action: ${action} by admin ${user.email}`); // Debug Log
      try {
          await sb.from('audit_logs').insert({
              admin_email: user.email,
              action: action,
              details: details
          });
          _fetchGlobalAndClientProfiles();
          console.log("[DataContext] Audit action logged successfully."); // Debug Log
      } catch (error: any) {
          console.error("[DataContext] Error logging audit action:", error.message); // Debug Log
      }
  }, [user, _fetchGlobalAndClientProfiles, guardSupabase]);

  const sendPasswordReset = useCallback(async (email: string) => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot send password reset."); // Debug Log
        return;
    }
    console.log("[DataContext] Sending password reset for email:", email); // Debug Log
    try {
        const { error } = await sb.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/#/forgot-password` // Use hash for react-router-dom HashRouter
        });
        if (error) throw error;
        showToast('Link de reset de senha enviado para o email!', 'success');
        console.log("[DataContext] Password reset link sent successfully."); // Debug Log
    } catch (error: any) {
        console.error("[DataContext] Error sending password reset:", error.message); // Debug Log
        showToast(`Erro ao enviar link de reset: ${error.message}`, 'error');
    }
  }, [showToast, guardSupabase]);

  const updateUserAvatarByAdmin = useCallback(async (userId: string, file: File): Promise<string | null> => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot update user avatar by admin."); // Debug Log
        return null;
    }
    console.log("[DataContext] Admin updating avatar for user ID:", userId); // Debug Log
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await sb.storage
            .from('avatars')
            .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = sb.storage.from('avatars').getPublicUrl(fileName);

        // Update profile table
        await sb.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId);

        _fetchGlobalAndClientProfiles(); // Refresh to update UI
        console.log("[DataContext] User avatar updated by admin successfully. URL:", data.publicUrl); // Debug Log
        return data.publicUrl;
    } catch (error: any) {
        console.error("[DataContext] Admin avatar upload error:", error.message); // Debug Log
        showToast(`Erro ao atualizar avatar: ${error.message}`, 'error');
        return null;
    }
  }, [showToast, _fetchGlobalAndClientProfiles, guardSupabase]);

  const getAgencyStats = useCallback(async (agencyId: string): Promise<DashboardStats> => {
    const sb = guardSupabase();
    const zeros = { totalRevenue: 0, totalViews: 0, totalSales: 0, conversionRate: 0, averageRating: 0, totalReviews: 0 };
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, returning zero stats."); // Debug Log
        return zeros;
    }
    console.log("[DataContext] Fetching agency stats for ID:", agencyId); // Debug Log
    
    try {
        const currentTrips = tripsRef.current; 
        const currentBookings = bookings; 
        
        // 1. Calcular Vendas e Receita baseado em Bookings
        const relevantBookings = currentBookings.filter(b => b._trip?.agencyId === agencyId && b.status === 'CONFIRMED');
        
        // Vendas = Passageiros (não apenas pedidos)
        const totalSales = relevantBookings.reduce((sum, b) => sum + Number(b.passengers || 1), 0); 
        
        const totalRevenue = relevantBookings.reduce((sum, b) => sum + Number(b.totalPrice), 0);

        // 2. Calcular Views
        const agencyTrips = currentTrips.filter(t => t.agencyId === agencyId);
        let totalViews = 0;
        agencyTrips.forEach(trip => {
            totalViews += Number(trip.views || 0);
        });

        // 3. Calcular Avaliação (usando Agency Reviews diretos)
        const currentAgencyReviews = agencyReviews.filter(r => r.agencyId === agencyId);
        const totalReviews = currentAgencyReviews.length;
        const totalRatingSum = currentAgencyReviews.reduce((sum, r) => sum + r.rating, 0);
        const averageRating = totalReviews > 0 ? totalRatingSum / totalReviews : 0;
 
        const conversionRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;
 
        return {
             totalRevenue,
             totalViews,
             totalSales,
             conversionRate,
             averageRating,
             totalReviews,
        };
        
      } catch (err: any) {
         console.warn("[DataContext] Agency stats calculation failed:", err.message); // Debug Log
         return zeros;
      }
   }, [guardSupabase, tripsRef, bookings, agencyReviews]);

  const getAgencyTheme = useCallback(async (agencyId: string): Promise<AgencyTheme | null> => {
      const sb = guardSupabase();
      if (!sb) {
          console.warn("[DataContext] Supabase not configured, cannot get agency theme."); // Debug Log
          return null;
      }
      console.log("[DataContext] Fetching agency theme for ID:", agencyId); // Debug Log
      try {
          const { data, error } = await sb.from('agency_themes')
            .select('agency_id, colors, font_pair, border_radius, button_style, header_style, background_image, background_blur, background_opacity, updated_at')
            .eq('agency_id', agencyId)
            .maybeSingle();
          if (error) throw error;
          if (data) {
              console.log("[DataContext] Agency theme loaded:", data); // Debug Log
              return {
                  agencyId: data.agency_id,
                  colors: data.colors as ThemeColors,
                  fontPair: data.font_pair as 'modern' | 'classic' | 'playful' | undefined,
                  borderRadius: data.border_radius as 'none' | 'soft' | 'full' | undefined,
                  buttonStyle: data.button_style as 'solid' | 'outline' | 'ghost' | undefined,
                  headerStyle: data.header_style as 'transparent' | 'solid' | undefined,
                  backgroundImage: data.background_image || undefined,
                  backgroundBlur: data.background_blur || undefined,
                  backgroundOpacity: data.background_opacity || undefined,
                  updatedAt: data.updated_at,
              };
          }
          console.log("[DataContext] No agency theme found for ID:", agencyId); // Debug Log
          return null;
      } catch (error: any) {
          console.error("[DataContext] Error fetching agency theme:", error.message); // Debug Log
          return null;
      }
  }, [guardSupabase]);

  const saveAgencyTheme = useCallback(async (agencyId: string, theme: Partial<AgencyTheme>): Promise<boolean> => {
      const sb = guardSupabase();
      if (!sb) {
          console.warn("[DataContext] Supabase not configured, cannot save agency theme."); // Debug Log
          return false;
      }
      console.log("[DataContext] Saving agency theme for ID:", agencyId, "Theme:", theme); // Debug Log
      try {
          const { error } = await sb.from('agency_themes').upsert({
              agency_id: agencyId,
              colors: theme.colors,
              font_pair: theme.fontPair,
              border_radius: theme.borderRadius,
              button_style: theme.buttonStyle,
              header_style: theme.headerStyle,
              background_image: theme.backgroundImage,
              background_blur: theme.backgroundBlur,
              background_opacity: theme.backgroundOpacity,
          }, { onConflict: 'agency_id' }); // If a theme for this agency already exists, update it

          if (error) throw error;
          _fetchGlobalAndClientProfiles(); // Refresh to ensure theme is picked up if needed elsewhere
          console.log("[DataContext] Agency theme saved successfully:", agencyId); // Debug Log
          return true;
      } catch (error: any) {
          console.error("[DataContext] Error saving agency theme:", error.message); // Debug Log
          return false;
      }
  }, [_fetchGlobalAndClientProfiles, guardSupabase]);

  const incrementTripViews = useCallback(async (tripId: string) => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot increment trip views."); // Debug Log
        return;
    }
    console.log("[DataContext] Incrementing views for trip ID:", tripId); // Debug Log
    try {
        const { error } = await sb.rpc('increment_trip_views', { trip_id_param: tripId, increment_value: 1 });
        if (error) throw error;
        console.log("[DataContext] Trip views incremented successfully:", tripId); // Debug Log
    } catch (error: any) {
        console.error("[DataContext] Error incrementing trip views:", error.message); // Debug Log
    }
  }, [guardSupabase]);

  // Load trip images on-demand to reduce egress
  // Update Platform Settings (Admin Only)
  const updatePlatformSettings = useCallback(async (data: Partial<PlatformSettings>) => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot update platform settings."); // Debug Log
        showToast('Backend não configurado.', 'error');
        return;
    }

    // Check if user is admin
    if (!user || user.role !== UserRole.ADMIN) {
        showToast('Apenas administradores podem alterar as configurações da plataforma.', 'error');
        return;
    }

    console.log("[DataContext] Updating platform settings:", data); // Debug Log
    try {
        const updates: any = {};
        if (data.platform_name !== undefined) updates.platform_name = data.platform_name;
        if (data.platform_logo_url !== undefined) updates.platform_logo_url = data.platform_logo_url;
        if (data.maintenance_mode !== undefined) updates.maintenance_mode = data.maintenance_mode;
        if (data.layout_style !== undefined) updates.layout_style = data.layout_style;
        if (data.background_color !== undefined) updates.background_color = data.background_color;
        if (data.background_blur !== undefined) updates.background_blur = data.background_blur;
        if (data.background_transparency !== undefined) updates.background_transparency = data.background_transparency;
        if (data.default_settings !== undefined) updates.default_settings = data.default_settings;

        const { error } = await sb
            .from('platform_settings')
            .update(updates)
            .eq('id', 1);

        if (error) throw error;

        // Refresh platform settings
        const { data: updatedSettings } = await sb
            .from('platform_settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (updatedSettings) {
            setPlatformSettings({
                id: updatedSettings.id,
                platform_name: updatedSettings.platform_name || 'ViajaStore',
                platform_logo_url: updatedSettings.platform_logo_url,
                maintenance_mode: updatedSettings.maintenance_mode || false,
                layout_style: updatedSettings.layout_style || 'rounded',
                background_color: updatedSettings.background_color || '#ffffff',
                background_blur: updatedSettings.background_blur || false,
                background_transparency: updatedSettings.background_transparency || 1.0,
                default_settings: updatedSettings.default_settings,
                created_at: updatedSettings.created_at,
                updated_at: updatedSettings.updated_at
            });
        }

        showToast('Configurações da plataforma atualizadas!', 'success');
        logActivity(ActivityActionType.UPDATE_SETTINGS, { settings: updates });
        console.log("[DataContext] Platform settings updated successfully"); // Debug Log
    } catch (error: any) {
        console.error("[DataContext] Error updating platform settings:", error.message); // Debug Log
        showToast(`Erro ao atualizar configurações: ${error.message}`, 'error');
        throw error;
    }
  }, [user, showToast, logActivity, guardSupabase]);

  const fetchTripImages = useCallback(async (tripId: string, forceRefresh: boolean = false): Promise<string[]> => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot fetch trip images."); // Debug Log
        return [];
    }
    
    // Check if trip already has images cached (unless force refresh)
    const trip = tripsRef.current.find(t => t.id === tripId);
    if (!forceRefresh && trip && trip.images && trip.images.length > 0) {
        return trip.images;
    }
    
    console.log("[DataContext] Fetching images for trip ID:", tripId, forceRefresh ? "(force refresh)" : ""); // Debug Log
    try {
        const { data, error } = await sb
            .from('trip_images')
            .select('image_url, position')
            .eq('trip_id', tripId)
            .order('position', { ascending: true });
        
        if (error) throw error;
        
        const imageUrls = (data || []).map((img: any) => img.image_url);
        
        // Update trip in state with images
        setTrips(prevTrips => 
            prevTrips.map(t => 
                t.id === tripId 
                    ? { ...t, images: imageUrls }
                    : t
            )
        );
        
        console.log("[DataContext] Trip images fetched successfully:", tripId, "Count:", imageUrls.length); // Debug Log
        return imageUrls;
    } catch (error: any) {
        console.error("[DataContext] Error fetching trip images:", error.message); // Debug Log
        return [];
    }
  }, [guardSupabase]);

  const refreshUserData = useCallback(async () => {
      console.log("[DataContext] refreshUserData triggered");
      if (user) {
          await _fetchGlobalAndClientProfiles(); // To update favorites/profile
          await _fetchBookingsForCurrentUser();
      }
  }, [user, _fetchGlobalAndClientProfiles, _fetchBookingsForCurrentUser]);

  // Server-side Search Mocks (Local Filtering)
  const searchTrips = useCallback(async (params: SearchTripsParams): Promise<PaginatedResult<Trip>> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let result = tripsRef.current.filter(t => t.is_active); 
    
    if (params.featured !== undefined) {
        result = result.filter(t => t.featured === params.featured);
    }

    if (params.query) {
        const q = normalizeText(params.query);
        result = result.filter(t => 
            normalizeText(t.title).includes(q) || 
            normalizeText(t.destination).includes(q) || 
            t.tags.some(tag => normalizeText(tag).includes(q))
        );
    }
    
    if (params.category) result = result.filter(t => t.category === params.category);
    if (params.agencyId) result = result.filter(t => t.agencyId === params.agencyId);
    if (params.minPrice) result = result.filter(t => t.price >= params.minPrice!);
    if (params.maxPrice) result = result.filter(t => t.price <= params.maxPrice!);

    // Date range filtering: trips that overlap with or are within the search date range
    if (params.startDate || params.endDate) {
        const searchStart = params.startDate ? new Date(params.startDate) : null;
        const searchEnd = params.endDate ? new Date(params.endDate) : null;
        
        result = result.filter(t => {
            const tripStart = new Date(t.startDate);
            const tripEnd = new Date(t.endDate);
            
            // Trip overlaps with search range if:
            // - Trip starts before search ends AND trip ends after search starts
            if (searchStart && searchEnd) {
                return tripStart <= searchEnd && tripEnd >= searchStart;
            }
            // If only start date provided, show trips that start on or after that date
            if (searchStart && !searchEnd) {
                return tripStart >= searchStart;
            }
            // If only end date provided, show trips that end on or before that date
            if (!searchStart && searchEnd) {
                return tripEnd <= searchEnd;
            }
            return true;
        });
    }

    // Guest filtering
    if (params.children !== undefined && params.children > 0) {
        // If children are included, filter trips that allow children
        result = result.filter(t => t.allowChildren !== false);
    }
    
    if (params.adults !== undefined || params.children !== undefined) {
        const totalGuests = (params.adults || 0) + (params.children || 0);
        if (totalGuests > 0) {
            result = result.filter(t => {
                // If trip has maxGuests defined, check if it can accommodate
                if (t.maxGuests !== undefined) {
                    return t.maxGuests >= totalGuests;
                }
                // If no maxGuests defined, allow the trip (assume it can accommodate)
                return true;
            });
        }
    }

    // Geolocation filtering (simple distance-based, can be improved with Haversine formula)
    if (params.latitude !== undefined && params.longitude !== undefined && params.radius) {
        const searchLat = params.latitude;
        const searchLng = params.longitude;
        const radiusKm = params.radius || 50; // Default 50km radius
        
        result = result.filter(t => {
            if (t.latitude === undefined || t.longitude === undefined) {
                // If trip has no coordinates, include it (or exclude based on preference)
                return true; // Include trips without coordinates for now
            }
            
            // Simple distance calculation (Haversine would be more accurate)
            const latDiff = (t.latitude - searchLat) * 111; // 1 degree ≈ 111 km
            const lngDiff = (t.longitude - searchLng) * 111 * Math.cos(searchLat * Math.PI / 180);
            const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
            
            return distance <= radiusKm;
        });
    }

    if (params.sort) {
        switch (params.sort) {
            case 'LOW_PRICE': result.sort((a, b) => a.price - b.price); break;
            case 'HIGH_PRICE': result.sort((a, b) => b.price - a.price); break;
            case 'DATE_ASC': result.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()); break;
            case 'RATING': result.sort((a, b) => (b.tripRating || 0) - (a.tripRating || 0)); break;
            case 'RELEVANCE': 
            default:
                result.sort((a, b) => ((b.views || 0) + (b.sales || 0) * 10) - ((a.views || 0) + (a.sales || 0) * 10));
        }
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const start = (page - 1) * limit;
    const paginated = result.slice(start, start + limit);

    return { data: paginated, count: result.length };
  }, [tripsRef]);

  const searchAgencies = useCallback(async (params: SearchAgenciesParams): Promise<PaginatedResult<Agency>> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      // FIX: Filter out inactive agencies and soft-deleted agencies
      let result = agenciesRef.current.filter(a => 
        a.is_active === true && 
        !a.deleted_at // Exclude soft-deleted agencies
      );

      if (params.query) {
          const q = normalizeText(params.query);
          result = result.filter(a => normalizeText(a.name).includes(q) || normalizeText(a.description).includes(q));
      }
      
      if (params.specialty) {
           const q = normalizeText(params.specialty);
           result = result.filter(a => 
               (a.customSettings?.tags && a.customSettings.tags.some(t => normalizeText(t).includes(q))) ||
               normalizeText(a.description).includes(q)
           );
      }

      if (params.sort) {
          switch(params.sort) {
              case 'NAME': result.sort((a, b) => a.name.localeCompare(b.name)); break;
              case 'RATING': 
                  result.sort((a, b) => a.name.localeCompare(b.name)); 
                  break;
              case 'RELEVANCE':
              default:
                  result.sort((a, b) => (b.subscriptionPlan === 'PREMIUM' ? 1 : 0) - (a.subscriptionPlan === 'PREMIUM' ? 1 : 0));
          }
      }

      const page = params.page || 1;
      const limit = params.limit || 10;
      const start = (page - 1) * limit;
      const paginated = result.slice(start, start + limit);

      return { data: paginated, count: result.length };
  }, [agenciesRef]);

  // Upload Platform Logo (Admin Only)
  const uploadPlatformLogo = useCallback(async (file: File): Promise<string | null> => {
    const sb = guardSupabase();
    if (!sb) {
        showToast('Backend não configurado.', 'error');
        return null;
    }
    if (!user || user.role !== UserRole.ADMIN) {
        showToast('Apenas administradores podem fazer upload de logos.', 'error');
        return null;
    }

    const fileName = `platform/logo_${Date.now()}`;
    console.log(`[DataContext] Uploading platform logo: ${fileName}`); // Debug Log

    try {
        const { data, error } = await sb.storage.from('agency-files').upload(fileName, file);
        if (error) throw error;
        
        const { data: { publicUrl } } = sb.storage.from('agency-files').getPublicUrl(fileName);
        console.log(`[DataContext] Logo uploaded successfully. URL: ${publicUrl}`); // Debug Log
        
        // Update platform settings with the new logo URL
        await updatePlatformSettings({ platform_logo_url: publicUrl });

        return publicUrl;
    } catch (error: any) {
        console.error("[DataContext] Error uploading platform logo:", error.message); // Debug Log
        showToast(`Erro no upload: ${error.message}`, 'error');
        return null;
    }
  }, [user, guardSupabase, updatePlatformSettings]);

  // Restore Default Settings (Admin Only)
  const restoreDefaultSettings = useCallback(async () => {
    const sb = guardSupabase();
    if (!sb) {
        console.warn("[DataContext] Supabase not configured, cannot restore default settings."); // Debug Log
        showToast('Backend não configurado.', 'error');
        return;
    }

    // Check if user is admin
    if (!user || user.role !== UserRole.ADMIN) {
        showToast('Apenas administradores podem restaurar as configurações padrão.', 'error');
        return;
    }

    try {
        const { data, error } = await sb.from('platform_settings').select('*').eq('id', 1).single();
        if (error) throw error;

        // Restore default settings
        await sb.from('platform_settings').update({
            platform_name: 'ViajaStore',
            platform_logo_url: null,
            maintenance_mode: false,
            layout_style: 'rounded',
            background_color: '#ffffff',
            background_blur: false,
            background_transparency: 1.0,
            default_settings: data.default_settings,
        }).eq('id', 1);

        showToast('Configurações da plataforma restauradas com sucesso!', 'success');
        logActivity(ActivityActionType.RESTORE_DEFAULT_SETTINGS, {});
        _fetchGlobalAndClientProfiles();
        console.log("[DataContext] Default settings restored successfully."); // Debug Log
    } catch (error: any) {
        console.error("[DataContext] Error restoring default settings:", error.message); // Debug Log
        showToast(`Erro ao restaurar configurações: ${error.message}`, 'error');
    }
  }, [user, showToast, logActivity, _fetchGlobalAndClientProfiles, guardSupabase]);

  return (
    <DataContext.Provider value={{
      agencies, trips, bookings, reviews: [], agencyReviews, clients, auditLogs, activityLogs, platformSettings, loading,
      searchTrips, searchAgencies,
      getTripBySlug, getAgencyBySlug, getTripById, getAgencyPublicTrips, getPublicTrips,
      refreshData, addBooking, addReview, addAgencyReview, deleteReview, deleteAgencyReview, updateAgencyReview,
      toggleFavorite, updateClientProfile, updateAgencySubscription, updateAgencyProfileByAdmin, toggleAgencyStatus,
      createTrip, updateTrip, deleteTrip, toggleTripStatus, toggleTripFeatureStatus, updateTripOperationalData,
      softDeleteEntity, restoreEntity, deleteUser, deleteMultipleUsers, deleteMultipleAgencies, getUsersStats,
      updateMultipleUsersStatus, updateMultipleAgenciesStatus, logAuditAction, sendPasswordReset, updateUserAvatarByAdmin,
      adminChangePlan, adminBulkDeleteAgencies, adminBulkArchiveAgencies, adminBulkChangePlan, adminSuspendAgency,
      getReviewsByTripId, getReviewsByAgencyId, getReviewsByClientId, getAgencyStats, getAgencyTheme, saveAgencyTheme,
      refreshUserData, incrementTripViews, fetchTripImages, updatePlatformSettings, uploadPlatformLogo, restoreDefaultSettings
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
