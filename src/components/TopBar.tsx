import React, { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { User, LogOut, Settings, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/utils/logger";

interface User {
  id: string;
  email: string;
  role: "admin" | "user";
}

interface TopBarProps {
  user?: User | null;
  isLoading?: boolean;
  onLogout?: () => void;
}

export default function TopBar({ user, isLoading = false, onLogout }: TopBarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest("[data-user-menu]")) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsUserMenuOpen(false);

    if (onLogout) {
      onLogout();
      return;
    }

    // Default API logout
    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.success("Wylogowano pomyślnie");
        // Redirect to home page
        window.location.href = "/";
      } else {
        const result = await response.json();
        toast.error(result.message || "Wystąpił błąd podczas wylogowania");
      }
    } catch (error) {
      logger.error("Logout error:", error);
      toast.error("Wystąpił błąd podczas wylogowania");
    }
  };

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <a href="/" className="text-xl font-bold text-primary hover:text-primary/80 transition-colors">
              QA Toolsmith
            </a>
            <nav aria-label="Main navigation">
              <ul className="flex items-center space-x-6">
                <li>
                  <a
                    href="/generators"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Generators
                  </a>
                </li>
                <li>
                  <a
                    href="/knowledge-base"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Knowledge Base
                  </a>
                </li>
                {user && (
                  <>
                    <li>
                      <a
                        href="/templates"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Templates
                      </a>
                    </li>
                    <li>
                      <a
                        href="/charters"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Charters
                      </a>
                    </li>
                    {user.role === "admin" && (
                      <li>
                        <a
                          href="/admin"
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Admin
                        </a>
                      </li>
                    )}
                  </>
                )}
              </ul>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">Ładowanie...</span>
              </div>
            ) : user ? (
              // User menu
              <div className="relative" data-user-menu>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-muted transition-colors"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-foreground">{user.email}</div>
                      <div className="text-xs text-muted-foreground capitalize">{user.role}</div>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-background border rounded-md shadow-lg z-50">
                    <div className="py-1">
                      <a
                        href="/profile"
                        className="flex items-center px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Settings className="mr-3 h-4 w-4" />
                        Profil
                      </a>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        Wyloguj
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Auth buttons
              <div className="flex items-center space-x-2">
                <a href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Zaloguj
                </a>
                <a
                  href="/auth/register"
                  className="text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
                >
                  Zarejestruj
                </a>
              </div>
            )}

            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
