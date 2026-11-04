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
        "relative inline-flex h-[36px] w-[72px] shrink-0 items-center rounded-full border border-slate-300/80 dark:border-neutral-800 bg-slate-200/90 dark:bg-neutral-950 p-1 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 hover:border-slate-400/80 dark:hover:border-neutral-700 cursor-pointer shadow-inner",
        className
      )}
    >
      <span className="sr-only">
        {isDark ? "Przełącz na tryb jasny" : "Przełącz na tryb ciemny"}
      </span>

      {/* Track Icons - Left Sun (visible in dark mode), Right Moon (visible in light mode) */}
      <span
        className={cn(
          "absolute left-[9px] flex items-center justify-center pointer-events-none select-none transition-opacity duration-300",
          isDark ? "opacity-60 text-slate-400 dark:text-neutral-500" : "opacity-0"
        )}
      >
        <Sun className="h-4 w-4" />
      </span>
      <span
        className={cn(
          "absolute right-[9px] flex items-center justify-center pointer-events-none select-none transition-opacity duration-300",
          isDark ? "opacity-0" : "opacity-60 text-slate-500 dark:text-neutral-400"
        )}
      >
        <Moon className="h-4 w-4" />
      </span>

      {/* Sliding Thumb */}
      <span
        className={cn(
          "pointer-events-none flex h-7 w-7 items-center justify-center rounded-full shadow-md border transition-transform duration-300 ease-in-out",
          isDark
            ? "translate-x-[36px] bg-neutral-850 dark:bg-neutral-800 border-neutral-700 text-indigo-400"
            : "translate-x-0 bg-white border-slate-200/90 text-amber-500"
        )}
      >
        {isDark ? (
          <Moon className="h-4 w-4 fill-indigo-400/30 text-indigo-400" />
        ) : (
          <Sun className="h-4 w-4 fill-amber-400/30 text-amber-500" />
        )}
      </span>
    </button>
  );
};
