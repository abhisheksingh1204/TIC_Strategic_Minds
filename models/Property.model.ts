import mongoose, { Schema, models } from "mongoose";

const PropertySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    propertyType: {
      type: String,
      enum: ["HOUSE", "APARTMENT"],
      required: true,
    },
    propertyName: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export default models.Property || mongoose.model("Property", PropertySchema);
