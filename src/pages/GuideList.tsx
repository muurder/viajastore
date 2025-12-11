
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Link } from 'react-router-dom';
import { User, Star, Search, ArrowRight, CheckCircle, Shield, MapPin, Filter, Sparkles, ChevronLeft, ChevronRight, ArrowUpDown, LayoutGrid, List, X, Loader, Compass, MessageCircle, Globe } from 'lucide-react';
import { Agency } from '../types';

const ITEMS_PER_PAGE = 12;

// Guide specialties (different from trip categories)
const GUIDE_SPECIALTIES = [
  'Histórico', 'Ecológico', 'Aventura', 'Cultural', 'Gastronômico', 
  'Bilingue', 'Fotografia', 'Religião', 'Arquitetura', 'Natureza'
];

const GuideList: React.FC = () => {
  const { agencies, trips, loading: dataLoading } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<'RELEVANCE' | 'NAME' | 'RATING'>('RELEVANCE');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('guideViewMode') as 'grid' | 'list') || 'grid';
  });
  const [heroBackgroundImage, setHeroBackgroundImage] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('guideViewMode', viewMode);
  }, [viewMode]);

  // Select random trip image for hero background on mount/refresh
  useEffect(() => {
    const tripsWithImages = trips.filter(trip => trip.images && trip.images.length > 0 && trip.images[0]);
    if (tripsWithImages.length > 0) {
      const randomTrip = tripsWithImages[Math.floor(Math.random() * tripsWithImages.length)];
      if (randomTrip.images && randomTrip.images[0]) {
        setHeroBackgroundImage(randomTrip.images[0]);
      }
    }
  }, [trips]);

  // Filter guides from agencies - ONLY show actual guides
  const allGuides = useMemo(() => {
    return agencies.filter(agency => {
      // Check if isGuide flag is true
      if (agency.isGuide === true) return true;
      
      // Check if 'GUIA' tag exists in customSettings
      if (agency.customSettings?.tags?.includes('GUIA')) return true;
      
      // No fallback - only show actual guides
      return false;
    });
  }, [agencies]);

  // Filter and sort guides
  const filteredGuides = useMemo(() => {
    let filtered = [...allGuides];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(guide => 
        guide.name.toLowerCase().includes(term) ||
        guide.description?.toLowerCase().includes(term) ||
        guide.address?.city?.toLowerCase().includes(term) ||
        guide.address?.state?.toLowerCase().includes(term) ||
        guide.customSettings?.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Specialty filter
    if (selectedSpecialty) {
      filtered = filtered.filter(guide => 
        guide.customSettings?.tags?.some(tag => 
          tag.toLowerCase().includes(selectedSpecialty.toLowerCase())
        )
      );
    }

    // Sort
    switch (sortOption) {
      case 'NAME':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'RATING':
        // Placeholder - would need rating data
        break;
      default:
        // RELEVANCE - keep original order
        break;
    }

    return filtered;
  }, [allGuides, searchTerm, selectedSpecialty, sortOption]);

  // Pagination
  const totalPages = Math.ceil(filteredGuides.length / ITEMS_PER_PAGE);
  const paginatedGuides = filteredGuides.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSpecialty(null);
    setCurrentPage(1);
  };

  const buildWhatsAppLink = (guide: Agency) => {
    if (!guide.whatsapp && !guide.phone) return '#';
    const number = (guide.whatsapp || guide.phone || '').replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${guide.name}, vi seu perfil na ViajaStore e gostaria de saber mais sobre seus serviços de guia turístico.`);
    return `https://wa.me/${number}?text=${message}`;
  };

  const getGuideSpecialties = (guide: Agency): string[] => {
    // Get specialties from customSettings.tags, filtering out 'GUIA'
    const tags = guide.customSettings?.tags || [];
    return tags.filter(tag => tag !== 'GUIA' && GUIDE_SPECIALTIES.some(s => s.toLowerCase() === tag.toLowerCase()));
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 px-4 sm:px-6 lg:px-8">
      
      {/* Premium Hero Section - Imersivo como Home e TripList */}
      <div className="relative overflow-hidden mb-16 rounded-3xl shadow-2xl min-h-[500px] md:min-h-[600px] flex flex-col items-center justify-center group bg-gray-900">
        {/* Background Image - Sem blur excessivo, como Home */}
        {heroBackgroundImage ? (
          <div className="absolute inset-0 z-0">
            <img 
              src={heroBackgroundImage}
              alt="Background" 
              className="w-full h-full object-cover transition-transform duration-[10s] ease-linear scale-110 group-hover:scale-115"
            />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-blue-50 via-slate-50 to-gray-100"></div>
        )}
        
        {/* Enhanced Gradient Overlay - Similar to Home */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/90 z-[1]"></div>
        
        {/* Main Content - Centered */}
        <div className="relative z-30 w-full max-w-[1600px] mx-auto px-6 md:px-12 flex-1 flex flex-col justify-center py-12 md:py-20">
          {/* Centered Typography */}
          <div className="text-center mb-8 md:mb-10 animate-[fadeInUp_0.8s_ease-out]">
            {/* Premium Icon Badge */}
            <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/30 shadow-xl mb-6 animate-[fadeIn_0.5s]">
              <Compass className="text-white" size={40} />
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight drop-shadow-2xl">
              Conheça quem entende do destino
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-gray-200 max-w-2xl mx-auto font-light leading-relaxed drop-shadow-lg">
              Guias de turismo credenciados para tornar sua viagem única e inesquecível
            </p>
          </div>
          
          {/* Premium Search Bar - Centered */}
          <div className="relative max-w-2xl mx-auto animate-[fadeInUp_1.1s] z-[100]">
            <div className="absolute inset-0 bg-white/20 backdrop-blur-sm rounded-2xl blur-xl"></div>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={22} />
              <input 
                type="text" 
                placeholder="Buscar por nome, cidade ou especialidade..." 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-14 pr-12 py-5 bg-white/95 backdrop-blur-md border-2 border-white/50 rounded-2xl focus:ring-4 focus:ring-white/50 focus:border-white outline-none shadow-2xl transition-all text-base placeholder:text-gray-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Premium Filters and Sort */}
      <div className="flex flex-col gap-6 mb-10">
        {/* Specialty Pills - Full Width */}
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide w-full">
          <button
            onClick={() => {
              setSelectedSpecialty(null);
              setCurrentPage(1);
            }}
            className={`whitespace-nowrap px-6 py-3 rounded-full border-2 transition-all text-sm font-bold shadow-lg hover:scale-105 ${
              !selectedSpecialty
                ? 'bg-gradient-to-r from-primary-600 to-primary-700 border-primary-700 text-white shadow-primary-500/50'
                : 'bg-white border-gray-300 text-gray-700 hover:border-primary-300 hover:bg-primary-50'
            }`}
          >
            Todos
          </button>
          {GUIDE_SPECIALTIES.map(specialty => (
            <button
              key={specialty}
              onClick={() => {
                setSelectedSpecialty(selectedSpecialty === specialty ? null : specialty);
                setCurrentPage(1);
              }}
              className={`whitespace-nowrap px-6 py-3 rounded-full border-2 transition-all text-sm font-bold shadow-lg hover:scale-105 ${
                selectedSpecialty === specialty
                  ? 'bg-gradient-to-r from-primary-600 to-primary-700 border-primary-700 text-white shadow-primary-500/50'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-primary-300 hover:bg-primary-50'
              }`}
            >
              {specialty}
            </button>
          ))}
        </div>

        {/* Sort and View Controls - Separate Row */}
        <div className="flex items-center justify-end gap-3">
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
            className="px-5 py-3 bg-white border-2 border-gray-300 rounded-xl text-sm font-bold text-gray-700 focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-md hover:shadow-lg transition-all"
          >
            <option value="RELEVANCE">Relevância</option>
            <option value="NAME">Nome A-Z</option>
            <option value="RATING">Avaliação</option>
          </select>

          <div className="flex items-center gap-1 bg-white border-2 border-gray-300 rounded-xl p-1.5 shadow-md">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-lg transition-all ${
                viewMode === 'grid' 
                  ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-lg scale-105' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-lg transition-all ${
                viewMode === 'list' 
                  ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-lg scale-105' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Premium Results Count */}
      {(searchTerm || selectedSpecialty) && (
        <div className="mb-8 flex items-center justify-between bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl px-6 py-4 border-2 border-primary-100 shadow-md">
          <p className="text-gray-700 font-bold text-base">
            <span className="text-primary-600">{filteredGuides.length}</span> {filteredGuides.length === 1 ? 'guia encontrado' : 'guias encontrados'}
          </p>
          <button
            onClick={clearFilters}
            className="text-primary-600 hover:text-primary-700 text-sm font-bold flex items-center gap-2 bg-white px-4 py-2 rounded-lg border-2 border-primary-200 hover:border-primary-300 transition-all shadow-sm hover:shadow-md"
          >
            <X size={16} /> Limpar filtros
          </button>
        </div>
      )}

      {/* Premium Loading State */}
      {dataLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 overflow-hidden animate-pulse">
              <div className="pt-10 pb-6 px-6 bg-gradient-to-br from-primary-200 to-primary-300">
                <div className="w-28 h-28 rounded-full bg-white/50 mx-auto"></div>
              </div>
              <div className="px-6 py-4 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-3/4 mx-auto"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                <div className="flex gap-2 justify-center">
                  <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded-xl mt-4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : paginatedGuides.length === 0 ? (
        <div className="text-center py-20 bg-gradient-to-br from-gray-50 to-white rounded-3xl border-2 border-dashed border-gray-300 shadow-lg">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
            <Compass className="text-gray-400" size={40} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Nenhum guia encontrado</h3>
          <p className="text-gray-600 mb-8 text-lg">Tente ajustar os filtros ou buscar por outros termos.</p>
          <button
            onClick={clearFilters}
            className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-8 py-3 rounded-xl font-bold hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg hover:shadow-xl hover:scale-105"
          >
            Limpar Filtros
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <>
          {/* Grid View - Portrait Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {paginatedGuides.map(guide => {
              const specialties = getGuideSpecialties(guide);
              const whatsappLink = buildWhatsAppLink(guide);
              const location = guide.address 
                ? `${guide.address.city || ''}${guide.address.city && guide.address.state ? ', ' : ''}${guide.address.state || ''}`
                : 'Localização não informada';

              return (
                <div
                  key={guide.agencyId}
                  className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col group"
                >
                  {/* Premium Avatar Section */}
                  <div className="relative pt-10 pb-6 px-6 text-center overflow-hidden">
                    {/* Premium Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-400 via-primary-500 to-secondary-500"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]"></div>
                    
                    <div className="relative inline-block">
                      {guide.logo ? (
                        <div className="relative">
                          <div className="absolute inset-0 bg-white rounded-full blur-xl opacity-50"></div>
                          <img
                            src={guide.logo}
                            alt={guide.name}
                            className="relative w-28 h-28 rounded-full object-cover border-4 border-white shadow-2xl mx-auto ring-4 ring-white/50"
                          />
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="absolute inset-0 bg-white rounded-full blur-xl opacity-50"></div>
                          <div className="relative w-28 h-28 rounded-full bg-white border-4 border-white shadow-2xl mx-auto flex items-center justify-center ring-4 ring-white/50">
                            <User className="text-primary-600" size={48} />
                          </div>
                        </div>
                      )}
                      {guide.subscriptionStatus === 'ACTIVE' && (
                        <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-green-500 to-green-600 rounded-full p-2 border-4 border-white shadow-xl">
                          <CheckCircle size={18} className="text-white" fill="currentColor" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info Section */}
                  <div className="px-6 py-4 flex-grow flex flex-col">
                    <h3 className="font-bold text-lg text-gray-900 mb-1 text-center line-clamp-1">
                      {guide.name}
                    </h3>
                    
                    <div className="flex items-center justify-center gap-1 text-gray-500 text-sm mb-3">
                      <MapPin size={14} />
                      <span className="line-clamp-1">{location}</span>
                    </div>

                    {/* Premium Specialties Tags */}
                    {specialties.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center mb-4">
                        {specialties.slice(0, 3).map((specialty, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 bg-gradient-to-r from-primary-100 to-primary-50 text-primary-700 text-xs font-bold rounded-full border-2 border-primary-200 shadow-sm"
                          >
                            {specialty}
                          </span>
                        ))}
                        {specialties.length > 3 && (
                          <span className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-full border-2 border-gray-200">
                            +{specialties.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Description Preview */}
                    {guide.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-4 text-center flex-grow">
                        {guide.description}
                      </p>
                    )}

                    {/* Premium CTA - Single Button with WhatsApp Badge */}
                    <div className="mt-auto relative">
                      <Link
                        to={`/${guide.slug}`}
                        className="w-full py-3 px-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-bold hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg hover:shadow-xl hover:scale-105 text-center flex items-center justify-center gap-2 group-hover:shadow-primary-500/50"
                      >
                        Ver Perfil <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </Link>
                      {whatsappLink !== '#' && (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="absolute -right-2 -top-2 p-2.5 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-full transition-all shadow-xl hover:scale-110 z-10"
                          title="Contatar via WhatsApp"
                        >
                          <MessageCircle size={16} className="text-white" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Premium Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-12">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-3 rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:scale-105 font-bold text-gray-700"
              >
                <ChevronLeft size={20} />
              </button>
              
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-5 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg hover:scale-105 ${
                        currentPage === page
                          ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-primary-500/50'
                          : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-primary-300 hover:bg-primary-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="px-3 text-gray-400 font-bold text-lg">...</span>;
                }
                return null;
              })}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-3 rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:scale-105 font-bold text-gray-700"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      ) : (
        // Premium List View
        <div className="space-y-6 mb-8">
          {paginatedGuides.map(guide => {
            const specialties = getGuideSpecialties(guide);
            const whatsappLink = buildWhatsAppLink(guide);
            const location = guide.address 
              ? `${guide.address.city || ''}${guide.address.city && guide.address.state ? ', ' : ''}${guide.address.state || ''}`
              : 'Localização não informada';

            return (
              <div
                key={guide.agencyId}
                className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 flex items-start gap-8 group"
              >
                {/* Premium Avatar */}
                <div className="flex-shrink-0 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full blur-md opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  {guide.logo ? (
                    <img
                      src={guide.logo}
                      alt={guide.name}
                      className="relative w-24 h-24 rounded-full object-cover border-4 border-white shadow-2xl ring-4 ring-primary-100"
                    />
                  ) : (
                    <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 border-4 border-white shadow-2xl flex items-center justify-center ring-4 ring-primary-100">
                      <User className="text-primary-600" size={40} />
                    </div>
                  )}
                  {guide.subscriptionStatus === 'ACTIVE' && (
                    <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-green-500 to-green-600 rounded-full p-2 border-4 border-white shadow-xl">
                      <CheckCircle size={18} className="text-white" fill="currentColor" />
                    </div>
                  )}
                </div>

                {/* Premium Info */}
                <div className="flex-grow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-extrabold text-2xl text-gray-900 mb-2">
                        {guide.name}
                      </h3>
                      <div className="flex items-center gap-2 text-gray-600 text-base font-medium">
                        <MapPin size={16} className="text-primary-500" />
                        <span>{location}</span>
                      </div>
                    </div>
                  </div>

                  {guide.description && (
                    <p className="text-gray-700 mb-4 line-clamp-2 text-base leading-relaxed">{guide.description}</p>
                  )}

                  {specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {specialties.map((specialty, idx) => (
                        <span
                          key={idx}
                          className="px-4 py-1.5 bg-gradient-to-r from-primary-100 to-primary-50 text-primary-700 text-xs font-bold rounded-full border-2 border-primary-200 shadow-sm"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Link
                      to={`/${guide.slug}`}
                      className="relative px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-bold hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg hover:shadow-xl hover:scale-105 text-sm flex items-center gap-2"
                    >
                      Ver Perfil <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      {whatsappLink !== '#' && (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="absolute -right-2 -top-2 p-2 bg-green-500 hover:bg-green-600 rounded-full transition-all shadow-lg hover:scale-110"
                          title="Contatar via WhatsApp"
                        >
                          <MessageCircle size={14} className="text-white" />
                        </a>
                      )}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GuideList;
