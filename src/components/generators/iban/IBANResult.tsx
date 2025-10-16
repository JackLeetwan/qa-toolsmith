import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useClipboard } from "@/lib/hooks/useClipboard";
import type { IbanGeneratorResponse, OutputFormat } from "@/types/types";

interface IBANResultProps {
  data: IbanGeneratorResponse;
  format: OutputFormat;
}

export default function IBANResult({ data, format }: IBANResultProps) {
  const { copyToClipboard, isCopying } = useClipboard();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    let textToCopy: string;

    if (format === "json") {
      textToCopy = JSON.stringify(data, null, 2);
    } else {
      textToCopy = data.iban;
    }

    const success = await copyToClipboard(textToCopy, "IBAN copied to clipboard");
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayContent = format === "json" ? JSON.stringify(data, null, 2) : data.iban;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Generated IBAN</CardTitle>
            <CardDescription>
              {data.seed ? (
                <>
                  Deterministic result for seed: <code className="text-xs">{data.seed}</code>
                </>
              ) : (
                "Random IBAN generated"
              )}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={isCopying}
            aria-label="Copy IBAN to clipboard"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="p-4 bg-muted rounded-lg overflow-x-auto" role="region" aria-label="Generated IBAN result">
          <code className="text-sm font-mono">{displayContent}</code>
        </pre>
      </CardContent>
    </Card>
  );
}
