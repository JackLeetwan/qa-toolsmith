import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import ResetConfirmForm from "./ResetConfirmForm";
import type { ResetConfirmFormData } from "./ResetConfirmForm";

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

describe("ResetConfirmForm", () => {
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
      (fn: (data: ResetConfirmFormData) => void) =>
        (e?: React.BaseSyntheticEvent) => {
          if (e) e.preventDefault();
          return fn({
            password: "newpassword123",
            confirmPassword: "newpassword123",
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("success state", () => {
    it("should render success message when success prop is true", () => {
      render(<ResetConfirmForm success={true} token="valid-token" />);

      expect(screen.getByText("Hasło zaktualizowane")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Twoje hasło zostało pomyślnie zaktualizowane. Zostałeś automatycznie zalogowany.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /przejdź do aplikacji/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /przejdź do aplikacji/i }),
      ).toHaveAttribute("href", "/");
    });

    it("should show success alert with check icon", () => {
      render(<ResetConfirmForm success={true} token="valid-token" />);

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveClass(
        "relative",
        "w-full",
        "rounded-lg",
        "border",
        "px-4",
        "py-3",
        "text-sm",
        "grid",
        "has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr]",
        "grid-cols-[0_1fr]",
        "has-[>svg]:gap-x-3",
        "gap-y-0.5",
        "items-start",
        "[&>svg]:size-4",
        "[&>svg]:translate-y-0.5",
        "[&>svg]:text-current",
        "bg-card",
        "text-card-foreground",
      );

      // Check for CheckCircle icon (though we can't easily test the icon itself)
      const alertDescription = screen.getByText(
        "Twoje hasło zostało pomyślnie zaktualizowane. Zostałeś automatycznie zalogowany.",
      );
      expect(alertDescription).toBeInTheDocument();
    });

    it("should not render form when success is true", () => {
      render(<ResetConfirmForm success={true} token="valid-token" />);

      expect(screen.queryByLabelText(/nowe hasło/i)).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText(/potwierdź nowe hasło/i),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /zaktualizuj hasło/i }),
      ).not.toBeInTheDocument();
    });

    it("should prioritize success over token validation", () => {
      render(<ResetConfirmForm success={true} />); // No token provided

      expect(screen.getByText("Hasło zaktualizowane")).toBeInTheDocument();
      expect(screen.queryByText("Nieprawidłowy link")).not.toBeInTheDocument();
    });
  });

  describe("invalid token state", () => {
    it("should render invalid token message when token is not provided", () => {
      render(<ResetConfirmForm />); // No token

      expect(screen.getByText("Nieprawidłowy link")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Link do resetowania hasła jest nieprawidłowy lub wygasł. Poproś o nowy link.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /poproś o nowy link/i }),
      ).toBeInTheDocument();
    });

    it("should render invalid token message when token is empty string", () => {
      render(<ResetConfirmForm token="" />);

      expect(screen.getByText("Nieprawidłowy link")).toBeInTheDocument();
      expect(screen.queryByLabelText(/nowe hasło/i)).not.toBeInTheDocument();
    });

    it("should show destructive alert for invalid token", () => {
      render(<ResetConfirmForm token="" />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass(
        "text-destructive",
        "bg-card",
        "[&>svg]:text-current",
        "*:data-[slot=alert-description]:text-destructive/90",
      );
    });

    it("should not render form when token is invalid", () => {
      render(<ResetConfirmForm />);

      expect(screen.queryByRole("form")).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/nowe hasło/i)).not.toBeInTheDocument();
    });

    it("should render request new link button with outline variant", () => {
      render(<ResetConfirmForm />);

      const button = screen.getByRole("button", {
        name: /poproś o nowy link/i,
      });
      expect(button).toHaveClass(
        "border",
        "bg-background",
        "shadow-xs",
        "hover:bg-accent",
        "hover:text-accent-foreground",
      );
      expect(button).toHaveClass("w-full");
    });
  });

  describe("form state", () => {
    beforeEach(() => {
      render(<ResetConfirmForm token="valid-token" />);
    });

    it("should render form when token is valid and success is false", () => {
      expect(screen.getByText("Ustaw nowe hasło")).toBeInTheDocument();
      expect(
        screen.getByText("Wprowadź nowe hasło dla swojego konta"),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Nowe hasło")).toBeInTheDocument();
      expect(
        screen.getByLabelText(/potwierdź nowe hasło/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /zaktualizuj hasło/i }),
      ).toBeInTheDocument();
    });

    it("should render with proper accessibility attributes", () => {
      const passwordInput = screen.getByLabelText("Nowe hasło");
      const confirmPasswordInput =
        screen.getByLabelText(/potwierdź nowe hasło/i);

      expect(passwordInput).toHaveAttribute("type", "password");
      expect(confirmPasswordInput).toHaveAttribute("type", "password");

      expect(passwordInput).toHaveAttribute("aria-invalid", "false");
      expect(confirmPasswordInput).toHaveAttribute("aria-invalid", "false");
    });

    it("should display password requirements hint", () => {
      expect(
        screen.getByText(
          "Minimum 8 znaków, co najmniej jedna litera i jedna cyfra",
        ),
      ).toBeInTheDocument();
    });

    it("should render login link", () => {
      const loginLink = screen.getByRole("link", {
        name: /powrót do logowania/i,
      });
      expect(loginLink).toHaveAttribute("href", "/auth/login");
    });
  });

  describe("form validation", () => {
    it("should display validation errors", () => {
      mockFormState.errors = {
        password: { message: "Hasło musi mieć co najmniej 8 znaków" },
        confirmPassword: { message: "Hasła nie są identyczne" },
      };

      render(<ResetConfirmForm token="valid-token" />);

      expect(
        screen.getByText("Hasło musi mieć co najmniej 8 znaków"),
      ).toBeInTheDocument();
      expect(screen.getByText("Hasła nie są identyczne")).toBeInTheDocument();
      expect(screen.getAllByRole("alert")).toHaveLength(2);
    });

    it("should mark invalid fields", () => {
      mockFormState.errors = {
        password: { message: "Invalid password" },
      };

      render(<ResetConfirmForm token="valid-token" />);

      expect(screen.getByLabelText("Nowe hasło")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      expect(screen.getByLabelText(/potwierdź nowe hasło/i)).toHaveAttribute(
        "aria-invalid",
        "false",
      );
    });
  });

  describe("form submission", () => {
    it("should call onSubmit with password only", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(<ResetConfirmForm onSubmit={mockOnSubmit} token="valid-token" />);

      const submitButton = screen.getByRole("button", {
        name: /zaktualizuj hasło/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          password: "newpassword123",
        });
      });

      // Should not include confirmPassword
      expect(mockOnSubmit).not.toHaveBeenCalledWith(
        expect.objectContaining({ confirmPassword: expect.anything() }),
      );
    });

    it("should not submit when onSubmit is not provided", async () => {
      const user = userEvent.setup();

      render(<ResetConfirmForm token="valid-token" />);

      const submitButton = screen.getByRole("button", {
        name: /zaktualizuj hasło/i,
      });
      await user.click(submitButton);

      // Should not throw or cause issues
      expect(mockHandleSubmit).toHaveBeenCalled();
    });

    it("should handle submission errors gracefully", async () => {
      const mockOnSubmit = vi.fn().mockRejectedValue(new Error("Reset failed"));
      const user = userEvent.setup();

      render(<ResetConfirmForm onSubmit={mockOnSubmit} token="valid-token" />);

      const submitButton = screen.getByRole("button", {
        name: /zaktualizuj hasło/i,
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
      render(<ResetConfirmForm onSubmit={mockOnSubmit} token="valid-token" />);

      const submitButton = screen.getByRole("button", {
        name: /zaktualizuj hasło/i,
      });
      const passwordInput = screen.getByLabelText("Nowe hasło");
      const confirmPasswordInput =
        screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.click(submitButton);

      expect(passwordInput).toBeDisabled();
      expect(confirmPasswordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent("Aktualizowanie...");

      if (resolveSubmit) resolveSubmit();

      await waitFor(() => {
        expect(passwordInput).not.toBeDisabled();
        expect(confirmPasswordInput).not.toBeDisabled();
        expect(submitButton).not.toBeDisabled();
        expect(submitButton).toHaveTextContent("Zaktualizuj hasło");
      });
    });
  });

  describe("props handling", () => {
    it("should display external loading state", () => {
      render(<ResetConfirmForm token="valid-token" isLoading={true} />);

      const submitButton = screen.getByRole("button", {
        name: /aktualizowanie/i,
      });
      const passwordInput = screen.getByLabelText("Nowe hasło");
      const confirmPasswordInput =
        screen.getByLabelText(/potwierdź nowe hasło/i);

      expect(passwordInput).toBeDisabled();
      expect(confirmPasswordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent("Aktualizowanie...");
    });

    it("should display external error", () => {
      render(<ResetConfirmForm token="valid-token" error="External error" />);

      expect(screen.getByText("External error")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should handle token prop changes", () => {
      const { rerender } = render(<ResetConfirmForm token="valid-token" />);

      expect(screen.getByLabelText("Nowe hasło")).toBeInTheDocument();

      rerender(<ResetConfirmForm />); // Remove token

      expect(screen.getByText("Nieprawidłowy link")).toBeInTheDocument();
      expect(screen.queryByLabelText(/nowe hasło/i)).not.toBeInTheDocument();
    });

    it("should handle success prop changes", () => {
      const { rerender } = render(<ResetConfirmForm token="valid-token" />);

      expect(screen.getByLabelText("Nowe hasło")).toBeInTheDocument();

      rerender(<ResetConfirmForm token="valid-token" success={true} />);

      expect(screen.getByText("Hasło zaktualizowane")).toBeInTheDocument();
      expect(screen.queryByLabelText(/nowe hasło/i)).not.toBeInTheDocument();
    });
  });

  describe("form behavior", () => {
    it("should handle keyboard submission", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(<ResetConfirmForm onSubmit={mockOnSubmit} token="valid-token" />);

      const passwordInput = screen.getByLabelText("Nowe hasło");
      const confirmPasswordInput =
        screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it("should prevent default form submission", async () => {
      const mockOnSubmit = vi.fn();
      const user = userEvent.setup();

      render(<ResetConfirmForm onSubmit={mockOnSubmit} token="valid-token" />);

      const submitButton = screen.getByRole("button", {
        name: /zaktualizuj hasło/i,
      });

      await user.click(submitButton);

      expect(mockHandleSubmit).toHaveBeenCalled();
    });
  });

  describe("password confirmation", () => {
    it("should show password mismatch error", () => {
      mockFormState.errors = {
        confirmPassword: { message: "Hasła nie są identyczne" },
      };

      render(<ResetConfirmForm token="valid-token" />);

      expect(screen.getByText("Hasła nie są identyczne")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have proper form structure", () => {
      render(<ResetConfirmForm token="valid-token" />);

      const form = screen.getByRole("form");
      expect(form).toBeInTheDocument();
      expect(form).toHaveAttribute("noValidate");
    });

    it("should associate labels with inputs", () => {
      render(<ResetConfirmForm token="valid-token" />);

      const passwordInput = screen.getByLabelText("Nowe hasło");
      const confirmPasswordInput =
        screen.getByLabelText(/potwierdź nowe hasło/i);

      expect(passwordInput).toHaveAttribute("id", "password");
      expect(confirmPasswordInput).toHaveAttribute("id", "confirmPassword");
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
      render(<ResetConfirmForm onSubmit={mockOnSubmit} token="valid-token" />);

      const submitButton = screen.getByRole("button", {
        name: /zaktualizuj hasło/i,
      });
      await user.click(submitButton);

      expect(screen.getByText("Aktualizowanie...")).toBeInTheDocument();
      const spinner = screen.getByRole("button").querySelector("svg");
      expect(spinner).toBeInTheDocument();

      if (resolveSubmit) resolveSubmit();

      await waitFor(() => {
        expect(screen.getByText("Zaktualizuj hasło")).toBeInTheDocument();
        const button = screen.queryByRole("button");
        expect(button?.querySelector("svg")).not.toBeInTheDocument();
      });
    });
  });

  describe("state transitions", () => {
    it("should transition from form to success state", () => {
      const { rerender } = render(<ResetConfirmForm token="valid-token" />);

      expect(screen.getByLabelText("Nowe hasło")).toBeInTheDocument();

      rerender(<ResetConfirmForm token="valid-token" success={true} />);

      expect(screen.getByText("Hasło zaktualizowane")).toBeInTheDocument();
      expect(screen.queryByLabelText(/nowe hasło/i)).not.toBeInTheDocument();
    });

    it("should transition from invalid token to form state", () => {
      const { rerender } = render(<ResetConfirmForm />); // No token

      expect(screen.getByText("Nieprawidłowy link")).toBeInTheDocument();

      rerender(<ResetConfirmForm token="valid-token" />);

      expect(screen.getByLabelText("Nowe hasło")).toBeInTheDocument();
      expect(screen.queryByText("Nieprawidłowy link")).not.toBeInTheDocument();
    });

    it("should handle complex state transitions", () => {
      const { rerender } = render(<ResetConfirmForm token="valid-token" />);

      // Form state
      expect(screen.getByLabelText("Nowe hasło")).toBeInTheDocument();

      // To invalid token
      rerender(<ResetConfirmForm />);
      expect(screen.getByText("Nieprawidłowy link")).toBeInTheDocument();

      // Back to form
      rerender(<ResetConfirmForm token="valid-token" />);
      expect(screen.getByLabelText("Nowe hasło")).toBeInTheDocument();

      // To success
      rerender(<ResetConfirmForm token="valid-token" success={true} />);
      expect(screen.getByText("Hasło zaktualizowane")).toBeInTheDocument();
    });
  });

  describe("component lifecycle", () => {
    it("should clean up on unmount", () => {
      const { unmount } = render(<ResetConfirmForm token="valid-token" />);

      expect(() => unmount()).not.toThrow();
    });

    it("should handle rapid prop changes", () => {
      const { rerender } = render(<ResetConfirmForm token="valid-token" />);

      // Rapid prop changes should not cause issues
      rerender(<ResetConfirmForm />);
      rerender(<ResetConfirmForm token="new-token" />);
      rerender(<ResetConfirmForm token="new-token" success={true} />);
      rerender(
        <ResetConfirmForm token="new-token" success={false} error="error" />,
      );

      expect(screen.getByText("Ustaw nowe hasło")).toBeInTheDocument();
    });
  });

  describe("error state management", () => {
    it("should clear error when success becomes true", () => {
      const { rerender } = render(
        <ResetConfirmForm token="valid-token" error="Some error" />,
      );

      expect(screen.getByText("Some error")).toBeInTheDocument();

      rerender(<ResetConfirmForm token="valid-token" success={true} />);

      expect(screen.queryByText("Some error")).not.toBeInTheDocument();
    });

    it("should show error in form state", () => {
      render(<ResetConfirmForm token="valid-token" error="Form error" />);

      expect(screen.getByText("Form error")).toBeInTheDocument();
      expect(screen.getByLabelText("Nowe hasło")).toBeInTheDocument();
    });

    it("should not show error in success state", () => {
      render(
        <ResetConfirmForm
          token="valid-token"
          success={true}
          error="Should not show"
        />,
      );

      expect(screen.queryByText("Should not show")).not.toBeInTheDocument();
      expect(screen.getByText("Hasło zaktualizowane")).toBeInTheDocument();
    });
  });

  describe("navigation links", () => {
    it("should render login link in form state", () => {
      render(<ResetConfirmForm token="valid-token" />);

      const loginLink = screen.getByRole("link", {
        name: /powrót do logowania/i,
      });
      expect(loginLink).toHaveAttribute("href", "/auth/login");
    });

    it("should render request new link button in invalid token state", () => {
      render(<ResetConfirmForm />);

      const newLinkButton = screen.getByRole("button", {
        name: /poproś o nowy link/i,
      });
      expect(newLinkButton).toBeInTheDocument();
    });

    it("should render app link in success state", () => {
      render(<ResetConfirmForm success={true} token="valid-token" />);

      const appLink = screen.getByRole("link", {
        name: /przejdź do aplikacji/i,
      });
      expect(appLink).toHaveAttribute("href", "/");
    });
  });
});
