import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Link } from 'react-router-dom';
import { User, Search, CheckCircle, MapPin, Compass, MessageCircle, ArrowRight, Star, Globe, Image as ImageIcon, Camera, Heart, Share2 } from 'lucide-react';
import { Agency } from '../types';
import { GuideCardSkeleton } from '../components/GuideCardSkeleton';

const ITEMS_PER_PAGE = 12;

// Guide specialties icons mapping
const SPECIALTY_ICONS: Record<string, React.ReactNode> = {
  'Histórico': <Compass size={14} />,
  'Ecológico': <Globe size={14} />,
  'Aventura': <Camera size={14} />,
  'Cultural': <User size={14} />,
  'Gastronômico': <Star size={14} />, // Placeholder
  'Bilingue': <MessageCircle size={14} />,
};

const GuideList: React.FC = () => {
  const { agencies, trips, loading: dataLoading } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [heroBackgroundImage, setHeroBackgroundImage] = useState<string>('');

  // Random hero image
  useEffect(() => {
    const tripsWithImages = trips.filter(trip => trip.images?.length > 0);
    if (tripsWithImages.length > 0) {
      const randomTrip = tripsWithImages[Math.floor(Math.random() * tripsWithImages.length)];
      setHeroBackgroundImage(randomTrip.images[0]);
    }
  }, [trips]);

  // Filter only Guides
  const allGuides = useMemo(() => {
    return agencies.filter(agency => agency.isGuide || agency.customSettings?.tags?.includes('GUIA'));
  }, [agencies]);

  // Filter logic
  const filteredGuides = useMemo(() => {
    let filtered = [...allGuides];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(g =>
        g.name.toLowerCase().includes(term) ||
        g.description?.toLowerCase().includes(term) ||
        g.languages?.some(l => l.toLowerCase().includes(term))
      );
    }
    if (selectedSpecialty) {
      filtered = filtered.filter(g => g.specialties?.includes(selectedSpecialty) || g.customSettings?.tags?.includes(selectedSpecialty));
    }
    return filtered;
  }, [allGuides, searchTerm, selectedSpecialty]);

  const paginatedGuides = filteredGuides.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredGuides.length / ITEMS_PER_PAGE);

  // Helper to build WhatsApp link
  const buildWhatsAppLink = (guide: Agency) => {
    const phone = guide.whatsapp || guide.phone;
    if (!phone) return '#';
    const number = phone.replace(/\D/g, '');
    return `https://wa.me/${number}?text=${encodeURIComponent('Olá! Vi seu perfil na ViajaStore.')}`;
  };

  const allSpecialties = Array.from(new Set(allGuides.flatMap(g => g.specialties || g.customSettings?.tags || []).filter(t => t !== 'GUIA')));

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* Hero Section - Enhanced overlay */}
      <div className="relative h-[500px] flex items-center justify-center mb-12 overflow-hidden">
        <div className="absolute inset-0">
          {heroBackgroundImage && (
            <img src={heroBackgroundImage} alt="Hero" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center p-3 mb-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl animate-fade-in-up">
            <Compass className="text-primary-200 mr-2" size={24} />
            <span className="text-white font-semibold">Guias Especializados</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight drop-shadow-2xl">
            Encontre o <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-200 to-primary-50">Talento Ideal</span> para sua aventura
          </h1>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto mt-8">
            <div className="absolute inset-0 bg-white/20 backdrop-blur-xl rounded-full translate-y-2 blur-sm"></div>
            <div className="relative flex items-center bg-white rounded-full shadow-2xl p-2 pr-2">
              <Search className="text-gray-400 ml-4" size={20} />
              <input
                type="text"
                placeholder="Busque por nome, idioma ou especialidade..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-gray-800 placeholder:text-gray-400 px-4"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <button className="bg-primary-800 hover:bg-primary-900 text-white px-6 py-3 rounded-full font-bold transition-all transform hover:scale-105">
                Buscar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-10 justify-center">
          <button
            onClick={() => setSelectedSpecialty(null)}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${!selectedSpecialty
                ? 'bg-primary-800 text-white shadow-lg shadow-primary-800/30'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
          >
            Todos
          </button>
          {allSpecialties.slice(0, 10).map(spec => (
            <button
              key={spec}
              onClick={() => setSelectedSpecialty(spec === selectedSpecialty ? null : spec)}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${selectedSpecialty === spec
                  ? 'bg-primary-800 text-white shadow-lg shadow-primary-800/30'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
            >
              {spec}
            </button>
          ))}
        </div>

        {/* Loading / Empty States */}
        {dataLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => <GuideCardSkeleton key={i} />)}
          </div>
        ) : paginatedGuides.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <Compass className="mx-auto text-gray-300 mb-4" size={64} />
            <h3 className="text-xl font-bold text-gray-800">Nenhum guia encontrado</h3>
            <p className="text-gray-500">Tente ajustar seus filtros de busca.</p>
          </div>
        ) : (
          /* Talent Cards Grid - Aligned left, with skeletons if needed */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" style={{ justifyItems: 'start' }}>
            {paginatedGuides.map(guide => (
              <TalentCard key={guide.id} guide={guide} whatsappLink={buildWhatsAppLink(guide)} />
            ))}
            {/* Show placeholder message if only 1-2 cards */}
            {paginatedGuides.length <= 2 && paginatedGuides.length > 0 && (
              <div className="bg-gradient-to-br from-stone-50 to-stone-100 rounded-3xl border-2 border-dashed border-stone-300 p-12 flex flex-col items-center justify-center text-center min-h-[400px] w-full">
                <Compass className="text-stone-400 mb-4" size={48} />
                <h3 className="text-lg font-bold text-stone-700 mb-2">Mais guias chegando em breve...</h3>
                <p className="text-stone-500 text-sm">Estamos sempre adicionando novos talentos especializados.</p>
              </div>
            )}
            {/* Show skeletons to fill empty spaces if only 1-2 cards */}
            {paginatedGuides.length <= 2 && paginatedGuides.length > 0 && (
              <>
                {[...Array(Math.max(0, 3 - paginatedGuides.length))].map((_, i) => (
                  <GuideCardSkeleton key={`placeholder-skeleton-${i}`} />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Sub-components ---

const TalentCard: React.FC<{ guide: Agency; whatsappLink: string }> = ({ guide, whatsappLink }) => {
  // Placeholder Images if portfolio empty
  const portfolio = guide.customSettings?.included?.length ? guide.customSettings.included : [
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=400&q=80'
  ];

  return (
    <div className="group bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col relative top-0 hover:-top-2">

      {/* Header: Cover & Profile - Verde Musgo Profundo */}
      <div className="relative h-32 bg-primary-800">
        {/* Subtle map texture overlay */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/map.png')]"></div>
        <div className="absolute -bottom-12 left-6">
          <div className="relative">
            <img
              src={guide.logo || `https://ui-avatars.com/api/?name=${guide.name}`}
              alt={guide.name}
              className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-xl bg-white"
            />
            {guide.cadastur && (
              <div className="absolute -right-2 -bottom-2 bg-primary-700 text-white p-1.5 rounded-full border-2 border-white shadow-lg" title="Cadastur Verificado">
                <CheckCircle size={14} fill="currentColor" className="text-white" />
              </div>
            )}
          </div>
        </div>
        <div className="absolute top-4 right-4 flex gap-2">
          <button className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors">
            <Share2 size={18} />
          </button>
          <button className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors">
            <Heart size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="pt-14 px-6 pb-6 flex-1 flex flex-col">
        <div className="mb-4">
          {/* Serif font for authority/experience */}
          <h3 className="text-2xl font-serif font-bold text-gray-900 group-hover:text-primary-800 transition-colors leading-tight">
            {guide.name}
          </h3>
          <div className="flex items-center text-gray-500 text-sm mt-2">
            <MapPin size={14} className="mr-1.5 text-primary-700" />
            {guide.address?.city || 'Localização não definida'} • {guide.experienceYears || '2'} anos de exp.
          </div>
        </div>

        {/* Specialties & Languages Badges - Tons de Terra */}
        <div className="flex flex-wrap gap-2 mb-6">
          {guide.languages?.map(lang => (
            <span key={lang} className="inline-flex items-center px-3 py-1.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-full border border-stone-200">
              <Globe size={12} className="mr-1.5" /> {lang}
            </span>
          ))}
          {guide.specialties?.slice(0, 3).map(spec => (
            <span key={spec} className="inline-flex items-center px-3 py-1.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-full border border-stone-200">
              {SPECIALTY_ICONS[spec] || <Star size={12} className="mr-1.5" />} {spec}
            </span>
          ))}
        </div>

        {/* Mini Portfolio */}
        <div className="mb-6">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Portfólio Recente</h4>
          <div className="flex gap-2 overflow-hidden rounded-xl">
            {portfolio.map((img, idx) => (
              <div key={idx} className="h-16 w-1/3 relative group/img overflow-hidden">
                <img src={img} className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110" alt="Portfolio" />
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto flex gap-3">
          <Link to={`/${guide.slug}`} className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-full text-center text-sm transition-colors flex items-center justify-center border border-stone-200">
            Ver Perfil
          </Link>
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 bg-secondary-500 hover:bg-secondary-600 text-white font-bold rounded-full text-center text-sm transition-all shadow-lg shadow-secondary-500/30 flex items-center justify-center">
            <MessageCircle size={18} className="mr-2" />
            Solicitar
          </a>
        </div>
      </div>
    </div>
  );
};

export default GuideList;
