import React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "ghost"
    | "destructive"
    | "primary"
    | "success";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] cursor-pointer";

    const variantStyles = {
      default:
        "bg-indigo-600 text-white hover:bg-indigo-500 shadow-none dark:bg-indigo-600 dark:hover:bg-indigo-500",
      primary:
        "bg-indigo-600 text-white hover:bg-indigo-500 shadow-none dark:bg-indigo-600 dark:hover:bg-indigo-500",
      success:
        "bg-emerald-500 text-white hover:bg-emerald-400 shadow-none dark:bg-emerald-500 dark:hover:bg-emerald-400",
      secondary:
        "bg-slate-100 text-slate-900 hover:bg-slate-200 shadow-none dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700",
      outline:
        "border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white shadow-none dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-indigo-500 dark:hover:text-white",
      ghost:
        "text-slate-600 hover:text-slate-900 hover:bg-slate-100 shadow-none dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:bg-neutral-800",
      destructive:
        "bg-red-600 text-white hover:bg-red-500 shadow-none dark:bg-red-600 dark:hover:bg-red-500",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
      md: "h-9.5 px-4 text-xs sm:text-sm gap-2 rounded-xl",
      lg: "h-11 px-6 text-sm sm:text-base gap-2.5 rounded-xl font-bold",
      icon: "h-9.5 w-9.5 p-0 rounded-xl",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
