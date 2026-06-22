import { cn } from "@/lib/utils";

interface AnimatedSectionProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function AnimatedSection({ children, delay = 0, className }: AnimatedSectionProps) {
  return (
    <div
      className={cn("animate-in fade-in slide-in-from-bottom-2 fill-mode-both", className)}
      style={{ animationDelay: `${delay}ms`, animationDuration: "400ms" }}
    >
      {children}
    </div>
  );
}
