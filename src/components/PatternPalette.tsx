import { useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

// Import pattern images - Stainless Steel
import SS02HairlineSS from "@/assets/patterns/SS02-Hairline-SS.jpg";
import SS03RoseGold from "@/assets/patterns/SS03-Rose-Gold.jpg";
import SS04Black from "@/assets/patterns/SS04-Black.jpg";
import SS12Gold from "@/assets/patterns/SS12-Gold.jpg";
import SS13Champagne from "@/assets/patterns/SS13-Champagne.jpg";
import SS25GoldBronze from "@/assets/patterns/SS25-Gold-Bronze.jpg";
import SS26RedBronze from "@/assets/patterns/SS26-Red-Bronze.jpg";
import SS27GreenBronze from "@/assets/patterns/SS27-Green-Bronze.jpg";

// Import pattern images - Powder Coat
import PC011White from "@/assets/patterns/PC011-White.jpg";
import PC038Gold from "@/assets/patterns/PC038-Gold.jpg";
import PC051Silver from "@/assets/patterns/PC051-Silver.jpg";
import PC053BrownGold from "@/assets/patterns/PC053-Brown-Gold.jpg";
import PC056Champagne from "@/assets/patterns/PC056-Champagne.jpg";
import PC058CrackBlack from "@/assets/patterns/PC058-Crack-Black.jpg";
import PC059MattBlack from "@/assets/patterns/PC059-Matt-Black.jpg";
import PP061Coffee from "@/assets/patterns/PP061-Coffee.jpg";

// Import pattern images - Wood Grain
import SQ52AliceWalnut from "@/assets/patterns/SQ52-Alice-Walnut.jpg";
import SQ53LincolnWalnut from "@/assets/patterns/SQ53-Lincoln-Walnut.jpg";
import SQ54SubtropicalOak from "@/assets/patterns/SQ54-Subtropical-Oak.jpg";
import SQ55BBlondCedar from "@/assets/patterns/SQ55B-Blond-Cedar.jpg";
import SQ73TrendyWalnut from "@/assets/patterns/SQ73-Trendy-Walnut.jpg";
import SQ731DawnCherry from "@/assets/patterns/SQ731-Dawn-Cherry.jpg";

// Import pattern images - Wood Veneer
import WV0756NaturalMaple from "@/assets/patterns/WV-0756-Natural-Maple.jpg";
import WV9194TrendyWalnut from "@/assets/patterns/WV-9194-Trendy-Walnut.jpg";
import WV9205LegnoSilverOak from "@/assets/patterns/WV-9205-Legno-Silver-Oak.jpg";
import WV9348SubtropicalOak from "@/assets/patterns/WV-9348-Subtropical-Oak.jpg";
import WV9834OceanVogue from "@/assets/patterns/WV-9834-Ocean-Vogue.jpg";
import WV9860BlondCedar from "@/assets/patterns/WV-9860-Blond-Cedar.jpg";
import WV9861EternalCedar from "@/assets/patterns/WV-9861-Eternal-Cedar.jpg";
import WV9862EarthCedar from "@/assets/patterns/WV-9862-Earth-Cedar.jpg";
import WV9870DawnCherry from "@/assets/patterns/WV-9870-Dawn-Cherry.jpg";
import WVT1246CostaNogal from "@/assets/patterns/WV-T1246-Costa-Nogal.jpg";
import WVT1270KarlaElm from "@/assets/patterns/WV-T1270-Karla-Elm.jpg";
import WVT5243ClassicWalnut from "@/assets/patterns/WV-T5243-Classic-Walnut.jpg";
import WV5439DAgedAlameda from "@/assets/patterns/WV-5439D-Aged-Alameda.jpg";
import WV5997AliceWalnut from "@/assets/patterns/WV-5997-Alice-Walnut.jpg";
import WV6405IvoryElm from "@/assets/patterns/WV-6405-Ivory-Elm.jpg";
import WV6442AshWashingMaple from "@/assets/patterns/WV-6442-Ash-Washing-Maple.jpg";
import WV7188LincolnWalnut from "@/assets/patterns/WV-7188-Lincoln-Walnut.jpg";
import WV7860VosgesTeak from "@/assets/patterns/WV-7860-Vosges-Teak.jpg";
import WV9848DBlackenLegno from "@/assets/patterns/WV-9848D-Blacken-Legno.jpg";
import WVT4222StateroomTeak from "@/assets/patterns/WV-T4222-Stateroom-Teak.jpg";

// Import pattern images - Stone & Marble
import ST2516Karadolomite from "@/assets/patterns/ST-2516-Karadolomite.jpg";
import ST4982RedRustStone from "@/assets/patterns/ST-4982-Red-Rust-Stone.jpg";
import ST4983CoffeeIceCream from "@/assets/patterns/ST-4983-Coffee-Ice-Cream.jpg";
import ST6306CloudRiver from "@/assets/patterns/ST-6306-Cloud-River.jpg";
import ST7377WhiteJade from "@/assets/patterns/ST-7377-White-Jade.jpg";
import ST7458TravertineGrey from "@/assets/patterns/ST-7458-Travertine-Grey.jpg";
import ST7888WhiteRock from "@/assets/patterns/ST-7888-White-Rock.jpg";
import ST8462SlatePalm from "@/assets/patterns/ST-8462-Slate-Palm.jpg";
import STD476NaturalStone from "@/assets/patterns/ST-D476-Natural-Stone.jpg";
import STMB3476BlackGranite from "@/assets/patterns/ST-MB3476-Black-Granite.jpg";
import STT1329DarioRamblas from "@/assets/patterns/ST-T1329-Dario-Ramblas.jpg";
import STT1332GoyoRamblas from "@/assets/patterns/ST-T1332-Goyo-Ramblas.jpg";

// Import pattern images - Fabric & Textile
import FBGTL45White from "@/assets/patterns/FB-GTL45-White.jpg";
import FBGTL51LimeGrey from "@/assets/patterns/FB-GTL51-Lime-Grey.jpg";
import FBGTL56LightGrey from "@/assets/patterns/FB-GTL56-Light-Grey.jpg";
import FBGTL59DarkGrey from "@/assets/patterns/FB-GTL59-Dark-Grey.jpg";

// Import pattern images - Quartz & Terrazzo
import GT3001White from "@/assets/patterns/GT-3001-White.jpg";
import GT3004Black from "@/assets/patterns/GT-3004-Black.jpg";
import GT3005Beige from "@/assets/patterns/GT-3005-Beige.jpg";
import GT3025Grey from "@/assets/patterns/GT-3025-Grey.jpg";

// Import pattern images - Grain Series
import GSBMP01Formosa from "@/assets/patterns/GS-BMP01-Formosa.jpg";
import GSBMP02ClassicOak from "@/assets/patterns/GS-BMP02-Classic-Oak.jpg";
import GSBMP03MixedOilGray from "@/assets/patterns/GS-BMP03-Mixed-Oil-Gray.jpg";
import GSBMP04WesternEuropean from "@/assets/patterns/GS-BMP04-Western-European.jpg";

// Import pattern images - Tweed & Bouclé
import TW8308_7Charcoal from "@/assets/patterns/TW-8308-7-Charcoal.jpg";
import TW8308_9Coral from "@/assets/patterns/TW-8308-9-Coral.jpg";
import TW8308_13Crimson from "@/assets/patterns/TW-8308-13-Crimson.jpg";
import TW8308_27Denim from "@/assets/patterns/TW-8308-27-Denim.jpg";
import TW8308_30Teal from "@/assets/patterns/TW-8308-30-Teal.jpg";
import TW8308_42Taupe from "@/assets/patterns/TW-8308-42-Taupe.jpg";
import TW8308_45Dove from "@/assets/patterns/TW-8308-45-Dove.jpg";
import TW8308_48Onyx from "@/assets/patterns/TW-8308-48-Onyx.jpg";
import TW8410_7Espresso from "@/assets/patterns/TW-8410-7-Espresso.jpg";
import TW8410_22Oatmeal from "@/assets/patterns/TW-8410-22-Oatmeal.jpg";

// Import pattern images - Linen & Woven
import LN8815_4Cream from "@/assets/patterns/LN-8815-4-Cream.jpg";
import LN8815_17Azure from "@/assets/patterns/LN-8815-17-Azure.jpg";
import KR1818_4Taupe from "@/assets/patterns/KR-1818-4-Taupe.jpg";
import KR1818_9Silver from "@/assets/patterns/KR-1818-9-Silver.jpg";
import KR1818_14Terracotta from "@/assets/patterns/KR-1818-14-Terracotta.jpg";
import KR1818_19Sage from "@/assets/patterns/KR-1818-19-Sage.jpg";
import KR1818_27Cobalt from "@/assets/patterns/KR-1818-27-Cobalt.jpg";
import KR1818_29Camel from "@/assets/patterns/KR-1818-29-Camel.jpg";
import KR1818_31Cocoa from "@/assets/patterns/KR-1818-31-Cocoa.jpg";
import KR1818_37Graphite from "@/assets/patterns/KR-1818-37-Graphite.jpg";
import KR1818_43Oat from "@/assets/patterns/KR-1818-43-Oat.jpg";
import KR1818_49Ash from "@/assets/patterns/KR-1818-49-Ash.jpg";
import KR1818_57Crimson from "@/assets/patterns/KR-1818-57-Crimson.jpg";
import KR1818_62Slate from "@/assets/patterns/KR-1818-62-Slate.jpg";

// Import pattern images - Canvas & Outdoor Fabrics
import BXB05Burgundy from "@/assets/patterns/BXB05-Burgundy.jpg";
import BXB08OceanBlue from "@/assets/patterns/BXB08-Ocean-Blue.jpg";
import BXB11Navy from "@/assets/patterns/BXB11-Navy.jpg";
import BXB12Espresso from "@/assets/patterns/BXB12-Espresso.jpg";
import BXE01Natural from "@/assets/patterns/BXE01-Natural.jpg";
import BXE04Silver from "@/assets/patterns/BXE04-Silver.jpg";
import BXE05Lime from "@/assets/patterns/BXE05-Lime.jpg";
import BXE06Turquoise from "@/assets/patterns/BXE06-Turquoise.jpg";

export interface PatternOption {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

export interface PatternCategory {
  id: string;
  name: string;
  patterns: PatternOption[];
}

const patternCategories: PatternCategory[] = [
  {
    id: "stainless-steel",
    name: "Hairline Stainless Steel",
    patterns: [
      { 
        id: "ss02", 
        name: "Brushed Steel", 
        description: "Hairline brushed stainless steel with silver finish",
        imageUrl: SS02HairlineSS 
      },
      { 
        id: "ss03", 
        name: "Rose Gold", 
        description: "Hairline brushed stainless steel with rose gold plating",
        imageUrl: SS03RoseGold 
      },
      { 
        id: "ss04", 
        name: "Black Titanium", 
        description: "Hairline brushed stainless steel with black titanium plating",
        imageUrl: SS04Black 
      },
      { 
        id: "ss12", 
        name: "Gold", 
        description: "Hairline brushed stainless steel with gold plating",
        imageUrl: SS12Gold 
      },
      { 
        id: "ss13", 
        name: "Champagne", 
        description: "Hairline brushed stainless steel with champagne plating",
        imageUrl: SS13Champagne 
      },
      { 
        id: "ss25", 
        name: "Gold Bronze", 
        description: "Hairline brushed stainless steel with gold bronze plating",
        imageUrl: SS25GoldBronze 
      },
      { 
        id: "ss26", 
        name: "Red Bronze", 
        description: "Hairline brushed stainless steel with red bronze plating",
        imageUrl: SS26RedBronze 
      },
      { 
        id: "ss27", 
        name: "Green Bronze", 
        description: "Hairline brushed stainless steel with green bronze plating",
        imageUrl: SS27GreenBronze 
      },
    ],
  },
  {
    id: "powder-coat",
    name: "Powder Coat Finishes",
    patterns: [
      { 
        id: "pc011", 
        name: "Matte White", 
        description: "Smooth matte white powder coat finish",
        imageUrl: PC011White 
      },
      { 
        id: "pc038", 
        name: "Gold", 
        description: "Metallic gold powder coat finish",
        imageUrl: PC038Gold 
      },
      { 
        id: "pc051", 
        name: "Silver", 
        description: "Metallic silver powder coat finish",
        imageUrl: PC051Silver 
      },
      { 
        id: "pc053", 
        name: "Brown Gold", 
        description: "Speckled brown gold textured powder coat finish",
        imageUrl: PC053BrownGold 
      },
      { 
        id: "pc056", 
        name: "Champagne", 
        description: "Champagne powder coat finish",
        imageUrl: PC056Champagne 
      },
      { 
        id: "pc058", 
        name: "Crack Black", 
        description: "Textured crackle black powder coat finish",
        imageUrl: PC058CrackBlack 
      },
      { 
        id: "pc059", 
        name: "Matte Black", 
        description: "Smooth matte black powder coat finish",
        imageUrl: PC059MattBlack 
      },
      { 
        id: "pp061", 
        name: "Coffee", 
        description: "Metallic coffee brown powder coat finish",
        imageUrl: PP061Coffee 
      },
    ],
  },
  {
    id: "wood-grain",
    name: "Wood Grain Finishes",
    patterns: [
      { 
        id: "sq52", 
        name: "Alice Walnut", 
        description: "Dark rich walnut wood grain with golden highlights",
        imageUrl: SQ52AliceWalnut 
      },
      { 
        id: "sq53", 
        name: "Lincoln Walnut", 
        description: "Grey-brown walnut wood grain with subtle texture",
        imageUrl: SQ53LincolnWalnut 
      },
      { 
        id: "sq54", 
        name: "Subtropical Oak", 
        description: "Light golden oak with distinctive grain pattern",
        imageUrl: SQ54SubtropicalOak 
      },
      { 
        id: "sq55b", 
        name: "Blond Cedar", 
        description: "Light natural cedar wood grain finish",
        imageUrl: SQ55BBlondCedar 
      },
      { 
        id: "sq73", 
        name: "Trendy Walnut", 
        description: "Natural walnut with flowing grain lines",
        imageUrl: SQ73TrendyWalnut 
      },
      { 
        id: "sq731", 
        name: "Dawn Cherry", 
        description: "Light cherry wood with fine vertical grain",
        imageUrl: SQ731DawnCherry 
      },
    ],
  },
  {
    id: "wood-veneer",
    name: "Wood Veneer Finishes",
    patterns: [
      { 
        id: "wv0756", 
        name: "Natural Maple", 
        description: "Light golden maple with elegant grain pattern",
        imageUrl: WV0756NaturalMaple 
      },
      { 
        id: "wv9194", 
        name: "Trendy Walnut", 
        description: "Warm walnut veneer with fine vertical lines",
        imageUrl: WV9194TrendyWalnut 
      },
      { 
        id: "wv9205", 
        name: "Legno Silver Oak", 
        description: "Silver-highlighted oak with distinctive texture",
        imageUrl: WV9205LegnoSilverOak 
      },
      { 
        id: "wv9348", 
        name: "Subtropical Oak", 
        description: "Golden oak veneer with natural grain",
        imageUrl: WV9348SubtropicalOak 
      },
      { 
        id: "wv9834", 
        name: "Ocean Vogue", 
        description: "Rich brown driftwood finish",
        imageUrl: WV9834OceanVogue 
      },
      { 
        id: "wv9860", 
        name: "Blond Cedar", 
        description: "Light blonde cedar with soft grain",
        imageUrl: WV9860BlondCedar 
      },
      { 
        id: "wv9861", 
        name: "Eternal Cedar", 
        description: "Grey-toned cedar with subtle warmth",
        imageUrl: WV9861EternalCedar 
      },
      { 
        id: "wv9862", 
        name: "Earth Cedar", 
        description: "Warm earth-toned cedar veneer",
        imageUrl: WV9862EarthCedar 
      },
      { 
        id: "wv9870", 
        name: "Dawn Cherry", 
        description: "Light cream cherry with delicate grain",
        imageUrl: WV9870DawnCherry 
      },
      { 
        id: "wvt1246", 
        name: "Costa Nogal", 
        description: "Golden-brown Spanish walnut finish",
        imageUrl: WVT1246CostaNogal 
      },
      { 
        id: "wvt1270", 
        name: "Karla Elm", 
        description: "Warm golden elm with elegant grain",
        imageUrl: WVT1270KarlaElm 
      },
      { 
        id: "wvt5243", 
        name: "Classic Walnut", 
        description: "Timeless medium brown walnut finish",
        imageUrl: WVT5243ClassicWalnut 
      },
      { 
        id: "wv5439d", 
        name: "Aged Alameda", 
        description: "Dark espresso wood with subtle grain",
        imageUrl: WV5439DAgedAlameda 
      },
      { 
        id: "wv5997", 
        name: "Alice Walnut", 
        description: "Deep reddish-brown walnut veneer",
        imageUrl: WV5997AliceWalnut 
      },
      { 
        id: "wv6405", 
        name: "Ivory Elm", 
        description: "Light creamy elm with soft grain pattern",
        imageUrl: WV6405IvoryElm 
      },
      { 
        id: "wv6442", 
        name: "Ash Washing Maple", 
        description: "Grey washed maple with rustic texture",
        imageUrl: WV6442AshWashingMaple 
      },
      { 
        id: "wv7188", 
        name: "Lincoln Walnut", 
        description: "Rich dark walnut with prominent grain",
        imageUrl: WV7188LincolnWalnut 
      },
      { 
        id: "wv7860", 
        name: "Vosges Teak", 
        description: "Natural grey-toned teak finish",
        imageUrl: WV7860VosgesTeak 
      },
      { 
        id: "wv9848d", 
        name: "Blacken Legno", 
        description: "Dark charcoal eucalyptus finish",
        imageUrl: WV9848DBlackenLegno 
      },
      { 
        id: "wvt4222", 
        name: "Stateroom Teak", 
        description: "Premium warm brown teak veneer",
        imageUrl: WVT4222StateroomTeak 
      },
    ],
  },
  {
    id: "stone-marble",
    name: "Stone & Marble Finishes",
    patterns: [
      { 
        id: "st2516", 
        name: "Karadolomite", 
        description: "Grey marble with flowing wave patterns",
        imageUrl: ST2516Karadolomite 
      },
      { 
        id: "st4982", 
        name: "Red Rust Stone", 
        description: "Dark textured rust stone finish",
        imageUrl: ST4982RedRustStone 
      },
      { 
        id: "st4983", 
        name: "Coffee Ice Cream", 
        description: "Dark charcoal textured stone surface",
        imageUrl: ST4983CoffeeIceCream 
      },
      { 
        id: "st6306", 
        name: "Cloud River", 
        description: "Light grey-white marble with subtle veining",
        imageUrl: ST6306CloudRiver 
      },
      { 
        id: "st7377", 
        name: "White Jade", 
        description: "Creamy white marble with golden veins",
        imageUrl: ST7377WhiteJade 
      },
      { 
        id: "st7458", 
        name: "Travertine Grey", 
        description: "Silver-grey travertine with linear patterns",
        imageUrl: ST7458TravertineGrey 
      },
      { 
        id: "st7888", 
        name: "White Rock", 
        description: "Pure white marble with dramatic grey veins",
        imageUrl: ST7888WhiteRock 
      },
      { 
        id: "st8462", 
        name: "Slate Palm", 
        description: "Dark brown marble with golden veining",
        imageUrl: ST8462SlatePalm 
      },
      { 
        id: "std476", 
        name: "Natural Stone", 
        description: "Grey concrete-like natural stone texture",
        imageUrl: STD476NaturalStone 
      },
      { 
        id: "stmb3476", 
        name: "Black Granite", 
        description: "Deep black granite with white veining",
        imageUrl: STMB3476BlackGranite 
      },
      { 
        id: "stt1329", 
        name: "Dario Ramblas", 
        description: "Light cream cement with aged patina",
        imageUrl: STT1329DarioRamblas 
      },
      { 
        id: "stt1332", 
        name: "Goyo Ramblas", 
        description: "Dark grey cement with weathered texture",
        imageUrl: STT1332GoyoRamblas 
      },
    ],
  },
  {
    id: "fabric-textile",
    name: "Fabric & Textile Finishes",
    patterns: [
      { 
        id: "fbgtl45", 
        name: "White Suede", 
        description: "Soft off-white suede fabric texture",
        imageUrl: FBGTL45White 
      },
      { 
        id: "fbgtl51", 
        name: "Lime Grey", 
        description: "Warm taupe suede fabric texture",
        imageUrl: FBGTL51LimeGrey 
      },
      { 
        id: "fbgtl56", 
        name: "Light Grey", 
        description: "Cool light grey suede fabric texture",
        imageUrl: FBGTL56LightGrey 
      },
      { 
        id: "fbgtl59", 
        name: "Dark Grey", 
        description: "Charcoal dark grey suede fabric texture",
        imageUrl: FBGTL59DarkGrey 
      },
    ],
  },
  {
    id: "quartz-terrazzo",
    name: "Quartz & Terrazzo Finishes",
    patterns: [
      { 
        id: "gt3001", 
        name: "White Quartz", 
        description: "Sparkling white quartz with subtle aggregate",
        imageUrl: GT3001White 
      },
      { 
        id: "gt3004", 
        name: "Black Quartz", 
        description: "Deep black quartz with mirror-like flecks",
        imageUrl: GT3004Black 
      },
      { 
        id: "gt3005", 
        name: "Beige Quartz", 
        description: "Warm beige quartz with fine speckles",
        imageUrl: GT3005Beige 
      },
      { 
        id: "gt3025", 
        name: "Grey Quartz", 
        description: "Cool grey quartz with crystalline texture",
        imageUrl: GT3025Grey 
      },
    ],
  },
  {
    id: "grain-series",
    name: "Grain Series Finishes",
    patterns: [
      { 
        id: "gsbmp01", 
        name: "Formosa", 
        description: "Dark espresso wood with fine vertical grain",
        imageUrl: GSBMP01Formosa 
      },
      { 
        id: "gsbmp02", 
        name: "Classic Oak", 
        description: "Light grey oak with elegant grain pattern",
        imageUrl: GSBMP02ClassicOak 
      },
      { 
        id: "gsbmp03", 
        name: "Mixed Oil Gray", 
        description: "Warm olive-grey wood with subtle grain",
        imageUrl: GSBMP03MixedOilGray 
      },
      { 
        id: "gsbmp04", 
        name: "Western European", 
        description: "Light blonde wood with soft linear texture",
        imageUrl: GSBMP04WesternEuropean 
      },
    ],
  },
  {
    id: "tweed-boucle",
    name: "Tweed & Bouclé Finishes",
    patterns: [
      { 
        id: "tw8308-7", 
        name: "Charcoal Tweed", 
        description: "Dark grey woven tweed with textured depth",
        imageUrl: TW8308_7Charcoal 
      },
      { 
        id: "tw8308-9", 
        name: "Coral Tweed", 
        description: "Warm coral-salmon woven tweed texture",
        imageUrl: TW8308_9Coral 
      },
      { 
        id: "tw8308-13", 
        name: "Crimson Tweed", 
        description: "Rich red woven tweed with subtle variation",
        imageUrl: TW8308_13Crimson 
      },
      { 
        id: "tw8308-27", 
        name: "Denim Tweed", 
        description: "Classic blue woven tweed texture",
        imageUrl: TW8308_27Denim 
      },
      { 
        id: "tw8308-30", 
        name: "Teal Tweed", 
        description: "Deep teal-green woven tweed fabric",
        imageUrl: TW8308_30Teal 
      },
      { 
        id: "tw8308-42", 
        name: "Taupe Tweed", 
        description: "Warm taupe-brown woven tweed texture",
        imageUrl: TW8308_42Taupe 
      },
      { 
        id: "tw8308-45", 
        name: "Dove Tweed", 
        description: "Soft dove grey woven tweed fabric",
        imageUrl: TW8308_45Dove 
      },
      { 
        id: "tw8308-48", 
        name: "Onyx Tweed", 
        description: "Deep charcoal-black woven tweed texture",
        imageUrl: TW8308_48Onyx 
      },
      { 
        id: "tw8410-7", 
        name: "Espresso Bouclé", 
        description: "Rich brown bouclé weave texture",
        imageUrl: TW8410_7Espresso 
      },
      { 
        id: "tw8410-22", 
        name: "Oatmeal Bouclé", 
        description: "Light cream bouclé weave with subtle texture",
        imageUrl: TW8410_22Oatmeal 
      },
    ],
  },
  {
    id: "linen-woven",
    name: "Linen & Woven Finishes",
    patterns: [
      { 
        id: "ln8815-4", 
        name: "Cream Linen", 
        description: "Natural cream woven linen with chunky texture",
        imageUrl: LN8815_4Cream 
      },
      { 
        id: "ln8815-17", 
        name: "Azure Linen", 
        description: "Rich blue woven linen texture",
        imageUrl: LN8815_17Azure 
      },
      { 
        id: "kr1818-4", 
        name: "Taupe Weave", 
        description: "Neutral taupe woven fabric with fine texture",
        imageUrl: KR1818_4Taupe 
      },
      { 
        id: "kr1818-9", 
        name: "Silver Weave", 
        description: "Cool silver-grey woven fabric texture",
        imageUrl: KR1818_9Silver 
      },
      { 
        id: "kr1818-14", 
        name: "Terracotta Weave", 
        description: "Warm terracotta woven fabric texture",
        imageUrl: KR1818_14Terracotta 
      },
      { 
        id: "kr1818-19", 
        name: "Sage Weave", 
        description: "Soft sage green woven fabric texture",
        imageUrl: KR1818_19Sage 
      },
      { 
        id: "kr1818-27", 
        name: "Cobalt Weave", 
        description: "Deep cobalt blue woven fabric texture",
        imageUrl: KR1818_27Cobalt 
      },
      { 
        id: "kr1818-29", 
        name: "Camel Weave", 
        description: "Warm camel tan woven fabric texture",
        imageUrl: KR1818_29Camel 
      },
      { 
        id: "kr1818-31", 
        name: "Cocoa Weave", 
        description: "Rich cocoa brown woven fabric texture",
        imageUrl: KR1818_31Cocoa 
      },
      { 
        id: "kr1818-37", 
        name: "Graphite Weave", 
        description: "Dark graphite woven fabric texture",
        imageUrl: KR1818_37Graphite 
      },
      { 
        id: "kr1818-43", 
        name: "Oat Weave", 
        description: "Natural oat-colored woven fabric texture",
        imageUrl: KR1818_43Oat 
      },
      { 
        id: "kr1818-49", 
        name: "Ash Weave", 
        description: "Cool ash grey woven fabric texture",
        imageUrl: KR1818_49Ash 
      },
      { 
        id: "kr1818-57", 
        name: "Crimson Weave", 
        description: "Rich crimson red woven fabric texture",
        imageUrl: KR1818_57Crimson 
      },
      { 
        id: "kr1818-62", 
        name: "Slate Blue Weave", 
        description: "Soft slate blue woven fabric texture",
        imageUrl: KR1818_62Slate 
      },
    ],
  },
  {
    id: "canvas-outdoor",
    name: "Canvas & Outdoor Fabrics",
    patterns: [
      { 
        id: "bxb05", 
        name: "Burgundy Canvas", 
        description: "Rich burgundy outdoor canvas with tight weave",
        imageUrl: BXB05Burgundy 
      },
      { 
        id: "bxb08", 
        name: "Ocean Blue Canvas", 
        description: "Bright ocean blue outdoor canvas texture",
        imageUrl: BXB08OceanBlue 
      },
      { 
        id: "bxb11", 
        name: "Navy Canvas", 
        description: "Deep navy blue outdoor canvas fabric",
        imageUrl: BXB11Navy 
      },
      { 
        id: "bxb12", 
        name: "Espresso Canvas", 
        description: "Dark espresso brown outdoor canvas",
        imageUrl: BXB12Espresso 
      },
      { 
        id: "bxe01", 
        name: "Natural Basketweave", 
        description: "Light natural beige basketweave texture",
        imageUrl: BXE01Natural 
      },
      { 
        id: "bxe04", 
        name: "Silver Basketweave", 
        description: "Cool silver grey basketweave fabric",
        imageUrl: BXE04Silver 
      },
      { 
        id: "bxe05", 
        name: "Lime Basketweave", 
        description: "Fresh lime green basketweave texture",
        imageUrl: BXE05Lime 
      },
      { 
        id: "bxe06", 
        name: "Turquoise Basketweave", 
        description: "Vibrant turquoise basketweave fabric",
        imageUrl: BXE06Turquoise 
      },
    ],
  },
];

interface PatternPaletteProps {
  selectedPattern: PatternOption | null;
  onPatternSelect: (pattern: PatternOption) => void;
}

export function PatternPalette({ selectedPattern, onPatternSelect }: PatternPaletteProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    patternCategories.map((c) => c.id)
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const filteredCategories = patternCategories
    .map((category) => ({
      ...category,
      patterns: category.patterns.filter((pattern) =>
        pattern.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pattern.description.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.patterns.length > 0);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Material Patterns
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search patterns..."
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
                  ({category.patterns.length})
                </span>
              </span>
              {expandedCategories.includes(category.id) ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {expandedCategories.includes(category.id) && (
              <div className="grid grid-cols-2 gap-2 animate-fade-in">
                {category.patterns.map((pattern) => (
                  <button
                    key={pattern.id}
                    onClick={() => onPatternSelect(pattern)}
                    className={`group relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                      selectedPattern?.id === pattern.id 
                        ? "border-primary ring-2 ring-primary/50" 
                        : "border-border hover:border-muted-foreground"
                    }`}
                    title={pattern.name}
                  >
                    <img 
                      src={pattern.imageUrl} 
                      alt={pattern.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-medium text-white truncate block">
                        {pattern.name}
                      </span>
                    </div>
                    {selectedPattern?.id === pattern.id && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedPattern && (
        <div className="p-4 border-t border-border bg-secondary/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg border border-border overflow-hidden">
              <img 
                src={selectedPattern.imageUrl} 
                alt={selectedPattern.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedPattern.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {selectedPattern.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
