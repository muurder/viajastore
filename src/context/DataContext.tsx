
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Trip, Agency, Booking, Review, AgencyReview, Client, UserRole, AuditLog, AgencyTheme, ThemeColors, UserStats, DashboardStats, ActivityLog, ActivityActorRole, ActivityActionType, OperationalData } from '../types';
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

  updateTripOperationalData: (tripId: string, data: OperationalData) => Promise<void>;
  
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

  const guardSupabase = () => {
    if (!supabase) {
        showToast('Funcionalidade indisponível no modo offline.', 'info');
        throw new Error('Supabase client not available.');
    }
    return supabase;
  };

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
      if (error) console.error("Error logging activity:", error);
    } catch (err) {
      console.error("Error calling log_activity RPC:", err);
    }
  };

  const fetchTrips = async () => {
    if (!supabase) { setTrips(MOCK_TRIPS); return; }
    try {
      const { data, error } = await supabase.from('trips').select(`*, trip_images (image_url), agencies (name, logo_url), trip_rating, trip_total_reviews, boarding_points, operational_data`);
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
            images: t.trip_images ? t.trip_images.sort((a: any, b: any) => a.position - b.position).map((img: any) => img.image_url) : [],
            category: t.category || 'PRAIA',
            tags: t.tags || [],
            travelerTypes: t.traveler_types || [],
            itinerary: t.itinerary || [],
            paymentMethods: t.payment_methods || [],
            is_active: t.is_active,
            tripRating: t.trip_rating || 0,
            tripTotalReviews: t.trip_total_reviews || 0,
            boardingPoints: t.boarding_points || [],
            operationalData: t.operational_data || {},
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
      console.warn("Supabase unavailable, using MOCK_TRIPS.", err);
      setTrips(MOCK_TRIPS);
    }
  };

  const fetchAgencies = async () => {
    if (!supabase) { setAgencies(MOCK_AGENCIES); return; }
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
      console.warn("Supabase unavailable, using MOCK_AGENCIES.", err);
      setAgencies(MOCK_AGENCIES);
    }
  };

  const fetchClients = async () => {
    if (!supabase) { setClients(MOCK_CLIENTS); return; }
    try {
      const { data, error } = await supabase.from('profiles').select('*').in('role', ['CLIENT', 'ADMIN']);
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
      if (!supabase) { setAgencyReviews([]); return; }
      try {
          const { data, error } = await supabase.from('agency_reviews').select(`*, profiles (full_name, avatar_url), agencies (id, name, logo_url, slug), trips (title)`);
          if (error) { console.error("Error fetching agency reviews:", error.message || error); return; }
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
      } catch (err: any) { console.warn("Agency reviews table might not exist yet.", err.message || err); }
  };

  const fetchBookings = async () => {
    if (!supabase || !user) { setBookings(MOCK_BOOKINGS); return; }
    try {
        const { data, error } = await supabase.from('bookings').select(`*, trips (*, trip_images (image_url), agencies (*), trip_rating, trip_total_reviews)`);
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
               tripRating: b.trips.trip_rating || 0, 
               tripTotalReviews: b.trips.trip_total_reviews || 0,
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
        console.warn("Supabase unavailable or bookings query failed, using MOCK_BOOKINGS.", err);
        setBookings(MOCK_BOOKINGS);
    }
  };

  const fetchActivityLogs = async () => {
    if (!supabase) { setActivityLogs([]); return; }
    try {
      const { data, error } = await supabase.from('activity_logs').select(`*, profiles (full_name, avatar_url), agencies (name, logo_url), trips (title)`).order('created_at', { ascending: false });
      if (error) throw error;
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
    } catch (err) { setActivityLogs([]); }
  };

  const fetchAuditLogs = async () => {
      if (!supabase) { setAuditLogs([]); return; }
      try {
          const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
          if (error) throw error;
          if (data) {
            setAuditLogs(data.map((l: any) => ({
                id: l.id,
                adminEmail: l.admin_email,
                action: l.action,
                details: l.details,
                createdAt: l.created_at
            })));
          }
      } catch (err) { }
  };

  const refreshData = async () => {
      setLoading(true);
      if (!supabase) { initializeMockData(setTrips, setAgencies, setBookings, setReviews, setAgencyReviews, setClients, setAuditLogs, setActivityLogs); setLoading(false); return; }
      const promises = [fetchTrips(), fetchAgencies(), fetchAgencyReviews(), fetchBookings(), fetchActivityLogs()];
      if (user && user.role === UserRole.CLIENT) {
          const { data } = await supabase.from('favorites').select('trip_id').eq('user_id', user.id);
          if (data) {
             const favs = data.map(f => f.trip_id);
             setClients(prev => {
                 const me = prev.find(c => c.id === user.id);
                 if (me) return prev.map(c => c.id === user.id ? {...c, favorites: favs} : c);
                 else { const newClient = { ...(user as Client), favorites: favs }; return [...prev, newClient]; }
             });
          }
      }
      if (user?.role === UserRole.ADMIN) { promises.push(fetchAuditLogs()); promises.push(fetchClients()); }
      await Promise.all(promises);
      setLoading(false);
  };

  useEffect(() => { refreshData(); }, [user]);

  const addBooking = async (booking: Booking): Promise<Booking | undefined> => { 
    const supabase = guardSupabase();
    let finalId = booking.id;
    if (!finalId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalId)) finalId = crypto.randomUUID();
    try {
      const { data, error } = await supabase.from('bookings').insert({
        id: finalId, trip_id: booking.tripId, client_id: booking.clientId, created_at: booking.date, status: booking.status,
        total_price: booking.totalPrice, passengers: booking.passengers, voucher_code: booking.voucherCode, payment_method: booking.paymentMethod
      }).select().single();
      if (error) throw error;
      if (data) {
        const formattedData: Booking = {
          id: data.id, tripId: data.trip_id, clientId: data.client_id, date: data.created_at, status: data.status,
          totalPrice: data.total_price, passengers: data.passengers, voucherCode: data.voucher_code, paymentMethod: data.payment_method,
          _trip: booking._trip, _agency: booking._agency, 
        };
        setBookings(prev => [...prev, formattedData]);
        logActivity('BOOKING_CREATED', { bookingId: formattedData.id, tripId: formattedData.tripId, totalPrice: formattedData.totalPrice, passengers: formattedData.passengers });
        return formattedData;
      }
    } catch (err: any) { showToast('Erro ao criar reserva: ' + err.message, 'error'); throw err; }
    return undefined;
  };

  const updateAgencySubscription = async (agencyId: string, status: 'ACTIVE' | 'INACTIVE', plan: 'BASIC' | 'PREMIUM', expiresAt?: string) => {
      const supabase = guardSupabase();
      const updates: any = { subscription_status: status, subscription_plan: plan, is_active: status === 'ACTIVE' };
      if (expiresAt) updates.subscription_expires_at = expiresAt;
      const { error } = await supabase.from('agencies').update(updates).eq('id', agencyId); 
      if (error) { showToast('Erro ao atualizar assinatura: ' + error.message, 'error'); throw error; } 
      else { showToast('Assinatura atualizada com sucesso!', 'success'); await refreshData(); logActivity('AGENCY_SUBSCRIPTION_UPDATED', { agencyId, newStatus: status, newPlan: plan, expiresAt }, agencyId); }
  };

  const toggleFavorite = async (tripId: string, clientId: string) => {
    const supabase = guardSupabase();
    const currentClient = clients.find(c => c.id === clientId) || { favorites: [] as string[] };
    const isCurrentlyFavorite = currentClient.favorites?.includes(tripId);
    const updatedFavorites = isCurrentlyFavorite ? currentClient.favorites.filter(id => id !== tripId) : [...(currentClient.favorites || []), tripId];
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, favorites: updatedFavorites } : c));
    try {
        if (isCurrentlyFavorite) {
            const { error } = await supabase.from('favorites').delete().eq('user_id', clientId).eq('trip_id', tripId);
            if (error) throw error;
            showToast('Removido dos favoritos', 'info');
            logActivity('FAVORITE_TOGGLED', { tripId, action: 'removed' });
        } else {
            const { error } = await supabase.from('favorites').insert({ user_id: clientId, trip_id: tripId });
            if (error) { if (error.code === '23505') console.warn('Favorite already exists in DB, syncing state.'); else throw error; }
            showToast('Adicionado aos favoritos', 'success');
            logActivity('FAVORITE_TOGGLED', { tripId, action: 'added' });
        }
    } catch (error: any) { console.error('Error toggling favorite:', error); showToast('Erro ao atualizar favoritos', 'error'); setClients(prev => prev.map(c => c.id === clientId ? { ...c, favorites: currentClient.favorites } : c)); }
  };

  const updateTripOperationalData = async (tripId: string, data: OperationalData) => {
    const supabase = guardSupabase();
    setTrips(prev => prev.map(t => t.id === tripId ? { ...t, operationalData: data } : t));
    const { error } = await supabase.from('trips').update({ operational_data: data }).eq('id', tripId);
    if (error) {
        showToast('Erro ao salvar dados operacionais.', 'error');
        const { data: revertedData } = await supabase.from('trips').select('operational_data').eq('id', tripId).single();
        if (revertedData) setTrips(prev => prev.map(t => t.id === tripId ? { ...t, operationalData: revertedData.operational_data } : t));
        throw error;
    }
  };

  const addAgencyReview = async (review: Partial<AgencyReview>) => {
      const supabase = guardSupabase();
      const { data, error } = await supabase.from('agency_reviews').insert({
          agency_id: review.agencyId, client_id: review.clientId, booking_id: review.bookingId, trip_id: review.trip_id,
          rating: review.rating, comment: review.comment, tags: review.tags || []
      }).select().single();
      if(error) { showToast('Erro ao enviar avaliação.', 'error'); throw error; }
      else { 
          // Optimistically update
          const newReview: AgencyReview = { id: data.id, agencyId: data.agency_id, clientId: data.client_id, rating: data.rating, comment: data.comment, createdAt: data.created_at, tags: data.tags, clientName: user?.name, clientAvatar: user?.avatar };
          setAgencyReviews(prev => [newReview, ...prev]);
      }
  };

  const deleteAgencyReview = async (reviewId: string) => {
      const supabase = guardSupabase();
      const { error } = await supabase.from('agency_reviews').delete().eq('id', reviewId);
      if(error) showToast('Erro ao excluir.', 'error'); else { setAgencyReviews(prev => prev.filter(r => r.id !== reviewId)); showToast('Avaliação excluída.', 'success'); }
  };

  const updateAgencyReview = async (reviewId: string, data: Partial<AgencyReview>) => {
      const supabase = guardSupabase();
      const { error } = await supabase.from('agency_reviews').update({ rating: data.rating, comment: data.comment, tags: data.tags }).eq('id', reviewId);
      if(error) showToast('Erro ao atualizar.', 'error'); else { setAgencyReviews(prev => prev.map(r => r.id === reviewId ? { ...r, ...data } : r)); }
  };

  const updateClientProfile = async (clientId: string, data: Partial<Client>) => {
      const supabase = guardSupabase();
      const { error } = await supabase.from('profiles').update({ full_name: data.name, phone: data.phone, cpf: data.cpf, address: data.address, status: data.status }).eq('id', clientId);
      if(error) throw error; else setClients(prev => prev.map(c => c.id === clientId ? { ...c, ...data } : c));
  };

  const updateAgencyProfileByAdmin = async (agencyId: string, data: Partial<Agency>) => {
      const supabase = guardSupabase();
      const updates: any = {};
      if (data.name) updates.name = data.name;
      if (data.slug) updates.slug = data.slug;
      if (data.description) updates.description = data.description;
      if (data.cnpj) updates.cnpj = data.cnpj;
      if (data.phone) updates.phone = data.phone;
      if (data.whatsapp) updates.whatsapp = data.whatsapp;
      if (data.website) updates.website = data.website;
      if (data.address) updates.address = data.address;
      if (data.bankInfo) updates.bank_info = data.bankInfo;
      
      const { error } = await supabase.from('agencies').update(updates).eq('id', agencyId);
      if(error) { showToast('Erro ao atualizar agência.', 'error'); throw error; } else { setAgencies(prev => prev.map(a => a.agencyId === agencyId ? { ...a, ...data } : a)); showToast('Agência atualizada.', 'success'); }
  };

  const toggleAgencyStatus = async (agencyId: string) => {
      const agency = agencies.find(a => a.agencyId === agencyId);
      if (!agency) return;
      const newStatus = agency.subscriptionStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await updateAgencySubscription(agencyId, newStatus, agency.subscriptionPlan, agency.subscriptionExpiresAt);
  };

  const createTrip = async (trip: Trip) => {
      const supabase = guardSupabase();
      const { data, error } = await supabase.from('trips').insert({
          agency_id: trip.agencyId, title: trip.title, slug: slugify(trip.title), description: trip.description, destination: trip.destination,
          price: trip.price, start_date: trip.startDate, end_date: trip.endDate, duration_days: trip.durationDays, category: trip.category,
          tags: trip.tags, traveler_types: trip.travelerTypes, itinerary: trip.itinerary, payment_methods: trip.paymentMethods,
          included: trip.included, not_included: trip.notIncluded, featured: trip.featured, is_active: trip.is_active, boarding_points: trip.boardingPoints
      }).select().single();
      if(error) throw error; 
      if(data) {
          // Upload Images logic would go here if needed, but usually images are uploaded separately
          await refreshData();
      }
  };

  const updateTrip = async (trip: Trip) => {
      const supabase = guardSupabase();
      const { error } = await supabase.from('trips').update({
          title: trip.title, description: trip.description, destination: trip.destination, price: trip.price, start_date: trip.startDate, end_date: trip.endDate,
          duration_days: trip.durationDays, category: trip.category, tags: trip.tags, traveler_types: trip.travelerTypes, itinerary: trip.itinerary,
          payment_methods: trip.paymentMethods, included: trip.included, not_included: trip.notIncluded, featured: trip.featured, is_active: trip.is_active, boarding_points: trip.boardingPoints
      }).eq('id', trip.id);
      if(error) throw error; else setTrips(prev => prev.map(t => t.id === trip.id ? trip : t));
  };

  const deleteTrip = async (tripId: string) => {
      const supabase = guardSupabase();
      const { error } = await supabase.from('trips').delete().eq('id', tripId);
      if(error) throw error; else setTrips(prev => prev.filter(t => t.id !== tripId));
  };

  const toggleTripStatus = async (tripId: string) => {
      const trip = trips.find(t => t.id === tripId);
      if(!trip) return;
      const supabase = guardSupabase();
      const { error } = await supabase.from('trips').update({ is_active: !trip.is_active }).eq('id', tripId);
      if(!error) setTrips(prev => prev.map(t => t.id === tripId ? { ...t, is_active: !t.is_active } : t));
  };

  const toggleTripFeatureStatus = async (tripId: string) => {
      const trip = trips.find(t => t.id === tripId);
      if(!trip) return;
      const supabase = guardSupabase();
      const { error } = await supabase.from('trips').update({ featured: !trip.featured }).eq('id', tripId);
      if(!error) setTrips(prev => prev.map(t => t.id === tripId ? { ...t, featured: !t.featured } : t));
  };

  const softDeleteEntity = async (id: string, table: 'profiles' | 'agencies') => {
      const supabase = guardSupabase();
      const { error } = await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if(error) throw error; await refreshData();
  };

  const restoreEntity = async (id: string, table: 'profiles' | 'agencies') => {
      const supabase = guardSupabase();
      const { error } = await supabase.from(table).update({ deleted_at: null }).eq('id', id);
      if(error) throw error; await refreshData();
  };

  const deleteUser = async (userId: string, role: UserRole) => {
      const supabase = guardSupabase();
      if(role === UserRole.AGENCY) {
          // First delete from agencies table, then profiles will be cascade or manual
          const agency = agencies.find(a => a.id === userId); // User ID
          if(agency) await supabase.from('agencies').delete().eq('id', agency.agencyId);
      }
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if(error) throw error; await refreshData();
  };

  const deleteMultipleUsers = async (userIds: string[]) => {
      const supabase = guardSupabase();
      const { error } = await supabase.from('profiles').delete().in('id', userIds);
      if(error) throw error; await refreshData();
  };

  const deleteMultipleAgencies = async (agencyIds: string[]) => {
      const supabase = guardSupabase();
      const { error } = await supabase.from('agencies').delete().in('id', agencyIds);
      if(error) throw error; await refreshData();
  };

  const updateMultipleUsersStatus = async (userIds: string[], status: 'ACTIVE' | 'SUSPENDED') => {
      const supabase = guardSupabase();
      const { error } = await supabase.from('profiles').update({ status }).in('id', userIds);
      if(error) throw error; await refreshData();
  };

  const updateMultipleAgenciesStatus = async (agencyIds: string[], status: 'ACTIVE' | 'INACTIVE') => {
      const supabase = guardSupabase();
      const { error } = await supabase.from('agencies').update({ is_active: status === 'ACTIVE', subscription_status: status }).in('id', agencyIds);
      if(error) throw error; await refreshData();
  };

  const getUsersStats = async (userIds: string[]) => {
      // Mock stats implementation - in real app would aggregate from bookings/reviews
      return userIds.map(id => {
          const clientBookings = bookings.filter(b => b.clientId === id);
          return {
              userId: id,
              userName: clients.find(c => c.id === id)?.name || 'Unknown',
              totalSpent: clientBookings.reduce((sum, b) => sum + b.totalPrice, 0),
              totalBookings: clientBookings.length,
              totalReviews: agencyReviews.filter(r => r.clientId === id).length
          };
      });
  };

  const logAuditAction = async (action: string, details: string) => {
      // Logic handled in logActivity, this is a wrapper or specific to audit_logs table
      const supabase = guardSupabase();
      await supabase.from('audit_logs').insert({ admin_email: user?.email, action, details });
  };

  const sendPasswordReset = async (email: string) => {
      const supabase = guardSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if(error) throw error; else showToast('Email de recuperação enviado.', 'success');
  };

  const updateUserAvatarByAdmin = async (userId: string, file: File) => {
      const supabase = guardSupabase();
      const fileName = `${userId}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) return null;
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const url = data.publicUrl;
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId);
      await refreshData();
      return url;
  };

  const getPublicTrips = () => trips.filter(t => t.is_active);
  const getAgencyPublicTrips = (agencyId: string) => trips.filter(t => t.agencyId === agencyId && t.is_active);
  const getAgencyTrips = (agencyId: string) => trips.filter(t => t.agencyId === agencyId);
  const getTripById = (id: string | undefined) => trips.find(t => t.id === id || t.slug === id);
  const getTripBySlug = (slug: string) => trips.find(t => t.slug === slug || t.id === slug);
  const getAgencyBySlug = (slug: string) => agencies.find(a => a.slug === slug);
  const getReviewsByTripId = (tripId: string) => reviews.filter(r => r.tripId === tripId);
  const getReviewsByAgencyId = (agencyId: string) => agencyReviews.filter(r => r.agencyId === agencyId);
  const getReviewsByClientId = (clientId: string) => agencyReviews.filter(r => r.clientId === clientId);
  const hasUserPurchasedTrip = (userId: string, tripId: string) => bookings.some(b => b.clientId === userId && b.tripId === tripId && b.status === 'CONFIRMED');
  
  const getAgencyStats = (agencyId: string) => {
      const agencyTrips = trips.filter(t => t.agencyId === agencyId);
      const agencyBookings = bookings.filter(b => b._trip?.agencyId === agencyId && b.status === 'CONFIRMED');
      const agencyReviewsList = agencyReviews.filter(r => r.agencyId === agencyId);
      return {
          totalRevenue: agencyBookings.reduce((sum, b) => sum + b.totalPrice, 0),
          totalViews: agencyTrips.reduce((sum, t) => sum + (t.views || 0), 0),
          totalSales: agencyBookings.length,
          conversionRate: 0, // Simplified
          averageRating: agencyReviewsList.length > 0 ? agencyReviewsList.reduce((sum, r) => sum + r.rating, 0) / agencyReviewsList.length : 0,
          totalReviews: agencyReviewsList.length
      };
  };

  const getAgencyTheme = async (agencyId: string) => {
      if(!supabase) return null;
      const { data } = await supabase.from('agency_themes').select('*').eq('agency_id', agencyId).single();
      return data ? { agencyId: data.agency_id, colors: data.colors, updatedAt: data.updated_at } : null;
  };

  const saveAgencyTheme = async (agencyId: string, colors: ThemeColors) => {
      const supabase = guardSupabase();
      const { error } = await supabase.from('agency_themes').upsert({ agency_id: agencyId, colors }, { onConflict: 'agency_id' });
      return !error;
  };

  const incrementTripViews = async (tripId: string) => {
      const supabase = guardSupabase();
      await supabase.rpc('increment_trip_views', { trip_id: tripId });
  };

  return (
    <DataContext.Provider value={{
      trips, agencies, bookings, reviews, agencyReviews, clients, auditLogs, activityLogs, loading,
      addBooking,
      addReview: async (r) => console.warn("deprecated"),
      addAgencyReview,
      deleteReview: async () => {},
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
      getPublicTrips, getAgencyPublicTrips, getAgencyTrips, getTripById, getTripBySlug, getAgencyBySlug,
      getReviewsByTripId, getReviewsByAgencyId, getReviewsByClientId, hasUserPurchasedTrip, getAgencyStats,
      getAgencyTheme, saveAgencyTheme,
      refreshData, incrementTripViews,
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
