import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import TripCard from '../components/TripCard';
import { MapPin, CheckCircle, ShieldCheck, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const { getPublicTrips } = useData();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const featuredTrips = getPublicTrips().slice(0, 6); // Top 6

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent parent click
    navigate(`/trips?q=${search}`);
  };

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section */}
      <div 
        className="relative rounded-3xl overflow-hidden shadow-xl min-h-[500px] flex items-center cursor-pointer group"
        onClick={() => navigate('/trips')}
        title="Explorar todos os pacotes"
      >
        <img 
          src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop" 
          alt="Hero" 
          className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[20s]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"></div>
        
        <div className="relative z-10 px-8 md:px-16 max-w-3xl w-full">
          <span className="inline-block py-1 px-3 rounded-full bg-secondary-500/20 text-secondary-500 bg-opacity-20 backdrop-blur-sm border border-secondary-500/30 font-semibold text-sm mb-4 uppercase tracking-wide">
            O Maior Marketplace de Viagens
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6 drop-shadow-sm">
            Sua próxima aventura começa aqui.
          </h1>
          <p className="text-lg text-gray-200 mb-8 max-w-xl font-light">
            Encontre os melhores pacotes de viagens de agências verificadas. Praias, montanhas e experiências únicas esperam por você.
          </p>

          {/* Search Form - Stop propagation to prevent main banner click */}
          <div onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSearch} className="bg-white p-2 rounded-xl shadow-2xl flex flex-col md:flex-row gap-2 max-w-xl mb-6">
              <div className="flex-1 flex items-center px-4 py-3 bg-gray-50 rounded-lg">
                <MapPin className="text-gray-400 mr-3" />
                <input 
                  type="text" 
                  placeholder="Para onde você quer ir?" 
                  className="bg-transparent w-full outline-none text-gray-800 placeholder-gray-500 font-medium"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-md">
                Buscar
              </button>
            </form>
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              navigate('/trips');
            }}
            className="text-white/80 hover:text-white text-sm font-medium hover:underline"
          >
            Ou explore todos os pacotes disponíveis &rarr;
          </button>
        </div>
      </div>

      {/* Categories */}
      <div>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Categorias Populares</h2>
          <p className="text-gray-500 mt-2">Descubra viagens separadas por estilo e encontre seu próximo destino ideal.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
           {['PRAIA', 'AVENTURA', 'FAMILIA', 'ROMANCE', 'URBANO'].map(cat => (
             <button 
               key={cat} 
               onClick={() => navigate(`/trips?category=${cat}`)}
               className="group bg-white border border-gray-200 hover:border-primary-500 hover:bg-primary-50 p-6 rounded-xl text-center transition-all shadow-sm hover:shadow-md cursor-pointer"
             >
               <span className="block text-sm font-bold text-gray-700 group-hover:text-primary-700 capitalize">{cat.toLowerCase()}</span>
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
          <button 
            onClick={() => navigate('/trips')} 
            className="text-primary-600 font-semibold hover:text-primary-700 hover:underline px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors"
          >
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

      {/* How It Works Section */}
      <section className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Como funciona a ViajaStore</h2>
          <p className="text-gray-500 mt-2">Sua viagem dos sonhos em apenas 3 passos.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-16 h-16 bg-blue-100 text-primary-600 rounded-full flex items-center justify-center mb-4">
              <Compass size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">1. Explore destinos</h3>
            <p className="text-gray-600">Navegue por centenas de pacotes de viagem de norte a sul do Brasil.</p>
          </div>
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-16 h-16 bg-blue-100 text-primary-600 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">2. Compare agências</h3>
            <p className="text-gray-600">Todas as agências são verificadas e possuem avaliações reais de outros viajantes.</p>
          </div>
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-16 h-16 bg-blue-100 text-primary-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">3. Compre com segurança</h3>
            <p className="text-gray-600">Finalize sua viagem com pagamento seguro e receba seu voucher instantaneamente.</p>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-8">
        <div className="text-center mb-8">
           <h2 className="text-2xl font-bold text-gray-900">Agências Parceiras</h2>
           <p className="text-gray-500 mt-1">Conheça algumas das principais agências que anunciam na ViajaStore.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
           {/* Mock Logos */}
           <div className="flex items-center gap-2 font-bold text-xl text-gray-600"><div className="w-8 h-8 bg-orange-500 rounded-full"></div> CVC</div>
           <div className="flex items-center gap-2 font-bold text-xl text-gray-600"><div className="w-8 h-8 bg-blue-500 rounded-full"></div> Decolar</div>
           <div className="flex items-center gap-2 font-bold text-xl text-gray-600"><div className="w-8 h-8 bg-yellow-500 rounded-full"></div> 123Milhas</div>
           <div className="flex items-center gap-2 font-bold text-xl text-gray-600"><div className="w-8 h-8 bg-green-500 rounded-full"></div> Azul Viagens</div>
        </div>
      </section>
    </div>
  );
};

export default Home;