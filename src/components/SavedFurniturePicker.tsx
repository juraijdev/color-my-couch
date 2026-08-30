import { useCallback, useEffect, useMemo, useState } from "react";
import { BookMarked, Check, ChevronDown, ChevronLeft, ChevronRight, Download, Folder, Loader2, Pencil, RefreshCw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
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
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<SavedFurnitureRow[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [busy, setBusy] = useState(false);

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

  // ---------- admin actions ----------
  const renameDesign = async (row: SavedFurnitureRow) => {
    const name = editValue.trim();
    if (!name || name === row.name) {
      setEditingId(null);
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("saved_furniture").update({ name }).eq("id", row.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, name } : r)));
    setEditingId(null);
    toast.success("Design renamed");
  };

  const deleteDesign = async (row: SavedFurnitureRow) => {
    if (!window.confirm(`Delete "${row.name}"? This cannot be undone.`)) return;
    setBusy(true);
    const { error } = await supabase.from("saved_furniture").delete().eq("id", row.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    toast.success("Design deleted");
  };

  const renameCategory = async (oldName: string) => {
    const name = editValue.trim();
    if (!name || name === oldName) {
      setEditingCategory(null);
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("saved_furniture").update({ category: name }).eq("category", oldName);
    setBusy(false);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.map((r) => ((r.category ?? "Uncategorized") === oldName ? { ...r, category: name } : r)));
    setEditingCategory(null);
    toast.success("Category renamed");
  };

  const startEditDesign = (row: SavedFurnitureRow) => {
    setEditingId(row.id);
    setEditValue(row.name);
  };

  const startEditCategory = (cat: string) => {
    setEditingCategory(cat);
    setEditValue(cat);
  };

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
            editingCategory === activeCategory ? (
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="h-7 text-xs"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") renameCategory(activeCategory);
                    if (e.key === "Escape") setEditingCategory(null);
                  }}
                />
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" disabled={busy}
                  onClick={() => renameCategory(activeCategory)} title="Save category name">
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                  onClick={() => setEditingCategory(null)} title="Cancel">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setActiveCategory(null)}
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground min-w-0"
              >
                <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{activeCategory}</span>
              </button>
            )
          ) : (
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Categories
            </span>
          )}
          <div className="flex items-center shrink-0">
            {isAdmin && activeCategory && editingCategory !== activeCategory && (
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Rename category"
                onClick={() => startEditCategory(activeCategory)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load} title="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
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
                        {editingId === row.id ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-7 text-xs"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") renameDesign(row);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                            />
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" disabled={busy}
                              onClick={() => renameDesign(row)} title="Save name">
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                              onClick={() => setEditingId(null)} title="Cancel">
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="text-sm font-medium truncate">{row.name}</div>
                        )}
                        <div className="text-xs text-muted-foreground truncate">
                          {parts.length} parts
                          {row.rendering_url ? " · rendering saved" : ""}
                        </div>
                      </div>
                    </button>
                    {isAdmin && editingId !== row.id && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          title="Rename design"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditDesign(row);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                          title="Delete design"
                          disabled={busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDesign(row);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
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
