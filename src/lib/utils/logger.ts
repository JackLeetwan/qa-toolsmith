/**
 * Simple logger utility for development and production
 * In production, only error logs are shown
 */

type LogLevel = "debug" | "info" | "warn" | "error";

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private log(level: LogLevel, message: string, ...args: unknown[]) {
    if (!this.isDevelopment && level !== "error") {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] ${level.toUpperCase()}:`;

    switch (level) {
      case "debug":
        // eslint-disable-next-line no-console
        console.debug(prefix, message, ...args);
        break;
      case "info":
        // eslint-disable-next-line no-console
        console.info(prefix, message, ...args);
        break;
      case "warn":
        // eslint-disable-next-line no-console
        console.warn(prefix, message, ...args);
        break;
      case "error":
        // eslint-disable-next-line no-console
        console.error(prefix, message, ...args);
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
