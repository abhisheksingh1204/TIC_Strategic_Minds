import { GraphQLError } from "graphql";
import { Types } from "mongoose";
import Property from "@/models/Property.model";
import User from "@/models/User.model";
import UserBillingSettings from "@/models/UserBillingSettings";
import { sendBillingLimitExceededEmail } from "@/lib/email";
import EnergyAggregate from "@/models/EnergyAggregate.model";
import { CostService } from "../cost/cost.service";
import { getDayRange, parseDateInput } from "@/lib/date";

type AlertType = "COST" | "KWH";
type AlertScope = "daily" | "monthly";

type AlertContext = {
  property: {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    propertyName?: string | null;
  };
  settings: any;
  user: {
    email: string;
  };
};

type AlertCandidate = {
  scope: AlertScope;
  limit: number;
  value: number;
};

const toObjectId = (value: string, label: string) => {
  if (!Types.ObjectId.isValid(value)) {
    throw new GraphQLError(`Invalid ${label}`);
  }

  return new Types.ObjectId(value);
};

const normalizeDate = (value: string, label: string) => {
  const parsed = parseDateInput(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new GraphQLError(`Invalid ${label}`);
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const isSameMonth = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth();

const toMonthStartKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
};

const wasAlreadySentForScope = (scope: AlertScope, lastSentAt: Date | null, targetDate: Date) => {
  if (!lastSentAt) {
    return false;
  }

  return scope === "daily"
    ? isSameDay(lastSentAt, targetDate)
    : isSameMonth(lastSentAt, targetDate);
};

const getScopeFieldName = (scope: AlertScope) =>
  scope === "daily" ? "last_daily_alert_sent" : "last_monthly_alert_sent";

export class BillingSettingsService {
  private static async getAlertContext(propertyId: string): Promise<AlertContext | null> {
    const propertyObjectId = toObjectId(propertyId, "propertyId");
    const property = await Property.findById(propertyObjectId).select("_id userId propertyName");

    if (!property) {
      return null;
    }

    const settings = await UserBillingSettings.findOne({
      user_id: property.userId,
      property_id: property._id,
    });

    if (!settings) {
      return null;
    }

    const user = await User.findById(property.userId).select("email");
    if (!user?.email) {
      return null;
    }

    return {
      property,
      settings,
      user: {
        email: user.email,
      },
    };
  }

  private static async assertPropertyOwnership(propertyId: string, userId?: string) {
    if (!userId) {
      throw new GraphQLError("Unauthorized");
    }

    const property = await Property.findOne({
      _id: propertyId,
      userId,
    }).select("_id userId");

    if (!property) {
      throw new GraphQLError("Property not found");
    }

    return property;
  }

  private static buildCandidates(
    settings: any,
    targetDate: Date,
    values: { dailyValue?: number | null; monthlyValue?: number | null }
  ): AlertCandidate[] {
    const candidates: AlertCandidate[] = [];

    if (settings.daily_limit != null && values.dailyValue != null) {
      const lastDaily = settings.last_daily_alert_sent
        ? new Date(settings.last_daily_alert_sent)
        : null;
      if (
        values.dailyValue > settings.daily_limit &&
        !wasAlreadySentForScope("daily", lastDaily, targetDate)
      ) {
        candidates.push({
          scope: "daily",
          limit: settings.daily_limit,
          value: values.dailyValue,
        });
      }
    }

    if (settings.monthly_limit != null && values.monthlyValue != null) {
      const lastMonthly = settings.last_monthly_alert_sent
        ? new Date(settings.last_monthly_alert_sent)
        : null;
      if (
        values.monthlyValue > settings.monthly_limit &&
        !wasAlreadySentForScope("monthly", lastMonthly, targetDate)
      ) {
        candidates.push({
          scope: "monthly",
          limit: settings.monthly_limit,
          value: values.monthlyValue,
        });
      }
    }

    return candidates;
  }

  private static async dispatchAlerts(
    context: AlertContext,
    targetDate: Date,
    values: { dailyValue?: number | null; monthlyValue?: number | null }
  ) {
    const { settings, user, property } = context;
    const candidates = BillingSettingsService.buildCandidates(settings, targetDate, values);

    settings.last_alert_error = null;

    for (const candidate of candidates) {
      try {
        await sendBillingLimitExceededEmail({
          to: user.email,
          propertyName: property.propertyName ?? null,
          alertType: settings.alert_type as AlertType,
          limitScope: candidate.scope,
          currentValue: candidate.value,
          limitValue: candidate.limit,
        });

        settings[getScopeFieldName(candidate.scope)] = targetDate;
      } catch (error) {
        settings.last_alert_error =
          error instanceof Error ? error.message : "Failed to send alert email";
      }
    }

    await settings.save();
  }

  private static async getAggregateAlertValues(
    context: AlertContext,
    date: string
  ): Promise<{ targetDate: Date; dailyValue: number; monthlyValue: number }> {
    const targetDate = normalizeDate(date, "alert date");
    const monthStartKey = toMonthStartKey(targetDate);
    const { start: dayStart } = getDayRange(date, date);
    const alertType = context.settings.alert_type as AlertType;

    const [dailyAggregate, monthlyAggregateRows, dailyCostResult, monthlyCostResult] =
      await Promise.all([
        EnergyAggregate.findOne({
          scope: "PROPERTY",
          refId: context.property._id.toString(),
          type: "DAILY",
          date: dayStart,
        }).select("totalKwh"),
        EnergyAggregate.find({
          scope: "PROPERTY",
          refId: context.property._id.toString(),
          type: "DAILY",
          year: targetDate.getFullYear(),
          month: targetDate.getMonth() + 1,
        }).select("totalKwh"),
        CostService.calculate("PROPERTY", context.property._id.toString(), date, date),
        CostService.calculate(
          "PROPERTY",
          context.property._id.toString(),
          monthStartKey,
          date
        ),
      ]);

    const dailyKwh = dailyAggregate?.totalKwh ?? 0;
    const monthlyKwh = monthlyAggregateRows.reduce(
      (sum, item) => sum + (item.totalKwh ?? 0),
      0
    );

    return {
      targetDate,
      dailyValue: alertType === "COST" ? dailyCostResult.totalCost : dailyKwh,
      monthlyValue: alertType === "COST" ? monthlyCostResult.totalCost : monthlyKwh,
    };
  }

  static normalize(record: any) {
    if (!record) {
      return null;
    }

    return {
      id: String(record._id ?? record.id),
      propertyId: String(record.propertyId ?? record.property_id),
      dailyLimit: record.dailyLimit ?? record.daily_limit ?? null,
      monthlyLimit: record.monthlyLimit ?? record.monthly_limit ?? null,
      alertType: record.alertType ?? record.alert_type ?? "KWH",
      lastDailyAlertSent: record.lastDailyAlertSent ?? record.last_daily_alert_sent ?? null,
      lastMonthlyAlertSent:
        record.lastMonthlyAlertSent ?? record.last_monthly_alert_sent ?? null,
      lastAlertError: record.lastAlertError ?? record.last_alert_error ?? null,
    };
  }

  static async getBillingLimit(propertyId: string, userId?: string) {
    await BillingSettingsService.assertPropertyOwnership(propertyId, userId);

    const settings = await UserBillingSettings.findOne({
      property_id: toObjectId(propertyId, "propertyId"),
    });

    return BillingSettingsService.normalize(settings);
  }

  static async setBillingLimit(
    propertyId: string,
    dailyLimit: number | null | undefined,
    monthlyLimit: number | null | undefined,
    alertType: AlertType,
    userId?: string
  ) {
    const property = await BillingSettingsService.assertPropertyOwnership(propertyId, userId);

    const settings = await UserBillingSettings.findOneAndUpdate(
      {
        user_id: property.userId,
        property_id: property._id,
      },
      {
        user_id: property.userId,
        property_id: property._id,
        daily_limit: dailyLimit ?? null,
        monthly_limit: monthlyLimit ?? null,
        alert_type: alertType,
        last_alert_error: null,
      },
      {
        new: true,
        upsert: true,
      }
    );

    return BillingSettingsService.normalize(settings);
  }

  static async checkAndSendAlerts(propertyId: string, date: string) {
    const context = await BillingSettingsService.getAlertContext(propertyId);
    if (!context) {
      return;
    }

    const { targetDate, dailyValue, monthlyValue } =
      await BillingSettingsService.getAggregateAlertValues(context, date);

    await BillingSettingsService.dispatchAlerts(context, targetDate, {
      dailyValue,
      monthlyValue,
    });
  }

  static async checkAndSendAlertsForGeneratedBill(
    propertyId: string,
    _from: string,
    to: string,
    totalKwh: number,
    totalAmount: number
  ) {
    const context = await BillingSettingsService.getAlertContext(propertyId);
    if (!context) {
      return;
    }

    const targetDate = normalizeDate(to, "to date");
    const alertType = context.settings.alert_type as AlertType;
    const value = alertType === "COST" ? totalAmount : totalKwh;

    await BillingSettingsService.dispatchAlerts(context, targetDate, {
      dailyValue: value,
      monthlyValue: value,
    });
  }
}
