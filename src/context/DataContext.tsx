
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
  reviews: Review[]; 
  agencyReviews: AgencyReview[]; 
  clients: Client[];
  auditLogs: AuditLog[];
  activityLogs: ActivityLog[];
  loading: boolean;
  
  addBooking: (booking: Booking) => Promise<Booking | undefined>;
  addReview: (review: Review) => Promise<void>; 
  addAgencyReview: (review: Partial<AgencyReview>) => Promise<void>; 
  deleteReview: (reviewId: string) => Promise<void>;
  deleteAgencyReview: (reviewId: string) => Promise<void>; 
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

// Helper for Mock Data Init
const initializeMockData = (
  setTrips: (t: Trip[]) => void, 
  setAgencies: (a: Agency[]) => void, 
  setBookings: (b: Booking[]) => void, 
  setReviews: (r: Review[]) => void, 
  setAgencyReviews: (ar: AgencyReview[]) => void, 
  setClients: (c: Client[]) => void, 
  setAuditLogs: (al: AuditLog[]) => void,
  setActivityLogs: (al: ActivityLog[]) => void
) => {
    setTrips(MOCK_TRIPS);
    setAgencies(MOCK_AGENCIES);
    setBookings(MOCK_BOOKINGS);
    setReviews(MOCK_REVIEWS);
    setAgencyReviews([]);
    setClients(MOCK_CLIENTS);
    setAuditLogs([]);
    setActivityLogs([]);
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
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // --- LOG ACTIVITY ---
  const logActivity = async (actionType: ActivityActionType, details: any = {}, relatedAgencyId: string | null = null) => {
    if (!supabase || !user) return;
    
    let actorRole: ActivityActorRole = user.role as ActivityActorRole;
    if (user.email === 'juannicolas1@gmail.com') {
      actorRole = 'ADMIN';
    } else if (user.role === UserRole.AGENCY) {
      actorRole = 'AGENCY';
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

  // --- FETCH TRIPS ---
  const fetchTrips = async () => {
    if (!supabase) {
      setTrips(MOCK_TRIPS);
      return;
    }
    try {
      // Use wildcard to get all columns, plus relations
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
            category: t.category || 'PRAIA',
            tags: t.tags || [],
            travelerTypes: t.traveler_types || [],
            itinerary: t.itinerary || [],
            paymentMethods: t.payment_methods || [],
            is_active: t.is_active,
            // Map correct DB columns to Type properties
            tripRating: t.trip_rating || 0,
            tripTotalReviews: t.trip_total_reviews || 0,
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
      console.warn("Supabase fetchTrips failed, using MOCK_TRIPS.", err);
      setTrips(MOCK_TRIPS);
    }
  };

  // --- FETCH AGENCIES ---
  const fetchAgencies = async () => {
    if (!supabase) {
      setAgencies(MOCK_AGENCIES);
      return;
    }
    try {
      const { data, error } = await supabase.from('agencies').select('*');
      
      if (error) throw error;
      
      const formattedAgencies: Agency[] = (data || []).map((a: any) => ({
        id: a.user_id,
        agencyId: a.id,
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
        subscriptionStatus: a.is_active ? 'ACTIVE' : 'INACTIVE',
        subscriptionPlan: a.subscription_plan || 'BASIC',
        subscriptionExpiresAt: a.subscription_expires_at || new Date().toISOString(), 
        website: a.website,
        phone: a.phone,
        address: a.address || {},
        bankInfo: a.bank_info || {},
        deleted_at: a.deleted_at
      }));

      setAgencies(formattedAgencies);
    } catch (err) {
      console.warn("Supabase fetchAgencies failed, using MOCK_AGENCIES.", err);
      setAgencies(MOCK_AGENCIES);
    }
  };

  // --- FETCH CLIENTS ---
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
      console.warn("Supabase fetchClients failed.", err);
      setClients(MOCK_CLIENTS);
    }
  };

  // --- FETCH REVIEWS ---
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
             console.error("Error fetching agency reviews:", error);
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
                  clientAvatar: r.profiles?.avatar_url || undefined,
                  agencyName: r.agencies?.name || 'Agência',
                  agencyLogo: r.agencies?.logo_url,
                  response: r.response,
                  tags: r.tags || [],
                  tripTitle: r.trips?.title
              })));
          }
      } catch (err: any) {
          console.warn("Agency reviews fetch failed.", err);
      }
  };

  // --- FETCH BOOKINGS ---
  const fetchBookings = async () => {
    if (!supabase || !user) {
      setBookings(MOCK_BOOKINGS);
      return;
    }

    try {
        // Use wildcards (*) for nested relations to ensure we get all available columns
        // This avoids errors if a specific column (like 'rating') was renamed or removed in the DB
        const { data, error } = await supabase
            .from('bookings')
            .select(`
              *, 
              trips (
                *,
                trip_images (image_url),
                agencies (*)
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
               category: b.trips.category || 'PRAIA',
               tags: b.trips.tags || [],
               travelerTypes: b.trips.traveler_types || [],
               itinerary: b.trips.itinerary || [],
               paymentMethods: b.trips.payment_methods || [], 
               is_active: b.trips.is_active || false,
               // Use fallback logic for ratings to handle potential DB column names
               tripRating: b.trips.trip_rating || b.trips.rating || 0,
               tripTotalReviews: b.trips.trip_total_reviews || b.trips.totalReviews || 0,
               included: b.trips.included || [],
               notIncluded: b.trips.not_included || [],
               views: b.trips.views_count || 0,
               sales: b.trips.sales_count || 0,
               featured: b.trips.featured || false,
               featuredInHero: b.trips.featured_in_hero || false,
               popularNearSP: b.trips.popular_near_sp || false
            } as Trip : undefined;
            
            const agencyData: Agency | undefined = b.trips?.agencies ? {
              id: b.trips.agencies.user_id,
              agencyId: b.trips.agencies.id,
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
              paymentMethod: b.payment_method,
              _trip: tripData,
              _agency: agencyData
            };
          });
          setBookings(formattedBookings);
        }
    } catch (err) {
        console.warn("Supabase fetchBookings failed, using MOCK_BOOKINGS.", err);
        setBookings(MOCK_BOOKINGS);
    }
  };

  // --- FETCH ACTIVITY LOGS ---
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
          profiles (full_name, avatar_url),
          agencies (name, logo_url),
          trips (title)
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
          user_name: log.profiles?.full_name || log.actor_email,
          user_avatar: log.profiles?.avatar_url,
          agency_name: log.agencies?.name,
          agency_logo: log.agencies?.logo_url,
          trip_title: log.trips?.title,
        }));
        setActivityLogs(formattedLogs);
      }
    } catch (err) {
      console.warn("Activity logs query failed.", err);
      setActivityLogs([]);
    }
  };

  // --- FETCH AUDIT LOGS ---
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
        fetchActivityLogs()
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

  // --- ACTIONS ---
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
      }).select().single();

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
          _trip: booking._trip, 
          _agency: booking._agency, 
        };
        
        setBookings(prev => [...prev, formattedData]);
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
      trip_rating: trip.tripRating,
      trip_total_reviews: trip.tripTotalReviews,
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
      trip_rating: trip.tripRating,
      trip_total_reviews: trip.tripTotalReviews,
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
          await supabase.from('audit_logs').insert({ admin_email: user.email, action, details });
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

          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
          
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
  
  const dummyGuardedFunc = async () => { if (!supabase) return; };

  return (
    <DataContext.Provider value={{
      trips, agencies, bookings, reviews, agencyReviews, clients, auditLogs, activityLogs, loading,
      addBooking,
      addReview,
      addAgencyReview,
      deleteReview: dummyGuardedFunc,
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
      getPublicTrips, getAgencyPublicTrips, getAgencyTrips, getTripById, getTripBySlug, getAgencyBySlug,
      getReviewsByTripId, getReviewsByAgencyId, getReviewsByClientId, hasUserPurchasedTrip, getAgencyStats,
      getAgencyTheme, saveAgencyTheme,
      refreshData, incrementTripViews
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
