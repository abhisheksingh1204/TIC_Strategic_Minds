import { GraphQLError } from "graphql";
import Tariff from "@/models/Tariff.model";
import Property from "@/models/Property.model";

export class TariffService {
  private static async assertPropertyOwnership(
    propertyId: string,
    userId?: string | null
  ) {
    if (!userId) {
      throw new GraphQLError("Unauthorized");
    }

    const property = await Property.findOne({
      _id: propertyId,
      userId,
    }).select("_id");

    if (!property) {
      throw new GraphQLError("Invalid property");
    }
  }

  static async create(
    propertyId: string,
    tariffType: "FLAT" | "SLAB",
    slabs: { uptoKwh?: number; pricePerUnit: number }[],
    effectiveFrom: string,
    userId?: string | null
  ) {
    await TariffService.assertPropertyOwnership(propertyId, userId);

    if (tariffType === "FLAT" && slabs.length !== 1) {
      throw new Error("FLAT tariff must have exactly one slab");
    }

    await Tariff.findOneAndUpdate(
      {
        propertyId,
        effectiveFrom: new Date(effectiveFrom),
      },
      {
        propertyId,
        tariffType,
        slabs,
        effectiveFrom: new Date(effectiveFrom),
      },
      {
        new: true,
        upsert: true,
      }
    );

    return true;
  }

  static async active(propertyId: string, date: string, userId?: string | null) {
    await TariffService.assertPropertyOwnership(propertyId, userId);

    return Tariff.findOne({
      propertyId,
      effectiveFrom: { $lte: new Date(date) },
    }).sort({ effectiveFrom: -1 });
  }
}
