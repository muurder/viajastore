import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import TripCard from '../components/TripCard';
import { MapPin, Mail, ShieldCheck, Search, Globe, Heart, Umbrella, Mountain, TreePine, Landmark, Utensils, Moon, Drama, Palette, Wallet, Smartphone, Clock, Info, Star, Award, ThumbsUp, Users, CheckCircle, ArrowDown, MessageCircle, ArrowRight, Send, Edit, Loader } from 'lucide-react';
import { AgencyReview } from '../types';

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

// --- Reusable Review Form Component ---
interface ReviewFormProps {
  onSubmit: (rating: number, comment: string) => void;
  isSubmitting: boolean;
  initialRating?: number;
  initialComment?: string;
  submitButtonText: string;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ onSubmit, isSubmitting, initialRating = 5, initialComment = '', submitButtonText }) => {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);

  useEffect(() => {
    setRating(initialRating);
    setComment(initialComment);
  }, [initialRating, initialComment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(rating, comment);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Sua nota</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button type="button" key={star} onClick={() => setRating(star)} className="focus:outline-none transition-transform hover:scale-110">
              <Star size={28} className={star <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Seu comentário</label>
        <textarea
          className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-500 outline-none h-24 resize-none transition-colors"
          placeholder="Conte como foi sua experiência com a agência..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          required
        />
      </div>
      <button type="submit" disabled={isSubmitting} className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
        {isSubmitting ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
        {submitButtonText}
      </button>
    </form>
  );
};


const AgencyLandingPage: React.FC = () => {
  const { agencySlug } = useParams<{ agencySlug: string }>();
  const { getAgencyBySlug, getAgencyPublicTrips, getReviewsByAgencyId, loading, getAgencyTheme, bookings, addAgencyReview, updateAgencyReview, refreshData } = useData();
  const { setAgencyTheme } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const initialTab = (searchParams.get('tab')?.toUpperCase() as any) || 'PACKAGES';
  const [activeTab, setActiveTab] = useState<'PACKAGES' | 'ABOUT' | 'REVIEWS'>(initialTab);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);

  const agency = agencySlug ? getAgencyBySlug(agencySlug) : undefined;
  
  // Scroll to reviews if tab is set
  const reviewsSectionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (initialTab === 'REVIEWS' && reviewsSectionRef.current) {
        setTimeout(() => {
            reviewsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300); // Delay to allow page to render
    }
  }, [initialTab]);

  if (loading && !agency) {
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
  
  const allTrips = useMemo(() => getAgencyPublicTrips(agency.id), [agency.id, getAgencyPublicTrips]);
  const agencyReviews = useMemo(() => getReviewsByAgencyId(agency.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [agency.id, getReviewsByAgencyId]);

  const hasPurchased = useMemo(() => user && bookings.some(b => b.clientId === user.id && b._trip?.agencyId === agency.id && b.status === 'CONFIRMED'), [bookings, user, agency.id]);
  const myReview = useMemo(() => user && agencyReviews.find(r => r.clientId === user.id), [agencyReviews, user]);
  
  const shuffledTrips = useMemo(() => {
      const trips = [...allTrips];
      for (let i = trips.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [trips[i], trips[j]] = [trips[j], trips[i]];
      }
      return trips;
  }, [allTrips]);

  const currentHeroTrip = useMemo(() => {
      const featured = shuffledTrips.filter(t => t.featuredInHero);
      if (featured.length > 0) return featured[0];
      if (shuffledTrips.length > 0) return shuffledTrips[0];
      return null;
  }, [shuffledTrips]);
  
  const agencyStats = useMemo(() => {
      const totalReviews = agencyReviews.length;
      const averageRating = totalReviews > 0 
          ? agencyReviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews 
          : 0; 
      const totalClients = allTrips.reduce((acc, t) => acc + (t.sales || 0), 0);
      return { totalReviews, averageRating, totalClients };
  }, [agencyReviews, allTrips]);

  const filteredTrips = useMemo(() => shuffledTrips.filter(t => {
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
  }), [shuffledTrips, searchTerm, selectedInterests, agency.id]);

  useEffect(() => {
      const loadTheme = async () => {
          const theme = await getAgencyTheme(agency.id);
          if (theme) setAgencyTheme(theme.colors);
      };
      loadTheme();
  }, [agency.id, getAgencyTheme, setAgencyTheme]);

  const heroBgImage = currentHeroTrip?.images[0] || agency.heroBannerUrl || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop";

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
          showToast('As informações de contato desta agência não estão disponíveis.', 'info');
      }
  };

  const scrollToPackages = () => {
      const element = document.getElementById('packages-section');
      if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          setActiveTab('PACKAGES');
      }
  };

  const handleReviewSubmit = async (rating: number, comment: string) => {
    if (!user) return;
    setIsSubmittingReview(true);
    try {
      await addAgencyReview({
        agencyId: agency.id,
        clientId: user.id,
        rating,
        comment
      });
      await refreshData();
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleReviewUpdate = async (rating: number, comment: string) => {
    if (!myReview) return;
    setIsSubmittingReview(true);
    try {
      await updateAgencyReview(myReview.id, { rating, comment });
      await refreshData();
      setIsEditingReview(false);
    } finally {
      setIsSubmittingReview(false);
    }
  };


  return (
    <div className="space-y-10 animate-[fadeIn_0.3s] pb-12">
      
      <div 
        key={agency.id}
        className="bg-gray-900 rounded-b-3xl md:rounded-3xl shadow-2xl overflow-hidden relative min-h-[500px] md:min-h-[580px] flex items-center group mx-0 md:mx-4 lg:mx-8 mt-0 md:mt-4"
      >
          <div className="absolute inset-0 z-0">
              <img 
                src={heroBgImage} 
                className="w-full h-full object-cover transition-transform duration-[20s] ease-linear scale-105 group-hover:scale-110" 
                alt="Cover" 
              />
          </div>

          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent z-20 pointer-events-none"></div>

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

          <div className="relative z-30 w-full max-w-7xl mx-auto px-6 md:px-12 pt-20 md:pt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  
                  <div className="text-white animate-[fadeInUp_0.8s_ease-out] pt-8 lg:pt-24">
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

      <div ref={reviewsSectionRef} className="sticky top-[64px] z-40 bg-gray-50/90 backdrop-blur-md border-b border-gray-200 shadow-sm -mt-6 pt-4">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[500px]">
        
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

        {activeTab === 'ABOUT' && (
            <div className="max-w-4xl mx-auto animate-[fadeIn_0.3s] mt-8 space-y-12">
                
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
                                <div className="flex gap-4"><ShieldCheck className="text-green-500 flex-shrink-0" size={24} /><div><h4 className="font-bold text-gray-900">Segurança Garantida</h4><p className="text-sm text-gray-500 mt-1">Agência verificada com CNPJ e suporte 24h durante a viagem.</p></div></div>
                                <div className="flex gap-4"><Award className="text-blue-500 flex-shrink-0" size={24} /><div><h4 className="font-bold text-gray-900">Guias Especialistas</h4><p className="text-sm text-gray-500 mt-1">Profissionais locais que conhecem cada detalhe do destino.</p></div></div>
                                <div className="flex gap-4"><ThumbsUp className="text-primary-500 flex-shrink-0" size={24} /><div><h4 className="font-bold text-gray-900">Melhor Custo-Benefício</h4><p className="text-sm text-gray-500 mt-1">Negociamos diretamente com hotéis e passeios para o melhor preço.</p></div></div>
                                <div className="flex gap-4"><Heart className="text-red-500 flex-shrink-0" size={24} /><div><h4 className="font-bold text-gray-900">Feito com Carinho</h4><p className="text-sm text-gray-500 mt-1">Roteiros pensados nos mínimos detalhes para você só aproveitar.</p></div></div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                            <h4 className="font-bold text-gray-900 mb-4">Contatos</h4>
                            <ul className="space-y-3 text-sm text-gray-600">
                                {agency.whatsapp && (<li className="flex items-center gap-3"><div className="bg-green-100 p-2 rounded-full text-green-600"><Smartphone size={16}/></div><span>{agency.whatsapp}</span></li>)}
                                {agency.email && (<li className="flex items-center gap-3"><div className="bg-blue-100 p-2 rounded-full text-blue-600"><Mail size={16}/></div><span className="truncate">{agency.email}</span></li>)}
                                <li className="flex items-center gap-3"><div className="bg-gray-200 p-2 rounded-full text-gray-600"><ShieldCheck size={16}/></div><span>CNPJ: {agency.cnpj}</span></li>
                            </ul>
                        </div>
                        {agency.address && ( <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200"><h4 className="font-bold text-gray-900 mb-4">Localização</h4><p className="text-sm text-gray-600 mb-4">{agency.address.street}, {agency.address.number}<br/>{agency.address.district} - {agency.address.city}/{agency.address.state}</p><div className="w-full h-32 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-xs font-bold uppercase tracking-widest border border-gray-300">Mapa da Região</div></div>)}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'REVIEWS' && (
            <div className="max-w-4xl mx-auto animate-[fadeIn_0.3s] mt-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Opinião de quem já viajou</h2>
                    {agencyReviews.filter(r => r.clientId !== user?.id).length > 0 ? agencyReviews.filter(r => r.clientId !== user?.id).map((review) => (
                        <div key={review.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-start mb-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 uppercase">{review.clientName ? review.clientName.charAt(0) : 'V'}</div><div><p className="font-bold text-gray-900 text-sm">{review.clientName || 'Viajante'}</p><p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()} • Compra Verificada</p></div></div><div className="flex text-amber-400">{[...Array(5)].map((_, i) => ( <Star key={i} size={14} className={i < review.rating ? "fill-current" : "text-gray-200"} />))}</div></div>
                            <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-3 rounded-lg">"{review.comment}"</p>
                        </div>
                    )) : (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200"><p className="text-gray-500 italic">Esta agência ainda não recebeu nenhuma avaliação.</p></div>
                    )}
                </div>
                <div className="lg:col-span-1">
                    <div className="sticky top-28 bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
                        {!user ? (
                            <div className="text-center"><h3 className="font-bold text-lg mb-2">Avalie esta agência</h3><p className="text-sm text-gray-500 mb-4">Faça login para compartilhar sua experiência.</p><Link to="/#login" className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg w-full inline-block">Fazer Login</Link></div>
                        ) : hasPurchased ? (
                            myReview && !isEditingReview ? (
                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg">Sua Avaliação</h3>
                                    <div className="bg-primary-50 p-4 rounded-xl border border-primary-100"><div className="flex justify-between items-center mb-2"><span className="text-sm font-bold text-primary-800">Minha nota</span><div className="flex text-amber-400">{[...Array(5)].map((_, i) => ( <Star key={i} size={14} className={i < myReview.rating ? "fill-current" : "text-gray-200"} />))}</div></div><p className="text-sm text-gray-700 italic">"{myReview.comment}"</p></div>
                                    <button onClick={() => setIsEditingReview(true)} className="w-full bg-gray-100 text-gray-700 font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200"><Edit size={16}/> Editar Avaliação</button>
                                </div>
                            ) : (
                                <div>
                                    <h3 className="font-bold text-lg mb-4">{isEditingReview ? "Editar sua avaliação" : "Deixe sua avaliação"}</h3>
                                    <ReviewForm onSubmit={isEditingReview ? handleReviewUpdate : handleReviewSubmit} isSubmitting={isSubmittingReview} initialRating={myReview?.rating} initialComment={myReview?.comment} submitButtonText={isEditingReview ? "Salvar Alterações" : "Enviar Avaliação"} />
                                    {isEditingReview && <button onClick={() => setIsEditingReview(false)} className="w-full text-center text-sm text-gray-500 mt-3 hover:underline">Cancelar</button>}
                                </div>
                            )
                        ) : (
                            <div className="text-center bg-gray-50 p-6 rounded-xl border border-gray-100"><h3 className="font-bold text-lg mb-2">Avalie esta agência</h3><p className="text-sm text-gray-500">Você precisa ter comprado um pacote desta agência para poder avaliá-la.</p></div>
                        )}
                    </div>
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
