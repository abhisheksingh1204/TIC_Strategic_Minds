"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Zap,
  Refrigerator,
  Wind,
  Tv,
  Lightbulb,
  WashingMachine,
  Fan,
  Microwave,
  Monitor,
  Heater,
  Undo2,
  Redo2,
  Save,
  FileText,
  Search,
  Plus,
  Power,
  ArrowLeft,
  Droplets,
  CookingPot,
  Lamp,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { DevicePopup } from "@/components/DevicePopup";
import { SpecificationsPanel } from "@/components/SpecificationsPanel";
import { ROOMS_BY_PROPERTY_QUERY } from "@/lib/graphql/queries/rooms.queries";
import {
  CREATE_EQUIPMENT_MUTATION,
  DELETE_EQUIPMENT_MUTATION,
  EQUIPMENTS_BY_ROOM_QUERY,
  UPDATE_EQUIPMENT_MUTATION,
} from "@/lib/graphql/queries/equipment.queries";
import {
  ACTIVE_TARIFF_QUERY,
  CREATE_TARIFF_MUTATION,
} from "@/lib/graphql/queries/tariff.queries";

interface Device {
  id: string;
  name: string;
  icon: React.ElementType;
  defaultWattage: number;
  minWattage: number;
  maxWattage: number;
  category: string;
}

interface PlacedDevice extends Device {
  instanceId: string;
  x: number;
  y: number;
  rotation: number;
  wattage: number;
  hoursPerDay: number;
  isOn: boolean;
  deviceNumber: string;
}

const devices: Device[] = [
  { id: "fridge", name: "Refrigerator", icon: Refrigerator, defaultWattage: 150, minWattage: 100, maxWattage: 400, category: "kitchen" },
  { id: "ac", name: "AC", icon: Wind, defaultWattage: 1500, minWattage: 500, maxWattage: 3000, category: "basic" },
  { id: "tv", name: "TV", icon: Tv, defaultWattage: 100, minWattage: 50, maxWattage: 300, category: "basic" },
  { id: "led", name: "LED Bulb", icon: Lightbulb, defaultWattage: 10, minWattage: 5, maxWattage: 20, category: "basic" },
  { id: "washing", name: "Washing Machine", icon: WashingMachine, defaultWattage: 500, minWattage: 300, maxWattage: 1000, category: "washroom" },
  { id: "fan", name: "Fan", icon: Fan, defaultWattage: 75, minWattage: 30, maxWattage: 120, category: "basic" },
  { id: "microwave", name: "Microwave", icon: Microwave, defaultWattage: 1000, minWattage: 600, maxWattage: 1500, category: "kitchen" },
  { id: "computer", name: "Computer", icon: Monitor, defaultWattage: 200, minWattage: 100, maxWattage: 500, category: "basic" },
  { id: "heater", name: "Heater", icon: Heater, defaultWattage: 1500, minWattage: 500, maxWattage: 3000, category: "washroom" },
  { id: "geyser", name: "Geyser", icon: Droplets, defaultWattage: 2000, minWattage: 1000, maxWattage: 3000, category: "washroom" },
  { id: "induction", name: "Induction", icon: CookingPot, defaultWattage: 1800, minWattage: 1000, maxWattage: 2500, category: "kitchen" },
  { id: "lamp", name: "Table Lamp", icon: Lamp, defaultWattage: 40, minWattage: 20, maxWattage: 100, category: "basic" },
];

const categories = [
  { id: "all", label: "All Devices" },
  { id: "basic", label: "Basic Devices" },
  { id: "kitchen", label: "Kitchen Devices" },
  { id: "washroom", label: "Washroom Devices" },
  { id: "other", label: "Other" },
];

type TariffType = "FLAT" | "SLAB";
type BillingBreakdown = {
  slabUpto: number | null;
  pricePerUnit: number;
  consumedKwh: number;
  cost: number;
};

const DEFAULT_FLAT_PRICE_PER_UNIT = "8";
const STANDARD_SLABS: BillingBreakdown[] = [
  { slabUpto: 100, pricePerUnit: 3, consumedKwh: 0, cost: 0 },
  { slabUpto: 200, pricePerUnit: 5, consumedKwh: 0, cost: 0 },
  { slabUpto: null, pricePerUnit: 7, consumedKwh: 0, cost: 0 },
];

const categoryIconMap: Record<string, React.ElementType> = {
  basic: Zap,
  kitchen: CookingPot,
  washroom: Droplets,
  other: Lamp,
};

const DEVICE_CATALOG_MAP: Record<string, string> = {
  fridge: "000000000000000000000001",
  ac: "000000000000000000000002",
  tv: "000000000000000000000003",
  led: "000000000000000000000004",
  washing: "000000000000000000000005",
  fan: "000000000000000000000006",
  microwave: "000000000000000000000007",
  computer: "000000000000000000000008",
  heater: "000000000000000000000009",
  geyser: "00000000000000000000000a",
  induction: "00000000000000000000000b",
  lamp: "00000000000000000000000c",
};

const CATALOG_DEVICE_MAP = Object.fromEntries(
  Object.entries(DEVICE_CATALOG_MAP).map(([deviceId, catalogId]) => [catalogId, deviceId])
) as Record<string, string>;

type RoomRecord = {
  id: string;
  roomName: string;
};

type EquipmentRecord = {
  id: string;
  catalogId: string;
  ratedPowerWatt: number;
  hoursPerDay?: number;
  isOn?: boolean;
  quantity: number;
};

type RoomsByPropertyQueryData = {
  roomsByProperty: RoomRecord[];
};

type EquipmentsByRoomQueryData = {
  equipmentsByRoom: EquipmentRecord[];
};

type ActiveTariffQueryData = {
  activeTariff: {
    tariffType: TariffType;
    slabs?: Array<{
      pricePerUnit: number;
    }>;
  } | null;
};

type CreateEquipmentMutationData = {
  createEquipment: {
    id: string;
    roomId: string;
    catalogId: string;
    ratedPowerWatt: number;
    hoursPerDay?: number;
    isOn?: boolean;
    quantity: number;
  };
};

type SimulatorSnapshot = {
  placedDevices: PlacedDevice[];
  mcbOn: boolean;
};

