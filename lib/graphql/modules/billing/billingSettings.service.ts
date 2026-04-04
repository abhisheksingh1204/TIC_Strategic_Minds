import { GraphQLError } from "graphql";
import { Types } from "mongoose";
import Property from "@/models/Property.model";
import User from "@/models/User.model";
import UserBillingSettings from "@/models/UserBillingSettings";
import { sendLimitExceededEmail } from "@/lib/email";
import EnergyAggregate from "@/models/EnergyAggregate.model";
import { CostService } from "../cost/cost.service";
import { getDayRange } from "@/lib/date";

type AlertType = "COST" | "KWH";

const toObjectId = (value: string, label: string) => {
  if (!Types.ObjectId.isValid(value)) {
    throw new GraphQLError(`Invalid ${label}`);
  }

  return new Types.ObjectId(value);
};

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const isSameMonth = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth();

const toDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toMonthStartKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
};

export class BillingSettingsService {
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
      },
      {
        new: true,
        upsert: true,
      }
    );

    return BillingSettingsService.normalize(settings);
  }

  static async checkAndSendAlerts(propertyId: string, date: string) {
    const propertyObjectId = toObjectId(propertyId, "propertyId");
    const property = await Property.findById(propertyObjectId).select("_id userId");
    if (!property) {
      return;
    }

    const settings = await UserBillingSettings.findOne({
      user_id: property.userId,
      property_id: property._id,
    });

    if (!settings) {
      return;
    }

    const user = await User.findById(property.userId).select("email");
    if (!user?.email) {
      return;
    }

    const targetDate = new Date(date);
    const { start: dayStart } = getDayRange(date, date);
    const monthStartKey = toMonthStartKey(targetDate);

    const [dailyAggregate, monthlyKwhResult, dailyCostResult, monthlyCostResult] =
      await Promise.all([
        EnergyAggregate.findOne({
          scope: "PROPERTY",
          refId: property._id.toString(),
          type: "DAILY",
          date: dayStart,
        }).select("totalKwh"),
        EnergyAggregate.find({
          scope: "PROPERTY",
          refId: property._id.toString(),
          type: "DAILY",
          year: targetDate.getFullYear(),
          month: targetDate.getMonth() + 1,
        }).select("totalKwh"),
        CostService.calculate("PROPERTY", property._id.toString(), date, date),
        CostService.calculate("PROPERTY", property._id.toString(), monthStartKey, date),
      ]);

    const dailyKwh = dailyAggregate?.totalKwh ?? 0;
    const monthlyKwh = monthlyKwhResult.reduce(
      (sum, item) => sum + (item.totalKwh ?? 0),
      0
    );
    const dailyValue =
      settings.alert_type === "COST" ? dailyCostResult.totalCost : dailyKwh;
    const monthlyValue =
      settings.alert_type === "COST" ? monthlyCostResult.totalCost : monthlyKwh;

    if (
      settings.daily_limit != null &&
      dailyValue > settings.daily_limit &&
      (!settings.last_daily_alert_sent ||
        !isSameDay(new Date(settings.last_daily_alert_sent), targetDate))
    ) {
      await sendLimitExceededEmail(user.email, `daily ${settings.alert_type}`, dailyValue);
      settings.last_daily_alert_sent = targetDate;
    }

    if (
      settings.monthly_limit != null &&
      monthlyValue > settings.monthly_limit &&
      (!settings.last_monthly_alert_sent ||
        !isSameMonth(new Date(settings.last_monthly_alert_sent), targetDate))
    ) {
      await sendLimitExceededEmail(user.email, `monthly ${settings.alert_type}`, monthlyValue);
      settings.last_monthly_alert_sent = targetDate;
    }

    await settings.save();
  }
}
