import mongoose, { Schema, models } from "mongoose";

const EnergyReadingSchema = new Schema(
  {
    equipmentId: {
      type: Schema.Types.ObjectId,
      ref: "Equipment",
      required: true,
    },
    timestamp: { type: Date, required: true },
    powerWatt: { type: Number, required: true },
  },
  { timestamps: false }
);

export default (
  models.EnergyReading ||
  mongoose.model("EnergyReading", EnergyReadingSchema)
);
