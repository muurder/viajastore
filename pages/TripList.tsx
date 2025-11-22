
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import TripCard, { TripCardSkeleton } from '../components/TripCard';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { Filter, X, ArrowUpDown, Search, ChevronDown, ChevronUp, ArrowLeft, Loader } from 'lucide-react';

// Helper to normalize strings for comparison (remove accents, lowercase)
const normalizeText = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const TripList: React.FC = () => {
  // Detect if we are in an agency microsite
  const { agencySlug } = useParams<{ agencySlug?: string }>();
  const { getPublicTrips, getAgencyPublicTrips, getAgencyBySlug, loading } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Try to get agency if in microsite mode
  const currentAgency = agencySlug ? getAgencyBySlug(agencySlug) : undefined;

  // Determine if we should wait for data
  // If we have a slug but no agency yet, check if we are still loading data
  const isResolvingAgency = !!agencySlug && !currentAgency && loading;
  const isAgencyNotFound = !!agencySlug && !currentAgency && !loading;
  
  // Filter trips based on context
  // If resolving, return empty to prevent global flash
  const initialTrips = isResolvingAgency 
    ? [] 
    : (currentAgency ? getAgencyPublicTrips(currentAgency.id) : getPublicTrips());
  
  const [filteredTrips, setFilteredTrips] = useState(initialTrips);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [openFilterSections, setOpenFilterSections] = useState<Record<string, boolean>>({
     traveler: true, style: true, duration: true, price: true, dest: true
  });

  // Update initial trips when data loads or route changes
  useEffect(() => {
     if (isResolvingAgency) return; // Wait until loaded

     const trips = currentAgency ? getAgencyPublicTrips(currentAgency.id) : getPublicTrips();
     setFilteredTrips(trips);
  }, [currentAgency, agencySlug, loading]);

  // Extract URL Params
  const q = searchParams.get('q') || '';
  const tagsParam = searchParams.get('tags'); // comma separated
  const travelerParam = searchParams.get('traveler'); // comma separated
  const durationParam = searchParams.get('duration'); // '1-3', '4-7' etc
  const priceParam = searchParams.get('price'); // '0-500', '500-1000' etc
  const categoryParam = searchParams.get('category');
  const sortParam = searchParams.get('sort') || 'RELEVANCE';

  // Derived State from URL
  const selectedTags = tagsParam ? tagsParam.split(',') : [];
  const selectedTravelerTypes = travelerParam ? travelerParam.split(',') : [];
  
  // Options Data
  const travelerOptions = [
    { id: 'SOZINHO', label: 'Sozinho' },
    { id: 'CASAL', label: 'Casal' },
    { id: 'FAMILIA', label: 'Família' },
    { id: 'AMIGOS', label: 'Amigos' },
    { id: 'MOCHILAO', label: 'Mochilão' },
    { id: 'MELHOR_IDADE', label: 'Melhor Idade' }
  ];

  const styleOptions = [
    'Natureza', 'História', 'Gastronomia', 'Vida Noturna', 'Viagem barata', 
    'Cultura', 'Arte', 'Praia', 'Aventura', 'Romântico', 'Camping', 'Místico', 'Religioso'
  ];

  const durationOptions = [
    { id: '1-3', label: '1 a 3 dias' },
    { id: '4-7', label: '4 a 7 dias' },
    { id: '8-14', label: '8 a 14 dias' },
    { id: '15+', label: '15+ dias' }
  ];

  const priceOptions = [
    { id: '0-500', label: 'Até R$ 500' },
    { id: '500-1000', label: 'R$ 500 - R$ 1.000' },
    { id: '1000-3000', label: 'R$ 1.000 - R$ 3.000' },
    { id: '3000+', label: 'Acima de R$ 3.000' }
  ];

  const popularDestinations = [
    'Rio de Janeiro', 'São Thomé', 'Bonito', 'Jalapão', 
    'Ubatuba', 'Salvador', 'Foz do Iguaçu', 'Noronha'
  ];

  // Helper to update URL Params
  const updateUrl = (key: string, value: string | string[] | null) => {
      const newParams = new URLSearchParams(searchParams);
      if (!value || (Array.isArray(value) && value.length === 0)) {
          newParams.delete(key);
      } else {
          newParams.set(key, Array.isArray(value) ? value.join(',') : value);
      }
      setSearchParams(newParams, { replace: true });
  };

  const toggleSelection = (key: string, currentList: string[], item: string) => {
     const newList = currentList.includes(item) 
        ? currentList.filter(i => i !== item)
        : [...currentList, item];
     updateUrl(key, newList);
  };

  const toggleAccordion = (section: string) => {
     setOpenFilterSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Filter Logic
  useEffect(() => {
    if (isResolvingAgency) return;

    const sourceTrips = currentAgency ? getAgencyPublicTrips(currentAgency.id) : getPublicTrips();
    let result = [...sourceTrips];

    // 1. Search Term (Generalized Search)
    if (q) {
       const cleanQ = normalizeText(q);
       result = result.filter(t => 
         normalizeText(t.title).includes(cleanQ) || 
         normalizeText(t.destination).includes(cleanQ) ||
         normalizeText(t.description).includes(cleanQ) || 
         t.tags.some(tag => normalizeText(tag).includes(cleanQ))
       );
    }

    // 2. Category
    if (categoryParam) {
        result = result.filter(t => t.category === categoryParam);
    }

    // 3. Traveler Type (OR logic)
    if (selectedTravelerTypes.length > 0) {
        result = result.filter(t => 
           t.travelerTypes.some(type => selectedTravelerTypes.includes(type))
        );
    }

    // 4. Style / Tags (OR logic with Partial Match)
    if (selectedTags.length > 0) {
        result = result.filter(t => 
            t.tags.some(tag => selectedTags.includes(tag)) ||
            t.tags.some(tag => selectedTags.some(sTag => tag.includes(sTag))) // Partial matching for broader filters
        );
    }

    // 5. Duration
    if (durationParam) {
        // Parse duration param e.g., '1-3', '15+'
        result = result.filter(t => {
            if (durationParam === '15+') return t.durationDays >= 15;
            const [min, max] = durationParam.split('-').map(Number);
            return t.durationDays >= min && t.durationDays <= max;
        });
    }

    // 6. Price
    if (priceParam) {
        result = result.filter(t => {
             if (priceParam === '3000+') return t.price >= 3000;
             const [min, max] = priceParam.split('-').map(Number);
             return t.price >= min && t.price <= max;
        });
    }

    // Sorting
    switch (sortParam) {
        case 'LOW_PRICE': result.sort((a, b) => a.price - b.price); break;
        case 'HIGH_PRICE': result.sort((a, b) => b.price - a.price); break;
        case 'RATING': result.sort((a, b) => b.rating - a.rating); break;
        default: // RELEVANCE
           result.sort((a, b) => (b.rating * 10 + (b.views || 0) / 100) - (a.rating * 10 + (a.views || 0) / 100));
    }

    setFilteredTrips(result);
  }, [currentAgency, q, categoryParam, tagsParam, travelerParam, durationParam, priceParam, sortParam, isResolvingAgency]);

  const clearFilters = () => {
      setSearchParams({});
  };

  if (isResolvingAgency || loading && !initialTrips.length) {
      return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <TripCardSkeleton key={i} />)}
          </div>
      );
  }

  if (isAgencyNotFound) {
      return (
          <div className="text-center py-20">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Agência não encontrada</h2>
              <p className="text-gray-500 mb-6">O endereço que você tentou acessar não existe.</p>
              <Link to="/agencies" className="text-primary-600 font-bold hover:underline">Voltar para lista de agências</Link>
          </div>
      );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Compact Hero */}
      <div className="bg-gray-900 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
         <div className="relative z-10">
            {currentAgency && (
                <Link to={`/${currentAgency.slug}`} className="inline-flex items-center text-gray-400 hover:text-white text-sm mb-2 transition-colors">
                    <ArrowLeft size={14} className="mr-1"/> Voltar para {currentAgency.name}
                </Link>
            )}
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
                {currentAgency ? `Pacotes: ${currentAgency.name}` : "Encontre sua próxima viagem"}
            </h1>
            <p className="text-gray-400 text-sm">
                {currentAgency ? "Explore nossas opções de roteiros exclusivos." : "Explore centenas de pacotes com as melhores tarifas."}
            </p>
         </div>
         <div className="relative z-10 w-full md:w-auto">
            <div className="relative">
               <Search size={16} className="absolute left-3 top-3 text-gray-500" />
               <input 
                 type="text" 
                 value={q}
                 onChange={(e) => updateUrl('q', e.target.value || null)}
                 placeholder="Destino ou estilo..."
                 className="w-full md:w-80 pl-10 pr-4 py-2.5 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary-500 outline-none"
               />
            </div>
         </div>
         <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className={`
          md:w-72 flex-shrink-0 bg-white md:bg-transparent p-6 md:p-0 
          fixed md:static inset-0 z-40 overflow-y-auto transition-transform duration-300 scrollbar-hide
          ${showMobileFilters ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          md:block h-full
        `}>
          <div className="flex justify-between items-center md:hidden mb-4">
            <h2 className="text-xl font-bold">Filtros</h2>
            <button onClick={() => setShowMobileFilters(false)}><X /></button>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-6">
             
             {/* A - Traveler Type */}
             <div className="border-b border-gray-100 pb-4">
                <button onClick={() => toggleAccordion('traveler')} className="w-full flex justify-between items-center font-bold text-gray-900 mb-3">
                    <span>Tipo de Viajante</span>
                    {openFilterSections['traveler'] ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </button>
                {openFilterSections['traveler'] && (
                    <div className="space-y-2">
                        {travelerOptions.map(type => (
                            <label key={type.id} className="flex items-center cursor-pointer group">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${selectedTravelerTypes.includes(type.id) ? 'bg-primary-600 border-primary-600' : 'border-gray-300 group-hover:border-primary-400'}`}>
                                    {selectedTravelerTypes.includes(type.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                                </div>
                                <input 
                                  type="checkbox" 
                                  className="hidden" 
                                  checked={selectedTravelerTypes.includes(type.id)} 
                                  onChange={() => toggleSelection('traveler', selectedTravelerTypes, type.id)} 
                                />
                                <span className={`text-sm ${selectedTravelerTypes.includes(type.id) ? 'text-primary-700 font-medium' : 'text-gray-600'}`}>{type.label}</span>
                            </label>
                        ))}
                    </div>
                )}
             </div>

             {/* B - Style / Tags */}
             <div className="border-b border-gray-100 pb-4">
                <button onClick={() => toggleAccordion('style')} className="w-full flex justify-between items-center font-bold text-gray-900 mb-3">
                    <span>Estilo de Viagem</span>
                    {openFilterSections['style'] ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </button>
                {openFilterSections['style'] && (
                    <div className="flex flex-wrap gap-2">
                        {styleOptions.map(tag => (
                            <button 
                              key={tag}
                              onClick={() => toggleSelection('tags', selectedTags, tag)}
                              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${selectedTags.includes(tag) ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                )}
             </div>

             {/* C - Duration */}
             <div className="border-b border-gray-100 pb-4">
                <button onClick={() => toggleAccordion('duration')} className="w-full flex justify-between items-center font-bold text-gray-900 mb-3">
                    <span>Duração</span>
                    {openFilterSections['duration'] ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </button>
                {openFilterSections['duration'] && (
                    <div className="space-y-2">
                        {durationOptions.map(opt => (
                            <label key={opt.id} className="flex items-center cursor-pointer">
                                <input 
                                  type="radio" 
                                  name="duration"
                                  className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                                  checked={durationParam === opt.id}
                                  onChange={() => updateUrl('duration', opt.id === durationParam ? null : opt.id)}
                                />
                                <span className="ml-3 text-sm text-gray-600">{opt.label}</span>
                            </label>
                        ))}
                        {durationParam && <button onClick={() => updateUrl('duration', null)} className="text-xs text-gray-400 hover:text-red-500 mt-1 ml-7">Limpar</button>}
                    </div>
                )}
             </div>

             {/* D - Price */}
             <div className="border-b border-gray-100 pb-4">
                <button onClick={() => toggleAccordion('price')} className="w-full flex justify-between items-center font-bold text-gray-900 mb-3">
                    <span>Preço por Pessoa</span>
                    {openFilterSections['price'] ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </button>
                {openFilterSections['price'] && (
                    <div className="space-y-2">
                        {priceOptions.map(opt => (
                            <label key={opt.id} className="flex items-center cursor-pointer">
                                <input 
                                  type="radio" 
                                  name="price"
                                  className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                                  checked={priceParam === opt.id}
                                  onChange={() => updateUrl('price', opt.id === priceParam ? null : opt.id)}
                                />
                                <span className="ml-3 text-sm text-gray-600">{opt.label}</span>
                            </label>
                        ))}
                         {priceParam && <button onClick={() => updateUrl('price', null)} className="text-xs text-gray-400 hover:text-red-500 mt-1 ml-7">Limpar</button>}
                    </div>
                )}
             </div>

             {/* E - Popular Destinations (Global only) */}
             {!currentAgency && (
                 <div>
                    <button onClick={() => toggleAccordion('dest')} className="w-full flex justify-between items-center font-bold text-gray-900 mb-3">
                        <span>Destinos Populares</span>
                        {openFilterSections['dest'] ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                    </button>
                    {openFilterSections['dest'] && (
                        <div className="flex flex-wrap gap-2">
                            {popularDestinations.map(dest => {
                                const isSelected = q === dest;
                                return (
                                    <button 
                                      key={dest}
                                      onClick={() => updateUrl('q', isSelected ? null : dest)}
                                      className={`text-xs px-3 py-1.5 rounded border transition-all ${isSelected ? 'bg-primary-50 border-primary-200 text-primary-700 font-bold' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        {dest}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                 </div>
             )}

             <button onClick={clearFilters} className="w-full py-2 text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-800 transition-colors">
               Limpar Todos os Filtros
             </button>
          </div>
        </aside>

        {showMobileFilters && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setShowMobileFilters(false)}></div>}

        {/* Main Content */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="text-gray-600 text-sm">
               Mostrando <span className="font-bold text-gray-900">{filteredTrips.length}</span> resultados
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button 
                  className="md:hidden flex-1 flex items-center justify-center text-gray-700 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm"
                  onClick={() => setShowMobileFilters(true)}
              >
                  <Filter size={16} className="mr-2" /> Filtros
              </button>

              <div className="relative flex-1 sm:flex-initial min-w-[200px]">
                <ArrowUpDown size={14} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
                <select 
                    value={sortParam}
                    onChange={(e) => updateUrl('sort', e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer hover:bg-gray-50"
                >
                    <option value="RELEVANCE">Mais Relevantes</option>
                    <option value="LOW_PRICE">Menor Preço</option>
                    <option value="HIGH_PRICE">Maior Preço</option>
                    <option value="RATING">Melhor Avaliação</option>
                </select>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => <TripCardSkeleton key={i} />)}
            </div>
          ) : (
            filteredTrips.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTrips.map(trip => (
                        <TripCard key={trip.id} trip={trip} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200 shadow-sm">
                  <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="text-gray-300" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhuma viagem encontrada</h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">Não encontramos resultados para sua busca. Tente ajustar os filtros ou buscar por termos mais genéricos.</p>
                  <button onClick={clearFilters} className="text-primary-600 font-bold hover:underline hover:text-primary-700 transition-colors">
                    Limpar todos os filtros
                  </button>
                </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default TripList;
