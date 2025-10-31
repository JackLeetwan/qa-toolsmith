// Simple HTML escaping function
const escapeHtml = (text: string): string => {
  if (typeof text !== "string") return "";
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param dirty - The potentially unsafe HTML string
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(dirty: string): string {
  return escapeHtml(dirty);
}

/**
 * Sanitizes a URL string to prevent XSS attacks
 * @param url - The potentially unsafe URL string
 * @returns Sanitized URL string safe for use in href attributes
 */
export function sanitizeUrl(url: string): string {
  // Basic URL validation - only allow http/https protocols
  if (!url.match(/^https?:\/\//i)) {
    return "#"; // Return safe fallback for invalid URLs
  }

  // Use simple escaping for URL
  return escapeHtml(url);
}

/**
 * Sanitizes text content that will be displayed as plain text
 * @param text - The potentially unsafe text string
 * @returns Sanitized text string safe for display
 */
export function sanitizeText(text: string): string {
  if (typeof text !== "string") return "";

  // Use simple HTML escaping to prevent XSS
  return escapeHtml(text);
}
