import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { ColorPalette, ColorOption } from "@/components/ColorPalette";
import { ImageUploader } from "@/components/ImageUploader";
import { ClickSelector, ClickSelectorRef } from "@/components/ClickSelector";
import { PreviewPanel } from "@/components/PreviewPanel";
import { WorkflowSteps } from "@/components/WorkflowSteps";

const Index = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<ColorOption | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const clickSelectorRef = useRef<ClickSelectorRef>(null);

  const getCurrentStep = (): 1 | 2 | 3 => {
    if (!uploadedImage) return 1;
    if (!hasSelection || !selectedColor) return 2;
    return 3;
  };

  const handleImageUpload = useCallback((imageDataUrl: string) => {
    setUploadedImage(imageDataUrl);
    setGeneratedImage(null);
    setHasSelection(false);
    toast.success("Image uploaded! Click on furniture parts to select them.");
  }, []);

  const handleImageClear = useCallback(() => {
    setUploadedImage(null);
    setGeneratedImage(null);
    setSelectedColor(null);
    setHasSelection(false);
  }, []);

  const handleColorSelect = useCallback((color: ColorOption) => {
    setSelectedColor(color);
    toast.info(`Selected: ${color.name}`);
  }, []);

  const handleSelectionChange = useCallback((hasSelection: boolean) => {
    setHasSelection(hasSelection);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!uploadedImage || !selectedColor) {
      toast.error("Please upload an image and select a color first");
      return;
    }

    // Get the mask from the click selector
    const maskUrl = clickSelectorRef.current?.getMaskDataUrl();
    const hasMask = clickSelectorRef.current?.hasMask();

    if (!hasMask || !maskUrl) {
      toast.error("Please click on the furniture parts you want to recolor");
      return;
    }

    setIsGenerating(true);
    toast.info("AI is recoloring the selected areas...");

    try {
      // The mask from SAM-2 is a URL, we need to fetch it and convert to base64
      // Or pass it directly if the recolor function accepts URLs
      let maskDataUrl = maskUrl;
      
      // If the mask is a URL (not base64), fetch and convert it
      if (maskUrl.startsWith("http")) {
        const maskResponse = await fetch(maskUrl);
        const maskBlob = await maskResponse.blob();
        maskDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(maskBlob);
        });
      }

      // Call the Replicate edge function with image and mask
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
            mask: maskDataUrl,
            colorName: selectedColor.name,
            colorHex: selectedColor.hex,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start generation");
      }

      const prediction = await response.json();
      console.log("Prediction started:", prediction.id);

      // Poll for completion
      let result = prediction;
      while (result.status !== "succeeded" && result.status !== "failed") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        const statusResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recolor-furniture`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ predictionId: prediction.id }),
          }
        );

        if (!statusResponse.ok) {
          throw new Error("Failed to check generation status");
        }

        result = await statusResponse.json();
        console.log("Prediction status:", result.status);
      }

      if (result.status === "failed") {
        throw new Error(result.error || "Generation failed");
      }

      // Get the output image URL
      const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
      
      if (!outputUrl) {
        throw new Error("No output image received");
      }

      setGeneratedImage(outputUrl);
      toast.success("Furniture recoloring complete!");
    } catch (error) {
      console.error("Generation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [uploadedImage, selectedColor]);

  const canGenerate = Boolean(uploadedImage && selectedColor && hasSelection && !isGenerating);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Sidebar - Color Palette */}
        <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-border bg-card/30 shrink-0 max-h-64 lg:max-h-none overflow-auto lg:overflow-visible">
          <ColorPalette
            selectedColor={selectedColor}
            onColorSelect={handleColorSelect}
          />
        </aside>

        {/* Main Content - Upload Area or Click Selector */}
        <div className="flex-1 flex flex-col min-h-0">
          <WorkflowSteps currentStep={getCurrentStep()} />

          <div className="flex-1 p-4 lg:p-8 overflow-auto">
            <div className="h-full panel p-6">
              {uploadedImage ? (
                <ClickSelector
                  ref={clickSelectorRef}
                  imageUrl={uploadedImage}
                  selectedColor={selectedColor?.hex || null}
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
