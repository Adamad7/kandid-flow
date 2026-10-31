import React from "react";
import { SplitSquareVertical, Trash2 } from "lucide-react";
import { Button } from "../../ui/Button";

export interface PageBreakCardProps {
  index: number;
  onRemove: (index: number) => void;
}

export const PageBreakCard: React.FC<PageBreakCardProps> = React.memo(
  ({ index, onRemove }) => {
    return (
      <div className="rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/30 p-4 flex items-center justify-between gap-3 shadow-xs transition-colors [contain:content]">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
          <SplitSquareVertical className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>Separator strony (wymuszenie nowej strony w Typst / PDF)</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRemove(index)}
          className="text-xs h-7 text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40"
          title="Usuń separator stron"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Usuń separator
        </Button>
      </div>
    );
  }
);

PageBreakCard.displayName = "PageBreakCard";
