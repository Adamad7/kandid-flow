import React from "react";
import { Trash2, Plus } from "lucide-react";
import type { AchievementItem, AchievementsSectionBlock } from "../../../types";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Textarea } from "../../ui/Textarea";
import { DateInput } from "../../ui/DateInput";

export interface AchievementsSectionFormProps {
  block: AchievementsSectionBlock;
  onChange: (updated: AchievementsSectionBlock) => void;
}

export const AchievementsSectionForm: React.FC<AchievementsSectionFormProps> = React.memo(
  ({ block, onChange }) => {
    const items = block.items || [];

    const handleUpdateItem = <K extends keyof AchievementItem>(
      index: number,
      field: K,
      value: AchievementItem[K]
    ) => {
      const newItems = [...items];
      if (newItems[index]) {
        newItems[index] = { ...newItems[index], [field]: value };
        onChange({ ...block, items: newItems });
      }
    };

    const handleRemoveItem = (index: number) => {
      onChange({
        ...block,
        items: items.filter((_, i) => i !== index),
      });
    };

    const handleAddItem = () => {
      const newItem: AchievementItem = {
        title: "",
        issuer: "",
        date: "",
        description: "",
      };
      onChange({
        ...block,
        items: [...items, newItem],
      });
    };

    return (
      <div className="space-y-4">
        {items.map((ach, idx) => (
          <div
            key={idx}
            data-cv-field={`section-item:${block.id}:${idx}`}
            className="p-4 bg-slate-50/60 dark:bg-neutral-950 rounded-xl border border-slate-200/80 dark:border-neutral-800 text-xs space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-neutral-200">
                Osiągnięcie #{idx + 1}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveItem(idx)}
                className="p-1.5 text-slate-400 dark:text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                title="Usuń osiągnięcie"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <Input
              label="Tytuł osiągnięcia"
              value={ach.title}
              onChange={(e) => handleUpdateItem(idx, "title", e.target.value)}
              required
            />
            <Input
              label="Instytucja / Konkurs"
              value={ach.issuer}
              onChange={(e) => handleUpdateItem(idx, "issuer", e.target.value)}
              placeholder="np. Tech Summit Polska, Uczelnia"
            />
            <div className="w-full sm:w-1/3">
              <DateInput
                label="Data"
                value={ach.date}
                onChange={(val) => handleUpdateItem(idx, "date", val)}
              />
            </div>
            <Textarea
              label="Opis"
              value={ach.description}
              onChange={(e) => handleUpdateItem(idx, "description", e.target.value)}
              rows={2}
            />
          </div>
        ))}

        <div className="pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddItem}
            className="text-xs h-8 border-2 border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 rounded-xl"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Dodaj osiągnięcie
          </Button>
        </div>
      </div>
    );
  }
);

AchievementsSectionForm.displayName = "AchievementsSectionForm";
