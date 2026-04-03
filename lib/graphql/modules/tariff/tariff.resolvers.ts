import { GraphQLContext } from "../../context";
import { TariffService } from "./tariff.service";

type ActiveTariffArgs = {
  propertyId: string;
  date: string;
};

type CreateTariffArgs = {
  propertyId: string;
  tariffType: "FLAT" | "SLAB";
  slabs: { uptoKwh?: number; pricePerUnit: number }[];
  effectiveFrom: string;
};

export const tariffResolvers = {
  Query: {
    activeTariff: (_: unknown, args: ActiveTariffArgs, context: GraphQLContext) =>
      TariffService.active(args.propertyId, args.date, context.userId),
  },

  Mutation: {
    createTariff: (_: unknown, args: CreateTariffArgs, context: GraphQLContext) =>
      TariffService.create(
        args.propertyId,
        args.tariffType,
        args.slabs,
        args.effectiveFrom,
        context.userId
      ),
  },
};
