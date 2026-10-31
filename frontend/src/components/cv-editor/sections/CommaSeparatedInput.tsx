import React, { useEffect, useState, useRef } from "react";
import { Input } from "../../ui/Input";

export interface CommaSeparatedInputProps {
  label?: string;
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}

export const CommaSeparatedInput: React.FC<CommaSeparatedInputProps> = React.memo(
  ({ label, value, onChange, placeholder, className }) => {
    const [text, setText] = useState(() => (value || []).join(", "));
    const isFocusedRef = useRef(false);

    useEffect(() => {
      if (!isFocusedRef.current) {
        setText((value || []).join(", "));
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setText(val);
      const parsed = val
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      onChange(parsed);
    };

    return (
      <Input
        label={label}
        value={text}
        onFocus={() => {
          isFocusedRef.current = true;
        }}
        onBlur={() => {
          isFocusedRef.current = false;
          setText((value || []).join(", "));
        }}
        onChange={handleChange}
        placeholder={placeholder}
        className={className}
      />
    );
  }
);

CommaSeparatedInput.displayName = "CommaSeparatedInput";
