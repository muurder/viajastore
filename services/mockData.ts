import { Agency, Client, Admin, Trip, Booking, Review, UserRole, Plan } from '../types';

export const PLANS: Plan[] = [
  { id: 'BASIC', name: 'Plano Básico', price: 99.90, features: ['Até 5 anúncios', 'Painel básico', 'Suporte por e-mail'] },
  { id: 'PREMIUM', name: 'Plano Premium', price: 199.90, features: ['Anúncios ilimitados', 'Destaque na home', 'Suporte prioritário', 'Painel avançado'] },
];

export const MOCK_CLIENTS: Client[] = [
  {
    id: 'c1',
    name: 'João Viajante',
    email: 'cliente@viajastore.com',
    role: UserRole.CLIENT,
    avatar: 'https://i.pravatar.cc/150?u=c1',
    favorites: [],
    phone: '(11) 99999-9999'
  }
];

export const MOCK_AGENCIES: Agency[] = [
  {
    id: 'a1',
    name: 'CVC Cover Turismo',
    email: 'agencia@viajastore.com',
    role: UserRole.AGENCY,
    cnpj: '12.345.678/0001-99',
    description: 'Especialistas em viagens para o Nordeste brasileiro.',
    logo: 'https://picsum.photos/200/200?random=1',
    subscriptionStatus: 'ACTIVE',
    subscriptionPlan: 'PREMIUM',
    subscriptionExpiresAt: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
  },
  {
    id: 'a2',
    name: 'EcoAdventures',
    email: 'eco@viajastore.com',
    role: UserRole.AGENCY,
    cnpj: '98.765.432/0001-11',
    description: 'Turismo ecológico e de aventura.',
    logo: 'https://picsum.photos/200/200?random=2',
    subscriptionStatus: 'INACTIVE', // This agency's trips should not show publicly
    subscriptionPlan: 'BASIC',
    subscriptionExpiresAt: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
  }
];

export const MOCK_ADMINS: Admin[] = [
  {
    id: 'adm1',
    name: 'Super Admin',
    email: 'admin@viajastore.com',
    role: UserRole.ADMIN,
    avatar: 'https://i.pravatar.cc/150?u=adm1'
  }
];

export const MOCK_TRIPS: Trip[] = [
  {
    id: 't1',
    agencyId: 'a1',
    title: 'Porto de Galinhas - All Inclusive',
    description: '7 dias no paraíso com tudo pago. Resort 5 estrelas beira-mar.',
    destination: 'Porto de Galinhas, PE',
    price: 3500,
    startDate: '2024-12-10',
    endDate: '2024-12-17',
    durationDays: 7,
    images: ['https://picsum.photos/800/600?random=10', 'https://picsum.photos/800/600?random=11'],
    category: 'PRAIA',
    active: true,
    rating: 4.8,
    totalReviews: 12,
    included: ['Aéreo', 'Hotel All Inclusive', 'Translado']
  },
  {
    id: 't2',
    agencyId: 'a1',
    title: 'Fim de Semana em Gramado',
    description: 'Curta o frio da serra gaúcha com muito charme e chocolate.',
    destination: 'Gramado, RS',
    price: 1200,
    startDate: '2024-07-15',
    endDate: '2024-07-18',
    durationDays: 3,
    images: ['https://picsum.photos/800/600?random=20'],
    category: 'ROMANCE',
    active: true,
    rating: 4.5,
    totalReviews: 5,
    included: ['Hotel', 'Café da manhã', 'Tour uva e vinho']
  },
  {
    id: 't3',
    agencyId: 'a2', // Inactive agency
    title: 'Chapada dos Veadeiros - Trekking',
    description: 'Aventura radical nas cachoeiras mais lindas do Brasil.',
    destination: 'Alto Paraíso, GO',
    price: 1800,
    startDate: '2024-09-01',
    endDate: '2024-09-05',
    durationDays: 5,
    images: ['https://picsum.photos/800/600?random=30'],
    category: 'AVENTURA',
    active: true, // Trip is marked active, but agency is inactive
    rating: 5.0,
    totalReviews: 2,
    included: ['Guia', 'Transporte 4x4', 'Pousada']
  }
];

export const MOCK_BOOKINGS: Booking[] = [];
export const MOCK_REVIEWS: Review[] = [
  {
    id: 'r1',
    tripId: 't1',
    clientId: 'c1',
    rating: 5,
    comment: 'Viagem inesquecível! A agência deu todo suporte.',
    date: '2024-01-15',
    clientName: 'João Viajante'
  }
];