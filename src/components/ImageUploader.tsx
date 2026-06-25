import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploaderProps {
  uploadedImage: string | null;
  onImageUpload: (imageDataUrl: string) => void;
  onImageClear: () => void;
}

export function ImageUploader({
  uploadedImage,
  onImageUpload,
  onImageClear,
}: ImageUploaderProps) {
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
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      try {
        const { normalizeToRasterImage } = await import("@/lib/imageUtils");
        const safe = await normalizeToRasterImage(result);
        onImageUpload(safe);
      } catch (err) {
        console.error("Failed to normalize image:", err);
        onImageUpload(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  if (uploadedImage) {
    return (
      <div className="relative w-full h-full flex items-center justify-center p-4">
        <div className="relative max-w-full max-h-full">
          <img
            src={uploadedImage}
            alt="Uploaded furniture"
            className="max-w-full max-h-[500px] object-contain rounded-lg shadow-2xl animate-scale-in"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-3 -right-3 rounded-full shadow-lg"
            onClick={onImageClear}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`upload-zone flex flex-col items-center justify-center gap-6 cursor-pointer min-h-[400px] ${
        isDragging ? "drag-over" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center">
        <Upload className="w-8 h-8 text-primary" />
      </div>

      <div className="text-center">
        <h3 className="text-xl font-display font-semibold mb-2">
          Drag & Drop Furniture Image
        </h3>
        <p className="text-muted-foreground">
          or click to browse • JPG, PNG up to 10MB
        </p>
      </div>

      <div className="flex gap-4 mt-4">
        {["Sofa", "Chair", "Table", "Other"].map((type) => (
          <div
            key={type}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-secondary/50 transition-all cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
