import { useCallback } from 'react';
import { Booking } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabase';
import { logger } from '../utils/logger';

/**
 * Custom hook for Booking operations
 * Extracted from DataContext to reduce complexity
 */
export const useBookings = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const addBooking = useCallback(async (booking: Booking): Promise<Booking | undefined> => {
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
      const bookingData: any = {
        trip_id: booking.tripId,
        client_id: booking.clientId,
        agency_id: booking.agencyId,
        passengers: booking.passengers,
        total_price: booking.totalPrice,
        status: booking.status || 'PENDING',
        date: booking.date,
        payment_method: booking.paymentMethod,
        voucher_code: booking.voucherCode,
      };

      const { data, error } = await sb.from('bookings').insert(bookingData).select().single();

      if (error) throw error;

      showToast('Reserva criada com sucesso!', 'success');
      logger.log('[useBookings] Booking created:', data.id);
      
      return {
        id: data.id,
        tripId: data.trip_id,
        clientId: data.client_id,
        agencyId: data.agency_id,
        passengers: data.passengers,
        totalPrice: data.total_price,
        status: data.status,
        date: data.date,
        paymentMethod: data.payment_method,
        voucherCode: data.voucher_code,
        createdAt: data.created_at,
      } as Booking;
    } catch (error: any) {
      logger.error('[useBookings] Error creating booking:', error);
      showToast(`Erro ao criar reserva: ${error.message}`, 'error');
      throw error;
    }
  }, [user, showToast]);

  const updateBookingStatus = useCallback(async (bookingId: string, status: string) => {
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
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;

      showToast('Status da reserva atualizado!', 'success');
      logger.log('[useBookings] Booking status updated:', bookingId, status);
    } catch (error: any) {
      logger.error('[useBookings] Error updating booking status:', error);
      showToast(`Erro ao atualizar status: ${error.message}`, 'error');
      throw error;
    }
  }, [user, showToast]);

  return {
    addBooking,
    updateBookingStatus,
  };
};
