

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Trip, Agency, Booking, Review, AgencyReview, Client, UserRole, AuditLog, AgencyTheme, ThemeColors, UserStats, DashboardStats, ActivityLog, ActivityActorRole, ActivityActionType, TripCategory } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { MOCK_AGENCIES, MOCK_TRIPS, MOCK_BOOKINGS, MOCK_REVIEWS, MOCK_CLIENTS } from '../services/mockData';
import { slugify } from '../utils/slugify';
import { useToast } from './ToastContext';

interface DataContextType {
  trips: Trip[];
  agencies: Agency[];
  bookings: Booking[];
  reviews: Review[]; // Legacy Trip Reviews (Deprecated)
  agencyReviews: AgencyReview[]; // New Agency Reviews
  clients: Client[];
  auditLogs: AuditLog[]; // Admin specific audit logs
  activityLogs: ActivityLog[]; // Consolidated logs
  loading: boolean;
  
  addBooking: (booking: Booking) => Promise<Booking | undefined>;
  addReview: (review: Review) => Promise<void>; // Legacy
  addAgencyReview: (review: Partial<AgencyReview>) => Promise<void>; // New
  deleteReview: (reviewId: string) => Promise<void>; // Legacy
  deleteAgencyReview: (reviewId: string) => Promise<void>; // New
  updateAgencyReview: (reviewId: string, data: Partial<AgencyReview>) => Promise<void>;
  
  toggleFavorite: (tripId: string, clientId: string) => Promise<void>;
  updateClientProfile: (clientId: string, data: Partial<Client>) => Promise<void>;
  
  updateAgencySubscription: (agencyId: string, status: 'ACTIVE' | 'INACTIVE', plan: 'BASIC' | 'PREMIUM', expiresAt?: string) => Promise<void>;
  updateAgencyProfileByAdmin: (agencyId: string, data: Partial<Agency>) => Promise<void>;
  toggleAgencyStatus: (agencyId: string) => Promise<void>;
  createTrip: (trip: Trip) => Promise<void>;
  updateTrip: (trip: Trip) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  toggleTripStatus: (tripId: string) => Promise<void>; 
  toggleTripFeatureStatus: (tripId: string) => Promise<void>;
  
