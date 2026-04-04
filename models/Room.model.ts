import mongoose, { Schema, models } from "mongoose";

const RoomSchema = new Schema(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    roomName: { type: String, required: true, trim: true },
    roomType: { type: String },
  },
  { timestamps: true }
);

export default models.Room || mongoose.model("Room", RoomSchema);
