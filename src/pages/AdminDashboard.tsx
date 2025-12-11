import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { UserRole, Trip, Agency, Client, AgencyReview, ThemePalette, TripCategory, UserStats, Booking, OperationalData, RoomConfig, ManualPassenger } from '../types';
import { 
  Trash2, MessageCircle, Users, Briefcase, 
  AlertOctagon, Database, Loader, Palette, Lock, Eye, Save, 
  Activity, X, Search, MoreVertical, 
  DollarSign, ShoppingBag, Edit3, 
  CreditCard, CheckCircle, XCircle, Ban, Star, UserX, UserCheck, Key,
  Sparkles, Filter, ChevronDown, MonitorPlay, Download, BarChart2 as StatsIcon, ExternalLink,
  LayoutGrid, List, Archive, ArchiveRestore, Trash, Camera, Upload, History, PauseCircle, PlayCircle, Plane, RefreshCw, AlertCircle, LucideProps,
  TrendingUp, UserPlus, Shield, Calendar, LogIn, FileText, X as XIcon, Gift, CheckCircle2,
  UserCog, Building2, Package, BookOpen, Settings, CreditCard as CreditCardIcon,
  Megaphone, Clock, AlertTriangle, CheckCircle2 as CheckCircle2Icon, XCircle as XCircleIcon
} from 'lucide-react';
import { migrateData } from '../services/dataMigration';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { slugify } from '../utils/slugify';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { logger } from '../utils/logger';

// --- STYLED COMPONENTS (LOCAL) ---

// Fix: Explicitly define Badge as a functional component returning React.ReactNode
const Badge: React.FC<{ children: React.ReactNode; color: 'green' | 'red' | 'blue' | 'purple' | 'gray' | 'amber' }> = ({ children, color }) => {
  const colors = {
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[color]} inline-flex items-center gap-1.5 w-fit`}>
      {children}
    </span>
  );
};

// StatCard (local)
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<LucideProps>;
  color: 'green' | 'blue' | 'purple' | 'amber';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon: Icon, color }) => {
  const colorClasses = {
    green: 'bg-green-50 text-green-600 border-green-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  };

  return (
    <div className={`bg-white p-6 rounded-2xl shadow-sm border ${colorClasses[color]} hover:shadow-md transition-all`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
        <span className="text-xs font-bold uppercase text-gray-400">{subtitle}</span>
      </div>
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      <p className="text-3xl font-extrabold text-gray-900 mt-2">{value}</p>
    </div>
  );
};

// Fix: Define ActionMenu component locally
interface ActionMenuProps { actions: { label: string; onClick: () => void; icon: React.ComponentType<LucideProps>; variant?: 'danger' | 'default' }[] }
const ActionMenu: React.FC<ActionMenuProps> = ({ actions }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative inline-flex" ref={menuRef}>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }} 
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
            >
                <MoreVertical size={18} />
            </button>
            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden animate-[scaleIn_0.1s] origin-top-right ring-1 ring-black/5">
                        <div className="py-1">
                            {actions.map((action, idx) => (
                                <button 
                                    key={idx} 
                                    onClick={(e) => { 
                                        e.stopPropagation();
                                        action.onClick(); 
                                        setIsOpen(false); 
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-3 transition-colors ${
                                        action.variant === 'danger' 
                                            ? 'text-red-600 hover:bg-red-50' 
                                            : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <action.icon size={16} /> {action.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// --- AGENCIES FILTER MODAL COMPONENT ---
interface AgenciesFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  agencies: Agency[];
  onAgencyClick: (agency: Agency) => void;
  onAgencyAction: (agency: Agency, action: string) => void;
  showAgencyTrash: boolean;
}

const AgenciesFilterModal: React.FC<AgenciesFilterModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  agencies, 
  onAgencyClick,
  onAgencyAction,
  showAgencyTrash
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-[fadeIn_0.2s]"
        onClick={onClose}
      />
      <div 
        className="fixed inset-0 z-[101] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-[scaleIn_0.2s]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-8 py-6 text-white relative">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <XIcon size={24} />
            </button>
            <h2 className="text-2xl font-extrabold">{title}</h2>
            <p className="text-primary-100 mt-1">{agencies.length} agência(s) encontrada(s)</p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {agencies.length > 0 ? (
              <div className="space-y-3">
                {agencies.map((agency) => (
                  <div
                    key={agency.id}
                    className="bg-gray-50 p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-gray-100 transition-all cursor-pointer group"
                    onClick={() => onAgencyClick(agency)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <img 
                          src={agency.logo_url || `https://ui-avatars.com/api/?name=${agency.name}`} 
                          className="w-12 h-12 rounded-full ring-2 ring-gray-200 group-hover:ring-primary-300 transition-all"
                          alt=""
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm group-hover:text-primary-600 transition-colors">{agency.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{agency.email || '---'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            agency.subscriptionStatus === 'ACTIVE' 
                              ? 'bg-green-50 text-green-700' 
                              : 'bg-red-50 text-red-700'
                          }`}>
                            {agency.subscriptionStatus === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                          </span>
                          {agency.subscriptionPlan === 'PREMIUM' && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                              PREMIUM
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {showAgencyTrash ? (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); onAgencyAction(agency, 'restore'); }}
                              className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                              title="Restaurar"
                            >
                              <ArchiveRestore size={18} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onAgencyAction(agency, 'delete'); }}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir Permanentemente"
                            >
                              <Trash size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); onAgencyAction(agency, 'edit'); }}
                              className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar Detalhes"
                            >
                              <Edit3 size={18} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onAgencyAction(agency, 'plan'); }}
                              className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Mudar Plano"
                            >
                              <CreditCard size={18} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onAgencyAction(agency, 'delete'); }}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Briefcase size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-semibold">Nenhuma agência encontrada</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// --- STATS RIBBON COMPONENT ---
interface StatsRibbonCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<LucideProps>;
  iconColor: string;
  trend?: string;
}

const StatsRibbonCard: React.FC<StatsRibbonCardProps & { onClick?: () => void }> = ({ title, value, icon: Icon, iconColor, trend, onClick }) => {
  return (
    <div 
      className={`bg-white rounded-xl p-5 shadow-sm border border-gray-200 transition-all ${onClick ? 'cursor-pointer hover:shadow-lg hover:border-primary-300 hover:scale-[1.02]' : 'hover:shadow-md'}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{title}</p>
          <p className="text-2xl font-extrabold text-gray-900">{value}</p>
          {trend && <p className="text-xs text-gray-400 mt-1">{trend}</p>}
        </div>
        <div className={`p-3 rounded-lg ${iconColor}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
};

// --- USERS FILTER MODAL COMPONENT ---
interface UsersFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  users: Client[];
  onUserClick: (client: Client) => void;
  onUserAction: (client: Client, action: string) => void;
  showUserTrash: boolean;
}

const UsersFilterModal: React.FC<UsersFilterModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  users, 
  onUserClick,
  onUserAction,
  showUserTrash
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-[fadeIn_0.2s]"
        onClick={onClose}
      />
      <div 
        className="fixed inset-0 z-[101] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-[scaleIn_0.2s]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-8 py-6 text-white relative">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <XIcon size={24} />
            </button>
            <h2 className="text-2xl font-extrabold">{title}</h2>
            <p className="text-primary-100 mt-1">{users.length} usuário(s) encontrado(s)</p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {users.length > 0 ? (
              <div className="space-y-3">
                {users.map((client) => (
                  <div
                    key={client.id}
                    className="bg-gray-50 p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-gray-100 transition-all cursor-pointer group"
                    onClick={() => onUserClick(client)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <img 
                          src={client.avatar || `https://ui-avatars.com/api/?name=${client.name}`} 
                          className="w-12 h-12 rounded-full ring-2 ring-gray-200 group-hover:ring-primary-300 transition-all"
                          alt=""
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm group-hover:text-primary-600 transition-colors">{client.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{client.email}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          client.status === 'ACTIVE' 
                            ? 'bg-green-50 text-green-700' 
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {client.status === 'ACTIVE' ? 'Ativo' : 'Suspenso'}
                        </span>
                      </div>
                      <div className="ml-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {showUserTrash ? (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); onUserAction(client, 'restore'); }}
                              className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                              title="Restaurar"
                            >
                              <ArchiveRestore size={18} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onUserAction(client, 'delete'); }}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir Permanentemente"
                            >
                              <Trash size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); onUserAction(client, 'edit'); }}
                              className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar Detalhes"
                            >
                              <Edit3 size={18} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onUserAction(client, 'toggle'); }}
                              className={`p-2 rounded-lg transition-colors ${
                                client.status === 'ACTIVE' 
                                  ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50' 
                                  : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                              }`}
                              title={client.status === 'ACTIVE' ? 'Suspender' : 'Ativar'}
                            >
                              {client.status === 'ACTIVE' ? <Ban size={18} /> : <UserCheck size={18} />}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onUserAction(client, 'delete'); }}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-semibold">Nenhum usuário encontrado</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// --- CLIENT DETAIL MODAL COMPONENT ---
interface ClientDetailModalProps {
  isOpen: boolean;
  client: Client | null;
  onClose: () => void;
  onEdit: () => void;
  onAccessDashboard: (clientId: string) => void;
  bookings: Booking[];
  reviews: AgencyReview[];
  trips: Trip[];
}

// --- CLIENT DASHBOARD POPUP COMPONENT ---
interface ClientDashboardPopupProps {
  isOpen: boolean;
  clientId: string | null;
  onClose: () => void;
}

