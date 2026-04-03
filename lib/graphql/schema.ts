// Power-Fusion/lib/graphql/schema.ts

import { makeExecutableSchema } from "@graphql-tools/schema";

import { baseTypeDefs } from "./base.typeDefs";

// AUTH
import { authTypeDefs } from "./modules/auth/auth.typeDefs";
import { authResolvers } from "./modules/auth/auth.resolvers";

// PROPERTIES
import { propertyTypeDefs } from "./modules/properties/property.typeDefs";
import { propertyResolvers } from "./modules/properties/property.resolvers";



export const schema = makeExecutableSchema({
  typeDefs: [
    baseTypeDefs,
    authTypeDefs,
    propertyTypeDefs
    
  ],
  resolvers: [
    authResolvers,
    propertyResolvers
  ],
});
