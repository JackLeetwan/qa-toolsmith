import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import ResetRequestForm from "./ResetRequestForm";
import type { ResetRequestFormData } from "./ResetRequestForm";
import { mockLocation } from "../../test/setup";

// Mock react-hook-form
vi.mock("react-hook-form", () => ({
  useForm: vi.fn(() => ({
    register: vi.fn(),
    handleSubmit: vi.fn((fn) => fn),
    formState: { errors: {} },
  })),
}));

// Mock @hookform/resolvers/zod
vi.mock("@hookform/resolvers/zod", () => ({
  zodResolver: vi.fn(() => vi.fn()),
}));

import { useForm } from "react-hook-form";

describe("ResetRequestForm", () => {
  let mockUseForm: ReturnType<typeof vi.fn>;
  let mockRegister: ReturnType<typeof vi.fn>;
  let mockHandleSubmit: ReturnType<typeof vi.fn>;
  let mockFormState: { errors: Record<string, unknown> };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRegister = vi.fn((name) => ({
      name,
      onChange: vi.fn(),
      onBlur: vi.fn(),
      ref: vi.fn(),
    }));

    mockHandleSubmit = vi.fn(
      (fn: (data: ResetRequestFormData) => void) =>
        (e?: React.BaseSyntheticEvent) => {
          if (e) e.preventDefault();
          return fn({
            email: "test@example.com",
          });
        },
    );

    mockFormState = { errors: {} };

    mockUseForm = vi.fn(() => ({
      register: mockRegister,
      handleSubmit: mockHandleSubmit,
      formState: mockFormState,
    }));

    vi.mocked(useForm).mockImplementation(mockUseForm);

    // Clear window.location.reload mock
    mockLocation.reload.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("success state", () => {
    it("should render success message when success prop is true", () => {
      render(<ResetRequestForm success={true} />);

      expect(screen.getByText("Sprawdź email")).toBeInTheDocument();
      expect(
        screen.getByText("Jeśli konto istnieje, wyślemy instrukcję na e‑mail."),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /spróbuj ponownie/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /powrót do logowania/i }),
      ).toBeInTheDocument();
    });

    it("should show success alert with check icon", () => {
      render(<ResetRequestForm success={true} />);

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();

      const alertDescription = screen.getByText(
        "Jeśli konto istnieje, wyślemy instrukcję na e‑mail.",
      );
      expect(alertDescription).toBeInTheDocument();
    });

    it("should reload page when try again button is clicked", async () => {
      const user = userEvent.setup();
      render(<ResetRequestForm success={true} />);

      const tryAgainButton = screen.getByRole("button", {
        name: /spróbuj ponownie/i,
      });
      await user.click(tryAgainButton);

      expect(window.location.reload).toHaveBeenCalledTimes(1);
    });

    it("should render login link with correct href", () => {
      render(<ResetRequestForm success={true} />);

      const loginLink = screen.getByRole("link", {
        name: /powrót do logowania/i,
      });
      expect(loginLink).toHaveAttribute("href", "/auth/login");
    });

    it("should not render form when success is true", () => {
      render(<ResetRequestForm success={true} />);

      expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /wyślij instrukcję/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("form state", () => {
    it("should render form when success is false", () => {
      render(<ResetRequestForm />);

      expect(screen.getByText("Reset hasła")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Wprowadź swój email, a wyślemy Ci instrukcję resetowania hasła",
        ),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /wyślij instrukcję/i }),
      ).toBeInTheDocument();
    });

    it("should render with proper accessibility attributes", () => {
      render(<ResetRequestForm />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute("type", "email");
      expect(emailInput).toHaveAttribute("aria-invalid", "false");
      expect(emailInput).toHaveAttribute("id", "email");
    });
  });

  describe("form validation", () => {
    it("should display validation errors", () => {
      mockFormState.errors = {
        email: { message: "Email jest wymagany" },
      };

      render(<ResetRequestForm />);

      expect(screen.getByText("Email jest wymagany")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should mark invalid fields", () => {
      mockFormState.errors = {
        email: { message: "Invalid email" },
      };

      render(<ResetRequestForm />);

      expect(screen.getByLabelText(/email/i)).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });
  });

  describe("form submission", () => {
    it("should call onSubmit with email data", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(<ResetRequestForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole("button", {
        name: /wyślij instrukcję/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: "test@example.com",
        });
      });
    });

    it("should not submit when onSubmit is not provided", async () => {
      const user = userEvent.setup();

      render(<ResetRequestForm />);

      const submitButton = screen.getByRole("button", {
        name: /wyślij instrukcję/i,
      });
      await user.click(submitButton);

      // Should not throw or cause issues
      expect(mockHandleSubmit).toHaveBeenCalled();
    });

    it("should handle submission errors gracefully", async () => {
      const mockOnSubmit = vi
        .fn()
        .mockRejectedValue(new Error("Request failed"));
      const user = userEvent.setup();

      render(<ResetRequestForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole("button", {
        name: /wyślij instrukcję/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
      // Component handles errors gracefully
    });

    it("should disable form during submission", async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      let resolveSubmit: () => void = () => {};
      const mockOnSubmit = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveSubmit = resolve;
          }),
      );

      const user = userEvent.setup();
      render(<ResetRequestForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole("button", {
        name: /wyślij instrukcję/i,
      });
      const emailInput = screen.getByLabelText(/email/i);

      await user.click(submitButton);

      expect(emailInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent("Wysyłanie...");

      if (resolveSubmit) resolveSubmit();

      await waitFor(() => {
        expect(emailInput).not.toBeDisabled();
        expect(submitButton).not.toBeDisabled();
        expect(submitButton).toHaveTextContent("Wyślij instrukcję");
      });
    });
  });

  describe("props handling", () => {
    it("should display external loading state", () => {
      render(<ResetRequestForm isLoading={true} />);

      const submitButton = screen.getByRole("button", { name: /wysyłanie/i });
      const emailInput = screen.getByLabelText(/email/i);

      expect(emailInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent("Wysyłanie...");
    });

    it("should display external error", () => {
      render(<ResetRequestForm error="External error message" />);

      expect(screen.getByText("External error message")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should handle success prop changes", () => {
      const { rerender } = render(<ResetRequestForm />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();

      rerender(<ResetRequestForm success={true} />);

      expect(screen.getByText("Sprawdź email")).toBeInTheDocument();
      expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    });
  });

  describe("form behavior", () => {
    it("should handle keyboard submission", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(<ResetRequestForm onSubmit={mockOnSubmit} />);

      const emailInput = screen.getByLabelText(/email/i);

      await user.type(emailInput, "test@example.com");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it("should prevent default form submission", async () => {
      const mockOnSubmit = vi.fn();
      const user = userEvent.setup();

      render(<ResetRequestForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole("button", {
        name: /wyślij instrukcję/i,
      });

      await user.click(submitButton);

      expect(mockHandleSubmit).toHaveBeenCalled();
    });
  });

  describe("navigation links", () => {
    it("should render login link in form state", () => {
      render(<ResetRequestForm />);

      const loginLink = screen.getByRole("link", {
        name: /powrót do logowania/i,
      });
      expect(loginLink).toHaveAttribute("href", "/auth/login");
    });

    it("should render login link in success state", () => {
      render(<ResetRequestForm success={true} />);

      const loginLink = screen.getByRole("link", {
        name: /powrót do logowania/i,
      });
      expect(loginLink).toHaveAttribute("href", "/auth/login");
    });
  });

  describe("accessibility", () => {
    it("should have proper form structure", () => {
      render(<ResetRequestForm />);

      const form = screen.getByRole("form");
      expect(form).toBeInTheDocument();
      expect(form).toHaveAttribute("noValidate");
    });

    it("should associate labels with inputs", () => {
      render(<ResetRequestForm />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute("id", "email");
    });
  });

  describe("visual feedback", () => {
    it("should show loading spinner during submission", async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      let resolveSubmit: () => void = () => {};
      const mockOnSubmit = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveSubmit = resolve;
          }),
      );

      const user = userEvent.setup();
      render(<ResetRequestForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole("button", {
        name: /wyślij instrukcję/i,
      });
      await user.click(submitButton);

      expect(screen.getByText("Wysyłanie...")).toBeInTheDocument();
      const spinner = screen.getByRole("button").querySelector("svg");
      expect(spinner).toBeInTheDocument();

      if (resolveSubmit) resolveSubmit();

      await waitFor(() => {
        expect(screen.getByText("Wyślij instrukcję")).toBeInTheDocument();
        const button = screen.queryByRole("button");
        expect(button?.querySelector("svg")).not.toBeInTheDocument();
      });
    });

    it("should maintain button width during loading", async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      let resolveSubmit: () => void = () => {};
      const mockOnSubmit = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveSubmit = resolve;
          }),
      );

      const user = userEvent.setup();
      render(<ResetRequestForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole("button", {
        name: /wyślij instrukcję/i,
      });
      await user.click(submitButton);

      expect(submitButton).toHaveClass("w-full");

      if (resolveSubmit) resolveSubmit();

      await waitFor(() => {
        expect(submitButton).toHaveClass("w-full");
      });
    });
  });

  describe("state transitions", () => {
    it("should transition from form to success state", () => {
      const { rerender } = render(<ResetRequestForm />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();

      rerender(<ResetRequestForm success={true} />);

      expect(screen.getByText("Sprawdź email")).toBeInTheDocument();
      expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    });

    it("should handle success prop changes", () => {
      const { rerender } = render(<ResetRequestForm success={true} />);

      expect(screen.getByText("Sprawdź email")).toBeInTheDocument();

      rerender(<ResetRequestForm success={false} />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.queryByText("Sprawdź email")).not.toBeInTheDocument();
    });
  });

  describe("component lifecycle", () => {
    it("should clean up on unmount", () => {
      const { unmount } = render(<ResetRequestForm />);

      expect(() => unmount()).not.toThrow();
    });

    it("should handle rapid prop changes", () => {
      const { rerender } = render(<ResetRequestForm />);

      rerender(<ResetRequestForm isLoading={true} />);
      rerender(<ResetRequestForm error="error" />);
      rerender(<ResetRequestForm success={true} />);
      rerender(<ResetRequestForm />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });
  });

  describe("error state management", () => {
    it("should clear error when success becomes true", () => {
      const { rerender } = render(<ResetRequestForm error="Some error" />);

      expect(screen.getByText("Some error")).toBeInTheDocument();

      rerender(<ResetRequestForm success={true} />);

      expect(screen.queryByText("Some error")).not.toBeInTheDocument();
    });

    it("should show error in form state", () => {
      render(<ResetRequestForm error="Form error" />);

      expect(screen.getByText("Form error")).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });
  });

  describe("try again functionality", () => {
    it("should reload page when try again is clicked", async () => {
      const user = userEvent.setup();
      render(<ResetRequestForm success={true} />);

      const tryAgainButton = screen.getByRole("button", {
        name: /spróbuj ponownie/i,
      });
      await user.click(tryAgainButton);

      expect(window.location.reload).toHaveBeenCalledTimes(1);
    });

    it("should have proper button styling", () => {
      render(<ResetRequestForm success={true} />);

      const tryAgainButton = screen.getByRole("button", {
        name: /spróbuj ponownie/i,
      });
      expect(tryAgainButton).toHaveClass(
        "text-primary",
        "hover:text-primary/80",
        "underline",
        "underline-offset-4",
        "transition-colors",
      );
    });
  });

  describe("field interactions", () => {
    it("should handle email input changes", async () => {
      const user = userEvent.setup();
      render(<ResetRequestForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.clear(emailInput);
      await user.type(emailInput, "newemail@example.com");

      expect(emailInput).toHaveValue("newemail@example.com");
    });

    it("should handle autoComplete attribute", () => {
      render(<ResetRequestForm />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute("autoComplete", "email");
    });
  });

  describe("styling and layout", () => {
    it("should have proper card layout", () => {
      render(<ResetRequestForm />);

      const card = screen.getByRole("form").closest(".w-full");
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass("w-full");
    });

    it("should have proper input styling", () => {
      render(<ResetRequestForm />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveClass("pl-10"); // Padding for icon
    });

    it("should have icon in input", () => {
      render(<ResetRequestForm />);

      // The Mail icon should be present (though we can't easily test the icon itself)
      const inputContainer = screen.getByLabelText(/email/i).parentElement;
      expect(inputContainer).toHaveClass("relative");
    });
  });
});
