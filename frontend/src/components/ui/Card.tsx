import React from "react";
import { cn } from "../../lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card: React.FC<CardProps> = ({ className, children, ...props }) => {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-none transition-all dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
