
import { Agency, Client, Admin, Trip, Booking, Review, UserRole, Plan, TripCategory, TravelerType } from '../types';

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

// --- HELPER FOR IMAGES ---
const getImg = (key: string) => {
  const db: Record<string, string> = {
    iguacu: 'https://images.unsplash.com/photo-1583589483229-3616196d1199?auto=format&fit=crop&w=800&q=80',
    rio: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=800&q=80',
    amazon: 'https://images.unsplash.com/photo-1558980664-23c97b2a3e52?auto=format&fit=crop&w=800&q=80',
    noronha: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80',
    pantanal: 'https://images.unsplash.com/photo-1581260502159-c9204828d5f6?auto=format&fit=crop&w=800&q=80',
    bonito: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80',
    lencois: 'https://images.unsplash.com/photo-1564053489984-317bbd824340?auto=format&fit=crop&w=800&q=80',
    paraty: 'https://images.unsplash.com/photo-1565883252377-5b56439809d1?auto=format&fit=crop&w=800&q=80',
    chapada: 'https://images.unsplash.com/photo-1504217051514-96afa06398be?auto=format&fit=crop&w=800&q=80',
    salvador: 'https://images.unsplash.com/photo-1574008526236-4e7807e16305?auto=format&fit=crop&w=800&q=80',
    sp: 'https://images.unsplash.com/photo-1578305762432-0151b480575e?auto=format&fit=crop&w=800&q=80',
    ouropreto: 'https://images.unsplash.com/photo-1565036566849-d94124397d47?auto=format&fit=crop&w=800&q=80',
    jalapao: 'https://images.unsplash.com/photo-1545663079-82ce546e526f?auto=format&fit=crop&w=800&q=80',
    roraima: 'https://images.unsplash.com/photo-1518182177546-076727620017?auto=format&fit=crop&w=800&q=80',
    
    // Categories
    praia: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    urbano: 'https://images.unsplash.com/photo-1449824913929-6513b64e301f?auto=format&fit=crop&w=800&q=80',
    aventura: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=800&q=80',
    familia: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=800&q=80',
    romantico: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=800&q=80',
    natureza: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80',
    cultura: 'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?auto=format&fit=crop&w=800&q=80',
    gastronomico: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    vida_noturna: 'https://images.unsplash.com/photo-1514525253440-b393452e233e?auto=format&fit=crop&w=800&q=80',
    viagem_barata: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80',
    arte: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=800&q=80',

    ilhabela: 'https://images.unsplash.com/photo-1563476560-5bf90902c6c2?auto=format&fit=crop&w=800&q=80',
    ilhagrande: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80',
    gramado: 'https://images.unsplash.com/photo-1613323593608-abc90fec84ff?auto=format&fit=crop&w=800&q=80',
    floripa: 'https://images.unsplash.com/photo-1564053489984-317bbd824340?auto=format&fit=crop&w=800&q=80' 
  };
  return db[key] || db['praia'];
};

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

// --- GENERATE 10 NEW AGENCIES (Based on Report) ---
const reportAgenciesData = [
  { name: 'Paraíso das Cataratas', desc: 'Especializada em roteiros que combinam as Cataratas do Iguaçu e outras atrações naturais.', logoKey: 'iguacu' },
  { name: 'Carioca Urbano Tours', desc: 'Explora os grandes centros brasileiros, com ênfase em cultura, gastronomia e eventos.', logoKey: 'urbano' },
  { name: 'Amazônia Selvagem', desc: 'Focada em expedições na floresta amazônica e ecoturismo.', logoKey: 'amazon' },
  { name: 'Ilhas Românticas', desc: 'Pacotes românticos em ilhas paradisíacas como Fernando de Noronha e Ilhabela.', logoKey: 'noronha' },
  { name: 'Pantanal Safaris', desc: 'Safáris fotográficos e vivências no Pantanal e áreas próximas.', logoKey: 'pantanal' },
  { name: 'Lendas do Nordeste', desc: 'Viagens pelos tesouros do Nordeste, como Lençóis Maranhenses e Salvador.', logoKey: 'lencois' },
  { name: 'Aventura & Diversão', desc: 'Roteiros de adrenalina, incluindo Chapada Diamantina, Bonito e Jalapão.', logoKey: 'aventura' },
  { name: 'Cultura e Sabores', desc: 'Combina atrações culturais e experiências gastronômicas em cidades históricas.', logoKey: 'food' },
  { name: 'Praias & Famílias', desc: 'Pensada para famílias, com destinos praianos seguros e resorts.', logoKey: 'familia' },
  { name: 'Explorers do Brasil', desc: 'Para aventureiros que buscam destinos remotos como Monte Roraima e Jalapão.', logoKey: 'roraima' }
];

