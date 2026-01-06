import { useState } from "react";
import { Download, Save, Loader2, ImageIcon, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PreviewPanelProps {
  originalImage: string | null;
  generatedImage: string | null;
  isGenerating: boolean;
  onGenerate: () => void;
  canGenerate: boolean;
  onClearImage?: () => void;
}

export function PreviewPanel({
  originalImage,
  generatedImage,
  isGenerating,
  onGenerate,
  canGenerate,
  onClearImage,
}: PreviewPanelProps) {
  const [fileName, setFileName] = useState("customized-furniture");
  const [format, setFormat] = useState("png");
  const [resolution, setResolution] = useState("1x");

  const handleDownload = () => {
    if (!generatedImage) return;

    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `${fileName}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Preview & Export
        </h2>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4">
        {/* Preview Area */}
        <div className="flex-1 panel p-4 flex items-center justify-center min-h-[300px]">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-4 animate-pulse">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-display font-semibold">AI is transforming...</p>
                <p className="text-sm text-muted-foreground">
                  This may take 20-40 seconds
                </p>
              </div>
            </div>
          ) : generatedImage ? (
            <img
              src={generatedImage}
              alt="Generated preview"
              className="max-w-full max-h-full object-contain rounded-lg animate-scale-in"
            />
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg">
                  Your AI Design Will Appear Here
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload an image and select a color to generate
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <button
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating}
          className="btn-generate flex items-center justify-center gap-2 w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Design
            </>
          )}
        </button>

        {/* Export Settings */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Export Settings
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                File Name
              </label>
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Format
                </label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="jpg">JPG</SelectItem>
                    <SelectItem value="webp">WebP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Resolution
                </label>
                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1x">Original (1x)</SelectItem>
                    <SelectItem value="2x">High (2x)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              className="w-full"
              variant="default"
              disabled={!generatedImage}
              onClick={handleDownload}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Image
            </Button>

            <Button
              className="w-full"
              variant="outline"
              disabled={!generatedImage}
            >
              <Save className="w-4 h-4 mr-2" />
              Save to Gallery
            </Button>

            {onClearImage && originalImage && (
              <Button
                className="w-full"
                variant="ghost"
                onClick={onClearImage}
              >
                <X className="w-4 h-4 mr-2" />
                New Image
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
