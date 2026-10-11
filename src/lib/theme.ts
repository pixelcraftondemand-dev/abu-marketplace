export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'abu_marketplace_theme';

/**
 * Reads initial theme from localStorage or system preferences
 */
export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (err) {
    console.warn('Could not read theme preference:', err);
  }

  return 'light';
}

/**
 * Applies the theme directly to the HTML document root and syncs storage
 */
export function applyTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  
  if (theme === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (err) {
    console.warn('Could not save theme preference:', err);
  }
}
