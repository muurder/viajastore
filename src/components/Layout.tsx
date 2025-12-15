

import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation, useSearchParams, useMatch } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { LogOut, Instagram, Facebook, Twitter, User, ShieldCheck, Home as HomeIcon, Map, ShoppingBag, Globe, ChevronRight, LogIn, UserPlus, LayoutDashboard, ChevronDown, Palette, Compass, Zap, Building, Shield, Briefcase } from 'lucide-react';
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
  
  // User dropdown state
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  
  // Close menu logic removed as hamburger menu is gone
  
  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto'
    });
  }, [location.pathname]);

  // Click outside handler for user dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };

    if (isUserDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserDropdownOpen]);

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
            document.title = `${currentAgency.name} | ${platformSettings?.platform_name || 'ViajaStore'}`;
        } else {
            document.title = `${platformSettings?.platform_name || 'ViajaStore'} | O maior marketplace de viagens`;
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
    return `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200 ${
      isActive ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
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
        setIsUserDropdownOpen(false);
        return;
      }
      finalPassword = userPassword;
    }
    
    setIsUserDropdownOpen(false);
    
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
          await reloadUser();
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

  // Centralized Dashboard Route Logic
  const getDashboardRoute = () => {
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
  };


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
        className="bg-white shadow-sm sticky top-0 z-50"
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
                    <Link to={`/${currentAgency.slug}/client/PROFILE`} className="text-sm font-medium text-gray-600 hover:text-primary-600 flex items-center gap-1.5"><User size={14}/> Meu Perfil</Link>
                    <Link to={`/${currentAgency.slug}/client/BOOKINGS`} className="text-sm font-medium text-gray-600 hover:text-primary-600 flex items-center gap-1.5"><ShoppingBag size={14}/> Minhas Viagens</Link>
                    <button onClick={handleLogout} className="text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"><LogOut size={14}/> Sair</button>
                 </div>
              </div>
            </div>
          ) : (
            // Default Header (Global, Public Microsite OR Agency Dashboard)
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link to={homeLink} className="flex-shrink-0 flex items-center group z-10 relative">
                  {!showAgencyHeader ? (
                    // FIX: Show ViajaStore logo immediately for global pages (no loading state)
                    <>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        className="h-8 w-8 mr-2 text-primary-600 group-hover:rotate-12 transition-transform"
                      >
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                      {platformSettings?.platform_logo_url ? (
                        <img src={platformSettings.platform_logo_url} alt={platformSettings.platform_name} className="h-8 w-auto mr-2" />
                      ) : null}
                      <span className="font-bold text-xl tracking-tight text-primary-600">{platformSettings?.platform_name || 'ViajaStore'}</span>
                    </>
                  ) : (
                    // FIX: Only show skeleton if we're actually in agency mode AND loading
                    <div className="flex items-center animate-[fadeIn_0.3s]">
                      {currentAgency ? (
                        <>
                          {currentAgency.logo && (
                              <img src={currentAgency.logo} alt={currentAgency.name} className="w-10 h-10 rounded-full object-cover mr-3 border border-gray-200"/>
                          )}
                          <div className="flex flex-col">
                              <span className="font-bold text-gray-900 text-lg leading-tight line-clamp-1 break-all max-w-[180px] md:max-w-[200px]">{currentAgency.name}</span>
                              <span className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center">
                                {isAgencyDashboard ? 'Painel Gerencial' : 'Parceiro Verificado'} <ShieldCheck size={10} className="ml-1 text-green-500"/>
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
                        // FIX: Fallback to ViajaStore logo if agency not found (instead of showing slug)
                        <>
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            className="h-8 w-8 mr-2 text-primary-600 group-hover:rotate-12 transition-transform"
                          >
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                          </svg>
                          {platformSettings?.platform_logo_url ? (
                        <img src={platformSettings.platform_logo_url} alt={platformSettings.platform_name} className="h-8 w-auto mr-2" />
                      ) : null}
                      <span className="font-bold text-xl tracking-tight text-primary-600">{platformSettings?.platform_name || 'ViajaStore'}</span>
                        </>
                      )}
                    </div>
                  )}
                </Link>

                <div className="hidden md:ml-8 md:flex md:space-x-8">
                  {!showAgencyHeader ? (
                      <>
                          <Link to="/trips" className={getLinkClasses('/trips')}>Explorar Viagens</Link>
                          <Link to="/agencies" className={getLinkClasses('/agencies')}>Agências</Link>
                          <Link to="/guides" className={getLinkClasses('/guides')}>
                            <Compass size={16} className="inline mr-1" />
                            Guias de Turismo
                          </Link>
                          <Link to="/about" className={getLinkClasses('/about')}>Sobre</Link>
                      </>
                  ) : currentAgency && (
                        <>
                          <Link to={`/${currentAgency.slug}`} className={getLinkClasses(`/${currentAgency.slug}`)}>
                              <HomeIcon size={16} className="mr-1"/> Início
                          </Link>
                          <Link to={`/${currentAgency.slug}/trips`} className={getLinkClasses(`/${currentAgency.slug}/trips`)}>
                              <Map size={16} className="mr-1"/> Pacotes
                          </Link>
                          <Link to={`/${currentAgency.slug}/guides`} className={getLinkClasses(`/${currentAgency.slug}/guides`)}>
                              <Compass size={16} className="mr-1"/> Guias
                          </Link>
                        </>
                  )}
                </div>
              </div>

              {/* Desktop Right Menu */}
              <div className="hidden md:flex items-center">
                {user ? (
                  <div className="ml-4 flex items-center md:ml-6 gap-3">
                    {/* Only show direct Dashboard link if user is Admin or Agency */}
                    {(user.role === 'AGENCY' || user.role === 'ADMIN' || TEST_ACCOUNTS.some(acc => acc.email === user.email && (acc.role === 'ADMIN' || acc.role === 'AGENCY'))) && (
                        <Link 
                            to={getDashboardRoute()}
                            className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${location.pathname.includes('/dashboard') ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'}`}
                        >
                            <LayoutDashboard size={16}/> {(user.role === 'ADMIN' || TEST_ACCOUNTS.some(acc => acc.email === user.email && acc.role === 'ADMIN')) ? 'Painel Master' : 'Meu Painel'}
                        </Link>
                    )}
                    
                    {/* User Dropdown */}
                    <div className="relative" ref={userDropdownRef}>
                      <button
                        onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                        className="flex items-center gap-2 bg-gray-50 py-1.5 px-3 rounded-full border border-gray-100 hover:bg-white hover:shadow-sm transition-all group"
                      >
                        {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover border border-gray-200" />
                        ) : (
                            <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span className="max-w-[120px] truncate text-sm font-medium text-gray-700">{user.name}</span>
                        <ChevronDown 
                          size={16} 
                          className={`text-gray-400 transition-transform duration-200 ${isUserDropdownOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      
                      {/* Dropdown Menu */}
                      {isUserDropdownOpen && (
                        <>
                          {/* Backdrop */}
                          <div 
                            className="fixed inset-0 bg-black/10 z-[98]" 
                            onClick={() => setIsUserDropdownOpen(false)}
                          />
                          {/* Menu */}
                          <div className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-gray-100 p-2 z-[99] animate-[scaleIn_0.15s]">
                            <Link
                              to={userProfileLink}
                              onClick={() => setIsUserDropdownOpen(false)}
                              className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors group"
                            >
                              <User size={16} className="text-gray-400 group-hover:text-primary-600 transition-colors"/>
                              <span className="font-medium">Meu Perfil</span>
                            </Link>
                            
                            {user.role === 'AGENCY' && (
                              <>
                                <Link
                                  to="/agency/dashboard"
                                  onClick={() => setIsUserDropdownOpen(false)}
                                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors group"
                                >
                                  <LayoutDashboard size={16} className="text-gray-400 group-hover:text-primary-600 transition-colors"/>
                                  <span className="font-medium">Acessar Painel da Agência</span>
                                </Link>
                                <Link
                                  to={themeLink}
                                  onClick={() => setIsUserDropdownOpen(false)}
                                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors group"
                                >
                                  <Palette size={16} className="text-gray-400 group-hover:text-primary-600 transition-colors"/>
                                  <span className="font-medium">Aparência</span>
                                </Link>
                              </>
                            )}

                            {/* Admin Quick Access to Other Dashboards */}
                            {user.role === 'ADMIN' && (
                              <>
                                <div className="border-t border-gray-100 my-1"></div>
                                <div className="px-2 py-1.5">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Shield size={14} className="text-primary-600" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Acesso Admin</span>
                                  </div>
                                  <Link
                                    to="/client/dashboard/BOOKINGS"
                                    onClick={() => setIsUserDropdownOpen(false)}
                                    className="flex items-center gap-2 px-2.5 py-2 text-xs text-gray-600 hover:bg-gray-50 rounded-lg transition-colors group"
                                  >
                                    <User size={14} className="text-gray-400 group-hover:text-primary-600 transition-colors"/>
                                    <span className="font-medium">Painel Cliente</span>
                                  </Link>
                                  <Link
                                    to="/agency/dashboard"
                                    onClick={() => setIsUserDropdownOpen(false)}
                                    className="flex items-center gap-2 px-2.5 py-2 text-xs text-gray-600 hover:bg-gray-50 rounded-lg transition-colors group"
                                  >
                                    <Briefcase size={14} className="text-gray-400 group-hover:text-primary-600 transition-colors"/>
                                    <span className="font-medium">Painel Agência</span>
                                  </Link>
                                </div>
                              </>
                            )}

                            {/* Quick Account Switch - Admin Only */}
                            {/* Show Quick Switch for any test account or admin */}
                            {(user.role === 'ADMIN' || TEST_ACCOUNTS.some(acc => acc.email === user.email)) && (
                              <>
                                <div className="border-t border-gray-100 my-1"></div>
                                <div className="px-2 py-1.5">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Zap size={14} className="text-primary-600" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Troca Rápida</span>
                                  </div>
                                  <div className="space-y-1">
                                    {TEST_ACCOUNTS.map((account) => {
                                      const Icon = account.icon;
                                      const isCurrentUser = user.email === account.email;
                                      const hasPassword = account.password || account.requiresPassword;
                                      return (
                                        <button
                                          key={account.email}
                                          onClick={async () => {
                                            if (!isCurrentUser && hasPassword) {
                                              await handleQuickLogin(account.email, account.password || '', account.requiresPassword);
                                            }
                                          }}
                                          disabled={isCurrentUser || !hasPassword}
                                          className={`w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg transition-all ${
                                            isCurrentUser
                                              ? 'bg-primary-50 text-primary-700 cursor-not-allowed'
                                              : !hasPassword
                                              ? 'text-gray-400 cursor-not-allowed opacity-50'
                                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                          }`}
                                          title={
                                            isCurrentUser 
                                              ? 'Conta atual' 
                                              : !hasPassword
                                              ? 'Senha não configurada'
                                              : `Fazer login como ${account.name}`
                                          }
                                        >
                                          <Icon size={14} className={isCurrentUser ? 'text-primary-600' : 'text-gray-400'} />
                                          <span className="font-medium truncate flex-1 text-left">{account.name}</span>
                                          {isCurrentUser && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary-600"></div>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </>
                            )}
                            
                            <div className="border-t border-gray-100 my-1"></div>
                            
                            <button
                              onClick={() => {
                                setIsUserDropdownOpen(false);
                                handleLogout();
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
                            >
                              <LogOut size={16} className="text-red-500 group-hover:text-red-600 transition-colors"/>
                              <span className="font-medium">Sair</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <Link to={{ hash: 'login' }} className="text-gray-500 hover:text-gray-900 font-medium transition-colors">Entrar</Link>
                    <Link to={{ hash: 'signup' }} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm shadow-primary-500/30">Criar Conta</Link>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button Removed - replaced by BottomNav */}
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className={`${isMicrositeClientArea ? 'bg-gray-100' : 'bg-white border-t border-gray-200'} pt-12 pb-8 mt-auto`}>
         {isMicrositeClientArea ? (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
               <Link to="/" className="inline-flex items-center text-gray-400 hover:text-primary-600 font-bold uppercase tracking-wider transition-colors">
                  <Globe size={12} className="mr-2"/> Voltar para o Marketplace {platformSettings?.platform_name || 'ViajaStore'}
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
                       <span className="text-xl font-bold text-gray-900">{platformSettings?.platform_name || 'ViajaStore'}</span>
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
                  &copy; {new Date().getFullYear()} {platformSettings?.platform_name || 'ViajaStore'}. Todos os direitos reservados.
                </p>
                <div className="flex items-center gap-2 mt-4 md:mt-0">
                   <span className="text-[10px] text-gray-400 uppercase font-bold">Powered by</span>
                   <span className="text-xs font-extrabold text-gray-600">{platformSettings?.platform_name || 'ViajaStore'}</span>
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