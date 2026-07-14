"use client";

import type { BillSummary } from "@/components/billing/billing.types";

const formatMonthRange = (periodStart: string, periodEnd: string) => {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth()
  ) {
    return start.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
  }

  return `${start.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })} - ${end.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

type BillListProps = {
  bills: BillSummary[];
  selectedBillId: string | null;
  loading: boolean;
  error?: string;
  onSelect: (billId: string) => void;
};

export function BillList({
  bills,
  selectedBillId,
  loading,
  error,
  onSelect,
}: BillListProps) {
  return (
    <section className="bg-card rounded-xl border border-border p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Saved Bills</h2>
          <p className="text-sm text-muted-foreground">
            Review generated billing periods and totals.
          </p>
        </div>
        <div className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          {bills.length} total
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
          Loading bills...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : bills.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/10 p-6 text-sm text-muted-foreground">
          No bills generated yet for this property.
        </div>
      ) : (
        <div className="space-y-3">
          {bills.map((bill) => {
            const selected = selectedBillId === bill.id;

            return (
              <button
                key={bill.id}
                type="button"
                onClick={() => onSelect(bill.id)}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                  selected
                    ? "border-primary/40 bg-primary/10"
                    : "border-border bg-secondary/10 hover:bg-secondary/20"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      {formatMonthRange(bill.periodStart, bill.periodEnd)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Updated{" "}
                      {new Date(bill.updatedAt || bill.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-accent">
                      {formatCurrency(bill.totalAmount)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {bill.totalKwh.toFixed(2)} kWh
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
