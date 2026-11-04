import React from "react";
import { Trash2, Plus } from "lucide-react";
import type { LanguageItem, LanguagesSectionBlock } from "../../../types";
import { SUGGESTED_LANGUAGE_LEVELS } from "../../../lib/constants";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";

export interface LanguagesSectionFormProps {
  block: LanguagesSectionBlock;
  onChange: (updated: LanguagesSectionBlock) => void;
}

export const LanguagesSectionForm: React.FC<LanguagesSectionFormProps> = React.memo(
  ({ block, onChange }) => {
    const items = block.items || [];

    const handleUpdateItem = <K extends keyof LanguageItem>(
      index: number,
      field: K,
      value: LanguageItem[K]
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
      const newItem: LanguageItem = {
        name: "",
        level: "",
      };
      onChange({
        ...block,
        items: [...items, newItem],
      });
    };

    return (
      <div className="space-y-4">
        {items.map((lang, idx) => (
          <div
            key={idx}
            data-cv-field={`section-item:${block.id}:${idx}`}
            className="p-4 bg-slate-50/60 dark:bg-neutral-950 rounded-xl border border-slate-200/80 dark:border-neutral-800 text-xs space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-neutral-200">
                Język #{idx + 1}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveItem(idx)}
                className="p-1.5 text-slate-400 dark:text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                title="Usuń język"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nazwa języka"
                value={lang.name}
                onChange={(e) => handleUpdateItem(idx, "name", e.target.value)}
                placeholder="np. Angielski, Niemiecki"
                required
              />
              <div>
                <Input
                  label="Poziom biegłości"
                  value={lang.level}
                  onChange={(e) => handleUpdateItem(idx, "level", e.target.value)}
                  placeholder="np. C1, B2, Średniozaawansowany, Biegły"
                  required
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {SUGGESTED_LANGUAGE_LEVELS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleUpdateItem(idx, "level", preset)}
                      className="px-2 py-0.5 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors cursor-pointer shadow-none"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
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
            Dodaj język
          </Button>
        </div>
      </div>
    );
  }
);

LanguagesSectionForm.displayName = "LanguagesSectionForm";
