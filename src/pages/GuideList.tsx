
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Link } from 'react-router-dom';
import { User, Star, Search, ArrowRight, CheckCircle, Shield, Users, MapPin, Filter, Sparkles, ChevronLeft, ChevronRight, ArrowUpDown, LayoutGrid, List, X, Loader, Compass } from 'lucide-react';
import { Agency, TripCategory } from '../types';

const ITEMS_PER_PAGE = 9;

const GuideList: React.FC = () => {
  const { searchAgencies } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<'RELEVANCE' | 'NAME' | 'RATING'>('RELEVANCE');
  const [currentPage, setCurrentPage] = useState(1);
  const [guides, setGuides] = useState<Agency[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // View Mode State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('guideViewMode') as 'grid' | 'list') || 'grid';
  });

  useEffect(() => {
    localStorage.setItem('guideViewMode', viewMode);
  }, [viewMode]);

  // Debounce logic for search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm, selectedSpecialty, sortOption, currentPage]);

  const fetchData = async () => {
    setLoading(true);
    const { data, count } = await searchAgencies({
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      query: searchTerm,
      specialty: selectedSpecialty || undefined,
      sort: sortOption
    });
    
    // Filter for guides (for now, filter on frontend - can be moved to backend later)
    // Assuming guides are agencies with a specific tag or type
    // For now, we'll filter by checking if the agency has guide-related tags
    const guideData = data.filter(agency => {
      // Check if agency has guide-related tags or description
      const tags = agency.customSettings?.tags || [];
      const hasGuideTag = tags.some(tag => 
        ['guia', 'guide', 'turismo', 'tour', 'especialista'].some(keyword => 
          tag.toLowerCase().includes(keyword)
        )
      );
      const hasGuideInDescription = agency.description?.toLowerCase().includes('guia') || 
                                    agency.description?.toLowerCase().includes('guide');
      return hasGuideTag || hasGuideInDescription;
    });
    
    setGuides(guideData);
    setTotalCount(guideData.length);
    setLoading(false);
  };

  // Specialties for guides (different from agencies)
  const guideSpecialties: string[] = ['Histórico', 'Ecológico', 'Aventura', 'Cultural', 'Gastronômico'];

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
      setSearchTerm('');
      setSelectedSpecialty(null);
      setCurrentPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 px-4 sm:px-6 lg:px-8">
      
      {/* Header & Search */}
      <div className="py-8 border-b border-gray-200 mb-8">
         <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
               <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                 <Compass className="text-primary-600" size={32} />
                 Guias Especialistas
               </h1>
               <p className="text-gray-500 mt-2 max-w-xl">
                 Encontre guias de turismo especializados para tornar sua viagem inesquecível.
               </p>
            </div>
            
            <div className="w-full md:w-auto flex flex-col gap-3">
               <div className="flex flex-col sm:flex-row gap-3">
                   <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Buscar guia..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm transition-all text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                   </div>
                   
                   <div className="relative w-full sm:w-48">
                      <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value as any)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm appearance-none cursor-pointer text-gray-700 font-medium text-sm"
                      >
                        <option value="RELEVANCE">Relevância</option>
                        <option value="RATING">Melhor Avaliados</option>
                        <option value="NAME">Ordem Alfabética</option>
                      </select>
                   </div>

                   <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 flex-shrink-0">
                      <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid size={18} /></button>
                      <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><List size={18} /></button>
                   </div>
               </div>
            </div>
         </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
         
         {/* Sidebar Filters */}
         <aside className="hidden lg:block w-64 flex-shrink-0 space-y-8">
            <div>
               <h3 className="font-bold text-gray-900 mb-4 flex items-center justify-between">
                   <span className="flex items-center"><Filter size={16} className="mr-2"/> Especialidade</span>
                   {(selectedSpecialty || searchTerm) && (
                       <button onClick={clearFilters} className="text-[10px] text-red-500 hover:underline font-bold uppercase">Limpar</button>
                   )}
               </h3>
               <div className="space-y-2">
                  <button onClick={() => setSelectedSpecialty(null)} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!selectedSpecialty ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>Todos os Guias</button>
                  {guideSpecialties.map(spec => (
                    <button key={spec} onClick={() => setSelectedSpecialty(spec)} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex justify-between items-center group ${selectedSpecialty === spec ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                      <span className="capitalize truncate">{spec}</span>
                    </button>
                  ))}
               </div>
            </div>
         </aside>

         {/* Guide List */}
         <div className="flex-1">
            <div className="mb-4 flex justify-between items-center">
               <div className="text-sm text-gray-500 font-medium">Mostrando <span className="text-gray-900 font-bold">{totalCount}</span> guias</div>
               {(selectedSpecialty || searchTerm) && (<button onClick={clearFilters} className="text-sm text-primary-600 font-bold hover:underline flex items-center gap-1"><X size={14}/> Mostrar Todos</button>)}
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64"><Loader className="animate-spin text-primary-600" size={32} /></div>
            ) : (
                <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                {guides.map(guide => {
                  // Extract specialties from tags or use default
                  const specialties = guide.customSettings?.tags?.slice(0, 3) || ['Especialista em Turismo'];
                  
                  return (
                    <Link key={guide.agencyId} to={`/${guide.slug}`} className={`bg-white border border-gray-100 rounded-2xl hover:shadow-lg transition-all duration-300 group relative flex animate-[fadeIn_0.3s] ${viewMode === 'grid' ? 'flex-col p-5 h-full' : 'flex-row p-4 items-center'}`}>
                        <div className={`flex items-start ${viewMode === 'grid' ? 'justify-between mb-4 w-full' : 'gap-6 flex-1'}`}>
                            <div className={`flex items-center gap-4 ${viewMode === 'grid' ? 'w-full' : ''}`}>
                                <div className="relative flex-shrink-0">
                                    {/* Use avatar/person photo instead of logo */}
                                    <img 
                                      src={guide.logo || `https://ui-avatars.com/api/?name=${guide.name}&background=3b82f6&color=fff&size=128`} 
                                      alt={guide.name} 
                                      className={`${viewMode === 'grid' ? 'w-20 h-20' : 'w-16 h-16'} rounded-full object-cover border-2 border-primary-100 shadow-sm`}
                                    />
                                    <div className="absolute -bottom-1 -right-1 bg-primary-600 text-white rounded-full p-1.5 shadow-lg">
                                      <Compass size={12} />
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className={`font-bold text-gray-900 leading-tight group-hover:text-primary-600 transition-colors ${viewMode === 'grid' ? 'text-lg line-clamp-2' : 'text-lg truncate'}`}>{guide.name}</h3>
                                    <div className="flex items-center text-sm text-gray-500 mt-1">
                                      <MapPin size={12} className="mr-1 flex-shrink-0" /> 
                                      <span>Brasil</span>
                                    </div>
                                    {/* Show specialties */}
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                      {specialties.map((spec, idx) => (
                                        <span key={idx} className="text-[10px] px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full font-semibold">
                                          {spec}
                                        </span>
                                      ))}
                                    </div>
                                </div>
                            </div>
                            {viewMode === 'list' && (
                              <div className="hidden md:block flex-1 px-4 border-l border-gray-100 ml-4 h-full">
                                <p className="text-gray-500 text-sm line-clamp-2">{guide.description}</p>
                              </div>
                            )}
                        </div>
                        {viewMode === 'grid' && (
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-grow">{guide.description}</p>
                        )}
                        <div className={`${viewMode === 'grid' ? 'mt-auto pt-4 border-t border-gray-50 w-full flex items-center justify-between' : 'flex items-center gap-4 ml-auto border-l border-gray-100 pl-4'}`}>
                            <div className={`text-sm font-bold text-primary-600 group-hover:text-primary-700 flex items-center whitespace-nowrap ${viewMode === 'list' ? 'bg-primary-50 px-4 py-2 rounded-lg' : ''}`}>
                              Ver Perfil <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>
                  );
                })}
                </div>
            )}

            {!loading && guides.length === 0 && (
               <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                  <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Compass className="text-gray-300" size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Nenhum guia encontrado</h3>
                  <p className="text-sm text-gray-500 mt-2">Tente ajustar os filtros ou buscar por outro termo.</p>
                  <button onClick={clearFilters} className="mt-4 text-primary-600 font-bold hover:underline">Limpar filtros e ver todos</button>
               </div>
            )}

            {/* Pagination Controls */}
            {totalCount > ITEMS_PER_PAGE && (
              <div className="mt-12 flex items-center justify-center gap-2">
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft size={20} /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                   <button key={page} onClick={() => handlePageChange(page)} className={`w-10 h-10 rounded-lg font-bold text-sm transition-colors ${currentPage === page ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>{page}</button>
                ))}
                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight size={20} /></button>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default GuideList;

