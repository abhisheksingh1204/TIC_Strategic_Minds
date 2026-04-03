import mongoose, { Schema, models } from "mongoose";

const EquipmentSchema = new Schema(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    catalogId: {
      type: Schema.Types.ObjectId,
      ref: "EquipmentCatalog",
      required: true,
    },
    ratedPowerWatt: { type: Number, required: true },
    hoursPerDay: { type: Number, default: 4 },
    isOn: { type: Boolean, default: false },
    quantity: { type: Number, default: 1 },
    efficiencyFactor: { type: Number, default: 1 },
    mode: {
      type: String,
      enum: ["MANUAL", "AUTOMATED"],
      default: "MANUAL",
    },
  },
  { timestamps: true }
);

export default models.Equipment || mongoose.model("Equipment", EquipmentSchema);
