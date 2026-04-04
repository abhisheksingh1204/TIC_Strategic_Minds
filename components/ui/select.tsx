"use client";

import * as React from "react";

const cx = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

type SelectContextValue = {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  registerItem: (value: string, label: string) => void;
  items: Map<string, string>;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

const useSelect = () => {
  const ctx = React.useContext(SelectContext);
  if (!ctx) {
    throw new Error("Select components must be used within <Select>");
  }
  return ctx;
};

export const Select = ({
  value,
  onValueChange,
  children,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<Map<string, string>>(new Map());

  const registerItem = React.useCallback((itemValue: string, label: string) => {
    setItems((prev) => {
      if (prev.get(itemValue) === label) return prev;
      const next = new Map(prev);
      next.set(itemValue, label);
      return next;
    });
  }, []);

  return (
    <SelectContext.Provider
      value={{ value, onValueChange, open, setOpen, registerItem, items }}
    >
      <div className="relative inline-block">{children}</div>
    </SelectContext.Provider>
  );
};

export const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const ctx = useSelect();
  return (
    <button
      ref={ref}
      type="button"
      className={cx(
        "flex h-12 w-full items-center justify-between rounded-2xl border border-border bg-card/70 px-4 text-sm text-foreground backdrop-blur-xl",
        className
      )}
      onClick={() => ctx.setOpen(!ctx.open)}
      {...props}
    >
      {children}
      <span className="ml-2 text-xs text-muted-foreground">v</span>
    </button>
  );
});

SelectTrigger.displayName = "SelectTrigger";

export const SelectValue = ({
  placeholder,
  className,
}: {
  placeholder?: string;
  className?: string;
}) => {
  const ctx = useSelect();
  const label = ctx.value ? ctx.items.get(ctx.value) : undefined;
  return (
    <span className={cx("truncate", className)}>
      {label ?? placeholder ?? "Select"}
    </span>
  );
};

export const SelectContent = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  const ctx = useSelect();
  if (!ctx.open) return null;
  return (
    <div
      className={cx(
        "absolute z-50 mt-2 w-full rounded-2xl border border-white/12 bg-[rgba(9,16,29,0.98)] p-2 shadow-2xl backdrop-blur-2xl",
        className
      )}
    >
      {children}
    </div>
  );
};

export const SelectItem = ({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) => {
  const ctx = useSelect();
  const label =
    typeof children === "string"
      ? children
      : Array.isArray(children)
        ? children.filter((c) => typeof c === "string").join(" ")
        : "";

  React.useEffect(() => {
    if (label) ctx.registerItem(value, label);
  }, [ctx, label, value]);

  return (
    <button
      type="button"
      onClick={() => {
        ctx.onValueChange?.(value);
        ctx.setOpen(false);
      }}
      className={cx(
        "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-foreground hover:bg-white/5",
        className
      )}
    >
      {children}
    </button>
  );
};
