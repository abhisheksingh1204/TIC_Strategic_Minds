import mongoose, { Schema, models } from "mongoose";

const EnergyAggregateSchema = new Schema(
  {
    scope: {
      type: String,
      enum: ["PROPERTY", "ROOM", "EQUIPMENT"],
      required: true,
    },
    refId: { type: Schema.Types.ObjectId, required: true },
    type: {
      type: String,
      enum: ["DAILY", "MONTHLY", "YEARLY"],
      required: true,
    },
    year: Number,
    month: Number,
    date: Date,
    totalKwh: { type: Number, required: true },
  },
  { timestamps: true }
);

EnergyAggregateSchema.index({ scope: 1, refId: 1, type: 1, date: 1 });
EnergyAggregateSchema.index({ scope: 1, refId: 1, type: 1, year: 1, month: 1 });

export default (
  models.EnergyAggregate ||
  mongoose.model("EnergyAggregate", EnergyAggregateSchema)
);
