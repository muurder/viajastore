import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import TripCard from '../components/TripCard';
import { Search, MapPin, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const { getPublicTrips } = useData();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const featuredTrips = getPublicTrips().slice(0, 6); // Top 6

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/trips?q=${search}`);
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl min-h-[500px] flex items-center">
        <img 
          src="https://picsum.photos/1600/900?random=99" 
          alt="Hero" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent"></div>
        
        <div className="relative z-10 px-8 md:px-16 max-w-3xl">
          <span className="inline-block py-1 px-3 rounded-full bg-secondary-500/20 text-secondary-500 bg-opacity-20 backdrop-blur-sm border border-secondary-500/30 font-semibold text-sm mb-4">
            Explore o Brasil
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
            Sua próxima aventura começa aqui.
          </h1>
          <p className="text-lg text-gray-200 mb-8 max-w-xl">
            Encontre os melhores pacotes de agências verificadas. Praias, montanhas e experiências únicas esperam por você.
          </p>

          <form onSubmit={handleSearch} className="bg-white p-2 rounded-xl shadow-2xl flex flex-col md:flex-row gap-2 max-w-xl">
            <div className="flex-1 flex items-center px-4 py-3 bg-gray-50 rounded-lg">
              <Search className="text-gray-400 mr-3" />
              <input 
                type="text" 
                placeholder="Para onde você quer ir?" 
                className="bg-transparent w-full outline-none text-gray-800 placeholder-gray-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-8 rounded-lg transition-colors">
              Buscar
            </button>
          </form>
        </div>
      </div>

      {/* Categories */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Categorias Populares</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
           {['PRAIA', 'AVENTURA', 'FAMILIA', 'ROMANCE', 'URBANO'].map(cat => (
             <button 
               key={cat} 
               onClick={() => navigate(`/trips?category=${cat}`)}
               className="bg-white border border-gray-200 hover:border-primary-500 hover:text-primary-600 p-4 rounded-xl text-center transition-all shadow-sm hover:shadow-md font-medium text-gray-700"
             >
               {cat}
             </button>
           ))}
        </div>
      </div>

      {/* Featured Trips */}
      <div>
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Destaques da Semana</h2>
            <p className="text-gray-500 mt-1">As viagens mais desejadas pelos viajantes.</p>
          </div>
          <button onClick={() => navigate('/trips')} className="text-primary-600 font-semibold hover:text-primary-700">
            Ver todas &rarr;
          </button>
        </div>
        
        {featuredTrips.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredTrips.map(trip => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">Nenhuma viagem encontrada no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;