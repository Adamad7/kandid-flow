import React from "react";
import { ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";
import type { ProjectItem, ProjectsSectionBlock } from "../../../types";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Textarea } from "../../ui/Textarea";
import { DateInput } from "../../ui/DateInput";
import { CommaSeparatedInput } from "./CommaSeparatedInput";

export interface ProjectsSectionFormProps {
  block: ProjectsSectionBlock;
  onChange: (updated: ProjectsSectionBlock) => void;
}

export const ProjectsSectionForm: React.FC<ProjectsSectionFormProps> = React.memo(
  ({ block, onChange }) => {
    const items = block.items || [];

    const handleUpdateItem = <K extends keyof ProjectItem>(
      index: number,
      field: K,
      value: ProjectItem[K]
    ) => {
      const newItems = [...items];
      if (newItems[index]) {
        newItems[index] = { ...newItems[index], [field]: value };
        onChange({ ...block, items: newItems });
      }
    };

    const handleMoveUp = (index: number) => {
      if (index <= 0) return;
      const newItems = [...items];
      const temp = newItems[index - 1];
      newItems[index - 1] = newItems[index];
      newItems[index] = temp;
      onChange({ ...block, items: newItems });
    };

    const handleMoveDown = (index: number) => {
      if (index >= items.length - 1) return;
      const newItems = [...items];
      const temp = newItems[index + 1];
      newItems[index + 1] = newItems[index];
      newItems[index] = temp;
      onChange({ ...block, items: newItems });
    };

    const handleRemoveItem = (index: number) => {
      onChange({
        ...block,
        items: items.filter((_, i) => i !== index),
      });
    };

    const handleAddItem = () => {
      const newItem: ProjectItem = {
        name: "",
        role: "",
        url: "",
        start_date: "",
        end_date: "",
        description: "",
        technologies: [],
      };
      onChange({
        ...block,
        items: [...items, newItem],
      });
    };

    return (
      <div className="space-y-4">
        {items.map((proj, idx) => (
          <div
            key={idx}
            data-cv-field={`section-item:${block.id}:${idx}`}
            className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Projekt #{idx + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(idx)}
                  disabled={idx === 0}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 rounded cursor-pointer disabled:cursor-not-allowed"
                  title="Przesuń projekt w górę"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(idx)}
                  disabled={idx === items.length - 1}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 rounded cursor-pointer disabled:cursor-not-allowed"
                  title="Przesuń projekt w dół"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1 cursor-pointer"
                  title="Usuń projekt"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <Input
              label="Nazwa projektu"
              value={proj.name}
              onChange={(e) => handleUpdateItem(idx, "name", e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Rola"
                value={proj.role}
                onChange={(e) => handleUpdateItem(idx, "role", e.target.value)}
              />
              <Input
                label="Link URL"
                value={proj.url}
                onChange={(e) => handleUpdateItem(idx, "url", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DateInput
                label="Początek"
                value={proj.start_date}
                onChange={(val) => handleUpdateItem(idx, "start_date", val)}
              />
              <DateInput
                label="Koniec"
                value={proj.end_date}
                onChange={(val) => handleUpdateItem(idx, "end_date", val)}
              />
            </div>

            <Textarea
              label="Opis projektu"
              value={proj.description}
              onChange={(e) => handleUpdateItem(idx, "description", e.target.value)}
              rows={2}
            />

            <CommaSeparatedInput
              label="Technologie (rozdzielone przecinkami)"
              value={proj.technologies || []}
              onChange={(techs) => handleUpdateItem(idx, "technologies", techs)}
              placeholder="np. React, TypeScript, Tailwind"
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
            Dodaj projekt
          </Button>
        </div>
      </div>
    );
  }
);

ProjectsSectionForm.displayName = "ProjectsSectionForm";
