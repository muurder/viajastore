
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, UserRole, Client, Agency, Admin } from '../types';
import { supabase } from '../services/supabase';

interface AuthContextType {
  user: User | Client | Agency | Admin | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  register: (data: any, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile/agency data based on Auth ID
  const fetchUserData = async (authId: string, email: string) => {
    try {
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
          cnpj: agencyData.cnpj || '',
          description: agencyData.description || '',
          logo: agencyData.logo_url || '',
          subscriptionStatus: agencyData.subscription_status || 'INACTIVE',
          subscriptionPlan: agencyData.subscription_plan || 'BASIC',
          subscriptionExpiresAt: agencyData.subscription_expires_at || new Date().toISOString(),
          website: agencyData.website,
          phone: agencyData.phone
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
          createdAt: profileData.created_at
        } as Client;

        setUser(clientUser);
        return;
      }
      
      // 3. Fallback (Trigger hasn't fired yet or latency)
      // If trigger handles it, a refresh will fix it. For now, show basic info.
      setUser({ id: authId, email, name: email.split('@')[0], role: UserRole.CLIENT });

    } catch (error) {
      console.error("Error fetching user details:", error);
      setUser(null);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        await fetchUserData(session.user.id, session.user.email!);
      } else {
        setUser(null);
      }
      setLoading(false);

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          // Wait a bit if it's a new sign in to allow DB triggers to run
          if (event === 'SIGNED_IN') {
             setTimeout(() => fetchUserData(session.user.id, session.user.email!), 1000);
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
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { success: false, error: 'Email ou senha incorretos.' };
    return { success: true };
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
    if (error) console.error("Google login error:", error);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const register = async (data: any, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    // 1. Sign Up in Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.name,
        }
      }
    });

    let userId = authData.user?.id;

    // Handle "User already registered" scenario gracefully
    if (authError) {
        if (authError.message.includes('already registered')) {
             // Attempt to sign in to get the ID (requires password logic, but for safety we abort 
             // or we assume the user needs to login. 
             // However, to fix the "Duplicate Key" issue reported by the user,
             // we assume the Auth user exists but the Profile data might need updating/creating.
             // Returning error telling them to login is safer.
             return { success: false, error: 'Este e-mail já está cadastrado. Por favor, faça login.' };
        }
        return { success: false, error: authError.message };
    }
    
    // Check if email confirmation is required by Supabase settings
    if (!userId && !authError) return { success: false, error: 'Verifique seu email para confirmar o cadastro.' };

    if (!userId) return { success: false, error: 'Erro ao criar usuário.' };

    // 2. Upsert into specific tables
    // FIX: Using UPSERT prevents "Duplicate key" errors if the trigger ran or if retrying
    try {
      if (role === UserRole.AGENCY) {
        const { error: agencyError } = await supabase.from('agencies').upsert({
          id: userId,
          name: data.name,
          email: data.email,
          cnpj: data.cnpj,
          phone: data.phone,
          description: data.description,
          logo_url: data.logo || `https://ui-avatars.com/api/?name=${data.name}`,
          // Do not overwrite subscription status if it exists
        }, { onConflict: 'id' });
        
        if (agencyError) throw agencyError;
      } else {
        // Client Register
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
      console.error(dbError);
      // Even if DB fails, Auth succeeded. 
      return { success: true }; 
    }

    return { success: true };
  };

  const updateUser = async (userData: Partial<User>) => {
    if (!user) return;
    setUser({ ...user, ...userData } as User);

    try {
      // Only update auth email if changed
      if (userData.email && userData.email !== user.email) {
          const { error } = await supabase.auth.updateUser({ email: userData.email });
          if (error) console.error("Auth update error", error);
      }

      if (user.role === UserRole.AGENCY) {
        await supabase.from('agencies').update({
            name: userData.name,
            // email: userData.email // Usually handled by triggers or manual sync
        }).eq('id', user.id);
      } else {
        await supabase.from('profiles').update({
            full_name: userData.name,
            // email: userData.email
        }).eq('id', user.id);
      }
    } catch (error) {
        console.error("Error updating user", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout, register, updateUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
