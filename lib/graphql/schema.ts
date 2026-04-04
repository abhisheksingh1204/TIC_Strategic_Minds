import { makeExecutableSchema } from "@graphql-tools/schema";

import { baseTypeDefs } from "./base.typeDefs";

import { authTypeDefs } from "./modules/auth/auth.typeDefs";
import { authResolvers } from "./modules/auth/auth.resolvers";

import { usageSessionTypeDefs } from "./modules/usageSession/usageSession.typeDefs";
import { usageSessionResolvers } from "./modules/usageSession/usageSession.resolver";

import { aggregationTypeDefs } from "./modules/aggregation/aggregation.typeDefs";
import { aggregationResolvers } from "./modules/aggregation/aggregation.resolvers";

import { tariffTypeDefs } from "./modules/tariff/tariff.typeDefs";
import { tariffResolvers } from "./modules/tariff/tariff.resolvers";

import { costTypeDefs } from "./modules/cost/cost.typeDefs";
import { costResolvers } from "./modules/cost/cost.resolvers";

import { billingTypeDefs } from "./modules/billing/billing.typeDefs";
import { billingResolvers } from "./modules/billing/billing.resolvers";

import { propertyTypeDefs } from "./modules/properties/property.typeDefs";
import { propertyResolvers } from "./modules/properties/property.resolvers";

import { roomTypeDefs } from "./modules/rooms/room.typeDefs";
import { roomResolvers } from "./modules/rooms/room.resolvers";

import { equipmentTypeDefs } from "./modules/equipment/equipment.typeDefs";
import { equipmentResolvers } from "./modules/equipment/equipment.resolvers";

import { simulationTypeDefs } from "./modules/simulation/simulation.typeDefs";
import { simulationResolvers } from "./modules/simulation/simulation.resolver";

export const schema = makeExecutableSchema({
  typeDefs: [
    baseTypeDefs,
    authTypeDefs,
    propertyTypeDefs,
    roomTypeDefs,
    equipmentTypeDefs,
    simulationTypeDefs,
    usageSessionTypeDefs,
    aggregationTypeDefs,
    tariffTypeDefs,
    costTypeDefs,
    billingTypeDefs,
  ],
  resolvers: [
    authResolvers,
    propertyResolvers,
    roomResolvers,
    equipmentResolvers,
    simulationResolvers,
    usageSessionResolvers,
    aggregationResolvers,
    tariffResolvers,
    costResolvers,
    billingResolvers,
  ],
});
