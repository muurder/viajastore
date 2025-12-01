
import React, { useState, useMemo, useEffect, useRef } from 'react';
// Fix: Add useData import
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { UserRole, Trip, Agency, Client, AgencyReview, ThemePalette, TripCategory, UserStats, Booking } from '../types';
import { 
  Trash2, MessageCircle, Users, Briefcase, 
  BarChart, AlertOctagon, Database, Loader, Palette, Lock, Eye, Save, 
  Activity, X, Search, MoreVertical, 
  DollarSign, ShoppingBag, Edit3, 
  CreditCard, CheckCircle, XCircle, Ban, Star, UserX, UserCheck, Key,
  Sparkles, Filter, ChevronDown, MonitorPlay, Download, BarChart2 as StatsIcon, ExternalLink,
  LayoutGrid, List, Archive, ArchiveRestore, Trash, Camera, Upload, History, PauseCircle, PlayCircle, Plane, RefreshCw, AlertCircle, LucideProps // Fix: Import LucideProps and AlertCircle
} from 'lucide-react';
import { migrateData } from '../services/dataMigration';
import { useSearchParams, Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable'; // Fix: Import jspdf-autotable
import { slugify } from '../utils/slugify';

// --- STYLED COMPONENTS (LOCAL) ---

const Badge: React.FC<{ children: React.ReactNode; color: 'green' | 'red' | 'blue' | 'purple' | 'gray' | 'amber' }> = ({ children, color }) => {
  const colors = {
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-