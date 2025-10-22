import React from "react";
import { Label } from "@/components/ui/label";

interface FormFieldProps {
  /** The label text for the form field */
  label: string;
  /** Error message to display, if any */
  error?: string;
  /** The form field content (input, etc.) */
  children: React.ReactNode;
  /** Whether the field is required */
  required?: boolean;
  /** Additional CSS classes for the container */
  className?: string;
  /** The ID to associate with the label - should match the input's id */
  htmlFor?: string;
}

/**
 * Reusable form field component for consistent form field styling and structure.
 * Handles label, error display, and field layout in a standardized way.
 */
export default function FormField({
  label,
  error,
  children,
  required = false,
  className = "",
  htmlFor,
}: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
