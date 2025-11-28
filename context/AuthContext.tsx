
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, UserRole, Client, Agency, Admin } from '../types';
import { supabase } from '../services/supabase';
import { slugify } from '../utils/slugify';

interface AuthContextType {
  user: User | Client | Agency | Admin | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (role?: UserRole, redirectPath?: string) => Promise<void>;
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
        // Handle AGENCY role (Check case-insensitive)
        if (profileData.role && profileData.role.toUpperCase() === UserRole.AGENCY) {
          const { data: agencyData, error: agencyError } = await supabase
            .from('agencies')
            .select('*')
            .eq('user_id', authId) // CORRECT: Use user_id to link
            .single();

          if (agencyError || !agencyData) {
            console.error("CRITICAL: Data inconsistency. Profile is AGENCY but no record in agencies table.", agencyError);
            // This can happen during registration flow before agency details are complete.
            // Create a temporary Agency object from profile data.
             const tempAgency: Agency = {
              id: profileData.id, // User ID
              agencyId: '', // PK is not available yet
              name: profileData.full_name || 'Nova Agência',
              email: email,
              role: UserRole.AGENCY,
              is_active: false, // Default to inactive
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
            id: agencyData.user_id, // This is the User ID (from auth/profiles)
            agencyId: agencyData.id, // This is the agencies table Primary Key
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

        // Handle ADMIN or CLIENT roles
        let mappedRole: UserRole;
        if (profileData.role === 'ADMIN') {
          mappedRole = UserRole.ADMIN;
        } else {
          // Default to CLIENT for any other role or if role is null/undefined
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
          favorites: [], // Favorites are loaded separately
          createdAt: profileData.created_at,
          address: profileData.address || {},
          status: profileData.status || 'ACTIVE'
        } as Client; // Cast as Client, will work for Admin too as it's a superset here

        setUser(genericUser);
        return;
      }
      
      // 3. Fallback (User exists in Auth but no table record found yet)
      console.log("User authenticated but no profile/agency found.");
      setUser(null); 

    } catch (error) {
      console.error("Error fetching user details:", error);
      setUser(null);
    }
  };

  // Helper to ensure the record exists after Google Login
  const ensureUserRecord = async (authUser: any, role: string) => {
      if (!supabase) return false;
      const userId = authUser.id;
      const userEmail = authUser.email;
      const userName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || userEmail.split('@')[0];
      const userAvatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;

      console.log(`Ensuring record for ${role}:`, userId);

      try {
          // ALWAYS create a profile record first for role management
          const { error: profileError } = await supabase.from('profiles').upsert({
              id: userId,
              full_name: userName,
              email: userEmail,
              role: role, // Use the passed role
              avatar_url: userAvatar,
          }, { onConflict: 'id' });

          if (profileError) {
              console.error("Failed to upsert profile record:", profileError.message);
              throw profileError;
          }

          if (role === UserRole.AGENCY) {
              const { error: agencyError } = await supabase.from('agencies').upsert({
                  user_id: userId, // CORRECT: use user_id
                  name: userName,
                  email: userEmail,
                  logo_url: userAvatar,
                  is_active: false, // Start as inactive
              }, { onConflict: 'user_id' }); // CORRECT: conflict on user_id

              if (agencyError) {
                  console.error("Failed to upsert agency record:", agencyError.message);
                  throw agencyError;
              }
          }
          return true;
      } catch (err: any) {
          console.error("Error ensuring user record:", err.message);
          return false;
      }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);

      if (!supabase) {
        setUser(null);
        setLoading(false);
        return;
      }
      
      const { data: { session } } = await (supabase.auth as any).getSession();
      
      if (session?.user) {
        const pendingRole = localStorage.getItem('viajastore_pending_role');
        if (pendingRole) {
            console.log("Found pending role on init:", pendingRole);
            await ensureUserRecord(session.user, pendingRole);
            localStorage.removeItem('viajastore_pending_role');
        }
        await fetchUserData(session.user.id, session.user.email!);
      } else {
        setUser(null);
      }
      setLoading(false);

