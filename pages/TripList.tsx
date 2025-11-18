import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import TripCard from '../components/TripCard';
import { useSearchParams } from 'react-router-dom';
import { Filter, X } from 'lucide-react';

const TripList: React.FC = () => {
  const { getPublicTrips } = useData();
  const [searchParams] = useSearchParams();
  
  const allTrips = getPublicTrips();
  const [filteredTrips, setFilteredTrips] = useState(allTrips);

  // Filter States
  const [priceMax, setPriceMax] = useState<number>(10000);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q');
    const c = searchParams.get('category');
    if (q) setSearchTerm(q);
    if (c) setSelectedCategory(c);
  }, [searchParams]);

  useEffect(() => {
    let result = allTrips;

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(lower) || 
        t.destination.toLowerCase().includes(lower)
      );
    }

    if (selectedCategory) {
      result = result.filter(t => t.category === selectedCategory);
    }

    result = result.filter(t => t.price <= priceMax);

    setFilteredTrips(result);
  }, [searchTerm, selectedCategory, priceMax, allTrips]);

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Sidebar Filters */}
      <aside className={`
        md:w-64 flex-shrink-0 bg-white md:bg-transparent p-6 md:p-0 
        fixed md:static inset-0 z-40 overflow-y-auto transition-transform duration-300
        ${showMobileFilters ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex justify-between items-center md:hidden mb-4">
          <h2 className="text-xl font-bold">Filtros</h2>
          <button onClick={() => setShowMobileFilters(false)}>
            <X />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Buscar</h3>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
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
              onChange={(e) => setPriceMax(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-2">
              <span>R$ 500</span>
              <span className="font-bold text-primary-600">R$ {priceMax}</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Categoria</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name="category" 
                  checked={selectedCategory === ''}
                  onChange={() => setSelectedCategory('')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">Todas</span>
              </label>
              {['PRAIA', 'AVENTURA', 'FAMILIA', 'ROMANCE', 'URBANO'].map(cat => (
                <label key={cat} className="flex items-center">
                  <input 
                    type="radio" 
                    name="category" 
                    checked={selectedCategory === cat}
                    onChange={() => setSelectedCategory(cat)}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">{cat.toLowerCase()}</span>
                </label>
              ))}
            </div>
          </div>
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {filteredTrips.length} {filteredTrips.length === 1 ? 'viagem encontrada' : 'viagens encontradas'}
          </h1>
          <button 
            className="md:hidden flex items-center text-gray-600 bg-white px-4 py-2 rounded-md shadow-sm border border-gray-200"
            onClick={() => setShowMobileFilters(true)}
          >
            <Filter size={18} className="mr-2" />
            Filtrar
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrips.map(trip => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>

        {filteredTrips.length === 0 && (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-lg text-gray-500">Nenhuma viagem corresponde aos seus filtros.</p>
            <button 
              onClick={() => {setPriceMax(10000); setSelectedCategory(''); setSearchTerm('');}}
              className="mt-4 text-primary-600 font-medium hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripList;