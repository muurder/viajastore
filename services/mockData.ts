
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
    ilhabela: 'https://images.unsplash.com/photo-1563476560-5bf90902c6c2?auto=format&fit=crop&w=800&q=80',
    ilhagrande: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80',
    gramado: 'https://images.unsplash.com/photo-1613323593608-abc90fec84ff?auto=format&fit=crop&w=800&q=80',
    floripa: 'https://images.unsplash.com/photo-1564053489984-317bbd824340?auto=format&fit=crop&w=800&q=80',
    food: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    urbano: 'https://images.unsplash.com/photo-1449824913929-6513b64e301f?auto=format&fit=crop&w=800&q=80',
    aventura: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=800&q=80',
    familia: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=800&q=80',
    praia: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    vidanoturna: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=800&q=80',
    // New Cheap/Near SP Images
    saothome: 'https://images.unsplash.com/photo-1569435222406-277565b3d671?auto=format&fit=crop&w=800&q=80', // Mountain/Mystic
    trindade: 'https://images.unsplash.com/photo-1564606638689-6761b91b7143?auto=format&fit=crop&w=800&q=80', // Beach/Rock
    wine: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80', // Vineyards
    aparecida: 'https://images.unsplash.com/photo-1601662233367-c80675172d44?auto=format&fit=crop&w=800&q=80', // Basilica
    macela: 'https://images.unsplash.com/photo-1533241242200-325c572668b9?auto=format&fit=crop&w=800&q=80', // Camping/Stars
    arraial: 'https://images.unsplash.com/photo-1589824462580-75c1b79218b7?auto=format&fit=crop&w=800&q=80', // Blue Water
    ilhamel: 'https://images.unsplash.com/photo-1621269656186-670a8d00556e?auto=format&fit=crop&w=800&q=80', // Island
    campos: 'https://images.unsplash.com/photo-1596739203417-c768269c4231?auto=format&fit=crop&w=800&q=80', // German Architecture
  };
  
  if (!db[key]) {
      return db['praia'];
  }
  return db[key];
};

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

export const MOCK_AGENCIES: Agency[] = reportAgenciesData.map((ag, index) => ({
  id: `ag_${index + 1}`,
  name: ag.name,
  email: `contato@${ag.name.toLowerCase().replace(/\s+/g, '')}.com`,
  password: '123',
  role: UserRole.AGENCY,
  cnpj: `10.${index}23.${index}56/0001-${index}0`,
  description: ag.desc,
  logo: getImg(ag.logoKey),
  subscriptionStatus: 'ACTIVE',
  subscriptionPlan: 'PREMIUM',
  subscriptionExpiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
  website: `www.${ag.name.toLowerCase().replace(/\s+/g, '')}.com.br`,
  phone: `(11) 99999-${index}000`,
  createdAt: new Date().toISOString()
}));

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

// --- HELPERS FOR TRIPS ---
const getTravelerTypes = (cat: TripCategory): TravelerType[] => {
    const types: TravelerType[] = ['AMIGOS']; 
    if (['PRAIA', 'FAMILIA', 'VIAGEM_BARATA'].includes(cat)) types.push('FAMILIA');
    if (['ROMANTICO', 'PRAIA', 'GASTRONOMICO', 'VIDA_NOTURNA'].includes(cat)) types.push('CASAL');
    if (['AVENTURA', 'NATUREZA', 'ARTE', 'CULTURA'].includes(cat)) types.push('SOZINHO', 'MOCHILAO');
    if (cat === 'VIDA_NOTURNA') types.push('AMIGOS');
    if (cat === 'CULTURA' || cat === 'GASTRONOMICO') types.push('MELHOR_IDADE');
    if (Math.random() > 0.4) types.push('SOZINHO');
    return Array.from(new Set(types)); 
};

