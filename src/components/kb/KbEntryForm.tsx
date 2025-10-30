import React, { useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";
import type {
  KBEntryDTO,
  CreateKBEntryCommand,
  UpdateKBEntryCommand,
} from "@/types/types";
import { KbEntryCreateSchema, KbEntryUpdateSchema } from "@/lib/validators/kb";

interface KbEntryFormProps {
  onSubmit: (
    data: CreateKBEntryCommand | UpdateKBEntryCommand,
  ) => Promise<void>;
  initialData?: KBEntryDTO;
  isLoading?: boolean;
  onCancel?: () => void;
  role?: "admin" | "user";
}

interface FormData {
  title: string;
  url_original: string;
  tags: string[];
  is_public: boolean;
}

export default function KbEntryForm({
  onSubmit,
  initialData,
  isLoading = false,
  onCancel,
  role = "user",
}: KbEntryFormProps) {
  const [tagInput, setTagInput] = useState("");
  const isEditMode = Boolean(initialData);
  const isAdmin = role === "admin";

  // Use create schema for validation (all fields required in create mode)
  // For edit mode, we'll use partial validation
  const schema = isEditMode ? KbEntryUpdateSchema : KbEntryCreateSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    // Dynamic schema between create/update - cast resolver to correct type
    resolver: zodResolver(schema as never) as unknown as Resolver<FormData>,
    defaultValues: {
      title: initialData?.title || "",
      url_original: initialData?.url_original || "",
      tags: initialData?.tags || [],
      is_public: isAdmin ? initialData?.is_public || false : false,
    },
  });

  const watchedTags = watch("tags");

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !watchedTags.includes(trimmed)) {
      const newTags = [...watchedTags, trimmed];
      setValue("tags", newTags, { shouldValidate: true });
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = watchedTags.filter((tag) => tag !== tagToRemove);
    setValue("tags", newTags, { shouldValidate: true });
  };

  const onFormSubmit = async (data: FormData) => {
    if (isEditMode) {
      // Edit mode: send UpdateKBEntryCommand (partial) with is_public
      const updateData: UpdateKBEntryCommand & { is_public?: boolean } = {};
      if (data.title !== initialData?.title) {
        updateData.title = data.title;
      }
      if (data.url_original !== initialData?.url_original) {
        updateData.url_original = data.url_original;
      }
      if (
        JSON.stringify(data.tags.sort()) !==
        JSON.stringify((initialData?.tags || []).sort())
      ) {
        updateData.tags = data.tags;
      }
      if (isAdmin && data.is_public !== initialData?.is_public) {
        updateData.is_public = data.is_public;
      }
      await onSubmit(updateData);
    } else {
      // Create mode: send CreateKBEntryCommand with is_public
      // We extend CreateKBEntryCommand locally to include is_public
      const createData: CreateKBEntryCommand & { is_public?: boolean } = {
        title: data.title,
        url: data.url_original, // Map url_original to url for CreateKBEntryCommand
        tags: data.tags,
        ...(isAdmin ? { is_public: data.is_public } : {}),
      };
      await onSubmit(createData);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">
        {isEditMode ? "Edytuj wpis" : "Dodaj nowy wpis"}
      </h2>
      <form
        noValidate
        onSubmit={handleSubmit(onFormSubmit)}
        className="space-y-4"
      >
        {/* Title field */}
        <div className="space-y-2">
          <Label htmlFor="title">
            Tytuł <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            {...register("title")}
            disabled={isLoading}
            aria-invalid={!!errors.title}
            placeholder="Np. Dokumentacja React"
          />
          {errors.title && (
            <p className="text-sm text-destructive" role="alert">
              {errors.title.message}
            </p>
          )}
        </div>

        {/* URL field */}
        <div className="space-y-2">
          <Label htmlFor="url_original">
            URL <span className="text-destructive">*</span>
          </Label>
          <Input
            id="url_original"
            type="url"
            {...register("url_original")}
            disabled={isLoading}
            aria-invalid={!!errors.url_original}
            placeholder="https://example.com"
          />
          {errors.url_original && (
            <p className="text-sm text-destructive" role="alert">
              {errors.url_original.message}
            </p>
          )}
        </div>

        {/* Tags field */}
        <div className="space-y-2">
          <Label htmlFor="tag-input">Tagi</Label>
          <div className="flex gap-2">
            <Input
              id="tag-input"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              placeholder="Dodaj tag i naciśnij Enter"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addTag}
              disabled={isLoading || !tagInput.trim()}
            >
              Dodaj
            </Button>
          </div>
          {watchedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {watchedTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    disabled={isLoading}
                    className="hover:text-destructive focus:outline-none focus:ring-2 focus:ring-ring rounded"
                    aria-label={`Usuń tag ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {errors.tags && (
            <p className="text-sm text-destructive" role="alert">
              {errors.tags.message}
            </p>
          )}
        </div>

        {/* Public checkbox (admin only) */}
        {isAdmin ? (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_public"
              {...register("is_public")}
              disabled={isLoading}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="is_public" className="cursor-pointer">
              Udostępnij publicznie
            </Label>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Tylko administrator może udostępniać wpisy publicznie.
          </p>
        )}

        {/* Form buttons */}
        <div className="flex justify-end gap-2 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Anuluj
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading
              ? isEditMode
                ? "Aktualizowanie..."
                : "Tworzenie..."
              : isEditMode
                ? "Zaktualizuj"
                : "Utwórz"}
          </Button>
        </div>
      </form>
    </div>
  );
}
