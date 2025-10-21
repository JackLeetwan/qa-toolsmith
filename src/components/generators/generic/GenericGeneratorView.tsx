import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { GeneratorKind } from "@/types/types";

interface GenericGeneratorViewProps {
  kind: GeneratorKind;
}

export default function GenericGeneratorView({
  kind,
}: GenericGeneratorViewProps) {
  const kindLabels: Record<GeneratorKind, string> = {
    phone: "Phone Number",
    address: "Address",
    plates: "License Plate",
    email: "Email Address",
    company: "Company Name",
    card: "Payment Card",
    guid: "GUID/UUID",
    string: "Random String",
  };

  return (
    <div className="max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>{kindLabels[kind]} Generator</CardTitle>
          <CardDescription>
            Generate synthetic test data for {kindLabels[kind].toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Coming Soon</AlertTitle>
            <AlertDescription>
              The {kindLabels[kind]} generator is currently under development.
              This feature will be available in a future update.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
