import { cn } from "@/lib/utils";

type LumoLogoProps = {
  className?: string;
  variant?: "full" | "mark";
};

export function LumoLogo({ className, variant = "full" }: LumoLogoProps) {
  if (variant === "mark") {
    return (
      <img
        src="/lumo-icon.png"
        alt="Lumo"
        width={40}
        height={40}
        className={cn("h-10 w-10 shrink-0 object-contain select-none", className)}
      />
    );
  }

  return (
    <img
      src="/lumo-logo.png"
      alt="Lumo"
      width={185}
      height={40}
      className={cn(
        "h-10 w-auto max-w-[185px] shrink-0 object-contain object-left select-none",
        className
      )}
    />
  );
}
