import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Zap } from "lucide-react";
import BenefitItem from "@/components/landing/BenefitItem";

describe("BenefitItem", () => {
  it("renders with required props", () => {
    render(
      <BenefitItem
        title="Szybkość"
        description="Raporty defektów w ≤3 minuty, gotowe szablony, skróty klawiszowe"
        icon={Zap}
      />,
    );

    expect(screen.getByText("Szybkość")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Raporty defektów w ≤3 minuty, gotowe szablony, skróty klawiszowe",
      ),
    ).toBeInTheDocument();
  });

  it("renders the icon", () => {
    render(
      <BenefitItem title="Test Benefit" description="Description" icon={Zap} />,
    );

    // The icon should be rendered as an SVG element
    const icon = document.querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("w-8", "h-8", "text-primary");
  });

  it("applies correct CSS classes", () => {
    const { container } = render(
      <BenefitItem title="Test Benefit" description="Description" icon={Zap} />,
    );

    // Check main container has centered text
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer).toHaveClass("text-center");

    // Check icon container has correct classes
    const iconContainer = container.querySelector("div.w-16.h-16");
    expect(iconContainer).toHaveClass(
      "bg-primary/20",
      "rounded-full",
      "flex",
      "items-center",
      "justify-center",
      "mx-auto",
      "mb-4",
    );

    // Check title has correct classes
    const title = screen.getByText("Test Benefit");
    expect(title).toHaveClass(
      "text-lg",
      "font-semibold",
      "text-primary",
      "mb-2",
    );

    // Check description has correct classes
    const description = screen.getByText("Description");
    expect(description).toHaveClass("text-muted-foreground");
  });

  it("renders with different props correctly", () => {
    render(
      <BenefitItem
        title="Inna korzyść"
        description="Opis innej korzyści"
        icon={Zap}
      />,
    );

    expect(screen.getByText("Inna korzyść")).toBeInTheDocument();
    expect(screen.getByText("Opis innej korzyści")).toBeInTheDocument();
  });
});
