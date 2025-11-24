

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, UserRole, Client, Agency, Admin } from '../types';
import { supabase } from '../services/supabase';
import { slugify } from '../utils/slugify';

interface AuthContextType {
  user: User | Client | Agency | Admin | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (redirectPath?: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: any, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  updateUser: (userData: Partial<Client | Agency>) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  uploadImage: (file: File, bucket: 'avatars' | 'agency-logos' | 'trip-images') => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile/agency data based on Auth ID
  const fetchUserData = async (authId: string, email: string) => {
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

      // 1. Check if Agency
      const { data: agencyData } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', authId)
        .single();

      if (agencyData) {
        const agencyUser: Agency = {
          id: agencyData.id,
          name: agencyData.name,
          email: email,
          role: UserRole.AGENCY,
          slug: agencyData.slug || slugify(agencyData.name),
          cnpj: agencyData.cnpj || '',
          description: agencyData.description || '',
          logo: agencyData.logo_url || '', // Ensure logo maps to logo_url
          whatsapp: agencyData.whatsapp, // New field mapped
          
          // Hero Configuration
          heroMode: agencyData.hero_mode || 'TRIPS',
          heroBannerUrl: agencyData.hero_banner_url,
          heroTitle: agencyData.hero_title,
          heroSubtitle: agencyData.hero_subtitle,
          
          // Custom Settings (Pills)
          customSettings: agencyData.custom_settings || {},

          subscriptionStatus: agencyData.subscription_status || 'INACTIVE',
          subscriptionPlan: agencyData.subscription_plan || 'BASIC',
          subscriptionExpiresAt: agencyData.subscription_expires_at || new Date().toISOString(),
          website: agencyData.website,
          phone: agencyData.phone,
          address: agencyData.address || {},
          bankInfo: agencyData.bank_info || {}
        };
        setUser(agencyUser);
        return;
      }

      // 2. Check if Profile (Client/Admin)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authId)
        .single();

      if (profileData) {
        const role = profileData.role === 'ADMIN' ? UserRole.ADMIN : UserRole.CLIENT;
        
        const clientUser: Client | Admin = {
          id: profileData.id,
          name: profileData.full_name || 'Usuário',
          email: email,
          role: role,
          avatar: profileData.avatar_url, 
          cpf: profileData.cpf,
          phone: profileData.phone,
          favorites: [], 
          createdAt: profileData.created_at,
          address: profileData.address || {}
        } as Client;

        setUser(clientUser);
        return;
      }
      
      // 3. Fallback
      setUser({ id: authId, email, name: email.split('@')[0], role: UserRole.CLIENT });

    } catch (error) {
      console.error("Error fetching user details:", error);
      setUser(null);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      
      // Fix: Cast auth to any
      const { data: { session } } = await (supabase.auth as any).getSession();
      
      if (session?.user) {
        await fetchUserData(session.user.id, session.user.email!);
      } else {
        setUser(null);
      }
      setLoading(false);

      // Fix: Cast auth to any
      const { data: { subscription } } = (supabase.auth as any).onAuthStateChange(async (event: string, session: any) => {
        if (session?.user) {
          if (event === 'SIGNED_IN') {
             setTimeout(() => fetchUserData(session.user.id, session.user.email!), 1000);
          } else if (event === 'TOKEN_REFRESHED') {
             // Optional: refresh user data silently
          } else {
             fetchUserData(session.user.id, session.user.email!);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      });

      return () => subscription.unsubscribe();
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    if (!password) return { success: false, error: 'Senha obrigatória' };
    
    // Fix: Cast auth to any
    const { error } = await (supabase.auth as any).signInWithPassword({
      email,
      password,
    });

    if (error) {
      const msg = error.message === 'Invalid login credentials' ? 'Email ou senha incorretos.' : error.message;
      return { success: false, error: msg };
    }
    return { success: true };
  };

  const loginWithGoogle = async (redirectPath?: string) => {
    const redirectTo = redirectPath 
        ? `${window.location.origin}/#${redirectPath}` 
        : `${window.location.origin}/`;

    // Fix: Cast auth to any
    const { error } = await (supabase.auth as any).signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo
      }
    });
    if (error) console.error("Google login error:", error);
  };

  const logout = async () => {
    // Fix: Cast auth to any
    await (supabase.auth as any).signOut();
    setUser(null);
  };

