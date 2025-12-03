
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Trip, Agency, Booking, Review, AgencyReview, Client, UserRole, AuditLog, AgencyTheme, ThemeColors, UserStats, DashboardStats, ActivityLog, ActivityActorRole, ActivityActionType } from '../types';
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
): void => { // Explicitly define return type as void
    setTrips(MOCK_TRIPS);
    setAgencies(MOCK_AGENCIES);
    setBookings(MOCK_BOOKINGS);
    setReviews(MOCK_REVIEWS);
    setAgencyReviews([]);
    // FIX: Ensure mock clients have role and email explicitly set
    setClients(MOCK_CLIENTS.map(client => ({ ...client, role: UserRole.CLIENT, email: client.email || `${client.name.toLowerCase().replace(' ', '')}@example.com`, favorites: client.favorites || [] })));
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
      // FIX: Use a different variable name for data if needed, or simply check for error.
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
      // OPTIMIZATION: Fetch only direct fields and trip_images for performance.
      // Agency details will be looked up from the 'agencies' state.
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          trip_images (image_url, position)
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
            category: t.category || 'PRAIA',
            tags: t.tags || [],
            travelerTypes: t.traveler_types || [],
            itinerary: t.itinerary || [],
            paymentMethods: t.payment_methods || [],
            is_active: t.is_active,
            rating: t.rating || 0, // Assuming rating might be present or default to 0
            totalReviews: t.totalReviews || 0,
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
        // OPTIMIZATION: Fetch only direct booking fields
        const { data, error } = await supabase
            .from('bookings')
            .select(`*`); // Removed nested selects for trips and agencies

        if (error) throw error;

        if (data) {
          const formattedBookings: Booking[] = data.map((b: any) => {
            // No longer fetching nested trip/agency data here
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
              _trip: undefined, // Explicitly set to undefined, will be hydrated on demand
              _agency: undefined // Explicitly set to undefined, will be hydrated on demand
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

  const toggleFavorite = async (tripId: string, clientId: string) => {
    const supabase = guardSupabase();
    const currentClient = clients.find(c => c.id === clientId) || { favorites: [] as string[] };
    const isCurrentlyFavorite = currentClient.favorites?.includes(tripId);
    
    const updatedFavorites = isCurrentlyFavorite 
      ? currentClient.favorites.filter(id => id !== tripId)
      : [...(currentClient.favorites || []), tripId];

    setClients(prev => prev.map(c => c.id === clientId ? { ...c, favorites: updatedFavorites } : c));

    try {
        if (isCurrentlyFavorite) {
            const { error } = await supabase.from('favorites').delete().eq('user_id', clientId).eq('trip_id', tripId);
            if (error) throw error;
            showToast('Removido dos favoritos', 'info');
            logActivity('FAVORITE_TOGGLED', { tripId, action: 'removed' });
        } else {
            const { error } = await supabase.from('favorites').insert({ user_id: clientId, trip_id: tripId });
            if (error) {
                if (error.code === '23505') { 
                    console.warn('Favorite already exists in DB, syncing state.');
                } else {
                    throw error;
                }
            }
            showToast('Adicionado aos favoritos', 'success');
            logActivity('FAVORITE_TOGGLED', { tripId, action: 'added' });
        }
    } catch (error: any) {
        console.error('Error toggling favorite:', error);
        showToast('Erro ao atualizar favoritos', 'error');
        setClients(prev => prev.map(c => c.id === clientId ? { ...c, favorites: currentClient.favorites } : c));
    }
  };

  const addBooking = async (booking: Booking): Promise<Booking | undefined> => { 
    const supabase = guardSupabase();
    let finalId = booking.id;
    
    if (!finalId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalId)) {
        finalId = crypto.randomUUID();
    }
    
    console.log(`Attempting to add booking for trip ${booking.tripId} with ${booking.passengers} passengers.`); // Added log
    try {
      const { data, error } = await supabase.from('bookings').insert({
        id: finalId,
        trip_id: booking.tripId,
        client_id: booking.clientId,
        created_at: booking.date,
        status: booking.status,
        total_price: booking.totalPrice,
        passengers: booking.passengers,
        voucher_code: booking.voucherCode,
        payment_method: booking.paymentMethod
      }).select().single(); // This is good, it returns the inserted data

      if (error) throw error;

      if (data) {
        const formattedData: Booking = {
          id: data.id,
          tripId: data.trip_id,
          clientId: data.client_id,
          date: data.created_at,
          status: data.status,
          totalPrice: data.total_price,
          passengers: data.passengers,
          voucherCode: data.voucher_code,
          paymentMethod: data.payment_method,
          _trip: booking._trip, // Directly use passed trip data
          _agency: booking._agency, // Directly use passed agency data
        };
        
        setBookings(prev => [...prev, formattedData]); // Optimistically add to state
        console.log(`Booking for trip ${booking.tripId} created successfully. Local state updated without extra DB fetch.`);
        logActivity('BOOKING_CREATED', { 
          bookingId: formattedData.id, 
          tripId: formattedData.tripId, 
          totalPrice: formattedData.totalPrice, 
          passengers: formattedData.passengers 
        });
        return formattedData;
      }
    } catch (err: any) {
      console.error('Error adding booking:', err);
      showToast('Erro ao criar reserva: ' + err.message, 'error');
      throw err;
    }
    return undefined;
  };
  
  const addReview = async (review: Review) => {
    console.warn("addReview is deprecated. Use addAgencyReview.");
  };

  const addAgencyReview = async (review: Partial<AgencyReview>) => {
      const supabase = guardSupabase();
      if (!review.agencyId || !review.clientId || !review.rating) {
          showToast("Dados incompletos para avaliação", 'error');
          return;
      }
      const { data, error } = await supabase.from('agency_reviews').insert({
          agency_id: review.agencyId,
          client_id: review.clientId,
          booking_id: review.bookingId,
          rating: review.rating,
          comment: review.comment,
          tags: review.tags,
          trip_id: review.trip_id
      }).select().single();

      if (error) {
          console.error('Error adding agency review:', error);
          showToast('Erro ao avaliar agência: ' + error.message, 'error');
      } else {
          showToast('Avaliação da agência enviada!', 'success');
          await refreshData();
          logActivity('REVIEW_SUBMITTED', { 
            reviewId: data.id, 
            agencyId: review.agencyId, 
            tripId: review.trip_id, 
            rating: review.rating 
          });
      }
  };

  const updateAgencyReview = async (reviewId: string, data: Partial<AgencyReview>) => {
    const supabase = guardSupabase();
    const { error } = await supabase.from('agency_reviews').update({
        rating: data.rating,
        comment: data.comment,
        tags: data.tags,
    }).eq('id', reviewId);

    if (error) {
        showToast('Erro ao atualizar avaliação: ' + error.message, 'error');
    } else {
        showToast('Avaliação atualizada!', 'success');
        await refreshData();
        logActivity('REVIEW_UPDATED', { reviewId, newRating: data.rating, newComment: data.comment });
    }
  };

  const deleteAgencyReview = async (reviewId: string) => {
    const supabase = guardSupabase();
    const { error } = await supabase.from('agency_reviews').delete().eq('id', reviewId);
    if (error) showToast('Erro ao excluir: ' + error.message, 'error');
    else {
        showToast('Avaliação excluída.', 'success');
        await refreshData();
        logActivity('REVIEW_DELETED', { reviewId });
    }
  };

  const createTrip = async (trip: Trip) => {
    const supabase = guardSupabase();
    
    const payload = {
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
      payment_methods: trip.paymentMethods,
      included: trip.included,
      not_included: trip.notIncluded,
      is_active: trip.is_active,
      featured: trip.featured,
      featured_in_hero: trip.featuredInHero,
      popular_near_sp: trip.popularNearSP,
      views_count: trip.views || 0,
      sales_count: trip.sales || 0,
    };

    const { data, error } = await supabase.from('trips').insert(payload).select().single();
    
    if (error) throw error;

    if (trip.images && trip.images.length > 0) {
        const imagePayload = trip.images.map((url, i) => ({ trip_id: data.id, image_url: url, position: i }));
        const { error: imgError } = await supabase.from('trip_images').insert(imagePayload);
        if (imgError) throw imgError;
    }
    
    await refreshData();
    logActivity('TRIP_CREATED', { tripId: data.id, title: data.title }, data.agency_id);
  };

  const updateTrip = async (trip: Trip) => {
    const supabase = guardSupabase();
    
    const payload = {
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
      payment_methods: trip.paymentMethods,
      included: trip.included,
      not_included: trip.notIncluded,
      is_active: trip.is_active,
      featured: trip.featured,
      featured_in_hero: trip.featuredInHero,
      popular_near_sp: trip.popularNearSP,
      views_count: trip.views || 0,
      sales_count: trip.sales || 0,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('trips').update(payload).eq('id', trip.id);

    if (error) throw error;

    await supabase.from('trip_images').delete().eq('trip_id', trip.id);
    if (trip.images && trip.images.length > 0) {
        const imagePayload = trip.images.map((url, i) => ({ trip_id: trip.id, image_url: url, position: i }));
        const { error: imgError } = await supabase.from('trip_images').insert(imagePayload);
        if (imgError) throw imgError;
    }
    
    await refreshData();
    logActivity('TRIP_UPDATED', { tripId: trip.id, title: trip.title }, trip.agencyId);
  };
  
  const deleteTrip = async (tripId: string) => {
    const supabase = guardSupabase();
    const trip = trips.find(t => t.id === tripId);
    const { error } = await supabase.from('trips').delete().eq('id', tripId);
    if (error) throw error;
    await refreshData();
    logActivity('TRIP_DELETED', { tripId, title: trip?.title }, trip?.agencyId);
  };

  const toggleTripStatus = async (tripId: string) => {
    const supabase = guardSupabase();
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    const { error } = await supabase.from('trips').update({ is_active: !trip.is_active }).eq('id', tripId);
    if (error) showToast('Erro: ' + error.message, 'error');
    else showToast(`Viagem ${!trip.is_active ? 'publicada' : 'pausada'}.`, 'success');
    await refreshData();
    logActivity('TRIP_STATUS_TOGGLED', { tripId, title: trip.title, newStatus: !trip.is_active }, trip.agencyId);
  };

  const toggleTripFeatureStatus = async (tripId: string) => {
    const supabase = guardSupabase();
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    const { error } = await supabase.from('trips').update({ featured: !trip.featured }).eq('id', tripId);
    if (error) showToast('Erro: ' + error.message, 'error');
    else showToast(`Viagem ${!trip.featured ? 'destacada' : 'removida dos destaques'}.`, 'success');
    await refreshData();
    logActivity('TRIP_FEATURE_TOGGLED', { tripId, title: trip.title, newStatus: !trip.featured }, trip.agencyId);
  };

  const softDeleteEntity = async (id: string, table: 'profiles' | 'agencies') => {
    const supabase = guardSupabase();
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);
        
        if (error) throw error;
        
        showToast(`${table === 'profiles' ? 'Usuário' : 'Agência'} movido para a lixeira.`, 'success');
        await refreshData();
        logActivity('ADMIN_USER_MANAGED', { action: 'soft_delete', entityType: table, entityId: id });
    } catch (error: any) {
        showToast(`Erro ao mover para a lixeira: ${error.message}`, 'error');
    }
};

const restoreEntity = async (id: string, table: 'profiles' | 'agencies') => {
    const supabase = guardSupabase();
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ deleted_at: null })
            .eq('id', id);
        
        if (error) throw error;

        showToast(`${table === 'profiles' ? 'Usuário' : 'Agência'} restaurado(a).`, 'success');
        await refreshData();
        logActivity('ADMIN_USER_MANAGED', { action: 'restore', entityType: table, entityId: id });
    } catch (error: any) {
        showToast(`Erro ao restaurar: ${error.message}`, 'error');
    }
};

  const incrementTripViews = async (tripId: string) => {
      setTrips(prev => prev.map(t => t.id === tripId ? { ...t, views: (t.views || 0) + 1 } : t));
      
      if (supabase) {
          const { data } = await supabase.from('trips').select('views_count, agency_id').eq('id', tripId).single();
          if (data) {
             await supabase.from('trips').update({ views_count: (data.views_count || 0) + 1 }).eq('id', tripId);
             logActivity('TRIP_VIEWED', { tripId }, data.agency_id);
          }
      }
  };

  const updateClientProfile = async (clientId: string, data: Partial<Client>) => {
    const supabase = guardSupabase();
    const updates: any = {};
    if (data.name) updates.full_name = data.name;
    if (data.email) updates.email = data.email;
    if (data.phone) updates.phone = data.phone;
    if (data.cpf) updates.cpf = data.cpf;
    if (data.status) updates.status = data.status;
    if (data.address) updates.address = data.address;
    if (data.avatar) updates.avatar_url = data.avatar;

    const { error } = await supabase.from('profiles').update(updates).eq('id', clientId);
    if (error) {
        showToast('Erro ao atualizar perfil: ' + error.message, 'error');
        throw error;
    }
    await refreshData();
    logActivity('CLIENT_PROFILE_UPDATED', { clientId, changes: Object.keys(data) });
  };

  const updateAgencyProfileByAdmin = async (agencyId: string, data: Partial<Agency>) => {
    const supabase = guardSupabase();
    const updates: any = {};
    if (data.name) updates.name = data.name;
    if (data.description) updates.description = data.description;
    if (data.cnpj) updates.cnpj = data.cnpj;
    if (data.slug) updates.slug = data.slug;
    if (data.phone) updates.phone = data.phone;
    if (data.whatsapp) updates.whatsapp = data.whatsapp;
    if (data.website) updates.website = data.website;
    if (data.address) updates.address = data.address;
    if (data.bankInfo) updates.bank_info = data.bankInfo;
    if (data.logo) updates.logo_url = data.logo;
    if (data.heroMode) updates.hero_mode = data.heroMode;
    if (data.heroBannerUrl) updates.hero_banner_url = data.heroBannerUrl;
    if (data.heroTitle) updates.hero_title = data.heroTitle;
    if (data.heroSubtitle) updates.hero_subtitle = data.heroSubtitle;
    if (data.customSettings) updates.custom_settings = data.customSettings;

    const { error } = await supabase.from('agencies').update(updates).eq('id', agencyId);
    if (error) {
        showToast('Erro ao atualizar agência: ' + error.message, 'error');
        throw error;
    }
    await refreshData();
    logActivity('AGENCY_PROFILE_UPDATED', { agencyId, changes: Object.keys(data) }, agencyId);
  };

  const toggleAgencyStatus = async (agencyId: string) => {
    const supabase = guardSupabase();
    const agency = agencies.find(a => a.agencyId === agencyId);
    if (!agency) return;
    const newStatus = agency.subscriptionStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    const { error } = await supabase.from('agencies').update({ 
        is_active: newStatus === 'ACTIVE',
        subscription_status: newStatus
    }).eq('id', agencyId);
    
    if (error) {
        showToast('Erro ao alterar status: ' + error.message, 'error');
    } else {
        showToast(`Agência ${newStatus === 'ACTIVE' ? 'ativada' : 'inativada'}.`, 'success');
        await refreshData();
        logActivity('AGENCY_STATUS_TOGGLED', { agencyId, newStatus }, agencyId);
    }
  };

  const deleteUser = async (userId: string, role: UserRole) => {
      const supabase = guardSupabase();
      try {
          if (role === UserRole.AGENCY) {
              // Get agency ID from user ID
              const { data: agencyData } = await supabase.from('agencies').select('id').eq('user_id', userId).single();
              if (agencyData) {
                await supabase.from('agencies').delete().eq('user_id', userId);
                logActivity('ADMIN_AGENCY_MANAGED', { action: 'permanent_delete', agencyId: agencyData.id }, agencyData.id);
              }
          }
          const { error } = await supabase.from('profiles').delete().eq('id', userId);
          if (error) throw error;
          
          showToast('Usuário excluído do banco de dados.', 'success');
          await refreshData();
          logActivity('ADMIN_USER_MANAGED', { action: 'permanent_delete', userId });
      } catch (e: any) {
          showToast('Erro ao excluir: ' + e.message, 'error');
      }
  };

  const deleteMultipleUsers = async (userIds: string[]) => {
      const supabase = guardSupabase();
      try {
          const { error } = await supabase.from('profiles').delete().in('id', userIds);
          if (error) throw error;
          await refreshData();
          logActivity('ADMIN_USER_MANAGED', { action: 'mass_delete', userIds });
      } catch (e: any) {
          showToast('Erro ao excluir usuários: ' + e.message, 'error');
      }
  };

  const deleteMultipleAgencies = async (agencyIds: string[]) => {
      const supabase = guardSupabase();
      try {
          const { error } = await supabase.from('agencies').delete().in('id', agencyIds);
          if (error) throw error;
          await refreshData();
          logActivity('ADMIN_AGENCY_MANAGED', { action: 'mass_delete', agencyIds });
      } catch (e: any) {
          showToast('Erro ao excluir agências: ' + e.message, 'error');
      }
  };

  const updateMultipleUsersStatus = async (userIds: string[], status: 'ACTIVE' | 'SUSPENDED') => {
      const supabase = guardSupabase();
      try {
          const { error } = await supabase.from('profiles').update({ status }).in('id', userIds);
          if (error) throw error;
          await refreshData();
          logActivity('ADMIN_USER_MANAGED', { action: 'mass_status_update', userIds, newStatus: status });
      } catch (e: any) {
          showToast('Erro ao atualizar status: ' + e.message, 'error');
      }
  };

  const updateMultipleAgenciesStatus = async (agencyIds: string[], status: 'ACTIVE' | 'INACTIVE') => {
      const supabase = guardSupabase();
      try {
          const { error } = await supabase.from('agencies').update({ 
              is_active: status === 'ACTIVE',
              subscription_status: status 
          }).in('id', agencyIds);
          if (error) throw error;
          await refreshData();
          logActivity('ADMIN_AGENCY_MANAGED', { action: 'mass_status_update', agencyIds, newStatus: status });
      } catch (e: any) {
          showToast('Erro ao atualizar status: ' + e.message, 'error');
      }
  };

  const logAuditAction = async (action: string, details: string) => {
      if (!supabase || !user || user.role !== UserRole.ADMIN) return;
      try {
          // FIX: Capture error from insert operation to ensure 'data' (if used elsewhere) is block-scoped correctly.
          // Also, improved error handling for the insert operation itself.
          const { data, error } = await supabase.from('audit_logs').insert({ admin_email: user.email, action, details });
          if (error) throw error;
          
          // Fix: Ensure 'ADMIN_ACTION' is a valid ActivityActionType
          logActivity('ADMIN_ACTION' as ActivityActionType, { action, details });
      } catch (e) {
          console.error("Error logging audit action:", e);
      }
  };

  const sendPasswordReset = async (email: string) => {
      if (!supabase) return;
      try {
          const { error } = await (supabase.auth as any).resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/#/forgot-password`
          });
          if (error) throw error;
          showToast('Link de reset de senha enviado para o e-mail.', 'success');
          logActivity('PASSWORD_RESET_INITIATED', { targetEmail: email });
      } catch (e: any) {
          showToast('Erro ao enviar link: ' + e.message, 'error');
      }
  };

  const updateUserAvatarByAdmin = async (userId: string, file: File): Promise<string | null> => {
      if (!supabase || !user || user.role !== UserRole.ADMIN) return null;
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${userId}-${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(fileName, file, { upsert: true });

          if (uploadError) throw uploadError;

          const { data } = supabase.storage.from('avatars').getPublicUrl(data.path);
          
          await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId);

          showToast('Avatar atualizado com sucesso!', 'success');
          logActivity('ADMIN_USER_MANAGED', { action: 'avatar_updated', userId, newAvatarUrl: data.publicUrl });
          await refreshData();
          return data.publicUrl;
      } catch (error) {
          console.error("Upload avatar by admin error:", error);
          showToast('Erro ao atualizar avatar.', 'error');
          return null;
      }
  };

  const getUsersStats = async (userIds: string[]): Promise<UserStats[]> => {
      if (!supabase) return [];
      try {
          const { data, error } = await supabase
              .from('profiles')
              .select(`
                  id,
                  full_name,
                  bookings(total_price),
                  agency_reviews(id)
              `)
              .in('id', userIds);
          
          if (error) throw error;

          return data.map((profile: any) => ({
              userId: profile.id,
              userName: profile.full_name || 'Usuário Desconhecido',
              totalSpent: profile.bookings.reduce((sum: number, b: any) => sum + b.total_price, 0),
              totalBookings: profile.bookings.length,
              totalReviews: profile.agency_reviews.length,
          }));

      } catch (e) {
          console.error("Error fetching user stats:", e);
          return [];
      }
  };


  // --- GETTERS (DERIVED STATE) ---
  const getPublicTrips = () => trips; 
  const getAgencyPublicTrips = (agencyId: string) => trips.filter(t => t.agencyId === agencyId);
  const getAgencyTrips = (agencyId: string) => trips.filter(t => t.agencyId === agencyId);
  
  const getTripById = (id: string | undefined) => trips.find(t => t.id === id);
  const getTripBySlug = (slug: string) => trips.find(t => t.slug === slug);
  const getAgencyBySlug = (slug: string) => agencies.find(a => a.slug === slug);
  const getReviewsByTripId = (tripId: string) => reviews.filter(r => r.tripId === tripId);
  const getReviewsByAgencyId = (agencyId: string) => agencyReviews.filter(r => r.agencyId === agencyId);
  const getReviewsByClientId = (clientId: string) => agencyReviews.filter(r => r.clientId === clientId);
  const hasUserPurchasedTrip = (userId: string, tripId: string) => bookings.some(b => b.clientId === userId && b.tripId === tripId && b.status === 'CONFIRMED');
  const getAgencyStats = (agencyId: string): DashboardStats => { 
      const agencyTrips = trips.filter(t => t.agencyId === agencyId);
      const totalViews = agencyTrips.reduce((sum, trip) => sum + (trip.views || 0), 0);

      const agencyBookings = bookings.filter(b => {
          // Changed logic: bookings no longer have _agency pre-fetched.
          // Need to find the trip first, then its agency.
          const trip = trips.find(t => t.id === b.tripId);
          return trip?.agencyId === agencyId;
      });

      const confirmedBookings = agencyBookings.filter(b => b.status === 'CONFIRMED');
      const totalSales = confirmedBookings.length;
      const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.totalPrice, 0);

      const agencyReviewsForStats = agencyReviews.filter(r => r.agencyId === agencyId);
      const totalRatingSum = agencyReviewsForStats.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = agencyReviewsForStats.length > 0 ? totalRatingSum / agencyReviewsForStats.length : 0;
      const totalReviewsCount = agencyReviewsForStats.length;

      return { 
          totalRevenue, 
          totalViews, 
          totalSales, 
          conversionRate: totalViews > 0 ? (totalSales / totalViews) * 100 : 0,
          averageRating,
          totalReviews: totalReviewsCount,
      }; 
  };
  
  const getAgencyTheme = async (agencyId: string): Promise<AgencyTheme | null> => {
      const supabase = guardSupabase();
      try {
          const { data, error } = await supabase.from('agency_themes').select('colors').eq('agency_id', agencyId).maybeSingle();
          if (error) throw error;
          return data ? { agencyId, ...data } : null;
      } catch (e) { return null; }
  };
  
  const saveAgencyTheme = async (agencyId: string, colors: ThemeColors): Promise<boolean> => {
      const supabase = guardSupabase();
      try {
          const { error } = await supabase.from('agency_themes').upsert({ agency_id: agencyId, colors: colors }, { onConflict: 'agency_id' });
          if (error) throw error;
          return true;
      } catch (e) { return false; }
  };
  
  // FIX: This dummy function needs to be a proper function that uses `supabase` in its body
  // to avoid linter warnings/errors if it's called. Or better, just remove it if not needed.
  // Given it's a dummy, the safest is to ensure it doesn't cause issues if called.
  const dummyGuardedFunc = async () => { if (!supabase) return; /* Add some no-op or console.log */ console.log("Dummy guarded func called, supabase not available."); };


  // Navigation Button component for Admin Dashboard
  interface NavButtonProps {
    tabId: string;
    label: string;
    icon: React.ComponentType<LucideProps>;
    activeTab: string;
    onClick: (tabId: string) => void;
    hasNotification?: boolean;
  }
  
  const NavButton: React.FC<NavButtonProps> = ({ tabId, label, icon: Icon, activeTab, onClick, hasNotification }) => (
    <button 
      onClick={() => onClick(tabId)} 
      className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors relative ${activeTab === tabId ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
    >
      <Icon size={16} /> 
      {label} 
      {hasNotification && ( 
        <span className="absolute top-2 right-2 flex h-2.5 w-2.5"> 
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span> 
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span> 
        </span> 
      )} 
    </button>
  );


  if (!user || user.role !== UserRole.ADMIN) return <div className="min-h-screen flex items-center justify-center">Acesso negado.</div>;

  const renderContent = () => {
    switch(activeTab) {
      case 'OVERVIEW':
        return (
          <div className="space-y-8 animate-[fadeIn_0.3s]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Receita Total" value={`R$ ${platformRevenue.toLocaleString()}`} subtitle="Receita bruta da plataforma" icon={DollarSign} color="green"/>
                <StatCard title="Agências Ativas" value={activeAgencies.length} subtitle="Parceiros verificados" icon={Briefcase} color="blue"/>
                <StatCard title="Usuários Ativos" value={activeUsers.length} subtitle="Clientes da plataforma" icon={Users} color="purple"/>
                <StatCard title="Pacotes Ativos" value={trips.length} subtitle="Viagens disponíveis" icon={Plane} color="amber"/>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Atividade Recente - Agora com todos os logs */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center"><Activity size={20} className="mr-2 text-blue-600"/> Atividade Recente</h3>
                        <button onClick={exportActivityLogsToPdf} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200 flex items-center gap-1.5">
                            <Download size={14}/> Exportar PDF
                        </button>
                    </div>
                    
                    {/* Activity Log Filters */}
                    <div className="flex flex-wrap gap-3 mb-4">
                        <input 
                            type="text" 
                            placeholder="Buscar no log..." 
                            value={activitySearchTerm} 
                            onChange={e => setActivitySearchTerm(e.target.value)}
                            className="flex-1 min-w-[150px] border border-gray-200 rounded-lg text-sm p-2.5 outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                        <select 
                            value={activityActorRoleFilter} 
                            onChange={e => setActivityActorRoleFilter(e.target.value as ActivityActorRole | 'ALL')}
                            className="border border-gray-200 rounded-lg text-sm p-2.5 outline-none focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="ALL">Todos os Perfis</option>
                            <option value="CLIENT">Cliente</option>
                            <option value="AGENCY">Agência</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                        <select 
                            value={activityActionTypeFilter} 
                            onChange={e => setActivityActionTypeFilter(e.target.value as ActivityActionType | 'ALL')}
                            className="border border-gray-200 rounded-lg text-sm p-2.5 outline-none focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="ALL">Todos os Eventos</option>
                            <option value="TRIP_VIEWED">Viagem Visualizada</option>
                            <option value="BOOKING_CREATED">Reserva Criada</option>
                            <option value="REVIEW_SUBMITTED">Avaliação Enviada</option>
                            <option value="FAVORITE_TOGGLED">Favorito Alterado</option>
                            <option value="TRIP_CREATED">Viagem Criada</option>
                            <option value="TRIP_UPDATED">Viagem Atualizada</option>
                            <option value="TRIP_DELETED">Viagem Excluída</option>
                            <option value="TRIP_STATUS_TOGGLED">Status da Viagem Alterado</option>
                            <option value="TRIP_FEATURE_TOGGLED">Destaque da Viagem Alterado</option>
                            <option value="AGENCY_PROFILE_UPDATED">Perfil da Agência Atualizado</option>
                            <option value="AGENCY_STATUS_TOGGLED">Status da Agência Alterado</option>
                            <option value="AGENCY_SUBSCRIPTION_UPDATED">Assinatura da Agência Atualizada</option>
                            <option value="CLIENT_PROFILE_UPDATED">Perfil do Cliente Atualizado</option>
                            <option value="PASSWORD_RESET_INITIATED">Reset de Senha Iniciado</option>
                            <option value="ACCOUNT_DELETED">Conta Excluída</option>
                            <option value="ADMIN_USER_MANAGED">Usuário (Admin) Gerenciado</option>
                            <option value="ADMIN_AGENCY_MANAGED">Agência (Admin) Gerenciada</option>
                            <option value="ADMIN_THEME_MANAGED">Tema (Admin) Gerenciado</option>
                            <option value="ADMIN_MOCK_DATA_MIGRATED">Dados Mock Migrados (Admin)</option>
                            <option value="ADMIN_ACTION">Ação Administrativa</option>
                        </select>
                        <input 
                            type="date" 
                            value={activityStartDate} 
                            onChange={e => setActivityStartDate(e.target.value)}
                            className="border border-gray-200 rounded-lg text-sm p-2.5 outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                        <input 
                            type="date" 
                            value={activityEndDate} 
                            onChange={e => setActivityEndDate(e.target.value)}
                            className="border border-gray-200 rounded-lg text-sm p-2.5 outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                        {(activitySearchTerm || activityActorRoleFilter !== 'ALL' || activityActionTypeFilter !== 'ALL' || activityStartDate || activityEndDate) && (
                            <button 
                                onClick={() => { setActivitySearchTerm(''); setActivityActorRoleFilter('ALL'); setActivityActionTypeFilter('ALL'); setActivityStartDate(''); setActivityEndDate(''); }}
                                className="text-red-500 text-sm font-bold hover:underline px-2"
                            >
                                Limpar Filtros
                            </button>
                        )}
                    </div>


                    {filteredActivityLogs.length > 0 ? (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
                            {filteredActivityLogs.map(log => (
                                <div key={log.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-start gap-3">
                                    <div className="flex-shrink-0">
                                        {getActionIcon(log.action_type)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-900 line-clamp-1 flex items-center gap-1.5">
                                            {log.user_avatar && <img src={log.user_avatar} alt="Avatar" className="w-5 h-5 rounded-full object-cover"/>}
                                            {log.user_name}
                                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{log.actor_role}</span>
                                        </p>
                                        <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                                            <span className="font-semibold">{(log.action_type as string).replace(/_/g, ' ')}</span>
                                            {log.trip_title && ` na viagem "${log.trip_title}"`}
                                            {log.agency_name && ` da agência "${log.agency_name}"`}
                                            {log.details.action === 'soft_delete' && ` (movido para lixeira)`}
                                            {log.details.action === 'restore' && ` (restaurado)`}
                                            {log.details.action === 'permanent_delete' && ` (excluído permanentemente)`}
                                            {log.details.newStatus && ` (novo status: ${log.details.newStatus})`}
                                            {log.details.rating && ` (nota: ${log.details.rating})`}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1.5">
                                            <CalendarDays size={12} /> {new Date(log.created_at).toLocaleString('pt-BR')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400 text-sm">Nenhuma atividade recente encontrada.</div>
                    )}
                </div>

                {/* Migrar Dados Mock */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Database size={20} className="mr-2 text-primary-600"/> Ferramentas de Dados</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Use para popular seu banco de dados de desenvolvimento com informações de exemplo.
                        <br/>(Não use em produção!)
                    </p>
                    <button 
                        onClick={async () => { // Make onClick async
                            setIsProcessing(true);
                            await migrateData();
                            // FIX: Call logAuditAction here after successful migration
                            logAuditAction('ADMIN_MOCK_DATA_MIGRATED', 'Migrated mock data to database'); 
                            await refreshData(); // Refresh data context after migration
                            setIsProcessing(false);
                        }} 
                        disabled={isProcessing}
                        className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isProcessing ? <Loader size={18} className="animate-spin" /> : <Sparkles size={18}/>} Migrar Dados Mock
                    </button>
                    {isMaster && (
                        <div className="mt-4">
                            <h4 className="text-sm font-bold text-red-600 flex items-center mb-2"><AlertOctagon size={16} className="mr-2"/> Ferramentas de Limpeza (Master Admin)</h4>
                            <p className="text-xs text-gray-500 mb-3">
                                CUIDADO! Estas ações são irreversíveis e APAGAM DADOS DO BANCO.
                            </p>
                            <div className="space-y-2">
                                <button onClick={() => { if (window.confirm('Excluir TODOS os usuários (clientes e agências)?')) deleteMultipleUsers(clients.map(c => c.id)); }} className="w-full bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100">Excluir Todos os Usuários</button>
                                <button onClick={() => { if (window.confirm('Excluir TODAS as agências e viagens?')) deleteMultipleAgencies(agencies.map(a => a.agencyId)); }} className="w-full bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100">Excluir Todas as Agências</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </div>
        );
      case 'USERS':
        return (
          <div className="animate-[fadeIn_0.3s]">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Usuários ({filteredUsers.length})</h2>
                <div className="flex items-center gap-3">
                    <button onClick={() => handleSetUserView('list')} className={`p-2 rounded-lg ${userView === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}><List size={20}/></button>
                    <button onClick={() => handleSetUserView('cards')} className={`p-2 rounded-lg ${userView === 'cards' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}><LayoutGrid size={20}/></button>
                </div>
            </div>

            <div className="mb-6 flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                    <input type="text" placeholder="Buscar usuário por nome ou email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"/>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowUserTrash(!showUserTrash)} className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors ${showUserTrash ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        {showUserTrash ? <Trash size={18}/> : <Archive size={18}/>}
                        {showUserTrash ? `Lixeira (${deletedUsers.length})` : 'Ver Lixeira'}
                    </button>
                    <button onClick={handleRefresh} disabled={isProcessing} className="px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50">
                        {isProcessing ? <Loader size={18} className="animate-spin"/> : <RefreshCw size={18}/>} Atualizar
                    </button>
                </div>
            </div>
            
            {selectedUsers.length > 0 && (
                <div className="bg-primary-50 border border-primary-100 p-4 rounded-xl mb-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-[fadeIn_0.3s]">
                    <p className="text-sm text-primary-800 font-bold">{selectedUsers.length} usuário(s) selecionado(s)</p>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={handleMassUpdateUserStatus.bind(null, 'ACTIVE')} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 text-green-700 hover:bg-green-100 flex items-center gap-1"><UserCheck size={14}/> Ativar</button>
                        <button onClick={handleMassUpdateUserStatus.bind(null, 'SUSPENDED')} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 flex items-center gap-1"><UserX size={14}/> Suspender</button>
                        <button onClick={handleViewStats} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1"><StatsIcon size={14}/> Ver Estatísticas</button>
                        <button onClick={handleMassDeleteUsers} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1"><Trash2 size={14}/> Excluir</button>
                        <button onClick={downloadPdf.bind(null, 'users')} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-50 text-gray-700 hover:bg-gray-100 flex items-center gap-1"><Download size={14}/> Exportar PDF</button>
                    </div>
                </div>
            )}

            {filteredUsers.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <Users size={32} className="text-gray-300 mx-auto mb-4"/>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum usuário encontrado</h3>
                    <p className="text-gray-500 mb-6">Ajuste seus filtros ou limpe a busca.</p>
                </div>
            ) : userView === 'list' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <input type="checkbox" onChange={handleToggleAllUsers} checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0} className="rounded text-primary-600"/>
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Função</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.map((client: Client) => (
                                <tr key={client.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input type="checkbox" onChange={() => handleToggleUser(client.id)} checked={selectedUsers.includes(client.id)} className="rounded text-primary-600"/>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <img className="h-10 w-10 rounded-full object-cover" src={client.avatar || `https://ui-avatars.com/api/?name=${client.name}`} alt=""/>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{client.name}</div>
                                                <div className="text-sm text-gray-500">{client.phone || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Badge color={client.status === 'ACTIVE' ? 'green' : 'red'}>{client.status}</Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.role}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <ActionMenu actions={[
                                            { label: 'Editar', onClick: () => { setSelectedItem(client); setEditFormData({ name: client.name, email: client.email, phone: client.phone, cpf: client.cpf, avatar: client.avatar, address: client.address }); setModalType('EDIT_USER'); setModalTab('PROFILE'); }, icon: Edit3 },
                                            { label: client.status === 'ACTIVE' ? 'Suspender' : 'Ativar', onClick: () => handleUserStatusToggle(client), icon: client.status === 'ACTIVE' ? UserX : UserCheck },
                                            { label: 'Resetar Senha', onClick: () => sendPasswordReset(client.email), icon: Lock },
                                            { label: showUserTrash ? 'Excluir Perm.' : 'Mover para Lixeira', onClick: () => showUserTrash ? handlePermanentDelete(client.id, client.role) : handleSoftDelete(client.id, 'user'), icon: showUserTrash ? Trash2 : Archive, variant: 'danger' },
                                            ...(showUserTrash ? [{ label: 'Restaurar', onClick: () => handleRestore(client.id, 'user'), icon: ArchiveRestore }] : [])
                                        ]}/>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredUsers.map((client: Client) => (
                        <div key={client.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative">
                            <input type="checkbox" onChange={() => handleToggleUser(client.id)} checked={selectedUsers.includes(client.id)} className="absolute top-4 left-4 rounded text-primary-600"/>
                            <div className="flex flex-col items-center text-center pb-4 mb-4 border-b border-gray-100">
                                <img className="h-16 w-16 rounded-full object-cover mb-3" src={client.avatar || `https://ui-avatars.com/api/?name=${client.name}`} alt=""/>
                                <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{client.name}</h3>
                                <p className="text-sm text-gray-500 line-clamp-1">{client.email}</p>
                            </div>
                            <div className="flex justify-around items-center text-sm text-gray-600">
                                <Badge color={client.status === 'ACTIVE' ? 'green' : 'red'}>{client.status}</Badge>
                                <Badge color="blue">{client.role}</Badge>
                            </div>
                            <div className="flex justify-center gap-2 mt-4">
                                <button onClick={() => { setSelectedItem(client); setEditFormData({ name: client.name, email: client.email, phone: client.phone, cpf: client.cpf, avatar: client.avatar, address: client.address }); setModalType('EDIT_USER'); setModalTab('PROFILE'); }} className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-50"><Edit3 size={18}/></button>
                                <button onClick={() => handleUserStatusToggle(client)} className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-50">{client.status === 'ACTIVE' ? <UserX size={18}/> : <UserCheck size={18}/>}</button>
                            </div>
                            <div className="absolute top-4 right-4">
                                <ActionMenu actions={[
                                    { label: 'Resetar Senha', onClick: () => sendPasswordReset(client.email), icon: Lock },
                                    { label: showUserTrash ? 'Excluir Perm.' : 'Mover para Lixeira', onClick: () => showUserTrash ? handlePermanentDelete(client.id, client.role) : handleSoftDelete(client.id, 'user'), icon: showUserTrash ? Trash2 : Archive, variant: 'danger' },
                                    ...(showUserTrash ? [{ label: 'Restaurar', onClick: () => handleRestore(client.id, 'user'), icon: ArchiveRestore }] : [])
                                ]}/>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        );
      case 'AGENCIES':
        return (
          <div className="animate-[fadeIn_0.3s]">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Agências ({filteredAgencies.length})</h2>
                <div className="flex items-center gap-3">
                    <button onClick={() => handleSetAgencyView('list')} className={`p-2 rounded-lg ${agencyView === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}><List size={20}/></button>
                    <button onClick={() => handleSetAgencyView('cards')} className={`p-2 rounded-lg ${agencyView === 'cards' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}><LayoutGrid size={20}/></button>
                </div>
            </div>

            <div className="mb-6 flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                    <input type="text" placeholder="Buscar agência por nome ou email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"/>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowAgencyTrash(!showAgencyTrash)} className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors ${showAgencyTrash ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        {showAgencyTrash ? <Trash size={18}/> : <Archive size={18}/>}
                        {showAgencyTrash ? `Lixeira (${deletedAgencies.length})` : 'Ver Lixeira'}
                    </button>
                    <button onClick={handleRefresh} disabled={isProcessing} className="px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50">
                        {isProcessing ? <Loader size={18} className="animate-spin"/> : <RefreshCw size={18}/>} Atualizar
                    </button>
                </div>
            </div>
            
            {selectedAgencies.length > 0 && (
                <div className="bg-primary-50 border border-primary-100 p-4 rounded-xl mb-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-[fadeIn_0.3s]">
                    <p className="text-sm text-primary-800 font-bold">{selectedAgencies.length} agência(s) selecionada(s)</p>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={handleMassUpdateAgencyStatus.bind(null, 'ACTIVE')} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 text-green-700 hover:bg-green-100 flex items-center gap-1"><CheckCircle size={14}/> Ativar</button>
                        <button onClick={handleMassUpdateAgencyStatus.bind(null, 'INACTIVE')} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1"><Ban size={14}/> Inativar</button>
                        <button onClick={handleMassDeleteAgencies} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1"><Trash2 size={14}/> Excluir</button>
                        <button onClick={downloadPdf.bind(null, 'agencies')} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-50 text-gray-700 hover:bg-gray-100 flex items-center gap-1"><Download size={14}/> Exportar PDF</button>
                    </div>
                </div>
            )}

            {filteredAgencies.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <Building size={32} className="text-gray-300 mx-auto mb-4"/>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhuma agência encontrada</h3>
                    <p className="text-gray-500 mb-6">Ajuste seus filtros ou limpe a busca.</p>
                </div>
            ) : agencyView === 'list' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <input type="checkbox" onChange={handleToggleAllAgencies} checked={selectedAgencies.length === filteredAgencies.length && filteredAgencies.length > 0} className="rounded text-primary-600"/>
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agência</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plano</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredAgencies.map((agency: Agency) => (
                                <tr key={agency.agencyId} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input type="checkbox" onChange={() => handleToggleAgency(agency.agencyId)} checked={selectedAgencies.includes(agency.agencyId)} className="rounded text-primary-600"/>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <img className="h-10 w-10 rounded-full object-cover" src={agency.logo || `https://ui-avatars.com/api/?name=${agency.name}`} alt=""/>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{agency.name}</div>
                                                <div className="text-sm text-gray-500">{agency.slug}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agency.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <Badge color={agency.subscriptionPlan === 'PREMIUM' ? 'purple' : 'blue'}>{agency.subscriptionPlan}</Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Badge color={agency.subscriptionStatus === 'ACTIVE' ? 'green' : 'red'}>{agency.subscriptionStatus}</Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <ActionMenu actions={[
                                            { label: 'Editar', onClick: () => { setSelectedItem(agency); setEditFormData({ ...agency }); setModalType('EDIT_AGENCY'); }, icon: Edit3 },
                                            { label: agency.is_active ? 'Inativar' : 'Ativar', onClick: () => toggleAgencyStatus(agency.agencyId), icon: agency.is_active ? Ban : CheckCircle },
                                            { label: 'Gerenciar Assinatura', onClick: () => { setSelectedItem(agency); setEditFormData({ plan: agency.subscriptionPlan, status: agency.subscriptionStatus, expiresAt: agency.subscriptionExpiresAt.slice(0, 16) }); setModalType('MANAGE_SUB'); }, icon: CreditCard },
                                            { label: showAgencyTrash ? 'Excluir Perm.' : 'Mover para Lixeira', onClick: () => showAgencyTrash ? handlePermanentDelete(agency.id, agency.role) : handleSoftDelete(agency.id, 'agency'), icon: showAgencyTrash ? Trash2 : Archive, variant: 'danger' },
                                            ...(showAgencyTrash ? [{ label: 'Restaurar', onClick: () => handleRestore(agency.id, 'agency'), icon: ArchiveRestore }] : [])
                                        ]}/>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAgencies.map((agency: Agency) => (
                        <div key={agency.agencyId} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative">
                            <input type="checkbox" onChange={() => handleToggleAgency(agency.agencyId)} checked={selectedAgencies.includes(agency.agencyId)} className="absolute top-4 left-4 rounded text-primary-600"/>
                            <div className="flex flex-col items-center text-center pb-4 mb-4 border-b border-gray-100">
                                <img className="h-16 w-16 rounded-full object-cover mb-3" src={agency.logo || `https://ui-avatars.com/api/?name=${agency.name}`} alt=""/>
                                <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{agency.name}</h3>
                                <p className="text-sm text-gray-500 line-clamp-1">{agency.email}</p>
                            </div>
                            <div className="flex justify-around items-center text-sm text-gray-600">
                                <Badge color={agency.subscriptionPlan === 'PREMIUM' ? 'purple' : 'blue'}>{agency.subscriptionPlan}</Badge>
                                <Badge color={agency.subscriptionStatus === 'ACTIVE' ? 'green' : 'red'}>{agency.subscriptionStatus}</Badge>
                            </div>
                            <div className="flex justify-center gap-2 mt-4">
                                <button onClick={() => { setSelectedItem(agency); setEditFormData({ ...agency }); setModalType('EDIT_AGENCY'); }} className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-50"><Edit3 size={18}/></button>
                                <button onClick={() => toggleAgencyStatus(agency.agencyId)} className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-50">{agency.is_active ? <Ban size={18}/> : <CheckCircle size={18}/>}</button>
                            </div>
                            <div className="absolute top-4 right-4">
                                <ActionMenu actions={[
                                    { label: 'Gerenciar Assinatura', onClick: () => { setSelectedItem(agency); setEditFormData({ plan: agency.subscriptionPlan, status: agency.subscriptionStatus, expiresAt: agency.subscriptionExpiresAt.slice(0, 16) }); setModalType('MANAGE_SUB'); }, icon: CreditCard },
                                    { label: showAgencyTrash ? 'Excluir Perm.' : 'Mover para Lixeira', onClick: () => showAgencyTrash ? handlePermanentDelete(agency.id, agency.role) : handleSoftDelete(agency.id, 'agency'), icon: showAgencyTrash ? Trash2 : Archive, variant: 'danger' },
                                    ...(showAgencyTrash ? [{ label: 'Restaurar', onClick: () => handleRestore(agency.id, 'agency'), icon: ArchiveRestore }] : [])
                                ]}/>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        );
      case 'TRIPS':
        return (
          <div className="animate-[fadeIn_0.3s]">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Pacotes de Viagem ({filteredTrips.length})</h2>
            <div className="mb-6 flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                    <input type="text" placeholder="Buscar viagem por título ou destino..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"/>
                </div>
                <select value={agencyFilter} onChange={e => setAgencyFilter(e.target.value)} className="border border-gray-200 rounded-xl text-sm p-2.5 outline-none focus:ring-primary-500 focus:border-primary-500">
                    <option value="">Todas as Agências</option>
                    {activeAgencies.map(agency => <option key={agency.agencyId} value={agency.agencyId}>{agency.name}</option>)}
                </select>
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="border border-gray-200 rounded-xl text-sm p-2.5 outline-none focus:ring-primary-500 focus:border-primary-500">
                    <option value="">Todas as Categorias</option>
                    {tripCategories.map(category => <option key={category} value={category}>{category.replace('_', ' ')}</option>)}
                </select>
                <button onClick={handleRefresh} disabled={isProcessing} className="px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50">
                    {isProcessing ? <Loader size={18} className="animate-spin"/> : <RefreshCw size={18}/>} Atualizar
                </button>
            </div>

            {filteredTrips.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <Plane size={32} className="text-gray-300 mx-auto mb-4"/>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhuma viagem encontrada</h3>
                    <p className="text-gray-500 mb-6">Ajuste seus filtros ou limpe a busca.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTrips.map((trip: Trip) => (
                        <div key={trip.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                            <div className="relative h-48 w-full">
                                <img src={trip.images[0] || 'https://placehold.co/400x300/e2e8f0/e2e8f0'} alt={trip.title} className="w-full h-full object-cover"/>
                                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase">{trip.category.replace('_', ' ')}</div>
                                <div className="absolute top-3 right-3 flex items-center gap-2">
                                    {trip.is_active ? (
                                        <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">ATIVO</span>
                                    ) : (
                                        <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">INATIVO</span>
                                    )}
                                    <ActionMenu actions={[
                                        { label: 'Editar', onClick: () => { setSelectedItem(trip); setEditFormData({ ...trip, startDate: trip.startDate.slice(0, 16), endDate: trip.endDate.slice(0, 16) }); setModalType('EDIT_TRIP'); }, icon: Edit3 },
                                        { label: trip.is_active ? 'Pausar' : 'Publicar', onClick: () => toggleTripStatus(trip.id), icon: trip.is_active ? PauseCircle : PlayCircle },
                                        { label: trip.featured ? 'Remover Destaque' : 'Destacar', onClick: () => toggleTripFeatureStatus(trip.id), icon: Sparkles },
                                        { label: 'Excluir', onClick: () => handleDeleteTrip(trip.id), icon: Trash2, variant: 'danger' },
                                    ]}/>
                                </div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{trip.title}</h3>
                                <p className="text-sm text-gray-600 flex items-center mb-3"><MapPin size={16} className="mr-2 text-primary-500"/> {trip.destination}</p>
                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                                <span className="text-xl font-bold text-gray-900">R$ {trip.price.toLocaleString('pt-BR')}</span>
                                <Link to={getAgencyBySlug(agencies.find(a => a.agencyId === trip.agencyId)?.slug || '') ? `/${agencies.find(a => a.agencyId === trip.agencyId)?.slug}/viagem/${trip.slug}` : `/viagem/${trip.slug}`} target="_blank" className="bg-primary-50 text-primary-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-primary-100 transition-colors">Ver Viagem</Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        );
      case 'REVIEWS':
        return (
          <div className="animate-[fadeIn_0.3s]">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Avaliações da Plataforma ({filteredReviews.length})</h2>
            <div className="mb-6 flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                    <input type="text" placeholder="Buscar por comentário ou agência..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"/>
                </div>
                <button onClick={handleRefresh} disabled={isProcessing} className="px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50">
                    {isProcessing ? <Loader size={18} className="animate-spin"/> : <RefreshCw size={18}/>} Atualizar
                </button>
            </div>
            
            {filteredReviews.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <Star size={32} className="text-gray-300 mx-auto mb-4"/>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhuma avaliação encontrada</h3>
                    <p className="text-gray-500 mb-6">Ajuste seus filtros ou limpe a busca.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredReviews.map((review: AgencyReview) => (
                        <div key={review.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0 h-10 w-10">
                                        <img className="h-10 w-10 rounded-full object-cover" src={review.clientAvatar || `https://ui-avatars.com/api/?name=${review.clientName}`} alt=""/>
                                    </div>
                                    <div className="ml-2">
                                        <div className="text-sm font-medium text-gray-900">{review.clientName}</div>
                                        <div className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className="flex text-amber-400">
                                    {[...Array(5)].map((_, i) => <Star key={i} size={14} className={i < review.rating ? 'fill-current' : 'text-gray-300'}/>)}
                                </div>
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed mb-4">"{review.comment}"</p>
                            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <img src={review.agencyLogo || `https://ui-avatars.com/api/?name=${review.agencyName}`} alt="" className="w-6 h-6 rounded-full object-cover"/>
                                    <span>Agência: <span className="font-bold">{review.agencyName}</span></span>
                                </div>
                                <ActionMenu actions={[
                                    { label: 'Editar Avaliação', onClick: () => { setSelectedItem(review); setEditFormData({ comment: review.comment, rating: review.rating }); setModalType('EDIT_REVIEW'); }, icon: Edit3 },
                                    { label: 'Excluir Avaliação', onClick: () => deleteAgencyReview(review.id), icon: Trash2, variant: 'danger' },
                                ]}/>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        );
      case 'AUDIT_LOGS':
        return (
          <div className="animate-[fadeIn_0.3s]">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Logs de Auditoria ({auditLogs.length})</h2>
            <div className="mb-6 flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                    <input type="text" placeholder="Buscar no log..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"/>
                </div>
                <button onClick={handleRefresh} disabled={isProcessing} className="px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50">
                    {isProcessing ? <Loader size={18} className="animate-spin"/> : <RefreshCw size={18}/>} Atualizar
                </button>
            </div>
            
            {auditLogs.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <History size={32} className="text-gray-300 mx-auto mb-4"/>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum log de auditoria</h3>
                    <p className="text-gray-500 mb-6">Nenhuma ação administrativa registrada ainda.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {auditLogs.filter(log => 
                                log.adminEmail.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase())
                            ).map((log: AuditLog) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.adminEmail}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.action}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{log.details}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
          </div>
        );
      case 'THEMES':
        return (
          <div className="animate-[fadeIn_0.3s]">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Gerenciar Temas ({themes.length})</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center"><Palette size={20} className="mr-2 text-primary-600"/> Temas Existentes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {themes.map((theme: ThemePalette) => (
                        <div key={theme.id} className={`p-4 rounded-xl border relative flex items-center gap-4 ${theme.isActive ? 'border-primary-500 bg-primary-50 shadow-md' : 'border-gray-200 bg-white'}`}>
                            <div className="flex-1">
                                <p className={`font-bold text-lg ${theme.isActive ? 'text-primary-800' : 'text-gray-900'}`}>{theme.name}</p>
                                <div className="flex gap-2 mt-2">
                                    <span className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: theme.colors.primary }}></span>
                                    <span className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: theme.colors.secondary }}></span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => previewTheme(theme)} className="p-2 rounded-full text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Prévia"><Eye size={18}/></button>
                                <button onClick={() => setTheme(theme.id)} disabled={theme.isActive} className="p-2 rounded-full text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50" title="Ativar Tema"><CheckCircle size={18}/></button>
                                <button onClick={() => handleDeleteTheme(theme.id, theme.name)} disabled={theme.isDefault || theme.isActive} className="p-2 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50" title="Excluir Tema"><Trash2 size={18}/></button>
                            </div>
                            {theme.isActive && <span className="absolute top-2 right-2 px-2 py-0.5 bg-primary-600 text-white text-xs font-bold rounded-full">ATIVO</span>}
                            {previewMode?.id === theme.id && <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full">PREVIEW</span>}
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center"><Plus size={20} className="mr-2 text-green-600"/> Adicionar Novo Tema</h3>
                <form onSubmit={handleAddTheme} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Nome do Tema</label>
                        <input type="text" value={newThemeForm.name} onChange={e => setNewThemeForm({...newThemeForm, name: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" required/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Cor Primária</label>
                            <div className="flex gap-2 items-center">
                                <input type="color" value={newThemeForm.primary} onChange={e => setNewThemeForm({...newThemeForm, primary: e.target.value})} className="w-8 h-8 rounded-full border"/>
                                <input type="text" value={newThemeForm.primary} onChange={e => setNewThemeForm({...newThemeForm, primary: e.target.value})} className="flex-1 border p-2.5 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 outline-none"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Cor Secundária</label>
                            <div className="flex gap-2 items-center">
                                <input type="color" value={newThemeForm.secondary} onChange={e => setNewThemeForm({...newThemeForm, secondary: e.target.value})} className="w-8 h-8 rounded-full border"/>
                                <input type="text" value={newThemeForm.secondary} onChange={e => setNewThemeForm({...newThemeForm, secondary: e.target.value})} className="flex-1 border p-2.5 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 outline-none"/>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button type="submit" disabled={isProcessing} className="flex-1 bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50">
                            {isProcessing ? <Loader size={18} className="animate-spin"/> : <Plus size={18}/>} Adicionar Tema
                        </button>
                        <button type="button" onClick={() => previewTheme({ id: 'new-temp', name: 'Preview', colors: { ...newThemeForm, background: '#f9fafb', text: '#111827' }, isActive: false, isDefault: false })} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200 flex items-center justify-center gap-2">
                            <Eye size={18}/> Prévia
                        </button>
                        {previewMode && <button type="button" onClick={resetPreview} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200 flex items-center justify-center gap-2"><X size={18}/> Limpar Prévia</button>}
                    </div>
                </form>
            </div>
          </div>
        );
      default:
        return <div className="text-center py-20 text-gray-500">Selecione uma aba para gerenciar.</div>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900">Painel Master Admin</h1>
        <div className="flex flex-wrap gap-3">
            <button onClick={handleRefresh} disabled={isProcessing} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold flex items-center hover:bg-gray-200 transition-colors disabled:opacity-50">
                {isProcessing ? <Loader size={18} className="animate-spin"/> : <RefreshCw size={18}/>} Atualizar Dados
            </button>
            <button onClick={user.logout} className="bg-red-50 text-red-700 px-4 py-2 rounded-lg font-bold flex items-center hover:bg-red-100 transition-colors">
                <LogOut size={18} className="mr-2"/> Sair
            </button>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-xl px-2 scrollbar-hide shadow-sm">
        <NavButton tabId="OVERVIEW" label="Visão Geral" icon={LayoutDashboard} activeTab={activeTab} onClick={handleTabChange} />
        <NavButton tabId="USERS" label="Usuários" icon={Users} activeTab={activeTab} onClick={handleTabChange} hasNotification={deletedUsers.length > 0} />
        <NavButton tabId="AGENCIES" label="Agências" icon={Briefcase} activeTab={activeTab} onClick={handleTabChange} hasNotification={deletedAgencies.length > 0} />
        <NavButton tabId="TRIPS" label="Viagens" icon={Plane} activeTab={activeTab} onClick={handleTabChange} />
        <NavButton tabId="REVIEWS" label="Avaliações" icon={Star} activeTab={activeTab} onClick={handleTabChange} />
        <NavButton tabId="AUDIT_LOGS" label="Logs de Auditoria" icon={History} activeTab={activeTab} onClick={handleTabChange} hasNotification={auditLogs.length > 0} />
        <NavButton tabId="THEMES" label="Temas" icon={Palette} activeTab={activeTab} onClick={handleTabChange} />
      </div>

      {renderContent()}

      {/* Modals */}
      {modalType === 'EDIT_USER' && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl max-w-xl w-full p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Editar Usuário</h3>
            <div className="flex border-b border-gray-200 mb-6">
                <button onClick={() => setModalTab('PROFILE')} className={`py-3 px-6 text-sm font-medium ${modalTab === 'PROFILE' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>Perfil</button>
                <button onClick={() => setModalTab('AVATAR')} className={`py-3 px-6 text-sm font-medium ${modalTab === 'AVATAR' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>Avatar</button>
            </div>
            {modalTab === 'PROFILE' && (
                <form onSubmit={(e) => { e.preventDefault(); handleUserUpdate(); }} className="space-y-4">
                    <div><label className="block text-sm font-bold text-gray-700 mb-2">Nome</label><input type="text" value={editFormData.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/></div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-2">Email</label><input type="email" value={editFormData.email || ''} onChange={e => setEditFormData({...editFormData, email: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/></div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-2">Telefone</label><input type="text" value={editFormData.phone || ''} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/></div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-2">CPF</label><input type="text" value={editFormData.cpf || ''} onChange={e => setEditFormData({...editFormData, cpf: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/></div>
                    <h4 className="text-lg font-bold text-gray-900 mt-6 mb-4">Endereço</h4>
                    <input type="text" value={editFormData.address?.zipCode || ''} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, zipCode: e.target.value}})} placeholder="CEP" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                    <input type="text" value={editFormData.address?.street || ''} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, street: e.target.value}})} placeholder="Rua" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" value={editFormData.address?.number || ''} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, number: e.target.value}})} placeholder="Número" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                        <input type="text" value={editFormData.address?.complement || ''} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, complement: e.target.value}})} placeholder="Complemento" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                    </div>
                    <button type="submit" disabled={isProcessing} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
                        {isProcessing ? <Loader size={18} className="animate-spin" /> : <Save size={18}/>} Salvar
                    </button>
                </form>
            )}
            {modalTab === 'AVATAR' && (
                <div className="text-center">
                    <img src={editFormData.avatar || `https://ui-avatars.com/api/?name=${selectedItem.name}`} alt="Avatar" className="w-24 h-24 rounded-full object-cover mx-auto mb-4"/>
                    <label className="bg-primary-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50">
                        {isUploadingAvatar ? <Loader size={18} className="animate-spin"/> : <Upload size={18}/>}
                        {isUploadingAvatar ? 'Enviando...' : 'Mudar Avatar'}
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isUploadingAvatar}/>
                    </label>
                    <p className="text-xs text-gray-500 mt-2">Clique na imagem para mudar o avatar.</p>
                </div>
            )}
          </div>
        </div>
      )}

      {modalType === 'EDIT_AGENCY' && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl max-w-xl w-full p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Editar Agência</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleAgencyUpdate(); }} className="space-y-4">
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Nome da Agência</label><input type="text" value={editFormData.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Descrição</label><textarea value={editFormData.description || ''} onChange={e => setEditFormData({...editFormData, description: e.target.value})} rows={3} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-2">CNPJ</label><input type="text" value={editFormData.cnpj || ''} onChange={e => setEditFormData({...editFormData, cnpj: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Slug</label><input type="text" value={editFormData.slug || ''} onChange={e => setEditFormData({...editFormData, slug: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/></div>
                <button type="submit" disabled={isProcessing} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {isProcessing ? <Loader size={18} className="animate-spin" /> : <Save size={18}/>} Salvar
                </button>
            </form>
          </div>
        </div>
      )}

      {modalType === 'MANAGE_SUB' && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl max-w-xl w-full p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Gerenciar Assinatura: {selectedItem.name}</h3>
            <form onSubmit={handleSubscriptionUpdate} className="space-y-4">
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Plano</label><select value={editFormData.plan} onChange={e => setEditFormData({...editFormData, plan: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500">
                    <option value="BASIC">BASIC</option><option value="PREMIUM">PREMIUM</option>
                </select></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Status</label><select value={editFormData.status} onChange={e => setEditFormData({...editFormData, status: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500">
                    <option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option><option value="PENDING">PENDING</option>
                </select></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Expira em</label><input type="datetime-local" value={editFormData.expiresAt || ''} onChange={e => setEditFormData({...editFormData, expiresAt: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/></div>
                <div className="flex gap-2">
                    <button type="button" onClick={() => addSubscriptionTime(30)} className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200">+30 Dias</button>
                    <button type="button" onClick={() => addSubscriptionTime(180)} className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200">+180 Dias</button>
                    <button type="button" onClick={() => addSubscriptionTime(365)} className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200">+1 Ano</button>
                </div>
                <button type="submit" disabled={isProcessing} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {isProcessing ? <Loader size={18} className="animate-spin" /> : <Save size={18}/>} Salvar
                </button>
            </form>
          </div>
        </div>
      )}

      {modalType === 'EDIT_REVIEW' && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl max-w-xl w-full p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Editar Avaliação</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleReviewUpdate(); }} className="space-y-4">
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Comentário</label><textarea value={editFormData.comment || ''} onChange={e => setEditFormData({...editFormData, comment: e.target.value})} rows={4} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Nota</label><input type="number" value={editFormData.rating || 0} onChange={e => setEditFormData({...editFormData, rating: parseInt(e.target.value)})} min="1" max="5" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/></div>
                <button type="submit" disabled={isProcessing} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {isProcessing ? <Loader size={18} className="animate-spin" /> : <Save size={18}/>} Salvar
                </button>
            </form>
          </div>
        </div>
      )}

      {modalType === 'EDIT_TRIP' && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl relative max-h-[95vh] overflow-y-auto scrollbar-thin" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Editar Viagem: {selectedItem.title}</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleTripUpdate(); }} className="space-y-6">
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Título da Viagem</label><input type="text" value={editFormData.title || ''} onChange={e => setEditFormData({...editFormData, title: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Descrição</label><textarea value={editFormData.description || ''} onChange={e => setEditFormData({...editFormData, description: e.target.value})} rows={5} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold text-gray-700 mb-2">Destino</label><input type="text" value={editFormData.destination || ''} onChange={e => setEditFormData({...editFormData, destination: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/></div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-2">Preço (R$)</label><input type="number" value={editFormData.price || 0} onChange={e => setEditFormData({...editFormData, price: parseFloat(e.target.value)})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/></div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-2">Data de Início</label><input type="datetime-local" value={editFormData.startDate || ''} onChange={e => setEditFormData({...editFormData, startDate: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/></div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-2">Data de Término</label><input type="datetime-local" value={editFormData.endDate || ''} onChange={e => setEditFormData({...editFormData, endDate: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/></div>
                </div>
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Categoria</label><select value={editFormData.category || 'PRAIA'} onChange={e => setEditFormData({...editFormData, category: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500">
                    <option value="PRAIA">PRAIA</option><option value="AVENTURA">AVENTURA</option><option value="FAMILIA">FAMILIA</option><option value="ROMANTICO">ROMANTICO</option><option value="URBANO">URBANO</option><option value="NATUREZA">NATUREZA</option><option value="CULTURA">CULTURA</option><option value="GASTRONOMICO">GASTRONOMICO</option><option value="VIDA_NOTURNA">VIDA_NOTURNA</option><option value="VIAGEM_BARATA">VIAGEM_BARATA</option><option value="ARTE">ARTE</option>
                </select></div>
                <button type="submit" disabled={isProcessing} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {isProcessing ? <Loader size={18} className="animate-spin" /> : <Save size={18}/>} Salvar
                </button>
            </form>
          </div>
        </div>
      )}

      {modalType === 'VIEW_STATS' && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl max-w-xl w-full p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Estatísticas de Usuários</h3>
            <div className="space-y-4">
                {userStats.length > 0 ? userStats.map(stats => (
                    <div key={stats.userId} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <p className="font-bold text-gray-900">{stats.userName}</p>
                        <div className="flex justify-between text-sm text-gray-600 mt-2">
                            <span>Gastou: <span className="font-bold">R$ {stats.totalSpent.toLocaleString()}</span></span>
                            <span>Reservas: <span className="font-bold">{stats.totalBookings}</span></span>
                            <span>Avaliações: <span className="font-bold">{stats.totalReviews}</span></span>
                        </div>
                    </div>
                )) : <p className="text-center text-gray-500">Nenhum dado disponível para os usuários selecionados.</p>}
            </div>
            <button onClick={() => setModalType(null)} className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200 mt-6">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
};

