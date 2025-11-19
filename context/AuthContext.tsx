import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, UserRole, Client, Agency, Admin } from '../types';
import { MOCK_CLIENTS, MOCK_AGENCIES, MOCK_ADMINS } from '../services/mockData';

interface AuthContextType {
  user: User | Client | Agency | Admin | null;
  login: (email: string, role: UserRole) => boolean;
  logout: () => void;
  register: (newUser: Client | Agency) => void;
  updateUser: (userData: Partial<User>) => void;
  allClients: Client[];
  allAgencies: Agency[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize from LocalStorage or fallback to Mock
  const [clients, setClients] = useState<Client[]>(() => {
    const stored = localStorage.getItem('vs_clients');
    return stored ? JSON.parse(stored) : MOCK_CLIENTS;
  });

  const [agencies, setAgencies] = useState<Agency[]>(() => {
    const stored = localStorage.getItem('vs_agencies');
    return stored ? JSON.parse(stored) : MOCK_AGENCIES;
  });

  const [admins] = useState<Admin[]>(MOCK_ADMINS); // Admins usually static in frontend mocks
  
  const [user, setUser] = useState<User | null>(null);

  // Persist changes to LS whenever lists change
  useEffect(() => {
    localStorage.setItem('vs_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('vs_agencies', JSON.stringify(agencies));
  }, [agencies]);

  const login = (email: string, role: UserRole): boolean => {
    let foundUser: User | undefined;

    // Refresh data from state
    if (role === UserRole.CLIENT) {
      foundUser = clients.find(c => c.email === email);
    } else if (role === UserRole.AGENCY) {
      foundUser = agencies.find(a => a.email === email);
    } else if (role === UserRole.ADMIN) {
      foundUser = admins.find(a => a.email === email);
    }

    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('viajastore_user', JSON.stringify(foundUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('viajastore_user');
  };

  const register = (newUser: Client | Agency) => {
    if (newUser.role === UserRole.CLIENT) {
      setClients(prev => [...prev, newUser as Client]);
    } else if (newUser.role === UserRole.AGENCY) {
      setAgencies(prev => [...prev, newUser as Agency]);
    }
    // Auto login
    setUser(newUser);
    localStorage.setItem('viajastore_user', JSON.stringify(newUser));
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData } as User;
      setUser(updatedUser);
      localStorage.setItem('viajastore_user', JSON.stringify(updatedUser));

      // Update in the lists
      if (user.role === UserRole.CLIENT) {
        setClients(prev => prev.map(c => c.id === user.id ? { ...c, ...userData } as Client : c));
      } else if (user.role === UserRole.AGENCY) {
        setAgencies(prev => prev.map(a => a.id === user.id ? { ...a, ...userData } as Agency : a));
      }
    }
  };

  // Restore session on load
  useEffect(() => {
    const stored = localStorage.getItem('viajastore_user');
    if (stored) {
      const parsedUser = JSON.parse(stored);
      // Verify if user still exists in our "DB" to avoid stale sessions
      let validUser = null;
      if (parsedUser.role === UserRole.CLIENT) {
        validUser = clients.find(c => c.id === parsedUser.id);
      } else if (parsedUser.role === UserRole.AGENCY) {
        validUser = agencies.find(a => a.id === parsedUser.id);
      } else {
        validUser = admins.find(a => a.id === parsedUser.id);
      }

      if (validUser) {
         setUser(validUser);
      } else {
         localStorage.removeItem('viajastore_user'); // Invalid session
      }
    }
  }, []); // Run once on mount, but we rely on initial state for lists

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      register, 
      updateUser,
      allClients: clients,
      allAgencies: agencies 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};