import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, cleanup } from "@testing-library/react";
import { render } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import KbEntriesList from "../../../components/kb/KbEntriesList";
import { useKbEntries } from "../../../lib/hooks/useKbEntries";
import type { KBEntryDTO } from "../../../types/types";

// Mock useKbEntries hook
vi.mock("../../../lib/hooks/useKbEntries");

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockUseKbEntries = vi.mocked(useKbEntries);

describe("KbEntriesList", () => {
  const mockEntries: KBEntryDTO[] = [
    {
      id: "1",
      user_id: "user-1",
      title: "Entry 1",
      url_original: "https://example.com/1",
      url_canonical: "https://example.com/1",
      tags: ["tag1"],
      is_public: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "2",
      user_id: "user-2",
      title: "Entry 2",
      url_original: "https://example.com/2",
      url_canonical: "https://example.com/2",
      tags: ["tag2", "tag3"],
      is_public: false,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseKbEntries.mockReturnValue({
      entries: [],
      nextCursor: undefined,
      isLoading: false,
      error: null,
      fetchEntries: vi.fn(),
      createEntry: vi.fn(),
      updateEntry: vi.fn(),
      deleteEntry: vi.fn(),
      clearError: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe("rendering", () => {
    it("should render list of entries", () => {
      mockUseKbEntries.mockReturnValue({
        entries: mockEntries,
        nextCursor: undefined,
        isLoading: false,
        error: null,
        fetchEntries: vi.fn(),
        createEntry: vi.fn(),
        updateEntry: vi.fn(),
        deleteEntry: vi.fn(),
        clearError: vi.fn(),
      });

      render(<KbEntriesList user={null} />);

      expect(screen.getByText("Entry 1")).toBeInTheDocument();
      expect(screen.getByText("Entry 2")).toBeInTheDocument();
      expect(screen.getByText("tag1")).toBeInTheDocument();
      expect(screen.getByText("tag2")).toBeInTheDocument();
      expect(screen.getByText("tag3")).toBeInTheDocument();
    });

    it("should display loading state when isLoading is true", () => {
      mockUseKbEntries.mockReturnValue({
        entries: [],
        nextCursor: undefined,
        isLoading: true,
        error: null,
        fetchEntries: vi.fn(),
        createEntry: vi.fn(),
        updateEntry: vi.fn(),
        deleteEntry: vi.fn(),
        clearError: vi.fn(),
      });

      render(<KbEntriesList user={null} />);

      // Check for skeleton loaders (3 cards)
      const skeletonCards = screen
        .getAllByText(/\.\.\./)
        .filter((el) => el.closest(".animate-pulse"));
      expect(skeletonCards.length).toBeGreaterThan(0);
    });

    it("should display error message when error exists", () => {
      mockUseKbEntries.mockReturnValue({
        entries: [],
        nextCursor: undefined,
        isLoading: false,
        error: { code: "FETCH_ERROR", message: "Failed to load entries" },
        fetchEntries: vi.fn(),
        createEntry: vi.fn(),
        updateEntry: vi.fn(),
        deleteEntry: vi.fn(),
        clearError: vi.fn(),
      });

      render(<KbEntriesList user={null} />);

      expect(screen.getByText("Failed to load entries")).toBeInTheDocument();
      expect(screen.getByText("Spróbuj ponownie")).toBeInTheDocument();
    });

    it("should display empty state when no entries", () => {
      mockUseKbEntries.mockReturnValue({
        entries: [],
        nextCursor: undefined,
        isLoading: false,
        error: null,
        fetchEntries: vi.fn(),
        createEntry: vi.fn(),
        updateEntry: vi.fn(),
        deleteEntry: vi.fn(),
        clearError: vi.fn(),
      });

      render(<KbEntriesList user={null} />);

      expect(
        screen.getByText("Brak wpisów do wyświetlenia"),
      ).toBeInTheDocument();
    });

    it("should display CTA to login for unauthenticated users", () => {
      mockUseKbEntries.mockReturnValue({
        entries: [],
        nextCursor: undefined,
        isLoading: false,
        error: null,
        fetchEntries: vi.fn(),
        createEntry: vi.fn(),
        updateEntry: vi.fn(),
        deleteEntry: vi.fn(),
        clearError: vi.fn(),
      });

      render(<KbEntriesList user={null} />);

      const loginLink = screen.getByRole("link", {
        name: /zaloguj się aby dodać własne wpisy/i,
      });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute("href", "/auth/login?next=/kb");
    });
  });

  describe("interactions", () => {
    it("should show create form when 'Dodaj wpis' button is clicked for authenticated user", async () => {
      mockUseKbEntries.mockReturnValue({
        entries: mockEntries,
        nextCursor: undefined,
        isLoading: false,
        error: null,
        fetchEntries: vi.fn(),
        createEntry: vi.fn(),
        updateEntry: vi.fn(),
        deleteEntry: vi.fn(),
        clearError: vi.fn(),
      });

      const user = userEvent.setup();
      render(<KbEntriesList user={{ id: "user-1" }} />);

      const createButton = screen.getByRole("button", { name: /dodaj wpis/i });
      await user.click(createButton);

      expect(screen.getByText("Dodaj nowy wpis")).toBeInTheDocument();
      expect(screen.getByLabelText(/tytuł/i)).toBeInTheDocument();
    });

    it("should show edit form when 'Edytuj' button is clicked for own entry", async () => {
      const mockFetchEntries = vi.fn();
      mockUseKbEntries.mockReturnValue({
        entries: mockEntries,
        nextCursor: undefined,
        isLoading: false,
        error: null,
        fetchEntries: mockFetchEntries,
        createEntry: vi.fn(),
        updateEntry: vi.fn(),
        deleteEntry: vi.fn(),
        clearError: vi.fn(),
      });

      const user = userEvent.setup();
      render(<KbEntriesList user={{ id: "user-1" }} />);

      const editButtons = screen.getAllByRole("button", { name: /edytuj/i });
      await user.click(editButtons[0]); // First entry belongs to user-1

      expect(screen.getByText("Edytuj wpis")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Entry 1")).toBeInTheDocument();
    });

    it("should not show edit button for other users' entries", () => {
      mockUseKbEntries.mockReturnValue({
        entries: mockEntries,
        nextCursor: undefined,
        isLoading: false,
        error: null,
        fetchEntries: vi.fn(),
        createEntry: vi.fn(),
        updateEntry: vi.fn(),
        deleteEntry: vi.fn(),
        clearError: vi.fn(),
      });

      render(<KbEntriesList user={{ id: "user-1" }} />);

      // Entry 2 belongs to user-2, so edit button should not be visible for user-1
      const editButtons = screen.getAllByRole("button", { name: /edytuj/i });
      expect(editButtons.length).toBe(1); // Only one edit button for own entry
    });

    it("should open AlertDialog when 'Usuń' button is clicked", async () => {
      const user = userEvent.setup();
      mockUseKbEntries.mockReturnValue({
        entries: mockEntries,
        nextCursor: undefined,
        isLoading: false,
        error: null,
        fetchEntries: vi.fn(),
        createEntry: vi.fn(),
        updateEntry: vi.fn(),
        deleteEntry: vi.fn(),
        clearError: vi.fn(),
      });

      render(<KbEntriesList user={{ id: "user-1" }} />);

      const deleteButtons = screen.getAllByRole("button", { name: /usuń/i });
      await user.click(deleteButtons[0]);

      expect(
        screen.getByText(/Czy na pewno chcesz usunąć wpis "Entry 1"\?/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Tej akcji nie można cofnąć/i),
      ).toBeInTheDocument();
    });

    it("should call fetchEntries with nextCursor when 'Załaduj więcej' is clicked", async () => {
      const mockFetchEntries = vi.fn();
      mockUseKbEntries.mockReturnValue({
        entries: mockEntries,
        nextCursor: "2024-01-01T00:00:00Z,2",
        isLoading: false,
        error: null,
        fetchEntries: mockFetchEntries,
        createEntry: vi.fn(),
        updateEntry: vi.fn(),
        deleteEntry: vi.fn(),
        clearError: vi.fn(),
      });

      const user = userEvent.setup();
      render(<KbEntriesList user={null} />);

      const loadMoreButton = screen.getByRole("button", {
        name: /załaduj więcej/i,
      });
      await user.click(loadMoreButton);

      expect(mockFetchEntries).toHaveBeenCalledWith({
        after: "2024-01-01T00:00:00Z,2",
      });
    });

    it("should hide 'Załaduj więcej' button when there is no nextCursor", () => {
      mockUseKbEntries.mockReturnValue({
        entries: mockEntries,
        nextCursor: undefined,
        isLoading: false,
        error: null,
        fetchEntries: vi.fn(),
        createEntry: vi.fn(),
        updateEntry: vi.fn(),
        deleteEntry: vi.fn(),
        clearError: vi.fn(),
      });

      render(<KbEntriesList user={null} />);

      expect(
        screen.queryByRole("button", { name: /załaduj więcej/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("form interactions", () => {
    it("should call createEntry when form is submitted", async () => {
      const mockCreateEntry = vi.fn().mockResolvedValue(mockEntries[0]);
      mockUseKbEntries.mockReturnValue({
        entries: mockEntries,
        nextCursor: undefined,
        isLoading: false,
        error: null,
        fetchEntries: vi.fn(),
        createEntry: mockCreateEntry,
        updateEntry: vi.fn(),
        deleteEntry: vi.fn(),
        clearError: vi.fn(),
      });

      const user = userEvent.setup();
      render(<KbEntriesList user={{ id: "user-1" }} />);

      const createButton = screen.getByRole("button", { name: /dodaj wpis/i });
      await user.click(createButton);

      const titleInput = screen.getByLabelText(/tytuł/i);
      const urlInput = screen.getByLabelText(/url/i);
      const submitButton = screen.getByRole("button", { name: /utwórz/i });

      await user.type(titleInput, "New Entry");
      await user.type(urlInput, "https://example.com/new");

      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateEntry).toHaveBeenCalled();
      });
    });

    it("should call updateEntry when edit form is submitted", async () => {
      const mockUpdateEntry = vi.fn().mockResolvedValue({
        ...mockEntries[0],
        title: "Updated Entry",
      });
      mockUseKbEntries.mockReturnValue({
        entries: mockEntries,
        nextCursor: undefined,
        isLoading: false,
        error: null,
        fetchEntries: vi.fn(),
        createEntry: vi.fn(),
        updateEntry: mockUpdateEntry,
        deleteEntry: vi.fn(),
        clearError: vi.fn(),
      });

      const user = userEvent.setup();
      render(<KbEntriesList user={{ id: "user-1" }} />);

      const editButton = screen.getByRole("button", { name: /edytuj/i });
      await user.click(editButton);

      const titleInput = screen.getByDisplayValue("Entry 1");
      await user.clear(titleInput);
      await user.type(titleInput, "Updated Entry");

      const submitButton = screen.getByRole("button", { name: /zaktualizuj/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateEntry).toHaveBeenCalledWith(
          "1",
          expect.objectContaining({
            title: "Updated Entry",
          }),
        );
      });
    });

    it("should call deleteEntry when delete is confirmed", async () => {
      const mockDeleteEntry = vi.fn().mockResolvedValue(true);
      mockUseKbEntries.mockReturnValue({
        entries: mockEntries,
        nextCursor: undefined,
        isLoading: false,
        error: null,
        fetchEntries: vi.fn(),
        createEntry: vi.fn(),
        updateEntry: vi.fn(),
        deleteEntry: mockDeleteEntry,
        clearError: vi.fn(),
      });

      const user = userEvent.setup();
      render(<KbEntriesList user={{ id: "user-1" }} />);

      const deleteButton = screen.getByRole("button", { name: /usuń/i });
      await user.click(deleteButton);

      const confirmButton = await screen.findByRole("button", {
        name: /usuń/i,
      });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteEntry).toHaveBeenCalledWith("1");
      });
    });
  });

  describe("user-specific features", () => {
    it("should show 'Dodaj wpis' button only for authenticated users", () => {
      mockUseKbEntries.mockReturnValue({
        entries: mockEntries,
        nextCursor: undefined,
        isLoading: false,
        error: null,
        fetchEntries: vi.fn(),
        createEntry: vi.fn(),
        updateEntry: vi.fn(),
        deleteEntry: vi.fn(),
        clearError: vi.fn(),
      });

      const { rerender } = render(<KbEntriesList user={null} />);
      expect(
        screen.queryByRole("button", { name: /dodaj wpis/i }),
      ).not.toBeInTheDocument();

      rerender(<KbEntriesList user={{ id: "user-1" }} />);
      expect(
        screen.getByRole("button", { name: /dodaj wpis/i }),
      ).toBeInTheDocument();
    });

    it("should show edit/delete buttons only for own entries", () => {
      mockUseKbEntries.mockReturnValue({
        entries: mockEntries,
        nextCursor: undefined,
        isLoading: false,
        error: null,
        fetchEntries: vi.fn(),
        createEntry: vi.fn(),
        updateEntry: vi.fn(),
        deleteEntry: vi.fn(),
        clearError: vi.fn(),
      });

      render(<KbEntriesList user={{ id: "user-1" }} />);

      // Entry 1 belongs to user-1, Entry 2 belongs to user-2
      const editButtons = screen.getAllByRole("button", { name: /edytuj/i });
      const deleteButtons = screen.getAllByRole("button", { name: /usuń/i });

      // Only one edit/delete button (for own entry)
      expect(editButtons.length).toBe(1);
      expect(deleteButtons.length).toBe(1);
    });
  });
});
