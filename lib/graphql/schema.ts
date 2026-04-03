

import { makeExecutableSchema } from "@graphql-tools/schema";

import { baseTypeDefs } from "./base.typeDefs";


import { authTypeDefs } from "./modules/auth/auth.typeDefs";
import { authResolvers } from "./modules/auth/auth.resolvers";



export const schema = makeExecutableSchema({
  typeDefs: [
    baseTypeDefs,
    authTypeDefs,
    
  ],
  resolvers: [
    authResolvers,
  ],
});
