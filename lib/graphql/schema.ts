import { makeExecutableSchema } from "@graphql-tools/schema";

import { baseTypeDefs } from "./base.typeDefs";


import { authTypeDefs } from "./modules/auth/auth.typeDefs";
import { authResolvers } from "./modules/auth/auth.resolvers";

import { tariffTypeDefs } from "./modules/tariff/tariff.typeDefs";
import { tariffResolvers } from "./modules/tariff/tariff.resolvers";

import { costTypeDefs } from "./modules/cost/cost.typeDefs";
import { costResolvers } from "./modules/cost/cost.resolvers";

import { propertyTypeDefs } from "./modules/properties/property.typeDefs";
import { propertyResolvers } from "./modules/properties/property.resolvers";

import { roomTypeDefs } from "./modules/rooms/room.typeDefs";
import { roomResolvers } from "./modules/rooms/room.resolvers";

import { equipmentTypeDefs } from "./modules/equipment/equipment.typeDefs";
import { equipmentResolvers } from "./modules/equipment/equipment.resolvers";




export const schema = makeExecutableSchema({
  typeDefs: [
    baseTypeDefs,
    authTypeDefs,
    tariffTypeDefs,
    costTypeDefs,
    propertyTypeDefs,
    roomTypeDefs,
    equipmentTypeDefs,
    
  ],
  resolvers: [
    authResolvers,
    tariffResolvers,
    costResolvers,
    propertyResolvers,
    roomResolvers,
    equipmentResolvers,
  ],
});
