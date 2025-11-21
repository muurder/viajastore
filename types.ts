
export enum UserRole {
  CLIENT = 'CLIENT',
  AGENCY = 'AGENCY',
  ADMIN = 'ADMIN',
}

export interface Address {
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
}

export interface BankInfo {
  bank: string;
  agency: string;
  account: string;
  pixKey: string;
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
  address?: Address;
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
  address?: Address;
  bankInfo?: BankInfo;
}

export interface Admin extends User {
  role: UserRole.ADMIN;
}

// Updated Category List based on requirements (Removed SOZINHO)
export type TripCategory = 
  | 'PRAIA' 
  | 'AVENTURA' 
  | 'FAMILIA' 
  | 'ROMANTICO' 
  | 'URBANO' 
  | 'NATUREZA' 
  | 'CULTURA' 
  | 'GASTRONOMICO' 
  | 'VIDA_NOTURNA' 
  | 'VIAGEM_BARATA' 
  | 'ARTE';

// New Traveler Type definition
export type TravelerType = 
  | 'SOZINHO' 
  | 'CASAL' 
  | 'FAMILIA' 
  | 'AMIGOS' 
  | 'MOCHILAO' 
  | 'MELHOR_IDADE';

export interface ItineraryDay {
  day: number;
  title: string;
  description: string;
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
  
  // New Fields
  category: TripCategory;
  tags: string[]; // E.g., 'História', 'Trilhas', 'Ideal para viajar sozinho'
  travelerTypes: TravelerType[]; // E.g., ['SOZINHO', 'MOCHILAO']
  
  // Richer content
  itinerary?: ItineraryDay[];

  active: boolean; // Controlled by agency
  rating: number;
  totalReviews: number;
  included: string[];
  notIncluded?: string[];
  views?: number; // For stats
  sales?: number; // For stats
  
  // Featured Flags
  featured?: boolean;
  popularNearSP?: boolean;
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
