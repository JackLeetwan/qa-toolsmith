import React from "react";

/**
 * CallToAction component for the QA Toolsmith landing page
 * Displays login/register buttons for non-authenticated users
 */
const CallToAction: React.FC = () => {
  return (
    <div className="text-center">
      <p className="text-lg text-muted-foreground mb-6">
        Gotowy na nowoczesne testowanie?
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <a
          href="/auth/login"
          className="inline-flex items-center px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all duration-300 shadow-lg"
        >
          Zaloguj się
        </a>
        <a
          href="/auth/register"
          className="inline-flex items-center px-8 py-3 bg-transparent border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary hover:text-primary-foreground transition-all duration-300"
        >
          Zarejestruj się
        </a>
      </div>
    </div>
  );
};

export default CallToAction;
