"use client";

import { useEffect, useMemo, useState } from "react";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client/react";
import {
  AlertTriangle,
  CalendarRange,
  ChevronDown,
  FileText,
  PlusCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { BillDetail } from "@/components/billing/BillDetail";
import { BillList } from "@/components/billing/BillList";
import { BillingPeriodDialog } from "@/components/billing/BillingPeriodDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  GET_BILLING_LIMIT_QUERY,
  GET_BILL_PREVIEW_QUERY,
  GET_BILLS_QUERY,
  SET_BILLING_LIMIT_MUTATION,
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
  updatedAt: string;
};

type BillDetailRecord = BillSummary & {
  lineItems: BillBreakdownItem[];
};

type BillBreakdownItem = {
  id: string;
  equipmentId: string;
  equipmentName: string;
  kwh: number;
  amount: number;
};

type BillingLimitRecord = {
  id: string;
  propertyId: string;
  dailyLimit: number | null;
  monthlyLimit: number | null;
  alertType: "COST" | "KWH";
  lastDailyAlertSent: string | null;
  lastMonthlyAlertSent: string | null;
  lastAlertError: string | null;
};

type BillPreviewRecord = {
  totalKwh: number;
  totalAmount: number;
  breakdown: BillBreakdownItem[];
};

type MeQueryData = {
  me: {
    id?: string;
    email?: string | null;
    name?: string | null;
  } | null;
};

type MyPropertiesQueryData = {
  myProperties: PropertyRecord[];
};

type GetBillsQueryData = {
  getBills: unknown[];
};

type GetBillByIdQueryData = {
  getBillById: unknown;
};

type GetBillingLimitQueryData = {
  getBillingLimit: unknown;
};

type GenerateBillMutationData = {
  generateBill?: {
    id?: string;
  } | null;
};

type GetBillPreviewQueryData = {
  getBillPreview: unknown;
};

const normalizeBillSummary = (bill: any): BillSummary => ({
  id: String(bill?.id ?? bill?._id ?? ""),
  propertyId: String(bill?.propertyId ?? bill?.property_id ?? ""),
  periodStart: String(bill?.periodStart ?? bill?.period_start ?? ""),
  periodEnd: String(bill?.periodEnd ?? bill?.period_end ?? ""),
  totalKwh: Number(bill?.totalKwh ?? bill?.total_kwh ?? 0),
  totalAmount: Number(bill?.totalAmount ?? bill?.total_amount ?? 0),
  createdAt: String(bill?.createdAt ?? bill?.created_at ?? ""),
  updatedAt: String(bill?.updatedAt ?? bill?.updated_at ?? bill?.createdAt ?? bill?.created_at ?? ""),
});

const normalizeBillDetail = (bill: any): BillDetailRecord | null => {
  if (!bill) {
    return null;
  }

  return {
    ...normalizeBillSummary(bill),
    lineItems: Array.isArray(bill?.lineItems ?? bill?.line_items)
      ? (bill.lineItems ?? bill.line_items).map((item: any) => ({
          id: String(item?.id ?? item?._id ?? ""),
          equipmentId: String(item?.equipmentId ?? item?.equipment_id ?? ""),
          equipmentName: String(item?.equipmentName ?? item?.equipment_name ?? "Unknown"),
          kwh: Number(item?.kwh ?? item?.kWh ?? 0),
          amount: Number(item?.amount ?? 0),
        }))
      : [],
  };
};

const normalizeBillingLimit = (settings: any): BillingLimitRecord | null => {
  if (!settings) {
    return null;
  }

  return {
    id: String(settings?.id ?? settings?._id ?? ""),
    propertyId: String(settings?.propertyId ?? settings?.property_id ?? ""),
    dailyLimit: settings?.dailyLimit ?? settings?.daily_limit ?? null,
    monthlyLimit: settings?.monthlyLimit ?? settings?.monthly_limit ?? null,
    alertType: (settings?.alertType ?? settings?.alert_type ?? "KWH") as "COST" | "KWH",
    lastDailyAlertSent: settings?.lastDailyAlertSent ?? settings?.last_daily_alert_sent ?? null,
    lastMonthlyAlertSent:
      settings?.lastMonthlyAlertSent ?? settings?.last_monthly_alert_sent ?? null,
    lastAlertError: settings?.lastAlertError ?? settings?.last_alert_error ?? null,
  };
};

