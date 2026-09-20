import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const VALID_THEMES = ['dark', 'light', 'midnight', 'emerald'];

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('smartinv_theme');
      if (VALID_THEMES.includes(saved)) return saved;
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('smartinv_theme', theme);
  }, [theme]);

  const cycleTheme = () => {
    setThemeState((prev) => {
      const idx = VALID_THEMES.indexOf(prev);
      return VALID_THEMES[(idx + 1) % VALID_THEMES.length];
    });
  };

  const setTheme = (name) => {
    if (VALID_THEMES.includes(name)) {
      setThemeState(name);
    }
  };

  const isDark = theme !== 'light'; // light is the only "light" mode

  return (
    <ThemeContext.Provider value={{ theme, cycleTheme, setTheme, isDark, themes: VALID_THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
