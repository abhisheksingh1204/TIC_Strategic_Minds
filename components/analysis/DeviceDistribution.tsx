"use client";

import { PieChart } from "lucide-react";

type DistributionDatum = {
  label: string;
  value: number;
  meta?: string;
};

const formatUsageValue = (value: number) => {
  if (value === 0) return "0.00";
  if (Math.abs(value) < 0.01) return value.toFixed(4);
  if (Math.abs(value) < 0.1) return value.toFixed(3);
  return value.toFixed(2);
};

export const DeviceDistribution = ({
  title = "Device Distribution",
  trendMode,
  data,
  totalKwh,
  unitLabel = "kWh",
  emptyMessage = "No device breakdown available for this selection.",
}: {
  title?: string;
  trendMode: "day" | "device" | "month";
  data: DistributionDatum[];
  totalKwh?: number;
  unitLabel?: string;
  emptyMessage?: string;
}) => {
  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-card rounded-xl border border-border p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground capitalize">{trendMode}</span>
      </div>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] border border-dashed border-border rounded-lg bg-secondary/20">
          <div className="text-center text-muted-foreground">
            <PieChart className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{emptyMessage}</p>
            {typeof totalKwh === "number" && (
              <p className="text-xs mt-2">Total usage: {formatUsageValue(totalKwh)} kWh</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-secondary/10 p-4">
            <div className="flex h-4 overflow-hidden rounded-full bg-secondary">
              {data.map((item, index) => {
                const share = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
                const colors = [
                  "bg-primary",
                  "bg-accent",
                  "bg-emerald-500",
                  "bg-amber-500",
                  "bg-sky-500",
                  "bg-rose-500",
                ];

                return (
                  <div
                    key={item.label}
                    className={colors[index % colors.length]}
                    style={{ width: `${share}%` }}
                  />
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            {data.map((item, index) => {
              const share = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
              const dotColors = [
                "bg-primary",
                "bg-accent",
                "bg-emerald-500",
                "bg-amber-500",
                "bg-sky-500",
                "bg-rose-500",
              ];

              return (
                <div
                  key={item.label}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/70 p-3"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${dotColors[index % dotColors.length]}`}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {share.toFixed(1)}% of total
                        {item.meta ? ` • ${item.meta}` : ""}
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-foreground">
                    {formatUsageValue(item.value)} {unitLabel}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
