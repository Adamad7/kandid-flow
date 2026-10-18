import React from "react";
import { cn } from "../../lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card: React.FC<CardProps> = ({ className, children, ...props }) => {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
