import { useState, useCallback } from "react";
import type {
  IbanGeneratorResponse,
  IbanValidationResponse,
  IbanCountry,
  UIError,
} from "@/types/types";

interface GenerateParams {
  country: IbanCountry;
  seed?: string;
}

interface ValidateParams {
  iban: string;
}

/**
 * Hook for IBAN API operations (generate and validate)
 */
export function useIbanApi(baseUrl?: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<UIError | null>(null);

  const generate = useCallback(
    async (params: GenerateParams): Promise<IbanGeneratorResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const resolvedBaseUrl = baseUrl || window.location.origin;
        const url = new URL("/api/generators/iban", resolvedBaseUrl);
        url.searchParams.set("country", params.country);
        if (params.seed !== undefined) {
          url.searchParams.set("seed", params.seed);
        }

        // Use cache: "no-store" for non-seeded requests
        const cacheMode = params.seed !== undefined ? "default" : "no-store";

        const response = await fetch(url.toString(), {
          method: "GET",
          cache: cacheMode,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: {
              code: "INTERNAL",
              message: "An unexpected error occurred",
            },
          }));
          setError({
            code: errorData.error?.code || "INTERNAL",
            message: errorData.error?.message || "An unexpected error occurred",
          });
          return null;
        }

        const data: IbanGeneratorResponse = await response.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Network error occurred";
        setError({ code: "NETWORK_ERROR", message });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [baseUrl],
  );

  const validate = useCallback(
    async (params: ValidateParams): Promise<IbanValidationResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const resolvedBaseUrl = baseUrl || window.location.origin;
        const url = new URL("/api/validators/iban", resolvedBaseUrl);
        url.searchParams.set("iban", params.iban);

        const response = await fetch(url.toString(), {
          method: "GET",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: {
              code: "INTERNAL",
              message: "An unexpected error occurred",
            },
          }));
          setError({
            code: errorData.error?.code || "INTERNAL",
            message: errorData.error?.message || "An unexpected error occurred",
          });
          return null;
        }

        const data: IbanValidationResponse = await response.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Network error occurred";
        setError({ code: "NETWORK_ERROR", message });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [baseUrl],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generate,
    validate,
    isLoading,
    error,
    clearError,
  };
}
