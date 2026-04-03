import mongoose, { Schema, models } from "mongoose";

const EquipmentCatalogSchema = new Schema(
  {
    equipmentName: { type: String, required: true },
    category: { type: String, required: true },
    defaultPowerWatt: { type: Number, required: true },
  },
  { timestamps: true }
);

export default (
  models.EquipmentCatalog ||
  mongoose.model("EquipmentCatalog", EquipmentCatalogSchema)
);
