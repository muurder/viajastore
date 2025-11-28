
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
            slug: t.slug, 
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
    try {
      // Fetches only profiles that are CLIENT or ADMIN, excluding AGENCY.
      // This prevents agencies from being incorrectly mapped and displayed in the user list.
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['CLIENT', 'ADMIN']);

      if (error) throw error;

      // The mapping logic below is now correct because the data is pre-filtered.
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
      try {
          const { data, error } = await supabase
            .from('agency_reviews')
            .select(`
                *, 
                profiles (full_name),
                agencies (name, logo_url, slug)
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
                  rating: r.rating,
                  comment: r.comment,
                  createdAt: r.created_at,
                  clientName: r.profiles?.full_name || 'Viajante',
                  agencyName: r.agencies?.name || 'Agência',
                  agencyLogo: r.agencies?.logo_url,
                  response: r.response
              })));
          }
      } catch (err: any) {
          console.warn("Agency reviews table might not exist yet.", err.message || err);
      }
  };

  const fetchBookings = async () => {
    if (!user) return;

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
                  name,
                  slug,
                  phone,
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
               images: images, 
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
              _agency: b.trips?.agencies
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

  // --- ACTIONS ---

  const toggleFavorite = async (tripId: string, clientId: string) => {
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
                // Gracefully handle duplicate key error if local state is out of sync
                if (error.code === '23505') { // Postgres duplicate key error code
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
        // Revert optimistic update on failure
        setClients(prev => prev.map(c => c.id === clientId ? { ...c, favorites: currentClient.favorites } : c));
    }
  };

  const addBooking = async (booking: Booking) => {
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
      if (!review.agencyId || !review.clientId || !review.rating) {
          showToast("Dados incompletos para avaliação", 'error');
          return;
      }

      const { data, error } = await supabase.from('agency_reviews').insert({
          agency_id: review.agencyId,
          client_id: review.clientId,
          booking_id: review.bookingId,
          rating: review.rating,
          comment: review.comment
      }).select().single();
      
      if (error) {
          console.error('Error adding agency review:', error);
          showToast('Erro ao avaliar agência', 'error');
      } else {
          showToast('Avaliação da agência enviada!', 'success');
          setAgencyReviews(prev => [...prev, data as AgencyReview]);
      }
  };

  const updateAgencyReview = async (reviewId: string, data: Partial<AgencyReview>) => {
    const { error } = await supabase
      .from('agency_reviews')
      .update({ comment: data.comment, rating: data.rating })
      .eq('id', reviewId);
      
    if (error) {
        console.error('Error updating review:', error);
        showToast('Erro ao atualizar avaliação. Verifique as permissões (RLS).', 'error');
        return;
    }

    setAgencyReviews(prev => prev.map(r => r.id === reviewId ? { ...r, ...data } as AgencyReview : r));
    showToast('Avaliação atualizada!', 'success');
  };

  const deleteReview = async (reviewId: string) => {};

  const deleteAgencyReview = async (reviewId: string) => {
      const { error } = await supabase.from('agency_reviews').delete().eq('id', reviewId);
      if (error) {
          showToast('Erro ao excluir avaliação', 'error');
      } else {
          showToast('Avaliação excluída', 'success');
          setAgencyReviews(prev => prev.filter(r => r.id !== reviewId));
      }
  };

  const updateClientProfile = async (clientId: string, data: Partial<Client>) => {
    const dbUpdates: any = {};
    if (data.name !== undefined) dbUpdates.full_name = data.name;
    if (data.cpf !== undefined) dbUpdates.cpf = data.cpf;
    if (data.phone !== undefined) dbUpdates.phone = data.phone;
    if (data.status !== undefined) dbUpdates.status = data.status;
    if (data.avatar !== undefined) dbUpdates.avatar_url = data.avatar;

    if (Object.keys(dbUpdates).length === 0) return; 

    const { error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', clientId);

    if (error) {
      console.error('Error updating client profile:', error);
      showToast('A alteração não foi salva. Verifique as permissões (RLS).', 'error');
      return;
    }
    
    setClients(prevClients => 
        prevClients.map(client => client.id === clientId ? { ...client, ...data } : client)
    );
  };

  const updateAgencySubscription = async (agencyId: string, status: 'ACTIVE' | 'INACTIVE', plan: 'BASIC' | 'PREMIUM') => {
    const expiresAt = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();
    
    const updates = {
      subscription_status: status,
      subscription_plan: plan,
      subscription_expires_at: expiresAt
    };

    const { error } = await supabase
      .from('agencies')
      .update(updates)
      .eq('id', agencyId);

    if (error) {
      console.error('Error updating subscription:', error);
      showToast('A alteração não foi salva. Verifique as permissões (RLS).', 'error');
      return;
    }
    
    setAgencies(prev => prev.map(a => 
        a.id === agencyId 
        ? { ...a, subscriptionStatus: status, subscriptionPlan: plan, subscriptionExpiresAt: expiresAt } 
        : a
    ));
    showToast('Assinatura atualizada com sucesso!', 'success');
  };

  const updateAgencyProfileByAdmin = async (agencyId: string, data: Partial<Agency>) => {
    const dbUpdates: any = {};
    if (data.name) dbUpdates.name = data.name;
    if (data.description) dbUpdates.description = data.description;
    if (data.logo) dbUpdates.logo_url = data.logo;
    if (data.slug) dbUpdates.slug = data.slug;
    if (data.cnpj) dbUpdates.cnpj = data.cnpj;
    if (data.phone) dbUpdates.phone = data.phone;
    
    if (Object.keys(dbUpdates).length === 0) return;

    const { error } = await supabase
      .from('agencies')
      .update(dbUpdates)
      .eq('id', agencyId);
    
    if (error) {
      console.error('Error updating agency profile:', error);
      showToast('A alteração não foi salva. Verifique as permissões (RLS).', 'error');
      return;
    }

    setAgencies(prev => prev.map(a => a.id === agencyId ? { ...a, ...data } : a));
    showToast('Agência atualizada com sucesso.', 'success');
  };

  const toggleAgencyStatus = async (agencyId: string) => {
    const agency = agencies.find(a => a.id === agencyId);
    if (!agency) {
      showToast('Agência não encontrada.', 'error');
      return;
    }

    const newStatus = agency.subscriptionStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    const { error } = await supabase
      .from('agencies')
      .update({ subscription_status: newStatus })
      .eq('id', agencyId);

    if (error) {
      console.error('Error toggling agency status:', error);
      showToast('A alteração não foi salva. Verifique as permissões (RLS).', 'error');
      return;
    }
    
    setAgencies(prev => prev.map(a => 
      a.id === agencyId ? { ...a, subscriptionStatus: newStatus } : a
    ));
    showToast(`Agência ${newStatus === 'ACTIVE' ? 'reativada' : 'suspensa'}.`, 'success');
  };


  const createTrip = async (trip: Trip) => {
    if (!user || user.role !== UserRole.AGENCY) {
      throw new Error("Apenas agências podem criar viagens.");
    }
    
    const dbTrip = {
      agency_id: trip.agencyId || user.id,
      title: trip.title,
      slug: (trip.slug && trip.slug.trim() !== '') ? trip.slug.trim() : slugify(trip.title),
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
    };
    
    const { data: newTrip, error } = await supabase
      .from('trips')
      .insert(dbTrip)
      .select()
      .single();

    if (error) {
      console.error("Error creating trip:", error);
      throw error;
    }
    
    if (newTrip && trip.images && trip.images.length > 0) {
      const imagesPayload = trip.images.map(url => ({
        trip_id: newTrip.id,
        image_url: url,
      }));
      const { error: imgError } = await supabase.from('trip_images').insert(imagesPayload);
      if (imgError) {
        console.error("Error saving trip images:", imgError);
        showToast('Viagem criada, mas houve um erro ao salvar as imagens.', 'warning');
      }
    }

    await refreshData();
  };
  
  const updateTrip = async (trip: Trip) => {
    const updates = {
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
      featured: trip.featured,
      featured_in_hero: trip.featuredInHero,
    };

    const { error } = await supabase.from('trips').update(updates).eq('id', trip.id);
    
    if (error) {
       console.error('Error updating trip:', error);
       showToast('Erro ao atualizar viagem.', 'error');
       throw new Error(error?.message || 'Update failed');
    }

    // Handle images: delete all existing and insert new ones
    const { error: deleteImgError } = await supabase.from('trip_images').delete().eq('trip_id', trip.id);
    if (deleteImgError) {
      console.error("Error clearing old images:", deleteImgError);
    }

    if (trip.images && trip.images.length > 0) {
      const imagesPayload = trip.images.map(url => ({
        trip_id: trip.id,
        image_url: url,
      }));
      const { error: imgError } = await supabase.from('trip_images').insert(imagesPayload);
      if (imgError) {
        console.error("Error saving new images:", imgError);
        showToast('Dados da viagem atualizados, mas houve um erro ao salvar as novas imagens.', 'warning');
      }
    }

    await refreshData();
  };

  const deleteTrip = async (tripId: string) => {
    const { error: imagesError } = await supabase.from('trip_images').delete().eq('trip_id', tripId);
    if (imagesError) { console.error('Error deleting trip images:', imagesError); }
    
    const { error } = await supabase.from('trips').delete().eq('id', tripId);
    if (error) {
        showToast('Erro ao excluir viagem. Verifique permissões.', 'error');
        throw new Error(error?.message || 'Delete failed');
    }
    setTrips(prev => prev.filter(t => t.id !== tripId));
  };

  const toggleTripStatus = async (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    const newStatus = !trip.active;
    const { error } = await supabase.from('trips').update({ active: newStatus }).eq('id', tripId);
    if (error) {
        showToast('Erro ao alterar status da viagem.', 'error');
        return;
    }
    setTrips(prev => prev.map(t => t.id === tripId ? { ...t, active: newStatus } : t));
    showToast(`Viagem ${newStatus ? 'publicada' : 'pausada'}.`, 'success');
  };
  
  const toggleTripFeatureStatus = async (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    const newStatus = !trip.featured;
    const { error } = await supabase.from('trips').update({ featured: newStatus }).eq('id', tripId);
    if (error) {
        showToast('Erro ao alterar destaque da viagem.', 'error');
        return;
    }
    setTrips(prev => prev.map(t => t.id === tripId ? { ...t, featured: newStatus } : t));
    showToast(`Viagem ${newStatus ? 'destacada' : 'não destacada'}.`, 'success');
  };
  
  // --- MASTER ADMIN ACTIONS ---
  const softDeleteEntity = async (id: string, table: 'profiles' | 'agencies') => {
    const { error } = await supabase
      .from(table)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) {
        console.error(`Error soft deleting from ${table}:`, error);
        showToast('Erro ao mover para a lixeira. Verifique RLS.', 'error');
        return;
    }

    if (table === 'agencies') {
      setAgencies(prev => prev.map(a => a.id === id ? { ...a, deleted_at: new Date().toISOString() } : a));
    } else {
      setClients(prev => prev.map(a => a.id === id ? { ...a, deleted_at: new Date().toISOString() } : a));
    }
  };

  const restoreEntity = async (id: string, table: 'profiles' | 'agencies') => {
    const { error } = await supabase
      .from(table)
      .update({ deleted_at: null })
      .eq('id', id);

    if (error) {
        console.error(`Error restoring from ${table}:`, error);
        showToast('Erro ao restaurar. Verifique RLS.', 'error');
        return;
    }

    if (table === 'agencies') {
      setAgencies(prev => prev.map(a => a.id === id ? { ...a, deleted_at: undefined } : a));
    } else {
      setClients(prev => prev.map(c => c.id === id ? { ...c, deleted_at: undefined } : c));
    }
  };

  const deleteUser = async (userId: string, role: UserRole) => {
    console.warn("deleteUser is a hard delete and should be used with caution.");
  };

  const deleteMultipleUsers = async (userIds: string[]) => {
    if (userIds.length === 0) return;
    const { error } = await supabase
      .from('profiles')
      .delete()
      .in('id', userIds);
      
    if (error) {
      console.error('Error hard deleting users:', error);
      showToast('Erro ao esvaziar a lixeira. Verifique as permissões (RLS).', 'error');
      throw error;
    }
    
    setClients(prev => prev.filter(c => !userIds.includes(c.id)));
  };

  const deleteMultipleAgencies = async (agencyIds: string[]) => {
    if (agencyIds.length === 0) return;
    
    const { error: agencyError } = await supabase
      .from('agencies')
      .delete()
      .in('id', agencyIds);
      
    if (agencyError) {
      console.error('Error hard deleting from agencies table:', agencyError);
      showToast('Erro ao esvaziar a lixeira de agências. Verifique as permissões (RLS).', 'error');
      throw agencyError;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .in('id', agencyIds);

    if (profileError) {
      console.warn('Warning deleting corresponding profiles for agencies:', profileError);
    }
    
    setAgencies(prev => prev.filter(a => !agencyIds.includes(a.id)));
  };

  const getUsersStats = async (userIds: string[]): Promise<UserStats[]> => { return []; };
  const updateMultipleUsersStatus = async (userIds: string[], status: 'ACTIVE' | 'SUSPENDED') => {};
  const updateMultipleAgenciesStatus = async (agencyIds: string[], status: 'ACTIVE' | 'INACTIVE') => {};
  const logAuditAction = async (action: string, details: string) => {};

  const sendPasswordReset = async (email: string) => {
    const { error } = await (supabase.auth as any).resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/forgot-password`,
    });
    if (error) showToast('Erro ao enviar email: ' + error.message, 'error');
    else showToast('Email de redefinição de senha enviado!', 'success');
  };

  const updateUserAvatarByAdmin = async (userId: string, file: File): Promise<string | null> => {
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${userId}-avatar-${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(fileName, file, { upsert: true });

          if (uploadError) throw uploadError;

          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
          
          const { error: dbError } = await supabase
              .from('profiles')
              .update({ avatar_url: data.publicUrl })
              .eq('id', userId);

          if (dbError) {
              console.error("DB error updating avatar URL:", dbError);
              throw new Error("Não foi possível salvar o novo avatar no perfil do usuário.");
          }

          setClients(prev => prev.map(c => c.id === userId ? { ...c, avatar: data.publicUrl } : c));
          showToast('Avatar atualizado.', 'success');
          return data.publicUrl;

      } catch (error: any) {
          console.error("Upload error:", error);
          showToast(error.message || 'Erro no upload.', 'error');
          return null;
      }
  };

  // --- GETTERS (DERIVED STATE) ---
  const getPublicTrips = () => trips.filter(t => t.active);
  const getAgencyPublicTrips = (agencyId: string) => trips.filter(t => t.agencyId === agencyId && t.active);
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
      try {
          const { data, error } = await supabase.from('agency_themes').select('colors').eq('agency_id', agencyId).maybeSingle();
          if (error) throw error;
          return data as AgencyTheme | null;
      } catch (e) { return null; }
  };
  
  const saveAgencyTheme = async (agencyId: string, colors: ThemeColors): Promise<boolean> => {
      try {
          const { error } = await supabase.from('agency_themes').upsert({ agency_id: agencyId, colors: colors }, { onConflict: 'agency_id' });
          if (error) throw error;
          return true;
      } catch (e) { return false; }
  };


  return (
    <DataContext.Provider value={{
      trips, agencies, bookings, reviews, agencyReviews, clients, auditLogs, loading,
      addBooking, addReview, addAgencyReview, deleteReview, deleteAgencyReview, updateAgencyReview,
      toggleFavorite, updateClientProfile, updateAgencySubscription, updateAgencyProfileByAdmin, toggleAgencyStatus,
      createTrip, updateTrip, deleteTrip, toggleTripStatus, toggleTripFeatureStatus,
      softDeleteEntity, restoreEntity, deleteUser, deleteMultipleUsers, deleteMultipleAgencies, getUsersStats, updateMultipleUsersStatus, updateMultipleAgenciesStatus, logAuditAction,
      sendPasswordReset, updateUserAvatarByAdmin,
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
