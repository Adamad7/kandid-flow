import React from "react";
import { ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";
import type { SkillCategoryItem, SkillsSectionBlock } from "../../../types";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { CommaSeparatedInput } from "./CommaSeparatedInput";

export interface SkillsSectionFormProps {
  block: SkillsSectionBlock;
  onChange: (updated: SkillsSectionBlock) => void;
}

export const SkillsSectionForm: React.FC<SkillsSectionFormProps> = React.memo(
  ({ block, onChange }) => {
    const items = block.items || [];

    const handleUpdateCategoryName = (catIndex: number, category: string) => {
      const newItems = [...items];
      if (newItems[catIndex]) {
        newItems[catIndex] = { ...newItems[catIndex], category };
        onChange({ ...block, items: newItems });
      }
    };

    const handleUpdateSkills = (catIndex: number, skills: string[]) => {
      const newItems = [...items];
      if (newItems[catIndex]) {
        newItems[catIndex] = { ...newItems[catIndex], skills };
        onChange({ ...block, items: newItems });
      }
    };

    const handleMoveUp = (catIndex: number) => {
      if (catIndex <= 0) return;
      const newItems = [...items];
      const temp = newItems[catIndex - 1];
      newItems[catIndex - 1] = newItems[catIndex];
      newItems[catIndex] = temp;
      onChange({ ...block, items: newItems });
    };

    const handleMoveDown = (catIndex: number) => {
      if (catIndex >= items.length - 1) return;
      const newItems = [...items];
      const temp = newItems[catIndex + 1];
      newItems[catIndex + 1] = newItems[catIndex];
      newItems[catIndex] = temp;
      onChange({ ...block, items: newItems });
    };

    const handleRemoveCategory = (catIndex: number) => {
      onChange({
        ...block,
        items: items.filter((_, i) => i !== catIndex),
      });
    };

    const handleAddCategory = () => {
      const newCat: SkillCategoryItem = {
        category: "Nowa kategoria",
        skills: [],
      };
      onChange({
        ...block,
        items: [...items, newCat],
      });
    };

    return (
      <div className="space-y-3">
        {items.map((cat, catIdx) => (
          <div
            key={catIdx}
            data-cv-field={`section-item:${block.id}:${catIdx}`}
            className="p-3.5 bg-slate-50/60 rounded-xl border border-slate-200/80 text-xs dark:bg-neutral-950 dark:border-neutral-800 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 max-w-xs sm:max-w-sm">
                <Input
                  value={cat.category}
                  onChange={(e) => handleUpdateCategoryName(catIdx, e.target.value)}
                  placeholder="Nazwa kategorii (np. Języki i Frameworki)"
                  className="h-8.5 text-sm font-semibold"
                />
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(catIdx)}
                  disabled={catIdx === 0}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-neutral-500 dark:hover:text-neutral-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  title="Przesuń kategorię w górę"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(catIdx)}
                  disabled={catIdx === items.length - 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-neutral-500 dark:hover:text-neutral-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  title="Przesuń kategorię w dół"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveCategory(catIdx)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:text-neutral-500 dark:hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                  title="Usuń kategorię"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <CommaSeparatedInput
              value={cat.skills || []}
              onChange={(newSkills) => handleUpdateSkills(catIdx, newSkills)}
              placeholder="np. React, TypeScript, Tailwind"
            />
          </div>
        ))}

        <div className="pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddCategory}
            className="text-xs h-8 border-2 border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 rounded-xl"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Dodaj kategorię umiejętności
          </Button>
        </div>
      </div>
    );
  }
);

SkillsSectionForm.displayName = "SkillsSectionForm";
