
import { Agency, Client, Admin, Trip, Booking, Review, UserRole, Plan } from '../types';
import { slugify } from '../utils/slugify';

export const PLANS: Plan[] = [
  { id: 'BASIC', name: 'Plano Básico', price: 99.90, features: ['Até 5 anúncios ativos', 'Painel de métricas básico', 'Suporte por e-mail', 'Taxa de 10% por venda'] },
  { id: 'PREMIUM', name: 'Plano Premium', price: 199.90, features: ['Anúncios ilimitados', 'Destaque na página inicial', 'Suporte prioritário 24/7', 'Painel de métricas avançado', 'Taxa de 5% por venda'] },
];

export const MOCK_CLIENTS: Client[] = [
  {
    id: 'c1',
    name: 'João Viajante',
    email: 'cliente@viajastore.com',
    password: '123',
    role: UserRole.CLIENT,
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80',
    favorites: ['t1', 't3'],
    phone: '(11) 99999-9999',
    cpf: '123.456.789-00',
    createdAt: '2024-01-01T10:00:00Z'
  }
];

export const MOCK_AGENCIES: Agency[] = [
    // ... Mock agency data
];

export const MOCK_TRIPS: Trip[] = [
  {
    id: 't1',
    agencyId: 'ag_1',
    title: 'Maravilhas de Foz do Iguaçu',
    slug: 'maravilhas-de-foz-do-iguacu',
    description: 'Explore as Cataratas do Iguaçu.',
    destination: 'Foz do Iguaçu, PR',
    price: 1850,
    startDate: '2024-09-10T00:00:00Z',
    endDate: '2024-09-15T00:00:00Z',
    durationDays: 6,
    images: ['https://images.unsplash.com/photo-1583589483229-3616196d1199?auto=format&fit=crop&w=1000&q=80'],
    category: 'NATUREZA',
    tags: ['Cataratas'],
    travelerTypes: ['FAMILIA'],
    is_active: true,
    tripRating: 4.9, // Corrected
    tripTotalReviews: 128, // Corrected
    included: ['Hospedagem'],
    notIncluded: ['Passagens aéreas'],
  },
  // ... more mock trips
];

export const MOCK_BOOKINGS: Booking[] = [
  { id: 'b1', tripId: 't1', clientId: 'c1', date: '2024-07-15T14:00:00Z', status: 'CONFIRMED', totalPrice: 1850, passengers: 1, voucherCode: 'VS-IGUACU-123', paymentMethod: 'CREDIT_CARD' }
];

export const MOCK_REVIEWS: Review[] = [
  { id: 'r1', tripId: 't1', clientId: 'c1', rating: 5, comment: 'Viagem incrível!', date: '2024-07-20T10:00:00Z', clientName: 'João Viajante' }
];
