import { useState } from "react";
import { toast } from "sonner";

/**
 * Hook for copying text to clipboard with toast feedback
 */
export function useClipboard() {
  const [isCopying, setIsCopying] = useState(false);

  const copyToClipboard = async (text: string, successMessage = "Copied to clipboard") => {
    if (!navigator.clipboard) {
      toast.error("Clipboard API not supported");
      return false;
    }

    setIsCopying(true);

    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
      return true;
    } catch (error) {
      toast.error("Failed to copy to clipboard");
      // eslint-disable-next-line no-console
      console.error("Clipboard error:", error);
      return false;
    } finally {
      setIsCopying(false);
    }
  };

  return { copyToClipboard, isCopying };
}
