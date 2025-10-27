import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useRegisterForm } from "./hooks/useRegisterForm";

interface RegisterFormProps {
  onSubmit?: (data: { email: string; password: string }) => Promise<void>;
  isLoading?: boolean;
  error?: string;
  onRedirect?: (url: string) => void;
}

export default function RegisterForm({
  onSubmit,
  isLoading = false,
  error,
  onRedirect,
}: RegisterFormProps) {
  const [navigateTo, setNavigateTo] = useState<string | null>(null);

  useEffect(() => {
    if (navigateTo) {
      if (onRedirect) {
        onRedirect(navigateTo);
      } else {
        window.location.href = navigateTo;
      }
    }
  }, [navigateTo, onRedirect]);

  const handleSuccess = useCallback(() => {
    toast.success("Konto utworzone pomyślnie!");

    setTimeout(() => {
      setNavigateTo("/");
    }, 500);
  }, []);

  const {
    register,
    handleSubmit,
    handleFormSubmit,
    errors,
    isSubmitting,
    apiError,
  } = useRegisterForm({
    onSubmit,
    onSuccess: handleSuccess,
  });

  const isFormLoading = isLoading || isSubmitting;
  const displayError = error || apiError;

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Utwórz konto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="space-y-4"
          noValidate
        >
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

          <div className="space-y-2">
            <Label htmlFor="password">Hasło</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Wprowadź hasło"
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Potwierdź hasło</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Potwierdź hasło"
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

          {displayError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{displayError}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isFormLoading}>
            {isFormLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isFormLoading ? "Tworzenie konta..." : "Utwórz konto"}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Masz już konto?{" "}
            <a
              href="/auth/login"
              className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
            >
              Zaloguj się
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
