
import { Agency, Client, Admin, Trip, Booking, Review, UserRole, Plan } from '../types';

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
  {
    id: 'a1',
    name: 'Nordeste Explorer',
    email: 'agencia@viajastore.com',
    password: '123',
    role: UserRole.AGENCY,
    cnpj: '12.345.678/0001-99',
    description: 'Especialistas em proporcionar experiências inesquecíveis nas praias mais belas do Nordeste brasileiro.',
    logo: 'https://images.unsplash.com/photo-1523699289804-638732ae47c5?auto=format&fit=crop&w=200&q=80',
    subscriptionStatus: 'ACTIVE',
    subscriptionPlan: 'PREMIUM',
    subscriptionExpiresAt: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString(),
    phone: '(81) 3322-4455',
    website: 'www.nordesteexplorer.com.br',
    createdAt: '2023-11-15T10:00:00Z'
  },
  {
    id: 'a2',
    name: 'EcoVentura Brasil',
    email: 'eco@viajastore.com',
    password: '123',
    role: UserRole.AGENCY,
    cnpj: '98.765.432/0001-11',
    description: 'Turismo ecológico, trekking e conexão com a natureza. Sustentabilidade em primeiro lugar.',
    logo: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=200&q=80',
    subscriptionStatus: 'INACTIVE',
    subscriptionPlan: 'BASIC',
    subscriptionExpiresAt: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
    phone: '(62) 98888-7777',
    createdAt: '2024-02-20T10:00:00Z'
  }
];

export const MOCK_ADMINS: Admin[] = [
  {
    id: 'adm1',
    name: 'Administrador Sistema',
    email: 'admin@viajastore.com',
    password: '123',
    role: UserRole.ADMIN,
    avatar: 'https://ui-avatars.com/api/?name=Admin+System&background=000&color=fff',
    createdAt: '2023-01-01T00:00:00Z'
  }
];

export const MOCK_TRIPS: Trip[] = [
  {
    id: 't1',
    agencyId: 'a1',
    title: 'Porto de Galinhas: Paraíso All Inclusive',
    description: 'Desfrute de 7 dias no paraíso com tudo pago. Resort 5 estrelas à beira-mar, passeios de jangada nas piscinas naturais e jantar temático inclusos. Ideal para quem busca relaxamento total.',
    destination: 'Porto de Galinhas, PE',
    price: 3500,
    startDate: '2024-12-10',
    endDate: '2024-12-17',
    durationDays: 7,
    images: [
        'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'
    ],
    category: 'PRAIA',
    active: true,
    rating: 4.8,
    totalReviews: 45,
    included: ['Aéreo Ida e Volta', 'Hotel All Inclusive', 'Translado Aeroporto', 'Passeio de Jangada'],
    notIncluded: ['Gorjetas', 'Passeios Opcionais'],
    views: 1250,
    sales: 15
  },
  {
    id: 't2',
    agencyId: 'a1',
    title: 'Romance na Serra Gaúcha: Gramado e Canela',
    description: 'Curta o frio da serra gaúcha com muito charme, vinho e chocolate. Pacote especial para casais com jantar de fondue incluso.',
    destination: 'Gramado, RS',
    price: 1890,
    startDate: '2024-07-15',
    endDate: '2024-07-19',
    durationDays: 4,
    images: [
        'https://images.unsplash.com/photo-1613323593608-abc90fec84ff?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1518608295129-690523706062?auto=format&fit=crop&w=800&q=80'
    ],
    category: 'ROMANCE',
    active: true,
    rating: 4.9,
    totalReviews: 28,
    included: ['Hotel Boutique', 'Café da manhã colonial', 'Tour Uva e Vinho', 'Jantar Fondue'],
    notIncluded: ['Passagem Aérea', 'Almoço'],
    views: 890,
    sales: 8
  },
  {
    id: 't3',
    agencyId: 'a2',
    title: 'Expedição Chapada dos Veadeiros',
    description: 'Aventura radical nas cachoeiras mais lindas do Brasil. Trilhas guiadas, banhos energizantes e conexão total com a natureza.',
    destination: 'Alto Paraíso, GO',
    price: 2200,
    startDate: '2024-09-01',
    endDate: '2024-09-06',
    durationDays: 6,
    images: [
        'https://images.unsplash.com/photo-1504217051514-96afa06398be?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80'
    ],
    category: 'AVENTURA',
    active: true,
    rating: 5.0,
    totalReviews: 12,
    included: ['Guia Credenciado', 'Transporte 4x4', 'Pousada Rústica', 'Entrada nos Parques'],
    notIncluded: ['Aéreo até Brasília', 'Jantar'],
    views: 2100,
    sales: 32
  },
  {
    id: 't4',
    agencyId: 'a1',
    title: 'Disney Magic: Férias em Orlando',
    description: 'Realize o sonho da família na terra da magia. Ingressos para 4 parques Disney inclusos e hotel próximo aos parques.',
    destination: 'Orlando, EUA',
    price: 8500,
    startDate: '2024-11-10',
    endDate: '2024-11-18',
    durationDays: 8,
    images: [
        'https://images.unsplash.com/photo-1597466599360-3b9775841aec?auto=format&fit=crop&w=800&q=80'
    ],
    category: 'FAMILIA',
    active: true,
    rating: 4.7,
    totalReviews: 56,
    included: ['Hotel', 'Ingressos 4 Dias', 'Carro Alugado'],
    notIncluded: ['Aéreo Internacional', 'Alimentação'],
    views: 3400,
    sales: 12
  },
  {
    id: 't5',
    agencyId: 'a1',
    title: 'São Paulo Cultural e Gastronômico',
    description: 'Descubra o lado urbano e cosmopolita de SP. Jantares em restaurantes premiados e visita a museus.',
    destination: 'São Paulo, SP',
    price: 950,
    startDate: '2024-08-05',
    endDate: '2024-08-07',
    durationDays: 2,
    images: [
        'https://images.unsplash.com/photo-1543059080-f9b1272213d5?auto=format&fit=crop&w=800&q=80'
    ],
    category: 'URBANO',
    active: true,
    rating: 4.5,
    totalReviews: 10,
    included: ['Hotel na Paulista', 'City Tour', 'Jantar no Terraço'],
    notIncluded: ['Transporte até SP'],
    views: 450,
    sales: 3
  }
];

export const MOCK_BOOKINGS: Booking[] = [];

export const MOCK_REVIEWS: Review[] = [
  {
    id: 'r1',
    tripId: 't1',
    clientId: 'c1',
    rating: 5,
    comment: 'Viagem inesquecível! A agência deu todo suporte do início ao fim. O hotel era maravilhoso.',
    date: '2024-01-15',
    clientName: 'João Viajante',
    response: 'Obrigado João! Ficamos felizes que tenha aproveitado o paraíso!'
  },
  {
    id: 'r2',
    tripId: 't2',
    clientId: 'c1',
    rating: 5,
    comment: 'Gramado é lindo demais. O hotel indicado pela agência foi perfeito.',
    date: '2024-02-20',
    clientName: 'Maria Silva'
  }
];
