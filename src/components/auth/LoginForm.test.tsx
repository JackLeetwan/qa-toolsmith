import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import LoginForm, { type LoginFormData } from "./LoginForm";
import { renderLoginForm } from "@/test/render-helpers";

// ============================================================================
// LOCAL MOCKS - Form Library & UI Library Mocks
// ============================================================================

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

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock logger
vi.mock("@/lib/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

// ============================================================================
// IMPORT MOCKED MODULES AFTER VI.MOCK CALLS
// ============================================================================

import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { logger } from "@/lib/utils/logger";

// Import global mocks from setup.ts (AFTER vi.mock calls)
import { mockFetch, updateMockLocation } from "@/test/setup";

// ============================================================================
// TEST SETUP - LOCAL STATE
// ============================================================================

// Track redirects for testing
let redirectedTo = "";

// Local mutable state for form behavior
let mockNextValue: string | null = "/dashboard";

// ============================================================================
// TEST SUITE
// ============================================================================

describe("LoginForm", () => {
  let mockUseForm: ReturnType<typeof vi.fn>;
  let mockRegister: ReturnType<typeof vi.fn>;
  let mockHandleSubmit: ReturnType<typeof vi.fn>;
  let mockFormState: { errors: Record<string, unknown> };

  beforeEach(() => {
    // Reset local state
    mockNextValue = "/dashboard";
    redirectedTo = "";
    updateMockLocation(mockNextValue);

    // Fully reset and reinitialize the fetch mock for this test
    // mockReset() alone may not clear all state, so we use mockClear + new implementation
    vi.mocked(mockFetch).mockClear();

    // Reset toast mocks
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();

    // Reset logger mocks
    vi.mocked(logger.debug).mockClear();
    vi.mocked(logger.error).mockClear();

    // Set up react-hook-form mocks
    mockRegister = vi.fn((name) => ({
      name,
      onChange: vi.fn(),
      onBlur: vi.fn(),
      ref: vi.fn(),
    }));

    mockHandleSubmit = vi.fn(
      (fn: (data: LoginFormData) => void) => (e?: React.BaseSyntheticEvent) => {
        if (e) e.preventDefault();
        return fn({
          email: "test@example.com",
          password: "password123",
        });
      },
    );

    mockFormState = { errors: {} };

    mockUseForm = vi.fn(() => ({
      register: mockRegister,
      handleSubmit: mockHandleSubmit,
      formState: mockFormState,
    }));

    (useForm as ReturnType<typeof vi.fn>).mockImplementation(mockUseForm);
  });

  afterEach(() => {
    cleanup();
    redirectedTo = "";
    // Ensure we're back to real timers
    try {
      vi.useRealTimers();
    } catch {
      // Already using real timers
    }
  });

  describe("initial rendering", () => {
    it("should render form immediately in test environment", async () => {
      await renderLoginForm(<LoginForm />);

      // Synchronous assertions - no waitFor needed
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/hasło/i)).toBeInTheDocument();

      // Check that there's exactly one button with "Zaloguj się"
      const buttons = screen.getAllByRole("button", { name: /zaloguj się/i });
      expect(buttons).toHaveLength(1);

      expect(screen.getByText("Nie masz konta?")).toBeInTheDocument();
      expect(screen.getByText("Zapomniałeś hasła?")).toBeInTheDocument();
    });

    it("should render with proper accessibility attributes", async () => {
      await renderLoginForm(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);

      expect(emailInput).toHaveAttribute("type", "email");
      expect(emailInput).toHaveAttribute("autoComplete", "email");
      expect(passwordInput).toHaveAttribute("type", "password");
      expect(passwordInput).toHaveAttribute("autoComplete", "current-password");
    });
  });

  describe("form validation", () => {
    it("should display validation errors", async () => {
      mockFormState.errors = {
        email: { message: "Email jest wymagany" },
        password: { message: "Hasło jest wymagane" },
      };

      await renderLoginForm(<LoginForm />);

      expect(screen.getByText("Email jest wymagany")).toBeInTheDocument();
      expect(screen.getByText("Hasło jest wymagane")).toBeInTheDocument();

      // Check accessibility
      expect(screen.getAllByRole("alert")).toHaveLength(2);
    });

    it("should clear validation errors on successful submit", async () => {
      mockFormState.errors = {
        email: { message: "Email jest wymagany" },
      };

      // Mock successful API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({}),
      });

      const { user } = await renderLoginForm(<LoginForm />);

      // Initially show error
      expect(screen.getByText("Email jest wymagany")).toBeInTheDocument();

      // Submit form
      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      // Wait for fetch to be called - use screen with waitFor
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe("form submission with onSubmit prop", () => {
    it("should call onSubmit prop when provided", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const { user } = await renderLoginForm(
        <LoginForm onSubmit={mockOnSubmit} />,
      );

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
        });
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "🔐 Login attempt started:",
        expect.objectContaining({
          email: "test@example.com",
        }),
      );
      expect(logger.debug).toHaveBeenCalledWith(
        "✅ Login successful via onSubmit prop",
      );
    });

    it("should handle onSubmit errors", async () => {
      const mockOnSubmit = vi.fn().mockRejectedValue(new Error("Login failed"));
      const { user } = await renderLoginForm(
        <LoginForm onSubmit={mockOnSubmit} />,
      );

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          "❌ Login failed via onSubmit prop:",
          expect.any(Error),
        );
      });
    });

    it("should disable form during onSubmit", async () => {
      let resolveSubmit: (() => void) | undefined;
      const mockOnSubmit = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveSubmit = resolve;
          }),
      );

      const { user } = await renderLoginForm(
        <LoginForm onSubmit={mockOnSubmit} />,
      );

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);

      await user.click(submitButton);

      // Form should be disabled during submission
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent("Logowanie...");

      // Resolve submission
      if (resolveSubmit) resolveSubmit();

      await waitFor(() => {
        expect(emailInput).not.toBeDisabled();
        expect(passwordInput).not.toBeDisabled();
        expect(submitButton).not.toBeDisabled();
        expect(submitButton).toHaveTextContent("Zaloguj się");
      });
    });
  });

  describe("default API integration", () => {
    it("should submit to API endpoint when no onSubmit prop", async () => {
      cleanup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({}),
      });

      const { user } = await renderLoginForm(<LoginForm />);

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/auth/signin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "test@example.com",
            password: "password123",
          }),
        });
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "📡 Sending login request to /api/auth/signin",
      );
      expect(logger.debug).toHaveBeenCalledWith(
        "📥 Login response:",
        expect.objectContaining({ status: 200, ok: true }),
      );
    });

    it("should show success toast and redirect on successful API login", async () => {
      cleanup();
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          access_token: "mock-token",
          profile: { email: "test@example.com" },
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const { user } = await renderLoginForm(
        <LoginForm
          onRedirect={(url) => {
            redirectedTo = url;
          }}
        />,
      );

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      // Wait for the API call to complete
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/auth/signin",
          expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: "test@example.com",
              password: "password123",
            }),
          }),
        );
        expect(mockResponse.json).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith("Witaj ponownie!");
      });

      // Wait for the redirect (with 500ms delay)
      await waitFor(
        () => {
          expect(redirectedTo).toBe("/dashboard");
        },
        { timeout: 2000 },
      );

      expect(logger.debug).toHaveBeenCalledWith(
        "✅ Login successful, redirecting...",
      );
      expect(logger.debug).toHaveBeenCalledWith(
        "🔄 Redirecting to:",
        "/dashboard",
      );
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({ message: "Invalid credentials" }),
      });

      const { user } = await renderLoginForm(<LoginForm />);

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
      });

      expect(logger.error).toHaveBeenCalledWith("❌ Login failed:", {
        message: "Invalid credentials",
      });
      expect(toast.success).not.toHaveBeenCalled();
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { user } = await renderLoginForm(<LoginForm />);

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Wystąpił błąd podczas logowania"),
        ).toBeInTheDocument();
      });

      expect(logger.error).toHaveBeenCalledWith(
        "❌ Login network error:",
        expect.any(Error),
      );
    });

    it("should handle malformed API response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
      });

      const { user } = await renderLoginForm(<LoginForm />);

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Wystąpił błąd podczas logowania"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("props handling", () => {
    it("should display external loading state", async () => {
      await renderLoginForm(<LoginForm isLoading={true} />);

      const submitButton = screen.getByRole("button", {
        name: /logowanie\.\.\./i,
      });
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);

      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent("Logowanie...");
    });

    it("should display external error", async () => {
      await renderLoginForm(<LoginForm error="External error message" />);

      expect(screen.getByText("External error message")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should prioritize external error over API error", async () => {
      const { user } = await renderLoginForm(
        <LoginForm error="External error" />,
      );

      // Trigger API error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ message: "API error" }),
      });

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("External error")).toBeInTheDocument();
      });

      // API error should not override external error
      expect(screen.queryByText("API error")).not.toBeInTheDocument();
    });

    it("should clear API error when external error is set", async () => {
      const { rerender } = render(<LoginForm />);

      // First trigger API error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ message: "API error" }),
      });

      const user = userEvent.setup();

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("API error")).toBeInTheDocument();
      });

      // Now set external error
      rerender(<LoginForm error="External error" />);

      expect(screen.getByText("External error")).toBeInTheDocument();
      expect(screen.queryByText("API error")).not.toBeInTheDocument();
    });
  });

  describe("form behavior", () => {
    it("should prevent default form submission", async () => {
      const mockOnSubmit = vi.fn();
      const { user } = await renderLoginForm(
        <LoginForm onSubmit={mockOnSubmit} />,
      );

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });

      await user.click(submitButton);

      expect(mockHandleSubmit).toHaveBeenCalled();
    });

    it("should handle keyboard submission", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const { user } = await renderLoginForm(
        <LoginForm onSubmit={mockOnSubmit} />,
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });
  });

  describe("redirect behavior", () => {
    it("should redirect to home when no next param", async () => {
      cleanup();
      // Update mock location to have no next param
      mockNextValue = null;
      updateMockLocation(null);

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          access_token: "mock-token",
          profile: { email: "test@example.com" },
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const { user } = await renderLoginForm(
        <LoginForm
          onRedirect={(url) => {
            redirectedTo = url;
          }}
        />,
      );

      // Fill in form fields
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      // Wait for the redirect to happen (with 500ms delay from setTimeout)
      await waitFor(
        () => {
          expect(redirectedTo).toBe("/");
        },
        { timeout: 2000 },
      );
    });

    it("should redirect with delay to show success message", async () => {
      cleanup();
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          access_token: "mock-token",
          profile: { email: "test@example.com" },
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const { user } = await renderLoginForm(
        <LoginForm
          onRedirect={(url) => {
            redirectedTo = url;
          }}
        />,
      );

      // Fill in form fields
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      // Wait for the redirect to happen (with 500ms delay from setTimeout)
      await waitFor(
        () => {
          expect(redirectedTo).toBe("/dashboard");
        },
        { timeout: 2000 },
      );
    });
  });

  describe("accessibility", () => {
    it("should have proper ARIA labels", async () => {
      await renderLoginForm(<LoginForm />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toHaveAttribute(
        "aria-invalid",
        "false",
      );
      expect(screen.getByLabelText(/hasło/i)).toHaveAttribute(
        "aria-invalid",
        "false",
      );
    });

    it("should mark invalid fields", async () => {
      mockFormState.errors = {
        email: { message: "Invalid email" },
      };

      await renderLoginForm(<LoginForm />);

      expect(screen.getByLabelText(/email/i)).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });

    it("should have proper form structure", async () => {
      await renderLoginForm(<LoginForm />);

      // Query for form element directly
      const form = screen
        .getByRole("button", { name: /zaloguj się/i })
        .closest("form");
      expect(form).toBeInTheDocument();
      expect(form).toHaveAttribute("noValidate"); // Should prevent browser validation
    });
  });

  describe("logging", () => {
    it("should log form submission attempts", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const { user } = await renderLoginForm(
        <LoginForm onSubmit={mockOnSubmit} />,
      );

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      expect(logger.debug).toHaveBeenCalledWith(
        "🔐 Login attempt started:",
        expect.objectContaining({
          email: "test@example.com",
          timestamp: expect.any(String),
        }),
      );
    });

    it("should log API request details", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({}),
      });

      const { user } = await renderLoginForm(<LoginForm />);

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(logger.debug).toHaveBeenCalledWith(
          "📡 Sending login request to /api/auth/signin",
        );
        expect(logger.debug).toHaveBeenCalledWith(
          "📥 Login response:",
          expect.objectContaining({ status: 200, ok: true }),
        );
      });
    });

    it("should log API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({ message: "Invalid credentials" }),
      });

      const { user } = await renderLoginForm(<LoginForm />);

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith("❌ Login failed:", {
          message: "Invalid credentials",
        });
      });
    });

    it("should log network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network timeout"));

      const { user } = await renderLoginForm(<LoginForm />);

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          "❌ Login network error:",
          expect.any(Error),
        );
      });
    });
  });

  describe("component lifecycle", () => {
    it("should clean up on unmount", async () => {
      const { unmount } = await renderLoginForm(<LoginForm />);

      // Should not cause errors when unmounted
      expect(() => unmount()).not.toThrow();
    });

    it("should handle multiple rapid submissions", async () => {
      let resolveSubmit: (() => void) | undefined;
      const mockOnSubmit = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveSubmit = resolve;
          }),
      );
      const { user } = await renderLoginForm(
        <LoginForm onSubmit={mockOnSubmit} />,
      );

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });

      // Click multiple times rapidly
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // Should only call once due to disabled state
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);

      // Resolve the submission
      if (resolveSubmit) resolveSubmit();

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });
    });
  });
});
