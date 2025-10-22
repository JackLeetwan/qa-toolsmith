import React from "react";
import FeatureCard from "./FeatureCard";
import { FileText, Clock, BookOpen, Zap } from "lucide-react";

/**
 * FeatureGrid component - displays a grid of 4 feature cards
 * Used on the landing page to showcase main application features
 */
const FeatureGrid: React.FC = () => {
  const features = [
    {
      icon: FileText,
      title: "Szablony Raportów",
      description:
        "Gotowe szablony do tworzenia profesjonalnych raportów QA. Szybko generuj dokumentację testową i analizy.",
      href: "/templates",
      linkText: "Przejdź do szablonów →",
    },
    {
      icon: Clock,
      title: "Exploration Charters",
      description:
        "Strukturyzowane podejście do eksploracyjnego testowania oprogramowania. Planuj i dokumentuj sesje testowe.",
      href: "/charters",
      linkText: "Rozpocznij eksplorację →",
    },
    {
      icon: BookOpen,
      title: "Baza Wiedzy",
      description:
        "Bogata kolekcja wiedzy QA, najlepszych praktyk i przewodników. Rozwijaj swoje umiejętności testowania.",
      href: "/kb",
      linkText: "Przeglądaj bazę wiedzy →",
    },
    {
      icon: Zap,
      title: "Generatory Danych",
      description:
        "Automatycznie generuj dane testowe dla różnych scenariuszy. IBAN, adresy, dane osobowe i wiele więcej.",
      href: "/generators",
      linkText: "Generuj dane testowe →",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
      {features.map((feature, index) => (
        <FeatureCard
          key={index}
          icon={feature.icon}
          title={feature.title}
          description={feature.description}
          href={feature.href}
          linkText={feature.linkText}
        />
      ))}
    </div>
  );
};

export default FeatureGrid;
