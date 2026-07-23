import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Wand2, Check, X, Loader2, Image as ImageIcon, BookmarkPlus, ShieldCheck } from "lucide-react";
import { FurnitureEditor, FurnitureEditorRef, FurniturePart, PartPatternAssignment } from "@/components/FurnitureEditor";
import { PatternGrid } from "@/components/PatternGrid";
import { GeneratePanel } from "@/components/GeneratePanel";
import { PatternOption, patternCategories } from "@/components/PatternPalette";
import { UploadArea } from "@/components/UploadArea";
import { StepIndicator } from "@/components/StepIndicator";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { containImageInTransparentCanvas, flattenToWhiteBackground, forceEdgeBackgroundToWhite, getImageDimensions, imageUrlToBase64, tightCropToWhiteCanvas } from "@/lib/imageUtils";
import { hashImage } from "@/lib/imageHash";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Suggestion {
  partId: string;
  patternId: string;
  reason: string;
}

export default function Customize() {
  const [searchParams] = useSearchParams();
  const isSuggestMode = searchParams.get("mode") === "suggest";
  const { user } = useAuth();

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageHash, setUploadedImageHash] = useState<string | null>(null);
  const [preloadedParts, setPreloadedParts] = useState<FurniturePart[] | null>(null);
  const [savedName, setSavedName] = useState("");
  const [savedRenderingUrl, setSavedRenderingUrl] = useState<string | null>(null);

  const [selectedPattern, setSelectedPattern] = useState<PatternOption | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const furnitureEditorRef = useRef<FurnitureEditorRef>(null);

  // Multi-furniture: track all customized furniture images
  const [allFurnitureImages, setAllFurnitureImages] = useState<string[]>([]);

  // Suggest-color flow state
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [detectedParts, setDetectedParts] = useState<FurniturePart[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [suggestionMeta, setSuggestionMeta] = useState<{ palette: string; rationale: string } | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionsApplied, setSuggestionsApplied] = useState(false);
  const [autoOpenPlacerAfterGen, setAutoOpenPlacerAfterGen] = useState(false);

  // Flat list of every pattern across categories for lookups
  const allPatterns = useMemo<PatternOption[]>(
    () => patternCategories.flatMap((c) => c.patterns),
    [],
  );
  const patternsById = useMemo(() => {
    const m = new Map<string, PatternOption>();
    allPatterns.forEach((p) => m.set(p.id, p));
    return m;
  }, [allPatterns]);

  const getCurrentStep = (): 1 | 2 | 3 => {
    if (!uploadedImage) return 1;
    if (!hasSelection) return 2;
    return 3;
  };

  const handleImageUpload = useCallback(async (imageDataUrl: string) => {
    setUploadedImage(imageDataUrl);
    setGeneratedImage(null);
    setHasSelection(false);
    setDetectedParts([]);
    setSuggestions(null);
    setSuggestionsApplied(false);
    setPreloadedParts(null);
    setSavedName("");
    setSavedRenderingUrl(null);

    try {
      const hash = await hashImage(imageDataUrl);
      setUploadedImageHash(hash);
      const { data } = await supabase
        .from("saved_furniture")
        .select("name,parts,rendering_url")
        .eq("image_hash", hash)
        .maybeSingle();
      if (data?.parts && Array.isArray(data.parts) && data.parts.length > 0) {
        setPreloadedParts(data.parts as unknown as FurniturePart[]);
        setSavedName(data.name);
        const rendering = (data as { rendering_url?: string | null }).rendering_url ?? null;
        setSavedRenderingUrl(rendering);
        if (rendering) {
          toast.success(`Verified furniture "${data.name}" — saved design available`);
        } else {
          toast.success(`Verified furniture recognized: "${data.name}"`);
        }
        return;
      }
    } catch (e) {
      console.warn("hash lookup failed", e);
    }
    toast.success("Image uploaded! AI is analyzing the furniture parts...");
  }, []);

  const handleImageClear = useCallback(() => {
    setUploadedImage(null);
    setUploadedImageHash(null);
    setPreloadedParts(null);
    setSavedName("");
    setSavedRenderingUrl(null);
    setGeneratedImage(null);
    setSelectedPattern(null);
    setHasSelection(false);
    setDetectedParts([]);
    setSuggestions(null);
    setSuggestionsApplied(false);
  }, []);

  const handleUseSavedRendering = useCallback(() => {
    if (!savedRenderingUrl) return;
    setGeneratedImage(savedRenderingUrl);
    setAllFurnitureImages((prev) => (prev.includes(savedRenderingUrl) ? prev : [...prev, savedRenderingUrl]));
    toast.success("Loaded the saved verified design — no re-generation needed.");
  }, [savedRenderingUrl]);

  const handleSaveVerified = useCallback(async () => {
    if (!user || !uploadedImage || !uploadedImageHash || detectedParts.length === 0) {
      toast.error("Sign in and upload a furniture image first.");
      return;
    }
    const name = savedName.trim() || `Furniture ${new Date().toLocaleDateString()}`;
    const assignments = furnitureEditorRef.current?.getPatternAssignments() ?? [];
    const assignmentsPayload = assignments.map((pa) => ({
      partId: pa.part.id,
      partName: pa.part.name,
      patternId: pa.targetPattern.id,
      patternName: pa.targetPattern.name,
    }));
    const { error } = await supabase.from("saved_furniture").upsert(
      [{
        image_hash: uploadedImageHash,
        image_url: uploadedImage,
        name,
        parts: JSON.parse(JSON.stringify(detectedParts)),
        created_by: user.id,
        rendering_url: generatedImage ?? null,
        assignments: assignmentsPayload,
      }],
      { onConflict: "image_hash" },
    );
    if (error) toast.error(error.message);
    else {
      if (generatedImage) setSavedRenderingUrl(generatedImage);
      toast.success(generatedImage
        ? `Saved "${name}" with rendering — reusable next time`
        : `Saved "${name}" to the verified library`);
    }
  }, [user, uploadedImage, uploadedImageHash, detectedParts, savedName, generatedImage]);


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
    setDetectedParts([]);
    setSuggestions(null);
    setSuggestionsApplied(false);
    toast.info("Upload another furniture to customize. All pieces will be placed together.");
  }, [generatedImage, allFurnitureImages]);

  const handleRemoveFurniture = useCallback((index: number) => {
    setAllFurnitureImages((prev) => {
      const removed = prev[index];
      const next = prev.filter((_, i) => i !== index);
      if (removed && removed === generatedImage) {
        setGeneratedImage(next[next.length - 1] ?? null);
      }
      return next;
    });
  }, [generatedImage]);

  // ---- Suggest Colors: when parts detected in suggest mode, ask AI for a palette ----
  const handlePartsDetected = useCallback(
    async (parts: FurniturePart[]) => {
      setDetectedParts(parts);
      if (!isSuggestMode || !backgroundImage || parts.length === 0) return;
      setIsSuggesting(true);
      setSuggestions(null);
      setSuggestionsApplied(false);
      toast.info("AI is choosing colors that match your room...");
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suggest-colors`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              backgroundImage,
              parts: parts
                .filter((p) => !/(wheel|caster|castor|roller|tyre|tire)/i.test(`${p.name} ${p.material} ${p.description ?? ""}`))
                .map((p) => ({
                  id: p.id,
                  name: p.name,
                  material: p.material,
                  currentColor: p.currentColor,
                  description: p.description,
                })),
              availablePatterns: patternCategories.flatMap((cat) =>
                cat.patterns.map((p) => ({
                  id: p.id,
                  code: p.code,
                  name: p.name,
                  description: p.description,
                  category: cat.name,
                })),
              ),
            }),
          },
        );
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || "Failed to get suggestions");
        }
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setSuggestionMeta({ palette: data.palette ?? "", rationale: data.rationale ?? "" });
        toast.success("AI color suggestion ready!");
      } catch (e) {
        console.error(e);
        toast.error(e instanceof Error ? e.message : "Couldn't generate suggestions");
      } finally {
        setIsSuggesting(false);
      }
    },
    [isSuggestMode, backgroundImage],
  );

  const isNonColorablePart = useCallback((p: { name?: string; material?: string; description?: string }) => {
    const hay = `${p.name ?? ""} ${p.material ?? ""} ${p.description ?? ""}`.toLowerCase();
    return /(wheel|caster|castor|roller|tyre|tire)/.test(hay);
  }, []);

  const acceptSuggestions = useCallback(() => {
    if (!suggestions || !furnitureEditorRef.current) return;
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const partsById = new Map(detectedParts.map((p) => [p.id, p]));
    const partsByNorm = new Map(detectedParts.map((p) => [norm(p.id + p.name), p]));
    const partsByName = new Map(detectedParts.map((p) => [norm(p.name), p]));
    const patternsByNorm = new Map(allPatterns.map((p) => [norm(p.id), p]));
    const patternsByCode = new Map(allPatterns.filter((p) => p.code).map((p) => [norm(p.code!), p]));
    const patternsByName = new Map(allPatterns.map((p) => [norm(p.name), p]));

    const entries: Array<{ partId: string; pattern: PatternOption }> = [];
    suggestions.forEach((s) => {
      const part =
        partsById.get(s.partId) ||
        partsByNorm.get(norm(s.partId)) ||
        partsByName.get(norm(s.partId));
      const pattern =
        patternsById.get(s.patternId) ||
        patternsByNorm.get(norm(s.patternId)) ||
        patternsByCode.get(norm(s.patternId)) ||
        patternsByName.get(norm(s.patternId));
      if (part && pattern && !isNonColorablePart(part)) {
        entries.push({ partId: part.id, pattern });
      } else {
        console.warn("Suggestion skipped:", s, { part: part?.name, pattern: pattern?.name });
      }
    });

    const applied = furnitureEditorRef.current.assignPatternsBulk(entries);
    if (applied === 0) {
      toast.error("No suggested patterns matched the palette.");
      return;
    }
    setSuggestionsApplied(true);
    setAutoOpenPlacerAfterGen(true);
    toast.success(`Applied ${applied}/${suggestions.length} suggested colors. Generating design...`);
    setTimeout(() => {
      handleGenerate();
    }, 150);
  }, [suggestions, patternsById, detectedParts, allPatterns, isNonColorablePart]);

  const denySuggestions = useCallback(() => {
    setSuggestions(null);
    setSuggestionsApplied(false);
    toast.info("Pick your own colors per part below.");
  }, []);

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
      const sourceDimensions = await getImageDimensions(uploadedImage);
      const assignmentsWithBase64 = await Promise.all(
        patternAssignments.map(async (pa: PartPatternAssignment) => ({
          partName: pa.part.name,
          partMaterial: pa.part.material,
          partDescription: pa.part.description,
          partLocation: pa.part.location,
          patternName: pa.targetPattern.name,
          patternDescription: pa.targetPattern.description,
          patternImageUrl: await imageUrlToBase64(pa.targetPattern.imageUrl),
        })),
      );

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recolor-furniture`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            image: uploadedImage,
            patternAssignments: assignmentsWithBase64,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate");
      }

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      if (result.output) {
        let finalImage: string = result.output;
        try {
          toast.info("Cleaning background to pure white...");
          const cleanupResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/remove-background`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({ image: finalImage }),
            },
          );

          if (cleanupResponse.ok) {
            const cleanupResult = await cleanupResponse.json();
            if (cleanupResult.output) finalImage = cleanupResult.output;
          } else {
            console.warn("White background cleanup failed:", await cleanupResponse.text());
          }
        } catch (cleanupErr) {
          console.warn("White background cleanup skipped:", cleanupErr);
        }

        try {
          toast.info("Preparing furniture on white background...");
          finalImage = await forceEdgeBackgroundToWhite(finalImage);
          const whiteReadyImage = await containImageInTransparentCanvas(
            finalImage,
            sourceDimensions.width,
            sourceDimensions.height,
            3200,
            "#ffffff",
          );
          finalImage = await flattenToWhiteBackground(whiteReadyImage);
        } catch (bgErr) {
          console.warn("White background preparation skipped:", bgErr);
          finalImage = await flattenToWhiteBackground(finalImage);
        }

        try {
          finalImage = await tightCropToWhiteCanvas(finalImage, 248, 0.015);
        } catch (cropErr) {
          console.warn("Tight crop skipped:", cropErr);
        }

        setGeneratedImage(finalImage);
        setAllFurnitureImages((prev) => {
          if (prev.includes(finalImage)) return prev;
          return [...prev, finalImage];
        });
        toast.success("Design generated successfully!");
        supabase.auth.getUser().then(({ data }) => {
          supabase.from("ai_usage_log").insert({
            user_id: data.user?.id,
            feature: "recolor-furniture",
            model: "gemini-3-pro-image",
            status: "success",
            metadata: { parts: patternAssignments.length },
          });
        });
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

  // -------------- Suggest mode: background upload step --------------
  if (isSuggestMode && !backgroundImage) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="max-w-2xl w-full text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
              <Wand2 className="w-3.5 h-3.5" /> Suggest Colors from Room
            </div>
            <h1 className="font-display text-3xl font-bold mb-2">Step 1 · Upload your room background</h1>
            <p className="text-muted-foreground">
              We'll analyze the room and recommend furniture finishes that match.
            </p>
          </div>
          <div className="w-full max-w-3xl">
            <UploadArea onImageUpload={(img) => setBackgroundImage(img)} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      <StepIndicator
        currentStep={getCurrentStep()}
        hasImage={Boolean(uploadedImage)}
        hasPatternAssigned={hasSelection}
      />

      {/* Suggest mode banner */}
      {isSuggestMode && backgroundImage && (
        <div className="px-4 lg:px-6 py-3 border-b border-border bg-primary/5 flex items-center gap-3">
          <div className="w-14 h-14 rounded-lg border border-border overflow-hidden shrink-0">
            <img src={backgroundImage} alt="Room background" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wider text-primary font-semibold">Background loaded</p>
            <p className="text-sm text-muted-foreground truncate">
              {uploadedImage
                ? "Furniture detected — AI is suggesting matching colors."
                : "Now upload the furniture you want to style."}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setBackgroundImage(null)}>
            <X className="w-4 h-4 mr-1" /> Change
          </Button>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        {!uploadedImage ? (
          <div className="flex-1 overflow-auto">
            {isSuggestMode && (
              <div className="max-w-2xl mx-auto pt-8 text-center">
                <h2 className="font-display text-2xl font-bold mb-1">Step 2 · Upload your furniture</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  We'll detect the parts and recommend a palette based on your room.
                </p>
              </div>
            )}
            <UploadArea onImageUpload={handleImageUpload} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <FurnitureEditor
                ref={furnitureEditorRef}
                imageUrl={uploadedImage}
                selectedPattern={selectedPattern}
                onSelectionChange={handleSelectionChange}
                onBack={handleImageClear}
                onPartsDetected={handlePartsDetected}
                preloadedParts={preloadedParts}
              />
              {savedName && (
                <div className="shrink-0 px-4 py-2 bg-primary/5 border-t border-border text-xs flex items-center gap-2 flex-wrap">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span>Verified furniture: <strong>{savedName}</strong></span>
                  {savedRenderingUrl && (
                    <Button size="sm" variant="outline" className="ml-auto h-7" onClick={handleUseSavedRendering}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Use saved design
                    </Button>
                  )}
                </div>
              )}
              {user && detectedParts.length > 0 && (
                <div className="shrink-0 p-3 border-t border-border bg-card flex items-center gap-2">
                  <Input
                    value={savedName}
                    onChange={(e) => setSavedName(e.target.value)}
                    placeholder="Name this furniture (e.g. Buffet 120cm)"
                    className="h-9 text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={handleSaveVerified} title={generatedImage ? "Save furniture + this rendering so it can be reused next time" : "Save the analyzed parts so next time this furniture is recognized instantly"}>
                    <BookmarkPlus className="w-4 h-4 mr-1" />
                    {generatedImage ? "Save design" : "Save furniture"}
                  </Button>
                </div>
              )}

            </div>


            <div className="w-full lg:w-[420px] xl:w-[480px] border-t lg:border-t-0 lg:border-l border-border flex flex-col overflow-hidden bg-card/50">
              {/* Suggestions panel */}
              {isSuggestMode && (isSuggesting || (suggestions && !suggestionsApplied)) && (
                <div className="shrink-0 p-4 border-b border-border bg-primary/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Wand2 className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm">AI Color Suggestion</h3>
                  </div>
                  {isSuggesting ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Choosing colors that match the room...
                    </div>
                  ) : suggestions && suggestions.length > 0 ? (
                    <>
                      {suggestionMeta?.palette && (
                        <p className="text-xs text-primary font-medium mb-1">
                          Palette: {suggestionMeta.palette}
                        </p>
                      )}
                      {suggestionMeta?.rationale && (
                        <p className="text-xs text-muted-foreground mb-3 leading-snug">
                          {suggestionMeta.rationale}
                        </p>
                      )}
                      <div className="space-y-1.5 max-h-48 overflow-y-auto mb-3">
                        {suggestions.map((s) => {
                          const part = detectedParts.find((p) => p.id === s.partId);
                          const pattern = patternsById.get(s.patternId);
                          if (!part || !pattern) return null;
                          return (
                            <div
                              key={s.partId}
                              className="flex items-center gap-2 text-xs p-1.5 rounded bg-card border border-border"
                            >
                              <div className="w-7 h-7 rounded border border-border overflow-hidden shrink-0">
                                <img src={pattern.imageUrl} alt={pattern.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{part.name}</div>
                                <div className="text-muted-foreground truncate">
                                  → {pattern.code ? `${pattern.code} · ` : ""}{pattern.name}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={acceptSuggestions}
                          disabled={isGenerating}
                        >
                          <Check className="w-4 h-4 mr-1" /> Use these colors
                        </Button>
                        <Button size="sm" variant="outline" onClick={denySuggestions}>
                          Pick manually
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground py-2">
                      No suggestions returned. Pick colors manually below.
                    </p>
                  )}
                </div>
              )}

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
                  onRemoveFurniture={handleRemoveFurniture}
                  initialBackgroundImage={backgroundImage}
                  autoOpenPlacer={autoOpenPlacerAfterGen}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
