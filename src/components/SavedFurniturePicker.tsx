import { useCallback, useEffect, useState } from "react";
import { BookMarked, ChevronDown, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import type { FurniturePart } from "@/components/FurnitureEditor";

export interface SavedFurnitureRow {
  id: string;
  name: string;
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
        <div className="flex items-center justify-between px-1 pb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Saved furniture
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load} title="Refresh">
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
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-1">
            {rows.map((row) => (
              <button
                key={row.id}
                onClick={() => {
                  onSelect(row);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted text-left transition-colors"
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
                    {Array.isArray(row.parts) ? row.parts.length : 0} parts
                    {row.rendering_url ? " · rendering saved" : ""}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
