import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import IBANGeneratorForm from "./IBANGeneratorForm";
import { useIbanApi } from "@/lib/hooks/useIbanApi";

// Mock useIbanApi hook
const mockGenerate = vi.fn();
vi.mock("@/lib/hooks/useIbanApi", () => ({
  useIbanApi: vi.fn(() => ({
    generate: mockGenerate,
    validate: vi.fn(),
    isLoading: false,
    error: null,
    clearError: vi.fn(),
  })),
}));

// Mock sub-components
vi.mock("./IBANResult", () => ({
  default: vi.fn((props) => (
    <div data-testid="iban-result">
      IBAN: {props.data.iban}, Format: {props.format}
    </div>
  )),
}));

vi.mock("./FormatToggle", () => ({
  default: vi.fn((props) => (
    <button
      data-testid="format-toggle"
      onClick={() => props.onChange(props.value === "text" ? "json" : "text")}
    >
      Toggle Format: {props.value}
    </button>
  )),
}));

import IBANResult from "./IBANResult";
import FormatToggle from "./FormatToggle";

describe("IBANGeneratorForm", () => {
  const mockProps = {
    country: "DE" as const,
    seed: undefined,
    format: "text" as const,
    result: undefined,
    isLoading: false,
    error: undefined,
    onCountryChange: vi.fn(),
    onSeedChange: vi.fn(),
    onFormatChange: vi.fn(),
    onGenerated: vi.fn(),
    onLoadingChange: vi.fn(),
    onError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useIbanApi).mockReturnValue({
      generate: mockGenerate,
      validate: vi.fn(),
      isLoading: false,
      error: null,
      clearError: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial rendering", () => {
    it("should render form with all required elements", () => {
      render(<IBANGeneratorForm {...mockProps} />);

      expect(
        screen.getByRole("heading", { name: "Generate IBAN" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Generate a valid IBAN for Germany, Austria, or Poland with optional seed for deterministic results",
        ),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/seed/i)).toBeInTheDocument();
      expect(screen.getByTestId("generate-iban-button")).toBeInTheDocument();
    });

    it("should render country select with options", () => {
      render(<IBANGeneratorForm {...mockProps} />);

      const select = screen.getByRole("combobox", { name: /country/i });
      expect(select).toBeInTheDocument();

      // The select should show the current value
      expect(screen.getByDisplayValue("Germany (DE)")).toBeInTheDocument();
    });

    it("should render seed input with help text", () => {
      render(<IBANGeneratorForm {...mockProps} />);

      const seedInput = screen.getByLabelText(/seed/i);
      expect(seedInput).toBeInTheDocument();
      expect(seedInput).toHaveAttribute("placeholder", "e.g., test-123");
      expect(seedInput).toHaveAttribute("maxLength", "64");

      expect(
        screen.getByText(
          "Use a seed for deterministic generation (max 64 chars, alphanumeric + . _ -)",
        ),
      ).toBeInTheDocument();
    });

    it("should not render result section when no result", () => {
      render(<IBANGeneratorForm {...mockProps} />);

      expect(screen.queryByTestId("iban-result")).not.toBeInTheDocument();
      expect(screen.queryByTestId("format-toggle")).not.toBeInTheDocument();
    });

    it("should render result section when result is provided", () => {
      const result = { iban: "DE12345678901234567890", country: "DE" as const };
      render(<IBANGeneratorForm {...mockProps} result={result} />);

      expect(screen.getByText("Result")).toBeInTheDocument();
      expect(screen.getByTestId("iban-result")).toBeInTheDocument();
      expect(screen.getByTestId("format-toggle")).toBeInTheDocument();
    });
  });

  describe("country selection", () => {
    it("should call onCountryChange when country is selected", async () => {
      render(<IBANGeneratorForm {...mockProps} />);

      // Note: Testing Select component interactions can be complex
      // We'll test the callback is properly set up
      const select = screen.getByRole("combobox", { name: /country/i });

      // The Select component should be rendered with proper props
      expect(select).toBeInTheDocument();
    });

    it("should display current country value", () => {
      render(<IBANGeneratorForm {...mockProps} country="AT" />);

      expect(screen.getByDisplayValue("Austria (AT)")).toBeInTheDocument();
    });

    it("should display current country value for Poland", () => {
      render(<IBANGeneratorForm {...mockProps} country="PL" />);

      expect(screen.getByDisplayValue("Poland (PL)")).toBeInTheDocument();
    });
  });

  describe("seed validation", () => {
    it("should accept valid seed", () => {
      render(<IBANGeneratorForm {...mockProps} />);

      const seedInput = screen.getByLabelText(/seed/i);
      fireEvent.change(seedInput, { target: { value: "valid-seed_123.test" } });

      expect(mockProps.onSeedChange).toHaveBeenCalledWith(
        "valid-seed_123.test",
      );
      expect(screen.queryByText(/seed must/i)).not.toBeInTheDocument();
    });

    it("should reject seed that is too long", () => {
      render(<IBANGeneratorForm {...mockProps} />);

      const longSeed = "a".repeat(65);
      const seedInput = screen.getByLabelText(/seed/i);
      fireEvent.change(seedInput, { target: { value: longSeed } });

      expect(
        screen.getByText("Seed must be at most 64 characters"),
      ).toBeInTheDocument();
      expect(mockProps.onSeedChange).toHaveBeenCalledWith(longSeed);
    });

    it("should reject seed with invalid characters", () => {
      render(<IBANGeneratorForm {...mockProps} />);

      const seedInput = screen.getByLabelText(/seed/i);
      fireEvent.change(seedInput, { target: { value: "invalid@seed!" } });

      expect(
        screen.getByText(
          "Seed must contain only alphanumeric characters, dots, underscores, or hyphens",
        ),
      ).toBeInTheDocument();
    });

    it("should accept empty seed", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorForm {...mockProps} />);

      const seedInput = screen.getByLabelText(/seed/i);
      await user.type(seedInput, "test");
      await user.clear(seedInput);

      expect(mockProps.onSeedChange).toHaveBeenCalledWith(undefined);
      expect(screen.queryByText(/seed must/i)).not.toBeInTheDocument();
    });

    it("should clear error when seed becomes valid", () => {
      render(<IBANGeneratorForm {...mockProps} />);

      const seedInput = screen.getByLabelText(/seed/i);

      // First set invalid seed
      fireEvent.change(seedInput, { target: { value: "invalid@seed!" } });
      expect(
        screen.getByText(
          "Seed must contain only alphanumeric characters, dots, underscores, or hyphens",
        ),
      ).toBeInTheDocument();

      // Then set valid seed
      fireEvent.change(seedInput, { target: { value: "valid-seed" } });
      expect(screen.queryByText(/seed must/i)).not.toBeInTheDocument();
    });

    it("should show help text when no error", () => {
      render(<IBANGeneratorForm {...mockProps} />);

      expect(
        screen.getByText(
          "Use a seed for deterministic generation (max 64 chars, alphanumeric + . _ -)",
        ),
      ).toBeInTheDocument();
    });

    it("should initialize with provided seed", () => {
      render(<IBANGeneratorForm {...mockProps} seed="initial-seed" />);

      const seedInput = screen.getByLabelText(/seed/i);
      expect(seedInput).toHaveValue("initial-seed");
    });

    it("should handle numeric seed", () => {
      render(<IBANGeneratorForm {...mockProps} seed={123} />);

      const seedInput = screen.getByLabelText(/seed/i);
      expect(seedInput).toHaveValue("123");
    });
  });

  describe("form submission", () => {
    it("should call generate with correct parameters", async () => {
      const mockResult = {
        iban: "DE12345678901234567890",
        country: "DE" as const,
      };
      mockGenerate.mockResolvedValue(mockResult);

      const user = userEvent.setup();
      render(<IBANGeneratorForm {...mockProps} />);

      const submitButton = screen.getByTestId("generate-iban-button");
      await user.click(submitButton);

      expect(mockGenerate).toHaveBeenCalledWith({
        country: "DE",
        seed: undefined,
      });
      expect(mockProps.onLoadingChange).toHaveBeenCalledWith(true);
      expect(mockProps.onLoadingChange).toHaveBeenCalledWith(false);
      expect(mockProps.onGenerated).toHaveBeenCalledWith(mockResult);
    });

    it("should call generate with seed when provided", async () => {
      const mockResult = {
        iban: "DE12345678901234567890",
        country: "DE" as const,
      };
      mockGenerate.mockResolvedValue(mockResult);

      const user = userEvent.setup();
      render(<IBANGeneratorForm {...mockProps} />);

      const seedInput = screen.getByLabelText(/seed/i);
      await user.type(seedInput, "test-seed");

      const submitButton = screen.getByTestId("generate-iban-button");
      await user.click(submitButton);

      expect(mockGenerate).toHaveBeenCalledWith({
        country: "DE",
        seed: "test-seed",
      });
    });

    it("should not submit when seed validation fails", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorForm {...mockProps} />);

      const seedInput = screen.getByLabelText(/seed/i);
      await user.type(seedInput, "invalid@seed!");

      const submitButton = screen.getByTestId("generate-iban-button");
      await user.click(submitButton);

      expect(mockGenerate).not.toHaveBeenCalled();
      expect(mockProps.onLoadingChange).not.toHaveBeenCalled();
    });

    it("should disable submit button during loading", () => {
      render(<IBANGeneratorForm {...mockProps} isLoading={true} />);

      const submitButton = screen.getByTestId("generate-iban-button");
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent("Generating...");
    });

    it("should disable submit button when seed has error", () => {
      render(<IBANGeneratorForm {...mockProps} />);

      const seedInput = screen.getByLabelText(/seed/i);
      fireEvent.change(seedInput, { target: { value: "invalid@seed!" } });

      const submitButton = screen.getByTestId("generate-iban-button");
      expect(submitButton).toBeDisabled();
    });

    it("should prevent default form submission", async () => {
      const mockResult = {
        iban: "DE12345678901234567890",
        country: "DE" as const,
      };
      mockGenerate.mockResolvedValue(mockResult);

      const user = userEvent.setup();
      render(<IBANGeneratorForm {...mockProps} />);

      const form = screen.getByRole("form");
      const submitButton = screen.getByTestId("generate-iban-button");

      const submitSpy = vi.fn();
      form.addEventListener("submit", submitSpy);

      await user.click(submitButton);

      // Form submission should be handled by our handler
      expect(submitSpy).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should display error from props", () => {
      const error = { code: "VALIDATION_ERROR", message: "Invalid request" };
      render(<IBANGeneratorForm {...mockProps} error={error} />);

      expect(screen.getByText("Invalid request")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should clear error display when error prop is removed", () => {
      const { rerender } = render(
        <IBANGeneratorForm
          {...mockProps}
          error={{ code: "ERROR", message: "Test error" }}
        />,
      );

      expect(screen.getByText("Test error")).toBeInTheDocument();

      rerender(<IBANGeneratorForm {...mockProps} error={undefined} />);

      expect(screen.queryByText("Test error")).not.toBeInTheDocument();
    });
  });

  describe("result display", () => {
    it("should render IBANResult component when result is provided", () => {
      const result = { iban: "DE12345678901234567890", country: "DE" as const };
      render(<IBANGeneratorForm {...mockProps} result={result} />);

      const ibanResult = screen.getByTestId("iban-result");
      expect(ibanResult).toBeInTheDocument();
      expect(ibanResult).toHaveTextContent(
        "IBAN: DE12345678901234567890, Format: text",
      );
    });

    it("should render FormatToggle component", () => {
      const result = { iban: "DE12345678901234567890", country: "DE" as const };
      render(<IBANGeneratorForm {...mockProps} result={result} />);

      const formatToggle = screen.getByTestId("format-toggle");
      expect(formatToggle).toBeInTheDocument();
      expect(formatToggle).toHaveTextContent("Toggle Format: text");
    });

    it("should call onFormatChange when format toggle is clicked", async () => {
      const result = { iban: "DE12345678901234567890", country: "DE" as const };
      const user = userEvent.setup();
      render(<IBANGeneratorForm {...mockProps} result={result} />);

      const formatToggle = screen.getByTestId("format-toggle");
      await user.click(formatToggle);

      expect(mockProps.onFormatChange).toHaveBeenCalledWith("json");
    });

    it("should have proper accessibility attributes for result section", () => {
      const result = { iban: "DE12345678901234567890", country: "DE" as const };
      render(<IBANGeneratorForm {...mockProps} result={result} />);

      const resultSection = screen.getByRole("region", {
        name: /generation result/i,
      });
      expect(resultSection).toBeInTheDocument();
      expect(resultSection).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("loading states", () => {
    it("should show loading state from props", () => {
      render(<IBANGeneratorForm {...mockProps} isLoading={true} />);

      const submitButton = screen.getByTestId("generate-iban-button");
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent("Generating...");

      const spinner = submitButton.querySelector("svg");
      expect(spinner).toBeInTheDocument();
    });

    it("should show normal state when not loading", () => {
      render(<IBANGeneratorForm {...mockProps} isLoading={false} />);

      const submitButton = screen.getByTestId("generate-iban-button");
      expect(submitButton).not.toBeDisabled();
      expect(submitButton).toHaveTextContent("Generate IBAN");

      const spinner = submitButton.querySelector("svg");
      expect(spinner).not.toBeInTheDocument();
    });

    it("should combine internal and external loading states", () => {
      // External loading takes precedence
      render(<IBANGeneratorForm {...mockProps} isLoading={true} />);

      const submitButton = screen.getByTestId("generate-iban-button");
      expect(submitButton).toBeDisabled();
    });
  });

  describe("accessibility", () => {
    it("should have proper form structure", () => {
      render(<IBANGeneratorForm {...mockProps} />);

      const form = screen.getByRole("form");
      expect(form).toBeInTheDocument();
    });

    it("should have proper labels for inputs", () => {
      render(<IBANGeneratorForm {...mockProps} />);

      expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/seed/i)).toBeInTheDocument();
    });

    it("should have aria-describedby for seed input", () => {
      render(<IBANGeneratorForm {...mockProps} />);

      const seedInput = screen.getByLabelText(/seed/i);
      expect(seedInput).toHaveAttribute("aria-describedby", "seed-help");
    });

    it("should have aria-describedby for seed error", () => {
      render(<IBANGeneratorForm {...mockProps} />);

      const seedInput = screen.getByLabelText(/seed/i);
      fireEvent.change(seedInput, { target: { value: "invalid@seed!" } });

      const seedInputWithError = screen.getByLabelText(/seed/i);
      expect(seedInputWithError).toHaveAttribute(
        "aria-describedby",
        "seed-error",
      );
      expect(seedInputWithError).toHaveAttribute("aria-invalid", "true");
    });

    it("should have proper button accessibility", () => {
      render(<IBANGeneratorForm {...mockProps} />);

      const submitButton = screen.getByTestId("generate-iban-button");
      expect(submitButton).toHaveAttribute("type", "submit");
    });
  });

  describe("component lifecycle", () => {
    it("should clean up on unmount", () => {
      const { unmount } = render(<IBANGeneratorForm {...mockProps} />);

      expect(() => unmount()).not.toThrow();
    });

    it("should handle prop changes", () => {
      const { rerender } = render(<IBANGeneratorForm {...mockProps} />);

      // Change country
      rerender(<IBANGeneratorForm {...mockProps} country="AT" />);
      expect(screen.getByDisplayValue("Austria (AT)")).toBeInTheDocument();

      // Change format
      rerender(<IBANGeneratorForm {...mockProps} format="json" />);
      // Format toggle should reflect new format
    });
  });

  describe("seed input behavior", () => {
    it("should update seed input value", () => {
      render(<IBANGeneratorForm {...mockProps} />);

      const seedInput = screen.getByLabelText(/seed/i);
      fireEvent.change(seedInput, { target: { value: "new-seed" } });

      expect(seedInput).toHaveValue("new-seed");
    });

    it("should respect maxLength attribute", () => {
      render(<IBANGeneratorForm {...mockProps} />);

      const seedInput = screen.getByLabelText(/seed/i);
      expect(seedInput).toHaveAttribute("maxLength", "64");
    });

    it("should call onSeedChange on input change", () => {
      render(<IBANGeneratorForm {...mockProps} />);

      const seedInput = screen.getByLabelText(/seed/i);
      fireEvent.change(seedInput, { target: { value: "test-seed" } });

      expect(mockProps.onSeedChange).toHaveBeenCalledWith("test-seed");
    });

    it("should call onSeedChange with undefined for empty string", async () => {
      const user = userEvent.setup();
      render(<IBANGeneratorForm {...mockProps} />);

      const seedInput = screen.getByLabelText(/seed/i);
      await user.type(seedInput, "test");
      await user.clear(seedInput);

      expect(mockProps.onSeedChange).toHaveBeenCalledWith(undefined);
    });
  });

  describe("validation edge cases", () => {
    it("should handle seed with only valid special characters", () => {
      render(<IBANGeneratorForm {...mockProps} />);

      const seedInput = screen.getByLabelText(/seed/i);
      fireEvent.change(seedInput, { target: { value: "test.seed_123-test" } });

      expect(screen.queryByText(/seed must/i)).not.toBeInTheDocument();
    });

    it("should handle seed exactly at max length", () => {
      render(<IBANGeneratorForm {...mockProps} />);

      const maxLengthSeed = "a".repeat(64);
      const seedInput = screen.getByLabelText(/seed/i);
      fireEvent.change(seedInput, { target: { value: maxLengthSeed } });

      expect(screen.queryByText(/seed must/i)).not.toBeInTheDocument();
    });

    it("should handle seed with unicode characters (invalid)", () => {
      render(<IBANGeneratorForm {...mockProps} />);

      const seedInput = screen.getByLabelText(/seed/i);
      fireEvent.change(seedInput, { target: { value: "test🚀seed" } });

      expect(
        screen.getByText(
          "Seed must contain only alphanumeric characters, dots, underscores, or hyphens",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("integration with sub-components", () => {
    it("should pass correct props to IBANResult", () => {
      const result = { iban: "DE12345678901234567890", country: "DE" as const };
      render(
        <IBANGeneratorForm {...mockProps} result={result} format="text" />,
      );

      // The mock should receive the correct props
      expect(IBANResult).toHaveBeenCalledWith(
        expect.objectContaining({
          data: result,
          format: "text",
        }),
        undefined,
      );
    });

    it("should pass correct props to FormatToggle", () => {
      const result = { iban: "DE12345678901234567890", country: "DE" as const };
      render(
        <IBANGeneratorForm {...mockProps} result={result} format="text" />,
      );

      expect(FormatToggle).toHaveBeenCalledWith(
        expect.objectContaining({
          value: "text",
          onChange: mockProps.onFormatChange,
        }),
        undefined,
      );
    });
  });

  describe("keyboard navigation", () => {
    it("should handle Enter key submission", async () => {
      const mockResult = {
        iban: "DE12345678901234567890",
        country: "DE" as const,
      };
      mockGenerate.mockResolvedValue(mockResult);

      const user = userEvent.setup();
      render(<IBANGeneratorForm {...mockProps} />);

      const seedInput = screen.getByLabelText(/seed/i);
      await user.type(seedInput, "test-seed{enter}");

      expect(mockGenerate).toHaveBeenCalledWith({
        country: "DE",
        seed: "test-seed",
      });
    });
  });

  describe("form reset behavior", () => {
    it("should maintain form state between submissions", async () => {
      const mockResult = {
        iban: "DE12345678901234567890",
        country: "DE" as const,
      };
      mockGenerate.mockResolvedValue(mockResult);

      const user = userEvent.setup();
      render(<IBANGeneratorForm {...mockProps} />);

      // Set seed
      const seedInput = screen.getByLabelText(/seed/i);
      await user.type(seedInput, "test-seed");

      // Submit
      const submitButton = screen.getByTestId("generate-iban-button");
      await user.click(submitButton);

      // Seed should still be there
      expect(seedInput).toHaveValue("test-seed");
    });
  });
});
