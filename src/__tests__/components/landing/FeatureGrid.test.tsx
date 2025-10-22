import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FeatureGrid from "@/components/landing/FeatureGrid";

describe("FeatureGrid", () => {
  it("renders all 4 feature cards", () => {
    render(<FeatureGrid />);

    // Check that all feature titles are rendered
    expect(screen.getByText("Szablony Raportów")).toBeInTheDocument();
    expect(screen.getByText("Exploration Charters")).toBeInTheDocument();
    expect(screen.getByText("Baza Wiedzy")).toBeInTheDocument();
    expect(screen.getByText("Generatory Danych")).toBeInTheDocument();
  });

  it("renders correct descriptions", () => {
    render(<FeatureGrid />);

    expect(
      screen.getByText(
        "Gotowe szablony do tworzenia profesjonalnych raportów QA. Szybko generuj dokumentację testową i analizy.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Strukturyzowane podejście do eksploracyjnego testowania oprogramowania. Planuj i dokumentuj sesje testowe.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Bogata kolekcja wiedzy QA, najlepszych praktyk i przewodników. Rozwijaj swoje umiejętności testowania.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Automatycznie generuj dane testowe dla różnych scenariuszy. IBAN, adresy, dane osobowe i wiele więcej.",
      ),
    ).toBeInTheDocument();
  });

  it("renders correct links", () => {
    render(<FeatureGrid />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);

    const hrefs = links.map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(
      expect.arrayContaining(["/templates", "/charters", "/kb", "/generators"]),
    );
  });

  it("renders correct icons", () => {
    render(<FeatureGrid />);

    // Check that icons are rendered (they should be SVG elements)
    const icons = document.querySelectorAll("svg");
    expect(icons).toHaveLength(4);

    // Each icon should have the correct classes
    icons.forEach((icon) => {
      expect(icon).toHaveClass("w-6", "h-6", "text-primary");
    });
  });

  it("applies correct grid layout classes", () => {
    const { container } = render(<FeatureGrid />);

    const grid = container.firstChild;
    expect(grid).toHaveClass(
      "grid",
      "grid-cols-1",
      "md:grid-cols-2",
      "gap-6",
      "max-w-5xl",
      "mx-auto",
    );
  });

  it("renders all link texts correctly", () => {
    render(<FeatureGrid />);

    const linkTexts = screen.getAllByText("Przejdź →");
    expect(linkTexts).toHaveLength(4);
  });
});
