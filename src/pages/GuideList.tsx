
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
  const { agencies, loading: dataLoading } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<'RELEVANCE' | 'NAME' | 'RATING'>('RELEVANCE');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('guideViewMode') as 'grid' | 'list') || 'grid';
  });

  useEffect(() => {
    localStorage.setItem('guideViewMode', viewMode);
  }, [viewMode]);

  // Filter guides from agencies
  // Check for isGuide flag OR 'GUIA' tag in customSettings
  const allGuides = useMemo(() => {
    return agencies.filter(agency => {
      // Check if isGuide flag is true
      if (agency.isGuide === true) return true;
      
      // Check if 'GUIA' tag exists in customSettings
      if (agency.customSettings?.tags?.includes('GUIA')) return true;
      
      // Fallback: For now, show all agencies as guides to test the visual
      // Remove this fallback when real guide data is available
      return true;
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
      
      {/* Hero Section - Focused on People */}
      <div className="py-12 text-center border-b border-gray-200 mb-12 bg-gradient-to-br from-primary-50 via-white to-secondary-50 rounded-2xl px-6">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
            <Compass className="text-primary-600" size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Conheça quem entende do destino
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Guias de turismo credenciados para tornar sua viagem única.
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome, cidade ou especialidade (ex: Histórico)" 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-lg transition-all text-base"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters and Sort - FIX: Premium scrollable pills */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide w-full md:w-auto">
          <button
            onClick={() => {
              setSelectedSpecialty(null);
              setCurrentPage(1);
            }}
            className={`whitespace-nowrap px-6 py-2 rounded-full border transition-all text-sm font-medium ${
              !selectedSpecialty
                ? 'bg-primary-600 border-primary-600 text-white shadow-md'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
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
              className={`whitespace-nowrap px-6 py-2 rounded-full border transition-all text-sm font-medium ${
                selectedSpecialty === specialty
                  ? 'bg-primary-600 border-primary-600 text-white shadow-md'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {specialty}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          >
            <option value="RELEVANCE">Relevância</option>
            <option value="NAME">Nome A-Z</option>
            <option value="RATING">Avaliação</option>
          </select>

          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-400'
              }`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-400'
              }`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      {(searchTerm || selectedSpecialty) && (
        <div className="mb-6 flex items-center justify-between">
          <p className="text-gray-600">
            {filteredGuides.length} {filteredGuides.length === 1 ? 'guia encontrado' : 'guias encontrados'}
          </p>
          <button
            onClick={clearFilters}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
          >
            <X size={14} /> Limpar filtros
          </button>
        </div>
      )}

      {/* Loading State */}
      {dataLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-pulse">
              <div className="w-24 h-24 rounded-full bg-gray-200 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          ))}
        </div>
      ) : paginatedGuides.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <Compass className="text-gray-300 mx-auto mb-4" size={48} />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum guia encontrado</h3>
          <p className="text-gray-500 mb-6">Tente ajustar os filtros ou buscar por outros termos.</p>
          <button
            onClick={clearFilters}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
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
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col"
                >
                  {/* Avatar Section - Large and Centered */}
                  <div className="pt-8 pb-4 px-6 text-center bg-gradient-to-br from-primary-50 to-secondary-50">
                    <div className="relative inline-block">
                      {guide.logo ? (
                        <img
                          src={guide.logo}
                          alt={guide.name}
                          className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg mx-auto"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-primary-100 border-4 border-white shadow-lg mx-auto flex items-center justify-center">
                          <User className="text-primary-600" size={40} />
                        </div>
                      )}
                      {guide.subscriptionStatus === 'ACTIVE' && (
                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1.5 border-2 border-white">
                          <CheckCircle size={16} className="text-white" fill="currentColor" />
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

                    {/* Specialties Tags */}
                    {specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                        {specialties.slice(0, 3).map((specialty, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full border border-primary-100"
                          >
                            {specialty}
                          </span>
                        ))}
                        {specialties.length > 3 && (
                          <span className="px-2.5 py-1 bg-gray-50 text-gray-600 text-xs font-medium rounded-full">
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

                    {/* CTA Buttons */}
                    <div className="flex flex-col gap-2 mt-auto">
                      <Link
                        to={`/${guide.slug}`}
                        className="w-full py-2.5 px-4 border-2 border-primary-600 text-primary-600 rounded-lg font-medium hover:bg-primary-50 transition-colors text-center flex items-center justify-center gap-2"
                      >
                        Ver Perfil <ArrowRight size={16} />
                      </Link>
                      {whatsappLink !== '#' && (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 px-4 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors text-center flex items-center justify-center gap-2"
                        >
                          <MessageCircle size={16} /> WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
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
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-primary-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="px-2 text-gray-400">...</span>;
                }
                return null;
              })}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      ) : (
        // List View
        <div className="space-y-4 mb-8">
          {paginatedGuides.map(guide => {
            const specialties = getGuideSpecialties(guide);
            const whatsappLink = buildWhatsAppLink(guide);
            const location = guide.address 
              ? `${guide.address.city || ''}${guide.address.city && guide.address.state ? ', ' : ''}${guide.address.state || ''}`
              : 'Localização não informada';

            return (
              <div
                key={guide.agencyId}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300 flex items-start gap-6"
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {guide.logo ? (
                    <img
                      src={guide.logo}
                      alt={guide.name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-100"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary-100 border-2 border-gray-100 flex items-center justify-center">
                      <User className="text-primary-600" size={32} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-grow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-xl text-gray-900 mb-1">
                        {guide.name}
                        {guide.subscriptionStatus === 'ACTIVE' && (
                          <CheckCircle size={18} className="inline ml-2 text-green-500" fill="currentColor" />
                        )}
                      </h3>
                      <div className="flex items-center gap-1 text-gray-500 text-sm">
                        <MapPin size={14} />
                        <span>{location}</span>
                      </div>
                    </div>
                  </div>

                  {guide.description && (
                    <p className="text-gray-600 mb-3 line-clamp-2">{guide.description}</p>
                  )}

                  {specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {specialties.map((specialty, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full border border-primary-100"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Link
                      to={`/${guide.slug}`}
                      className="px-4 py-2 border-2 border-primary-600 text-primary-600 rounded-lg font-medium hover:bg-primary-50 transition-colors text-sm flex items-center gap-2"
                    >
                      Ver Perfil <ArrowRight size={14} />
                    </Link>
                    {whatsappLink !== '#' && (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors text-sm flex items-center gap-2"
                      >
                        <MessageCircle size={14} /> WhatsApp
                      </a>
                    )}
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
