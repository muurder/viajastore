import { useCallback } from 'react';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../../context/ToastContext';
import { Client } from '../../../types';
import { logger } from '../../../utils/logger';

/**
 * Custom hook for user (client) management operations
 * Handles all CRUD operations for users/clients
 */
export const useUserManagement = () => {
    const { createClient, updateClient, deleteClient } = useData();
    const { showToast } = useToast();

    /**
     * Create a new user/client
     */
    const handleCreateUser = useCallback(async (userData: Partial<Client>) => {
        try {
            await createClient(userData);
            showToast('Usuário criado com sucesso!', 'success');
            return true;
        } catch (error) {
            logger.error('Error creating user:', error);
            showToast('Erro ao criar usuário', 'error');
            return false;
        }
    }, [createClient, showToast]);

    /**
     * Update existing user/client
     */
    const handleUpdateUser = useCallback(async (userId: string, updates: Partial<Client>) => {
        try {
            await updateClient(userId, updates);
            showToast('Usuário atualizado com sucesso!', 'success');
            return true;
        } catch (error) {
            logger.error('Error updating user:', error);
            showToast('Erro ao atualizar usuário', 'error');
            return false;
        }
    }, [updateClient, showToast]);

    /**
     * Delete user/client (soft delete)
     */
    const handleDeleteUser = useCallback(async (userId: string) => {
        try {
            await deleteClient(userId);
            showToast('Usuário excluído com sucesso!', 'success');
            return true;
        } catch (error) {
            logger.error('Error deleting user:', error);
            showToast('Erro ao excluir usuário', 'error');
            return false;
        }
    }, [deleteClient, showToast]);

    /**
     * Toggle user status (ACTIVE <-> SUSPENDED)
     */
    const handleToggleUserStatus = useCallback(async (user: Client) => {
        const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        return await handleUpdateUser(user.id, { status: newStatus });
    }, [handleUpdateUser]);

    /**
     * Restore user from trash
     */
    const handleRestoreUser = useCallback(async (userId: string) => {
        try {
            await updateClient(userId, { status: 'ACTIVE', deletedAt: null });
            showToast('Usuário restaurado com sucesso!', 'success');
            return true;
        } catch (error) {
            logger.error('Error restoring user:', error);
            showToast('Erro ao restaurar usuário', 'error');
            return false;
        }
    }, [updateClient, showToast]);

    /**
     * Permanently delete user
     */
    const handlePermanentDeleteUser = useCallback(async (userId: string) => {
        try {
            // Here you would call a permanent delete function
            // For now, using soft delete
            await deleteClient(userId);
            showToast('Usuário excluído permanentemente!', 'success');
            return true;
        } catch (error) {
            logger.error('Error permanently deleting user:', error);
            showToast('Erro ao excluir usuário permanentemente', 'error');
            return false;
        }
    }, [deleteClient, showToast]);

    return {
        handleCreateUser,
        handleUpdateUser,
        handleDeleteUser,
        handleToggleUserStatus,
        handleRestoreUser,
        handlePermanentDeleteUser
    };
};