const generatedAgencies: Agency[] = reportAgenciesData.map((ag, index) => ({
  id: `new_a${index + 1}`,
  name: ag.name,
  email: `contato@${ag.name.replace(/\s+/g, '').toLowerCase()}.com`,
  password: '123',
  role: UserRole.AGENCY,
  cnpj: `00.${index}00.000/0001-${index}0`,
  description: ag.desc,
  logo: getImg(ag.logoKey),
  subscriptionStatus: 'ACTIVE',
  subscriptionPlan: 'PREMIUM',
  subscriptionExpiresAt: new Date(new Date().setMonth(new Date().getMonth() + 12)).toISOString(),
  phone: `(11) 9${index}000-0000`,
  website: `www.${ag.name.replace(/\s+/g, '').toLowerCase()}.com.br`,
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
        getImg('praia'),
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'
    ],
    category: 'PRAIA',
    tags: ['Praia', 'Luxo', 'Resort', 'All Inclusive'],
    travelerTypes: ['FAMILIA', 'CASAL'],
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
        getImg('gramado')
    ],
    category: 'ROMANTICO',
    tags: ['Inverno', 'Gastronomia', 'Vinho', 'Serras'],
    travelerTypes: ['CASAL'],
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
        getImg('chapada')
    ],
    category: 'NATUREZA',
    tags: ['Trilhas', 'Cachoeiras', 'Ecoturismo', 'Ideal para viajar sozinho'],
    travelerTypes: ['SOZINHO', 'MOCHILAO', 'AMIGOS'],
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
    tags: ['Diversão', 'Parques', 'Internacional'],
    travelerTypes: ['FAMILIA'],
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
        getImg('sp')
    ],
    category: 'GASTRONOMICO',
    tags: ['Cultura', 'Urbano', 'Gastronomia', 'Museus'],
    travelerTypes: ['CASAL', 'SOZINHO', 'AMIGOS'],
    active: true,
    rating: 4.5,
    totalReviews: 10,
    included: ['Hotel na Paulista', 'City Tour', 'Jantar no Terraço'],
    notIncluded: ['Transporte até SP'],
    views: 450,
    sales: 3
  }
];

// --- GENERATE 100 NEW TRIPS (10 per new Agency) based on Report ---

// Helper to structure trip data
interface TripSpec {
  title: string;
  dest: string;
  cat: TripCategory;
  days: number;
  price: number;
  desc: string;
  imgKey: string;
}

// Helper to auto-assign tags based on category
const getTagsForCategory = (cat: TripCategory, dest: string): string[] => {
    const baseTags: string[] = [];
    if (cat === 'PRAIA') baseTags.push('Praia', 'Sol e Mar', 'Relax');
    if (cat === 'AVENTURA') baseTags.push('Adrenalina', 'Trilhas', 'Natureza');
    if (cat === 'NATUREZA') baseTags.push('Ecoturismo', 'Animais', 'Ar Livre');
    if (cat === 'CULTURA') baseTags.push('História', 'Museus', 'Arquitetura');
    if (cat === 'GASTRONOMICO') baseTags.push('Culinária Típica', 'Vinhos', 'Jantares');
    if (cat === 'URBANO') baseTags.push('Cidade Grande', 'Compras', 'Eventos');
    if (cat === 'ROMANTICO') baseTags.push('Ideal para casais', 'Lua de Mel', 'Charme');
    if (cat === 'FAMILIA') baseTags.push('Crianças', 'Diversão', 'Segurança');
    
    // Randomly add 'Ideal para viajar sozinho' to 30% of trips
    if (Math.random() > 0.7) baseTags.push('Ideal para viajar sozinho');
    
    return baseTags;
};

const getTravelerTypesForCategory = (cat: TripCategory): TravelerType[] => {
    const types: TravelerType[] = [];
    if (['PRAIA', 'FAMILIA'].includes(cat)) types.push('FAMILIA', 'CASAL');
    if (['AVENTURA', 'NATUREZA'].includes(cat)) types.push('SOZINHO', 'AMIGOS', 'MOCHILAO');
    if (['ROMANTICO'].includes(cat)) types.push('CASAL');
    if (['URBANO', 'CULTURA', 'GASTRONOMICO'].includes(cat)) types.push('CASAL', 'SOZINHO', 'MELHOR_IDADE');
    
    // Ensure every trip has at least one
    if (types.length === 0) types.push('AMIGOS');
    
    return types;
}

