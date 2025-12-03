
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Compass, Building, User } from 'lucide-react';

const BottomNav: React.FC = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const NavItem = ({ to, icon: Icon, label, active }: { to: any; icon: any; label: string; active: boolean }) => (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center py-2 text-[11px] font-semibold transition-colors w-full h-full ${
        active 
          ? 'text-primary-600' 
          : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      <div className="relative">
        <Icon size={22} className={`mb-0.5 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
        {active && <div className="absolute -top-1 right-0 w-1.5 h-1.5 bg-primary-600 rounded-full md:hidden"></div>}
      </div>
      <span>{label}</span>
    </Link>
  );

  // Logic to determine where the "Conta" button links to
  const getAccountLink = () => {
    if (!user) return { hash: 'login' };
    if (user.role === 'AGENCY') return '/agency/dashboard';
    if (user.role === 'ADMIN') return '/admin/dashboard';
    return '/client/dashboard/PROFILE';
  };

  const isAccountActive = () => {
    if (!user && (pathname.includes('login') || window.location.hash.includes('login'))) return true;
    if (user?.role === 'AGENCY' && pathname.startsWith('/agency/dashboard')) return true;
    if (user?.role === 'ADMIN' && pathname.startsWith('/admin/dashboard')) return true;
    if (user?.role === 'CLIENT' && pathname.startsWith('/client/dashboard')) return true;
    return false;
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-4 h-[64px]">
        {/* 1. Home - Discovery */}
        <NavItem
          to="/"
          icon={Home}
          label="Home"
          active={pathname === '/'}
        />

        {/* 2. Explorar (Viagens) - Catalog */}
        {/* Fix: Updated active check to use `pathname.includes` for better matching of nested routes */}
        <NavItem
          to="/trips"
          icon={Compass}
          label="Explorar"
          active={pathname.includes('/trips') || pathname.includes('/viagem')}
        />

        {/* 3. Agências - Marketplace */}
        <NavItem
          to="/agencies"
          icon={Building}
          label="Agências"
          active={pathname.startsWith('/agencies') || pathname.startsWith('/agency/')}
        />

        {/* 4. Conta - Personal Area */}
        <NavItem
          to={getAccountLink()}
          icon={User}
          label="Conta"
          active={isAccountActive()}
        />
      </div>
    </div>
  );
};

export default BottomNav;
