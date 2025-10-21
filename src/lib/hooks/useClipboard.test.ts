import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useClipboard } from "./useClipboard";
import { wrapConsoleSpy } from "../../test/logger-test-utils";

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from "sonner";

// Mock navigator.clipboard - will be set up in beforeEach
let mockWriteText: ReturnType<typeof vi.fn>;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

describe("useClipboard Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mocks for each test
    mockWriteText = vi.fn();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
      // Intentionally empty - capturing calls without side effects
    });

    // Ensure navigator exists and set up clipboard API
    if (!global.navigator) {
      global.navigator = {} as Navigator;
    }
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      writable: true,
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("should initialize with isCopying false", () => {
      const { result } = renderHook(() => useClipboard());

      expect(result.current.isCopying).toBe(false);
      expect(typeof result.current.copyToClipboard).toBe("function");
    });
  });

  describe("copyToClipboard", () => {
    describe("successful copying", () => {
      it("should copy text successfully with default message", async () => {
        mockWriteText.mockResolvedValueOnce(undefined);

        const { result } = renderHook(() => useClipboard());

        let success;
        await act(async () => {
          success = await result.current.copyToClipboard("test text");
        });

        expect(success).toBe(true);
        expect(mockWriteText).toHaveBeenCalledWith("test text");
        expect(toast.success).toHaveBeenCalledWith("Copied to clipboard");
        expect(toast.error).not.toHaveBeenCalled();
        expect(result.current.isCopying).toBe(false);
      });

      it("should copy text successfully with custom message", async () => {
        mockWriteText.mockResolvedValueOnce(undefined);

        const { result } = renderHook(() => useClipboard());

        let success;
        await act(async () => {
          success = await result.current.copyToClipboard(
            "test text",
            "Custom success!",
          );
        });

        expect(success).toBe(true);
        expect(mockWriteText).toHaveBeenCalledWith("test text");
        expect(toast.success).toHaveBeenCalledWith("Custom success!");
        expect(result.current.isCopying).toBe(false);
      });

      it("should handle various text types", async () => {
        mockWriteText.mockResolvedValueOnce(undefined);

        const { result } = renderHook(() => useClipboard());

        const testCases = [
          "simple text",
          "text with spaces and special chars !@#$%^&*()",
          "multiline\ntext\nhere",
          "unicode 🚀🌟💻",
          "1234567890",
          "",
          "a".repeat(10000), // Very long text
        ];

        for (const text of testCases) {
          mockWriteText.mockClear();
          vi.mocked(toast.success).mockClear();

          let success;
          await act(async () => {
            success = await result.current.copyToClipboard(text);
          });

          expect(success).toBe(true);
          expect(mockWriteText).toHaveBeenCalledWith(text);
          expect(toast.success).toHaveBeenCalledTimes(1);
        }
      });
    });

    describe("clipboard API not supported", () => {
      it("should handle missing clipboard API", async () => {
        // Remove clipboard API
        Object.defineProperty(navigator, "clipboard", {
          value: undefined,
          writable: true,
        });

        const { result } = renderHook(() => useClipboard());

        let success;
        await act(async () => {
          success = await result.current.copyToClipboard("test text");
        });

        expect(success).toBe(false);
        expect(mockWriteText).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith("Clipboard API not supported");
        expect(toast.success).not.toHaveBeenCalled();
        expect(result.current.isCopying).toBe(false);
      });

      it("should handle null clipboard API", async () => {
        Object.defineProperty(navigator, "clipboard", {
          value: null,
          writable: true,
        });

        const { result } = renderHook(() => useClipboard());

        let success;
        await act(async () => {
          success = await result.current.copyToClipboard("test text");
        });

        expect(success).toBe(false);
        expect(toast.error).toHaveBeenCalledWith("Clipboard API not supported");
      });
    });

    describe("copy failures", () => {
      it("should handle clipboard write errors", async () => {
        const clipboardError = new Error("Permission denied");
        mockWriteText.mockRejectedValueOnce(clipboardError);

        const { result } = renderHook(() => useClipboard());

        let success;
        await act(async () => {
          success = await result.current.copyToClipboard("test text");
        });

        expect(success).toBe(false);
        expect(mockWriteText).toHaveBeenCalledWith("test text");
        expect(toast.error).toHaveBeenCalledWith("Failed to copy to clipboard");
        const errorWrapper = wrapConsoleSpy(consoleErrorSpy);
        expect(
          errorWrapper.wasCalledWith("Clipboard error:", clipboardError),
        ).toBe(true);
        expect(result.current.isCopying).toBe(false);
      });

      it("should handle different types of errors", async () => {
        const errorTypes = [
          new Error("Permission denied"),
          new Error("Document is not focused"),
          new DOMException("Not allowed", "NotAllowedError"),
          "String error",
          null,
          undefined,
        ];

        for (const error of errorTypes) {
          mockWriteText.mockRejectedValueOnce(error);
          vi.mocked(toast.error).mockClear();
          consoleErrorSpy.mockClear();

          const { result } = renderHook(() => useClipboard());

          let success;
          await act(async () => {
            success = await result.current.copyToClipboard("test text");
          });

          expect(success).toBe(false);
          expect(toast.error).toHaveBeenCalledWith(
            "Failed to copy to clipboard",
          );
          const errorWrapper = wrapConsoleSpy(consoleErrorSpy);
          expect(errorWrapper.wasCalledWith("Clipboard error:", error)).toBe(
            true,
          );
        }
      });

      it("should handle errors with custom success message", async () => {
        mockWriteText.mockRejectedValueOnce(new Error("Failed"));

        const { result } = renderHook(() => useClipboard());

        let success;
        await act(async () => {
          success = await result.current.copyToClipboard(
            "test text",
            "Should succeed",
          );
        });

        expect(success).toBe(false);
        expect(toast.success).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith("Failed to copy to clipboard");
      });
    });

    describe("loading states", () => {
      it("should set loading state during copy operation", async () => {
        let resolveCopy: () => void;
        const copyPromise = new Promise<void>((resolve) => {
          resolveCopy = resolve;
        });
        mockWriteText.mockReturnValueOnce(copyPromise);

        const { result } = renderHook(() => useClipboard());

        // Start the copy operation
        act(() => {
          result.current.copyToClipboard("test text");
        });

        // Should be loading
        expect(result.current.isCopying).toBe(true);

        // Resolve the operation
        act(() => {
          resolveCopy();
        });

        // Should not be loading anymore
        await waitFor(() => {
          expect(result.current.isCopying).toBe(false);
        });
      });

      it("should reset loading state on error", async () => {
        mockWriteText.mockRejectedValueOnce(new Error("Failed"));

        const { result } = renderHook(() => useClipboard());

        await act(async () => {
          await result.current.copyToClipboard("test text");
        });

        expect(result.current.isCopying).toBe(false);
      });

      it("should reset loading state when clipboard API not supported", async () => {
        Object.defineProperty(navigator, "clipboard", {
          value: undefined,
          writable: true,
        });

        const { result } = renderHook(() => useClipboard());

        await act(async () => {
          await result.current.copyToClipboard("test text");
        });

        expect(result.current.isCopying).toBe(false);
      });

      it("should handle multiple concurrent copy operations", async () => {
        const slowCopy = new Promise<void>((resolve) =>
          setTimeout(resolve, 100),
        );
        const fastCopy = Promise.resolve();

        mockWriteText.mockReturnValueOnce(slowCopy);
        mockWriteText.mockReturnValueOnce(fastCopy);

        const { result } = renderHook(() => useClipboard());

        // Start both operations
        const promise1 = act(async () => {
          await result.current.copyToClipboard("text1");
        });

        const promise2 = act(async () => {
          await result.current.copyToClipboard("text2");
        });

        await Promise.all([promise1, promise2]);

        // Both should complete
        expect(result.current.isCopying).toBe(false);
        expect(mockWriteText).toHaveBeenCalledTimes(2);
      });
    });

    describe("toast notifications", () => {
      it("should show success toast on successful copy", async () => {
        mockWriteText.mockResolvedValueOnce(undefined);

        const { result } = renderHook(() => useClipboard());

        await act(async () => {
          await result.current.copyToClipboard("test text");
        });

        expect(toast.success).toHaveBeenCalledWith("Copied to clipboard");
        expect(toast.success).toHaveBeenCalledTimes(1);
        expect(toast.error).not.toHaveBeenCalled();
      });

      it("should show error toast when clipboard API not supported", async () => {
        Object.defineProperty(navigator, "clipboard", {
          value: undefined,
          writable: true,
        });

        const { result } = renderHook(() => useClipboard());

        await act(async () => {
          await result.current.copyToClipboard("test text");
        });

        expect(toast.error).toHaveBeenCalledWith("Clipboard API not supported");
        expect(toast.success).not.toHaveBeenCalled();
      });

      it("should show error toast on copy failure", async () => {
        mockWriteText.mockRejectedValueOnce(new Error("Failed"));

        const { result } = renderHook(() => useClipboard());

        await act(async () => {
          await result.current.copyToClipboard("test text");
        });

        expect(toast.error).toHaveBeenCalledWith("Failed to copy to clipboard");
        expect(toast.success).not.toHaveBeenCalled();
      });

      it("should not show toasts when operations are cancelled", async () => {
        // This is hard to test directly since the hook doesn't expose cancellation
        // But we can verify that toasts are only called in the expected cases
        mockWriteText.mockResolvedValueOnce(undefined);

        const { result } = renderHook(() => useClipboard());

        await act(async () => {
          await result.current.copyToClipboard("test text");
        });

        expect(toast.success).toHaveBeenCalledTimes(1);
        expect(toast.error).toHaveBeenCalledTimes(0);
      });
    });

    describe("error logging", () => {
      it("should log errors to console on copy failure", async () => {
        const clipboardError = new Error("Permission denied");
        mockWriteText.mockRejectedValueOnce(clipboardError);

        const { result } = renderHook(() => useClipboard());

        await act(async () => {
          await result.current.copyToClipboard("test text");
        });

        const errorWrapper = wrapConsoleSpy(consoleErrorSpy);
        expect(
          errorWrapper.wasCalledWith("Clipboard error:", clipboardError),
        ).toBe(true);
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      });

      it("should not log errors when clipboard API not supported", async () => {
        Object.defineProperty(navigator, "clipboard", {
          value: undefined,
          writable: true,
        });

        const { result } = renderHook(() => useClipboard());

        await act(async () => {
          await result.current.copyToClipboard("test text");
        });

        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });

      it("should handle logging of non-Error exceptions", async () => {
        mockWriteText.mockRejectedValueOnce("String error");

        const { result } = renderHook(() => useClipboard());

        await act(async () => {
          await result.current.copyToClipboard("test text");
        });

        const errorWrapper = wrapConsoleSpy(consoleErrorSpy);
        expect(
          errorWrapper.wasCalledWith("Clipboard error:", "String error"),
        ).toBe(true);
      });
    });
  });

  describe("hook stability", () => {
    it("should return stable function references", () => {
      const { result, rerender } = renderHook(() => useClipboard());

      const initialCopyToClipboard = result.current.copyToClipboard;

      rerender();

      expect(result.current.copyToClipboard).toBe(initialCopyToClipboard);
    });

    it("should maintain state across rerenders", async () => {
      mockWriteText.mockRejectedValueOnce(new Error("Failed"));

      const { result, rerender } = renderHook(() => useClipboard());

      await act(async () => {
        await result.current.copyToClipboard("test text");
      });

      expect(result.current.isCopying).toBe(false);

      rerender();

      // State should be reset for new operations
      expect(result.current.isCopying).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", async () => {
      mockWriteText.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useClipboard());

      let success;
      await act(async () => {
        success = await result.current.copyToClipboard("");
      });

      expect(success).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith("");
      expect(toast.success).toHaveBeenCalledWith("Copied to clipboard");
    });

    it("should handle very long text", async () => {
      const longText = "a".repeat(100000);
      mockWriteText.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useClipboard());

      let success;
      await act(async () => {
        success = await result.current.copyToClipboard(longText);
      });

      expect(success).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith(longText);
    });

    it("should handle text with newlines and special characters", async () => {
      const specialText =
        "Line 1\nLine 2\tTabbed\r\nWindows line\n\nDouble newline";
      mockWriteText.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useClipboard());

      let success;
      await act(async () => {
        success = await result.current.copyToClipboard(specialText);
      });

      expect(success).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith(specialText);
    });

    it("should handle custom success message with special characters", async () => {
      mockWriteText.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useClipboard());

      const customMessage = "✅ Copied successfully! 🎉";

      let success;
      await act(async () => {
        success = await result.current.copyToClipboard("test", customMessage);
      });

      expect(success).toBe(true);
      expect(toast.success).toHaveBeenCalledWith(customMessage);
    });

    it("should handle undefined success message", async () => {
      mockWriteText.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useClipboard());

      let success;
      await act(async () => {
        success = await result.current.copyToClipboard("test", undefined);
      });

      expect(success).toBe(true);
      expect(toast.success).toHaveBeenCalledWith("Copied to clipboard");
    });
  });

  describe("concurrent operations", () => {
    it("should handle rapid successive calls", async () => {
      mockWriteText.mockResolvedValue(undefined);

      const { result } = renderHook(() => useClipboard());

      const operations = [];
      for (let i = 0; i < 5; i++) {
        operations.push(result.current.copyToClipboard(`text${i}`));
      }

      const results = await Promise.all(operations);

      expect(results).toEqual([true, true, true, true, true]);
      expect(mockWriteText).toHaveBeenCalledTimes(5);
      expect(toast.success).toHaveBeenCalledTimes(5);
      expect(result.current.isCopying).toBe(false);
    });

    it("should handle mixed success and failure", async () => {
      mockWriteText
        .mockResolvedValueOnce(undefined) // Success
        .mockRejectedValueOnce(new Error("Failed")) // Failure
        .mockResolvedValueOnce(undefined); // Success

      const { result } = renderHook(() => useClipboard());

      const results = await Promise.all([
        result.current.copyToClipboard("text1"),
        result.current.copyToClipboard("text2"),
        result.current.copyToClipboard("text3"),
      ]);

      expect(results).toEqual([true, false, true]);
      expect(toast.success).toHaveBeenCalledTimes(2);
      expect(toast.error).toHaveBeenCalledTimes(1);
    });
  });

  describe("browser compatibility", () => {
    it("should handle partial clipboard API implementation", async () => {
      // Clipboard exists but writeText is missing
      Object.defineProperty(navigator, "clipboard", {
        value: {},
        writable: true,
      });

      const { result } = renderHook(() => useClipboard());

      const success = await result.current.copyToClipboard("test");

      expect(success).toBe(false);
      expect(toast.error).toHaveBeenCalledWith("Clipboard API not supported");
    });

    it("should handle navigator undefined", async () => {
      // This is unlikely in modern browsers but good to test
      const originalNavigator = global.navigator;
      // @ts-expect-error: Deleting navigator property for testing purposes
      delete global.navigator;

      const { result } = renderHook(() => useClipboard());

      const success = await result.current.copyToClipboard("test");

      expect(success).toBe(false);
      expect(toast.error).toHaveBeenCalledWith("Clipboard API not supported");

      // Restore navigator
      global.navigator = originalNavigator;
    });
  });

  describe("return values", () => {
    it("should return correct success/failure indicators", async () => {
      const { result } = renderHook(() => useClipboard());

      // Success case
      mockWriteText.mockResolvedValueOnce(undefined);
      const successResult = await act(async () =>
        result.current.copyToClipboard("test"),
      );
      expect(successResult).toBe(true);

      // Failure case - API not supported
      Object.defineProperty(navigator, "clipboard", {
        value: undefined,
        writable: true,
      });
      const failureResult = await act(async () =>
        result.current.copyToClipboard("test"),
      );
      expect(failureResult).toBe(false);

      // Restore clipboard for other tests
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: mockWriteText },
        writable: true,
      });
    });
  });
});
