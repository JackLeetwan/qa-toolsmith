import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, AlertCircle, CheckCircle } from "lucide-react";

// Validation schema
const resetRequestSchema = z.object({
  email: z
    .string()
    .min(1, "Email jest wymagany")
    .max(254, "Email jest za długi")
    .email("Nieprawidłowy format email")
    .transform((val) => val.trim().toLowerCase()),
});

type ResetRequestFormData = z.infer<typeof resetRequestSchema>;

interface ResetRequestFormProps {
  onSubmit?: (data: ResetRequestFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string;
  success?: boolean;
}

export default function ResetRequestForm({
  onSubmit,
  isLoading = false,
  error,
  success = false,
}: ResetRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetRequestFormData>({
    resolver: zodResolver(resetRequestSchema),
  });

  const handleFormSubmit = async (data: ResetRequestFormData) => {
    if (!onSubmit) return;

    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } catch {
      // Error handling is done by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormLoading = isLoading || isSubmitting;

  if (success) {
    return (
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Sprawdź email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Jeśli konto istnieje, wyślemy instrukcję na e‑mail.</AlertDescription>
          </Alert>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Nie otrzymałeś emaila? Sprawdź folder spam lub{" "}
              <button
                onClick={() => window.location.reload()}
                className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
              >
                spróbuj ponownie
              </button>
            </p>
            <p className="text-sm text-muted-foreground">
              <a
                href="/auth/login"
                className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
              >
                Powrót do logowania
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Reset hasła</CardTitle>
        <p className="text-sm text-muted-foreground text-center">
          Wprowadź swój email, a wyślemy Ci instrukcję resetowania hasła
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Email field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="twoj@email.com"
                className="pl-10"
                disabled={isFormLoading}
                aria-invalid={!!errors.email}
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit button */}
          <Button type="submit" className="w-full" disabled={isFormLoading}>
            {isFormLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isFormLoading ? "Wysyłanie..." : "Wyślij instrukcję"}
          </Button>
        </form>

        {/* Links */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            <a
              href="/auth/login"
              className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
            >
              Powrót do logowania
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
