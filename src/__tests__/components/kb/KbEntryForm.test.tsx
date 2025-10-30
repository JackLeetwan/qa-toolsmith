import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, cleanup } from "@testing-library/react";
import { render } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import KbEntryForm from "../../../components/kb/KbEntryForm";
import type { KBEntryDTO } from "../../../types/types";

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("KbEntryForm", () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("validation", () => {
    it("should display error when title is empty", async () => {
      const user = userEvent.setup();
      render(
        <KbEntryForm
          onSubmit={mockOnSubmit}
          isLoading={false}
          userRole="admin"
        />,
      );

      const urlInput = screen.getByLabelText(/url/i);
      const submitButton = screen.getByRole("button", { name: /utwórz/i });

      await user.type(urlInput, "https://example.com");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
    });

    it("should display error when url_original is invalid", async () => {
      const user = userEvent.setup();
      render(
        <KbEntryForm
          onSubmit={mockOnSubmit}
          isLoading={false}
          userRole="admin"
        />,
      );

      const titleInput = screen.getByLabelText(/tytuł/i);
      const urlInput = screen.getByLabelText(/url/i);
      const submitButton = screen.getByRole("button", { name: /utwórz/i });

      await user.type(titleInput, "Test Entry");
      await user.type(urlInput, "not-a-url");
      await user.click(submitButton);

      await waitFor(() => {
        const alerts = screen.getAllByRole("alert");
        expect(alerts.length).toBeGreaterThan(0);
      });
    });

    it("should validate max length for title (200 characters)", async () => {
      const user = userEvent.setup();
      render(
        <KbEntryForm
          onSubmit={mockOnSubmit}
          isLoading={false}
          userRole="admin"
        />,
      );

      const titleInput = screen.getByLabelText(/tytuł/i);
      const urlInput = screen.getByLabelText(/url/i);
      const submitButton = screen.getByRole("button", { name: /utwórz/i });

      await user.type(titleInput, "a".repeat(201));
      await user.type(urlInput, "https://example.com");
      await user.click(submitButton);

      await waitFor(() => {
        const alerts = screen.getAllByRole("alert");
        expect(alerts.length).toBeGreaterThan(0);
      });
    });

    it("should add and remove tags", async () => {
      const user = userEvent.setup();
      render(
        <KbEntryForm
          onSubmit={mockOnSubmit}
          isLoading={false}
          userRole="admin"
        />,
      );

      const tagInput = screen.getByPlaceholderText(/dodaj tag/i);
      const addButton = screen.getByRole("button", { name: /dodaj/i });

      // Add tag
      await user.type(tagInput, "tag1");
      await user.click(addButton);

      expect(screen.getByText("tag1")).toBeInTheDocument();

      // Remove tag
      const removeButtons = screen.getAllByRole("button", {
        name: /usuń tag/i,
      });
      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText("tag1")).not.toBeInTheDocument();
      });
    });

    it("should add tag by pressing Enter", async () => {
      const user = userEvent.setup();
      render(
        <KbEntryForm
          onSubmit={mockOnSubmit}
          isLoading={false}
          userRole="admin"
        />,
      );

      const tagInput = screen.getByPlaceholderText(/dodaj tag/i);

      await user.type(tagInput, "tag1{Enter}");

      await waitFor(() => {
        expect(screen.getByText("tag1")).toBeInTheDocument();
      });
    });

    it("should not add duplicate tags", async () => {
      const user = userEvent.setup();
      render(
        <KbEntryForm
          onSubmit={mockOnSubmit}
          isLoading={false}
          userRole="admin"
        />,
      );

      const tagInput = screen.getByPlaceholderText(/dodaj tag/i);
      const addButton = screen.getByRole("button", { name: /dodaj/i });

      await user.type(tagInput, "tag1");
      await user.click(addButton);

      await user.type(tagInput, "tag1");
      await user.click(addButton);

      const tags = screen.getAllByText("tag1");
      expect(tags.length).toBe(1); // Only one instance
    });
  });

  describe("submit", () => {
    it("should call onSubmit with correct data in create mode", async () => {
      const user = userEvent.setup();
      render(
        <KbEntryForm
          onSubmit={mockOnSubmit}
          isLoading={false}
          userRole="admin"
        />,
      );

      const titleInput = screen.getByLabelText(/tytuł/i);
      const urlInput = screen.getByLabelText(/url/i);
      const submitButton = screen.getByRole("button", { name: /utwórz/i });

      await user.type(titleInput, "Test Entry");
      await user.type(urlInput, "https://example.com");

      // Add tags
      const tagInput = screen.getByPlaceholderText(/dodaj tag/i);
      const addButton = screen.getByRole("button", { name: /dodaj/i });
      await user.type(tagInput, "tag1");
      await user.click(addButton);
      await user.type(tagInput, "tag2");
      await user.click(addButton);

      // Check public checkbox
      const publicCheckbox = screen.getByLabelText(/udostępnij publicznie/i);
      await user.click(publicCheckbox);

      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Test Entry",
            url: "https://example.com",
            tags: ["tag1", "tag2"],
            is_public: true,
          }),
        );
      });
    });

    it("should call onSubmit with partial update in edit mode", async () => {
      const initialData: KBEntryDTO = {
        id: "entry-1",
        user_id: "user-1",
        title: "Original Title",
        url_original: "https://example.com/original",
        url_canonical: "https://example.com/original",
        tags: ["tag1"],
        is_public: false,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const user = userEvent.setup();
      render(
        <KbEntryForm
          onSubmit={mockOnSubmit}
          initialData={initialData}
          isLoading={false}
        />,
      );

      const titleInput = screen.getByDisplayValue("Original Title");
      await user.clear(titleInput);
      await user.type(titleInput, "Updated Title");

      const submitButton = screen.getByRole("button", { name: /zaktualizuj/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Updated Title",
          }),
        );
      });

      // Verify only changed fields are sent
      const call = mockOnSubmit.mock.calls[0][0];
      expect(call.url_original).toBeUndefined(); // Not changed
      expect(call.tags).toBeUndefined(); // Not changed
    });

    it("should include is_public in submit data when changed", async () => {
      const initialData: KBEntryDTO = {
        id: "entry-1",
        user_id: "user-1",
        title: "Test Entry",
        url_original: "https://example.com/test",
        url_canonical: "https://example.com/test",
        tags: [],
        is_public: false,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const user = userEvent.setup();
      render(
        <KbEntryForm
          onSubmit={mockOnSubmit}
          initialData={initialData}
          isLoading={false}
          userRole="admin"
        />,
      );

      const publicCheckbox = screen.getByLabelText(/udostępnij publicznie/i);
      await user.click(publicCheckbox);

      const submitButton = screen.getByRole("button", { name: /zaktualizuj/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            is_public: true,
          }),
        );
      });
    });

    it("should show loading state during submit", async () => {
      const mockOnSubmitDelayed = vi.fn(
        () => new Promise<void>((resolve) => setTimeout(resolve, 100)),
      );

      const user = userEvent.setup();
      const { rerender } = render(
        <KbEntryForm onSubmit={mockOnSubmitDelayed} isLoading={false} />,
      );

      const titleInput = screen.getByLabelText(/tytuł/i);
      const urlInput = screen.getByLabelText(/url/i);
      const submitButton = screen.getByRole("button", { name: /utwórz/i });

      await user.type(titleInput, "Test Entry");
      await user.type(urlInput, "https://example.com");
      await user.click(submitButton);

      rerender(<KbEntryForm onSubmit={mockOnSubmitDelayed} isLoading={true} />);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(screen.getByText(/tworzenie/i)).toBeInTheDocument();
      });
    });
  });

  describe("edit mode", () => {
    it("should pre-fill form with initialData", () => {
      const initialData: KBEntryDTO = {
        id: "entry-1",
        user_id: "user-1",
        title: "Test Entry",
        url_original: "https://example.com/test",
        url_canonical: "https://example.com/test",
        tags: ["tag1", "tag2"],
        is_public: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      render(
        <KbEntryForm
          onSubmit={mockOnSubmit}
          initialData={initialData}
          isLoading={false}
          userRole="admin"
        />,
      );

      expect(screen.getByDisplayValue("Test Entry")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("https://example.com/test"),
      ).toBeInTheDocument();
      expect(screen.getByText("tag1")).toBeInTheDocument();
      expect(screen.getByText("tag2")).toBeInTheDocument();

      const publicCheckbox = screen.getByLabelText(
        /udostępnij publicznie/i,
      ) as HTMLInputElement;
      expect(publicCheckbox.checked).toBe(true);
    });

    it("should only send changed fields in update", async () => {
      const initialData: KBEntryDTO = {
        id: "entry-1",
        user_id: "user-1",
        title: "Original Title",
        url_original: "https://example.com/original",
        url_canonical: "https://example.com/original",
        tags: ["tag1"],
        is_public: false,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const user = userEvent.setup();
      render(
        <KbEntryForm
          onSubmit={mockOnSubmit}
          initialData={initialData}
          isLoading={false}
        />,
      );

      // Only change URL
      const urlInput = screen.getByDisplayValue("https://example.com/original");
      await user.clear(urlInput);
      await user.type(urlInput, "https://example.com/new");

      const submitButton = screen.getByRole("button", { name: /zaktualizuj/i });
      await user.click(submitButton);

      await waitFor(() => {
        const call = mockOnSubmit.mock.calls[0][0];
        expect(call.url_original).toBe("https://example.com/new");
        expect(call.title).toBeUndefined(); // Not changed
        expect(call.tags).toBeUndefined(); // Not changed
        expect(call.is_public).toBeUndefined(); // Not changed
      });
    });

    it("should change button text to 'Zaktualizuj' in edit mode", () => {
      const initialData: KBEntryDTO = {
        id: "entry-1",
        user_id: "user-1",
        title: "Test Entry",
        url_original: "https://example.com/test",
        url_canonical: "https://example.com/test",
        tags: [],
        is_public: false,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      render(
        <KbEntryForm
          onSubmit={mockOnSubmit}
          initialData={initialData}
          isLoading={false}
        />,
      );

      expect(
        screen.getByRole("button", { name: /zaktualizuj/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /utwórz/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("cancel button", () => {
    it("should call onCancel when cancel button is clicked", async () => {
      const mockOnCancel = vi.fn();
      const user = userEvent.setup();
      render(
        <KbEntryForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={false}
        />,
      );

      const cancelButton = screen.getByRole("button", { name: /anuluj/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it("should not show cancel button when onCancel is not provided", () => {
      render(
        <KbEntryForm
          onSubmit={mockOnSubmit}
          isLoading={false}
          userRole="admin"
        />,
      );

      expect(
        screen.queryByRole("button", { name: /anuluj/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("disabled state", () => {
    it("should disable all inputs when isLoading is true", () => {
      render(<KbEntryForm onSubmit={mockOnSubmit} isLoading={true} />);

      const titleInput = screen.getByLabelText(/tytuł/i);
      const urlInput = screen.getByLabelText(/url/i);
      const submitButton = screen.getByRole("button", { name: /tworzenie/i });

      expect(titleInput).toBeDisabled();
      expect(urlInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });

  describe("form structure", () => {
    it("should have proper form structure", () => {
      render(
        <KbEntryForm
          onSubmit={mockOnSubmit}
          isLoading={false}
          userRole="admin"
        />,
      );

      const form = screen
        .getByRole("button", { name: /utwórz/i })
        .closest("form");
      expect(form).toBeInTheDocument();
      expect(screen.getByLabelText(/tytuł/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/url/i)).toBeInTheDocument();
    });

    it("should have required fields marked", () => {
      render(
        <KbEntryForm
          onSubmit={mockOnSubmit}
          isLoading={false}
          userRole="admin"
        />,
      );

      const titleLabel = screen.getByText(/tytuł/i);
      expect(titleLabel).toHaveTextContent(/\*/); // Required indicator

      const urlLabel = screen.getByText(/url/i);
      expect(urlLabel).toHaveTextContent(/\*/); // Required indicator
    });
  });
});
