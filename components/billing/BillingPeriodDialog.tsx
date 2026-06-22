"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const parseDate = (value: string) => new Date(`${value}T00:00:00`);

const toDateValue = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const monthStart = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), 1);

const moveMonth = (value: Date, offset: number) =>
  new Date(value.getFullYear(), value.getMonth() + offset, 1);

const formatSelectedDate = (value: string) =>
  parseDate(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

type CalendarPanelProps = {
  label: "From" | "To";
  month: Date;
  selectedValue: string;
  rangeStart: string;
  rangeEnd: string;
  minimumValue?: string;
  onMonthChange: (month: Date) => void;
  onSelect: (value: string) => void;
};

function CalendarPanel({
  label,
  month,
  selectedValue,
  rangeStart,
  rangeEnd,
  minimumValue,
  onMonthChange,
  onSelect,
}: CalendarPanelProps) {
  const firstDayOffset = monthStart(month).getDay();
  const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: firstDayOffset }, () => null),
    ...Array.from(
      { length: dayCount },
      (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1)
    ),
  ];

  return (
    <section className="rounded-2xl border border-border bg-background/70 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onMonthChange(moveMonth(month, -1))}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-white/5 hover:text-foreground"
          aria-label={`Previous ${label.toLowerCase()} month`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {label}
          </p>
          <h3 className="mt-1 font-semibold text-foreground">
            {month.toLocaleDateString("en-IN", {
              month: "long",
              year: "numeric",
            })}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => onMonthChange(moveMonth(month, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-white/5 hover:text-foreground"
          aria-label={`Next ${label.toLowerCase()} month`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="py-2 text-xs font-semibold text-muted-foreground"
          >
            {weekday}
          </div>
        ))}

        {cells.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const value = toDateValue(date);
          const selected = value === selectedValue;
          const disabled = Boolean(minimumValue && value < minimumValue);
          const inRange =
            Boolean(rangeStart && rangeEnd) && value >= rangeStart && value <= rangeEnd;

          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(value)}
              disabled={disabled}
              className={`aspect-square rounded-xl text-sm font-medium transition-colors ${
                selected
                  ? "bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(47,211,255,0.2)]"
                  : inRange
                    ? "bg-primary/10 text-foreground hover:bg-primary/20"
                    : "text-foreground hover:bg-white/[0.06]"
              } disabled:cursor-not-allowed disabled:text-muted-foreground/25`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function BillingPeriodDialog({
  open,
  onOpenChange,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
}) {
  const [fromMonth, setFromMonth] = useState(() => monthStart(parseDate(fromDate)));
  const [toMonth, setToMonth] = useState(() => monthStart(parseDate(toDate)));

  const handleFromSelect = (value: string) => {
    onFromDateChange(value);

    if (!toDate || value > toDate) {
      onToDateChange(value);
      setToMonth(monthStart(parseDate(value)));
    }
  };

  const handleToSelect = (value: string) => {
    if (value < fromDate) return;
    onToDateChange(value);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Select billing period
            </DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose the start date on the left and end date on the right.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close billing period calendar"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-secondary/10 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Selected range</span>
          <span className="font-semibold text-foreground">
            {formatSelectedDate(fromDate)}
          </span>
          <span className="text-muted-foreground">to</span>
          <span className="font-semibold text-foreground">
            {formatSelectedDate(toDate)}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <CalendarPanel
            label="From"
            month={fromMonth}
            selectedValue={fromDate}
            rangeStart={fromDate}
            rangeEnd={toDate}
            onMonthChange={setFromMonth}
            onSelect={handleFromSelect}
          />
          <CalendarPanel
            label="To"
            month={toMonth}
            selectedValue={toDate}
            rangeStart={fromDate}
            rangeEnd={toDate}
            minimumValue={fromDate}
            onMonthChange={setToMonth}
            onSelect={handleToSelect}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
