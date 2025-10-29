import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  linkText?: string;
}

/**
 * FeatureCard component - reusable card for landing page features
 * Displays a feature with icon, title, description and link
 */
const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  href,
  icon: Icon,
  linkText = "Przejdź →",
}) => {
  return (
    <Card className="group bg-card/50 hover:bg-muted/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer">
      <CardContent className="p-6">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-primary/20 group-hover:bg-primary/30 rounded-lg flex items-center justify-center mr-4 transition-colors">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-primary">{title}</h3>
        </div>
        <p className="text-muted-foreground mb-4">{description}</p>
        <a
          href={href}
          className="inline-flex items-center text-primary hover:text-primary/80 font-medium"
        >
          {linkText}
        </a>
      </CardContent>
    </Card>
  );
};

export default FeatureCard;
