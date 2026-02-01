import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload, ImagePlus, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UploadAreaProps {
  onImageUpload: (imageDataUrl: string) => void;
}

export function UploadArea({ onImageUpload }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      processFile(file);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onImageUpload(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      {/* Welcome message */}
      <div className="text-center mb-8 max-w-lg">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          AI-Powered Furniture Customization
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Transform Your Furniture
        </h1>
        <p className="text-muted-foreground text-lg">
          Upload a photo and our AI will help you visualize different materials and finishes
        </p>
      </div>

      {/* Upload zone */}
      <div
        className={cn(
          "w-full max-w-2xl rounded-2xl border-2 border-dashed p-8 sm:p-12 transition-all duration-300 cursor-pointer",
          isDragging 
            ? "border-primary bg-primary/5 shadow-[0_0_30px_hsl(var(--primary)/0.3)]" 
            : "border-border bg-card/50 hover:border-primary/50 hover:bg-card"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-6">
          <div className={cn(
            "w-20 h-20 rounded-2xl flex items-center justify-center transition-all",
            isDragging ? "bg-primary text-primary-foreground" : "bg-secondary"
          )}>
            {isDragging ? (
              <ImagePlus className="w-10 h-10" />
            ) : (
              <Upload className="w-10 h-10 text-primary" />
            )}
          </div>

          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">
              {isDragging ? "Drop your image here" : "Drag & drop your furniture image"}
            </h3>
            <p className="text-muted-foreground">
              or <span className="text-primary font-medium">browse files</span> • PNG, JPG up to 10MB
            </p>
          </div>

          <Button variant="glow" size="lg" className="mt-2">
            <Upload className="w-5 h-5 mr-2" />
            Choose Image
          </Button>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-12 w-full max-w-3xl">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-center mb-6">
          How it works
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: 1, title: "Upload Photo", desc: "Take or upload a photo of your furniture" },
            { step: 2, title: "Select Materials", desc: "Choose patterns for different parts" },
            { step: 3, title: "Generate", desc: "AI creates your customized design" },
          ].map((item, i) => (
            <div 
              key={item.step}
              className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="font-bold text-primary">{item.step}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              {i < 2 && (
                <ArrowRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