const getTags = (cat: TripCategory, dest: string): string[] => {
    const tags: string[] = [];
    
    if (cat === 'PRAIA') tags.push('Praia', 'Sol e Mar', 'Relax');
    if (cat === 'AVENTURA') tags.push('Adrenalina', 'Trilhas', 'Natureza');
    if (cat === 'NATUREZA') tags.push('Ecoturismo', 'Animais', 'Ar Livre');
    if (cat === 'CULTURA') tags.push('História', 'Museus', 'Arquitetura');
    if (cat === 'GASTRONOMICO') tags.push('Culinária Típica', 'Vinhos', 'Jantares');
    if (cat === 'URBANO') tags.push('Cidade Grande', 'Compras', 'Eventos');
    if (cat === 'ROMANTICO') tags.push('Ideal para casais', 'Lua de Mel', 'Charme');
    if (cat === 'FAMILIA') tags.push('Crianças', 'Diversão', 'Segurança');
    if (cat === 'VIDA_NOTURNA') tags.push('Festas', 'Bares', 'Música');
    if (cat === 'VIAGEM_BARATA') tags.push('Econômico', 'Hostel', 'Promoção');
    if (cat === 'ARTE') tags.push('Museus', 'Galerias', 'Design');

    if (Math.random() > 0.5) tags.push('Ideal para viajar sozinho');
    
    // SP Context tags
    if (dest.includes('SP') || dest.includes('MG') || dest.includes('RJ') || dest.includes('PR')) {
        if (Math.random() > 0.3) tags.push('Perto de SP');
    }

    return tags;
};

interface TripSpec {
  title: string;
  dest: string;
  cat: TripCategory;
  days: number;
  price: number;
  desc: string;
  imgKey: string;
  tags?: string[];
  featured?: boolean;
  nearSP?: boolean;
}

