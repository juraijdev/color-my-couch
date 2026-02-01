import { Check, Upload, Palette, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
  hasImage: boolean;
  hasPatternAssigned: boolean;
}

const steps = [
  { 
    id: 1, 
    label: "Upload Image", 
    description: "Add your furniture photo",
    icon: Upload 
  },
  { 
    id: 2, 
    label: "Choose Patterns", 
    description: "Select materials for each part",
    icon: Palette 
  },
  { 
    id: 3, 
    label: "Generate", 
    description: "AI creates your design",
    icon: Sparkles 
  },
];

export function StepIndicator({ currentStep, hasImage, hasPatternAssigned }: StepIndicatorProps) {
  const getStepStatus = (stepId: number) => {
    if (stepId === 1 && hasImage) return "completed";
    if (stepId === 2 && hasPatternAssigned) return "completed";
    if (stepId === currentStep) return "current";
    if (stepId < currentStep) return "completed";
    return "upcoming";
  };

  return (
    <div className="w-full py-6 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between relative">
          {/* Progress line */}
          <div className="absolute top-6 left-0 right-0 h-0.5 bg-border" />
          <div 
            className="absolute top-6 left-0 h-0.5 bg-primary transition-all duration-500"
            style={{ 
              width: currentStep === 1 ? "0%" : currentStep === 2 ? "50%" : "100%" 
            }}
          />

          {steps.map((step, index) => {
            const status = getStepStatus(step.id);
            const Icon = step.icon;

            return (
              <div 
                key={step.id} 
                className="relative flex flex-col items-center z-10"
              >
                {/* Step circle */}
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                    status === "completed" && "bg-primary border-primary text-primary-foreground",
                    status === "current" && "bg-card border-primary text-primary shadow-[0_0_20px_hsl(var(--primary)/0.5)]",
                    status === "upcoming" && "bg-card border-border text-muted-foreground"
                  )}
                >
                  {status === "completed" ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>

                {/* Step label */}
                <div className="mt-3 text-center">
                  <p className={cn(
                    "font-medium text-sm transition-colors",
                    status === "current" ? "text-primary" : 
                    status === "completed" ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
