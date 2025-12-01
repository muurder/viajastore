

import React, { useState, useEffect, useMemo, useRef, ForwardRefExoticComponent, RefAttributes } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import TripCard from '../components/TripCard';
import { MapPin, Mail, ShieldCheck, Search, Globe, Heart, Umbrella, Mountain, TreePine, Landmark, Utensils, Moon, Drama, Palette, Wallet, Smartphone, Clock, Info, Star, Award, ThumbsUp, Users, CheckCircle, ArrowDown, MessageCircle, ArrowRight, Send, Edit, Loader, LucideProps } from 'lucide-react';
import { AgencyReview, Trip } from '../types';

// Reuse Filters from Home
// @FIX: Ensured all chips have a consistent 'icon' property to resolve type assignment error.
const INTEREST_CHIPS: Array<{ label: string; id: string; icon: React.ComponentType<LucideProps>; }> = [
  { label: 'Todos', id: 'chip-all', icon: Globe }, // Added Globe icon
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

// @FIX: Corrected unicode range for diacritics removal
const normalizeText = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// --- Reusable Review Form Component ---
interface ReviewFormProps {
  onSubmit: (rating: number, comment: string, tags: string[]) => void;
  isSubmitting: boolean;
  initialRating: number;
  initialComment: string;
  initialTags: string[];
  submitButtonText: string;
}

const SUGGESTED_TAGS = ['Atendimento', 'Organização', 'Custo-benefício', 'Hospedagem', 'Passeios', 'Pontualidade'];

const ReviewForm: React.FC<ReviewFormProps> = ({ onSubmit, isSubmitting, initialRating, initialComment, initialTags, submitButtonText }) => {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [tags, setTags] = useState(initialTags);

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(rating, comment, tags);
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
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">O que você mais gostou?</label>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_TAGS.map(tag => (
            <button
              type="button"
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${tags.includes(tag) ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
            >
              {tag}
            </button>
          ))}
        </div>
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
  const reviewsSectionRef = useRef<HTMLDivElement>(null);

  const agency = agencySlug ? getAgencyBySlug(agencySlug) : undefined;

  const allTrips = useMemo(() => agency ? getAgencyPublicTrips(agency.agencyId) : [], [agency, getAgencyPublicTrips]);
  const agencyReviews = useMemo(() => (agency ? getReviewsByAgencyId(agency.agencyId) : []).sort((a,b) => new Date(b.createdAt).getTime() - new Date(b.createdAt).getTime()), [agency, getReviewsByAgencyId]);
  const hasPurchased = useMemo(() => user && agency ? bookings.some(b => b.clientId === user.id && b._trip?.agencyId === agency.agencyId && b.status === 'CONFIRMED') : false, [bookings, user, agency]);
  const myReview = useMemo(() => user ? agencyReviews.find(r => r.clientId === user.id) : undefined, [agencyReviews, user]);

  useEffect(() => {
    if (initialTab === 'REVIEWS' && reviewsSectionRef.current) {
        setTimeout(() => {
            reviewsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    }
  }, [initialTab]);
  
  useEffect(() => {
      if (agency) {
          const loadTheme = async () => {
              const theme = await getAgencyTheme(agency.agencyId);
              if (theme) setAgencyTheme(theme.colors);
          };
          loadTheme();
      }
  }, [agency, getAgencyTheme, setAgencyTheme]);

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

  const agencyStats = {
      totalReviews: agencyReviews.length,
      averageRating: agencyReviews.length > 0 ? agencyReviews.reduce((acc, r) => acc + r.rating, 0) / agencyReviews.length : 0,
      totalClients: allTrips.reduce((acc, t) => acc + (t.sales || 0), 0)
  };

  const filteredTrips = allTrips.filter(t => {
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

  const handleReviewSubmit = async (rating: number, comment: string, tags: string[]) => {
    if (!user || !agency) return;
    setIsSubmittingReview(true);
    try {
      await addAgencyReview({
        agencyId: agency.agencyId, 
        clientId: user.id,
        rating,
        comment,
        tags
      });
      showToast('Avaliação enviada com sucesso!', 'success');
      await refreshData();
    } catch (error) {
        showToast('Erro ao enviar avaliação.', 'error');
        console.error(error);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleReviewUpdate = async (rating: number, comment: string, tags: string[]) => {
    if (!myReview) return;
    setIsSubmittingReview(true);
    try {
      await updateAgencyReview(myReview.id, { rating, comment, tags });
      showToast('Avaliação atualizada com sucesso!', 'success');
      await refreshData();
      setIsEditingReview(false);
    } catch(err) {
        showToast('Erro ao atualizar avaliação.', 'error');
        console.error(err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // 1. Stable Hero Trips State
  const [heroTrips, setHeroTrips] = useState<Trip[]>([]);

  // 2. Fetch trips only when agency changes or loads
  useEffect(() => {
      if (!agency) return;
      const trips = getAgencyPublicTrips(agency.agencyId).filter(t => t.is_active);
      
      setHeroTrips(prev => {
          // If we already have trips for this agency, preserve order to avoid shuffle jump
          if (prev.length > 0 && prev[0].agencyId === agency.agencyId) return prev;
          if (trips.length === 0) return [];

          const featured = trips.filter(t => t.featuredInHero);
          const others = trips.filter(t => !t.featuredInHero);
          const combined = [...featured, ...others];
          
          if (featured.length === 0) {
              combined.sort(() => 0.5 - Math.random());
          }
          
          return combined.slice(0, 5);
      });
  }, [agency?.agencyId, getAgencyPublicTrips]);

  // 3. Carousel Logic (Standardized)
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!heroTrips.length) return;
    const id = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % heroTrips.length);
    }, 8000);
    return () => clearInterval(id);
  }, [heroTrips.length]);

  const currentHeroTrip = heroTrips.length > 0 ? heroTrips[currentIndex] : null;


  return (
    <div className="space-y-10 animate-[fadeIn_0.3s] pb-12">
      
      {/* Hero Section */}
      <div 
        className="bg-gray-900 rounded-b-3xl md:rounded-3xl shadow-2xl overflow-hidden relative min-h-[500px] md:min-h-[580px] flex items-center group mx-0 md:mx-4 lg:mx-8 mt-0 md:mt-4"
      >
          {agency.heroMode === 'STATIC' ? (
              <>
                  <div className="absolute inset-0 z-0">
                      <img 
                        src={agency.heroBannerUrl || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop"}
                        className="w-full h-full object-cover" 
                        alt="Cover"
                      />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent z-10 pointer-events-none"></div>
                  
                  {/* Agency Header Badge */}
                  <div className="absolute top-6 left-6 md:top-10 md:left-12 z-40 flex items-center gap-4 animate-[fadeInDown_0.5s]">
                      <div className="w-16 h-16 rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-md shadow-xl overflow-hidden">
                          <img src={agency.logo || `https://ui-avatars.com/api/?name=${agency.name}`} className="w-full h-full object-cover" alt="Logo" />
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
                      <div className="text-white animate-[fadeInUp_0.8s_ease-out] pt-8 lg:pt-24 max-w-2xl">
                          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 text-white drop-shadow-xl">
                              {agency.heroTitle || `Bem-vindo à ${agency.name}`}
                          </h1>
                          <p className="text-gray-200 text-lg md:text-xl font-light leading-relaxed mb-8 drop-shadow-md">
                              {agency.heroSubtitle || agency.description || "As melhores experiências de viagem você encontra aqui."}
                          </p>
                          <button onClick={scrollToPackages} className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-3.5 rounded-full font-bold shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95">
                              Ver Pacotes <ArrowDown size={18}/>
                          </button>
                      </div>
                  </div>
              </>
          ) : (
              // CAROUSEL MODE
              currentHeroTrip ? (
                  <div key={currentHeroTrip.id} className="absolute inset-0 w-full h-full animate-[fadeIn_0.4s_ease-out]">
                      {/* Background Image */}
                      <div className="absolute inset-0 z-0">
                          <img 
                            src={currentHeroTrip.images[0] || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop"} 
                            className="w-full h-full object-cover transition-transform duration-[20s] ease-linear scale-105 group-hover:scale-110" 
                            alt={currentHeroTrip.title} 
                          />
                      </div>
                      
                      {/* Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent z-10 pointer-events-none"></div>

                      {/* Agency Header Badge */}
                      <div className="absolute top-6 left-6 md:top-10 md:left-12 z-40 flex items-center gap-4 animate-[fadeInDown_0.5s]">
                          <div className="w-16 h-16 rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-md shadow-xl overflow-hidden">
                              <img src={agency.logo || `https://ui-avatars.com/api/?name=${agency.name}`} className="w-full h-full object-cover" alt="Logo" />
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

                      {/* Content Overlay */}
                      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 md:px-12 pt-20 md:pt-0 h-full flex items-center">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
                              {/* Left Text */}
                              <div className="text-white pt-8 lg:pt-0">
                                  <div className="flex flex-wrap items-center gap-3 mb-4">
                                      <span className="px-3 py