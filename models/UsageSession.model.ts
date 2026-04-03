import mongoose, { Schema, models } from "mongoose";

const UsageSessionSchema = new Schema(
  {
    equipmentId: {
      type: Schema.Types.ObjectId,
      ref: "Equipment",
      required: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    catalogId: {
      type: Schema.Types.ObjectId,
      ref: "EquipmentCatalog",
    },
    equipmentName: { type: String, required: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    durationMinutes: { type: Number },
    energyKwh: { type: Number },
    cost: { type: Number },
  },
  { timestamps: true }
);

export default (
  models.UsageSession ||
  mongoose.model("UsageSession", UsageSessionSchema)
);
