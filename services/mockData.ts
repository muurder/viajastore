
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

// --- BASE AGENCIES ---
const initialAgencies: Agency[] = [
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

// --- GENERATE 10 NEW AGENCIES ---
const newAgencyNames = [
  'CVC Turismo Cover', 'Decolar Fake Tours', 'Azul Viagens Clone', 'Carioca Travel', 
  'Minas Gerais Destinos', 'Paraná Excursões', 'São Paulo City Tours', 'Terra da Garoa Viagens', 
  'Iguaçu Explorer', 'Rota do Ouro MG'
];

const generatedAgencies: Agency[] = newAgencyNames.map((name, index) => ({
  id: `new_a${index + 1}`,
  name: name,
  email: `contato@${name.replace(/\s+/g, '').toLowerCase()}.com`,
  password: '123',
  role: UserRole.AGENCY,
  cnpj: `00.${index}00.000/0001-${index}0`,
  description: `Agência especializada em turismo regional e nacional, oferecendo os melhores pacotes para você e sua família. Experiência comprovada em ${name}.`,
  logo: `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=random&color=fff`,
  subscriptionStatus: 'ACTIVE',
  subscriptionPlan: 'PREMIUM',
  subscriptionExpiresAt: new Date(new Date().setMonth(new Date().getMonth() + 12)).toISOString(),
  phone: `(11) 9${index}000-0000`,
  website: `www.${name.replace(/\s+/g, '').toLowerCase()}.com.br`,
  createdAt: new Date().toISOString()
}));

export const MOCK_AGENCIES: Agency[] = [...initialAgencies, ...generatedAgencies];


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

// --- BASE TRIPS ---
const initialTrips: Trip[] = [
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

// --- GENERATE 100 NEW TRIPS (10 per new Agency) ---
// Focus on PR, MG, RJ, SP
const destinations = [
    { city: 'Foz do Iguaçu, PR', type: 'AVENTURA' as const, title: 'Cataratas do Iguaçu e Aventura', img: 'https://images.unsplash.com/photo-1583589483229-3616196d1199?auto=format&fit=crop&w=800&q=80' },
    { city: 'Curitiba, PR', type: 'URBANO' as const, title: 'City Tour Curitiba e Parques', img: 'https://images.unsplash.com/photo-1566297489520-55f707761736?auto=format&fit=crop&w=800&q=80' },
    { city: 'Ilha do Mel, PR', type: 'PRAIA' as const, title: 'Fim de Semana na Ilha do Mel', img: 'https://images.unsplash.com/photo-1564053489984-317bbd824340?auto=format&fit=crop&w=800&q=80' },
    
    { city: 'Ouro Preto, MG', type: 'ROMANCE' as const, title: 'História e Charme em Ouro Preto', img: 'https://images.unsplash.com/photo-1565036566849-d94124397d47?auto=format&fit=crop&w=800&q=80' },
    { city: 'Capitólio, MG', type: 'AVENTURA' as const, title: 'Canyons de Capitólio', img: 'https://images.unsplash.com/photo-1625246333842-25c262ae545f?auto=format&fit=crop&w=800&q=80' },
    { city: 'Belo Horizonte, MG', type: 'URBANO' as const, title: 'Gastronomia e Cultura em BH', img: 'https://images.unsplash.com/photo-1566033909789-896e53b128f3?auto=format&fit=crop&w=800&q=80' },
    
    { city: 'Rio de Janeiro, RJ', type: 'PRAIA' as const, title: 'Maravilhas do Rio de Janeiro', img: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=800&q=80' },
    { city: 'Paraty, RJ', type: 'ROMANCE' as const, title: 'Charme Colonial em Paraty', img: 'https://images.unsplash.com/photo-1565883252377-5b56439809d1?auto=format&fit=crop&w=800&q=80' },
    { city: 'Búzios, RJ', type: 'PRAIA' as const, title: 'Férias em Búzios', img: 'https://images.unsplash.com/photo-1572293662354-57634b351f5f?auto=format&fit=crop&w=800&q=80' },
    
    { city: 'Campos do Jordão, SP', type: 'ROMANCE' as const, title: 'Inverno em Campos do Jordão', img: 'https://images.unsplash.com/photo-1634838361759-337628908d1d?auto=format&fit=crop&w=800&q=80' },
    { city: 'Ubatuba, SP', type: 'PRAIA' as const, title: 'Praias Selvagens de Ubatuba', img: 'https://images.unsplash.com/photo-1589825589321-80e1672c594a?auto=format&fit=crop&w=800&q=80' },
    { city: 'São Paulo, SP', type: 'URBANO' as const, title: 'São Paulo Cosmopolita', img: 'https://images.unsplash.com/photo-1578305762432-0151b480575e?auto=format&fit=crop&w=800&q=80' }
];

// Categories rotation including the new SOZINHO
const categories: Trip['category'][] = ['PRAIA', 'AVENTURA', 'FAMILIA', 'ROMANCE', 'URBANO', 'SOZINHO'];

let generatedTrips: Trip[] = [];

generatedAgencies.forEach((agency, agencyIdx) => {
  for (let i = 0; i < 10; i++) {
    // Pick a destination based on loop index to ensure variety
    const destInfo = destinations[(agencyIdx * 10 + i) % destinations.length];
    
    // Determine category - force SOZINHO occasionally
    let category: Trip['category'] = destInfo.type;
    if (i % 6 === 5) category = 'SOZINHO'; // Every 6th trip is Solo
    if (i % 6 === 2) category = 'FAMILIA';
    
    generatedTrips.push({
      id: `t_gen_${agency.id}_${i}`,
      agencyId: agency.id,
      title: category === 'SOZINHO' ? `Mochilão em ${destInfo.city.split(',')[0]}` : destInfo.title,
      description: `Experimente o melhor de ${destInfo.city}. Pacote completo com guias locais, hospedagem de qualidade e roteiros exclusivos para você aproveitar ao máximo.`,
      destination: destInfo.city,
      price: 500 + Math.floor(Math.random() * 3000),
      startDate: new Date(Date.now() + Math.random() * 10000000000).toISOString(),
      endDate: new Date(Date.now() + Math.random() * 10000000000 + 432000000).toISOString(), // +5 days
      durationDays: 3 + Math.floor(Math.random() * 7),
      images: [destInfo.img],
      category: category,
      active: true,
      rating: 4 + Math.random(),
      totalReviews: Math.floor(Math.random() * 100),
      included: ['Hospedagem', 'Café da Manhã', 'Seguro Viagem'],
      views: Math.floor(Math.random() * 5000),
      sales: Math.floor(Math.random() * 100)
    });
  }
});

export const MOCK_TRIPS: Trip[] = [...initialTrips, ...generatedTrips];

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
