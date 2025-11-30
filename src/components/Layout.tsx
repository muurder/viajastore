
import React, { useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation, useSearchParams, useMatch } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, Instagram, Facebook, Twitter, User, ShieldCheck, Home as HomeIcon, Map, ShoppingBag, Globe, ChevronRight, LogIn, UserPlus, LayoutDashboard } from 'lucide-react';
import AuthModal from './AuthModal';
import BottomNav from './BottomNav'; // Import the new component
import { Agency } from '../types';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { getAgencyBySlug, getAgencyTheme, loading: dataLoading } = useData();
  const { setAgencyTheme, resetAgencyTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
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
