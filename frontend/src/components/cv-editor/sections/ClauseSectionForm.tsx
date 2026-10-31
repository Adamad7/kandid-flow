import React from "react";
import type { ClauseSectionBlock } from "../../../types";
import { Textarea } from "../../ui/Textarea";

export interface ClauseSectionFormProps {
  block: ClauseSectionBlock;
  onChange: (updated: ClauseSectionBlock) => void;
}

export const ClauseSectionForm: React.FC<ClauseSectionFormProps> = React.memo(
  ({ block, onChange }) => {
    return (
      <Textarea
        value={block.content || ""}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
        rows={3}
        placeholder="Treść klauzuli o przetwarzaniu danych osobowych..."
        data-cv-field={`section-field:${block.id}:content`}
      />
    );
  }
);

ClauseSectionForm.displayName = "ClauseSectionForm";
