"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Home,
  Building,
  BarChart3,
  HelpCircle,
  LogOut,
  Zap,
  User,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import { TrendGraph } from "@/components/analysis/TrendGraph";
import { DeviceDistribution } from "@/components/analysis/DeviceDistribution";
import { BillEstimation } from "@/components/analysis/BillEstimation";
import { AppShell } from "@/components/app/AppShell";
import { MY_PROPERTIES_QUERY } from "@/lib/graphql/queries/properties.queries";
import { ROOMS_BY_PROPERTY_QUERY } from "@/lib/graphql/queries/rooms.queries";
import {
  EQUIPMENTS_BY_PROPERTY_QUERY,
  EQUIPMENTS_BY_ROOM_QUERY,
} from "@/lib/graphql/queries/equipment.queries";
import { ME_QUERY } from "@/lib/graphql/queries/auth.queries";
import { clearAuthTokens } from "@/lib/auth";
import { getUserDisplayName } from "@/lib/user-display";
import {
  UPDATE_USAGE_SESSION_DURATION_MUTATION,
  USAGE_SESSIONS_QUERY,
} from "@/lib/graphql/queries/analysis.queries";
import { toast } from "sonner";

type PropertyRecord = {
  id: string;
  propertyName: string;
  propertyType: "HOUSE" | "APARTMENT";
  createdAt: string;
  updatedAt: string;
};

type RoomRecord = {
  id: string;
  roomName: string;
};

type Equipment = {
  id: string;
  roomId: string;
  catalogId: string;
  ratedPowerWatt: number;
  hoursPerDay: number;
  isOn: boolean;
  quantity: number;
  efficiencyFactor: number;
  mode: string;
};

type BreakdownRow = {
  label: string;
  value: number;
  meta?: string;
};

type GlobalPropertyStat = {
  id: string;
  label: string;
  monthlyKwh: number;
  roomCount: number;
  equipmentCount: number;
};

type UsageSessionRecord = {
  _id: string;
  equipmentId: string;
  roomId: string;
  propertyId: string;
  catalogId?: string | null;
  equipmentName: string;
  startedAt: string;
  endedAt?: string | null;
  durationMinutes?: number | null;
  energyKwh?: number | null;
  cost?: number | null;
};

const ASSUMED_HOURS_PER_DAY = 4;
const DAYS_PER_MONTH = 30;
const RATE_PER_KWH = 8;

const formatUsageValue = (value: number) => {
  if (value === 0) return "0.00";
  if (Math.abs(value) < 0.01) return value.toFixed(4);
  if (Math.abs(value) < 0.1) return value.toFixed(3);
  return value.toFixed(2);
};

const DEVICE_META_BY_CATALOG_ID: Record<
  string,
  { name: string; category: string }
> = {
  "000000000000000000000001": { name: "Refrigerator", category: "Kitchen" },
  "000000000000000000000002": { name: "AC", category: "Cooling" },
  "000000000000000000000003": { name: "TV", category: "Entertainment" },
  "000000000000000000000004": { name: "LED Bulb", category: "Lighting" },
  "000000000000000000000005": { name: "Washing Machine", category: "Washroom" },
  "000000000000000000000006": { name: "Fan", category: "Cooling" },
  "000000000000000000000007": { name: "Microwave", category: "Kitchen" },
  "000000000000000000000008": { name: "Computer", category: "Electronics" },
  "000000000000000000000009": { name: "Heater", category: "Heating" },
  "00000000000000000000000a": { name: "Geyser", category: "Heating" },
  "00000000000000000000000b": { name: "Induction", category: "Kitchen" },
  "00000000000000000000000c": { name: "Table Lamp", category: "Lighting" },
};

