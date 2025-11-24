import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Trip, Agency, Booking, Review, Client, UserRole, AuditLog } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { useToast } from './ToastContext';

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
  addBooking: (booking: Omit<Booking, 'id' | 'date' | 'voucherCode'>) => Promise<boolean>;
  addReview: (review: Omit<Review, 'id' | 'date' | 'clientName'>) => Promise<void>;
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
  toggleTripStatus: (tripId: string, currentStatus: boolean) => Promise<void>;
  getAgencyStats: (agencyId: string) => { totalPackages: number; totalSales: number; totalRevenue: number; totalViews: number; };
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

  const fetchAllData = useCallback(async () => {
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

      if (tripsRes.error) throw new Error(`Trips: ${tripsRes.error.message}`);
      const formattedTrips: Trip[] = (tripsRes.data || []).map((t: any) => ({
        id: t.id, agencyId: t.agency_id, title: t.title, slug: t.slug, description: t.description,
        destination: t.destination, price: Number(t.price), startDate: t.start_date, endDate: t.end_date,
        durationDays: t.duration_days, images: t.trip_images ? t.trip_images.map((img: any) => img.image_url) : [],
        category: t.category || 'PRAIA', tags: t.tags || [], travelerTypes: t.traveler_types || [],
        paymentMethods: t.payment_methods || [], active: t.active, rating: t.avg_rating || 0,
        totalReviews: t.reviews_count || 0, included: t.included || [], notIncluded: t.not_included || [],
        views: t.views_count || 0, sales: t.sales_count || 0, featuredInHero: t.featured_in_hero || false,
      }));
      setTrips(formattedTrips);

      if (agenciesRes.error) throw new Error(`Agencies: ${agenciesRes.error.message}`);
      const formattedAgencies: Agency[] = (agenciesRes.data || []).map((a: any) => ({
        id: a.id, name: a.name, email: a.email || '', role: UserRole.AGENCY, slug: a.slug || '',
        description: a.description, logo: a.logo_url, whatsapp: a.whatsapp, cnpj: a.cnpj,
        heroMode: a.hero_mode || 'TRIPS', heroBannerUrl: a.hero_banner_url, heroTitle: a.hero_title, heroSubtitle: a.hero_subtitle,
        customSettings: a.custom_settings || {}, subscriptionStatus: a.subscription_status, subscriptionPlan: a.subscription_plan,
        subscriptionExpiresAt: a.subscription_expires_at, website: a.website, phone: a.phone,
        address: a.address, bankInfo: a.bank_info,
      } as Agency));
      setAgencies(formattedAgencies);

      if (clientsRes.error) throw new Error(`Clients: ${clientsRes.error.message}`);
      const favoriteIds = favoritesRes.data ? favoritesRes.data.map(f => f.trip_id) : [];
      const formattedClients: Client[] = (clientsRes.data || []).map((p: any) => ({
        id: p.id, name: p.full_name || 'Usuário', email: p.email || '', role: p.role || UserRole.CLIENT,
        avatar: p.avatar_url, cpf: p.cpf, phone: p.phone,
        favorites: p.id === user?.id ? favoriteIds : [],
      } as Client));
      setClients(formattedClients);

      if (reviewsRes.error) throw new Error(`Reviews: ${reviewsRes.error.message}`);
      setReviews((reviewsRes.data || []).map((r: any) => ({
        id: r.id, tripId: r.trip_id, agencyId: r.agency_id, clientId: r.user_id, rating: r.rating, comment: r.comment,
        date: r.created_at, clientName: r.profiles?.full_name || 'Viajante',
      })));
      
      if (bookingsRes.error) throw new Error(`Bookings: ${bookingsRes.error.message}`);
      setBookings((bookingsRes.data || []).map((b: any) => ({
        id: b.id, tripId: b.trip_id, clientId: b.client_id, date: b.created_at, status: b.status,
        totalPrice: b.total_price, passengers: b.passengers, voucherCode: b.voucher_code, paymentMethod: b.payment_method
      })));

      if (auditLogsRes.error) throw new Error(`Audit: ${auditLogsRes.error.message}`);
      if (user?.role === 'ADMIN') setAuditLogs(auditLogsRes.data || []);
      
    } catch (err: any) {
      console.error("Error fetching data:", err);
      showToast(`Erro ao carregar dados: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const getTripById = (id: string | undefined) => id ? trips.find(t => t.id === id) : undefined;
  const getPublicTrips = () => trips.filter(t => t.active);
  const getAgencyPublicTrips = (agencyId: string) => trips.filter(t => t.agencyId === agencyId && t.active);
  const getAgencyTrips = (agencyId: string) => trips.filter(t => t.agencyId === agencyId);
  const getTripBySlug = (slug: string | undefined) => slug ? trips.find(t => t.slug === slug) : undefined;
  const getAgencyBySlug = (slug: string | undefined) => slug ? agencies.find(a => a.slug === slug) : undefined;
  const getReviewsByTripId = (tripId: string) => reviews.filter(r => r.tripId === tripId);
  const hasUserPurchasedTrip = (userId: string, tripId: string) => bookings.some(b => b.clientId === userId && b.tripId === tripId && b.status === 'CONFIRMED');

  const incrementTripViews = async (tripId: string) => {
    try {
      const { error } = await supabase.rpc('increment_trip_views', { row_id: tripId });
      if (error) console.error('Silent error incrementing trip views:', error);
    } catch (error) {
        console.error('Silent error incrementing trip views:', error);
    }
  };

  const addBooking = async (booking: Omit<Booking, 'id' | 'date' | 'voucherCode'>): Promise<boolean> => {
    const voucherCode = `VS-${Date.now().toString(36).toUpperCase()}`;
    const newBookingData = {
      trip_id: booking.tripId,
      client_id: booking.clientId,
      status: booking.status,
      total_price: booking.totalPrice,
      passengers: booking.passengers,
      payment_method: booking.paymentMethod,
      voucher_code: voucherCode
    };

    const { data, error } = await supabase.from('bookings').insert(newBookingData).select().single();
    
    if (error) {
      console.error("Error adding booking:", error);
      showToast('Erro ao salvar reserva. Tente novamente.', 'error');
      return false;
    }

    // Optimistic Update
    if (data) {
        const fullNewBooking: Booking = {
            id: data.id,
            tripId: data.trip_id,
            clientId: data.client_id,
            date: data.created_at,
            status: data.status,
            totalPrice: data.total_price,
            passengers: data.passengers,
            voucherCode: data.voucher_code,
            paymentMethod: data.payment_method,
        };
        setBookings(prev => [...prev, fullNewBooking]);
        setTrips(prev => prev.map(t => t.id === booking.tripId ? { ...t, sales: (t.sales || 0) + 1 } : t));
    }
    return true;
  };
  
  const addReview = async (review: Omit<Review, 'id' | 'date' | 'clientName'>) => {
    // ... implementation
  };
  const toggleFavorite = async (tripId: string, clientId: string) => {
    // ... implementation
  };
  const createTrip = async (tripData: Partial<Trip>) => {
    // ... implementation
    return { success: false, error: 'Not implemented' };
  };
  const updateTrip = async (tripId: string, tripData: Partial<Trip>) => {
    // ... implementation
    return { success: false, error: 'Not implemented' };
  };
  const deleteTrip = async (tripId: string) => {
    // ... implementation
    return { success: false, error: 'Not implemented' };
  };
  const toggleTripStatus = async (tripId: string, currentStatus: boolean) => {
    // ... implementation
  };

  const getAgencyStats = (agencyId: string) => {
    const agencyTrips = trips.filter(t => t.agencyId === agencyId);
    const tripIds = agencyTrips.map(t => t.id);
    const agencyBookings = bookings.filter(b => tripIds.includes(b.tripId));
    
    const totalRevenue = agencyBookings.reduce((acc, b) => acc + b.totalPrice, 0);
    const totalSales = agencyBookings.length;
    const totalViews = agencyTrips.reduce((acc, t) => acc + (t.views || 0), 0);
    const totalPackages = agencyTrips.filter(t => t.active).length;

    return { totalPackages, totalSales, totalRevenue, totalViews };
  };
  
  // Admin Functions
  const updateAgencySubscription = async (agencyId: string, status: 'ACTIVE' | 'INACTIVE', plan: 'BASIC' | 'PREMIUM') => {};
  const deleteReview = async (reviewId: string) => {};
  const deleteUser = async (userId: string, role: UserRole) => {};
  const logAuditAction = async (action: string, details: string) => {};

  return (
    <DataContext.Provider value={{ 
      trips, agencies, bookings, reviews, clients, loading, auditLogs,
      getTripById, getTripBySlug, getAgencyBySlug, addReview, addBooking, toggleFavorite,
      refreshData: fetchAllData, getPublicTrips, getAgencyPublicTrips,
      getReviewsByTripId, hasUserPurchasedTrip, incrementTripViews, getAgencyTrips,
      createTrip, updateTrip, deleteTrip, toggleTripStatus, getAgencyStats,
      updateAgencySubscription, deleteReview, deleteUser, logAuditAction
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