import { Sofa, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
          <Sofa className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display font-bold text-lg">Furniture Customizer</h1>
          <p className="text-xs text-muted-foreground">AI-Powered Color Transformation</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm text-muted-foreground">AI Ready</span>
        </div>
        
        <Button variant="ghost" size="icon">
          <HelpCircle className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