  // Master Admin Functions
  softDeleteEntity: (id: string, table: 'profiles' | 'agencies') => Promise<void>;
  restoreEntity: (id: string, table: 'profiles' | 'agencies') => Promise<void>;
  deleteUser: (userId: string, role: UserRole) => Promise<void>;
  deleteMultipleUsers: (userIds: string[]) => Promise<void>;
  deleteMultipleAgencies: (agencyIds: string[]) => Promise<void>;
  getUsersStats: (userIds: string[]) => Promise<UserStats[]>;
  updateMultipleUsersStatus: (userIds: string[], status: 'ACTIVE' | 'SUSPENDED') => Promise<void>;
  updateMultipleAgenciesStatus: (agencyIds: string[], status: 'ACTIVE' | 'INACTIVE') => Promise<void>;
  logAuditAction: (action: string, details: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateUserAvatarByAdmin: (userId: string, file: File) => Promise<string | null>;

  getPublicTrips: () => Trip[]; 
  getAgencyPublicTrips: (agencyId: string) => Trip[];
  getAgencyTrips: (agencyId: string) => Trip[]; 
  getTripById: (id: string | undefined) => Trip | undefined;
  getTripBySlug: (slug: string) => Trip | undefined; 
  getAgencyBySlug: (slug: string) => Agency | undefined;
  getReviewsByTripId: (tripId: string) => Review[];
  getReviewsByAgencyId: (agencyId: string) => AgencyReview[]; // New
  getReviewsByClientId: (clientId: string) => AgencyReview[]; // New
  hasUserPurchasedTrip: (userId: string, tripId: string) => boolean;
  getAgencyStats: (agencyId: string) => DashboardStats;
  
  // Agency Theme
  getAgencyTheme: (agencyId: string) => Promise<AgencyTheme | null>;
  saveAgencyTheme: (agencyId: string, colors: ThemeColors) => Promise<boolean>;

  refreshData: () => Promise<void>;
  incrementTripViews: (tripId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Moved outside DataProvider to prevent re-creation on every render
const initializeMockData = (
  setTrips: (t: Trip[]) => void, 
  setAgencies: (a: Agency[]) => void, 
  setBookings: (b: Booking[]) => void, 
  setReviews: (r: Review[]) => void, 
  setAgencyReviews: (ar: AgencyReview[]) => void, 
  setClients: (c: Client[]) => void, 
  setAuditLogs: (al: AuditLog[]) => void,
  setActivityLogs: (al: ActivityLog[]) => void // New: for activity logs
) => {
    setTrips(MOCK_TRIPS);
    setAgencies(MOCK_AGENCIES);
    setBookings(MOCK_BOOKINGS);
    setReviews(MOCK_REVIEWS);
    setAgencyReviews([]);
    setClients(MOCK_CLIENTS);
    setAuditLogs([]);
    setActivityLogs([]); // Initialize empty for mock
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [trips, setTrips] = useState<Trip[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [agencyReviews, setAgencyReviews] = useState<AgencyReview[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]); // Admin specific audit logs
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]); // Consolidated logs
  const [loading, setLoading] = useState(true);

  // --- HELPER PARA LOGS DE ATIVIDADE ---
  const logActivity = async (actionType: ActivityActionType, details: any = {}, relatedAgencyId: string | null = null) => {
    if (!supabase || !user) return; // Only log if Supabase and user are available
    
    // Determine actor_role
    let actorRole: ActivityActorRole = user.role as ActivityActorRole;
    if (user.email === 'juannicolas1@gmail.com') { // Master Admin check
      actorRole = 'ADMIN';
    } else if (user.role === UserRole.AGENCY) {
      actorRole = 'AGENCY';
      // If agency-related action, ensure relatedAgencyId is set
      relatedAgencyId = (user as Agency).agencyId;
    } else if (user.role === UserRole.CLIENT) {
      actorRole = 'CLIENT';
    }

    try {
      const { error } = await supabase.rpc('log_activity', {
        p_user_id: user.id,
        p_actor_email: user.email,
        p_actor_role: actorRole,
        p_action_type: actionType,
        p_details: details,
        p_agency_id: relatedAgencyId,
      });
      if (error) {
        console.error("Error logging activity:", error);
      }
    } catch (err) {
      console.error("Error calling log_activity RPC:", err);
    }
  };

  // --- DATA FETCHING ---

  const fetchTrips = async () => {
    if (!supabase) {
      setTrips(MOCK_TRIPS);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          trip_images (image_url),
          agencies (name, logo_url)
        `);

      if (error) throw error;

      if (data) {
          const formattedTrips: Trip[] = data.map((t: any) => ({
            id: t.id,
            agencyId: t.agency_id,
            title: t.title,
            slug: t.slug, 
            description: t.description,
            destination: t.destination,
            price: Number(t.price),
            startDate: t.start_date,
            endDate: t.end_date,
            durationDays: t.duration_days,
            images: t.trip_images 
                ? t.trip_images
                    .sort((a: any, b: any) => a.position - b.position)
                    .map((img: any) => img.image_url) 
                : [],
            category: t.category as TripCategory || TripCategory.PRAIA, // Fix: Use enum
            tags: t.tags || [],
            travelerTypes: t.traveler_types || [],
            itinerary: t.itinerary || [],
            paymentMethods: t.payment_methods || [],
            is_active: t.is_active,
            rating: t.rating || 0, // Assuming rating might be present or default to 0
            totalReviews: t.total_reviews || 0, // FIX: Use t.total_reviews from DB
            included: t.included || [],
            notIncluded: t.not_included || [],
            views: t.views_count || 0,
            sales: t.sales_count || 0,
            featured: t.featured || false,
            featuredInHero: t.featured_in_hero || false, 
            popularNearSP: t.popular_near_sp || false
          }));

          setTrips(formattedTrips);
      }
    } catch (err) {
      console.warn("Supabase unavailable (or table missing), using MOCK_TRIPS.", err);
      setTrips(MOCK_TRIPS);
    }
  };

  const fetchAgencies = async () => {
    if (!supabase) {
      setAgencies(MOCK_AGENCIES);
      return;
    }
    try {
      const { data, error } = await supabase.from('agencies').select('*');
      
      if (error) throw error;
      
      const formattedAgencies: Agency[] = (data || []).map((a: any) => ({
        id: a.user_id, // User ID from auth/profiles
        agencyId: a.id, // Primary Key from agencies table
        name: a.name,
        email: a.email || '',
        role: UserRole.AGENCY,
        slug: a.slug || '', 
        cnpj: a.cnpj,
        description: a.description,
        logo: a.logo_url,
        whatsapp: a.whatsapp,
        is_active: a.is_active,
        heroMode: a.hero_mode || 'TRIPS',
        heroBannerUrl: a.hero_banner_url,
        heroTitle: a.hero_title,
        heroSubtitle: a.hero_subtitle,
        customSettings: a.custom_settings || {},
        subscriptionStatus: a.is_active ? 'ACTIVE' : 'INACTIVE', // Derive from is_active
        subscriptionPlan: a.subscription_plan || 'BASIC', // Joined
        subscriptionExpiresAt: a.subscription_expires_at || new Date().toISOString(), 
        website: a.website,
        phone: a.phone,
        address: a.address || {},
        bankInfo: a.bank_info || {},
        deleted_at: a.deleted_at
      }));

      setAgencies(formattedAgencies);
    } catch (err) {
      console.warn("Supabase unavailable, using MOCK_AGENCIES.", err);
      setAgencies(MOCK_AGENCIES);
    }
  };

  const fetchClients = async () => {
    if (!supabase) {
      setClients(MOCK_CLIENTS);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['CLIENT', 'ADMIN']);

      if (error) throw error;

      const formattedClients: Client[] = (data || []).map((p: any) => ({
        id: p.id,
        name: p.full_name || 'Usuário',
        email: p.email || '',
        role: p.role === 'ADMIN' ? UserRole.ADMIN : UserRole.CLIENT,
        avatar: p.avatar_url,
        cpf: p.cpf,
        phone: p.phone,
        favorites: [], 
        createdAt: p.created_at,
        address: p.address || {},
        status: p.status || 'ACTIVE',
        deleted_at: p.deleted_at,
        last_sign_in_at: p.last_sign_in_at,
      } as Client));

      setClients(formattedClients);
    } catch (err) {
      console.warn("Supabase unavailable, using MOCK_CLIENTS.", err);
      setClients(MOCK_CLIENTS);
    }
  };

  const fetchAgencyReviews = async () => {
      if (!supabase) {
        setAgencyReviews([]);
        return;
      }
      try {
          const { data, error } = await supabase
            .from('agency_reviews')
            .select(`
                *, 
                profiles (full_name, avatar_url),
                agencies (id, name, logo_url, slug),
                trips (title)
            `);
            
          if (error) {
             console.error("Error fetching agency reviews:", error.message || error);
             return;
          }

          if (data) {
              setAgencyReviews(data.map((r: any) => ({
                  id: r.id,
                  agencyId: r.agency_id,
                  clientId: r.client_id,
                  bookingId: r.booking_id,
                  trip_id: r.trip_id,
                  rating: r.rating,
                  comment: r.comment,
                  createdAt: r.created_at,
                  clientName: r.profiles?.full_name || 'Viajante',
                  clientAvatar: r.profiles?.avatar_url || undefined, // Mapped client avatar
                  agencyName: r.agencies?.name || 'Agência',
                  agencyLogo: r.agencies?.logo_url,
                  response: r.response,
                  tags: r.tags || [],
                  tripTitle: r.trips?.title
              })));
          }
      } catch (err: any) {
          console.warn("Agency reviews table might not exist yet.", err.message || err);
      }
  };

  const fetchBookings = async () => {
    if (!supabase || !user) {
      setBookings(MOCK_BOOKINGS);
      return;
    }

    try {
        const { data, error } = await supabase
            .from('bookings')
            .select(`
              *, 
              trips (
                id, 
                title, 
                agency_id,
                destination,
                price,
                start_date,
                end_date,
                duration_days,
                category,
                tags,
                traveler_types,
                itinerary,
                payment_methods,
                is_active,
                rating,
                total_reviews,
                included,
                not_included,
                views_count,
                sales_count,
                featured,
                featured_in_hero,
                popular_near_sp,
                trip_images (image_url),
                agencies (
                  id,
                  user_id,
                  name,
                  email,
                  slug,
                  phone,
                  whatsapp,
                  logo_url,
                  description,
                  is_active,
                  hero_mode,
                  hero_banner_url,
                  hero_title,
                  hero_subtitle,
                  custom_settings,
                  website,
                  address,
                  bank_info,
                  subscription_plan,
                  subscription_status,
                  subscription_expires_at
                )
              )
            `);

        if (error) throw error;

        if (data) {
          const formattedBookings: Booking[] = data.map((b: any) => {
            const images = b.trips?.trip_images?.map((img: any) => img.image_url) || [];
            
            const tripData: Trip | undefined = b.trips ? {
               id: b.trips.id,
               agencyId: b.trips.agency_id,
               title: b.trips.title,
               slug: b.trips.slug,
               description: b.trips.description || '',
               destination: b.trips.destination,
               price: b.trips.price,
               startDate: b.trips.start_date,
               endDate: b.trips.end_date,
               durationDays: b.trips.duration_days,
               images: images,
               category: b.trips.category as TripCategory || TripCategory.PRAIA, // Fix: Use enum
               tags: b.trips.tags || [],
               travelerTypes: b.trips.traveler_types || [],
               itinerary: b.trips.itinerary || [],
               paymentMethods: b.trips.payment_methods || [], 
               is_active: b.trips.is_active || false,
               rating: b.trips.rating || 0, // Assuming rating might be present or default to 0
               totalReviews: b.trips.total_reviews || 0, // FIX: Use b.trips.total_reviews
               included: b.trips.included || [],
               notIncluded: b.trips.not_included || [],
               views: b.trips.views_count || 0,
               sales: b.trips.sales_count || 0,
               featured: b.trips.featured || false,
               featuredInHero: b.trips.featured_in_hero || false,
               popularNearSP: b.trips.popular_near_sp || false
            } as Trip : undefined;
            
            const agencyData: Agency | undefined = b.trips?.agencies ? {
              id: b.trips.agencies.user_id, // This should be user_id, not id
              agencyId: b.trips.agencies.id, // Primary Key of agencies table
              name: b.trips.agencies.name,
              email: b.trips.agencies.email,
              role: UserRole.AGENCY,
              slug: b.trips.agencies.slug,
              logo: b.trips.agencies.logo_url,
              phone: b.trips.agencies.phone,
              whatsapp: b.trips.agencies.whatsapp,
              description: b.trips.agencies.description || '',
              is_active: b.trips.agencies.is_active || false,
              heroMode: b.trips.agencies.hero_mode || 'TRIPS',
              heroBannerUrl: b.trips.agencies.hero_banner_url,
              heroTitle: b.trips.agencies.hero_title,
              heroSubtitle: b.trips.agencies.hero_subtitle,
              customSettings: b.trips.agencies.custom_settings || {},
              subscriptionStatus: b.trips.agencies.subscription_status || 'INACTIVE',
              subscriptionPlan: b.trips.agencies.subscription_plan || 'BASIC',
              subscriptionExpiresAt: b.trips.agencies.subscription_expires_at || new Date().toISOString(),
              website: b.trips.agencies.website,
              address: b.trips.agencies.address || {},
              bankInfo: b.trips.agencies.bank_info || {}
            } as Agency : undefined;

            return {
              id: b.id,
              tripId: b.trip_id,
              clientId: b.client_id,
              date: b.created_at,
              status: b.status,
              totalPrice: b.total_price,
              passengers: b.passengers,
              voucherCode: b.voucher_code,
              paymentMethod: b.payment_method, // Fix: Access payment_method directly
              _trip: tripData,
              _agency: agencyData
            };
          });
          setBookings(formattedBookings);
        }
    } catch (err) {
        console.warn("Supabase unavailable or bookings query failed, using MOCK_BOOKINGS.", err);
        setBookings(MOCK_BOOKINGS);
    }
  };

  // NEW: Fetch all activity logs
  const fetchActivityLogs = async () => {
    if (!supabase) {
      setActivityLogs([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          user_name:profiles (full_name, avatar_url),
          agency_name:agencies (name, logo_url),
          trip_title:trips (title)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching activity logs:", error);
        throw error;
      }

      if (data) {
        const formattedLogs: ActivityLog[] = data.map((log: any) => ({
          id: log.id,
          user_id: log.user_id,
          agency_id: log.agency_id,
          actor_email: log.actor_email,
          actor_role: log.actor_role,
          action_type: log.action_type,
          details: log.details,
          created_at: log.created_at,
          user_name: log.user_name?.full_name || log.actor_email,
          user_avatar: log.user_name?.avatar_url,
          agency_name: log.agency_name?.name,
          agency_logo: log.agency_name?.logo_url,
          trip_title: log.trip_title?.title,
        }));
        setActivityLogs(formattedLogs);
      }
    } catch (err) {
      console.warn("Supabase unavailable or activity_logs query failed, defaulting to empty.", err);
      setActivityLogs([]);
    }
  };

  const fetchAuditLogs = async () => {
      if (!supabase) {
        setAuditLogs([]);
        return;
      }
      try {
          const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
          if (error) throw error;

          if (data) {
            const logs: AuditLog[] = data.map((l: any) => ({
                id: l.id,
                adminEmail: l.admin_email,
                action: l.action,
                details: l.details,
                createdAt: l.created_at
            }));
            setAuditLogs(logs);
          }
      } catch (err) {
          // Mock
      }
  };

  const refreshData = async () => {
      setLoading(true);

      if (!supabase) {
        initializeMockData(setTrips, setAgencies, setBookings, setReviews, setAgencyReviews, setClients, setAuditLogs, setActivityLogs);
        setLoading(false);
        return;
      }

      const promises = [
        fetchTrips(), 
        fetchAgencies(), 
        fetchAgencyReviews(),
        fetchBookings(),
        fetchActivityLogs() // NEW: Fetch activity logs
      ];
      
      if (user && user.role === UserRole.CLIENT) {
          const { data } = await supabase.from('favorites').select('trip_id').eq('user_id', user.id);
          if (data) {
             const favs = data.map(f => f.trip_id);
             setClients(prev => {
                 const me = prev.find(c => c.id === user.id);
                 if (me) {
                    return prev.map(c => c.id === user.id ? {...c, favorites: favs} : c);
                 } else {
                    // Client not in state, add them with their favorites
                    const newClient = {
                        ...(user as Client),
                        favorites: favs
                    };
                    return [...prev, newClient];
                 }
             });
          }
      }
      
      if (user?.role === UserRole.ADMIN) {
          promises.push(fetchAuditLogs());
          promises.push(fetchClients());
      }
      
      await Promise.all(promises);
      setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, [user]);

  // --- ACTIONS (all guarded with !supabase check) ---

  const guardSupabase = () => {
    if (!supabase) {
        showToast('Funcionalidade indisponível no modo offline.', 'info');
        throw new Error('Supabase client not available.');
    }
    return supabase;
  };

  const updateAgencySubscription = async (agencyId: string, status: 'ACTIVE' | 'INACTIVE', plan: 'BASIC' | 'PREMIUM', expiresAt?: string) => {
      const supabase = guardSupabase();
      
      const updates: any = {
          subscription_status: status,
          subscription_plan: plan,
          is_active: status === 'ACTIVE'
      };

      if (expiresAt) {
          updates.subscription_expires_at = expiresAt;
      }

      const { error } = await supabase.from('agencies').update(updates).eq('id', agencyId); 
      
      if (error) {
          showToast('Erro ao atualizar assinatura: ' + error.message, 'error');
          throw error;
      } else {
          showToast('Assinatura atualizada com sucesso!', 'success');
          await refreshData();
          logActivity('AGENCY_SUBSCRIPTION_UPDATED', { agencyId, newStatus: status, newPlan: plan, expiresAt }, agencyId);
      }
  };

  const toggleFavorite = async (