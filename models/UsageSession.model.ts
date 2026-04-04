import mongoose, { Schema, models } from "mongoose";

const UsageSessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    equipmentId: {
      type: Schema.Types.ObjectId,
      ref: "Equipment",
      required: true,
      index: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
    equipmentName: {
      type: String,
      required: true,
      trim: true,
    },
    startedAt: {
      type: Date,
      required: true,
      index: true,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    durationHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    effectiveWatt: {
      type: Number,
      required: true,
      min: 0,
    },
    energyKwh: {
      type: Number,
      default: 0,
      min: 0,
    },
    cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isManuallyEdited: {
      type: Boolean,
      default: false,
    },
    sessionDate: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

UsageSessionSchema.index(
  { equipmentId: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

export default (
  models.UsageSession ||
  mongoose.model("UsageSession", UsageSessionSchema)
);
