import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, UserRole, Client, Agency, Admin } from '../types';
import { supabase } from '../services/supabase';
import { slugify } from '../utils/slugify';
import { generateUniqueSlug, generateSlugFromName } from '../utils/slugUtils';
import { useToast } from './ToastContext'; // Import useToast

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
  deleteAccount: (password: string) => Promise<{ success: boolean; error?: string }>;
  uploadImage: (file: File, bucket: 'avatars' | 'agency-logos' | 'trip-images') => Promise<string | null>;
  // FIX: Updated `reloadUser` signature to accept `User`
  reloadUser: (currentUser: User | Client | Agency | Admin | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast(); // Use toast for feedback

  // Fetch user profile/agency data based on Auth ID
  const fetchUserData = async (authId: string, email: string) => {
    // CRITICAL FIX: Add guard to prevent redundant re-fetches if user is already in state
    // This stops the infinite loop from DataContext's useEffect triggering reloadUser repeatedly
    if (user && user.id === authId && user.email === email && !localStorage.getItem('viajastore_pending_role')) {
      console.log("[AuthContext] fetchUserData: User data already in state, skipping re-fetch for ID:", authId);
      return; 
    }

    console.log("[AuthContext] fetchUserData START for ID:", authId, "Email:", email); // Debug Log
    if (!supabase) return;
    try {
      // 0. Check if Master Admin via Hardcoded Email (Security fallback)
      if (email === 'juannicolas1@gmail.com') {
          console.log("[AuthContext] fetchUserData: User identified as Master Admin"); // Debug Log
          const masterUser: Admin = {
             id: authId,
             name: 'Master Admin',
             email: email,
             role: UserRole.ADMIN,
             avatar: `https://ui-avatars.com/api/?name=MA&background=000&color=fff`,
             createdAt: new Date().toISOString()
          };
          setUser(masterUser);
          console.log("[AuthContext] fetchUserData: Master Admin data set for:", email); // Debug Log
          return;
      }

      // 1. Check profiles table first to determine role
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authId)
        .maybeSingle();
      
      if (profileError) {
          console.error("[AuthContext] Error fetching profile:", profileError); // Debug Log
      }

      if (profileData) {
        console.log("[AuthContext] Profile Found:", profileData); // Debug Log
        // Fix: Ensure AGENCY role check is case-insensitive for robustness
        if (profileData.role && profileData.role.toUpperCase() === UserRole.AGENCY) {
          console.log("[AuthContext] User is Agency, fetching agency data..."); // Debug Log
          const { data: agencyData, error: agencyError } = await supabase
            .from('agencies')
            .select('*')
            .eq('user_id', authId)
            .single();

          if (agencyError || !agencyData) {
            console.warn("[AuthContext] Profile is AGENCY but no record in agencies table (or fetch failed).", agencyError);
            
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
            console.log("[AuthContext] fetchUserData: Temporary Agency data set for:", email); // Debug Log
            return;
          }

          console.log("[AuthContext] Agency Data Found:", agencyData); // Debug Log

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
            subscriptionExpiresAt: agencyData.subscription_expires_at || new Date().toISOString(), 
            website: agencyData.website,
            phone: agencyData.phone,
            address: agencyData.address || {},
            bankInfo: agencyData.bank_info || {}
          };
          setUser(agencyUser);
          console.log("[AuthContext] fetchUserData: Agency data set for:", email); // Debug Log
          return;
        }

        // Handle ADMIN or CLIENT roles
        let mappedRole: UserRole;
        if (profileData.role === 'ADMIN') {
          mappedRole = UserRole.ADMIN;
        } else {
          mappedRole = UserRole.CLIENT;
        }
        
        console.log("[AuthContext] User mapped as:", mappedRole); // Debug Log

        const genericUser: Client | Admin = {
          id: profileData.id,
          name: profileData.full_name || 'Usuário',
          email: email,
          role: mappedRole,
          avatar: profileData.avatar_url, 
          cpf: profileData.cpf,
          phone: profileData.phone,
          favorites: profileData.favorites || [], // Ensure favorites are loaded here
          createdAt: profileData.created_at,
          address: profileData.address || {},
          status: profileData.status || 'ACTIVE'
        } as Client;

        setUser(genericUser);
        console.log("[AuthContext] fetchUserData: Client/Admin data set for:", email); // Debug Log
        return;
      } else {
          console.warn("[AuthContext] No profile found for user:", authId); // Debug Log
      }
      
      setUser(null); 
      console.log("[AuthContext] fetchUserData: No user data found, setting user to null."); // Debug Log

    } catch (error) {
      console.error("[AuthContext] Exception in fetchUserData:", error);
      setUser(null);
    }
  };

  // FIX: Updated `reloadUser` to accept `currentUser` object
  const reloadUser = async (currentUser: User | Client | Agency | Admin | null) => {
    if (currentUser && currentUser.email) {
        console.log("[AuthContext] reloadUser: Initiating re-fetch for current user:", currentUser.email); // Debug Log
        await fetchUserData(currentUser.id, currentUser.email);
    } else {
        console.log("[AuthContext] reloadUser: No current user to reload or email missing."); // Debug Log
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

      console.log("[AuthContext] ensureUserRecord: Ensuring DB record for:", userEmail, "Role:", role); // Debug Log

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
              // Generate unique slug based on agency name (without random numbers)
              const baseSlug = generateSlugFromName(userName);
              const uniqueSlug = await generateUniqueSlug(baseSlug, 'agencies');
              
              // Use RPC for safe creation even in ensureUserRecord
              const { error: agencyError } = await supabase.rpc('create_agency', {
                  p_user_id: userId,
                  p_name: userName,
                  p_email: userEmail,
                  p_phone: userPhone,    // Pass phone to RPC
                  p_whatsapp: userPhone, // Pass phone as whatsapp to RPC
                  p_slug: uniqueSlug
              });

              if (agencyError) {
                  // Fallback: Check if agency already exists, if so, ignore error
                  // Removed 'id' from select, as it's not needed for just checking existence and can sometimes cause issues.
                  const { data: existing } = await supabase.from('agencies').select('user_id').eq('user_id', userId).maybeSingle();
                  if (!existing) {
                      console.error("[AuthContext] RPC ensureUserRecord failed:", agencyError); // Debug Log
                      throw agencyError;
                  }
                  console.log("[AuthContext] ensureUserRecord: Agency already exists, ignoring RPC error."); // Debug Log
              }
          }
          console.log("[AuthContext] ensureUserRecord: DB record ensured successfully."); // Debug Log
          return true;
      } catch (err: any) {
          console.error("[AuthContext] Error ensuring user record:", err.message); // Debug Log
          return false;
      }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      console.log("[AuthContext] Initializing Auth..."); // Debug Log

      if (!supabase) {
        console.warn("[AuthContext] Supabase client not initialized."); // Debug Log
        setUser(null);
        setLoading(false);
        return;
      }
      
      const { data: { session } } = await (supabase.auth as any).getSession();
      
      if (session?.user) {
        console.log("[AuthContext] Session found on init", session.user.email); // Debug Log
        const pendingRole = localStorage.getItem('viajastore_pending_role');
        if (pendingRole) {
            console.log("[AuthContext] Pending role found:", pendingRole); // Debug Log
            await ensureUserRecord(session.user, pendingRole);
            localStorage.removeItem('viajastore_pending_role');
        }
        await fetchUserData(session.user.id, session.user.email!);
      } else {
        console.log("[AuthContext] No session found on init"); // Debug Log
        setUser(null);
      }
      setLoading(false);
      console.log("[AuthContext] Auth initialization finished. User:", user ? user.email : "none"); // Debug Log

      const { data: { subscription } } = (supabase.auth as any).onAuthStateChange(async (event: string, session: any) => {
        console.log("[AuthContext] Auth State Change:", event, session?.user?.email); // Debug Log
        if (session?.user) {
          if (event === 'SIGNED_IN') {
             console.log("[AuthContext] Event: SIGNED_IN"); // Debug Log
             const pendingRole = localStorage.getItem('viajastore_pending_role');
             if (pendingRole) {
                 const success = await ensureUserRecord(session.user, pendingRole);
                 if (success) {
                    localStorage.removeItem('viajastore_pending_role');
                 }
             }
             await fetchUserData(session.user.id, session.user.email!);
          } else if (event === 'USER_UPDATED') {
             console.log("[AuthContext] Event: USER_UPDATED"); // Debug Log
             await fetchUserData(session.user.id, session.user.email!);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log("[AuthContext] Event: SIGNED_OUT, clearing user state."); // Debug Log
          setUser(null);
          localStorage.removeItem('viajastore_pending_role'); // Clear pending role on sign out
        }
      });

      return () => subscription.unsubscribe();
    };

    initializeAuth();
  }, []); 
  
  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) return { success: false, error: 'Backend não configurado.' };
    if (!password) return { success: false, error: 'Senha obrigatória' };
    
    setLoading(true); // Ensure loading is set at the start of login
    console.log("[AuthContext] Attempting login for:", email); // Debug Log
    try {
      const { error } = await (supabase.auth as any).signInWithPassword({
        email,
        password,
      });

      if (error) {
        const msg = error.message === 'Invalid login credentials' ? 'Email ou senha incorretos.' : error.message;
        setLoading(false); // Reset loading on error
        console.error("[AuthContext] Login failed:", error.message); // Debug Log
        return { success: false, error: msg };
      }
      setLoading(false); // Reset loading on success
      console.log("[AuthContext] Login successful for:", email); // Debug Log
      return { success: true };
    } catch (networkError: any) {
      console.error("[AuthContext] Network or unexpected error during login:", networkError); // Debug Log
      setLoading(false); // Reset loading on network error
      return { success: false, error: "Erro de conexão. Verifique sua internet." };
    }
  };

  const loginWithGoogle = async (role?: UserRole, redirectPath?: string) => {
    if (!supabase) return;
    const redirectTo = redirectPath 
        ? `${window.location.origin}/#${redirectPath}` 
        : `${window.location.origin}/`;

    if (role) {
        localStorage.setItem('viajastore_pending_role', role);
        console.log("[AuthContext] Setting pending role for Google login:", role); // Debug Log
    } else {
        localStorage.removeItem('viajastore_pending_role');
    }

    const { error } = await (supabase.auth as any).signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo,
        queryParams: { access_type: 'offline', prompt: 'consent' }
      }
    });
    if (error) console.error("[AuthContext] Google login error:", error); // Debug Log
  };

  const logout = async () => {
    if (supabase) {
      console.log("[AuthContext] Logout triggered. Clearing all local storage and user state."); // Debug Log
      // Clear all local storage data immediately
      localStorage.clear(); 
      setUser(null); // Clear user state
      // Attempt to sign out with Supabase, but catch any errors silently
      await (supabase.auth as any).signOut().catch((e: any) => {
          console.error("[AuthContext] Silent Supabase signout failed:", e); // Debug Log
      });
    }
  };

  const register = async (data: any, role: UserRole): Promise<RegisterResult> => {
    if (!supabase) return { success: false, error: 'Backend não configurado.' };
    
    console.log("[AuthContext] Attempting registration for:", data.email, "Role:", role); // Debug Log

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
            console.warn("[AuthContext] Registration failed: Email already registered."); // Debug Log
             return { success: false, error: 'Este e-mail já está cadastrado. Por favor, faça login.' };
        }
        console.error("[AuthContext] Auth registration failed:", authError.message); // Debug Log
        return { success: false, error: authError.message };
    }
    
    const userId = authData.user?.id;

    // If user is created in auth but not immediately signed in (e.g., email confirmation)
    if (!userId) {
        console.log("[AuthContext] Auth user created, but not signed in (email confirmation likely needed)."); // Debug Log
        return { success: true, message: 'Verifique seu email para confirmar o cadastro.', role: role, email: data.email };
    }

    // 2. Create corresponding DB records. 
    try {
      // 2a. Upsert Profile
      const { error: profileError } = await supabase.from('profiles').upsert({
          id: userId,
          full_name: data.name,
          email: data.email,
          cpf: role === UserRole.CLIENT ? data.cpf : null,
          phone: data.phone,
          role: role.toString(), 
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}`
      }, { onConflict: 'id' });

      if (profileError) {
          console.error("[AuthContext] Profile Upsert Error:", profileError); // Debug Log
          throw profileError;
      }

      // 2b. Insert Agency Record (If applicable)
      if (role === UserRole.AGENCY) {
        // Generate unique slug based on agency name (without random numbers)
        const baseSlug = generateSlugFromName(data.name);
        const uniqueSlug = await generateUniqueSlug(baseSlug, 'agencies');
        
        // Use RPC to bypass potential REST Schema Cache issues
        const { error: agencyError } = await supabase.rpc('create_agency', {
            p_user_id: userId,
            p_name: data.name,
            p_email: data.email,
            p_phone: data.phone,
            p_whatsapp: data.phone,
            p_slug: uniqueSlug
        });
        
        if (agencyError) {
            console.error("[AuthContext] Supabase Agency RPC Insert Error:", agencyError); // Debug Log
            throw agencyError;
        }
      }

      // If we reach here, DB operations succeeded
      // Force fetch the user data so the context updates immediately
      await fetchUserData(userId, data.email);
      console.log("[AuthContext] Registration successful, DB records created."); // Debug Log
      
      return { success: true, message: 'Conta criada com sucesso!', role: role, userId: userId, email: data.email };

    } catch (dbError: any) {
      console.error("[AuthContext] DB Registration Process Failed:", dbError); // Debug Log
      
      // SPECIAL HANDLING: If error is Schema Cache (PGRST204) BUT the user was created in Auth
      if (dbError.code === "PGRST204" || dbError.message?.includes('schema cache') || dbError.message?.includes('user_id')) {
        console.warn("[AuthContext] Recovering from Schema Cache error - treating as success to allow login."); // Debug Log
        
        // Generate slug without random numbers (fallback mode - will be corrected on next login)
        const baseSlug = generateSlugFromName(data.name);
        
        // Force state locally so user isn't stuck
        if (role === UserRole.AGENCY) {
            const fallbackAgency: Agency = {
                id: userId,
                agencyId: 'pending-' + userId,
                name: data.name,
                email: data.email,
                role: UserRole.AGENCY,
                is_active: false,
                slug: baseSlug, // Will be corrected to unique slug on next login
                phone: data.phone,
                whatsapp: data.phone,
                cnpj: '',
                description: '',
                logo: '',
                heroMode: 'TRIPS',
                subscriptionStatus: 'INACTIVE',
                subscriptionPlan: 'BASIC',
                subscriptionExpiresAt: new Date().toISOString(),
            };
            setUser(fallbackAgency);
        } else {
            setUser({
                id: userId,
                name: data.name,
                email: data.email,
                role: UserRole.CLIENT,
                favorites: [],
            } as Client);
        }

        return { 
            success: true, 
            role: role, 
            userId: userId, 
            email: data.email,
            message: "Conta criada! Se houver erro ao carregar o painel, recarregue a página."
        };
      }

      return { success: false, error: `Falha ao salvar dados: ${dbError.message || dbError.details || 'Erro desconhecido'}. Tente novamente.` };
    }
  };

  const updateUser = async (userData: Partial<Client | Agency>): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) return { success: false, error: 'Backend não configurado.' };
    if (!user) return { success: false, error: 'Usuário não logado' };
    
    console.log("[AuthContext] updateUser: Attempting to update user data for:", user.email, "Updates:", userData); // Debug Log

    try {
      // Fix: Normalize emails to avoid unnecessary Auth API calls and 429 errors.
      let shouldUpdateAuthEmail = false;
      if (userData.email && user.email) {
          const newEmail = userData.email.trim().toLowerCase();
          const currentEmail = user.email.trim().toLowerCase();
          // Only flag for update if they are genuinely different
          if (newEmail !== currentEmail) {
              shouldUpdateAuthEmail = true;
              console.log("[AuthContext] updateUser: Email change detected, will update Auth email."); // Debug Log
          }
      }

      // 2. Only call Auth API if necessary
      if (shouldUpdateAuthEmail && userData.email) {
          const { error } = await (supabase.auth as any).updateUser({ email: userData.email });
          if (error) throw error;
          console.log("[AuthContext] updateUser: Auth email updated successfully."); // Debug Log
      }

      if (user.role === UserRole.AGENCY) {
        const updates: any = {};
        if (userData.name) updates.name = userData.name;
        
        // --- SLUG LOGIC FOR AGENCY PROFILE UPDATE ---
        // Allow slug update if:
        // 1. Slug is currently empty (first time setting)
        // 2. Admin is explicitly updating (slug provided in userData)
        // Validate slug format before updating
        if ((userData as Agency).slug !== undefined) {
          const newSlug = (userData as Agency).slug || '';
          if (newSlug.trim()) {
            // Validate slug format
            const { validateSlug } = await import('../utils/slugUtils');
            const validation = validateSlug(newSlug.trim());
            if (validation.valid) {
              // Check if slug is unique (if not empty and different from current)
              if ((user as Agency).slug !== newSlug.trim()) {
                const { generateUniqueSlug } = await import('../utils/slugUtils');
                const uniqueSlug = await generateUniqueSlug(newSlug.trim(), 'agencies', user.id);
                updates.slug = uniqueSlug;
              } else {
                updates.slug = newSlug.trim();
              }
            } else {
              console.warn(`[AuthContext] Slug inválido ignorado: ${validation.error}`);
            }
          } else if ((user as Agency).slug === '') {
            // If current slug is empty and new slug is also empty, generate from name
            const { generateSlugFromName, generateUniqueSlug } = await import('../utils/slugUtils');
            const baseSlug = generateSlugFromName(user.name);
            const uniqueSlug = await generateUniqueSlug(baseSlug, 'agencies', user.id);
            updates.slug = uniqueSlug;
          }
        }

        if ((userData as Agency).description !== undefined) updates.description = (userData as Agency).description; 
        if ((userData as Agency).cnpj !== undefined) updates.cnpj = (userData as Agency).cnpj;
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
        if ((userData as Agency).subscriptionExpiresAt) updates.subscription_expires_at = (userData as Agency).subscriptionExpiresAt;


        const { error } = await supabase.from('agencies').update(updates).eq('user_id', user.id); 
        if (error) {
             // Fallback: If update fails, maybe the record was never created (rare). Try Upsert.
             console.warn("[AuthContext] Agency update failed, trying upsert...", error); // Debug Log
             await supabase.from('agencies').upsert({ user_id: user.id, ...updates }, { onConflict: 'user_id' });
        }
        console.log("[AuthContext] Agency DB profile updated."); // Debug Log
        
      } else {
        const updates: any = {};
        if (userData.name) updates.full_name = userData.name;
        if ((userData as Client).phone) updates.phone = (userData as Client).phone;
        if ((userData as Client).cpf) updates.cpf = (userData as Client).cpf;
        if (userData.avatar) updates.avatar_url = userData.avatar;
        if (userData.address) updates.address = (userData as Client).address;
        if ((userData as Client).favorites) updates.favorites = (userData as Client).favorites;


        const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
        if (error) throw error;
        console.log("[AuthContext] Client DB profile updated."); // Debug Log
      }

      // After successful DB update, update the local AuthContext user state
      setUser({ ...user, ...userData } as any);
      console.log("[AuthContext] Local user state updated after DB save."); // Debug Log
      return { success: true };

    } catch (error: any) {
        console.error("[AuthContext] Error updating user:", error); // Debug Log
        return { success: false, error: error.message };
    }
  };

  const updatePassword = async (password: string) => {
      if (!supabase) return { success: false, error: 'Backend não configurado.' };
      console.log("[AuthContext] Attempting to update password."); // Debug Log
      const { error } = await (supabase.auth as any).updateUser({ password });
      if (error) {
        console.error("[AuthContext] Password update failed:", error.message); // Debug Log
        return { success: false, error: error.message };
      }
      console.log("[AuthContext] Password updated successfully."); // Debug Log
      return { success: true };
  };

  const uploadImage = async (file: File, bucket: 'avatars' | 'agency-logos' | 'trip-images'): Promise<string | null> => {
      if (!supabase) return null;
      if (!user) {
        console.warn("[AuthContext] Cannot upload image: No user logged in."); // Debug Log
        return null;
      }
      console.log("[AuthContext] Attempting to upload image to bucket:", bucket); // Debug Log
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
              .from(bucket)
              .upload(fileName, file, { upsert: true });

          if (uploadError) throw uploadError;

          const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
          console.log("[AuthContext] Image uploaded successfully. URL:", data.publicUrl); // Debug Log
          return data.publicUrl;
      } catch (error) {
          console.error("[AuthContext] Upload error:", error); // Debug Log
          return null;
      }
  };

  const deleteAccount = async (password: string): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) return { success: false, error: "Backend não configurado." };
    if (!user) return { success: false, error: "Usuário não autenticado" };

    console.log("[AuthContext] Attempting to delete account for:", user.email); // Debug Log

    try {
      // First, re-authenticate the user if password is provided (for security)
      // Supabase's deleteUser doesn't take password, but we can do a dummy login to verify.
      if (password) {
        console.log("[AuthContext] Re-authenticating user for deletion verification."); // Debug Log
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: password,
        });
        if (signInError) {
          console.error("[AuthContext] Re-authentication failed:", signInError.message); // Debug Log
          throw new Error('Credenciais inválidas. Não foi possível verificar a senha para exclusão.');
        }
      }

      // Delete associated DB records (profiles, agencies, client-specific data)
      console.log("[AuthContext] Deleting associated DB records..."); // Debug Log
      if (user.role === UserRole.CLIENT) {
        await supabase.from('bookings').delete().eq('client_id', user.id);
        await supabase.from('agency_reviews').delete().eq('client_id', user.id);
        await supabase.from('profiles').delete().eq('id', user.id);
        console.log("[AuthContext] Client DB records deleted."); // Debug Log
      } else if (user.role === UserRole.AGENCY) {
        // More complex deletion for agency: trips, reviews, then agency, then profile
        const { data: agencyData } = await supabase.from('agencies').select('id').eq('user_id', user.id).single();
        if (agencyData) {
          await supabase.from('trips').delete().eq('agency_id', agencyData.id);
          await supabase.from('agency_reviews').delete().eq('agency_id', agencyData.id);
          await supabase.from('agencies').delete().eq('id', agencyData.id);
        }
        await supabase.from('profiles').delete().eq('id', user.id);
        console.log("[AuthContext] Agency DB records deleted."); // Debug Log
      } else if (user.role === UserRole.ADMIN) {
         // Admin deletion should be handled via admin dashboard or a separate protected function.
         // For a client-side delete, we assume an admin wouldn't self-delete this way.
         console.warn("[AuthContext] Attempted to delete Admin account via client-side function."); // Debug Log
         throw new Error("Admin accounts cannot be deleted via client dashboard.");
      }

      // Finally, delete the Auth user (this requires admin privileges or RLS setup correctly for current user)
      console.log("[AuthContext] Attempting to delete Auth user."); // Debug Log
      const { error: authDeleteError } = await (supabase.auth as any).admin.deleteUser(user.id);
      if (authDeleteError) {
        console.warn(`[AuthContext] Could not delete Auth user ${user.id} using admin API: ${authDeleteError.message}. Attempting self-delete.`); // Debug Log
        // If admin.deleteUser fails (e.g., not service_role key), try client-side self-delete
        const { error: selfDeleteError } = await supabase.auth.signOut(); // Ensure sign out first
        if (selfDeleteError) console.warn("[AuthContext] Error signing out user before self-delete:", selfDeleteError); // Debug Log
        const { error: finalAuthError } = await (supabase.auth as any).deleteUser(); // This is for the logged-in user
        if (finalAuthError) throw finalAuthError;
        console.log("[AuthContext] Auth user self-deleted successfully."); // Debug Log
      } else {
        console.log("[AuthContext] Auth user deleted successfully via admin API."); // Debug Log
      }
      
      setUser(null);
      localStorage.clear(); // Ensure all local session data is gone
      console.log("[AuthContext] Account deleted successfully. User state and local storage cleared."); // Debug Log
      return { success: true };

    } catch (error: any) {
      console.error("[AuthContext] Erro ao excluir conta:", error); // Debug Log
      return { success: false, error: error.message || "Erro ao excluir conta" };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout, register, updateUser, updatePassword, deleteAccount, uploadImage, reloadUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};