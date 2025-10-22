import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FileText } from "lucide-react";
import FeatureCard from "@/components/landing/FeatureCard";

describe("FeatureCard", () => {
  it("renders with required props", () => {
    render(
      <FeatureCard
        title="Test Feature"
        description="This is a test feature description"
        href="/test"
        icon={FileText}
      />,
    );

    expect(screen.getByText("Test Feature")).toBeInTheDocument();
    expect(
      screen.getByText("This is a test feature description"),
    ).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /przejdź/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/test");
  });

  it("renders the icon", () => {
    render(
      <FeatureCard
        title="Test Feature"
        description="Description"
        href="/test"
        icon={FileText}
      />,
    );

    // The icon should be rendered as an SVG element
    const icon = document.querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("w-6", "h-6", "text-primary");
  });

  it("applies correct CSS classes", () => {
    const { container } = render(
      <FeatureCard
        title="Test Feature"
        description="Description"
        href="/test"
        icon={FileText}
      />,
    );

    // Check card container has correct classes
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass(
      "bg-card/50",
      "hover:bg-muted/50",
      "transition-all",
      "duration-300",
      "cursor-pointer",
    );

    // Check icon container has correct classes
    const iconContainer = container.querySelector("div.w-12.h-12");
    expect(iconContainer).toHaveClass("bg-primary/20", "rounded-lg");

    // Check title has correct classes
    const title = screen.getByText("Test Feature");
    expect(title).toHaveClass("text-xl", "font-semibold", "text-primary");

    // Check description has correct classes
    const description = screen.getByText("Description");
    expect(description).toHaveClass("text-muted-foreground");

    // Check link has correct classes
    const link = screen.getByRole("link");
    expect(link).toHaveClass(
      "text-primary",
      "hover:text-primary/80",
      "font-medium",
    );
  });

  it("renders link text correctly", () => {
    render(
      <FeatureCard
        title="Test Feature"
        description="Description"
        href="/test"
        icon={FileText}
      />,
    );

    const link = screen.getByRole("link", { name: "Przejdź →" });
    expect(link).toBeInTheDocument();
  });

  it("renders custom link text when provided", () => {
    render(
      <FeatureCard
        title="Test Feature"
        description="Description"
        href="/test"
        icon={FileText}
        linkText="Custom Link Text"
      />,
    );

    const link = screen.getByRole("link", { name: "Custom Link Text" });
    expect(link).toBeInTheDocument();
  });
});
