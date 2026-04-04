"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { CalendarRange, FileText, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { BillDetail } from "@/components/billing/BillDetail";
import { BillList } from "@/components/billing/BillList";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ME_QUERY } from "@/lib/graphql/queries/auth.queries";
import {
  GENERATE_BILL_MUTATION,
  GET_BILL_BY_ID_QUERY,
  GET_BILLS_QUERY,
} from "@/lib/graphql/queries/billing.queries";
import { MY_PROPERTIES_QUERY } from "@/lib/graphql/queries/properties.queries";

type PropertyRecord = {
  id: string;
  propertyName: string;
};

type BillSummary = {
  id: string;
  propertyId: string;
  periodStart: string;
  periodEnd: string;
  totalKwh: number;
  totalAmount: number;
  createdAt: string;
};

type BillDetailRecord = BillSummary & {
  lineItems: Array<{
    id: string;
    equipmentId: string;
    equipmentName: string;
    kwh: number;
    amount: number;
  }>;
};

const toDateInputValue = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const today = new Date();
const defaultFrom = toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1));
const defaultTo = toDateInputValue(today);

export function BillPage() {
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [viewMode, setViewMode] = useState<"kwh" | "amount">("amount");

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

  const effectiveSelectedPropertyId = selectedPropertyId || properties[0]?.id || "";

  const {
    data: billsData,
    loading: billsLoading,
    error: billsError,
    refetch: refetchBills,
  } = useQuery(GET_BILLS_QUERY, {
    variables: { propertyId: effectiveSelectedPropertyId },
    skip: !effectiveSelectedPropertyId,
    fetchPolicy: "network-only",
  });

  const bills: BillSummary[] = useMemo(
    () => billsData?.getBills ?? [],
    [billsData]
  );

  const effectiveSelectedBillId =
    selectedBillId && bills.some((bill) => bill.id === selectedBillId)
      ? selectedBillId
      : (bills[0]?.id ?? null);

  const {
    data: billDetailData,
    loading: billDetailLoading,
    error: billDetailError,
  } = useQuery(GET_BILL_BY_ID_QUERY, {
    variables: { billId: effectiveSelectedBillId },
    skip: !effectiveSelectedBillId,
    fetchPolicy: "network-only",
  });

  const selectedBill: BillDetailRecord | null = billDetailData?.getBillById ?? null;

  const [generateBill, { loading: generatingBill }] = useMutation(GENERATE_BILL_MUTATION);

  const selectedProperty = properties.find(
    (property) => property.id === effectiveSelectedPropertyId
  );
  const latestBill = bills[0] ?? null;

  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setSelectedBillId(null);
  };

  const handleGenerateBill = async () => {
    if (!effectiveSelectedPropertyId) {
      toast.error("Select a property first");
      return;
    }

    if (!fromDate || !toDate) {
      toast.error("Select a valid date range");
      return;
    }

    if (fromDate > toDate) {
      toast.error("From date must be before To date");
      return;
    }

    try {
      const result = await generateBill({
        variables: {
          propertyId: effectiveSelectedPropertyId,
          from: fromDate,
          to: toDate,
        },
      });

      await refetchBills();

      const createdBillId = result.data?.generateBill?.id as string | undefined;

      if (createdBillId) {
        setSelectedBillId(createdBillId);
      }

      toast.success("Bill generated successfully");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to generate bill";
      toast.error(message);
    }
  };

  return (
    <AppShell
      title="Electricity Bills"
      current="billing"
      user={meData?.me}
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <Select value={effectiveSelectedPropertyId} onValueChange={handlePropertyChange}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select Property" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.propertyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="neon"
            onClick={() => void handleGenerateBill()}
            disabled={generatingBill || !effectiveSelectedPropertyId}
          >
            <PlusCircle className="h-4 w-4" />
            {generatingBill ? "Generating..." : "Generate Bill"}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {propertiesLoading ? (
          <div className="app-content-panel text-sm text-muted-foreground">
            Loading properties...
          </div>
        ) : propertiesError ? (
          <div className="app-content-panel text-sm text-destructive">
            {propertiesError.message}
          </div>
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-3">
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CalendarRange className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Billing Range</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="text-sm">
                        <span className="mb-1 block text-muted-foreground">From</span>
                        <input
                          type="date"
                          value={fromDate}
                          onChange={(event) => setFromDate(event.target.value)}
                          className="h-10 w-full rounded-md border border-border bg-background px-3 text-foreground"
                        />
                      </label>
                      <label className="text-sm">
                        <span className="mb-1 block text-muted-foreground">To</span>
                        <input
                          type="date"
                          value={toDate}
                          onChange={(event) => setToDate(event.target.value)}
                          className="h-10 w-full rounded-md border border-border bg-background px-3 text-foreground"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Selected Property</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {selectedProperty?.propertyName ?? "No property selected"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {bills.length} bill{bills.length === 1 ? "" : "s"} saved
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-6">
                <p className="text-sm text-muted-foreground">Latest Bill</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {latestBill
                    ? new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 2,
                      }).format(latestBill.totalAmount)
                    : "No bills yet"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {latestBill
                    ? `${latestBill.totalKwh.toFixed(2)} kWh in the latest generated cycle`
                    : "Generate a bill to start building billing history."}
                </p>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.05fr_1.4fr]">
              <BillList
                bills={bills}
                selectedBillId={effectiveSelectedBillId}
                loading={billsLoading}
                error={billsError?.message}
                onSelect={setSelectedBillId}
              />

              <BillDetail
                bill={selectedBill}
                loading={billDetailLoading}
                error={billDetailError?.message}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
