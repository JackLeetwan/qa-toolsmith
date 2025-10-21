import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "@/lib/utils/logger";

describe("Logger", () => {
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should log debug messages in development/test environments", () => {
    logger.debug("Debug message");
    expect(consoleDebugSpy).toHaveBeenCalled();
  });

  it("should log info messages in development/test environments", () => {
    logger.info("Info message");
    expect(consoleInfoSpy).toHaveBeenCalled();
  });

  it("should log warn messages in development/test environments", () => {
    logger.warn("Warning message");
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it("should log error messages in development/test environments", () => {
    logger.error("Error message");
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("should include timestamp and log level in output", () => {
    logger.info("Test message");
    const calls = consoleInfoSpy.mock.calls;
    expect(calls[0][0]).toMatch(/\[\d{4}-\d{2}-\d{2}T[\d:.Z]+\] INFO:/);
  });

  it("should pass additional arguments to console methods", () => {
    logger.debug("Message", { data: "test" }, 42);
    expect(consoleDebugSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T[\d:.Z]+\] DEBUG:/),
      "Message",
      { data: "test" },
      42,
    );
  });

  it("should detect VITEST environment variable", () => {
    expect(process.env.VITEST).toBe("1");
  });
});
