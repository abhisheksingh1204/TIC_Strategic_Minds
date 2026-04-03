import { CostService } from "./cost.service";

type CalculateCostArgs = {
  scope: "PROPERTY" | "ROOM" | "EQUIPMENT";
  refId: string;
  from: string;
  to: string;
};

type CalculateCostWithTariffArgs = CalculateCostArgs & {
  tariffType: "FLAT" | "SLAB";
  flatPricePerUnit?: number;
};

export const costResolvers = {
  Mutation: {
    calculateCost: (_parent: unknown, args: CalculateCostArgs) =>
      CostService.calculate(
        args.scope,
        args.refId,
        args.from,
        args.to
      ),
    calculateCostWithTariff: (_parent: unknown, args: CalculateCostWithTariffArgs) =>
      CostService.calculateWithTariff(
        args.scope,
        args.refId,
        args.from,
        args.to,
        args.tariffType,
        args.flatPricePerUnit
      ),
  },
};
