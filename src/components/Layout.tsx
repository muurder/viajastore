

import React, { useEffect, useState, useMemo } from 'react';
import { Link, Outlet, useNavigate, useLocation, useSearchParams, useMatch } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { LogOut, Instagram, Facebook, Twitter, User, ShieldCheck, Home as HomeIcon, Map, ShoppingBag, Globe, ChevronRight, LogIn, UserPlus, LayoutDashboard, Palette, Compass, Zap, Building, Shield, Briefcase, BarChart2, Plane, Heart, Menu, X } from 'lucide-react';
import { Logo } from './ui/Logo';
import AuthModal from './AuthModal';
import BottomNav from './BottomNav';
import { Agency } from '../types';


const Layout: React.FC = () => {
  const { user, logout, login, reloadUser, exitImpersonate, isImpersonating } = useAuth();
  const { getAgencyBySlug, getAgencyTheme, loading: dataLoading, platformSettings } = useData();
  const { setAgencyTheme, resetAgencyTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close menu logic
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto'
    });
  }, [location.pathname]);

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const potentialSlug = pathSegments[0];

  const reservedRoutes = [
    'trips', 'viagem', 'agencies', 'agency', 'about', 'contact', 'terms',
    'privacy', 'help', 'blog', 'careers', 'press', 'checkout', 'unauthorized',
    'forgot-password', 'login', 'signup', 'admin', 'client',
    'guides', 'guias' // FIX: Added to prevent routes from being interpreted as agency slugs
  ];

  const isReserved = reservedRoutes.includes(potentialSlug);
  let isAgencyMode = !isReserved && !!potentialSlug;

  // Auth Modal Logic
  const showAuthModal = location.hash === '#login' || location.hash === '#signup';
  const initialView = location.hash.substring(1) as 'login' | 'signup';
  const handleCloseModal = () => navigate(location.pathname, { replace: true });

  const matchMicrositeClient = useMatch('/:agencySlug/client/:tab?');
  const isMicrositeClientArea = !!matchMicrositeClient;

  // Robust check for Agency Dashboard
  const isAgencyUser = user?.role === 'AGENCY';
  const isAgencyDashboardRoute = location.pathname.includes('/agency/dashboard');
  const isAgencyDashboard = isAgencyDashboardRoute && isAgencyUser;
  const isGuide = (user as Agency)?.isGuide === true;

  // Check if currently in any dashboard
  const isInDashboard = location.pathname.includes('/dashboard');

  if (isMicrositeClientArea) {
    isAgencyMode = true; // Force agency mode for client dashboard context
  }

  const activeSlug = matchMicrositeClient?.params.agencySlug || (isAgencyMode ? potentialSlug : null);

  // Resolve the agency to display in the header
  let currentAgency: Agency | undefined = undefined;

  if (isAgencyDashboard && user) {
    currentAgency = user as Agency;
  } else if (activeSlug) {
    currentAgency = getAgencyBySlug(activeSlug);
  }

  // FIX: Refined logic - only show agency header if:
  // 1. We have an activeSlug (not a reserved route)
  // 2. AND we're either in agency mode OR agency dashboard
  // 3. AND we're not in a reserved route (double check)
  const showAgencyHeader = !!activeSlug &&
    (isAgencyMode || isAgencyDashboard) &&
    !isReserved &&
    !location.pathname.startsWith('/client') &&
    !location.pathname.startsWith('/admin') &&
    !location.pathname.startsWith('/login') &&
    !location.pathname.startsWith('/signup');

  // --- THEME APPLICATION LOGIC ---
  useEffect(() => {
    const applyTheme = async () => {
      if (currentAgency && currentAgency.agencyId) { // Check agencyId exists before fetching theme
        const theme = await getAgencyTheme(currentAgency.agencyId);
        if (theme) {
          setAgencyTheme(theme.colors);
        } else {
          resetAgencyTheme();
        }
      } else {
        resetAgencyTheme();
      }
    };
    applyTheme();
  }, [currentAgency?.agencyId, getAgencyTheme, setAgencyTheme, resetAgencyTheme]);

  // --- PAGE TITLE MANAGEMENT ---
  useEffect(() => {
    if (!location.pathname.includes('/viagem/')) {
      if ((isAgencyMode || isAgencyDashboard) && currentAgency) {
        const platformName = (platformSettings?.platform_name && platformSettings.platform_name !== 'ViajaStore') 
          ? platformSettings.platform_name 
          : 'SouNativo';
        document.title = `${currentAgency.name} | ${platformName}`;
      } else {
        const platformName = (platformSettings?.platform_name && platformSettings.platform_name !== 'ViajaStore') 
          ? platformSettings.platform_name 
          : 'SouNativo';
        document.title = `${platformName} | O maior marketplace de viagens`;
      }
    }
  }, [location.pathname, isAgencyMode, isAgencyDashboard, currentAgency, platformSettings]);

  const handleLogout = async () => {
    await logout();
    if (isAgencyMode && activeSlug) {
      navigate(`/${activeSlug}`);
    } else {
      navigate('/');
    }
  };

  const getLinkClasses = (path: string) => {
    const isActive = location.pathname === path;
    return `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200 ${isActive ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
      }`;
  };

  // FIX: Only use agency slug if agency is actually loaded
  // This prevents navigation to non-existent agency pages
  const homeLink = (isAgencyMode || isAgencyDashboard) && currentAgency?.slug && currentAgency?.agencyId ? `/${currentAgency.slug}` : '/';

  // Logic for the "User Pill" link in header
  const getUserProfileLink = () => {
    if (!user) return '#';
    if (user.role === 'AGENCY') return '/agency/dashboard?tab=PROFILE';
    if (user.role === 'ADMIN') return '/admin/dashboard';
    // Client
    if (isAgencyMode && activeSlug) return `/${activeSlug}/client/PROFILE`;
    return '/client/dashboard/PROFILE';
  };

  const userProfileLink = getUserProfileLink();

  // Get theme link for dropdown
  const getThemeLink = () => {
    if (!user) return '#';
    if (user.role === 'AGENCY') return '/agency/dashboard?tab=THEME';
    return '#';
  };

  const themeLink = getThemeLink();

  // Quick Account Switch (Admin Only)
  interface QuickAccount {
    name: string;
    email: string;
    password: string;
    role: string;
    icon: any;
    requiresPassword?: boolean;
  }

  const TEST_ACCOUNTS: QuickAccount[] = [
    { name: 'Admin Teste', email: 'admin@teste.com', password: 'admin123', role: 'ADMIN', icon: ShieldCheck },
    { name: 'Cliente Teste', email: 'cliente@teste.com', password: 'cliente123', role: 'CLIENT', icon: User },
    { name: 'Agência Teste', email: 'agencia@teste.com', password: 'agencia123', role: 'AGENCY', icon: Building },
    { name: 'Guia Turístico Teste', email: 'guia@teste.com', password: 'guia123', role: 'AGENCY', icon: Compass },
    { name: 'Admin Real', email: 'juannicolas1@gmail.com', password: '', role: 'ADMIN', icon: ShieldCheck, requiresPassword: true },
    { name: 'Juan Nicolas Agência', email: 'juan.agencia@viajastore.com', password: 'agencia123', role: 'AGENCY', icon: Building },
    { name: 'Juan Nicolas Guia', email: 'juan.guia@viajastore.com', password: 'guia123', role: 'AGENCY', icon: Compass },
  ];

  const handleQuickLogin = async (email: string, password: string, requiresPassword?: boolean) => {
    let finalPassword = password;

    if (requiresPassword && !password) {
      // Prompt for password
      const userPassword = prompt(`Digite a senha para ${email}:`);
      if (!userPassword) {
        return;
      }
      finalPassword = userPassword;
    }

    // Show loading toast
    showToast('Fazendo login...', 'info');

    try {
      const result = await login(email, finalPassword);
      if (result.success) {
        showToast('Login realizado com sucesso!', 'success');

        // Calculate dashboard route based on the account we're logging into (not current user state)
        let dashboardRoute = '/';
        const accountToLogin = TEST_ACCOUNTS.find(acc => acc.email === email);
        if (accountToLogin) {
          if (accountToLogin.role === 'ADMIN') {
            dashboardRoute = '/admin/dashboard';
          } else if (accountToLogin.role === 'AGENCY') {
            dashboardRoute = '/agency/dashboard';
          } else if (accountToLogin.role === 'CLIENT') {
            dashboardRoute = '/client/dashboard/BOOKINGS';
          }
        }

        // Reload user data and then navigate
        if (reloadUser) {
          // Fix: reloadUser requires a user object, but here we are logging in as a NEW user.
          // Since we don't have the new user object easily available here without fetching, 
          // and reloadUser is likely used to refresh the CURRENT user,
          // we might just want to let the context update itself on navigation or fetch profile.
          // However, to satisfy typescript if it demands an arg:
          await reloadUser(null);
        }

        // Small delay to ensure state is updated, then navigate
        setTimeout(() => {
          navigate(dashboardRoute);
        }, 500);
      } else {
        const errorMsg = result.error || 'Erro ao fazer login';
        // Provide more helpful error messages
        if (errorMsg.includes('Invalid login credentials') || errorMsg.includes('incorretos')) {
          showToast('Email ou senha incorretos. Verifique as credenciais.', 'error');
        } else if (errorMsg.includes('timeout') || errorMsg.includes('demorou')) {
          showToast('Servidor demorou para responder. Tente novamente.', 'error');
        } else {
          showToast(errorMsg, 'error');
        }
      }
    } catch (error: any) {
      showToast('Erro inesperado ao fazer login: ' + (error.message || 'Erro desconhecido'), 'error');
    }
  };

  // Centralized Dashboard Route Logic - Memoized to prevent unnecessary recalculations
  const dashboardRoute = useMemo(() => {
    try {
      if (!user) return '/#login';

      // Check if user is a test admin account (for quick switching)
      const isTestAdmin = TEST_ACCOUNTS.some(acc => acc.email === user.email && acc.role === 'ADMIN');
      const isTestAgency = TEST_ACCOUNTS.some(acc => acc.email === user.email && acc.role === 'AGENCY');

      switch (user.role) {
        case 'AGENCY':
          return '/agency/dashboard';
        case 'ADMIN':
          return '/admin/dashboard';
        case 'CLIENT':
          // If it's a test admin/agency account logged as client, allow access to their dashboard
          if (isTestAdmin) return '/admin/dashboard';
          if (isTestAgency) return '/agency/dashboard';
          if (isAgencyMode && activeSlug) {
            return `/${activeSlug}/client/BOOKINGS`;
          }
          return '/client/dashboard/BOOKINGS';
        default:
          return '/';
      }
    } catch (error) {
      console.error('Error calculating dashboard route:', error);
      return '/';
    }
  }, [user, isAgencyMode, activeSlug]);


  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans transition-colors duration-300 pb-16 md:pb-0">
      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          initialView={initialView}
          onClose={handleCloseModal}
          agencyContext={currentAgency}
        />
      )}

      {/* Navbar */}
      <nav
        className="sticky top-0 z-50 bg-white shadow-sm"
        style={{
          backgroundColor: platformSettings?.background_color || '#ffffff',
          opacity: platformSettings?.background_transparency || 1.0,
          backdropFilter: platformSettings?.background_blur ? 'blur(10px)' : 'none',
          WebkitBackdropFilter: platformSettings?.background_blur ? 'blur(10px)' : 'none'
        }}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          {isMicrositeClientArea && currentAgency ? (
            // Microsite Client Dashboard Header
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link to={`/${currentAgency.slug}`} className="flex items-center gap-3 group">
                  <img src={currentAgency.logo} alt={currentAgency.name} className="w-10 h-10 rounded-full object-cover border-2 border-gray-100 group-hover:scale-105 transition-transform" />
                  <span className="font-bold text-gray-800 group-hover:text-primary-600 transition-colors truncate max-w-[150px] md:max-w-none">{currentAgency.name}</span>
                </Link>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-4">
                  <Link to={`/${currentAgency.slug}/client/PROFILE`} className="text-sm font-medium text-gray-600 hover:text-primary-600 flex items-center gap-1.5"><User size={14} /> Meu Perfil</Link>
                  <Link to={`/${currentAgency.slug}/client/BOOKINGS`} className="text-sm font-medium text-gray-600 hover:text-primary-600 flex items-center gap-1.5"><ShoppingBag size={14} /> Minhas Viagens</Link>
                  <button onClick={handleLogout} className="text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"><LogOut size={14} /> Sair</button>
                </div>
              </div>
            </div>
          ) : (
            // Default Header (Global, Public Microsite OR Agency Dashboard)
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                {/* Mobile Menu Button - Left Aligned */}
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="md:hidden p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg mr-2 transition-colors"
                  aria-label="Abrir menu"
                >
                  <Menu size={24} />
                </button>

                <Link to={homeLink} className="flex-shrink-0 flex items-center group z-10 relative">
                  {!showAgencyHeader ? (
                    // Show SouNativo logo immediately for global pages
                    <>
                      {platformSettings?.platform_logo_url ? (
                        <>
                          <img src={platformSettings.platform_logo_url} alt={(platformSettings?.platform_name && platformSettings.platform_name !== 'ViajaStore') ? platformSettings.platform_name : 'SouNativo'} className="h-8 w-auto mr-2" />
                          <span className="font-bold text-xl tracking-tight text-primary-800 hidden md:inline">
                            {(platformSettings?.platform_name && platformSettings.platform_name !== 'ViajaStore') 
                              ? platformSettings.platform_name 
                              : 'SouNativo'}
                          </span>
                        </>
                      ) : (
                        <Logo 
                          className="h-8" 
                          showText={true}
                          variant="default"
                        />
                      )}
                    </>
                  ) : (
                    // FIX: Only show skeleton if we're actually in agency mode AND loading
                    <div className="flex items-center animate-[fadeIn_0.3s]">
                      {currentAgency ? (
                        <>
                          {currentAgency.logo && (
                            <img src={currentAgency.logo} alt={currentAgency.name} className="w-10 h-10 rounded-full object-cover mr-3 border border-gray-200" />
                          )}
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 text-lg leading-tight line-clamp-1 break-all max-w-[180px] md:max-w-[200px]">{currentAgency.name}</span>
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center">
                              {isAgencyDashboard ? 'Painel Gerencial' : 'Parceiro Verificado'} <ShieldCheck size={10} className="ml-1 text-green-500" />
                            </span>
                          </div>
                        </>
                      ) : dataLoading ? (
                        // FIX: Only show skeleton if actually loading agency data
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse mr-3"></div>
                          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      ) : (
                        // Fallback to SouNativo logo if agency not found
                        <>
                          {platformSettings?.platform_logo_url ? (
                            <img src={platformSettings.platform_logo_url} alt={platformSettings.platform_name} className="h-8 w-auto mr-2" />
                          ) : (
                            <Logo className="h-8" showText={true} />
                          )}
                        </>
                      )}
                    </div>
                  )}
                </Link>

                <div className="hidden md:ml-8 md:flex md:space-x-8">
                  {!showAgencyHeader ? (
                    <>
                      <Link to="/trips" className={getLinkClasses('/trips')}>
                        Explorar Viagens
                      </Link>
                      <Link to="/agencies" className={getLinkClasses('/agencies')}>
                        Agências
                      </Link>
                      <Link to="/guides" className={getLinkClasses('/guides')}>
                        <Compass size={16} className="inline mr-1" />
                        Guias de Turismo
                      </Link>
                      <Link to="/about" className={getLinkClasses('/about')}>
                        Sobre
                      </Link>
                    </>
                  ) : currentAgency && (
                    <>
                      <Link to={`/${currentAgency.slug}`} className={getLinkClasses(`/${currentAgency.slug}`)}>
                        <HomeIcon size={16} className="mr-1" /> Início
                      </Link>
                      <Link to={`/${currentAgency.slug}/trips`} className={getLinkClasses(`/${currentAgency.slug}/trips`)}>
                        <Map size={16} className="mr-1" /> Pacotes
                      </Link>
                      <Link to={`/${currentAgency.slug}/guides`} className={getLinkClasses(`/${currentAgency.slug}/guides`)}>
                        <Compass size={16} className="mr-1" /> Guias
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Desktop Right Menu */}
              <div className="hidden md:flex items-center">
                {user ? (
                  <div className="ml-4 flex items-center md:ml-6 gap-4">
                    {/* Elemento 1: Botão de Ação Principal (Dashboard) */}
                    <Link
                      to={dashboardRoute}
                      className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors text-slate-600 hover:text-primary-600 hover:bg-gray-50"
                      title={
                        user.role === 'ADMIN' || TEST_ACCOUNTS.some(acc => acc.email === user.email && acc.role === 'ADMIN')
                          ? 'Painel Master'
                          : isGuide
                            ? 'Meu Painel de Guia'
                            : 'Ir para Painel'
                      }
                    >
                      <LayoutDashboard size={16} />
                      <span>
                        {user.role === 'ADMIN' || TEST_ACCOUNTS.some(acc => acc.email === user.email && acc.role === 'ADMIN')
                          ? 'Painel Master'
                          : isGuide
                            ? 'Meu Painel de Guia'
                            : 'Ir para Painel'}
                      </span>
                    </Link>

                    {/* Elemento 2: Divisor Vertical */}
                    <div className="h-6 w-px bg-slate-200" />

                    {/* Elemento 3: Botão Sair (Logout) */}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                      title="Sair da conta"
                    >
                      <LogOut size={18} />
                    </button>

                    {/* Elemento 4: Avatar (Link para Perfil) */}
                    <Link
                      to={userProfileLink}
                      className="flex items-center transition-transform hover:scale-105"
                      title="Configurações de Conta"
                    >
                      {(() => {
                        // Para Agency, usar logo; para outros (Client, Admin), usar avatar
                        const avatarUrl = user.role === 'AGENCY' 
                          ? (user as Agency).logo 
                          : user.avatar;
                        
                        if (avatarUrl) {
                          return (
                            <img
                              src={avatarUrl}
                              alt={user.name}
                              className="w-8 h-8 rounded-full object-cover border-2 border-gray-200 hover:border-primary-300 transition-colors"
                            />
                          );
                        }
                        
                        return (
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-bold border-2 border-gray-200 hover:border-primary-300 transition-colors">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        );
                      })()}
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <Link 
                      to={{ hash: 'login' }} 
                      className="text-gray-500 hover:text-gray-900 font-medium transition-colors"
                    >
                      Entrar
                    </Link>
                    <Link 
                      to={{ hash: 'signup' }} 
                      className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm shadow-primary-500/30"
                    >
                      Criar Conta
                    </Link>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button Removed - replaced by BottomNav */}
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm animate-[fadeIn_0.3s]"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-[280px] bg-white z-[101] shadow-2xl transform transition-transform duration-300 animate-[slideInLeft_0.3s] flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <span className="font-bold text-lg text-primary-600">Menu</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {!showAgencyHeader ? (
                <>
                  <Link to="/trips" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors font-medium">
                    <Map size={20} className="text-gray-400" /> Explorar Viagens
                  </Link>
                  <Link to="/agencies" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors font-medium">
                    <Building size={20} className="text-gray-400" /> Agências
                  </Link>
                  <Link to="/guides" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors font-medium">
                    <Compass size={20} className="text-gray-400" /> Guias de Turismo
                  </Link>
                  <Link to="/about" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors font-medium">
                    <Globe size={20} className="text-gray-400" /> Sobre
                  </Link>
                </>
              ) : currentAgency && (
                <>
                  <Link to={`/${currentAgency.slug}`} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors font-medium">
                    <HomeIcon size={20} className="text-gray-400" /> Início
                  </Link>
                  <Link to={`/${currentAgency.slug}/trips`} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors font-medium">
                    <Map size={20} className="text-gray-400" /> Pacotes
                  </Link>
                  <Link to={`/${currentAgency.slug}/guides`} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors font-medium">
                    <Compass size={20} className="text-gray-400" /> Guias
                  </Link>
                </>
              )}

              <div className="my-4 border-t border-gray-100"></div>

              {user ? (
                <>
                  <div className="px-4 py-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Minha Conta</p>
                    <div className="flex items-center gap-3 mb-4">
                      {(() => {
                        // Para Agency, usar logo; para outros (Client, Admin), usar avatar
                        const avatarUrl = user.role === 'AGENCY' 
                          ? (user as Agency).logo 
                          : user.avatar;
                        
                        return avatarUrl ? (
                          <img src={avatarUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold">
                            {user.name.charAt(0)}
                          </div>
                        );
                      })()}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  </div>

                  <Link to={userProfileLink} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors font-medium">
                    <User size={20} className="text-gray-400" /> Meu Perfil
                  </Link>

                  <Link to={dashboardRoute} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors font-medium">
                    <LayoutDashboard size={20} className="text-gray-400" />
                    {user.role === 'ADMIN' || TEST_ACCOUNTS.some(acc => acc.email === user.email && acc.role === 'ADMIN')
                      ? 'Painel Master'
                      : isGuide
                        ? 'Meu Painel de Guia'
                        : 'Meu Painel'}
                  </Link>

                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium mt-2">
                    <LogOut size={20} /> Sair
                  </button>
                </>
              ) : (
                <div className="p-4 space-y-3">
                  <Link
                    to={{ pathname: location.pathname, hash: '#login' }}
                    className="w-full flex items-center justify-center py-3 px-4 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-500/30 active:scale-[0.98] transition-all"
                  >
                    Entrar
                  </Link>
                  <Link
                    to={{ pathname: location.pathname, hash: '#signup' }}
                    className="w-full flex items-center justify-center py-3 px-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all"
                  >
                    Criar Conta
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="flex-grow w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className={`${isMicrositeClientArea ? 'bg-gray-100' : 'bg-white border-t border-gray-200'} pt-12 pb-8 mt-auto`}>
        {isMicrositeClientArea ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Link to="/" className="inline-flex items-center text-gray-400 hover:text-primary-600 font-bold uppercase tracking-wider transition-colors">
              <Globe size={12} className="mr-2" /> Voltar para o Marketplace {(platformSettings?.platform_name && platformSettings.platform_name !== 'ViajaStore') ? platformSettings.platform_name : 'SouNativo'}
            </Link>
          </div>
        ) : (
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div className="col-span-1 md:col-span-2">
                {currentAgency ? (
                  <div className="mb-4">
                    <span className="text-xl font-bold text-gray-900">{currentAgency.name}</span>
                    <p className="text-gray-500 text-sm mt-2 max-w-sm">{currentAgency.description}</p>
                  </div>
                ) : (
                  <div className="mb-4">
                    <span className="text-xl font-bold text-gray-900">{(platformSettings?.platform_name && platformSettings.platform_name !== 'ViajaStore') ? platformSettings.platform_name : 'SouNativo'}</span>
                    <p className="text-gray-500 text-sm mt-2 max-w-sm">Conectando você às melhores experiências de viagem do Brasil.</p>
                  </div>
                )}
                <div className="flex space-x-4">
                  <a href="#" className="text-gray-400 hover:text-primary-600 transition-colors"><Instagram size={20} /></a>
                  <a href="#" className="text-gray-400 hover:text-primary-600 transition-colors"><Facebook size={20} /></a>
                  <a href="#" className="text-400 hover:text-primary-600 transition-colors"><Twitter size={20} /></a>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Navegação</h3>
                <ul className="space-y-2">
                  <li><Link to="/trips" className="text-gray-500 hover:text-primary-600 text-sm transition-colors">Viagens</Link></li>
                  <li><Link to="/agencies" className="text-gray-500 hover:text-primary-600 text-sm transition-colors">Agências</Link></li>
                  <li><Link to="/guides" className="text-gray-500 hover:text-primary-600 text-sm transition-colors">Guias</Link></li>
                  <li><Link to="/blog" className="text-gray-500 hover:text-primary-600 text-sm transition-colors">Blog</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Institucional</h3>
                <ul className="space-y-2">
                  <li><Link to="/about" className="text-gray-500 hover:text-primary-600 text-sm transition-colors">Sobre Nós</Link></li>
                  <li><Link to="/contact" className="text-gray-500 hover:text-primary-600 text-sm transition-colors">Contato</Link></li>
                  <li><Link to="/terms" className="text-gray-500 hover:text-primary-600 text-sm transition-colors">Termos de Uso</Link></li>
                  <li><Link to="/privacy" className="text-gray-500 hover:text-primary-600 text-sm transition-colors">Privacidade</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center">
              <p className="text-sm text-gray-400">
                &copy; {new Date().getFullYear()} {(platformSettings?.platform_name && platformSettings.platform_name !== 'ViajaStore') ? platformSettings.platform_name : 'SouNativo'}. Todos os direitos reservados.
              </p>
              <div className="flex items-center gap-2 mt-4 md:mt-0">
                <span className="text-[10px] text-gray-400 uppercase font-bold">Powered by</span>
                <Logo className="h-4" showText={false} />
                <span className="text-xs font-extrabold text-gray-600">{(platformSettings?.platform_name && platformSettings.platform_name !== 'ViajaStore') ? platformSettings.platform_name : 'SouNativo'}</span>
              </div>
            </div>
          </div>
        )}
      </footer>

      {/* RENDER THE NEW BOTTOM NAV */}
      <BottomNav />

      {/* Impersonate Mode Floating Button */}
      {isImpersonating && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-[fadeIn_0.3s]">
          <button
            onClick={async () => {
              try {
                await exitImpersonate();
                // Wait a bit for state to update
                setTimeout(() => {
                  navigate('/admin/dashboard');
                }, 100);
              } catch (error) {
                // Error handled in exitImpersonate
                // Navigate anyway
                navigate('/admin/dashboard');
              }
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 transition-all hover:scale-105"
            title="Sair do Modo Gerenciar"
          >
            <LogOut size={20} />
            Sair do Modo Gerenciar
          </button>
        </div>
      )}
    </div>
  );
};

export default Layout;