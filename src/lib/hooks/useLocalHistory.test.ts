import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalHistory } from "./useLocalHistory";
import { wrapConsoleSpy } from "../../test/logger-test-utils";
import type { HistoryItem } from "../../types/types";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock console.error
let consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
  // Intentionally empty - capturing calls without side effects
});

// Mock Date.now to return incrementing values
let timestampCounter = 1000;
vi.spyOn(Date, "now").mockImplementation(() => timestampCounter++);

describe("useLocalHistory Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    timestampCounter = 1000; // Reset timestamp counter
    // Re-setup mocks after clearAllMocks
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
    // Re-setup console spy after clearAllMocks
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
      // Intentionally empty - capturing calls without side effects
    });
    // Re-setup Date.now mock after clearAllMocks
    vi.spyOn(Date, "now").mockImplementation(() => timestampCounter++);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with empty array when no stored data", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useLocalHistory("test-key"));

      expect(result.current.items).toEqual([]);
      expect(localStorageMock.getItem).toHaveBeenCalledWith("test-key");
    });

    it("should load valid data from localStorage", () => {
      const storedData: HistoryItem<string>[] = [
        { ts: 1000, data: "item1", note: "note1" },
        { ts: 2000, data: "item2" },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      const { result } = renderHook(() => useLocalHistory("test-key"));

      expect(result.current.items).toEqual(storedData);
    });

    it("should respect the limit when loading from storage", () => {
      const storedData: HistoryItem<string>[] = [
        { ts: 1000, data: "item1" },
        { ts: 2000, data: "item2" },
        { ts: 3000, data: "item3" },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      const { result } = renderHook(() => useLocalHistory("test-key", 2));

      expect(result.current.items).toEqual([
        { ts: 1000, data: "item1" },
        { ts: 2000, data: "item2" },
      ]);
    });

    it("should handle invalid JSON in localStorage", () => {
      localStorageMock.getItem.mockReturnValue("invalid json");

      const { result } = renderHook(() => useLocalHistory("test-key"));

      expect(result.current.items).toEqual([]);
      const errorWrapper = wrapConsoleSpy(consoleErrorSpy);
      expect(
        errorWrapper.wasCalledWith(
          "Failed to load history:",
          expect.any(SyntaxError),
        ),
      ).toBe(true);
    });

    it("should handle non-array data in localStorage", () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({ not: "array" }),
      );

      const { result } = renderHook(() => useLocalHistory("test-key"));

      expect(result.current.items).toEqual([]);
      // Non-array data is handled gracefully without console.error
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should handle localStorage errors", () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error("Storage quota exceeded");
      });

      const { result } = renderHook(() => useLocalHistory("test-key"));

      expect(result.current.items).toEqual([]);
      const errorWrapper = wrapConsoleSpy(consoleErrorSpy);
      expect(
        errorWrapper.wasCalledWith(
          "Failed to load history:",
          expect.any(Error),
        ),
      ).toBe(true);
    });
  });

  describe("addItem", () => {
    it("should add item to the beginning of the list", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useLocalHistory<string>("test-key"));

      act(() => {
        result.current.addItem("new item", "test note");
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]).toEqual({
        ts: expect.any(Number),
        data: "new item",
        note: "test note",
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "test-key",
        expect.stringContaining("new item"),
      );
    });

    it("should add items in FIFO order", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() =>
        useLocalHistory<string>("test-key", 3),
      );

      act(() => {
        result.current.addItem("item1");
        result.current.addItem("item2");
        result.current.addItem("item3");
      });

      expect(result.current.items).toHaveLength(3);
      expect(result.current.items[0].data).toBe("item3");
      expect(result.current.items[1].data).toBe("item2");
      expect(result.current.items[2].data).toBe("item1");
    });

    it("should enforce the limit by removing oldest items", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() =>
        useLocalHistory<string>("test-key", 2),
      );

      act(() => {
        result.current.addItem("item1");
        result.current.addItem("item2");
        result.current.addItem("item3"); // This should remove item1
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.items[0].data).toBe("item3");
      expect(result.current.items[1].data).toBe("item2");
      expect(
        result.current.items.find((item) => item.data === "item1"),
      ).toBeUndefined();
    });

    it("should handle limit of 1", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() =>
        useLocalHistory<string>("test-key", 1),
      );

      act(() => {
        result.current.addItem("item1");
        result.current.addItem("item2");
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].data).toBe("item2");
    });

    it("should handle limit of 0", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() =>
        useLocalHistory<string>("test-key", 0),
      );

      act(() => {
        result.current.addItem("item1");
      });

      expect(result.current.items).toHaveLength(0);
    });

    it("should handle optional note parameter", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useLocalHistory<string>("test-key"));

      act(() => {
        result.current.addItem("data without note");
      });

      expect(result.current.items[0]).toEqual({
        ts: expect.any(Number),
        data: "data without note",
        note: undefined,
      });
    });

    it("should handle complex data types", () => {
      localStorageMock.getItem.mockReturnValue(null);

      interface ComplexData {
        id: number;
        name: string;
        nested: { value: boolean };
      }

      const { result } = renderHook(() =>
        useLocalHistory<ComplexData>("test-key"),
      );

      const complexItem: ComplexData = {
        id: 123,
        name: "test item",
        nested: { value: true },
      };

      act(() => {
        result.current.addItem(complexItem, "complex note");
      });

      expect(result.current.items[0]).toEqual({
        ts: expect.any(Number),
        data: complexItem,
        note: "complex note",
      });
    });

    it("should handle localStorage save errors gracefully", () => {
      localStorageMock.getItem.mockReturnValue(null);
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error("Storage full");
      });

      const { result } = renderHook(() => useLocalHistory<string>("test-key"));

      act(() => {
        result.current.addItem("test item");
      });

      // Item should still be added to state despite storage error
      expect(result.current.items).toHaveLength(1);
      const errorWrapper = wrapConsoleSpy(consoleErrorSpy);
      expect(
        errorWrapper.wasCalledWith(
          "Failed to save history:",
          expect.any(Error),
        ),
      ).toBe(true);
    });

    it("should generate unique timestamps", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useLocalHistory<string>("test-key"));

      act(() => {
        result.current.addItem("item1");
        result.current.addItem("item2");
      });

      expect(result.current.items[0].ts).not.toBe(result.current.items[1].ts);
      expect(result.current.items[0].ts).toBeGreaterThan(
        result.current.items[1].ts,
      );
    });
  });

  describe("clearHistory", () => {
    it("should clear all items from state and storage", () => {
      const initialData: HistoryItem<string>[] = [
        { ts: 1000, data: "item1" },
        { ts: 2000, data: "item2" },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(initialData));

      const { result } = renderHook(() => useLocalHistory<string>("test-key"));

      // Verify initial state
      expect(result.current.items).toHaveLength(2);

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.items).toEqual([]);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("test-key");
    });

    it("should handle localStorage remove errors", () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify([{ ts: 1000, data: "item1" }]),
      );
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      const { result } = renderHook(() => useLocalHistory<string>("test-key"));

      act(() => {
        result.current.clearHistory();
      });

      // State should still be cleared
      expect(result.current.items).toEqual([]);
      const errorWrapper = wrapConsoleSpy(consoleErrorSpy);
      expect(
        errorWrapper.wasCalledWith(
          "Failed to clear history:",
          expect.any(Error),
        ),
      ).toBe(true);
    });

    it("should work when already empty", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useLocalHistory<string>("test-key"));

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.items).toEqual([]);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("test-key");
    });
  });

  describe("removeItem", () => {
    it("should remove specific item by timestamp", () => {
      const initialData: HistoryItem<string>[] = [
        { ts: 1000, data: "item1" },
        { ts: 2000, data: "item2" },
        { ts: 3000, data: "item3" },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(initialData));

      const { result } = renderHook(() => useLocalHistory<string>("test-key"));

      act(() => {
        result.current.removeItem(2000);
      });

      expect(result.current.items).toHaveLength(2);
      expect(
        result.current.items.find((item) => item.ts === 2000),
      ).toBeUndefined();
      expect(result.current.items[0].data).toBe("item1");
      expect(result.current.items[1].data).toBe("item3");
    });

    it("should handle removing non-existent timestamp", () => {
      const initialData: HistoryItem<string>[] = [{ ts: 1000, data: "item1" }];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(initialData));

      const { result } = renderHook(() => useLocalHistory<string>("test-key"));

      act(() => {
        result.current.removeItem(9999);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].data).toBe("item1");
    });

    it("should handle removing from empty list", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useLocalHistory<string>("test-key"));

      act(() => {
        result.current.removeItem(1000);
      });

      expect(result.current.items).toEqual([]);
    });

    it("should handle removing the only item", () => {
      const initialData: HistoryItem<string>[] = [{ ts: 1000, data: "item1" }];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(initialData));

      const { result } = renderHook(() => useLocalHistory<string>("test-key"));

      act(() => {
        result.current.removeItem(1000);
      });

      expect(result.current.items).toEqual([]);
    });

    it("should handle localStorage save errors during removal", () => {
      const initialData: HistoryItem<string>[] = [
        { ts: 1000, data: "item1" },
        { ts: 2000, data: "item2" },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(initialData));
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      const { result } = renderHook(() => useLocalHistory<string>("test-key"));

      act(() => {
        result.current.removeItem(1000);
      });

      // Item should still be removed from state
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].data).toBe("item2");
      const errorWrapper = wrapConsoleSpy(consoleErrorSpy);
      expect(
        errorWrapper.wasCalledWith(
          "Failed to save history:",
          expect.any(Error),
        ),
      ).toBe(true);
    });
  });

  describe("hook behavior", () => {
    it("should maintain separate histories for different keys", () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === "key1")
          return JSON.stringify([{ ts: 1000, data: "item1" }]);
        if (key === "key2")
          return JSON.stringify([{ ts: 2000, data: "item2" }]);
        return null;
      });

      const { result: result1 } = renderHook(() => useLocalHistory("key1"));
      const { result: result2 } = renderHook(() => useLocalHistory("key2"));

      expect(result1.current.items[0].data).toBe("item1");
      expect(result2.current.items[0].data).toBe("item2");

      act(() => {
        result1.current.addItem("new-item1");
      });

      expect(result1.current.items[0].data).toBe("new-item1");
      expect(result2.current.items[0].data).toBe("item2"); // Unchanged
    });

    it("should handle key changes", () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === "old-key")
          return JSON.stringify([{ ts: 1000, data: "old" }]);
        if (key === "new-key")
          return JSON.stringify([{ ts: 2000, data: "new" }]);
        return null;
      });

      let key = "old-key";
      const { result, rerender } = renderHook(() => useLocalHistory(key));

      expect(result.current.items[0].data).toBe("old");

      key = "new-key";
      rerender();

      expect(result.current.items[0].data).toBe("new");
    });

    it("should handle limit changes", () => {
      const initialData: HistoryItem<string>[] = [
        { ts: 1000, data: "item1" },
        { ts: 2000, data: "item2" },
        { ts: 3000, data: "item3" },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(initialData));

      let limit = 10;
      const { result, rerender } = renderHook(() =>
        useLocalHistory("test-key", limit),
      );

      expect(result.current.items).toHaveLength(3);

      limit = 2;
      rerender();

      expect(result.current.items).toHaveLength(2);
    });
  });

  describe("edge cases", () => {
    it("should handle empty key", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useLocalHistory(""));

      act(() => {
        result.current.addItem("test");
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "",
        expect.any(String),
      );
    });

    it("should handle key with special characters", () => {
      const specialKey = "key/with/special-chars!@#";
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useLocalHistory(specialKey));

      act(() => {
        result.current.addItem("test");
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        specialKey,
        expect.any(String),
      );
    });

    it("should handle very long keys", () => {
      const longKey = "a".repeat(1000);
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useLocalHistory(longKey));

      act(() => {
        result.current.addItem("test");
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        longKey,
        expect.any(String),
      );
    });

    it("should handle negative limit", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useLocalHistory("test-key", -1));

      act(() => {
        result.current.addItem("test");
      });

      expect(result.current.items).toHaveLength(0);
    });

    it("should handle very large limit", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useLocalHistory("test-key", 10000));

      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current.addItem(`item${i}`);
        });
      }

      expect(result.current.items).toHaveLength(100);
    });

    it("should handle undefined data", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useLocalHistory<unknown>("test-key"));

      act(() => {
        result.current.addItem(undefined);
      });

      expect(result.current.items[0].data).toBeUndefined();
    });

    it("should handle null data", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useLocalHistory<unknown>("test-key"));

      act(() => {
        result.current.addItem(null);
      });

      expect(result.current.items[0].data).toBeNull();
    });

    it("should handle Date objects in data", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useLocalHistory<Date>("test-key"));

      const testDate = new Date("2024-01-01");

      act(() => {
        result.current.addItem(testDate);
      });

      expect(result.current.items[0].data).toEqual(testDate);
    });
  });

  describe("persistence", () => {
    it("should persist data across hook recreations", () => {
      localStorageMock.getItem.mockReturnValue(null);

      // First hook instance
      const { result: result1, unmount } = renderHook(() =>
        useLocalHistory<string>("test-key"),
      );

      act(() => {
        result1.current.addItem("persistent item");
      });

      expect(result1.current.items[0].data).toBe("persistent item");

      unmount();

      // Second hook instance should load the same data
      localStorageMock.getItem.mockReturnValue(
        localStorageMock.setItem.mock.calls[0][1], // Get the stored JSON
      );

      const { result: result2 } = renderHook(() =>
        useLocalHistory<string>("test-key"),
      );

      expect(result2.current.items[0].data).toBe("persistent item");
    });

    it("should handle corrupted stored data gracefully", () => {
      // Store corrupted data
      localStorageMock.getItem.mockReturnValue('{"invalid": json}');

      const { result } = renderHook(() => useLocalHistory<string>("test-key"));

      // Should initialize empty despite corruption
      expect(result.current.items).toEqual([]);

      // Should still be able to add items
      act(() => {
        result.current.addItem("new item");
      });

      expect(result.current.items[0].data).toBe("new item");
    });
  });

  describe("type safety", () => {
    it("should maintain generic type safety", () => {
      interface CustomType {
        id: number;
        name: string;
      }

      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() =>
        useLocalHistory<CustomType>("test-key"),
      );

      const customData: CustomType = { id: 123, name: "test" };

      act(() => {
        result.current.addItem(customData, "custom note");
      });

      expect(result.current.items[0].data.id).toBe(123);
      expect(result.current.items[0].data.name).toBe("test");
      expect(result.current.items[0].note).toBe("custom note");
    });

    it("should handle union types", () => {
      type UnionType = string | number | boolean;

      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() =>
        useLocalHistory<UnionType>("test-key"),
      );

      act(() => {
        result.current.addItem("string value");
        result.current.addItem(42);
        result.current.addItem(true);
      });

      expect(result.current.items[0].data).toBe(true);
      expect(result.current.items[1].data).toBe(42);
      expect(result.current.items[2].data).toBe("string value");
    });
  });

  describe("performance", () => {
    it("should handle large datasets within limits", () => {
      const largeData: HistoryItem<string>[] = Array.from(
        { length: 100 },
        (_, i) => ({
          ts: i + 1,
          data: `item${i}`,
        }),
      );

      localStorageMock.getItem.mockReturnValue(JSON.stringify(largeData));

      const { result } = renderHook(() =>
        useLocalHistory<string>("test-key", 50),
      );

      expect(result.current.items).toHaveLength(50);

      // Adding another item should maintain limit
      act(() => {
        result.current.addItem("new item");
      });

      expect(result.current.items).toHaveLength(50);
      expect(result.current.items[0].data).toBe("new item");
    });
  });
});
