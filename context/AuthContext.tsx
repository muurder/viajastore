import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole, Client, Agency, Admin } from '../types';
import { MOCK_CLIENTS, MOCK_AGENCIES, MOCK_ADMINS } from '../services/mockData';

interface AuthContextType {
  user: User | Client | Agency | Admin | null;
  login: (email: string, role: UserRole) => boolean;
  logout: () => void;
  register: (newUser: Client | Agency) => void;
  updateUser: (userData: Partial<User>) => void;
  // Expose the "DB" for other components to check existence
  allClients: Client[];
  allAgencies: Agency[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Simulate a database in state
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [agencies, setAgencies] = useState<Agency[]>(MOCK_AGENCIES);
  const [admins] = useState<Admin[]>(MOCK_ADMINS);
  
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, role: UserRole): boolean => {
    let foundUser: User | undefined;

    if (role === UserRole.CLIENT) {
      foundUser = clients.find(c => c.email === email);
    } else if (role === UserRole.AGENCY) {
      foundUser = agencies.find(a => a.email === email);
    } else if (role === UserRole.ADMIN) {
      foundUser = admins.find(a => a.email === email);
    }

    if (foundUser) {
      setUser(foundUser);
      // Persist simple session
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
    // Auto login after register
    setUser(newUser);
    localStorage.setItem('viajastore_user', JSON.stringify(newUser));
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...userData } as User;
      setUser(updated);
      localStorage.setItem('viajastore_user', JSON.stringify(updated));
    }
  };

  // Restore session on load
  React.useEffect(() => {
    const stored = localStorage.getItem('viajastore_user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

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