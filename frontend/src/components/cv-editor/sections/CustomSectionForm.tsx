import React from "react";
import type { CustomSectionBlock } from "../../../types";
import { Textarea } from "../../ui/Textarea";

export interface CustomSectionFormProps {
  block: CustomSectionBlock;
  onChange: (updated: CustomSectionBlock) => void;
}

export const CustomSectionForm: React.FC<CustomSectionFormProps> = React.memo(
  ({ block, onChange }) => {
    const handleContentChange = (content: string) => {
      onChange({ ...block, content });
    };

    const handleItemsChange = (itemsText: string) => {
      const items = itemsText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      onChange({ ...block, items });
    };

    return (
      <div className="space-y-3">
        <Textarea
          label="Treść opisowa"
          value={block.content || ""}
          onChange={(e) => handleContentChange(e.target.value)}
          rows={2}
          placeholder="Opcjonalny tekst opisowy..."
        />
        <Textarea
          label="Punkty listy (jeden w nowym wierszu)"
          value={(block.items || []).join("\n")}
          onChange={(e) => handleItemsChange(e.target.value)}
          rows={3}
          placeholder="Wpisz punkty listy..."
        />
      </div>
    );
  }
);

CustomSectionForm.displayName = "CustomSectionForm";
