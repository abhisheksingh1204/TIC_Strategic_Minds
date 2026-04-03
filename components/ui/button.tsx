"use client";

import * as React from "react";

const cx = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

type ButtonVariant =
  | "default"
  | "ghost"
  | "outline"
  | "glass"
  | "electric"
  | "neon";

type ButtonSize = "default" | "sm" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_12px_28px_rgba(47,211,255,0.16)]",
  ghost: "bg-transparent text-foreground hover:bg-white/5",
  outline: "border border-border bg-transparent text-foreground hover:bg-white/5",
  glass: "border border-border bg-card/70 text-foreground backdrop-blur-xl hover:bg-card/90",
  electric: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_14px_30px_rgba(30,246,58,0.2)]",
  neon: "bg-[linear-gradient(135deg,#1ef63a_0%,#6cff64_100%)] text-[#031109] shadow-[0_14px_30px_rgba(30,246,58,0.24)] hover:brightness-105",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3",
  lg: "h-11 px-6",
  icon: "h-10 w-10 p-0",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cx(
          "inline-flex items-center justify-center rounded-2xl text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
