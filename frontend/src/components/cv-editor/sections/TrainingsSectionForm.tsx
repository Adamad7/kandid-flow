import React from "react";
import { Trash2, Plus } from "lucide-react";
import type { TrainingItem, TrainingsSectionBlock } from "../../../types";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Textarea } from "../../ui/Textarea";
import { DateInput } from "../../ui/DateInput";

export interface TrainingsSectionFormProps {
  block: TrainingsSectionBlock;
  onChange: (updated: TrainingsSectionBlock) => void;
}

export const TrainingsSectionForm: React.FC<TrainingsSectionFormProps> = React.memo(
  ({ block, onChange }) => {
    const items = block.items || [];

    const handleUpdateItem = <K extends keyof TrainingItem>(
      index: number,
      field: K,
      value: TrainingItem[K]
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
      const newItem: TrainingItem = {
        name: "",
        organizer: "",
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
        {items.map((trn, idx) => (
          <div
            key={idx}
            data-cv-field={`section-item:${block.id}:${idx}`}
            className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Szkolenie #{idx + 1}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveItem(idx)}
                className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1 cursor-pointer"
                title="Usuń szkolenie"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Nazwa szkolenia"
                value={trn.name}
                onChange={(e) => handleUpdateItem(idx, "name", e.target.value)}
                required
              />
              <Input
                label="Organizator"
                value={trn.organizer}
                onChange={(e) => handleUpdateItem(idx, "organizer", e.target.value)}
              />
              <DateInput
                label="Data ukończenia"
                value={trn.date}
                onChange={(val) => handleUpdateItem(idx, "date", val)}
              />
            </div>
            <Textarea
              label="Opis"
              value={trn.description}
              onChange={(e) => handleUpdateItem(idx, "description", e.target.value)}
              rows={2}
            />
          </div>
        ))}

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddItem}
            className="text-xs h-7"
          >
            <Plus className="h-3 w-3 mr-1" />
            Dodaj szkolenie
          </Button>
        </div>
      </div>
    );
  }
);

TrainingsSectionForm.displayName = "TrainingsSectionForm";
