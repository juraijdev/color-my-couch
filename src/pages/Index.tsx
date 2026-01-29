import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { PatternPalette, PatternOption } from "@/components/PatternPalette";
import { ImageUploader } from "@/components/ImageUploader";
import { PartSelector, PartSelectorRef, PartPatternAssignment } from "@/components/PartSelector";
import { PreviewPanel } from "@/components/PreviewPanel";
import { WorkflowSteps } from "@/components/WorkflowSteps";

const Index = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<PatternOption | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const partSelectorRef = useRef<PartSelectorRef>(null);

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
    toast.info(`Selected: ${pattern.name} - Click on a part to apply`);
  }, []);

  const handleSelectionChange = useCallback((hasSelection: boolean) => {
    setHasSelection(hasSelection);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!uploadedImage) {
      toast.error("Please upload an image first");
      return;
    }

    const patternAssignments = partSelectorRef.current?.getPatternAssignments();
    const hasParts = partSelectorRef.current?.hasSelection();

    if (!hasParts || !patternAssignments || patternAssignments.length === 0) {
      toast.error("Please assign patterns to at least one furniture part");
      return;
    }

    setIsGenerating(true);
    toast.info("AI is applying the selected patterns to the furniture parts...");

    try {
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
            patternAssignments: patternAssignments.map((pa: PartPatternAssignment) => ({
              partName: pa.part.name,
              partMaterial: pa.part.material,
              patternName: pa.targetPattern.name,
              patternDescription: pa.targetPattern.description,
              patternImageUrl: pa.targetPattern.imageUrl,
            })),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate");
      }

      const result = await response.json();
      
      if (result.error) {
        if (result.analysis) {
          toast.info("AI analyzed your request but couldn't generate an image directly.");
          console.log("AI Analysis:", result.analysis);
        }
        throw new Error(result.error);
      }

      if (result.output) {
        setGeneratedImage(result.output);
        toast.success("Furniture customization complete!");
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Sidebar - Pattern Palette */}
        <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-border bg-card/30 shrink-0 max-h-64 lg:max-h-none overflow-auto lg:overflow-visible">
          <PatternPalette
            selectedPattern={selectedPattern}
            onPatternSelect={handlePatternSelect}
          />
        </aside>

        {/* Main Content - Upload Area or Part Selector */}
        <div className="flex-1 flex flex-col min-h-0">
          <WorkflowSteps currentStep={getCurrentStep()} />

          <div className="flex-1 p-4 lg:p-8 overflow-auto">
            <div className="h-full panel p-6">
              {uploadedImage ? (
                <PartSelector
                  ref={partSelectorRef}
                  imageUrl={uploadedImage}
                  selectedPattern={selectedPattern}
                  onSelectionChange={handleSelectionChange}
                />
              ) : (
                <ImageUploader
                  uploadedImage={uploadedImage}
                  onImageUpload={handleImageUpload}
                  onImageClear={handleImageClear}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Preview & Export */}
        <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border bg-card/30 shrink-0">
          <PreviewPanel
            originalImage={uploadedImage}
            generatedImage={generatedImage}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
            canGenerate={canGenerate}
            onClearImage={handleImageClear}
          />
        </aside>
      </main>
    </div>
  );
};

export default Index;
