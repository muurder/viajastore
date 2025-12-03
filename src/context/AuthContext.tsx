
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, UserRole, Client, Agency, Admin } from '../types';
import { supabase } from '../services/supabase';
import { slugify } from '../utils/slugify';

// Define a more granular return type for register
interface RegisterResult {
  success: boolean;
  message?: string; // For info messages, e.g., email verification
  error?: string;   // For actual errors
  role?: UserRole;
  userId?: string;
  email?: string;
}

interface AuthContextType {
  user: User | Client | Agency | Admin | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (role?: UserRole, redirectPath?: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: any, role: UserRole) => Promise<RegisterResult>;
  updateUser: (userData: Partial<Client | Agency>) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  uploadImage: (file: File, bucket: 'avatars' | 'agency-logos' | 'trip-images') => Promise<string | null>;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile/agency data based on Auth ID
  const fetchUserData = async (authId: string, email: string) => {
    if (!supabase) return;
    try {
      // 0. Check if Master Admin via Hardcoded Email (Security fallback)
      if (email === 'juannicolas1@gmail.com') {
          const masterUser: Admin = {
             id: authId,
             name: 'Master Admin',
             email: email,
             role: UserRole.ADMIN,
             avatar: `https://ui-avatars.com/api/?name=MA&background=000&color=fff`,
             createdAt: new Date().toISOString()
          };
          setUser(masterUser);
          return;
      }

      // 1. Check profiles table first to determine role
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authId)
        .maybeSingle();

      if (profileData) {
        // Fix: Ensure AGENCY role check is case-insensitive for robustness
        if (profileData.role && profileData.role.toUpperCase() === UserRole.AGENCY) {
          const { data: agencyData, error: agencyError } = await supabase
            .from('agencies')
            .select('*')
            .eq('user_id', authId)
            .single();

          if (agencyError || !agencyData) {
            console.warn("Profile is AGENCY but no record in agencies table (or fetch failed).", agencyError);
            
            // Fallback: Create a temporary agency object so the user isn't locked out
             const tempAgency: Agency = {
              id: profileData.id,
              agencyId: '', // Missing ID
              name: profileData.full_name || 'Nova Agência',
              email: email,
              role: UserRole.AGENCY,
              is_active: false,
              slug: slugify(profileData.full_name || 'nova-agencia'),
              cnpj: '',
              description: '',
              logo: profileData.avatar_url || '',
              heroMode: 'TRIPS',
              subscriptionStatus: 'INACTIVE',
              subscriptionPlan: 'BASIC',
              subscriptionExpiresAt: new Date().toISOString(),
            };
            setUser(tempAgency);
            return;
          }

          const agencyUser: Agency = {
            id: agencyData.user_id, // User ID (from auth)
            agencyId: agencyData.id, // Primary Key of agencies table
            name: agencyData.name,
            email: email,
            role: UserRole.AGENCY,
            is_active: agencyData.is_active,
            slug: agencyData.slug || slugify(agencyData.name),
            cnpj: agencyData.cnpj || '',
            description: agencyData.description || '',
            logo: agencyData.logo_url || '',
            whatsapp: agencyData.whatsapp,
            heroMode: agencyData.hero_mode || 'TRIPS',
            heroBannerUrl: agencyData.hero_banner_url,
            heroTitle: agencyData.hero_title,
            heroSubtitle: agencyData.hero_subtitle,
            customSettings: agencyData.custom_settings || {},
            subscriptionStatus: agencyData.is_active ? 'ACTIVE' : 'INACTIVE', // Derive from is_active
            subscriptionPlan: 'BASIC', // Placeholder until joined with subscriptions table
            subscriptionExpiresAt: new Date().toISOString(), 
            website: agencyData.website,
            phone: agencyData.phone,
            address: agencyData.address || {},
            bankInfo: agencyData.bank_info || {}
          };
          setUser(agencyUser);
          return;
        }

        // Handle ADMIN or CLIENT roles
        let mappedRole: UserRole;
        if (profileData.role === 'ADMIN') {
          mappedRole = UserRole.ADMIN;
        } else {
          mappedRole = UserRole.CLIENT;
        }
        
        const genericUser: Client | Admin = {
          id: profileData.id,
          name: profileData.full_name || 'Usuário',
          email: email,
          role: mappedRole,
          avatar: profileData.avatar_url, 
          cpf: profileData.cpf,
          phone: profileData.phone,
          favorites: [],
          createdAt: profileData.created_at,
          address: profileData.address || {},
          status: profileData.status || 'ACTIVE'
        } as Client;

        setUser(genericUser);
        return;
      }
      
      setUser(null); 

    } catch (error) {
      console.error("Error fetching user details:", error);
      setUser(null);
    }
  };

  const reloadUser = async () => {
    if (user && user.email) {
        await fetchUserData(user.id, user.email);
    }
  };

  // Helper to ensure the record exists after Google Login
  const ensureUserRecord = async (authUser: any, role: string) => {
      if (!supabase) return false;
      const userId = authUser.id;
      const userEmail = authUser.email;
      const userName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || userEmail.split('@')[0];
      const userAvatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;
      // Get phone from authUser if available, otherwise null
      const userPhone = authUser.user_metadata?.phone_number || null;

      try {
          // ALWAYS create a profile record first
          const { error: profileError } = await supabase.from('profiles').upsert({
              id: userId,
              full_name: userName,
              email: userEmail,
              role: role,
              avatar_url: userAvatar,
              phone: userPhone, // Pass phone if available
          }, { onConflict: 'id' });

          if (profileError) throw profileError;

          if (role === UserRole.AGENCY) {
              const safeSlug = slugify(userName + '-' + Math.floor(Math.random() * 1000));
              
              // Use RPC for safe creation even in ensureUserRecord
              const { error: agencyError } = await supabase.rpc