const isMongoId = (value: string) => /^[a-f0-9]{24}$/i.test(value);

const calculateBillBreakdown = (
  totalKwh: number,
  tariffType: TariffType,
  flatPricePerUnit: number
) => {
  if (tariffType === "FLAT") {
    const totalCost = totalKwh * flatPricePerUnit;

    return {
      totalCost,
      breakdown: [
        {
          slabUpto: null,
          pricePerUnit: flatPricePerUnit,
          consumedKwh: totalKwh,
          cost: totalCost,
        },
      ] as BillingBreakdown[],
    };
  }

  let remaining = totalKwh;
  let prevLimit = 0;
  let totalCost = 0;

  const breakdown = STANDARD_SLABS.map((slab) => {
    if (remaining <= 0) {
      return { ...slab };
    }

    const slabLimit =
      slab.slabUpto != null ? slab.slabUpto - prevLimit : remaining;
    const consumedKwh = Math.min(remaining, slabLimit);
    const cost = consumedKwh * slab.pricePerUnit;

    remaining -= consumedKwh;
    totalCost += cost;
    if (slab.slabUpto != null) {
      prevLimit = slab.slabUpto;
    }

    return {
      ...slab,
      consumedKwh,
      cost,
    };
  }).filter((slab) => slab.consumedKwh > 0);

  return { totalCost, breakdown };
};

