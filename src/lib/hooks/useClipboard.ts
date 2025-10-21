import { useState, useCallback } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/utils/logger";

/**
 * Hook for copying text to clipboard with toast feedback
 */
export function useClipboard() {
  const [isCopying, setIsCopying] = useState(false);

  const copyToClipboard = useCallback(
    async (text: string, successMessage = "Copied to clipboard") => {
      try {
        if (!globalThis.navigator?.clipboard?.writeText) {
          toast.error("Clipboard API not supported");
          return false;
        }
      } catch {
        // navigator is not available
        toast.error("Clipboard API not supported");
        return false;
      }

      setIsCopying(true);

      try {
        const clipboard = globalThis.navigator?.clipboard;
        if (!clipboard) {
          toast.error("Clipboard API not supported");
          return false;
        }
        await clipboard.writeText(text);
        toast.success(successMessage);
        return true;
      } catch (error) {
        toast.error("Failed to copy to clipboard");
        logger.error("Clipboard error:", error);
        return false;
      } finally {
        setIsCopying(false);
      }
    },
    [],
  );

  return { copyToClipboard, isCopying };
}
