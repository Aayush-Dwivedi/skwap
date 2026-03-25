import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

const DEFAULT_COLORS = {
  bgPrimary: '77, 59, 67',
  bgSecondary: '53, 37, 42',
  sidebar: '88, 71, 77',
  card: '96, 76, 83',
  accent: '164, 127, 139',
  buttonDark: '74, 59, 64',
  buttonFocus: '109, 86, 93',
  textSecondary: '200, 185, 191',
  textPrimary: '255, 255, 255'
};

export const ThemeProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const [background, setBackground] = useState(() => {
    try {
      const saved = localStorage.getItem('st-wallpaper');
      // Migrate stale paths
      if (saved && saved.includes('/src/assets/')) {
        const migrated = '/bg-wallpaper.png';
        localStorage.setItem('st-wallpaper', migrated);
        return migrated;
      }
      return saved || '/bg-wallpaper.png';
    } catch (e) {
      return '/bg-wallpaper.png';
    }
  });
  const [isDynamic, setIsDynamic] = useState(true);
  // Sync with profile data whenever it changes
  useEffect(() => {
    if (profile) {
      setBackground(profile.themeBackground || '/bg-wallpaper.png');
      setIsDynamic(profile.isDynamicTheme !== false);
    } else if (!user) {
      // Clear profile-specific theme settings on logout
      setBackground('/bg-wallpaper.png');
      setIsDynamic(true);
    }
  }, [profile, user]);

  // Force dark mode attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  useEffect(() => {
    if (!user) {
      // Landing, Login, and Register always use the default Skill Trade branding.
      // We explicitly bypass the saved theme for visitors to maintain brand consistency.
      updateVariablesForBg(DEFAULT_COLORS, '/bg-wallpaper.png', false);
      return;
    }

    if (isDynamic && background) {
      applyThemeFromBackground(background);
    } else {
      updateVariablesForBg(DEFAULT_COLORS, background || '/bg-wallpaper.png');
    }
  }, [background, isDynamic, user]);

  const getDynamicColors = (imgUrl) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = imgUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const sampleSize = 5; // 5x5 grid
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
        const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
        
        let brightest = { r: 0, g: 0, b: 0, lum: -1 };
        let darkest = { r: 0, g: 0, b: 0, lum: 256 };
        let totalR = 0, totalG = 0, totalB = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          
          if (lum > brightest.lum) brightest = { r, g, b, lum };
          if (lum < darkest.lum) darkest = { r, g, b, lum };
          
          totalR += r;
          totalG += g;
          totalB += b;
        }

        const count = data.length / 4;
        resolve({
          brightest: { r: brightest.r, g: brightest.g, b: brightest.b },
          darkest: { r: darkest.r, g: darkest.g, b: darkest.b },
          average: { r: Math.floor(totalR / count), g: Math.floor(totalG / count), b: Math.floor(totalB / count) }
        });
      };
      img.onerror = reject;
    });
  };

  const applyThemeFromBackground = async (bgSource) => {
    try {
      const { brightest, darkest, average } = await getDynamicColors(bgSource);
      
      const rgbToHsl = (r, g, b) => {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) { h = s = 0; }
        else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }
        return [h, s, l];
      };

      const hslToRgb = (h, s, l) => {
        let r, g, b;
        if (s === 0) { r = g = b = l; }
        else {
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
          };
          r = hue2rgb(p, q, h + 1/3);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1/3);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
      };

      const [h, s, l] = rgbToHsl(brightest.r, brightest.g, brightest.b);
      // Boost Saturation (min 70%) and Lightness (min 80%) for maximum "Bright" pop
      const boosted = hslToRgb(h, Math.max(s, 0.7), Math.max(l, 0.8));
      const brightColor = `${boosted[0]}, ${boosted[1]}, ${boosted[2]}`;

      // Calculate luminance for scaling logic
      const lumAverage = (0.299 * average.r + 0.587 * average.g + 0.114 * average.b) / 255;
      const darkScale = (lumAverage > 0.5 ? 0.35 : 0.75);
      const primaryScale = (lumAverage > 0.5 ? 0.45 : 0.85);
      
      const darkColor = `${Math.floor(darkest.r * 0.8)}, ${Math.floor(darkest.g * 0.8)}, ${Math.floor(darkest.b * 0.8)}`;

      const theme = {
        bgPrimary: `${Math.floor(average.r * primaryScale * 0.8)}, ${Math.floor(average.g * primaryScale * 0.8)}, ${Math.floor(average.b * primaryScale * 0.8)}`,
        bgSecondary: `${Math.floor(average.r * darkScale * 0.6)}, ${Math.floor(average.g * darkScale * 0.6)}, ${Math.floor(average.b * darkScale * 0.6)}`,
        sidebar: `${Math.floor(average.r * darkScale * 0.9)}, ${Math.floor(average.g * darkScale * 0.9)}, ${Math.floor(average.b * darkScale * 0.9)}`,
        card: `${Math.min(255, average.r + 30)}, ${Math.min(255, average.g + 30)}, ${Math.min(255, average.b + 30)}`,
        accent: brightColor,
        buttonDark: darkColor,
        buttonFocus: `${Math.min(255, darkest.r + 40)}, ${Math.min(255, darkest.g + 40)}, ${Math.min(255, darkest.b + 40)}`,
        textSecondary: brightColor, // Boosted secondary text as requested
        textPrimary: brightColor,
      };

      updateCssVariables(theme);
    } catch (error) {
      console.error('Error extracting colors:', error);
      resetTheme();
    }
  };

  const resetTheme = () => {
    const defaultBg = '/bg-wallpaper.png';
    setBackground(defaultBg);
    updateVariablesForBg(DEFAULT_COLORS, defaultBg);
  };

  const updateVariablesForBg = (theme, bg, persist = true) => {
    const root = document.documentElement;
    const colors = { ...DEFAULT_COLORS, ...theme };
    
    root.style.setProperty('--st-bg-primary', colors.bgPrimary);
    root.style.setProperty('--st-bg-secondary', colors.bgSecondary);
    root.style.setProperty('--st-sidebar', colors.sidebar);
    root.style.setProperty('--st-card', colors.card);
    root.style.setProperty('--st-accent', colors.accent);
    root.style.setProperty('--st-button-dark', colors.buttonDark);
    root.style.setProperty('--st-button-focus', colors.buttonFocus);
    root.style.setProperty('--st-text-secondary', colors.textSecondary);
    root.style.setProperty('--st-text-primary', colors.textPrimary);
    root.style.setProperty('--st-bg-image', `url("${bg}")`);
    
    if (persist) {
      try {
        localStorage.setItem('st-wallpaper', bg);
        localStorage.setItem('st-theme', JSON.stringify(colors));
      } catch (e) {}
    }
  };

  const updateCssVariables = (theme) => {
    updateVariablesForBg(theme, background);
  };

  const changeBackground = (newBg) => {
    setBackground(newBg);
  };

  const toggleDynamic = () => {
    setIsDynamic(!isDynamic);
  };

  return (
    <ThemeContext.Provider value={{ background, changeBackground, isDynamic, toggleDynamic }}>
      {children}
    </ThemeContext.Provider>
  );
};
