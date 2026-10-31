import React from "react";
import type { InterestsSectionBlock } from "../../../types";
import { Textarea } from "../../ui/Textarea";
import { CommaSeparatedInput } from "./CommaSeparatedInput";

export interface InterestsSectionFormProps {
  block: InterestsSectionBlock;
  onChange: (updated: InterestsSectionBlock) => void;
}

export const InterestsSectionForm: React.FC<InterestsSectionFormProps> = React.memo(
  ({ block, onChange }) => {
    return (
      <div className="space-y-3">
        <CommaSeparatedInput
          label="Zainteresowania (rozdzielone przecinkami)"
          value={block.items || []}
          onChange={(items) => onChange({ ...block, items })}
          placeholder="np. Kolarstwo, Druk 3D, Żeglarstwo"
        />
        <Textarea
          label="Opis narracyjny (opcjonalnie)"
          value={block.content || ""}
          onChange={(e) => onChange({ ...block, content: e.target.value })}
          rows={2}
          placeholder="Krótki opis pasji..."
        />
      </div>
    );
  }
);

InterestsSectionForm.displayName = "InterestsSectionForm";
