import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, AlertCircle, CheckCircle } from "lucide-react";

// Validation schema
const resetConfirmSchema = z
  .object({
    password: z
      .string()
      .min(8, "Hasło musi mieć co najmniej 8 znaków")
      .max(72, "Hasło jest za długie")
      .regex(
        /^(?=.*[A-Za-z])(?=.*\d)/,
        "Hasło musi zawierać co najmniej jedną literę i jedną cyfrę",
      ),
    confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
  });

export type ResetConfirmFormData = z.infer<typeof resetConfirmSchema>;

interface ResetConfirmFormProps {
  onSubmit?: (
    data: Omit<ResetConfirmFormData, "confirmPassword">,
  ) => Promise<void>;
  isLoading?: boolean;
  error?: string;
  success?: boolean;
  token?: string;
}

export default function ResetConfirmForm({
  onSubmit,
  isLoading = false,
  error,
  success = false,
  token,
}: ResetConfirmFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetConfirmFormData>({
    resolver: zodResolver(resetConfirmSchema),
  });

  const handleFormSubmit = async (data: ResetConfirmFormData) => {
    if (!onSubmit) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        password: data.password,
      });
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
          <CardTitle className="text-2xl text-center">
            Hasło zaktualizowane
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Twoje hasło zostało pomyślnie zaktualizowane. Zostałeś
              automatycznie zalogowany.
            </AlertDescription>
          </Alert>

          <div className="text-center">
            <Button asChild className="w-full">
              <a href="/">Przejdź do aplikacji</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!token) {
    return (
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            Nieprawidłowy link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Link do resetowania hasła jest nieprawidłowy lub wygasł. Poproś o
              nowy link.
            </AlertDescription>
          </Alert>

          <div className="text-center">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => (window.location.href = "/auth/reset")}
            >
              Poproś o nowy link
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Ustaw nowe hasło</CardTitle>
        <p className="text-sm text-muted-foreground text-center">
          Wprowadź nowe hasło dla swojego konta
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="space-y-4"
          noValidate
          aria-label="Formularz ustawiania nowego hasła"
        >
          {/* Password field */}
          <div className="space-y-2">
            <Label htmlFor="password">Nowe hasło</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Wprowadź nowe hasło"
                className="pl-10"
                disabled={isFormLoading}
                aria-invalid={!!errors.password}
                {...register("password")}
              />
            </div>
            {errors.password && (
              <p className="text-sm text-destructive" role="alert">
                {errors.password.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Minimum 8 znaków, co najmniej jedna litera i jedna cyfra
            </p>
          </div>

          {/* Confirm Password field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Potwierdź nowe hasło</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Potwierdź nowe hasło"
                className="pl-10"
                disabled={isFormLoading}
                aria-invalid={!!errors.confirmPassword}
                {...register("confirmPassword")}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive" role="alert">
                {errors.confirmPassword.message}
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
            {isFormLoading ? "Aktualizowanie..." : "Zaktualizuj hasło"}
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
