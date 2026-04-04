import BillLineItem from "@/models/BillLineItem";
import { GraphQLContext } from "../../context";
import { BillingService } from "./billing.service";
import { BillingPreviewService } from "./billingPreview.service";
import { BillingSettingsService } from "./billingSettings.service";

type GenerateBillArgs = {
  propertyId: string;
  from: string;
  to: string;
};

export const billingResolvers = {
  Query: {
    getBills: (
      _parent: unknown,
      { propertyId }: { propertyId: string },
      context: GraphQLContext
    ) => BillingService.getBills(propertyId, context.userId),
    getBillById: (
      _parent: unknown,
      { billId }: { billId: string },
      context: GraphQLContext
    ) => BillingService.getBillById(billId, context.userId),
    getBillingLimit: (
      _parent: unknown,
      { propertyId }: { propertyId: string },
      context: GraphQLContext
    ) => BillingSettingsService.getBillingLimit(propertyId, context.userId),
    getBillPreview: (
      _parent: unknown,
      args: GenerateBillArgs,
      context: GraphQLContext
    ) =>
      BillingPreviewService.getBillPreview(
        args.propertyId,
        args.from,
        args.to,
        context.userId
      ),
  },

  Mutation: {
    generateBill: (
      _parent: unknown,
      args: GenerateBillArgs,
      context: GraphQLContext
    ) => BillingService.generateBill(args.propertyId, args.from, args.to, context.userId),
    setBillingLimit: (
      _parent: unknown,
      args: {
        propertyId: string;
        dailyLimit?: number | null;
        monthlyLimit?: number | null;
        alertType: "COST" | "KWH";
      },
      context: GraphQLContext
    ) =>
      BillingSettingsService.setBillingLimit(
        args.propertyId,
        args.dailyLimit,
        args.monthlyLimit,
        args.alertType,
        context.userId
      ),
  },

  Bill: {
    id: (bill: any) => bill._id ?? bill.id,
    propertyId: (bill: any) => bill.propertyId ?? bill.property_id,
    tariffId: (bill: any) => bill.tariffId ?? bill.tariff_id,
    periodStart: (bill: any) =>
      new Date(bill.periodStart ?? bill.period_start).toISOString(),
    periodEnd: (bill: any) =>
      new Date(bill.periodEnd ?? bill.period_end).toISOString(),
    totalKwh: (bill: any) => bill.totalKwh ?? bill.total_kwh ?? 0,
    totalAmount: (bill: any) => bill.totalAmount ?? bill.total_amount ?? 0,
    lineItems: async (bill: any) =>
      BillLineItem.find({ bill_id: bill._id ?? bill.id })
        .sort({ amount: -1, kwh: -1 })
        .lean()
        .exec(),
    createdAt: (bill: any) => new Date(bill.createdAt ?? bill.created_at).toISOString(),
    updatedAt: (bill: any) => new Date(bill.updatedAt ?? bill.updated_at).toISOString(),
  },

  BillLineItem: {
    id: (lineItem: any) => lineItem._id ?? lineItem.id,
    billId: (lineItem: any) => lineItem.billId ?? lineItem.bill_id,
    equipmentId: (lineItem: any) => lineItem.equipmentId ?? lineItem.equipment_id,
    equipmentName: (lineItem: any) =>
      BillingService.getEquipmentName(lineItem.equipmentId ?? lineItem.equipment_id),
    kwh: (lineItem: any) => lineItem.kwh ?? lineItem.kWh ?? 0,
    amount: (lineItem: any) => lineItem.amount ?? 0,
    createdAt: (lineItem: any) =>
      new Date(lineItem.createdAt ?? lineItem.created_at).toISOString(),
    updatedAt: (lineItem: any) =>
      new Date(lineItem.updatedAt ?? lineItem.updated_at).toISOString(),
  },

  UserBillingSettings: {
    id: (settings: any) => settings.id ?? settings._id,
    propertyId: (settings: any) => settings.propertyId ?? settings.property_id,
    dailyLimit: (settings: any) => settings.dailyLimit ?? settings.daily_limit ?? null,
    monthlyLimit: (settings: any) => settings.monthlyLimit ?? settings.monthly_limit ?? null,
    alertType: (settings: any) => settings.alertType ?? settings.alert_type ?? "KWH",
  },

  BillPreview: {
    totalKwh: (preview: any) => preview.totalKwh ?? 0,
    totalAmount: (preview: any) => preview.totalAmount ?? 0,
    breakdown: (preview: any) => preview.breakdown ?? [],
  },

  EquipmentBreakdown: {
    equipmentId: (item: any) => item.equipmentId,
    equipmentName: (item: any) => item.equipmentName ?? "Device",
    kwh: (item: any) => item.kwh ?? 0,
    amount: (item: any) => item.amount ?? 0,
  },
};
