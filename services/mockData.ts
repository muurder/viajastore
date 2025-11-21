
import { Agency, Client, Admin, Trip, Booking, Review, UserRole, Plan, TripCategory, TravelerType } from '../types';
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
  id: `ag_${index + 1}`,
  name: ag.name,
  slug: slugify(ag.name),
  email: `contato@${slugify(ag.name)}.com`,
  password: '123',
  role: UserRole.AGENCY,
  cnpj: `10.${index}23.${index}56/0001-${index}0`,
  description: ag.desc,
  logo: getImg(ag.logoKey),
  subscriptionStatus: 'ACTIVE',
  subscriptionPlan: 'PREMIUM',
  subscriptionExpiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
  website: `www.${slugify(ag.name)}.com.br`,
  phone: `(11) 99999-${index}000`,
  address: { zipCode: '00000-000', street: 'Rua Exemplo', number: '123', district: 'Centro', city: 'São Paulo', state: 'SP' },
  bankInfo: { bank: 'Banco Exemplo', agency: '0001', account: '12345-6', pixKey: 'chave@pix.com' },
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

// --- TRIP SPECIFICATIONS ---
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

// Helper to generate variations to reach 100+ trips
const createVariations = (base: TripSpec, count: number): TripSpec[] => {
  const variations: TripSpec[] = [];
  for(let i=0; i<count; i++) {
    variations.push({
      ...base,
      title: i === 0 ? base.title : `${base.title} ${['Express', 'Plus', 'Vip', 'Adventure'][i%4]}`,
      price: base.price + (i * 50),
      days: base.days + (i % 2),
      tags: base.tags,
      // Distribute featured flags randomly for variations
      featured: Math.random() > 0.7 ? true : false,
      nearSP: base.nearSP
    });
  }
  return variations;
};

