
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemePalette } from '../types';

// Helper to convert Hex to RGB Array [r, g, b]
const hexToRgbArray = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] 
    : [59, 130, 246]; // fallback blue
};

// Mix color with white (tint) or black (shade)
// weight: 0 to 1. 
const mix = (color: number, mixColor: number, weight: number) => {
  return Math.round(color + (mixColor - color) * weight);
}

// Generate lighter shade (mix with white)
const tint = (rgb: [number, number, number], weight: number) => {
    return `${mix(rgb[0], 255, weight)} ${mix(rgb[1], 255, weight)} ${mix(rgb[2], 255, weight)}`;
}

// Generate darker shade (mix with black)
const shade = (rgb: [number, number, number], weight: number) => {
    return `${mix(rgb[0], 0, weight)} ${mix(rgb[1], 0, weight)} ${mix(rgb[2], 0, weight)}`;
}

const rgbString = (rgb: [number, number, number]) => `${rgb[0]} ${rgb[1]} ${rgb[2]}`;

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

  // Load from localStorage
  useEffect(() => {
      const savedThemeId = localStorage.getItem('viajastore_theme_id');
      if (savedThemeId) {
          const saved = themes.find(t => t.id === savedThemeId);
          if (saved) setActiveTheme(saved);
      }
  }, []);

  // Apply CSS Variables with proper shading
  useEffect(() => {
    const theme = previewMode || activeTheme;
    const root = document.documentElement;

    const primary = hexToRgbArray(theme.colors.primary);
    const secondary = hexToRgbArray(theme.colors.secondary);

    // Primary Palette Generation
    root.style.setProperty('--color-primary-50', tint(primary, 0.95)); // Very Light
    root.style.setProperty('--color-primary-100', tint(primary, 0.8)); // Light
    root.style.setProperty('--color-primary-500', rgbString(primary)); // Base
    root.style.setProperty('--color-primary-600', shade(primary, 0.1)); // Slightly Darker (hover)
    root.style.setProperty('--color-primary-700', shade(primary, 0.2)); // Darker (text)
    root.style.setProperty('--color-primary-900', shade(primary, 0.4)); // Very Dark

    // Secondary Palette Generation
    root.style.setProperty('--color-secondary-500', rgbString(secondary));
    root.style.setProperty('--color-secondary-600', shade(secondary, 0.1));

    // Optional: Apply background if needed
    // document.body.style.backgroundColor = theme.colors.background;

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
