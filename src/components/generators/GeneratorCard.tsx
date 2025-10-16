import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { GeneratorMeta } from "@/types/types";
import * as LucideIcons from "lucide-react";

interface GeneratorCardProps {
  item: GeneratorMeta;
}

export default function GeneratorCard({ item }: GeneratorCardProps) {
  // Dynamically get the icon component
  const IconComponent =
    (LucideIcons as unknown as Record<string, typeof LucideIcons.HelpCircle>)[item.icon] || LucideIcons.HelpCircle;

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200 cursor-pointer" tabIndex={0}>
      <a href={item.href} className="block focus:outline-none">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <IconComponent className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg group-hover:text-primary transition-colors">{item.name}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm leading-relaxed">{item.description}</CardDescription>
          {item.example && (
            <div className="mt-4 p-2 bg-muted rounded text-xs font-mono text-muted-foreground">
              <span className="text-muted-foreground/60">Example:</span> {item.example}
            </div>
          )}
          <div className="mt-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
            >
              Open Generator
            </Button>
          </div>
        </CardContent>
      </a>
    </Card>
  );
}
