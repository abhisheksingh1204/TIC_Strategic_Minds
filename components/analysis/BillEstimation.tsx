"use client";

import { IndianRupee } from "lucide-react";

const formatUsageValue = (value: number) => {
  if (value === 0) return "0.00";
  if (Math.abs(value) < 0.01) return value.toFixed(4);
  if (Math.abs(value) < 0.1) return value.toFixed(3);
  return value.toFixed(2);
};

export const BillEstimation = ({
  trendMode,
  roomName,
  totalKwh,
  ratePerKwh = 8,
  itemLabel = "devices",
  itemCount = 0,
}: {
  trendMode: "day" | "device" | "month";
  roomName: string;
  totalKwh?: number;
  ratePerKwh?: number;
  itemLabel?: string;
  itemCount?: number;
}) => {
  const estimatedCost =
    typeof totalKwh === "number" ? totalKwh * ratePerKwh : null;
  const dailyAverage = typeof totalKwh === "number" ? totalKwh / 30 : null;
  const annualProjection = estimatedCost !== null ? estimatedCost * 12 : null;

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-foreground">Bill Estimation</h3>
        <span className="text-xs text-muted-foreground capitalize">{trendMode}</span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Room: {roomName}</p>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
          <IndianRupee className="w-6 h-6 text-accent" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Estimated Monthly Cost</p>
          <p className="text-2xl font-bold text-accent">
            {estimatedCost !== null ? `₹${formatUsageValue(estimatedCost)}` : "—"}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-secondary/20 p-4">
          <p className="text-xs text-muted-foreground">Daily Average</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {dailyAverage !== null ? `${formatUsageValue(dailyAverage)} kWh` : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-secondary/20 p-4">
          <p className="text-xs text-muted-foreground">Annual Projection</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {annualProjection !== null ? `₹${formatUsageValue(annualProjection)}` : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-secondary/20 p-4">
          <p className="text-xs text-muted-foreground">Included {itemLabel}</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{itemCount}</p>
        </div>
      </div>
    </div>
  );
};
