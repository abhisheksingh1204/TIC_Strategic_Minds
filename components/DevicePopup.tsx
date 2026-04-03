"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type PopupDevice = {
  instanceId: string;
  name: string;
  wattage: number;
  hoursPerDay: number;
  isOn: boolean;
};

export const DevicePopup = ({
  device,
  isOpen,
  onClose,
  onSave,
  onDelete,
  mcbOn,
}: {
  device: PopupDevice | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (device: PopupDevice) => void | Promise<void>;
  onDelete: (instanceId: string) => void;
  mcbOn: boolean;
}) => {
  const [localDevice, setLocalDevice] = React.useState(device);

  React.useEffect(() => {
    setLocalDevice(device);
  }, [device]);

  if (!isOpen || !localDevice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{localDevice.name}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            x
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Wattage</label>
            <Input
              type="number"
              value={localDevice.wattage}
              onChange={(e) =>
                setLocalDevice({
                  ...localDevice,
                  wattage: Number(e.target.value),
                })
              }
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Hours Per Day</label>
            <Input
              type="number"
              value={localDevice.hoursPerDay}
              onChange={(e) =>
                setLocalDevice({
                  ...localDevice,
                  hoursPerDay: Number(e.target.value),
                })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Power</span>
            <Switch
              checked={localDevice.isOn && mcbOn}
              onCheckedChange={(checked) =>
                setLocalDevice({ ...localDevice, isOn: checked })
              }
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => onDelete(localDevice.instanceId)}
          >
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="electric"
              onClick={async () => {
                await onSave(localDevice);
                onClose();
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
