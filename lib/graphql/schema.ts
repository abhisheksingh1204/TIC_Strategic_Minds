// Power-Fusion/lib/graphql/schema.ts

import { makeExecutableSchema } from "@graphql-tools/schema";

import { baseTypeDefs } from "./base.typeDefs";

// AUTH
import { authTypeDefs } from "./modules/auth/auth.typeDefs";
import { authResolvers } from "./modules/auth/auth.resolvers";

// USAGE SESSIONS
import { usageSessionTypeDefs } from "./modules/usageSession/usageSession.typeDefs";
import { usageSessionResolvers } from "./modules/usageSession/usageSession.resolver";

// AGGREGATION
import { aggregationTypeDefs } from "./modules/aggregation/aggregation.typeDefs";
import { aggregationResolvers } from "./modules/aggregation/aggregation.resolvers";

// TARIFF
import { tariffTypeDefs } from "./modules/tariff/tariff.typeDefs";
import { tariffResolvers } from "./modules/tariff/tariff.resolvers";

// COST
import { costTypeDefs } from "./modules/cost/cost.typeDefs";
import { costResolvers } from "./modules/cost/cost.resolvers";

// BILLING
import { billingTypeDefs } from "./modules/billing/billing.typeDefs";
import { billingResolvers } from "./modules/billing/billing.resolvers";

// PROPERTIES
import { propertyTypeDefs } from "./modules/properties/property.typeDefs";
import { propertyResolvers } from "./modules/properties/property.resolvers";

// ROOMS
import { roomTypeDefs } from "./modules/rooms/room.typeDefs";
import { roomResolvers } from "./modules/rooms/room.resolvers";

// EQUIPMENT
import { equipmentTypeDefs } from "./modules/equipment/equipment.typeDefs";
import { equipmentResolvers } from "./modules/equipment/equipment.resolvers";

// SIMULATION
import { simulationTypeDefs } from "./modules/simulation/simulation.typeDefs";
import { simulationResolvers } from "./modules/simulation/simulation.resolver";

// SUPPORT
import { supportTypeDefs } from "./modules/support/support.typeDefs";
import { supportResolvers } from "./modules/support/support.resolvers";

export const schema = makeExecutableSchema({
  typeDefs: [
    baseTypeDefs,
    authTypeDefs,
    propertyTypeDefs,
    roomTypeDefs,
    equipmentTypeDefs,
    simulationTypeDefs,
    supportTypeDefs,
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
    supportResolvers,
    usageSessionResolvers,
    aggregationResolvers,
    tariffResolvers,
    costResolvers,
    billingResolvers,
  ],
});
