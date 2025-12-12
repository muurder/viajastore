import { useCallback } from 'react';
import { Trip, OperationalData } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabase';
import { logger } from '../utils/logger';
import { slugify } from '../utils/slugify';
import { generateUniqueSlug } from '../utils/slugUtils';

/**
 * Custom hook for Trip CRUD operations
 * Extracted from DataContext to reduce complexity
 */
export const useTripManagement = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const createTrip = useCallback(async (trip: Trip) => {
    if (!user) {
      showToast('Usuário não autenticado', 'error');
      return;
    }

    const sb = supabase;
    if (!sb) {
      showToast('Erro de configuração do banco de dados', 'error');
      return;
    }

    try {
      // Generate unique slug
      const baseSlug = trip.slug || slugify(trip.title);
      const uniqueSlug = await generateUniqueSlug(baseSlug, trip.agencyId);

      const tripData: any = {
        agency_id: trip.agencyId,
        title: trip.title,
        description: trip.description,
        destination: trip.destination,
        price: trip.price,
        duration_days: trip.durationDays,
        start_date: trip.startDate,
        end_date: trip.endDate,
        images: trip.images || [],
        category: trip.category,
        tags: trip.tags || [],
        traveler_types: trip.travelerTypes || [],
        itinerary: trip.itinerary || [],
        payment_methods: trip.paymentMethods || [],
        included: trip.included || [],
        not_included: trip.notIncluded || [],
        featured: trip.featured || false,
        is_active: trip.is_active !== undefined ? trip.is_active : true,
        slug: uniqueSlug,
        boarding_points: trip.boardingPoints || [],
        latitude: trip.latitude,
        longitude: trip.longitude,
        operational_data: trip.operationalData || null,
      };

      const { data, error } = await sb.from('trips').insert(tripData).select().single();

      if (error) throw error;

      showToast('Pacote criado com sucesso!', 'success');
      logger.log('[useTripManagement] Trip created:', data.id);
      return data;
    } catch (error: any) {
      logger.error('[useTripManagement] Error creating trip:', error);
      showToast(`Erro ao criar pacote: ${error.message}`, 'error');
      throw error;
    }
  }, [user, showToast]);

  const updateTrip = useCallback(async (trip: Trip) => {
    if (!user) {
      showToast('Usuário não autenticado', 'error');
      return;
    }

    const sb = supabase;
    if (!sb) {
      showToast('Erro de configuração do banco de dados', 'error');
      return;
    }

    try {
      // Update slug if title changed
      let finalSlug = trip.slug;
      if (trip.title) {
        const baseSlug = slugify(trip.title);
        finalSlug = await generateUniqueSlug(baseSlug, trip.agencyId, trip.id);
      }

      const tripData: any = {
        title: trip.title,
        description: trip.description,
        destination: trip.destination,
        price: trip.price,
        duration_days: trip.durationDays,
        start_date: trip.startDate,
        end_date: trip.endDate,
        images: trip.images || [],
        category: trip.category,
        tags: trip.tags || [],
        traveler_types: trip.travelerTypes || [],
        itinerary: trip.itinerary || [],
        payment_methods: trip.paymentMethods || [],
        included: trip.included || [],
        not_included: trip.notIncluded || [],
        featured: trip.featured || false,
        is_active: trip.is_active !== undefined ? trip.is_active : true,
        slug: finalSlug,
        boarding_points: trip.boardingPoints || [],
        latitude: trip.latitude,
        longitude: trip.longitude,
        operational_data: trip.operationalData || null,
      };

      const { error } = await sb.from('trips').update(tripData).eq('id', trip.id);

      if (error) throw error;

      showToast('Pacote atualizado com sucesso!', 'success');
      logger.log('[useTripManagement] Trip updated:', trip.id);
    } catch (error: any) {
      logger.error('[useTripManagement] Error updating trip:', error);
      showToast(`Erro ao atualizar pacote: ${error.message}`, 'error');
      throw error;
    }
  }, [user, showToast]);

  const deleteTrip = useCallback(async (tripId: string) => {
    if (!user) {
      showToast('Usuário não autenticado', 'error');
      return;
    }

    const sb = supabase;
    if (!sb) {
      showToast('Erro de configuração do banco de dados', 'error');
      return;
    }

    try {
      const { error } = await sb.from('trips').delete().eq('id', tripId);

      if (error) throw error;

      showToast('Pacote excluído com sucesso!', 'success');
      logger.log('[useTripManagement] Trip deleted:', tripId);
    } catch (error: any) {
      logger.error('[useTripManagement] Error deleting trip:', error);
      showToast(`Erro ao excluir pacote: ${error.message}`, 'error');
      throw error;
    }
  }, [user, showToast]);

  const toggleTripStatus = useCallback(async (tripId: string) => {
    if (!user) {
      showToast('Usuário não autenticado', 'error');
      return;
    }

    const sb = supabase;
    if (!sb) {
      showToast('Erro de configuração do banco de dados', 'error');
      return;
    }

    try {
      // Get current trip status
      const { data: currentTrip, error: fetchError } = await sb
        .from('trips')
        .select('is_active')
        .eq('id', tripId)
        .single();

      if (fetchError) throw fetchError;

      const newStatus = !currentTrip.is_active;

      const { error } = await sb
        .from('trips')
        .update({ is_active: newStatus })
        .eq('id', tripId);

      if (error) throw error;

      showToast(`Pacote ${newStatus ? 'ativado' : 'desativado'} com sucesso!`, 'success');
      logger.log('[useTripManagement] Trip status toggled:', tripId, newStatus);
    } catch (error: any) {
      logger.error('[useTripManagement] Error toggling trip status:', error);
      showToast(`Erro ao alterar status: ${error.message}`, 'error');
      throw error;
    }
  }, [user, showToast]);

  const updateTripOperationalData = useCallback(async (tripId: string, data: OperationalData) => {
    if (!user) {
      showToast('Usuário não autenticado', 'error');
      return;
    }

    const sb = supabase;
    if (!sb) {
      showToast('Erro de configuração do banco de dados', 'error');
      return;
    }

    try {
      const { error } = await sb
        .from('trips')
        .update({ operational_data: data })
        .eq('id', tripId);

      if (error) throw error;

      showToast('Dados operacionais atualizados!', 'success');
      logger.log('[useTripManagement] Trip operational data updated:', tripId);
    } catch (error: any) {
      logger.error('[useTripManagement] Error updating operational data:', error);
      showToast(`Erro ao atualizar dados operacionais: ${error.message}`, 'error');
      throw error;
    }
  }, [user, showToast]);

  return {
    createTrip,
    updateTrip,
    deleteTrip,
    toggleTripStatus,
    updateTripOperationalData,
  };
};