// --- TRIPS DATA PER AGENCY ---
const agencyTripsData: Record<string, TripSpec[]> = {
  'Paraíso das Cataratas': [
    { title: 'Iguaçu Essencial', dest: 'Foz do Iguaçu, PR', cat: 'NATUREZA', days: 3, price: 1800, desc: 'Visita completa às cataratas lado BR e AR.', imgKey: 'iguacu', featured: true },
    { title: 'Foz Compras & Natureza', dest: 'Foz do Iguaçu, PR', cat: 'URBANO', days: 4, price: 2200, desc: 'Cataratas e compras no Paraguai.', imgKey: 'iguacu' },
    { title: 'Rota das Águas', dest: 'Foz do Iguaçu, PR', cat: 'AVENTURA', days: 5, price: 2800, desc: 'Macuco Safari e trilhas.', imgKey: 'iguacu' },
  ],
  'Carioca Urbano Tours': [
    { title: 'Rio Histórico', dest: 'Rio de Janeiro, RJ', cat: 'CULTURA', days: 3, price: 1200, desc: 'Centro histórico e museus.', imgKey: 'rio' },
    { title: 'Rio Bate-Volta', dest: 'Rio de Janeiro, RJ', cat: 'URBANO', days: 1, price: 350, desc: 'Cristo, Pão de Açúcar e almoço.', imgKey: 'rio', nearSP: true },
    { title: 'Arraial do Cabo Caribe', dest: 'Arraial do Cabo, RJ', cat: 'PRAIA', days: 2, price: 600, desc: 'O caribe brasileiro com passeio de barco.', imgKey: 'arraial', featured: true, nearSP: true, tags: ['Praia', 'Viagem barata'] },
    { title: 'Trindade Caiçara', dest: 'Paraty, RJ', cat: 'PRAIA', days: 3, price: 750, desc: 'Praias selvagens e piscinas naturais.', imgKey: 'trindade', featured: true, nearSP: true, tags: ['Natureza', 'Praia'] },
  ],
  'Amazônia Selvagem': [
    { title: 'Imersão na Selva', dest: 'Manaus, AM', cat: 'AVENTURA', days: 5, price: 3500, desc: 'Hospedagem em redário na selva.', imgKey: 'amazon' },
    { title: 'Cruzeiro Fluvial', dest: 'Rio Amazonas, AM', cat: 'ROMANTICO', days: 4, price: 5000, desc: 'Luxo e natureza sobre as águas.', imgKey: 'amazon' },
    { title: 'Sana: Refúgio Verde', dest: 'Sana, RJ', cat: 'NATUREZA', days: 3, price: 550, desc: 'Cachoeiras e paz na serra fluminense.', imgKey: 'sana', nearSP: true, tags: ['Natureza', 'Viagem barata'] },
  ],
  'Ilhas Românticas': [
    { title: 'Noronha Lua de Mel', dest: 'Fernando de Noronha, PE', cat: 'ROMANTICO', days: 7, price: 8000, desc: 'A viagem dos sonhos para casais.', imgKey: 'noronha', featured: true },
    { title: 'Ilha Grande Relax', dest: 'Ilha Grande, RJ', cat: 'PRAIA', days: 4, price: 1200, desc: 'Sem carros, só praias e trilhas.', imgKey: 'ilhagrande', nearSP: true, tags: ['Praia', 'Casal'] },
    { title: 'Ilhabela Charme', dest: 'Ilhabela, SP', cat: 'ROMANTICO', days: 3, price: 1500, desc: 'Pousada boutique e praias exclusivas.', imgKey: 'ilhabela', nearSP: true },
  ],
  'Pantanal Safaris': [
    { title: 'Pantanal Norte', dest: 'Poconé, MT', cat: 'NATUREZA', days: 4, price: 3200, desc: 'Em busca da onça-pintada.', imgKey: 'pantanal', featured: true },
    { title: 'Bonito & Pantanal', dest: 'Bonito, MS', cat: 'AVENTURA', days: 6, price: 4500, desc: 'Flutuação e safári.', imgKey: 'bonito' },
  ],
  'Lendas do Nordeste': [
    { title: 'Lençóis 4x4', dest: 'Barreirinhas, MA', cat: 'AVENTURA', days: 4, price: 2800, desc: 'Aventura nas dunas.', imgKey: 'lencois' },
    { title: 'Salvador Raiz', dest: 'Salvador, BA', cat: 'CULTURA', days: 4, price: 1800, desc: 'Pelourinho, axé e dendê.', imgKey: 'salvador' },
  ],
  'Aventura & Diversão': [
    { title: 'Trilha das 7 Praias', dest: 'Ubatuba, SP', cat: 'AVENTURA', days: 2, price: 380, desc: 'Trekking desafiador com visuais incríveis.', imgKey: 'ubatuba', nearSP: true, featured: true, tags: ['Trilha', 'Viagem barata', 'Jovens'] },
    { title: 'Jalapão Bruto', dest: 'Jalapão, TO', cat: 'AVENTURA', days: 5, price: 3100, desc: 'Fervedouros e dunas.', imgKey: 'jalapao', featured: true },
    { title: 'Chapada Diamantina Trek', dest: 'Lençóis, BA', cat: 'AVENTURA', days: 6, price: 3400, desc: 'Vale do Pati.', imgKey: 'chapada' },
  ],
  'Serra & Vinho Experiências': [
    { title: 'Rota do Vinho Premium', dest: 'São Roque, SP', cat: 'GASTRONOMICO', days: 1, price: 250, desc: 'Degustação e almoço harmonizado.', imgKey: 'wine', nearSP: true, featured: true, tags: ['Vinho', 'Gastronomia'] },
    { title: 'Campos do Jordão Inverno', dest: 'Campos do Jordão, SP', cat: 'ROMANTICO', days: 3, price: 1800, desc: 'Frio, fondue e lareira.', imgKey: 'campos', nearSP: true, tags: ['Frio', 'Casal'] },
    { title: 'Maromba & Visconde', dest: 'Visconde de Mauá, RJ', cat: 'ROMANTICO', days: 3, price: 1100, desc: 'Cachoeiras geladas e chalés aconchegantes.', imgKey: 'maromba', nearSP: true },
    ...createVariations({ title: 'São Roque Básico', dest: 'São Roque, SP', cat: 'GASTRONOMICO', days: 1, price: 120, desc: 'Passeio simples pelas vinícolas.', imgKey: 'wine', nearSP: true, tags: ['Viagem barata'] }, 2),
  ],
  'Trilhas & Mochilão Brasil': [
    { title: 'São Thomé Místico', dest: 'São Thomé das Letras, MG', cat: 'NATUREZA', days: 3, price: 450, desc: 'Pôr do sol na pirâmide e grutas.', imgKey: 'saothome', nearSP: true, featured: true, tags: ['Místico', 'Viagem barata', 'Mochilão'] },
    { title: 'Camping Pedra da Macela', dest: 'Cunha, SP', cat: 'AVENTURA', days: 2, price: 250, desc: 'Camping selvagem com vista para o mar.', imgKey: 'macela', nearSP: true, featured: true, tags: ['Camping', 'Aventura'] },
    { title: 'Ilha do Mel Raiz', dest: 'Ilha do Mel, PR', cat: 'PRAIA', days: 4, price: 800, desc: 'Sem frescura, muita natureza.', imgKey: 'ilhamel', nearSP: true, tags: ['Praia', 'Natureza'] },
    { title: 'Sana Camping', dest: 'Sana, RJ', cat: 'NATUREZA', days: 2, price: 300, desc: 'Fim de semana no meio do mato.', imgKey: 'sana', nearSP: true, tags: ['Viagem barata', 'Camping'] },
    ...createVariations({ title: 'Mochilão Ubatuba', dest: 'Ubatuba, SP', cat: 'PRAIA', days: 3, price: 500, desc: 'Praias do norte de Ubatuba.', imgKey: 'ubatuba', nearSP: true, tags: ['Praia', 'Mochilão'] }, 3),
  ],
  'Fé & Cultura Viagens': [
    { title: 'Aparecida Santuário', dest: 'Aparecida, SP', cat: 'CULTURA', days: 1, price: 150, desc: 'Excursão para a Basílica.', imgKey: 'aparecida', nearSP: true, featured: true, tags: ['Religioso', 'Família', 'Viagem barata'] },
    { title: 'Aparecida & Canção Nova', dest: 'Aparecida, SP', cat: 'CULTURA', days: 2, price: 400, desc: 'Roteiro religioso completo.', imgKey: 'aparecida', nearSP: true },
    { title: 'Minas Histórica', dest: 'Ouro Preto, MG', cat: 'CULTURA', days: 4, price: 1600, desc: 'Barroco mineiro e igrejas.', imgKey: 'ouropreto' },
  ]
};

