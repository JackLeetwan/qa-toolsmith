import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { logger } from "@/lib/utils/logger";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        logger.debug("🔍 AuthGuard: Checking authentication status...");

        // Check if we're on the client side
        if (typeof window === "undefined") {
          logger.debug("🔍 AuthGuard: Server-side, skipping check");
          setIsChecking(false);
          return;
        }

        // Check for existing session by making a simple request
        const response = await fetch("/api/health", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          // Try to access a protected endpoint to check auth
          const authResponse = await fetch("/api/auth/check", {
            method: "GET",
            credentials: "include",
          });

          if (authResponse.ok) {
            logger.debug("✅ AuthGuard: User is authenticated");
            setIsAuthenticated(true);
          } else {
            logger.debug("❌ AuthGuard: User is not authenticated");
            setIsAuthenticated(false);
          }
        } else {
          logger.debug("❌ AuthGuard: Health check failed");
          setIsAuthenticated(false);
        }
      } catch (error) {
        logger.error("❌ AuthGuard: Error checking authentication:", error);
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, []);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">
            Sprawdzanie autoryzacji...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && fallback) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
