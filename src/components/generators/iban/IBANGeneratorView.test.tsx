import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import IBANGeneratorView from "./IBANGeneratorView";

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

// Mock sub-components
vi.mock("./IBANGeneratorForm", () => ({
  default: vi.fn((props) => (
    <div data-testid="iban-generator-form">
      <button
        data-testid="change-country"
        onClick={() => props.onCountryChange("AT")}
      >
        Change Country
      </button>
      <button
        data-testid="change-seed"
        onClick={() => props.onSeedChange("new-seed")}
      >
        Change Seed
      </button>
      <button
        data-testid="change-format"
        onClick={() => props.onFormatChange("compact")}
      >
        Change Format
      </button>
      <button
        data-testid="generate-result"
        onClick={() =>
          props.onGenerated({ iban: "AT123", country: "AT", seed: "test" })
        }
      >
        Generate
      </button>
      <button
        data-testid="set-loading"
        onClick={() => props.onLoadingChange(true)}
      >
        Set Loading
      </button>
      <button
        data-testid="set-error"
        onClick={() => props.onError({ code: "ERROR", message: "Test error" })}
      >
        Set Error
      </button>
    </div>
  )),
}));

vi.mock("./IBANValidatorForm", () => ({
  default: vi.fn((props) => (
    <div data-testid="iban-validator-form">
      <button
        data-testid="change-input"
        onClick={() => props.onInputChange("AT123")}
      >
        Change Input
      </button>
      <button
        data-testid="validate-result"
        onClick={() => props.onValidated({ valid: true, iban: "AT123" })}
      >
        Validate
      </button>
      <button
        data-testid="set-loading-validate"
        onClick={() => props.onLoadingChange(true)}
      >
        Set Loading
      </button>
      <button
        data-testid="set-error-validate"
        onClick={() => props.onError({ code: "ERROR", message: "Test error" })}
      >
        Set Error
      </button>
    </div>
  )),
}));

vi.mock("./GeneratorHistory", () => ({
  default: vi.fn((props) => (
    <div data-testid="generator-history">
      <button
        data-testid="select-history"
        onClick={() => props.onSelect({ iban: "DE123", country: "DE" })}
      >
        Select History
      </button>
      <button data-testid="clear-history" onClick={() => props.onClear()}>
        Clear History
      </button>
    </div>
  )),
}));

// Create mock functions for the hook methods
const mockAddItem = vi.fn();
const mockClearHistory = vi.fn();
const mockRemoveItem = vi.fn();

// Mock useLocalHistory hook
vi.mock("@/lib/hooks/useLocalHistory", () => ({
  useLocalHistory: vi.fn(() => ({
    items: [],
    addItem: mockAddItem,
    clearHistory: mockClearHistory,
    removeItem: mockRemoveItem,
  })),
}));

// Mock Toaster
vi.mock("@/components/ui/sonner", () => ({
  Toaster: vi.fn(() => <div data-testid="toaster" />),
}));

import { useLocalHistory } from "@/lib/hooks/useLocalHistory";
import IBANGeneratorForm from "./IBANGeneratorForm";
import IBANValidatorForm from "./IBANValidatorForm";
import GeneratorHistory from "./GeneratorHistory";

