
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Trip, Agency, Booking, Review, Client, UserRole, AuditLog } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { MOCK_AGENCIES, MOCK_TRIPS, MOCK_BOOKINGS, MOCK_REVIEWS, MOCK_CLIENTS } from '../services/mockData';

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
  reviews: Review[];
  clients: Client[];
  auditLogs: AuditLog[];
  loading: boolean;
  
  addBooking: (booking: Booking) => Promise<void>;
  addReview: (review: Review) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
  toggleFavorite: (tripId: string, clientId: string) => Promise<void>;
  updateClientProfile: (clientId: string, data: Partial<Client>) => Promise<void>;
  
  updateAgencySubscription: (agencyId: string, status: 'ACTIVE' | 'INACTIVE', plan: 'BASIC' | 'PREMIUM') => Promise<void>;
  createTrip: (trip: Trip) => Promise<void>;
  updateTrip: (trip: Trip) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  toggleTripStatus: (tripId: string) => Promise<void>; 
  
  // Master Admin Functions
  deleteUser: (userId: string, role: UserRole) => Promise<void>;
  logAuditAction: (action: string, details: string) => Promise<void>;

  getPublicTrips: () => Trip[]; 
  getAgencyPublicTrips: (agencyId: string) => Trip[];
  getAgencyTrips: (agencyId: string) => Trip[]; 
  getTripById: (id: string) => Trip | undefined;
  getAgencyBySlug: (slug: string) => Agency | undefined; // NOVA FUNÇÃO
  getReviewsByTripId: (tripId: string) => Review[];
  hasUserPurchasedTrip: (userId: string, tripId: string) => boolean;
  getAgencyStats: (agencyId: string) => DashboardStats;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  const [trips, setTrips] = useState<Trip[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // --- DATA FETCHING ---

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          trip_images (image_url, created_at),
          agencies (name, logo_url)
        `);

      if (error) throw error;

      if (data) {
          const formattedTrips: Trip[] = data.map((t: any) => ({
            id: t.id,
            agencyId: t.agency_id,
            title: t.title,
            description: t.description,
            destination: t.destination,
            price: Number(t.price),
            startDate: t.start_date,
            endDate: t.end_date,
            durationDays: t.duration_days,
            images: t.trip_images 
                ? t.trip_images
                    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                    .map((img: any) => img.image_url) 
                : [],
            category: t.category || 'PRAIA',
            tags: t.tags || [],
            travelerTypes: t.traveler_types || [],
            itinerary: t.itinerary || [],
            paymentMethods: t.payment_methods || [],
            active: t.active,
            rating: 5.0, 
            totalReviews: 0, 
            included: t.included || [],
            notIncluded: t.not_included || [],
            views: t.views_count || 0,
            sales: t.sales_count || 0,
            featured: t.featured || false,
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
    try {
      const { data, error } = await supabase.from('agencies').select('*');
      
      if (error) throw error;
      
      const formattedAgencies: Agency[] = (data || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        email: a.email || '',
        role: UserRole.AGENCY,
        slug: a.slug || '', 
        cnpj: a.cnpj,
        description: a.description,
        logo: a.logo_url,
        subscriptionStatus: a.subscription_status,
        subscriptionPlan: a.subscription_plan,
        subscriptionExpiresAt: a.subscription_expires_at,
        website: a.website,
        phone: a.phone,
        address: a.address || {},
        bankInfo: a.bank_info || {}
      }));

      setAgencies(formattedAgencies);
    } catch (err) {
      console.warn("Supabase unavailable, using MOCK_AGENCIES.", err);
      setAgencies(MOCK_AGENCIES);
    }
  };

  const fetchClients = async () => {
    try {
        // Fetches all profiles (Clients and Admins)
        const { data, error } = await supabase.from('profiles').select('*');
        
        if (error) throw error;

        const formattedClients: Client[] = (data || []).map((p: any) => ({
          id: p.id,
          name: p.full_name || 'Usuário',
          email: p.email || '',
          role: p.role === 'ADMIN' ? UserRole.ADMIN : UserRole.CLIENT,
          avatar: p.avatar_url,
          cpf: p.cpf,
          phone: p.phone,
          favorites: [], // Favorites are fetched separately per user context usually
          createdAt: p.created_at,
          address: p.address || {}
        } as Client));

        setClients(formattedClients);
    } catch (err) {
        console.warn("Supabase unavailable, using MOCK_CLIENTS.", err);
        setClients(MOCK_CLIENTS);
    }
  };

  const fetchReviews = async () => {
     try {
         const { data, error } = await supabase.from('reviews').select('*, profiles(full_name)');
         if (error) throw error;

         if(data) {
            setReviews(data.map((r: any) => ({
                id: r.id,
                tripId: r.trip_id,
                clientId: r.user_id,
                rating: r.rating,
                comment: r.comment,
                date: r.created_at,
                clientName: r.profiles?.full_name || 'Viajante',
                response: r.response
            })));
         }
     } catch (err) {
         console.warn("Supabase unavailable, using MOCK_REVIEWS.", err);
         setReviews(MOCK_REVIEWS);
     }
  };

  const fetchFavorites = async () => {
      if(user?.role === UserRole.CLIENT) {
          try {
            const { data, error } = await supabase.from('favorites').select('trip_id').eq('user_id', user.id);
            if (error) throw error;

            if(data) {
               const favIds = data.map(f => f.trip_id);
               setClients(prev => {
                   const existing = prev.find(c => c.id === user.id);
                   if(existing) return prev.map(c => c.id === user.id ? { ...c, favorites: favIds} : c);
                   return [...prev, { id: user.id, favorites: favIds } as Client];
               });
            }
          } catch (err) {
             // Silent fail for favorites
          }
      }
  };

  const fetchBookings = async () => {
    if (!user) return;

    try {
        let query = supabase.from('bookings').select('*');

        if (user.role === UserRole.CLIENT) {
          query = query.eq('client_id', user.id);
        } 
        else if (user.role === UserRole.AGENCY) {
          const { data: myTrips } = await supabase.from('trips').select('id').eq('agency_id', user.id);
          const myTripIds = myTrips?.map(t => t.id) || [];
          if(myTripIds.length > 0) {
              query = query.in('trip_id', myTripIds);
          } else {
              setBookings([]);
              return;
          }
        }
        // Admins fetch all by default
        
        const { data, error } = await query;

        if (error) throw error;

        if (data) {
          const formattedBookings: Booking[] = data.map((b: any) => ({
            id: b.id,
            tripId: b.trip_id,
            clientId: b.client_id,
            date: b.created_at,
            status: b.status,
            totalPrice: b.total_price,
            passengers: b.passengers,
            voucherCode: b.voucher_code,
            paymentMethod: b.payment_method
          }));
          setBookings(formattedBookings);
        }
    } catch (err) {
        console.warn("Supabase unavailable, using MOCK_BOOKINGS.", err);
        setBookings(MOCK_BOOKINGS);
    }
  };

  const fetchAuditLogs = async () => {
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
          // Fallback mock if table doesn't exist yet or error
          const mockLogs: AuditLog[] = [
             { id: '1', adminEmail: 'juannicolas1@gmail.com', action: 'SYSTEM_INIT', details: 'Sistema inicializado (Modo Offline/Mock)', createdAt: new Date().toISOString() }
          ];
          setAuditLogs(mockLogs);
      }
  };

  const refreshData = async () => {
      setLoading(true);
      const promises = [
        fetchTrips(), 
        fetchAgencies(), 
        fetchReviews(), 
        fetchBookings()
      ];
      
      if (user) {
         promises.push(fetchFavorites());
      }
      
      // Fetch extended data for Admin
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

  const isAgencyActive = (agencyId: string) => {
    const agency = agencies.find(a => a.id === agencyId);
    if (!agency) return false;
    return agency.subscriptionStatus === 'ACTIVE';
  };

  const addBooking = async (booking: Booking) => {
    const { error } = await supabase.from('bookings').insert({
      id: booking.id,
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
      // Em modo offline, poderíamos atualizar o state localmente aqui
    }
    await refreshData();
  };

  const addReview = async (review: Review) => {
    const { error } = await supabase.from('reviews').insert({
      id: review.id,
      trip_id: review.tripId,
      user_id: review.clientId, // changed from clientId to user_id to match table
      rating: review.rating,
      comment: review.comment,
      created_at: review.date,
      response: review.response
    });
    if (error) {
      console.error('Error adding review:', error);
    }
    await refreshData();
  };

  const deleteReview = async (reviewId: string) => {
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
    if (error) {
      console.error('Error deleting review:', error);
    }
    await refreshData();
  };

  const toggleFavorite = async (tripId: string, clientId: string) => {
    const currentClient = clients.find(c => c.id === clientId);
    const isCurrentlyFavorite = currentClient?.favorites.includes(tripId);

    if (isCurrentlyFavorite) {
      const { error } = await supabase.from('favorites').delete().eq('user_id', clientId).eq('trip_id', tripId);
      if (error) console.error('Error removing favorite:', error);
    } else {
      const { error } = await supabase.from('favorites').insert({ user_id: clientId, trip_id: tripId });
      if (error) console.error('Error adding favorite:', error);
    }
    await refreshData();
  };

  const updateClientProfile = async (clientId: string, data: Partial<Client>) => {
    const { error } = await supabase.from('profiles').update(data).eq('id', clientId);
    if (error) {
      console.error('Error updating client profile:', error);
    }
    await refreshData();
  };

  const updateAgencySubscription = async (agencyId: string, status: 'ACTIVE' | 'INACTIVE', plan: 'BASIC' | 'PREMIUM') => {
    const { error } = await supabase.from('agencies').update({
      subscription_status: status,
      subscription_plan: plan,
      subscription_expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
    }).eq('id', agencyId);
    if (error) {
      console.error('Error updating agency subscription:', error);
    }
    await refreshData();
  };

  const createTrip = async (trip: Trip) => {
    // CRITICAL FIX: Explicitly map camelCase properties to snake_case database columns
    const dbTrip = {
        agency_id: trip.agencyId,
        title: trip.title,
        description: trip.description,
        destination: trip.destination,
        price: trip.price,
        start_date: trip.startDate,
        end_date: trip.endDate,
        duration_days: trip.durationDays, // MAPPED HERE
        category: trip.category,
        tags: trip.tags,
        traveler_types: trip.travelerTypes, // MAPPED HERE
        itinerary: trip.itinerary,
        payment_methods: trip.paymentMethods, // MAPPED HERE
        active: trip.active ?? true,
        included: trip.included,
        not_included: trip.notIncluded,
        featured: trip.featured ?? false,
        popular_near_sp: trip.popularNearSP ?? false,
    };

    const { data: newTrip, error } = await supabase.from('trips').insert(dbTrip).select().single();

    if (error) {
      console.error('Error creating trip:', error);
      throw error;
    }

    if (newTrip && trip.images && trip.images.length > 0) {
      const imageInserts = trip.images.map(url => ({
        trip_id: newTrip.id,
        image_url: url
      }));
      const { error: imageError } = await supabase.from('trip_images').insert(imageInserts);
      if (imageError) {
        console.error('Error inserting trip images:', imageError);
      }
    }
    await refreshData();
  };

  const updateTrip = async (trip: Trip) => {
    const { id, images } = trip;
    
    // CRITICAL FIX: Explicitly map camelCase properties to snake_case database columns
    const dbTrip = {
        title: trip.title,
        description: trip.description,
        destination: trip.destination,
        price: trip.price,
        start_date: trip.startDate,
        end_date: trip.endDate,
        duration_days: trip.durationDays, // MAPPED HERE
        category: trip.category,
        tags: trip.tags,
        traveler_types: trip.travelerTypes, // MAPPED HERE
        itinerary: trip.itinerary,
        payment_methods: trip.paymentMethods, // MAPPED HERE
        active: trip.active,
        included: trip.included,
        not_included: trip.notIncluded,
        featured: trip.featured,
        popular_near_sp: trip.popularNearSP,
    };

    const { error } = await supabase.from('trips').update(dbTrip).eq('id', id);

    if (error) {
      console.error('Error updating trip:', error);
      throw error;
    }

    // Handle images: delete old ones and insert new ones
    await supabase.from('trip_images').delete().eq('trip_id', id);
    if (images && images.length > 0) {
      const imageInserts = images.map(url => ({
        trip_id: id,
        image_url: url
      }));
      const { error: imageError } = await supabase.from('trip_images').insert(imageInserts);
      if (imageError) console.error('Error updating trip images:', imageError);
    }
    await refreshData();
  };

  const deleteTrip = async (tripId: string) => {
    const { error: imagesError } = await supabase.from('trip_images').delete().eq('trip_id', tripId);
    if (imagesError) console.error('Error deleting trip images:', imagesError);

    const { error: tripError } = await supabase.from('trips').delete().eq('id', tripId);
    if (tripError) {
      console.error('Error deleting trip:', tripError);
      throw tripError;
    }
    await refreshData();
  };

  const toggleTripStatus = async (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    const { error } = await supabase.from('trips').update({ active: !trip.active }).eq('id', tripId);
    if (error) {
      console.error('Error toggling trip status:', error);
    }
    await refreshData();
  };

  const deleteUser = async (userId: string, role: UserRole) => {
    if (role === UserRole.AGENCY) {
      await supabase.from('agencies').delete().eq('id', userId);
      // Delete associated trips and their images
      const agencyTrips = trips.filter(t => t.agencyId === userId);
      for (const trip of agencyTrips) {
        await supabase.from('trip_images').delete().eq('trip_id', trip.id);
        await supabase.from('trips').delete().eq('id', trip.id);
      }
    } else { // CLIENT or ADMIN
      await supabase.from('profiles').delete().eq('id', userId);
      await supabase.from('favorites').delete().eq('user_id', userId);
      await supabase.from('bookings').delete().eq('client_id', userId);
      await supabase.from('reviews').delete().eq('user_id', userId);
    }
    
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
    if (authDeleteError) console.error('Error deleting auth user:', authDeleteError);
    
    await refreshData();
  };

  const logAuditAction = async (action: string, details: string) => {
    if (!user || user.role !== UserRole.ADMIN) {
        console.warn('Non-admin user attempted to log audit action.');
        return;
    }
    const { error } = await supabase.from('audit_logs').insert({
      admin_email: user.email,
      action: action,
      details: details,
      created_at: new Date().toISOString()
    });
    if (error) console.error('Error logging audit action:', error);
    await refreshData();
  };

  const getPublicTrips = () => trips.filter(t => t.active);
  const getAgencyPublicTrips = (agencyId: string) => trips.filter(t => t.agencyId === agencyId && t.active);
  const getAgencyTrips = (agencyId: string) => trips.filter(t => t.agencyId === agencyId);
  const getTripById = (id: string) => trips.find(t => t.id === id);
  const getAgencyBySlug = (slug: string) => agencies.find(a => a.slug === slug); // Implementation
  const getReviewsByTripId = (tripId: string) => reviews.filter(r => r.tripId === tripId);
  const hasUserPurchasedTrip = (userId: string, tripId: string) => bookings.some(b => b.clientId === userId && b.tripId === tripId && b.status === 'CONFIRMED');

  const getAgencyStats = (agencyId: string) => {
    const agencyTrips = trips.filter(t => t.agencyId === agencyId);
    const agencyBookings = bookings.filter(b => agencyTrips.some(t => t.id === b.tripId));

    const totalViews = agencyTrips.reduce((sum, trip) => sum + (trip.views || 0), 0);
    const totalSales = agencyTrips.reduce((sum, trip) => sum + (trip.sales || 0), 0); // This should be from bookings ideally
    const totalRevenue = agencyBookings.reduce((sum, booking) => sum + booking.totalPrice, 0);

    const conversionRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;

    return { totalRevenue, totalViews, totalSales, conversionRate };
  };

  return (
    <DataContext.Provider value={{ 
      trips, agencies, bookings, reviews, clients, auditLogs, loading,
      addBooking, addReview, deleteReview, toggleFavorite, updateClientProfile,
      updateAgencySubscription, createTrip, updateTrip, deleteTrip, toggleTripStatus,
      deleteUser, logAuditAction,
      getPublicTrips, getAgencyPublicTrips, getAgencyTrips, getTripById, getAgencyBySlug, getReviewsByTripId,
      hasUserPurchasedTrip, getAgencyStats, refreshData
    }}>
      {!loading && children}
    </DataContext.Provider>
  );
};

// Export the useData hook.
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
