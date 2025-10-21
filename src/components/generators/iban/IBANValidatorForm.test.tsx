import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import IBANValidatorForm from "./IBANValidatorForm";
import { useIbanApi } from "@/lib/hooks/useIbanApi";

// Mock useIbanApi hook
const mockValidate = vi.fn();
vi.mock("@/lib/hooks/useIbanApi", () => ({
  useIbanApi: vi.fn(() => ({
    validate: mockValidate,
    generate: vi.fn(),
    isLoading: false,
    error: null,
    clearError: vi.fn(),
  })),
}));

// Mock ValidationResult component
vi.mock("./ValidationResult", () => ({
  default: vi.fn(({ data }) => (
    <div data-testid="validation-result">
      Valid: {data.valid ? "Yes" : "No"}, IBAN: {data.iban}
    </div>
  )),
}));

import ValidationResult from "./ValidationResult";

describe("IBANValidatorForm", () => {
  const mockProps = {
    inputIban: undefined,
    validation: undefined,
    isLoading: false,
    error: undefined,
    onInputChange: vi.fn(),
    onValidated: vi.fn(),
    onLoadingChange: vi.fn(),
    onError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useIbanApi).mockReturnValue({
      generate: vi.fn(),
      validate: mockValidate,
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
      render(<IBANValidatorForm {...mockProps} />);

      expect(
        screen.getByRole("heading", { name: "Validate IBAN" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /check if an iban is valid using checksum verification/i,
        ),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("IBAN")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /validate iban/i }),
      ).toBeInTheDocument();
    });

    it("should render input with proper attributes", () => {
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");
      expect(ibanInput).toHaveAttribute("type", "text");
      expect(ibanInput).toHaveAttribute(
        "placeholder",
        "e.g., DE89370400440532013000 or AT611904300234573201",
      );
      expect(ibanInput).toHaveAttribute("maxLength", "34");
      expect(ibanInput).toHaveClass("font-mono");
    });

    it("should render help text", () => {
      render(<IBANValidatorForm {...mockProps} />);

      expect(
        screen.getByText(
          "Enter or paste an IBAN to validate (spaces will be removed automatically)",
        ),
      ).toBeInTheDocument();
    });

    it("should not render validation result when no validation", () => {
      render(<IBANValidatorForm {...mockProps} />);

      expect(screen.queryByTestId("validation-result")).not.toBeInTheDocument();
    });

    it("should render validation result when validation is provided", () => {
      const validation = { valid: true, iban: "DE89370400440532013000" };
      render(<IBANValidatorForm {...mockProps} validation={validation} />);

      expect(screen.getByText("Result")).toBeInTheDocument();
      expect(screen.getByTestId("validation-result")).toBeInTheDocument();
    });

    it("should initialize with provided inputIban", () => {
      render(
        <IBANValidatorForm {...mockProps} inputIban="DE89370400440532013000" />,
      );

      const ibanInput = screen.getByLabelText("IBAN");
      expect(ibanInput).toHaveValue("DE89370400440532013000");
    });
  });

  describe("IBAN input validation", () => {
    it("should accept valid IBAN", () => {
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");
      fireEvent.change(ibanInput, {
        target: { value: "DE89370400440532013000" },
      });

      expect(mockProps.onInputChange).toHaveBeenCalledWith(
        "DE89370400440532013000",
      );
      expect(screen.queryByText(/iban must/i)).not.toBeInTheDocument();
    });

    it("should accept IBAN with spaces", () => {
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");
      fireEvent.change(ibanInput, {
        target: { value: "DE89 3704 0044 0532 0130 00" },
      });

      expect(mockProps.onInputChange).toHaveBeenCalledWith(
        "DE89 3704 0044 0532 0130 00",
      );
      expect(screen.queryByText(/iban must/i)).not.toBeInTheDocument();
    });

    it("should reject IBAN with invalid characters", () => {
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");
      fireEvent.change(ibanInput, {
        target: { value: "DE89@370400440532013000" },
      });

      expect(
        screen.getByText("IBAN must contain only letters and numbers"),
      ).toBeInTheDocument();
    });

    it("should reject IBAN too short", () => {
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");
      fireEvent.change(ibanInput, { target: { value: "DE123" } });

      expect(
        screen.getByText("IBAN must be at least 15 characters"),
      ).toBeInTheDocument();
    });

    it("should reject IBAN too long", () => {
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");
      const longIban = "DE" + "1".repeat(33); // 35 chars total
      fireEvent.change(ibanInput, { target: { value: longIban } });

      expect(
        screen.getByText("IBAN must be at most 34 characters"),
      ).toBeInTheDocument();
    });

    it("should reject IBAN with invalid country code", () => {
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");
      fireEvent.change(ibanInput, {
        target: { value: "1239370400440532013000" },
      });

      expect(
        screen.getByText("IBAN must start with a 2-letter country code"),
      ).toBeInTheDocument();
    });

    it("should reject IBAN with invalid check digits", () => {
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");
      fireEvent.change(ibanInput, {
        target: { value: "DEAB370400440532013000" },
      });

      expect(
        screen.getByText("IBAN check digits (positions 3-4) must be numbers"),
      ).toBeInTheDocument();
    });

    it("should accept empty input", async () => {
      const user = userEvent.setup();
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");
      // Type something first, then clear
      await user.type(ibanInput, "TEST");
      await user.clear(ibanInput);

      expect(mockProps.onInputChange).toHaveBeenCalledWith("");
      expect(screen.queryByText(/iban must/i)).not.toBeInTheDocument();
    });

    it("should clear error when input becomes valid", () => {
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");

      // Set invalid input
      fireEvent.change(ibanInput, { target: { value: "INVALID" } });
      expect(
        screen.getByText("IBAN must be at least 15 characters"),
      ).toBeInTheDocument();

      // Set valid input
      fireEvent.change(ibanInput, {
        target: { value: "DE89370400440532013000" },
      });
      expect(screen.queryByText(/iban must/i)).not.toBeInTheDocument();
    });
  });

  describe("IBAN normalization", () => {
    it("should normalize IBAN on paste", async () => {
      const user = userEvent.setup();
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");

      await user.click(ibanInput);
      await user.paste("de89 3704 0044 0532 0130 00");

      expect(mockProps.onInputChange).toHaveBeenCalledWith(
        "DE89370400440532013000",
      );
      expect(ibanInput).toHaveValue("DE89370400440532013000");
    });

    it("should handle paste with empty clipboard", async () => {
      const user = userEvent.setup();
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");

      await user.click(ibanInput);
      await user.paste("");

      expect(mockProps.onInputChange).toHaveBeenCalledWith("");
    });
  });

  describe("form submission", () => {
    it("should submit valid IBAN for validation", async () => {
      const mockResult = { valid: true, iban: "DE89370400440532013000" };
      mockValidate.mockResolvedValue(mockResult);

      const user = userEvent.setup();
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");
      await user.type(ibanInput, "DE89370400440532013000");

      const submitButton = screen.getByRole("button", {
        name: /validate iban/i,
      });
      await user.click(submitButton);

      expect(mockValidate).toHaveBeenCalledWith({
        iban: "DE89370400440532013000",
      });
      expect(mockProps.onLoadingChange).toHaveBeenCalledWith(true);
      expect(mockProps.onLoadingChange).toHaveBeenCalledWith(false);
      expect(mockProps.onValidated).toHaveBeenCalledWith(mockResult);
    });

    it("should normalize IBAN before validation", async () => {
      const mockResult = { valid: true, iban: "DE89370400440532013000" };
      mockValidate.mockResolvedValue(mockResult);

      const user = userEvent.setup();
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");
      await user.type(ibanInput, "de89 3704 0044 0532 0130 00");

      const submitButton = screen.getByRole("button", {
        name: /validate iban/i,
      });
      await user.click(submitButton);

      expect(mockValidate).toHaveBeenCalledWith({
        iban: "DE89370400440532013000",
      });
    });

    it("should not submit when input validation fails", async () => {
      const user = userEvent.setup();
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");
      await user.type(ibanInput, "INVALID");

      const submitButton = screen.getByRole("button", {
        name: /validate iban/i,
      });
      await user.click(submitButton);

      expect(mockValidate).not.toHaveBeenCalled();
      expect(mockProps.onLoadingChange).not.toHaveBeenCalled();
    });

    it("should not submit when input is empty", async () => {
      const user = userEvent.setup();
      render(<IBANValidatorForm {...mockProps} />);

      const submitButton = screen.getByRole("button", {
        name: /validate iban/i,
      });
      expect(submitButton).toBeDisabled();
      await user.click(submitButton);

      expect(mockValidate).not.toHaveBeenCalled();
    });

    it("should disable submit button during loading", async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      let resolveValidate: () => void = () => {};
      const validatePromise = new Promise<void>((resolve) => {
        resolveValidate = resolve;
      });
      mockValidate.mockReturnValue(validatePromise);

      const user = userEvent.setup();
      const { rerender } = render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");
      await user.type(ibanInput, "DE89370400440532013000");

      const submitButton = screen.getByRole("button", {
        name: /validate iban/i,
      });
      await user.click(submitButton);

      // Wait for loading state to be triggered
      await waitFor(() => {
        expect(mockProps.onLoadingChange).toHaveBeenCalledWith(true);
      });

      // Re-render with loading state
      rerender(<IBANValidatorForm {...mockProps} isLoading={true} />);
      const updatedButton = screen.getByRole("button", {
        name: /validating\.\.\./i,
      });

      expect(updatedButton).toBeDisabled();
      expect(updatedButton).toHaveTextContent("Validating...");

      if (resolveValidate) resolveValidate();

      // Wait for loading to complete
      await waitFor(() => {
        expect(mockProps.onLoadingChange).toHaveBeenCalledWith(false);
      });
    });

    it("should disable submit button when input has error", () => {
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");
      fireEvent.change(ibanInput, { target: { value: "INVALID" } });

      const submitButton = screen.getByRole("button", {
        name: /validate iban/i,
      });
      expect(submitButton).toBeDisabled();
    });

    it("should disable submit button when input is empty", () => {
      render(<IBANValidatorForm {...mockProps} />);

      const submitButton = screen.getByRole("button", {
        name: /validate iban/i,
      });
      expect(submitButton).toBeDisabled();
    });
  });

  describe("error handling", () => {
    it("should display error from props", () => {
      const error = { code: "VALIDATION_ERROR", message: "Invalid request" };
      render(<IBANValidatorForm {...mockProps} error={error} />);

      expect(screen.getByText("Invalid request")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should clear error display when error prop is removed", () => {
      const { rerender } = render(
        <IBANValidatorForm
          {...mockProps}
          error={{ code: "ERROR", message: "Test error" }}
        />,
      );

      expect(screen.getByText("Test error")).toBeInTheDocument();

      rerender(<IBANValidatorForm {...mockProps} error={undefined} />);

      expect(screen.queryByText("Test error")).not.toBeInTheDocument();
    });
  });

  describe("validation result display", () => {
    it("should render ValidationResult component when validation is provided", () => {
      const validation = { valid: true, iban: "DE89370400440532013000" };
      render(<IBANValidatorForm {...mockProps} validation={validation} />);

      const validationResult = screen.getByTestId("validation-result");
      expect(validationResult).toBeInTheDocument();
      expect(validationResult).toHaveTextContent(
        "Valid: Yes, IBAN: DE89370400440532013000",
      );
    });

    it("should have proper accessibility attributes for result section", () => {
      const validation = { valid: true, iban: "DE89370400440532013000" };
      render(<IBANValidatorForm {...mockProps} validation={validation} />);

      const resultSection = screen.getByRole("region", {
        name: /validation result/i,
      });
      expect(resultSection).toBeInTheDocument();
    });

    it("should render different validation results", () => {
      const invalidValidation = {
        valid: false,
        iban: "INVALID",
        reason: "Invalid checksum",
      };
      render(
        <IBANValidatorForm {...mockProps} validation={invalidValidation} />,
      );

      const validationResult = screen.getByTestId("validation-result");
      expect(validationResult).toHaveTextContent("Valid: No, IBAN: INVALID");
    });
  });

  describe("loading states", () => {
    it("should show loading state from props", () => {
      render(<IBANValidatorForm {...mockProps} isLoading={true} />);

      const submitButton = screen.getByRole("button", {
        name: /validating\.\.\./i,
      });
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent("Validating...");

      const spinner = submitButton.querySelector("svg");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have proper form structure", () => {
      render(<IBANValidatorForm {...mockProps} />);

      const form = screen.getByRole("form");
      expect(form).toBeInTheDocument();
    });

    it("should have proper labels for inputs", () => {
      render(<IBANValidatorForm {...mockProps} />);

      expect(screen.getByLabelText("IBAN")).toBeInTheDocument();
    });

    it("should have aria-describedby for iban input", () => {
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");
      expect(ibanInput).toHaveAttribute("aria-describedby", "iban-help");
    });

    it("should have aria-describedby for iban error", () => {
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");
      fireEvent.change(ibanInput, { target: { value: "INVALID" } });

      const ibanInputWithError = screen.getByLabelText("IBAN");
      expect(ibanInputWithError).toHaveAttribute(
        "aria-describedby",
        "iban-error",
      );
      expect(ibanInputWithError).toHaveAttribute("aria-invalid", "true");
    });

    it("should have proper button accessibility", () => {
      render(<IBANValidatorForm {...mockProps} />);

      const submitButton = screen.getByRole("button", {
        name: /validate iban/i,
      });
      expect(submitButton).toHaveAttribute("type", "submit");
    });
  });

  describe("keyboard navigation", () => {
    it("should handle Enter key submission", async () => {
      const mockResult = { valid: true, iban: "DE89370400440532013000" };
      mockValidate.mockResolvedValue(mockResult);

      const user = userEvent.setup();
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");
      await user.type(ibanInput, "DE89370400440532013000{enter}");

      expect(mockValidate).toHaveBeenCalledWith({
        iban: "DE89370400440532013000",
      });
    });
  });

  describe("component lifecycle", () => {
    it("should clean up on unmount", () => {
      const { unmount } = render(<IBANValidatorForm {...mockProps} />);

      expect(() => unmount()).not.toThrow();
    });

    it("should handle prop changes", () => {
      const { rerender } = render(<IBANValidatorForm {...mockProps} />);

      // Change inputIban
      rerender(
        <IBANValidatorForm {...mockProps} inputIban="AT611904300234573201" />,
      );

      const ibanInput = screen.getByLabelText("IBAN");
      expect(ibanInput).toHaveValue("AT611904300234573201");

      // Add validation
      const validation = { valid: true, iban: "AT611904300234573201" };
      rerender(
        <IBANValidatorForm
          {...mockProps}
          inputIban="AT611904300234573201"
          validation={validation}
        />,
      );

      expect(screen.getByTestId("validation-result")).toBeInTheDocument();
    });
  });

  describe("input behavior", () => {
    it("should update input value", () => {
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");
      fireEvent.change(ibanInput, {
        target: { value: "DE89370400440532013000" },
      });

      expect(ibanInput).toHaveValue("DE89370400440532013000");
    });

    it("should respect maxLength attribute", () => {
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");
      expect(ibanInput).toHaveAttribute("maxLength", "34");
    });

    it("should call onInputChange on input change", () => {
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");
      fireEvent.change(ibanInput, { target: { value: "DE89" } });

      expect(mockProps.onInputChange).toHaveBeenCalledWith("DE89");
    });
  });

  describe("validation edge cases", () => {
    it("should handle IBAN at minimum length", () => {
      render(<IBANValidatorForm {...mockProps} />);

      // Create a 15-character IBAN (minimum)
      const ibanInput = screen.getByLabelText("IBAN");
      fireEvent.change(ibanInput, { target: { value: "XX" + "1".repeat(13) } }); // 15 chars total

      expect(screen.queryByText(/iban must/i)).not.toBeInTheDocument();
    });

    it("should handle IBAN at maximum length", () => {
      render(<IBANValidatorForm {...mockProps} />);

      // Create a 34-character IBAN (maximum)
      const ibanInput = screen.getByLabelText("IBAN");
      fireEvent.change(ibanInput, { target: { value: "XX" + "1".repeat(32) } }); // 34 chars total

      expect(screen.queryByText(/iban must/i)).not.toBeInTheDocument();
    });

    it("should handle IBAN with mixed case", () => {
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");
      fireEvent.change(ibanInput, {
        target: { value: "de89370400440532013000" },
      });

      expect(screen.queryByText(/iban must/i)).not.toBeInTheDocument();
    });

    it("should handle IBAN with only numbers after country code", () => {
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");
      fireEvent.change(ibanInput, { target: { value: "XX123456789012345" } }); // Valid format

      expect(screen.queryByText(/iban must/i)).not.toBeInTheDocument();
    });
  });

  describe("integration with sub-components", () => {
    it("should pass correct props to ValidationResult", () => {
      const validation = {
        valid: true,
        iban: "DE89370400440532013000",
        reason: "Valid IBAN",
      };
      render(<IBANValidatorForm {...mockProps} validation={validation} />);

      expect(ValidationResult).toHaveBeenCalledWith(
        {
          data: validation,
        },
        undefined,
      );
    });
  });

  describe("paste event handling", () => {
    it("should handle paste with spaces", async () => {
      const user = userEvent.setup();
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");

      await user.click(ibanInput);
      await user.paste("DE 89 37 04 00 44 05 32 01 30 00");

      expect(mockProps.onInputChange).toHaveBeenCalledWith(
        "DE89370400440532013000",
      );
    });

    it("should handle paste with lowercase", async () => {
      const user = userEvent.setup();
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");

      await user.click(ibanInput);
      await user.paste("de89370400440532013000");

      expect(mockProps.onInputChange).toHaveBeenCalledWith(
        "DE89370400440532013000",
      );
    });

    it("should handle paste with mixed case and spaces", async () => {
      const user = userEvent.setup();
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");

      await user.click(ibanInput);
      await user.paste(" De 89 37 04 00 44 05 32 01 30 00 ");

      expect(mockProps.onInputChange).toHaveBeenCalledWith(
        "DE89370400440532013000",
      );
    });
  });

  describe("form state management", () => {
    it("should maintain input value between validations", async () => {
      const mockResult = { valid: true, iban: "DE89370400440532013000" };
      mockValidate.mockResolvedValue(mockResult);

      const user = userEvent.setup();
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");
      await user.type(ibanInput, "DE89370400440532013000");

      const submitButton = screen.getByRole("button", {
        name: /validate iban/i,
      });
      await user.click(submitButton);

      // Input should still have the value
      expect(ibanInput).toHaveValue("DE89370400440532013000");
    });

    it("should clear input error after successful validation", async () => {
      const mockResult = { valid: true, iban: "DE89370400440532013000" };
      mockValidate.mockResolvedValue(mockResult);

      const user = userEvent.setup();
      render(<IBANValidatorForm {...mockProps} />);

      const ibanInput = screen.getByLabelText("IBAN");
      await user.type(ibanInput, "DE89370400440532013000");

      const submitButton = screen.getByRole("button", {
        name: /validate iban/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText(/iban must/i)).not.toBeInTheDocument();
      });
    });
  });
});
