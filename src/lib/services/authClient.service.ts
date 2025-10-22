import { logger } from "@/lib/utils/logger";
import type { LoginFormData } from "@/components/auth/hooks/useLoginForm";
import type { LoginResponse } from "@/types/types";

/**
 * Client-side authentication service for making API calls to auth endpoints.
 * Handles login, logout, and related authentication operations from the browser.
 */
export const AuthClientService = {
  /**
   * Login with email and password via API endpoint.
   * @param data - Login credentials
   * @returns Promise with login response containing access token and profile
   * @throws Error with user-friendly message on failure
   */
  async login(data: LoginFormData): Promise<LoginResponse> {
    logger.debug("📡 Sending login request to /api/auth/signin");

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      logger.debug("📥 Login response:", {
        status: response.status,
        ok: response.ok,
        result,
        hasMessage: "message" in result,
        messageValue: result.message,
      });

      if (!response.ok) {
        logger.error("❌ Login failed:", result);
        const errorMessage =
          result.message || "Wystąpił błąd podczas logowania";
        logger.debug("🔍 Error message being thrown:", errorMessage);
        return Promise.reject(new Error(errorMessage));
      }

      return result as LoginResponse;
    } catch (error) {
      logger.error("❌ Login network error:", error);
      throw new Error("Wystąpił błąd podczas logowania");
    }
  },

  /**
   * Logout the current user.
   * @returns Promise that resolves when logout is complete
   * @throws Error on logout failure
   */
  async logout(): Promise<void> {
    logger.debug("📡 Sending logout request to /api/auth/signout");

    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const result = await response.json();
        logger.error("❌ Logout failed:", result);
        throw new Error(
          result.message || "Wystąpił błąd podczas wylogowywania",
        );
      }

      logger.debug("✅ Logout successful");
    } catch (error) {
      logger.error("❌ Logout network error:", error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Wystąpił błąd podczas wylogowywania");
    }
  },
};
