import { useState, useImperativeHandle, forwardRef, useEffect } from "react";
import { Loader2, RefreshCw, Layers, X, MousePointerClick, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PatternOption } from "@/components/PatternPalette";
import { cn } from "@/lib/utils";

export interface FurnitureEditorRef {
  getPatternAssignments: () => PartPatternAssignment[];
  hasSelection: () => boolean;
  clearSelection: () => void;
  assignPatternToPart: (partId: string, pattern: PatternOption) => void;
}

export interface FurniturePart {
  id: string;
  name: string;
  description?: string;
  material: string;
  currentColor: string;
  location?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

export interface PartPatternAssignment {
  part: FurniturePart;
  targetPattern: PatternOption;
}

interface FurnitureEditorProps {
  imageUrl: string;
  selectedPattern: PatternOption | null;
  onSelectionChange?: (hasSelection: boolean) => void;
  onBack?: () => void;
}

export const FurnitureEditor = forwardRef<FurnitureEditorRef, FurnitureEditorProps>(
  ({ imageUrl, selectedPattern, onSelectionChange, onBack }, ref) => {
    const [parts, setParts] = useState<FurniturePart[]>([]);
    const [patternAssignments, setPatternAssignments] = useState<Map<string, PatternOption>>(new Map());
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [hasAnalyzed, setHasAnalyzed] = useState(false);
    const [activePartId, setActivePartId] = useState<string | null>(null);

    useEffect(() => {
      if (imageUrl && !hasAnalyzed) {
        analyzeImage();
      }
    }, [imageUrl]);

    useEffect(() => {
      setParts([]);
      setPatternAssignments(new Map());
      setHasAnalyzed(false);
      setActivePartId(null);
      onSelectionChange?.(false);
    }, [imageUrl]);

    useEffect(() => {
      if (selectedPattern && activePartId) {
        assignPattern(activePartId, selectedPattern);
        setActivePartId(null);
      }
    }, [selectedPattern]);

    const analyzeImage = async () => {
      setIsAnalyzing(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/segment-furniture`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ image: imageUrl }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to analyze image");
        }

        const data = await response.json();
        
        if (data.parts && data.parts.length > 0) {
          setParts(data.parts);
          setHasAnalyzed(true);
          toast.success(`Found ${data.parts.length} furniture parts!`);
        } else {
          toast.error("No distinct parts found. Try a clearer image.");
        }
      } catch (error) {
        console.error("Analysis error:", error);
        toast.error(error instanceof Error ? error.message : "Failed to analyze image");
      } finally {
        setIsAnalyzing(false);
      }
    };

    const assignPattern = (partId: string, pattern: PatternOption) => {
      const newAssignments = new Map(patternAssignments);
      newAssignments.set(partId, pattern);
      setPatternAssignments(newAssignments);
      onSelectionChange?.(newAssignments.size > 0);
      
      const part = parts.find(p => p.id === partId);
      if (part) {
        toast.success(`Applied ${pattern.name} to ${part.name}`);
      }
    };

    const removeAssignment = (partId: string) => {
      const newAssignments = new Map(patternAssignments);
      newAssignments.delete(partId);
      setPatternAssignments(newAssignments);
      onSelectionChange?.(newAssignments.size > 0);
    };

    const clearAllAssignments = () => {
      setPatternAssignments(new Map());
      setActivePartId(null);
      onSelectionChange?.(false);
    };

    const handlePartClick = (partId: string) => {
      if (selectedPattern) {
        assignPattern(partId, selectedPattern);
      } else {
        setActivePartId(partId === activePartId ? null : partId);
        if (partId !== activePartId) {
          toast.info("Now select a pattern from below");
        }
      }
    };

    useImperativeHandle(ref, () => ({
      getPatternAssignments: () => {
        const assignments: PartPatternAssignment[] = [];
        patternAssignments.forEach((pattern, partId) => {
          const part = parts.find(p => p.id === partId);
          if (part) {
            assignments.push({ part, targetPattern: pattern });
          }
        });
        return assignments;
      },
      hasSelection: () => patternAssignments.size > 0,
      clearSelection: clearAllAssignments,
      assignPatternToPart: assignPattern,
    }));

    return (
      <div className="h-full flex flex-col">
        {/* Top toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          {onBack && (
            <Button variant="ghost" onClick={onBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              New Image
            </Button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={analyzeImage}
              disabled={isAnalyzing}
              className="gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", isAnalyzing && "animate-spin")} />
              Re-analyze
            </Button>
            {patternAssignments.size > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllAssignments}>
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Image view */}
          <div className="flex-1 flex items-center justify-center p-4 lg:p-8 bg-muted/20 overflow-auto">
            <div className="relative max-w-full">
              <img
                src={imageUrl}
                alt="Furniture to customize"
                className="block max-w-full max-h-[50vh] lg:max-h-[60vh] object-contain rounded-xl shadow-2xl"
                draggable={false}
              />

              {/* Analyzing overlay */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center rounded-xl">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">Analyzing furniture...</p>
                      <p className="text-sm text-muted-foreground">AI is detecting customizable parts</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Location markers */}
              {parts.map((part) => {
                const assignedPattern = patternAssignments.get(part.id);
                const isActive = activePartId === part.id;
                
                return part.location && (assignedPattern || isActive) && (
                  <div
                    key={part.id}
                    className={cn(
                      "absolute border-2 rounded-lg pointer-events-none transition-all",
                      isActive 
                        ? "border-yellow-400 bg-yellow-400/20 animate-pulse" 
                        : "border-primary bg-primary/10"
                    )}
                    style={{
                      top: `${part.location.top}%`,
                      left: `${part.location.left}%`,
                      width: `${part.location.width}%`,
                      height: `${part.location.height}%`,
                    }}
                  >
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs px-2 py-1 rounded-full whitespace-nowrap bg-primary text-primary-foreground font-medium shadow-lg">
                      {part.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Parts panel */}
          <div className="lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-border bg-card overflow-auto">
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-2">Furniture Parts</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {!hasAnalyzed 
                  ? "Detecting parts..." 
                  : selectedPattern 
                    ? `Click a part to apply "${selectedPattern.name}"`
                    : "Select a part, then choose a pattern"
                }
              </p>

              {/* Instruction banner */}
              {hasAnalyzed && !selectedPattern && patternAssignments.size === 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20 mb-4">
                  <MousePointerClick className="w-5 h-5 text-primary shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium text-primary">Tip:</span> Click a part below, then select a material pattern
                  </p>
                </div>
              )}

              {isAnalyzing ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                </div>
              ) : parts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No parts detected yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {parts.map((part) => {
                    const assignedPattern = patternAssignments.get(part.id);
                    const isActive = activePartId === part.id;
                    
                    return (
                      <div
                        key={part.id}
                        className={cn(
                          "relative flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                          isActive
                            ? "border-yellow-400 bg-yellow-400/10 shadow-[0_0_15px_hsl(45_100%_50%/0.3)]"
                            : assignedPattern
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/50 bg-card"
                        )}
                        onClick={() => handlePartClick(part.id)}
                      >
                        {/* Pattern preview */}
                        <div className="w-12 h-12 rounded-lg border-2 border-border flex items-center justify-center shrink-0 overflow-hidden bg-muted">
                          {assignedPattern ? (
                            <img 
                              src={assignedPattern.imageUrl} 
                              alt={assignedPattern.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Layers className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{part.name}</span>
                            {isActive && (
                              <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-medium">
                                Select pattern ↓
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {part.material} • {part.currentColor}
                          </div>
                          {assignedPattern && (
                            <div className="text-xs text-primary font-medium mt-1">
                              → {assignedPattern.name}
                            </div>
                          )}
                        </div>

                        {/* Remove button */}
                        {assignedPattern && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAssignment(part.id);
                            }}
                            className="p-1.5 rounded-full hover:bg-destructive/20 transition-colors"
                          >
                            <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Summary */}
              {patternAssignments.size > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="font-medium text-sm mb-2">
                    {patternAssignments.size} pattern change{patternAssignments.size > 1 ? "s" : ""} ready
                  </p>
                  <div className="space-y-1.5">
                    {Array.from(patternAssignments.entries()).map(([partId, pattern]) => {
                      const part = parts.find(p => p.id === partId);
                      return part && (
                        <div key={partId} className="flex items-center gap-2 text-xs">
                          <span className="flex-1 truncate text-muted-foreground">{part.name}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="w-4 h-4 rounded border border-border overflow-hidden inline-block">
                            <img 
                              src={pattern.imageUrl} 
                              alt={pattern.name}
                              className="w-full h-full object-cover"
                            />
                          </span>
                          <span className="font-medium truncate max-w-[80px]">{pattern.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

FurnitureEditor.displayName = "FurnitureEditor";