      const { data: { subscription } } = (supabase.auth as any).onAuthStateChange(async (event: string, session: any) => {
        console.log("Auth State Change:", event);
        
        if (session?.user) {
          if (event === 'SIGNED_IN') {
             const pendingRole = localStorage.getItem('viajastore_pending_role');
             if (pendingRole) {
                 console.log("Found pending role after sign in:", pendingRole);
                 const success = await ensureUserRecord(session.user, pendingRole);
                 if (success) {
                    localStorage.removeItem('viajastore_pending_role');
                 }
             }
             
             await fetchUserData(session.user.id, session.user.email!);
          } else if (event === 'USER_UPDATED') {
             await fetchUserData(session.user.id, session.user.email!);
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
    if (!supabase) return { success: false, error: 'Backend não configurado.' };
    if (!password) return { success: false, error: 'Senha obrigatória' };
    
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

  const loginWithGoogle = async (role?: UserRole, redirectPath?: string) => {
    if (!supabase) return;
    const redirectTo = redirectPath 
        ? `${window.location.origin}/#${redirectPath}` 
        : `${window.location.origin}/`;

    if (role) {
        console.log("Setting pending role for Google Signup:", role);
        localStorage.setItem('viajastore_pending_role', role);
    } else {
        localStorage.removeItem('viajastore_pending_role');
    }

    const { error } = await (supabase.auth as any).signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo,
        queryParams: {
            access_type: 'offline',
            prompt: 'consent',
        }
      }
    });
    if (error) console.error("Google login error:", error);
  };

  const logout = async () => {
    if (supabase) {
      await (supabase.auth as any).signOut();
    }
    setUser(null);
    localStorage.removeItem('viajastore_pending_role');
  };

  const register = async (data: any, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) return { success: false, error: 'Backend não configurado.' };
    
    // 1. Create Auth User
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
        if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
             return { success: false, error: 'Este e-mail já está cadastrado. Por favor, faça login.' };
        }
        return { success: false, error: authError.message };
    }
    
    const userId = authData.user?.id;
    if (!userId) {
        // This case usually means email confirmation is required.
        return { success: true, error: 'Verifique seu email para confirmar o cadastro.' };
    }

    // 2. Create corresponding DB records. If this fails, registration is incomplete.
    try {
      // Create/Update profile for ALL roles using upsert for robustness
      const { error: profileError } = await supabase.from('profiles').upsert({
          id: userId,
          full_name: data.name,
          email: data.email,
          cpf: role === UserRole.CLIENT ? data.cpf : null,
          phone: data.phone,
          role: role,
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}`
      }, { onConflict: 'id' });

      if (profileError) throw profileError;

      if (role === UserRole.AGENCY) {
        const { error: agencyError } = await supabase.from('agencies').insert({
          user_id: userId, // CORRECT: Use user_id
          name: data.name,
          email: data.email,
          cnpj: data.cnpj,
          phone: data.phone, // Now correctly populated from AuthModal
          is_active: false, // Start as inactive to force subscription flow
        });
        
        if (agencyError) throw agencyError;
      }

      // If all DB operations succeed
      return { success: true };

    } catch (dbError: any) {
      console.error("DB Registration Error:", dbError);
      // Return a specific error if any of the DB operations failed.
      return { success: false, error: `Falha ao salvar dados: ${dbError.message}. Tente novamente.` };
    }
  };


  const updateUser = async (userData: Partial<Client | Agency>): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) return { success: false, error: 'Backend não configurado.' };
    if (!user) return { success: false, error: 'Usuário não logado' };
    
    try {
      if (userData.email && userData.email !== user.email) {
          const { error } = await (supabase.auth as any).updateUser({ email: userData.email });
          if (error) throw error;
      }

      if (user.role === UserRole.AGENCY) {
        const updates: any = {};
        if (userData.name) updates.name = userData.name;
        if ((userData as Agency).slug) updates.slug = (userData as Agency).slug; 
        if ((userData as Agency).description) updates.description = (userData as Agency).description;
        if ((userData as Agency).cnpj) updates.cnpj = (userData as Agency).cnpj;
        if ((userData as Agency).phone) updates.phone = (userData as Agency).phone;
        if ((userData as Agency).logo) updates.logo_url = (userData as Agency).logo;
        if ((userData as Agency).address) updates.address = (userData as Agency).address;
        if ((userData as Agency).bankInfo) updates.bank_info = (userData as Agency).bankInfo;
        if ((userData as Agency).whatsapp) updates.whatsapp = (userData as Agency).whatsapp;
        
        if ((userData as Agency).heroMode) updates.hero_mode = (userData as Agency).heroMode;
        if ((userData as Agency).heroBannerUrl) updates.hero_banner_url = (userData as Agency).heroBannerUrl;
        if ((userData as Agency).heroTitle) updates.hero_title = (userData as Agency).heroTitle;
        if ((userData as Agency).heroSubtitle) updates.hero_subtitle = (userData as Agency).heroSubtitle;

        if ((userData as Agency).customSettings) updates.custom_settings = (userData as Agency).customSettings;

        const { error } = await supabase.from('agencies').update(updates).eq('user_id', user.id); // CORRECT: use user_id
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

      setUser({ ...user, ...userData } as any);
      return { success: true };

    } catch (error: any) {
        console.error("Error updating user", error);
        return { success: false, error: error.message };
    }
  };

  const updatePassword = async (password: string) => {
      if (!supabase) return { success: false, error: 'Backend não configurado.' };
      const { error } = await (supabase.auth as any).updateUser({ password });
      if (error) return { success: false, error: error.message };
      return { success: true };
  };

  const uploadImage = async (file: File, bucket: 'avatars' | 'agency-logos' | 'trip-images'): Promise<string | null> => {
      if (!supabase) return null;
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
    if (!supabase) return { success: false, error: "Backend não configurado." };
    if (!user) return { success: false, error: "Usuário não autenticado" };

    try {
      // Both agencies and clients have a profile, so we always delete from there.
      // RLS and DB triggers should handle cascading deletes if necessary.
      const { error } = await supabase.from('profiles').delete().eq('id', user.id);
      if (error) throw error;
      
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
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