export default function Analysis() {
  const router = useRouter();
  const apolloClient = useApolloClient();
  const [activeMenu, setActiveMenu] = useState("analysis");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("all");
  const [trendMode, setTrendMode] = useState<"day" | "device" | "month">("day");
  const [globalPropertyBreakdown, setGlobalPropertyBreakdown] = useState<GlobalPropertyStat[]>(
    []
  );
  const [sessionEdits, setSessionEdits] = useState<Record<string, string>>({});

  const menuItems = [
    { id: "home", label: "Home", icon: Home, path: "/appin/dashboard" },
    { id: "properties", label: "Properties", icon: Building, path: "/appin/properties" },
    { id: "analysis", label: "Analysis", icon: BarChart3, path: "/appin/analysis" },
    { id: "help", label: "Help", icon: HelpCircle, path: "/appin/help" },
  ];

  const {
    data: propertiesData,
    loading: propertiesLoading,
    error: propertiesError,
  } = useQuery(MY_PROPERTIES_QUERY, {
    errorPolicy: "all",
  });

  const { data: meData } = useQuery(ME_QUERY, {
    errorPolicy: "all",
    fetchPolicy: "network-only",
  });

  const properties: PropertyRecord[] = useMemo(
    () => propertiesData?.myProperties ?? [],
    [propertiesData]
  );

  const { data: roomsData } = useQuery(ROOMS_BY_PROPERTY_QUERY, {
    variables: { propertyId: selectedPropertyId },
    skip: selectedPropertyId === "all",
  });

  const rooms: RoomRecord[] = useMemo(
    () => (selectedPropertyId === "all" ? [] : roomsData?.roomsByProperty ?? []),
    [roomsData, selectedPropertyId]
  );

  const { data: propertyEquipmentData } = useQuery(EQUIPMENTS_BY_PROPERTY_QUERY, {
    variables: { propertyId: selectedPropertyId },
    skip: selectedPropertyId === "all",
    fetchPolicy: "network-only",
  });

  const propertyEquipments: Equipment[] = useMemo(
    () =>
      selectedPropertyId === "all"
        ? []
        : propertyEquipmentData?.equipmentsByProperty ?? [],
    [propertyEquipmentData, selectedPropertyId]
  );

  const { data: usageSessionsData } = useQuery(USAGE_SESSIONS_QUERY, {
    variables: { propertyId: selectedPropertyId },
    skip: selectedPropertyId === "all",
    fetchPolicy: "network-only",
  });
  const [updateUsageSessionDuration] = useMutation(UPDATE_USAGE_SESSION_DURATION_MUTATION);

  const { data: equipmentData } = useQuery(EQUIPMENTS_BY_ROOM_QUERY, {
    variables: { roomId: selectedRoomId },
    skip: selectedRoomId === "all",
    fetchPolicy: "network-only",
  });

  const equipments: Equipment[] = useMemo(
    () => (selectedRoomId === "all" ? [] : equipmentData?.equipmentsByRoom ?? []),
    [equipmentData, selectedRoomId]
  );

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const propertyUsageSessions: UsageSessionRecord[] = useMemo(
    () => (selectedPropertyId === "all" ? [] : usageSessionsData?.usageSessions ?? []),
    [selectedPropertyId, usageSessionsData]
  );
  const getSessionAccountingDate = (session: UsageSessionRecord) =>
    new Date(session.endedAt ?? session.startedAt);

  const monthlyKwhForEquipment = (equipment: Equipment) => {
    if (!equipment.isOn) return 0;
    const effectiveWatt =
      (equipment.ratedPowerWatt || 0) *
      (equipment.quantity || 1) *
      (equipment.efficiencyFactor || 1);
    const hoursPerDay =
      typeof equipment.hoursPerDay === "number" ? equipment.hoursPerDay : ASSUMED_HOURS_PER_DAY;
    return (effectiveWatt * hoursPerDay * DAYS_PER_MONTH) / 1000;
  };

  const activeQuantityForEquipment = (equipment: Equipment) =>
    equipment.isOn ? equipment.quantity || 1 : 0;

  useEffect(() => {
    let cancelled = false;

    const loadGlobalStats = async () => {
      if (!properties.length) {
        setGlobalPropertyBreakdown([]);
        return;
      }

      const [roomResults, equipmentResults] = await Promise.all([
        Promise.all(
          properties.map((property) =>
            apolloClient
              .query({
                query: ROOMS_BY_PROPERTY_QUERY,
                variables: { propertyId: property.id },
                fetchPolicy: "network-only",
              })
              .catch(() => ({ data: { roomsByProperty: [] } }))
          )
        ),
        Promise.all(
          properties.map((property) =>
            apolloClient
              .query({
                query: EQUIPMENTS_BY_PROPERTY_QUERY,
                variables: { propertyId: property.id },
                fetchPolicy: "network-only",
              })
              .catch(() => ({ data: { equipmentsByProperty: [] } }))
          )
        ),
      ]);

      if (cancelled) return;

      const nextBreakdown = properties
        .map((property, index) => {
          const propertyRooms =
            (roomResults[index]?.data?.roomsByProperty as RoomRecord[] | undefined) ?? [];
          const propertyItems =
            (equipmentResults[index]?.data?.equipmentsByProperty as Equipment[] | undefined) ??
            [];

          return {
            id: property.id,
            label: property.propertyName,
            monthlyKwh: propertyItems.reduce(
              (sum, item) => sum + monthlyKwhForEquipment(item),
              0
            ),
            roomCount: propertyRooms.length,
            equipmentCount: propertyItems.reduce(
              (sum, item) => sum + activeQuantityForEquipment(item),
              0
            ),
          };
        })
        .sort((a, b) => b.monthlyKwh - a.monthlyKwh);

      setGlobalPropertyBreakdown(nextBreakdown);
    };

    void loadGlobalStats();

    return () => {
      cancelled = true;
    };
  }, [apolloClient, properties]);

  const handleLogout = () => {
    clearAuthTokens();
    router.push("/");
  };

  const handleMenuClick = (item: (typeof menuItems)[0]) => {
    setActiveMenu(item.id);
    router.push(item.path);
  };

  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setSelectedRoomId("all");
  };

  const totalPropertyKwh = useMemo(() => {
    return propertyEquipments.reduce(
      (sum, equipment) => sum + monthlyKwhForEquipment(equipment),
      0
    );
  }, [propertyEquipments]);

  const roomKwh = useMemo(() => {
    if (selectedRoomId === "all") return 0;
    return equipments.reduce(
      (sum, equipment) => sum + monthlyKwhForEquipment(equipment),
      0
    );
  }, [equipments, selectedRoomId]);

  const globalStats = useMemo(
    () => ({
      totalPower: globalPropertyBreakdown.reduce((sum, item) => sum + item.monthlyKwh, 0),
      totalSpending:
        globalPropertyBreakdown.reduce((sum, item) => sum + item.monthlyKwh, 0) * RATE_PER_KWH,
      propertyCount: properties.length,
      roomCount: globalPropertyBreakdown.reduce((sum, item) => sum + item.roomCount, 0),
    }),
    [globalPropertyBreakdown, properties.length]
  );

  const getViewLevel = () => {
    if (selectedRoomId !== "all" && selectedRoom) return "room";
    if (selectedPropertyId !== "all" && selectedProperty) return "property";
    return "global";
  };

  const viewLevel = getViewLevel();
  const today = useMemo(() => new Date(), []);
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const elapsedDaysInCurrentMonth = today.getDate();
  const activeTotalKwh =
    viewLevel === "room"
      ? roomKwh
      : viewLevel === "property"
        ? totalPropertyKwh
        : globalStats.totalPower;

  const selectedUsageSessions = useMemo(() => {
    const completedSessions = propertyUsageSessions.filter(
      (session) =>
        Boolean(session.endedAt) &&
        typeof session.energyKwh === "number" &&
        session.energyKwh > 0
    );

    if (selectedRoomId === "all") {
      return completedSessions;
    }

    return completedSessions.filter((session) => session.roomId === selectedRoomId);
  }, [propertyUsageSessions, selectedRoomId]);

  const currentMonthUsageSessions = useMemo(
    () =>
      selectedUsageSessions.filter((session) => {
        const sessionDate = getSessionAccountingDate(session);
        return (
          sessionDate.getFullYear() === currentYear &&
          sessionDate.getMonth() === currentMonth
        );
      }),
    [currentMonth, currentYear, selectedUsageSessions]
  );

  const todaySessions = useMemo(
    () =>
      selectedUsageSessions.filter((session) => {
        const sessionDate = getSessionAccountingDate(session);
        return (
          sessionDate.getFullYear() === today.getFullYear() &&
          sessionDate.getMonth() === today.getMonth() &&
          sessionDate.getDate() === today.getDate()
        );
      }),
    [selectedUsageSessions, today]
  );

  const scopedUsageSessions = useMemo(() => {
    if (trendMode === "day") return todaySessions;
    if (trendMode === "month") return currentMonthUsageSessions;
    return selectedUsageSessions;
  }, [currentMonthUsageSessions, selectedUsageSessions, todaySessions, trendMode]);

  const scopedUsageKwh = useMemo(
    () =>
      scopedUsageSessions.reduce((sum, session) => sum + (session.energyKwh ?? 0), 0),
    [scopedUsageSessions]
  );

  const monthToDateKwh = useMemo(
    () =>
      currentMonthUsageSessions.reduce(
        (sum, session) => sum + (session.energyKwh ?? 0),
        0
      ),
    [currentMonthUsageSessions]
  );

  const projectedMonthlyKwh =
    viewLevel === "room"
      ? roomKwh
      : viewLevel === "property"
        ? totalPropertyKwh
        : globalStats.totalPower;

  const estimatedMonthlyKwh =
    viewLevel === "global"
      ? activeTotalKwh
      : monthToDateKwh > 0 && elapsedDaysInCurrentMonth > 0
        ? (monthToDateKwh / elapsedDaysInCurrentMonth) * daysInCurrentMonth
        : projectedMonthlyKwh;

  const propertyStats = {
    totalPower: selectedPropertyId === "all" ? totalPropertyKwh : estimatedMonthlyKwh,
    totalSpending:
      (selectedPropertyId === "all" ? totalPropertyKwh : estimatedMonthlyKwh) * RATE_PER_KWH,
  };

  const roomBreakdown = useMemo<BreakdownRow[]>(() => {
    if (selectedPropertyId === "all") return [];

    if (propertyUsageSessions.length > 0) {
      const propertyScopeSessions =
        trendMode === "day"
          ? propertyUsageSessions.filter((session) => {
              if (!session.endedAt || typeof session.energyKwh !== "number") {
                return false;
              }
              const sessionDate = getSessionAccountingDate(session);
              return (
                sessionDate.getFullYear() === today.getFullYear() &&
                sessionDate.getMonth() === today.getMonth() &&
                sessionDate.getDate() === today.getDate()
              );
            })
          : trendMode === "month"
            ? propertyUsageSessions.filter((session) => {
                if (!session.endedAt || typeof session.energyKwh !== "number") {
                  return false;
                }
                const sessionDate = getSessionAccountingDate(session);
                return (
                  sessionDate.getFullYear() === currentYear &&
                  sessionDate.getMonth() === currentMonth
                );
              })
            : propertyUsageSessions.filter(
                (session) =>
                  Boolean(session.endedAt) &&
                  typeof session.energyKwh === "number" &&
                  (session.energyKwh ?? 0) > 0
              );

      return rooms
        .map((room) => {
          const roomSessions = propertyScopeSessions.filter(
            (session) => session.roomId === room.id
          );
          const monthlyKwh = roomSessions.reduce(
            (sum, session) => sum + (session.energyKwh ?? 0),
            0
          );

          return {
            label: room.roomName,
            value: monthlyKwh,
            meta: `${roomSessions.length} sessions`,
          };
        })
        .filter((room) => room.value > 0 || room.meta !== "0 sessions")
        .sort((a, b) => b.value - a.value);
    }

    return rooms
      .map((room) => {
        const roomItems = propertyEquipments.filter((equipment) => equipment.roomId === room.id);
        const monthlyKwh = roomItems.reduce(
          (sum, equipment) => sum + monthlyKwhForEquipment(equipment),
          0
        );

        return {
          label: room.roomName,
          value: monthlyKwh,
          meta: `${roomItems.reduce((sum, equipment) => sum + activeQuantityForEquipment(equipment), 0)} active devices`,
        };
      })
      .filter((room) => room.value > 0 || room.meta !== "0 active devices")
      .sort((a, b) => b.value - a.value);
  }, [
    currentMonth,
    currentYear,
    propertyEquipments,
    propertyUsageSessions,
    rooms,
    selectedPropertyId,
    today,
    trendMode,
  ]);

  const deviceBreakdown = useMemo<BreakdownRow[]>(() => {
    if (viewLevel !== "global" && scopedUsageSessions.length > 0) {
      const aggregated = scopedUsageSessions.reduce<
        Record<string, { value: number; count: number }>
      >((acc, session) => {
        if (!acc[session.equipmentName]) {
          acc[session.equipmentName] = { value: 0, count: 0 };
        }

        acc[session.equipmentName].value += session.energyKwh ?? 0;
        acc[session.equipmentName].count += 1;
        return acc;
      }, {});

      return Object.entries(aggregated)
        .map(([label, item]) => ({
          label,
          value: item.value,
          meta: `${item.count} session${item.count === 1 ? "" : "s"}`,
        }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value);
    }

    const source =
      viewLevel === "room"
        ? equipments
        : viewLevel === "property"
          ? propertyEquipments
          : [];

    if (!source.length) return [];

    const aggregated = source.reduce<Record<string, { value: number; count: number }>>(
      (acc, equipment) => {
        const meta = DEVICE_META_BY_CATALOG_ID[equipment.catalogId] ?? {
          name: `Device ${equipment.catalogId.slice(-4).toUpperCase()}`,
          category: "Other",
        };

        if (!acc[meta.name]) {
          acc[meta.name] = { value: 0, count: 0 };
        }

        acc[meta.name].value += monthlyKwhForEquipment(equipment);
        acc[meta.name].count += activeQuantityForEquipment(equipment);
        return acc;
      },
      {}
    );

    return Object.entries(aggregated)
      .map(([label, item]) => ({
        label,
        value: item.value,
        meta: `${item.count} units`,
      }))
      .filter((item) => item.value > 0 || item.meta !== "0 units")
      .sort((a, b) => b.value - a.value);
  }, [equipments, propertyEquipments, scopedUsageSessions, viewLevel]);

  const categoryBreakdown = useMemo<BreakdownRow[]>(() => {
    if (viewLevel !== "room") return [];

    if (scopedUsageSessions.length > 0) {
      const aggregated = scopedUsageSessions.reduce<Record<string, { value: number; count: number }>>(
        (acc, session) => {
          const category =
            (session.catalogId && DEVICE_META_BY_CATALOG_ID[session.catalogId]?.category) ??
            "Other";

          if (!acc[category]) {
            acc[category] = { value: 0, count: 0 };
          }

          acc[category].value += session.energyKwh ?? 0;
          acc[category].count += 1;
          return acc;
        },
        {}
      );

      return Object.entries(aggregated)
        .map(([label, item]) => ({
          label,
          value: item.value,
          meta: `${item.count} session${item.count === 1 ? "" : "s"}`,
        }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value);
    }

    const aggregated = equipments.reduce<Record<string, number>>((acc, equipment) => {
      const category = DEVICE_META_BY_CATALOG_ID[equipment.catalogId]?.category ?? "Other";
      acc[category] = (acc[category] ?? 0) + monthlyKwhForEquipment(equipment);
      return acc;
    }, {});

    return Object.entries(aggregated)
      .map(([label, value]) => ({ label, value }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [equipments, scopedUsageSessions, viewLevel]);

  const globalDistribution = useMemo<BreakdownRow[]>(
    () =>
      globalPropertyBreakdown.map((item) => ({
        label: item.label,
        value: item.monthlyKwh,
        meta: `${item.roomCount} rooms • ${item.equipmentCount} devices`,
      })),
    [globalPropertyBreakdown]
  );

  const trendRows = useMemo<BreakdownRow[]>(() => {
    if (viewLevel !== "global" && selectedUsageSessions.length > 0) {
      if (trendMode === "day") {
        return viewLevel === "room" ? deviceBreakdown : roomBreakdown;
      }

      if (trendMode === "month") {
        const monthlyMap = new Map<string, number>();

        selectedUsageSessions.forEach((session) => {
          const sessionDate = getSessionAccountingDate(session);
          const key = `${sessionDate.getFullYear()}-${sessionDate.getMonth()}`;
          monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + (session.energyKwh ?? 0));
        });

        return Array.from(monthlyMap.entries())
          .map(([key, value]) => {
            const [year, month] = key.split("-").map(Number);
            return {
              sortKey: year * 100 + month,
              label: new Date(year, month, 1).toLocaleDateString(undefined, {
                month: "short",
                year: "numeric",
              }),
              value,
            };
          })
          .sort((a, b) => a.sortKey - b.sortKey)
          .slice(-6);
      }

      return deviceBreakdown;
    }

    const baseRows =
      viewLevel === "room"
        ? deviceBreakdown
        : viewLevel === "property"
          ? roomBreakdown
          : globalDistribution;

    return baseRows.map((item) => {
      if (trendMode === "day") {
        return {
          ...item,
          value: item.value / DAYS_PER_MONTH,
          meta: `${item.value.toFixed(2)} kWh monthly projection`,
        };
      }

      if (trendMode === "month") {
        return {
          ...item,
          value: item.value,
          meta: `${item.value.toFixed(2)} kWh monthly projection`,
        };
      }

      return item;
    });
  }, [
    deviceBreakdown,
    globalDistribution,
    roomBreakdown,
    selectedUsageSessions,
    trendMode,
    viewLevel,
  ]);

  const handleSessionDurationUpdate = async (session: UsageSessionRecord) => {
    const nextDuration = Number(
      sessionEdits[session._id] ?? session.durationMinutes ?? 0
    );

    if (!Number.isFinite(nextDuration) || nextDuration <= 0) {
      toast.error("Enter a valid duration in minutes");
      return;
    }

    try {
      await updateUsageSessionDuration({
        variables: {
          sessionId: session._id,
          durationMinutes: nextDuration,
        },
        refetchQueries: [
          {
            query: USAGE_SESSIONS_QUERY,
            variables: { propertyId: selectedPropertyId },
          },
        ],
      });
      toast.success("Usage session updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update usage session"
      );
    }
  };

  const distributionRows =
    viewLevel === "room"
      ? categoryBreakdown.length > 0
        ? categoryBreakdown
        : deviceBreakdown
      : viewLevel === "property"
        ? roomBreakdown
        : globalDistribution;

  const trendTitle =
    viewLevel === "room"
      ? "Device Analysis"
      : viewLevel === "property"
        ? "Room Analysis"
        : "Property Analysis";

  const distributionTitle =
    viewLevel === "room"
      ? "Category Distribution"
      : viewLevel === "property"
        ? "Room Distribution"
        : "Property Distribution";

  const trendUnitLabel = "kWh";
  const roomPanelSessions =
    trendMode === "day"
      ? todaySessions
      : trendMode === "month"
        ? currentMonthUsageSessions
        : selectedUsageSessions;
  const roomPanelTitle =
    trendMode === "day"
      ? "Today's Sessions"
      : trendMode === "month"
        ? "This Month's Sessions"
        : "Completed Sessions";
  const roomPanelDescription =
    trendMode === "day"
      ? "Completed sessions from today. Same-day sessions can be edited."
      : trendMode === "month"
        ? "Completed sessions in the current month. Only today's sessions are editable."
        : "Completed sessions across this room's history. Only today's sessions are editable.";
  const roomPanelEnergyLabel =
    trendMode === "day"
      ? "Today's Energy"
      : trendMode === "month"
        ? "Month Energy"
        : "Total Energy";
  const roomPanelEmptyMessage =
    trendMode === "day"
      ? "No completed usage sessions for this room today."
      : trendMode === "month"
        ? "No completed usage sessions for this room in the current month."
        : "No completed usage sessions saved for this room yet.";

  const scopedDisplayTotalKwh =
    selectedUsageSessions.length > 0
      ? scopedUsageKwh
      : trendMode === "day"
        ? projectedMonthlyKwh / DAYS_PER_MONTH
        : projectedMonthlyKwh;

  const scopedDeviceCount =
    viewLevel === "room"
      ? selectedUsageSessions.length > 0
        ? new Set(scopedUsageSessions.map((session) => session.equipmentId)).size
        : deviceBreakdown.length
      : viewLevel === "property"
        ? selectedUsageSessions.length > 0
          ? new Set(scopedUsageSessions.map((session) => session.roomId)).size
          : roomBreakdown.length
        : globalStats.propertyCount;

  return (
    <AppShell
      title="Analysis"
      current="analysis"
      user={meData?.me}
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedPropertyId} onValueChange={handlePropertyChange}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select Property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.propertyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedPropertyId !== "all" && selectedProperty && (
            <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Room" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rooms</SelectItem>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.roomName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      }
    >
      <div className="flex-1 overflow-auto">
          {propertiesLoading && (
            <div className="app-content-panel mb-6 text-center text-muted-foreground">
              Loading properties...
            </div>
          )}
          {propertiesError && (
            <div className="app-content-panel mb-6 text-center text-destructive">
              {propertiesError.message}
            </div>
          )}
          {/* Global View (All Properties) */}
          {viewLevel === "global" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card rounded-xl border border-border p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Power Usage</p>
                      <p className="text-2xl font-bold text-foreground">{formatUsageValue(globalStats.totalPower)} kWh</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-xl border border-border p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                      <IndianRupee className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Estimated Spending</p>
                      <p className="text-2xl font-bold text-accent">₹{formatUsageValue(globalStats.totalSpending)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-xl border border-border p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                      <Building className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Properties</p>
                      <p className="text-2xl font-bold text-foreground">{globalStats.propertyCount}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-xl border border-border p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Rooms</p>
                      <p className="text-2xl font-bold text-foreground">{globalStats.roomCount}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 min-h-[420px]">
                  <TrendGraph
                    title={trendTitle}
                    trendMode={trendMode}
                    onTrendModeChange={setTrendMode}
                    data={trendRows}
                    totalKwh={activeTotalKwh}
                    unitLabel={trendUnitLabel}
                    emptyMessage="Add properties and equipment to see portfolio-level analysis."
                  />
                </div>
                <div className="xl:col-span-1">
                  <DeviceDistribution
                    title={distributionTitle}
                    trendMode={trendMode}
                    data={distributionRows}
                    totalKwh={activeTotalKwh}
                    unitLabel="kWh"
                    emptyMessage="No property distribution available yet."
                  />
                </div>
              </div>

              <BillEstimation
                trendMode={trendMode}
                roomName="All Properties"
                totalKwh={activeTotalKwh}
                ratePerKwh={RATE_PER_KWH}
                itemLabel="properties"
                itemCount={globalStats.propertyCount}
              />

              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Property Ranking
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    Current monthly projection
                  </span>
                </div>
                <div className="space-y-3">
                  {globalPropertyBreakdown.map((property) => (
                    <div
                      key={property.id}
                      className="flex items-center justify-between rounded-lg border border-border p-4"
                    >
                      <div>
                        <p className="font-medium text-foreground">{property.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {property.roomCount} rooms • {property.equipmentCount} devices
                        </p>
                      </div>
                      <div className="text-right">
                         <p className="font-semibold text-foreground">
                          {formatUsageValue(property.monthlyKwh)} kWh
                        </p>
                        <p className="text-sm text-accent">
                          ₹{formatUsageValue(property.monthlyKwh * RATE_PER_KWH)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Property View (Single Property, All Rooms) */}
          {viewLevel === "property" && selectedProperty && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card rounded-xl border border-border p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Estimated Monthly Usage
                      </p>
                      <p className="text-2xl font-bold text-foreground">{formatUsageValue(propertyStats.totalPower)} kWh</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-xl border border-border p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                      <IndianRupee className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated Bill</p>
                      <p className="text-2xl font-bold text-accent">₹{formatUsageValue(propertyStats.totalSpending)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 min-h-[420px]">
                  <TrendGraph
                    title={trendTitle}
                    trendMode={trendMode}
                    onTrendModeChange={setTrendMode}
                    data={trendRows}
                    totalKwh={scopedDisplayTotalKwh}
                    unitLabel={trendUnitLabel}
                    emptyMessage="No room-level usage available for this property yet."
                  />
                </div>
                <div className="xl:col-span-1">
                  <DeviceDistribution
                    title={distributionTitle}
                    trendMode={trendMode}
                    data={distributionRows}
                    totalKwh={scopedDisplayTotalKwh}
                    unitLabel="kWh"
                    emptyMessage="No room distribution available for this property yet."
                  />
                </div>
              </div>

              <BillEstimation
                trendMode={trendMode}
                roomName={selectedProperty.propertyName}
                totalKwh={estimatedMonthlyKwh}
                ratePerKwh={RATE_PER_KWH}
                itemLabel="rooms"
                itemCount={scopedDeviceCount}
              />

              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Room Summary</h3>
                  <span className="text-sm text-muted-foreground">
                    Select a room for device-level analysis
                  </span>
                </div>
                <div className="space-y-3">
                  {roomBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      This property has no saved room usage yet.
                    </p>
                  ) : (
                    roomBreakdown.map((room) => {
                      const matchedRoom = rooms.find((item) => item.roomName === room.label);

                      return (
                        <button
                          key={room.label}
                          onClick={() => matchedRoom && setSelectedRoomId(matchedRoom.id)}
                          className="flex w-full items-center justify-between rounded-lg border border-border p-4 text-left transition-colors hover:bg-secondary/20"
                        >
                          <div>
                            <p className="font-medium text-foreground">{room.label}</p>
                            <p className="text-sm text-muted-foreground">{room.meta}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">
                              {formatUsageValue(room.value)} kWh
                            </p>
                            <p className="text-sm text-accent">
                              ₹{formatUsageValue(room.value * RATE_PER_KWH)}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Room View (Full Analysis) */}
          {viewLevel === "room" && selectedRoom && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
              <div className="xl:col-span-2 flex flex-col gap-6">
                <div className="flex-1 min-h-[400px]">
                  <TrendGraph
                    title={trendTitle}
                    trendMode={trendMode}
                    onTrendModeChange={setTrendMode}
                    data={trendRows}
                    totalKwh={scopedDisplayTotalKwh}
                    unitLabel={trendUnitLabel}
                    emptyMessage="No device usage saved for this room yet."
                  />
                </div>

                <div>
                  <BillEstimation
                    trendMode={trendMode}
                    roomName={selectedRoom.roomName}
                    totalKwh={estimatedMonthlyKwh}
                    ratePerKwh={RATE_PER_KWH}
                    itemLabel="devices"
                    itemCount={scopedDeviceCount}
                  />
                </div>

                <div className="bg-card rounded-xl border border-border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {roomPanelTitle}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {roomPanelDescription}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{roomPanelEnergyLabel}</p>
                      <p className="font-semibold text-foreground">
                        {formatUsageValue(
                          roomPanelSessions.reduce(
                            (sum, session) => sum + (session.energyKwh ?? 0),
                            0
                          )
                        )}{" "}
                        kWh
                      </p>
                    </div>
                  </div>

                  {roomPanelSessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {roomPanelEmptyMessage}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {roomPanelSessions.map((session) => {
                        const isEditableToday = todaySessions.some(
                          (todaySession) => todaySession._id === session._id
                        );

                        return (
                        <div
                          key={session._id}
                          className="rounded-lg border border-border p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium text-foreground">
                                {session.equipmentName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(session.startedAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                {" - "}
                                {session.endedAt
                                  ? new Date(session.endedAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "Active"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-foreground">
                                {formatUsageValue(session.energyKwh ?? 0)} kWh
                              </p>
                              <p className="text-sm text-accent">
                                ₹{formatUsageValue(session.cost ?? 0)}
                              </p>
                            </div>
                          </div>

                          {isEditableToday ? (
                            <div className="mt-4 flex items-end gap-3">
                              <div className="flex-1">
                                <label className="text-xs text-muted-foreground">
                                  Duration (minutes)
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  value={
                                    sessionEdits[session._id] ??
                                    String(Math.round(session.durationMinutes ?? 0))
                                  }
                                  onChange={(event) =>
                                    setSessionEdits((prev) => ({
                                      ...prev,
                                      [session._id]: event.target.value,
                                    }))
                                  }
                                  className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                                />
                              </div>
                              <Button
                                variant="outline"
                                onClick={() => void handleSessionDurationUpdate(session)}
                              >
                                Recalculate
                              </Button>
                            </div>
                          ) : (
                            <p className="mt-4 text-xs text-muted-foreground">
                              Duration: {Math.round(session.durationMinutes ?? 0)} minutes
                            </p>
                          )}
                        </div>
                      )})}
                    </div>
                  )}
                </div>
              </div>

              <div className="xl:col-span-1">
                <DeviceDistribution
                  title={distributionTitle}
                  trendMode={trendMode}
                  data={distributionRows}
                  totalKwh={scopedDisplayTotalKwh}
                  unitLabel="kWh"
                  emptyMessage="No category distribution available for this room yet."
                />
              </div>
            </div>
          )}
      </div>
    </AppShell>
  );
}
