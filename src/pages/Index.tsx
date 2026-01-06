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
    toast.info("Generating your customized furniture...");

    // Simulate AI generation for now (will be replaced with Replicate API)
    try {
      // For demo purposes, we'll use the original image with a color overlay simulation
      // This will be replaced with actual Replicate API call
      await new Promise((resolve) => setTimeout(resolve, 3000));
      
      // Create a canvas to apply a simple color tint for demo
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = uploadedImage;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (!ctx) throw new Error("Could not get canvas context");
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Apply color overlay with multiply blend mode
      ctx.globalCompositeOperation = "color";
      ctx.fillStyle = selectedColor.hex;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Reset composite operation
      ctx.globalCompositeOperation = "source-over";
      
      const resultDataUrl = canvas.toDataURL("image/png");
      setGeneratedImage(resultDataUrl);
      toast.success("Furniture customization complete!");
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Failed to generate. Please try again.");
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