// Extended Agency Trips with new cheap options
const agencyTripsData: Record<string, TripSpec[]> = {
  'Paraíso das Cataratas': [
    { title: 'Iguaçu Essencial', dest: 'Foz do Iguaçu, PR', cat: 'NATUREZA', days: 3, price: 2100, desc: 'Explore as cataratas em passeios de um dia com caminhadas e vista panorâmica do Devil’s Throat.', imgKey: 'iguacu', featured: true },
    { title: 'Iguaçu e Argentina', dest: 'Foz do Iguaçu, PR', cat: 'AVENTURA', days: 5, price: 3200, desc: 'Descubra ambos os lados das cataratas, com passeio de barco e trilhas pela floresta tropical.', imgKey: 'iguacu' },
    { title: 'Cataratas e Pantanal', dest: 'Foz do Iguaçu e Pantanal', cat: 'NATUREZA', days: 7, price: 4500, desc: 'Combine as quedas d’água com safáris no Pantanal, observando jaguares e outros animais.', imgKey: 'pantanal' },
    // New Cheap Trip
    { title: 'Camping Pedra da Macela', dest: 'Cunha, SP/RJ', cat: 'AVENTURA', days: 2, price: 350, desc: 'Camping selvagem no topo da montanha para ver o nascer do sol no mar.', imgKey: 'macela', tags: ['Aventura', 'Camping', 'Perto de SP', 'Viagem barata'], featured: true, nearSP: true },
  ],
  'Carioca Urbano Tours': [
    { title: 'Rio Clássico', dest: 'Rio de Janeiro, RJ', cat: 'URBANO', days: 4, price: 2700, desc: 'Inclui visitas ao Cristo Redentor, Pão de Açúcar e praias de Copacabana e Ipanema.', imgKey: 'rio', featured: true },
    { title: 'Carnaval Experience', dest: 'Rio de Janeiro, RJ', cat: 'VIDA_NOTURNA', days: 5, price: 3500, desc: 'Viva a energia do Carnaval com ingressos para um desfile e festas exclusivas.', imgKey: 'rio' },
    // New Cheap Trip
    { title: 'Trindade: Paraíso Caiçara', dest: 'Paraty, RJ', cat: 'PRAIA', days: 3, price: 550, desc: 'Praias selvagens, piscinas naturais e cultura caiçara em hospedagem simples.', imgKey: 'trindade', tags: ['Praia', 'Natureza', 'Perto de SP', 'Viagem barata'], featured: true, nearSP: true },
  ],
  'Amazônia Selvagem': [
    { title: 'Amazônia Essencial', dest: 'Manaus, AM', cat: 'AVENTURA', days: 5, price: 3400, desc: 'Hospedagem em lodge na selva, trilhas e observação de animais exóticos.', imgKey: 'amazon' },
    { title: 'Amazônia Premium', dest: 'Manaus, AM', cat: 'AVENTURA', days: 7, price: 4800, desc: 'Pacote com guias especializados, pesca esportiva e visita a comunidade ribeirinha.', imgKey: 'amazon' },
    // New Cheap Trip
    { title: 'São Thomé Místico', dest: 'São Thomé das Letras, MG', cat: 'NATUREZA', days: 3, price: 450, desc: 'Cachoeiras, grutas e o pôr do sol mais famoso do Brasil na Casa da Pirâmide.', imgKey: 'saothome', tags: ['Natureza', 'Místico', 'Perto de SP', 'Viagem barata'], featured: true, nearSP: true },
  ],
  'Ilhas Românticas': [
    { title: 'Noronha Romance', dest: 'Fernando de Noronha, PE', cat: 'ROMANTICO', days: 5, price: 4200, desc: 'Hospedagem charmosa e passeios de barco ao pôr do sol nas praias mais belas.', imgKey: 'noronha' },
    { title: 'Noronha Essencial', dest: 'Fernando de Noronha, PE', cat: 'PRAIA', days: 4, price: 3500, desc: 'Visite as praias Baía do Sancho, mergulhe e faça trilhas leves.', imgKey: 'noronha' },
    // New Cheap Trip
    { title: 'Ilha Grande Backpacking', dest: 'Ilha Grande, RJ', cat: 'PRAIA', days: 4, price: 680, desc: 'Hospedagem em hostel e trilhas para Lopes Mendes e Lagoa Azul.', imgKey: 'ilhagrande', tags: ['Praia', 'Mochilão', 'Perto de SP', 'Viagem barata'], nearSP: true },
  ],
  'Pantanal Safaris': [
    { title: 'Safari Básico', dest: 'Pantanal, MT', cat: 'NATUREZA', days: 4, price: 2800, desc: 'Safáris diurnos com avistamento de onças, capivaras e aves.', imgKey: 'pantanal' },
    { title: 'Safari Completo', dest: 'Pantanal, MT', cat: 'NATUREZA', days: 6, price: 4200, desc: 'Combinação de safáris diurnos e noturnos e hospedagem em pousada ecológica.', imgKey: 'pantanal' },
  ],
  'Lendas do Nordeste': [
    { title: 'Lençóis Essencial', dest: 'Lençóis Maranhenses, MA', cat: 'AVENTURA', days: 4, price: 2600, desc: 'Passeios pelas dunas e lagoas de água doce, com guias locais.', imgKey: 'lencois' },
    { title: 'Salvador Histórico', dest: 'Salvador, BA', cat: 'CULTURA', days: 4, price: 2400, desc: 'Explore Pelourinho, igrejas barrocas e praias urbanas.', imgKey: 'salvador' },
  ],
  'Aventura & Diversão': [
    { title: 'Chapada Aventura', dest: 'Chapada Diamantina, BA', cat: 'AVENTURA', days: 5, price: 3000, desc: 'Trilhas até cachoeiras, grutas e montanhas com paisagens de tirar o fôlego.', imgKey: 'chapada' },
    { title: 'Jalapão Off-Road', dest: 'Jalapão, TO', cat: 'AVENTURA', days: 6, price: 3500, desc: 'Passeios 4x4 pelas dunas e fervedouros, com camping sob as estrelas.', imgKey: 'jalapao' },
    // New Cheap Trip
    { title: 'Trilha das 7 Praias', dest: 'Ubatuba, SP', cat: 'AVENTURA', days: 2, price: 280, desc: 'Trekking costeiro passando por praias desertas e paradisíacas.', imgKey: 'arraial', tags: ['Praia', 'Trilha', 'Perto de SP', 'Viagem barata'], featured: true, nearSP: true },
  ],
  'Cultura e Sabores': [
    { title: 'São Paulo Gourmet', dest: 'São Paulo, SP', cat: 'GASTRONOMICO', days: 4, price: 2800, desc: 'Tour gastronômico com restaurantes premiados e aulas de culinária.', imgKey: 'food' },
    // New Cheap Trip
    { title: 'Rota do Vinho Bate-volta', dest: 'São Roque, SP', cat: 'GASTRONOMICO', days: 1, price: 180, desc: 'Dia de degustação em vinícolas com almoço italiano incluso.', imgKey: 'wine', tags: ['Gastronomia', 'Vinho', 'Perto de SP', 'Viagem barata'], featured: true, nearSP: true },
    // New Cheap Trip
    { title: 'Campos do Jordão Inverno', dest: 'Campos do Jordão, SP', cat: 'ROMANTICO', days: 3, price: 900, desc: 'Chalé romântico, fondue e passeio pelo Capivari.', imgKey: 'campos', tags: ['Romântico', 'Frio', 'Perto de SP'], nearSP: true },
  ],
  'Praias & Famílias': [
    { title: 'Florianópolis em Família', dest: 'Florianópolis, SC', cat: 'FAMILIA', days: 5, price: 2800, desc: 'Visite praias como Mole e Joaquina, com atividades para crianças.', imgKey: 'floripa' },
    // New Cheap Trip
    { title: 'Arraial do Cabo Econômico', dest: 'Arraial do Cabo, RJ', cat: 'PRAIA', days: 3, price: 600, desc: 'Caribe brasileiro com passeio de barco e hospedagem econômica.', imgKey: 'arraial', tags: ['Praia', 'Caribe Brasileiro', 'Perto de SP', 'Viagem barata'], nearSP: true },
    // New Cheap Trip
    { title: 'Aparecida do Norte Fé', dest: 'Aparecida, SP', cat: 'CULTURA', days: 2, price: 300, desc: 'Excursão para o Santuário Nacional com visita à basílica.', imgKey: 'aparecida', tags: ['Religioso', 'Família', 'Perto de SP', 'Viagem barata'], nearSP: true },
  ],
  'Explorers do Brasil': [
    { title: 'Roraima Trek', dest: 'Monte Roraima, RR', cat: 'AVENTURA', days: 8, price: 6000, desc: 'Expedição de 8 dias até o topo do Monte Roraima, com camping e guias experientes.', imgKey: 'roraima' },
    // New Cheap Trip
    { title: 'Ilha do Mel Rustica', dest: 'Ilha do Mel, PR', cat: 'NATUREZA', days: 4, price: 750, desc: 'Sem carros, apenas trilhas, farol e praias preservadas.', imgKey: 'ilhamel', tags: ['Natureza', 'Praia', 'Perto de SP', 'Viagem barata'], nearSP: true },
  ]
};

// Build the trips array
const generatedTrips: Trip[] = [];

MOCK_AGENCIES.forEach((agency) => {
  const specs = agencyTripsData[agency.name];
  if (specs) {
    specs.forEach((spec, i) => {
      const autoTags = getTags(spec.cat, spec.dest);
      const finalTags = spec.tags ? [...autoTags, ...spec.tags] : autoTags;
      // Deduplicate tags
      const uniqueTags = Array.from(new Set(finalTags));

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
        tags: uniqueTags,
        travelerTypes: getTravelerTypes(spec.cat),
        active: true,
        rating: 4 + Math.random(),
        totalReviews: Math.floor(Math.random() * 50),
        included: ['Hospedagem', 'Café da Manhã', 'Guia'],
        notIncluded: ['Almoço', 'Jantar'],
        views: Math.floor(Math.random() * 2000),
        sales: Math.floor(Math.random() * 40),
        featured: spec.featured || false,
        popularNearSP: spec.nearSP || false
      });
    });
  }
});

export const MOCK_TRIPS: Trip[] = generatedTrips;
export const MOCK_BOOKINGS: Booking[] = [];
export const MOCK_REVIEWS: Review[] = [];
