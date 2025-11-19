
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, UserRole, Client, Agency, Admin } from '../types';
import { MOCK_CLIENTS, MOCK_AGENCIES, MOCK_ADMINS } from '../services/mockData';

interface AuthContextType {
  user: User | Client | Agency | Admin | null;
  login: (email: string, password?: string, role?: UserRole) => boolean;
  logout: () => void;
  register: (newUser: Client | Agency) => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load initial lists logic is now handled purely via DataContext for the source of truth,
  // But AuthContext needs to verify credentials against stored data.
  // To avoid circular dependencies or complex rewrites, we will read from localStorage here too for Auth purposes.

  const getStoredClients = () => {
    const stored = localStorage.getItem('vs_clients');
    return stored ? JSON.parse(stored) : MOCK_CLIENTS;
  };

  const getStoredAgencies = () => {
    const stored = localStorage.getItem('vs_agencies');
    return stored ? JSON.parse(stored) : MOCK_AGENCIES;
  };

  const getStoredAdmins = () => MOCK_ADMINS;

  useEffect(() => {
    const storedUser = localStorage.getItem('viajastore_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // Re-validate existence
      let validUser = null;
      if (parsedUser.role === UserRole.CLIENT) {
        validUser = getStoredClients().find((c: Client) => c.id === parsedUser.id);
      } else if (parsedUser.role === UserRole.AGENCY) {
        validUser = getStoredAgencies().find((a: Agency) => a.id === parsedUser.id);
      } else {
        validUser = getStoredAdmins().find((a: Admin) => a.id === parsedUser.id);
      }

      if (validUser) {
        setUser(validUser);
      } else {
        localStorage.removeItem('viajastore_user');
      }
    }
    setIsInitialized(true);
  }, []);

  const login = (email: string, password?: string, role?: UserRole): boolean => {
    const clients = getStoredClients();
    const agencies = getStoredAgencies();
    const admins = getStoredAdmins();

    let foundUser: any;

    // If role is provided, search specific list, otherwise search all (less performant but flexible)
    if (role === UserRole.CLIENT) foundUser = clients.find((c: Client) => c.email === email);
    else if (role === UserRole.AGENCY) foundUser = agencies.find((a: Agency) => a.email === email);
    else if (role === UserRole.ADMIN) foundUser = admins.find((a: Admin) => a.email === email);
    else {
        foundUser = clients.find((c: Client) => c.email === email) || 
                    agencies.find((a: Agency) => a.email === email) || 
                    admins.find((a: Admin) => a.email === email);
    }

    if (foundUser) {
        // Simple password check (in production this would be hashed)
        if (password && foundUser.password && foundUser.password !== password) {
            return false;
        }
        setUser(foundUser);
        localStorage.setItem('viajastore_user', JSON.stringify(foundUser));
        return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('viajastore_user');
    window.location.href = '/'; // Hard redirect to clear any temp states
  };

  const register = (newUser: Client | Agency) => {
    // Save to LocalStorage "Database"
    if (newUser.role === UserRole.CLIENT) {
      const currentClients = getStoredClients();
      const updatedClients = [...currentClients, newUser];
      localStorage.setItem('vs_clients', JSON.stringify(updatedClients));
    } else if (newUser.role === UserRole.AGENCY) {
      const currentAgencies = getStoredAgencies();
      const updatedAgencies = [...currentAgencies, newUser];
      localStorage.setItem('vs_agencies', JSON.stringify(updatedAgencies));
    }
    
    // Set Session
    setUser(newUser);
    localStorage.setItem('viajastore_user', JSON.stringify(newUser));
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData } as User;
      setUser(updatedUser);
      localStorage.setItem('viajastore_user', JSON.stringify(updatedUser));
      
      // Also update in the "Database" via DataContext logic (which syncs with LS)
      // But since we are in AuthContext, we must update LS directly here to ensure consistency on reload
      if (updatedUser.role === UserRole.CLIENT) {
          const list = getStoredClients().map((c: Client) => c.id === updatedUser.id ? { ...c, ...userData } : c);
          localStorage.setItem('vs_clients', JSON.stringify(list));
      } else if (updatedUser.role === UserRole.AGENCY) {
          const list = getStoredAgencies().map((a: Agency) => a.id === updatedUser.id ? { ...a, ...userData } : a);
          localStorage.setItem('vs_agencies', JSON.stringify(list));
      }
    }
  };

  if (!isInitialized) return null; // Prevent flickering

  return (
    <AuthContext.Provider value={{ user, login, logout, register, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
