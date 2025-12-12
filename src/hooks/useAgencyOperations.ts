import { useCallback } from 'react';
import { Agency } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabase';
import { logger } from '../utils/logger';

/**
 * Custom hook for Agency operations
 * Extracted from DataContext to reduce complexity
 */
export const useAgencyOperations = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const updateAgencySubscription = useCallback(async (agencyId: string, status: string, plan: string, expiresAt?: string) => {
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
      const updateData: any = {
        subscription_status: status,
        subscription_plan: plan,
      };

      if (expiresAt) {
        updateData.subscription_expires_at = expiresAt;
      }

      const { error } = await sb
        .from('agencies')
        .update(updateData)
        .eq('id', agencyId);

      if (error) throw error;

      showToast('Plano atualizado com sucesso!', 'success');
      logger.log('[useAgencyOperations] Subscription updated:', agencyId);
    } catch (error: any) {
      logger.error('[useAgencyOperations] Error updating subscription:', error);
      showToast(`Erro ao atualizar plano: ${error.message}`, 'error');
      throw error;
    }
  }, [user, showToast]);

  const updateAgencyProfileByAdmin = useCallback(async (agencyId: string, data: Partial<Agency>) => {
    if (!user || user.role !== 'ADMIN') {
      showToast('Apenas administradores podem atualizar agências', 'error');
      return;
    }

    const sb = supabase;
    if (!sb) {
      showToast('Erro de configuração do banco de dados', 'error');
      return;
    }

    try {
      const updateData: any = {};
      
      if (data.name) updateData.name = data.name;
      if (data.description) updateData.description = data.description;
      if (data.cnpj) updateData.cnpj = data.cnpj;
      if (data.slug) updateData.slug = data.slug;
      if (data.phone) updateData.phone = data.phone;
      if (data.whatsapp) updateData.whatsapp = data.whatsapp;
      if (data.website) updateData.website = data.website;
      if (data.address) updateData.address = data.address;
      if (data.bankInfo) updateData.bank_info = data.bankInfo;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;

      const { error } = await sb
        .from('agencies')
        .update(updateData)
        .eq('id', agencyId);

      if (error) throw error;

      showToast('Agência atualizada com sucesso!', 'success');
      logger.log('[useAgencyOperations] Agency updated by admin:', agencyId);
    } catch (error: any) {
      logger.error('[useAgencyOperations] Error updating agency:', error);
      showToast(`Erro ao atualizar agência: ${error.message}`, 'error');
      throw error;
    }
  }, [user, showToast]);

  const adminChangePlan = useCallback(async (agencyId: string, newPlan: 'BASIC' | 'PREMIUM') => {
    if (!user || user.role !== 'ADMIN') {
      showToast('Apenas administradores podem alterar planos', 'error');
      return;
    }

    const sb = supabase;
    if (!sb) {
      showToast('Erro de configuração do banco de dados', 'error');
      return;
    }

    try {
      // Calculate expiration date (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error } = await sb
        .from('agencies')
        .update({
          subscription_plan: newPlan,
          subscription_status: 'ACTIVE',
          subscription_expires_at: expiresAt.toISOString(),
        })
        .eq('id', agencyId);

      if (error) throw error;

      showToast(`Plano alterado para ${newPlan} com sucesso!`, 'success');
      logger.log('[useAgencyOperations] Plan changed by admin:', agencyId, newPlan);
    } catch (error: any) {
      logger.error('[useAgencyOperations] Error changing plan:', error);
      showToast(`Erro ao alterar plano: ${error.message}`, 'error');
      throw error;
    }
  }, [user, showToast]);

  const adminSuspendAgency = useCallback(async (agencyId: string) => {
    if (!user || user.role !== 'ADMIN') {
      showToast('Apenas administradores podem suspender agências', 'error');
      return;
    }

    const sb = supabase;
    if (!sb) {
      showToast('Erro de configuração do banco de dados', 'error');
      return;
    }

    try {
      const { error } = await sb
        .from('agencies')
        .update({ is_active: false })
        .eq('id', agencyId);

      if (error) throw error;

      showToast('Agência suspensa com sucesso!', 'success');
      logger.log('[useAgencyOperations] Agency suspended:', agencyId);
    } catch (error: any) {
      logger.error('[useAgencyOperations] Error suspending agency:', error);
      showToast(`Erro ao suspender agência: ${error.message}`, 'error');
      throw error;
    }
  }, [user, showToast]);

  return {
    updateAgencySubscription,
    updateAgencyProfileByAdmin,
    adminChangePlan,
    adminSuspendAgency,
  };
};
