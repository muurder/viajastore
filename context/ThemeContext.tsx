
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemePalette } from '../types';

// Helper to convert Hex to RGB for Tailwind Variables
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` 
    : '59 130 246'; // fallback blue
};

// Default Themes
const DEFAULT_THEMES: ThemePalette[] = [
  {
    id: 'default',
    name: 'Azul Oceano (Padrão)',
    colors: { primary: '#3b82f6', secondary: '#f97316', background: '#f9fafb', text: '#111827' },
    isActive: true,
    isDefault: true
  },
  {
    id: 'dark-mode',
    name: 'Modo Noturno',
    colors: { primary: '#6366f1', secondary: '#a855f7', background: '#1f2937', text: '#f9fafb' },
    isActive: false,
    isDefault: false
  },
  {
    id: 'nature',
    name: 'Verde Natureza',
    colors: { primary: '#059669', secondary: '#d97706', background: '#ecfdf5', text: '#064e3b' },
    isActive: false,
    isDefault: false
  },
  {
    id: 'royal',
    name: 'Roxo Real',
    colors: { primary: '#7c3aed', secondary: '#db2777', background: '#f5f3ff', text: '#4c1d95' },
    isActive: false,
    isDefault: false
  }
];

interface ThemeContextType {
  themes: ThemePalette[];
  activeTheme: ThemePalette;
  setTheme: (themeId: string) => void;
  addTheme: (theme: ThemePalette) => void;
  deleteTheme: (themeId: string) => void;
  previewTheme: (theme: ThemePalette) => void; // Temporarily apply without saving
  resetPreview: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themes, setThemes] = useState<ThemePalette[]>(DEFAULT_THEMES);
  const [activeTheme, setActiveTheme] = useState<ThemePalette>(DEFAULT_THEMES[0]);
  const [previewMode, setPreviewMode] = useState<ThemePalette | null>(null);

  // Load from localStorage or Supabase in real app
  useEffect(() => {
      const savedThemeId = localStorage.getItem('viajastore_theme_id');
      if (savedThemeId) {
          const saved = themes.find(t => t.id === savedThemeId);
          if (saved) setActiveTheme(saved);
      }
  }, []);

  // Apply CSS Variables
  useEffect(() => {
    const theme = previewMode || activeTheme;
    const root = document.documentElement;

    // Primary Palette Generation (Simple lightening/darkening logic simulation)
    // In a real app, we would calculate shades properly. Here we use the main color for 500/600
    const primaryRgb = hexToRgb(theme.colors.primary);
    const secondaryRgb = hexToRgb(theme.colors.secondary);

    root.style.setProperty('--color-primary-50', primaryRgb); // Would be lighter
    root.style.setProperty('--color-primary-100', primaryRgb); // Would be lighter
    root.style.setProperty('--color-primary-500', primaryRgb);
    root.style.setProperty('--color-primary-600', primaryRgb); // Would be darker
    root.style.setProperty('--color-primary-700', primaryRgb); // Would be darker
    root.style.setProperty('--color-primary-900', primaryRgb); // Would be darker
    
    root.style.setProperty('--color-secondary-500', secondaryRgb);
    root.style.setProperty('--color-secondary-600', secondaryRgb);

    // Apply background if needed (requires Tailwind config change to use var, or just body style)
    // document.body.style.backgroundColor = theme.colors.background;
    // document.body.style.color = theme.colors.text;

  }, [activeTheme, previewMode]);

  const setTheme = (themeId: string) => {
      const newTheme = themes.find(t => t.id === themeId);
      if (newTheme) {
          setActiveTheme(newTheme);
          localStorage.setItem('viajastore_theme_id', themeId);
      }
  };

  const addTheme = (theme: ThemePalette) => {
      setThemes(prev => [...prev, theme]);
  };

  const deleteTheme = (themeId: string) => {
      setThemes(prev => prev.filter(t => t.id !== themeId));
  };

  const previewTheme = (theme: ThemePalette) => {
      setPreviewMode(theme);
  };

  const resetPreview = () => {
      setPreviewMode(null);
  };

  return (
    <ThemeContext.Provider value={{ themes, activeTheme, setTheme, addTheme, deleteTheme, previewTheme, resetPreview }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
