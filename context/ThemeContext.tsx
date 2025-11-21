
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemePalette } from '../types';
import { supabase } from '../services/supabase';

// Helper to convert Hex to RGB Array [r, g, b]
const hexToRgbArray = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] 
    : [59, 130, 246]; // fallback blue
};

// Mix color with white (tint) or black (shade)
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

// Fallback Themes in case DB is empty or loading
const FALLBACK_THEME: ThemePalette = {
    id: 'default',
    name: 'Azul Oceano (Padrão)',
    colors: { primary: '#3b82f6', secondary: '#f97316', background: '#f9fafb', text: '#111827' },
    isActive: true,
    isDefault: true
};

interface ThemeContextType {
  themes: ThemePalette[];
  activeTheme: ThemePalette;
  loading: boolean;
  setTheme: (themeId: string) => Promise<void>;
  addTheme: (theme: Partial<ThemePalette>) => Promise<string | null>; // Returns ID
  deleteTheme: (themeId: string) => Promise<void>;
  previewTheme: (theme: ThemePalette) => void; // Temporarily apply without saving
  resetPreview: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themes, setThemes] = useState<ThemePalette[]>([FALLBACK_THEME]);
  const [activeTheme, setActiveTheme] = useState<ThemePalette>(FALLBACK_THEME);
  const [previewMode, setPreviewMode] = useState<ThemePalette | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch Themes from Supabase
  const fetchThemes = async () => {
      try {
          const { data, error } = await supabase
            .from('themes')
            .select('*')
            .order('created_at', { ascending: true });
          
          if (error) throw error;

          if (data && data.length > 0) {
              const formattedThemes: ThemePalette[] = data.map((t: any) => ({
                  id: t.id,
                  name: t.name,
                  colors: t.colors,
                  isActive: t.is_active,
                  isDefault: t.is_default
              }));
              setThemes(formattedThemes);
              
              const currentActive = formattedThemes.find(t => t.isActive);
              if (currentActive) setActiveTheme(currentActive);
          }
      } catch (error) {
          console.error("Error fetching themes:", error);
          // Keep fallback
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      fetchThemes();

      // --- REALTIME SUBSCRIPTION ---
      // This listens to ANY change in the 'themes' table.
      // When the admin sets 'is_active' to true, ALL clients will receive this event
      // and re-fetch the themes, automatically applying the new active theme.
      const channel = supabase
        .channel('public:themes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'themes' }, (payload) => {
            console.log('Theme change detected!', payload);
            fetchThemes();
        })
        .subscribe();

      return () => {
          supabase.removeChannel(channel);
      };
  }, []);

  // Apply CSS Variables to :root
  useEffect(() => {
    const theme = previewMode || activeTheme;
    const root = document.documentElement;

    if (!theme?.colors?.primary) return; // Safety check

    const primary = hexToRgbArray(theme.colors.primary);
    const secondary = hexToRgbArray(theme.colors.secondary);

    // Primary Palette Generation
    root.style.setProperty('--color-primary-50', tint(primary, 0.95)); 
    root.style.setProperty('--color-primary-100', tint(primary, 0.8)); 
    root.style.setProperty('--color-primary-500', rgbString(primary)); 
    root.style.setProperty('--color-primary-600', shade(primary, 0.1)); 
    root.style.setProperty('--color-primary-700', shade(primary, 0.2)); 
    root.style.setProperty('--color-primary-900', shade(primary, 0.4)); 

    // Secondary Palette Generation
    root.style.setProperty('--color-secondary-500', rgbString(secondary));
    root.style.setProperty('--color-secondary-600', shade(secondary, 0.1));

  }, [activeTheme, previewMode]);

  const setTheme = async (themeId: string) => {
      // Optimistic UI update (instant feedback for the user who clicked)
      const targetTheme = themes.find(t => t.id === themeId);
      if (targetTheme) setActiveTheme(targetTheme);

      try {
          // Transaction-like behavior:
          // 1. Set all to inactive
          await supabase.from('themes').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000'); 
          
          // 2. Set target to active
          const { error } = await supabase.from('themes').update({ is_active: true }).eq('id', themeId);
          
          if (error) throw error;
          
          // We don't necessarily need to fetchThemes() here because the Realtime subscription
          // will trigger it, but calling it ensures local consistency if realtime is slow.
          await fetchThemes();
      } catch (error) {
          console.error("Error setting theme:", error);
          alert("Erro ao aplicar tema globalmente.");
      }
  };

  const addTheme = async (theme: Partial<ThemePalette>): Promise<string | null> => {
      try {
          const { data, error } = await supabase.from('themes').insert({
              name: theme.name,
              colors: theme.colors,
              is_active: false, // Default to false, must apply explicitly
              is_default: false
          }).select().single();

          if (error) throw error;
          
          // Force refresh to get the new ID into the list
          await fetchThemes(); 
          
          return data ? data.id : null;
      } catch (error) {
          console.error("Error adding theme:", error);
          return null;
      }
  };

  const deleteTheme = async (themeId: string) => {
      try {
          const { error } = await supabase.from('themes').delete().eq('id', themeId);
          if (error) throw error;
          await fetchThemes();
      } catch (error) {
          console.error("Error deleting theme:", error);
      }
  };

  const previewTheme = (theme: ThemePalette) => {
      setPreviewMode(theme);
  };

  const resetPreview = () => {
      setPreviewMode(null);
  };

  return (
    <ThemeContext.Provider value={{ themes, activeTheme, loading, setTheme, addTheme, deleteTheme, previewTheme, resetPreview }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
