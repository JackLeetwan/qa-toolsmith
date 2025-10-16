import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IbanValidationResponse } from "@/types/types";

interface ValidationResultProps {
  data: IbanValidationResponse;
}

export default function ValidationResult({ data }: ValidationResultProps) {
  return (
    <Alert
      variant={data.valid ? "default" : "destructive"}
      className={data.valid ? "border-green-500 bg-green-50" : ""}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {data.valid ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden="true" />
        ) : (
          <XCircle className="h-5 w-5" aria-hidden="true" />
        )}
        <div className="flex-1">
          <AlertTitle className={cn(data.valid ? "text-green-900" : "", "line-clamp-none")}>
            {data.valid ? "Valid IBAN" : "Invalid IBAN"}
          </AlertTitle>
          {data.reason && (
            <AlertDescription className={data.valid ? "text-green-800" : ""}>
              {data.valid ? "This IBAN passed all validation checks." : data.reason}
            </AlertDescription>
          )}
        </div>
      </div>
    </Alert>
  );
}
