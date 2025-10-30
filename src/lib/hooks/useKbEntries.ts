import { useCallback, useState } from "react";
import { toast } from "sonner";
import type {
  KBEntryDTO,
  KBListResponse,
  UIError,
  CreateKBEntryCommand,
  UpdateKBEntryCommand,
} from "@/types/types";

interface FetchEntriesParams {
  after?: string;
  limit?: number;
}

/**
 * Hook for KB entries API operations
 */
// Extended CreateKBEntryCommand to include is_public for form submission
type CreateKBEntryCommandWithPublic = CreateKBEntryCommand & {
  is_public?: boolean;
};

interface UseKbEntriesOptions {
  role?: "admin" | "user";
}

export function useKbEntries(baseUrl?: string, options?: UseKbEntriesOptions) {
  const [entries, setEntries] = useState<KBEntryDTO[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<UIError | null>(null);
  const isAdmin = options?.role === "admin";

  const fetchEntries = useCallback(
    async (params?: FetchEntriesParams): Promise<void> => {
      // Only fetch on client side to avoid SSR issues
      if (typeof window === "undefined") {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const resolvedBaseUrl =
          baseUrl ||
          (typeof window !== "undefined" ? window.location.origin : "");
        const url = new URL("/api/kb/entries", resolvedBaseUrl);

        if (params?.after) {
          url.searchParams.set("after", params.after);
        }
        if (params?.limit !== undefined) {
          url.searchParams.set("limit", String(params.limit));
        }

        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: {
              code: "INTERNAL",
              message: "An unexpected error occurred",
            },
          }));
          throw new Error(
            errorData.error?.message || "Failed to fetch entries",
          );
        }

        const data: KBListResponse = await response.json();

        // If fetching with cursor, append to existing entries; otherwise replace
        if (params?.after) {
          setEntries((prev) => [...prev, ...data.items]);
        } else {
          setEntries(data.items);
        }
        setNextCursor(data.next_cursor);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError({
          code: "FETCH_ERROR",
          message: errorMessage,
        });
        toast.error(`Błąd podczas ładowania wpisów: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    },
    [baseUrl],
  );

  const createEntry = useCallback(
    async (
      data: CreateKBEntryCommandWithPublic,
    ): Promise<KBEntryDTO | null> => {
      // Only run on client side
      if (typeof window === "undefined") {
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const resolvedBaseUrl =
          baseUrl ||
          (typeof window !== "undefined" ? window.location.origin : "");
        const url = new URL("/api/kb/entries", resolvedBaseUrl);

        // Map CreateKBEntryCommand to API format (url -> url_original)
        // Include is_public only for admins
        const requestBody: Record<string, unknown> = {
          title: data.title,
          url_original: data.url,
          tags: data.tags || [],
        };
        if (isAdmin && data.is_public !== undefined) {
          requestBody.is_public = data.is_public;
        }

        const response = await fetch(url.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: {
              code: "INTERNAL",
              message: "An unexpected error occurred",
            },
          }));
          const errorMessage =
            errorData.error?.message || "Failed to create entry";
          setError({
            code: errorData.error?.code || "CREATE_ERROR",
            message: errorMessage,
          });
          toast.error(`Błąd podczas tworzenia wpisu: ${errorMessage}`);
          return null;
        }

        const responseData: { data: KBEntryDTO } = await response.json();

        // Optimistic update: add to entries immediately
        setEntries((prev) => [responseData.data, ...prev]);

        toast.success("Wpis został utworzony");
        return responseData.data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError({
          code: "CREATE_ERROR",
          message: errorMessage,
        });
        toast.error(`Błąd podczas tworzenia wpisu: ${errorMessage}`);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [baseUrl, isAdmin],
  );

  const updateEntry = useCallback(
    async (
      id: string,
      data: UpdateKBEntryCommand,
    ): Promise<KBEntryDTO | null> => {
      // Only run on client side
      if (typeof window === "undefined") {
        return null;
      }

      setIsLoading(true);
      setError(null);

      // Store previous state for rollback
      let prevEntries: KBEntryDTO[] = [];
      setEntries((prev) => {
        prevEntries = [...prev];
        return prev;
      });

      try {
        const resolvedBaseUrl =
          baseUrl ||
          (typeof window !== "undefined" ? window.location.origin : "");
        const url = new URL(`/api/kb/entries/${id}`, resolvedBaseUrl);

        // Map UpdateKBEntryCommand: url field might be provided as 'url' but API expects 'url_original'
        const requestBody: Record<string, unknown> = {};
        if (data.title !== undefined) {
          requestBody.title = data.title;
        }
        if (data.url_original !== undefined) {
          requestBody.url_original = data.url_original;
        }
        // Handle 'url' field from CreateKBEntryCommand if passed
        if ("url" in data && data.url !== undefined) {
          requestBody.url_original = data.url;
        }
        if (data.tags !== undefined) {
          requestBody.tags = data.tags;
        }
        if (isAdmin && "is_public" in data && data.is_public !== undefined) {
          requestBody.is_public = data.is_public;
        }

        // Optimistic update: update entry in list immediately
        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  ...data,
                  url_original: data.url_original || entry.url_original,
                }
              : entry,
          ),
        );

        const response = await fetch(url.toString(), {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          // Rollback optimistic update
          setEntries(prevEntries);

          const errorData = await response.json().catch(() => ({
            error: {
              code: "INTERNAL",
              message: "An unexpected error occurred",
            },
          }));
          const errorMessage =
            errorData.error?.message || "Failed to update entry";
          setError({
            code: errorData.error?.code || "UPDATE_ERROR",
            message: errorMessage,
          });
          toast.error(`Błąd podczas aktualizacji wpisu: ${errorMessage}`);
          return null;
        }

        const responseData: { data: KBEntryDTO } = await response.json();

        // Update with server response
        setEntries((prev) =>
          prev.map((entry) => (entry.id === id ? responseData.data : entry)),
        );

        toast.success("Wpis został zaktualizowany");
        return responseData.data;
      } catch (err) {
        // Rollback optimistic update
        setEntries(prevEntries);

        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError({
          code: "UPDATE_ERROR",
          message: errorMessage,
        });
        toast.error(`Błąd podczas aktualizacji wpisu: ${errorMessage}`);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [baseUrl, isAdmin],
  );

  const deleteEntry = useCallback(
    async (id: string): Promise<boolean> => {
      // Only run on client side
      if (typeof window === "undefined") {
        return false;
      }

      setIsLoading(true);
      setError(null);

      // Store previous state for rollback
      let prevEntries: KBEntryDTO[] = [];
      setEntries((prev) => {
        prevEntries = [...prev];
        return prev;
      });

      try {
        const resolvedBaseUrl =
          baseUrl ||
          (typeof window !== "undefined" ? window.location.origin : "");
        const url = new URL(`/api/kb/entries/${id}`, resolvedBaseUrl);

        // Optimistic update: remove from entries immediately
        setEntries((prev) => prev.filter((entry) => entry.id !== id));

        const response = await fetch(url.toString(), {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!response.ok) {
          // Rollback optimistic update
          setEntries(prevEntries);

          const errorData = await response.json().catch(() => ({
            error: {
              code: "INTERNAL",
              message: "An unexpected error occurred",
            },
          }));
          const errorMessage =
            errorData.error?.message || "Failed to delete entry";
          setError({
            code: errorData.error?.code || "DELETE_ERROR",
            message: errorMessage,
          });
          toast.error(`Błąd podczas usuwania wpisu: ${errorMessage}`);
          return false;
        }

        toast.success("Wpis został usunięty");
        return true;
      } catch (err) {
        // Rollback optimistic update
        setEntries(prevEntries);

        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError({
          code: "DELETE_ERROR",
          message: errorMessage,
        });
        toast.error(`Błąd podczas usuwania wpisu: ${errorMessage}`);
        return false;
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
    entries,
    nextCursor,
    isLoading,
    error,
    fetchEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    clearError,
  };
}
