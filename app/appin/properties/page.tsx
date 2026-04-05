"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  Building,
  Building2,
  ChevronRight,
  Edit,
  House,
  MoreVertical,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppShell } from "@/components/app/AppShell";
import {
  MY_PROPERTIES_QUERY,
  CREATE_PROPERTY_MUTATION,
  UPDATE_PROPERTY_MUTATION,
  DELETE_PROPERTY_MUTATION,
} from "@/lib/graphql/queries/properties.queries";
import {
  ROOMS_BY_PROPERTY_QUERY,
  CREATE_ROOM_MUTATION,
  DELETE_ROOM_MUTATION,
} from "@/lib/graphql/queries/rooms.queries";
import { ME_QUERY } from "@/lib/graphql/queries/auth.queries";
import { formatDateSafe } from "@/lib/date";

interface Property {
  id: string;
  propertyName: string;
  propertyType: "HOUSE" | "APARTMENT";
  createdAt: string;
}

interface Room {
  id: string;
  roomName: string;
  roomType?: string | null;
}

type MeQueryData = {
  me: {
    id?: string;
    name?: string | null;
    email?: string | null;
  } | null;
};

type MyPropertiesQueryData = {
  myProperties: Property[];
};

type RoomsByPropertyQueryData = {
  roomsByProperty: Room[];
};

type UpdatePropertyMutationData = {
  updateProperty: Property;
};

function PropertiesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCreatePropertyType = searchParams.get("createProperty");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [newPropertyDialogOpen, setNewPropertyDialogOpen] = useState(false);
  const [newPropertyType, setNewPropertyType] = useState<"HOUSE" | "APARTMENT" | null>(null);
  const [newPropertyName, setNewPropertyName] = useState("");
  const [editPropertyDialogOpen, setEditPropertyDialogOpen] = useState(false);
  const [propertyBeingEdited, setPropertyBeingEdited] = useState<Property | null>(null);
  const [editedPropertyName, setEditedPropertyName] = useState("");
  const [newRoomName, setNewRoomName] = useState("");

  useEffect(() => {
    if (
      requestedCreatePropertyType === "HOUSE" ||
      requestedCreatePropertyType === "APARTMENT"
    ) {
      setNewPropertyType(requestedCreatePropertyType);
      setNewPropertyName(
        requestedCreatePropertyType === "HOUSE" ? "My House" : "My Apartment"
      );
      setNewPropertyDialogOpen(true);
    }
  }, [requestedCreatePropertyType]);

  const { data: meData } = useQuery<MeQueryData>(ME_QUERY, {
    errorPolicy: "all",
    fetchPolicy: "network-only",
  });

  const { data, loading, error } = useQuery<MyPropertiesQueryData>(MY_PROPERTIES_QUERY, {
    errorPolicy: "all",
  });

  const [createProperty] = useMutation(CREATE_PROPERTY_MUTATION, {
    refetchQueries: [{ query: MY_PROPERTIES_QUERY }],
  });
  const [updatePropertyMutation, { loading: updatingProperty }] =
    useMutation<UpdatePropertyMutationData>(UPDATE_PROPERTY_MUTATION, {
      refetchQueries: [{ query: MY_PROPERTIES_QUERY }],
      awaitRefetchQueries: true,
    });

  const [deleteProperty, { loading: deletingProperty }] = useMutation(
    DELETE_PROPERTY_MUTATION,
    {
      refetchQueries: [{ query: MY_PROPERTIES_QUERY }],
      awaitRefetchQueries: true,
    }
  );

  const {
    data: roomsData,
    loading: roomsLoading,
    error: roomsError,
  } = useQuery<RoomsByPropertyQueryData>(ROOMS_BY_PROPERTY_QUERY, {
    variables: { propertyId: selectedProperty?.id ?? "" },
    skip: !selectedProperty,
  });

  const [createRoom, { loading: creatingRoom }] = useMutation(CREATE_ROOM_MUTATION, {
    refetchQueries: selectedProperty
      ? [{ query: ROOMS_BY_PROPERTY_QUERY, variables: { propertyId: selectedProperty.id } }]
      : [],
  });
  const [deleteRoom, { loading: deletingRoom }] = useMutation(DELETE_ROOM_MUTATION, {
    refetchQueries: selectedProperty
      ? [{ query: ROOMS_BY_PROPERTY_QUERY, variables: { propertyId: selectedProperty.id } }]
      : [],
    awaitRefetchQueries: true,
  });

  const properties: Property[] = data?.myProperties || [];
  const rooms: Room[] = roomsData?.roomsByProperty || [];

  const filteredProperties = properties.filter((property) =>
    property.propertyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateProperty = async () => {
    if (!newPropertyType) {
      toast.error("Please choose a property type");
      return;
    }

    if (!newPropertyName.trim()) {
      toast.error("Please enter a property name");
      return;
    }

    try {
      await createProperty({
        variables: {
          input: {
            propertyName: newPropertyName.trim(),
            propertyType: newPropertyType,
          },
        },
      });
      toast.success("Property created successfully");
      setNewPropertyDialogOpen(false);
      setNewPropertyType(null);
      setNewPropertyName("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create property";
      toast.error(message);
    }
  };

  const handleOpenNewPropertyDialog = () => {
    setNewPropertyDialogOpen(true);
    setNewPropertyType(null);
    setNewPropertyName("");
  };

  const handleDeleteProperty = async (property: Property) => {
    const confirmed = window.confirm(
      `Delete "${property.propertyName}"?\n\nThis will also delete all rooms and saved equipments in this property.`
    );
    if (!confirmed) return;

    try {
      await deleteProperty({
        variables: { propertyId: property.id },
      });

      if (selectedProperty?.id === property.id) {
        setRoomDialogOpen(false);
        setSelectedProperty(null);
      }
      toast.success("Property deleted successfully");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete property";
      toast.error(message);
    }
  };

  const handleOpenEditPropertyDialog = (property: Property) => {
    setPropertyBeingEdited(property);
    setEditedPropertyName(property.propertyName);
    setEditPropertyDialogOpen(true);
  };

  const handleUpdateProperty = async () => {
    if (!propertyBeingEdited) return;

    if (!editedPropertyName.trim()) {
      toast.error("Please enter a property name");
      return;
    }

    try {
      const result = await updatePropertyMutation({
        variables: {
          propertyId: propertyBeingEdited.id,
          input: {
            propertyName: editedPropertyName.trim(),
          },
        },
      });

      const updatedProperty = result.data?.updateProperty;
      if (updatedProperty && selectedProperty?.id === updatedProperty.id) {
        setSelectedProperty(updatedProperty);
      }

      toast.success("Property name updated successfully");
      setEditPropertyDialogOpen(false);
      setPropertyBeingEdited(null);
      setEditedPropertyName("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update property";
      toast.error(message);
    }
  };

  const handleCreateRoom = async () => {
    if (!selectedProperty) return;
    if (!newRoomName.trim()) {
      toast.error("Please enter a room name");
      return;
    }

    try {
      await createRoom({
        variables: {
          input: {
            propertyId: selectedProperty.id,
            roomName: newRoomName.trim(),
          },
        },
      });
      setNewRoomName("");
      toast.success("Room created successfully");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create room";
      toast.error(message);
    }
  };

  const handleDeleteRoom = async (room: Room) => {
    const confirmed = window.confirm(
      `Delete room "${room.roomName}"?\n\nThis will also delete saved equipment and usage data for this room.`
    );
    if (!confirmed) return;

    try {
      await deleteRoom({
        variables: { roomId: room.id },
      });
      toast.success("Room deleted successfully");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete room";
      toast.error(message);
    }
  };

  return (
    <AppShell
      title="Properties"
      current="properties"
      user={meData?.me}
      actions={
        <Button variant="neon" size="lg" onClick={handleOpenNewPropertyDialog}>
          <Plus className="h-4 w-4" />
          New Property
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="app-content-panel">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search properties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="app-content-panel text-sm text-slate-400">Loading properties...</div>
          ) : error ? (
            <div className="app-content-panel text-sm text-red-400">{error.message}</div>
          ) : filteredProperties.length === 0 ? (
            <div className="app-content-panel text-center">
              <Building className="mx-auto h-12 w-12 text-slate-600" />
              <p className="mt-4 text-sm text-slate-400">No properties found</p>
            </div>
          ) : (
            filteredProperties.map((property) => (
              <div
                key={property.id}
                role="button"
                tabIndex={0}
                className="app-content-panel app-card-hover relative z-0 flex w-full items-center justify-between text-left focus-within:z-20"
                onClick={() => {
                  setSelectedProperty(property);
                  setRoomDialogOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedProperty(property);
                    setRoomDialogOpen(true);
                  }
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-[1.2rem] ${
                      property.propertyType === "HOUSE"
                        ? "bg-cyan-400/10 text-cyan-300"
                        : "bg-lime-400/10 text-lime-300"
                    }`}
                  >
                    {property.propertyType === "HOUSE" ? (
                      <House className="h-7 w-7" />
                    ) : (
                      <Building2 className="h-7 w-7" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{property.propertyName}</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {property.propertyType} | Created {formatDateSafe(property.createdAt, "N/A")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditPropertyDialog(property);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (deletingProperty) return;
                          void handleDeleteProperty(property);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletingProperty ? "Deleting..." : "Delete"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <ChevronRight className="h-5 w-5 text-slate-500" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedProperty?.propertyType === "HOUSE" ? (
                <House className="h-6 w-6 text-cyan-300" />
              ) : (
                <Building2 className="h-6 w-6 text-lime-300" />
              )}
              {selectedProperty?.propertyName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-slate-400">{selectedProperty?.propertyType}</p>

            <div className="flex items-center gap-2">
              <Input
                placeholder="Room name"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
              />
              <Button variant="outline" size="sm" onClick={handleCreateRoom} disabled={creatingRoom}>
                <Plus className="mr-2 h-4 w-4" />
                {creatingRoom ? "Adding..." : "Add"}
              </Button>
            </div>

            {roomsLoading ? (
              <div className="text-sm text-slate-400">Loading rooms...</div>
            ) : roomsError ? (
              <div className="text-sm text-red-400">{roomsError.message}</div>
            ) : rooms.length === 0 ? (
              <div className="text-sm text-slate-400">No rooms yet. Create your first room above.</div>
            ) : (
              <div className="space-y-2">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between rounded-[1.2rem] border border-white/6 bg-white/[0.03] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{room.roomName}</p>
                      {room.roomType ? <p className="text-xs text-slate-500">{room.roomType}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRoomDialogOpen(false);
                          router.push(`/appin/simulator?propertyId=${selectedProperty?.id}&roomId=${room.id}&roomName=${encodeURIComponent(room.roomName)}&type=room`);
                        }}
                      >
                        Configure
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-400/40 text-red-400 hover:bg-red-500/10"
                        disabled={deletingRoom}
                        onClick={() => void handleDeleteRoom(room)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={newPropertyDialogOpen}
        onOpenChange={(open) => {
          setNewPropertyDialogOpen(open);
          if (!open) {
            setNewPropertyType(null);
            setNewPropertyName("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Property</DialogTitle>
          </DialogHeader>

          <p className="mb-2 text-sm text-slate-400">
            Choose the property type, then enter a name before creating it.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                setNewPropertyType("HOUSE");
                if (!newPropertyName.trim()) {
                  setNewPropertyName("My House");
                }
              }}
              className={`app-card-hover rounded-[1.4rem] border p-6 text-center ${
                newPropertyType === "HOUSE"
                  ? "border-cyan-300/40 bg-cyan-400/10"
                  : "border-white/6 bg-white/[0.03]"
              }`}
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.2rem] bg-cyan-400/10 text-cyan-300">
                <House className="h-8 w-8" />
              </div>
              <h3 className="mt-4 font-semibold text-white">House</h3>
              <p className="mt-1 text-xs text-slate-400">Multi-room layout</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setNewPropertyType("APARTMENT");
                if (!newPropertyName.trim() || newPropertyName.trim() === "My House") {
                  setNewPropertyName("My Apartment");
                }
              }}
              className={`app-card-hover rounded-[1.4rem] border p-6 text-center ${
                newPropertyType === "APARTMENT"
                  ? "border-lime-300/40 bg-lime-400/10"
                  : "border-white/6 bg-white/[0.03]"
              }`}
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.2rem] bg-lime-400/10 text-lime-300">
                <Building2 className="h-8 w-8" />
              </div>
              <h3 className="mt-4 font-semibold text-white">Apartment</h3>
              <p className="mt-1 text-xs text-slate-400">Flat or studio layout</p>
            </button>
          </div>

          <div className="mt-5 space-y-2">
            <label className="text-sm font-medium text-foreground">
              {newPropertyType === "HOUSE"
                ? "House Name"
                : newPropertyType === "APARTMENT"
                  ? "Apartment Name"
                  : "Property Name"}
            </label>
            <Input
              value={newPropertyName}
              disabled={!newPropertyType}
              onChange={(e) => setNewPropertyName(e.target.value)}
              placeholder={
                newPropertyType === "HOUSE"
                  ? "Enter house name"
                  : newPropertyType === "APARTMENT"
                    ? "Enter apartment name"
                    : "Select a property type first"
              }
            />
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNewPropertyDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="neon" onClick={() => void handleCreateProperty()}>
              Create Property
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editPropertyDialogOpen}
        onOpenChange={(open) => {
          setEditPropertyDialogOpen(open);
          if (!open) {
            setPropertyBeingEdited(null);
            setEditedPropertyName("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Property Type</label>
              <Input
                value={
                  propertyBeingEdited?.propertyType === "HOUSE"
                    ? "House"
                    : propertyBeingEdited?.propertyType === "APARTMENT"
                      ? "Apartment"
                      : ""
                }
                disabled
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Property Name</label>
              <Input
                value={editedPropertyName}
                onChange={(e) => setEditedPropertyName(e.target.value)}
                placeholder="Enter property name"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditPropertyDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="neon"
                onClick={() => void handleUpdateProperty()}
                disabled={updatingProperty}
              >
                {updatingProperty ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

export default function Properties() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#040814]" />}>
      <PropertiesContent />
    </Suspense>
  );
}
