import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { ColorPalette, ColorOption } from "@/components/ColorPalette";
import { ImageUploader } from "@/components/ImageUploader";
import { PreviewPanel } from "@/components/PreviewPanel";
import { WorkflowSteps } from "@/components/WorkflowSteps";

const Index = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<ColorOption | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const getCurrentStep = (): 1 | 2 | 3 => {
    if (!uploadedImage) return 1;
    if (!selectedColor) return 2;
    return 3;
  };

  const handleImageUpload = useCallback((imageDataUrl: string) => {
    setUploadedImage(imageDataUrl);
    setGeneratedImage(null);
    toast.success("Image uploaded successfully!");
  }, []);

  const handleImageClear = useCallback(() => {
    setUploadedImage(null);
    setGeneratedImage(null);
    setSelectedColor(null);
  }, []);

  const handleColorSelect = useCallback((color: ColorOption) => {
    setSelectedColor(color);
    toast.info(`Selected: ${color.name}`);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!uploadedImage || !selectedColor) {
      toast.error("Please upload an image and select a color first");
      return;
    }

    setIsGenerating(true);
    toast.info("AI is analyzing your furniture and applying the new color...");

    try {
      // Call the Replicate edge function
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

  const canGenerate = Boolean(uploadedImage && selectedColor && !isGenerating);

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

        {/* Main Content - Upload Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <WorkflowSteps currentStep={getCurrentStep()} />

          <div className="flex-1 p-4 lg:p-8 overflow-auto">
            <div className="h-full panel p-6">
              <ImageUploader
                uploadedImage={uploadedImage}
                onImageUpload={handleImageUpload}
                onImageClear={handleImageClear}
              />
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
          />
        </aside>
      </main>
    </div>
  );
};

export default Index;
