"use client";

import * as React from "react";

const cx = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

type AccordionContextValue = {
  openItem: string | null;
  setOpenItem: (value: string | null) => void;
  collapsible: boolean;
};

const AccordionContext = React.createContext<AccordionContextValue | null>(null);
const AccordionItemContext = React.createContext<string | null>(null);

const useAccordion = () => {
  const ctx = React.useContext(AccordionContext);
  if (!ctx) {
    throw new Error("Accordion components must be used within <Accordion>");
  }
  return ctx;
};

export const Accordion = ({
  children,
  type,
  collapsible = false,
  className,
}: {
  children: React.ReactNode;
  type?: "single" | "multiple";
  collapsible?: boolean;
  className?: string;
}) => {
  const [openItem, setOpenItem] = React.useState<string | null>(null);

  return (
    <AccordionContext.Provider
      value={{
        openItem,
        setOpenItem,
        collapsible: type === "single" ? collapsible : true,
      }}
    >
      <div className={className}>{children}</div>
    </AccordionContext.Provider>
  );
};

export const AccordionItem = ({
  children,
  value,
  className,
}: {
  children: React.ReactNode;
  value: string;
  className?: string;
}) => {
  return (
    <AccordionItemContext.Provider value={value}>
      <div className={cx("border-b border-border", className)} data-value={value}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
};

export const AccordionTrigger = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const ctx = useAccordion();
  const item = React.useContext(AccordionItemContext);

  return (
    <button
      type="button"
      className={cx(
        "flex w-full items-center justify-between py-5 text-left text-sm font-medium text-foreground",
        className
      )}
      onClick={() => {
        if (!item) return;
        if (ctx.openItem === item) {
          ctx.setOpenItem(ctx.collapsible ? null : item);
        } else {
          ctx.setOpenItem(item);
        }
      }}
    >
      {children}
      <span className="ml-4 text-muted-foreground">v</span>
    </button>
  );
};

export const AccordionContent = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const ctx = useAccordion();
  const item = React.useContext(AccordionItemContext);

  const isOpen = item ? ctx.openItem === item : false;

  if (!isOpen) return null;
  return <div className={cx("pb-5 text-sm", className)}>{children}</div>;
};
