"use client";

import { BarChart3 } from "lucide-react";

type TrendDatum = {
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

export const TrendGraph = ({
  title = "Usage Trend",
  trendMode,
  onTrendModeChange,
  data,
  totalKwh,
  unitLabel = "kWh",
  emptyMessage = "No usage data available for this selection.",
}: {
  title?: string;
  trendMode: "day" | "device" | "month";
  onTrendModeChange: (mode: "day" | "device" | "month") => void;
  data: TrendDatum[];
  totalKwh?: number;
  unitLabel?: string;
  emptyMessage?: string;
}) => {
  const modes: Array<{ id: "day" | "device" | "month"; label: string }> = [
    { id: "day", label: "Daily" },
    { id: "device", label: "Device" },
    { id: "month", label: "Monthly" },
  ];
  const maxValue = Math.max(...data.map((item) => item.value), 0);

  return (
    <div className="bg-card rounded-xl border border-border p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <div className="flex gap-2">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onTrendModeChange(mode.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                trendMode === mode.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center border border-dashed border-border rounded-lg bg-secondary/20">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{emptyMessage}</p>
            {typeof totalKwh === "number" && (
              <p className="text-xs mt-2">Total usage: {formatUsageValue(totalKwh)} kWh</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 rounded-lg border border-border bg-secondary/10 p-4">
          <div className="space-y-4">
            {data.map((item) => {
              const width = maxValue > 0 ? (item.value / maxValue) * 100 : 0;

              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.label}
                      </p>
                      {item.meta && (
                        <p className="text-xs text-muted-foreground">{item.meta}</p>
                      )}
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-foreground">
                      {formatUsageValue(item.value)} {unitLabel}
                    </p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-300"
                      style={{ width: `${Math.max(width, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
