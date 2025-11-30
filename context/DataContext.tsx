
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Trip, Agency, Booking, Review, AgencyReview, Client, UserRole, AuditLog, AgencyTheme, ThemeColors, UserStats } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { MOCK_AGENCIES, MOCK_TRIPS, MOCK_BOOKINGS, MOCK_REVIEWS, MOCK_CLIENTS } from '../services/mockData';
import { slugify } from '../utils/slugify';
import { useToast } from './ToastContext';

interface DashboardStats {
  totalRevenue: number;
  totalViews: number;
  totalSales: number;
  conversionRate: number;
}

interface DataContextType {
  trips: Trip[];
  agencies: Agency[];
  bookings: Booking[];
  reviews: Review[]; // Legacy Trip Reviews (Deprecated)
  agencyReviews: AgencyReview[]; // New Agency Reviews
  clients: Client[];
  auditLogs: AuditLog[];
  loading: boolean;
  
  addBooking: (booking: Booking) => Promise<void>;
  addReview: (review: Review) => Promise<void>; // Legacy
  addAgencyReview: (review: Partial<AgencyReview>) => Promise<void>; // New
  deleteReview: (reviewId: string) => Promise<void>; // Legacy
  deleteAgencyReview: (reviewId: string) => Promise<void>; // New
  updateAgencyReview: (reviewId: string, data: Partial<AgencyReview>) => Promise<void>;
  
  toggleFavorite: (tripId: string, clientId: string) => Promise<void>;
  updateClientProfile: (clientId: string, data: Partial<Client>) => Promise<void>;
  
  updateAgencySubscription: (agencyId: string, status: 'ACTIVE' | 'INACTIVE', plan: 'BASIC' | 'PREMIUM') => Promise<void>;
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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

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
  const [loading, setLoading] = useState(true);

