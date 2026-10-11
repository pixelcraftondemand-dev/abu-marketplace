import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { ThemeMode } from '../lib/theme';

interface ThemeToggleProps {
  theme: ThemeMode;
  onToggle: () => void;
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  theme,
  onToggle,
  className = '',
  showLabel = false,
}) => {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative px-2.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer focus:outline-none flex items-center gap-1.5 text-xs font-semibold ${
        isDark
          ? 'bg-[#15222E] text-amber-300 hover:bg-[#1E2E3D] hover:text-amber-200 border border-amber-400/30 shadow-xs'
          : 'bg-[#0B3B60] text-[#d0e4ff] hover:bg-[#144B77] hover:text-white border border-[#7fa6d0]/30 shadow-2xs'
      } ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-300 transition-transform duration-300 rotate-0 hover:rotate-45" />
          <span className="text-[11px] font-medium text-amber-200 hidden sm:inline">Light</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-[#8df7c1] transition-transform duration-300 -rotate-12 hover:rotate-0" />
          <span className="text-[11px] font-medium text-[#d0e4ff] hidden sm:inline">Dark</span>
        </>
      )}
    </button>
  );
};
