
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Search, Building, LogIn, User, LayoutDashboard } from 'lucide-react';

const BottomNav: React.FC = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  const NavItem = ({ to, icon: Icon, label, active }: { to: any; icon: any; label: string; active: boolean }) => (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center py-2 text-xs font-bold transition-colors w-full h-full ${
        active 
          ? 'text-primary-600' 
          : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      <div className="relative">
        <Icon size={24} className={`mb-0.5 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
        {active && <div className="absolute -top-1 right-0 w-1.5 h-1.5 bg-primary-600 rounded-full md:hidden"></div>}
      </div>
      <span>{label}</span>
    </Link>
  );

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] h-[64px]">
      <div className="grid grid-cols-3 h-full">
        {/* 1. Explorar (Universal) */}
        <NavItem
          to="/"
          icon={Search}
          label="Explorar"
          active={pathname === '/' || pathname.startsWith('/trips') || pathname.startsWith('/viagem')}
        />

        {/* 2. Agências (Universal) */}
        <NavItem
          to="/agencies"
          icon={Building}
          label="Agências"
          active={pathname.startsWith('/agencies') || pathname.startsWith('/agency/')}
        />

        {/* 3. Contextual (Auth Based) */}
        {!user ? (
          <NavItem
            to={{ hash: 'login' }}
            icon={LogIn}
            label="Entrar"
            active={false}
          />
        ) : user.role === 'CLIENT' ? (
          <NavItem
            to="/client/dashboard/PROFILE"
            icon={User}
            label="Conta"
            active={pathname.startsWith('/client/dashboard')}
          />
        ) : (
          <NavItem
            to="/agency/dashboard"
            icon={LayoutDashboard}
            label="Painel"
            active={pathname.startsWith('/agency/dashboard')}
          />
        )}
      </div>
    </div>
  );
};

export default BottomNav;
