import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import TripCard from '../components/TripCard';
import { useSearchParams } from 'react-router-dom';
import { Filter, X, ArrowUpDown, Globe, Shield, Tag } from 'lucide-react';

const TripList: React.FC = () => {
  const { getPublicTrips } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const allTrips = getPublicTrips();
  const [filteredTrips, setFilteredTrips] = useState(allTrips);

  // Filter States
  const [priceMax, setPriceMax] = useState<number>(10000);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'RELEVANCE' | 'LOW_PRICE' | 'HIGH_PRICE' | 'RATING'>('RELEVANCE');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Extract params to primitives for stable dependency array
  const q = searchParams.get('q');
  const c = searchParams.get('category');
  const p = searchParams.get('maxPrice');
  const s = searchParams.get('sort');

  // 1. Sync state with URL parameters on Mount & Update
  useEffect(() => {
    setSearchTerm(q || '');
    setSelectedCategory(c || '');
    if (p) setPriceMax(Number(p));
    if (s) setSortBy(s as any);
  }, [q, c, p, s]);

  // 2. Filter & Sort logic
  useEffect(() => {
    let result = [...allTrips]; // Create a copy

    // Filter by Search Term
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(lower) || 
        t.destination.toLowerCase().includes(lower)
      );
    }

    // Filter by Category
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
      default:
        break;
    }

    setFilteredTrips(result);
  }, [searchTerm, selectedCategory, priceMax, sortBy, allTrips]);

  // Helpers to update URL
  const updateUrlParam = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // Use replace to avoid building up a huge history stack and potential navigation issues in sandboxes
    setSearchParams(newParams, { replace: true });
  };

  // Handlers
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
    updateUrlParam('maxPrice', priceMax === 10000 ? null : priceMax.toString());
  };

  const handleSearchBlur = () => {
    updateUrlParam('q', searchTerm || null);
  };

  const clearFilters = () => {
    setPriceMax(10000);
    setSearchTerm('');
    setSelectedCategory('');
    setSortBy('RELEVANCE');
    setSearchParams({}, { replace: true }); // Clear URL params
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Page Hero / Info Section */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-3xl p-8 md:p-12 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
           <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">Explore o Mundo com a ViajaStore</h1>
           <p className="text-blue-100 text-lg mb-8 max-w-2xl">
             Descubra pacotes exclusivos, destinos paradisíacos e experiências inesquecíveis. 
             Reunimos as melhores agências do Brasil em um só lugar para você viajar com segurança e economia.
           </p>
           
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                <div className="bg-white/20 p-2 rounded-lg"><Globe size={20} /></div>
                <span className="font-medium text-sm">+50 Destinos</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                <div className="bg-white/20 p-2 rounded-lg"><Shield size={20} /></div>
                <span className="font-medium text-sm">Agências Verificadas</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                <div className="bg-white/20 p-2 rounded-lg"><Tag size={20} /></div>
                <span className="font-medium text-sm">Melhores Preços</span>
              </div>
           </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-500 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-0 right-20 -mb-20 w-60 h-60 bg-purple-500 rounded-full opacity-20 blur-3xl"></div>
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
            <button onClick={() => setShowMobileFilters(false)}>
              <X />
            </button>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-6 sticky top-24">
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Buscar</h3>
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onBlur={handleSearchBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchBlur()}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary-500 focus:outline-none"
                placeholder="Destino ou nome..."
              />
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Preço Máximo</h3>
              <input 
                type="range" 
                min="500" 
                max="10000" 
                step="100"
                value={priceMax}
                onChange={handlePriceChange}
                onMouseUp={handlePriceCommit}
                onTouchEnd={handlePriceCommit}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-2">
                <span>R$ 500</span>
                <span className="font-bold text-primary-600">R$ {priceMax}</span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Categoria</h3>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input 
                    type="radio" 
                    name="category" 
                    checked={selectedCategory === ''}
                    onChange={() => handleCategoryChange('')}
                    className="text-primary-600 focus:ring-primary-500 h-4 w-4 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Todas</span>
                </label>
                {['PRAIA', 'AVENTURA', 'FAMILIA', 'ROMANCE', 'URBANO'].map(cat => (
                  <label key={cat} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input 
                      type="radio" 
                      name="category" 
                      checked={selectedCategory === cat}
                      onChange={() => handleCategoryChange(cat)}
                      className="text-primary-600 focus:ring-primary-500 h-4 w-4 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">{cat.toLowerCase()}</span>
                  </label>
                ))}
              </div>
            </div>

            <button 
              onClick={clearFilters}
              className="w-full py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-800 transition-colors"
            >
              Limpar Filtros
            </button>
          </div>
        </aside>

        {/* Mobile Filter Overlay */}
        {showMobileFilters && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setShowMobileFilters(false)}
          ></div>
        )}

        {/* Main Content */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Resultados da Busca
              </h2>
              <p className="text-sm text-gray-500">
                {filteredTrips.length} {filteredTrips.length === 1 ? 'pacote encontrado' : 'pacotes encontrados'}
              </p>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button 
                  className="md:hidden flex-1 flex items-center justify-center text-gray-700 bg-gray-100 px-4 py-2 rounded-md border border-gray-200"
                  onClick={() => setShowMobileFilters(true)}
              >
                  <Filter size={18} className="mr-2" />
                  Filtrar
              </button>

              <div className="relative flex-1 sm:flex-initial">
                <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none text-gray-500">
                    <ArrowUpDown size={14} />
                </div>
                <select 
                    value={sortBy}
                    onChange={handleSortChange}
                    className="w-full pl-8 pr-8 py-2 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer hover:bg-gray-50"
                >
                    <option value="RELEVANCE">Relevância</option>
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
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Nenhuma viagem encontrada</h3>
              <p className="text-gray-500 mt-1">Tente ajustar seus filtros para encontrar o que procura.</p>
              <button 
                onClick={clearFilters}
                className="mt-4 text-primary-600 font-medium hover:underline"
              >
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