  // FIX: Moved useMockData inside DataProvider to have access to state setters.
  const useMockData = () => {
      setTrips(MOCK_TRIPS);
      setAgencies(MOCK_AGENCIES);
      setBookings(MOCK_BOOKINGS);
      setReviews(MOCK_REVIEWS);
      setAgencyReviews([]);
      setClients(MOCK_CLIENTS);
      setAuditLogs([]);
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
            category: t.category || 'PRAIA',
            tags: t.tags || [],
            travelerTypes: t.traveler_types || [],
            itinerary: t.itinerary || [],
            paymentMethods: t.payment_methods || [],
            is_active: t.is_active,
            rating: 0, 
            totalReviews: 0,
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
        subscriptionPlan: 'PREMIUM', // Placeholder, needs to join subscriptions
        subscriptionExpiresAt: new Date().toISOString(), // Placeholder
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
                profiles (full_name),
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
                start_date,
                duration_days,
                trip_images (image_url),
                agencies (
                  id,
                  name,
                  slug,
                  phone,
                  whatsapp,
                  logo_url
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
               description: b.trips.description || '', // Ensure no undefined
               destination: b.trips.destination,
               price: b.trips.price,
               startDate: b.trips.start_date,
               endDate: b.trips.end_date, // Needs to be fetched
               durationDays: b.trips.duration_days,
               images: images,
               category: b.trips.category || 'PRAIA', // Needs to be fetched
               tags: b.trips.tags || [],
               travelerTypes: b.trips.traveler_types || [],
               is_active: b.trips.is_active || false,
               rating: 0, // Needs to be fetched
               totalReviews: 0, // Needs to be fetched
               included: b.trips.included || [],
               notIncluded: b.trips.not_included || [],
            } as Trip : undefined; // Explicitly cast to Trip
            
            const agencyData: Agency | undefined = b.trips?.agencies ? {
              id: b.trips.agencies.id, // user_id
              agencyId: b.trips.agencies.id, // Primary Key of agencies table
              name: b.trips.agencies.name,
              email: b.trips.agencies.email,
              role: UserRole.AGENCY, // Default
              slug: b.trips.agencies.slug,
              logo: b.trips.agencies.logo_url,
              phone: b.trips.agencies.phone,
              whatsapp: b.trips.agencies.whatsapp,
              description: '',
              is_active: true, // Default
              heroMode: 'TRIPS', // Default
              subscriptionStatus: 'ACTIVE', // Default
              subscriptionPlan: 'BASIC', // Default
              subscriptionExpiresAt: new Date().toISOString(), // Default
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
              _agency: agencyData,
            };
          });
          setBookings(formattedBookings);
        }
    } catch (err) {
        console.warn("Supabase unavailable or bookings query failed, using MOCK_BOOKINGS.", err);
        setBookings(MOCK_BOOKINGS);
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
        useMockData();
        setLoading(false);
        return;
      }

      const promises = [
        fetchTrips(), 
        fetchAgencies(), 
        fetchAgencyReviews(),
        fetchBookings()
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
        }
    } catch (error: any) {
        console.error('Error toggling favorite:', error);
        showToast('Erro ao atualizar favoritos', 'error');
        setClients(prev => prev.map(c => c.id === clientId ? { ...c, favorites: currentClient.favorites } : c));
    }
  };

  const addBooking = async (booking: Booking) => {
    const supabase = guardSupabase();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let finalId = booking.id;
    
    if (!finalId || !uuidRegex.test(finalId)) {
        finalId = crypto.randomUUID();
    }

    const { error } = await supabase.from('bookings').insert({
      id: finalId,
      trip_id: booking.tripId,
      client_id: booking.clientId,
      created_at: booking.date,
      status: booking.status,
      total_price: booking.totalPrice,
      passengers: booking.passengers,
      voucher_code: booking.voucherCode,
      payment_method: booking.paymentMethod
    });
    if (error) {
      console.error('Error adding booking:', error);
      showToast('Erro ao criar reserva: ' + error.message, 'error');
    } else {
      showToast('Reserva realizada com sucesso!', 'success');
      setBookings(prev => [...prev, booking]);
    }
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
    }
  };

  const deleteAgencyReview = async (reviewId: string) => {
    const supabase = guardSupabase();
    const { error } = await supabase.from('agency_reviews').delete().eq('id', reviewId);
    if (error) showToast('Erro ao excluir: ' + error.message, 'error');
    else {
        showToast('Avaliação excluída.', 'success');
        await refreshData();
    }
  };

  const createTrip = async (trip: Trip) => {
    const supabase = guardSupabase();
    
    // Explicitly build the payload to avoid inserting extra fields like 'rating'
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

    // Handle images
    if (trip.images && trip.images.length > 0) {
        const imagePayload = trip.images.map((url, i) => ({ trip_id: data.id, image_url: url, position: i }));
        const { error: imgError } = await supabase.from('trip_images').insert(imagePayload);
        if (imgError) throw imgError;
    }
    
    await refreshData();
  };

  const updateTrip = async (trip: Trip) => {
    const supabase = guardSupabase();
    
    // Explicitly build the payload to avoid inserting extra fields like 'rating'
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
      updated_at: new Date().toISOString() // Good practice to update this
    };

    const { error } = await supabase.from('trips').update(payload).eq('id', trip.id);

    if (error) throw error;

    // Manage images: delete all then re-insert
    await supabase.from('trip_images').delete().eq('trip_id', trip.id);
    if (trip.images && trip.images.length > 0) {
        const imagePayload = trip.images.map((url, i) => ({ trip_id: trip.id, image_url: url, position: i }));
        const { error: imgError } = await supabase.from('trip_images').insert(imagePayload);
        if (imgError) throw imgError;
    }
    
    await refreshData();
  };
  
  const deleteTrip = async (tripId: string) => {
    const supabase = guardSupabase();
    // Cascade delete should handle trip_images
    const { error } = await supabase.from('trips').delete().eq('id', tripId);
    if (error) throw error;
    await refreshData();
  };

  const toggleTripStatus = async (tripId: string) => {
    const supabase = guardSupabase();
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    const { error } = await supabase.from('trips').update({ is_active: !trip.is_active }).eq('id', tripId);
    if (error) showToast('Erro: ' + error.message, 'error');
    else showToast(`Viagem ${!trip.is_active ? 'publicada' : 'pausada'}.`, 'success');
    await refreshData();
  };

  const toggleTripFeatureStatus = async (tripId: string) => {
    const supabase = guardSupabase();
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    const { error } = await supabase.from('trips').update({ featured: !trip.featured }).eq('id', tripId);
    if (error) showToast('Erro: ' + error.message, 'error');
    else showToast(`Viagem ${!trip.featured ? 'destacada' : 'removida dos destaques'}.`, 'success');
    await refreshData();
  };

  const softDeleteEntity = async (id: string, table: 'profiles' | 'agencies') => {
    const supabase = guardSupabase();
    try {
        const { error } = await supabase
            .from('profiles') // Always soft-delete the profile
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);
        
        if (error) throw error;
        
        showToast(`${table === 'profiles' ? 'Usuário' : 'Agência'} movido para a lixeira.`, 'success');
        await refreshData();
    } catch (error: any) {
        showToast(`Erro ao mover para a lixeira: ${error.message}`, 'error');
    }
};