const ClientDashboardPopup: React.FC<ClientDashboardPopupProps> = ({ isOpen, clientId, onClose }) => {
  if (!isOpen || !clientId) return null;

  // Build the correct URL for HashRouter
  const basePath = window.location.pathname.replace(/\/$/, '');
  const dashboardUrl = `${window.location.origin}${basePath}/#/client/dashboard/PROFILE?impersonate=${clientId}`;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] animate-[fadeIn_0.2s]"
        onClick={onClose}
      />
      <div 
        className="fixed inset-0 z-[201] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col animate-[scaleIn_0.2s]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-6 py-4 text-white flex items-center justify-between rounded-t-3xl">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <h2 className="text-xl font-extrabold">Painel do Cliente</h2>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Modo Admin - Visualização</span>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <XIcon size={24} />
            </button>
          </div>

          {/* Iframe Content */}
          <div className="flex-1 overflow-hidden">
            <iframe
              src={dashboardUrl}
              className="w-full h-full border-0"
              title="Client Dashboard"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
              onLoad={(e) => {
                // Ensure impersonate parameter is preserved in iframe navigation
                const iframe = e.currentTarget;
                try {
                  const iframeWindow = iframe.contentWindow;
                  if (iframeWindow) {
                    // Intercept navigation to preserve impersonate parameter
                    const originalPushState = iframeWindow.history.pushState;
                    iframeWindow.history.pushState = function(...args) {
                      const url = args[2] as string;
                      if (url && !url.includes('impersonate=')) {
                        const separator = url.includes('?') ? '&' : '?';
                        args[2] = `${url}${separator}impersonate=${clientId}`;
                      }
                      return originalPushState.apply(iframeWindow.history, args);
                    };
                  }
                } catch (err) {
                  // Cross-origin restrictions may prevent access
                  logger.warn('Could not intercept iframe navigation:', err);
                }
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

// --- AGENCY DETAIL MODAL COMPONENT ---
interface AgencyDetailModalProps {
  isOpen: boolean;
  agency: Agency | null;
  onClose: () => void;
  onEdit: () => void;
  bookings: Booking[];
  reviews: AgencyReview[];
  trips: Trip[];
}

const AgencyDetailModal: React.FC<AgencyDetailModalProps> = ({ 
  isOpen, 
  agency, 
  onClose, 
  onEdit,
  bookings,
  reviews,
  trips
}) => {
  if (!isOpen || !agency) return null;

  const agencyBookings = bookings.filter(b => {
    const trip = trips.find(t => t.id === b.tripId);
    return trip && trip.agencyId === agency.agencyId;
  });
  const agencyReviews = reviews.filter(r => r.agencyId === agency.agencyId);
  const totalRevenue = agencyBookings.reduce((sum, b) => sum + b.totalPrice, 0);
  const agencyTrips = trips.filter(t => t.agencyId === agency.agencyId);

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-[fadeIn_0.2s]"
        onClick={onClose}
      />
      <div 
        className="fixed inset-0 z-[101] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-[scaleIn_0.2s]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-8 py-6 text-white relative">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <XIcon size={24} />
            </button>
            <div className="flex items-center gap-6">
              <img 
                src={agency.logo_url || `https://ui-avatars.com/api/?name=${agency.name}`} 
                className="w-20 h-20 rounded-full ring-4 ring-white/30"
                alt=""
              />
              <div className="flex-1">
                <h2 className="text-3xl font-extrabold mb-1">{agency.name}</h2>
                <p className="text-primary-100 text-lg">{agency.email || '---'}</p>
                {agency.phone && (
                  <p className="text-primary-100 text-sm mt-1">{agency.phone}</p>
                )}
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                  agency.subscriptionStatus === 'ACTIVE' 
                    ? 'bg-green-500/20 text-green-100 border border-green-300/30' 
                    : 'bg-red-500/20 text-red-100 border border-red-300/30'
                }`}>
                  {agency.subscriptionStatus === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                </span>
                {agency.subscriptionPlan === 'PREMIUM' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-purple-500 to-purple-600 text-white mt-2 block">
                    PREMIUM
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Pacotes</p>
                <p className="text-2xl font-extrabold text-blue-900">{agencyTrips.length}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">Receita Total</p>
                <p className="text-2xl font-extrabold text-green-900">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Avaliações</p>
                <p className="text-2xl font-extrabold text-amber-900">{agencyReviews.length}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">Vendas</p>
                <p className="text-2xl font-extrabold text-purple-900">{agencyBookings.length}</p>
              </div>
            </div>

            {/* Recent Bookings */}
            {agencyBookings.length > 0 && (
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                  <ShoppingBag size={20} className="text-primary-600" />
                  Vendas Recentes
                </h3>
                <div className="space-y-3">
                  {agencyBookings.slice(0, 3).map(booking => {
                    const trip = trips.find(t => t.id === booking.tripId);
                    return (
                      <div key={booking.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 hover:border-primary-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{trip?.title || 'Viagem não encontrada'}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              {new Date(booking.createdAt).toLocaleDateString('pt-BR')} • R$ {booking.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            booking.status === 'CONFIRMED' 
                              ? 'bg-green-100 text-green-700' 
                              : booking.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {booking.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Reviews */}
            {agencyReviews.length > 0 && (
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                  <Star size={20} className="text-amber-500" />
                  Avaliações Recentes
                </h3>
                <div className="space-y-3">
                  {agencyReviews.slice(0, 2).map(review => (
                    <div key={review.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                size={14} 
                                className={i < review.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'} 
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-gray-700">{review.clientName}</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(review.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-gray-200 px-8 py-6 bg-gray-50 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-gray-700 font-semibold rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={() => {
                onEdit();
                onClose();
              }}
              className="px-6 py-2.5 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
            >
              Editar Perfil
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const ClientDetailModal: React.FC<ClientDetailModalProps> = ({ 
  isOpen, 
  client, 
  onClose, 
  onEdit, 
  onAccessDashboard,
  bookings,
  reviews,
  trips
}) => {
  if (!isOpen || !client) return null;

  const clientBookings = bookings.filter(b => b.clientId === client.id);
  const clientReviews = reviews.filter(r => r.clientId === client.id);
  const totalSpent = clientBookings.reduce((sum, b) => sum + b.totalPrice, 0);
  const favoriteTrips = trips.filter(t => (client as any).favorites?.includes(t.id) || false);

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-[fadeIn_0.2s]"
        onClick={onClose}
      />
      <div 
        className="fixed inset-0 z-[101] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-[scaleIn_0.2s]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-8 py-6 text-white relative">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <XIcon size={24} />
            </button>
            <div className="flex items-center gap-6">
              <img 
                src={client.avatar || `https://ui-avatars.com/api/?name=${client.name}`} 
                className="w-20 h-20 rounded-full ring-4 ring-white/30"
                alt=""
              />
              <div className="flex-1">
                <h2 className="text-3xl font-extrabold mb-1">{client.name}</h2>
                <p className="text-primary-100 text-lg">{client.email}</p>
                {client.phone && (
                  <p className="text-primary-100 text-sm mt-1">{client.phone}</p>
                )}
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                  client.status === 'ACTIVE' 
                    ? 'bg-green-500/20 text-green-100 border border-green-300/30' 
                    : 'bg-red-500/20 text-red-100 border border-red-300/30'
                }`}>
                  {client.status === 'ACTIVE' ? 'Ativo' : 'Suspenso'}
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Reservas</p>
                <p className="text-2xl font-extrabold text-blue-900">{clientBookings.length}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">Total Gasto</p>
                <p className="text-2xl font-extrabold text-green-900">R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Avaliações</p>
                <p className="text-2xl font-extrabold text-amber-900">{clientReviews.length}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">Favoritos</p>
                <p className="text-2xl font-extrabold text-purple-900">{favoriteTrips.length}</p>
              </div>
            </div>

            {/* Recent Bookings */}
            <div>
              <h3 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                <ShoppingBag size={20} className="text-primary-600" />
                Reservas Recentes
              </h3>
              {clientBookings.length > 0 ? (
                <div className="space-y-3">
                  {clientBookings.slice(0, 3).map(booking => {
                    const trip = trips.find(t => t.id === booking.tripId);
                    return (
                      <div key={booking.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 hover:border-primary-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{trip?.title || 'Viagem não encontrada'}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              {new Date(booking.createdAt).toLocaleDateString('pt-BR')} • R$ {booking.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            booking.status === 'CONFIRMED' 
                              ? 'bg-green-100 text-green-700' 
                              : booking.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {booking.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Nenhuma reserva encontrada.</p>
              )}
            </div>

            {/* Recent Reviews */}
            {clientReviews.length > 0 && (
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                  <Star size={20} className="text-amber-500" />
                  Avaliações Recentes
                </h3>
                <div className="space-y-3">
                  {clientReviews.slice(0, 2).map(review => (
                    <div key={review.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                size={14} 
                                className={i < review.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'} 
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-gray-700">{review.agencyName}</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(review.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-gray-200 px-8 py-6 bg-gray-50 flex items-center justify-between gap-4">
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
            >
              <Edit3 size={18} /> Editar Perfil
            </button>
            <button
              onClick={() => onAccessDashboard(client.id)}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-xl font-extrabold hover:from-primary-700 hover:to-secondary-700 transition-all shadow-lg hover:shadow-xl"
            >
              <LogIn size={18} /> Acessar Painel do Cliente
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// --- DRAWER COMPONENT ---
interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: Client | Agency | null;
  type: 'user' | 'agency';
  onEdit?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  onSuspend?: () => void;
}

const DetailDrawer: React.FC<DrawerProps> = ({ isOpen, onClose, item, type, onEdit, onDelete, onRestore, onSuspend }) => {
  if (!isOpen || !item) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose}></div>
      <div className="fixed right-0 top-0 h-full w-full md:w-1/3 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-extrabold text-gray-900">Detalhes</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <XIcon size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
            <img 
              src={(item as any).avatar || (item as any).logo || `https://ui-avatars.com/api/?name=${item.name}`} 
              className="w-16 h-16 rounded-full ring-4 ring-gray-100"
              alt=""
            />
            <div>
              <h3 className="text-xl font-extrabold text-gray-900">{item.name}</h3>
              <p className="text-sm text-gray-500">{(item as any).email || (item as Agency).email}</p>
            </div>
          </div>

          {/* Info Sections */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Informações</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={`font-semibold ${(item as any).status === 'ACTIVE' || (item as Agency).subscriptionStatus === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}`}>
                    {(item as any).status === 'ACTIVE' || (item as Agency).subscriptionStatus === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                {type === 'agency' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Plano</span>
                      <span className="font-semibold text-gray-900">{(item as Agency).subscriptionPlan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Slug</span>
                      <span className="font-mono text-gray-900">/{(item as Agency).slug}</span>
                    </div>
                  </>
                )}
                {(item as any).phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Telefone</span>
                    <span className="font-semibold text-gray-900">{(item as any).phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-6 border-t border-gray-200 space-y-2">
            {onEdit && (
              <button onClick={onEdit} className="w-full flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors">
                <Edit3 size={18} /> Editar Detalhes
              </button>
            )}
            {onSuspend && (
              <button onClick={onSuspend} className="w-full flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-lg font-semibold hover:bg-amber-100 transition-colors">
                <Ban size={18} /> Suspender
              </button>
            )}
            {onRestore && (
              <button onClick={onRestore} className="w-full flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-lg font-semibold hover:bg-green-100 transition-colors">
                <ArchiveRestore size={18} /> Restaurar
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="w-full flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 rounded-lg font-semibold hover:bg-red-100 transition-colors">
                <Trash2 size={18} /> Excluir
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// --- MAIN COMPONENT ---

// Fix: Export AdminDashboard directly
export const AdminDashboard: React.FC = () => {
  const { user, isMaster, sendPasswordReset } = useAuth();
  const { 
    agencies, trips, clients, bookings, reviews, agencyReviews, auditLogs, platformRevenue, platformSettings,
    updateAgency, deleteMultipleAgencies, updateClient, deleteMultipleUsers,
    migrateData, isProcessing: isDataProcessing, refreshData, updatePlatformSettings, getAgencyStats,
    adminChangePlan, updateUserAvatarByAdmin
  } = useData();
  const { themes, activeTheme, setTheme, addTheme, deleteTheme, previewTheme, resetPreview, loading: isThemeProcessing } = useTheme();
  const { showToast } = useToast();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as any) || 'OVERVIEW';

  const [searchTerm, setSearchTerm] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [newThemeForm, setNewThemeForm] = useState({ name: '', primary: '#3b82f6', secondary: '#f97316' });

  const [modalType, setModalType] = useState<'DELETE' | 'EDIT_USER' | 'MANAGE_SUB' | 'EDIT_REVIEW' | 'EDIT_AGENCY' | 'EDIT_TRIP' | 'VIEW_STATS' | 'CHANGE_PLAN' | 'VIEW_AGENCY_DETAILS' | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; variant?: 'danger' | 'warning' | 'info'; confirmText?: string }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'danger' });
  const [agencyDetails, setAgencyDetails] = useState<{ agency: Agency | null; stats: any; trips: Trip[] }>({ agency: null, stats: null, trips: [] });
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);

  const [agencyView, setAgencyView] = useState<'cards' | 'list'>(
    () => (localStorage.getItem('adminAgencyView') as 'cards' | 'list') || 'cards'
  );
  const [userView, setUserView] = useState<'cards' | 'list'>(
    () => (localStorage.getItem('adminUserView') as 'cards' | 'list') || 'cards'
  );
  const [showAgencyTrash, setShowAgencyTrash] = useState(false);
  const [showUserTrash, setShowUserTrash] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'all' | 'user' | 'agency' | 'trip' | 'settings'>('all');
  const [activitySearch, setActivitySearch] = useState('');
  
  const [platformSettingsForm, setPlatformSettingsForm] = useState({
    platform_name: 'ViajaStore',
    platform_logo_url: '',
    maintenance_mode: false,
    layout_style: 'rounded' as 'rounded' | 'square' | 'minimal',
    background_color: '#ffffff',
    background_blur: false,
    background_transparency: 1.0
  });
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');

  // Update form when platformSettings changes
  useEffect(() => {
    if (platformSettings) {
      setPlatformSettingsForm({
        platform_name: platformSettings.platform_name || 'ViajaStore',
        platform_logo_url: platformSettings.platform_logo_url || '',
        maintenance_mode: platformSettings.maintenance_mode || false,
        layout_style: platformSettings.layout_style || 'rounded',
        background_color: platformSettings.background_color || '#ffffff',
        background_blur: platformSettings.background_blur || false,
        background_transparency: platformSettings.background_transparency || 1.0
      });
      setLogoPreview(platformSettings.platform_logo_url || '');
    }
  }, [platformSettings]);

  // New state for Edit User Modal
  const [modalTab, setModalTab] = useState('PROFILE');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerItem, setDrawerItem] = useState<Client | Agency | null>(null);
  const [drawerType, setDrawerType] = useState<'user' | 'agency'>('user');
  
  // Client Detail Modal State
  const [clientDetailModal, setClientDetailModal] = useState<{ isOpen: boolean; client: Client | null }>({ isOpen: false, client: null });
  const [clientDashboardPopup, setClientDashboardPopup] = useState<{ isOpen: boolean; clientId: string | null }>({ isOpen: false, clientId: null });
  const [usersFilterModal, setUsersFilterModal] = useState<{ isOpen: boolean; filterType: 'all' | 'new' | 'active' | 'blocked' | null }>({ isOpen: false, filterType: null });
  const [agenciesFilterModal, setAgenciesFilterModal] = useState<{ isOpen: boolean; filterType: 'all' | 'premium' | 'pending' | 'active' | null }>({ isOpen: false, filterType: null });
  const [agencyDetailModal, setAgencyDetailModal] = useState<{ isOpen: boolean; agency: Agency | null }>({ isOpen: false, agency: null });
  
  // Broadcast Modal State
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    recipients: 'all_agencies' as 'all_agencies' | 'all_users' | 'all'
  });

  const handleSetAgencyView = (view: 'cards' | 'list') => {
    setAgencyView(view);
    localStorage.setItem('adminAgencyView', view);
  };

  const handleSetUserView = (view: 'cards' | 'list') => {
    setUserView(view);
    localStorage.setItem('adminUserView', view);
  };

  // TAREFA 1: Revenue Data (Last 6 months)
  const revenueData = useMemo(() => {
    const months = [];
    const now = new Date();
    let baseRevenue = (platformRevenue || 0) / 6; // Base monthly revenue
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
      // Simulate growth: 5% increase per month
      const revenue = baseRevenue * (1 + (5 - i) * 0.05);
      const subscriptions = Math.floor(revenue / 79.45); // Average between BASIC (59.90) and PREMIUM (99.90)
      const commissions = revenue * 0.15; // 15% commission
      
      months.push({
        month: monthName,
        revenue: Math.round(revenue),
        subscriptions,
        commissions: Math.round(commissions)
      });
    }
    return months;
  }, [platformRevenue]);

  // Calculate active agencies first (before using it in other useMemos)
  const activeAgencies = useMemo(() => agencies.filter(a => !a.deleted_at), [agencies]);
  const deletedAgencies = useMemo(() => agencies.filter(a => !!a.deleted_at), [agencies]);
  const activeUsers = useMemo(() => clients.filter(c => c.role === UserRole.CLIENT && !c.deleted_at), [clients]);
  const deletedUsers = useMemo(() => clients.filter(c => c.role === UserRole.CLIENT && !!c.deleted_at), [clients]);

  // Calculate MRR and Average Ticket
  const mrr = useMemo(() => {
    const activeSubscriptions = activeAgencies.filter(a => a.subscriptionStatus === 'ACTIVE').length;
    const premiumCount = activeAgencies.filter(a => a.subscriptionPlan === 'PREMIUM' && a.subscriptionStatus === 'ACTIVE').length;
    const basicCount = activeSubscriptions - premiumCount;
    return (premiumCount * 99.90) + (basicCount * 59.90);
  }, [activeAgencies]);

  const averageTicket = useMemo(() => {
    const activeCount = activeAgencies.filter(a => a.subscriptionStatus === 'ACTIVE').length;
    return activeCount > 0 ? mrr / activeCount : 0;
  }, [mrr, activeAgencies]);

  // TAREFA 3: Pending Agencies (Mock)
  const pendingAgencies = useMemo(() => {
    return activeAgencies.filter(a => a.subscriptionStatus === 'PENDING' || !a.is_active)
      .slice(0, 5); // Show max 5
  }, [activeAgencies]);

  // TAREFA 2: Enhanced Audit Logs with IP (Mock)
  const enhancedAuditLogs = useMemo(() => {
    return auditLogs.slice(0, 50).map((log, index) => {
      // Mock IP addresses
      const mockIPs = [
        '192.168.1.100',
        '10.0.0.45',
        '172.16.0.23',
        '203.0.113.42',
        '198.51.100.15'
      ];
      
      // Determine severity
      const actionUpper = log.action.toUpperCase();
      let severity: 'high' | 'medium' | 'low' = 'low';
      if (actionUpper.includes('DELETE') || actionUpper.includes('EXCLUIR') || actionUpper.includes('REMOVE')) {
        severity = 'high';
      } else if (actionUpper.includes('UPDATE') || actionUpper.includes('ALTERAR') || actionUpper.includes('CHANGE')) {
        severity = 'medium';
      }
      
      return {
        ...log,
        ip: mockIPs[index % mockIPs.length],
        severity,
        targetId: log.details.match(/ID: ([a-f0-9-]+)/i)?.[1] || 'N/A'
      };
    });
  }, [auditLogs]);

  // Helper function to get activity icon and color
  const getActivityInfo = (action: string) => {
    const actionUpper = action.toUpperCase();
    if (actionUpper.includes('AVATAR') || actionUpper.includes('PROFILE')) {
      return { icon: UserCog, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
    }
    if (actionUpper.includes('AGENCY') || actionUpper.includes('AGÊNCIA')) {
      return { icon: Building2, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' };
    }
    if (actionUpper.includes('TRIP') || actionUpper.includes('VIAGEM') || actionUpper.includes('PACOTE')) {
      return { icon: Package, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
    }
    if (actionUpper.includes('USER') || actionUpper.includes('USUÁRIO') || actionUpper.includes('CLIENT')) {
      return { icon: Users, color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' };
    }
    if (actionUpper.includes('REVIEW') || actionUpper.includes('AVALIAÇÃO')) {
      return { icon: Star, color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' };
    }
    if (actionUpper.includes('SUBSCRIPTION') || actionUpper.includes('PLANO') || actionUpper.includes('PLAN')) {
      return { icon: CreditCardIcon, color: 'text-pink-600', bgColor: 'bg-pink-50', borderColor: 'border-pink-200' };
    }
    if (actionUpper.includes('SETTINGS') || actionUpper.includes('CONFIGURAÇÃO')) {
      return { icon: Settings, color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
    }
    if (actionUpper.includes('DELETE') || actionUpper.includes('EXCLUIR') || actionUpper.includes('REMOVE')) {
      return { icon: Trash2, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
    }
    if (actionUpper.includes('CREATE') || actionUpper.includes('CRIAR') || actionUpper.includes('ADD')) {
      return { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
    }
    return { icon: Activity, color: 'text-primary-600', bgColor: 'bg-primary-50', borderColor: 'border-primary-200' };
  };

  // Function to clear all data
  const handleClearAllData = async () => {
    const confirmMessage = `⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL!\n\nVocê está prestes a excluir:\n- Todos os usuários (clientes)\n- Todas as agências\n- Todas as viagens\n- Todas as avaliações\n\nTem CERTEZA ABSOLUTA que deseja continuar?\n\nDigite "APAGAR TUDO" para confirmar.`;
    
    const userInput = window.prompt(confirmMessage);
    if (userInput !== 'APAGAR TUDO') {
      showToast('Operação cancelada.', 'info');
      return;
    }

    setIsProcessing(true);
    try {
      // Delete all agencies (this will cascade delete trips)
      const allAgencyIds = agencies.map(a => a.agencyId);
      if (allAgencyIds.length > 0) {
        await deleteMultipleAgencies(allAgencyIds);
      }
      
      // Delete all users (clients)
      const allUserIds = clients.filter(c => c.role === UserRole.CLIENT).map(c => c.id);
      if (allUserIds.length > 0) {
        await deleteMultipleUsers(allUserIds);
      }
      
      showToast('Todos os dados foram excluídos com sucesso.', 'success');
      await refreshData();
    } catch (error: any) {
      showToast(`Erro ao limpar dados: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTabChange = (tab: string) => {
      setSearchParams({ tab });
      setSearchTerm('');
      setAgencyFilter('');
      setCategoryFilter('');
      setSelectedUsers([]);
      setSelectedAgencies([]);
      setShowAgencyTrash(false);
      setShowUserTrash(false);
  };

  const handleRefresh = async () => {
      setIsProcessing(true);
      await refreshData();
      setIsProcessing(false);
  };
  
  const handleSoftDelete = async (id: string, type: 'user' | 'agency') => {
    // For agencies, id should be agencyId (PK of agencies table)
    // For users, id should be user_id (PK of profiles table)
    const name = type === 'user' 
      ? clients.find(c => c.id === id)?.name 
      : agencies.find(a => a.agencyId === id)?.name;
    if (!name) {
      showToast(`${type === 'user' ? 'Usuário' : 'Agência'} não encontrado(a).`, 'error');
      return;
    }
    if (window.confirm(`Mover "${name}" para a lixeira?`)) {
        setIsProcessing(true);
        try {
          // id is already the correct PK for the table
          await softDeleteEntity(id, type === 'user' ? 'profiles' : 'agencies');
          showToast(`${type === 'user' ? 'Usuário' : 'Agência'} movido para a lixeira.`, 'success');
          if (type === 'user') {
              setShowUserTrash(true);
          } else {
              setShowAgencyTrash(true);
          }
        } catch (error: any) {
          showToast(`Erro ao mover ${type === 'user' ? 'usuário' : 'agência'} para a lixeira: ${error.message}`, 'error');
        } finally {
          setIsProcessing(false);
        }
    }
  };

  const handleRestore = async (id: string, type: 'user' | 'agency') => {
    setIsProcessing(true);
    await restoreEntity(id, type === 'user' ? 'profiles' : 'agencies');
    setIsProcessing(false);
    showToast(`${type === 'user' ? 'Usuário' : 'Agência'} restaurado(a).`, 'success');
  };

  const handlePermanentDelete = async (id: string, role: UserRole) => {
    if (window.confirm('Excluir permanentemente? Esta ação não pode ser desfeita.')) {
        setIsProcessing(true);
        await deleteUser(id, role);
        setIsProcessing(false);
        showToast('Exclído permanentemente.', 'success');
    }
  };
  
  const handleEmptyTrash = async (type: 'user' | 'agency') => {
      const itemsToDelete = type === 'user' ? deletedUsers : deletedAgencies;
      if (itemsToDelete.length > 0 && window.confirm(`Excluir permanentemente ${itemsToDelete.length} item(ns) da lixeira? Esta ação não pode ser desfeita.`)) {
          setIsProcessing(true);
          try {
              if (type === 'user') {
                  await deleteMultipleUsers(itemsToDelete.map(i => i.id));
              } else {
                  // FIX: Pass agencyId (PK) for deletion from agencies table, not user ID
                  await deleteMultipleAgencies(itemsToDelete.map(i => i.agencyId));
              }
          } catch (e: any) {
              showToast(e.message || 'Erro ao esvaziar a lixeira.', 'error');
          } finally {
              setIsProcessing(false);
          }
      }
  };

  // PDF Export Functions
  const generateAgenciesReportPDF = () => {
    try {
      const doc = new jsPDF();
      const primaryColor = [59, 130, 246]; // Blue
      
      // Header
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('RELATÓRIO DE AGÊNCIAS', 105, 25, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 105, 35, { align: 'center' });
      
      // Stats Summary
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      let y = 55;
      doc.text('RESUMO ESTATÍSTICO', 15, y);
      y += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total de Agências: ${agencyStatsData.totalAgencies}`, 15, y);
      y += 7;
      doc.text(`Receita Estimada: R$ ${agencyStatsData.estimatedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 15, y);
      y += 7;
      doc.text(`Planos Premium: ${agencyStatsData.premiumPlans}`, 15, y);
      y += 7;
      doc.text(`Planos Básicos: ${agencyStatsData.basicPlans}`, 15, y);
      y += 7;
      doc.text(`Planos Gratuitos: ${agencyStatsData.freePlans}`, 15, y);
      y += 7;
      doc.text(`Agências Pendentes: ${agencyStatsData.pending}`, 15, y);
      y += 15;
      
      // Agencies Table
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('LISTA DE AGÊNCIAS', 15, y);
      y += 10;
      
      const tableData = filteredAgencies.map(agency => {
        const expiryDate = agency.subscriptionExpiresAt ? new Date(agency.subscriptionExpiresAt) : null;
        const daysLeft = expiryDate ? Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
        const daysText = daysLeft !== null ? (daysLeft < 0 ? 'Expirado' : `${daysLeft} dias`) : 'N/A';
        
        const agencyBookings = bookings.filter(b => {
          const trip = trips.find(t => t.id === b.tripId);
          return trip && trip.agencyId === agency.agencyId;
        });
        const totalSales = agencyBookings.reduce((sum, b) => sum + b.totalPrice, 0);
        
        return [
          agency.name,
          agency.subscriptionPlan || 'STARTER',
          agency.subscriptionStatus,
          daysText,
          `R$ ${totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ];
      });
      
      (doc as any).autoTable({
        head: [['Agência', 'Plano', 'Status', 'Dias Restantes', 'Vendas']],
        body: tableData,
        startY: y,
        styles: { fontSize: 8 },
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 15, right: 15 }
      });
      
      doc.save(`relatorio-agencias-${new Date().toISOString().split('T')[0]}.pdf`);
      showToast('Relatório PDF gerado com sucesso!', 'success');
    } catch (error: any) {
      showToast(`Erro ao gerar PDF: ${error.message}`, 'error');
    }
  };

  const handleSubscriptionUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !editFormData.plan) return;
    setIsProcessing(true);
    try {
        // FIX: Pass expiresAt to DataContext function
        await updateAgencySubscription(selectedItem.agencyId, editFormData.status, editFormData.plan, editFormData.expiresAt);
    } catch (error) {
        // Toast is already handled in DataContext
    } finally {
        setIsProcessing(false);
        setModalType(null);
    }
  };

  const addSubscriptionTime = (days: number) => {
      const current = editFormData.expiresAt ? new Date(editFormData.expiresAt) : new Date();
      // If current is invalid or in the past, maybe start from now? 
      const baseDate = (current.getTime() > Date.now()) ? current : new Date();
      
      const newDate = new Date(baseDate);
      newDate.setDate(newDate.getDate() + days);
      // FIX: Ensure correct ISO string format for datetime-local (YYYY-MM-DDTHH:MM)
      setEditFormData({ ...editFormData, expiresAt: newDate.toISOString().slice(0, 16) });
  };
  
  const handleUserStatusToggle = async (user: Client) => {
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setIsProcessing(true);
    try {
        await updateClientProfile(user.id, { status: newStatus });
        showToast(`Usuário ${newStatus === 'ACTIVE' ? 'reativado' : 'suspenso'}.`, 'success');
    } catch (e) {
        showToast('Erro ao alterar status.', 'error');
    } finally {
        setIsProcessing(false);
    }
  };

  const handleUserUpdate = async () => {
      if (!selectedItem) return;
      setIsProcessing(true);
      try {
          await updateClientProfile(selectedItem.id, editFormData);
          showToast('Usuário atualizado!', 'success');
          setModalType(null);
      } catch (error) {
          showToast('Erro ao atualizar usuário.', 'error');
      } finally {
          setIsProcessing(false);
      }
  };

  const handleAgencyUpdate = async () => {
    if (!selectedItem) return;
    setIsProcessing(true);
    try {
        // Pass agencyId to updateAgencyProfileByAdmin
        await updateAgencyProfileByAdmin(selectedItem.agencyId, editFormData);
    } catch (error) {
        // Toast handled in context
    } finally {
        setIsProcessing(false);
        setModalType(null);
    }
  };

  const handleReviewUpdate = async () => {
    if (!selectedItem) return;
    setIsProcessing(true);
    try {
        await updateAgencyReview(selectedItem.id, {
            comment: editFormData.comment,
            rating: editFormData.rating,
        });
    } catch (error) {
        // Toast handled in context
    } finally {
        setIsProcessing(false);
        setModalType(null);
    }
  };

  const handleTripUpdate = async () => {
    if (!selectedItem) return;
    setIsProcessing(true);
    try {
        await updateTrip({ ...selectedItem, ...editFormData });
        showToast('Viagem atualizada!', 'success');
    } catch (error) {
        showToast('Erro ao atualizar viagem.', 'error');
    } finally {
        setIsProcessing(false);
        setModalType(null);
    }
  };
  
  const handleDeleteTrip = async (tripId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta viagem? A ação não pode ser desfeita.')) {
        setIsProcessing(true);
        try {
            await deleteTrip(tripId);
            showToast('Viagem excluída com sucesso.', 'success');
        } catch (error) {
            showToast('Erro ao excluir viagem.', 'error');
        } finally {
            setIsProcessing(false);
        }
    }
  };

  const handleAddTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThemeForm.name) {
        showToast('O nome do tema é obrigatório.', 'error');
        return;
    }
    const newId = await addTheme({
        name: newThemeForm.name,
        colors: {
            primary: newThemeForm.primary,
            secondary: newThemeForm.secondary
        }
    });
    if (newId) {
      showToast('Tema adicionado com sucesso!', 'success');
      setNewThemeForm({ name: '', primary: '#3b82f6', secondary: '#f97316' }); // Reset form
    } else {
      showToast('Erro ao adicionar o tema.', 'error');
    }
  };

  const handleDeleteTheme = async (themeId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este tema? Esta ação não pode ser desfeita.')) {
      await deleteTheme(themeId);
      showToast('Tema excluído com sucesso.', 'success');
    }
  }

  const tripCategories = useMemo(() => Array.from(new Set(trips.map(t => t.category))), [trips]);

  const filteredUsers = useMemo(() => (showUserTrash ? deletedUsers : activeUsers).filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase())), [activeUsers, deletedUsers, showUserTrash, searchTerm]);
  const filteredAgencies = useMemo(() => (showAgencyTrash ? deletedAgencies : activeAgencies).filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()) || (a.email && a.email.toLowerCase().includes(searchTerm.toLowerCase()))), [activeAgencies, deletedAgencies, showAgencyTrash, searchTerm]);
  const filteredTrips = useMemo(() => trips.filter(t => (t.title.toLowerCase().includes(searchTerm.toLowerCase())) && (agencyFilter ? t.agencyId === agencyFilter : true) && (categoryFilter ? t.category === categoryFilter : true)), [trips, searchTerm, agencyFilter, categoryFilter]);
  const filteredReviews = useMemo(() => agencyReviews.filter(r => r.comment.toLowerCase().includes(searchTerm.toLowerCase()) || r.agencyName?.toLowerCase().includes(searchTerm.toLowerCase())), [agencyReviews, searchTerm]);
  
  // Filter guides from agencies
  const allGuides = useMemo(() => agencies.filter(agency => {
    if (agency.isGuide === true) return true;
    if (agency.customSettings?.tags?.includes('GUIA')) return true;
    return false;
  }), [agencies]);
  
  const filteredGuides = useMemo(() => {
    let filtered = [...allGuides];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(guide => 
        guide.name.toLowerCase().includes(term) ||
        guide.description?.toLowerCase().includes(term) ||
        guide.email?.toLowerCase().includes(term) ||
        guide.address?.city?.toLowerCase().includes(term) ||
        guide.address?.state?.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [allGuides, searchTerm]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    let filtered = auditLogs;
    
    // Filter by type
    if (activityFilter !== 'all') {
      filtered = filtered.filter(log => {
        const actionUpper = log.action.toUpperCase();
        if (activityFilter === 'user') {
          return actionUpper.includes('USER') || actionUpper.includes('USUÁRIO') || actionUpper.includes('CLIENT') || actionUpper.includes('AVATAR') || actionUpper.includes('PROFILE');
        }
        if (activityFilter === 'agency') {
          return actionUpper.includes('AGENCY') || actionUpper.includes('AGÊNCIA') || actionUpper.includes('SUBSCRIPTION') || actionUpper.includes('PLANO');
        }
        if (activityFilter === 'trip') {
          return actionUpper.includes('TRIP') || actionUpper.includes('VIAGEM') || actionUpper.includes('PACOTE');
        }
        if (activityFilter === 'settings') {
          return actionUpper.includes('SETTINGS') || actionUpper.includes('CONFIGURAÇÃO') || actionUpper.includes('THEME') || actionUpper.includes('TEMA');
        }
        return true;
      });
    }
    
    // Filter by search
    if (activitySearch.trim()) {
      const searchLower = activitySearch.toLowerCase();
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(searchLower) || 
        log.details.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [auditLogs, activityFilter, activitySearch]);
  
  // Calculate User Stats
  const userStatsData = useMemo(() => {
    const totalUsers = activeUsers.length;
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const newThisMonth = activeUsers.filter(u => u.createdAt && new Date(u.createdAt) >= thisMonth).length;
    const activeNow = activeUsers.filter(u => u.status === 'ACTIVE').length;
    const blocked = activeUsers.filter(u => u.status === 'SUSPENDED').length;
    return { totalUsers, newThisMonth, activeNow, blocked };
  }, [activeUsers]);

  // Calculate Agency Stats
  const agencyStatsData = useMemo(() => {
    const totalAgencies = activeAgencies.length;
    const estimatedRevenue = activeAgencies.reduce((sum, a) => {
      if (a.subscriptionStatus === 'ACTIVE') {
        return sum + (a.subscriptionPlan === 'PREMIUM' ? 99.90 : a.subscriptionPlan === 'BASIC' ? 59.90 : 0);
      }
      return sum;
    }, 0);
    const premiumPlans = activeAgencies.filter(a => a.subscriptionPlan === 'PREMIUM' && a.subscriptionStatus === 'ACTIVE').length;
    const pending = activeAgencies.filter(a => a.subscriptionStatus !== 'ACTIVE').length;
    return { totalAgencies, estimatedRevenue, premiumPlans, pending };
  }, [activeAgencies]);
  
  const handleToggleUser = (id: string) => setSelectedUsers(prev => prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]);
  const handleToggleAllUsers = () => setSelectedUsers(prev => prev.length === filteredUsers.length && filteredUsers.length > 0 ? [] : filteredUsers.map(u => u.id));
  // FIX: Update toggle to use agencyId (PK) instead of id (Auth ID)
  const handleToggleAgency = (id: string) => setSelectedAgencies(prev => prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]);
  const handleToggleAllAgencies = () => setSelectedAgencies(prev => prev.length === filteredAgencies.length && filteredAgencies.length > 0 ? [] : filteredAgencies.map(a => a.agencyId));

  const handleMassDeleteUsers = async () => { if (window.confirm(`Excluir ${selectedUsers.length} usuários?`)) { await deleteMultipleUsers(selectedUsers); setSelectedUsers([]); showToast('Usuários excluídos.', 'success'); } };
  
  const handleMassDeleteAgencies = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirmar Exclusão',
      message: `Tem certeza que deseja excluir permanentemente ${selectedAgencies.length} agência(s)? Esta ação não pode ser desfeita.`,
      variant: 'danger',
      confirmText: 'Excluir Permanentemente',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await adminBulkDeleteAgencies(selectedAgencies);
          setSelectedAgencies([]);
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error) {
          logger.error('Error deleting agencies:', error);
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const handleMassArchiveAgencies = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Arquivar Agências',
      message: `Deseja arquivar ${selectedAgencies.length} agência(s)? Elas serão movidas para a lixeira.`,
      variant: 'warning',
      confirmText: 'Arquivar',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await adminBulkArchiveAgencies(selectedAgencies);
          setSelectedAgencies([]);
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error) {
          logger.error('Error archiving agencies:', error);
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const handleMassChangePlan = async (newPlan: 'BASIC' | 'PREMIUM') => {
    setConfirmDialog({
      isOpen: true,
      title: 'Alterar Plano',
      message: `Deseja alterar o plano de ${selectedAgencies.length} agência(s) para ${newPlan}?`,
      variant: 'info',
      confirmText: 'Alterar Plano',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await adminBulkChangePlan(selectedAgencies, newPlan);
          setSelectedAgencies([]);
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error) {
          logger.error('Error changing plans:', error);
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const handleMassUpdateUserStatus = async (status: 'ACTIVE' | 'SUSPENDED') => { await updateMultipleUsersStatus(selectedUsers, status); setSelectedUsers([]); showToast('Status atualizado.', 'success'); };
  const handleUpdateUserStatus = async (userId: string, status: 'ACTIVE' | 'SUSPENDED') => { await updateMultipleUsersStatus([userId], status); showToast('Status atualizado.', 'success'); };
  const handleMassUpdateAgencyStatus = async (status: 'ACTIVE' | 'INACTIVE') => { await updateMultipleAgenciesStatus(selectedAgencies, status); setSelectedAgencies([]); showToast('Status atualizado.', 'success'); };

  // Filter users by type for modal
  const getFilteredUsers = (filterType: 'all' | 'new' | 'active' | 'blocked') => {
    const baseUsers = showUserTrash ? deletedUsers : activeUsers;
    switch (filterType) {
      case 'all':
        return baseUsers;
      case 'new': {
        const thisMonth = new Date();
        thisMonth.setDate(1);
        return baseUsers.filter(u => u.createdAt && new Date(u.createdAt) >= thisMonth);
      }
      case 'active':
        return baseUsers.filter(u => u.status === 'ACTIVE');
      case 'blocked':
        return baseUsers.filter(u => u.status === 'SUSPENDED');
      default:
        return baseUsers;
    }
  };

  const handleUserFilterClick = (filterType: 'all' | 'new' | 'active' | 'blocked') => {
    setUsersFilterModal({ isOpen: true, filterType });
  };

  const handleUserFilterAction = (client: Client, action: string) => {
    switch (action) {
      case 'edit':
        setEditFormData(client);
        setSelectedItem(client);
        setModalType('EDIT_USER');
        setModalTab('PROFILE');
        setUsersFilterModal({ isOpen: false, filterType: null });
        break;
      case 'toggle':
        handleUpdateUserStatus(client.id, client.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
        break;
      case 'delete':
        handleSoftDelete(client.id, 'user');
        break;
      case 'restore':
        handleRestore(client.id, 'user');
        break;
    }
  };

  // Filter agencies by type for modal
  const getFilteredAgencies = (filterType: 'all' | 'premium' | 'pending' | 'active' | 'basic' | 'free') => {
    const baseAgencies = showAgencyTrash ? deletedAgencies : activeAgencies;
    switch (filterType) {
      case 'all':
        return baseAgencies;
      case 'premium':
        return baseAgencies.filter(a => a.subscriptionPlan === 'PREMIUM' && a.subscriptionStatus === 'ACTIVE');
      case 'basic':
        return baseAgencies.filter(a => a.subscriptionPlan === 'BASIC' && a.subscriptionStatus === 'ACTIVE');
      case 'free':
        return baseAgencies.filter(a => (a.subscriptionPlan === 'STARTER' || !a.subscriptionPlan || a.subscriptionPlan === 'FREE') && a.subscriptionStatus === 'ACTIVE');
      case 'pending':
        return baseAgencies.filter(a => a.subscriptionStatus !== 'ACTIVE');
      case 'active':
        return baseAgencies.filter(a => a.subscriptionStatus === 'ACTIVE');
      default:
        return baseAgencies;
    }
  };

  const handleAgencyFilterClick = (filterType: 'all' | 'premium' | 'pending' | 'active' | 'basic' | 'free') => {
    setAgenciesFilterModal({ isOpen: true, filterType });
  };

  const handleAgencyFilterAction = (agency: Agency, action: string) => {
    switch (action) {
      case 'edit':
        setSelectedItem(agency);
        setEditFormData({ name: agency.name, description: agency.description, cnpj: agency.cnpj, slug: agency.slug, phone: agency.phone, whatsapp: agency.whatsapp, website: agency.website, address: agency.address, bankInfo: agency.bankInfo });
        setModalType('EDIT_AGENCY');
        setAgenciesFilterModal({ isOpen: false, filterType: null });
        break;
      case 'plan':
        setSelectedItem(agency);
        setModalType('CHANGE_PLAN');
        setAgenciesFilterModal({ isOpen: false, filterType: null });
        break;
      case 'delete':
        handleSoftDelete(agency.agencyId, 'agency');
        break;
      case 'restore':
        handleRestore(agency.agencyId, 'agency');
        break;
    }
  };

  const handleViewAgencyDetails = async (agency: Agency) => {
    setIsProcessing(true);
    try {
      const stats = await getAgencyStats(agency.agencyId);
      const agencyTrips = trips.filter(t => t.agencyId === agency.agencyId);
      setAgencyDetails({ agency, stats, trips: agencyTrips });
      setModalType('VIEW_AGENCY_DETAILS');
    } catch (error) {
      showToast('Erro ao carregar detalhes da agência', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangePlan = async (agencyId: string, newPlan: 'BASIC' | 'PREMIUM') => {
    setIsProcessing(true);
    try {
      await adminChangePlan(agencyId, newPlan);
      setModalType(null);
    } catch (error) {
      logger.error('Error changing plan:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  const handleViewStats = async () => {
    if (selectedUsers.length === 0) {
      showToast('Selecione pelo menos um usuário para ver as estatísticas.', 'warning');
      return;
    }
    setIsProcessing(true);
    try {
      const stats = await getUsersStats(selectedUsers);
      setUserStats(stats);
      setModalType('VIEW_STATS');
    } catch (error) {
      showToast('Erro ao carregar estatísticas.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && selectedItem) {
        setIsUploadingAvatar(true);
        const newAvatarUrl = await updateUserAvatarByAdmin(selectedItem.id, e.target.files[0]);
        if (newAvatarUrl) {
            setEditFormData({ ...editFormData, avatar: newAvatarUrl });
            setSelectedItem({ ...selectedItem, avatar: newAvatarUrl });
        }
        setIsUploadingAvatar(false);
    }
  };


  const downloadPdf = (type: 'users' | 'agencies') => { const doc = new jsPDF(); doc.setFontSize(18); doc.text(`Relatório de ${type === 'users' ? 'Usuários' : 'Agências'}`, 14, 22); doc.setFontSize(11); doc.setTextColor(100); const headers = type === 'users' ? [["NOME", "EMAIL", "STATUS"]] : [["NOME", "PLANO", "STATUS"]]; const data = type === 'users' ? filteredUsers.filter(u => selectedUsers.includes(u.id)).map(u => [u.name, u.email, u.status]) : filteredAgencies.filter(a => selectedAgencies.includes(a.agencyId)).map(a => [a.name, a.subscriptionPlan, a.subscriptionStatus]); (doc as any).autoTable({ head: headers, body: data, startY: 30, }); doc.save(`relatorio_${type}.pdf`); };

  // Allow access if user is ADMIN or if it's a test admin account (for quick switching)
  const isTestAdmin = user?.email === 'admin@teste.com' || user?.email === 'juannicolas1@gmail.com';
  if (!user || (user.role !== UserRole.ADMIN && !isTestAdmin)) {
    return <div className="min-h-screen flex items-center justify-center">Acesso negado.</div>;
  }

  const renderContent = () => {
    switch(activeTab) {
      case 'OVERVIEW':
        return (
          <div className="space-y-8 animate-[fadeIn_0.3s]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* TAREFA 1: Revenue Chart Card (Replaces static card) */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <TrendingUp size={18} className="text-green-600" />
                      Receita (Últimos 6 Meses)
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">MRR</p>
                      <p className="text-xl font-extrabold text-gray-900">R$ {mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Ticket Médio</p>
                      <p className="text-xl font-extrabold text-gray-900">R$ {averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6b7280" />
                        <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #e5e7eb', 
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                          formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorRevenue)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <StatCard title="Agências Ativas" value={activeAgencies.length} subtitle="Parceiros verificados" icon={Briefcase} color="blue"/>
                <StatCard title="Usuários Ativos" value={activeUsers.length} subtitle="Clientes da plataforma" icon={Users} color="purple"/>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard title="Pacotes Ativos" value={trips.length} subtitle="Viagens disponíveis" icon={Plane} color="amber"/>
                <StatCard title="Receita Total" value={`R$ ${(platformRevenue || 0).toLocaleString()}`} subtitle="Receita bruta acumulada" icon={DollarSign} color="green"/>
            </div>

            {/* TAREFA 3: Approval Queue Widget */}
            {pendingAgencies.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <AlertTriangle size={20} className="text-amber-600" />
                    Atenção Necessária
                  </h3>
                  <Badge color="amber">{pendingAgencies.length} pendente{pendingAgencies.length > 1 ? 's' : ''}</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-4">Agências recém-criadas aguardando verificação:</p>
                <div className="space-y-3">
                  {pendingAgencies.map(agency => (
                    <div key={agency.agencyId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                        <img 
                          src={agency.logo || `https://ui-avatars.com/api/?name=${agency.name}`} 
                          className="w-10 h-10 rounded-full object-cover"
                          alt={agency.name}
                        />
                        <div>
                          <p className="text-sm font-bold text-gray-900">{agency.name}</p>
                          <p className="text-xs text-gray-500">{agency.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedItem(agency);
                            setModalType('CHANGE_PLAN');
                            // In real implementation, this would approve the agency
                            showToast(`Agência ${agency.name} aprovada!`, 'success');
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                          <CheckCircle2Icon size={16} />
                          Aprovar
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Rejeitar agência ${agency.name}?`)) {
                              handleSoftDelete(agency.agencyId, 'agency');
                              showToast(`Agência ${agency.name} rejeitada.`, 'success');
                            }
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors flex items-center gap-2"
                        >
                          <XCircleIcon size={16} />
                          Rejeitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Atividade Recente */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center">
                            <Activity size={20} className="mr-2 text-blue-600"/> 
                            Atividade Recente
                        </h3>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {filteredActivities.length} {filteredActivities.length === 1 ? 'evento' : 'eventos'}
                        </span>
                    </div>
                    
                    {/* Search and Filters */}
                    <div className="mb-4 space-y-2">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar atividades..."
                                value={activitySearch}
                                onChange={(e) => setActivitySearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => setActivityFilter('all')}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                    activityFilter === 'all' 
                                        ? 'bg-primary-600 text-white' 
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                Todas
                            </button>
                            <button
                                onClick={() => setActivityFilter('user')}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                                    activityFilter === 'user' 
                                        ? 'bg-indigo-600 text-white' 
                                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                }`}
                            >
                                <Users size={12} /> Usuários
                            </button>
                            <button
                                onClick={() => setActivityFilter('agency')}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                                    activityFilter === 'agency' 
                                        ? 'bg-purple-600 text-white' 
                                        : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                                }`}
                            >
                                <Building2 size={12} /> Agências
                            </button>
                            <button
                                onClick={() => setActivityFilter('trip')}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                                    activityFilter === 'trip' 
                                        ? 'bg-green-600 text-white' 
                                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                                }`}
                            >
                                <Package size={12} /> Viagens
                            </button>
                            <button
                                onClick={() => setActivityFilter('settings')}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                                    activityFilter === 'settings' 
                                        ? 'bg-gray-600 text-white' 
                                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <Settings size={12} /> Config
                            </button>
                        </div>
                    </div>
                    
                    {filteredActivities.length > 0 ? (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
                            {filteredActivities.slice(0, 20).map(log => {
                                const activityInfo = getActivityInfo(log.action);
                                const Icon = activityInfo.icon;
                                const timeAgo = new Date(log.createdAt);
                                const now = new Date();
                                const diffMs = now.getTime() - timeAgo.getTime();
                                const diffMins = Math.floor(diffMs / 60000);
                                const diffHours = Math.floor(diffMs / 3600000);
                                const diffDays = Math.floor(diffMs / 86400000);
                                
                                let timeLabel = '';
                                if (diffMins < 1) timeLabel = 'Agora';
                                else if (diffMins < 60) timeLabel = `${diffMins}min atrás`;
                                else if (diffHours < 24) timeLabel = `${diffHours}h atrás`;
                                else if (diffDays < 7) timeLabel = `${diffDays}d atrás`;
                                else timeLabel = timeAgo.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

                                // Format action name for better readability
                                const formattedAction = log.action
                                    .replace(/_/g, ' ')
                                    .replace(/\b\w/g, l => l.toUpperCase());

                                return (
                                    <div key={log.id} className={`${activityInfo.bgColor} p-4 rounded-xl border ${activityInfo.borderColor} hover:shadow-md transition-all group cursor-pointer`}>
                                        <div className="flex items-start gap-3">
                                            <div className={`${activityInfo.color} p-2 rounded-lg bg-white border ${activityInfo.borderColor} group-hover:scale-110 transition-transform flex-shrink-0`}>
                                                <Icon size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 line-clamp-1 mb-1">{formattedAction}</p>
                                                <p className="text-xs text-gray-600 line-clamp-2 mb-2">{log.details}</p>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[10px] text-gray-400 font-medium">{timeLabel}</p>
                                                        {log.adminEmail && (
                                                            <span className="text-[10px] text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                                                {log.adminEmail}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-gray-400">{timeAgo.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredActivities.length > 20 && (
                                <div className="text-center pt-2">
                                    <p className="text-xs text-gray-400">
                                        Mostrando 20 de {filteredActivities.length} atividades
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-400">
                            <Activity size={48} className="mx-auto mb-3 opacity-50" />
                            <p className="text-sm font-medium">
                                {activitySearch || activityFilter !== 'all' 
                                    ? 'Nenhuma atividade encontrada' 
                                    : 'Nenhuma atividade recente'}
                            </p>
                            <p className="text-xs mt-1">
                                {activitySearch || activityFilter !== 'all'
                                    ? 'Tente ajustar os filtros ou busca'
                                    : 'As ações do sistema aparecerão aqui'}
                            </p>
                            {(activitySearch || activityFilter !== 'all') && (
                                <button
                                    onClick={() => {
                                        setActivitySearch('');
                                        setActivityFilter('all');
                                    }}
                                    className="mt-3 text-xs text-primary-600 hover:text-primary-700 font-semibold"
                                >
                                    Limpar filtros
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Migrar Dados Mock */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <Database size={20} className="mr-2 text-primary-600"/> 
                        Ferramentas de Dados
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Use para popular seu banco de dados de desenvolvimento com informações de exemplo.
                        <br/><span className="text-red-600 font-semibold">(Não use em produção!)</span>
                    </p>
                    <button 
                        onClick={migrateData} 
                        disabled={isProcessing}
                        className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors mb-4"
                    >
                        {isProcessing ? <Loader size={18} className="animate-spin" /> : <Sparkles size={18}/>} 
                        Migrar Dados Mock
                    </button>
                    
                    <div className="border-t border-gray-200 pt-4 mt-4">
                        <h4 className="text-sm font-bold text-red-600 flex items-center mb-2">
                            <AlertOctagon size={16} className="mr-2"/> 
                            Limpeza de Dados
                        </h4>
                        <p className="text-xs text-gray-500 mb-3">
                            ⚠️ CUIDADO! Estas ações são irreversíveis e APAGAM DADOS DO BANCO.
                        </p>
                        <button 
                            onClick={handleClearAllData}
                            disabled={isProcessing}
                            className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {isProcessing ? <Loader size={18} className="animate-spin" /> : <Trash2 size={18}/>} 
                            Limpar Todos os Dados
                        </button>
                        {isMaster && (
                            <div className="mt-3 space-y-2">
                                <button 
                                    onClick={() => { 
                                        if (window.confirm('⚠️ Excluir TODOS os usuários (clientes)? Esta ação é irreversível!')) {
                                            setIsProcessing(true);
                                            deleteMultipleUsers(clients.filter(c => c.role === UserRole.CLIENT).map(c => c.id))
                                                .then(() => {
                                                    showToast('Todos os usuários foram excluídos.', 'success');
                                                    refreshData();
                                                })
                                                .catch((err) => showToast(`Erro: ${err.message}`, 'error'))
                                                .finally(() => setIsProcessing(false));
                                        }
                                    }} 
                                    disabled={isProcessing}
                                    className="w-full bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100 disabled:opacity-50 transition-colors"
                                >
                                    <UserX size={16} className="inline mr-2"/> Excluir Todos os Usuários
                                </button>
                                <button 
                                    onClick={() => { 
                                        if (window.confirm('⚠️ Excluir TODAS as agências e viagens? Esta ação é irreversível!')) {
                                            setIsProcessing(true);
                                            deleteMultipleAgencies(agencies.map(a => a.agencyId))
                                                .then(() => {
                                                    showToast('Todas as agências foram excluídas.', 'success');
                                                    refreshData();
                                                })
                                                .catch((err) => showToast(`Erro: ${err.message}`, 'error'))
                                                .finally(() => setIsProcessing(false));
                                        }
                                    }} 
                                    disabled={isProcessing}
                                    className="w-full bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100 disabled:opacity-50 transition-colors"
                                >
                                    <Building2 size={16} className="inline mr-2"/> Excluir Todas as Agências
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        );
      case 'USERS':
        return (
          <div className="animate-[fadeIn_0.3s] space-y-6">
            {/* Stats Ribbon */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsRibbonCard 
                title="Total de Usuários" 
                value={userStatsData.totalUsers} 
                icon={Users} 
                iconColor="bg-blue-500"
                onClick={() => handleUserFilterClick('all')}
              />
              <StatsRibbonCard 
                title="Novos este Mês" 
                value={userStatsData.newThisMonth} 
                icon={UserPlus} 
                iconColor="bg-green-500"
                trend="+12% vs mês anterior"
                onClick={() => handleUserFilterClick('new')}
              />
              <StatsRibbonCard 
                title="Ativos Agora" 
                value={userStatsData.activeNow} 
                icon={Activity} 
                iconColor="bg-purple-500"
                onClick={() => handleUserFilterClick('active')}
              />
              <StatsRibbonCard 
                title="Bloqueados" 
                value={userStatsData.blocked} 
                icon={Shield} 
                iconColor="bg-red-500"
                onClick={() => handleUserFilterClick('blocked')}
              />
            </div>

            {/* Bulk Selection Bar */}
            {selectedUsers.length > 0 && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-blue-900">
                    {selectedUsers.length} usuário(s) selecionado(s)
                  </span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleMassUpdateUserStatus('ACTIVE')} 
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                  >
                    Ativar
                  </button>
                  <button 
                    onClick={() => handleMassUpdateUserStatus('SUSPENDED')} 
                    className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors"
                  >
                    Suspender
                  </button>
                  <button 
                    onClick={handleMassDeleteUsers} 
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            )}

            {userView === 'cards' ? (
                <>
                  {/* Select All Checkbox for Card View */}
                  <div className="mb-4 flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <input 
                      type="checkbox" 
                      onChange={handleToggleAllUsers} 
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0} 
                      className="h-5 w-5 rounded text-primary-600 border-gray-300 focus:ring-primary-500 cursor-pointer"
                    />
                    <label className="text-sm font-bold text-gray-700 cursor-pointer">
                      Selecionar Todos ({selectedUsers.length}/{filteredUsers.length})
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredUsers.map(c => (
                      <div key={c.id} className={`bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-lg hover:shadow-2xl border-2 ${selectedUsers.includes(c.id) ? 'border-primary-500 ring-4 ring-primary-200 bg-gradient-to-br from-primary-50 to-white' : 'border-gray-200'} p-6 transition-all relative group overflow-hidden`}>
                        {/* Premium gradient overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/0 to-secondary-500/0 group-hover:from-primary-500/5 group-hover:to-secondary-500/5 transition-all duration-300 pointer-events-none"></div>
                        
                        <input 
                          type="checkbox" 
                          checked={selectedUsers.includes(c.id)} 
                          onChange={(e) => { e.stopPropagation(); handleToggleUser(c.id); }} 
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-5 left-5 h-6 w-6 rounded-md text-primary-600 border-2 border-gray-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 cursor-pointer z-10 shadow-md hover:scale-110 transition-transform"
                        />
                        <div className="absolute top-5 right-5 z-10 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {showUserTrash ? (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRestore(c.id, 'user'); }}
                                className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors bg-white shadow-sm"
                                title="Restaurar"
                              >
                                <ArchiveRestore size={16} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handlePermanentDelete(c.id, c.role); }}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors bg-white shadow-sm"
                                title="Excluir Permanentemente"
                              >
                                <Trash size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditFormData(c); setSelectedItem(c); setModalType('EDIT_USER'); setModalTab('PROFILE'); }}
                                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors bg-white shadow-sm"
                                title="Editar Dados"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleUserStatusToggle(c); }}
                                className={`p-2 rounded-lg transition-colors bg-white shadow-sm ${
                                  c.status === 'ACTIVE' 
                                    ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50' 
                                    : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                }`}
                                title={c.status === 'ACTIVE' ? 'Suspender' : 'Reativar'}
                              >
                                {c.status === 'ACTIVE' ? <Ban size={16} /> : <UserCheck size={16} />}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleSoftDelete(c.id, 'user'); }}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors bg-white shadow-sm"
                                title="Mover para Lixeira"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                        <div className="flex flex-col items-center text-center pt-4 relative z-0">
                          <div className="relative mb-4">
                            <img 
                              src={c.avatar || `https://ui-avatars.com/api/?name=${c.name}`} 
                              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl ring-4 ring-primary-100 group-hover:ring-primary-300 transition-all group-hover:scale-105" 
                              alt=""
                            />
                            {c.status === 'ACTIVE' && (
                              <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-4 border-white shadow-lg"></div>
                            )}
                          </div>
                          <p className="font-extrabold text-gray-900 text-xl mb-1 group-hover:text-primary-600 transition-colors">{c.name}</p>
                          <p className="text-sm text-gray-500 mb-4 font-medium">{c.email}</p>
                          <Badge color={c.status === 'ACTIVE' ? 'green' : 'red'}>
                            {c.status === 'SUSPENDED' ? 'SUSPENSO' : 'ATIVO'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="w-12 px-6 py-4">
                              <input 
                                type="checkbox" 
                                onChange={handleToggleAllUsers} 
                                checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0} 
                                className="h-4 w-4 rounded text-primary-600 border-gray-300 focus:ring-primary-500 cursor-pointer"
                              />
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuário</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {filteredUsers.map(c => (
                              <tr 
                                key={c.id} 
                                className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                onClick={() => {
                                  setClientDetailModal({ isOpen: true, client: c });
                                }}
                              >
                                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                  <input 
                                    type="checkbox" 
                                    checked={selectedUsers.includes(c.id)} 
                                    onChange={(e) => { e.stopPropagation(); handleToggleUser(c.id); }} 
                                    className="h-4 w-4 rounded text-primary-600 border-gray-300 focus:ring-primary-500 cursor-pointer"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-4">
                                    <img 
                                      src={c.avatar || `https://ui-avatars.com/api/?name=${c.name}`} 
                                      className="w-10 h-10 rounded-full ring-2 ring-gray-200" 
                                      alt=""
                                    />
                                    <div>
                                      <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                                      <p className="text-xs text-gray-500 mt-0.5">{c.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                    c.status === 'ACTIVE' 
                                      ? 'bg-green-50 text-green-700' 
                                      : 'bg-red-50 text-red-700'
                                  }`}>
                                    {c.status === 'SUSPENDED' ? 'SUSPENSO' : 'ATIVO'}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex justify-end items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    {showUserTrash ? (
                                      <>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleRestore(c.id, 'user'); }}
                                          className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                                          title="Restaurar"
                                        >
                                          <ArchiveRestore size={18} />
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handlePermanentDelete(c.id, c.role); }}
                                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                          title="Excluir Permanentemente"
                                        >
                                          <Trash size={18} />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setEditFormData(c); setSelectedItem(c); setModalType('EDIT_USER'); setModalTab('PROFILE'); }}
                                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                          title="Editar Detalhes"
                                        >
                                          <Edit3 size={18} />
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleUpdateUserStatus(c.id, c.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'); }}
                                          className={`p-2 rounded-lg transition-colors ${
                                            c.status === 'ACTIVE' 
                                              ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50' 
                                              : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                          }`}
                                          title={c.status === 'ACTIVE' ? 'Suspender' : 'Ativar'}
                                        >
                                          {c.status === 'ACTIVE' ? <Ban size={18} /> : <UserCheck size={18} />}
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleSoftDelete(c.id, 'user'); }}
                                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                          title="Excluir"
                                        >
                                          <Trash2 size={18} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Detail Drawer */}
            <DetailDrawer
              isOpen={drawerOpen && drawerType === 'user'}
              onClose={() => { setDrawerOpen(false); setDrawerItem(null); }}
              item={drawerItem as Client}
              type="user"
              onEdit={() => {
                if (drawerItem) {
                  setEditFormData(drawerItem);
                  setSelectedItem(drawerItem);
                  setModalType('EDIT_USER');
                  setModalTab('PROFILE');
                  setDrawerOpen(false);
                }
              }}
              onDelete={() => {
                if (drawerItem) {
                  handleSoftDelete((drawerItem as Client).id, 'user');
                  setDrawerOpen(false);
                }
              }}
              onRestore={showUserTrash ? () => {
                if (drawerItem) {
                  handleRestore((drawerItem as Client).id, 'user');
                  setDrawerOpen(false);
                }
              } : undefined}
              onSuspend={() => {
                if (drawerItem) {
                  handleUserStatusToggle(drawerItem as Client);
                  setDrawerOpen(false);
                }
              }}
            />
          </div>
        );
      case 'AGENCIES':
        return (
          <div className="animate-[fadeIn_0.3s] space-y-6">
            {/* Stats Ribbon with Export Button */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-extrabold text-gray-900">Estatísticas de Agências</h2>
              <button
                onClick={() => generateAgenciesReportPDF()}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg font-semibold hover:from-primary-700 hover:to-secondary-700 transition-all shadow-lg hover:shadow-xl"
                title="Exportar Relatório em PDF"
              >
                <Download size={18} />
                Exportar PDF
              </button>
            </div>
            
            <div className="space-y-4">
              {/* First Row: Main Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsRibbonCard 
                  title="Total de Agências" 
                  value={agencyStatsData.totalAgencies} 
                  icon={Briefcase} 
                  iconColor="bg-blue-500"
                  onClick={() => handleAgencyFilterClick('all')}
                />
                <StatsRibbonCard 
                  title="Receita Estimada" 
                  value={`R$ ${agencyStatsData.estimatedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                  icon={DollarSign} 
                  iconColor="bg-green-500"
                  onClick={() => handleAgencyFilterClick('active')}
                />
                <StatsRibbonCard 
                  title="Agências Pendentes" 
                  value={agencyStatsData.pending} 
                  icon={AlertCircle} 
                  iconColor="bg-amber-500"
                  onClick={() => handleAgencyFilterClick('pending')}
                />
                <StatsRibbonCard 
                  title="Total Ativas" 
                  value={activeAgencies.filter(a => a.subscriptionStatus === 'ACTIVE').length} 
                  icon={CheckCircle} 
                  iconColor="bg-emerald-500"
                  onClick={() => handleAgencyFilterClick('active')}
                />
              </div>
              
              {/* Second Row: Plan Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsRibbonCard 
                  title="Planos Premium (PM)" 
                  value={agencyStatsData.premiumPlans} 
                  icon={Star} 
                  iconColor="bg-gradient-to-br from-purple-500 to-purple-600"
                  onClick={() => handleAgencyFilterClick('premium')}
                />
                <StatsRibbonCard 
                  title="Planos Básicos (PB)" 
                  value={agencyStatsData.basicPlans} 
                  icon={CreditCard} 
                  iconColor="bg-gradient-to-br from-blue-500 to-blue-600"
                  onClick={() => handleAgencyFilterClick('basic')}
                />
                <StatsRibbonCard 
                  title="Planos Gratuitos (FREE)" 
                  value={agencyStatsData.freePlans} 
                  icon={Gift} 
                  iconColor="bg-gradient-to-br from-gray-500 to-gray-600"
                  onClick={() => handleAgencyFilterClick('free')}
                />
              </div>
            </div>

            {/* Bulk Selection Bar */}
            {selectedAgencies.length > 0 && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-blue-900">
                    {selectedAgencies.length} agência(s) selecionada(s)
                  </span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleMassUpdateAgencyStatus('ACTIVE')} 
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                  >
                    Ativar
                  </button>
                  <button 
                    onClick={() => handleMassUpdateAgencyStatus('INACTIVE')} 
                    className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors"
                  >
                    Inativar
                  </button>
                  <button 
                    onClick={handleMassDeleteAgencies} 
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            )}

            {agencyView === 'cards' ? (
              <>
                {/* Select All Checkbox for Card View */}
                <div className="mb-4 flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <input 
                    type="checkbox" 
                    onChange={handleToggleAllAgencies} 
                    checked={selectedAgencies.length === filteredAgencies.length && filteredAgencies.length > 0} 
                    className="h-5 w-5 rounded text-primary-600 border-gray-300 focus:ring-primary-500 cursor-pointer"
                  />
                  <label className="text-sm font-bold text-gray-700 cursor-pointer">
                    Selecionar Todas ({selectedAgencies.length}/{filteredAgencies.length})
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredAgencies.map(agency => { 
                    const daysLeft = Math.round((new Date(agency.subscriptionExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)); 
                    return (
                      <div key={agency.id} className={`bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-lg hover:shadow-2xl border-2 ${selectedAgencies.includes(agency.agencyId) ? 'border-primary-500 ring-4 ring-primary-200 bg-gradient-to-br from-primary-50 to-white' : 'border-gray-200'} p-6 transition-all relative group overflow-hidden`}>
                        {/* Premium gradient overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/0 to-secondary-500/0 group-hover:from-primary-500/5 group-hover:to-secondary-500/5 transition-all duration-300 pointer-events-none"></div>
                        
                        <input 
                          type="checkbox" 
                          checked={selectedAgencies.includes(agency.agencyId)} 
                          onChange={(e) => { e.stopPropagation(); handleToggleAgency(agency.agencyId); }} 
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-5 left-5 h-6 w-6 rounded-md text-primary-600 border-2 border-gray-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 cursor-pointer z-10 shadow-md hover:scale-110 transition-transform"
                        />
                        <div className="absolute top-5 right-5 z-10 flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          {showAgencyTrash ? (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRestore(agency.agencyId, 'agency'); }}
                                className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors bg-white shadow-sm"
                                title="Restaurar"
                              >
                                <ArchiveRestore size={16} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handlePermanentDelete(agency.id, agency.role); }}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors bg-white shadow-sm"
                                title="Excluir Permanentemente"
                              >
                                <Trash size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleViewAgencyDetails(agency); }}
                                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors bg-white shadow-sm"
                                title="Ver Detalhes"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedItem(agency); setEditFormData({ name: agency.name, description: agency.description, cnpj: agency.cnpj, slug: agency.slug, phone: agency.phone, whatsapp: agency.whatsapp, website: agency.website, address: agency.address, bankInfo: agency.bankInfo }); setModalType('EDIT_AGENCY'); }}
                                className="p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors bg-white shadow-sm"
                                title="Editar Dados"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedItem(agency); setModalType('CHANGE_PLAN'); }}
                                className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors bg-white shadow-sm"
                                title="Mudar Plano"
                              >
                                <CreditCard size={16} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); adminSuspendAgency(agency.agencyId); }}
                                className={`p-2 rounded-lg transition-colors bg-white shadow-sm ${
                                  agency.subscriptionStatus === 'ACTIVE' 
                                    ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50' 
                                    : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                }`}
                                title={agency.subscriptionStatus === 'ACTIVE' ? 'Suspender' : 'Reativar'}
                              >
                                {agency.subscriptionStatus === 'ACTIVE' ? <Ban size={16} /> : <CheckCircle size={16} />}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); window.open(`/#/${agency.slug}`, '_blank'); }}
                                className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors bg-white shadow-sm"
                                title="Ver Perfil"
                              >
                                <ExternalLink size={16} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleSoftDelete(agency.agencyId, 'agency'); }}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors bg-white shadow-sm"
                                title="Arquivar"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                        <div className="flex flex-col items-center text-center pt-4 relative z-0">
                          <div className="relative mb-4">
                            <img 
                              src={agency.logo || `https://ui-avatars.com/api/?name=${agency.name}`} 
                              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl ring-4 ring-primary-100 group-hover:ring-primary-300 transition-all group-hover:scale-105" 
                              alt=""
                            />
                            {agency.subscriptionStatus === 'ACTIVE' && (
                              <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-4 border-white shadow-lg"></div>
                            )}
                          </div>
                          <p className="font-extrabold text-gray-900 text-xl mb-1 group-hover:text-primary-600 transition-colors">{agency.name}</p>
                          <p className="text-sm text-gray-500 mb-3 font-mono font-medium">{`/${agency.slug}`}</p>
                          <div className="flex items-center gap-2 mb-3">
                            <Badge color={agency.subscriptionPlan === 'PREMIUM' ? 'purple' : 'gray'}>{agency.subscriptionPlan}</Badge>
                            <Badge color={agency.subscriptionStatus === 'ACTIVE' ? 'green' : 'red'}>{agency.subscriptionStatus === 'ACTIVE' ? 'Ativo' : 'Inativo'}</Badge>
                          </div>
                          <p className={`text-xs font-mono font-bold ${daysLeft < 30 && daysLeft > 0 ? 'text-amber-600' : daysLeft <= 0 ? 'text-red-500' : 'text-gray-500'}`}>
                            {daysLeft > 0 ? `Expira em ${daysLeft} dias` : 'Expirado'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="w-12 px-6 py-4">
                              <input 
                                type="checkbox" 
                                onChange={handleToggleAllAgencies} 
                                checked={selectedAgencies.length === filteredAgencies.length && filteredAgencies.length > 0} 
                                className="h-4 w-4 rounded text-primary-600 border-gray-300 focus:ring-primary-500 cursor-pointer"
                              />
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Agência</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plano</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Dias Restantes</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendas</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {filteredAgencies.map(agency => { 
                              const daysLeft = Math.round((new Date(agency.subscriptionExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                              const agencyBookings = bookings.filter(b => {
                                const trip = trips.find(t => t.id === b.tripId);
                                return trip && trip.agencyId === agency.agencyId;
                              });
                              const totalSales = agencyBookings.reduce((sum, b) => sum + b.totalPrice, 0);
                              const createdAt = agency.createdAt ? new Date(agency.createdAt).toLocaleDateString('pt-BR') : 'N/A';
                              
                              return (
                                <tr 
                                  key={agency.id} 
                                  className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                  onClick={() => {
                                    setAgencyDetailModal({ isOpen: true, agency });
                                  }}
                                >
                                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                    <input 
                                      type="checkbox" 
                                      checked={selectedAgencies.includes(agency.agencyId)} 
                                      onChange={(e) => { e.stopPropagation(); handleToggleAgency(agency.agencyId); }} 
                                      className="h-4 w-4 rounded text-primary-600 border-gray-300 focus:ring-primary-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                      <img 
                                        src={agency.logo || `https://ui-avatars.com/api/?name=${agency.name}`} 
                                        className="w-10 h-10 rounded-full ring-2 ring-gray-200" 
                                        alt=""
                                      />
                                      <div>
                                        <p className="font-semibold text-gray-900 text-sm">{agency.name}</p>
                                        <p className="text-xs text-gray-500 mt-0.5 font-mono">/{agency.slug}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                      agency.subscriptionStatus === 'ACTIVE' 
                                        ? 'bg-green-50 text-green-700' 
                                        : 'bg-red-50 text-red-700'
                                    }`}>
                                      {agency.subscriptionStatus === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    {agency.subscriptionPlan === 'PREMIUM' ? (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                                        PREMIUM
                                      </span>
                                    ) : agency.subscriptionPlan === 'BASIC' ? (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500 text-white">
                                        BASIC
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
                                        STARTER
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    {agency.subscriptionExpiresAt ? (() => {
                                      const expiryDate = new Date(agency.subscriptionExpiresAt);
                                      const now = new Date();
                                      const diffTime = expiryDate.getTime() - now.getTime();
                                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                      
                                      if (diffDays < 0) {
                                        return (
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
                                            <XCircle size={12} className="mr-1" />
                                            Expirado
                                          </span>
                                        );
                                      } else if (diffDays <= 7) {
                                        return (
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
                                            <AlertCircle size={12} className="mr-1" />
                                            {diffDays} {diffDays === 1 ? 'dia' : 'dias'}
                                          </span>
                                        );
                                      } else if (diffDays <= 30) {
                                        return (
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-300">
                                            <AlertCircle size={12} className="mr-1" />
                                            {diffDays} {diffDays === 1 ? 'dia' : 'dias'}
                                          </span>
                                        );
                                      } else {
                                        return (
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-300">
                                            <CheckCircle size={12} className="mr-1" />
                                            {diffDays} {diffDays === 1 ? 'dia' : 'dias'}
                                          </span>
                                        );
                                      }
                                    })() : (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-300">
                                        N/A
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    <p className="text-sm font-semibold text-gray-900">
                                      R$ {totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex justify-end items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                      {showAgencyTrash ? (
                                        <>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleRestore(agency.agencyId, 'agency'); }}
                                            className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                                            title="Restaurar"
                                          >
                                            <ArchiveRestore size={18} />
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handlePermanentDelete(agency.id, agency.role); }}
                                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Excluir Permanentemente"
                                          >
                                            <Trash size={18} />
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedItem(agency); setEditFormData({ name: agency.name, description: agency.description, cnpj: agency.cnpj, slug: agency.slug, phone: agency.phone, whatsapp: agency.whatsapp, website: agency.website, address: agency.address, bankInfo: agency.bankInfo }); setModalType('EDIT_AGENCY'); }}
                                            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Editar Detalhes"
                                          >
                                            <Edit3 size={18} />
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedItem(agency); setModalType('CHANGE_PLAN'); }}
                                            className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                                            title="Mudar Plano"
                                          >
                                            <CreditCard size={18} />
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleSoftDelete(agency.agencyId, 'agency'); }}
                                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Excluir"
                                          >
                                            <Trash2 size={18} />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Detail Drawer */}
            <DetailDrawer
              isOpen={drawerOpen && drawerType === 'agency'}
              onClose={() => { setDrawerOpen(false); setDrawerItem(null); }}
              item={drawerItem as Agency}
              type="agency"
              onEdit={() => {
                if (drawerItem) {
                  const agency = drawerItem as Agency;
                  setSelectedItem(agency);
                  setEditFormData({ name: agency.name, description: agency.description, cnpj: agency.cnpj, slug: agency.slug, phone: agency.phone, whatsapp: agency.whatsapp, website: agency.website, address: agency.address, bankInfo: agency.bankInfo });
                  setModalType('EDIT_AGENCY');
                  setDrawerOpen(false);
                }
              }}
              onDelete={() => {
                if (drawerItem) {
                  handleSoftDelete((drawerItem as Agency).agencyId, 'agency');
                  setDrawerOpen(false);
                }
              }}
              onRestore={showAgencyTrash ? () => {
                if (drawerItem) {
                  handleRestore((drawerItem as Agency).agencyId, 'agency');
                  setDrawerOpen(false);
                }
              } : undefined}
              onSuspend={() => {
                if (drawerItem) {
                  adminSuspendAgency((drawerItem as Agency).agencyId);
                  setDrawerOpen(false);
                }
              }}
            />
          </div>
        );
      case 'TRIPS':
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto animate-[fadeIn_0.3s]">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Pacote</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Agência</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Preço</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Destaque</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Performance</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {filteredTrips.map(trip => {
                            const agency = agencies.find(a => a.agencyId === trip.agencyId);
                            return (
                                <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                <img src={trip.images[0] || 'https://placehold.co/100x100/e2e8f0/e2e8f0'} className="w-full h-full object-cover" alt={trip.title} />
                                            </div>
                                            <div className="truncate">
                                                <p className="font-bold text-gray-900 text-sm line-clamp-1 max-w-[200px]">{trip.title}</p>
                                                <p className="text-xs text-gray-500">{trip.destination}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">
                                        {agency ? (
                                            <Link to={`/#/${agency.slug}`} target="_blank" className="flex items-center hover:underline max-w-[150px] truncate">
                                                {agency.name} <ExternalLink size={10} className="ml-1 flex-shrink-0" />
                                            </Link>
                                        ) : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-700">R$ {trip.price.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <Badge color={trip.is_active ? 'green' : 'gray'}>{trip.is_active ? 'ATIVO' : 'INATIVO'}</Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge color={trip.featured ? 'amber' : 'gray'}>{trip.featured ? 'SIM' : 'NÃO'}</Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                                            <div className="flex items-center" title="Visualizações"><Eye size={14} className="mr-1.5 text-blue-400"/> {trip.views || 0}</div>
                                            <div className="flex items-center" title="Vendas"><ShoppingBag size={14} className="mr-1.5 text-green-500"/> {trip.sales || 0}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <button
                                                onClick={() => { setSelectedItem(trip); setEditFormData(trip); setModalType('EDIT_TRIP'); }}
                                                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Edit3 size={18} />
                                            </button>
                                            <button
                                                onClick={() => toggleTripStatus(trip.id)}
                                                className={`p-2 rounded-lg transition-colors ${
                                                    trip.is_active 
                                                        ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50' 
                                                        : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                                }`}
                                                title={trip.is_active ? 'Pausar' : 'Publicar'}
                                            >
                                                {trip.is_active ? <PauseCircle size={18} /> : <PlayCircle size={18} />}
                                            </button>
                                            <button
                                                onClick={() => toggleTripFeatureStatus(trip.id)}
                                                className={`p-2 rounded-lg transition-colors ${
                                                    trip.featured 
                                                        ? 'text-purple-600 hover:text-purple-700 hover:bg-purple-50' 
                                                        : 'text-gray-600 hover:text-gray-700 hover:bg-gray-50'
                                                }`}
                                                title={trip.featured ? 'Remover Destaque' : 'Destacar'}
                                            >
                                                <Sparkles size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTrip(trip.id)}
                                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
      case 'REVIEWS':
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto animate-[fadeIn_0.3s]">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Agência</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Pacote</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Avaliação</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {filteredReviews.map(review => (
                            <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-bold text-gray-900">{review.agencyName}</td>
                                <td className="px-6 py-4 text-sm text-gray-700">{review.clientName}</td>
                                <td className="px-6 py-4 text-sm text-gray-700">{review.tripTitle || 'N/A'}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={14} className={i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
                                        ))}
                                        <span className="text-xs text-gray-500">({review.rating})</span>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{review.comment}</p>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end items-center gap-2">
                                        <button
                                            onClick={() => { setSelectedItem(review); setEditFormData(review); setModalType('EDIT_REVIEW'); }}
                                            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Editar"
                                        >
                                            <Edit3 size={18} />
                                        </button>
                                        <button
                                            onClick={() => deleteAgencyReview(review.id)}
                                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
      case 'GUIDES':
        return (
          <div className="animate-[fadeIn_0.3s] space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-1">Total de Guias</p>
                    <p className="text-3xl font-extrabold text-gray-900">{allGuides.length}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <BookOpen size={24} className="text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-1">Guias Ativos</p>
                    <p className="text-3xl font-extrabold text-gray-900">
                      {allGuides.filter(g => g.subscriptionStatus === 'ACTIVE').length}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-xl">
                    <CheckCircle size={24} className="text-green-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-1">Guias Premium</p>
                    <p className="text-3xl font-extrabold text-gray-900">
                      {allGuides.filter(g => g.subscriptionPlan === 'PREMIUM').length}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <Star size={24} className="text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="relative">
                <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar guias por nome, email, cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Guides Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Guia</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Localização</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Plano</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredGuides.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <BookOpen size={48} className="mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-500 font-medium">Nenhum guia encontrado</p>
                        <p className="text-sm text-gray-400 mt-1">
                          {searchTerm ? 'Tente ajustar sua busca' : 'Não há guias cadastrados no sistema'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredGuides.map(guide => (
                      <tr key={guide.agencyId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={guide.logo || `https://ui-avatars.com/api/?name=${guide.name}`} 
                              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                              alt={guide.name}
                            />
                            <div>
                              <p className="text-sm font-bold text-gray-900">{guide.name}</p>
                              <p className="text-xs text-gray-500">{guide.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {guide.address?.city && guide.address?.state 
                            ? `${guide.address.city}, ${guide.address.state}`
                            : guide.address?.city || guide.address?.state || 'Não informado'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            guide.subscriptionPlan === 'PREMIUM' 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {guide.subscriptionPlan === 'PREMIUM' ? 'Premium' : 'Basic'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            guide.subscriptionStatus === 'ACTIVE' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {guide.subscriptionStatus === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <button
                              onClick={() => window.open(`/#/${guide.slug}`, '_blank')}
                              className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ver Perfil"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => { setSelectedItem(guide); setEditFormData({ name: guide.name, description: guide.description, email: guide.email, phone: guide.phone, whatsapp: guide.whatsapp, address: guide.address }); setModalType('EDIT_AGENCY'); }}
                              className="p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit3 size={18} />
                            </button>
                            <button
                              onClick={() => handleSoftDelete(guide.agencyId, 'agency')}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Arquivar"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'AUDIT_LOGS':
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-[fadeIn_0.3s]">
            <div className="bg-gray-900 text-white px-6 py-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Lock size={20} />
                  Logs de Auditoria do Sistema
                </h2>
                <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                  {enhancedAuditLogs.length} registros
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 font-mono text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Data/Hora</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Ator</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Ação</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Alvo</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">IP</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {enhancedAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        Nenhum log de auditoria encontrado
                      </td>
                    </tr>
                  ) : (
                    enhancedAuditLogs.map((log: any) => {
                      const date = new Date(log.createdAt);
                      const severityColor = 
                        log.severity === 'high' ? 'text-red-600 bg-red-50 border-red-200' :
                        log.severity === 'medium' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                        'text-blue-600 bg-blue-50 border-blue-200';
                      
                      return (
                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-900">
                            <div className="flex flex-col">
                              <span className="font-semibold">{date.toLocaleDateString('pt-BR')}</span>
                              <span className="text-gray-500">{date.toLocaleTimeString('pt-BR')}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-gray-900 font-semibold">{log.adminEmail || 'Sistema'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded border font-semibold ${severityColor}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-gray-600 bg-gray-100 px-2 py-1 rounded text-[10px]">
                              {log.targetId}
                            </code>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-gray-600 bg-gray-100 px-2 py-1 rounded text-[10px]">
                              {log.ip}
                            </code>
                          </td>
                          <td className="px-4 py-3 text-gray-600 max-w-md">
                            <p className="truncate" title={log.details}>{log.details}</p>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'GLOBAL_SETTINGS':
        return (
            <div className="animate-[fadeIn_0.3s] space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <h2 className="text-2xl font-extrabold text-gray-900 mb-6 flex items-center gap-3">
                        <Shield size={24} className="text-primary-600" />
                        Configurações Globais da Plataforma
                    </h2>
                    <p className="text-gray-600 mb-8">Personalize o nome e logo da plataforma. As alterações serão aplicadas em todo o sistema.</p>
                    
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        setIsProcessing(true);
                        try {
                            await updatePlatformSettings(platformSettingsForm);
                            showToast('Configurações salvas com sucesso!', 'success');
                        } catch (error: any) {
                            showToast(`Erro ao salvar: ${error.message}`, 'error');
                        } finally {
                            setIsProcessing(false);
                        }
                    }} className="space-y-8">
                        {/* Identidade */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-3">Identidade da Plataforma</h3>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Nome da Plataforma
                                </label>
                                <input
                                    type="text"
                                    value={platformSettingsForm.platform_name}
                                    onChange={(e) => setPlatformSettingsForm({ ...platformSettingsForm, platform_name: e.target.value })}
                                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                    placeholder="ViajaStore"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-2">Este nome aparecerá no header, footer e título da página.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Logo Principal
                                </label>
                                <div className="flex items-start gap-4">
                                    {logoPreview ? (
                                        <div className="relative">
                                            <img 
                                                src={logoPreview} 
                                                alt="Logo" 
                                                className="w-32 h-32 object-contain border-2 border-gray-200 rounded-xl p-2 bg-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setLogoPreview('');
                                                    setPlatformSettingsForm({ ...platformSettingsForm, platform_logo_url: '' });
                                                }}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50">
                                            <Upload size={32} className="text-gray-400" />
                                        </div>
                                    )}
                                    <div className="flex-1 space-y-2">
                                        <label className="block">
                                            <input
                                                type="file"
                                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    
                                                    setIsUploadingLogo(true);
                                                    try {
                                                        const url = await uploadPlatformLogo(file);
                                                        if (url) {
                                                            setLogoPreview(url);
                                                            setPlatformSettingsForm({ ...platformSettingsForm, platform_logo_url: url });
                                                            showToast('Logo enviado com sucesso!', 'success');
                                                        }
                                                    } catch (error: any) {
                                                        showToast(`Erro ao fazer upload: ${error.message}`, 'error');
                                                    } finally {
                                                        setIsUploadingLogo(false);
                                                        e.target.value = '';
                                                    }
                                                }}
                                                className="hidden"
                                                disabled={isUploadingLogo}
                                            />
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    disabled={isUploadingLogo}
                                                    onClick={() => document.querySelector('input[type="file"]')?.click()}
                                                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isUploadingLogo ? (
                                                        <>
                                                            <Loader size={16} className="animate-spin" />
                                                            Enviando...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload size={16} />
                                                            Enviar Logo
                                                        </>
                                                    )}
                                                </button>
                                                {logoPreview && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setLogoPreview('');
                                                            setPlatformSettingsForm({ ...platformSettingsForm, platform_logo_url: '' });
                                                        }}
                                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                                                    >
                                                        Remover
                                                    </button>
                                                )}
                                            </div>
                                        </label>
                                        <p className="text-xs text-gray-500">Formato: PNG, JPG ou WEBP. Tamanho máximo: 5MB. Recomendado: PNG com fundo transparente, mínimo 200x200px</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Personalização de Layout */}
                        <div className="space-y-6 pt-6 border-t border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-3">Personalização de Layout</h3>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Estilo de Layout
                                </label>
                                <div className="grid grid-cols-3 gap-4">
                                    {(['rounded', 'square', 'minimal'] as const).map((style) => (
                                        <button
                                            key={style}
                                            type="button"
                                            onClick={() => setPlatformSettingsForm({ ...platformSettingsForm, layout_style: style })}
                                            className={`p-4 border-2 rounded-xl transition-all ${
                                                platformSettingsForm.layout_style === style
                                                    ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-200'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <div className={`w-full h-16 mb-2 ${
                                                style === 'rounded' ? 'rounded-2xl' : 
                                                style === 'square' ? 'rounded-none' : 
                                                'rounded-sm'
                                            } bg-gradient-to-br from-primary-400 to-secondary-400`}></div>
                                            <p className="text-xs font-semibold text-gray-700 capitalize">{style === 'rounded' ? 'Arredondado' : style === 'square' ? 'Quadrado' : 'Minimal'}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Cor de Fundo
                                </label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="color"
                                        value={platformSettingsForm.background_color}
                                        onChange={(e) => setPlatformSettingsForm({ ...platformSettingsForm, background_color: e.target.value })}
                                        className="w-16 h-16 rounded-lg border-2 border-gray-300 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={platformSettingsForm.background_color}
                                        onChange={(e) => setPlatformSettingsForm({ ...platformSettingsForm, background_color: e.target.value })}
                                        className="flex-1 border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 font-mono text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                                        placeholder="#ffffff"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-1">
                                        Efeito Blur no Fundo
                                    </label>
                                    <p className="text-xs text-gray-600">Aplica um efeito de desfoque no fundo da plataforma.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={platformSettingsForm.background_blur}
                                        onChange={(e) => setPlatformSettingsForm({ ...platformSettingsForm, background_blur: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-600"></div>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Transparência do Fundo: {Math.round(platformSettingsForm.background_transparency * 100)}%
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={platformSettingsForm.background_transparency}
                                    onChange={(e) => setPlatformSettingsForm({ ...platformSettingsForm, background_transparency: parseFloat(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>0% (Transparente)</span>
                                    <span>100% (Opaco)</span>
                                </div>
                            </div>
                        </div>

                        {/* Sistema */}
                        <div className="space-y-6 pt-6 border-t border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-3">Sistema</h3>
                            
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-1">
                                        Modo Manutenção
                                    </label>
                                    <p className="text-xs text-gray-600">Bloqueia o acesso público à plataforma. Apenas administradores poderão acessar.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={platformSettingsForm.maintenance_mode}
                                        onChange={(e) => setPlatformSettingsForm({ ...platformSettingsForm, maintenance_mode: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-600"></div>
                                </label>
                            </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={async () => {
                                    if (window.confirm('Tem certeza que deseja restaurar todas as configurações para o padrão? Esta ação não pode ser desfeita.')) {
                                        setIsProcessing(true);
                                        try {
                                            await restoreDefaultSettings();
                                        } catch (error: any) {
                                            showToast(`Erro ao restaurar: ${error.message}`, 'error');
                                        } finally {
                                            setIsProcessing(false);
                                        }
                                    }
                                }}
                                disabled={isProcessing}
                                className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <RefreshCw size={18} />
                                Restaurar Padrão
                            </button>
                            <button
                                type="submit"
                                disabled={isProcessing}
                                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-xl font-extrabold hover:from-primary-700 hover:to-secondary-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader size={18} className="animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        Salvar Configurações Globais
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
      case 'SETTINGS':
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Configurações de Tema</h2>
                <p className="text-gray-600 mb-8">Personalize a aparência da plataforma. O tema ativo será aplicado para todos os usuários.</p>
                
                {/* Add New Theme Form */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 mb-8">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Adicionar Novo Tema</h3>
                  <form onSubmit={handleAddTheme} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Nome do Tema</label>
                          <input value={newThemeForm.name} onChange={e => setNewThemeForm({ ...newThemeForm, name: e.target.value })} className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required placeholder="Ex: Verão Vibrante"/>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Cor Primária</label>
                          <div className="flex gap-2 items-center">
                              <input type="color" value={newThemeForm.primary} onChange={e => setNewThemeForm({ ...newThemeForm, primary: e.target.value })} className="w-10 h-10 rounded-lg border cursor-pointer" />
                              <input value={newThemeForm.primary} onChange={e => setNewThemeForm({ ...newThemeForm, primary: e.target.value })} className="flex-1 border p-2.5 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 outline-none" />
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Cor Secundária</label>
                          <div className="flex gap-2 items-center">
                              <input type="color" value={newThemeForm.secondary} onChange={e => setNewThemeForm({ ...newThemeForm, secondary: e.target.value })} className="w-10 h-10 rounded-lg border cursor-pointer" />
                              <input value={newThemeForm.secondary} onChange={e => setNewThemeForm({ ...newThemeForm, secondary: e.target.value })} className="flex-1 border p-2.5 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 outline-none" />
                          </div>
                      </div>
                      <div className="md:col-span-3">
                          <button type="submit" disabled={isThemeProcessing} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                              {isThemeProcessing ? <Loader size={18} className="animate-spin" /> : <Palette size={18}/>} Adicionar Tema
                          </button>
                      </div>
                  </form>
                </div>

                {/* Theme List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {themes.map(theme => (
                        <div key={theme.id} className={`bg-white p-6 rounded-2xl shadow-sm border ${activeTheme.id === theme.id ? 'border-primary-600 ring-2 ring-primary-200' : 'border-gray-100'} relative transition-all`}>
                            <h3 className="font-bold text-gray-900 text-lg mb-3 truncate" title={theme.name}>{theme.name}</h3>
                            <div className="flex gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full shadow border" style={{ backgroundColor: theme.colors.primary }}></div>
                                <div className="w-10 h-10 rounded-full shadow border" style={{ backgroundColor: theme.colors.secondary }}></div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                                {theme.isDefault && <Badge color="blue">Padrão</Badge>}
                                {theme.isActive && <Badge color="green">Ativo</Badge>}
                            </div>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => handleSetTheme(theme.id)} disabled={activeTheme.id === theme.id || isThemeProcessing} className="w-full bg-primary-50 text-primary-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                  {activeTheme.id === theme.id ? <CheckCircle2 size={16}/> : <Palette size={16}/>}
                                  {activeTheme.id === theme.id ? 'Aplicado' : 'Aplicar Tema'}
                                </button>
                                <div className="flex gap-2">
                                  <button onClick={() => previewTheme(theme)} onMouseLeave={resetPreview} disabled={isThemeProcessing} className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center gap-2">
                                      <Eye size={16}/> Prévia
                                  </button>
                                  {!theme.isDefault && (
                                    <button onClick={() => handleDeleteTheme(theme.id)} disabled={isThemeProcessing || theme.isActive} className="bg-red-50 text-red-700 p-2 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <Trash2 size={16}/>
                                    </button>
                                  )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
      default:
        return (
          <div className="space-y-8 animate-[fadeIn_0.3s]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Receita Total" value={`R$ ${(platformRevenue || 0).toLocaleString()}`} subtitle="Receita bruta da plataforma" icon={DollarSign} color="green"/>
                <StatCard title="Agências Ativas" value={activeAgencies.length} subtitle="Parceiros verificados" icon={Briefcase} color="blue"/>
                <StatCard title="Usuários Ativos" value={activeUsers.length} subtitle="Clientes da plataforma" icon={Users} color="purple"/>
                <StatCard title="Pacotes Ativos" value={trips.length} subtitle="Viagens disponíveis" icon={Plane} color="amber"/>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Atividade Recente */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Activity size={20} className="mr-2 text-blue-600"/> Atividade Recente</h3>
                    {auditLogs.length > 0 ? (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
                            {auditLogs.map(log => (
                                <div key={log.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <p className="text-sm font-bold text-gray-900 line-clamp-1">{log.action}</p>
                                    <p className="text-xs text-gray-600 line-clamp-2">{log.details}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400 text-sm">Nenhuma atividade recente.</div>
                    )}
                </div>

                {/* Migrar Dados Mock */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Database size={20} className="mr-2 text-primary-600"/> Ferramentas de Dados</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Use para popular seu banco de dados de desenvolvimento com informações de exemplo.
                        <br/>(Não use em produção!)
                    </p>
                    <button 
                        onClick={migrateData} 
                        disabled={isProcessing}
                        className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isProcessing ? <Loader size={18} className="animate-spin" /> : <Sparkles size={18}/>} Migrar Dados Mock
                    </button>
                    {isMaster && (
                        <div className="mt-4">
                            <h4 className="text-sm font-bold text-red-600 flex items-center mb-2"><AlertOctagon size={16} className="mr-2"/> Ferramentas de Limpeza (Master Admin)</h4>
                            <p className="text-xs text-gray-500 mb-3">
                                CUIDADO! Estas ações são irreversíveis e APAGAM DADOS DO BANCO.
                            </p>
                            <div className="space-y-2">
                                <button onClick={() => { if (window.confirm('Excluir TODOS os usuários (clientes e agências)?')) deleteMultipleUsers(clients.map(c => c.id)); }} className="w-full bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100">Excluir Todos os Usuários</button>
                                <button onClick={() => { if (window.confirm('Excluir TODAS as agências e viagens?')) deleteMultipleAgencies(agencies.map(a => a.agencyId)); }} className="w-full bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100">Excluir Todas as Agências</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto pb-12 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900">Painel Master</h1>
        <div className="flex flex-wrap gap-3">
            {/* TAREFA 4: Broadcast Button */}
            <button 
              onClick={() => setBroadcastModalOpen(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold flex items-center hover:bg-primary-700 transition-colors"
              title="Enviar Comunicado Global"
            >
              <Megaphone size={18} className="mr-2"/>
              Broadcast
            </button>
            <button onClick={handleRefresh} disabled={isProcessing} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold flex items-center hover:bg-gray-200 transition-colors disabled:opacity-50">
                {isProcessing ? <Loader size={18} className="animate-spin mr-2"/> : <RefreshCw size={18} className="mr-2"/>}
                Atualizar Dados
            </button>
            <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 outline-none"/>
            </div>
        </div>
      </div>
      
      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-xl px-2 scrollbar-hide shadow-sm">
        <button onClick={() => handleTabChange('OVERVIEW')} className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'OVERVIEW' ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><LayoutGrid size={16}/> Visão Geral</button>
        <button onClick={() => handleTabChange('USERS')} className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors relative ${activeTab === 'USERS' ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><Users size={16}/> Usuários {deletedUsers.length > 0 && <span className="absolute top-2 right-2 bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{deletedUsers.length}</span>}</button>
        <button onClick={() => handleTabChange('AGENCIES')} className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors relative ${activeTab === 'AGENCIES' ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><Briefcase size={16}/> Agências {deletedAgencies.length > 0 && <span className="absolute top-2 right-2 bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{deletedAgencies.length}</span>}</button>
        <button onClick={() => handleTabChange('TRIPS')} className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'TRIPS' ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><Plane size={16}/> Viagens</button>
        <button onClick={() => handleTabChange('REVIEWS')} className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'REVIEWS' ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><Star size={16}/> Avaliações</button>
        <button onClick={() => handleTabChange('GUIDES')} className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'GUIDES' ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><BookOpen size={16}/> Guias de Turismo</button>
        <button onClick={() => handleTabChange('SETTINGS')} className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'SETTINGS' ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><Palette size={16}/> Temas</button>
        <button onClick={() => handleTabChange('AUDIT_LOGS')} className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'AUDIT_LOGS' ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><Lock size={16}/> Segurança & Logs</button>
        <button onClick={() => handleTabChange('GLOBAL_SETTINGS')} className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'GLOBAL_SETTINGS' ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><Shield size={16}/> Configurações Globais</button>
      </div>

      {/* Bulk Actions & View Toggles */}

      {/* Filter Bar for Trips */}
      {activeTab === 'TRIPS' && (
        <div className="flex flex-wrap items-center gap-4 mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-500"/>
                <span className="text-sm font-bold text-gray-700">Filtros:</span>
            </div>
            
            <div className="w-48">
                <select value={agencyFilter} onChange={e => setAgencyFilter(e.target.value)} className="w-full border border-gray-200 rounded-lg text-sm p-2.5 outline-none focus:ring-primary-500 focus:border-primary-500 bg-gray-50">
                    <option value="">Todas as Agências</option>
                    {activeAgencies.map(agency => <option key={agency.id} value={agency.agencyId}>{agency.name}</option>)}
                </select>
            </div>
            <div className="w-48">
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full border border-gray-200 rounded-lg text-sm p-2.5 outline-none focus:ring-primary-500 focus:border-primary-500 bg-gray-50">
                    <option value="">Todas as Categorias</option>
                    {tripCategories.map(category => <option key={category as string} value={category as string}>{(category as string).replace('_', ' ')}</option>)}
                </select>
            </div>
            {(agencyFilter || categoryFilter) && (
                <button onClick={() => { setAgencyFilter(''); setCategoryFilter(''); }} className="text-sm font-bold text-red-500 hover:underline">Limpar Filtros</button>
            )}
        </div>
      )}

      {renderContent()}

      {/* Modals */}
      {/* TAREFA 4: Broadcast Modal */}
      {broadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => {
                setBroadcastModalOpen(false);
                setBroadcastForm({ title: '', message: '', recipients: 'all_agencies' });
              }} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition-colors"
            >
              <X size={20}/>
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary-100 rounded-xl">
                <Megaphone size={24} className="text-primary-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Enviar Comunicado Global</h2>
                <p className="text-sm text-gray-500">Envie uma mensagem para todas as agências ou usuários</p>
              </div>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!broadcastForm.title || !broadcastForm.message) {
                showToast('Preencha todos os campos', 'error');
                return;
              }
              
              const recipientText = 
                broadcastForm.recipients === 'all_agencies' ? 'Todas as Agências' :
                broadcastForm.recipients === 'all_users' ? 'Todos os Usuários' :
                'Todos (Agências e Usuários)';
              
              showToast(`Comunicado enviado para ${recipientText}!`, 'success');
              setBroadcastModalOpen(false);
              setBroadcastForm({ title: '', message: '', recipients: 'all_agencies' });
            }} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Título do Comunicado
                </label>
                <input
                  type="text"
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                  placeholder="Ex: Manutenção Programada"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Mensagem
                </label>
                <textarea
                  value={broadcastForm.message}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                  placeholder="Digite sua mensagem aqui..."
                  rows={6}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Destinatários
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-primary-300 transition-colors">
                    <input
                      type="radio"
                      name="recipients"
                      value="all_agencies"
                      checked={broadcastForm.recipients === 'all_agencies'}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, recipients: e.target.value as any })}
                      className="text-primary-600"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Todas as Agências</p>
                      <p className="text-xs text-gray-500">{activeAgencies.length} agências receberão o comunicado</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-primary-300 transition-colors">
                    <input
                      type="radio"
                      name="recipients"
                      value="all_users"
                      checked={broadcastForm.recipients === 'all_users'}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, recipients: e.target.value as any })}
                      className="text-primary-600"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Todos os Usuários</p>
                      <p className="text-xs text-gray-500">{activeUsers.length} usuários receberão o comunicado</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-primary-300 transition-colors">
                    <input
                      type="radio"
                      name="recipients"
                      value="all"
                      checked={broadcastForm.recipients === 'all'}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, recipients: e.target.value as any })}
                      className="text-primary-600"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Todos (Agências e Usuários)</p>
                      <p className="text-xs text-gray-500">{activeAgencies.length + activeUsers.length} destinatários receberão o comunicado</p>
                    </div>
                  </label>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setBroadcastModalOpen(false);
                    setBroadcastForm({ title: '', message: '', recipients: 'all_agencies' });
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Megaphone size={18} />
                  Enviar Comunicado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {modalType === 'EDIT_USER' && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Editar Usuário</h2>
                
                <div className="flex border-b border-gray-200 mb-6">
                    <button onClick={() => setModalTab('PROFILE')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${modalTab === 'PROFILE' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Perfil</button>
                    <button onClick={() => setModalTab('SECURITY')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${modalTab === 'SECURITY' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Segurança</button>
                    <button onClick={() => setModalTab('HISTORY')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${modalTab === 'HISTORY' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Histórico</button>
                </div>

                {modalTab === 'PROFILE' && (
                    <form onSubmit={handleUserUpdate} className="space-y-6">
                        <div className="flex flex-col items-center gap-4 mb-6">
                            <div className="relative w-24 h-24 rounded-full group">
                                <img src={editFormData.avatar || `https://ui-avatars.com/api/?name=${editFormData.name}`} alt="" className="w-full h-full object-cover rounded-full border-4 border-gray-200" />
                                <label className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full cursor-pointer hover:bg-primary-700 shadow-md transition-transform hover:scale-110">
                                    {isUploadingAvatar ? <Loader className="animate-spin" size={20}/> : <Camera size={20} />}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isUploadingAvatar}/>
                                </label>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">{editFormData.name}</h3>
                        </div>

                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label><input value={editFormData.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Email</label><input type="email" value={editFormData.email || ''} onChange={e => setEditFormData({...editFormData, email: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Telefone</label><input value={editFormData.phone || ''} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-1">CPF</label><input value={editFormData.cpf || ''} onChange={e => setEditFormData({...editFormData, cpf: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                        <button type="submit" disabled={isProcessing} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50"><Save size={18}/> Salvar Alterações</button>
                    </form>
                )}
                {modalTab === 'SECURITY' && (
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                            <p className="text-sm text-gray-700 font-medium">Resetar Senha</p>
                            <button onClick={() => sendPasswordReset(selectedItem.email)} disabled={isProcessing} className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-amber-100 flex items-center gap-2 disabled:opacity-50">
                                <Key size={16}/> Enviar Link
                            </button>
                        </div>
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center justify-between">
                            <p className="text-sm text-red-700 font-medium">Excluir Conta</p>
                            <button onClick={() => handlePermanentDelete(selectedItem.id, selectedItem.role)} disabled={isProcessing} className="bg-white text-red-600 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-red-100 flex items-center gap-2 disabled:opacity-50">
                                <Trash2 size={16}/> Excluir
                            </button>
                        </div>
                    </div>
                )}
                {modalTab === 'HISTORY' && (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
                        <p className="text-sm text-gray-500 text-center">Nenhum histórico disponível.</p>
                    </div>
                )}
            </div>
        </div>
      )}

      {modalType === 'MANAGE_SUB' && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Gerenciar Assinatura</h2>
            <div className="flex items-center gap-4 mb-6">
                <img src={selectedItem.logo || `https://ui-avatars.com/api/?name=${selectedItem.name}`} className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" alt=""/>
                <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedItem.name}</h3>
                    <p className="text-sm text-gray-500">{selectedItem.email}</p>
                </div>
            </div>
            <form onSubmit={handleSubscriptionUpdate} className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Plano</label>
                    <select value={editFormData.plan} onChange={e => setEditFormData({...editFormData, plan: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500">
                        <option value="BASIC">Básico</option>
                        <option value="PREMIUM">Premium</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
                    <select value={editFormData.status} onChange={e => setEditFormData({...editFormData, status: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500">
                        <option value="ACTIVE">Ativo</option>
                        <option value="INACTIVE">Inativo</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Expira em</label>
                    <div className="flex gap-2 items-center">
                        <input type="datetime-local" value={editFormData.expiresAt?.slice(0, 16)} onChange={e => setEditFormData({...editFormData, expiresAt: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500"/>
                        <button type="button" onClick={() => addSubscriptionTime(30)} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-200">+30d</button>
                        <button type="button" onClick={() => addSubscriptionTime(365)} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-200">+1a</button>
                    </div>
                </div>
                <button type="submit" disabled={isProcessing} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50"><Save size={18}/> Salvar Assinatura</button>
            </form>
          </div>
        </div>
      )}

      {modalType === 'EDIT_AGENCY' && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Editar Agência</h2>
            <form onSubmit={handleAgencyUpdate} className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Nome</label>
                    <input value={editFormData.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Slug (URL)</label>
                    <input value={editFormData.slug || ''} onChange={e => setEditFormData({...editFormData, slug: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label>
                    <textarea value={editFormData.description || ''} onChange={e => setEditFormData({...editFormData, description: e.target.value})} rows={3} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">CNPJ</label>
                    <input value={editFormData.cnpj || ''} onChange={e => setEditFormData({...editFormData, cnpj: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Telefone</label>
                    <input value={editFormData.phone || ''} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">WhatsApp</label>
                    <input value={editFormData.whatsapp || ''} onChange={e => setEditFormData({...editFormData, whatsapp: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Website</label>
                    <input value={editFormData.website || ''} onChange={e => setEditFormData({...editFormData, website: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div className="border-t pt-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Endereço</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">CEP</label><input value={editFormData.address?.zipCode || ''} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, zipCode: e.target.value}})} className="w-full border p-2 rounded-lg" /></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rua</label><input value={editFormData.address?.street || ''} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, street: e.target.value}})} className="w-full border p-2 rounded-lg" /></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número</label><input value={editFormData.address?.number || ''} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, number: e.target.value}})} className="w-full border p-2 rounded-lg" /></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cidade</label><input value={editFormData.address?.city || ''} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, city: e.target.value}})} className="w-full border p-2 rounded-lg" /></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado</label><input value={editFormData.address?.state || ''} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, state: e.target.value}})} className="w-full border p-2 rounded-lg" /></div>
                    </div>
                </div>
                <button type="submit" disabled={isProcessing} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50"><Save size={18}/> Salvar Alterações</button>
            </form>
          </div>
        </div>
      )}

      {modalType === 'EDIT_REVIEW' && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Editar Avaliação</h2>
            <form onSubmit={handleReviewUpdate} className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Comentário</label>
                    <textarea value={editFormData.comment || ''} onChange={e => setEditFormData({...editFormData, comment: e.target.value})} rows={4} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Rating</label>
                    <input type="number" min="1" max="5" value={editFormData.rating || 0} onChange={e => setEditFormData({...editFormData, rating: Number(e.target.value)})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <button type="submit" disabled={isProcessing} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50"><Save size={18}/> Salvar Alterações</button>
            </form>
          </div>
        </div>
      )}

      {modalType === 'EDIT_TRIP' && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Editar Viagem: {selectedItem.title}</h2>
            <form onSubmit={handleTripUpdate} className="space-y-6">
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Título</label><input value={editFormData.title || ''} onChange={e => setEditFormData({...editFormData, title: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label><textarea value={editFormData.description || ''} onChange={e => setEditFormData({...editFormData, description: e.target.value})} rows={5} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Preço</label><input type="number" value={editFormData.price || 0} onChange={e => setEditFormData({...editFormData, price: Number(e.target.value)})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Destino</label><input value={editFormData.destination || ''} onChange={e => setEditFormData({...editFormData, destination: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                <button type="submit" disabled={isProcessing} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50"><Save size={18}/> Salvar Alterações</button>
            </form>
          </div>
        </div>
      )}

      {modalType === 'VIEW_STATS' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]" onClick={() => setModalType(null)}>
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors z-10">
              <X size={20}/>
            </button>
            <div className="mb-6">
              <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Estatísticas dos Usuários</h2>
              <p className="text-sm text-gray-500">Análise detalhada de {selectedUsers.length} usuário(s) selecionado(s)</p>
            </div>
            <div className="space-y-4">
                {userStats.length > 0 ? (
                  <>
                    {userStats.map(stat => (
                      <div key={stat.userId} className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all">
                        <div className="flex items-center justify-between mb-4">
                          <p className="font-extrabold text-gray-900 text-xl">{stat.userName}</p>
                          <Badge color="blue">ID: {stat.userId.slice(0, 8)}...</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-white p-4 rounded-xl border border-gray-200">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Gasto</p>
                            <p className="text-2xl font-extrabold text-primary-600">R$ {stat.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </div>
                          <div className="bg-white p-4 rounded-xl border border-gray-200">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Reservas</p>
                            <p className="text-2xl font-extrabold text-green-600">{stat.totalBookings}</p>
                          </div>
                          <div className="bg-white p-4 rounded-xl border border-gray-200">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Avaliações</p>
                            <p className="text-2xl font-extrabold text-amber-600">{stat.totalReviews}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Summary */}
                    <div className="bg-gradient-to-r from-primary-500 to-secondary-500 p-6 rounded-2xl text-white shadow-xl">
                      <p className="text-sm font-bold uppercase tracking-wider mb-3 opacity-90">Resumo Total</p>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs opacity-80 mb-1">Total Gasto</p>
                          <p className="text-2xl font-extrabold">R$ {userStats.reduce((sum, s) => sum + s.totalSpent, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                          <p className="text-xs opacity-80 mb-1">Total Reservas</p>
                          <p className="text-2xl font-extrabold">{userStats.reduce((sum, s) => sum + s.totalBookings, 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs opacity-80 mb-1">Total Avaliações</p>
                          <p className="text-2xl font-extrabold">{userStats.reduce((sum, s) => sum + s.totalReviews, 0)}</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <StatsIcon size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-sm text-gray-500 font-medium">Nenhum dado disponível para os usuários selecionados.</p>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Change Plan */}
      {modalType === 'CHANGE_PLAN' && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Mudar Plano</h2>
            <p className="text-sm text-gray-600 mb-6">{selectedItem.name}</p>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Plano Atual</p>
                <Badge color={selectedItem.subscriptionPlan === 'PREMIUM' ? 'purple' : 'gray'}>{selectedItem.subscriptionPlan}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleChangePlan(selectedItem.agencyId, 'BASIC')}
                  disabled={isProcessing || selectedItem.subscriptionPlan === 'BASIC'}
                  className="p-4 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <p className="font-bold text-gray-900">Básico</p>
                  <p className="text-xs text-gray-500 mt-1">R$ 99,90/mês</p>
                </button>
                <button
                  onClick={() => handleChangePlan(selectedItem.agencyId, 'PREMIUM')}
                  disabled={isProcessing || selectedItem.subscriptionPlan === 'PREMIUM'}
                  className="p-4 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <p className="font-bold text-gray-900">Premium</p>
                  <p className="text-xs text-gray-500 mt-1">R$ 199,90/mês</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Agency Details (Full Screen) */}
      {modalType === 'VIEW_AGENCY_DETAILS' && agencyDetails.agency && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto animate-[fadeIn_0.2s]">
          <div className="max-w-7xl mx-auto p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <img src={agencyDetails.agency.logo || `https://ui-avatars.com/api/?name=${agencyDetails.agency.name}`} className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" alt=""/>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{agencyDetails.agency.name}</h1>
                  <p className="text-sm text-gray-500 font-mono">/{agencyDetails.agency.slug}</p>
                </div>
              </div>
              <button onClick={() => setModalType(null)} className="p-2 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full"><X size={24}/></button>
            </div>

            {/* Stats Grid */}
            {agencyDetails.stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <p className="text-sm text-gray-500 mb-1">Receita Total</p>
                  <p className="text-2xl font-bold text-gray-900">R$ {agencyDetails.stats.totalRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <p className="text-sm text-gray-500 mb-1">Vendas</p>
                  <p className="text-2xl font-bold text-gray-900">{agencyDetails.stats.totalSales || 0}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <p className="text-sm text-gray-500 mb-1">Visualizações</p>
                  <p className="text-2xl font-bold text-gray-900">{agencyDetails.stats.totalViews || 0}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <p className="text-sm text-gray-500 mb-1">Avaliação Média</p>
                  <p className="text-2xl font-bold text-gray-900">{agencyDetails.stats.averageRating?.toFixed(1) || '-'}</p>
                </div>
              </div>
            )}

            {/* Trips List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Pacotes Ativos ({agencyDetails.trips.length})</h2>
              <div className="space-y-3">
                {agencyDetails.trips.length > 0 ? (
                  agencyDetails.trips.map(trip => (
                    <div key={trip.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-4">
                        <img src={trip.images?.[0] || 'https://placehold.co/80x60'} className="w-20 h-15 rounded-lg object-cover" alt=""/>
                        <div>
                          <p className="font-bold text-gray-900">{trip.title}</p>
                          <p className="text-sm text-gray-500">{trip.destination}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">R$ {trip.price.toLocaleString('pt-BR')}</p>
                        <Badge color={trip.is_active ? 'green' : 'gray'}>{trip.is_active ? 'Ativo' : 'Inativo'}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">Nenhum pacote cadastrado.</p>
                )}
              </div>
            </div>

            {/* Activity Logs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Histórico de Atividades</h2>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {auditLogs.filter(log => log.details?.includes(agencyDetails.agency!.agencyId)).length > 0 ? (
                  auditLogs.filter(log => log.details?.includes(agencyDetails.agency!.agencyId)).map(log => (
                    <div key={log.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-sm font-bold text-gray-900">{log.action}</p>
                      <p className="text-xs text-gray-600 mt-1">{log.details}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">Nenhuma atividade registrada.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bulk Actions Bar */}
      {activeTab === 'AGENCIES' && selectedAgencies.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 animate-[fadeIn_0.3s] transform transition-all">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-gray-700">
              {selectedAgencies.length} Agência(s) selecionada(s)
            </span>
            <div className="flex gap-2">
              <button onClick={() => handleMassUpdateAgencyStatus('ACTIVE')} className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors">Ativar</button>
              <button onClick={() => handleMassUpdateAgencyStatus('INACTIVE')} className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors">Inativar</button>
              <button onClick={() => handleMassChangePlan('BASIC')} className="bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors">Plano Básico</button>
              <button onClick={() => handleMassChangePlan('PREMIUM')} className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors">Plano Premium</button>
              <button onClick={() => handleMassArchiveAgencies()} className="bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-100 transition-colors">Arquivar</button>
              <button onClick={() => handleMassDeleteAgencies()} className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors">Excluir</button>
              <button onClick={() => setSelectedAgencies([])} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors">
                <X size={14}/>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Filter Modal */}
      {usersFilterModal.isOpen && usersFilterModal.filterType && (
        <UsersFilterModal
          isOpen={usersFilterModal.isOpen}
          onClose={() => setUsersFilterModal({ isOpen: false, filterType: null })}
          title={
            usersFilterModal.filterType === 'all' ? 'Total de Usuários' :
            usersFilterModal.filterType === 'new' ? 'Novos este Mês' :
            usersFilterModal.filterType === 'active' ? 'Ativos Agora' :
            'Bloqueados'
          }
          users={getFilteredUsers(usersFilterModal.filterType)}
          onUserClick={(client) => {
            setUsersFilterModal({ isOpen: false, filterType: null });
            setClientDetailModal({ isOpen: true, client });
          }}
          onUserAction={handleUserFilterAction}
          showUserTrash={showUserTrash}
        />
      )}

      {/* Agencies Filter Modal */}
      {agenciesFilterModal.isOpen && agenciesFilterModal.filterType && (
        <AgenciesFilterModal
          isOpen={agenciesFilterModal.isOpen}
          onClose={() => setAgenciesFilterModal({ isOpen: false, filterType: null })}
          title={
            agenciesFilterModal.filterType === 'all' ? 'Total de Agências' :
            agenciesFilterModal.filterType === 'premium' ? 'Planos Premium (PM)' :
            agenciesFilterModal.filterType === 'basic' ? 'Planos Básicos (PB)' :
            agenciesFilterModal.filterType === 'free' ? 'Planos Gratuitos (FREE)' :
            agenciesFilterModal.filterType === 'pending' ? 'Agências Pendentes' :
            'Agências Ativas'
          }
          agencies={getFilteredAgencies(agenciesFilterModal.filterType)}
          onAgencyClick={(agency) => {
            setAgenciesFilterModal({ isOpen: false, filterType: null });
            setAgencyDetailModal({ isOpen: true, agency });
          }}
          onAgencyAction={handleAgencyFilterAction}
          showAgencyTrash={showAgencyTrash}
        />
      )}

      {/* Agency Detail Modal */}
      <AgencyDetailModal
        isOpen={agencyDetailModal.isOpen}
        agency={agencyDetailModal.agency}
        onClose={() => setAgencyDetailModal({ isOpen: false, agency: null })}
        onEdit={() => {
          if (agencyDetailModal.agency) {
            setSelectedItem(agencyDetailModal.agency);
            setEditFormData({ name: agencyDetailModal.agency.name, description: agencyDetailModal.agency.description, cnpj: agencyDetailModal.agency.cnpj, slug: agencyDetailModal.agency.slug, phone: agencyDetailModal.agency.phone, whatsapp: agencyDetailModal.agency.whatsapp, website: agencyDetailModal.agency.website, address: agencyDetailModal.agency.address, bankInfo: agencyDetailModal.agency.bankInfo });
            setModalType('EDIT_AGENCY');
            setAgencyDetailModal({ isOpen: false, agency: null });
          }
        }}
        bookings={bookings}
        reviews={agencyReviews}
        trips={trips}
      />

      {/* Client Dashboard Popup */}
      <ClientDashboardPopup
        isOpen={clientDashboardPopup.isOpen}
        clientId={clientDashboardPopup.clientId}
        onClose={() => setClientDashboardPopup({ isOpen: false, clientId: null })}
      />

      {/* Client Detail Modal */}
      <ClientDetailModal
        isOpen={clientDetailModal.isOpen}
        client={clientDetailModal.client}
        onClose={() => setClientDetailModal({ isOpen: false, client: null })}
        onEdit={() => {
          if (clientDetailModal.client) {
            setEditFormData(clientDetailModal.client);
            setSelectedItem(clientDetailModal.client);
            setModalType('EDIT_USER');
            setModalTab('PROFILE');
            setClientDetailModal({ isOpen: false, client: null });
          }
        }}
        onAccessDashboard={(clientId) => {
          setClientDetailModal({ isOpen: false, client: null });
          setClientDashboardPopup({ isOpen: true, clientId });
        }}
        bookings={bookings}
        reviews={agencyReviews}
        trips={trips}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
        isConfirming={isProcessing}
      />
    </div>
  );
};