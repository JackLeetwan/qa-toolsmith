import { Button } from "@/components/ui/button";
import type { OutputFormat } from "@/types/types";

interface FormatToggleProps {
  value: OutputFormat;
  onChange: (format: OutputFormat) => void;
}

export default function FormatToggle({ value, onChange }: FormatToggleProps) {
  return (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-label="Output format"
    >
      <Button
        variant={value === "text" ? "default" : "outline"}
        size="sm"
        onClick={() => onChange("text")}
        aria-pressed={value === "text"}
      >
        Text
      </Button>
      <Button
        variant={value === "json" ? "default" : "outline"}
        size="sm"
        onClick={() => onChange("json")}
        aria-pressed={value === "json"}
      >
        JSON
      </Button>
    </div>
  );
}
