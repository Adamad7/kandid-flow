import React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "outline";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  children,
  ...props
}) => {
  const variantStyles = {
    default:
      "bg-slate-100 text-slate-700 border-slate-300 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-600",
    secondary:
      "bg-slate-50 text-slate-600 border-slate-200 dark:bg-neutral-800/60 dark:text-neutral-300 dark:border-neutral-700",
    success:
      "bg-emerald-50 text-emerald-700 border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-600",
    warning:
      "bg-amber-50 text-amber-700 border-amber-400 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-600",
    danger:
      "bg-rose-50 text-rose-700 border-red-400 dark:bg-rose-950/60 dark:text-rose-300 dark:border-red-600",
    info:
      "bg-indigo-50 text-indigo-700 border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-600",
    outline:
      "bg-transparent text-slate-700 border-slate-300 dark:text-neutral-300 dark:border-neutral-700",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-0.5 text-xs font-semibold tracking-tight transition-colors shadow-none",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
