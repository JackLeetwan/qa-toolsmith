import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { useIbanApi } from "@/lib/hooks/useIbanApi";
import IBANResult from "./IBANResult";
import FormatToggle from "./FormatToggle";
import type { IbanCountry, IbanGeneratorResponse, OutputFormat, UIError } from "@/types/types";

interface IBANGeneratorFormProps {
  country: IbanCountry;
  seed?: string | number;
  format: OutputFormat;
  result?: IbanGeneratorResponse;
  isLoading: boolean;
  error?: UIError;
  onCountryChange: (country: IbanCountry) => void;
  onSeedChange: (seed: string | undefined) => void;
  onFormatChange: (format: OutputFormat) => void;
  onGenerated: (result: IbanGeneratorResponse) => void;
  onLoadingChange: (loading: boolean) => void;
  onError: (error: UIError) => void;
}

const SEED_REGEX = /^[A-Za-z0-9._-]+$/;
const SEED_MAX_LENGTH = 64;

export default function IBANGeneratorForm({
  country,
  seed,
  format,
  result,
  isLoading,
  error,
  onCountryChange,
  onSeedChange,
  onFormatChange,
  onGenerated,
  onLoadingChange,
}: IBANGeneratorFormProps) {
  const { generate } = useIbanApi();
  const [seedInput, setSeedInput] = useState(seed?.toString() || "");
  const [seedError, setSeedError] = useState<string | null>(null);

  const validateSeed = (value: string): boolean => {
    if (!value) {
      setSeedError(null);
      return true;
    }

    if (value.length > SEED_MAX_LENGTH) {
      setSeedError(`Seed must be at most ${SEED_MAX_LENGTH} characters`);
      return false;
    }

    if (!SEED_REGEX.test(value)) {
      setSeedError("Seed must contain only alphanumeric characters, dots, underscores, or hyphens");
      return false;
    }

    setSeedError(null);
    return true;
  };

  const handleSeedChange = (value: string) => {
    setSeedInput(value);
    validateSeed(value);
    onSeedChange(value || undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate seed
    if (!validateSeed(seedInput)) {
      return;
    }

    onLoadingChange(true);

    const result = await generate({
      country,
      seed: seedInput || undefined,
    });

    onLoadingChange(false);

    if (result) {
      onGenerated(result);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate IBAN</CardTitle>
          <CardDescription>
            Generate a valid IBAN for Germany, Austria, or Poland with optional seed for deterministic results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select value={country} onValueChange={(value) => onCountryChange(value as IbanCountry)}>
                <SelectTrigger id="country">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DE">Germany (DE)</SelectItem>
                  <SelectItem value="AT">Austria (AT)</SelectItem>
                  <SelectItem value="PL">Poland (PL)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seed">
                Seed <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="seed"
                type="text"
                value={seedInput}
                onChange={(e) => handleSeedChange(e.target.value)}
                placeholder="e.g., test-123"
                maxLength={SEED_MAX_LENGTH}
                aria-describedby={seedError ? "seed-error" : "seed-help"}
                aria-invalid={!!seedError}
              />
              {seedError ? (
                <p id="seed-error" className="text-sm text-destructive">
                  {seedError}
                </p>
              ) : (
                <p id="seed-help" className="text-sm text-muted-foreground">
                  Use a seed for deterministic generation (max {SEED_MAX_LENGTH} chars, alphanumeric + . _ -)
                </p>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || !!seedError}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate IBAN"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4" role="region" aria-live="polite" aria-label="Generation result">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Result</h3>
            <FormatToggle value={format} onChange={onFormatChange} />
          </div>
          <IBANResult data={result} format={format} />
        </div>
      )}
    </div>
  );
}
