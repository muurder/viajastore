

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
  createTrip: (trip: Trip) => Promise<void>;
  updateTrip: (trip: Trip) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  toggleTripStatus: (tripId: string) => Promise<void>; 
  toggleTripFeatureStatus: (tripId: string) => Promise<void>;
  
  // Master Admin Functions
  deleteUser: (userId: string, role: UserRole) => Promise<void>;
  deleteMultipleUsers: (userIds: string[]) => Promise<void>;
  getUsersStats: (userIds: string[]) => Promise<UserStats[]>;
  updateMultipleUsersStatus: (userIds: string[], status: 'ACTIVE' | 'SUSPENDED') => Promise<void>;
  updateMultipleAgenciesStatus: (agencyIds: string[], status: 'ACTIVE' | 'INACTIVE') => Promise<void>;
  logAuditAction: (action: string, details: string) => Promise<void>;

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

  // --- DATA FETCHING ---

  const fetchTrips = async () => {
    try {
      // Fix: Remove reference to 'images' column on trips table if it doesn't exist
      // and use correct join for trip_images
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
            slug: t.slug, 
            description: t.description,
            destination: t.destination,
            price: Number(t.price),
            startDate: t.start_date,
            endDate: t.end_date,
            durationDays: t.duration_days,
            // Map trip_images correctly
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
            rating: 0, // Deprecated: Trips don't have ratings anymore
            totalReviews: 0, // Deprecated
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
        whatsapp: a.whatsapp,
        
        heroMode: a.hero_mode || 'TRIPS',
        heroBannerUrl: a.hero_banner_url,
        heroTitle: a.hero_title,
        heroSubtitle: a.hero_subtitle,

        customSettings: a.custom_settings || {},

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
          favorites: [], 
          createdAt: p.created_at,
          address: p.address || {},
          status: p.status || 'ACTIVE'
        } as Client));

        setClients(formattedClients);
    } catch (err) {
        console.warn("Supabase unavailable, using MOCK_CLIENTS.", err);
        setClients(MOCK_CLIENTS);
    }
  };

  const fetchAgencyReviews = async () => {
      try {
          // FIX: Use standard relationship syntax instead of column alias causing PGRST200
          const { data, error } = await supabase
            .from('agency_reviews')
            .select(`
                *, 
                profiles (full_name),
                agencies (name, logo_url, slug)
            `);
            
          if (error) {
             if (error.code !== '42P01') console.error("Error fetching agency reviews", error);
             return; // Exit if table missing
          }

          if (data) {
              setAgencyReviews(data.map((r: any) => ({
                  id: r.id,
                  agencyId: r.agency_id,
                  clientId: r.client_id,
                  bookingId: r.booking_id,
                  rating: r.rating,
                  comment: r.comment,
                  createdAt: r.created_at,
                  // Map nested objects correctly
                  clientName: r.profiles?.full_name || 'Viajante',
                  agencyName: r.agencies?.name || 'Agência',
                  agencyLogo: r.agencies?.logo_url,
                  response: r.response
              })));
          }
      } catch (err) {
          console.warn("Agency reviews table might not exist yet.");
      }
  };

  const fetchBookings = async () => {
    if (!user) return;

    try {
        // FIXED QUERY: Using correct joins for images and agency info
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
                  name,
                  slug,
                  whatsapp,
                  logo_url
                )
              )
            `);

        if (error) throw error;

        if (data) {
          const formattedBookings: Booking[] = data.map((b: any) => {
            const images = b.trips?.trip_images?.map((img: any) => img.image_url) || [];
            
            const tripData = b.trips ? {
               ...b.trips,
               images: images, // Now populated correctly
               agencyId: b.trips.agency_id,
               startDate: b.trips.start_date,
               durationDays: b.trips.duration_days
            } : undefined;

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
              _agency: b.trips?.agencies // Includes expanded agency data (name, slug, whatsapp)
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
      const promises = [
        fetchTrips(), 
        fetchAgencies(), 
        fetchAgencyReviews(),
        fetchBookings()
      ];
      
      // fetchFavorites removed from here to keep it simple, 
      // usually called separately or inside fetchClients logic if needed.
      if (user && user.role === UserRole.CLIENT) {
          // Fetch favorites specifically
          const { data } = await supabase.from('favorites').select('trip_id').eq('user_id', user.id);
          if (data) {
             const favs = data.map(f => f.trip_id);
             // Merge into clients logic if needed or just keep local state
             setClients(prev => {
                 const me = prev.find(c => c.id === user.id);
                 if (me) return prev.map(c => c.id === user.id ? {...c, favorites: favs} : c);
                 return prev;
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

  const toggleFavorite = async (tripId: string, clientId: string) => {
    const currentClient = clients.find(c => c.id === clientId) || { favorites: [] as string[] };
    const isCurrentlyFavorite = currentClient.favorites?.includes(tripId);
    
    // Optimistic update
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
            if (error) throw error;
            showToast('Adicionado aos favoritos', 'success');
        }
    } catch (error: any) {
        console.error('Error toggling favorite:', error);
        showToast('Erro ao atualizar favoritos', 'error');
        // Revert
        setClients(prev => prev.map(c => c.id === clientId ? { ...c, favorites: currentClient.favorites } : c));
    }
  };

  const addBooking = async (booking: Booking) => {
    // FIXED: Ensure ID is a valid UUID. 
    // If provided ID is not UUID format, generate one.
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
    }
    await refreshData();
  };

  // Legacy support - kept empty or basic
  const addReview = async (review: Review) => {
    console.warn("addReview is deprecated. Use addAgencyReview.");
  };

  const addAgencyReview = async (review: Partial<AgencyReview>) => {
      // Validate inputs
      if (!review.agencyId || !review.clientId || !review.rating) {
          showToast("Dados incompletos para avaliação", 'error');
          return;
      }

      const { error } = await supabase.from('agency_reviews').insert({
          agency_id: review.agencyId,
          client_id: review.clientId,
          booking_id: review.bookingId, // Link to specific booking if available
          rating: review.rating,
          comment: review.comment
      });
      
      if (error) {
          console.error('Error adding agency review:', error);
          showToast('Erro ao avaliar agência', 'error');
      } else {
          showToast('Avaliação da agência enviada!', 'success');
          await fetchAgencyReviews();
      }
  };

  const updateAgencyReview = async (reviewId: string, data: Partial<AgencyReview>) => {
    const { error } = await supabase
      .from('agency_reviews')
      .update({
        comment: data.comment,
        rating: data.rating,
      })
      .eq('id', reviewId);
    if (error) {
      showToast('Erro ao atualizar avaliação: ' + error.message, 'error');
      throw error;
    }
    showToast('Avaliação atualizada com sucesso.', 'success');
    await fetchAgencyReviews(); // Refresh data
  };

  const deleteReview = async (reviewId: string) => {
     // Legacy
  };

  const deleteAgencyReview = async (reviewId: string) => {
      const { error } = await supabase.from('agency_reviews').delete().eq('id', reviewId);
      if (error) {
          showToast('Erro ao excluir avaliação', 'error');
      } else {
          showToast('Avaliação excluída', 'success');
          await fetchAgencyReviews();
      }
  };

  const updateClientProfile = async (clientId: string, data: Partial<Client>) => {
    const dbUpdates: any = {};
    if(data.name) dbUpdates.full_name = data.name;
    if(data.cpf) dbUpdates.cpf = data.cpf;
    if(data.phone) dbUpdates.phone = data.phone;
    if(data.status) dbUpdates.status = data.status;

    const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', clientId);
    if (error) {
      console.error('Error updating client profile:', error);
      throw error;
    }
    await refreshData();
  };

  const updateAgencySubscription = async (agencyId: string, status: 'ACTIVE' | 'INACTIVE', plan: 'BASIC' | 'PREMIUM') => {
    const { error } = await supabase.from('agencies').update({
      subscription_status: status,
      subscription_plan: plan,
      subscription_expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
    }).eq('id', agencyId);
    if (!error) await refreshData();
  };

  const updateAgencyProfileByAdmin = async (agencyId: string, data: Partial<Agency>) => {
    const dbUpdates: any = {};
    if (data.name) dbUpdates.name = data.name;
    if (data.description) dbUpdates.description = data.description;
    if (data.logo) dbUpdates.logo_url = data.logo;
    if (data.slug) dbUpdates.slug = data.slug;
    if (data.cnpj) dbUpdates.cnpj = data.cnpj;
    if (data.phone) dbUpdates.phone = data.phone;

    const { error } = await supabase
      .from('agencies')
      .update(dbUpdates)
      .eq('id', agencyId);
    
    if (error) {
      showToast('Erro ao atualizar agência: ' + error.message, 'error');
      throw error;
    }
    showToast('Agência atualizada com sucesso.', 'success');
    await fetchAgencies();
  };


  const createTrip = async (trip: Trip) => {
    const tripSlug = (trip.slug && trip.slug.trim() !== '') ? trip.slug.trim() : null;

    const dbTrip: any = {
        agency_id: trip.agencyId,
        title: trip.title,
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
        active: trip.active ?? true,
        included: trip.included,
        not_included: trip.notIncluded,
        featured: trip.featured ?? false,
        featured_in_hero: trip.featuredInHero ?? false, 
        popular_near_sp: trip.popularNearSP ?? false,
    };

    if (tripSlug) dbTrip.slug = tripSlug;

    const { data: newTrip, error } = await supabase.from('trips').insert(dbTrip).select().single();

    if (error) throw error;

    if (newTrip && trip.images && trip.images.length > 0) {
      const imageInserts = trip.images.map((url, index) => ({
        trip_id: newTrip.id,
        image_url: url,
        order_index: index
      }));
      await supabase.from('trip_images').insert(imageInserts);
    }
    await refreshData();
  };

  const updateTrip = async (trip: Trip) => {
    const { id, images } = trip;
    
    const dbTrip = {
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
        active: trip.active,
        included: trip.included,
        not_included: trip.notIncluded,
        featured: trip.featured,
        featured_in_hero: trip.featuredInHero,
        popular_near_sp: trip.popularNearSP,
    };

    const { error } = await supabase.from('trips').update(dbTrip).eq('id', id);
    if (error) throw error;

    // Replace images
    if (images) {
      await supabase.from('trip_images').delete().eq('trip_id', id);
      if (images.length > 0) {
        const imageInserts = images.map((url, index) => ({
          trip_id: id,
          image_url: url,
          order_index: index
        }));
        await supabase.from('trip_images').insert(imageInserts);
      }
    }
    await refreshData();
  };

  const deleteTrip = async (tripId: string) => {
    const tripToDelete = trips.find(t => t.id === tripId);
    if (!tripToDelete) {
      throw new Error("Viagem não encontrada para exclusão.");
    }
  
    // 1. Deletar imagens do Storage (se houver)
    if (tripToDelete.images && tripToDelete.images.length > 0) {
      const filePaths = tripToDelete.images.map(url => {
        // Extrai o caminho do arquivo da URL pública do Supabase
        try {
            const urlParts = new URL(url);
            const pathParts = urlParts.pathname.split('/');
            // O caminho do arquivo é a última parte depois do nome do bucket
            return pathParts.slice(pathParts.indexOf('trip-images') + 1).join('/');
        } catch (e) {
            return null; // URL inválida, não pode extrair caminho
        }
      }).filter((p): p is string => p !== null && p !== '');
  
      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('trip-images')
          .remove(filePaths);
        
        if (storageError) {
          console.error("Erro ao deletar imagens do storage:", storageError);
          // Opcional: não bloquear a exclusão do DB se a do storage falhar, mas logar o erro.
        }
      }
    }
  
    // 2. Deletar a viagem do banco de dados
    // A exclusão em cascata (ON DELETE CASCADE) na tabela `trip_images` cuidará dos registros de imagem.
    const { error: dbError } = await supabase.from('trips').delete().eq('id', tripId);
    if (dbError) throw dbError;
  
    await refreshData();
  };

  const toggleTripStatus = async (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    await supabase.from('trips').update({ active: !trip.active }).eq('id', tripId);
    await refreshData();
  };

  const toggleTripFeatureStatus = async (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    const { error } = await supabase.from('trips').update({ featured: !trip.featured }).eq('id', tripId);
    if (error) {
        showToast('Erro ao alterar destaque da viagem.', 'error');
    } else {
        showToast(`Viagem ${!trip.featured ? 'destacada' : 'removida dos destaques'}.`, 'success');
        await refreshData();
    }
  };

  const deleteUser = async (userId: string, role: UserRole) => {
    const { error } = await supabase.rpc('delete_user_by_admin', {
        user_id_to_delete: userId
    });

    if (error) {
        console.error('Error deleting user via RPC:', error);
        throw error;
    }

    await refreshData();
  };

  const deleteMultipleUsers = async (userIds: string[]) => {
    const { error } = await supabase.rpc('delete_multiple_users_by_admin', {
        user_ids_to_delete: userIds
    });

    if (error) {
        console.error('Error deleting multiple users via RPC:', error);
        throw error;
    }
    await refreshData();
  };
  
  const getUsersStats = async (userIds: string[]): Promise<UserStats[]> => {
    const { data, error } = await supabase.rpc('get_users_stats', {
        user_ids_to_query: userIds
    });

    if (error) {
        console.error('Error getting user stats via RPC:', error);
        console.warn("Calculating user stats on client due to RPC error.");
        return userIds.map(id => {
            const userBookings = bookings.filter(b => b.clientId === id);
            const userReviews = agencyReviews.filter(r => r.clientId === id);
            const totalSpent = userBookings.reduce((sum, b) => sum + b.totalPrice, 0);
            const userName = clients.find(c => c.id === id)?.name || 'N/A';
            
            return { userId: id, userName, totalSpent, totalBookings: userBookings.length, totalReviews: userReviews.length };
        });
    }
    return data || [];
  };

  const updateMultipleUsersStatus = async (userIds: string[], status: 'ACTIVE' | 'SUSPENDED') => {
    const { error } = await supabase.rpc('update_multiple_users_status_by_admin', {
        user_ids_to_update: userIds,
        new_status: status
    });
    if (error) {
        console.error('Error updating multiple users status via RPC:', error);
        throw error;
    }
    await refreshData();
  };

  const updateMultipleAgenciesStatus = async (agencyIds: string[], status: 'ACTIVE' | 'INACTIVE') => {
    const { error } = await supabase.rpc('update_multiple_agencies_status_by_admin', {
        agency_ids_to_update: agencyIds,
        new_status: status
    });
    if (error) {
        console.error('Error updating multiple agencies status via RPC:', error);
        throw error;
    }
    await refreshData();
  };

  const logAuditAction = async (action: string, details: string) => {
    if (!user || user.role !== UserRole.ADMIN) return;
    await supabase.from('audit_logs').insert({
      admin_email: user.email,
      action: action,
      details: details,
      created_at: new Date().toISOString()
    });
    await refreshData();
  };

  // PUBLIC HELPERS
  const getPublicTrips = () => trips.filter(t => t.active);
  const getAgencyPublicTrips = (agencyId: string) => trips.filter(t => t.agencyId === agencyId && t.active);
  const getAgencyTrips = (agencyId: string) => trips.filter(t => t.agencyId === agencyId);
  const getTripById = (id: string | undefined) => id ? trips.find(t => t.id === id) : undefined;
  const getTripBySlug = (slug: string) => trips.find(t => t.slug === slug); 
  
  const getAgencyBySlug = (slug: string) => {
      if (!slug) return undefined;
      return agencies.find(a => a.slug && a.slug.toLowerCase() === slug.toLowerCase());
  };
  
  // Deprecated but kept safe
  const getReviewsByTripId = (tripId: string) => []; 
  
  const getReviewsByAgencyId = (agencyId: string) => agencyReviews.filter(r => r.agencyId === agencyId);
  const getReviewsByClientId = (clientId: string) => agencyReviews.filter(r => r.clientId === clientId);

  const hasUserPurchasedTrip = (userId: string, tripId: string) => bookings.some(b => b.clientId === userId && b.tripId === tripId && b.status === 'CONFIRMED');

  const getAgencyStats = (agencyId: string) => {
    const agencyTrips = trips.filter(t => t.agencyId === agencyId);
    const agencyBookings = bookings.filter(b => agencyTrips.some(t => t.id === b.tripId));

    const totalViews = agencyTrips.reduce((sum, trip) => sum + (trip.views || 0), 0);
    const totalSales = agencyTrips.reduce((sum, trip) => sum + (trip.sales || 0), 0);
    const totalRevenue = agencyBookings.reduce((sum, booking) => sum + booking.totalPrice, 0);

    const conversionRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;

    return { totalRevenue, totalViews, totalSales, conversionRate };
  };

  // --- AGENCY THEME FUNCTIONS ---
  const getAgencyTheme = async (agencyId: string): Promise<AgencyTheme | null> => {
      try {
          const { data, error } = await supabase
              .from('agency_themes')
              .select('*')
              .eq('agency_id', agencyId)
              .single();
          
          if (error && error.code !== 'PGRST116') { // PGRST116 is "row not found", which is fine
              console.error("Error fetching theme:", error);
              return null;
          }

          if (data) {
              return {
                  agencyId: data.agency_id,
                  colors: data.colors,
                  updatedAt: data.updated_at
              };
          }
          return null;
      } catch (err) {
          return null;
      }
  };

  const saveAgencyTheme = async (agencyId: string, colors: ThemeColors): Promise<boolean> => {
      try {
          const { error } = await supabase
              .from('agency_themes')
              .upsert({
                  agency_id: agencyId,
                  colors: colors,
                  updated_at: new Date().toISOString()
              }, { onConflict: 'agency_id' });

          if (error) throw error;
          return true;
      } catch (err) {
          console.error("Error saving theme:", err);
          return false;
      }
  };

  return (
    <DataContext.Provider value={{ 
      trips, agencies, bookings, reviews, agencyReviews, clients, auditLogs, loading,
      addBooking, addReview, addAgencyReview, deleteReview, deleteAgencyReview, updateAgencyReview, toggleFavorite, updateClientProfile,
      updateAgencySubscription, updateAgencyProfileByAdmin, createTrip, updateTrip, deleteTrip, toggleTripStatus, toggleTripFeatureStatus,
      deleteUser, deleteMultipleUsers, getUsersStats, updateMultipleUsersStatus, updateMultipleAgenciesStatus, logAuditAction,
      getPublicTrips, getAgencyPublicTrips, getAgencyTrips, getTripById, getTripBySlug, getAgencyBySlug, getReviewsByTripId, getReviewsByAgencyId, getReviewsByClientId,
      hasUserPurchasedTrip, getAgencyStats, 
      getAgencyTheme, saveAgencyTheme,
      refreshData
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