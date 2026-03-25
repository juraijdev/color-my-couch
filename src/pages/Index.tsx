import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Sofa, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/StepIndicator";
import { UploadArea } from "@/components/UploadArea";
import { FurnitureEditor, FurnitureEditorRef, PartPatternAssignment } from "@/components/FurnitureEditor";
import { PatternGrid } from "@/components/PatternGrid";
import { GeneratePanel } from "@/components/GeneratePanel";
import { PatternOption } from "@/components/PatternPalette";
import { imageUrlToBase64 } from "@/lib/imageUtils";

const Index = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<PatternOption | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [allFurnitureImages, setAllFurnitureImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const furnitureEditorRef = useRef<FurnitureEditorRef>(null);

  const getCurrentStep = (): 1 | 2 | 3 => {
    if (!uploadedImage) return 1;
    if (!hasSelection) return 2;
    return 3;
  };

  const handleImageUpload = useCallback((imageDataUrl: string) => {
    setUploadedImage(imageDataUrl);
    setGeneratedImage(null);
    setHasSelection(false);
    toast.success("Image uploaded! AI is analyzing the furniture parts...");
  }, []);

  const handleImageClear = useCallback(() => {
    setUploadedImage(null);
    setGeneratedImage(null);
    setSelectedPattern(null);
    setHasSelection(false);
  }, []);

  const handlePatternSelect = useCallback((pattern: PatternOption) => {
    setSelectedPattern(pattern);
  }, []);

  const handleSelectionChange = useCallback((hasSelection: boolean) => {
    setHasSelection(hasSelection);
  }, []);

  const handleAddMoreFurniture = useCallback(() => {
    if (generatedImage && !allFurnitureImages.includes(generatedImage)) {
      setAllFurnitureImages((prev) => [...prev, generatedImage]);
    }
    setUploadedImage(null);
    setGeneratedImage(null);
    setSelectedPattern(null);
    setHasSelection(false);
    toast.info("Upload another furniture to customize. All pieces will be placed together.");
  }, [generatedImage, allFurnitureImages]);

  const handleGenerate = useCallback(async () => {
    if (!uploadedImage) {
      toast.error("Please upload an image first");
      return;
    }

    const patternAssignments = furnitureEditorRef.current?.getPatternAssignments();
    const hasParts = furnitureEditorRef.current?.hasSelection();

    if (!hasParts || !patternAssignments || patternAssignments.length === 0) {
      toast.error("Please assign patterns to at least one furniture part");
      return;
    }

    setIsGenerating(true);
    toast.info("AI is applying the selected patterns...");

    try {
      const assignmentsWithBase64 = await Promise.all(
        patternAssignments.map(async (pa: PartPatternAssignment) => ({
          partName: pa.part.name,
          partMaterial: pa.part.material,
          partDescription: pa.part.description,
          partLocation: pa.part.location,
          patternName: pa.targetPattern.name,
          patternDescription: pa.targetPattern.description,
          patternImageUrl: await imageUrlToBase64(pa.targetPattern.imageUrl),
        }))
      );

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recolor-furniture`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            image: uploadedImage,
            patternAssignments: assignmentsWithBase64,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate");
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      if (result.output) {
        setGeneratedImage(result.output);
        setAllFurnitureImages((prev) => {
          if (prev.includes(result.output)) return prev;
          return [...prev, result.output];
        });
        toast.success("Design generated successfully!");
      } else {
        throw new Error("No output image received");
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [uploadedImage]);

  const canGenerate = Boolean(uploadedImage && hasSelection && !isGenerating);
  const assignmentCount = furnitureEditorRef.current?.getPatternAssignments().length || 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Sofa className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-base lg:text-lg">LUSHbyGESIGN</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-primary">AI Ready</span>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <HelpCircle className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Step Indicator */}
      <StepIndicator 
        currentStep={getCurrentStep()} 
        hasImage={Boolean(uploadedImage)}
        hasPatternAssigned={hasSelection}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {!uploadedImage ? (
          /* Step 1: Upload Area */
          <div className="flex-1 overflow-auto">
            <UploadArea onImageUpload={handleImageUpload} />
          </div>
        ) : (
          /* Step 2 & 3: Editor + Patterns + Generate */
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left: Furniture Editor */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <FurnitureEditor
                ref={furnitureEditorRef}
                imageUrl={uploadedImage}
                selectedPattern={selectedPattern}
                onSelectionChange={handleSelectionChange}
                onBack={handleImageClear}
              />
            </div>

            {/* Right: Patterns + Generate */}
            <div className="w-full lg:w-[420px] xl:w-[480px] border-t lg:border-t-0 lg:border-l border-border flex flex-col overflow-hidden bg-muted/30">
              {/* Pattern Grid */}
              <div className="flex-1 min-h-0 p-4 overflow-hidden">
                <PatternGrid
                  selectedPattern={selectedPattern}
                  onPatternSelect={handlePatternSelect}
                  disabled={!uploadedImage}
                />
              </div>

              {/* Generate Panel */}
              <div className="shrink-0 p-4 pt-0">
                <GeneratePanel
                  originalImage={uploadedImage}
                  generatedImage={generatedImage}
                  isGenerating={isGenerating}
                  onGenerate={handleGenerate}
                  canGenerate={canGenerate}
                  assignmentCount={hasSelection ? assignmentCount : 0}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
