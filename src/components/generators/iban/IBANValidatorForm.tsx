import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { useIbanApi } from "@/lib/hooks/useIbanApi";
import ValidationResult from "./ValidationResult";
import type { IbanValidationResponse, UIError } from "@/types/types";

interface IBANValidatorFormProps {
  inputIban?: string;
  validation?: IbanValidationResponse;
  isLoading: boolean;
  error?: UIError;
  onInputChange: (iban: string) => void;
  onValidated: (result: IbanValidationResponse) => void;
  onLoadingChange: (loading: boolean) => void;
  onError: (error: UIError) => void;
}

export default function IBANValidatorForm({
  inputIban,
  validation,
  isLoading,
  error,
  onInputChange,
  onValidated,
  onLoadingChange,
}: IBANValidatorFormProps) {
  const { validate } = useIbanApi();
  const [ibanInput, setIbanInput] = useState(inputIban || "");
  const [inputError, setInputError] = useState<string | null>(null);

  const normalizeIban = (value: string): string => {
    // Remove spaces and convert to uppercase
    return value.replace(/\s/g, "").toUpperCase();
  };

  const validateInput = (value: string): boolean => {
    const normalized = normalizeIban(value);

    if (!normalized) {
      setInputError(null);
      return true; // Empty is allowed, just won't submit
    }

    // Check for invalid characters (only A-Z and 0-9 allowed)
    if (!/^[A-Z0-9\s]*$/.test(value.toUpperCase())) {
      setInputError("IBAN must contain only letters and numbers");
      return false;
    }

    // Check minimum length
    if (normalized.length < 15) {
      setInputError("IBAN must be at least 15 characters");
      return false;
    }

    // Check maximum length
    if (normalized.length > 34) {
      setInputError("IBAN must be at most 34 characters");
      return false;
    }

    // Check country code format (first 2 chars must be letters)
    if (!/^[A-Z]{2}/.test(normalized)) {
      setInputError("IBAN must start with a 2-letter country code");
      return false;
    }

    // Check check digits format (chars 2-3 must be digits)
    if (!/^\d{2}/.test(normalized.slice(2, 4))) {
      setInputError("IBAN check digits (positions 3-4) must be numbers");
      return false;
    }

    setInputError(null);
    return true;
  };

  const handleInputChange = (value: string) => {
    setIbanInput(value);
    validateInput(value);
    onInputChange(value);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    // Allow paste and normalize
    const pastedText = e.clipboardData.getData("text");
    const normalized = normalizeIban(pastedText);
    e.preventDefault();
    handleInputChange(normalized);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input
    if (!validateInput(ibanInput)) {
      return;
    }

    const normalized = normalizeIban(ibanInput);

    if (!normalized) {
      setInputError("Please enter an IBAN to validate");
      return;
    }

    onLoadingChange(true);

    const result = await validate({ iban: normalized });

    onLoadingChange(false);

    if (result) {
      onValidated(result);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Validate IBAN</CardTitle>
          <CardDescription>
            Check if an IBAN is valid using checksum verification. Paste your IBAN and we&apos;ll verify its format and
            checksum.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="iban-input">IBAN</Label>
              <Input
                id="iban-input"
                type="text"
                value={ibanInput}
                onChange={(e) => handleInputChange(e.target.value)}
                onPaste={handlePaste}
                placeholder="e.g., DE89370400440532013000 or AT611904300234573201"
                maxLength={34}
                aria-describedby={inputError ? "iban-error" : "iban-help"}
                aria-invalid={!!inputError}
                className="font-mono"
              />
              {inputError ? (
                <p id="iban-error" className="text-sm text-destructive">
                  {inputError}
                </p>
              ) : (
                <p id="iban-help" className="text-sm text-muted-foreground">
                  Enter or paste an IBAN to validate (spaces will be removed automatically)
                </p>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || !!inputError || !ibanInput}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                "Validate IBAN"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {validation && (
        <div className="space-y-4" role="region" aria-label="Validation result">
          <h3 className="text-lg font-semibold">Result</h3>
          <ValidationResult data={validation} />
        </div>
      )}
    </div>
  );
}
