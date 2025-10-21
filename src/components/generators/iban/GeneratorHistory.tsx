import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { History, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { HistoryItem, IbanGeneratorResponse } from "@/types/types";

interface GeneratorHistoryProps {
  items: HistoryItem<IbanGeneratorResponse>[];
  onSelect: (item: IbanGeneratorResponse) => void;
  onClear: () => void;
}

export default function GeneratorHistory({
  items,
  onSelect,
  onClear,
}: GeneratorHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatTimestamp = (ts: number): string => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const formatIban = (iban: string): string => {
    // Format IBAN with spaces for readability: DE89 3704 0044 0532 0130 00
    return iban.replace(/(.{4})/g, "$1 ").trim();
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            History
          </CardTitle>
          <CardDescription>
            Your recent generations will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No history yet
          </p>
        </CardContent>
      </Card>
    );
  }

  // Mobile: Collapsible, Desktop: Always visible
  const HistoryList = () => (
    <div className="space-y-2">
      {items.map((item) => (
        <button
          key={item.ts}
          onClick={() => onSelect(item.data)}
          className="w-full text-left p-3 rounded-lg border bg-card hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-muted-foreground truncate">
                {formatIban(item.data.iban)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-medium">{item.data.country}</span>
                {item.data.seed && (
                  <span className="text-xs text-muted-foreground">
                    • {item.data.seed}
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatTimestamp(item.ts)}
            </span>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <>
      {/* Mobile: Collapsible */}
      <div className="lg:hidden">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  History ({items.length})
                </CardTitle>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {isOpen ? "Collapse" : "Expand"} history
                    </span>
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <HistoryList />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear History
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear history?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all {items.length} items
                          from your history. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onClear}>
                          Clear
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Desktop: Always visible sidebar */}
      <div className="hidden lg:block">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              History
            </CardTitle>
            <CardDescription>
              {items.length} recent generation{items.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <HistoryList />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear History
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear history?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {items.length} items from
                    your history. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onClear}>Clear</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
