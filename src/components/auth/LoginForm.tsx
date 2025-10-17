import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/utils/logger";

// Validation schema
const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email jest wymagany")
    .max(254, "Email jest za długi")
    .email("Nieprawidłowy format email")
    .transform((val) => val.trim().toLowerCase()),
  password: z.string().min(1, "Hasło jest wymagane").max(72, "Hasło jest za długie"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSubmit?: (data: LoginFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

export default function LoginForm({ onSubmit, isLoading = false, error }: LoginFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string>("");
  const [isMounted, setIsMounted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Fix hydration mismatch by ensuring component is mounted
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleFormSubmit = async (data: LoginFormData) => {
    logger.debug("🔐 Login attempt started:", { email: data.email, timestamp: new Date().toISOString() });

    if (onSubmit) {
      setIsSubmitting(true);
      try {
        await onSubmit(data);
        logger.debug("✅ Login successful via onSubmit prop");
      } catch (error) {
        logger.error("❌ Login failed via onSubmit prop:", error);
        // Error handling is done by parent component
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Default API integration
    setIsSubmitting(true);
    setApiError("");

    try {
      logger.debug("📡 Sending login request to /api/auth/signin");
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      logger.debug("📥 Login response:", { status: response.status, ok: response.ok, result });

      if (!response.ok) {
        logger.error("❌ Login failed:", result);
        setApiError(result.message || "Wystąpił błąd podczas logowania");
        return;
      }

      // Success - redirect to next page or home
      logger.debug("✅ Login successful, redirecting...");
      toast.success("Witaj ponownie!");

      // Get redirect URL from query params
      const urlParams = new URLSearchParams(window.location.search);
      const nextUrl = urlParams.get("next") || "/";
      logger.debug("🔄 Redirecting to:", nextUrl);

      // Small delay to show success message
      setTimeout(() => {
        window.location.href = nextUrl;
      }, 500);
    } catch (error) {
      logger.error("❌ Login network error:", error);
      setApiError("Wystąpił błąd podczas logowania");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormLoading = isLoading || isSubmitting;

  // Prevent hydration mismatch by not rendering form until mounted
  if (!isMounted) {
    return (
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Zaloguj się</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center py-8">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Zaloguj się</CardTitle>
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
                autoComplete="email"
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password field */}
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
                autoComplete="current-password"
                {...register("password")}
              />
            </div>
            {errors.password && (
              <p className="text-sm text-destructive" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

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
