/**
 * Logger Test Utilities
 *
 * Provides helpers to work with logger-prefixed console messages in tests.
 * The logger adds timestamps like "[ISO] LEVEL:" to all console calls in DEV mode.
 * These utilities help strip that prefix for clean assertions.
 *
 * Note: The logger calls console methods as: console.error(prefix, message, ...args)
 * So spy.mock.calls will be: [[prefix_with_timestamp, actual_message, arg1, arg2, ...]]
 */

import { vi, type MockInstance } from "vitest";

/**
 * ISO timestamp + level prefix pattern from logger
 * Example: "[2025-10-21T13:40:21.202Z] ERROR:"
 */
const LOGGER_PREFIX_PATTERN =
  /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]\s\w+:\s*/;

/**
 * Strips the logger prefix from a console message string
 * @example
 * stripLoggerPrefix("[2025-10-21T13:40:21.202Z] ERROR: My message")
 * // Returns "My message"
 */
export function stripLoggerPrefix(message: string): string {
  return message.replace(LOGGER_PREFIX_PATTERN, "");
}

/**
 * Check if a value matches an expected matcher object (like expect.any())
 */
function matchesExpectMatcher(actual: unknown, expected: unknown): boolean {
  // Handle expect.any(Constructor)
  if (
    expected &&
    typeof expected === "object" &&
    "$$typeof" in expected &&
    "asymmetricMatch" in expected
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (expected as any).asymmetricMatch(actual);
  }

  // Direct equality check for other cases
  return actual === expected;
}

/**
 * Wraps a console spy to capture calls and provide helper methods
 * This is useful for tests that need to verify console calls while ignoring timestamp prefix
 *
 * The logger calls console.error as: console.error(prefixWithTimestamp, message, ...args)
 * So we need to skip the first argument (which is the prefix) and work with the rest.
 *
 * @example
 * const spy = vi.spyOn(console, "error");
 * const wrapper = wrapConsoleSpy(spy);
 * // ... call code that logs via logger ...
 * expect(wrapper.wasCalledWith("My message", Error)).toBe(true);
 */
export function wrapConsoleSpy(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spy: MockInstance<any>,
) {
  return {
    /**
     * Get all calls with the logger prefix stripped from the first argument
     * Returns calls without the timestamp prefix
     */
    getCallsStripped: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return spy.mock.calls.map((call: any[]) => {
        if (call.length === 0) return call;
        // Skip the first arg (which is the prefixed timestamp from logger)
        // and return the rest (actual message and additional args)
        const [prefixArg, ...rest] = call;
        if (
          typeof prefixArg === "string" &&
          LOGGER_PREFIX_PATTERN.test(prefixArg)
        ) {
          return rest;
        }
        return call;
      });
    },

    /**
     * Get the last call with logger prefix stripped
     */
    getLastCall: () => {
      const calls = spy.mock.calls;
      if (calls.length === 0) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lastCall = calls[calls.length - 1] as any[];
      if (lastCall.length === 0) return lastCall;
      const [prefixArg, ...rest] = lastCall;
      if (
        typeof prefixArg === "string" &&
        LOGGER_PREFIX_PATTERN.test(prefixArg)
      ) {
        return rest;
      }
      return lastCall;
    },

    /**
     * Check if spy was called with a specific message (ignoring logger prefix)
     * Supports expect.any() style matchers for additional arguments
     *
     * When logger calls: logger.error("msg", err)
     * The spy receives: [timestampPrefix, "msg", err]
     * We check if rest args match: ["msg", err]
     */
    wasCalledWith: (
      expectedMessage: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...otherArgs: any[]
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return spy.mock.calls.some((call: any[]) => {
        if (call.length === 0) return false;

        const [prefixArg, ...restArgs] = call;

        // Check if first arg looks like a logger prefix - if so, skip it
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let messageArgs: any[];
        if (
          typeof prefixArg === "string" &&
          LOGGER_PREFIX_PATTERN.test(prefixArg)
        ) {
          messageArgs = restArgs;
        } else {
          messageArgs = call;
        }

        // First arg in messageArgs should be the actual message
        if (messageArgs.length === 0) return false;
        const [actualMessage, ...actualRest] = messageArgs;

        if (actualMessage !== expectedMessage) return false;

        // If no additional args expected, message should be the last
        if (otherArgs.length === 0) return actualRest.length === 0;

        // Compare additional arguments
        if (actualRest.length !== otherArgs.length) return false;

        return otherArgs.every((expectedArg, idx) => {
          const actualArg = actualRest[idx];
          return matchesExpectMatcher(actualArg, expectedArg);
        });
      });
    },

    /**
     * Get underlying spy object for direct access
     */
    spy: () => spy,
  };
}

/**
 * Creates a console error spy that automatically handles logger prefix stripping
 * This is a convenience wrapper for the common case of spying on console.error
 *
 * @example
 * const errorSpy = createConsoleErrorSpy();
 * // ... call code that logs ...
 * expect(errorSpy.wasCalledWith("My error message", expect.any(Error))).toBe(true);
 */
export function createConsoleErrorSpy() {
  const spy = vi.spyOn(console, "error").mockImplementation(vi.fn());
  return wrapConsoleSpy(spy);
}

/**
 * Assertion helper to verify console error was called with specific message
 * regardless of logger prefix timestamp
 *
 * @example
 * const spy = vi.spyOn(console, "error");
 * // ... call code that logs ...
 * expectConsoleErrorCalledWith(spy, "[AuditError] Failed:", expect.any(Error));
 */
export function expectConsoleErrorCalledWith(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spy: MockInstance<any>,
  expectedMessage: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...otherArgs: any[]
) {
  const wrapper = wrapConsoleSpy(spy);
  const wasCalled = wrapper.wasCalledWith(expectedMessage, ...otherArgs);

  if (!wasCalled) {
    const actualCalls = wrapper.getCallsStripped();
    throw new Error(
      `Expected console.error to be called with [${expectedMessage}, ...], ` +
        `but got: ${JSON.stringify(actualCalls, null, 2)}`,
    );
  }
}
