import { useState, useCallback } from 'react';
import { Agency, Client } from '../../../types';

interface ModalState<T> {
    isOpen: boolean;
    data: T | null;
}

/**
 * Custom hook for managing all modal states in AdminDashboard
 * Centralizes modal open/close logic and state
 */
export const useAdminModals = () => {
    // Filter modals
    const [agenciesFilterModal, setAgenciesFilterModal] = useState<{
        isOpen: boolean;
        title: string;
        agencies: Agency[];
        showTrash: boolean;
    }>({
        isOpen: false,
        title: '',
        agencies: [],
        showTrash: false
    });

    const [usersFilterModal, setUsersFilterModal] = useState<{
        isOpen: boolean;
        title: string;
        users: Client[];
        showTrash: boolean;
    }>({
        isOpen: false,
        title: '',
        users: [],
        showTrash: false
    });

    // Detail modals
    const [agencyDetailModal, setAgencyDetailModal] = useState<ModalState<Agency>>({
        isOpen: false,
        data: null
    });

    const [clientDetailModal, setClientDetailModal] = useState<ModalState<Client>>({
        isOpen: false,
        data: null
    });

    // Dashboard viewer (impersonation)
    const [dashboardViewer, setDashboardViewer] = useState<{
        isOpen: boolean;
        type: 'client' | 'agency' | 'guide';
        entityId: string | null;
        entityName?: string;
    }>({
        isOpen: false,
        type: 'client',
        entityId: null
    });

    // Confirm dialog
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'danger' | 'warning' | 'info';
        confirmText?: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        variant: 'info'
    });

    // Action handlers
    const openAgenciesFilter = useCallback((title: string, agencies: Agency[], showTrash: boolean = false) => {
        setAgenciesFilterModal({ isOpen: true, title, agencies, showTrash });
    }, []);

    const closeAgenciesFilter = useCallback(() => {
        setAgenciesFilterModal(prev => ({ ...prev, isOpen: false }));
    }, []);

    const openUsersFilter = useCallback((title: string, users: Client[], showTrash: boolean = false) => {
        setUsersFilterModal({ isOpen: true, title, users, showTrash });
    }, []);

    const closeUsersFilter = useCallback(() => {
        setUsersFilterModal(prev => ({ ...prev, isOpen: false }));
    }, []);

    const openAgencyDetail = useCallback((agency: Agency) => {
        setAgencyDetailModal({ isOpen: true, data: agency });
    }, []);

    const closeAgencyDetail = useCallback(() => {
        setAgencyDetailModal({ isOpen: false, data: null });
    }, []);

    const openClientDetail = useCallback((client: Client) => {
        setClientDetailModal({ isOpen: true, data: client });
    }, []);

    const closeClientDetail = useCallback(() => {
        setClientDetailModal({ isOpen: false, data: null });
    }, []);

    const openDashboardViewer = useCallback((
        type: 'client' | 'agency' | 'guide',
        entityId: string,
        entityName?: string
    ) => {
        setDashboardViewer({ isOpen: true, type, entityId, entityName });
    }, []);

    const closeDashboardViewer = useCallback(() => {
        setDashboardViewer(prev => ({ ...prev, isOpen: false }));
    }, []);

    const openConfirmDialog = useCallback((
        title: string,
        message: string,
        onConfirm: () => void,
        variant: 'danger' | 'warning' | 'info' = 'info',
        confirmText?: string
    ) => {
        setConfirmDialog({ isOpen: true, title, message, onConfirm, variant, confirmText });
    }, []);

    const closeConfirmDialog = useCallback(() => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    }, []);

    return {
        // States
        agenciesFilterModal,
        usersFilterModal,
        agencyDetailModal,
        clientDetailModal,
        dashboardViewer,
        confirmDialog,

        // Actions
        openAgenciesFilter,
        closeAgenciesFilter,
        openUsersFilter,
        closeUsersFilter,
        openAgencyDetail,
        closeAgencyDetail,
        openClientDetail,
        closeClientDetail,
        openDashboardViewer,
        closeDashboardViewer,
        openConfirmDialog,
        closeConfirmDialog,

        // Direct setters (for complex cases)
        setAgenciesFilterModal,
        setUsersFilterModal,
        setAgencyDetailModal,
        setClientDetailModal,
        setDashboardViewer,
        setConfirmDialog
    };
};
