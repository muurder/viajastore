
import React, { useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation, useSearchParams, useMatch } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, Instagram, Facebook, Twitter, User, ShieldCheck, Home as HomeIcon, Map, ShoppingBag, Globe, ChevronRight, LogIn, UserPlus, LayoutDashboard } from 'lucide-react';
import AuthModal from './AuthModal';
import BottomNav from './BottomNav';
import { Agency } from '../types';
import AgencyLandingPage from '../pages/AgencyLandingPage';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { getAgencyBySlug, getAgencyTheme, loading: dataLoading } = useData();
  const { setAgencyTheme, resetAgencyTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Close menu logic removed as hamburger menu is gone
  
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
    'forgot-password', 'login', 'signup', 'admin', 'client'
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
            document.title = `${currentAgency.name} | ViajaStore`;
        } else {
            document.title = 'ViajaStore | O maior marketplace de viagens';
        }
    }
  }, [location.pathname, isAgencyMode, isAgencyDashboard, currentAgency]);
  
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

  const homeLink = (isAgencyMode || isAgencyDashboard) && currentAgency?.slug ? `/${currentAgency.slug}` : '/';
  
  // Logic for the "User Pill" link in header
  const getUserProfileLink = () => {
      if (!user) return '#';
      if (user.role === 'AGENCY') return '/agency/dashboard?tab=SETTINGS';
      if (user.role === 'ADMIN') return '/admin/dashboard';
      // Client
      if (isAgencyMode && activeSlug) return `/${activeSlug}/client/PROFILE`;
      return '/client/dashboard/PROFILE';
  };

  const userProfileLink = getUserProfileLink();

  // Centralized Dashboard Route Logic
  const getDashboardRoute = () => {
    if (!user) return '/#login';
    
    switch (user.role) {
      case 'AGENCY':
        return '/agency/dashboard';
      case 'ADMIN':
        return '/admin/dashboard';
      case 'CLIENT':
        if (isAgencyMode && activeSlug) {
            return `/${activeSlug}/client/BOOKINGS`;
        }
        return '/client/dashboard/BOOKINGS';
      default:
        return '/';
    }
  };

  const showAgencyHeader = isAgencyMode || isAgencyDashboard;

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
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                      <span className="font-bold text-xl tracking-tight text-primary-600">ViajaStore</span>
                    </>
                  ) : (
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
                      ) : (
                        <div className="flex items-center">
                            {!dataLoading ? (
                              <span className="font-bold text-xl tracking-tight text-gray-800 capitalize">{activeSlug}</span>
                            ) : (
                              <>
                                <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse mr-3"></div>
                                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                              </>
                            )}
                        </div>
                      )}
                    </div>
                  )}
                </Link>

                <div className="hidden md:ml-8 md:flex md:space-x-8">
                  {!showAgencyHeader ? (
                      <>
                          <Link to="/trips" className={getLinkClasses('/trips')}>Explorar Viagens</Link>
                          <Link to="/agencies" className={getLinkClasses('/agencies')}>Agências</Link>
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
                        </>
                  )}
                </div>
              </div>

              {/* Desktop Right Menu */}
              <div className="hidden md:flex items-center">
                {user ? (
                  <div className="ml-4 flex items-center md:ml-6">
                    {/* Only show direct Dashboard link if user is Admin or Agency */}
                    {(user.role === 'AGENCY' || user.role === 'ADMIN') && (
                        <Link 
                            to={getDashboardRoute()}
                            className={`mr-4 flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-full transition-colors ${location.pathname.includes('/dashboard') ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-50 hover:text-primary-600'}`}
                        >
                            <LayoutDashboard size={16}/> {user.role === 'ADMIN' ? 'Painel Master' : 'Meu Painel'}
                        </Link>
                    )}
                    
                    <div className="relative flex items-center gap-3 bg-gray-50 py-1.5 px-3 rounded-full border border-gray-100 group hover:bg-white hover:shadow-sm transition-all">
                      <Link to={userProfileLink} className="flex items-center text-sm font-medium text-gray-700 hover:text-primary-600">
                        {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full object-cover mr-2 border border-gray-200" />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold mr-2">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span className="max-w-[100px] truncate">{user.name}</span>
                      </Link>
                      <div className="h-4 w-px bg-gray-300 mx-1"></div>
                      <button onClick={handleLogout} className="flex items-center text-xs font-bold text-gray-400 hover:text-red-500 transition-colors" title="Sair">
                        <LogOut size={16} className="mr-1" />
                      </button>
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
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className={`${isMicrositeClientArea ? 'bg-gray-100' : 'bg-white border-t border-gray-200'} pt-12 pb-8 mt-auto`}>
         {isMicrositeClientArea ? (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
               <Link to="/" className="inline-flex items-center text-gray-400 hover:text-primary-600 font-bold uppercase tracking-wider transition-colors">
                  <Globe size={12} className="mr-2"/> Voltar para o Marketplace ViajaStore
               </Link>
            </div>
         ) : (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                <div className="col-span-1 md:col-span-2">
                  {currentAgency ? (
                    <div className="mb-4">
                       <span className="text-xl font-bold text-gray-900">{currentAgency.name}</span>
                       <p className="text-gray-500 text-sm mt-2 max-w-sm">{currentAgency.description}</p>
                    </div>
                  ) : (
                    <div className="mb-4">
                       <span className="text-xl font-bold text-gray-900">ViajaStore</span>
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
                  &copy; {new Date().getFullYear()} ViajaStore. Todos os direitos reservados.
                </p>
                <div className="flex items-center gap-2 mt-4 md:mt-0">
                   <span className="text-[10px] text-gray-400 uppercase font-bold">Powered by</span>
                   <span className="text-xs font-extrabold text-gray-600">ViajaStore</span>
                </div>
              </div>
            </div>
         )}
      </footer>

      {/* RENDER THE NEW BOTTOM NAV */}
      <BottomNav />
    </div>
  );
};

export default Layout;