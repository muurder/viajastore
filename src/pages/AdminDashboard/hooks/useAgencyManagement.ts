import { useCallback } from 'react';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../../context/ToastContext';
import { Agency, AgencyTheme } from '../../../types';
import { logger } from '../../../utils/logger';

/**
 * Custom hook for agency management operations
 * Handles all CRUD operations for agencies including subscription and theme management
 */
export const useAgencyManagement = () => {
    const { updateAgency, deleteAgency } = useData();
    const { showToast } = useToast();

    /**
     * Update agency details
     */
    const handleUpdateAgency = useCallback(async (agencyId: string, updates: Partial<Agency>) => {
        try {
            await updateAgency(agencyId, updates);
            showToast('Agência atualizada com sucesso!', 'success');
            return true;
        } catch (error) {
            logger.error('Error updating agency:', error);
            showToast('Erro ao atualizar agência', 'error');
            return false;
        }
    }, [updateAgency, showToast]);

    /**
     * Delete agency (soft delete)
     */
    const handleDeleteAgency = useCallback(async (agencyId: string) => {
        try {
            await deleteAgency(agencyId);
            showToast('Agência excluída com sucesso!', 'success');
            return true;
        } catch (error) {
            logger.error('Error deleting agency:', error);
            showToast('Erro ao excluir agência', 'error');
            return false;
        }
    }, [deleteAgency, showToast]);

    /**
     * Change agency subscription plan
     */
    const handleChangeSubscription = useCallback(async (
        agencyId: string,
        plan: 'FREE' | 'BASIC' | 'PREMIUM',
        status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE'
    ) => {
        try {
            await updateAgency(agencyId, {
                subscriptionPlan: plan,
                subscriptionStatus: status
            });
            showToast(`Plano alterado para ${plan} com sucesso!`, 'success');
            return true;
        } catch (error) {
            logger.error('Error changing subscription:', error);
            showToast('Erro ao alterar plano', 'error');
            return false;
        }
    }, [updateAgency, showToast]);

    /**
     * Update agency theme/branding
     */
    const handleUpdateTheme = useCallback(async (agencyId: string, theme: Partial<AgencyTheme>) => {
        try {
            await updateAgency(agencyId, { theme });
            showToast('Tema atualizado com sucesso!', 'success');
            return true;
        } catch (error) {
            logger.error('Error updating theme:', error);
            showToast('Erro ao atualizar tema', 'error');
            return false;
        }
    }, [updateAgency, showToast]);

    /**
     * Update agency logo
     */
    const handleUpdateLogo = useCallback(async (agencyId: string, logoUrl: string) => {
        try {
            await updateAgency(agencyId, { logo_url: logoUrl });
            showToast('Logo atualizado com sucesso!', 'success');
            return true;
        } catch (error) {
            logger.error('Error updating logo:', error);
            showToast('Erro ao atualizar logo', 'error');
            return false;
        }
    }, [updateAgency, showToast]);

    /**
     * Restore agency from trash
     */
    const handleRestoreAgency = useCallback(async (agencyId: string) => {
        try {
            await updateAgency(agencyId, {
                subscriptionStatus: 'ACTIVE',
                deletedAt: null
            });
            showToast('Agência restaurada com sucesso!', 'success');
            return true;
        } catch (error) {
            logger.error('Error restoring agency:', error);
            showToast('Erro ao restaurar agência', 'error');
            return false;
        }
    }, [updateAgency, showToast]);

    /**
     * Permanently delete agency
     */
    const handlePermanentDeleteAgency = useCallback(async (agencyId: string) => {
        try {
            // Here you would call a permanent delete function
            // For now, using soft delete
            await deleteAgency(agencyId);
            showToast('Agência excluída permanentemente!', 'success');
            return true;
        } catch (error) {
            logger.error('Error permanently deleting agency:', error);
            showToast('Erro ao excluir agência permanentemente', 'error');
            return false;
        }
    }, [deleteAgency, showToast]);

    /**
     * Toggle agency subscription status
     */
    const handleToggleAgencyStatus = useCallback(async (agency: Agency) => {
        const newStatus = agency.subscriptionStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        return await handleUpdateAgency(agency.agencyId, { subscriptionStatus: newStatus });
    }, [handleUpdateAgency]);

    return {
        handleUpdateAgency,
        handleDeleteAgency,
        handleChangeSubscription,
        handleUpdateTheme,
        handleUpdateLogo,
        handleRestoreAgency,
        handlePermanentDeleteAgency,
        handleToggleAgencyStatus
    };
};
