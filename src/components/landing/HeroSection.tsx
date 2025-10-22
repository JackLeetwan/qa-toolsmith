import React from "react";

/**
 * HeroSection component for the QA Toolsmith landing page
 * Displays the main title and description section
 */
const HeroSection: React.FC = () => {
  return (
    <div className="text-center">
      <h1 className="text-6xl font-bold mb-6 text-primary">QA Toolsmith</h1>
      <p className="text-2xl text-muted-foreground mb-4">
        Nowoczesne narzędzie dla testerów
      </p>
      <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
        Standaryzuj codzienną pracę, automatyzuj powtarzalne zadania i podnieś
        jakość testowania z naszym kompletnym zestawem narzędzi dla
        profesjonalnych testerów.
      </p>
    </div>
  );
};

export default HeroSection;
