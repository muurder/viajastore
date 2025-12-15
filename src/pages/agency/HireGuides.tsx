import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
    Search, CheckCircle, MapPin, Compass, MessageCircle,
    Star, Globe, Filter, Languages, Map
} from 'lucide-react';
import { Agency } from '../../types';

export const HireGuides: React.FC = () => {
    const { agencies, loading } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
    const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

    // Initial Specialties & Filter Logic
    const allGuides = useMemo(() => {
        return agencies.filter(agency => agency.isGuide || agency.customSettings?.tags?.includes('GUIA'));
    }, [agencies]);

    const filteredGuides = useMemo(() => {
        let filtered = [...allGuides];
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(g =>
                g.name.toLowerCase().includes(term) ||
                g.description?.toLowerCase().includes(term) ||
                g.languages?.some(l => l.toLowerCase().includes(term))
            );
        }
        if (selectedLanguage) {
            filtered = filtered.filter(g => g.languages?.some(l => l.includes(selectedLanguage)));
        }
        if (selectedRegion) {
            filtered = filtered.filter(g => g.address?.state?.includes(selectedRegion) || g.address?.city?.includes(selectedRegion));
        }
        return filtered;
    }, [allGuides, searchTerm, selectedLanguage, selectedRegion]);

    // Unique values for filters
    const allLanguages = useMemo(() => Array.from(new Set(allGuides.flatMap(g => g.languages || []))), [allGuides]);
    const allRegions = useMemo(() => Array.from(new Set(allGuides.map(g => g.address?.state).filter(Boolean))), [allGuides]);

    const buildWhatsAppLink = (guide: Agency) => {
        const phone = guide.whatsapp || guide.phone;
        if (!phone) return '#';
        const number = phone.replace(/\D/g, '');
        return `https://wa.me/${number}?text=${encodeURIComponent('Olá! Vi seu perfil na ViajaStore e gostaria de cotar seus serviços.')}`;
    };

    return (
        <div className="p-4 md:p-8 pb-24 md:pb-8 animate-[fadeIn_0.3s]">
            {/* Header Section */}
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Encontre o Guia Ideal</h1>
                <p className="text-gray-500 text-lg">Profissionais verificados para elevar a experiência dos seus pacotes.</p>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Nome, bio ou palavra-chave..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 md:pb-0">
                    <div className="relative min-w-[150px]">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><Languages size={16} /></div>
                        <select
                            className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border-none rounded-xl appearance-none cursor-pointer text-sm font-medium text-gray-700"
                            value={selectedLanguage || ''}
                            onChange={e => setSelectedLanguage(e.target.value || null)}
                        >
                            <option value="">Idiomas</option>
                            {allLanguages.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                    <div className="relative min-w-[150px]">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><Map size={16} /></div>
                        <select
                            className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border-none rounded-xl appearance-none cursor-pointer text-sm font-medium text-gray-700"
                            value={selectedRegion || ''}
                            onChange={e => setSelectedRegion(e.target.value || null)}
                        >
                            <option value="">Região / UF</option>
                            {allRegions.map(r => <option key={r} value={r as string}>{r}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredGuides.map(guide => (
                    <div key={guide.id} className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden group">
                        <div className="p-6 flex flex-col items-center text-center border-b border-gray-50">
                            <div className="relative mb-3">
                                <img
                                    src={guide.logo || `https://ui-avatars.com/api/?name=${guide.name}`}
                                    alt={guide.name}
                                    className="w-20 h-20 rounded-full object-cover border-4 border-gray-50 shadow-sm"
                                />
                                {guide.cadastur && (
                                    <div className="absolute bottom-0 right-0 bg-white p-1 rounded-full shadow-sm">
                                        <CheckCircle size={16} className="text-blue-500 fill-blue-50" />
                                    </div>
                                )}
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg mb-1">{guide.name}</h3>
                            <div className="flex items-center text-gray-500 text-xs mb-3">
                                <MapPin size={12} className="mr-1" />
                                {guide.address?.city || 'Brasil'} {guide.address?.state ? `- ${guide.address.state}` : ''}
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-4 h-10">
                                {guide.description || 'Guia profissional disponível para parcerias.'}
                            </p>
                            <div className="flex flex-wrap justify-center gap-1.5 w-full">
                                {guide.languages?.slice(0, 3).map(lang => (
                                    <span key={lang} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-600 font-medium">
                                        {lang}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="mt-auto p-4 bg-gray-50/50 flex gap-2">
                            <button onClick={() => window.open(`/#/${guide.slug}`, '_blank')} className="flex-1 py-2 text-sm font-bold text-gray-600 hover:bg-white hover:text-primary-600 hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-gray-100">
                                Ver Perfil
                            </button>
                            <a href={buildWhatsAppLink(guide)} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 flex items-center justify-center gap-2 text-sm font-bold text-white bg-green-500 hover:bg-green-600 rounded-lg shadow-green-500/20 shadow-md transition-all">
                                <MessageCircle size={16} /> Conectar
                            </a>
                        </div>
                    </div>
                ))}
            </div>

            {filteredGuides.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                    <Search className="mx-auto mb-3 opacity-50" size={48} />
                    <p className="font-medium">Nenhum guia encontrado com esses filtros.</p>
                </div>
            )}
        </div>
    );
};
