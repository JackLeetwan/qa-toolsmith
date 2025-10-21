## Logger Test Utilities

### Problem

The logger utility adds ISO timestamp prefixes to all console messages in DEV mode (test environment):
- Pattern: `[2025-10-21T13:40:21.202Z] ERROR:` 
- This causes test failures when console.error spies compare exact message strings

### Solution

The `src/test/logger-test-utils.ts` module provides helpers to strip logger prefixes from console spy assertions, allowing tests to verify message content without timestamp dependencies.

### Key Implementation Detail

The logger calls console methods as:
```typescript
console.error(prefixWithTimestamp, message, ...additionalArgs)
// Example: console.error("[2025-10-21T13:40:21.202Z] ERROR:", "[AuditError] Failed:", error)
```

So spy.mock.calls receive:
```typescript
[
  "[2025-10-21T13:40:21.202Z] ERROR:",  // Prefix to strip
  "[AuditError] Failed:",                // Actual message
  Error { message: "..." }               // Additional args
]
```

### API

#### `wrapConsoleSpy(spy)`
Wraps a console spy and provides helper methods:

```typescript
const spy = vi.spyOn(console, "error").mockImplementation(vi.fn());
const wrapper = wrapConsoleSpy(spy);

// Check if called with specific message (ignores prefix)
expect(wrapper.wasCalledWith(
  "[AuditError] Failed:",
  expect.any(Error)
)).toBe(true);

// Get all calls with prefix stripped
const strippedCalls = wrapper.getCallsStripped();

// Get last call with prefix stripped
const lastCall = wrapper.getLastCall();
```

#### `stripLoggerPrefix(message)`
Utility function to strip timestamp prefix from a string:

```typescript
stripLoggerPrefix("[2025-10-21T13:40:21.202Z] ERROR: My message")
// Returns: "My message"
```

### Usage Examples

#### In audit.helper.test.ts
```typescript
import { wrapConsoleSpy } from "../../test/logger-test-utils";

it("should log errors", async () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(vi.fn());
  
  // ... code that logs via logger.error(...) ...
  
  const wrapper = wrapConsoleSpy(errorSpy);
  expect(wrapper.wasCalledWith(
    "[AuditError] Failed to record login attempt:",
    expect.any(Error)
  )).toBe(true);
});
```

### Supported Matchers

The `wasCalledWith` method supports Vitest's `expect.any()` for flexible assertion matching:

```typescript
// Match any Error instance
expect(wrapper.wasCalledWith("Message", expect.any(Error))).toBe(true);

// Match exact value
expect(wrapper.wasCalledWith("Message", specificError)).toBe(true);

// Match no additional args
expect(wrapper.wasCalledWith("Message")).toBe(true);
```

### Files Modified

1. **Created**: `src/test/logger-test-utils.ts` - New test utilities
2. **Updated**: `src/lib/helpers/audit.helper.test.ts` - Uses wrapConsoleSpy
3. **Updated**: `src/lib/hooks/useClipboard.test.ts` - Uses wrapConsoleSpy  
4. **Updated**: `src/lib/hooks/useLocalHistory.test.ts` - Uses wrapConsoleSpy

### Test Results

All 98 tests now pass across the three fixed test files:
- ✅ audit.helper.test.ts (27 tests)
- ✅ useClipboard.test.ts (32 tests)
- ✅ useLocalHistory.test.ts (39 tests)

### Design Principles

- **No runtime changes**: Logger implementation unchanged
- **No global ESLint disables**: All code follows linting rules
- **Test isolation**: Each test manages its own spy setup/teardown
- **Deterministic**: No snapshots with timestamps; assertions on message content
- **Type-safe**: Full TypeScript support with proper typing
