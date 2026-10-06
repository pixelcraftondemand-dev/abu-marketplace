"use client";

import { useEffect, useState, useCallback } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

const STORAGE_KEY = "abu-theme";

/**
 * Reads the persisted theme from localStorage.
 * Returns "light" | "dark" | null (null = use OS preference).
 */
function getPersistedTheme() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Applies the theme class to <html> and persists to localStorage.
 */
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else if (theme === "light") {
    root.classList.add("light");
    root.classList.remove("dark");
  } else {
    // OS preference
    root.classList.remove("dark", "light");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  }
}

/**
 * Resolves the effective theme (what's actually applied) given a preference.
 */
function resolveTheme(preference) {
  if (preference === "dark" || preference === "light") return preference;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Theme toggle button — cycles through light → dark → OS-preference.
 * Renders in the navbar for quick access.
 */
export function ThemeToggle({ className = "" }) {
  const [preference, setPreference] = useState(null); // "light" | "dark" | null (OS)
  const [resolved, setResolved] = useState("light");

  // Initialize from localStorage on mount
  useEffect(() => {
    const stored = getPersistedTheme();
    setPreference(stored);
    setResolved(resolveTheme(stored));
    applyTheme(stored);
  }, []);

  // Listen for OS changes when in OS-preference mode
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (preference === null) {
        applyTheme(null);
        setResolved(resolveTheme(null));
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  const cycle = useCallback(() => {
    // light → dark → OS → light
    const next =
      preference === "light" ? "dark" : preference === "dark" ? null : "light";

    setPreference(next);
    applyTheme(next);
    setResolved(resolveTheme(next));

    try {
      if (next === null) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // localStorage unavailable
    }
  }, [preference]);

  const Icon = resolved === "dark" ? Moon : Sun;
  const label =
    preference === null
      ? "Theme: OS preference"
      : preference === "dark"
        ? "Theme: Dark"
        : "Theme: Light";

  return (
    <button
      onClick={cycle}
      className={`p-2 rounded-full hover:bg-[var(--bg-muted)] transition-colors ${className}`}
      aria-label={label}
      title={label}
    >
      <Icon size={18} className="text-[var(--text-secondary)]" />
    </button>
  );
}

/**
 * Injected into <head> to prevent flash of wrong theme on initial load.
 * This script runs before React hydrates, so the correct theme class is
 * applied before any component renders.
 */
export function ThemeScript() {
  // This is rendered as a string — Next.js injects it into <head>
  return null; // The actual script is in the layout's <head>
}

/**
 * The inline script that resolves theme before first paint.
 * Must be placed in the root layout's <head> as a dangerouslySetInnerHTML script.
 */
export const THEME_INIT_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = stored === 'dark' || (stored !== 'light' && prefersDark);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  } catch(e) {}
})();
`;
