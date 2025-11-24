import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Trip, Agency, Booking, Review, Client, UserRole, AuditLog } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { useToast } from './ToastContext';

// ... (abbreviated DataContextType and other interfaces) ...

interface DataContextType {
  trips: Trip[];
  agencies: Agency[];
  bookings: Booking[];
  reviews: Review[];
  clients: Client[];
  auditLogs: AuditLog[];
  loading: boolean;
  getTripById: (id: string | undefined) => Trip | undefined;
  getTripBySlug: (slug: string | undefined) => Trip | undefined;
  getAgencyBySlug: (slug: string | undefined) => Agency | undefined;
  addBooking: (booking: any) => Promise<void>;
  addReview: (review: any) => Promise<void>;
  toggleFavorite: (tripId: string, clientId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  getPublicTrips: () => Trip[];
  getAgencyPublicTrips: (agencyId: string) => Trip[];
  getReviewsByTripId: (tripId: string) => Review[];
  hasUserPurchasedTrip: (userId: string, tripId: string) => boolean;
  incrementTripViews: (tripId: string) => Promise<void>;
  getAgencyTrips: (agencyId: string) => Trip[];
  createTrip: (tripData: Partial<Trip>) => Promise<{ success: boolean; error?: string; trip?: Trip }>;
  updateTrip: (tripId: string, tripData: Partial<Trip>) => Promise<{ success: boolean; error?: string; trip?: Trip }>;
  deleteTrip: (tripId: string) => Promise<{ success: boolean; error?: string }>;
  toggleTripStatus: (tripId: string) => Promise<void>;
  getAgencyStats: (agencyId: string) => { totalSales: number; totalRevenue: number; totalBookings: number; avgRating: number };
  updateAgencySubscription: (agencyId: string, status: 'ACTIVE' | 'INACTIVE', plan: 'BASIC' | 'PREMIUM') => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
  deleteUser: (userId: string, role: UserRole) => Promise<void>;
  logAuditAction: (action: string, details: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [trips, setTrips] = useState<Trip[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // --- DATA FETCHING ---
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [tripsRes, agenciesRes, clientsRes, reviewsRes, bookingsRes, favoritesRes, auditLogsRes] = await Promise.all([
        supabase.from('trips').select('*, trip_images(image_url)'),
        supabase.from('agencies').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('reviews').select('*, profiles(full_name, avatar_url)'),
        user ? supabase.from('bookings').select('*, trips(*), profiles!bookings_client_id_fkey(full_name, avatar_url, phone)') : Promise.resolve({ data: [], error: null }),
        user?.role === 'CLIENT' ? supabase.from('favorites').select('trip_id').eq('user_id', user.id) : Promise.resolve({ data: [], error: null }),
        user?.role === 'ADMIN' ? supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null })
      ]);

      // Process Trips
      if (tripsRes.error) throw tripsRes.error;
      const formattedTrips: Trip[] = (tripsRes.data || []).map((t: any) => ({
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
        images: t.trip_images ? t.trip_images.map((img: any) => img.image_url) : [],
        category: t.category || 'PRAIA',
        tags: t.tags || [],
        travelerTypes: t.traveler_types || [],
        paymentMethods: t.payment_methods || [],
        active: t.active,
        rating: t.avg_rating || 0,
        totalReviews: t.reviews_count || 0,
        included: t.included || [],
        notIncluded: t.not_included || [],
        views: t.views_count || 0,
        sales: t.sales_count || 0,
        featuredInHero: t.featured_in_hero || false,
      }));
      setTrips(formattedTrips);

      // Process Agencies
      if (agenciesRes.error) throw agenciesRes.error;
      const formattedAgencies: Agency[] = (agenciesRes.data || []).map((a: any) => ({
        id: a.id, name: a.name, email: a.email || '', role: UserRole.AGENCY, slug: a.slug || '',
        description: a.description, logo: a.logo_url, whatsapp: a.whatsapp, cnpj: a.cnpj,
        heroMode: a.hero_mode || 'TRIPS', heroBannerUrl: a.hero_banner_url, heroTitle: a.hero_title, heroSubtitle: a.hero_subtitle,
        customSettings: a.custom_settings || {},
        subscriptionStatus: a.subscription_status, subscriptionPlan: a.subscription_plan,
        subscriptionExpiresAt: a.subscription_expires_at, website: a.website, phone: a.phone,
        address: a.address, bankInfo: a.bank_info,
      } as Agency));
      setAgencies(formattedAgencies);

      // Process Clients
      if (clientsRes.error) throw clientsRes.error;
      const favoriteIds = favoritesRes.data ? favoritesRes.data.map(f => f.trip_id) : [];
      const formattedClients: Client[] = (clientsRes.data || []).map((p: any) => ({
        id: p.id, name: p.full_name || 'Usuário', email: p.email || '', role: p.role || UserRole.CLIENT,
        avatar: p.avatar_url, cpf: p.cpf, phone: p.phone,
        favorites: p.id === user?.id ? favoriteIds : [],
      } as Client));
      setClients(formattedClients);

      // Process Reviews
      if (reviewsRes.error) throw reviewsRes.error;
      setReviews((reviewsRes.data || []).map((r: any) => ({
        id: r.id, tripId: r.trip_id, agencyId: r.agency_id, clientId: r.user_id, rating: r.rating, comment: r.comment,
        date: r.created_at, clientName: r.profiles?.full_name || 'Viajante',
      })));

      // Process Bookings
      if (bookingsRes.error) throw bookingsRes.error;
      setBookings((bookingsRes.data || []).map((b: any) => ({
        id: b.id, tripId: b.trip_id, clientId: b.client_id, date: b.created_at, status: b.status,
        totalPrice: b.total_price, passengers: b.passengers, voucherCode: b.voucher_code, paymentMethod: b.payment_method
      })));

      // Process Audit Logs
      if (user?.role === 'ADMIN') {
        if (auditLogsRes.error) throw auditLogsRes.error;
        setAuditLogs((auditLogsRes.data || []).map((l: any) => ({
            id: l.id,
            adminEmail: l.admin_email,
            action: l.action,
            details: l.details,
            createdAt: l.created_at
        })));
      }

    } catch (err) {
      console.error("Error fetching data:", err);
      showToast('Erro ao carregar dados. Verifique sua conexão.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [user]);
  
  const getPublicTrips = () => trips.filter(t => t.active);
  const getAgencyPublicTrips = (agencyId: string) => trips.filter(t => t.agencyId === agencyId && t.active);
  const getAgencyTrips = (agencyId: string) => trips.filter(t => t.agencyId === agencyId);
  const getTripBySlug = (slug: string | undefined) => slug ? trips.find(t => t.slug === slug) : undefined;
  const getReviewsByTripId = (tripId: string) => reviews.filter(r => r.tripId === tripId);
  const hasUserPurchasedTrip = (userId: string, tripId: string) => {
    return bookings.some(b => b.clientId === userId && b.tripId === tripId && b.status === 'CONFIRMED');
  };
  const incrementTripViews = async (tripId: string) => {
    try {
        const { error } = await supabase.rpc('increment_trip_views', { p_trip_id: tripId });
        if (error) console.error('Silent error incrementing trip views:', error);
    } catch (error) {
        console.error('Silent error incrementing trip views:', error);
    }
  };

  const addBooking = async (booking: any) => {
    const { error } = await supabase.from('bookings').insert({
        trip_id: booking.tripId,
        client_id: booking.clientId,
        status: booking.status,
        total_price: booking.totalPrice,
        passengers: booking.passengers,
        payment_method: booking.paymentMethod,
        voucher_code: booking.voucherCode
    });
    if (error) {
        showToast('Erro ao criar reserva.', 'error');
        console.error(error);
    } else {
        await fetchAllData();
    }
  };

  const addReview = async (review: any) => {
    const { error } = await supabase.from('reviews').insert({
      trip_id: review.tripId,
      agency_id: review.agencyId,
      user_id: review.clientId, 
      rating: review.rating,
      comment: review.comment,
    });
    if (error) {
        showToast('Erro ao enviar avaliação.', 'error');
        console.error(error);
    } else {
        await fetchAllData();
    }
  };

  const toggleFavorite = async (tripId: string, clientId: string) => {
    const isFavorite = clients.find(c => c.id === clientId)?.favorites.includes(tripId);
    
    try {
        if (isFavorite) {
            const { error } = await supabase.from('favorites').delete().match({ user_id: clientId, trip_id: tripId });
            if (error) throw error;
            showToast('Removido dos favoritos!', 'info');
        } else {
            const { error } = await supabase.from('favorites').insert({ user_id: clientId, trip_id: tripId });
            if (error) throw error;
            showToast('Adicionado aos favoritos!', 'success');
        }
        await fetchAllData();
    } catch (error) {
        showToast('Ocorreu um erro.', 'error');
        console.error(error);
    }
  };

  const createTrip = async (tripData: Partial<Trip>) => {
    showToast('Função não implementada.', 'info');
    return { success: false, error: 'Not implemented' };
  };
  const updateTrip = async (tripId: string, tripData: Partial<Trip>) => {
    showToast('Função não implementada.', 'info');
    return { success: false, error: 'Not implemented' };
  };
  const deleteTrip = async (tripId: string) => {
    showToast('Função não implementada.', 'info');
    return { success: false, error: 'Not implemented' };
  };

  const toggleTripStatus = async (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    const { error } = await supabase.from('trips').update({ active: !trip.active }).eq('id', tripId);
    if (error) {
        showToast('Erro ao alterar status.', 'error');
    } else {
        await fetchAllData();
    }
  };
  const getAgencyStats = (agencyId: string) => {
    const agencyTrips = trips.filter(t => t.agencyId === agencyId);
    const tripIds = agencyTrips.map(t => t.id);
    const agencyBookings = bookings.filter(b => tripIds.includes(b.tripId));
    
    const totalRevenue = agencyBookings.reduce((acc, b) => acc + b.totalPrice, 0);
    const totalSales = agencyTrips.reduce((acc, t) => acc + (t.sales || 0), 0);
    const totalBookings = agencyBookings.length;
    
    const relevantReviews = reviews.filter(r => tripIds.includes(r.tripId));
    const avgRating = relevantReviews.length > 0
        ? relevantReviews.reduce((acc, r) => acc + r.rating, 0) / relevantReviews.length
        : 0;

    return { totalSales, totalRevenue, totalBookings, avgRating };
  };

  const updateAgencySubscription = async (agencyId: string, status: 'ACTIVE' | 'INACTIVE', plan: 'BASIC' | 'PREMIUM') => {
    const { error } = await supabase.from('agencies').update({ subscription_status: status, subscription_plan: plan }).eq('id', agencyId);
    if (error) showToast('Erro ao atualizar agência', 'error');
    else await fetchAllData();
  };

  const deleteReview = async (reviewId: string) => {
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
    if (error) showToast('Erro ao deletar avaliação', 'error');
    else await fetchAllData();
  };

  const deleteUser = async (userId: string, role: UserRole) => {
    const table = role === UserRole.AGENCY ? 'agencies' : 'profiles';
    const { error } = await supabase.from(table).delete().eq('id', userId);
    if (error) {
      showToast(`Erro ao deletar ${role}`, 'error');
      throw error;
    }
    // Deleting auth user requires service key and is better done in a backend function.
    await fetchAllData();
  };
  
  const logAuditAction = async (action: string, details: string) => {
    if (user?.role !== 'ADMIN') return;
    const { error } = await supabase.from('audit_logs').insert({
        admin_email: user.email,
        action: action,
        details: details
    });
    if (error) console.error("Failed to log audit action:", error);
    else {
      // Refresh to get latest logs
      await fetchAllData();
    }
  };
  

  return (
    <DataContext.Provider value={{ 
      trips, agencies, bookings, reviews, clients, loading, auditLogs,
      // ... provide all necessary functions
      getTripById: (id) => id ? trips.find(t => t.id === id) : undefined,
      // FIX: Add missing 'getTripBySlug' property to match the DataContextType interface.
      getTripBySlug,
      getAgencyBySlug: (slug) => slug ? agencies.find(a => a.slug === slug) : undefined,
      addReview,
      addBooking,
      toggleFavorite,
      refreshData: fetchAllData,
      getPublicTrips,
      getAgencyPublicTrips,
      getReviewsByTripId,
      hasUserPurchasedTrip,
      incrementTripViews,
      getAgencyTrips,
      createTrip,
      updateTrip,
      deleteTrip,
      toggleTripStatus,
      getAgencyStats,
      updateAgencySubscription,
      deleteReview,
      deleteUser,
      logAuditAction
    }}>
      {!loading && children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
