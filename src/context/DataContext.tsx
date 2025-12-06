
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Trip, Agency, Booking, Review, AgencyReview, Client, UserRole, AuditLog, AgencyTheme, ThemeColors, UserStats, DashboardStats, ActivityLog, OperationalData, ActivityActionType } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { MOCK_AGENCIES, MOCK_TRIPS, MOCK_BOOKINGS, MOCK_REVIEWS, MOCK_CLIENTS } from '../services/mockData';
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
  deleteReview: (id: string) => Promise<void>;
  deleteAgencyReview: (id: string) => Promise<void>;
  updateAgencyReview: (id: string, updates: Partial<AgencyReview>) => Promise<void>;
  toggleFavorite: (tripId: string, userId: string) => Promise<void>;
  updateClientProfile: (userId: string, data: Partial<Client>) => Promise<void>;
  updateAgencySubscription: (agencyId: string, status: string, plan: string, expiresAt?: string) => Promise<void>;
  updateAgencyProfileByAdmin: (agencyId: string, data: Partial<Agency>) => Promise<void>;
  toggleAgencyStatus: (agencyId: string) => Promise<void>;
  createTrip: (trip: Trip) => Promise<void>;
  updateTrip: (trip: Trip) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  toggleTripStatus: (tripId: string) => Promise<void>;
  toggleTripFeatureStatus: (tripId: string) => Promise<void>;
  updateTripOperationalData: (tripId: string, data: OperationalData) => Promise<void>;
  softDeleteEntity: (id: string, table: string) => Promise<void>;
  restoreEntity: (id: string, table: string) => Promise<void>;
  deleteUser: (id: string, role: string) => Promise<void>;
  deleteMultipleUsers: (ids: string[]) => Promise<void>;
  deleteMultipleAgencies: (ids: string[]) => Promise<void>;
  getUsersStats: (userIds: string[]) => Promise<UserStats[]>;
  updateMultipleUsersStatus: (ids: string[], status: string) => Promise<void>;
  updateMultipleAgenciesStatus: (ids: string[], status: string) => Promise<void>;
  logAuditAction: (action: string, details: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateUserAvatarByAdmin: (userId: string, file: File) => Promise<string | null>;
  getPublicTrips: () => Trip[];
  getAgencyPublicTrips: (agencyId: string) => Trip[];
  getAgencyTrips: (agencyId: string) => Trip[];
  getTripById: (id: string) => Trip | undefined;
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

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [trips, setTrips] = useState<Trip[]>(MOCK_TRIPS);
  const [agencies, setAgencies] = useState<Agency[]>(MOCK_AGENCIES);
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const [agencyReviews, setAgencyReviews] = useState<AgencyReview[]>([]);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to ensure supabase client exists
  const guardSupabase = () => {
    if (!supabase) {
      // showToast('Funcionalidade indisponível no modo offline.', 'info');
      // throw new Error('Supabase client not available.');
      return null;
    }
    return supabase;
  };

  const fetchTrips = async () => {
    const sb = guardSupabase();
    if (!sb) return;
    try {
      const { data, error } = await sb
        .from('trips')
        .select(`
            *,
            boarding_points,
            operational_data
        `);

      if (error) {
         // Ignore specific column error for backward compatibility if migration pending
         if (error.code === '42703') console.warn("Schema mismatch (trips), using mocks/partial data.");
         else throw error;
      }
      
      if (data) {
        const formattedTrips: Trip[] = data.map((t: any) => ({
          id: t.id,
          agencyId: t.agency_id,
          title: t.title,
          slug: t.slug,
          description: t.description,
          destination: t.destination,
          price: t.price,
          startDate: t.start_date,
          endDate: t.end_date,
          durationDays: t.duration_days,
          images: [], // Loaded separately
          category: t.category,
          tags: t.tags || [],
          travelerTypes: t.traveler_types || [],
          itinerary: t.itinerary,
          boardingPoints: t.boarding_points, // NEW
          paymentMethods: t.payment_methods,
          is_active: t.is_active,
          tripRating: t.trip_rating || 0,
          tripTotalReviews: t.trip_total_reviews || 0,
          included: t.included || [],
          notIncluded: t.not_included || [],
          views: t.views_count,
          sales: t.sales_count,
          featured: t.featured,
          featuredInHero: t.featured_in_hero,
          popularNearSP: t.popular_near_sp,
          operationalData: t.operational_data || {} // NEW
        }));
        
        // Fetch images separately to avoid join complexity or big payload
        const { data: imagesData } = await sb.from('trip_images').select('*');
        if (imagesData) {
            formattedTrips.forEach(trip => {
                const tripImages = imagesData
                    .filter((img: any) => img.trip_id === trip.id)
                    .sort((a: any, b: any) => a.position - b.position)
                    .map((img: any) => img.image_url);
                trip.images = tripImages;
            });
        }
        setTrips(formattedTrips);
      }
    } catch (error) {
      console.error("Error fetching trips:", error);
    }
  };

  const fetchAgencies = async () => {
      const sb = guardSupabase();
      if (!sb) return;
      try {
          const { data, error } = await sb.from('agencies').select('*');
          if (error) throw error;
          
          const formattedAgencies: Agency[] = (data || []).map((a: any) => ({
              id: a.user_id, // Auth User ID
              agencyId: a.id, // Agency Table PK
              name: a.name,
              email: a.email || '',
              role: UserRole.AGENCY,
              slug: a.slug || '',
              whatsapp: a.whatsapp,
              cnpj: a.cnpj, // Optional
              description: a.description || '',
              logo: a.logo_url || '',
              is_active: a.is_active,
              heroMode: a.hero_mode || 'TRIPS',
              heroBannerUrl: a.hero_banner_url,
              heroTitle: a.hero_title,
              heroSubtitle: a.hero_subtitle,
              customSettings: a.custom_settings || {},
              subscriptionStatus: a.subscription_status || (a.is_active ? 'ACTIVE' : 'INACTIVE'),
              subscriptionPlan: a.subscription_plan || 'BASIC',
              subscriptionExpiresAt: a.subscription_expires_at || new Date().toISOString(),
              website: a.website,
              phone: a.phone,
              address: a.address || {},
              bankInfo: a.bank_info || {}
          }));
          setAgencies(formattedAgencies);
      } catch (error) {
          console.error("Error fetching agencies:", error);
      }
  };

  const fetchBookings = async () => {
    const sb = guardSupabase();
    if (!sb) return;
    try {
        // Simplified fetch to avoid huge join issues if schema drifts
        const { data, error } = await sb
            .from('bookings')
            .select(`
              *, 
              trips (
                id, 
                title, 
                agency_id,
                destination,
                price,
                start_date,
                end_date,
                duration_days,
                category,
                tags,
                traveler_types,
                itinerary,
                payment_methods,
                is_active,
                trip_rating,
                trip_total_reviews,
                included,
                not_included,
                views_count,
                sales_count,
                featured,
                featured_in_hero,
                popular_near_sp,
                operational_data
              )
            `);
            
        if (error) {
             if (error.code === '42703') console.warn("Schema mismatch (bookings), using mocks.");
             else throw error;
        }

        if (data) {
             // We need agency info for bookings. Map from loaded agencies state.
             const formattedBookings: Booking[] = data.map((b: any) => {
                 const tripAgencyId = b.trips?.agency_id;
                 // Find the agency object from our already loaded state (requires fetchAgencies to run first/parallel)
                 // This is safer than deep nesting in one query if relationships are fragile
                 // However, inside map we can't access the updated state immediately if running in parallel.
                 // But fetchBookings runs after mount. We will rely on agency_id join if possible or post-process.
                 
                 // Let's try to map minimal trip info
                 const tripData = b.trips ? {
                     id: b.trips.id,
                     agencyId: b.trips.agency_id,
                     title: b.trips.title,
                     destination: b.trips.destination,
                     startDate: b.trips.start_date,
                     endDate: b.trips.end_date,
                     durationDays: b.trips.duration_days,
                     price: b.trips.price,
                     images: [], // Placeholder
                     category: b.trips.category,
                     tags: b.trips.tags || [],
                     travelerTypes: b.trips.traveler_types || [],
                     is_active: b.trips.is_active,
                     tripRating: b.trips.trip_rating || 0,
                     tripTotalReviews: b.trips.trip_total_reviews || 0,
                     included: b.trips.included || [],
                     notIncluded: b.trips.not_included || [],
                     operationalData: b.trips.operational_data || {}
                 } as Trip : undefined;

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
                    // _agency will be hydrated in UI components using useData().agencies
                 };
             });
             setBookings(formattedBookings);
        }
    } catch (error) {
        console.error("Error fetching bookings:", error);
    }
  };

  const fetchReviews = async () => {
      const sb = guardSupabase();
      if (!sb) return;
      try {
          const { data, error } = await sb.from('agency_reviews').select('*');
          if (error) throw error;
          
          if (data) {
               const formattedReviews: AgencyReview[] = data.map((r: any) => ({
                   id: r.id,
                   agencyId: r.agency_id,
                   clientId: r.client_id,
                   bookingId: r.booking_id,
                   trip_id: r.trip_id,
                   rating: r.rating,
                   comment: r.comment,
                   tags: r.tags || [],
                   createdAt: r.created_at,
                   response: r.response
                   // Client Name/Avatar needs to be joined or fetched
               }));
               
               // Hydrate with client names (simple approach)
               // In real app, use a join or separate fetch
               // Here we rely on clients state if available, or basic mock
               setAgencyReviews(formattedReviews);
          }
      } catch (error) {
           console.error("Error fetching reviews:", error);
      }
  };
  
  const fetchClients = async () => {
      const sb = guardSupabase();
      if (!sb) return;
      try {
          const { data, error } = await sb.from('profiles').select('*').eq('role', 'CLIENT');
          if (error) throw error;
          if (data) {
              const formattedClients: Client[] = data.map((c: any) => ({
                  id: c.id,
                  name: c.full_name,
                  email: c.email,
                  role: UserRole.CLIENT,
                  avatar: c.avatar_url,
                  cpf: c.cpf,
                  phone: c.phone,
                  favorites: [], // TODO: Load favorites table
                  createdAt: c.created_at,
                  address: c.address || {},
                  status: c.status || 'ACTIVE'
              }));
              setClients(formattedClients);
          }
      } catch (error) {
          console.error("Error fetching clients:", error);
      }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([
        fetchAgencies(),
        fetchTrips(),
        fetchClients(), 
        fetchBookings(),
        fetchReviews()
        // fetchAuditLogs(), 
        // fetchActivityLogs()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    if (supabase) {
        refreshData();
    } else {
        setLoading(false);
    }
  }, []);

  // --- ACTIONS ---

  const logActivity = async (actionType: ActivityActionType, details: any, agencyId?: string) => {
      const sb = guardSupabase();
      if (!sb || !user) return;
      try {
          await sb.rpc('log_activity', {
              p_user_id: user.id,
              p_actor_email: user.email,
              p_actor_role: user.role,
              p_action_type: actionType,
              p_details: details,
              p_agency_id: agencyId || (user.role === 'AGENCY' ? (user as Agency).agencyId : null)
          });
      } catch (e) {
          console.error("Failed to log activity", e);
      }
  };

  const createTrip = async (trip: Trip) => {
    const sb = guardSupabase();
    if (!sb) { setTrips([...trips, trip]); return; } // Offline fallback

    try {
       // Remove fields not in DB table or that are handled by DB defaults
       const { id, images, tripRating, tripTotalReviews, ...dbPayload } = trip;
       
       // Map JS camelCase to DB snake_case
       const insertData = {
           agency_id: dbPayload.agencyId,
           title: dbPayload.title,
           slug: dbPayload.slug,
           description: dbPayload.description,
           destination: dbPayload.destination,
           price: dbPayload.price,
           start_date: dbPayload.startDate,
           end_date: dbPayload.endDate,
           duration_days: dbPayload.durationDays,
           category: dbPayload.category,
           tags: dbPayload.tags,
           traveler_types: dbPayload.travelerTypes,
           is_active: dbPayload.is_active,
           included: dbPayload.included,
           not_included: dbPayload.notIncluded,
           featured: dbPayload.featured,
           featured_in_hero: dbPayload.featuredInHero,
           popular_near_sp: dbPayload.popularNearSP,
           itinerary: dbPayload.itinerary,
           payment_methods: dbPayload.paymentMethods,
           boarding_points: dbPayload.boardingPoints,
           operational_data: dbPayload.operationalData
       };

       const { data, error } = await sb.from('trips').insert(insertData).select().single();
       
       if (error) throw error;

       // Insert Images
       if (images && images.length > 0 && data) {
           const imgPayload = images.map((url, idx) => ({
               trip_id: data.id,
               image_url: url,
               position: idx
           }));
           const { error: imgError } = await sb.from('trip_images').insert(imgPayload);
           if (imgError) console.error("Error saving images", imgError);
       }

       await refreshData();
       logActivity('TRIP_CREATED', { tripId: data.id, title: trip.title });

    } catch (error: any) {
        showToast(`Erro ao criar viagem: ${error.message}`, 'error');
        throw error;
    }
  };

  const updateTrip = async (trip: Trip) => {
      const sb = guardSupabase();
      if (!sb) { setTrips(trips.map(t => t.id === trip.id ? trip : t)); return; }
      
      try {
         const { id, images, tripRating, tripTotalReviews, agencyId, ...dbPayload } = trip;

         const updateData = {
           title: dbPayload.title,
           slug: dbPayload.slug,
           description: dbPayload.description,
           destination: dbPayload.destination,
           price: dbPayload.price,
           start_date: dbPayload.startDate,
           end_date: dbPayload.endDate,
           duration_days: dbPayload.durationDays,
           category: dbPayload.category,
           tags: dbPayload.tags,
           traveler_types: dbPayload.travelerTypes,
           is_active: dbPayload.is_active,
           included: dbPayload.included,
           not_included: dbPayload.notIncluded,
           featured: dbPayload.featured,
           featured_in_hero: dbPayload.featuredInHero,
           popular_near_sp: dbPayload.popularNearSP,
           itinerary: dbPayload.itinerary,
           payment_methods: dbPayload.paymentMethods,
           boarding_points: dbPayload.boardingPoints,
           operational_data: dbPayload.operationalData
         };

         const { error } = await sb.from('trips').update(updateData).eq('id', id);
         if (error) throw error;

         // Handle Images (Simple replacement strategy: delete all, insert all)
         // Ideally we would diff, but this ensures order and content match form
         if (images) {
             await sb.from('trip_images').delete().eq('trip_id', id);
             if (images.length > 0) {
                const imgPayload = images.map((url, idx) => ({
                    trip_id: id,
                    image_url: url,
                    position: idx
                }));
                await sb.from('trip_images').insert(imgPayload);
             }
         }

         await refreshData();
         logActivity('TRIP_UPDATED', { tripId: id, title: trip.title });

      } catch (error: any) {
          showToast(`Erro ao atualizar: ${error.message}`, 'error');
          throw error;
      }
  };

  const deleteTrip = async (tripId: string) => {
      const sb = guardSupabase();
      if (!sb) { setTrips(trips.filter(t => t.id !== tripId)); return; }
      try {
          const { error } = await sb.from('trips').delete().eq('id', tripId);
          if (error) throw error;
          setTrips(prev => prev.filter(t => t.id !== tripId));
          logActivity('TRIP_DELETED', { tripId });
      } catch (error: any) {
          showToast(error.message, 'error');
      }
  };

  const toggleTripStatus = async (tripId: string) => {
      const trip = trips.find(t => t.id === tripId);
      if (trip) {
          await updateTrip({ ...trip, is_active: !trip.is_active });
          logActivity('TRIP_STATUS_TOGGLED', { tripId, newStatus: !trip.is_active });
      }
  };

  const toggleTripFeatureStatus = async (tripId: string) => {
      const trip = trips.find(t => t.id === tripId);
      if (trip) {
          await updateTrip({ ...trip, featured: !trip.featured });
      }
  };

  // --- CLIENT ACTIONS ---
  
  const updateClientProfile = async (userId: string, data: Partial<Client>) => {
     // This is usually handled by AuthContext updateUser, but if admin updates client:
     const sb = guardSupabase();
     if (!sb) return; // Local state update only if offline logic existed
     
     try {
         const updateData: any = {};
         if (data.name) updateData.full_name = data.name;
         if (data.phone) updateData.phone = data.phone;
         if (data.cpf) updateData.cpf = data.cpf;
         if (data.address) updateData.address = data.address;
         if (data.status) updateData.status = data.status;

         const { error } = await sb.from('profiles').update(updateData).eq('id', userId);
         if (error) throw error;
         
         setClients(prev => prev.map(c => c.id === userId ? { ...c, ...data } : c));
         logActivity('CLIENT_PROFILE_UPDATED', { userId, changes: Object.keys(data) });

     } catch (error: any) {
         showToast(error.message, 'error');
         throw error;
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
        
        // OPTIMIZATION: Update local state immediately instead of full refresh
        setBookings(prev => [...prev, formattedData]);
        
        // Background logging, don't await
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

  // ... (Rest of the context logic - updateAgencySubscription, etc. mostly DB calls)

  // Update Agency Subscription
  const updateAgencySubscription = async (agencyId: string, status: string, plan: string, expiresAt?: string) => {
      const sb = guardSupabase();
      if (!sb) return;
      try {
          // This might need RPC if updating subscription implies payment logic
          const { error } = await sb.from('agencies').update({
              subscription_status: status,
              subscription_plan: plan,
              subscription_expires_at: expiresAt
          }).eq('id', agencyId); // Agency ID (PK)
          
          if (error) throw error;
          setAgencies(prev => prev.map(a => a.agencyId === agencyId ? { ...a, subscriptionStatus: status as any, subscriptionPlan: plan as any, subscriptionExpiresAt: expiresAt || a.subscriptionExpiresAt } : a));
          logActivity('AGENCY_SUBSCRIPTION_UPDATED', { agencyId, plan, status });

      } catch (error: any) {
          showToast(error.message, 'error');
      }
  };

  // Update Agency Profile (Admin)
  const updateAgencyProfileByAdmin = async (agencyId: string, data: Partial<Agency>) => {
       const sb = guardSupabase();
       if (!sb) return;
       try {
           const updateData: any = {};
           // Map fields
           if (data.name) updateData.name = data.name;
           if (data.description) updateData.description = data.description;
           if (data.whatsapp) updateData.whatsapp = data.whatsapp;
           if (data.website) updateData.website = data.website;
           if (data.slug) updateData.slug = data.slug;
           if (data.cnpj) updateData.cnpj = data.cnpj;
           if (data.logo) updateData.logo_url = data.logo;
           
           const { error } = await sb.from('agencies').update(updateData).eq('id', agencyId);
           if (error) throw error;
           
           setAgencies(prev => prev.map(a => a.agencyId === agencyId ? { ...a, ...data } : a));
           logActivity('AGENCY_PROFILE_UPDATED', { agencyId, adminAction: true });
       } catch (error: any) {
           showToast(error.message, 'error');
       }
  };

  const toggleAgencyStatus = async (agencyId: string) => {
      const agency = agencies.find(a => a.agencyId === agencyId);
      if (agency) {
          const newStatus = agency.subscriptionStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
          await updateAgencySubscription(agencyId, newStatus, agency.subscriptionPlan);
          logActivity('AGENCY_STATUS_TOGGLED', { agencyId, newStatus });
      }
  };

  // Reviews
  const addAgencyReview = async (review: Partial<AgencyReview>) => {
      const sb = guardSupabase();
      if (!sb) return;
      try {
          const { error } = await sb.from('agency_reviews').insert({
              agency_id: review.agencyId,
              client_id: review.clientId,
              booking_id: review.bookingId,
              trip_id: review.trip_id, // Optional if not linked to specific trip
              rating: review.rating,
              comment: review.comment,
              tags: review.tags
          });
          if (error) throw error;
          await refreshData(); // Refresh to get new review
          logActivity('REVIEW_SUBMITTED', { agencyId: review.agencyId, rating: review.rating });
      } catch (error: any) {
          showToast(error.message, 'error');
          throw error;
      }
  };

  const deleteAgencyReview = async (id: string) => {
      const sb = guardSupabase();
      if (!sb) return;
      try {
          await sb.from('agency_reviews').delete().eq('id', id);
          setAgencyReviews(prev => prev.filter(r => r.id !== id));
          logActivity('REVIEW_DELETED', { reviewId: id });
      } catch (e: any) { showToast(e.message, 'error'); }
  };

  const updateAgencyReview = async (id: string, updates: Partial<AgencyReview>) => {
      const sb = guardSupabase();
      if (!sb) return;
      try {
          await sb.from('agency_reviews').update({
              rating: updates.rating,
              comment: updates.comment,
              tags: updates.tags,
              response: updates.response
          }).eq('id', id);
          setAgencyReviews(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
          logActivity('REVIEW_UPDATED', { reviewId: id });
      } catch (e: any) { showToast(e.message, 'error'); }
  };
  
  const toggleFavorite = async (tripId: string, userId: string) => {
      const sb = guardSupabase();
      if (!sb) {
          // Local fallback
          setClients(prev => prev.map(c => c.id === userId ? { ...c, favorites: c.favorites.includes(tripId) ? c.favorites.filter(id => id !== tripId) : [...c.favorites, tripId] } : c));
          return;
      }
      try {
          // Check existence
          const { data } = await sb.from('favorites').select('*').eq('user_id', userId).eq('trip_id', tripId).single();
          
          if (data) {
              await sb.from('favorites').delete().eq('user_id', userId).eq('trip_id', tripId);
              // Update local
              setClients(prev => prev.map(c => c.id === userId ? { ...c, favorites: c.favorites.filter(id => id !== tripId) } : c));
          } else {
              await sb.from('favorites').insert({ user_id: userId, trip_id: tripId });
               // Update local
              setClients(prev => prev.map(c => c.id === userId ? { ...c, favorites: [...c.favorites, tripId] } : c));
          }
          logActivity('FAVORITE_TOGGLED', { tripId });
      } catch (e: any) { console.error(e); }
  };
  
  // Helpers
  const getPublicTrips = () => trips.filter(t => t.is_active);
  const getAgencyPublicTrips = (agencyId: string) => trips.filter(t => t.agencyId === agencyId && t.is_active);
  const getAgencyTrips = (agencyId: string) => trips.filter(t => t.agencyId === agencyId);
  const getTripById = (id: string) => trips.find(t => t.id === id);
  const getTripBySlug = (slug: string) => trips.find(t => t.slug === slug);
  const getAgencyBySlug = (slug: string) => agencies.find(a => a.slug === slug);
  const getReviewsByAgencyId = (id: string) => agencyReviews.filter(r => r.agencyId === id);
  const getReviewsByClientId = (id: string) => agencyReviews.filter(r => r.clientId === id);
  const getAgencyStats = (agencyId: string) => {
      const agencyTrips = trips.filter(t => t.agencyId === agencyId);
      const agencyBookings = bookings.filter(b => b._trip?.agencyId === agencyId); // Need _trip populated or tripId lookup
      // Better: filter bookings by checking tripId in agencyTrips list
      const tripIds = agencyTrips.map(t => t.id);
      const filteredBookings = bookings.filter(b => tripIds.includes(b.tripId));
      const confirmedBookings = filteredBookings.filter(b => b.status === 'CONFIRMED');
      
      const reviews = agencyReviews.filter(r => r.agencyId === agencyId);
      
      return {
          totalRevenue: confirmedBookings.reduce((acc, b) => acc + b.totalPrice, 0),
          totalSales: confirmedBookings.length,
          totalViews: agencyTrips.reduce((acc, t) => acc + (t.views || 0), 0),
          conversionRate: 0, // Calculate if views > 0
          averageRating: reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0,
          totalReviews: reviews.length
      };
  };

  // Theme
  const getAgencyTheme = async (agencyId: string) => {
      const sb = guardSupabase();
      if (!sb) return null;
      const { data } = await sb.from('agency_themes').select('colors').eq('agency_id', agencyId).single();
      return data ? { agencyId, colors: data.colors } : null;
  };

  const saveAgencyTheme = async (agencyId: string, colors: ThemeColors) => {
      const sb = guardSupabase();
      if (!sb) return false;
      const { error } = await sb.from('agency_themes').upsert({ agency_id: agencyId, colors }, { onConflict: 'agency_id' });
      if (error) throw error;
      return true;
  };
  
  const incrementTripViews = async (tripId: string) => {
      // Debounce or just fire and forget
      const sb = guardSupabase();
      if(sb) await sb.rpc('increment_trip_views', { trip_id: tripId });
  };

  const updateTripOperationalData = async (tripId: string, data: OperationalData) => {
    setTrips(prev => prev.map(t => t.id === tripId ? { ...t, operationalData: data } : t));
    try {
        if (supabase) {
            const { error } = await supabase.from('trips').update({ operational_data: data }).eq('id', tripId);
            if (error) throw error;
        }
    } catch (error) {
        console.error(error);
        showToast('Erro ao salvar dados operacionais no backend (modo local mantido).', 'warning');
    }
  };

  const values: DataContextType = {
    trips, agencies, bookings, reviews: MOCK_REVIEWS, agencyReviews, clients, auditLogs, activityLogs, loading,
    addBooking,
    addReview: async () => {},
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
    softDeleteEntity: async () => {},
    restoreEntity: async () => {},
    deleteUser: async (id) => setClients(prev => prev.filter(c => c.id !== id)),
    deleteMultipleUsers: async (ids) => setClients(prev => prev.filter(c => !ids.includes(c.id))),
    deleteMultipleAgencies: async (ids) => setAgencies(prev => prev.filter(a => !ids.includes(a.agencyId))),
    getUsersStats: async () => [],
    updateMultipleUsersStatus: async () => {},
    updateMultipleAgenciesStatus: async () => {},
    logAuditAction: async () => {},
    sendPasswordReset: async () => {},
    updateUserAvatarByAdmin: async () => null,
    getPublicTrips,
    getAgencyPublicTrips,
    getAgencyTrips,
    getTripById,
    getTripBySlug,
    getAgencyBySlug,
    getReviewsByTripId: () => [],
    getReviewsByAgencyId,
    getReviewsByClientId,
    hasUserPurchasedTrip: () => false,
    getAgencyStats,
    getAgencyTheme,
    saveAgencyTheme,
    refreshData,
    incrementTripViews
  };

  return (
    <DataContext.Provider value={values}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
