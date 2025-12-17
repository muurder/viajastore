import React, { useState } from 'react';
import { 
  LayoutDashboard, Users, Building2, Map, Star, Compass, 
  Palette, Shield, Settings, Megaphone, ChevronLeft, ChevronRight, LogOut 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Logo } from './ui/Logo';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, isCollapsed, onToggleCollapse }) => {
  const { user, logout } = useAuth();
  const { platformSettings } = useData();

  const menuItems = [
    { id: 'OVERVIEW', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'USERS', label: 'Usuários', icon: Users },
    { id: 'AGENCIES', label: 'Agências', icon: Building2 },
    { id: 'TRIPS', label: 'Viagens', icon: Map },
    { id: 'REVIEWS', label: 'Avaliações', icon: Star },
    { id: 'GUIDES', label: 'Guias de Turismo', icon: Compass },
    { id: 'THEMES', label: 'Temas', icon: Palette },
    { id: 'AUDIT_LOGS', label: 'Segurança & Logs', icon: Shield },
    { id: 'GLOBAL_SETTINGS', label: 'Configurações Globais', icon: Settings },
    { id: 'BROADCASTS', label: 'Comunicados', icon: Megaphone },
  ];

  return (
    <aside 
      className={`
        fixed left-0 top-0 h-screen bg-white border-r border-gray-200 z-50 
        transition-all duration-300 ease-in-out flex flex-col
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Header / Logo */}
      <div className="h-16 flex items-center justify-center border-b border-gray-100 relative">
        <div className={`flex items-center gap-2 transition-all duration-300 ${isCollapsed ? 'scale-75' : ''}`}>
          {platformSettings?.platform_logo_url ? (
            <img 
              src={platformSettings.platform_logo_url} 
              alt="Logo" 
              className="h-8 w-auto object-contain"
            />
          ) : (
            <Logo className="h-8 text-primary-600" showText={!isCollapsed} />
          )}
          {!isCollapsed && !platformSettings?.platform_logo_url && (
            <span className="font-bold text-xl text-gray-900 tracking-tight">
              {platformSettings?.platform_name || 'SouNativo'}
            </span>
          )}
        </div>
        
        {/* Toggle Button */}
        <button 
          onClick={onToggleCollapse}
          className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded-full p-1 shadow-sm hover:bg-gray-50 text-gray-500 hover:text-primary-600 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 scrollbar-thin scrollbar-thumb-gray-200">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative
                ${isActive 
                  ? 'bg-primary-50 text-primary-600 shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
                ${isCollapsed ? 'justify-center' : ''}
              `}
              title={isCollapsed ? item.label : ''}
            >
              <item.icon 
                size={20} 
                className={`
                  transition-colors duration-200
                  ${isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'}
                `} 
              />
              
              {!isCollapsed && (
                <span className="font-medium text-sm whitespace-nowrap">
                  {item.label}
                </span>
              )}

              {/* Active Indicator Strip */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-600 rounded-r-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile & Logout */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-4' : 'gap-3'}`}>
          <div className="relative group cursor-pointer">
            <img 
              src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}`} 
              alt={user?.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm group-hover:border-primary-200 transition-colors"
            />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          )}

          <button 
            onClick={logout}
            className={`
              p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors
              ${isCollapsed ? '' : 'ml-auto'}
            `}
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;