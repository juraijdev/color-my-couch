import { useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface ColorOption {
  id: string;
  name: string;
  hex: string;
}

export interface ColorCategory {
  id: string;
  name: string;
  colors: ColorOption[];
}

const colorCategories: ColorCategory[] = [
  {
    id: "wood",
    name: "Wood Finishes",
    colors: [
      { id: "w1", name: "Ebony Black", hex: "#1C1C1C" },
      { id: "w2", name: "Dark Walnut", hex: "#4A3728" },
      { id: "w3", name: "Classic Teak", hex: "#B8860B" },
      { id: "w4", name: "Natural Oak", hex: "#C4A35A" },
      { id: "w5", name: "Golden Maple", hex: "#D4A574" },
      { id: "w6", name: "Light Birch", hex: "#E8D4A8" },
    ],
  },
  {
    id: "metal",
    name: "Metal Finishes",
    colors: [
      { id: "m1", name: "Matte Black", hex: "#2D2D2D" },
      { id: "m2", name: "Gunmetal Gray", hex: "#4A4A4A" },
      { id: "m3", name: "Brushed Steel", hex: "#8B8B8B" },
      { id: "m4", name: "Rose Gold", hex: "#B76E79" },
      { id: "m5", name: "Champagne Gold", hex: "#D4AF37" },
      { id: "m6", name: "Chrome Silver", hex: "#C0C0C0" },
    ],
  },
  {
    id: "fabric",
    name: "Fabric Colors",
    colors: [
      { id: "f1", name: "Midnight Navy", hex: "#1B2951" },
      { id: "f2", name: "Forest Green", hex: "#228B22" },
      { id: "f3", name: "Burgundy Wine", hex: "#722F37" },
      { id: "f4", name: "Caramel Brown", hex: "#8B4513" },
      { id: "f5", name: "Dusty Rose", hex: "#DCAE96" },
      { id: "f6", name: "Ivory Cream", hex: "#FFFFF0" },
    ],
  },
  {
    id: "leather",
    name: "Leather Tones",
    colors: [
      { id: "l1", name: "Jet Black", hex: "#0A0A0A" },
      { id: "l2", name: "Cognac", hex: "#9A463D" },
      { id: "l3", name: "Saddle Brown", hex: "#8B4513" },
      { id: "l4", name: "Tan", hex: "#D2B48C" },
      { id: "l5", name: "White Leather", hex: "#F5F5F5" },
      { id: "l6", name: "Navy Blue", hex: "#1F3A5F" },
    ],
  },
];

interface ColorPaletteProps {
  selectedColor: ColorOption | null;
  onColorSelect: (color: ColorOption) => void;
}

export function ColorPalette({ selectedColor, onColorSelect }: ColorPaletteProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    colorCategories.map((c) => c.id)
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const filteredCategories = colorCategories
    .map((category) => ({
      ...category,
      colors: category.colors.filter((color) =>
        color.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.colors.length > 0);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Color Palette
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search colors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary border-border focus:border-primary"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {filteredCategories.map((category) => (
          <div key={category.id} className="space-y-2">
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center justify-between text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              <span className="flex items-center gap-2">
                {category.name}
                <span className="text-xs text-muted-foreground">
                  ({category.colors.length})
                </span>
              </span>
              {expandedCategories.includes(category.id) ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {expandedCategories.includes(category.id) && (
              <div className="grid grid-cols-4 gap-2 animate-fade-in">
                {category.colors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => onColorSelect(color)}
                    className={`color-swatch group relative ${
                      selectedColor?.id === color.id ? "selected" : ""
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  >
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-xs text-muted-foreground">
                      {color.name}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedColor && (
        <div className="p-4 border-t border-border bg-secondary/50">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg border border-border"
              style={{ backgroundColor: selectedColor.hex }}
            />
            <div>
              <p className="text-sm font-medium">{selectedColor.name}</p>
              <p className="text-xs text-muted-foreground uppercase">
                {selectedColor.hex}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
