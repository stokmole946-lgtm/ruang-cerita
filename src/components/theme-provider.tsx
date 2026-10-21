'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type AppTheme = 'brutal' | 'ios-glass' | 'midnight';
export type WallpaperPreset = 'paper' | 'aurora' | 'blueprint' | 'nebula' | 'custom';

interface ThemeContextValue {
  theme: AppTheme;
  wallpaper: WallpaperPreset;
  customWallpaper: string;
  setTheme: (theme: AppTheme) => void;
  setWallpaper: (wallpaper: WallpaperPreset) => void;
  setCustomWallpaper: (value: string) => void;
  clearCustomWallpaper: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('brutal');
  const [wallpaper, setWallpaperState] = useState<WallpaperPreset>('paper');
  const [customWallpaper, setCustomWallpaperState] = useState('');

  useEffect(() => {
    const savedTheme = localStorage.getItem('rc-theme') as AppTheme | null;
    const savedWallpaper = localStorage.getItem('rc-wallpaper') as WallpaperPreset | null;
    const savedCustom = localStorage.getItem('rc-custom-wallpaper') || '';
    if (savedTheme && ['brutal', 'ios-glass', 'midnight'].includes(savedTheme)) setThemeState(savedTheme);
    if (savedWallpaper && ['paper', 'aurora', 'blueprint', 'nebula', 'custom'].includes(savedWallpaper)) setWallpaperState(savedWallpaper);
    if (savedCustom) setCustomWallpaperState(savedCustom);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.wallpaper = wallpaper;
    document.documentElement.style.setProperty(
      '--custom-wallpaper',
      wallpaper === 'custom' && customWallpaper ? `url("${customWallpaper}")` : 'none',
    );
  }, [theme, wallpaper, customWallpaper]);

  const setTheme = (value: AppTheme) => {
    setThemeState(value);
    localStorage.setItem('rc-theme', value);
  };
  const setWallpaper = (value: WallpaperPreset) => {
    setWallpaperState(value);
    localStorage.setItem('rc-wallpaper', value);
  };
  const setCustomWallpaper = (value: string) => {
    setCustomWallpaperState(value);
    setWallpaperState('custom');
    localStorage.setItem('rc-custom-wallpaper', value);
    localStorage.setItem('rc-wallpaper', 'custom');
  };
  const clearCustomWallpaper = () => {
    setCustomWallpaperState('');
    setWallpaper('paper');
    localStorage.removeItem('rc-custom-wallpaper');
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      wallpaper,
      customWallpaper,
      setTheme,
      setWallpaper,
      setCustomWallpaper,
      clearCustomWallpaper,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme must be used inside ThemeProvider');
  return context;
}
