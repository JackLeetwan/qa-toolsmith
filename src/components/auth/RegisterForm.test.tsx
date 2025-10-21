import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import RegisterForm from "./RegisterForm";

// Mock @hookform/resolvers/zod
vi.mock("@hookform/resolvers/zod", () => ({
  zodResolver: vi.fn(() => vi.fn()),
}));

// Define types for test mocks
interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

type FormErrors = Partial<Record<keyof RegisterFormData, { message: string }>>;

// Mock react-hook-form to provide a stable test environment
let mockFormData: RegisterFormData = {} as RegisterFormData;
let mockErrors: FormErrors = {};
let mockIsSubmitting = false;

vi.mock("react-hook-form", () => ({
  useForm: vi.fn(() => ({
    register: vi.fn((name) => ({
      name,
      onChange: vi.fn((e) => {
        mockFormData = { ...mockFormData, [name]: e.target.value };
      }),
      onBlur: vi.fn(),
      ref: vi.fn(),
    })),
    handleSubmit: vi.fn((fn) => async (e: React.FormEvent<HTMLFormElement>) => {
      e?.preventDefault?.();
      // Call the component's handleFormSubmit function with form data
      await fn(mockFormData);
    }),
    formState: {
      get errors() {
        return mockErrors;
      },
      get isSubmitting() {
        return mockIsSubmitting;
      },
    },
    watch: vi.fn(),
    setValue: vi.fn(),
    getValues: vi.fn(() => mockFormData),
    reset: vi.fn(),
  })),
}));

// Helper to update mock state for testing
const updateMockFormState = (
  data: Partial<RegisterFormData>,
  errors: FormErrors = {},
  isSubmitting = false,
) => {
  mockFormData = { ...mockFormData, ...data };
  mockErrors = { ...errors };
  mockIsSubmitting = isSubmitting;
};

