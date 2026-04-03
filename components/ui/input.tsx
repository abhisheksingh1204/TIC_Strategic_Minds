"use client";

import * as React from "react";

const cx = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cx(
          "flex h-12 w-full rounded-2xl border border-border bg-card/70 px-4 py-2 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] backdrop-blur-xl placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
