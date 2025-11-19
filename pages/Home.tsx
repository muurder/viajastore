
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import TripCard from '../components/TripCard';
import { MapPin, CheckCircle, ShieldCheck, Compass, ArrowRight, Building } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const CATEGORY_IMAGES: Record<string, string> = {
  PRAIA: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
  AVENTURA: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?q=80&w=800&auto=format&fit=crop',
  FAMILIA: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=800&auto=format&fit=crop',
  ROMANCE: 'https://images.unsplash.com/photo-1510097477421-e5456cd63d64?q=80&w=800&auto=format&fit=crop',
  URBANO: 'https://images.unsplash.com/photo-1449824913929-6513b64e301f?q=80&w=800&auto=format&fit=crop',
  SOZINHO: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?q=80&w=800&auto=format&fit=crop'
};

const Home: React.FC = () => {
  const { getPublicTrips, agencies } = useData();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  // Logic to always show something, even if metrics are low in mock
  const allTrips = getPublicTrips();
  const featuredTrips = allTrips.sort((a, b) => b.rating - a.rating).slice(0, 6);
  // Filter active agencies and shuffle or pick first few
  const activeAgencies = agencies.filter(a => a.subscriptionStatus === 'ACTIVE').slice(0, 4);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/trips?q=${search}`);
  };

  return (
    <div className="space-y-20 pb-12">
      {/* Hero Section */}
      <div 
        className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[600px] flex items-center"
      >
        <div className="absolute inset-0">
            <img 
            src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop" 
            alt="Hero" 
            className="w-full h-full object-cover animate-[kenburns_20s_infinite_alternate]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent"></div>
        </div>
        
        <div className="relative z-10 px-8 md:px-16 max-w-4xl w-full">
          <div className="inline-flex items-center gap-2 py-1 px-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold text-sm mb-6 animate-[fadeInUp_0.5s]">
             <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
             Mais de {allTrips.length} pacotes disponíveis
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6 drop-shadow-lg animate-[fadeInUp_0.7s]">
            Viaje mais.<br/>Gaste menos.<br/>Viva agora.
          </h1>
          <p className="text-xl text-gray-300 mb-10 max-w-xl font-light animate-[fadeInUp_0.9s]">
            A plataforma que conecta você diretamente às melhores agências de turismo do Brasil. Sem intermediários, com total segurança.
          </p>

          <div className="animate-[fadeInUp_1.1s]">
            <form onSubmit={handleSearch} className="bg-white p-2 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-2 max-w-xl">
              <div className="flex-1 flex items-center px-4 py-4 bg-gray-50 rounded-xl border border-transparent focus-within:border-primary-300 focus-within:bg-white transition-all">
                <MapPin className="text-primary-500 mr-3" />
                <input 
                  type="text" 
                  placeholder="Para onde você quer ir?" 
                  className="bg-transparent w-full outline-none text-gray-800 placeholder-gray-400 font-medium"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg hover:shadow-primary-500/30 active:scale-95">
                Buscar
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div>
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900">Explore por Estilo</h2>
          <p className="text-gray-500 mt-2 text-lg">Qual tipo de viajante você é hoje?</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 px-4">
           {['PRAIA', 'AVENTURA', 'FAMILIA', 'ROMANCE', 'URBANO', 'SOZINHO'].map((cat) => (
             <button 
               key={cat} 
               onClick={() => navigate(`/trips?category=${cat}`)}
               className="group relative h-48 rounded-2xl overflow-hidden shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
             >
               <img 
                  src={CATEGORY_IMAGES[cat]} 
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  alt={cat}
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity flex items-center justify-center">
                  <span className="text-white font-bold text-lg uppercase tracking-widest border-b-2 border-transparent group-hover:border-white transition-all drop-shadow-lg">{cat}</span>
               </div>
             </button>
           ))}
        </div>
      </div>

      {/* Featured Trips */}
      <div className="bg-gray-50 -mx-4 sm:-mx-8 px-4 sm:px-8 py-20">
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
            <div>
                <h2 className="text-3xl font-bold text-gray-900">Pacotes em Destaque</h2>
                <p className="text-gray-500 mt-2 text-lg">As melhores avaliações e preços imperdíveis.</p>
            </div>
            <Link 
                to="/trips" 
                className="group flex items-center text-primary-600 font-bold hover:text-primary-700 bg-white px-6 py-3 rounded-full shadow-sm hover:shadow-md transition-all"
            >
                Ver todas as ofertas <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
            </Link>
            </div>
            
            {featuredTrips.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
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

      {/* Featured Agencies */}
      <div className="max-w-7xl mx-auto">
         <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Principais Agências</h2>
            <p className="text-gray-500 mt-2">Empresas verificadas que fazem sua viagem acontecer.</p>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {activeAgencies.map(agency => (
                <Link key={agency.id} to={`/agency/${agency.id}`} className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all text-center group">
                    <img src={agency.logo} alt={agency.name} className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-2 border-gray-100 group-hover:border-primary-500 transition-colors"/>
                    <h3 className="font-bold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">{agency.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-4">{agency.description}</p>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">Verificado</span>
                </Link>
            ))}
            <Link to="/signup" className="bg-gray-900 p-6 rounded-2xl shadow-sm hover:bg-gray-800 transition-all text-center flex flex-col items-center justify-center text-white group">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Building size={24} />
                </div>
                <h3 className="font-bold text-lg">Sua agência aqui</h3>
                <p className="text-xs text-gray-400 mt-2">Torne-se um parceiro ViajaStore</p>
            </Link>
         </div>
      </div>

      {/* Trust Section */}
      <section className="bg-gradient-to-br from-primary-900 to-blue-900 rounded-3xl p-8 md:p-20 text-white shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary-500 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-72 h-72 bg-purple-500 rounded-full opacity-20 blur-3xl"></div>
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Por que escolher a ViajaStore?</h2>
                <div className="space-y-6">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                            <ShieldCheck className="text-green-400" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl">100% Seguro</h3>
                            <p className="text-gray-300 text-sm mt-1">Pagamentos processados com criptografia de ponta. Garantia de viagem ou seu dinheiro de volta.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                            <Compass className="text-blue-400" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl">Curadoria de Destinos</h3>
                            <p className="text-gray-300 text-sm mt-1">Selecionamos apenas as melhores experiências e agências com alta reputação.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                            <CheckCircle className="text-yellow-400" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl">Transparência Total</h3>
                            <p className="text-gray-300 text-sm mt-1">Sem taxas escondidas. O preço que você vê é o preço que você paga.</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
                <h3 className="text-2xl font-bold mb-2">Baixe o App (Em breve)</h3>
                <p className="text-gray-300 text-sm mb-6">Leve a ViajaStore no seu bolso e receba ofertas exclusivas.</p>
                <div className="flex gap-4">
                   <button className="flex-1 bg-black rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors">
                      <span className="text-2xl"></span> <div className="text-left leading-none"><div className="text-[10px] uppercase">Download on the</div><div className="font-bold text-sm">App Store</div></div>
                   </button>
                   <button className="flex-1 bg-black rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors">
                      <span className="text-xl">▶</span> <div className="text-left leading-none"><div className="text-[10px] uppercase">Get it on</div><div className="font-bold text-sm">Google Play</div></div>
                   </button>
                </div>
            </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