  const register = async (data: any, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    // Fix: Cast auth to any
    const { data: authData, error: authError } = await (supabase.auth as any).signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.name,
        }
      }
    });

    if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('Database error finding user')) {
             return { success: false, error: 'Este e-mail já está cadastrado. Por favor, faça login.' };
        }
        return { success: false, error: authError.message };
    }
    
    let userId = authData.user?.id;
    if (!userId && !authError) return { success: false, error: 'Verifique seu email para confirmar o cadastro.' };
    if (!userId) return { success: false, error: 'Erro ao criar usuário.' };

    try {
      if (role === UserRole.AGENCY) {
        // Let DB trigger handle slug generation
        const { error: agencyError } = await supabase.from('agencies').upsert({
          id: userId,
          name: data.name,
          email: data.email,
          cnpj: data.cnpj,
          phone: data.phone,
          description: data.description,
          logo_url: data.logo || `https://ui-avatars.com/api/?name=${data.name}`,
          subscription_status: 'INACTIVE',
          subscription_plan: 'BASIC'
        }, { onConflict: 'id' });
        
        if (agencyError) throw agencyError;
      } else {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: userId,
          full_name: data.name,
          email: data.email, 
          cpf: data.cpf,
          phone: data.phone,
          role: 'CLIENT',
          avatar_url: `https://ui-avatars.com/api/?name=${data.name}`
        }, { onConflict: 'id' });
        
        if (profileError) throw profileError;
      }
    } catch (dbError: any) {
      console.error("DB Upsert Error:", dbError);
      return { success: true }; 
    }

    return { success: true };
  };

  const updateUser = async (userData: Partial<Client | Agency>): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Usuário não logado' };
    
    try {
      // 1. Update Auth Email if changed
      if (userData.email && userData.email !== user.email) {
          // Fix: Cast auth to any
          const { error } = await (supabase.auth as any).updateUser({ email: userData.email });
          if (error) throw error;
      }

      // 2. Update Table Data
      if (user.role === UserRole.AGENCY) {
        const updates: any = {};
        if (userData.name) updates.name = userData.name;
        
        // Slug is auto-updated by DB trigger on name change, but we allow manual override if sent explicitly
        if ((userData as Agency).slug) updates.slug = (userData as Agency).slug; 
        
        if ((userData as Agency).description) updates.description = (userData as Agency).description;
        if ((userData as Agency).cnpj) updates.cnpj = (userData as Agency).cnpj;
        if ((userData as Agency).phone) updates.phone = (userData as Agency).phone;
        if ((userData as Agency).logo) updates.logo_url = (userData as Agency).logo;
        if ((userData as Agency).address) updates.address = (userData as Agency).address;
        if ((userData as Agency).bankInfo) updates.bank_info = (userData as Agency).bankInfo;
        if ((userData as Agency).whatsapp) updates.whatsapp = (userData as Agency).whatsapp;
        
        // Hero Fields
        if ((userData as Agency).heroMode) updates.hero_mode = (userData as Agency).heroMode;
        if ((userData as Agency).heroBannerUrl) updates.hero_banner_url = (userData as Agency).heroBannerUrl;
        if ((userData as Agency).heroTitle) updates.hero_title = (userData as Agency).heroTitle;
        if ((userData as Agency).heroSubtitle) updates.hero_subtitle = (userData as Agency).heroSubtitle;

        // Custom Suggestions
        if ((userData as Agency).customSettings) updates.custom_settings = (userData as Agency).customSettings;

        const { error } = await supabase.from('agencies').update(updates).eq('id', user.id);
        if (error) throw error;
        
      } else {
        const updates: any = {};
        if (userData.name) updates.full_name = userData.name;
        if ((userData as Client).phone) updates.phone = (userData as Client).phone;
        if ((userData as Client).cpf) updates.cpf = (userData as Client).cpf;
        if ((userData as Client).address) updates.address = (userData as Client).address;
        if (userData.avatar) updates.avatar_url = userData.avatar;

        const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
        if (error) throw error;
      }

      // Refresh local state
      setUser({ ...user, ...userData } as any);
      return { success: true };

    } catch (error: any) {
        console.error("Error updating user", error);
        return { success: false, error: error.message };
    }
  };

  const updatePassword = async (password: string) => {
      // Fix: Cast auth to any
      const { error } = await (supabase.auth as any).updateUser({ password });
      if (error) return { success: false, error: error.message };
      return { success: true };
  };

  const uploadImage = async (file: File, bucket: 'avatars' | 'agency-logos' | 'trip-images'): Promise<string | null> => {
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
              .from(bucket)
              .upload(fileName, file, { upsert: true });

          if (uploadError) throw uploadError;

          const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
          return data.publicUrl;
      } catch (error) {
          console.error("Upload error:", error);
          return null;
      }
  };

  const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "Usuário não autenticado" };

    try {
      if (user.role === UserRole.AGENCY) {
          const { error } = await supabase.from('agencies').delete().eq('id', user.id);
          if (error) throw error;
      } else {
          const { error } = await supabase.from('profiles').delete().eq('id', user.id);
          if (error) throw error;
      }
      // Fix: Cast auth to any
      await (supabase.auth as any).signOut();
      setUser(null);
      return { success: true };

    } catch (error: any) {
      console.error("Erro ao excluir conta:", error);
      return { success: false, error: error.message || "Erro ao excluir conta" };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout, register, updateUser, updatePassword, deleteAccount, uploadImage }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
