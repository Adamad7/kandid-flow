import React, { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "../../lib/utils";

export interface RatingStarsProps {
  /** Ranga oferty (1 - 5) */
  rating: number;
  /** Tryb interaktywny umożliwiający edycję */
  interactive?: boolean;
  /** Wywoływane po kliknięciu gwiazdki w trybie interaktywnym */
  onChange?: (newRating: number) => void;
  /** Rozmiar gwiazdek */
  size?: "xs" | "sm" | "md" | "lg";
  /** Dodatkowa klasa kontenera */
  className?: string;
  /** Czy pokazać etykietę tekstową (np. "3/5") */
  showLabel?: boolean;
}

export const RATING_CONFIG: Record<
  number,
  {
    label: string;
    description: string;
    starClass: string;
  }
> = {
  1: {
    label: "Ranga 1: Mało ważna",
    description: "Niski priorytet w procesie poszukiwania",
    starClass: "text-yellow-400 fill-yellow-400 dark:text-yellow-400 dark:fill-yellow-400",
  },
  2: {
    label: "Ranga 2: Umiarkowanie ważna",
    description: "Średni priorytet",
    starClass: "text-amber-500 fill-amber-500 dark:text-amber-400 dark:fill-amber-400",
  },
  3: {
    label: "Ranga 3: Ważna",
    description: "Ważna oferta, warta zaangażowania",
    starClass: "text-orange-500 fill-orange-500 dark:text-orange-400 dark:fill-orange-400",
  },
  4: {
    label: "Ranga 4: Bardzo ważna",
    description: "Wysoki priorytet w kolejce aplikacji",
    starClass: "text-orange-600 fill-orange-600 dark:text-orange-500 dark:fill-orange-500",
  },
  5: {
    label: "Ranga 5: Priorytetowa",
    description: "Kluczowa oferta - najwyższy priorytet",
    starClass: "text-red-600 fill-red-600 dark:text-red-500 dark:fill-red-500",
  },
};

const SIZE_CLASSES = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  interactive = false,
  onChange,
  size = "sm",
  className,
  showLabel = false,
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // Bezpieczne przycięcie do przedziału 1-5
  const clampedRating = Math.max(1, Math.min(5, Math.round(rating || 1)));
  const currentRatingConfig = RATING_CONFIG[clampedRating] || RATING_CONFIG[1];

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.sm;

  // Tryb edycji / interaktywny: 5 gwiazdek z hoverem i kliknięciem
  if (interactive) {
    const activeRating = hoverRating !== null ? hoverRating : clampedRating;
    const activeConfig = RATING_CONFIG[activeRating] || RATING_CONFIG[1];

    return (
      <div
        className={cn("inline-flex items-center gap-1", className)}
        onMouseLeave={() => setHoverRating(null)}
        role="group"
        aria-label="Ocena rangi oferty (skala 1-5)"
      >
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((starValue) => {
            const isFilled = starValue <= activeRating;
            const starConfig = RATING_CONFIG[starValue];

            return (
              <button
                key={starValue}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange?.(starValue);
                }}
                onMouseEnter={() => setHoverRating(starValue)}
                className="p-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-transform active:scale-95 cursor-pointer"
                aria-label={starConfig.label}
                title={starConfig.label}
              >
                <Star
                  className={cn(
                    sizeClass,
                    "transition-colors duration-150",
                    isFilled
                      ? activeConfig.starClass
                      : "text-slate-300 fill-transparent dark:text-neutral-700"
                  )}
                />
              </button>
            );
          })}
        </div>
        {showLabel && (
          <span className="text-[11px] font-semibold text-slate-600 dark:text-neutral-400 ml-1">
            {activeRating}/5
          </span>
        )}
      </div>
    );
  }

  // Tryb wyświetlania: renderuje dokładnie tyle gwiazdek, ile wynosi ranga (1..clampedRating)
  const starArray = Array.from({ length: clampedRating }, (_, i) => i + 1);

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      title={currentRatingConfig.label}
      aria-label={currentRatingConfig.label}
    >
      {starArray.map((i) => (
        <Star
          key={i}
          className={cn(sizeClass, currentRatingConfig.starClass)}
          aria-hidden="true"
        />
      ))}
      {showLabel && (
        <span className="text-[10px] font-semibold text-slate-500 dark:text-neutral-400 ml-1">
          {clampedRating}/5
        </span>
      )}
    </div>
  );
};
