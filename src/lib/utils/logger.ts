/**
 * Simple logger utility for development and production
 * In production, no console logging occurs to avoid production noise
 */

type LogLevel = "debug" | "info" | "warn" | "error";

class Logger {
  private isDevelopment =
    import.meta.env.MODE === "development" || !!import.meta.env.VITEST;

  private log(level: LogLevel, message: string, ...args: unknown[]) {
    // Early return in production to avoid any console references
    if (!this.isDevelopment) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] ${level.toUpperCase()}:`;

    switch (level) {
      case "debug":
        globalThis.console.debug(prefix, message, ...args);
        break;
      case "info":
        globalThis.console.info(prefix, message, ...args);
        break;
      case "warn":
        globalThis.console.warn(prefix, message, ...args);
        break;
      case "error":
        globalThis.console.error(prefix, message, ...args);
        break;
    }
  }

  debug(message: string, ...args: unknown[]) {
    this.log("debug", message, ...args);
  }

  info(message: string, ...args: unknown[]) {
    this.log("info", message, ...args);
  }

  warn(message: string, ...args: unknown[]) {
    this.log("warn", message, ...args);
  }

  error(message: string, ...args: unknown[]) {
    this.log("error", message, ...args);
  }
}

export const logger = new Logger();
