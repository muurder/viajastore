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
  password?: string; // Changed for auth simulation from `string` to `string | undefined`
  role: UserRole;
  avatar?: string;
  createdAt?: string;
  deleted_at?: string; // For soft delete
}

export interface Client extends User {
  role: UserRole.CLIENT;
  cpf?: string;
  phone?: string;
  favorites: string[]; // Trip IDs
  notificationsEnabled?: boolean;
  address?: Address;
  status?: 'ACTIVE' | 'SUSPENDED';
  last_sign_in_at?: string;
}

export interface Agency extends User {
  role: UserRole.AGENCY;
  agencyId: string; // The primary key of the 'agencies' table
  slug: string; // New field for multi-tenant URL
  whatsapp?: string; // New field for contact
  // Fix: Make cnpj optional as it's not collected during initial registration
  cnpj?: string; 
  description: string;
  logo: string;
  is_active?: boolean;
  
  // Hero / Microsite Config
  heroMode: 'TRIPS' | 'STATIC';
  heroBannerUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;

  // Custom Suggestions (Tags, Includes, etc saved by the agency)
  customSettings?: {
    tags?: string[];
    included?: string[];
    notIncluded?: string[];
    paymentMethods?: string[];
  };

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
  slug: string; // SEO friendly URL
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
  paymentMethods?: string[]; // New field for accepted payment methods

  is_active: boolean; // Controlled by agency
  rating?: number; // Made optional
  totalReviews?: number; // Made optional
  included: string[];
  notIncluded?: string[];
  views?: number; // For stats
  sales?: number; // For stats
  
  // Featured Flags
  featured?: boolean; // Global feature
  featuredInHero?: boolean; // Agency Microsite Hero feature
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
  _trip?: Trip; 
  _agency?: Agency; // Expanded agency data
}

// Legacy Trip Review (Deprecated - Use AgencyReview)
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

// New Agency Review Table
export interface AgencyReview {
  id: string;
  agencyId: string;
  clientId: string;
  bookingId?: string;
  trip_id?: string;
  rating: number; // 1-5
  comment: string;
  tags?: string[];
  createdAt: string;
  clientName?: string; // Joined
  clientAvatar?: string; // Added for display
  agencyName?: string; // Joined for client view
  agencyLogo?: string; // Joined for client view
  response?: string;
  tripTitle?: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
}

// --- NEW MASTER ADMIN TYPES ---

export interface ThemeColors {
  primary: string; // Hex Code
  secondary: string; // Hex Code
  background: string;
  text: string;
}

export interface ThemePalette {
  id: string;
  name: string;
  colors: ThemeColors;
  isActive: boolean;
  isDefault: boolean;
}

export interface AgencyTheme {
  agencyId: string;
  colors: ThemeColors;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  adminEmail: string;
  action: string; // 'DELETE_USER', 'CHANGE_THEME', etc.
  details: string;
  createdAt: string;
}

export interface UserStats {
  userId: string;
  userName: string;
  totalSpent: number;
  totalBookings: number;
  totalReviews: number;
}

// Fix: Add averageRating and totalReviews to DashboardStats
export interface DashboardStats {
  totalRevenue: number;
  totalViews: number;
  totalSales: number;
  conversionRate: number;
  averageRating?: number;
  totalReviews?: number;
}

// --- NOVO: TIPOS PARA LOGS DE ATIVIDADE ---
export type ActivityActorRole = 'CLIENT' | 'AGENCY' | 'ADMIN';
export type ActivityActionType =
  | 'TRIP_VIEWED'
  | 'BOOKING_CREATED'
  | 'BOOKING_CANCELLED'
  | 'REVIEW_SUBMITTED'
  | 'REVIEW_UPDATED'
  | 'REVIEW_DELETED'
  | 'FAVORITE_TOGGLED'
  | 'TRIP_CREATED'
  | 'TRIP_UPDATED'
  | 'TRIP_DELETED'
  | 'TRIP_STATUS_TOGGLED'
  | 'TRIP_FEATURE_TOGGLED'
  | 'AGENCY_PROFILE_UPDATED'
  | 'AGENCY_STATUS_TOGGLED'
  | 'AGENCY_SUBSCRIPTION_UPDATED'
  | 'CLIENT_PROFILE_UPDATED'
  | 'PASSWORD_RESET_INITIATED'
  | 'ACCOUNT_DELETED'
  | 'ADMIN_USER_MANAGED'
  | 'ADMIN_AGENCY_MANAGED'
  | 'ADMIN_THEME_MANAGED'
  | 'ADMIN_MOCK_DATA_MIGRATED'
  | 'ADMIN_ACTION';

export interface ActivityLog {
  id: string;
  user_id: string | null;
  agency_id: string | null;
  actor_email: string;
  actor_role: ActivityActorRole;
  action_type: ActivityActionType;
  details: any;
  created_at: string;
  // Campos adicionais (denormalizados/join) para exibição:
  user_name?: string;
  user_avatar?: string;
  agency_name?: string;
  agency_logo?: string;
  trip_title?: string;
}