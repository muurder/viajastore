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
                agencyName: agenciesData?.find((a: any) => a.id === r.agency_id)?.name || 'Agência Desconhecida', // Placeholder until joined
                tripTitle: tripsData?.find((t: any) => t.id === r.trip_id)?.title || undefined, // Placeholder until joined
            })));
        }

        // 4. Fetch Clients (Profiles with CLIENT role)
        const { data: clientsData } = await sb.from('profiles').select('*').eq('role', UserRole.CLIENT);
        if (clientsData) {
            const mappedClients: Client[] = clientsData.map((c: any) => ({
                id: c.id,
                name: c.full_name,
                email: c.email,
                role: UserRole.CLIENT,
                avatar: c.avatar_url,
                cpf: c.cpf,
                phone: c.phone,
                favorites: c.favorites || [],
                address: c.address || {},
                status: c.status,
                createdAt: c.created_at
            }));
            setClients(mappedClients);
        }

        // 5. Fetch Bookings (and augment with trip/agency data)
        const { data: bookingsData } = await sb.from('bookings').select('*');
        if (bookingsData) {
            const augmentedBookings: Booking[] = bookingsData.map((b: any) => ({
                id: b.id,
                tripId: b.trip_id,
                clientId: b.client_id,
                date: b.created_at,
                status: b.status,
                totalPrice: b.total_price,
                passengers: b.passengers,
                voucherCode: b.voucher_code,
                paymentMethod: b.payment_method,
                _trip: tripsData?.find((t: any) => t.id === b.trip_id),
                _agency: agenciesData?.find((a: any) => a.id === tripsData?.find((t: any) => t.id === b.trip_id)?.agency_id)
            }));
            setBookings(augmentedBookings);
        }

        // 6. Fetch Audit Logs
        const { data: auditLogsData } = await sb.from('audit_logs').select('*').order('created_at', { ascending: false });
        if (auditLogsData) {
            setAuditLogs(auditLogsData.map((log: any) => ({
                id: log.id,
                adminEmail: log.admin_email,
                action: log.action,
                details: log.details,
                createdAt: log.created_at
            })));
        }

        // 7. Fetch Activity Logs
        const { data: activityLogsData } = await sb.from('activity_logs').select('*').order('created_at', { ascending: false });
        if (activityLogsData) {
            setActivityLogs(activityLogsData.map((log: any) => ({
                id: log.id,
                userId: log.user_id,
                actionType: log.action_type,
                details: log.details,
                createdAt: log.created_at
            })));
        }

    } catch (error: any) {
        console.error("Error fetching global data:", error.message);
        showToast(`Erro ao carregar dados: ${error.message}`, 'error');
        // Fallback to Mocks on error too
        setAgencies(MOCK_AGENCIES);
        setTrips(MOCK_TRIPS);
        setBookings(MOCK_BOOKINGS);
        setAgencyReviews([]);
        setClients(MOCK_CLIENTS);
    } finally {
        setLoading(false);
    }
  };

  // Initial data fetch and real-time subscriptions
  useEffect(() => {
    fetchGlobalData();

    const sb = guardSupabase();
    if (sb) {
        const subscriptions: any[] = [];
        
        // Listen for changes in 'agencies'
        subscriptions.push(sb.channel('agencies_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'agencies' }, payload => {
            console.log('Agency change received!', payload);
            fetchGlobalData();
        }).subscribe());

        // Listen for changes in 'trips'
        subscriptions.push(sb.channel('trips_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, payload => {
            console.log('Trip change received!', payload);
            fetchGlobalData();
        }).subscribe());
        
        // Listen for changes in 'bookings'
        subscriptions.push(sb.channel('bookings_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, payload => {
            console.log('Booking change received!', payload);
            fetchGlobalData();
        }).subscribe());

        // Listen for changes in 'agency_reviews'
        subscriptions.push(sb.channel('agency_reviews_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'agency_reviews' }, payload => {
            console.log('Agency review change received!', payload);
            fetchGlobalData();
        }).subscribe());

        // Listen for changes in 'profiles'
        subscriptions.push(sb.channel('profiles_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, payload => {
            console.log('Profile change received!', payload);
            fetchGlobalData();
        }).subscribe());

        // Listen for changes in 'audit_logs'
        subscriptions.push(sb.channel('audit_logs_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, payload => {
            console.log('Audit Log change received!', payload);
            fetchGlobalData();
        }).subscribe());

        // Listen for changes in 'activity_logs'
        subscriptions.push(sb.channel('activity_logs_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, payload => {
            console.log('Activity Log change received!', payload);
            fetchGlobalData();
        }).subscribe());

        return () => {
            subscriptions.forEach(sub => sb.removeChannel(sub));
        };
    }
  }, []);

  const refreshData = useCallback(async () => {
      await fetchGlobalData();
      if (user) {
        await reloadUser(); // Ensure AuthContext user state is also refreshed
      }
  }, [fetchGlobalData, user, reloadUser]); // Added user and reloadUser to dependencies

  // Data Getters
  const getTripBySlug = useCallback((slugToFind: string) => {
    return trips.find(t => t.slug === slugToFind || t.id === slugToFind);
  }, [trips]);

  const getAgencyBySlug = useCallback((slugToFind: string) => {
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
    return agencyReviews.filter(r => r.trip_id === tripId);
  }, [agencyReviews]);

  const getReviewsByAgencyId = useCallback((agencyId: string) => {
    return agencyReviews.filter(r => r.agencyId === agencyId);
  }, [agencyReviews]);

  const getReviewsByClientId = useCallback((clientId: string) => {
    return agencyReviews.filter(r => r.clientId === clientId);
  }, [agencyReviews]);

  // Data Actions
  const logActivity = useCallback(async (actionType: ActivityActionType, details: any) => {
    const sb = guardSupabase();
    if (sb && user?.id) {
        await sb.from('activity_logs').insert({
            user_id: user.id,
            action_type: actionType,
            details: details,
        });
        fetchGlobalData(); // Refresh activity logs
    }
  }, [user]);

  const addBooking = useCallback(async (booking: Booking): Promise<Booking | undefined> => {
    const sb = guardSupabase();
    if (!sb) return undefined;
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
        showToast('Reserva criada com sucesso!', 'success');
        
        // Increment sales count for the trip
        const { data: tripUpdateData, error: tripUpdateError } = await sb.from('trips')
            .rpc('increment_sales', { trip_id_param: booking.tripId, increment_value: 1 }); // Call RPC function
        if (tripUpdateError) console.error("Error incrementing sales:", tripUpdateError);

        // Augment data before returning
        const newBooking = {
            ...booking,
            _trip: trips.find(t => t.id === booking.tripId),
            _agency: agencies.find(a => a.agencyId === trips.find(t => t.id === booking.tripId)?.agencyId)
        };

        logActivity('BOOKING_CREATED', { bookingId: newBooking.id, tripId: newBooking.tripId, totalPrice: newBooking.totalPrice });
        fetchGlobalData(); // To update local cache
        return newBooking;

    } catch (error: any) {
        console.error("Error adding booking:", error.message);
        showToast(`Erro ao adicionar reserva: ${error.message}`, 'error');
        throw error;
    }
  }, [showToast, trips, agencies, logActivity]);

  const addReview = useCallback(async (review: Review) => {
    const sb = guardSupabase();
    if (!sb) return;
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
        logActivity('REVIEW_SUBMITTED', { reviewId: review.id, tripId: review.tripId, rating: review.rating });
        fetchGlobalData(); // Update local cache
    } catch (error: any) {
        console.error("Error adding review:", error.message);
        showToast(`Erro ao adicionar avaliação: ${error.message}`, 'error');
    }
  }, [showToast, logActivity]);

  const addAgencyReview = useCallback(async (review: Partial<AgencyReview>) => {
    const sb = guardSupabase();
    if (!sb) return;
    if (!review.agencyId || !review.clientId) {
        showToast('Dados de agência ou cliente ausentes para avaliação.', 'error');
        return;
    }
    try {
        await sb.from('agency_reviews').upsert({
            agency_id: review.agencyId,
            client_id: review.clientId,
            booking_id: review.bookingId, // Optional
            trip_id: review.trip_id, // Optional
            rating: review.rating,
            comment: review.comment,
            tags: review.tags,
            // created_at is automatically handled by Supabase default
        }, { onConflict: ['agency_id', 'client_id'] }); // Allow client to update their review
        showToast('Avaliação enviada/atualizada com sucesso!', 'success');
        logActivity('REVIEW_SUBMITTED', { agencyId: review.agencyId, clientId: review.clientId, rating: review.rating });
        fetchGlobalData();
    } catch (error: any) {
        console.error("Error adding/updating agency review:", error.message);
        showToast(`Erro ao enviar avaliação: ${error.message}`, 'error');
    }
  }, [showToast, logActivity]);

  const deleteReview = useCallback(async (id: string) => {
    const sb = guardSupabase();
    if (!sb) return;
    try {
        await sb.from('reviews').delete().eq('id', id);
        showToast('Avaliação excluída.', 'success');
        logActivity('REVIEW_DELETED', { reviewId: id });
        fetchGlobalData();
    } catch (error: any) {
        console.error("Error deleting review:", error.message);
        showToast(`Erro ao excluir avaliação: ${error.message}`, 'error');
    }
  }, [showToast, logActivity]);

  const deleteAgencyReview = useCallback(async (id: string) => {
    const sb = guardSupabase();
    if (!sb) return;
    try {
        await sb.from('agency_reviews').delete().eq('id', id);
        showToast('Avaliação excluída.', 'success');
        logActivity('REVIEW_DELETED', { reviewId: id });
        fetchGlobalData();
    } catch (error: any) {
        console.error("Error deleting agency review:", error.message);
        showToast(`Erro ao excluir avaliação: ${error.message}`, 'error');
    }
  }, [showToast, logActivity]);

  const updateAgencyReview = useCallback(async (id: string, updates: Partial<AgencyReview>) => {
    const sb = guardSupabase();
    if (!sb) return;
    try {
        await sb.from('agency_reviews').update({
            rating: updates.rating,
            comment: updates.comment,
            tags: updates.tags,
            response: updates.response
        }).eq('id', id);
        showToast('Avaliação atualizada.', 'success');
        logActivity('REVIEW_UPDATED', { reviewId: id, updates });
        fetchGlobalData();
    } catch (error: any) {
        console.error("Error updating agency review:", error.message);
        showToast(`Erro ao atualizar avaliação: ${error.message}`, 'error');
    }
  }, [showToast, logActivity]);


  const toggleFavorite = useCallback(async (tripId: string, userId: string) => {
      const sb = guardSupabase();
      if (!sb) return;
      
      const client = clients.find(c => c.id === userId);
      if (!client) {
          showToast('Cliente não encontrado.', 'error');
          return;
      }

      const currentFavorites = client.favorites || [];
      const isCurrentlyFavorite = currentFavorites.includes(tripId);
      
      let newFavorites;
      let action: ActivityActionType;
      if (isCurrentlyFavorite) {
          newFavorites = currentFavorites.filter(id => id !== tripId);
          action = 'FAVORITE_TOGGLED';
          showToast('Removido dos favoritos.', 'info');
      } else {
          newFavorites = [...currentFavorites, tripId];
          action = 'FAVORITE_TOGGLED';
          showToast('Adicionado aos favoritos!', 'success');
      }

      try {
          await sb.from('profiles').update({ favorites: newFavorites }).eq('id', userId);
          logActivity(action, { tripId, userId, isFavorite: !isCurrentlyFavorite });
          fetchGlobalData(); // Update local cache including clients
      } catch (error: any) {
          console.error("Error toggling favorite:", error.message);
          showToast(`Erro ao atualizar favoritos: ${error.message}`, 'error');
      }
  }, [showToast, clients, logActivity]);

  const updateClientProfile = useCallback(async (userId: string, data: Partial<Client>) => {
    const sb = guardSupabase();
    if (!sb) return;
    try {
        const updates: any = {};
        if (data.name !== undefined) updates.full_name = data.name;
        if (data.email !== undefined) updates.email = data.email;
        if (data.phone !== undefined) updates.phone = data.phone;
        if (data.cpf !== undefined) updates.cpf = data.cpf;
        if (data.avatar !== undefined) updates.avatar_url = data.avatar;
        if (data.address !== undefined) updates.address = data.address;
        if (data.status !== undefined) updates.status = data.status;

        await sb.from('profiles').update(updates).eq('id', userId);
        showToast('Perfil do cliente atualizado!', 'success');
        logActivity('CLIENT_PROFILE_UPDATED', { userId, updates });
        fetchGlobalData(); // Update local cache
    } catch (error: any) {
        console.error("Error updating client profile:", error.message);
        showToast(`Erro ao atualizar perfil do cliente: ${error.message}`, 'error');
        throw error; // Re-throw to allow component to handle loading state
    }
  }, [showToast, logActivity]);

  const updateAgencySubscription = useCallback(async (agencyId: string, status: string, plan: string, expiresAt?: string) => {
    const sb = guardSupabase();
    if (!sb) return;
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
        logActivity('AGENCY_SUBSCRIPTION_UPDATED', { agencyId, updates });
        fetchGlobalData();
    } catch (error: any) {
        console.error("Error updating agency subscription:", error.message);
        showToast(`Erro ao atualizar assinatura da agência: ${error.message}`, 'error');
        throw error;
    }
  }, [showToast, logActivity]);

  const updateAgencyProfileByAdmin = useCallback(async (agencyId: string, data: Partial<Agency>) => {
    const sb = guardSupabase();
    if (!sb) return;
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
        logActivity('AGENCY_PROFILE_UPDATED', { agencyId, updates });
        fetchGlobalData();
    } catch (error: any) {
        console.error("Error updating agency profile by admin:", error.message);
        showToast(`Erro ao atualizar perfil da agência: ${error.message}`, 'error');
        throw error;
    }
  }, [showToast, logActivity]);

  const toggleAgencyStatus = useCallback(async (agencyId: string) => {
    const sb = guardSupabase();
    if (!sb) return;
    try {
        const agency = agencies.find(a => a.agencyId === agencyId);
        if (!agency) {
            showToast('Agência não encontrada.', 'error');
            return;
        }
        const newStatus = !agency.is_active;
        await sb.from('agencies').update({ is_active: newStatus }).eq('id', agencyId);
        showToast(`Agência ${newStatus ? 'ativada' : 'desativada'} com sucesso!`, 'success');
        logActivity('AGENCY_STATUS_TOGGLED', { agencyId, newStatus });
        fetchGlobalData();
    } catch (error: any) {
        console.error("Error toggling agency status:", error.message);
        showToast(`Erro ao alterar status da agência: ${error.message}`, 'error');
    }
  }, [showToast, agencies, logActivity]);

  const createTrip = useCallback(async (trip: Trip) => {
    const sb = guardSupabase();
    if (!sb) return;
    try {
        const { data, error } = await sb.from('trips').insert({
            agency_id: trip.agencyId,
            title: trip.title,
            slug: trip.slug,
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
            featured_in_hero: trip.featuredInHero,
            popular_near_sp: trip.popularNearSP,
            operational_data: trip.operationalData,
        }).select().single();

        if (error) throw error;

        // Insert images
        if (trip.images && trip.images.length > 0) {
            const imagesPayload = trip.images.map((url, index) => ({
                trip_id: data.id,
                image_url: url,
                position: index
            }));
            const { error: imgError } = await sb.from('trip_images').insert(imagesPayload);
            if (imgError) console.error("Error inserting trip images:", imgError);
        }

        showToast('Pacote criado com sucesso!', 'success');
        logActivity('TRIP_CREATED', { tripId: data.id, title: data.title });
        fetchGlobalData();
    } catch (error: any) {
        console.error("Error creating trip:", error.message);
        showToast(`Erro ao criar pacote: ${error.message}`, 'error');
        throw error;
    }
  }, [showToast, logActivity]);

  const updateTrip = useCallback(async (trip: Trip) => {
    const sb = guardSupabase();
    if (!sb) return;
    try {
        const { error } = await sb.from('trips').update({
            title: trip.title,
            slug: trip.slug,
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
            featured_in_hero: trip.featuredInHero,
            popular_near_sp: trip.popularNearSP,
            operational_data: trip.operationalData,
        }).eq('id', trip.id);

        if (error) throw error;

        // Handle images: delete old and insert new
        await sb.from('trip_images').delete().eq('trip_id', trip.id);
        if (trip.images && trip.images.length > 0) {
            const imagesPayload = trip.images.map((url, index) => ({
                trip_id: trip.id,
                image_url: url,
                position: index
            }));
            const { error: imgError } = await sb.from('trip_images').insert(imagesPayload);
            if (imgError) console.error("Error re-inserting trip images:", imgError);
        }

        showToast('Pacote atualizado com sucesso!', 'success');
        logActivity('TRIP_UPDATED', { tripId: trip.id, title: trip.title });
        fetchGlobalData();
    } catch (error: any) {
        console.error("Error updating trip:", error.message);
        showToast(`Erro ao atualizar pacote: ${error.message}`, 'error');
        throw error;
    }
  }, [showToast, logActivity]);

  const deleteTrip = useCallback(async (tripId: string) => {
    const sb = guardSupabase();
    if (!sb) return;
    try {
        // Delete related images first
        await sb.from('trip_images').delete().eq('trip_id', tripId);
        await sb.from('trips').delete().eq('id', tripId);
        showToast('Pacote excluído com sucesso!', 'success');
        logActivity('TRIP_DELETED', { tripId });
        fetchGlobalData();
    } catch (error: any) {
        console.error("Error deleting trip:", error.message);
        showToast(`Erro ao excluir pacote: ${error.message}`, 'error');
    }
  }, [showToast, logActivity]);

  const toggleTripStatus = useCallback(async (tripId: string) => {
    const sb = guardSupabase();
    if (!sb) return;
    try {
        const trip = trips.find(t => t.id === tripId);
        if (!trip) {
            showToast('Viagem não encontrada.', 'error');
            return;
        }
        const newStatus = !trip.is_active;
        await sb.from('trips').update({ is_active: newStatus }).eq('id', tripId);
        showToast(`Viagem ${newStatus ? 'publicada' : 'pausada'} com sucesso!`, 'success');
        logActivity('TRIP_STATUS_TOGGLED', { tripId, newStatus });
        fetchGlobalData();
    } catch (error: any) {
        console.error("Error toggling trip status:", error.message);
        showToast(`Erro ao alterar status da viagem: ${error.message}`, 'error');
    }
  }, [showToast, trips, logActivity]);

  const toggleTripFeatureStatus = useCallback(async (tripId: string) => {
    const sb = guardSupabase();
    if (!sb) return;
    try {
        const trip = trips.find(t => t.id === tripId);
        if (!trip) {
            showToast('Viagem não encontrada.', 'error');
            return;
        }
        const newFeaturedStatus = !trip.featured;
        await sb.from('trips').update({ featured: newFeaturedStatus }).eq('id', tripId);
        showToast(`Viagem ${newFeaturedStatus ? 'destacada' : 'removida do destaque'} com sucesso!`, 'success');
        logActivity('TRIP_UPDATED', { tripId, featured: newFeaturedStatus });
        fetchGlobalData();
    } catch (error: any) {
        console.error("Error toggling trip feature status:", error.message);
        showToast(`Erro ao alterar destaque da viagem: ${error.message}`, 'error');
    }
  }, [showToast, trips, logActivity]);

  const updateTripOperationalData = useCallback(async (tripId: string, data: OperationalData) => {
    const sb = guardSupabase();
    if (!sb) return;
    try {
        await sb.from('trips').update({ operational_data: data }).eq('id', tripId);
        showToast('Dados operacionais atualizados!', 'success');
        fetchGlobalData(); // To ensure local cache is up-to-date
    } catch (error: any) {
        console.error("Error updating operational data:", error.message);
        showToast(`Erro ao atualizar dados operacionais: ${error.message}`, 'error');
        throw error;
    }
  }, [showToast]);

  const softDeleteEntity = useCallback(async (id: string, table: string) => {
      const sb = guardSupabase();
      if (!sb) return;
      try {
          await sb.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id);
          showToast('Movido para a lixeira.', 'success');
          logActivity('DELETE_USER', { entityId: id, table, softDelete: true });
          fetchGlobalData();
      } catch (error: any) {
          console.error("Error soft deleting entity:", error.message);
          showToast(`Erro ao mover para a lixeira: ${error.message}`, 'error');
      }
  }, [showToast, logActivity]);

  const restoreEntity = useCallback(async (id: string, table: string) => {
      const sb = guardSupabase();
      if (!sb) return;
      try {
          await sb.from(table).update({ deleted_at: null }).eq('id', id);
          showToast('Restaurado com sucesso.', 'success');
          fetchGlobalData();
      } catch (error: any) {
          console.error("Error restoring entity:", error.message);
          showToast(`Erro ao restaurar: ${error.message}`, 'error');
      }
  }, [showToast]);

  const deleteUser = useCallback(async (id: string, role: string) => {
      const sb = guardSupabase();
      if (!sb) return;
      try {
          // Delete associated records first
          if (role === UserRole.AGENCY) {
              await sb.from('agencies').delete().eq('user_id', id);
              // Also delete trips and reviews associated with this agency
              const agencyTrips = trips.filter(t => t.agencyId === id); // assuming agencyId in trips is user_id
              for (const trip of agencyTrips) {
                  await deleteTrip(trip.id); // Reuses deleteTrip logic
              }
              await sb.from('agency_reviews').delete().eq('agency_id', id); // assuming agency_id in reviews is user_id
          } else if (role === UserRole.CLIENT) {
              await sb.from('bookings').delete().eq('client_id', id);
              await sb.from('agency_reviews').delete().eq('client_id', id);
          }
          await sb.from('profiles').delete().eq('id', id);
          
          // Delete Auth user
          // Note: This operation might require service_role key or RLS policies.
          // For frontend, we typically don't directly call auth.admin.deleteUser
          // So this might fail if not an admin context.
          const { error: authError } = await sb.auth.admin.deleteUser(id);
          if (authError) {
            console.warn(`Could not delete Auth user ${id}: ${authError.message}`);
            showToast(`Usuário DB excluído, mas conta de autenticação pode persistir: ${authError.message}`, 'warning');
          } else {
            showToast('Usuário excluído permanentemente.', 'success');
          }

          logActivity('DELETE_USER', { userId: id, role, permanent: true });
          fetchGlobalData();
      } catch (error: any) {
          console.error("Error deleting user permanently:", error.message);
          showToast(`Erro ao excluir usuário: ${error.message}`, 'error');
      }
  }, [showToast, trips, deleteTrip, logActivity]);

  const deleteMultipleUsers = useCallback(async (ids: string[]) => {
    const sb = guardSupabase();
    if (!sb) return;
    try {
        // Delete all associated profiles
        await sb.from('profiles').delete().in('id', ids);
        // Delete from auth.users (if service_role key is available and policies allow)
        for (const id of ids) {
            const { error: authError } = await sb.auth.admin.deleteUser(id);
            if (authError) console.warn(`Could not delete Auth user ${id}: ${authError.message}`);
        }
        showToast('Usuários selecionados excluídos.', 'success');
        logActivity('DELETE_MULTIPLE_USERS', { userIds: ids });
        fetchGlobalData();
    } catch (error: any) {
        console.error("Error deleting multiple users:", error.message);
        showToast(`Erro ao excluir múltiplos usuários: ${error.message}`, 'error');
    }
  }, [showToast, logActivity]);

  const deleteMultipleAgencies = useCallback(async (agencyPks: string[]) => {
    const sb = guardSupabase();
    if (!sb) return;
    try {
        // Find the user_ids associated with these agencyPks
        const { data: agencyData, error: fetchError } = await sb.from('agencies').select('user_id, id').in('id', agencyPks);
        if (fetchError) throw fetchError;
        const userIdsToDelete = agencyData.map(a => a.user_id);
        const agencyIdsToDelete = agencyData.map(a => a.id);

        // Delete associated trips and reviews for each agency
        for (const agencyId of agencyIdsToDelete) {
            const agencyTrips = trips.filter(t => t.agencyId === agencyId);
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
            if (authError) console.warn(`Could not delete Auth user ${userId}: ${authError.message}`);
        }

        showToast('Agências selecionadas excluídas.', 'success');
        logActivity('DELETE_MULTIPLE_AGENCIES', { agencyPks, userIds: userIdsToDelete });
        fetchGlobalData();
    } catch (error: any) {
        console.error("Error deleting multiple agencies:", error.message);
        showToast(`Erro ao excluir múltiplas agências: ${error.message}`, 'error');
    }
  }, [showToast, trips, deleteTrip, logActivity]);

  const getUsersStats = useCallback(async (userIds: string[]): Promise<UserStats[]> => {
    const sb = guardSupabase();
    if (!sb) return [];
    try {
        const statsPromises = userIds.map(async userId => {
            const client = clients.find(c => c.id === userId);
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
        return results.filter(s => s !== null) as UserStats[];
    } catch (error: any) {
        console.error("Error getting user stats:", error.message);
        showToast(`Erro ao buscar estatísticas de usuários: ${error.message}`, 'error');
        return [];
    }
  }, [clients, bookings, agencyReviews, showToast]);

  const updateMultipleUsersStatus = useCallback(async (ids: string[], status: string) => {
    const sb = guardSupabase();
    if (!sb) return;
    try {
        await sb.from('profiles').update({ status: status }).in('id', ids);
        showToast('Status dos usuários atualizado.', 'success');
        logActivity('CLIENT_PROFILE_UPDATED', { userIds: ids, status });
        fetchGlobalData();
    } catch (error: any) {
        console.error("Error updating multiple users status:", error.message);
        showToast(`Erro ao atualizar status dos usuários: ${error.message}`, 'error');
    }
  }, [showToast, logActivity]);

  const updateMultipleAgenciesStatus = useCallback(async (ids: string[], status: string) => {
    const sb = guardSupabase();
    if (!sb) return;
    try {
        await sb.from('agencies').update({ is_active: status === 'ACTIVE' }).in('id', ids);
        showToast('Status das agências atualizado.', 'success');
        logActivity('AGENCY_STATUS_TOGGLED', { agencyIds: ids, status });
        fetchGlobalData();
    } catch (error: any) {
        console.error("Error updating multiple agencies status:", error.message);
        showToast(`Erro ao atualizar status das agências: ${error.message}`, 'error');
    }
  }, [showToast, logActivity]);

  const logAuditAction = useCallback(async (action: string, details: string) => {
      const sb = guardSupabase();
      if (!sb) return;
      try {
          await sb.from('audit_logs').insert({
              admin_email: user?.email || 'unknown_admin',
              action: action,
              details: details,
          });
          fetchGlobalData();
      } catch (error: any) {
          console.error("Error logging audit action:", error.message);
      }
  }, [user]);

  const sendPasswordReset = useCallback(async (email: string) => {
      const sb = guardSupabase();
      if (!sb) return;
      try {
          const { error } = await sb.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/#/forgot-password` // Adjust redirect as needed
          });
          if (error) throw error;
          showToast('Link de recuperação de senha enviado para o e-mail.', 'success');
          logAuditAction('PASSWORD_RESET_SENT', `Reset link sent to ${email}`);
      } catch (error: any) {
          console.error("Error sending password reset:", error.message);
          showToast(`Erro ao enviar link de recuperação: ${error.message}`, 'error');
      }
  }, [showToast, logAuditAction]);

  const updateUserAvatarByAdmin = useCallback(async (userId: string, file: File): Promise<string | null> => {
    const sb = guardSupabase();
    if (!sb) return null;
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `admin-${userId}-${Date.now()}.${fileExt}`; // Admin specific filename to avoid collision
        
        const { error: uploadError } = await sb.storage
            .from('avatars')
            .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = sb.storage.from('avatars').getPublicUrl(fileName);
        const publicUrl = data.publicUrl;

        // Update profile table
        await sb.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
        
        showToast('Avatar atualizado por Admin.', 'success');
        logAuditAction('USER_AVATAR_UPDATED_BY_ADMIN', `User ${userId} avatar updated to ${publicUrl}`);
        fetchGlobalData(); // Refresh clients data

        return publicUrl;
    } catch (error: any) {
        console.error("Admin avatar upload error:", error.message);
        showToast(`Erro ao atualizar avatar: ${error.message}`, 'error');
        return null;
    }
  }, [showToast, logAuditAction]);

  const getAgencyStats = useCallback(async (agencyId: string): Promise<DashboardStats> => {
    // For now, calculate locally from loaded data
    const myTrips = trips.filter(t => t.agencyId === agencyId);
    const myBookings = bookings.filter(b => b._trip?.agencyId === agencyId && b.status === 'CONFIRMED');
    const myReviews = agencyReviews.filter(r => r.agencyId === agencyId);

    const totalRevenue = myBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const totalSales = myBookings.length;
    const totalViews = myTrips.reduce((sum, t) => sum + (t.views || 0), 0);
    const totalReviews = myReviews.length;
    const averageRating = totalReviews > 0 ? myReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0;
    
    // Simple conversion rate: total sales / total views (prevent div by zero)
    const conversionRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;

    return {
        totalRevenue,
        totalSales,
        totalViews,
        totalReviews,
        averageRating,
        conversionRate,
    };
  }, [trips, bookings, agencyReviews]);

  const getAgencyTheme = useCallback(async (agencyId: string): Promise<AgencyTheme | null> => {
      const sb = guardSupabase();
      if (!sb) return null;
      try {
          const { data, error } = await sb.from('agency_themes').select('*').eq('agency_id', agencyId).maybeSingle();
          if (error) throw error;
          if (data) {
              return {
                  agencyId: data.agency_id,
                  colors: data.colors as ThemeColors, // Cast to ThemeColors
                  updatedAt: data.updated_at
              };
          }
          return null;
      } catch (error: any) {
          console.error("Error fetching agency theme:", error.message);
          return null;
      }
  }, []);

  const saveAgencyTheme = useCallback(async (agencyId: string, colors: ThemeColors): Promise<boolean> => {
      const sb = guardSupabase();
      if (!sb) return false;
      try {
          const { error } = await sb.from('agency_themes').upsert(
              {
                  agency_id: agencyId,
                  colors: colors,
                  updated_at: new Date().toISOString()
              },
              { onConflict: 'agency_id' }
          );
          if (error) throw error;
          showToast('Tema da agência salvo!', 'success');
          return true;
      } catch (error: any) {
          console.error("Error saving agency theme:", error.message);
          showToast(`Erro ao salvar tema da agência: ${error.message}`, 'error');
          return false;
      }
  }, [showToast]);

  const searchTrips = useCallback(async (params: SearchTripsParams): Promise<PaginatedResult<Trip>> => {
      const sb = guardSupabase();
      if (!sb) return { data: MOCK_TRIPS.slice(0, params.limit || 10), count: MOCK_TRIPS.length };

      let query = sb.from('trips').select('*, trip_images(*)', { count: 'exact' });

      // Apply filters
      if (params.agencyId) query = query.eq('agency_id', params.agencyId);
      if (params.featured) query = query.eq('featured', true);
      if (params.category) query = query.eq('category', params.category);
      if (params.minPrice) query = query.gte('price', params.minPrice);
      if (params.maxPrice) query = query.lte('price', params.maxPrice);
      
      // Text search
      if (params.query) {
          const searchTerm = `%${params.query.toLowerCase()}%`;
          query = query.or(`title.ilike.${searchTerm},description.ilike.${searchTerm},destination.ilike.${searchTerm},tags.cs.{${params.query}}`); // Basic tag search
      }

      // Sorting
      switch (params.sort) {
          case 'LOW_PRICE': query = query.order('price', { ascending: true }); break;
          case 'HIGH_PRICE': query = query.order('price', { ascending: false }); break;
          case 'DATE_ASC': query = query.order('start_date', { ascending: true }); break;
          case 'RATING': query = query.order('trip_rating', { ascending: false }); break;
          case 'RELEVANCE': 
          default: 
              query = query.order('featured', { ascending: false }) // Featured first
                           .order('views_count', { ascending: false }); // Then by views
      }

      // Pagination
      const from = ((params.page || 1) - 1) * (params.limit || 10);
      const to = from + (params.limit || 10) - 1;
      query = query.range(from, to);

      try {
          const { data, error, count } = await query;
          if (error) throw error;

          const mappedTrips: Trip[] = data.map((t: any) => ({
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
          
          return { data: mappedTrips, count: count || 0 };
      } catch (error: any) {
          console.error("Error searching trips:", error.message);
          showToast(`Erro ao buscar viagens: ${error.message}`, 'error');
          return { data: [], count: 0, error: error.message };
      }
  }, [showToast]);

  const searchAgencies = useCallback(async (params: SearchAgenciesParams): Promise<PaginatedResult<Agency>> => {
      const sb = guardSupabase();
      if (!sb) return { data: MOCK_AGENCIES.slice(0, params.limit || 10), count: MOCK_AGENCIES.length };

      let query = sb.from('agencies').select('*', { count: 'exact' });

      // Filter by active agencies only for public search
      query = query.eq('is_active', true);

      // Text search
      if (params.query) {
          const searchTerm = `%${params.query.toLowerCase()}%`;
          query = query.or(`name.ilike.${searchTerm},description.ilike.${searchTerm},slug.ilike.${searchTerm}`);
      }

      // Specialty (simplified search across description/tags)
      if (params.specialty) {
          const specialtyTerm = `%${params.specialty.toLowerCase()}%`;
          query = query.or(`description.ilike.${specialtyTerm},custom_settings->>tags.ilike.${specialtyTerm}`); // Assuming custom_settings.tags is a JSONB array of strings
      }

      // Sorting
      switch (params.sort) {
          case 'NAME': query = query.order('name', { ascending: true }); break;
          case 'RATING': query = query.order('average_rating', { ascending: false }); break; // Assuming an average_rating column
          case 'RELEVANCE': 
          default: 
              query = query.order('created_at', { ascending: false }); // Newest first for relevance
      }

      // Pagination
      const from = ((params.page || 1) - 1) * (params.limit || 10);
      const to = from + (params.limit || 10) - 1;
      query = query.range(from, to);

      try {
          const { data, error, count } = await query;
          if (error) throw error;

          const mappedAgencies: Agency[] = data.map((a: any) => ({
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

          return { data: mappedAgencies, count: count || 0 };
      } catch (error: any) {
          console.error("Error searching agencies:", error.message);
          showToast(`Erro ao buscar agências: ${error.message}`, 'error');
          return { data: [], count: 0, error: error.message };
      }
  }, [showToast]);

  const incrementTripViews = useCallback(async (tripId: string) => {
    const sb = guardSupabase();
    if (!sb) return;
    try {
        await sb.from('trips')
            .rpc('increment_views', { trip_id_param: tripId, increment_value: 1 }); // Call RPC function
    } catch (error: any) {
        console.error("Error incrementing trip views:", error.message);
    }
  }, []);

  return (
    <DataContext.Provider
      value={{
        agencies,
        trips,
        bookings,
        reviews: [], // Reviews from `reviews` table are deprecated; use `agencyReviews`
        agencyReviews,
        clients,
        auditLogs,
        activityLogs,
        loading,
        searchTrips,
        searchAgencies,
        getTripBySlug,
        getAgencyBySlug,
        getTripById,
        getAgencyPublicTrips,
        getPublicTrips,
        refreshData,
        addBooking,
        addReview,
        addAgencyReview,
        deleteReview,
        deleteAgencyReview,
        updateAgencyReview,
        toggleFavorite,
        updateClientProfile,
        updateAgencySubscription,
        updateAgencyProfileByAdmin,
        toggleAgencyStatus,
        createTrip,
        updateTrip,
        deleteTrip,
        toggleTripStatus,
        toggleTripFeatureStatus,
        updateTripOperationalData,
        softDeleteEntity,
        restoreEntity,
        deleteUser,
        deleteMultipleUsers,
        deleteMultipleAgencies,
        getUsersStats,
        updateMultipleUsersStatus,
        updateMultipleAgenciesStatus,
        logAuditAction,
        sendPasswordReset,
        updateUserAvatarByAdmin,
        getReviewsByTripId,
        getReviewsByAgencyId,
        getReviewsByClientId,
        getAgencyStats,
        getAgencyTheme,
        saveAgencyTheme,
        refreshUserData: refreshData, // Expose refreshData as refreshUserData
        incrementTripViews,
      }}
    >
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