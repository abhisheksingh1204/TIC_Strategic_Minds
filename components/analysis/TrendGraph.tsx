"use client";

import { PieChart as PieChartIcon } from "lucide-react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type TrendDatum = {
  label: string;
  value: number;
  meta?: string;
};

const CHART_COLORS = [
  "#2563eb",
  "#0f766e",
  "#ea580c",
  "#7c3aed",
  "#dc2626",
  "#0891b2",
  "#65a30d",
  "#c2410c",
];

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

  const chartData = data.map((item, index) => ({
    ...item,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));
  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-card rounded-xl border border-border p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 gap-3">
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

      {chartData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center border border-dashed border-border rounded-lg bg-secondary/20">
          <div className="text-center text-muted-foreground">
            <PieChartIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{emptyMessage}</p>
            {typeof totalKwh === "number" && (
              <p className="text-xs mt-2">
                Total usage: {formatUsageValue(totalKwh)} {unitLabel}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 rounded-lg border border-border bg-secondary/10 p-4 min-h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="48%"
                innerRadius={82}
                outerRadius={152}
                paddingAngle={2}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`${entry.label}-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  borderRadius: "12px",
                  color: "#f8fafc",
                }}
                formatter={(value, _name, item) => {
                  const numericValue = Number(value ?? 0);
                  const share = totalValue > 0 ? (numericValue / totalValue) * 100 : 0;
                  return [
                    `${formatUsageValue(numericValue)} ${unitLabel} (${share.toFixed(1)}%)`,
                    item.payload.label,
                  ];
                }}
              />
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