export default function Simulator() {
  const router = useRouter();
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const [queryParams, setQueryParams] = useState({
    roomName: "Living Room",
    propertyId: "",
    routeRoomId: "",
  });
  const roomName = queryParams.roomName;
  const propertyId = queryParams.propertyId;
  const routeRoomId = queryParams.routeRoomId;
  
  const [placedDevices, setPlacedDevices] = useState<PlacedDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [devicePopupOpen, setDevicePopupOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [mcbOn, setMcbOn] = useState(true);
  const [customDevices, setCustomDevices] = useState<Device[]>([]);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customWattage, setCustomWattage] = useState("");
  const [customCategory, setCustomCategory] = useState("other");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportGeneratedAt, setReportGeneratedAt] = useState("");
  const [tariffDialogOpen, setTariffDialogOpen] = useState(true);
  const [tariffType, setTariffType] = useState<TariffType>("FLAT");
  const [flatPricePerUnit, setFlatPricePerUnit] = useState(DEFAULT_FLAT_PRICE_PER_UNIT);
  const mcbOnRef = useRef(mcbOn);
  const historyRef = useRef<SimulatorSnapshot[]>([]);
  const historyIndexRef = useRef(0);
  const loadedStorageKeyRef = useRef("");

  useEffect(() => {
    mcbOnRef.current = mcbOn;
  }, [mcbOn]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      setQueryParams({
        roomName: params.get("roomName") || "Living Room",
        propertyId: params.get("propertyId") || "",
        routeRoomId: params.get("roomId") || "",
      });
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const { data: roomData } = useQuery<RoomsByPropertyQueryData>(ROOMS_BY_PROPERTY_QUERY, {
    variables: { propertyId },
    skip: !propertyId,
    fetchPolicy: "network-only",
  });

  const rooms: RoomRecord[] = roomData?.roomsByProperty ?? [];
  const normalizedRoomName = roomName.trim().toLowerCase();
  const activeRoom =
    rooms.find((room) => room.roomName.trim().toLowerCase() === normalizedRoomName) ??
    null;
  const resolvedRoomId = routeRoomId || activeRoom?.id || "";
  const roomId = isMongoId(resolvedRoomId) ? resolvedRoomId : "";

  const {
    data: equipmentData,
    loading: equipmentLoading,
    error: equipmentError,
    refetch: refetchEquipments,
  } = useQuery<EquipmentsByRoomQueryData>(EQUIPMENTS_BY_ROOM_QUERY, {
    variables: { roomId },
    skip: !roomId,
    fetchPolicy: "network-only",
  });

  const [createEquipment] = useMutation<CreateEquipmentMutationData>(CREATE_EQUIPMENT_MUTATION);
  const [updateEquipment] = useMutation(UPDATE_EQUIPMENT_MUTATION);
  const [deleteEquipment] = useMutation(DELETE_EQUIPMENT_MUTATION);
  const [createTariff] = useMutation(CREATE_TARIFF_MUTATION);
  const todayDate = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const { data: activeTariffData } = useQuery<ActiveTariffQueryData>(ACTIVE_TARIFF_QUERY, {
    variables: { propertyId, date: todayDate },
    skip: !propertyId,
    fetchPolicy: "network-only",
  });

  const didHydrateFromServer = Boolean(roomId && equipmentData);
  const storageKey = useMemo(
    () => `simulator:${propertyId || "local"}:${roomName.trim().toLowerCase() || "default-room"}`,
    [propertyId, roomName]
  );

  const mergeServerDevicesWithSnapshot = useCallback(
    (serverDevices: PlacedDevice[]) => {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        return serverDevices;
      }

      try {
        const parsed = JSON.parse(raw) as Partial<SimulatorSnapshot> & {
          devices?: PlacedDevice[];
          tariffType?: TariffType;
          flatPricePerUnit?: string;
        };
        const snapshotDevices =
          Array.isArray(parsed.placedDevices)
            ? parsed.placedDevices
            : Array.isArray(parsed.devices)
              ? parsed.devices
              : [];

        const snapshotMap = new Map(
          snapshotDevices.map((device) => [device.instanceId, device])
        );

        return serverDevices.map((device) => {
          const snapshot = snapshotMap.get(device.instanceId);
          if (!snapshot) return device;

          return {
            ...device,
            x: snapshot.x,
            y: snapshot.y,
            rotation: snapshot.rotation ?? 0,
          };
        });
      } catch {
        return serverDevices;
      }
    },
    [storageKey]
  );

  useEffect(() => {
    if (!propertyId || !activeRoom?.id || routeRoomId) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      params.set("propertyId", propertyId);
      params.set("roomId", activeRoom.id);
      params.set("roomName", roomName);
      const nextUrl = `/appin/simulator?${params.toString()}`;
      router.replace(nextUrl);
      setQueryParams((prev) => ({ ...prev, routeRoomId: activeRoom.id }));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [activeRoom?.id, propertyId, roomName, routeRoomId, router]);

  const allDevices = useMemo(() => [...devices, ...customDevices], [customDevices]);
  const selectedDevice = useMemo(
    () =>
      selectedDeviceId
        ? placedDevices.find((device) => device.instanceId === selectedDeviceId) ?? null
        : null,
    [placedDevices, selectedDeviceId]
  );

  const filteredDevices = allDevices.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || d.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const hydratePlacedDevicesFromServer = useCallback((fromServer: EquipmentRecord[]) => {
    const mapped: PlacedDevice[] = fromServer.map((equipment, idx) => {
      const mappedDeviceId = CATALOG_DEVICE_MAP[equipment.catalogId] ?? "lamp";
      const base =
        devices.find((d) => d.id === mappedDeviceId) ??
        devices.find((d) => d.id === "lamp")!;
      const totalWattage = Math.max(
        1,
        Math.round(equipment.ratedPowerWatt * (equipment.quantity || 1))
      );
      return {
        ...base,
        instanceId: equipment.id,
        x: 100 + (idx % 4) * 120,
        y: 90 + Math.floor(idx / 4) * 110,
        rotation: 0,
        wattage: totalWattage,
        hoursPerDay: typeof equipment.hoursPerDay === "number" ? equipment.hoursPerDay : 4,
        isOn: Boolean(equipment.isOn),
        deviceNumber: `${base.id.toUpperCase()}-${String(idx + 1).padStart(2, "0")}`,
      };
    });

    const merged = mergeServerDevicesWithSnapshot(mapped);
    setPlacedDevices(merged);
    const nextHistory = [{ placedDevices: merged, mcbOn: mcbOnRef.current }];
    historyRef.current = nextHistory;
    historyIndexRef.current = 0;
  }, [mergeServerDevicesWithSnapshot]);

  useEffect(() => {
    if (!storageKey || loadedStorageKeyRef.current === storageKey) {
      return;
    }
    loadedStorageKeyRef.current = storageKey;

    const timeoutId = window.setTimeout(() => {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        return;
      }
      try {
        const parsed = JSON.parse(raw) as Partial<SimulatorSnapshot> & {
          devices?: PlacedDevice[];
          tariffType?: TariffType;
          flatPricePerUnit?: string;
        };
        const nextDevices =
          Array.isArray(parsed.placedDevices)
            ? parsed.placedDevices
            : Array.isArray(parsed.devices)
              ? parsed.devices
              : [];
        const nextMcbOn = typeof parsed.mcbOn === "boolean" ? parsed.mcbOn : true;
        const nextTariffType =
          parsed.tariffType === "SLAB" || parsed.tariffType === "FLAT"
            ? parsed.tariffType
            : "FLAT";
        const nextFlatPricePerUnit =
          typeof parsed.flatPricePerUnit === "string"
            ? parsed.flatPricePerUnit
            : DEFAULT_FLAT_PRICE_PER_UNIT;

        setPlacedDevices(nextDevices);
        setMcbOn(nextMcbOn);
        setTariffType(nextTariffType);
        setFlatPricePerUnit(nextFlatPricePerUnit);
        historyRef.current = [{ placedDevices: nextDevices, mcbOn: nextMcbOn }];
        historyIndexRef.current = 0;
      } catch {
        // Ignore malformed snapshot and keep current state.
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [storageKey]);

  useEffect(() => {
    const activeTariff = activeTariffData?.activeTariff;

    if (!activeTariff) {
      return;
    }

    const nextTariffType =
      activeTariff.tariffType === "SLAB" || activeTariff.tariffType === "FLAT"
        ? activeTariff.tariffType
        : "FLAT";

    const timeoutId = window.setTimeout(() => {
      setTariffType(nextTariffType);

      if (nextTariffType === "FLAT") {
        const nextFlatPrice =
          typeof activeTariff.slabs?.[0]?.pricePerUnit === "number"
            ? String(activeTariff.slabs[0].pricePerUnit)
            : DEFAULT_FLAT_PRICE_PER_UNIT;
        setFlatPricePerUnit(nextFlatPrice);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [activeTariffData]);

  useEffect(() => {
    if (!roomId || equipmentLoading || Boolean(equipmentError) || !equipmentData) {
      return;
    }
    const fromServer: EquipmentRecord[] = equipmentData?.equipmentsByRoom ?? [];
    const timeoutId = window.setTimeout(() => {
      hydratePlacedDevicesFromServer(fromServer);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [
    equipmentData,
    roomId,
    equipmentLoading,
    equipmentError,
    hydratePlacedDevicesFromServer,
  ]);

  useEffect(() => {
    if (!storageKey) {
      return;
    }
    const payload = {
      roomName,
      propertyId,
      savedAt: new Date().toISOString(),
      devices: placedDevices,
      placedDevices,
      mcbOn,
      tariffType,
      flatPricePerUnit,
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [flatPricePerUnit, mcbOn, placedDevices, propertyId, roomName, storageKey, tariffType]);

  const pushHistory = useCallback((nextDevices: PlacedDevice[], nextMcbOn: boolean) => {
    const snapshot: SimulatorSnapshot = {
      placedDevices: nextDevices,
      mcbOn: nextMcbOn,
    };
    const base =
      historyIndexRef.current >= 0
        ? historyRef.current.slice(0, historyIndexRef.current + 1)
        : historyRef.current;
    const nextHistory = [...base, snapshot].slice(-100);
    const nextIndex = nextHistory.length - 1;

    historyRef.current = nextHistory;
    historyIndexRef.current = nextIndex;
  }, []);

  const resolveDropPosition = useCallback((clientX: number, clientY: number) => {
    const container = layoutRef.current;
    if (!container) {
      return {
        x: 100 + Math.random() * 300,
        y: 100 + Math.random() * 200,
      };
    }

    const rect = container.getBoundingClientRect();
    const padding = 24;
    const deviceWidth = 96;
    const deviceHeight = 96;

    return {
      x: Math.min(
        Math.max(clientX - rect.left - deviceWidth / 2, padding),
        Math.max(padding, rect.width - deviceWidth - padding)
      ),
      y: Math.min(
        Math.max(clientY - rect.top - deviceHeight / 2, padding),
        Math.max(padding, rect.height - deviceHeight - padding)
      ),
    };
  }, []);

  const movePlacedDevice = useCallback(
    (instanceId: string, x: number, y: number) => {
      setPlacedDevices((prev) => {
        const next = prev.map((device) =>
          device.instanceId === instanceId ? { ...device, x, y } : device
        );
        pushHistory(next, mcbOn);
        return next;
      });
    },
    [mcbOn, pushHistory]
  );

  const addDevice = useCallback(async (device: Device, position?: { x: number; y: number }) => {
    const dropPosition = position ?? {
      x: 100 + Math.random() * 300,
      y: 100 + Math.random() * 200,
    };
    const catalogId = DEVICE_CATALOG_MAP[device.id];
    if (roomId && catalogId) {
      try {
        const result = await createEquipment({
          variables: {
            input: {
              roomId,
              catalogId,
              ratedPowerWatt: device.defaultWattage,
              hoursPerDay: 4,
              isOn: false,
              quantity: 1,
              efficiencyFactor: 1,
              mode: "MANUAL",
            },
          },
          refetchQueries: [{ query: EQUIPMENTS_BY_ROOM_QUERY, variables: { roomId } }],
        });
        const createdEquipment = result.data?.createEquipment;

        if (createdEquipment?.id) {
          const newDevice: PlacedDevice = {
            ...device,
            instanceId: createdEquipment.id,
            x: dropPosition.x,
            y: dropPosition.y,
            rotation: 0,
            wattage: createdEquipment.ratedPowerWatt ?? device.defaultWattage,
            hoursPerDay: createdEquipment.hoursPerDay ?? 4,
            isOn: Boolean(createdEquipment.isOn),
            deviceNumber: `${device.id.toUpperCase()}-${String(
              placedDevices.filter((d) => d.id === device.id).length + 1
            ).padStart(2, "0")}`,
          };
          setPlacedDevices((prev) => {
            const next = [...prev, newDevice];
            pushHistory(next, mcbOn);
            return next;
          });
        }
        toast.success(`${device.name} added to room`);
        return;
      } catch {
        toast.error("Could not save device to room. Please sign in again and retry.");
        return;
      }
    }

    const newDevice: PlacedDevice = {
      ...device,
      instanceId: `${device.id}-${Date.now()}`,
      x: dropPosition.x,
      y: dropPosition.y,
      rotation: 0,
      wattage: device.defaultWattage,
      hoursPerDay: 4,
      isOn: false,
      deviceNumber: `${device.id.toUpperCase()}-${String(placedDevices.filter(d => d.id === device.id).length + 1).padStart(2, '0')}`,
    };
    setPlacedDevices((prev) => {
      const next = [...prev, newDevice];
      pushHistory(next, mcbOn);
      return next;
    });
    toast.success(`${device.name} added to room`);
  }, [createEquipment, mcbOn, placedDevices, pushHistory, roomId]);

  const handleCatalogDragStart = useCallback((event: React.DragEvent, deviceId: string) => {
    event.dataTransfer.setData("application/x-power-fusion-device-id", deviceId);
    event.dataTransfer.effectAllowed = "copy";
  }, []);

  const handlePlacedDeviceDragStart = useCallback(
    (event: React.DragEvent, instanceId: string) => {
      event.dataTransfer.setData("application/x-power-fusion-instance-id", instanceId);
      event.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleLayoutDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer.types.includes("application/x-power-fusion-device-id")) {
      event.dataTransfer.dropEffect = "copy";
      return;
    }
    if (event.dataTransfer.types.includes("application/x-power-fusion-instance-id")) {
      event.dataTransfer.dropEffect = "move";
    }
  }, []);

  const handleLayoutDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const deviceId = event.dataTransfer.getData("application/x-power-fusion-device-id");
      if (deviceId) {
        const device = allDevices.find((item) => item.id === deviceId);
        if (device) {
          void addDevice(device, resolveDropPosition(event.clientX, event.clientY));
        }
        return;
      }

      const instanceId = event.dataTransfer.getData("application/x-power-fusion-instance-id");
      if (instanceId) {
        const nextPosition = resolveDropPosition(event.clientX, event.clientY);
        movePlacedDevice(instanceId, nextPosition.x, nextPosition.y);
      }
    },
    [addDevice, allDevices, movePlacedDevice, resolveDropPosition]
  );

  const removeDevice = useCallback(async (instanceId: string) => {
    const isPersisted = /^[a-f0-9]{24}$/i.test(instanceId);
    if (roomId) {
      if (!isPersisted) {
        setPlacedDevices((prev) => {
          const next = prev.filter((d) => d.instanceId !== instanceId);
          pushHistory(next, mcbOn);
          return next;
        });
        setSelectedDeviceId(null);
        toast.info("Local device removed");
        return;
      }
      try {
        await deleteEquipment({
          variables: { equipmentId: instanceId },
          refetchQueries: [{ query: EQUIPMENTS_BY_ROOM_QUERY, variables: { roomId } }],
        });
        setSelectedDeviceId(null);
        toast.info("Device removed");
        return;
      } catch {
        toast.error("Could not delete device from room");
        return;
      }
    }
    setPlacedDevices((prev) => {
      const next = prev.filter((d) => d.instanceId !== instanceId);
      pushHistory(next, mcbOn);
      return next;
    });
    setSelectedDeviceId(null);
    toast.info("Device removed");
  }, [deleteEquipment, mcbOn, pushHistory, roomId]);

  const updateDevice = useCallback(async (updatedDevice: PlacedDevice) => {
    const isPersisted = /^[a-f0-9]{24}$/i.test(updatedDevice.instanceId);
    if (roomId) {
      if (!isPersisted) {
        setPlacedDevices((prev) => {
          const next = prev.map((d) =>
            d.instanceId === updatedDevice.instanceId ? updatedDevice : d
          );
          pushHistory(next, mcbOn);
          return next;
        });
        setSelectedDeviceId(updatedDevice.instanceId);
        toast.success("Local device updated");
        return;
      }
      try {
        setPlacedDevices((prev) => {
          const next = prev.map((d) =>
            d.instanceId === updatedDevice.instanceId ? updatedDevice : d
          );
          pushHistory(next, mcbOn);
          return next;
        });
        console.log("Simulator updateEquipment mutation", {
          equipmentId: updatedDevice.instanceId,
          isOn: updatedDevice.isOn,
        });
        await updateEquipment({
          variables: {
            input: {
              equipmentId: updatedDevice.instanceId,
              ratedPowerWatt: updatedDevice.wattage,
              hoursPerDay: updatedDevice.hoursPerDay,
              isOn: updatedDevice.isOn,
            },
          },
          refetchQueries: [{ query: EQUIPMENTS_BY_ROOM_QUERY, variables: { roomId } }],
        });
        setSelectedDeviceId(updatedDevice.instanceId);
        toast.success("Device updated");
        return;
      } catch {
        void refetchEquipments?.();
        toast.error("Could not update device on server");
        return;
      }
    }

    setPlacedDevices((prev) => {
      const next = prev.map((d) =>
        d.instanceId === updatedDevice.instanceId ? updatedDevice : d
      );
      pushHistory(next, mcbOn);
      return next;
    });
    setSelectedDeviceId(updatedDevice.instanceId);
  }, [mcbOn, pushHistory, refetchEquipments, roomId, updateEquipment]);

  const toggleDevicePower = useCallback((instanceId: string) => {
    if (!mcbOn) {
      toast.error("Turn ON main MCB first");
      return;
    }

    if (roomId) {
      const target = placedDevices.find((device) => device.instanceId === instanceId);
      if (!target) {
        return;
      }

      if (!isMongoId(instanceId)) {
        const nextDevices = placedDevices.map((device) =>
          device.instanceId === instanceId ? { ...device, isOn: !device.isOn } : device
        );
        setPlacedDevices(nextDevices);
        pushHistory(nextDevices, mcbOn);
        return;
      }

      const nextDevices = placedDevices.map((device) =>
        device.instanceId === instanceId ? { ...device, isOn: !device.isOn } : device
      );
      setPlacedDevices(nextDevices);
      pushHistory(nextDevices, mcbOn);

      console.log("Simulator toggleDevicePower mutation", {
        equipmentId: instanceId,
        isOn: !target.isOn,
      });
      void updateEquipment({
        variables: {
          input: {
            equipmentId: instanceId,
            isOn: !target.isOn,
            hoursPerDay: target.hoursPerDay,
            ratedPowerWatt: target.wattage,
          },
        },
        refetchQueries: [{ query: EQUIPMENTS_BY_ROOM_QUERY, variables: { roomId } }],
      })
        .catch(() => {
        void refetchEquipments?.();
        toast.error("Could not update device power on server");
      });
      return;
    }

    setPlacedDevices((prev) => {
      const next = prev.map((d) =>
        d.instanceId === instanceId ? { ...d, isOn: !d.isOn } : d
      );
      pushHistory(next, mcbOn);
      return next;
    });
  }, [mcbOn, placedDevices, pushHistory, roomId, updateEquipment, refetchEquipments]);

  const handleMcbToggle = (checked: boolean) => {
    setMcbOn(checked);
    if (!checked) {
      const nextDevices = placedDevices.map((d) => ({ ...d, isOn: false }));
      setPlacedDevices(nextDevices);
      pushHistory(nextDevices, checked);

      if (roomId) {
        const activePersistedDevices = placedDevices.filter(
          (device) => /^[a-f0-9]{24}$/i.test(device.instanceId) && device.isOn
        );

        if (activePersistedDevices.length > 0) {
          void Promise.all(
            activePersistedDevices.map((device) => {
              console.log("Simulator MCB-off updateEquipment mutation", {
                equipmentId: device.instanceId,
                isOn: false,
              });

              return updateEquipment({
                variables: {
                  input: {
                    equipmentId: device.instanceId,
                    ratedPowerWatt: device.wattage,
                    hoursPerDay: device.hoursPerDay,
                    isOn: false,
                  },
                },
                refetchQueries: [{ query: EQUIPMENTS_BY_ROOM_QUERY, variables: { roomId } }],
              });
            })
          )
            .catch(() => {
              void refetchEquipments?.();
              toast.error("Could not switch off all devices on server");
            });
        }
      }
      toast.info("Main power OFF - All devices turned off");
    } else {
      pushHistory(placedDevices, checked);
      toast.success("Main power ON");
    }
  };

  const handleDeviceClick = (device: PlacedDevice) => {
    setSelectedDeviceId(device.instanceId);
    setDevicePopupOpen(true);
  };

  const calculateDailyConsumption = () =>
    placedDevices.reduce((sum, device) => {
      if (!device.isOn) return sum;
      return sum + (device.wattage * device.hoursPerDay) / 1000;
    }, 0);

  const calculateMonthlyConsumptionForDevice = (device: PlacedDevice) =>
    device.isOn ? (((device.wattage * device.hoursPerDay) / 1000) * 30) : 0;

  const monthlyConsumptionKwh = useMemo(
    () =>
      placedDevices.reduce(
        (sum, device) => sum + calculateMonthlyConsumptionForDevice(device),
        0
      ),
    [placedDevices]
  );

  const normalizedFlatPricePerUnit = useMemo(() => {
    const parsed = Number.parseFloat(flatPricePerUnit);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [flatPricePerUnit]);

  const persistTariffSelection = useCallback(async () => {
    if (!propertyId) {
      return;
    }

    const slabs =
      tariffType === "FLAT"
        ? [{ pricePerUnit: normalizedFlatPricePerUnit }]
        : STANDARD_SLABS.map((slab) => ({
            uptoKwh: slab.slabUpto ?? undefined,
            pricePerUnit: slab.pricePerUnit,
          }));

    await createTariff({
      variables: {
        propertyId,
        tariffType,
        slabs,
        effectiveFrom: todayDate,
      },
      refetchQueries: [
        {
          query: ACTIVE_TARIFF_QUERY,
          variables: {
            propertyId,
            date: todayDate,
          },
        },
      ],
    });
  }, [
    createTariff,
    normalizedFlatPricePerUnit,
    propertyId,
    tariffType,
    todayDate,
  ]);

  const billingSummary = useMemo(
    () =>
      calculateBillBreakdown(
        monthlyConsumptionKwh,
        tariffType,
        normalizedFlatPricePerUnit
      ),
    [monthlyConsumptionKwh, normalizedFlatPricePerUnit, tariffType]
  );

  const effectiveMonthlyRate = useMemo(
    () =>
      monthlyConsumptionKwh > 0 ? billingSummary.totalCost / monthlyConsumptionKwh : 0,
    [billingSummary.totalCost, monthlyConsumptionKwh]
  );

  const calculateTotalLoad = () => {
    const activeLoad = placedDevices
      .filter((d) => d.isOn)
      .reduce((sum, d) => sum + d.wattage, 0);
    return (activeLoad / 1000).toFixed(2);
  };

  const handleSave = () => {
    const payload = {
      roomName,
      propertyId,
      savedAt: new Date().toISOString(),
      devices: placedDevices,
      placedDevices,
      mcbOn,
      tariffType,
      flatPricePerUnit,
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
    toast.success("Room configuration saved");
  };

  const handleGenerateReport = () => {
    setReportGeneratedAt(new Date().toLocaleString());
    setReportOpen(true);
    toast.success("Report displayed");
  };

  const handleUndo = () => {
    if (historyIndexRef.current <= 0) {
      toast.info("Nothing to undo");
      return;
    }
    const nextIndex = historyIndexRef.current - 1;
    const snapshot = historyRef.current[nextIndex];
    historyIndexRef.current = nextIndex;
    setPlacedDevices(snapshot.placedDevices);
    setMcbOn(snapshot.mcbOn);
  };

  const handleRedo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) {
      toast.info("Nothing to redo");
      return;
    }
    const nextIndex = historyIndexRef.current + 1;
    const snapshot = historyRef.current[nextIndex];
    historyIndexRef.current = nextIndex;
    setPlacedDevices(snapshot.placedDevices);
    setMcbOn(snapshot.mcbOn);
  };

  const handleAddCustomDevice = () => {
    const name = customName.trim();
    const wattage = Number(customWattage);

    if (!name) {
      toast.error("Please enter a device name");
      return;
    }
    if (!Number.isFinite(wattage) || wattage <= 0) {
      toast.error("Please enter a valid wattage");
      return;
    }

    const bounded = Math.round(wattage);
    const customDevice: Device = {
      id: `custom-${Date.now()}`,
      name,
      icon: categoryIconMap[customCategory] || Lamp,
      defaultWattage: bounded,
      minWattage: Math.max(1, Math.round(bounded * 0.5)),
      maxWattage: Math.max(2, Math.round(bounded * 2)),
      category: customCategory,
    };

    setCustomDevices((prev) => [...prev, customDevice]);
    void addDevice(customDevice);
    setCustomDialogOpen(false);
    setCustomName("");
    setCustomWattage("");
    setCustomCategory("other");
  };

  const handleClearAllDevices = useCallback(async () => {
    if (placedDevices.length === 0) {
      toast.info("No devices to remove");
      return;
    }

    const nextDevices: PlacedDevice[] = [];
    setPlacedDevices(nextDevices);
    pushHistory(nextDevices, mcbOn);
    setSelectedDeviceId(null);
    setDevicePopupOpen(false);

    if (roomId) {
      const persistedDevices = placedDevices.filter((device) => isMongoId(device.instanceId));

      if (persistedDevices.length > 0) {
        try {
          await Promise.all(
            persistedDevices.map((device) =>
              deleteEquipment({
                variables: { equipmentId: device.instanceId },
              })
            )
          );
          await refetchEquipments?.();
        } catch {
          void refetchEquipments?.();
          toast.error("Could not remove all synced devices");
          return;
        }
      }
    }

    toast.success("All devices removed from the room");
  }, [deleteEquipment, mcbOn, placedDevices, pushHistory, refetchEquipments, roomId]);

  return (
    <div className="app-shell min-h-screen">
      {/* Top Bar */}
      <header className="app-topbar mx-4 mt-4 flex-row px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-accent fill-accent" />
            <span className="text-lg font-bold text-foreground">
              Power<span className="text-primary">Fusion</span>
            </span>
          </div>
          {propertyId && (
            <span className="text-xs text-muted-foreground ml-2">
              {roomId ? "Room linked" : "Room not linked - local mode"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <SpecificationsPanel
            devices={placedDevices}
            estimatedCost={billingSummary.totalCost}
            costLabel={`Est. Monthly (${tariffType})`}
            onDetails={() => setDetailsOpen(true)}
          />
          <Button variant="glass" size="sm" onClick={handleUndo}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="glass" size="sm" onClick={handleRedo}>
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button variant="electric" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-7rem)] flex-1 px-4 pb-4 pt-4">
        {/* Left Section - Room Layout (2/3 width) */}
        <main
          ref={layoutRef}
          className="simulator-room app-content-panel flex-1 overflow-auto"
          onDragOver={handleLayoutDragOver}
          onDrop={handleLayoutDrop}
        >
          {/* Placed Devices */}
          <div className="simulator-floor relative min-h-[1200px] w-full p-8">
            <div className="absolute inset-0 simulator-grid pointer-events-none" />
            <div className="room-wall room-wall-top" />
            <div className="room-wall room-wall-right" />
            <div className="room-wall room-wall-bottom" />
            <div className="room-wall room-wall-left" />
            <div className="room-window" />
            <div className="room-door" />
            <div className="room-rug" />
            {/* Placed Items */}
            {placedDevices.map((device) => {
              const Icon = device.icon;
              const isActive = device.isOn && mcbOn;
              return (
                <div
                  key={device.instanceId}
                  className="absolute cursor-pointer transition-all duration-200 hover:scale-105"
                  style={{
                    left: device.x,
                    top: device.y,
                    transform: `rotate(${device.rotation ?? 0}deg)`,
                    transformOrigin: "center center",
                  }}
                  onClick={() => handleDeviceClick(device)}
                  draggable
                  onDragStart={(event) =>
                    handlePlacedDeviceDragStart(event, device.instanceId)
                  }
                >
                  <div className={`glass-card p-4 relative ${isActive ? "border-accent glow-accent" : "border-border"}`}>
                    <Icon className={`h-10 w-10 ${isActive ? "text-accent" : "text-muted-foreground"}`} />
                    
                    {/* Mini ON/OFF Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDevicePower(device.instanceId);
                      }}
                      className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                        isActive 
                          ? "bg-accent text-accent-foreground" 
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Power className="h-3 w-3" />
                    </button>
                    
                    {/* Status Label */}
                    <div className="text-xs text-center mt-2">
                      <span className={`font-medium ${isActive ? "text-accent" : "text-muted-foreground"}`}>
                        {isActive ? "ON" : "OFF"}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground text-center">
                      {device.wattage}W
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty State */}
            {placedDevices.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Lightbulb className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Drag devices from the panel</p>
                  <p className="text-sm">or click on them to add to your room</p>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right Section - Device Control Panel (1/3 width) */}
        <aside className="app-content-panel ml-4 flex w-1/3 max-w-md min-h-0 flex-col overflow-hidden p-0">
          {/* MCB Switch */}
          <div className={`p-4 border-b border-border ${mcbOn ? "bg-accent/10" : "bg-destructive/10"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  mcbOn ? "bg-accent/20" : "bg-destructive/20"
                }`}>
                  <Zap className={`h-6 w-6 ${mcbOn ? "text-accent" : "text-destructive"}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Main MCB</h3>
                  <p className="text-xs text-muted-foreground">Master power control</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${mcbOn ? "text-accent" : "text-destructive"}`}>
                  {mcbOn ? "ON" : "OFF"}
                </span>
                <Switch
                  checked={mcbOn}
                  onCheckedChange={handleMcbToggle}
                  className="data-[state=checked]:bg-accent"
                />
              </div>
            </div>
          </div>

          {/* Category Filters */}
          <div className="p-4 border-b border-border">
            <ScrollArea className="w-full">
              <div className="flex gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      activeCategory === cat.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search devices..."
                className="pl-9 h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Device List */}
          <ScrollArea className="flex-1 min-h-0 p-4">
            <div className="grid grid-cols-2 gap-3">
              {filteredDevices.map((device) => {
                const Icon = device.icon;
                return (
                  <button
                    key={device.id}
                    onClick={() => void addDevice(device)}
                    draggable
                    onDragStart={(event) => handleCatalogDragStart(event, device.id)}
                    className="aspect-square rounded-xl bg-secondary/30 border border-border hover:border-primary/50 hover:bg-secondary/50 flex flex-col items-center justify-center gap-2 transition-all duration-200 p-3"
                  >
                    <Icon className="h-8 w-8 text-primary" />
                    <span className="text-xs text-muted-foreground text-center leading-tight">
                      {device.name}
                    </span>
                    <span className="text-[10px] text-primary/70">
                      {device.defaultWattage}W
                    </span>
                  </button>
                );
              })}
            </div>

            {filteredDevices.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No devices found</p>
              </div>
            )}

            {propertyId && didHydrateFromServer && roomId && (
              <p className="mt-3 text-xs text-muted-foreground text-center">
                Devices on this page are synced with the selected room.
              </p>
            )}

            {/* Add Custom */}
            <Button
              variant="glass"
              className="w-full mt-4"
              onClick={() => setCustomDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Device
            </Button>

            <Button
              variant="outline"
              className="w-full mt-3 border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => void handleClearAllDevices()}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All Devices
            </Button>
          </ScrollArea>

          {/* Bottom Stats */}
          <div className="p-4 border-t border-border bg-card/50">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground">Active Load</p>
                <p className="text-xl font-bold text-foreground">{calculateTotalLoad()} kW</p>
              </div>
              <div className="p-3 rounded-lg bg-accent/10">
                <p className="text-xs text-muted-foreground">Monthly Est.</p>
                <p className="text-xl font-bold text-accent">Rs.{billingSummary.totalCost.toFixed(2)}</p>
              </div>
            </div>
            <Button variant="neon" className="w-full mt-4" onClick={handleGenerateReport}>
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </aside>
      </div>

      {/* Device Popup */}
      <DevicePopup
        device={selectedDevice}
        isOpen={devicePopupOpen}
        onClose={() => setDevicePopupOpen(false)}
        onSave={async (device) => {
          const currentDevice = placedDevices.find(
            (placedDevice) => placedDevice.instanceId === device.instanceId
          );
          if (!currentDevice) return;
          await updateDevice({
            ...currentDevice,
            ...device,
          });
        }}
        onDelete={removeDevice}
        mcbOn={mcbOn}
      />

      <Dialog
        open={tariffDialogOpen}
        onOpenChange={(open) => {
          if (!open && tariffType === "FLAT" && normalizedFlatPricePerUnit <= 0) {
            return;
          }
          setTariffDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Select Tariff Before Configuring The Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose the billing type first. This tariff will be used for the simulator bill estimate and report.
            </p>

            <div className="space-y-2">
              <label className="text-sm text-foreground">Tariff Type</label>
              <select
                value={tariffType}
                onChange={(event) => setTariffType(event.target.value as TariffType)}
                className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
              >
                <option value="FLAT">Flat</option>
                <option value="SLAB">Slab</option>
              </select>
            </div>

            {tariffType === "FLAT" ? (
              <div className="space-y-2">
                <label className="text-sm text-foreground">Price Per Unit</label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={flatPricePerUnit}
                  onChange={(event) => setFlatPricePerUnit(event.target.value)}
                  placeholder="Enter Rs./kWh"
                />
                {normalizedFlatPricePerUnit <= 0 && (
                  <p className="text-xs text-destructive">
                    Enter a valid flat price per unit to continue.
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                <p>0 - 100 kWh: Rs.3/unit</p>
                <p>101 - 200 kWh: Rs.5/unit</p>
                <p>Above 200 kWh: Rs.7/unit</p>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                variant="electric"
                disabled={tariffType === "FLAT" && normalizedFlatPricePerUnit <= 0}
                onClick={async () => {
                  try {
                    await persistTariffSelection();
                    setTariffDialogOpen(false);
                  } catch (error) {
                    const message =
                      error instanceof Error
                        ? error.message
                        : "Failed to save tariff";
                    toast.error(message);
                  }
                }}
              >
                Continue To Simulator
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Device</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-sm text-foreground">Device Name</label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., Water Purifier"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-foreground">Wattage (W)</label>
              <Input
                type="number"
                min={1}
                value={customWattage}
                onChange={(e) => setCustomWattage(e.target.value)}
                placeholder="e.g., 120"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-foreground">Category</label>
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
              >
                <option value="basic">Basic</option>
                <option value="kitchen">Kitchen</option>
                <option value="washroom">Washroom</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCustomDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCustomDevice}>Add Device</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>Room Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border p-3">
                <p className="text-muted-foreground">Room</p>
                <p className="font-medium">{roomName}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-muted-foreground">Property</p>
                <p className="font-medium">{propertyId || "N/A"}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-muted-foreground">Total Devices</p>
                <p className="font-medium">{placedDevices.length}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-muted-foreground">Estimated Monthly</p>
                <p className="font-medium">Rs.{billingSummary.totalCost.toFixed(2)}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-muted-foreground">Tariff</p>
                <p className="font-medium">
                  {tariffType === "FLAT"
                    ? `Flat${normalizedFlatPricePerUnit > 0 ? ` @ Rs.${normalizedFlatPricePerUnit}/unit` : ""}`
                    : "Slab"}
                </p>
              </div>
            </div>
            <div className="max-h-60 overflow-auto rounded-md border border-border">
              {placedDevices.length === 0 ? (
                <p className="p-3 text-muted-foreground">No devices in this room.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {placedDevices.map((d) => (
                    <li key={d.instanceId} className="p-3 flex justify-between">
                      <span>{d.name}</span>
                      <span className="text-muted-foreground">
                        {d.wattage}W • {d.hoursPerDay}h/day • {d.isOn ? "ON" : "OFF"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="bg-card border-border max-w-4xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Simulation Report</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6 text-sm">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs text-muted-foreground">Room</p>
                  <p className="mt-1 font-medium text-foreground">{roomName}</p>
                </div>
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs text-muted-foreground">Property</p>
                  <p className="mt-1 font-medium text-foreground">{propertyId || "N/A"}</p>
                </div>
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs text-muted-foreground">Generated</p>
                  <p className="mt-1 font-medium text-foreground">
                    {reportGeneratedAt || new Date().toLocaleString()}
                  </p>
                </div>
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs text-muted-foreground">MCB Status</p>
                  <p className="mt-1 font-medium text-foreground">{mcbOn ? "ON" : "OFF"}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs text-muted-foreground">Active Load</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {calculateTotalLoad()} kW
                  </p>
                </div>
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs text-muted-foreground">Daily Consumption</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {calculateDailyConsumption().toFixed(2)} kWh
                  </p>
                </div>
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs text-muted-foreground">Estimated Monthly Bill</p>
                  <p className="mt-1 text-lg font-semibold text-accent">
                    Rs.{billingSummary.totalCost.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Tariff Breakdown</h3>
                    <p className="text-xs text-muted-foreground">
                      {tariffType === "FLAT"
                        ? `Flat tariff${normalizedFlatPricePerUnit > 0 ? ` at Rs.${normalizedFlatPricePerUnit}/unit` : ""}`
                        : "Slab tariff: first 100 at Rs.3, next 100 at Rs.5, rest at Rs.7"}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {monthlyConsumptionKwh.toFixed(2)} kWh
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  {billingSummary.breakdown.map((slab, index) => (
                    <div
                      key={`${slab.slabUpto ?? "open"}-${index}`}
                      className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {slab.slabUpto == null ? "Remaining units" : `Up to ${slab.slabUpto} kWh`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {slab.consumedKwh.toFixed(2)} kWh at Rs.{slab.pricePerUnit}/unit
                        </p>
                      </div>
                      <p className="font-semibold text-accent">Rs.{slab.cost.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs text-muted-foreground">Total Devices</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {placedDevices.length}
                  </p>
                </div>
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs text-muted-foreground">Active Devices</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {placedDevices.filter((device) => device.isOn).length}
                  </p>
                </div>
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs text-muted-foreground">Projected Annual Cost</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    Rs.{(billingSummary.totalCost * 12).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Top Power Consumers
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Ranked by projected monthly energy consumption
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {placedDevices.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Add devices to generate a detailed report.
                    </p>
                  ) : (
                    [...placedDevices]
                      .sort(
                        (a, b) =>
                          calculateMonthlyConsumptionForDevice(b) -
                          calculateMonthlyConsumptionForDevice(a)
                      )
                      .slice(0, 5)
                      .map((device) => (
                        <div
                          key={device.instanceId}
                          className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2"
                        >
                          <div>
                            <p className="font-medium text-foreground">{device.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {device.wattage}W • {device.hoursPerDay}h/day •{" "}
                              {device.isOn ? "ON" : "OFF"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">
                              {calculateMonthlyConsumptionForDevice(device).toFixed(2)} kWh
                            </p>
                            <p className="text-xs text-accent">
                              Rs.
                              {(
                                calculateMonthlyConsumptionForDevice(device) *
                                effectiveMonthlyRate
                              ).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <div className="grid grid-cols-[minmax(0,1.8fr)_100px_100px_100px_120px] gap-3 border-b border-border bg-secondary/30 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <span>Device</span>
                  <span>Power</span>
                  <span>Hours/Day</span>
                  <span>Status</span>
                  <span>Monthly kWh</span>
                </div>

                {placedDevices.length === 0 ? (
                  <div className="px-4 py-10 text-center text-muted-foreground">
                    No devices added to this room yet.
                  </div>
                ) : (
                  placedDevices.map((device) => (
                    <div
                      key={device.instanceId}
                      className="grid grid-cols-[minmax(0,1.8fr)_100px_100px_100px_120px] gap-3 border-b border-border/70 px-4 py-3 text-sm last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{device.name}</p>
                        <p className="text-xs text-muted-foreground">{device.deviceNumber}</p>
                      </div>
                      <span className="text-foreground">{device.wattage}W</span>
                      <span className="text-foreground">{device.hoursPerDay}h</span>
                      <span className={device.isOn ? "text-accent" : "text-muted-foreground"}>
                        {device.isOn ? "ON" : "OFF"}
                      </span>
                      <span className="text-foreground">
                        {calculateMonthlyConsumptionForDevice(device).toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
