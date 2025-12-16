
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Link } from 'react-router-dom';
import { Building, Star, Search, ArrowRight, CheckCircle, Shield, Users, MapPin, Filter, Sparkles, ChevronLeft, ChevronRight, ArrowUpDown, LayoutGrid, List, X, Loader } from 'lucide-react';
import { Agency, TripCategory } from '../types';
import { logger } from '../utils/logger';

const ITEMS_PER_PAGE = 9;

const AgencyList: React.FC = () => {
  const { searchAgencies, loading: dataLoading } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<'RELEVANCE' | 'NAME' | 'RATING'>('RELEVANCE');
  const [currentPage, setCurrentPage] = useState(1);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true); // FIX: Start as true to show loading on initial mount
  
  // View Mode State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('agencyViewMode') as 'grid' | 'list') || 'grid';
  });

  useEffect(() => {
    localStorage.setItem('agencyViewMode', viewMode);
  }, [viewMode]);

  // Debounce logic for search
  useEffect(() => {
    // FIX: Wait for data to be loaded before searching
    if (dataLoading) {
      return; // Don't search while data is still loading
    }

    const timer = setTimeout(() => {
      fetchData();
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm, selectedSpecialty, sortOption, currentPage, dataLoading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, count } = await searchAgencies({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        query: searchTerm,
        specialty: selectedSpecialty || undefined,
        sort: sortOption
      });
      setAgencies(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      logger.error('Error loading agencies:', error);
      setAgencies([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Specialties hardcoded or fetched separately if needed for filter UI
  const allSpecialties: TripCategory[] = ['PRAIA', 'AVENTURA', 'FAMILIA', 'ROMANTICO', 'NATUREZA'];

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
               <h1 className="text-3xl font-bold text-gray-900">Agências Parceiras</h1>
               <p className="text-gray-500 mt-2 max-w-xl">
                 Encontre especialistas verificados para planejar sua próxima experiência.
               </p>
            </div>
            
            <div className="w-full md:w-auto flex flex-col gap-3">
               <div className="flex flex-col sm:flex-row gap-3">
                   <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Buscar agência..." 
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
                        <option value="RATING">Melhor Avaliadas</option>
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
                  <button onClick={() => setSelectedSpecialty(null)} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!selectedSpecialty ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>Todas as Agências</button>
                  {allSpecialties.map(spec => (
                    <button key={spec} onClick={() => setSelectedSpecialty(spec)} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex justify-between items-center group ${selectedSpecialty === spec ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                      <span className="capitalize truncate">{spec.toLowerCase().replace('_', ' ')}</span>
                    </button>
                  ))}
               </div>
            </div>
         </aside>

         {/* Agency List */}
         <div className="flex-1">
            <div className="mb-4 flex justify-between items-center">
               <div className="text-sm text-gray-500 font-medium">Mostrando <span className="text-gray-900 font-bold">{totalCount}</span> agências</div>
               {(selectedSpecialty || searchTerm) && (<button onClick={clearFilters} className="text-sm text-primary-600 font-bold hover:underline flex items-center gap-1"><X size={14}/> Mostrar Todas</button>)}
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64"><Loader className="animate-spin text-primary-600" size={32} /></div>
            ) : (
                <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                {agencies.map(agency => (
                    <Link key={agency.agencyId} to={`/${agency.slug}`} className={`bg-white border border-gray-100 rounded-3xl hover:shadow-xl transition-all duration-300 group relative flex animate-[fadeIn_0.3s] ${viewMode === 'grid' ? 'flex-col overflow-hidden h-full' : 'flex-row p-4 items-center'}`}>
                        {viewMode === 'grid' ? (
                          <>
                            {/* Header Banner/Cover */}
                            <div className="relative h-24 w-full bg-gradient-to-br from-emerald-500 to-emerald-600 overflow-hidden">
                              {agency.logo && (
                                <div className="absolute inset-0 opacity-20">
                                  <img src={agency.logo} alt="" className="w-full h-full object-cover" />
                                </div>
                              )}
                            </div>
                            
                            {/* Avatar invading banner */}
                            <div className="relative -mt-10 px-6 flex justify-center">
                              <div className="relative">
                                <img 
                                  src={agency.logo} 
                                  alt={agency.name} 
                                  className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-xl"
                                />
                                {agency.subscriptionStatus === 'ACTIVE' && (
                                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1 border-2 border-white">
                                    <Shield size={12} className="text-white" fill="currentColor" />
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Content */}
                            <div className="px-6 pb-6 pt-2 flex-1 flex flex-col">
                              <h3 className="text-center font-bold text-gray-900 text-lg leading-tight group-hover:text-emerald-600 transition-colors mb-2 line-clamp-2">
                                {agency.name}
                              </h3>
                              <div className="flex items-center justify-center text-sm text-gray-500 mb-4">
                                <MapPin size={14} className="mr-1.5 flex-shrink-0 text-emerald-500" />
                                <span>Brasil</span>
                              </div>
                              <p className="text-gray-600 text-sm text-center line-clamp-3 mb-6 flex-grow">
                                {agency.description || 'Agência especializada em experiências únicas de viagem.'}
                              </p>
                              
                              {/* Button */}
                              <button className="w-full border-2 border-emerald-600 text-emerald-600 px-4 py-2.5 rounded-full font-bold text-sm hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 group-hover:gap-3">
                                Ver Perfil
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-6 flex-1">
                              <div className="relative flex-shrink-0">
                                <img src={agency.logo} alt={agency.name} className="w-14 h-14 rounded-full object-cover border border-gray-100 shadow-sm"/>
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-gray-900 leading-tight group-hover:text-emerald-600 transition-colors text-lg truncate">{agency.name}</h3>
                                <div className="flex items-center text-sm text-gray-500 mt-1"><MapPin size={12} className="mr-1 flex-shrink-0" /> <span>Brasil</span></div>
                              </div>
                            </div>
                            <div className="hidden md:block flex-1 px-4 border-l border-gray-100 ml-4 h-full"><p className="text-gray-500 text-sm line-clamp-2">{agency.description}</p></div>
                            <div className="flex items-center gap-4 ml-auto border-l border-gray-100 pl-4">
                              <div className="text-sm font-bold text-emerald-600 group-hover:text-emerald-700 flex items-center whitespace-nowrap bg-emerald-50 px-4 py-2 rounded-full">Ver Página <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" /></div>
                            </div>
                          </>
                        )}
                    </Link>
                ))}
                </div>
            )}

            {!loading && agencies.length === 0 && (
               <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                  <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Search className="text-gray-300" size={32} /></div>
                  <h3 className="text-lg font-bold text-gray-900">Nenhuma agência encontrada</h3>
                  <button onClick={clearFilters} className="mt-4 text-primary-600 font-bold hover:underline">Limpar filtros e ver todas</button>
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

export default AgencyList;