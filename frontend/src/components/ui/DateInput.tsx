import React, { useRef } from "react";
import { Calendar } from "lucide-react";
import { cn } from "../../lib/utils";

export interface DateInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  helperText?: string;
}

/**
 * DateInput allows typing any flexible date format (e.g. "YYYY", "YYYY-MM", "YYYY-MM-DD", "present")
 * while offering an interactive calendar picker popup to select an exact date (YYYY-MM-DD) or month.
 */
export const DateInput: React.FC<DateInputProps> = ({
  label,
  value,
  onChange,
  placeholder = "np. 2023, 2023-08, 2023-08-15 lub present",
  className,
  error,
  helperText,
}) => {
  const hiddenPickerRef = useRef<HTMLInputElement>(null);

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      onChange(e.target.value);
    }
  };

  const openCalendar = () => {
    if (hiddenPickerRef.current) {
      if (typeof hiddenPickerRef.current.showPicker === "function") {
        hiddenPickerRef.current.showPicker();
      } else {
        hiddenPickerRef.current.focus();
        hiddenPickerRef.current.click();
      }
    }
  };

  // Safe format for hidden date input (YYYY-MM-DD) if current value matches date pattern
  const datePickerValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : /^\d{4}-\d{2}$/.test(value)
    ? `${value}-01`
    : /^\d{4}$/.test(value)
    ? `${value}-01-01`
    : "";

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-neutral-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "flex h-9.5 w-full rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50/60 dark:bg-neutral-950 pl-3.5 pr-9 py-2 text-sm text-slate-900 dark:text-white shadow-none transition-all placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:bg-white dark:focus:bg-neutral-900 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none",
            error && "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500",
            className
          )}
        />
        <button
          type="button"
          onClick={openCalendar}
          className="absolute right-2.5 p-1 text-slate-400 hover:text-indigo-600 dark:text-neutral-500 dark:hover:text-indigo-400 focus:outline-none transition-colors cursor-pointer"
          title="Wybierz z kalendarza"
        >
          <Calendar className="h-4 w-4" />
        </button>
        {/* Hidden native HTML5 date picker */}
        <input
          ref={hiddenPickerRef}
          type="date"
          value={datePickerValue}
          onChange={handlePickerChange}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only pointer-events-none absolute"
        />
      </div>
      {helperText && !error && (
        <p className="text-xs text-slate-500 dark:text-neutral-400">{helperText}</p>
      )}
      {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
    </div>
  );
};
