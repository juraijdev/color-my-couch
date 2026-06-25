import { useState } from "react";
import { Search, Grid3X3, LayoutGrid, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { PatternOption, patternCategories } from "@/components/PatternPalette";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PatternGridProps {
  selectedPattern: PatternOption | null;
  onPatternSelect: (pattern: PatternOption) => void;
  disabled?: boolean;
}

export function PatternGrid({ selectedPattern, onPatternSelect, disabled }: PatternGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [gridSize, setGridSize] = useState<"small" | "large">("large");

  // Flatten all patterns for "All" view
  const allPatterns = patternCategories.flatMap(cat => cat.patterns);

  const filteredPatterns = (activeCategory === "all" 
    ? allPatterns 
    : patternCategories.find(c => c.id === activeCategory)?.patterns || []
  ).filter(pattern =>
    pattern.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pattern.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={cn(
      "flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden",
      disabled && "opacity-50 pointer-events-none"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Material Patterns</h2>
          <div className="flex items-center gap-1">
            <Button
              variant={gridSize === "large" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setGridSize("large")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={gridSize === "small" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setGridSize("small")}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="border-b border-border overflow-x-auto scrollbar-thin">
        <div className="flex gap-1 p-2 min-w-max">
            <button
              onClick={() => setActiveCategory("all")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                activeCategory === "all" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              All ({allPatterns.length})
            </button>
            {patternCategories.map(category => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                  activeCategory === category.id 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {category.name.split(" ")[0]} ({category.patterns.length})
              </button>
            ))}
          </div>
      </div>

      {/* Pattern grid */}
      <ScrollArea className="flex-1 p-4">
        <div className={cn(
          "grid gap-3",
          gridSize === "large" ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-4 sm:grid-cols-5 lg:grid-cols-6"
        )}>
          <TooltipProvider delayDuration={200}>
            {filteredPatterns.map((pattern) => (
              <Tooltip key={pattern.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onPatternSelect(pattern)}
                    className={cn(
                      "group relative flex flex-col rounded-lg overflow-hidden border-2 bg-card transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
                      selectedPattern?.id === pattern.id 
                        ? "border-primary ring-2 ring-primary/50 scale-105" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {/* Always-visible label above image */}
                    <div className="px-1.5 py-1 bg-secondary/80 border-b border-border text-left">
                      {pattern.code && (
                        <div className={cn(
                          "font-mono font-semibold text-foreground leading-tight truncate",
                          gridSize === "large" ? "text-[10px]" : "text-[9px]"
                        )}>
                          {pattern.code}
                        </div>
                      )}
                      <div className={cn(
                        "text-muted-foreground leading-tight truncate",
                        gridSize === "large" ? "text-[10px]" : "text-[9px]"
                      )}>
                        {pattern.name}
                      </div>
                    </div>

                    <div className="relative flex-1 aspect-square">
                      <img 
                        src={pattern.imageUrl} 
                        alt={pattern.name}
                        className="w-full h-full object-cover"
                      />

                      {/* Selected indicator */}
                      {selectedPattern?.id === pattern.id && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  <p className="font-medium">
                    {pattern.code ? `${pattern.code} — ${pattern.name}` : pattern.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{pattern.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>

        {filteredPatterns.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No patterns found matching "{searchQuery}"</p>
          </div>
        )}
      </ScrollArea>

      {/* Selected pattern indicator */}
      {selectedPattern && (
        <div className="p-3 border-t border-border bg-primary/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg border-2 border-primary overflow-hidden shrink-0">
              <img 
                src={selectedPattern.imageUrl} 
                alt={selectedPattern.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary truncate">
                Selected: {selectedPattern.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Click on a furniture part to apply
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
