"use client";

import * as React from "react";

const cx = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

type DialogContextValue = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

const useDialog = () => {
  const ctx = React.useContext(DialogContext);
  if (!ctx) {
    throw new Error("Dialog components must be used within <Dialog>");
  }
  return ctx;
};

export const Dialog = ({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) => {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
};

export const DialogContent = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const ctx = useDialog();
  if (!ctx.open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4">
      <div
        className="absolute inset-0 bg-[#020611]/75 backdrop-blur-sm"
        onClick={() => ctx.onOpenChange?.(false)}
      />
      <div
        className={cx(
          "relative z-10 mx-auto my-8 w-full max-w-lg overflow-y-auto rounded-[1.75rem] border border-border bg-card/95 p-6 shadow-2xl backdrop-blur-2xl max-h-[calc(100vh-4rem)]",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
};

export const DialogHeader = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return <div className={cx("mb-4", className)}>{children}</div>;
};

export const DialogTitle = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <h2 className={cx("text-lg font-semibold text-foreground", className)}>
      {children}
    </h2>
  );
};
