import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { UserRole, Agency, GuideDetails } from '../../types'; // GuideDetails added in types.ts
import {
    LayoutDashboard,
    Image as ImageIcon,
    Briefcase,
    Settings,
    Save,
    Globe,
    MapPin,
    Award,
    Camera,
    User,
    CheckCircle,
    AlertCircle,
    TrendingUp,
    Eye,
    MessageCircle
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import DashboardMobileTabs, { TabItem } from '../../components/mobile/DashboardMobileTabs';
import NotificationCenter from '../../components/NotificationCenter';

// Mock Opportunities
const MOCK_JOBS = [
    { id: 1, title: 'Guia para Grupo Corporativo', date: '2024-12-20', location: 'Capitólio, MG', agency: 'ViajaStore Official', budget: 'R$ 600,00' },
    { id: 2, title: 'Transfer e City Tour', date: '2024-12-22', location: 'São Paulo, SP', agency: 'Rota Segura', budget: 'R$ 450,00' },
    { id: 3, title: 'Guia Bilingue (Inglês)', date: '2025-01-05', location: 'Paraty, RJ', agency: 'Global Trips', budget: 'R$ 800,00' },
];

const GuideDashboard: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('overview');

    // Form State (Mocking fetching existing details)
    const [bio, setBio] = useState('');
    const [languages, setLanguages] = useState<string[]>([]);
    const [specialties, setSpecialties] = useState<string[]>([]);
    const [regions, setRegions] = useState<string[]>([]);
    const [libras, setLibras] = useState(false);
    const [portfolioImages, setPortfolioImages] = useState<string[]>(['', '', '']);

    useEffect(() => {
        if (user && (user as Agency).isGuide) {
            const agencyUser = user as Agency;
            setBio(agencyUser.description || '');
            setLanguages(agencyUser.languages || []);
            setSpecialties(agencyUser.specialties || []);
            // TODO: Load from guide_details when backend is ready
        }
    }, [user]);

    const handleSaveProfile = async () => {
        // TODO: Call API to update guide_details
        showToast('Perfil atualizado com sucesso!', 'success');
    };

    const tabs: TabItem[] = [
        { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
        { id: 'portfolio', label: 'Meu Portfólio', icon: ImageIcon },
        { id: 'opportunities', label: 'Oportunidades', icon: Briefcase },
    ];

    if (!user || user.role !== UserRole.AGENCY || !(user as Agency).isGuide) {
        return <div className="p-8 text-center">Acesso restrito a Guias de Turismo.</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-30 px-4 py-4 md:px-8 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-primary-100 p-2 rounded-lg">
                        <Briefcase className="text-primary-600" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Painel do Guia</h1>
                        <p className="text-xs text-gray-500 hidden md:block">Gerencie sua carreira e encontre oportunidades</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <NotificationCenter />
                    <div className="hidden md:flex flex-col items-end mr-2">
                        <span className="text-sm font-bold text-gray-700">{user.name}</span>
                        <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={10} /> Cadastur Ativo</span>
                    </div>
                    <img src={(user as Agency).logo || `https://ui-avatars.com/api/?name=${user.name}`} className="w-10 h-10 rounded-full border-2 border-gray-100" />
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto p-4 md:p-8">

                {/* Mobile Tabs */}
                <div className="md:hidden mb-6">
                    <DashboardMobileTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
                </div>

                {/* Desktop Tabs (Simple) */}
                <div className="hidden md:flex gap-4 mb-8 border-b border-gray-200 pb-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold transition-colors ${activeTab === tab.id
                                ? 'border-primary-600 text-primary-600 bg-primary-50/50 rounded-t-lg'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <tab.icon size={18} /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* TAB CONTENT */}

                {activeTab === 'overview' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <StatCard title="Visualizações do Perfil" value="1.203" change="+12%" icon={Eye} color="blue" />
                            <StatCard title="Contatos Recebidos" value="45" change="+5%" icon={MessageCircle} color="green" />
                            <StatCard title="Avaliação Média" value="4.9" sub="52 avaliações" icon={User} color="orange" />
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Dicas para seu perfil</h3>
                            <div className="flex items-start gap-4 p-4 bg-blue-50 text-blue-800 rounded-xl">
                                <AlertCircle className="shrink-0 mt-1" />
                                <div>
                                    <p className="font-bold">Adicione fotos de alta qualidade!</p>
                                    <p className="text-sm mt-1">Guias com pelo menos 3 fotos reais no portfólio recebem 40% mais contatos.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'portfolio' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
                        <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><ImageIcon size={20} /> Editar Portfólio</h2>
                            <button onClick={handleSaveProfile} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-primary-700 transition-colors">
                                <Save size={18} /> Salvar Alterações
                            </button>
                        </div>

                        <div className="p-6 md:p-8 space-y-8">
                            {/* Bio */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Sua História (Bio)</label>
                                <textarea
                                    className="w-full border-2 border-gray-200 rounded-xl p-4 min-h-[150px] focus:border-primary-500 focus:ring-0 transition-colors"
                                    placeholder="Conte sobre sua experiência, paixão por turismo e o que torna seus roteiros especiais..."
                                    value={bio}
                                    onChange={e => setBio(e.target.value)}
                                ></textarea>
                                <p className="text-xs text-gray-400 mt-2 text-right">Mínimo 100 caracteres para melhor relevância.</p>
                            </div>

                            {/* Tags Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Globe size={16} /> Idiomas</label>
                                    <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-xl min-h-[100px] border border-gray-200 border-dashed">
                                        {['Português', 'Inglês', 'Espanhol', 'LIBRAS', 'Francês'].map(lang => (
                                            <button
                                                key={lang}
                                                onClick={() => setLanguages(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang])}
                                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${languages.includes(lang) ? 'bg-blue-600 text-white shadow-md' : 'bg-white border text-gray-600 hover:border-blue-300'}`}
                                            >
                                                {lang}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-3 flex items-center gap-2">
                                        <input type="checkbox" id="libras" checked={languages.includes('LIBRAS')} onChange={(e) => {
                                            if (e.target.checked) setLanguages(p => [...p, 'LIBRAS']);
                                            else setLanguages(p => p.filter(l => l !== 'LIBRAS'));
                                        }} className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500" />
                                        <label htmlFor="libras" className="text-sm font-medium text-gray-700">Atendo em LIBRAS (Língua Brasileira de Sinais)</label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Award size={16} /> Especialidades</label>
                                    <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-xl min-h-[100px] border border-gray-200 border-dashed">
                                        {['Histórico', 'Ecológico', 'Aventura', 'Cultural', 'Gastronômico', 'Noturno'].map(spec => (
                                            <button
                                                key={spec}
                                                onClick={() => setSpecialties(prev => prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec])}
                                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${specialties.includes(spec) ? 'bg-orange-500 text-white shadow-md' : 'bg-white border text-gray-600 hover:border-orange-300'}`}
                                            >
                                                {spec}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Images */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Camera size={16} /> Fotos do Portfólio</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {portfolioImages.map((img, idx) => (
                                        <div key={idx} className="aspect-video bg-gray-100 rounded-xl relative border-2 border-dashed border-gray-300 flex items-center justify-center group overflow-hidden">
                                            {img ? (
                                                <>
                                                    <img src={img} className="w-full h-full object-cover" />
                                                    <button onClick={() => {
                                                        const newImgs = [...portfolioImages];
                                                        newImgs[idx] = '';
                                                        setPortfolioImages(newImgs);
                                                    }} className="absolute top-2 right-2 bg-red-500 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">X</button>
                                                </>
                                            ) : (
                                                <div className="text-center p-4">
                                                    <ImageIcon className="mx-auto text-gray-400 mb-2" />
                                                    <input
                                                        type="text"
                                                        placeholder="Cole URL da imagem"
                                                        className="text-xs w-full bg-white border rounded px-2 py-1"
                                                        onBlur={(e) => {
                                                            if (e.target.value) {
                                                                const newImgs = [...portfolioImages];
                                                                newImgs[idx] = e.target.value;
                                                                setPortfolioImages(newImgs);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400 mt-2">Use URLs de imagens públicas (Unsplash, Instagram CDN, etc) por enquanto.</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'opportunities' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Mural de Vagas</h2>
                            <button className="text-primary-600 font-bold text-sm hover:underline">Ver todas</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {MOCK_JOBS.map(job => (
                                <div key={job.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">{job.date}</div>
                                        <span className="font-extrabold text-green-600">{job.budget}</span>
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-900 mb-2">{job.title}</h3>
                                    <p className="text-sm text-gray-500 mb-4 flex items-center gap-1"><MapPin size={14} /> {job.location}</p>

                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                                        <span className="text-sm font-medium text-gray-700">{job.agency}</span>
                                    </div>

                                    <button onClick={() => showToast('Candidatura enviada!', 'success')} className="w-full py-2.5 rounded-xl border-2 border-primary-600 text-primary-600 font-bold hover:bg-primary-50 transition-colors">
                                        Candidatar-se
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const StatCard: React.FC<{ title: string; value: string; change?: string; sub?: string; icon: any; color: string }> = ({ title, value, change, sub, icon: Icon, color }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        orange: 'bg-orange-50 text-orange-600',
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                    {change && <span className="text-xs font-bold text-green-500 bg-green-50 px-1.5 py-0.5 rounded-md flex items-center"><TrendingUp size={10} className="mr-0.5" /> {change}</span>}
                </div>
                {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
            </div>
            <div className={`p-3 rounded-xl ${colors[color as keyof typeof colors]}`}>
                <Icon size={24} />
            </div>
        </div>
    );
};

export default GuideDashboard;
