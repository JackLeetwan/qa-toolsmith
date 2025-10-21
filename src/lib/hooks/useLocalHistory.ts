import { useState, useEffect, useCallback } from "react";
import type { HistoryItem } from "@/types/types";
import { logger } from "@/lib/utils/logger";

/**
 * Hook for managing local history in localStorage with FIFO limit
 * @param key - Storage key (namespaced by generator type)
 * @param limit - Maximum number of items to keep (default: 10)
 */
export function useLocalHistory<T>(key: string, limit = 10) {
  const [items, setItems] = useState<HistoryItem<T>[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored) as HistoryItem<T>[];
        // Validate structure
        if (Array.isArray(parsed)) {
          setItems(parsed.slice(0, limit));
        }
      }
    } catch (error) {
      logger.error("Failed to load history:", error);
    }
  }, [key, limit]);

  // Save to localStorage
  const saveToStorage = useCallback(
    (newItems: HistoryItem<T>[]) => {
      try {
        localStorage.setItem(key, JSON.stringify(newItems));
      } catch (error) {
        logger.error("Failed to save history:", error);
      }
    },
    [key],
  );

  // Add item to history (FIFO)
  const addItem = useCallback(
    (data: T, note?: string) => {
      const newItem: HistoryItem<T> = {
        ts: Date.now(),
        data,
        note,
      };

      setItems((prev) => {
        // Add to beginning, keep only `limit` items
        const updated = [newItem, ...prev].slice(0, limit);
        saveToStorage(updated);
        return updated;
      });
    },
    [limit, saveToStorage],
  );

  // Clear all history
  const clearHistory = useCallback(() => {
    setItems([]);
    try {
      localStorage.removeItem(key);
    } catch (error) {
      logger.error("Failed to clear history:", error);
    }
  }, [key]);

  // Remove specific item by timestamp
  const removeItem = useCallback(
    (timestamp: number) => {
      setItems((prev) => {
        const updated = prev.filter((item) => item.ts !== timestamp);
        saveToStorage(updated);
        return updated;
      });
    },
    [saveToStorage],
  );

  return {
    items,
    addItem,
    clearHistory,
    removeItem,
  };
}
