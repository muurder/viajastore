

// ... existing imports ...
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { UserRole, Trip, Agency, Client, AgencyReview, ThemePalette, TripCategory, UserStats, Booking, ActivityLog, ActivityActorRole, ActivityActionType } from '../types';
import { 
  Trash2, MessageCircle, Users, Briefcase, 
  BarChart, AlertOctagon, Database, Loader, Palette, Lock, Eye, Save, 
  Activity, X, Search, MoreVertical, 
  DollarSign, ShoppingBag, Edit3, 
  CreditCard, CheckCircle, XCircle, Ban, Star, UserX, UserCheck, Key,
  Sparkles, Filter, ChevronDown, MonitorPlay, Download, BarChart2 as StatsIcon, ExternalLink,
  LayoutGrid, List, Archive, ArchiveRestore, Trash, Camera, Upload, History, PauseCircle, PlayCircle, Plane, RefreshCw, AlertCircle, LucideProps, CalendarDays, User, Building, MapPin, Clock, Heart, ShieldCheck 
} from 'lucide-react';
import { migrateData } from '../services/dataMigration';
import { useSearchParams, Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { slugify } from '../utils/slugify';

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

// Fix: Define StatCard component locally
interface StatCardProps { title: string; value: string | number; subtitle: string; icon: React.ComponentType<LucideProps>; color: 'green' | 'blue' | 'purple' | 'amber' }
const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon: Icon, color }) => {
    const bgColors = {
        green: 'bg-green-50 text-green-600',
        blue: 'bg-blue-50 text-blue-600',
        purple: 'bg-purple-50 text-purple-600',
        amber: 'bg-amber-50 text-amber-600',
    };
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-100 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${bgColors[color]} group-hover:scale-105 transition-transform`}><Icon size={24}/></div>
            </div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{value}</h3>
            <p className="text-xs text-gray-400 mt-2">{subtitle}</p>
        </div>
    );
};

// Fix: Define ActionMenu component locally
interface ActionMenuProps { actions: { label: string; onClick: () => void; icon: React.ComponentType<LucideProps>; variant?: 'danger' | 'default