import { AggregationService } from "./aggregation.service";
import EnergyAggregate from "@/models/EnergyAggregate.model";
import { getDayRange } from "@/lib/date";

type DailyAggregateArgs = {
  scope: string;
  refId: string;
  date: string;
};

type MonthlyAggregateArgs = {
  scope: string;
  refId: string;
  month: number;
  year: number;
};

type RangeAggregateArgs = {
  scope: string;
  refId: string;
  from: string;
  to: string;
};

type RecomputeDailyArgs = {
  date: string;
};

export const aggregationResolvers = {
  Query: {
    dailyEnergyAggregate: async (_: unknown, args: DailyAggregateArgs) => {
      const { start } = getDayRange(args.date, args.date);
      return EnergyAggregate.findOne({
        scope: args.scope,
        refId: args.refId,
        type: "DAILY",
        date: start,
      });
    },

    monthlyEnergyAggregate: (_: unknown, args: MonthlyAggregateArgs) =>
      AggregationService.monthly(
        args.scope,
        args.refId,
        args.month,
        args.year
      ),

    rangeEnergyAggregate: (_: unknown, args: RangeAggregateArgs) =>
      AggregationService.range(
        args.scope,
        args.refId,
        args.from,
        args.to
      ),
  },

  Mutation: {
    recomputeDailyAggregate: (_: unknown, args: RecomputeDailyArgs) =>
      AggregationService.recomputeDaily(args.date),
  },
};
