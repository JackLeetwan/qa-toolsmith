import React from "react";
import type { LucideIcon } from "lucide-react";

interface BenefitItemProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

/**
 * BenefitItem component - reusable component for individual benefits
 * Displays a benefit with centered layout, icon in circle on top
 */
const BenefitItem: React.FC<BenefitItemProps> = ({
  title,
  description,
  icon: Icon,
}) => {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-primary mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

export default BenefitItem;
