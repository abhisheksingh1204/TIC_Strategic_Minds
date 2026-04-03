import mongoose, { Schema, Document, Types, models } from "mongoose";

export interface IBill extends Document {
  property_id: Types.ObjectId;
  tariff_id: Types.ObjectId;
  period_start: Date;
  period_end: Date;
  total_kwh: number;
  total_amount: number;
  created_at: Date;
}

const BillSchema: Schema = new Schema(
  {
    property_id: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },

    tariff_id: {
      type: Schema.Types.ObjectId,
      ref: "Tariff",
      required: true,
    },

    period_start: {
      type: Date,
      required: true,
      index: true,
    },

    period_end: {
      type: Date,
      required: true,
    },

    total_kwh: {
      type: Number,
      required: true,
    },

    total_amount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

export default models.Bill || mongoose.model<IBill>("Bill", BillSchema);
