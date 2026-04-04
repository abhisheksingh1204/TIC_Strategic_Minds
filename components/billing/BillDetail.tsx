"use client";

type BillLineItem = {
  id: string;
  equipmentId: string;
  equipmentName: string;
  kwh: number;
  amount: number;
};

type BillDetailRecord = {
  id: string;
  periodStart: string;
  periodEnd: string;
  totalKwh: number;
  totalAmount: number;
  createdAt: string;
  lineItems: BillLineItem[];
};

type BillDetailProps = {
  bill: BillDetailRecord | null;
  loading: boolean;
  error?: string;
  viewMode: "kwh" | "amount";
  onViewModeChange: (viewMode: "kwh" | "amount") => void;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const formatEquipmentId = (value: unknown) => {
  if (value == null) {
    return "UNKNOWN";
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return "UNKNOWN";
  }

  return normalized.slice(-6).toUpperCase();
};

export function BillDetail({
  bill,
  loading,
  error,
  viewMode,
  onViewModeChange,
}: BillDetailProps) {
  return (
    <section className="bg-card rounded-xl border border-border p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Bill Detail</h2>
          <p className="text-sm text-muted-foreground">
            Review the date range, final totals, and equipment breakdown.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-border bg-secondary/20 p-1">
          <button
            type="button"
            onClick={() => onViewModeChange("kwh")}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              viewMode === "kwh"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            kWh
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("amount")}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              viewMode === "amount"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            INR
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
          Loading bill detail...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : !bill ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/10 p-6 text-sm text-muted-foreground">
          Select a bill to view the full breakdown.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-secondary/10 p-4">
              <p className="text-sm text-muted-foreground">Date Range</p>
              <p className="mt-2 font-semibold text-foreground">
                {formatDate(bill.periodStart)} - {formatDate(bill.periodEnd)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/10 p-4">
              <p className="text-sm text-muted-foreground">Total Usage</p>
              <p className="mt-2 font-semibold text-foreground">
                {bill.totalKwh.toFixed(2)} kWh
              </p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/10 p-4">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="mt-2 font-semibold text-accent">
                {formatCurrency(bill.totalAmount)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-secondary/30">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Equipment
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    kWh
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Cost
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Contribution
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bill.lineItems.map((item) => {
                  const baseTotal =
                    viewMode === "amount" ? bill.totalAmount : bill.totalKwh;
                  const baseValue = viewMode === "amount" ? item.amount : item.kwh;
                  const contribution = baseTotal > 0 ? (baseValue / baseTotal) * 100 : 0;

                  return (
                    <tr key={item.id} className="bg-card/60">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">{item.equipmentName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatEquipmentId(item.equipmentId)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-foreground">
                        {item.kwh.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {contribution.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            Generated on {formatDate(bill.createdAt)}.
          </p>
        </div>
      )}
    </section>
  );
}
