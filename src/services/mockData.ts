
import { Agency, Client, Admin, Trip, Booking, Review, UserRole, Plan, TripCategory, TravelerType } from '../types';
import { slugify } from '../utils/slugify';

export const PLANS: Plan[] = [
  { 
    id: 'STARTER', 
    name: 'Starter', 
    price: 0, 
    features: [
      '1 Viagem Ativa',
      'Página Web Básica'
    ] 
  },
  { 
    id: 'BASIC', 
    name: 'Básico', 
    price: 99.90, 
    features: [
      '5 Viagens Ativas',
      'Personalização de Tema',
      'Suporte por Email'
    ] 
  },
  { 
    id: 'PREMIUM', 
    name: 'Premium', 
    price: 199.90, 
    features: [
      'Viagens Ilimitadas',
      'Gestão de Frota (Visual)',
      'Mapa de Assentos/Quartos',
      'Destaque na Home',
      'Suporte 24/7'
    ] 
  },
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

// --- HELPER FOR IMAGES ---
const getImg = (key: string) => {
  const db: Record<string, string> = {
    // Classics
    iguacu: 'https://images.unsplash.com/photo-1583589483229-3616196d1199?auto=format&fit=crop&w=1000&q=80',
    rio: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1000&q=80',
    amazon: 'https://images.unsplash.com/photo-1558980664-23c97b2a3e52?auto=format&fit=crop&w=1000&q=80',
    noronha: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1000&q=80',
    pantanal: 'https://images.unsplash.com/photo-1581260502159-c9204828d5f6?auto=format&fit=crop&w=1000&q=80',
    bonito: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1000&q=80',
    lencois: 'https://images.unsplash.com/photo-1564053489984-317bbd824340?auto=format&fit=crop&w=1000&q=80',
    paraty: 'https://images.unsplash.com/photo-1565883252377-5b56439809d1?auto=format&fit=crop&w=1000&q=80',
    chapada: 'https://images.unsplash.com/photo-1504217051514-96afa06398be?auto=format&fit=crop&w=1000&q=80',
    salvador: 'https://images.unsplash.com/photo-1574008526236-4e7807e16305?auto=format&fit=crop&w=1000&q=80',
    sp: 'https://images.unsplash.com/photo-1578305762432-0151b480575e?auto=format&fit=crop&w=1000&q=80',
    ouropreto: 'https://images.unsplash.com/photo-1565036566849-d94124397d47?auto=format&fit=crop&w=1000&q=80',
    jalapao: 'https://images.unsplash.com/photo-1545663079-82ce546e526f?auto=format&fit=crop&w=1000&q=80',
    roraima: 'https://images.unsplash.com/photo-1518182177546-076727620017?auto=format&fit=crop&w=1000&q=80',
    ilhabela: 'https://images.unsplash.com/photo-1563476560-5bf90902c6c2?auto=format&fit=crop&w=1000&q=80',
    gramado: 'https://images.unsplash.com/photo-1613323593608-abc90fec84ff?auto=format&fit=crop&w=1000&q=80',
    floripa: 'https://images.unsplash.com/photo-1590625583337-4b12232213c5?auto=format&fit=crop&w=1000&q=80',
    
    // New Destinations (Cheap / Near SP)
    saothome: 'https://images.unsplash.com/photo-1569435222406-277565b3d671?auto=format&fit=crop&w=1000&q=80',
    trindade: 'https://images.unsplash.com/photo-1564606638689-6761b91b7143?auto=format&fit=crop&w=1000&q=80',
    sana: 'https://images.unsplash.com/photo-1446488614252-0675d316c645?auto=format&fit=crop&w=1000&q=80', // Nature fallback
    maromba: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1000&q=80', // Waterfall fallback
    wine: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1000&q=80',
    aparecida: 'https://images.unsplash.com/photo-1601662233367-c80675172d44?auto=format&fit=crop&w=1000&q=80',
    macela: 'https://images.unsplash.com/photo-1533241242200-325c572668b9?auto=format&fit=crop&w=1000&q=80',
    arraial: 'https://images.unsplash.com/photo-1589824462580-75c1b79218b7?auto=format&fit=crop&w=1000&q=80',
    ilhamel: 'https://images.unsplash.com/photo-1621269656186-670a8d00556e?auto=format&fit=crop&w=1000&q=80',
    ubatuba: 'https://images.unsplash.com/photo-1579547945413-497e1b99dac0?auto=format&fit=crop&w=1000&q=80',
    campos: 'https://images.unsplash.com/photo-1596739203417-c768269c4231?auto=format&fit=crop&w=1000&q=80',
    ilhagrande: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1000&q=80',
    
    // Categories
    food: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80',
    urbano: 'https://images.unsplash.com/photo-1449824913929-6513b64e301f?auto=format&fit=crop&w=1000&q=80',
    aventura: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=1000&q=80',
    familia: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1000&q=80',
    praia: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
    vidanoturna: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=1000&q=80',
  };
  
  if (!db[key]) {
      // Fallback based on keywords if exact key missing
      if (key.includes('praia') || key.includes('beach')) return db['praia'];
      if (key.includes('serra') || key.includes('montanha')) return db['campos'];
      return db['praia'];
  }
  return db[key];
};

// --- 10 AGENCIES DATA ---
const reportAgenciesData = [
  { name: 'Paraíso das Cataratas', desc: 'Especialistas em Foz do Iguaçu e região.', logoKey: 'iguacu' },
  { name: 'Carioca Urbano Tours', desc: 'A alma do Rio de Janeiro em passeios culturais.', logoKey: 'rio' },
  { name: 'Amazônia Selvagem', desc: 'Expedições autênticas na floresta.', logoKey: 'amazon' },
  { name: 'Ilhas Românticas', desc: 'Lua de mel e viagens de casal exclusivas.', logoKey: 'noronha' },
  { name: 'Pantanal Safaris', desc: 'Ecoturismo e fotografia de vida selvagem.', logoKey: 'pantanal' },
  { name: 'Lendas do Nordeste', desc: 'Cultura, história e praias do Nordeste.', logoKey: 'salvador' },
  { name: 'Aventura & Diversão', desc: 'Trekking, rafting e adrenalina pura.', logoKey: 'aventura' },
  { name: 'Serra & Vinho Experiências', desc: 'Enoturismo e charme nas montanhas de SP.', logoKey: 'wine' },
  { name: 'Trilhas & Mochilão Brasil', desc: 'Viagens econômicas e campings para jovens.', logoKey: 'macela' },
  { name: 'Fé & Cultura Viagens', desc: 'Turismo religioso e histórico com guias especializados.', logoKey: 'aparecida' }
];

export const MOCK_AGENCIES: Agency[] = reportAgenciesData.map((ag, index) => ({
  id: `user_ag_${index + 1}`,
  agencyId: `ag_${index + 1}`,
  name: ag.name,
  slug: slugify(ag.name),
  email: `contato@${slugify(ag.name)}.com`,
  password: '123',
  role: UserRole.AGENCY,
  cnpj: `10.${index}23.${index}56/0001-${index}0`,
  description: ag.desc,
  logo: getImg(ag.logoKey),
  heroMode: 'TRIPS', // Default
  subscriptionStatus: 'ACTIVE',
  subscriptionPlan: 'PREMIUM',
  subscriptionExpiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
  website: `www.${slugify(ag.name)}.com`,
  phone: `(11) 98765-43${index < 10 ? '0' : ''}${index}`,
  whatsapp: `55119876543${index < 10 ? '0' : ''}${index}`,
  address: {
      zipCode: '01311-000',
      street: 'Av. Paulista',
      number: `${index + 1}00`,
      city: 'São Paulo',
      state: 'SP',
      district: 'Bela Vista'
  },
  bankInfo: {
      bank: '341',
      agency: '1234',
      account: `56789-${index}`,
      pixKey: `contato@${slugify(ag.name)}.com`
  }
}));

// --- 30 TRIPS DATA ---
export const MOCK_TRIPS: Trip[] = [
  // --- Cataratas do Iguaçu (ag_1) ---
  {
    id: 't1',
    agencyId: 'ag_1',
    title: 'Maravilhas de Foz do Iguaçu',
    slug: 'maravilhas-de-foz-do-iguacu',
    description: 'Explore as Cataratas do Iguaçu, um dos mais espetaculares conjuntos de quedas d\'água do planeta. Este pacote inclui passeios pelos lados brasileiro e argentino, além de uma visita ao Parque das Aves.',
    destination: 'Foz do Iguaçu, PR',
    price: 1850,
    startDate: '2024-09-10T00:00:00Z',
    endDate: '2024-09-15T00:00:00Z',
    durationDays: 6,
    images: [getImg('iguacu'), getImg('macela'), getImg('aventura')],
    category: 'NATUREZA',
    tags: ['Cataratas', 'Parque Nacional', 'Fotografia'],
    travelerTypes: ['FAMILIA', 'CASAL', 'AMIGOS'],
    itinerary: [
      { day: 1, title: 'Chegada e Acomodação', description: 'Transfer do aeroporto para o hotel e dia livre.' },
      { day: 2, title: 'Lado Brasileiro das Cataratas', description: 'Visita ao Parque Nacional do Iguaçu com vista panorâmica das quedas.' }
    ],
    boardingPoints: [
      { id: 'bp1', time: '08:00', location: 'Aeroporto Internacional de Foz (IGU)' },
      { id: 'bp2', time: '09:30', location: 'Hotel Bella Italia' }
    ],
    paymentMethods: ['Pix', 'Cartão de Crédito', 'Boleto'],
    is_active: true,
    tripRating: 4.9, // Changed from rating
    tripTotalReviews: 128, // Changed from totalReviews
    included: ['Hospedagem com café da manhã', 'Transfer aeroporto/hotel', 'Ingresso para o lado brasileiro das Cataratas', 'Guia local'],
    notIncluded: ['Passagens aéreas', 'Almoço e jantar', 'Ingresso para o lado argentino'],
    views: 12500,
    sales: 150,
    featuredInHero: true,
  },
  // --- Rio de Janeiro (ag_2) ---
  {
    id: 't2',
    agencyId: 'ag_2',
    title: 'Rio de Janeiro: Cidade Maravilhosa',
    slug: 'rio-de-janeiro-cidade-maravilhosa',
    description: 'Viva a energia contagiante do Rio. Visite o Cristo Redentor, o Pão de Açúcar, as praias de Copacabana e Ipanema e sinta o ritmo da cidade em um passeio pela Lapa.',
    destination: 'Rio de Janeiro, RJ',
    price: 1500,
    startDate: '2024-10-20T00:00:00Z',
    endDate: '2024-10-24T00:00:00Z',
    durationDays: 5,
    images: [getImg('rio'), getImg('praia'), getImg('vidanoturna')],
    category: 'URBANO',
    tags: ['Praia', 'Vida Noturna', 'Cultura'],
    travelerTypes: ['AMIGOS', 'CASAL', 'SOZINHO'],
    paymentMethods: ['Pix', 'Cartão de Crédito'],
    is_active: true,
    tripRating: 4.8, // Changed from rating
    tripTotalReviews: 210, // Changed from totalReviews
    included: ['Hospedagem em Copacabana', 'Café da manhã', 'Tour Cristo e Pão de Açúcar', 'Guia credenciado'],
    notIncluded: ['Passagens aéreas', 'Refeições'],
    views: 22000,
    sales: 280,
    featuredInHero: true,
    boardingPoints: [
      { id: 'bp3', time: '14:00', location: 'Aeroporto Santos Dumont (SDU)' },
      { id: 'bp4', time: '15:00', location: 'Aeroporto do Galeão (GIG)' }
    ],
  },
  // --- Amazônia (ag_3) ---
  {
    id: 't3',
    agencyId: 'ag_3',
    title: 'Expedição Amazônia Selvagem',
    slug: 'expedicao-amazonia-selvagem',
    description: 'Uma imersão completa na maior floresta tropical do mundo. Fique em um lodge na selva, faça trilhas, focagem noturna de jacarés e visite uma comunidade ribeirinha.',
    destination: 'Manaus, AM',
    price: 3200,
    startDate: '2024-11-05T00:00:00Z',
    endDate: '2024-11-10T00:00:00Z',
    durationDays: 6,
    images: [getImg('amazon'), getImg('natureza'), getImg('aventura')],
    category: 'AVENTURA',
    tags: ['Selva', 'Ecoturismo', 'Sobrevivência'],
    travelerTypes: ['MOCHILAO', 'SOZINHO', 'AMIGOS'],
    paymentMethods: ['Pix', 'Boleto'],
    is_active: true,
    tripRating: 5.0, // Changed from rating
    tripTotalReviews: 89, // Changed from totalReviews
    included: ['Hospedagem em lodge na selva', 'Pensão completa', 'Todos os passeios descritos', 'Guia nativo'],
    notIncluded: ['Passagens aéreas até Manaus', 'Bebidas'],
    views: 9800,
    sales: 75,
    boardingPoints: [
      { id: 'bp5', time: '08:30', location: 'Porto de Manaus' }
    ],
  },
   // --- Fernando de Noronha (ag_4) ---
  {
    id: 't4',
    agencyId: 'ag_4',
    title: 'Paraíso em Fernando de Noronha',
    slug: 'paraiso-em-fernando-de-noronha',
    description: 'Descubra o santuário ecológico de Fernando de Noronha. Mergulhe em águas cristalinas, caminhe por praias paradisíacas e encante-se com a vida marinha exuberante.',
    destination: 'Fernando de Noronha, PE',
    price: 4800,
    startDate: '2024-12-01T00:00:00Z',
    endDate: '2024-12-06T00:00:00Z',
    durationDays: 6,
    images: [getImg('noronha'), getImg('praia'), getImg('ilhabela')],
    category: 'PRAIA',
    tags: ['Mergulho', 'Natureza', 'Exclusivo'],
    travelerTypes: ['CASAL'],
    paymentMethods: ['Cartão de Crédito'],
    is_active: true,
    tripRating: 4.9, // Changed from rating
    tripTotalReviews: 150, // Changed from totalReviews
    included: ['Pousada com café da manhã', 'Transfer aeroporto/pousada', 'Passeio de barco', 'Trilha histórica'],
    notIncluded: ['Passagens aéreas', 'Taxa de Preservação Ambiental', 'Ingresso do Parque Nacional Marinho'],
    views: 18000,
    sales: 110,
    featuredInHero: true,
    boardingPoints: [
      { id: 'bp6', time: '10:00', location: 'Aeroporto de Noronha' }
    ],
  },
  // --- Chapada Diamantina (ag_7) ---
  {
    id: 't5',
    agencyId: 'ag_7',
    title: 'Aventura na Chapada Diamantina',
    slug: 'aventura-na-chapada-diamantina',
    description: 'Explore o coração da Bahia em um roteiro de trekking e paisagens deslumbrantes. Visite o Morro do Pai Inácio, a Cachoeira da Fumaça e os poços de águas cristalinas.',
    destination: 'Lençóis, BA',
    price: 2100,
    startDate: '2024-09-25T00:00:00Z',
    endDate: '2024-09-30T00:00:00Z',
    durationDays: 6,
    images: [getImg('chapada'), getImg('aventura'), getImg('natureza')],
    category: 'AVENTURA',
    tags: ['Trekking', 'Ecoturismo', 'Sobrevivência'],
    travelerTypes: ['MOCHILAO', 'AMIGOS', 'SOZINHO'],
    paymentMethods: ['Pix', 'Cartão de Crédito'],
    is_active: true,
    tripRating: 4.9, // Changed from rating
    tripTotalReviews: 132, // Changed from totalReviews
    included: ['Hospedagem em Lençóis', 'Café da manhã', 'Passeios guiados', 'Transporte para os passeios'],
    notIncluded: ['Passagens aéreas', 'Refeições', 'Taxas de entrada nos atrativos'],
    views: 11500,
    sales: 95,
    featuredInHero: true,
    boardingPoints: [
      { id: 'bp7', time: '13:00', location: 'Rodoviária de Lençóis' }
    ],
  },
   // --- Rota do Vinho SP (ag_8) ---
   {
    id: 't6',
    agencyId: 'ag_8',
    title: 'Rota do Vinho em São Roque',
    slug: 'rota-do-vinho-sao-roque',
    description: 'Um dia delicioso explorando as vinícolas de São Roque. Deguste vinhos, sucos e produtos artesanais, e desfrute de um almoço típico em um ambiente charmoso.',
    destination: 'São Roque, SP',
    price: 350,
    startDate: '2024-08-25T00:00:00Z',
    endDate: '2024-08-25T00:00:00Z',
    durationDays: 1,
    images: [getImg('wine'), getImg('food'), getImg('campos')],
    category: 'GASTRONOMICO',
    tags: ['Vinho', 'Bate e Volta', 'Ideal para viajar sozinho'],
    travelerTypes: ['CASAL', 'AMIGOS', 'FAMILIA'],
    paymentMethods: ['Pix'],
    is_active: true,
    tripRating: 4.7, // Changed from rating
    tripTotalReviews: 88, // Changed from totalReviews
    included: ['Transporte saindo de SP', 'Guia', 'Visita a 3 vinícolas com degustação'],
    notIncluded: ['Almoço', 'Compras pessoais'],
    views: 8500,
    sales: 210,
    popularNearSP: true,
    featuredInHero: true,
    boardingPoints: [
      { id: 'bp8', time: '07:30', location: 'Metrô Barra Funda' },
      { id: 'bp9', time: '08:00', location: 'Metrô Tatuapé' }
    ],
  },
  // --- Trindade (ag_9) ---
  {
    id: 't7',
    agencyId: 'ag_9',
    title: 'Fim de Semana em Trindade',
    slug: 'fim-de-semana-trindade',
    description: 'Fuja da rotina em um fim de semana nas praias e cachoeiras de Trindade. Conheça a Praia do Meio, a Praia do Cachadaço e a famosa piscina natural.',
    destination: 'Trindade, RJ',
    price: 580,
    startDate: '2024-09-13T00:00:00Z',
    endDate: '2024-09-15T00:00:00Z',
    durationDays: 3,
    images: [getImg('trindade'), getImg('praia'), getImg('natureza')],
    category: 'VIAGEM_BARATA',
    tags: ['Praia', 'Cachoeira', 'Mochilão'],
    travelerTypes: ['AMIGOS', 'SOZINHO', 'MOCHILAO'],
    paymentMethods: ['Pix', 'Boleto'],
    is_active: true,
    tripRating: 4.6, // Changed from rating
    tripTotalReviews: 112, // Changed from totalReviews
    included: ['Transporte saindo de SP', 'Hospedagem em camping ou pousada simples', 'Guia acompanhante'],
    notIncluded: ['Alimentação', 'Passeios de barco'],
    views: 15000,
    sales: 350,
    popularNearSP: true,
    boardingPoints: [
      { id: 'bp10', time: '21:00', location: 'Metrô Portuguesa-Tietê' },
      { id: 'bp11', time: '21:45', location: 'Metrô Tatuapé' }
    ],
  },
];

// --- BOOKINGS (Exemplos) ---
export const MOCK_BOOKINGS: Booking[] = [
  { id: 'b1', tripId: 't1', clientId: 'c1', date: '2024-07-15T14:00:00Z', status: 'CONFIRMED', totalPrice: 1850, passengers: 1, voucherCode: 'VS-IGUACU-123', paymentMethod: 'CREDIT_CARD' }
];

// --- REVIEWS (Exemplos) ---
export const MOCK_REVIEWS: Review[] = [
  { id: 'r1', tripId: 't1', clientId: 'c1', rating: 5, comment: 'Viagem incrível! O guia era muito experiente e as cataratas são de tirar o fôlego. Recomendo!', date: '2024-07-20T10:00:00Z', clientName: 'João Viajante' }
];
