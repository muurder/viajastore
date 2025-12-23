import { Agency, Client, Trip, Booking, AgencyReview } from '../../../types';

// Modal Props Interfaces
export interface AgenciesFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    agencies: Agency[];
    onAgencyClick: (agency: Agency) => void;
    onAgencyAction: (agency: Agency, action: string) => void;
    showAgencyTrash: boolean;
}

export interface UsersFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    users: Client[];
    onUserClick: (client: Client) => void;
    onUserAction: (client: Client, action: string) => void;
    showUserTrash: boolean;
}

export interface ClientDetailModalProps {
    isOpen: boolean;
    client: Client | null;
    onClose: () => void;
    onEdit: () => void;
    onAccessDashboard: (clientId: string) => void;
    bookings: Booking[];
    reviews: AgencyReview[];
    trips: Trip[];
}

export interface ClientDashboardPopupProps {
    isOpen: boolean;
    clientId: string | null;
    onClose: () => void;
}

export interface DashboardViewerProps {
    isOpen: boolean;
    type: 'client' | 'agency' | 'guide';
    entityId: string | null;
    entityName?: string;
    onClose: () => void;
}

export interface AgencyDetailModalProps {
    isOpen: boolean;
    agency: Agency | null;
    onClose: () => void;
    onEdit: () => void;
    bookings: Booking[];
    reviews: AgencyReview[];
    trips: Trip[];
}
