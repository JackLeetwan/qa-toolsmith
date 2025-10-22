import "@testing-library/jest-dom";
import { vi, afterEach, beforeAll } from "vitest";

// ============================================================================
// GLOBAL TEST SETUP - TEST ISOLATION & MOCK MANAGEMENT
// ============================================================================

// Mock environment variables globally
Object.defineProperty(import.meta, "env", {
  value: {
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SERVICE_KEY: "test-service-key",
  },
  writable: false,
  configurable: true,
});

// ============================================================================
// SUPABASE MOCKS - Set up before tests run
// ============================================================================

export const mockSignInWithPassword = vi.fn();
export const mockCreateClient = vi.fn();

const mockSupabaseClient = {
  auth: {
    signInWithPassword: mockSignInWithPassword,
  },
};

mockCreateClient.mockReturnValue(mockSupabaseClient);

vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

// ============================================================================
// ASTRO MIDDLEWARE MOCK
// ============================================================================

vi.mock("astro:middleware", () => ({
  defineMiddleware: vi.fn((fn) => fn),
}));

// ============================================================================
// GLOBAL WINDOW & NAVIGATOR - ONE-TIME SETUP IN beforeAll
// ============================================================================

// Note: Original values are not stored because they are generally unavailable
// in the jsdom/vitest test environment. If future tests need restoration,
// they should use vi.spyOn + vi.restoreAllMocks() instead.

beforeAll(() => {
  // Initialize navigator if needed
  if (!global.navigator) {
    global.navigator = {} as Navigator;
  }

  // Initialize window if needed
  if (!global.window) {
    (global as Record<string, unknown>).window = {} as Record<string, unknown>;
  }

  if (!global.window.navigator) {
    global.window.navigator = global.navigator;
  }

  // Set up mock clipboard API
  setupClipboardMock();

  // Set up mock fetch
  setupFetchMock();

  // Set up mock URLSearchParams
  setupURLSearchParamsMock();

  // Set up mock location
  setupLocationMock();
});

// ============================================================================
// CLIPBOARD MOCK - Isolated with proper types
// ============================================================================

export const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
  readText: vi.fn().mockResolvedValue(""),
};

function setupClipboardMock() {
  try {
    Object.defineProperty(global.navigator, "clipboard", {
      value: mockClipboard,
      writable: true,
      configurable: true,
    });
  } catch {
    // If defineProperty fails, try setting directly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global.navigator as any).clipboard = mockClipboard;
  }

  try {
    if (global.window.navigator) {
      Object.defineProperty(global.window.navigator, "clipboard", {
        value: mockClipboard,
        writable: true,
        configurable: true,
      });
    }
  } catch {
    // If defineProperty fails, try setting directly
    if (global.window.navigator) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global.window.navigator as any).clipboard = mockClipboard;
    }
  }
}

// ============================================================================
// FETCH MOCK - Isolated with proper types
// ============================================================================

// Create a proper type that includes both fetch signature and Vitest mock methods
type MockedFetch = ReturnType<typeof vi.fn> & typeof fetch;

export const mockFetch = vi.fn() as unknown as MockedFetch;

function setupFetchMock() {
  global.fetch = mockFetch as unknown as typeof fetch;
}

// ============================================================================
// URLSearchParams MOCK - Isolated with proper types
// ============================================================================

export let mockNextValue: string | null = "/dashboard";

// Create a proper constructor mock for URLSearchParams
class MockURLSearchParams {
  private nextValue: string | null = null;

  constructor(input?: string | URLSearchParams | Record<string, string>) {
    // Handle different input types
    if (typeof input === "string" && input.length > 0) {
      // Parse string for next parameter
      const match = input.match(/[?&]next=([^&]*)/);
      if (match) {
        this.nextValue = decodeURIComponent(match[1]);
      }
    } else if (!input) {
      // Use the global mockNextValue if no input provided
      this.nextValue = mockNextValue;
    }
  }

  get = vi.fn((key: string) => {
    if (key === "next") {
      return this.nextValue;
    }
    return null;
  });

  has = vi.fn((key: string) => key === "next" && this.nextValue !== null);
  set = vi.fn();
  delete = vi.fn();
  toString = vi.fn(() => "");
  entries = vi.fn(() => []);
  keys = vi.fn(() => []);
  values = vi.fn(() => []);
  forEach = vi.fn();
}