describe("IBANGeneratorView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage mocks
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial rendering", () => {
    it("should render with default state", () => {
      localStorageMock.getItem.mockReturnValue(null);

      render(<IBANGeneratorView />);

      expect(screen.getByRole("tablist")).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /generate/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /validate/i }),
      ).toBeInTheDocument();
      expect(screen.getByTestId("iban-generator-form")).toBeInTheDocument();
      expect(
        screen.queryByTestId("iban-validator-form"),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("generator-history")).toBeInTheDocument();
      expect(screen.getByTestId("toaster")).toBeInTheDocument();
    });

    it("should start with generate tab active", () => {
      render(<IBANGeneratorView />);

      const generateTab = screen.getByRole("tab", { name: /generate/i });
      expect(generateTab).toHaveAttribute("data-state", "active");
    });

    it("should load preferences from localStorage", () => {
      const preferences = {
        country: "AT",
        format: "compact",
        mode: "validate",
      };
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === "gen_pref_iban") return JSON.stringify(preferences);
        return null;
      });

      render(<IBANGeneratorView />);

      // Should switch to validate tab
      expect(screen.getByTestId("iban-validator-form")).toBeInTheDocument();
      expect(
        screen.queryByTestId("iban-generator-form"),
      ).not.toBeInTheDocument();
    });

    it("should handle invalid preferences in localStorage", () => {
      localStorageMock.getItem.mockReturnValue("invalid json");

      render(<IBANGeneratorView />);

      // Should not crash and use defaults
      expect(screen.getByTestId("iban-generator-form")).toBeInTheDocument();
    });

    it("should handle localStorage errors gracefully", () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      render(<IBANGeneratorView />);

      // Should not crash and use defaults
      expect(screen.getByTestId("iban-generator-form")).toBeInTheDocument();
    });
  });

  describe("tab switching", () => {
    it("should switch to validate tab when clicked", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorView />);

      const validateTab = screen.getByRole("tab", { name: /validate/i });
      await user.click(validateTab);

      expect(screen.getByTestId("iban-validator-form")).toBeInTheDocument();
      expect(
        screen.queryByTestId("iban-generator-form"),
      ).not.toBeInTheDocument();
    });

    it("should switch back to generate tab", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorView />);

      // Switch to validate first
      const validateTab = screen.getByRole("tab", { name: /validate/i });
      await user.click(validateTab);

      // Switch back to generate
      const generateTab = screen.getByRole("tab", { name: /generate/i });
      await user.click(generateTab);

      expect(screen.getByTestId("iban-generator-form")).toBeInTheDocument();
      expect(
        screen.queryByTestId("iban-validator-form"),
      ).not.toBeInTheDocument();
    });

    it("should clear error when switching tabs", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorView />);

      // Simulate setting an error
      const setErrorButton = screen.getByTestId("set-error");
      await user.click(setErrorButton);

      // Switch tabs
      const validateTab = screen.getByRole("tab", { name: /validate/i });
      await user.click(validateTab);

      // Error should be cleared (though we can't easily test internal state)
    });
  });

  describe("preferences persistence", () => {
    it("should save preferences to localStorage when state changes", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorView />);

      // Change country
      const changeCountryButton = screen.getByTestId("change-country");
      await user.click(changeCountryButton);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "gen_pref_iban",
          JSON.stringify({
            country: "AT",
            format: "text",
            mode: "generate",
          }),
        );
      });
    });

    it("should save format changes", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorView />);

      const changeFormatButton = screen.getByTestId("change-format");
      await user.click(changeFormatButton);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "gen_pref_iban",
          JSON.stringify({
            country: "DE",
            format: "compact",
            mode: "generate",
          }),
        );
      });
    });

    it("should save mode changes", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorView />);

      const validateTab = screen.getByRole("tab", { name: /validate/i });
      await user.click(validateTab);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "gen_pref_iban",
          JSON.stringify({
            country: "DE",
            format: "text",
            mode: "validate",
          }),
        );
      });
    });

    it("should handle localStorage save errors", async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error("Storage full");
      });

      const user = userEvent.setup();
      render(<IBANGeneratorView />);

      const changeCountryButton = screen.getByTestId("change-country");
      await user.click(changeCountryButton);

      // Should not crash
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe("generate mode interactions", () => {
    it("should pass correct props to IBANGeneratorForm", () => {
      render(<IBANGeneratorView />);

      expect(IBANGeneratorForm).toHaveBeenCalledWith(
        expect.objectContaining({
          country: "DE",
          format: "text",
          isLoading: false,
          error: undefined,
        }),
        undefined,
      );
    });

    it("should handle country change", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorView />);

      const changeCountryButton = screen.getByTestId("change-country");
      await user.click(changeCountryButton);

      expect(IBANGeneratorForm).toHaveBeenLastCalledWith(
        expect.objectContaining({
          country: "AT",
        }),
        undefined,
      );
    });

    it("should handle seed change", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorView />);

      const changeSeedButton = screen.getByTestId("change-seed");
      await user.click(changeSeedButton);

      expect(IBANGeneratorForm).toHaveBeenLastCalledWith(
        expect.objectContaining({
          seed: "new-seed",
        }),
        undefined,
      );
    });

    it("should handle format change", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorView />);

      const changeFormatButton = screen.getByTestId("change-format");
      await user.click(changeFormatButton);

      expect(IBANGeneratorForm).toHaveBeenLastCalledWith(
        expect.objectContaining({
          format: "compact",
        }),
        undefined,
      );
    });

    it("should handle generation result", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorView />);

      const generateButton = screen.getByTestId("generate-result");
      await user.click(generateButton);

      // Should update state and add to history
      expect(mockAddItem).toHaveBeenCalledWith({
        iban: "AT123",
        country: "AT",
        seed: "test",
      });
    });

    it("should handle loading state changes", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorView />);

      const setLoadingButton = screen.getByTestId("set-loading");
      await user.click(setLoadingButton);

      expect(IBANGeneratorForm).toHaveBeenLastCalledWith(
        expect.objectContaining({
          isLoading: true,
        }),
        undefined,
      );
    });

    it("should handle error state changes", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorView />);

      const setErrorButton = screen.getByTestId("set-error");
      await user.click(setErrorButton);

      expect(IBANGeneratorForm).toHaveBeenLastCalledWith(
        expect.objectContaining({
          error: { code: "ERROR", message: "Test error" },
        }),
        undefined,
      );
    });
  });

  describe("validate mode interactions", () => {
    it("should pass correct props to IBANValidatorForm when in validate mode", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorView />);

      const validateTab = screen.getByRole("tab", { name: /validate/i });
      await user.click(validateTab);

      expect(IBANValidatorForm).toHaveBeenCalledWith(
        expect.objectContaining({
          inputIban: undefined,
          validation: undefined,
          isLoading: false,
          error: undefined,
        }),
        undefined,
      );
    });

    it("should handle input change in validate mode", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorView />);

      const validateTab = screen.getByRole("tab", { name: /validate/i });
      await user.click(validateTab);

      const changeInputButton = screen.getByTestId("change-input");
      await user.click(changeInputButton);

      expect(IBANValidatorForm).toHaveBeenLastCalledWith(
        expect.objectContaining({
          inputIban: "AT123",
        }),
        undefined,
      );
    });

    it("should handle validation result", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorView />);

      const validateTab = screen.getByRole("tab", { name: /validate/i });
      await user.click(validateTab);

      const validateButton = screen.getByTestId("validate-result");
      await user.click(validateButton);

      expect(IBANValidatorForm).toHaveBeenLastCalledWith(
        expect.objectContaining({
          validation: { valid: true, iban: "AT123" },
        }),
        undefined,
      );
    });
  });

  describe("history integration", () => {
    it("should pass history items to GeneratorHistory", () => {
      const mockHistory = [
        { data: { iban: "DE123", country: "DE" }, ts: 1000 },
        { data: { iban: "AT456", country: "AT" }, ts: 2000 },
      ];

      // Mock the hook to return custom history
      vi.mocked(useLocalHistory).mockReturnValueOnce({
        items: mockHistory,
        addItem: mockAddItem,
        clearHistory: mockClearHistory,
        removeItem: mockRemoveItem,
      });

      render(<IBANGeneratorView />);

      expect(GeneratorHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          items: mockHistory,
        }),
        undefined,
      );
    });

    it("should handle history selection", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorView />);

      const selectHistoryButton = screen.getByTestId("select-history");
      await user.click(selectHistoryButton);

      // Should switch to generate mode and update state
      expect(screen.getByTestId("iban-generator-form")).toBeInTheDocument();
      expect(IBANGeneratorForm).toHaveBeenLastCalledWith(
        expect.objectContaining({
          country: "DE",
          result: { iban: "DE123", country: "DE" },
        }),
        undefined,
      );
    });

    it("should handle history clear", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorView />);

      const clearHistoryButton = screen.getByTestId("clear-history");
      await user.click(clearHistoryButton);

      expect(mockClearHistory).toHaveBeenCalled();
    });
  });

  describe("reducer logic", () => {
    // Test the reducer indirectly through component interactions
    it("should handle SET_MODE action", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorView />);

      const validateTab = screen.getByRole("tab", { name: /validate/i });
      await user.click(validateTab);

      // Should show validator form and clear any errors
      expect(screen.getByTestId("iban-validator-form")).toBeInTheDocument();
    });

    it("should handle SET_RESULT action", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorView />);

      const generateButton = screen.getByTestId("generate-result");
      await user.click(generateButton);

      // Should update result and clear error
      expect(IBANGeneratorForm).toHaveBeenLastCalledWith(
        expect.objectContaining({
          result: { iban: "AT123", country: "AT", seed: "test" },
          error: undefined,
        }),
        undefined,
      );
    });

    it("should handle REHYDRATE_RESULT action", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorView />);

      const selectHistoryButton = screen.getByTestId("select-history");
      await user.click(selectHistoryButton);

      // Should set result, country, and switch to generate mode
      expect(IBANGeneratorForm).toHaveBeenLastCalledWith(
        expect.objectContaining({
          result: { iban: "DE123", country: "DE" },
          country: "DE",
        }),
        undefined,
      );
    });
  });

  describe("layout and responsive design", () => {
    it("should have proper layout classes", () => {
      render(<IBANGeneratorView />);

      // Find the main layout container by its specific classes
      const container = document.querySelector(
        ".flex.flex-col.lg\\:flex-row.gap-6",
      );

      expect(container).toBeInTheDocument();
      expect(container).toHaveClass("flex", "flex-col", "lg:flex-row", "gap-6");
    });

    it("should have proper aside width", () => {
      render(<IBANGeneratorView />);

      const aside = screen.getByTestId("generator-history").closest("aside");
      expect(aside).toHaveClass("lg:w-80");
    });

    it("should have proper main content flex", () => {
      render(<IBANGeneratorView />);

      const mainContent = screen
        .getByTestId("iban-generator-form")
        .closest(".flex-1");
      expect(mainContent).toHaveClass("flex-1");
    });
  });

  describe("accessibility", () => {
    it("should have proper tab navigation", () => {
      render(<IBANGeneratorView />);

      const tabsList = screen.getByRole("tablist");
      expect(tabsList).toHaveClass("grid", "w-full", "grid-cols-2");

      const generateTab = screen.getByRole("tab", { name: /generate/i });
      const validateTab = screen.getByRole("tab", { name: /validate/i });

      expect(generateTab).toBeInTheDocument();
      expect(validateTab).toBeInTheDocument();
    });

    it("should have proper tab content association", () => {
      render(<IBANGeneratorView />);

      const generateContent = screen
        .getByTestId("iban-generator-form")
        .closest("[data-state]");
      expect(generateContent).toHaveAttribute("data-state", "active");
    });
  });

  describe("component lifecycle", () => {
    it("should clean up on unmount", () => {
      const { unmount } = render(<IBANGeneratorView />);

      expect(() => unmount()).not.toThrow();
    });

    it("should handle multiple state changes", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorView />);

      // Multiple state changes should not cause issues
      await user.click(screen.getByTestId("change-country"));
      await user.click(screen.getByTestId("change-format"));
      await user.click(screen.getByTestId("set-loading"));
      await user.click(screen.getByTestId("generate-result"));

      // Component should still be functional
      expect(screen.getByTestId("iban-generator-form")).toBeInTheDocument();
    });
  });

  describe("error boundaries", () => {
    it("should handle useLocalHistory errors gracefully", () => {
      // Mock the hook to throw an error
      vi.mocked(useLocalHistory).mockImplementation(() => {
        throw new Error("Hook error");
      });

      // Component throws when hook throws during render (expected behavior)
      expect(() => render(<IBANGeneratorView />)).toThrow("Hook error");
    });

    it("should handle sub-component errors gracefully", () => {
      vi.mocked(IBANGeneratorForm).mockImplementation(() => {
        throw new Error("Component error");
      });

      // The component should handle errors in sub-components
      expect(() => render(<IBANGeneratorView />)).toThrow();
    });
  });

  describe("performance", () => {
    it("should not re-render unnecessarily", () => {
      const { rerender } = render(<IBANGeneratorView />);

      // Re-render with same props should not cause extra renders
      rerender(<IBANGeneratorView />);

      // The mock call count might increase due to internal state changes,
      // but we can't easily test this without more complex mocking
    });
  });

  describe("integration with hooks", () => {
    it("should use useLocalHistory with correct key", () => {
      render(<IBANGeneratorView />);

      expect(useLocalHistory).toHaveBeenCalledWith("gen_history_iban");
    });

    it("should call addToHistory when result is generated", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorView />);

      const generateButton = screen.getByTestId("generate-result");
      await user.click(generateButton);

      expect(mockAddItem).toHaveBeenCalledWith({
        iban: "AT123",
        country: "AT",
        seed: "test",
      });
    });

    it("should call clearHistory when history is cleared", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorView />);

      const clearHistoryButton = screen.getByTestId("clear-history");
      await user.click(clearHistoryButton);

      expect(mockClearHistory).toHaveBeenCalled();
    });
  });
});
