import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { logger } from "@/lib/utils/logger";
import { AuthClientService } from "@/lib/services/authClient.service";

// Validation schema
const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, "Email jest wymagany")
      .max(254, "Email jest za długi")
      .email("Nieprawidłowy format email")
      .transform((val) => val.trim().toLowerCase()),
    password: z
      .string()
      .min(8, "Hasło musi mieć co najmniej 8 znaków")
      .max(72, "Hasło jest za długie")
      .refine((val) => /[A-Za-z]/.test(val), {
        message: "Hasło musi zawierać co najmniej jedną literę",
      })
      .refine((val) => /\d/.test(val), {
        message: "Hasło musi zawierać co najmniej jedną cyfrę",
      }),
    confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

interface UseRegisterFormOptions {
  onSubmit?: (data: Omit<RegisterFormData, "confirmPassword">) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Custom hook for handling registration form logic.
 * Manages form state, validation, and submission with proper error handling.
 */
export function useRegisterForm(options: UseRegisterFormOptions = {}) {
  const { onSubmit, onSuccess, onError } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string>("");
  const isSubmittingRef = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const handleFormSubmit = async (data: RegisterFormData) => {
    // Prevent multiple simultaneous submissions
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    logger.debug("🔐 Registration attempt started:", {
      email: data.email,
      timestamp: new Date().toISOString(),
    });

    // Prepare data without confirmPassword
    const submitData = {
      email: data.email,
      password: data.password,
    };

    if (onSubmit) {
      setIsSubmitting(true);
      try {
        await onSubmit(submitData);
        logger.debug("✅ Registration successful via onSubmit prop");
        onSuccess?.();
      } catch (error) {
        logger.error("❌ Registration failed via onSubmit prop:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Wystąpił błąd podczas rejestracji";
        setApiError(errorMessage);
        onError?.(errorMessage);
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
      await AuthClientService.signup(submitData);

      // Success - let the component handle UI feedback and navigation
      logger.debug("✅ Registration successful, redirecting...");
      onSuccess?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Wystąpił błąd podczas rejestracji";
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
