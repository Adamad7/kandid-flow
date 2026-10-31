import React from "react";
import type { SummarySectionBlock } from "../../../types";
import { Textarea } from "../../ui/Textarea";

export interface SummarySectionFormProps {
  block: SummarySectionBlock;
  onChange: (updated: SummarySectionBlock) => void;
}

export const SummarySectionForm: React.FC<SummarySectionFormProps> = React.memo(
  ({ block, onChange }) => {
    return (
      <Textarea
        value={block.content || ""}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
        rows={4}
        className="text-xs leading-relaxed"
        placeholder="Wprowadź treść podsumowania zawodowego..."
      />
    );
  }
);

SummarySectionForm.displayName = "SummarySectionForm";
