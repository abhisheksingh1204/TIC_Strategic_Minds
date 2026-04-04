"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type PopupDevice = {
  instanceId: string;
  name: string;
  wattage: number;
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
      <div className="relative z-10 mx-4 w-full max-w-lg rounded-2xl border border-border bg-[#060b14] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-semibold text-foreground">{localDevice.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Device power is persisted by the backend. Sessions stay active until you explicitly turn the device off.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xl text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Wattage</label>
            <Input
              type="number"
              value={localDevice.wattage}
              className="bg-card/95 border-border/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              onChange={(e) =>
                setLocalDevice({
                  ...localDevice,
                  wattage: Number(e.target.value),
                })
              }
            />
          </div>

          <div className="rounded-2xl border border-border bg-secondary/20 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Device Power</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Turn ON to start a usage session. Turn OFF to close the session and calculate energy and cost.
                </p>
              </div>
              <Switch
                checked={localDevice.isOn && mcbOn}
                onCheckedChange={(checked) =>
                  setLocalDevice({ ...localDevice, isOn: checked })
                }
              />
            </div>

            {!mcbOn && (
              <p className="mt-3 text-xs text-amber-300">
                Main MCB is OFF. Turn it on before switching this device on.
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => onDelete(localDevice.instanceId)}
          >
            Delete
          </Button>
          <div className="flex items-center gap-2">
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
