
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import TripCard from '../components/TripCard';
import { MapPin, Mail, ShieldCheck, Search, Globe, Heart, Umbrella, Mountain, TreePine, Landmark, Utensils, Moon, Drama, Palette, Wallet, Smartphone, Clock, Info, Star, Award, ThumbsUp, Users, CheckCircle, ArrowDown, MessageCircle, ArrowRight } from 'lucide-react';

// Reuse Filters from Home
const INTEREST_CHIPS = [
  { label: 'Todos', id: 'chip-all' },
  { label: 'Praia', icon: Umbrella, id: 'chip-praia' },
  { label: 'Aventura', icon: Mountain, id: 'chip-aventura' },
  { label: 'Natureza', icon: TreePine, id: 'chip-natureza' },
  { label: 'História', icon: Landmark, id: 'chip-historia' },
  { label: 'Gastronomia', icon: Utensils, id: 'chip-gastronomia' },
  { label: 'Romântico', icon: Heart, id: 'chip-romantico' },
  { label: 'Vida Noturna', icon: Moon, id: 'chip-vida-noturna' },
  { label: 'Cultura', icon: Drama, id: 'chip-cultura' },
  { label: 'Arte', icon: Palette, id: 'chip-arte' },
  { label: 'Viagem barata', icon: Wallet, id: 'chip-barata' },
];

