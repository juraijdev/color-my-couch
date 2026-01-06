import { Upload, Palette, Sparkles } from "lucide-react";

interface WorkflowStepsProps {
  currentStep: 1 | 2 | 3;
}

const steps = [
  { id: 1, label: "Upload", icon: Upload },
  { id: 2, label: "Configure", icon: Palette },
  { id: 3, label: "Generate", icon: Sparkles },
];

export function WorkflowSteps({ currentStep }: WorkflowStepsProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
              step.id === currentStep
                ? "bg-primary text-primary-foreground"
                : step.id < currentStep
                ? "bg-primary/20 text-primary"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            <step.icon className="w-4 h-4" />
            <span className="text-sm font-medium">{step.label}</span>
          </div>
          
          {index < steps.length - 1 && (
            <div className="flex items-center mx-2">
              <div
                className={`w-8 h-0.5 ${
                  step.id < currentStep ? "bg-primary" : "bg-border"
                }`}
              />
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  step.id < currentStep ? "bg-primary" : "bg-border"
                }`}
              />
              <div
                className={`w-8 h-0.5 ${
                  step.id < currentStep ? "bg-primary" : "bg-border"
                }`}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
