
import React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-red-500/20 text-red-400",
        success:
          "border-transparent bg-teal/20 text-teal",
        outline: "text-foreground",
        // Glowing variants (Stealth Edition)
        "glow-new":
          "border-transparent bg-primary/20 text-primary shadow-badge-new",
        "glow-hot":
          "border-transparent bg-amber-500/20 text-amber-400 shadow-badge-hot",
        "glow-sold":
          "border-transparent bg-blue-500/20 text-blue-400 shadow-badge-sold",
        // Saturated fill variants
        "fill-new":
          "border-transparent bg-primary text-primary-foreground font-bold",
        "fill-hot":
          "border-transparent bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold",
        "fill-sold":
          "border-transparent bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold",
        // Property type badges
        "house":
          "border-emerald-500/30 bg-emerald-500/20 text-emerald-400",
        "condo":
          "border-blue-500/30 bg-blue-500/20 text-blue-400",
        "townhouse":
          "border-purple-500/30 bg-purple-500/20 text-purple-400",
        "multi-family":
          "border-amber-500/30 bg-amber-500/20 text-amber-400",
        "land":
          "border-orange-500/30 bg-orange-500/20 text-orange-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }
