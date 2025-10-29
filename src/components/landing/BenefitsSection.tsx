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
    <section className="relative">
      {/* Subtle background gradient for visual depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-transparent to-transparent rounded-2xl -z-10"></div>

      <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-primary/10 shadow-lg">
        {/* Section header with improved spacing */}
        <div className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-semibold mb-3 text-primary">
            Dlaczego QA Toolsmith?
          </h2>
          <div className="w-16 h-1 bg-primary/30 rounded-full mx-auto"></div>
        </div>

        {/* Benefits grid with improved spacing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
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
    </section>
  );
};

export default BenefitsSection;
