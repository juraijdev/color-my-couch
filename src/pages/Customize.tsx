import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { FurnitureEditor, FurnitureEditorRef, PartPatternAssignment } from "@/components/FurnitureEditor";
import { PatternGrid } from "@/components/PatternGrid";
import { GeneratePanel } from "@/components/GeneratePanel";
import { PatternOption } from "@/components/PatternPalette";
import { UploadArea } from "@/components/UploadArea";
import { StepIndicator } from "@/components/StepIndicator";
import { SiteHeader } from "@/components/SiteHeader";
import { imageUrlToBase64 } from "@/lib/imageUtils";

export default function Customize() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<PatternOption | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const furnitureEditorRef = useRef<FurnitureEditorRef>(null);

  // Multi-furniture: track all customized furniture images
  const [allFurnitureImages, setAllFurnitureImages] = useState<string[]>([]);

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

  /** When user wants to add another furniture piece after generation */
  const handleAddMoreFurniture = useCallback(() => {
    // Save current generated image to the collection
    if (generatedImage && !allFurnitureImages.includes(generatedImage)) {
      setAllFurnitureImages((prev) => [...prev, generatedImage]);
    }
    // Reset editor for new furniture
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
        // Add to collection automatically
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
      <SiteHeader />

      {/* Step Indicator */}
      <StepIndicator
        currentStep={getCurrentStep()}
        hasImage={Boolean(uploadedImage)}
        hasPatternAssigned={hasSelection}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {!uploadedImage ? (
          <div className="flex-1 overflow-auto">
            <UploadArea onImageUpload={handleImageUpload} />
          </div>
        ) : (
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
            <div className="w-full lg:w-[420px] xl:w-[480px] border-t lg:border-t-0 lg:border-l border-border flex flex-col overflow-hidden bg-card/50">
              <div className="flex-1 min-h-0 p-4 overflow-hidden">
                <PatternGrid
                  selectedPattern={selectedPattern}
                  onPatternSelect={handlePatternSelect}
                  disabled={!uploadedImage}
                />
              </div>
              <div className="shrink-0 p-4 pt-0">
                <GeneratePanel
                  originalImage={uploadedImage}
                  generatedImage={generatedImage}
                  isGenerating={isGenerating}
                  onGenerate={handleGenerate}
                  canGenerate={canGenerate}
                  assignmentCount={hasSelection ? assignmentCount : 0}
                  allFurnitureImages={allFurnitureImages}
                  onAddMoreFurniture={handleAddMoreFurniture}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
