import mongoose, { Schema, Document, Types, models } from "mongoose";

export interface IBillLineItem extends Document {
  bill_id: Types.ObjectId;
  equipment_id: Types.ObjectId;
  kwh: number;
  amount: number;
}

const BillLineItemSchema: Schema = new Schema(
  {
    bill_id: {
      type: Schema.Types.ObjectId,
      ref: "Bill",
      required: true,
      index: true,
    },

    equipment_id: {
      type: Schema.Types.ObjectId,
      ref: "Equipment",
      required: true,
      index: true,
    },

    kwh: {
      type: Number,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

export default (
  models.BillLineItem ||
  mongoose.model<IBillLineItem>("BillLineItem", BillLineItemSchema)
);