export const mockURLSearchParams = MockURLSearchParams;

function setupURLSearchParamsMock() {
  global.URLSearchParams =
    mockURLSearchParams as unknown as typeof URLSearchParams;
}

// ============================================================================
// WINDOW.LOCATION MOCK - Isolated with proper types
// ============================================================================

interface MockLocation extends Partial<Location> {
  search: string;
  href: string;
  reload: ReturnType<typeof vi.fn>;
}

export let mockLocation: MockLocation;

export function updateMockLocation(nextValue: string | null) {
  mockNextValue = nextValue;

  // Update the mock location with the new search string
  mockLocation = {
    search: nextValue ? `?next=${nextValue}` : "",
    href: nextValue ? `?next=${nextValue}` : "",
    reload: vi.fn(),
  };

  try {
    // Try to delete existing location property
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).window?.location;
  } catch {
    // Ignore if can't delete
  }

  try {
    Object.defineProperty(global.window, "location", {
      value: mockLocation,
      writable: true,
      configurable: true,
    });
  } catch {
    // Fallback: set directly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global.window as any).location = mockLocation;
  }
}

function setupLocationMock() {
  updateMockLocation("/dashboard");
}

// ============================================================================
// COMPLETE TEST CLEANUP - Run after EACH test
// ============================================================================

afterEach(() => {
  // Clear all mock call histories and queued responses (.mockResolvedValueOnce, etc)
  // This does NOT remove the mock, just resets its state
  vi.clearAllMocks();

  // Reset the mockNextValue to default state
  mockNextValue = "/dashboard";

  // Clear the redirectedTo tracker if it exists (for LoginForm tests)
  // This is used by LoginForm test suite to track redirects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((global as any).__redirectedTo !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).__redirectedTo = "";
  }
});

// ============================================================================
// CONSOLE UTILITIES - For clean test output
// ============================================================================

export const createConsoleSpy = () => {
  const originalConsole = global.console;
  const noop = () => {
    // No-op function for console mocking
  };

  const mockConsole = {
    log: vi.fn(noop),
    warn: vi.fn(noop),
    error: vi.fn(noop),
    info: vi.fn(noop),
    debug: vi.fn(noop),
    trace: vi.fn(noop),
    table: vi.fn(noop),
    group: vi.fn(noop),
    groupCollapsed: vi.fn(noop),
    groupEnd: vi.fn(noop),
    time: vi.fn(noop),
    timeEnd: vi.fn(noop),
    timeLog: vi.fn(noop),
  };

  const spyConsole = (consoleObj: typeof mockConsole) => {
    Object.keys(consoleObj).forEach((key) => {
      const consoleKey = key as keyof typeof originalConsole;
      const mockFn = consoleObj[key as keyof typeof consoleObj];
      const spy = vi.spyOn(originalConsole, consoleKey) as {
        mockImplementation: (fn: () => void) => void;
      };
      spy.mockImplementation(mockFn as () => void);
    });
  };

  const restoreConsole = () => {
    vi.restoreAllMocks();
  };

  return {
    mockConsole,
    spyConsole: () => spyConsole(mockConsole),
    restoreConsole,
  };
};

// ============================================================================
// PLAYWRIGHT WAITING UTILITIES
// ============================================================================

export const waitHelpers = {
  /**
   * Wait for element to be visible and stable
   * Usage: await page.locator(selector).waitFor({ state: 'visible' });
   * See E2E README for complete waiting strategies
   */
  waitForStableElement: (locator: unknown) =>
    (
      locator as {
        waitFor: (options: { state: string; timeout: number }) => Promise<void>;
      }
    ).waitFor({ state: "visible", timeout: 10000 }),

  /**
   * Wait for network requests to complete
   * Usage: await page.waitForLoadState('networkidle');
   * See E2E README for network waiting patterns
   */
  waitForNetworkIdle: (page: unknown) =>
    (
      page as {
        waitForLoadState: (
          state: string,
          options: { timeout: number },
        ) => Promise<void>;
      }
    ).waitForLoadState("networkidle", { timeout: 10000 }),
};