const agencyTripsData: Record<string, TripSpec[]> = {
  'Paraíso das Cataratas': [
    { title: 'Iguaçu Essencial', dest: 'Foz do Iguaçu, PR', cat: 'NATUREZA', days: 3, price: 2100, desc: 'Explore as cataratas em passeios de um dia com caminhadas e vista panorâmica do Devil’s Throat.', imgKey: 'iguacu' },
    { title: 'Iguaçu e Argentina', dest: 'Foz do Iguaçu, PR', cat: 'AVENTURA', days: 5, price: 3200, desc: 'Descubra ambos os lados das cataratas, com passeio de barco e trilhas pela floresta tropical.', imgKey: 'iguacu' },
    { title: 'Cataratas e Pantanal', dest: 'Foz do Iguaçu e Pantanal', cat: 'NATUREZA', days: 7, price: 4500, desc: 'Combine as quedas d’água com safáris no Pantanal, observando jaguares e outros animais.', imgKey: 'pantanal' },
    { title: 'Paraty Colonial', dest: 'Paraty, RJ', cat: 'ROMANTICO', days: 3, price: 1800, desc: 'Passeie pelo centro histórico, praias e cachoeiras, curtindo a arquitetura colonial.', imgKey: 'paraty' },
    { title: 'Paraty e Lençóis', dest: 'Paraty e Lençóis', cat: 'AVENTURA', days: 6, price: 3600, desc: 'Visite Paraty e depois explore as dunas e lagoas de Lençóis Maranhenses.', imgKey: 'lencois' },
    { title: 'Roteiro Histórico', dest: 'Paraty e Ouro Preto', cat: 'CULTURA', days: 7, price: 3500, desc: 'Conheça duas cidades históricas com charme colonial e natureza ao redor.', imgKey: 'ouropreto' },
    { title: 'Iguaçu para Famílias', dest: 'Foz do Iguaçu, PR', cat: 'FAMILIA', days: 4, price: 2600, desc: 'Programação leve com passeios seguros para crianças e visita ao parque das aves.', imgKey: 'iguacu' },
    { title: 'Iguaçu Premium', dest: 'Foz do Iguaçu, PR', cat: 'AVENTURA', days: 6, price: 3900, desc: 'Pacote premium com hospedagem de luxo e tour exclusivo nas cataratas.', imgKey: 'iguacu' },
    { title: 'Paraty Gastronômico', dest: 'Paraty, RJ', cat: 'GASTRONOMICO', days: 4, price: 2200, desc: 'Deguste cachaças artesanais e pratos locais, além de passeios de barco.', imgKey: 'paraty' },
    { title: 'Parque Nacional Trip', dest: 'Iguaçu e Chapada', cat: 'AVENTURA', days: 8, price: 4800, desc: 'Visite as cataratas e caminhe pela Chapada Diamantina com cachoeiras impressionantes.', imgKey: 'chapada' },
  ],
  'Carioca Urbano Tours': [
    { title: 'Rio Clássico', dest: 'Rio de Janeiro, RJ', cat: 'URBANO', days: 4, price: 2700, desc: 'Inclui visitas ao Cristo Redentor, Pão de Açúcar e praias de Copacabana e Ipanema.', imgKey: 'rio' },
    { title: 'Carnaval Experience', dest: 'Rio de Janeiro, RJ', cat: 'VIDA_NOTURNA', days: 5, price: 3500, desc: 'Viva a energia do Carnaval com ingressos para um desfile e festas exclusivas.', imgKey: 'rio' },
    { title: 'Rio e Paraty', dest: 'Rio de Janeiro e Paraty', cat: 'ROMANTICO', days: 6, price: 3800, desc: 'Combine o agito carioca com o charme histórico de Paraty e suas praias.', imgKey: 'paraty' },
    { title: 'São Paulo Cultural', dest: 'São Paulo, SP', cat: 'CULTURA', days: 3, price: 2000, desc: 'Explore museus, galerias, Avenida Paulista e Mercado Municipal.', imgKey: 'sp' },
    { title: 'São Paulo Gastronômico', dest: 'São Paulo, SP', cat: 'GASTRONOMICO', days: 4, price: 2600, desc: 'Tour de restaurantes, rooftops e feira de gastronomia no Ibirapuera.', imgKey: 'food' },
    { title: 'Rio Noite & Dia', dest: 'Rio de Janeiro, RJ', cat: 'VIDA_NOTURNA', days: 3, price: 2400, desc: 'Pacote focado em vida noturna e dias relaxantes nas praias.', imgKey: 'rio' },
    { title: 'SP Arte & Design', dest: 'São Paulo, SP', cat: 'ARTE', days: 5, price: 3100, desc: 'Visitas a museus de arte, Design Week e eventos culturais.', imgKey: 'sp' },
    { title: 'Festival de Música', dest: 'São Paulo, SP', cat: 'VIDA_NOTURNA', days: 4, price: 2800, desc: 'Ingressos para festival de música e visitas a pontos turísticos.', imgKey: 'sp' },
    { title: 'Rio Verde', dest: 'Rio de Janeiro, RJ', cat: 'NATUREZA', days: 4, price: 2600, desc: 'Caminhada na Floresta da Tijuca e visita ao centro histórico.', imgKey: 'rio' },
    { title: 'São Paulo Premium', dest: 'São Paulo, SP', cat: 'URBANO', days: 5, price: 3200, desc: 'Hospedagem cinco estrelas com tours personalizados e rooftops.', imgKey: 'sp' },
  ],
  'Amazônia Selvagem': [
    { title: 'Amazônia Essencial', dest: 'Manaus, AM', cat: 'AVENTURA', days: 5, price: 3400, desc: 'Hospedagem em lodge na selva, trilhas e observação de animais exóticos.', imgKey: 'amazon' },
    { title: 'Amazônia Premium', dest: 'Manaus, AM', cat: 'AVENTURA', days: 7, price: 4800, desc: 'Pacote com guias especializados, pesca esportiva e visita a comunidade ribeirinha.', imgKey: 'amazon' },
    { title: 'Amazon & Alter do Chão', dest: 'Alter do Chão, PA', cat: 'NATUREZA', days: 6, price: 4000, desc: 'Explore a floresta e relaxe nas praias fluviais de Alter do Chão.', imgKey: 'amazon' },
    { title: 'Bonito Aventura', dest: 'Bonito, MS', cat: 'AVENTURA', days: 4, price: 2500, desc: 'Mergulho e snorkeling em rios cristalinos e visita a grutas subterrâneas.', imgKey: 'bonito' },
    { title: 'Bonito Premium', dest: 'Bonito, MS', cat: 'AVENTURA', days: 6, price: 3700, desc: 'Pacote com hospedagem de luxo e passeios exclusivos nas cachoeiras.', imgKey: 'bonito' },
    { title: 'Pantanal Explorer', dest: 'Pantanal, MT', cat: 'NATUREZA', days: 5, price: 3200, desc: 'Safáris de barco e a cavalo com observação de jaguares e aves.', imgKey: 'pantanal' },
    { title: 'Pantanal Deluxe', dest: 'Pantanal, MT', cat: 'NATUREZA', days: 7, price: 4500, desc: 'Hospedagem em fazenda ecológica com safaris diurnos e noturnos.', imgKey: 'pantanal' },
    { title: 'Jalapão Off-Road', dest: 'Jalapão, TO', cat: 'AVENTURA', days: 6, price: 3600, desc: 'Passeios 4x4 nas dunas, fervedouros e cachoeiras cristalinas.', imgKey: 'jalapao' },
    { title: 'Chapada Trek', dest: 'Chapada Diamantina, BA', cat: 'AVENTURA', days: 5, price: 3000, desc: 'Trekking pelos canyons, cachoeiras e grutas com guia local.', imgKey: 'chapada' },
    { title: 'Amazônia & Pantanal', dest: 'Amazonas e Pantanal', cat: 'NATUREZA', days: 8, price: 5200, desc: 'Imersão em duas regiões de rica biodiversidade com guias experientes.', imgKey: 'amazon' },
  ],
  'Ilhas Românticas': [
    { title: 'Noronha Romance', dest: 'Fernando de Noronha, PE', cat: 'ROMANTICO', days: 5, price: 4200, desc: 'Hospedagem charmosa e passeios de barco ao pôr do sol nas praias mais belas.', imgKey: 'noronha' },
    { title: 'Noronha Essencial', dest: 'Fernando de Noronha, PE', cat: 'PRAIA', days: 4, price: 3500, desc: 'Visite as praias Baía do Sancho, mergulhe e faça trilhas leves.', imgKey: 'noronha' },
    { title: 'Noronha Premium', dest: 'Fernando de Noronha, PE', cat: 'ROMANTICO', days: 6, price: 5200, desc: 'Suíte de luxo, mergulho autônomo e jantar especial na ilha.', imgKey: 'noronha' },
    { title: 'Ilhabela Relax', dest: 'Ilhabela, SP', cat: 'PRAIA', days: 4, price: 2600, desc: 'Praias desertas, cachoeiras e centro com bares e restaurantes.', imgKey: 'ilhabela' },
    { title: 'Ilha Grande Aventura', dest: 'Ilha Grande, RJ', cat: 'AVENTURA', days: 5, price: 2800, desc: 'Trilhas na Mata Atlântica, praia de Lopes Mendes e mergulho.', imgKey: 'ilhagrande' },
    { title: 'Noronha Lua de Mel', dest: 'Fernando de Noronha, PE', cat: 'ROMANTICO', days: 7, price: 6000, desc: 'Pacote exclusivo de lua de mel com passeio de canoa havaiana e massagem.', imgKey: 'noronha' },
    { title: 'Ilhabela Premium', dest: 'Ilhabela, SP', cat: 'ROMANTICO', days: 5, price: 3200, desc: 'Hospedagem de charme com passeio de veleiro ao pôr do sol.', imgKey: 'ilhabela' },
    { title: 'Ilha Grande Relax', dest: 'Ilha Grande, RJ', cat: 'ROMANTICO', days: 6, price: 3400, desc: 'Visita às Lagoa Verde e Azul, snorkeling e jantar na vila.', imgKey: 'ilhagrande' },
    { title: 'Paraty & Noronha', dest: 'Paraty e Noronha', cat: 'ROMANTICO', days: 8, price: 5400, desc: 'Combine centro histórico e praias paradisíacas em duas cidades.', imgKey: 'paraty' },
    { title: 'Ilhas do Amor', dest: 'Ilhabela e Noronha', cat: 'ROMANTICO', days: 8, price: 5600, desc: 'Roteiro exclusivo passando por Ilhabela e Fernando de Noronha.', imgKey: 'noronha' },
  ],
  'Pantanal Safaris': [
    { title: 'Safari Básico', dest: 'Pantanal, MT', cat: 'NATUREZA', days: 4, price: 2800, desc: 'Safáris diurnos com avistamento de onças, capivaras e aves.', imgKey: 'pantanal' },
    { title: 'Safari Completo', dest: 'Pantanal, MT', cat: 'NATUREZA', days: 6, price: 4200, desc: 'Combinação de safáris diurnos e noturnos e hospedagem em pousada ecológica.', imgKey: 'pantanal' },
    { title: 'Pantanal e Bonito', dest: 'Pantanal e Bonito', cat: 'AVENTURA', days: 7, price: 4800, desc: 'Explore o Pantanal e mergulhe em Bonito nas águas cristalinas.', imgKey: 'bonito' },
    { title: 'Pantanal Luxe', dest: 'Pantanal, MT', cat: 'AVENTURA', days: 5, price: 3500, desc: 'Pacote luxuoso com guia particular e passeios personalizados.', imgKey: 'pantanal' },
    { title: 'Chapada Expedition', dest: 'Chapada Diamantina, BA', cat: 'AVENTURA', days: 6, price: 3800, desc: 'Trilhas em canyons e cachoeiras isoladas.', imgKey: 'chapada' },
    { title: 'Pantanal & Amazônia', dest: 'Pantanal e Amazônia', cat: 'NATUREZA', days: 8, price: 5200, desc: 'Experiências em duas regiões biodiversas com safáris e pernoites na selva.', imgKey: 'amazon' },
    { title: 'Safari Jaguar', dest: 'Pantanal, MT', cat: 'AVENTURA', days: 5, price: 3900, desc: 'Pacote focado em avistar onças em passeios de barco e carro.', imgKey: 'pantanal' },
    { title: 'Pantanal Essencial', dest: 'Pantanal, MT', cat: 'VIAGEM_BARATA', days: 3, price: 2400, desc: 'Visita curta com passeios básicos e observação de aves.', imgKey: 'pantanal' },
    { title: 'Pantanal Cultural', dest: 'Pantanal, MT', cat: 'CULTURA', days: 4, price: 2600, desc: 'Integração com comunidades locais e culinária típica.', imgKey: 'pantanal' },
    { title: 'Pantanal Fotográfico', dest: 'Pantanal, MT', cat: 'ARTE', days: 6, price: 4000, desc: 'Safaris focados em fotografia de fauna e flora com guia especializado.', imgKey: 'pantanal' },
  ],
  'Lendas do Nordeste': [
    { title: 'Lençóis Essencial', dest: 'Lençóis Maranhenses, MA', cat: 'AVENTURA', days: 4, price: 2600, desc: 'Passeios pelas dunas e lagoas de água doce, com guias locais.', imgKey: 'lencois' },
    { title: 'Lençóis e Paraty', dest: 'Lençóis e Paraty', cat: 'CULTURA', days: 7, price: 4200, desc: 'Roteiro que une natureza exuberante e história colonial.', imgKey: 'lencois' },
    { title: 'Salvador Histórico', dest: 'Salvador, BA', cat: 'CULTURA', days: 4, price: 2400, desc: 'Explore Pelourinho, igrejas barrocas e praias urbanas.', imgKey: 'salvador' },
    { title: 'Salvador e Praias', dest: 'Salvador, BA', cat: 'PRAIA', days: 5, price: 2800, desc: 'Visite Porto da Barra e Farol da Barra, com passeios gastronômicos.', imgKey: 'salvador' },
    { title: 'Lençóis Premium', dest: 'Lençóis Maranhenses, MA', cat: 'AVENTURA', days: 6, price: 3600, desc: 'Passeios de quadriciclo, voo panorâmico e visita a lagoas secretas.', imgKey: 'lencois' },
    { title: 'Salvador Afro Cultural', dest: 'Salvador, BA', cat: 'CULTURA', days: 4, price: 2300, desc: 'Vivencie a cultura afro-brasileira com música, dança e culinária.', imgKey: 'salvador' },
    { title: 'Lençóis & Jalapão', dest: 'Lençóis e Jalapão', cat: 'AVENTURA', days: 8, price: 4900, desc: 'Dunas e lagoas seguidas por fervedouros e cachoeiras no Jalapão.', imgKey: 'jalapao' },
    { title: 'Paraty & Salvador', dest: 'Paraty e Salvador', cat: 'CULTURA', days: 6, price: 3700, desc: 'Descubra o charme colonial de ambas as cidades com praias e história.', imgKey: 'salvador' },
    { title: 'Salvador Premium', dest: 'Salvador, BA', cat: 'URBANO', days: 5, price: 3000, desc: 'Hospedagem de luxo e tours privados pelo centro histórico.', imgKey: 'salvador' },
    { title: 'Rota Nordestina', dest: 'Salvador e Lençóis', cat: 'AVENTURA', days: 7, price: 4500, desc: 'Roteiro combinando cultura e paisagens naturais do Nordeste.', imgKey: 'lencois' },
  ],
  'Aventura & Diversão': [
    { title: 'Chapada Aventura', dest: 'Chapada Diamantina, BA', cat: 'AVENTURA', days: 5, price: 3000, desc: 'Trilhas até cachoeiras, grutas e montanhas com paisagens de tirar o fôlego.', imgKey: 'chapada' },
    { title: 'Jalapão Off-Road', dest: 'Jalapão, TO', cat: 'AVENTURA', days: 6, price: 3500, desc: 'Passeios 4x4 pelas dunas e fervedouros, com camping sob as estrelas.', imgKey: 'jalapao' },
    { title: 'Bonito Radical', dest: 'Bonito, MS', cat: 'AVENTURA', days: 5, price: 2900, desc: 'Rapel em cavernas, mergulho em rios e flutuação.', imgKey: 'bonito' },
    { title: 'Pantanal Selvagem', dest: 'Pantanal, MT', cat: 'NATUREZA', days: 4, price: 2800, desc: 'Safáris a cavalo e observação de vida selvagem em passeio de barco.', imgKey: 'pantanal' },
    { title: 'Lençóis Trekking', dest: 'Lençóis Maranhenses, MA', cat: 'AVENTURA', days: 5, price: 3200, desc: 'Caminhada entre lagoas e dunas com acampamento.', imgKey: 'lencois' },
    { title: 'Noronha Adventure', dest: 'Fernando de Noronha, PE', cat: 'AVENTURA', days: 6, price: 4500, desc: 'Mergulho com tubarões, trilha e passeio de caiaque.', imgKey: 'noronha' },
    { title: 'Ilha Grande Challenge', dest: 'Ilha Grande, RJ', cat: 'AVENTURA', days: 5, price: 3100, desc: 'Trilhas intensas e snorkel em lagoas cristalinas.', imgKey: 'ilhagrande' },
    { title: 'Chapada Selvagem', dest: 'Chapada Diamantina, BA', cat: 'AVENTURA', days: 7, price: 3800, desc: 'Expedição de 7 dias com camping e exploração de cavernas.', imgKey: 'chapada' },
    { title: 'Amazon Adventure', dest: 'Manaus, AM', cat: 'AVENTURA', days: 6, price: 4200, desc: 'Expedição fluvial com acampamento na selva e pesca esportiva.', imgKey: 'amazon' },
    { title: 'Pantanal Off-Track', dest: 'Pantanal, MT', cat: 'AVENTURA', days: 5, price: 3300, desc: 'Trilhas fora de estrada e observação noturna de animais.', imgKey: 'pantanal' },
  ],
  'Cultura e Sabores': [
    { title: 'São Paulo Gourmet', dest: 'São Paulo, SP', cat: 'GASTRONOMICO', days: 4, price: 2800, desc: 'Tour gastronômico com restaurantes premiados e aulas de culinária.', imgKey: 'food' },
    { title: 'Salvador Sabores', dest: 'Salvador, BA', cat: 'GASTRONOMICO', days: 4, price: 2500, desc: 'Experimente a culinária baiana e aprenda a fazer acarajé e moqueca.', imgKey: 'salvador' },
    { title: 'Rio Cultural', dest: 'Rio de Janeiro, RJ', cat: 'CULTURA', days: 4, price: 2700, desc: 'Visitas a museus, Lapa, Santa Teresa e show de samba.', imgKey: 'rio' },
    { title: 'Paraty Literária', dest: 'Paraty, RJ', cat: 'CULTURA', days: 3, price: 2000, desc: 'Passeios pelo centro histórico e participação em eventos literários.', imgKey: 'paraty' },
    { title: 'São Paulo Noturna', dest: 'São Paulo, SP', cat: 'VIDA_NOTURNA', days: 3, price: 2300, desc: 'Visite bares rooftops e experimente drinks autorais.', imgKey: 'sp' },
    { title: 'Salvador Histórico e Sabores', dest: 'Salvador, BA', cat: 'CULTURA', days: 5, price: 2900, desc: 'Combina tours históricos com degustação de comidas típicas.', imgKey: 'salvador' },
    { title: 'Rio e Gastronomia', dest: 'Rio de Janeiro, RJ', cat: 'GASTRONOMICO', days: 5, price: 3100, desc: 'Inclui aulas de culinária e visitas a feiras locais.', imgKey: 'food' },
    { title: 'São Paulo & Paraty', dest: 'São Paulo e Paraty', cat: 'CULTURA', days: 6, price: 3600, desc: 'Explore arte urbana em SP e arquitetura colonial em Paraty.', imgKey: 'sp' },
    { title: 'Salvador e Chapada', dest: 'Salvador e Chapada', cat: 'CULTURA', days: 7, price: 4000, desc: 'Passeie por museus e depois aventure-se na Chapada Diamantina.', imgKey: 'salvador' },
    { title: 'Tradições do Brasil', dest: 'Salvador e Rio', cat: 'CULTURA', days: 6, price: 3500, desc: 'Conheça as tradições afro-brasileiras e cariocas em uma única viagem.', imgKey: 'rio' },
  ],
  'Praias & Famílias': [
    { title: 'Florianópolis em Família', dest: 'Florianópolis, SC', cat: 'FAMILIA', days: 5, price: 2800, desc: 'Visite praias como Mole e Joaquina, com atividades para crianças.', imgKey: 'floripa' },
    { title: 'Ilhabela em Família', dest: 'Ilhabela, SP', cat: 'FAMILIA', days: 4, price: 2400, desc: 'Passeios de barco e visitas a cachoeiras adequadas para todas as idades.', imgKey: 'ilhabela' },
    { title: 'Salvador Familiar', dest: 'Salvador, BA', cat: 'FAMILIA', days: 5, price: 2600, desc: 'Praias urbanas e atividades culturais adaptadas para crianças.', imgKey: 'salvador' },
    { title: 'Rio Family Fun', dest: 'Rio de Janeiro, RJ', cat: 'FAMILIA', days: 4, price: 2500, desc: 'Cristo Redentor, Bondinho do Pão de Açúcar e praias com lazer infantil.', imgKey: 'rio' },
    { title: 'Noronha Família', dest: 'Fernando de Noronha, PE', cat: 'FAMILIA', days: 6, price: 5000, desc: 'Praias seguras e passeios de barco adequados para crianças.', imgKey: 'noronha' },
    { title: 'Praia do Forte', dest: 'Praia do Forte, BA', cat: 'FAMILIA', days: 5, price: 2700, desc: 'Resort all-inclusive, projeto Tamar e atividades para jovens.', imgKey: 'praia' },
    { title: 'Natal para Crianças', dest: 'Natal, RN', cat: 'FAMILIA', days: 4, price: 2300, desc: 'Passeios de buggy nas dunas e visita ao aquário marinho.', imgKey: 'praia' },
    { title: 'Porto de Galinhas', dest: 'Porto de Galinhas, PE', cat: 'FAMILIA', days: 5, price: 2900, desc: 'Piscinas naturais e resorts confortáveis.', imgKey: 'praia' },
    { title: 'Maceió Azul', dest: 'Maceió, AL', cat: 'FAMILIA', days: 4, price: 2400, desc: 'Praias de água morna e visitas à Foz do Rio São Francisco.', imgKey: 'praia' },
    { title: 'Fortaleza Family', dest: 'Fortaleza, CE', cat: 'FAMILIA', days: 5, price: 2600, desc: 'Beach Park e passeios em Canoa Quebrada.', imgKey: 'praia' },
  ],
  'Explorers do Brasil': [
    { title: 'Roraima Trek', dest: 'Monte Roraima, RR', cat: 'AVENTURA', days: 8, price: 6000, desc: 'Expedição de 8 dias até o topo do Monte Roraima, com camping e guias experientes.', imgKey: 'roraima' },
    { title: 'Jalapão Selvagem', dest: 'Jalapão, TO', cat: 'AVENTURA', days: 7, price: 4200, desc: 'Exploração de dunas alaranjadas, fervedouros e cachoeiras em 4x4.', imgKey: 'jalapao' },
    { title: 'Amazon Immersion', dest: 'Manaus, AM', cat: 'NATUREZA', days: 7, price: 4800, desc: 'Vivência com tribos locais, pesca, observação de fauna e flora.', imgKey: 'amazon' },
    { title: 'Pantanal & Chapada', dest: 'Pantanal e Chapada', cat: 'AVENTURA', days: 8, price: 5300, desc: 'Safáris no Pantanal e trekking na Chapada Diamantina.', imgKey: 'pantanal' },
    { title: 'Lençóis & Roraima', dest: 'Lençóis e Roraima', cat: 'AVENTURA', days: 9, price: 6200, desc: 'Dunas e lagoas antes de uma expedição ao Roraima.', imgKey: 'roraima' },
    { title: 'Bonito & Pantanal', dest: 'Bonito e Pantanal', cat: 'NATUREZA', days: 7, price: 4900, desc: 'Mergulho em rios cristalinos e safáris no Pantanal.', imgKey: 'bonito' },
    { title: 'Noronha Explorer', dest: 'Fernando de Noronha, PE', cat: 'AVENTURA', days: 6, price: 4500, desc: 'Mergulho profundo, trilhas e observação de vida marinha.', imgKey: 'noronha' },
    { title: 'Caminhos de São Paulo', dest: 'São Paulo e Interior', cat: 'CULTURA', days: 5, price: 3100, desc: 'Conheça a metrópole e cidades históricas do interior.', imgKey: 'sp' },
    { title: 'Amazônia e Jalapão', dest: 'Amazônia e Jalapão', cat: 'AVENTURA', days: 9, price: 6100, desc: 'Do verde da selva às dunas do Jalapão em uma aventura épica.', imgKey: 'jalapao' },
    { title: 'Roteiro Selvagem', dest: 'Pantanal e Roraima', cat: 'AVENTURA', days: 10, price: 7000, desc: 'Combina observação de fauna com trekking no platô de Roraima.', imgKey: 'roraima' },
  ]
};

let generatedTrips: Trip[] = [];

generatedAgencies.forEach((agency) => {
  const tripsSpecs = agencyTripsData[agency.name];
  if (tripsSpecs) {
    tripsSpecs.forEach((spec, i) => {
      generatedTrips.push({
        id: `t_${agency.id}_${i}`,
        agencyId: agency.id,
        title: spec.title,
        description: spec.desc,
        destination: spec.dest,
        price: spec.price,
        startDate: new Date(Date.now() + Math.random() * 10000000000).toISOString(),
        endDate: new Date(Date.now() + Math.random() * 10000000000 + spec.days * 86400000).toISOString(),
        durationDays: spec.days,
        images: [getImg(spec.imgKey)],
        category: spec.cat,
        tags: getTagsForCategory(spec.cat, spec.dest),
        travelerTypes: getTravelerTypesForCategory(spec.cat),
        active: true,
        rating: 4 + Math.random(),
        totalReviews: Math.floor(Math.random() * 50),
        included: ['Hospedagem', 'Café da Manhã', 'Guia'],
        notIncluded: ['Almoço', 'Jantar'],
        views: Math.floor(Math.random() * 2000),
        sales: Math.floor(Math.random() * 40)
      });
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
