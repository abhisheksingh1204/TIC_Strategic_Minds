import mongoose, { Schema, models } from "mongoose";

const UserBillingSettingsSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    property_id: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
    daily_limit: {
      type: Number,
      default: null,
    },
    monthly_limit: {
      type: Number,
      default: null,
    },
    alert_type: {
      type: String,
      enum: ["COST", "KWH"],
      default: "KWH",
      required: true,
    },
    last_daily_alert_sent: {
      type: Date,
      default: null,
    },
    last_monthly_alert_sent: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

UserBillingSettingsSchema.index(
  { user_id: 1, property_id: 1 },
  { unique: true }
);

export default (
  models.UserBillingSettings ||
  mongoose.model("UserBillingSettings", UserBillingSettingsSchema)
);
