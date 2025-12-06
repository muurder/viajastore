// This file is created to ensure the ThemeContext exists and is functional.
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ThemeColors, ThemePalette } from '../types';

interface ThemeContextType {
  activeTheme: ThemePalette;
  setAgencyTheme: (colors: ThemeColors) => void;
  resetAgencyTheme: () => void;
}

const defaultTheme: ThemePalette = {
  id: 'default',
  name: 'Default',
  colors: { primary: '#3b82f6', secondary: '#f97316', background: '#f9fafb', text: '#111827' },
  isActive: true,
  isDefault: true,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTheme, setActiveTheme] = useState<ThemePalette>(defaultTheme);

  // Simplified logic for this fix
  const setAgencyTheme = (colors: ThemeColors) => {
    // In a real app, this would apply CSS variables
    console.log("Applying agency theme:", colors);
  };

  const resetAgencyTheme = () => {
    console.log("Resetting to default theme");
  };
  
  return (
    <ThemeContext.Provider value={{ activeTheme, setAgencyTheme, resetAgencyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
