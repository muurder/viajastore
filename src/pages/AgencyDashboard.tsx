import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
    X, Loader, Copy, ExternalLink, Star,
    BarChart2, DollarSign, Users, Calendar, Plane, MapPin,
    ShoppingBag, Settings, PauseCircle, PlayCircle,
    Bus, ListChecks, Tags, Check, Settings2, Car, Clock, User, AlertTriangle,
    LayoutGrid, List, ChevronRight, Truck, Grip, UserCheck, ImageIcon,
    FileText, Download, Rocket, LogOut, Globe, Trash2, CheckCircle, ChevronDown,
    MessageCircle, Info, Palette, Search, Zap, Camera, Upload, FileDown,
    Building, Armchair, MousePointer2, RefreshCw, Archive, ArchiveRestore,
    Trash, Ban, Send, ArrowRight, CornerDownRight, Menu, ChevronLeft, Phone,
    Briefcase, Edit3, CreditCard as CreditCardIcon, QrCode, CheckCircle2,
    Plus, Edit, Save, ArrowLeft, MoreHorizontal, PenTool, Eye, Binoculars
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { usePlanPermissions } from '../hooks/usePlanPermissions';
import {
    Trip, Agency, Plan, OperationalData, Booking, AgencyTheme, DashboardStats
} from '../types';
import { PLANS } from '../services/mockData';
import { logger } from '../utils/logger';
import { slugify } from '../utils/slugify';

import SubscriptionModal from '../components/SubscriptionModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import CreateTripWizard from '../components/agency/CreateTripWizard';
import { AgencyThemeManager } from '../components/admin/AgencyThemeManager';
import DashboardMobileTabs from '../components/mobile/DashboardMobileTabs';

// Modular Imports
import { UpgradeModal } from './agency/dashboard/components/UpgradeModal';
import SubscriptionConfirmationModal from './agency/dashboard/components/SubscriptionConfirmationModal';
import { DEFAULT_OPERATIONAL_DATA } from './agency/dashboard/constants';
import { Badge, ActionMenu } from './agency/dashboard/components/DashboardHelpers';
import { RecentBookingsTable, BookingDetailsView } from './agency/dashboard/AgencyBookings';
import { OperationsModule } from './agency/dashboard/components/OperationsModule';
import { AgencyReviews } from './agency/dashboard/components/AgencyReviews';
import OverviewTab from './agency/dashboard/tabs/OverviewTab';
import { TransportManager } from './agency/dashboard/AgencyTransport';
import { RoomingManager } from './agency/dashboard/AgencyRooming';
import { useAgencyData } from '../hooks/useAgencyData';

