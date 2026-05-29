import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';

type ProcessStep = {
  label: string;
  icon: LucideIcon;
};

type ProcessHintProps = {
  steps: ProcessStep[];
};

export function ProcessHint({ steps }: ProcessHintProps) {
  return (
    <div className="mx-6 hidden min-w-0 flex-1 items-center justify-center lg:flex">
      <div className="flex max-w-4xl flex-wrap items-center justify-center gap-2 rounded-lg border border-border bg-background/60 px-4 py-3">
        {steps.map((step, index) => {
          const Icon = step.icon;

          return (
            <div key={step.label} className="flex items-center gap-2">
              <div className="flex min-w-0 items-center gap-2 rounded-md bg-secondary/30 px-3 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="whitespace-nowrap text-sm font-medium text-foreground">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
