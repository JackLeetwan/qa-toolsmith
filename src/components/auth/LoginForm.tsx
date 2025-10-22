import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useLoginForm, type LoginFormData } from "./hooks/useLoginForm";
import FormField from "./FormField";

interface LoginFormProps {
  onSubmit?: (data: LoginFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string;
  onRedirect?: (url: string) => void; // For testing purposes
}

export default function LoginForm({
  onSubmit,
  isLoading = false,
  error,
  onRedirect,
}: LoginFormProps) {
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
    toast.success("Witaj ponownie!");

    // Get redirect URL from query params
    const urlParams = new URLSearchParams(window.location.search);
    const nextUrl = urlParams.get("next") || "/";

    // Small delay to show success message, then navigate
    setTimeout(() => {
      setNavigateTo(nextUrl);
    }, 500);
  }, []);

  const {
    register,
    handleSubmit,
    handleFormSubmit,
    errors,
    isSubmitting,
    apiError,
  } = useLoginForm({
    onSubmit,
    onSuccess: handleSuccess,
  });

  const isFormLoading = isLoading || isSubmitting;

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Logowanie</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="space-y-4"
          noValidate
        >
          {/* Email field */}
          <FormField
            label="Email"
            error={errors.email?.message}
            required
            htmlFor="email"
          >
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="twoj@email.com"
                className="pl-10"
                disabled={isFormLoading}
                aria-invalid={!!errors.email}
                autoComplete="email"
                {...register("email")}
              />
            </div>
          </FormField>

          {/* Password field */}
          <FormField
            label="Hasło"
            error={errors.password?.message}
            required
            htmlFor="password"
          >
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Wprowadź hasło"
                className="pl-10"
                disabled={isFormLoading}
                aria-invalid={!!errors.password}
                autoComplete="current-password"
                {...register("password")}
              />
            </div>
          </FormField>

          {/* Error message */}
          {(error || apiError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || apiError}</AlertDescription>
            </Alert>
          )}

          {/* Submit button */}
          <Button type="submit" className="w-full" disabled={isFormLoading}>
            {isFormLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isFormLoading ? "Logowanie..." : "Zaloguj się"}
          </Button>
        </form>

        {/* Links */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Nie masz konta?{" "}
            <a
              href="/auth/register"
              className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
            >
              Zarejestruj się
            </a>
          </p>
          <p className="text-sm text-muted-foreground">
            <a
              href="/auth/reset"
              className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
            >
              Zapomniałeś hasła?
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
