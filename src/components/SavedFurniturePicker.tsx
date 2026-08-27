import { useCallback, useEffect, useMemo, useState } from "react";
import { BookMarked, ChevronDown, ChevronLeft, ChevronRight, Download, Folder, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { patternCategories } from "@/components/PatternPalette";
import type { FurniturePart } from "@/components/FurnitureEditor";


export interface SavedFurnitureRow {
  id: string;
  name: string;
  category?: string | null;
  image_hash: string;
  image_url: string;
  rendering_url?: string | null;
  parts: FurniturePart[];
  assignments?: Array<{ partId: string; patternId: string }> | null;
  created_at?: string;
}

interface Props {
  onSelect: (row: SavedFurnitureRow) => void;
}

export function SavedFurniturePicker({ onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<SavedFurnitureRow[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const patternById = useMemo(() => {
    const map = new Map<string, { name: string; code?: string; imageUrl: string }>();
    patternCategories.forEach((c) =>
      c.patterns.forEach((p) => map.set(p.id, { name: p.name, code: p.code, imageUrl: p.imageUrl })),
    );
    return map;
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, SavedFurnitureRow[]>();
    rows.forEach((r) => {
      const cat = (r.category ?? "").trim() || "Uncategorized";
      const list = map.get(cat) ?? [];
      list.push(r);
      map.set(cat, list);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const visibleRows = useMemo(
    () => (activeCategory ? grouped.find(([c]) => c === activeCategory)?.[1] ?? [] : []),
    [grouped, activeCategory],
  );


  const downloadRow = useCallback(async (row: SavedFurnitureRow) => {
    const url = row.rendering_url || row.image_url;
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${row.name.replace(/[^\w\-]+/g, "_") || "design"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch {
      window.open(url, "_blank");
    }
  }, []);



  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_furniture")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) {
      console.warn("Saved furniture list unavailable:", error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as unknown as SavedFurnitureRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <BookMarked className="w-4 h-4 mr-2" />
          Saved designs
          {rows.length > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">({rows.length})</span>
          )}
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[340px] p-2">
        <div className="flex items-center justify-between px-1 pb-2 gap-1">
          {activeCategory ? (
            <button
              onClick={() => setActiveCategory(null)}
              className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground min-w-0"
            >
              <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{activeCategory}</span>
            </button>
          ) : (
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Categories
            </span>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={load} title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No saved furniture yet. Customize a piece and press “Save design”.
          </p>
        ) : !activeCategory ? (
          <div className="max-h-96 overflow-y-auto space-y-1">
            {grouped.map(([category, items]) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className="w-full flex items-center gap-3 rounded-lg p-2 hover:bg-muted transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-md border border-border overflow-hidden shrink-0 bg-white">
                  <img
                    src={items[0].rendering_url || items[0].image_url}
                    alt=""
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate flex items-center gap-1">
                    <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    {category}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {items.length} design{items.length > 1 ? "s" : ""}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-1">
            {visibleRows.map((row) => {
              const assignments = Array.isArray(row.assignments) ? row.assignments : [];

              const parts = Array.isArray(row.parts) ? row.parts : [];
              return (
                <div key={row.id} className="rounded-lg hover:bg-muted transition-colors p-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        onSelect(row);
                        setOpen(false);
                      }}
                      className="flex items-center gap-3 text-left min-w-0 flex-1"
                    >
                      <div className="w-14 h-14 rounded-md border border-border overflow-hidden shrink-0 bg-white">
                        <img
                          src={row.rendering_url || row.image_url}
                          alt={row.name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{row.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {parts.length} parts
                          {row.rendering_url ? " · rendering saved" : ""}
                        </div>
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      title="Download saved design"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadRow(row);
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>

                  {assignments.length > 0 && (
                    <ul className="mt-2 pl-1 space-y-1">
                      {assignments.map((a, i) => {
                        const pat = patternById.get(a.patternId);
                        const part = parts.find((p) => p.id === a.partId);
                        return (
                          <li key={`${a.partId}-${i}`} className="flex items-center gap-2 text-[11px]">
                            <span className="w-4 h-4 rounded border border-border overflow-hidden shrink-0 bg-muted">
                              {pat?.imageUrl && (
                                <img src={pat.imageUrl} alt="" className="w-full h-full object-cover" />
                              )}
                            </span>
                            <span className="truncate max-w-[110px] text-muted-foreground">
                              {part?.name ?? a.partId}
                            </span>
                            <span className="truncate font-medium">
                              {pat ? `${pat.code ? pat.code + " – " : ""}${pat.name}` : a.patternId}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

        )}
      </PopoverContent>
    </Popover>
  );
}
