import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IbanValidationResponse } from "@/types/types";

interface ValidationResultProps {
  data: IbanValidationResponse;
}

export default function ValidationResult({ data }: ValidationResultProps) {
  return (
    <div
      className={cn(
        "relative w-full rounded-lg border px-4 py-3 text-sm",
        data.valid
          ? "border-green-500 bg-green-50 text-green-900"
          : "border-destructive bg-destructive/10 text-destructive",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {data.valid ? (
          <CheckCircle2
            className="h-5 w-5 text-green-600 mt-0.5"
            aria-hidden="true"
          />
        ) : (
          <XCircle className="h-5 w-5 mt-0.5" aria-hidden="true" />
        )}
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "font-medium leading-tight",
              data.valid ? "text-green-900" : "",
            )}
          >
            {data.valid ? "Valid IBAN" : "Invalid IBAN"}
          </div>
          {data.reason && (
            <div
              className={cn(
                "text-sm leading-relaxed mt-2",
                data.valid ? "text-green-800" : "text-destructive/90",
              )}
            >
              {data.valid
                ? "This IBAN passed all validation checks."
                : data.reason}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
