

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
  password?: string;
  role: UserRole;
  avatar?: string;
  createdAt?: string;
  deleted_at?: string;
}

export interface Client extends User {
  role: UserRole.CLIENT;
  cpf?: string;
  phone?: string;
  birthDate?: string;
  favorites: string[];
  notificationsEnabled?: boolean;
  address?: Address;
  status?: 'ACTIVE' | 'SUSPENDED';
  last_sign_in_at?: string;
}

export interface Agency extends User {
  role: UserRole.AGENCY;
  agencyId: string;
  slug: string;
  whatsapp?: string;
  cnpj?: string;
  description: string;
  logo: string;
  is_active?: boolean;
  heroMode: 'TRIPS' | 'STATIC';
  heroBannerUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  customSettings?: {
    tags?: string[];
    included?: string[];
    notIncluded?: string[];
    paymentMethods?: string[];
  };
  subscriptionStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  subscriptionPlan: 'STARTER' | 'BASIC' | 'PREMIUM';
  subscriptionExpiresAt: string;
  website?: string;
  phone?: string;
  address?: Address;
  bankInfo?: BankInfo;
}

export interface Admin extends User {
  role: UserRole.ADMIN;
}

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

export interface BoardingPoint {
  id: string;
  time: string;
  location: string;
}

export interface PassengerSeat {
  seatNumber: string; 
  passengerName: string;
  bookingId: string;
  status: 'occupied' | 'blocked' | 'available';
  gender?: 'M' | 'F' | 'OTHER';
}

// UPDATE: Added CAR_4 and VAN_20
export type VehicleType = 'CAR_4' | 'BUS_46' | 'BUS_50' | 'MICRO_26' | 'VAN_15' | 'VAN_20' | 'DD_60' | 'CUSTOM';

export interface VehicleLayoutConfig {
  type: VehicleType;
  label: string;
  totalSeats: number;
  cols: number;
  aisleAfterCol: number;
  lowerDeckSeats?: number;
}

export interface VehicleInstance {
  id: string;
  name: string;
  type: VehicleType; // Keep reference to type
  config: VehicleLayoutConfig;
  seats: PassengerSeat[];
}

export interface TransportConfig {
    // Deprecated single fields (kept for migration)
    vehicleConfig?: VehicleLayoutConfig | null;
    seats?: PassengerSeat[];
    
    // New Multi-Vehicle field
    vehicles?: VehicleInstance[];
}

export interface ManualPassenger {
    id: string;
    name: string;
    document?: string;
}

export interface PassengerDetail {
    name: string;
    document?: string;
    phone?: string;
    birthDate?: string; // Data de nascimento
    whatsapp?: string; // WhatsApp (pode ser diferente do phone)
}

export interface Guest {
    name: string;
    bookingId: string;
}

export interface RoomConfig {
    id: string;
    name: string;
    type: 'DOUBLE' | 'TRIPLE' | 'QUAD' | 'COLLECTIVE';
    capacity: number;
    guests: Guest[];
}

export interface HotelInstance {
    id: string;
    name: string;
    rooms: RoomConfig[];
}

export interface OperationalData {
    transport?: TransportConfig;
    rooming?: RoomConfig[]; // Deprecated (single list)
    hotels?: HotelInstance[]; // New (multiple hotels)
    manualPassengers?: ManualPassenger[];
    passengerNameOverrides?: Record<string, string>;
    passengerDetails?: Record<string, PassengerDetail>; // New detailed info
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
  rating?: number;
  totalReviews?: number;
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
  // Geolocation and capacity fields
  latitude?: number;
  longitude?: number;
  maxGuests?: number;
  allowChildren?: boolean;
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
  passengerDetails?: PassengerDetail[]; // Dados dos passageiros
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
  // Smart Site Builder fields
  fontPair?: 'modern' | 'classic' | 'playful';
  borderRadius?: 'none' | 'soft' | 'full';
  buttonStyle?: 'solid' | 'outline' | 'ghost';
  headerStyle?: 'transparent' | 'solid';
  backgroundImage?: string;
  backgroundBlur?: number; // 0-20
  backgroundOpacity?: number; // 0-1
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

// FIX: Changed from `type` to `enum` so it can be used as a value
export enum ActivityActionType {
    TRIP_CREATED = 'TRIP_CREATED',
    TRIP_UPDATED = 'TRIP_UPDATED',
    TRIP_DELETED = 'TRIP_DELETED',
    BOOKING_CREATED = 'BOOKING_CREATED',
    AGENCY_UPDATED = 'AGENCY_UPDATED',
    REVIEW_SUBMITTED = 'REVIEW_SUBMITTED',
    CLIENT_PROFILE_UPDATED = 'CLIENT_PROFILE_UPDATED',
    AGENCY_SUBSCRIPTION_UPDATED = 'AGENCY_SUBSCRIPTION_UPDATED',
    AGENCY_PROFILE_UPDATED = 'AGENCY_PROFILE_UPDATED',
    AGENCY_STATUS_TOGGLED = 'AGENCY_STATUS_TOGGLED',
    TRIP_STATUS_TOGGLED = 'TRIP_STATUS_TOGGLED',
    FAVORITE_TOGGLED = 'FAVORITE_TOGGLED',
    REVIEW_DELETED = 'REVIEW_DELETED',
    REVIEW_UPDATED = 'REVIEW_UPDATED',
    DELETE_USER = 'DELETE_USER',
    DELETE_MULTIPLE_USERS = 'DELETE_MULTIPLE_USERS',
    DELETE_MULTIPLE_AGENCIES = 'DELETE_MULTIPLE_AGENCIES',
}

export interface ActivityLog {
    id: string;
    userId: string;
    actionType: ActivityActionType;
    details: any;
    createdAt: string;
}