const AgencyDashboard: React.FC = () => {
    const {
        refreshData, loading: dataLoading,
        createTrip, updateTrip, deleteTrip, updateAgencyReview,
        clients, updateTripOperationalData, saveAgencyTheme,
        getAgencyTheme
    } = useData();
    const { currentAgency, myTrips, myBookings, agencyReviews } = useAgencyData();
    const { user, login, logout, updateUser, uploadImage } = useAuth();
    const { activeTheme, setTheme, setAgencyTheme } = useTheme();
    const { showToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    // Derived State
    const activeTab = searchParams.get('tab') || 'OVERVIEW';
    const isGuide = currentAgency?.isGuide === true || (currentAgency?.role as any) === 'GUIDE';
    const entityName = isGuide ? 'Guia' : 'Agência';
    const entityNameLower = isGuide ? 'guia' : 'agência';
    const tripLabel = isGuide ? 'Experiência' : 'Pacote';
    const tripLabelLower = isGuide ? 'experiência' : 'pacote';

    const planPermissions = usePlanPermissions();

    // Local State
    const [showCreateTrip, setShowCreateTrip] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [tripViewMode, setTripViewMode] = useState<'GRID' | 'TABLE'>('GRID');
    const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedOperationalTripId, setSelectedOperationalTripId] = useState<string | null>(null);

    // Subscription & Payment State
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [showPaymentManagementDialog, setShowPaymentManagementDialog] = useState(false);
    const [showConfirmSubscription, setShowConfirmSubscription] = useState<Plan | null>(null);
    const [isSubmittingSubscription, setIsSubmittingSubscription] = useState(false);

    // Deletion State
    const [tripToDelete, setTripToDelete] = useState<string | null>(null);
    const [isDeletingTrip, setIsDeletingTrip] = useState(false);

    // Theme & Profile State
    const [profileForm, setProfileForm] = useState<Partial<Agency>>({});
    const [heroForm, setHeroForm] = useState<Partial<Agency>>({});
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    // Duplication State
    const [isDuplicatingTrip, setIsDuplicatingTrip] = useState<string | null>(null);

    // Initial Data Load
    useEffect(() => {
        if (currentAgency) {
            setProfileForm({
                name: currentAgency.name,
                whatsapp: currentAgency.whatsapp,
                phone: currentAgency.phone,
                website: currentAgency.website,
                description: currentAgency.description,
                logo: currentAgency.logo || '',
                slug: currentAgency.slug || slugify(currentAgency.name)
            });
            setHeroForm({
                heroMode: currentAgency.heroMode || 'TRIPS',
                heroBannerUrl: currentAgency.heroBannerUrl,
                heroTitle: currentAgency.heroTitle,
                heroSubtitle: currentAgency.heroSubtitle
            });
            refreshData();
        }
    }, [currentAgency?.id]); // Only re-run if ID changes to avoid loops

    // Handlers
    const handleTabChange = (tab: string) => {
        setSearchParams({ tab });
        if (tab === 'OPERATIONS') {
            // Auto-select first active trip if none selected
            if (!selectedOperationalTripId) {
                const firstActive = myTrips.find(t => t.is_active);
                if (firstActive) setSelectedOperationalTripId(firstActive.id);
            }
        }
    };

    const handleCreateTrip = async (tripData: any) => {
        if (!planPermissions.canPostTrip) {
            setShowUpgradeModal(true);
            return;
        }

        try {
            setLoading(true);
            // Ensure unique slug
            const { generateSlugFromName, generateUniqueSlug } = await import('../utils/slugUtils');
            const baseSlug = generateSlugFromName(tripData.title);
            const uniqueSlug = await generateUniqueSlug(baseSlug, 'trips');

            const newTrip = await createTrip({
                ...tripData,
                slug: uniqueSlug,
                agencyId: currentAgency!.agencyId,
                status: 'DRAFT',
                sales: 0,
                views: 0,
                operationalData: DEFAULT_OPERATIONAL_DATA
            });

            setShowCreateTrip(false);
            showToast(`${tripLabel} criado com sucesso!`, 'success');
            refreshData(); // Refresh list
        } catch (err: any) {
            logger.error('Error creating trip:', err);
            showToast(`Erro ao criar ${tripLabelLower}: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEditTrip = (trip: Trip) => {
        setEditingTrip(trip);
        setShowCreateTrip(true);
    };

    const handleDuplicateTrip = async (trip: Trip) => {
        if (!planPermissions.canPostTrip) {
            setShowUpgradeModal(true);
            return;
        }

        setIsDuplicatingTrip(trip.id);
        try {
            const { generateSlugFromName, generateUniqueSlug } = await import('../utils/slugUtils');
            const newTitle = `${trip.title} (Cópia)`;
            const baseSlug = generateSlugFromName(newTitle);
            const uniqueSlug = await generateUniqueSlug(baseSlug, 'trips');

            // Omit ID and created_at/updated_at
            const { id, created_at, updated_at, ...tripData } = trip;

            const newTrip = {
                ...tripData,
                title: newTitle,
                slug: uniqueSlug,
                is_active: false,
                sales: 0,
                views: 0,
                tripRating: 0,
                tripTotalReviews: 0,
                operationalData: DEFAULT_OPERATIONAL_DATA // Reset op data for copy
            };

            await createTrip({ ...newTrip, agencyId: currentAgency!.agencyId } as Trip);
            showToast(`${tripLabel} duplicado com sucesso!`, 'success');
            refreshData();
        } catch (error: any) {
            logger.error('Error duplicating trip:', error);
            showToast(`Erro ao duplicar ${tripLabelLower}: ${error.message || 'Erro desconhecido'}`, 'error');
        } finally {
            setIsDuplicatingTrip(null);
        }
    };

    const handleDeleteTrip = (id: string) => {
        setTripToDelete(id);
    };

    const confirmDeleteTrip = async () => {
        if (!tripToDelete) return;
        setIsDeletingTrip(true);
        try {
            await deleteTrip(tripToDelete);
            setTripToDelete(null);
            showToast(`${tripLabel} excluído com sucesso.`, 'success');
        } catch (error: any) {
            logger.error('Error deleting trip:', error);
            showToast(`Erro ao excluir ${tripLabelLower}: ${error.message || 'Erro desconhecido'}`, 'error');
        } finally {
            setIsDeletingTrip(false);
        }
    };

    const toggleTripStatus = async (tripId: string) => {
        const trip = myTrips.find(t => t.id === tripId);
        if (!trip) return;

        try {
            await updateTrip(tripId, { is_active: !trip.is_active });
            showToast(`${tripLabel} ${!trip.is_active ? 'publicado' : 'pausado'} com sucesso.`, 'success');
        } catch (error: any) {
            showToast(`Erro ao alterar status: ${error.message}`, 'error');
        }
    };

    const handleGoToOperational = (tripId: string) => {
        setSearchParams({ tab: 'OPERATIONS', tripId });
        setSelectedOperationalTripId(tripId);
    };

    // Subscription Handlers
    const handleConfirmSubscription = async () => {
        if (!showConfirmSubscription || !currentAgency) return;
        setIsSubmittingSubscription(true);
        try {
            await updateUser({ subscriptionPlan: showConfirmSubscription.id });
            await refreshData();
            showToast(`Plano ${showConfirmSubscription.name} assinado com sucesso!`, 'success');
            setShowConfirmSubscription(null);

            // Redirect to WhatsApp for proof if needed (optional logic could go here)
            const message = encodeURIComponent(`Olá, acabei de assinar o plano ${showConfirmSubscription.name} para a agência ${currentAgency.name}. Gostaria de confirmar.`);
            window.open(`https://wa.me/5511987697684?text=${message}`, '_blank');
        } catch (error: any) {
            showToast('Erro ao assinar plano: ' + error.message, 'error');
        } finally {
            setIsSubmittingSubscription(false);
        }
    };

    // Profile & Theme Handlers
    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateUser(profileForm);
            await updateUser({
                heroMode: heroForm.heroMode,
                heroBannerUrl: heroForm.heroBannerUrl,
                heroTitle: heroForm.heroTitle,
                heroSubtitle: heroForm.heroSubtitle
            });
            showToast('Perfil atualizado!', 'success');
            refreshData();
        } catch (err: any) {
            showToast('Erro ao atualizar perfil: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleLogoUploadInstant = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0] || !currentAgency) return;
        const file = e.target.files[0];
        setLoading(true);
        try {
            const url = await uploadImage(file, 'agency-logos');
            if (url) {
                setProfileForm(prev => ({ ...prev, logo: url }));
                const result = await updateUser({ logo: url });
                if (result.success) {
                    await refreshData();
                    showToast('Logo atualizada com sucesso!', 'success');
                } else {
                    throw new Error(result.error || 'Erro ao atualizar logo');
                }
            }
        } catch (error: any) {
            showToast('Erro ao fazer upload do logo: ' + (error.message || 'Erro desconhecido'), 'error');
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    const handleSaveTheme = async (theme: Partial<AgencyTheme>) => {
        setLoading(true);
        try {
            const success = await saveAgencyTheme(currentAgency!.agencyId, theme);
            if (success) {
                setAgencyTheme(theme.colors || { primary: '#3b82f6', secondary: '#f97316', background: '#f9fafb', text: '#111827' });
                // const updatedTheme = await getAgencyTheme(currentAgency!.agencyId);
                // No need to call setTheme as setAgencyTheme handles the override
                showToast('Tema salvo com sucesso!', 'success');
            } else {
                throw new Error('Falha ao salvar tema');
            }
        } catch (err: any) {
            showToast('Erro ao salvar tema: ' + err.message, 'error');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const handleLogoUploadWrapper = async (file: File): Promise<string> => {
        // Reuse logic for ThemeManager
        const url = await uploadImage(file, 'agency-logos');
        if (url) {
            await updateUser({ logo: url });
            await refreshData();
            return url;
        }
        throw new Error('Upload falhou');
    };

    const handleLogout = async () => { await logout(); navigate('/'); };

    // Stats Calculation
    // Stats Calculation


    const stats: DashboardStats = useMemo(() => {
        if (!myTrips || !myBookings) return { activeTrips: 0, totalSales: 0, totalViews: 0, conversionRate: 0, totalRevenue: 0 };
        const activeTrips = myTrips.filter(t => t.is_active).length;
        const totalSales = myBookings.reduce((sum, b) => sum + b.totalPrice, 0); // Use bookings for sales
        const totalViews = myTrips.reduce((acc, t) => acc + (t.views || 0), 0);
        const conversionRate = totalViews > 0 ? (myBookings.length / totalViews) * 100 : 0;
        return { activeTrips, totalSales, totalViews, conversionRate, totalRevenue: totalSales };
    }, [myTrips, myBookings]);

    const filteredTrips = useMemo(() => {
        return myTrips.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [myTrips, searchTerm]);

    // Render Helpers
    const renderPlanTab = () => {
        const today = new Date();
        const expiryDate = new Date(currentAgency?.subscriptionExpiresAt || '');
        const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const totalCycleDays = 30;
        const progressPercent = Math.max(0, Math.min(100, (daysLeft / totalCycleDays) * 100));
        const currentPlanId = currentAgency?.subscriptionPlan || 'STARTER';
        const currentPlanObj = PLANS.find(p => p.id === currentPlanId) || PLANS[0];
        const isStarter = currentPlanId === 'STARTER';
        const planColor = currentPlanId === 'PREMIUM' ? 'bg-purple-600' : currentPlanId === 'BASIC' ? 'bg-blue-600' : 'bg-gray-600';

        return (
            <div className="space-y-8 animate-[fadeIn_0.3s]">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className={`h-2 ${planColor}`}></div>
                    <div className="p-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-1">Meu Plano: <span className={isStarter ? 'text-gray-600' : 'text-primary-600'}>{currentPlanObj.name}</span></h2>
                                <p className="text-gray-500 text-sm">Gerencie sua assinatura.</p>
                            </div>
                            <div className="flex gap-3">
                                {!isStarter && (
                                    <>
                                        <button onClick={() => setShowPaymentManagementDialog(true)} className="bg-white border border-gray-200 text-gray-700 font-bold py-2.5 px-5 rounded-xl hover:bg-gray-50 text-sm">Gerenciar Pagamento</button>
                                        <button onClick={() => setShowConfirmSubscription(currentPlanObj)} className={`text-white font-bold py-2.5 px-5 rounded-xl text-sm ${planColor} hover:opacity-90`}>Renovar Agora</button>
                                    </>
                                )}
                                {isStarter && <div className="bg-gray-100 text-gray-600 font-bold py-2.5 px-5 rounded-xl text-sm border border-gray-200">Plano Gratuito</div>}
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 mb-8">
                            <div className="flex justify-between items-center mb-2 text-sm font-bold text-gray-700">
                                <span>Dias Restantes</span>
                                <span className={daysLeft < 7 ? 'text-red-500' : 'text-green-600'}>{daysLeft > 0 ? `${daysLeft} dias` : 'Expirado'}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                                <div className={`h-2.5 rounded-full transition-all duration-1000 ${daysLeft < 7 ? 'bg-red-500' : daysLeft < 15 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${progressPercent}%` }}></div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg border border-gray-200 text-gray-400"><Calendar size={16} /></div>
                                    <div><p className="text-gray-500 text-xs uppercase font-bold">Cobrança</p><p className="font-bold text-gray-900">{isValidDate(expiryDate) ? expiryDate.toLocaleDateString() : 'N/A'}</p></div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg border border-gray-200 text-gray-400"><DollarSign size={16} /></div>
                                    <div><p className="text-gray-500 text-xs uppercase font-bold">Valor</p><p className="font-bold text-gray-900">{isStarter ? 'Grátis' : `R$ ${currentPlanObj.price.toFixed(2)}/mês`}</p></div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg border border-gray-200 text-gray-400"><Zap size={16} /></div>
                                    <div><p className="text-gray-500 text-xs uppercase font-bold">Status</p><p className="font-bold text-green-600">Ativo</p></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                    {PLANS.map((plan) => {
                        const isCurrent = currentAgency?.subscriptionPlan === plan.id;
                        const isPremium = plan.id === 'PREMIUM';
                        const isStarterPlan = plan.id === 'STARTER';
                        return (
                            <div key={plan.id} className={`rounded-2xl shadow-lg border p-8 relative ${isCurrent ? 'ring-2 ring-primary-500 bg-gray-50' : 'bg-white'} ${isPremium ? 'border-purple-200' : 'border-gray-200'}`}>
                                {isPremium && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-4 py-1 rounded-full">RECOMENDADO</div>}
                                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                                <div className="text-3xl font-extrabold mb-6">{isStarterPlan ? 'Grátis' : `R$ ${plan.price}`}<span className="text-sm font-normal text-gray-500">/mês</span></div>
                                <ul className="space-y-3 mb-8">
                                    {plan.features.map((f, i) => (
                                        <li key={i} className="flex items-start text-sm text-gray-700">
                                            <Check size={16} className={`mr-2 flex-shrink-0 mt-0.5 ${isPremium ? 'text-purple-500' : 'text-green-500'}`} /> {f}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={() => isCurrent ? null : setShowConfirmSubscription(plan)}
                                    disabled={isCurrent}
                                    className={`w-full py-3 rounded-xl font-bold ${isCurrent ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
                                >
                                    {isCurrent ? 'Plano Atual' : 'Assinar Agora'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());
    const formatDate = (dStr: string | undefined) => {
        if (!dStr) return '-';
        const d = new Date(dStr);
        return isValidDate(d) ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
    };

    if (dataLoading || !currentAgency) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader size={48} className="animate-spin text-primary-600 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">Carregando painel...</p>
                </div>
            </div>
        );
    }

    if (showCreateTrip) {
        return (
            <div className="fixed inset-0 bg-white z-[9999] overflow-y-auto">
                <CreateTripWizard
                    onClose={() => { setShowCreateTrip(false); setEditingTrip(null); }}
                    onSuccess={() => {
                        setShowCreateTrip(false);
                        setEditingTrip(null);
                        refreshData();
                    }}
                    initialTripData={editingTrip || undefined}
                />
            </div>
        );
    }

    const tabs = [
        { id: 'OVERVIEW', label: 'Visão Geral', icon: BarChart2 },
        { id: 'TRIPS', label: `${isGuide ? 'Experiências' : 'Pacotes'}`, icon: Plane },
        { id: 'BOOKINGS', label: 'Reservas', icon: ListChecks },
        ...(planPermissions.canAccessOperational ? [{ id: 'OPERATIONS', label: 'Operacional', icon: Bus }] : []),
        { id: 'REVIEWS', label: 'Avaliações', icon: Star },
        { id: 'PROFILE', label: 'Perfil', icon: User },
    ];

    return (
        <>
            {/* Upgrade & Subscription Modals */}
            <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} currentPlan={currentAgency.subscriptionPlan as 'STARTER' | 'BASIC' | 'PREMIUM'} maxTrips={PLANS.find(p => p.id === currentAgency.subscriptionPlan)?.maxTrips || 5} currentActiveTrips={stats.activeTrips || 0} onUpgrade={() => { setShowUpgradeModal(false); setSearchParams({ tab: 'PLAN' }); }} />
            {showConfirmSubscription && (
                <SubscriptionConfirmationModal
                    plan={showConfirmSubscription}
                    onClose={() => setShowConfirmSubscription(null)}
                    onConfirm={handleConfirmSubscription}
                    isSubmitting={isSubmittingSubscription}
                    agencyName={currentAgency.name}
                />
            )}

            {/* Delete Confirmation */}
            <ConfirmDialog isOpen={!!tripToDelete} onClose={() => setTripToDelete(null)} onConfirm={confirmDeleteTrip} title={`Excluir ${tripLabel}`} message={`Tem certeza que deseja excluir? Esta ação é irreversível.`} variant="danger" confirmText={isDeletingTrip ? "Excluindo..." : "Excluir"} isConfirming={isDeletingTrip} />

            {/* Payment Mgmt Dialog (Simple Alert for Now) */}
            <ConfirmDialog isOpen={showPaymentManagementDialog} onClose={() => setShowPaymentManagementDialog(false)} onConfirm={() => window.open('https://wa.me/5511987697684?text=Quero%20gerenciar%20meu%20plano', '_blank')} title="Gerenciar Assinatura" message="Para alterar dados de pagamento ou cancelar, entre em contato com nosso suporte financeiro." confirmText="Falar com Suporte" variant="info" />


            <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
                {/* Dashboard Tabs for Mobile - Only show if not in Layout? 
                        Actually, AgencyLayout handles the frame. AgencyDashboard now just renders content.
                        But on mobile, we might want the tabs within the content area if the layout doesn't provide them. 
                        For now, let's keep them here as they control the TABS within this specific page.
                    */}
                <DashboardMobileTabs activeTab={activeTab} onTabChange={handleTabChange} tabs={tabs} />

                <div className="max-w-7xl mx-auto space-y-6">

                    {/* OVERVIEW TAB */}
                    {activeTab === 'OVERVIEW' && (
                        <OverviewTab
                            stats={stats}
                            myTrips={myTrips}
                            myBookings={myBookings}
                            clients={clients}
                            onTabChange={handleTabChange}
                            currentAgency={currentAgency}
                            onCreateTrip={() => setShowCreateTrip(true)}
                        />
                    )}

                    {/* TRIPS TAB */}
                    {activeTab === 'TRIPS' && (
                        <div className="space-y-6 animate-[fadeIn_0.3s]">
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm sticky top-0 z-10">
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input type="text" placeholder="Buscar viagens..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <div className="flex bg-gray-100 p-1 rounded-lg">
                                        <button onClick={() => setTripViewMode('GRID')} className={`p-1.5 rounded-md transition-all ${tripViewMode === 'GRID' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}><LayoutGrid size={18} /></button>
                                        <button onClick={() => setTripViewMode('TABLE')} className={`p-1.5 rounded-md transition-all ${tripViewMode === 'TABLE' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}><List size={18} /></button>
                                    </div>
                                    <button onClick={() => setShowCreateTrip(true)} className="flex-1 sm:flex-none bg-primary-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary-700 flex items-center justify-center gap-2"><Plus size={18} /> Nova Viagem</button>
                                </div>
                            </div>

                            {filteredTrips.length === 0 ? (
                                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                                    <Rocket size={48} className="mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-500 font-medium">Nenhuma viagem encontrada.</p>
                                    <button onClick={() => setShowCreateTrip(true)} className="mt-4 text-primary-600 font-bold hover:underline">Criar minha primeira viagem</button>
                                </div>
                            ) : tripViewMode === 'GRID' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredTrips.map(trip => (
                                        <div key={trip.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group flex flex-col h-full">
                                            <div className="relative h-48 bg-gray-100">
                                                {trip.images?.[0] ? <img src={trip.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={trip.title} /> : <div className="flex items-center justify-center h-full text-gray-400"><ImageIcon size={32} /></div>}
                                                <div className="absolute top-3 right-3 flex flex-col gap-2">
                                                    <Badge color={trip.is_active ? 'green' : 'gray'}>{trip.is_active ? 'ATIVO' : 'RASCUNHO'}</Badge>
                                                </div>
                                            </div>
                                            <div className="p-4 flex-1 flex flex-col">
                                                <h3 className="font-bold text-gray-900 mb-2 line-clamp-1" title={trip.title}>{trip.title}</h3>
                                                <div className="text-sm text-gray-500 mb-4 flex items-center gap-2"><MapPin size={14} className="text-primary-500" /><span className="truncate">{trip.destination}</span></div>

                                                <div className="grid grid-cols-2 gap-2 mb-4">
                                                    <div className="bg-gray-50 p-2 rounded-lg"><p className="text-[10px] text-gray-500 uppercase">Partida</p><p className="text-xs font-bold">{formatDate(trip.startDate)}</p></div>
                                                    <div className="text-right bg-gray-50 p-2 rounded-lg"><p className="text-[10px] text-gray-500 uppercase">Preço</p><p className="text-sm font-extrabold text-primary-600">R$ {trip.price.toLocaleString('pt-BR')}</p></div>
                                                </div>

                                                <div className="mt-auto border-t border-gray-100 pt-3 flex gap-2">
                                                    <button onClick={() => window.open(`/#/${currentAgency.slug}/viagem/${trip.slug || trip.id}`, '_blank')} className="flex-1 py-2 bg-green-50 text-green-700 text-xs font-bold rounded-lg hover:bg-green-100 flex items-center justify-center gap-1"><ExternalLink size={14} /> Ver</button>
                                                    <button onClick={() => handleEditTrip(trip)} className="flex-1 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 flex items-center justify-center gap-1"><Edit size={14} /> Editar</button>
                                                    <ActionMenu actions={[
                                                        { label: 'Duplicar', icon: Copy, onClick: () => handleDuplicateTrip(trip) },
                                                        { label: trip.is_active ? 'Pausar' : 'Publicar', icon: trip.is_active ? PauseCircle : PlayCircle, onClick: () => toggleTripStatus(trip.id) },
                                                        { label: 'Excluir', icon: Trash2, onClick: () => handleDeleteTrip(trip.id), variant: 'danger' },
                                                        ...(planPermissions.canAccessOperational ? [{ label: 'Operacional', icon: Bus, onClick: () => handleGoToOperational(trip.id) }] : [])
                                                    ]} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    {/* Desktop Table */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-100">
                                            <thead className="bg-gray-50"><tr><th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Pacote</th><th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th><th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Ações</th></tr></thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {filteredTrips.map(trip => (
                                                    <tr key={trip.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4"><div className="font-bold text-gray-900 text-sm">{trip.title}</div><div className="text-xs text-gray-500">{trip.destination} • {formatDate(trip.startDate)}</div></td>
                                                        <td className="px-6 py-4"><Badge color={trip.is_active ? 'green' : 'gray'}>{trip.is_active ? 'ATIVO' : 'RASCUNHO'}</Badge></td>
                                                        <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => handleEditTrip(trip)} className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"><Edit size={16} /></button><button onClick={() => handleDeleteTrip(trip.id)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"><Trash2 size={16} /></button></div></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Stacked Cards */}
                                    <div className="md:hidden divide-y divide-gray-100">
                                        {filteredTrips.map(trip => (
                                            <div key={trip.id} className="p-4 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 text-sm line-clamp-2">{trip.title}</h4>
                                                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                                            <MapPin size={12} /> {trip.destination}
                                                        </div>
                                                    </div>
                                                    <Badge color={trip.is_active ? 'green' : 'gray'}>{trip.is_active ? 'ATIVO' : 'RASCUNHO'}</Badge>
                                                </div>

                                                <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                                                    <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(trip.startDate)}</span>
                                                    <span className="font-bold">R$ {trip.price.toLocaleString('pt-BR')}</span>
                                                </div>

                                                <div className="flex gap-2 pt-1">
                                                    <button
                                                        onClick={() => handleEditTrip(trip)}
                                                        className="flex-1 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 flex items-center justify-center gap-1"
                                                    >
                                                        <Edit size={14} /> Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTrip(trip.id)}
                                                        className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* OTHER TABS */}
                    {activeTab === 'BOOKINGS' && <BookingDetailsView bookings={myBookings} clients={clients} />}

                    {activeTab === 'OPERATIONS' && (
                        <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                            <OperationsModule
                                myTrips={myTrips}
                                myBookings={myBookings}
                                clients={clients}
                                selectedTripId={selectedOperationalTripId}
                                onSelectTrip={setSelectedOperationalTripId}
                                onSaveTripData={updateTripOperationalData}
                                currentAgency={currentAgency}
                                isGuide={isGuide}
                            />
                        </div>
                    )}

                    {activeTab === 'REVIEWS' && <AgencyReviews reviews={agencyReviews} currentAgency={currentAgency} />}

                    {activeTab === 'PLAN' && renderPlanTab()}

                    {activeTab === 'PROFILE' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Meu Perfil</h2>
                            <form onSubmit={handleSaveProfile} className="space-y-6">
                                <div className="flex items-center gap-6 mb-6">
                                    <div className="relative w-24 h-24">
                                        <img src={profileForm.logo || 'https://placehold.co/100x100?text=LOGO'} className="w-full h-full rounded-2xl object-cover border-2 border-dashed border-gray-300" />
                                        <label className="absolute -bottom-2 -right-2 bg-primary-600 text-white p-2 rounded-full cursor-pointer hover:bg-primary-700 shadow-sm"><Upload size={14} /><input type="file" className="hidden" accept="image/*" onChange={handleLogoUploadInstant} /></label>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg">{currentAgency.name}</h3>
                                        <p className="text-sm text-gray-500">Faça upload de uma logo quadrada para melhor visualização.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div><label className="block text-sm font-bold text-gray-700 mb-1">Nome</label><input value={profileForm.name || ''} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} className="w-full p-2.5 border rounded-lg" /></div>
                                    <div><label className="block text-sm font-bold text-gray-700 mb-1">WhatsApp</label><input value={profileForm.whatsapp || ''} onChange={e => setProfileForm({ ...profileForm, whatsapp: e.target.value })} className="w-full p-2.5 border rounded-lg" /></div>
                                    <div className="md:col-span-2"><label className="block text-sm font-bold text-gray-700 mb-1">Slug (Link)</label><div className="flex"><span className="bg-gray-100 px-3 py-2 border border-r-0 rounded-l-lg text-gray-500 text-sm flex items-center">viajastore.com/</span><input value={profileForm.slug || ''} onChange={e => setProfileForm({ ...profileForm, slug: slugify(e.target.value) })} className="flex-1 p-2.5 border rounded-r-lg" /></div></div>
                                </div>
                                <div className="pt-4 border-t"><button type="submit" disabled={loading} className="bg-primary-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-700 flex items-center gap-2">{loading ? <Loader size={18} className="animate-spin" /> : <Save size={18} />} Salvar Alterações</button></div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'THEME' && currentAgency && (
                        <AgencyThemeManager
                            agencyId={currentAgency.agencyId}
                            currentTheme={{
                                agencyId: currentAgency.agencyId,
                                colors: activeTheme.colors,
                            } as AgencyTheme}
                            onSave={handleSaveTheme}
                            onLogoUpload={(f) => handleLogoUploadWrapper(f).then(u => u)}
                            currentLogoUrl={currentAgency.logo}
                        />
                    )}

                </div>
            </div>

        </>
    );
};

export { AgencyDashboard };