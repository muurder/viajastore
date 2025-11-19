
export enum UserRole {
  CLIENT = 'CLIENT',
  AGENCY = 'AGENCY',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Added for auth simulation
  role: UserRole;
  avatar?: string;
  createdAt?: string;
}

export interface Client extends User {
  role: UserRole.CLIENT;
  cpf?: string;
  phone?: string;
  favorites: string[]; // Trip IDs
  notificationsEnabled?: boolean;
}

export interface Agency extends User {
  role: UserRole.AGENCY;
  cnpj: string;
  description: string;
  logo: string;
  subscriptionStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  subscriptionPlan: 'BASIC' | 'PREMIUM';
  subscriptionExpiresAt: string; // ISO Date
  website?: string;
  phone?: string;
}

export interface Admin extends User {
  role: UserRole.ADMIN;
}

export interface Trip {
  id: string;
  agencyId: string;
  title: string;
  description: string;
  destination: string;
  price: number;
  startDate: string;
  endDate: string;
  durationDays: number;
  images: string[];
  category: 'PRAIA' | 'AVENTURA' | 'FAMILIA' | 'ROMANCE' | 'URBANO' | 'SOZINHO';
  active: boolean; // Controlled by agency
  rating: number;
  totalReviews: number;
  included: string[];
  notIncluded?: string[];
  views?: number; // For stats
  sales?: number; // For stats
}

export interface Booking {
  id: string;
  tripId: string;
  clientId: string;
  date: string; // Booking date
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
  totalPrice: number;
  passengers: number;
  voucherCode: string;
  paymentMethod: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
}

export interface Review {
  id: string;
  tripId: string;
  clientId: string;
  rating: number; // 1-5
  comment: string;
  date: string;
  clientName: string;
  response?: string; // Agency response
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
}
