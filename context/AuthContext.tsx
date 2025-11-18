import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole, Client, Agency, Admin } from '../types';
import { MOCK_CLIENTS, MOCK_AGENCIES, MOCK_ADMINS } from '../services/mockData';

interface AuthContextType {
  user: User | Client | Agency | Admin | null;
  login: (email: string, role: UserRole) => boolean;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, role: UserRole): boolean => {
    let foundUser: User | undefined;

    if (role === UserRole.CLIENT) {
      foundUser = MOCK_CLIENTS.find(c => c.email === email);
    } else if (role === UserRole.AGENCY) {
      foundUser = MOCK_AGENCIES.find(a => a.email === email);
    } else if (role === UserRole.ADMIN) {
      foundUser = MOCK_ADMINS.find(a => a.email === email);
    }

    if (foundUser) {
      setUser(foundUser);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData } as User);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};