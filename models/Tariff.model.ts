import mongoose, { Schema, models } from "mongoose";

const TariffSchema = new Schema(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    tariffType: {
      type: String,
      enum: ["FLAT", "SLAB"],
      required: true,
    },
    slabs: [
      {
        uptoKwh: { type: Number },
        pricePerUnit: { type: Number, required: true },
      },
    ],
    effectiveFrom: { type: Date, required: true },
  },
  { timestamps: true }
);

export default models.Tariff || mongoose.model("Tariff", TariffSchema);