// --- HELPERS FOR TRIPS GENERATION ---
const getTravelerTypes = (cat: TripCategory): TravelerType[] => {
    const types: TravelerType[] = ['AMIGOS']; 
    if (['PRAIA', 'FAMILIA', 'VIAGEM_BARATA', 'CULTURA'].includes(cat)) types.push('FAMILIA');
    if (['ROMANTICO', 'PRAIA', 'GASTRONOMICO', 'VIDA_NOTURNA'].includes(cat)) types.push('CASAL');
    if (['AVENTURA', 'NATUREZA', 'ARTE', 'CULTURA'].includes(cat)) types.push('SOZINHO', 'MOCHILAO');
    if (cat === 'VIDA_NOTURNA') types.push('AMIGOS');
    if (cat === 'CULTURA' || cat === 'GASTRONOMICO') types.push('MELHOR_IDADE');
    if (Math.random() > 0.4) types.push('SOZINHO');
    return Array.from(new Set(types)); 
};

const getTags = (cat: TripCategory, dest: string, extraTags: string[] = []): string[] => {
    const tags: string[] = [...extraTags];
    
    if (cat === 'PRAIA') tags.push('Praia', 'Sol e Mar');
    if (cat === 'AVENTURA') tags.push('Adrenalina', 'Trilhas', 'Natureza');
    if (cat === 'NATUREZA') tags.push('Ecoturismo', 'Ar Livre');
    if (cat === 'CULTURA') tags.push('História', 'Museus');
    if (cat === 'GASTRONOMICO') tags.push('Culinária Típica', 'Vinhos');
    if (cat === 'URBANO') tags.push('Cidade Grande', 'Passeios');
    if (cat === 'ROMANTICO') tags.push('Ideal para casais', 'Lua de Mel');
    if (cat === 'FAMILIA') tags.push('Crianças', 'Diversão');
    if (cat === 'VIDA_NOTURNA') tags.push('Festas', 'Agito');
    if (cat === 'VIAGEM_BARATA') tags.push('Econômico', 'Promoção');

    if (dest.includes('São Thomé') || dest.includes('Sana')) tags.push('Good Vibes', 'Natureza');
    if (dest.includes('Camping')) tags.push('Camping', 'Aventura');
    
    // SP Context tags
    if (dest.includes('SP') || dest.includes('RJ') || dest.includes('MG') || dest.includes('PR')) {
        tags.push('Perto de SP');
    }
    
    // Random fillers
    if (Math.random() > 0.7) tags.push('Instagramável');
    if (Math.random() > 0.8) tags.push('Guiado');

    return Array.from(new Set(tags));
};

// Build the trips array
const generatedTrips: Trip[] = [];

MOCK_AGENCIES.forEach((agency) => {
  let specs = agencyTripsData[agency.name];
  
  // If agency has few trips defined, generate generic ones to reach ~10 trips per agency
  if (!specs || specs.length < 10) {
      const existingSpecs = specs || [];
      const needed = 10 - existingSpecs.length;
      const genericSpecs: TripSpec[] = [];
      const baseImg = existingSpecs[0]?.imgKey || 'praia';
      
      for(let k=0; k<needed; k++) {
         genericSpecs.push({
             title: `Expedição ${agency.name.split(' ')[0]} ${k+1}`,
             dest: 'Destino Surpresa',
             cat: 'AVENTURA',
             days: 3 + k,
             price: 500 + (k*100),
             desc: 'Um roteiro exclusivo preparado pela nossa agência.',
             imgKey: baseImg,
             tags: ['Exclusivo'],
             featured: Math.random() > 0.8 // Small chance of being featured
         });
      }
      specs = [...existingSpecs, ...genericSpecs];
  }

  specs.forEach((spec, i) => {
    const uniqueTags = getTags(spec.cat, spec.dest, spec.tags);
    const id = `t_${agency.id}_${i}`;

    generatedTrips.push({
      id: id,
      agencyId: agency.id,
      title: spec.title,
      slug: slugify(spec.title) + `-${id}`, // Generate simple slug
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
      totalReviews: Math.floor(Math.random() * 100),
      included: ['Hospedagem', 'Café da Manhã', 'Guia'],
      notIncluded: ['Almoço', 'Jantar', 'Bebidas'],
      views: Math.floor(Math.random() * 5000),
      sales: Math.floor(Math.random() * 100),
      featured: spec.featured || false,
      popularNearSP: spec.nearSP || false,
      itinerary: [] // Default empty
    });
  });
});

export const MOCK_TRIPS: Trip[] = generatedTrips;
export const MOCK_BOOKINGS: Booking[] = [];
export const MOCK_REVIEWS: Review[] = [];