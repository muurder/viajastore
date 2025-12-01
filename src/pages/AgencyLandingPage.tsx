

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
const INTEREST_CHIPS: Array<{ label: string; id: string; icon?: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>; }> = [
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
