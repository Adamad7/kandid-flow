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
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
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
            "flex h-9 w-full rounded-md border border-slate-300 bg-white pl-3 pr-9 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500",
            error && "border-rose-500 focus-visible:ring-rose-500",
            className
          )}
        />
        <button
          type="button"
          onClick={openCalendar}
          className="absolute right-2 p-1 text-slate-400 hover:text-slate-700 focus:outline-none transition-colors"
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
        <p className="text-xs text-slate-500">{helperText}</p>
      )}
      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
    </div>
  );
};
