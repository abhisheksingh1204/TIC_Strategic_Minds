"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApolloClient, useQuery } from "@apollo/client";
import {
  BarChart3,
  Building,
  Building2,
  Clock,
  DoorOpen,
  House,
  Layers,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app/AppShell";
import { MY_PROPERTIES_QUERY } from "@/lib/graphql/queries/properties.queries";
import { ROOMS_BY_PROPERTY_QUERY } from "@/lib/graphql/queries/rooms.queries";
import { ME_QUERY } from "@/lib/graphql/queries/auth.queries";
import { formatDateSafe } from "@/lib/date";

type PropertyRecord = {
  id: string;
  propertyName: string;
  propertyType: "HOUSE" | "APARTMENT";
  updatedAt: string;
};

type RoomRecord = {
  id: string;
  roomName: string;
  updatedAt: string;
};

const formatDate = (value?: string) => formatDateSafe(value);

export default function Dashboard() {
  const router = useRouter();
  const apolloClient = useApolloClient();
  const [rooms, setRooms] = useState<RoomRecord[]>([]);

  const { data: meData } = useQuery(ME_QUERY, {
    errorPolicy: "all",
    fetchPolicy: "network-only",
  });

  const {
    data: propertiesData,
    loading: propertiesLoading,
    error: propertiesError,
  } = useQuery(MY_PROPERTIES_QUERY, {
    errorPolicy: "all",
    fetchPolicy: "cache-and-network",
  });

  const properties: PropertyRecord[] = useMemo(
    () => propertiesData?.myProperties ?? [],
    [propertiesData]
  );

  useEffect(() => {
    let cancelled = false;

    const loadRooms = async () => {
      if (!properties.length) {
        setRooms([]);
        return;
      }

      const results = await Promise.all(
        properties.map((property) =>
          apolloClient
            .query({
              query: ROOMS_BY_PROPERTY_QUERY,
              variables: { propertyId: property.id },
              fetchPolicy: "network-only",
            })
            .catch(() => ({ data: { roomsByProperty: [] } }))
        )
      );

      if (cancelled) return;

      const allRooms = results.flatMap(
        (result) => (result.data?.roomsByProperty as RoomRecord[] | undefined) ?? []
      );

      setRooms(allRooms);
    };

    void loadRooms();

    return () => {
      cancelled = true;
    };
  }, [apolloClient, properties]);

  const latestProperty = useMemo(() => {
    if (!properties.length) return null;
    return [...properties].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0];
  }, [properties]);

  const latestRoom = useMemo(() => {
    if (!rooms.length) return null;
    return [...rooms].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0];
  }, [rooms]);

  return (
    <AppShell
      title="Dashboard"
      current="home"
      user={meData?.me}
      actions={
        <Button variant="neon" size="lg" onClick={() => router.push("/appin/properties")}>
          <Plus className="h-4 w-4" />
          Create
        </Button>
      }
    >
      <div className="space-y-6">
        {(propertiesLoading || propertiesError) && (
          <div className="app-content-panel">
            {propertiesLoading ? (
              <p className="text-sm text-slate-400">Loading dashboard data...</p>
            ) : (
              <p className="text-sm text-red-400">{propertiesError?.message}</p>
            )}
          </div>
        )}

        <section className="grid gap-5 md:grid-cols-2">
          <div className="app-stat-card">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-cyan-400/10 bg-cyan-400/10 text-cyan-300">
                <Building className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Properties</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-white">{properties.length}</p>
              </div>
            </div>
          </div>

          <div className="app-stat-card">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-lime-400/10 bg-lime-400/10 text-lime-300">
                <Layers className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Rooms</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-white">{rooms.length}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <div className="app-content-panel app-card-hover">
            <div className="mb-5 flex items-center gap-3">
              <Clock className="h-5 w-5 text-cyan-300" />
              <h2 className="text-lg font-semibold text-white">Recently Accessed</h2>
            </div>

            <div className="space-y-4">
              <div className="rounded-[1.4rem] border border-white/6 bg-white/[0.03] p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Last Opened Property</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {latestProperty?.propertyName || "No properties yet"}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {latestProperty ? `Updated ${formatDate(latestProperty.updatedAt)}` : "Create a property to get started"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.4rem] border border-white/6 bg-white/[0.03] p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300">
                    <DoorOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Last Opened Room</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {latestRoom?.roomName || "No rooms yet"}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {latestRoom ? `Updated ${formatDate(latestRoom.updatedAt)}` : "Create a room in Properties"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="app-content-panel">
            <div className="mb-5 flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-cyan-300" />
              <h2 className="text-lg font-semibold text-white">Create New Property</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => router.push("/appin/properties?createProperty=HOUSE")}
                className="app-card-hover rounded-[1.4rem] border border-white/6 bg-white/[0.03] p-5 text-left"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-cyan-400/10 text-cyan-300">
                  <House className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">House</h3>
                <p className="mt-2 text-sm leading-7 text-slate-400">
                  Create a complete house layout with multiple rooms.
                </p>
              </button>

              <button
                type="button"
                onClick={() => router.push("/appin/properties?createProperty=APARTMENT")}
                className="app-card-hover rounded-[1.4rem] border border-white/6 bg-white/[0.03] p-5 text-left"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-lime-400/10 text-lime-300">
                  <Building2 className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">Flat / Apartment</h3>
                <p className="mt-2 text-sm leading-7 text-slate-400">
                  Design your apartment with all rooms and appliances.
                </p>
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
