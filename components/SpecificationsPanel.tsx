"use client";

import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export const SpecificationsPanel = ({
  devices,
  liveLoadKw,
  estimatedCost,
  statusLabel = "Live Active Load",
  costLabel,
  onDetails,
}: {
  devices: Array<{ wattage: number; isOn: boolean }>;
  liveLoadKw?: number;
  estimatedCost?: number;
  statusLabel?: string;
  costLabel?: string;
  onDetails?: () => void;
}) => {
  const activeDevices = devices.filter((d) => d.isOn).length;
  const computedLiveLoadKw =
    devices
      .filter((d) => d.isOn)
      .reduce((total, device) => total + (device.wattage || 0), 0) / 1000;
  const displayValue = estimatedCost ?? liveLoadKw ?? computedLiveLoadKw;
  const displayLabel = costLabel ?? statusLabel;
  const displaySuffix = estimatedCost !== undefined ? "" : " kW";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-4 py-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
        <Zap className="h-5 w-5 text-accent" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Active Devices</p>
        <p className="text-sm font-semibold text-foreground">{activeDevices}</p>
      </div>
      <div className="h-8 w-px bg-border" />
      <div>
        <p className="text-xs text-muted-foreground">{displayLabel}</p>
        <p className="text-sm font-semibold text-foreground">{displayValue.toFixed(2)}{displaySuffix}</p>
      </div>
      <Button variant="ghost" size="sm" className="ml-2" onClick={onDetails}>
        Details
      </Button>
    </div>
  );
};
