
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Trip, Agency, Booking, Review, Client, UserRole } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';

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
  
  getPublicTrips: () => Trip[]; 
  getAgencyPublicTrips: (agencyId: string) => Trip[];
  getAgencyTrips: (agencyId: string) => Trip[]; 
  getTripById: (id: string) => Trip | undefined;
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
  const [loading, setLoading] = useState(true);

  // --- DATA FETCHING ---

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          trip_images (image_url),
          agencies (name, logo_url)
        `);

      if (error) {
        console.error('Error fetching trips:', error.message);
        return;
      }

      if (!data) return;

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
        images: t.trip_images ? t.trip_images.map((img: any) => img.image_url) : [],
        category: t.category || 'PRAIA',
        tags: t.tags || [],
        travelerTypes: t.traveler_types || [],
        active: t.active,
        rating: 5.0, // Seria ideal calcular média dos reviews
        totalReviews: 0, 
        included: t.included || [],
        notIncluded: t.not_included || [],
        views: t.views_count || 0,
        sales: t.sales_count || 0,
        featured: t.featured || false,
        popularNearSP: t.popular_near_sp || false
      }));

      setTrips(formattedTrips);
    } catch (err) {
      console.error("Unexpected error fetching trips:", err);
    }
  };

  const fetchAgencies = async () => {
    const { data, error } = await supabase.from('agencies').select('*');
    if (error) {
      console.error('Error fetching agencies:', error);
      return;
    }
    
    const formattedAgencies: Agency[] = (data || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      email: a.email || '',
      role: UserRole.AGENCY,
      cnpj: a.cnpj,
      description: a.description,
      logo: a.logo_url,
      subscriptionStatus: a.subscription_status,
      subscriptionPlan: a.subscription_plan,
      subscriptionExpiresAt: a.subscription_expires_at,
      website: a.website,
      phone: a.phone
    }));

    setAgencies(formattedAgencies);
  };

  const fetchReviews = async () => {
     const { data, error } = await supabase.from('reviews').select('*, profiles(full_name)');
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
  };

  const fetchFavorites = async () => {
      if(user?.role === UserRole.CLIENT) {
          const { data } = await supabase.from('favorites').select('trip_id').eq('user_id', user.id);
          if(data) {
             const favIds = data.map(f => f.trip_id);
             setClients(prev => {
                 const existing = prev.find(c => c.id === user.id);
                 if(existing) return prev.map(c => c.id === user.id ? { ...c, favorites: favIds} : c);
                 return [...prev, { id: user.id, favorites: favIds } as Client];
             });
          }
      }
  };

  const fetchBookings = async () => {
    if (!user) return;

    let query = supabase.from('bookings').select('*');

    // Se for cliente, pega só as dele
    if (user.role === UserRole.CLIENT) {
      query = query.eq('client_id', user.id);
    } 
    // Se for agência, pega reservas das viagens DESTA agência
    else if (user.role === UserRole.AGENCY) {
      // Supabase join filter: booking -> trip -> agency_id
      const { data: myTrips } = await supabase.from('trips').select('id').eq('agency_id', user.id);
      const myTripIds = myTrips?.map(t => t.id) || [];
      if(myTripIds.length > 0) {
          query = query.in('trip_id', myTripIds);
      } else {
          setBookings([]);
          return;
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching bookings', error);
      return;
    }

    if (data) {
      const formattedBookings: Booking[] = data.map((b: any) => ({
        id: b.id,
        tripId: b.trip_id,
        clientId: b.client_id,
        date: b.created_at, // Data da compra
        status: b.status,
        totalPrice: b.total_price,
        passengers: b.passengers,
        voucherCode: b.voucher_code,
        paymentMethod: b.payment_method
      }));
      setBookings(formattedBookings);
    }
  };

  const refreshData = async () => {
      setLoading(true);
      await Promise.all([
        fetchTrips(), 
        fetchAgencies(), 
        fetchReviews(), 
        fetchBookings() // Agora busca reservas reais
      ]);
      if(user) await fetchFavorites();
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

  const getPublicTrips = () => {
    return trips.filter(trip => trip.active && isAgencyActive(trip.agencyId));
  };

  const getAgencyPublicTrips = (agencyId: string) => {
    if (!isAgencyActive(agencyId)) return [];
    return trips.filter(t => t.agencyId === agencyId && t.active);
  };

  const getAgencyTrips = (agencyId: string) => {
    return trips.filter(t => t.agencyId === agencyId);
  };

  const getTripById = (id: string) => trips.find(t => t.id === id);
  const getReviewsByTripId = (tripId: string) => reviews.filter(r => r.tripId === tripId);
  
  const hasUserPurchasedTrip = (userId: string, tripId: string) => {
    return bookings.some(b => b.clientId === userId && b.tripId === tripId);
  };

  const createTrip = async (trip: Trip) => {
     // 1. Insert Trip
     const { data, error } = await supabase.from('trips').insert({
         agency_id: trip.agencyId,
         title: trip.title,
         description: trip.description,
         destination: trip.destination,
         price: trip.price,
         start_date: trip.startDate,
         end_date: trip.endDate,
         duration_days: trip.durationDays,
         category: trip.category,
         active: trip.active,
         included: trip.included,
         not_included: trip.notIncluded,
         tags: trip.tags
     }).select().single();

     if(error) throw new Error('Erro ao criar viagem: ' + error.message);

     // 2. Insert Images
     if(trip.images && trip.images.length > 0) {
         const imagesPayload = trip.images.map(url => ({
             trip_id: data.id,
             image_url: url
         }));
         await supabase.from('trip_images').insert(imagesPayload);
     }

     await fetchTrips();
  };

  const updateTrip = async (trip: Trip) => {
      const { error } = await supabase.from('trips').update({
         title: trip.title,
         description: trip.description,
         destination: trip.destination,
         price: trip.price,
         duration_days: trip.durationDays,
         category: trip.category,
         active: trip.active,
         included: trip.included,
         not_included: trip.notIncluded
      }).eq('id', trip.id);

      if(error) throw error;
      await fetchTrips();
  };

  const deleteTrip = async (tripId: string) => {
      await supabase.from('trips').delete().eq('id', tripId);
      setTrips(prev => prev.filter(t => t.id !== tripId));
  };

  const toggleTripStatus = async (tripId: string) => {
      const trip = trips.find(t => t.id === tripId);
      if(!trip) return;
      await supabase.from('trips').update({ active: !trip.active }).eq('id', tripId);
      setTrips(prev => prev.map(t => t.id === tripId ? { ...t, active: !t.active } : t));
  };

  const toggleFavorite = async (tripId: string, clientId: string) => {
      const { data } = await supabase.from('favorites').select('*').eq('user_id', clientId).eq('trip_id', tripId).single();
      
      if(data) {
          await supabase.from('favorites').delete().eq('id', data.id);
          setClients(prev => prev.map(c => c.id === clientId ? { ...c, favorites: c.favorites.filter(id => id !== tripId) } : c));
      } else {
          await supabase.from('favorites').insert({ user_id: clientId, trip_id: tripId });
          setClients(prev => prev.map(c => c.id === clientId ? { ...c, favorites: [...c.favorites, tripId] } : c));
      }
  };

  const addBooking = async (booking: Booking) => {
      const { error } = await supabase.from('bookings').insert({
          trip_id: booking.tripId,
          client_id: booking.clientId,
          status: booking.status,
          total_price: booking.totalPrice,
          passengers: booking.passengers,
          voucher_code: booking.voucherCode,
          payment_method: booking.paymentMethod
      });
      
      if (error) {
        console.error("Erro ao salvar reserva:", error);
        alert("Erro ao processar reserva. Tente novamente.");
        return;
      }

      // Atualizar contador de vendas na viagem
      await supabase.rpc('increment_sales', { row_id: booking.tripId });

      await fetchBookings();
  };

  const addReview = async (review: Review) => {
      await supabase.from('reviews').insert({
          trip_id: review.tripId,
          user_id: review.clientId,
          rating: review.rating,
          comment: review.comment
      });
      await fetchReviews();
  };

  const deleteReview = async (reviewId: string) => {
      await supabase.from('reviews').delete().eq('id', reviewId);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
  };

  const updateAgencySubscription = async (agencyId: string, status: 'ACTIVE' | 'INACTIVE', plan: 'BASIC' | 'PREMIUM') => {
      await supabase.from('agencies').update({
          subscription_status: status,
          subscription_plan: plan
      }).eq('id', agencyId);
      await fetchAgencies();
  };

  const updateClientProfile = async (clientId: string, data: Partial<Client>) => {
      const payload: any = {};
      if (data.phone) payload.phone = data.phone;
      // Adicionar outros campos se necessário no futuro

      if (Object.keys(payload).length > 0) {
          await supabase.from('profiles').update(payload).eq('id', clientId);
          // Atualiza estado local se necessário
      }
  };

  const getAgencyStats = (agencyId: string): DashboardStats => {
     const agencyTrips = trips.filter(t => t.agencyId === agencyId);
     const agencyBookings = bookings.filter(b => {
         const trip = trips.find(t => t.id === b.tripId);
         return trip && trip.agencyId === agencyId;
     });

     const totalRevenue = agencyBookings.reduce((acc, curr) => acc + (Number(curr.totalPrice) || 0), 0);
     const totalSales = agencyBookings.length;
     const totalViews = agencyTrips.reduce((acc, curr) => acc + (curr.views || 0), 0);
     
     // Calculo simples de conversão
     const conversionRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;

     return { totalRevenue, totalSales, totalViews, conversionRate };
  };

  return (
    <DataContext.Provider value={{
      trips, agencies, bookings, reviews, clients, loading,
      addBooking, addReview, deleteReview, toggleFavorite, updateClientProfile,
      updateAgencySubscription, createTrip, updateTrip, deleteTrip, toggleTripStatus,
      getPublicTrips, getAgencyPublicTrips, getAgencyTrips, getTripById, getReviewsByTripId,
      hasUserPurchasedTrip, getAgencyStats, refreshData
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
