import React from "react";
import { cn } from "../../lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, children, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-neutral-300"
          >
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            "flex h-9.5 w-full rounded-xl border border-slate-200 dark:border-transparent bg-slate-50/60 dark:bg-neutral-950 px-3.5 py-1.5 text-sm text-slate-900 dark:text-white shadow-none outline-none focus:outline-none focus:bg-white dark:focus:bg-neutral-950 focus:border-indigo-500 dark:focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/40 transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
            error && "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500",
            className
          )}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-white text-slate-900 dark:bg-neutral-900 dark:text-white">
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-slate-500 dark:text-neutral-400">{helperText}</p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";