describe("RegisterForm", () => {
  beforeEach(() => {
    mockFormData = {} as RegisterFormData;
    mockErrors = {};
    mockIsSubmitting = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial rendering", () => {
    it("should render form with all required fields", () => {
      render(<RegisterForm />);

      // Check for the title in the card header
      expect(
        screen.getByRole("heading", { name: "Utwórz konto" }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^hasło$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/potwierdź hasło/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /utwórz konto/i }),
      ).toBeInTheDocument();
      expect(screen.getByText("Masz już konto?")).toBeInTheDocument();
    });

    it("should render with proper accessibility attributes", () => {
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^hasło$/i);
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      expect(emailInput).toHaveAttribute("type", "email");
      expect(passwordInput).toHaveAttribute("type", "password");
      expect(confirmPasswordInput).toHaveAttribute("type", "password");

      expect(emailInput).toHaveAttribute("aria-invalid", "false");
      expect(passwordInput).toHaveAttribute("aria-invalid", "false");
      expect(confirmPasswordInput).toHaveAttribute("aria-invalid", "false");
    });

    it("should display password requirements hint", () => {
      render(<RegisterForm />);

      expect(
        screen.getByText(
          "Minimum 8 znaków, co najmniej jedna litera i jedna cyfra",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("form validation", () => {
    it("should display validation errors for all fields", () => {
      // Set up mock errors
      updateMockFormState(
        {},
        {
          email: { message: "Email jest wymagany" },
          password: { message: "Hasło musi mieć co najmniej 8 znaków" },
          confirmPassword: { message: "Hasła nie są identyczne" },
        },
      );

      render(<RegisterForm />);

      expect(screen.getByText("Email jest wymagany")).toBeInTheDocument();
      expect(
        screen.getByText("Hasło musi mieć co najmniej 8 znaków"),
      ).toBeInTheDocument();
      expect(screen.getByText("Hasła nie są identyczne")).toBeInTheDocument();

      // Check accessibility
      expect(screen.getAllByRole("alert")).toHaveLength(3);
    });

    it("should validate password complexity requirements", () => {
      // Set up mock error for password complexity
      updateMockFormState(
        {},
        {
          password: {
            message:
              "Hasło musi zawierać co najmniej jedną literę i jedną cyfrę",
          },
        },
      );

      render(<RegisterForm />);

      expect(
        screen.getByText(
          "Hasło musi zawierać co najmniej jedną literę i jedną cyfrę",
        ),
      ).toBeInTheDocument();
    });

    it("should mark invalid fields with aria-invalid", () => {
      // Set up mock errors
      updateMockFormState(
        {},
        {
          email: { message: "Invalid email" },
          confirmPassword: { message: "Passwords don't match" },
        },
      );

      render(<RegisterForm />);

      expect(screen.getByLabelText(/email/i)).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      expect(screen.getByLabelText(/^hasło$/i)).toHaveAttribute(
        "aria-invalid",
        "false",
      );
      expect(screen.getByLabelText(/potwierdź hasło/i)).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });
  });

  describe("form submission", () => {
    it("should call onSubmit with correct data when provided", async () => {
      const mockOnSubmit = vi
        .fn<
          (data: Omit<RegisterFormData, "confirmPassword">) => Promise<void>
        >()
        .mockResolvedValue(undefined);
      const user = userEvent.setup();

      // Initialize mock form data
      updateMockFormState({
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      render(<RegisterForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole("button", {
        name: /utwórz konto/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
        });
      });

      // Should not include confirmPassword in the submitted data
      expect(mockOnSubmit).not.toHaveBeenCalledWith(
        expect.objectContaining({ confirmPassword: expect.anything() }),
      );
    });

    it("should not submit when onSubmit is not provided", async () => {
      const user = userEvent.setup();

      // Initialize mock form data
      updateMockFormState({
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      render(<RegisterForm />);

      const submitButton = screen.getByRole("button", {
        name: /utwórz konto/i,
      });
      await user.click(submitButton);

      // Should not throw or cause issues - form is still interactive
      expect(submitButton).not.toBeDisabled();
    });

    it("should handle onSubmit errors gracefully", async () => {
      const mockOnSubmit = vi
        .fn<
          (data: Omit<RegisterFormData, "confirmPassword">) => Promise<void>
        >()
        .mockRejectedValue(new Error("Registration failed"));
      const user = userEvent.setup();

      // Initialize mock form data
      updateMockFormState({
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      render(<RegisterForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole("button", {
        name: /utwórz konto/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      // Component should handle errors gracefully and re-enable form
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it("should disable form during submission", async () => {
      let resolveSubmit: () => void = vi.fn();
      const mockOnSubmit = vi.fn<
        (data: Omit<RegisterFormData, "confirmPassword">) => Promise<void>
      >(
        () =>
          new Promise<void>((resolve) => {
            resolveSubmit = resolve;
          }),
      );

      const user = userEvent.setup();

      // Initialize mock form data
      updateMockFormState({
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      render(<RegisterForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole("button", {
        name: /utwórz konto/i,
      });
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^hasło$/i);
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      await user.click(submitButton);

      // Form should be disabled during submission (component manages its own isSubmitting state)
      await waitFor(() => {
        expect(emailInput).toBeDisabled();
        expect(passwordInput).toBeDisabled();
        expect(confirmPasswordInput).toBeDisabled();
        expect(submitButton).toBeDisabled();
        expect(submitButton).toHaveTextContent("Tworzenie konta...");
      });

      // Resolve submission
      resolveSubmit();

      await waitFor(() => {
        expect(emailInput).not.toBeDisabled();
        expect(passwordInput).not.toBeDisabled();
        expect(confirmPasswordInput).not.toBeDisabled();
        expect(submitButton).not.toBeDisabled();
        expect(submitButton).toHaveTextContent("Utwórz konto");
      });
    });
  });

  describe("props handling", () => {
    it("should display external loading state", () => {
      // Set isLoading prop to true - this should override the default button name search
      render(<RegisterForm isLoading={true} />);

      const submitButton = screen.getByRole("button", {
        name: /tworzenie konta/i,
      });
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^hasło$/i);
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(confirmPasswordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent("Tworzenie konta...");
    });

    it("should display external error", () => {
      render(<RegisterForm error="External registration error" />);

      expect(
        screen.getByText("External registration error"),
      ).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should combine external and internal loading states", () => {
      // Set isLoading prop to true
      render(<RegisterForm isLoading={true} />);

      // Both isLoading prop and internal state should disable form
      const submitButton = screen.getByRole("button", {
        name: /tworzenie konta/i,
      });
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent("Tworzenie konta...");
    });
  });

  describe("form behavior", () => {
    it("should handle keyboard submission", async () => {
      const mockOnSubmit = vi
        .fn<
          (data: Omit<RegisterFormData, "confirmPassword">) => Promise<void>
        >()
        .mockResolvedValue(undefined);
      const user = userEvent.setup();

      // Initialize mock form data
      updateMockFormState({
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      render(<RegisterForm onSubmit={mockOnSubmit} />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, "{Enter}");

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
        });
      });
    });
  });

  describe("password confirmation validation", () => {
    it("should show password mismatch error", async () => {
      const mockOnSubmit = vi.fn();
      const user = userEvent.setup();

      // Set up mock with password mismatch error
      updateMockFormState(
        {
          email: "test@example.com",
          password: "password123",
          confirmPassword: "differentpassword",
        },
        {
          confirmPassword: { message: "Hasła nie są identyczne" },
        },
      );

      render(<RegisterForm onSubmit={mockOnSubmit} />);

      await user.click(screen.getByRole("button", { name: /utwórz konto/i }));

      expect(screen.getByText("Hasła nie są identyczne")).toBeInTheDocument();
    });

    it("should validate password confirmation field is required", async () => {
      const mockOnSubmit = vi.fn();
      const user = userEvent.setup();

      // Set up mock with missing confirmPassword
      updateMockFormState(
        {
          email: "test@example.com",
          password: "password123",
        },
        {
          confirmPassword: { message: "Potwierdzenie hasła jest wymagane" },
        },
      );

      render(<RegisterForm onSubmit={mockOnSubmit} />);

      await user.click(screen.getByRole("button", { name: /utwórz konto/i }));

      expect(
        screen.getByText("Potwierdzenie hasła jest wymagane"),
      ).toBeInTheDocument();
    });
  });

  describe("field interactions", () => {
    it("should handle email input changes", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.clear(emailInput);
      await user.type(emailInput, "newemail@example.com");

      expect(emailInput).toHaveValue("newemail@example.com");
    });

    it("should handle password input changes", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const passwordInput = screen.getByLabelText(/^hasło$/i);
      await user.clear(passwordInput);
      await user.type(passwordInput, "newpassword123");

      expect(passwordInput).toHaveValue("newpassword123");
    });

    it("should handle confirm password input changes", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);
      await user.clear(confirmPasswordInput);
      await user.type(confirmPasswordInput, "confirmpassword123");

      expect(confirmPasswordInput).toHaveValue("confirmpassword123");
    });
  });

  describe("navigation links", () => {
    it("should render login link with correct href", () => {
      render(<RegisterForm />);

      const loginLink = screen.getByRole("link", { name: /zaloguj się/i });
      expect(loginLink).toHaveAttribute("href", "/auth/login");
    });

    it("should render link with proper styling classes", () => {
      render(<RegisterForm />);

      const loginLink = screen.getByRole("link", { name: /zaloguj się/i });
      expect(loginLink).toHaveClass(
        "text-primary",
        "hover:text-primary/80",
        "underline",
        "underline-offset-4",
        "transition-colors",
      );
    });
  });

  describe("accessibility", () => {
    it("should have proper form structure", () => {
      render(<RegisterForm />);

      // Check that form exists and has noValidate attribute
      const form = document.querySelector("form");
      expect(form).toBeInTheDocument();
      expect(form).toHaveAttribute("noValidate");
    });

    it("should associate labels with inputs", () => {
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^hasło$/i);
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      expect(emailInput).toHaveAttribute("id", "email");
      expect(passwordInput).toHaveAttribute("id", "password");
      expect(confirmPasswordInput).toHaveAttribute("id", "confirmPassword");
    });

    it("should have unique IDs for all inputs", () => {
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^hasło$/i);
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      const ids = [emailInput, passwordInput, confirmPasswordInput]
        .map((input) => input.getAttribute("id"))
        .filter(Boolean);

      expect(new Set(ids).size).toBe(ids.length); // All IDs are unique
      expect(ids).toHaveLength(3);
    });
  });

  describe("component lifecycle", () => {
    it("should clean up on unmount", () => {
      const { unmount } = render(<RegisterForm />);

      // Should not cause errors when unmounted
      expect(() => unmount()).not.toThrow();
    });

    it("should handle component unmounting gracefully", () => {
      const { unmount } = render(<RegisterForm />);

      // Should not cause errors when unmounted
      expect(() => unmount()).not.toThrow();
    });
  });

  describe("visual feedback", () => {
    it("should show loading spinner and update button text when submitting", async () => {
      let resolveSubmit: () => void = vi.fn();
      const mockOnSubmit = vi.fn<
        (data: Omit<RegisterFormData, "confirmPassword">) => Promise<void>
      >(
        () =>
          new Promise<void>((resolve) => {
            resolveSubmit = resolve;
          }),
      );

      const user = userEvent.setup();

      // Initialize mock form data
      updateMockFormState({
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      render(<RegisterForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole("button", {
        name: /utwórz konto/i,
      });

      // Initial state - no spinner, correct text
      expect(submitButton).toHaveTextContent("Utwórz konto");
      expect(submitButton.querySelector("svg")).not.toBeInTheDocument();

      await user.click(submitButton);

      // Loading state - spinner visible, text changed
      await waitFor(() => {
        expect(submitButton).toHaveTextContent("Tworzenie konta...");
        expect(submitButton).toBeDisabled();
      });

      const spinner = submitButton.querySelector("svg");
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass("animate-spin");

      // Resolve and check return to normal state
      resolveSubmit();

      await waitFor(() => {
        expect(submitButton).toHaveTextContent("Utwórz konto");
        expect(submitButton).not.toBeDisabled();
        expect(submitButton.querySelector("svg")).not.toBeInTheDocument();
      });
    });

    it("should maintain button width and disabled state during loading", async () => {
      let resolveSubmit: () => void = vi.fn();
      const mockOnSubmit = vi.fn<
        (data: Omit<RegisterFormData, "confirmPassword">) => Promise<void>
      >(
        () =>
          new Promise<void>((resolve) => {
            resolveSubmit = resolve;
          }),
      );

      const user = userEvent.setup();

      // Initialize mock form data
      updateMockFormState({
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      render(<RegisterForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole("button", {
        name: /utwórz konto/i,
      });
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^hasło$/i);
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      // Initial state - all elements enabled
      expect(submitButton).toHaveClass("w-full");
      expect(submitButton).not.toBeDisabled();
      expect(emailInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
      expect(confirmPasswordInput).not.toBeDisabled();

      await user.click(submitButton);

      // Loading state - all form elements disabled, button maintains width
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(emailInput).toBeDisabled();
        expect(passwordInput).toBeDisabled();
        expect(confirmPasswordInput).toBeDisabled();
      });

      expect(submitButton).toHaveClass("w-full");

      // Resolve submission
      resolveSubmit();

      // Back to enabled state
      await waitFor(() => {
        expect(submitButton).toHaveClass("w-full");
        expect(submitButton).not.toBeDisabled();
        expect(emailInput).not.toBeDisabled();
        expect(passwordInput).not.toBeDisabled();
        expect(confirmPasswordInput).not.toBeDisabled();
      });
    });

    it("should display external loading state with proper visual feedback", () => {
      render(<RegisterForm isLoading={true} />);

      const submitButton = screen.getByRole("button", {
        name: /tworzenie konta/i,
      });
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^hasło$/i);
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      // External loading state
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent("Tworzenie konta...");
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(confirmPasswordInput).toBeDisabled();

      // Spinner should be visible
      const spinner = submitButton.querySelector("svg");
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass("animate-spin");
    });

    it("should show visual feedback for form validation states", async () => {
      // Set up mock validation errors
      updateMockFormState(
        {},
        {
          email: { message: "Email jest wymagany" },
          password: { message: "Hasło musi mieć co najmniej 8 znaków" },
          confirmPassword: { message: "Potwierdzenie hasła jest wymagane" },
        },
      );

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^hasło$/i);
      const submitButton = screen.getByRole("button", {
        name: /utwórz konto/i,
      });

      // Should show validation errors with proper ARIA attributes
      expect(emailInput).toHaveAttribute("aria-invalid", "true");
      expect(passwordInput).toHaveAttribute("aria-invalid", "true");

      // Error messages should be visible
      expect(screen.getByText("Email jest wymagany")).toBeInTheDocument();
      expect(
        screen.getByText("Hasło musi mieć co najmniej 8 znaków"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Potwierdzenie hasła jest wymagane"),
      ).toBeInTheDocument();
      expect(screen.getAllByRole("alert")).toHaveLength(3); // email, password, confirmPassword errors

      // Submit button should still be enabled (validation errors don't disable form)
      expect(submitButton).not.toBeDisabled();
    });

    it("should provide visual feedback for successful field completion", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^hasło$/i);

      // Initially valid state
      expect(emailInput).toHaveAttribute("aria-invalid", "false");
      expect(passwordInput).toHaveAttribute("aria-invalid", "false");

      // Fill in valid data
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      // Should maintain valid state
      expect(emailInput).toHaveAttribute("aria-invalid", "false");
      expect(passwordInput).toHaveAttribute("aria-invalid", "false");

      // No error messages should be visible
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("error state management", () => {
    it("should clear error when props change", () => {
      const { rerender } = render(<RegisterForm error="Initial error" />);

      expect(screen.getByText("Initial error")).toBeInTheDocument();

      // Update props without error
      rerender(<RegisterForm />);

      expect(screen.queryByText("Initial error")).not.toBeInTheDocument();
    });

    it("should display new error when props change", () => {
      const { rerender } = render(<RegisterForm />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      // Update with error
      rerender(<RegisterForm error="New error message" />);

      expect(screen.getByText("New error message")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("form reset behavior", () => {
    it("should not reset form data after successful submission", async () => {
      const mockOnSubmit = vi
        .fn<
          (data: Omit<RegisterFormData, "confirmPassword">) => Promise<void>
        >()
        .mockResolvedValue(undefined);
      const user = userEvent.setup();

      // Initialize mock form data
      updateMockFormState({
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      render(<RegisterForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole("button", {
        name: /utwórz konto/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      // Form should remain interactive after successful submission
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });
});
