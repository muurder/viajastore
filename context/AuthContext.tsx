
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, UserRole, Client, Agency, Admin } from '../types';
import { supabase } from '../services/supabase';

interface AuthContextType {
  user: User | Client | Agency | Admin | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
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
        // Determine role based on profile data or default to Client
        const role = profileData.role === 'ADMIN' ? UserRole.ADMIN : UserRole.CLIENT;
        
        const clientUser: Client | Admin = {
          id: profileData.id,
          name: profileData.full_name || 'Usuário',
          email: email,
          role: role,
          // Safe to read even if undefined in DB, but we don't write it on signup
          avatar: profileData.avatar_url, 
          cpf: profileData.cpf,
          phone: profileData.phone,
          favorites: [], 
          createdAt: profileData.created_at
        } as Client;

        setUser(clientUser);
        return;
      }
      
      // Fallback if user exists in Auth but not in tables (shouldn't happen with correct signup)
      setUser({ id: authId, email, name: email.split('@')[0], role: UserRole.CLIENT });

    } catch (error) {
      console.error("Error fetching user details:", error);
      setUser(null);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        await fetchUserData(session.user.id, session.user.email!);
      } else {
        setUser(null);
      }
      setLoading(false);

      // Listen for changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          await fetchUserData(session.user.id, session.user.email!);
        } else {
          setUser(null);
        }
        setLoading(false);
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

    if (error) return { success: false, error: error.message };
    return { success: true };
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
          full_name: data.name, // Stored in user_metadata as backup
        }
      }
    });

    if (authError) return { success: false, error: authError.message };
    if (!authData.user) return { success: false, error: 'Erro ao criar usuário.' };

    const userId = authData.user.id;

    // 2. Insert into specific tables based on Role
    try {
      if (role === UserRole.AGENCY) {
        const { error: agencyError } = await supabase.from('agencies').insert({
          id: userId,
          name: data.name,
          email: data.email,
          cnpj: data.cnpj,
          phone: data.phone,
          description: data.description,
          logo_url: data.logo || `https://ui-avatars.com/api/?name=${data.name}`,
          subscription_status: 'INACTIVE',
          subscription_plan: 'BASIC'
        });
        if (agencyError) throw agencyError;
      } else {
        // Client Register
        // FIX: Removed 'avatar_url' from insert to prevent schema errors if column is missing
        const { error: profileError } = await supabase.from('profiles').insert({
          id: userId,
          full_name: data.name,
          cpf: data.cpf,
          phone: data.phone,
          role: 'CLIENT'
        });
        
        if (profileError) {
             // If specific table insert fails, we should ideally rollback auth, 
             // but for now we throw to catch block.
             console.error("Profile Insert Error:", profileError);
             throw profileError;
        }
      }
    } catch (dbError: any) {
      return { success: false, error: dbError.message || 'Erro ao salvar dados do perfil.' };
    }

    return { success: true };
  };

  const updateUser = async (userData: Partial<User>) => {
    if (!user) return;
    
    // Update local state optimistically
    setUser({ ...user, ...userData } as User);

    try {
      if (user.role === UserRole.AGENCY) {
        await supabase.from('agencies').update({
            name: userData.name,
        }).eq('id', user.id);
      } else {
        await supabase.from('profiles').update({
            full_name: userData.name,
        }).eq('id', user.id);
      }
    } catch (error) {
        console.error("Error updating user", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, updateUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
