
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Compass, Building, Info, LogIn, Heart, ShoppingBag, User, Home, Package, LayoutDashboard, Settings, Search } from 'lucide-react';
import { Agency } from '../types';

const BottomNav: React.FC = () => {
  const { user } = useAuth();
  const { pathname, search } = useLocation();
  const { agencies } = useData();

  // Helper to determine active state
  const isActive = (path: string, exact = false) => {
    if (exact) return pathname === path;
    return pathname.startsWith(path);
  };

  // Helper for query params (e.g. for dashboard tabs)
  const hasQuery = (query: string) => search.includes(query);

  const NavItem = ({ to, icon: Icon, label, active }: { to: string | Partial<Location> | any; icon: any; label: string; active: boolean }) => (
    <Link 
      to={to} 
      className={`flex flex-col items-center justify-center py-2 px-1 text-xs font-bold transition-all duration-200 h-full w-full ${
        active 
          ? 'text-primary-600 bg-primary-50' 
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon size={20} className={`mb-1 ${active ? 'fill-current text-primary-600' : ''}`} />
      <span className="truncate max-w-full">{label}</span>
    </Link>
  );

  // 1. Guest Menu (Not Logged In)
  if (!user) {
    return (
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] h-[64px]">
        <div className="grid grid-cols-4 h-full">
          <NavItem to="/trips" icon={Compass} label="Explorar" active={isActive('/trips') || pathname === '/'} />
          <NavItem to="/agencies" icon={Building} label="Agências" active={isActive('/agencies')} />
          <NavItem to="/about" icon={Info} label="Sobre" active={isActive('/about')} />
          <NavItem to={{ hash: 'login' }} icon={LogIn} label="Entrar" active={false} />
        </div>
      </div>
    );
  }

  // 2. Client Menu (Viajante)
  if (user.role === 'CLIENT') {
    return (
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] h-[64px]">
        <div className="grid grid-cols-4 h-full">
          <NavItem to="/trips" icon={Search} label="Explorar" active={isActive('/trips') || pathname === '/'} />
          <NavItem to="/client/dashboard/FAVORITES" icon={Heart} label="Favoritos" active={pathname.includes('FAVORITES')} />
          <NavItem to="/client/dashboard/BOOKINGS" icon={ShoppingBag} label="Pedidos" active={pathname.includes('BOOKINGS')} />
          <NavItem to="/client/dashboard/PROFILE" icon={User} label="Perfil" active={pathname.includes('PROFILE')} />
        </div>
      </div>
    );
  }

  // 3. Agency Menu (Agência)
  if (user.role === 'AGENCY') {
    const agencyUser = user as Agency;
    // Find agency details to ensure we have the slug, fallback to user data
    const currentAgency = agencies.find(a => a.id === user.id) || agencyUser;
    const agencySlug = currentAgency.slug;

    return (
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] h-[64px]">
        <div className="grid grid-cols-4 h-full">
          <NavItem 
            to={agencySlug ? `/${agencySlug}` : '/'} 
            icon={Home} 
            label="Home" 
            active={pathname === `/${agencySlug}`} 
          />
          <NavItem 
            to={agencySlug ? `/${agencySlug}/trips` : '/trips'} 
            icon={Package} 
            label="Pacotes" 
            active={pathname.includes('/trips') && !pathname.includes('dashboard')} 
          />
          <NavItem 
            to="/agency/dashboard?tab=OVERVIEW" 
            icon={LayoutDashboard} 
            label="Vendas" 
            active={hasQuery('OVERVIEW')} 
          />
          <NavItem 
            to="/agency/dashboard?tab=SETTINGS" 
            icon={Settings} 
            label="Perfil" 
            active={hasQuery('SETTINGS')} 
          />
        </div>
      </div>
    );
  }

  // Fallback for Admin or other roles (Default to generic)
  return null;
};

export default BottomNav;
