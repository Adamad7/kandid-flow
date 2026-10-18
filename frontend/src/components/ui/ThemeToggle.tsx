import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../lib/utils";

export interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Przełącz na tryb jasny" : "Przełącz na tryb ciemny"}
      title={isDark ? "Przełącz na tryb jasny" : "Przełącz na tryb ciemny"}
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex h-8 w-16 shrink-0 items-center rounded-full border border-slate-300 bg-slate-200 p-1 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 cursor-pointer shadow-xs",
        className
      )}
    >
      <span className="sr-only">
        {isDark ? "Przełącz na tryb jasny" : "Przełącz na tryb ciemny"}
      </span>

      {/* Track Icons */}
      <span className="absolute left-2 flex items-center justify-center pointer-events-none select-none">
        <Sun className="h-3.5 w-3.5 text-amber-500/70" />
      </span>
      <span className="absolute right-2 flex items-center justify-center pointer-events-none select-none">
        <Moon className="h-3.5 w-3.5 text-indigo-400/70" />
      </span>

      {/* Sliding Thumb */}
      <span
        className={cn(
          "pointer-events-none flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md border border-slate-200/80 transition-transform duration-200 ease-in-out dark:bg-slate-900 dark:border-slate-700",
          isDark ? "translate-x-8 text-indigo-400" : "translate-x-0 text-amber-500"
        )}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5 fill-indigo-400 text-indigo-400" />
        ) : (
          <Sun className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
        )}
      </span>
    </button>
  );
};
