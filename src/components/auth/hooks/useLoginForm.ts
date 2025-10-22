import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { logger } from "@/lib/utils/logger";
import { AuthClientService } from "@/lib/services/authClient.service";

// Validation schema
const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email jest wymagany")
    .max(254, "Email jest za długi")
    .email("Nieprawidłowy format email")
    .transform((val) => val.trim().toLowerCase()),
  password: z
    .string()
    .min(1, "Hasło jest wymagane")
    .max(72, "Hasło jest za długie"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

interface UseLoginFormOptions {
  onSubmit?: (data: LoginFormData) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Custom hook for handling login form logic.
 * Manages form state, validation, and submission with proper error handling.
 */
export function useLoginForm(options: UseLoginFormOptions = {}) {
  const { onSubmit, onSuccess, onError } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string>("");
  const isSubmittingRef = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const handleFormSubmit = async (data: LoginFormData) => {
    // Prevent multiple simultaneous submissions
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    logger.debug("🔐 Login attempt started:", {
      email: data.email,
      timestamp: new Date().toISOString(),
    });

    if (onSubmit) {
      setIsSubmitting(true);
      try {
        await onSubmit(data);
        logger.debug("✅ Login successful via onSubmit prop");
        onSuccess?.();
      } catch (error) {
        logger.error("❌ Login failed via onSubmit prop:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Wystąpił błąd podczas logowania";
        setApiError(errorMessage);
        onError?.(errorMessage);
        // Error handling is done by parent component
      } finally {
        setIsSubmitting(false);
        isSubmittingRef.current = false;
      }
      return;
    }

    // Default API integration using AuthClientService
    setIsSubmitting(true);
    setApiError("");

    try {
      await AuthClientService.login(data);

      // Success - let the component handle UI feedback and navigation
      logger.debug("✅ Login successful, redirecting...");
      onSuccess?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Wystąpił błąd podczas logowania";
      setApiError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  return {
    register,
    handleSubmit,
    handleFormSubmit,
    errors,
    isSubmitting,
    apiError,
    setApiError,
  };
}