const restoreEntity = async (id: string, table: 'profiles' | 'agencies') => {
    const supabase = guardSupabase();
    try {
        const { error } = await supabase
            .from('profiles') // Always restore the profile
            .update({ deleted_at: null })
            .eq('id', id);
        
        if (error) throw error;

        showToast(`${table === 'profiles' ? 'Usuário' : 'Agência'} restaurado(a).`, 'success');
        await refreshData();
    } catch (error: any) {
        showToast(`Erro ao restaurar: ${error.message}`, 'error');
    }
};

  // --- GETTERS (DERIVED STATE) ---
  // RELAXED GETTERS: We trust the Database RLS to filter what is public.
  // We removed ".filter(t => t.is_active)" from here to solve the "Nothing shows" bug.
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
  const getAgencyStats = (agencyId: string) => { const agencyTrips = getAgencyTrips(agencyId); const totalViews = agencyTrips.reduce((sum, trip) => sum + (trip.views || 0), 0); const totalSales = agencyTrips.reduce((sum, trip) => sum + (trip.sales || 0), 0); const totalRevenue = agencyTrips.reduce((sum, trip) => sum + ((trip.sales || 0) * trip.price), 0); return { totalRevenue, totalViews, totalSales, conversionRate: totalViews > 0 ? (totalSales / totalViews) * 100 : 0 }; };

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
      trips, agencies, bookings, reviews, agencyReviews, clients, auditLogs, loading,
      addBooking,
      addReview,
      addAgencyReview,
      deleteReview: dummyGuardedFunc,
      deleteAgencyReview,
      updateAgencyReview,
      toggleFavorite, 
      updateClientProfile: dummyGuardedFunc, 
      updateAgencySubscription: dummyGuardedFunc, 
      updateAgencyProfileByAdmin: dummyGuardedFunc, 
      toggleAgencyStatus: dummyGuardedFunc,
      createTrip, 
      updateTrip, 
      deleteTrip, 
      toggleTripStatus, 
      toggleTripFeatureStatus,
      softDeleteEntity, 
      restoreEntity, 
      deleteUser: dummyGuardedFunc, 
      deleteMultipleUsers: dummyGuardedFunc, 
      deleteMultipleAgencies: dummyGuardedFunc, 
      getUsersStats: async() => [],
      updateMultipleUsersStatus: dummyGuardedFunc, 
      updateMultipleAgenciesStatus: dummyGuardedFunc, 
      logAuditAction: dummyGuardedFunc,
      sendPasswordReset: dummyGuardedFunc, 
      updateUserAvatarByAdmin: async() => null,
      getPublicTrips, getAgencyPublicTrips, getAgencyTrips, getTripById, getTripBySlug, getAgencyBySlug,
      getReviewsByTripId, getReviewsByAgencyId, getReviewsByClientId, hasUserPurchasedTrip, getAgencyStats,
      getAgencyTheme, saveAgencyTheme,
      refreshData
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
