
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Link } from 'react-router-dom';
import { Building, Star, Search, ArrowRight, CheckCircle, Shield, Users, MapPin, Filter, Sparkles, ChevronLeft, ChevronRight, ArrowUpDown, LayoutGrid, List, X } from 'lucide-react';
import { TripCategory } from '../types';

const ITEMS_PER_PAGE = 9;

const AgencyList: React.FC = () => {
  const { agencies, getAgencyPublicTrips } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState('RELEVANCE'); // RELEVANCE, RATING, TRIP_COUNT, NAME
  const [currentPage, setCurrentPage] = useState(1);
  
  // View Mode State with Persistence
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('agencyViewMode') as 'grid' | 'list') || 'grid';
  });

  // Persist View Mode
  useEffect(() => {
    localStorage.setItem('agencyViewMode', viewMode);
  }, [viewMode]);
  
  // TRUST THE DB: We show what the database gives us.
  const activeAgencies = agencies;

  // Calculate dynamic data for each agency (Specialties, Rating, Trip Count)
  const enrichedAgencies = useMemo(() => {
    return activeAgencies.map(agency => {
      const trips = getAgencyPublicTrips(agency.agencyId);
      
      // Derive specialties from their trips categories
      const categories = trips.map(t => t.category);
      const uniqueCategories = Array.from(new Set(categories));
      
      // Calculate stats
      const totalRating = trips.reduce((acc, t) => acc + (t.tripRating || 0), 0);
      const avgRating = trips.length > 0 ? (totalRating / trips.length) : 5.0; // Default to 5 if new

      return {
        ...agency,
        tripCount: trips.length,
        avgRating,
        specialties: uniqueCategories
      };
    });
  }, [activeAgencies, getAgencyPublicTrips]);

  // Get all available specialties for the filter sidebar
  const allSpecialties = useMemo(() => {
    const specs = new Set<string>();
    enrichedAgencies.forEach(a => a.specialties.forEach(s => specs.add(s)));
    return Array.from(specs).sort();
  }, [enrichedAgencies]);

  // Filter Logic
  const filteredAgencies = useMemo(() => {
    return enrichedAgencies.filter(agency => {
      const matchesSearch = agency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            agency.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSpecialty = selectedSpecialty 
          ? agency.specialties.includes(selectedSpecialty as TripCategory)
          : true;

      return matchesSearch && matchesSpecialty;
    });
  }, [enrichedAgencies, searchTerm, selectedSpecialty]);

  // Sort Logic
  const sortedAgencies = useMemo(() => {
    const result = [...filteredAgencies];
    switch (sortOption) {
      case 'RATING':
        return result.sort((a, b) => b.avgRating - a.avgRating);
      case 'TRIP_COUNT':
        return result.sort((a, b) => b.tripCount - a.tripCount);
      case 'NAME':
        return result.sort((a, b) => a.name.localeCompare(b.name));
      default: // RELEVANCE
        return result.sort((a, b) => b.tripCount - a.tripCount); 
    }
  }, [filteredAgencies, sortOption]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSpecialty, sortOption]);

  // Pagination Logic
  const totalPages = Math.ceil(sortedAgencies.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedAgencies = sortedAgencies.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
      setSearchTerm('');
      setSelectedSpecialty(null);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 px-4 sm:px-6 lg:px-8">
      
      {/* 1. Compact Header & Search */}
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
                   
                   {/* Sort Dropdown */}
                   <div className="relative w-full sm:w-48">
                      <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm appearance-none cursor-pointer text-gray-700 font-medium text-sm"
                      >
                        <option value="RELEVANCE">Relevância</option>
                        <option value="RATING">Melhor Avaliadas</option>
                        <option value="TRIP_COUNT">Mais Viagens</option>
                        <option value="NAME">Ordem Alfabética</option>
                      </select>
                   </div>

                   {/* View Mode Toggle */}
                   <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 flex-shrink-0">
                      <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Visualização em Grade"
                      >
                        <LayoutGrid size={18} />
                      </button>
                      <button 
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Visualização em Lista"
                      >
                        <List size={18} />
                      </button>
                   </div>
               </div>
            </div>
         </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
         
         {/* 2. Sidebar Filters (Desktop) */}
         <aside className="hidden lg:block w-64 flex-shrink-0 space-y-8">
            <div>
               <h3 className="font-bold text-gray-900 mb-4 flex items-center justify-between">
                   <span className="flex items-center"><Filter size={16} className="mr-2"/> Especialidade</span>
                   {(selectedSpecialty || searchTerm) && (
                       <button onClick={clearFilters} className="text-[10px] text-red-500 hover:underline font-bold uppercase">Limpar</button>
                   )}
               </h3>
               <div className="space-y-2">
                  <button 
                    onClick={() => setSelectedSpecialty(null)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!selectedSpecialty ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Todas as Agências
                  </button>
                  {allSpecialties.map(spec => (
                    <button 
                      key={spec}
                      onClick={() => setSelectedSpecialty(spec)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex justify-between items-center group ${selectedSpecialty === spec ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <span className="capitalize truncate">{spec.toLowerCase().replace('_', ' ')}</span>
                      <span className={`text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500 group-hover:bg-white ${selectedSpecialty === spec ? 'bg-white text-primary-600' : ''}`}>
                        {enrichedAgencies.filter(a => a.specialties.includes(spec as TripCategory)).length}
                      </span>
                    </button>
                  ))}
               </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
               <h4 className="font-bold text-blue-800 text-sm mb-2">Você é uma agência?</h4>
               <p className="text-blue-600 text-xs mb-3 leading-relaxed">Cadastre-se gratuitamente e comece a vender seus pacotes hoje mesmo.</p>
               <Link to="/#signup" className="block w-full py-2 bg-blue-600 text-white text-center rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors">
                  Quero ser parceiro
               </Link>
            </div>
         </aside>

         {/* Mobile Filter (Horizontal Scroll) */}
         <div className="lg:hidden overflow-x-auto pb-4 -mx-4 px-4 flex gap-2 scrollbar-hide">
             <button 
                onClick={() => setSelectedSpecialty(null)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold border transition-colors ${!selectedSpecialty ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}
             >
               Todos
             </button>
             {allSpecialties.map(spec => (
                <button 
                  key={spec}
                  onClick={() => setSelectedSpecialty(spec)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold border transition-colors capitalize ${selectedSpecialty === spec ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  {spec.toLowerCase().replace('_', ' ')}
                </button>
             ))}
         </div>

         {/* 3. Agency Grid/List */}
         <div className="flex-1">
            <div className="mb-4 flex justify-between items-center">
               <div className="text-sm text-gray-500 font-medium">
                  Mostrando <span className="text-gray-900 font-bold">{sortedAgencies.length}</span> agências
               </div>
               {(selectedSpecialty || searchTerm) && (
                   <button onClick={clearFilters} className="text-sm text-primary-600 font-bold hover:underline flex items-center gap-1">
                       <X size={14}/> Mostrar Todas
                   </button>
               )}
            </div>

            <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
               {paginatedAgencies.map(agency => (
                  <Link 
                    key={agency.agencyId}
                    to={`/${agency.slug}`}
                    className={`bg-white border border-gray-100 rounded-2xl hover:shadow-lg transition-all duration-300 group relative flex animate-[fadeIn_0.3s] ${viewMode === 'grid' ? 'flex-col p-5 h-full' : 'flex-row p-4 items-center'}`}
                  >
                     <div className={`flex items-start ${viewMode === 'grid' ? 'justify-between mb-4 w-full' : 'gap-6 flex-1'}`}>
                        <div className={`flex items-center gap-4 ${viewMode === 'grid' ? 'w-full' : ''}`}>
                           <div className="relative flex-shrink-0">
                              <img src={agency.logo} alt={agency.name} className={`${viewMode === 'grid' ? 'w-16 h-16' : 'w-14 h-14'} rounded-full object-cover border border-gray-100 shadow-sm group-hover:scale-105 transition-transform`}/>
                              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm" title="Verificado">
                                 <CheckCircle size={16} className="text-blue-500 fill-blue-50" />
                              </div>
                           </div>
                           <div className="min-w-0 flex-1">
                              {/* Title with better truncation and spacing */}
                              <h3 className={`font-bold text-gray-900 leading-tight group-hover:text-primary-600 transition-colors ${viewMode === 'grid' ? 'text-lg line-clamp-2 min-h-[1.5rem]' : 'text-lg truncate'}`}>
                                 {agency.name}
                              </h3>
                              <div className="flex items-center text-sm text-gray-500 mt-1">
                                 <MapPin size={12} className="mr-1 flex-shrink-0" /> 
                                 <span>Brasil</span>
                                 <span className="mx-1.5 text-gray-300">•</span>
                                 <div className="flex items-center text-amber-500 font-bold">
                                    <Star size={12} className="fill-current mr-1"/> {agency.avgRating.toFixed(1)}
                                 </div>
                              </div>
                           </div>
                        </div>
                        
                        {/* List Mode Description (Hidden on mobile) */}
                        {viewMode === 'list' && (
                            <div className="hidden md:block flex-1 px-4 border-l border-gray-100 ml-4 h-full">
                                <p className="text-gray-500 text-sm line-clamp-2">
                                    {agency.description}
                                </p>
                                <div className="flex gap-2 mt-2">
                                    {agency.specialties.slice(0, 3).map(spec => (
                                        <span key={spec} className="text-[10px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded border border-gray-100 capitalize">
                                            {spec.toLowerCase().replace('_', ' ')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                     </div>

                     {/* Grid Mode Specifics */}
                     {viewMode === 'grid' && (
                         <>
                            <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-grow">
                                {agency.description}
                            </p>

                            {/* Specialties Tags */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                {agency.specialties.slice(0, 3).map(spec => (
                                <span key={spec} className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-md font-medium capitalize border border-gray-100">
                                    {spec.toLowerCase().replace('_', ' ')}
                                </span>
                                ))}
                                {agency.specialties.length > 3 && (
                                <span className="px-2 py-1 text-gray-400 text-xs font-medium">
                                    +{agency.specialties.length - 3}
                                </span>
                                )}
                            </div>
                         </>
                     )}

                     <div className={`${viewMode === 'grid' ? 'mt-auto pt-4 border-t border-gray-50 w-full flex items-center justify-between' : 'flex items-center gap-4 ml-auto border-l border-gray-100 pl-4'}`}>
                        <div className="text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full whitespace-nowrap">
                           <span className="font-bold text-gray-900">{agency.tripCount}</span> pacotes
                        </div>
                        
                        <div className={`text-sm font-bold text-primary-600 group-hover:text-primary-700 flex items-center whitespace-nowrap ${viewMode === 'list' ? 'bg-primary-50 px-4 py-2 rounded-lg' : ''}`}>
                           Ver Página <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                     </div>
                  </Link>
               ))}
            </div>

            {sortedAgencies.length === 0 && (
               <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                  <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Search className="text-gray-300" size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Nenhuma agência encontrada</h3>
                  <p className="text-gray-500 mt-1">Tente ajustar os filtros ou buscar por outro nome.</p>
                  {(selectedSpecialty || searchTerm) && (
                     <button onClick={clearFilters} className="mt-4 text-primary-600 font-bold hover:underline">
                        Limpar filtros e ver todas
                     </button>
                  )}
               </div>
            )}

            {/* Pagination Controls */}
            {sortedAgencies.length > ITEMS_PER_PAGE && (
              <div className="mt-12 flex items-center justify-center gap-2">
                <button 
                   onClick={() => handlePageChange(currentPage - 1)}
                   disabled={currentPage === 1}
                   className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   <ChevronLeft size={20} />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                   <button 
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`w-10 h-10 rounded-lg font-bold text-sm transition-colors ${currentPage === page ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                   >
                      {page}
                   </button>
                ))}

                <button 
                   onClick={() => handlePageChange(currentPage + 1)}
                   disabled={currentPage === totalPages}
                   className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   <ChevronRight size={20} />
                </button>
              </div>
            )}
         </div>
      </div>

      {/* 4. Trust Signals (Moved to bottom, simplified) */}
      <div className="mt-20 pt-10 border-t border-gray-200">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="flex items-start gap-4">
               <div className="bg-green-50 p-3 rounded-xl text-green-600"><Shield size={24} /></div>
               <div>
                  <h4 className="font-bold text-gray-900 text-sm">Verificação Rigorosa</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">Todas as agências passam por validação documental e de histórico.</p>
               </div>
            </div>
            <div className="flex items-start gap-4">
               <div className="bg-purple-50 p-3 rounded-xl text-purple-600"><Sparkles size={24} /></div>
               <div>
                  <h4 className="font-bold text-gray-900 text-sm">Melhores Experiências</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">Curadoria de parceiros com alto índice de satisfação dos viajantes.</p>
               </div>
            </div>
            <div className="flex items-start gap-4">
               <div className="bg-amber-50 p-3 rounded-xl text-amber-600"><Users size={24} /></div>
               <div>
                  <h4 className="font-bold text-gray-900 text-sm">Avaliações Reais</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">Transparência total com opiniões de quem já viajou.</p>
               </div>
            </div>
         </div>
      </div>

    </div>
  );
};

export default AgencyList;
