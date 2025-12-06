
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

export type TripCategory = 
  | 'PRAIA' | 'AVENTURA' | 'FAMILIA' | 'ROMANTICO' | 'URBANO' | 'NATUREZA' | 'CULTURA' | 'GASTRONOMICO' | 'VIDA_NOTURNA' | 'VIAGEM_BARATA' | 'ARTE';

export type TravelerType = 
  | 'SOZINHO' | 'CASAL' | 'FAMILIA' | 'AMIGOS' | 'MOCHILAO' | 'MELHOR_IDADE';

export interface ItineraryDay {
  day: number;
  title: string;
  description: string;
}

// --- OPERATIONAL TYPES ---

export interface BoardingPoint {
  id: string;
  time: string;
  location: string;
  address?: string;
}

// Updated definitions for Transport
export interface PassengerSeat {
  seatNumber: string; // Changed to string to allow "1A", "Motorista", etc if needed, or just "1"
  passengerName: string;
  bookingId: string;
  status: 'occupied' | 'blocked' | 'available';
  gender?: 'M' | 'F' | 'OTHER'; // Useful for room sharing logic later
}

export interface TransportConfig {
  type: 'BUS_46' | 'BUS_50' | 'MICRO_26' | 'VAN_15'; // Templates
  customRows?: number; // For custom grid
  customCols?: number; // For custom grid (usually 4 for bus)
  seats: PassengerSeat[]; // Array of assigned seats
}

export interface RoomConfig {
  id: string;
  name: string; // "Quarto 10" or "Suíte Master"
  type: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'QUAD' | 'COLLECTIVE';
  capacity: number;
  guests: { 
      name: string; 
      bookingId: string;
      avatar?: string;
  }[];
}

export interface OperationalData {
  transport?: TransportConfig;
  rooming?: RoomConfig[];
  notes?: string;
}

export interface Trip {
  id: string;
  agencyId: string;
  title: string;
  slug: string;
  description: string;
  destination: string;
  price: number;
  startDate: string;
  endDate: string;
  durationDays: number;
  images: string[];
  category: TripCategory;
  tags: string[];
  travelerTypes: TravelerType[];
  itinerary?: ItineraryDay[];
  boardingPoints?: BoardingPoint[];
  paymentMethods?: string[];
  is_active: boolean;
  tripRating?: number;
  tripTotalReviews?: number;
  included: string[];
  notIncluded?: string[];
  views?: number;
  sales?: number;
  featured?: boolean;
  featuredInHero?: boolean;
  popularNearSP?: boolean;
  operationalData?: OperationalData;
}

export interface Booking {
  id: string;
  tripId: string;
  clientId: string;
  date: string;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
  totalPrice: number;
  passengers: number;
  voucherCode: string;
  paymentMethod: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  _trip?: Trip; 
  _agency?: Agency;
}

export interface Review {
  id: string;
  tripId: string;
  clientId: string;
  rating: number;
  comment: string;
  date: string;
  clientName: string;
  response?: string;
}

export interface AgencyReview {
  id: string;
  agencyId: string;
  clientId: string;
  bookingId?: string;
  trip_id?: string;
  rating: number;
  comment: string;
  tags?: string[];
  createdAt: string;
  clientName?: string;
  clientAvatar?: string;
  agencyName?: string;
  agencyLogo?: string;
  response?: string;
  tripTitle?: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
}

export interface ThemeColors {
  primary: string;
  secondary: string;
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
  action: string;
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

export interface DashboardStats {
  totalRevenue: number;
  totalViews: number;
  totalSales: number;
  conversionRate: number;
  averageRating?: number;
  totalReviews?: number;
}

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
  | 'ADMIN_ACTION'
  | 'TRIP_OPERATIONAL_UPDATE'; // Added new type

export interface ActivityLog {
  id: string;
  user_id: string | null;
  agency_id: string | null;
  actor_email: string;
  actor_role: ActivityActorRole;
  action_type: ActivityActionType;
  details: any;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
  agency_name?: string;
  agency_logo?: string;
  trip_title?: string;
}