const normalizeBillPreview = (preview: any): BillPreviewRecord => ({
  totalKwh: Number(preview?.totalKwh ?? 0),
  totalAmount: Number(preview?.totalAmount ?? 0),
  breakdown: Array.isArray(preview?.breakdown)
    ? preview.breakdown.map((item: any) => ({
        id: String(item?.id ?? item?._id ?? ""),
        equipmentId: String(item?.equipmentId ?? ""),
        equipmentName: String(item?.equipmentName ?? "Device"),
        kwh: Number(item?.kwh ?? 0),
        amount: Number(item?.amount ?? 0),
      }))
    : [],
});

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

const formatDateLabel = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const formatDateTimeLabel = (value?: string | null) => {
  if (!value) {
    return "Not sent yet";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Not sent yet";
  }

  return parsed.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getLimitStatus = (
  limit: number | null | undefined,
  currentValue: number | null | undefined
) => {
  if (limit == null) {
    return {
      label: "No limit set",
      detail: "Save a limit to start checking generated bills.",
      exceeded: false,
    };
  }

  if (currentValue == null) {
    return {
      label: "No bill generated yet",
      detail: "Generate a bill to evaluate this limit.",
      exceeded: false,
    };
  }

  if (currentValue > limit) {
    return {
      label: "Limit exceeded",
      detail: `Current value ${currentValue.toFixed(2)} is above the saved limit ${limit.toFixed(2)}.`,
      exceeded: true,
    };
  }

  return {
    label: "Within limit",
    detail: `Current value ${currentValue.toFixed(2)} is within the saved limit ${limit.toFixed(2)}.`,
    exceeded: false,
  };
};

const formatEquipmentId = (value: unknown) => {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized.slice(-6).toUpperCase() : "UNKNOWN";
};

const getBillSortTime = (bill: BillSummary) => {
  const createdAtTime = new Date(bill.createdAt).getTime();
  if (Number.isFinite(createdAtTime)) {
    return createdAtTime;
  }

  const periodEndTime = new Date(bill.periodEnd).getTime();
  if (Number.isFinite(periodEndTime)) {
    return periodEndTime;
  }

  return new Date(bill.periodStart).getTime();
};

const toDateInputValue = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const toNullableNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

type BillReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle: string;
  badge: string;
  propertyName: string;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  totalKwh: number;
  totalAmount: number;
  breakdown: BillBreakdownItem[];
  warning?: string | null;
  loading?: boolean;
  emptyMessage?: string;
};

function BillReportDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  badge,
  propertyName,
  generatedAt,
  periodStart,
  periodEnd,
  totalKwh,
  totalAmount,
  breakdown,
  warning,
  loading = false,
  emptyMessage = "No device breakdown available for this billing range.",
}: BillReportDialogProps) {
  const sortedBreakdown = [...breakdown].sort((left, right) => right.kwh - left.kwh);
  const topConsumers = sortedBreakdown.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden border-border bg-card">
        <DialogHeader className="mb-0 flex flex-row items-start justify-between gap-4">
          <div>
            <DialogTitle>{title}</DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            {badge}
          </div>
        </DialogHeader>

        <ScrollArea className="mt-6 max-h-[70vh] pr-4">
          {loading ? (
            <div className="rounded-xl border border-border bg-secondary/10 p-6 text-sm text-muted-foreground">
              Loading bill report...
            </div>
          ) : (
            <div className="space-y-6 text-sm">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs text-muted-foreground">Property</p>
                  <p className="mt-1 font-medium text-foreground">{propertyName}</p>
                </div>
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs text-muted-foreground">Billing Range</p>
                  <p className="mt-1 font-medium text-foreground">
                    {formatDateLabel(periodStart)} - {formatDateLabel(periodEnd)}
                  </p>
                </div>
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs text-muted-foreground">Generated</p>
                  <p className="mt-1 font-medium text-foreground">{generatedAt}</p>
                </div>
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs text-muted-foreground">Device Count</p>
                  <p className="mt-1 font-medium text-foreground">{breakdown.length}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs text-muted-foreground">Total Usage</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {totalKwh.toFixed(2)} kWh
                  </p>
                </div>
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs text-muted-foreground">Total Bill</p>
                  <p className="mt-1 text-lg font-semibold text-accent">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs text-muted-foreground">Projected Annual Cost</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {formatCurrency(totalAmount * 12)}
                  </p>
                </div>
              </div>

              {warning ? (
                <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
                  {warning}
                </div>
              ) : null}

              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Top Consumers</h3>
                    <p className="text-xs text-muted-foreground">
                      Ranked by usage within this billing range
                    </p>
                  </div>
                  <p className="text-sm font-medium text-foreground">{totalKwh.toFixed(2)} kWh</p>
                </div>

                <div className="mt-4 space-y-3">
                  {topConsumers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                  ) : (
                    topConsumers.map((item) => {
                      const contribution = totalKwh > 0 ? (item.kwh / totalKwh) * 100 : 0;

                      return (
                        <div
                          key={`${item.equipmentId}-${item.equipmentName}-top`}
                          className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2"
                        >
                          <div>
                            <p className="font-medium text-foreground">{item.equipmentName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatEquipmentId(item.equipmentId)} • {contribution.toFixed(1)}%
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">{item.kwh.toFixed(2)} kWh</p>
                            <p className="text-xs text-accent">{formatCurrency(item.amount)}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-lg overflow-hidden border border-border">
                <div className="grid grid-cols-[minmax(0,1.8fr)_120px_130px_120px] gap-3 border-b border-border bg-secondary/30 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <span>Device</span>
                  <span className="text-right">Usage</span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Share</span>
                </div>

                {sortedBreakdown.length === 0 ? (
                  <div className="px-4 py-10 text-center text-muted-foreground">
                    {emptyMessage}
                  </div>
                ) : (
                  sortedBreakdown.map((item) => {
                    const contribution = totalKwh > 0 ? (item.kwh / totalKwh) * 100 : 0;

                    return (
                      <div
                        key={`${item.equipmentId}-${item.equipmentName}-row`}
                        className="grid grid-cols-[minmax(0,1.8fr)_120px_130px_120px] gap-3 border-b border-border/70 px-4 py-3 text-sm last:border-b-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{item.equipmentName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatEquipmentId(item.equipmentId)}
                          </p>
                        </div>
                        <span className="text-right text-foreground">{item.kwh.toFixed(2)} kWh</span>
                        <span className="text-right text-foreground">{formatCurrency(item.amount)}</span>
                        <span className="text-right text-muted-foreground">
                          {contribution.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

const today = new Date();
const defaultFrom = toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1));
const defaultTo = toDateInputValue(today);

export function BillPage() {
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [latestBillId, setLatestBillId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [viewMode, setViewMode] = useState<"kwh" | "amount">("amount");
  const [dailyLimitInput, setDailyLimitInput] = useState("");
  const [monthlyLimitInput, setMonthlyLimitInput] = useState("");
  const [alertType, setAlertType] = useState<"COST" | "KWH">("KWH");
  const [previewResult, setPreviewResult] = useState<BillPreviewRecord | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [latestBillDialogOpen, setLatestBillDialogOpen] = useState(false);
  const [alertSettingsOpen, setAlertSettingsOpen] = useState(false);
  const [billingPeriodOpen, setBillingPeriodOpen] = useState(false);

  const { data: meData } = useQuery<MeQueryData>(ME_QUERY, {
    errorPolicy: "all",
    fetchPolicy: "network-only",
  });

  const {
    data: propertiesData,
    loading: propertiesLoading,
    error: propertiesError,
  } = useQuery<MyPropertiesQueryData>(MY_PROPERTIES_QUERY, {
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
  } = useQuery<GetBillsQueryData>(GET_BILLS_QUERY, {
    variables: { propertyId: effectiveSelectedPropertyId },
    skip: !effectiveSelectedPropertyId,
    fetchPolicy: "network-only",
  });

  const bills: BillSummary[] = useMemo(
    () =>
      Array.isArray(billsData?.getBills)
        ? [...billsData.getBills]
            .map(normalizeBillSummary)
            .sort(
              (left, right) =>
                getBillSortTime(right) - getBillSortTime(left)
            )
        : [],
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
    refetch: refetchBillDetail,
  } = useQuery<GetBillByIdQueryData>(GET_BILL_BY_ID_QUERY, {
    variables: { billId: effectiveSelectedBillId },
    skip: !effectiveSelectedBillId,
    fetchPolicy: "network-only",
  });

  const selectedBill: BillDetailRecord | null = useMemo(
    () => normalizeBillDetail(billDetailData?.getBillById),
    [billDetailData]
  );

  const displayedBill: BillDetailRecord | null = useMemo(() => {
    const selectedBillHasUsage = Boolean(
      selectedBill && (selectedBill.totalKwh > 0 || selectedBill.totalAmount > 0)
    );

    if (selectedBillHasUsage || !previewResult || !effectiveSelectedPropertyId) {
      return selectedBill;
    }

    const now = new Date().toISOString();

    return {
      id: selectedBill?.id ?? "current-estimate",
      propertyId: effectiveSelectedPropertyId,
      periodStart: fromDate,
      periodEnd: toDate,
      totalKwh: previewResult.totalKwh,
      totalAmount: previewResult.totalAmount,
      createdAt: selectedBill?.createdAt ?? now,
      updatedAt: now,
      lineItems: previewResult.breakdown.map((item, index) => ({
        ...item,
        id: item.id || `${item.equipmentId}-${index}`,
      })),
    };
  }, [
    effectiveSelectedPropertyId,
    fromDate,
    previewResult,
    selectedBill,
    toDate,
  ]);

  const [generateBill, { loading: generatingBill }] =
    useMutation<GenerateBillMutationData>(GENERATE_BILL_MUTATION);
  const [getBillPreview, { loading: previewLoading }] =
    useLazyQuery<GetBillPreviewQueryData>(GET_BILL_PREVIEW_QUERY, {
      fetchPolicy: "network-only",
    });

  const {
    data: billingLimitData,
    loading: billingLimitLoading,
    refetch: refetchBillingLimit,
  } = useQuery<GetBillingLimitQueryData>(GET_BILLING_LIMIT_QUERY, {
    variables: { propertyId: effectiveSelectedPropertyId },
    skip: !effectiveSelectedPropertyId,
    fetchPolicy: "network-only",
  });

  const [setBillingLimit, { loading: savingBillingLimit }] = useMutation(
    SET_BILLING_LIMIT_MUTATION
  );

  const billingLimit = useMemo(
    () => normalizeBillingLimit(billingLimitData?.getBillingLimit),
    [billingLimitData]
  );

  useEffect(() => {
    setDailyLimitInput(
      billingLimit?.dailyLimit != null ? String(billingLimit.dailyLimit) : ""
    );
    setMonthlyLimitInput(
      billingLimit?.monthlyLimit != null ? String(billingLimit.monthlyLimit) : ""
    );
    setAlertType(billingLimit?.alertType ?? "KWH");
  }, [billingLimit]);

  useEffect(() => {
    let cancelled = false;

    if (!effectiveSelectedPropertyId || !fromDate || !toDate || fromDate > toDate) {
      return () => {
        cancelled = true;
      };
    }

    void getBillPreview({
      variables: {
        propertyId: effectiveSelectedPropertyId,
        from: fromDate,
        to: toDate,
      },
    })
      .then((result) => {
        if (!cancelled) {
          setPreviewResult(normalizeBillPreview(result.data?.getBillPreview));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewResult(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveSelectedPropertyId, fromDate, getBillPreview, toDate]);

  useEffect(() => {
    if (!latestBillId || bills.some((bill) => bill.id === latestBillId)) {
      return;
    }

    setLatestBillId(null);
  }, [bills, latestBillId]);

  const selectedProperty = properties.find(
    (property) => property.id === effectiveSelectedPropertyId
  );
  const effectiveLatestBillId =
    latestBillId && bills.some((bill) => bill.id === latestBillId)
      ? latestBillId
      : (bills[0]?.id ?? null);
  const latestBill = useMemo(
    () => bills.find((bill) => bill.id === effectiveLatestBillId) ?? null,
    [bills, effectiveLatestBillId]
  );
  const {
    data: latestBillDetailData,
    loading: latestBillDetailLoading,
    refetch: refetchLatestBillDetail,
  } = useQuery<GetBillByIdQueryData>(GET_BILL_BY_ID_QUERY, {
    variables: { billId: latestBill?.id },
    skip: !latestBill?.id,
    fetchPolicy: "network-only",
  });
  const latestBillDetail: BillDetailRecord | null = useMemo(
    () => normalizeBillDetail(latestBillDetailData?.getBillById),
    [latestBillDetailData]
  );
  const latestBillHasUsage = Boolean(
    latestBill && (latestBill.totalAmount > 0 || latestBill.totalKwh > 0)
  );
  const latestAlertValue =
    billingLimit?.alertType === "COST"
      ? latestBillHasUsage
        ? latestBill?.totalAmount
        : previewResult?.totalAmount
      : latestBillHasUsage
        ? latestBill?.totalKwh
        : previewResult?.totalKwh;
  const dailyLimitStatus = getLimitStatus(billingLimit?.dailyLimit, latestAlertValue);
  const monthlyLimitStatus = getLimitStatus(billingLimit?.monthlyLimit, latestAlertValue);
  const previewWarning =
    previewResult && billingLimit
      ? billingLimit.alertType === "COST" &&
        billingLimit.monthlyLimit != null &&
        previewResult.totalAmount > billingLimit.monthlyLimit
        ? `Preview exceeds saved monthly cost limit of ${formatCurrency(
            billingLimit.monthlyLimit
          )}.`
        : billingLimit.alertType === "KWH" &&
            billingLimit.monthlyLimit != null &&
            previewResult.totalKwh > billingLimit.monthlyLimit
          ? `Preview exceeds saved monthly usage limit of ${billingLimit.monthlyLimit.toFixed(
              2
            )} kWh.`
          : null
      : null;

  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setSelectedBillId(null);
    setLatestBillId(null);
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

      const refreshedBills = await refetchBills();
      const normalizedRefetchedBills = Array.isArray(refreshedBills.data?.getBills)
        ? refreshedBills.data.getBills.map(normalizeBillSummary)
        : [];
      await refetchBillingLimit();

      const createdBillId = result.data?.generateBill?.id as string | undefined;
      const generatedBillId = createdBillId ?? normalizedRefetchedBills[0]?.id ?? null;

      setLatestBillId(generatedBillId);
      setSelectedBillId(generatedBillId);

      if (generatedBillId) {
        await Promise.all([
          refetchBillDetail({ billId: generatedBillId }),
          refetchLatestBillDetail({ billId: generatedBillId }),
        ]);
      }

      const refreshedPreview = await getBillPreview({
        variables: {
          propertyId: effectiveSelectedPropertyId,
          from: fromDate,
          to: toDate,
        },
      });
      setPreviewResult(normalizeBillPreview(refreshedPreview.data?.getBillPreview));
      setLatestBillDialogOpen(true);

      toast.success("Bill generated successfully");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to generate bill";
      toast.error(message);
    }
  };

  const handlePreviewBill = async () => {
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
      const result = await getBillPreview({
        variables: {
          propertyId: effectiveSelectedPropertyId,
          from: fromDate,
          to: toDate,
        },
      });

      setPreviewResult(normalizeBillPreview(result.data?.getBillPreview));
      setPreviewDialogOpen(true);
      toast.success("Bill preview updated");
    } catch (error: unknown) {
      setPreviewResult({
        totalKwh: 0,
        totalAmount: 0,
        breakdown: [],
      });
      const message = error instanceof Error ? error.message : "Failed to preview bill";
      toast.error(message);
    }
  };

  const handleSaveBillingLimit = async () => {
    if (!effectiveSelectedPropertyId) {
      toast.error("Select a property first");
      return;
    }

    const dailyLimit = toNullableNumber(dailyLimitInput);
    const monthlyLimit = toNullableNumber(monthlyLimitInput);

    if (dailyLimitInput.trim() && dailyLimit == null) {
      toast.error("Daily limit must be a valid number");
      return;
    }

    if (monthlyLimitInput.trim() && monthlyLimit == null) {
      toast.error("Monthly limit must be a valid number");
      return;
    }

    try {
      await setBillingLimit({
        variables: {
          propertyId: effectiveSelectedPropertyId,
          dailyLimit,
          monthlyLimit,
          alertType,
        },
      });
      await refetchBillingLimit();
      toast.success("Billing alert settings saved");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to save billing settings";
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
          <Button
            variant="outline"
            onClick={() => {
              setBillingPeriodOpen(true);
              setAlertSettingsOpen(false);
            }}
            aria-haspopup="dialog"
          >
            <CalendarRange className="h-4 w-4" />
            Billing Period
          </Button>

          <Button
            variant="outline"
            onClick={() => void handlePreviewBill()}
            disabled={previewLoading || !effectiveSelectedPropertyId}
          >
            <FileText className="h-4 w-4" />
            {previewLoading ? "Previewing..." : "Preview Bill"}
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setAlertSettingsOpen((open) => !open);
              setBillingPeriodOpen(false);
            }}
            disabled={!effectiveSelectedPropertyId}
            aria-expanded={alertSettingsOpen}
          >
            <AlertTriangle className="h-4 w-4" />
            Alert Settings
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                alertSettingsOpen ? "rotate-180" : ""
              }`}
            />
          </Button>

          <Button
            variant="neon"
            onClick={() => void handleGenerateBill()}
            disabled={generatingBill || !effectiveSelectedPropertyId}
          >
            <PlusCircle className="h-4 w-4" />
            {generatingBill ? "Generating..." : "Generate Bill"}
          </Button>

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
            {alertSettingsOpen ? (
            <section className="app-content-panel">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Billing Limit Alerts</h2>
                  <p className="text-sm text-muted-foreground">
                    Set optional daily and monthly thresholds for this property. Alerts are sent once per day or month when exceeded.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_1fr_220px_auto]">
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">Daily Limit</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={dailyLimitInput}
                    onChange={(event) => setDailyLimitInput(event.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-foreground"
                    placeholder="Optional"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">Monthly Limit</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monthlyLimitInput}
                    onChange={(event) => setMonthlyLimitInput(event.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-foreground"
                    placeholder="Optional"
                  />
                </label>
                <div className="text-sm">
                  <span className="mb-1 block text-muted-foreground">Alert Type</span>
                  <Select
                    value={alertType}
                    onValueChange={(value) => setAlertType(value as "COST" | "KWH")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KWH">KWH</SelectItem>
                      <SelectItem value="COST">COST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => void handleSaveBillingLimit()}
                    disabled={savingBillingLimit || billingLimitLoading || !effectiveSelectedPropertyId}
                  >
                    {savingBillingLimit ? "Saving..." : "Save Limits"}
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-secondary/10 p-4">
                  <p className="text-sm text-muted-foreground">Daily Alert Status</p>
                  <p
                    className={`mt-2 font-semibold ${
                      dailyLimitStatus.exceeded ? "text-destructive" : "text-foreground"
                    }`}
                  >
                    {dailyLimitStatus.label}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {dailyLimitStatus.detail}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-secondary/10 p-4">
                  <p className="text-sm text-muted-foreground">Monthly Alert Status</p>
                  <p
                    className={`mt-2 font-semibold ${
                      monthlyLimitStatus.exceeded ? "text-destructive" : "text-foreground"
                    }`}
                  >
                    {monthlyLimitStatus.label}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {monthlyLimitStatus.detail}
                  </p>
                </div>
              </div>
              {billingLimit?.lastAlertError ? (
                <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  Alert email failed: {billingLimit.lastAlertError}
                </div>
              ) : null}
            </section>
            ) : null}

            <BillDetail
              bill={displayedBill}
              loading={billDetailLoading && !previewResult}
              error={previewResult ? undefined : billDetailError?.message}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />

            <BillList
              bills={bills}
              selectedBillId={effectiveSelectedBillId}
              loading={billsLoading}
              error={billsError?.message}
              onSelect={setSelectedBillId}
            />
          </>
        )}
      </div>

      {billingPeriodOpen ? (
        <BillingPeriodDialog
          open={billingPeriodOpen}
          onOpenChange={setBillingPeriodOpen}
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
        />
      ) : null}

      <BillReportDialog
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        title="Bill Preview Report"
        subtitle="Preview the current billing range before generating a saved bill."
        badge="Preview only"
        propertyName={selectedProperty?.propertyName ?? "No property selected"}
        generatedAt={new Date().toLocaleString("en-IN")}
        periodStart={fromDate}
        periodEnd={toDate}
        totalKwh={previewResult?.totalKwh ?? 0}
        totalAmount={previewResult?.totalAmount ?? 0}
        breakdown={previewResult?.breakdown ?? []}
        warning={previewWarning}
        emptyMessage="No equipment usage found for the selected range. Missing days are treated as zero consumption."
      />

      <BillReportDialog
        open={latestBillDialogOpen}
        onOpenChange={setLatestBillDialogOpen}
        title="Latest Generated Bill"
        subtitle="Saved bill report with full device-wise breakdown and final totals."
        badge="Generated bill"
        propertyName={selectedProperty?.propertyName ?? "No property selected"}
        generatedAt={
          latestBillDetail?.createdAt
            ? new Date(latestBillDetail.createdAt).toLocaleString("en-IN")
            : new Date().toLocaleString("en-IN")
        }
        periodStart={latestBillDetail?.periodStart ?? fromDate}
        periodEnd={latestBillDetail?.periodEnd ?? toDate}
        totalKwh={latestBillDetail?.totalKwh ?? latestBill?.totalKwh ?? 0}
        totalAmount={latestBillDetail?.totalAmount ?? latestBill?.totalAmount ?? 0}
        breakdown={latestBillDetail?.lineItems ?? []}
        loading={latestBillDetailLoading}
        emptyMessage="This bill was generated without any saved device-level breakdown."
      />
    </AppShell>
  );
}
