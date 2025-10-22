import React from "react";
import BenefitItem from "./BenefitItem";
import { Zap, Shield, Heart } from "lucide-react";

/**
 * BenefitsSection component - displays why choose QA Toolsmith section
 * Shows 3 key benefits in a responsive grid layout
 */
const BenefitsSection: React.FC = () => {
  const benefits = [
    {
      icon: Zap,
      title: "Szybkość",
      description:
        "Raporty defektów w ≤3 minuty, gotowe szablony, skróty klawiszowe",
    },
    {
      icon: Shield,
      title: "Bezpieczeństwo",
      description:
        "Autoryzacja, role użytkowników, brak przechowywania prawdziwych danych",
    },
    {
      icon: Heart,
      title: "Prostota",
      description:
        "Intuicyjny interfejs, łatwe wdrożenie, brak zewnętrznych zależności",
    },
  ];

  return (
    <div className="bg-card/50 rounded-xl p-8 border">
      <h2 className="text-2xl font-semibold mb-6 text-center text-primary">
        Dlaczego QA Toolsmith?
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {benefits.map((benefit, index) => (
          <BenefitItem
            key={index}
            icon={benefit.icon}
            title={benefit.title}
            description={benefit.description}
          />
        ))}
      </div>
    </div>
  );
};

export default BenefitsSection;