const normalizeText = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const AgencyLandingPage: React.FC = () => {
  const { agencySlug } = useParams<{ agencySlug: string }>();
  const { getAgencyBySlug, getAgencyPublicTrips, getReviewsByAgencyId, loading, getAgencyTheme } = useData();
  const { setAgencyTheme } = useTheme();
  
  const [activeTab, setActiveTab] = useState<'PACKAGES' | 'ABOUT' | 'REVIEWS'>('PACKAGES');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  
  const agency = agencySlug ? getAgencyBySlug(agencySlug) : undefined;

  // Force refresh theme on mount
  useEffect(() => {
      const loadTheme = async () => {
          if (agency) {
              const theme = await getAgencyTheme(agency.id);
              if (theme) setAgencyTheme(theme.colors);
          }
      };
      loadTheme();
  }, [agency]);

  // Wait for data loading
  if (loading) {
      return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!agency) {
      return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
            <div className="bg-gray-100 p-6 rounded-full mb-6">
              <Search size={48} className="text-gray-400" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Agência não encontrada</h1>
            <p className="text-gray-500 mb-8 max-w-md">O endereço <strong>/{agencySlug}</strong> não existe.</p>
            <Link to="/agencies" className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors">
              Ver Lista de Agências
            </Link>
          </div>
      );
  }

  // Fetch trips for this agency
  const allTrips = getAgencyPublicTrips(agency.id);

  // --- HERO LOGIC: RANDOM TRIP ON REFRESH ---
  const currentHeroTrip = useMemo(() => {
      // 1. Get active trips
      const active = allTrips.filter(t => t.active);
      
      if (active.length === 0) return null;

      // 2. Select ONE random trip
      // Using Math.random() inside useMemo with [active] dependency means it runs once when data loads
      // This effectively gives "Random trip on page load/refresh"
      const randomIndex = Math.floor(Math.random() * active.length);
      return active[randomIndex];
  }, [allTrips]);

  // Fallback Image
  const heroBgImage = currentHeroTrip?.images[0] || agency.heroBannerUrl || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop";

  // --- REVIEWS DATA ---
  const agencyReviews = getReviewsByAgencyId(agency.id);

  const agencyStats = useMemo(() => {
      const totalReviews = agencyReviews.length;
      const averageRating = totalReviews > 0 
          ? agencyReviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews 
          : 0; 
      
      const totalClients = allTrips.reduce((acc, t) => acc + (t.sales || 0), 0);

      return { totalReviews, averageRating, totalClients };
  }, [agencyReviews, allTrips]);

  
  // Filtering Logic
  const filteredTrips = allTrips.filter(t => {
    if (t.agencyId !== agency.id) return false;

    const matchesSearch = 
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.destination.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedInterests.length === 0) return true;

    return selectedInterests.some(interest => {
        const cleanInterest = normalizeText(interest);
        const cleanCategory = normalizeText(t.category);
        if (cleanCategory === cleanInterest) return true;
        if (cleanCategory === cleanInterest.replace(/\s/g, '_')) return true;
        return t.tags.some(tag => normalizeText(tag).includes(cleanInterest));
    });
  });

  const toggleInterest = (label: string) => {
    if (label === 'Todos') {
        setSelectedInterests([]);
    } else {
        setSelectedInterests(prev => 
            prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
        );
    }
 };

  const clearFilters = () => {
      setSearchTerm('');
      setSelectedInterests([]);
  };

  const handleContact = () => {
      if (agency.whatsapp) {
          const num = agency.whatsapp.replace(/\D/g, '');
          const message = encodeURIComponent('Olá, vi seu site na ViajaStore e gostaria de saber mais sobre os pacotes.');
          window.open(`https://wa.me/${num}?text=${message}`, '_blank');
      } else if (agency.email) {
          window.location.href = `mailto:${agency.email}`;
      } else {
          alert('As informações de contato desta agência não estão disponíveis.');
      }
  };

  const scrollToPackages = () => {
      const element = document.getElementById('packages-section');
      if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          setActiveTab('PACKAGES');
      }
  };

  return (
    <div className="space-y-10 animate-[fadeIn_0.3s] pb-12">
      
      {/* --- HERO SECTION (REDESIGNED) --- */}
      <div 
        key={agency.id}
        className="bg-gray-900 rounded-b-3xl md:rounded-3xl shadow-2xl overflow-hidden relative min-h-[500px] md:min-h-[580px] flex items-center group mx-0 md:mx-4 lg:mx-8 mt-0 md:mt-4"
      >
          {/* Background Image Layer */}
          <div className="absolute inset-0 z-0">
              <img 
                src={heroBgImage} 
                className="w-full h-full object-cover transition-transform duration-[20s] ease-linear scale-105 group-hover:scale-110" 
                alt="Cover" 
              />
          </div>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent z-20 pointer-events-none"></div>

          {/* Agency Identity Badge (Absolute Top Left) */}
          <div className="absolute top-6 left-6 md:top-10 md:left-12 z-40 flex items-center gap-4 animate-[fadeInDown_0.5s]">
              <div className="w-16 h-16 rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-md shadow-xl overflow-hidden">
                  <img 
                    src={agency.logo || `https://ui-avatars.com/api/?name=${agency.name}`} 
                    className="w-full h-full object-cover" 
                    alt="Logo"
                  />
              </div>
              <div>
                  <h2 className="text-white font-bold text-lg shadow-black drop-shadow-md leading-tight">{agency.name}</h2>
                  {agency.subscriptionStatus === 'ACTIVE' && (
                      <span className="text-green-400 text-xs font-bold flex items-center gap-1 drop-shadow-md bg-black/20 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10 w-fit mt-1">
                          <ShieldCheck size={12} fill="currentColor" /> Verificado
                      </span>
                  )}
              </div>
          </div>

          {/* Main Content Grid */}
          <div className="relative z-30 w-full max-w-7xl mx-auto px-6 md:px-12 pt-20 md:pt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  
                  {/* Left Side: Text Content */}
                  <div className="text-white animate-[fadeInUp_0.8s_ease-out]">
                      {currentHeroTrip ? (
                          <>
                             <div className="flex flex-wrap items-center gap-3 mb-4">
                                  <span className="px-3 py-1 rounded-full bg-primary-600 text-white text-xs font-bold uppercase tracking-wide border border-primary-500 shadow-lg shadow-primary-900/20">
                                      {currentHeroTrip.category.replace('_', ' ')}
                                  </span>
                                  <span className="flex items-center text-gray-300 text-xs font-bold bg-black/30 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                                      <Clock size={12} className="mr-1.5 text-primary-400"/> {currentHeroTrip.durationDays} Dias
                                  </span>
                              </div>

                              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-white drop-shadow-xl leading-[1.1]">
                                  {currentHeroTrip.title}
                              </h1>
                              
                              <div className="flex items-center text-gray-200 text-lg font-medium mb-8 drop-shadow-md">
                                  <MapPin size={20} className="mr-2 text-primary-400"/> 
                                  {currentHeroTrip.destination}
                              </div>

                              <div className="flex flex-wrap gap-4">
                                  <Link 
                                    to={`/${agencySlug}/viagem/${currentHeroTrip.slug || currentHeroTrip.id}`}
                                    className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-3.5 rounded-xl font-bold shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
                                  >
                                      Ver Detalhes <ArrowRight size={18}/>
                                  </Link>
                                  {agency.whatsapp && (
                                      <button 
                                        onClick={handleContact}
                                        className="bg-green-600 hover:bg-green-500 text-white px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-green-900/30 flex items-center justify-center gap-2 transition-all active:scale-95"
                                      >
                                          <MessageCircle size={20} /> WhatsApp
                                      </button>
                                  )}
                              </div>
                          </>
                      ) : (
                          // Fallback for 0 trips
                          <>
                              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 text-white drop-shadow-xl">
                                  {agency.heroTitle || `Bem-vindo à ${agency.name}`}
                              </h1>
                              <p className="text-gray-200 text-lg md:text-xl font-light max-w-2xl leading-relaxed mb-8 drop-shadow-md">
                                  {agency.heroSubtitle || agency.description || "As melhores experiências de viagem você encontra aqui."}
                              </p>
                              <button 
                                onClick={scrollToPackages}
                                className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-3.5 rounded-xl font-bold shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
                              >
                                  Ver Pacotes <ArrowDown size={18}/>
                              </button>
                          </>
                      )}
                  </div>

                  {/* Right Side: Glassmorphism Card (Only if there is a trip) */}
                  <div className="hidden lg:flex justify-end animate-[fadeIn_1s_ease-out]">
                      {currentHeroTrip && (
                          <Link 
                            to={`/${agencySlug}/viagem/${currentHeroTrip.slug || currentHeroTrip.id}`}
                            className="block w-full max-w-sm bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-5 shadow-2xl hover:bg-white/20 hover:scale-[1.02] transition-all duration-300 group/card"
                          >
                              <div className="relative h-52 w-full rounded-2xl overflow-hidden mb-5 shadow-inner">
                                  <img 
                                    src={currentHeroTrip.images[0]} 
                                    alt={currentHeroTrip.title} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110" 
                                  />
                                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-white/10">
                                      Destaque
                                  </div>
                              </div>
                              
                              <h3 className="font-bold text-white text-xl leading-tight line-clamp-2 mb-4 group-hover/card:text-primary-200 transition-colors drop-shadow-sm">
                                  {currentHeroTrip.title}
                              </h3>
                              
                              <div className="flex justify-between items-end pt-2 border-t border-white/10">
                                  <div className="flex flex-col">
                                      <p className="text-[10px] uppercase font-bold text-gray-300 mb-0.5 tracking-wider">A partir de</p>
                                      <div className="flex items-baseline gap-1">
                                          <span className="text-xs font-semibold text-gray-400">R$</span>
                                          <p className="text-3xl font-extrabold text-white drop-shadow-sm">{currentHeroTrip.price.toLocaleString('pt-BR')}</p>
                                      </div>
                                  </div>
                                  <div className="h-10 w-10 bg-primary-600 rounded-full flex items-center justify-center text-white shadow-lg group-hover/card:bg-primary-500 transition-colors">
                                      <ArrowRight size={20} className="-rotate-45 group-hover/card:rotate-0 transition-transform duration-300"/>
                                  </div>
                              </div>
                          </Link>
                      )}
                  </div>

              </div>
          </div>
      </div>

      {/* --- NAVIGATION TABS --- */}
      <div className="sticky top-[64px] z-40 bg-gray-50/90 backdrop-blur-md border-b border-gray-200 shadow-sm -mt-6 pt-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center gap-8">
              {[
                  { id: 'PACKAGES', label: 'Pacotes', icon: MapPin },
                  { id: 'ABOUT', label: 'Sobre a Agência', icon: Info },
                  { id: 'REVIEWS', label: 'Avaliações', icon: Star },
              ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 pb-4 px-2 border-b-2 text-sm font-bold transition-all ${activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                  >
                      <tab.icon size={18} /> {tab.label}
                  </button>
              ))}
          </div>
      </div>

      {/* --- CONTENT SECTIONS --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[500px]">
        
        {/* TAB: PACKAGES */}
        {activeTab === 'PACKAGES' && (
            <div id="packages-section" className="animate-[fadeIn_0.3s]">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 mt-8">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        {searchTerm || selectedInterests.length > 0 ? 'Resultados da Busca' : 'Pacotes Disponíveis'} 
                        <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">{filteredTrips.length}</span>
                    </h2>
                    
                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar destino ou pacote..." 
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Filter Chips */}
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-8">
                    {INTEREST_CHIPS.map(({label, icon: Icon}) => {
                        const isSelected = label === 'Todos' ? selectedInterests.length === 0 : selectedInterests.includes(label);
                        return (
                            <button 
                                key={label}
                                onClick={() => toggleInterest(label)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${isSelected ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                            >
                                {Icon && <Icon size={14} />} {label}
                            </button>
                        );
                    })}
                    {selectedInterests.length > 0 && (
                        <button onClick={() => setSelectedInterests([])} className="text-red-500 text-sm font-bold hover:underline px-2">Limpar</button>
                    )}
                </div>

                {filteredTrips.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredTrips.map(trip => (
                    <TripCard key={trip.id} trip={trip} />
                    ))}
                </div>
                ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="text-gray-300" size={32} />
                    </div>
                    <p className="text-gray-900 font-bold text-lg mb-1">Nenhum pacote encontrado.</p>
                    <p className="text-gray-500 mb-4">A agência ainda não cadastrou viagens com estes critérios.</p>
                    {(searchTerm || selectedInterests.length > 0) && (
                        <button onClick={clearFilters} className="text-primary-600 font-bold hover:underline">
                            Limpar filtros
                        </button>
                    )}
                </div>
                )}
            </div>
        )}

        {/* TAB: ABOUT */}
        {activeTab === 'ABOUT' && (
            <div className="max-w-4xl mx-auto animate-[fadeIn_0.3s] mt-8 space-y-12">
                
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className="bg-blue-50 p-3 rounded-full text-blue-600"><Users size={24}/></div>
                        <div>
                            <p className="text-2xl font-extrabold text-gray-900">{agencyStats.totalClients > 50 ? `${agencyStats.totalClients}+` : agencyStats.totalClients}</p>
                            <p className="text-xs text-gray-500 uppercase font-bold">Viajantes Embarcados</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className="bg-green-50 p-3 rounded-full text-green-600"><CheckCircle size={24}/></div>
                        <div>
                            <p className="text-2xl font-extrabold text-gray-900">{allTrips.length}</p>
                            <p className="text-xs text-gray-500 uppercase font-bold">Roteiros Ativos</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className="bg-amber-50 p-3 rounded-full text-amber-600"><Star size={24}/></div>
                        <div>
                            <p className="text-2xl font-extrabold text-gray-900">{agencyStats.averageRating > 0 ? agencyStats.averageRating.toFixed(1) : '-'}/5</p>
                            <p className="text-xs text-gray-500 uppercase font-bold">Nota Média</p>
                        </div>
                    </div>
                </div>

                {/* Content & Sidebar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div className="md:col-span-2 space-y-8">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Sobre a {agency.name}</h3>
                            <div className="prose prose-blue text-gray-600 leading-relaxed">
                                <p className="text-lg">{agency.description}</p>
                                <p>Somos apaixonados por proporcionar experiências inesquecíveis. Nossa missão é conectar pessoas a destinos incríveis com segurança, conforto e preços justos.</p>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-6">Por que viajar conosco?</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="flex gap-4">
                                    <ShieldCheck className="text-green-500 flex-shrink-0" size={24} />
                                    <div>
                                        <h4 className="font-bold text-gray-900">Segurança Garantida</h4>
                                        <p className="text-sm text-gray-500 mt-1">Agência verificada com CNPJ e suporte 24h durante a viagem.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <Award className="text-blue-500 flex-shrink-0" size={24} />
                                    <div>
                                        <h4 className="font-bold text-gray-900">Guias Especialistas</h4>
                                        <p className="text-sm text-gray-500 mt-1">Profissionais locais que conhecem cada detalhe do destino.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <ThumbsUp className="text-primary-500 flex-shrink-0" size={24} />
                                    <div>
                                        <h4 className="font-bold text-gray-900">Melhor Custo-Benefício</h4>
                                        <p className="text-sm text-gray-500 mt-1">Negociamos diretamente com hotéis e passeios para o melhor preço.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <Heart className="text-red-500 flex-shrink-0" size={24} />
                                    <div>
                                        <h4 className="font-bold text-gray-900">Feito com Carinho</h4>
                                        <p className="text-sm text-gray-500 mt-1">Roteiros pensados nos mínimos detalhes para você só aproveitar.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Info */}
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                            <h4 className="font-bold text-gray-900 mb-4">Contatos</h4>
                            <ul className="space-y-3 text-sm text-gray-600">
                                {agency.whatsapp && (
                                    <li className="flex items-center gap-3">
                                        <div className="bg-green-100 p-2 rounded-full text-green-600"><Smartphone size={16}/></div>
                                        <span>{agency.whatsapp}</span>
                                    </li>
                                )}
                                {agency.email && (
                                    <li className="flex items-center gap-3">
                                        <div className="bg-blue-100 p-2 rounded-full text-blue-600"><Mail size={16}/></div>
                                        <span className="truncate">{agency.email}</span>
                                    </li>
                                )}
                                <li className="flex items-center gap-3">
                                    <div className="bg-gray-200 p-2 rounded-full text-gray-600"><ShieldCheck size={16}/></div>
                                    <span>CNPJ: {agency.cnpj}</span>
                                </li>
                            </ul>
                        </div>
                        {agency.address && (
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                                <h4 className="font-bold text-gray-900 mb-4">Localização</h4>
                                <p className="text-sm text-gray-600 mb-4">
                                    {agency.address.street}, {agency.address.number}<br/>
                                    {agency.address.district} - {agency.address.city}/{agency.address.state}
                                </p>
                                {/* Placeholder for Map */}
                                <div className="w-full h-32 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-xs font-bold uppercase tracking-widest border border-gray-300">
                                    Mapa da Região
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* TAB: REVIEWS */}
        {activeTab === 'REVIEWS' && (
            <div className="max-w-4xl mx-auto animate-[fadeIn_0.3s] mt-8">
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm mb-8 text-center md:text-left flex flex-col md:flex-row items-center gap-8">
                    <div className="text-center min-w-[200px]">
                        <div className="text-6xl font-extrabold text-gray-900">{agencyStats.averageRating.toFixed(1)}</div>
                        <div className="flex justify-center gap-1 text-amber-400 my-2">
                            {[1,2,3,4,5].map(star => (
                                <Star key={star} size={24} className={star <= Math.round(agencyStats.averageRating) ? "fill-current" : "text-gray-200"} />
                            ))}
                        </div>
                        <p className="text-gray-500 text-sm font-medium">Baseado em {agencyStats.totalReviews} avaliações</p>
                    </div>
                    <div className="h-px w-full md:w-px md:h-24 bg-gray-200"></div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">O que dizem nossos viajantes</h3>
                        <p className="text-gray-500">
                            A reputação da <strong>{agency.name}</strong> é construída com base nas experiências reais de clientes que viajaram conosco.
                            Todas as avaliações são de compras verificadas na plataforma.
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {agencyReviews.length > 0 ? agencyReviews.map((review) => (
                        <div key={review.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 uppercase">
                                        {review.clientName ? review.clientName.charAt(0) : 'A'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{review.clientName || 'Viajante'}</p>
                                        <p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()} • Compra Verificada</p>
                                    </div>
                                </div>
                                <div className="flex text-amber-400">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={14} className={i < review.rating ? "fill-current" : "text-gray-200"} />
                                    ))}
                                </div>
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-3 rounded-lg">"{review.comment}"</p>
                        </div>
                    )) : (
                        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <p className="text-gray-500 italic">Ainda não há avaliações suficientes para exibir o histórico detalhado.</p>
                        </div>
                    )}
                </div>
            </div>
        )}

      </div>

      <div className="text-center pt-12 pb-4 border-t border-gray-200">
          <Link to="/" className="inline-flex items-center text-gray-400 hover:text-primary-600 font-bold transition-colors text-xs uppercase tracking-widest">
              <Globe size={12} className="mr-2" /> Voltar para ViajaStore
          </Link>
      </div>
    </div>
  );
};

export default AgencyLandingPage;
