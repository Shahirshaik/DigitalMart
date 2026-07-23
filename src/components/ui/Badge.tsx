import { cn } from "@/lib/utils";

type Variant = "default" | "brand" | "trust" | "success" | "warning" | "danger" | "ghost";

const variantStyles: Record<Variant, string> = {
  default: "bg-gray-100 text-gray-700",
  brand:   "bg-brand-100 text-brand-700",
  trust:   "bg-trust-100 text-trust-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  danger:  "bg-red-100 text-red-700",
  ghost:   "bg-white border border-gray-200 text-gray-600",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span className={cn("badge", variantStyles[variant], className)}>
      {children}
    </span>
  );
}
