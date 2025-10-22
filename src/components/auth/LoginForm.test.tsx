import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, cleanup } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import LoginForm from "./LoginForm";
import { renderLoginForm } from "@/test/render-helpers";

// ============================================================================
// LOCAL MOCKS - Form Library & UI Library Mocks
// ============================================================================

// We'll use vi.spyOn for AuthClientService in tests that need API mocking
import { AuthClientService } from "@/lib/services/authClient.service";

// Allow useLoginForm hook to work normally - we're testing the component integration

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

import { toast } from "sonner";
import { logger } from "@/lib/utils/logger";

// Import global mocks from setup.ts (AFTER vi.mock calls)
import { updateMockLocation, mockFetch } from "@/test/setup";

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
  beforeEach(() => {
    // Reset local state
    mockNextValue = "/dashboard";
    redirectedTo = "";
    updateMockLocation(mockNextValue);

    // Reset toast mocks
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();

    // Reset logger mocks
    vi.mocked(logger.debug).mockClear();
    vi.mocked(logger.error).mockClear();

    // Reset AuthClientService spy
    vi.restoreAllMocks();
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
      // Spy on AuthClientService to prevent API call
      vi.spyOn(AuthClientService, "login").mockRejectedValue(
        new Error("Should not be called"),
      );

      const { user } = await renderLoginForm(<LoginForm />);

      // Try to submit empty form to trigger validation
      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      // Wait for validation to appear (React Hook Form shows errors after attempted submit)
      await waitFor(() => {
        expect(screen.getByText("Email jest wymagany")).toBeInTheDocument();
        expect(screen.getByText("Hasło jest wymagane")).toBeInTheDocument();
      });

      // Check accessibility
      expect(screen.getAllByRole("alert")).toHaveLength(2);
    });

    it("should clear validation errors on successful submit", async () => {
      // Spy on successful API call
      vi.spyOn(AuthClientService, "login").mockResolvedValue({
        access_token: "token",
        profile: {
          id: "test-user-id",
          email: "test@example.com",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          role: "user",
        },
      });

      const { user } = await renderLoginForm(<LoginForm />);

      // First try to submit empty form to trigger validation
      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      // Wait for validation to appear
      await waitFor(() => {
        expect(screen.getByText("Email jest wymagany")).toBeInTheDocument();
      });

      // Now fill the form and submit successfully
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      await user.click(submitButton);

      // Wait for successful submission - validation errors should be cleared
      await waitFor(() => {
        expect(AuthClientService.login).toHaveBeenCalled();
      });

      // Validation errors should be gone
      expect(screen.queryByText("Email jest wymagany")).not.toBeInTheDocument();
      expect(screen.queryByText("Hasło jest wymagany")).not.toBeInTheDocument();
    });
  });

  describe("form submission with onSubmit prop", () => {
    it("should call onSubmit prop when provided", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const { user } = await renderLoginForm(
        <LoginForm onSubmit={mockOnSubmit} />,
      );

      // Fill form first
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

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

      // Fill form first
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

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
      const mockOnSubmit = vi.fn(
        () => new Promise<void>((resolve) => setTimeout(resolve, 100)),
      );

      const { user } = await renderLoginForm(
        <LoginForm onSubmit={mockOnSubmit} />,
      );

      // Fill form first
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      // Form should be disabled during submission
      await waitFor(() => {
        expect(emailInput).toBeDisabled();
        expect(passwordInput).toBeDisabled();
        expect(submitButton).toBeDisabled();
        expect(submitButton).toHaveTextContent("Logowanie...");
      });

      // Wait for submission to complete
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      // Form should be enabled after submission
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
      // Mock fetch to allow AuthClientService.login to execute real code and logging
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          access_token: "token",
          profile: { email: "test@example.com" },
        }),
      });

      const { user } = await renderLoginForm(<LoginForm />);

      // Fill form first
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

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
      vi.spyOn(AuthClientService, "login").mockResolvedValue({
        access_token: "mock-token",
        profile: {
          id: "test-user-id",
          email: "test@example.com",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          role: "user",
        },
      });

      const { user } = await renderLoginForm(
        <LoginForm
          onRedirect={(url) => {
            redirectedTo = url;
          }}
        />,
      );

      // Fill form first
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      // Wait for the API call to complete
      await waitFor(() => {
        expect(AuthClientService.login).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
        });
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
    });

    it("should handle API errors", async () => {
      // Mock fetch to return an error response, allowing real AuthClientService error handling
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: "Invalid credentials" }),
      });

      const { user } = await renderLoginForm(<LoginForm />);

      // Fill form first
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

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
      // Mock fetch to throw a network error, allowing real AuthClientService error handling
      mockFetch.mockRejectedValueOnce(new Error("Network timeout"));

      const { user } = await renderLoginForm(<LoginForm />);

      // Fill form first
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

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
      vi.spyOn(AuthClientService, "login").mockRejectedValue(
        new Error("Wystąpił błąd podczas logowania"),
      );

      const { user } = await renderLoginForm(<LoginForm />);

      // Fill form first
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

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
      vi.spyOn(AuthClientService, "login").mockRejectedValue(
        new Error("API error"),
      );

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("External error")).toBeInTheDocument();
      });

      // API error should not override external error
      expect(screen.queryByText("API error")).not.toBeInTheDocument();
    });

    it("should clear API error when external error is set", async () => {
      // Mock fetch to return an error response, allowing real AuthClientService error handling
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({
          message: "API error",
        }),
      });

      const { rerender } = await renderLoginForm(<LoginForm />);

      const user = userEvent.setup();

      // Fill form first
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

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
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const { user } = await renderLoginForm(
        <LoginForm onSubmit={mockOnSubmit} />,
      );

      // Fill form to pass validation
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });

      await user.click(submitButton);

      // Wait for onSubmit to be called (which means form submission was handled)
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
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

      vi.spyOn(AuthClientService, "login").mockResolvedValue({
        access_token: "mock-token",
        profile: {
          id: "test-user-id",
          email: "test@example.com",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          role: "user",
        },
      });

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
      vi.spyOn(AuthClientService, "login").mockResolvedValue({
        access_token: "mock-token",
        profile: {
          id: "test-user-id",
          email: "test@example.com",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          role: "user",
        },
      });

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
      // Mock AuthClientService to prevent API call
      vi.spyOn(AuthClientService, "login").mockRejectedValue(
        new Error("Should not be called"),
      );

      const { user } = await renderLoginForm(<LoginForm />);

      // Type invalid email and try to submit
      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, "invalid-email");

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      // Wait for validation to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toHaveAttribute(
          "aria-invalid",
          "true",
        );
      });
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

      // Fill form first
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

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
      // Mock fetch for this test to check API logging - allow real AuthClientService code execution
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          access_token: "token",
          profile: { email: "test@example.com" },
        }),
      });

      const { user } = await renderLoginForm(<LoginForm />);

      // Fill form first
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      // Wait for the form submission to complete
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "📡 Sending login request to /api/auth/signin",
      );
      expect(logger.debug).toHaveBeenCalledWith(
        "📥 Login response:",
        expect.objectContaining({ status: 200, ok: true }),
      );
    });

    it("should log API errors", async () => {
      // Mock fetch to return an error response - allow real AuthClientService error handling
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({
          message: "Invalid credentials",
        }),
      });

      const { user } = await renderLoginForm(<LoginForm />);

      // Fill form first
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      // Wait for the form submission to complete and error logging to happen
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      expect(logger.error).toHaveBeenCalledWith(
        "❌ Login failed:",
        expect.objectContaining({ message: "Invalid credentials" }),
      );
    });

    it("should log network errors", async () => {
      // Mock fetch to throw a network error - allow real AuthClientService error handling
      mockFetch.mockRejectedValueOnce(new Error("Network timeout"));

      const { user } = await renderLoginForm(<LoginForm />);

      // Fill form first
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      // Wait for the form submission to complete and network error logging to happen
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      expect(logger.error).toHaveBeenCalledWith(
        "❌ Login network error:",
        expect.any(Error),
      );
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

      // Fill form to pass validation
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

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
