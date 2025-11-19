
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import TripCard from '../components/TripCard';
import { useSearchParams } from 'react-router-dom';
import { Filter, X, ArrowUpDown, Globe, Shield, Tag, Search } from 'lucide-react';

const TripList: React.FC = () => {
  const { getPublicTrips } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const allTrips = getPublicTrips();
  const [filteredTrips, setFilteredTrips] = useState(allTrips);

  // Filter States
  // Start with 0 or a high number to indicate "no limit" logic, but UI needs to reflect "Any"
  // A better approach: priceMax state is number, default is highest possible.
  const [priceMax, setPriceMax] = useState<number>(20000);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'RELEVANCE' | 'LOW_PRICE' | 'HIGH_PRICE' | 'RATING'>('RELEVANCE');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Extract params
  const q = searchParams.get('q');
  const c = searchParams.get('category');
  const p = searchParams.get('maxPrice');
  const s = searchParams.get('sort');

  useEffect(() => {
    setSearchTerm(q || '');
    setSelectedCategory(c || '');
    if (p) setPriceMax(Number(p));
    if (s) setSortBy(s as any);
  }, [q, c, p, s]);

  useEffect(() => {
    let result = [...allTrips];

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(lower) || 
        t.destination.toLowerCase().includes(lower) ||
        t.description.toLowerCase().includes(lower)
      );
    }

    if (selectedCategory) {
      result = result.filter(t => t.category === selectedCategory);
    }

    // Filter by Price
    result = result.filter(t => t.price <= priceMax);

    // Sorting
    switch (sortBy) {
      case 'LOW_PRICE':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'HIGH_PRICE':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'RATING':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'RELEVANCE':
      default:
        // Default relevance: Rating + Views + Recency (mock logic)
        result.sort((a, b) => (b.rating * 10 + (b.views || 0) / 100) - (a.rating * 10 + (a.views || 0) / 100));
        break;
    }

    setFilteredTrips(result);
  }, [searchTerm, selectedCategory, priceMax, sortBy, allTrips]);

  const updateUrlParam = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) newParams.set(key, value);
    else newParams.delete(key);
    setSearchParams(newParams, { replace: true });
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    updateUrlParam('category', cat || null);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as any;
    setSortBy(val);
    updateUrlParam('sort', val === 'RELEVANCE' ? null : val);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPriceMax(Number(e.target.value));
  };

  const handlePriceCommit = () => {
     // Only update URL on release
    updateUrlParam('maxPrice', priceMax === 20000 ? null : priceMax.toString());
  };

  const clearFilters = () => {
    setPriceMax(20000);
    setSearchTerm('');
    setSelectedCategory('');
    setSortBy('RELEVANCE');
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Compact Hero */}
      <div className="bg-primary-900 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
         <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Encontre sua próxima viagem</h1>
            <p className="text-primary-200 text-sm">Explore centenas de pacotes com as melhores tarifas.</p>
         </div>
         <div className="relative z-10 w-full md:w-auto flex gap-4 text-xs font-medium text-primary-200">
            <div className="flex items-center"><Globe size={14} className="mr-1" /> +50 Destinos</div>
            <div className="flex items-center"><Shield size={14} className="mr-1" /> Verificado</div>
            <div className="flex items-center"><Tag size={14} className="mr-1" /> Melhor Preço</div>
         </div>
         <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className={`
          md:w-64 flex-shrink-0 bg-white md:bg-transparent p-6 md:p-0 
          fixed md:static inset-0 z-40 overflow-y-auto transition-transform duration-300
          ${showMobileFilters ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          md:block
        `}>
          <div className="flex justify-between items-center md:hidden mb-4">
            <h2 className="text-xl font-bold">Filtros</h2>
            <button onClick={() => setShowMobileFilters(false)}><X /></button>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-6 sticky top-24">
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Buscar</h3>
              <div className="relative">
                  <Search size={14} className="absolute left-3 top-3 text-gray-400"/>
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onBlur={() => updateUrlParam('q', searchTerm || null)}
                    className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    placeholder="Destino, agência..."
                  />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Preço Máximo</h3>
              <input 
                type="range" 
                min="500" 
                max="20000" 
                step="100"
                value={priceMax}
                onChange={handlePriceChange}
                onMouseUp={handlePriceCommit}
                onTouchEnd={handlePriceCommit}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-2 font-medium">
                <span>R$ 500</span>
                <span className="text-primary-600">{priceMax >= 20000 ? 'Sem Limite' : `R$ ${priceMax.toLocaleString()}`}</span>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Categoria</h3>
              <div className="space-y-1">
                <label className={`flex items-center cursor-pointer p-2 rounded-lg transition-colors ${selectedCategory === '' ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-gray-50 text-gray-600'}`}>
                  <input type="radio" name="category" checked={selectedCategory === ''} onChange={() => handleCategoryChange('')} className="hidden"/>
                  <span className="text-sm">Todas</span>
                </label>
                {['PRAIA', 'AVENTURA', 'FAMILIA', 'ROMANCE', 'URBANO'].map(cat => (
                  <label key={cat} className={`flex items-center cursor-pointer p-2 rounded-lg transition-colors ${selectedCategory === cat ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-gray-50 text-gray-600'}`}>
                    <input type="radio" name="category" checked={selectedCategory === cat} onChange={() => handleCategoryChange(cat)} className="hidden"/>
                    <span className="text-sm capitalize">{cat.toLowerCase()}</span>
                  </label>
                ))}
              </div>
            </div>

            <button onClick={clearFilters} className="w-full py-2 text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-800 transition-colors">
              Limpar Filtros
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
                  <Filter size={16} className="mr-2" /> Filtrar
              </button>

              <div className="relative flex-1 sm:flex-initial min-w-[200px]">
                <ArrowUpDown size={14} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
                <select 
                    value={sortBy}
                    onChange={handleSortChange}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.map(trip => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>

          {filteredTrips.length === 0 && (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default TripList;
