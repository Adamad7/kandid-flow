import React from "react";
import { ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";
import type { CertificateItem, CertificatesSectionBlock } from "../../../types";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { DateInput } from "../../ui/DateInput";

export interface CertificatesSectionFormProps {
  block: CertificatesSectionBlock;
  onChange: (updated: CertificatesSectionBlock) => void;
}

export const CertificatesSectionForm: React.FC<CertificatesSectionFormProps> = React.memo(
  ({ block, onChange }) => {
    const items = block.items || [];

    const handleUpdateItem = <K extends keyof CertificateItem>(
      index: number,
      field: K,
      value: CertificateItem[K]
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
      const newItem: CertificateItem = {
        name: "",
        issuer: "",
        issue_date: "",
      };
      onChange({
        ...block,
        items: [...items, newItem],
      });
    };

    return (
      <div className="space-y-4">
        {items.map((cert, idx) => (
          <div
            key={idx}
            className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Certyfikat #{idx + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(idx)}
                  disabled={idx === 0}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 rounded cursor-pointer disabled:cursor-not-allowed"
                  title="Przesuń certyfikat w górę"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(idx)}
                  disabled={idx === items.length - 1}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 rounded cursor-pointer disabled:cursor-not-allowed"
                  title="Przesuń certyfikat w dół"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1 cursor-pointer"
                  title="Usuń certyfikat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Nazwa certyfikatu"
                value={cert.name}
                onChange={(e) => handleUpdateItem(idx, "name", e.target.value)}
                required
              />
              <Input
                label="Wydawca"
                value={cert.issuer}
                onChange={(e) => handleUpdateItem(idx, "issuer", e.target.value)}
              />
              <DateInput
                label="Data wydania"
                value={cert.issue_date}
                onChange={(val) => handleUpdateItem(idx, "issue_date", val)}
              />
            </div>
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
            Dodaj certyfikat
          </Button>
        </div>
      </div>
    );
  }
);

CertificatesSectionForm.displayName = "CertificatesSectionForm";
