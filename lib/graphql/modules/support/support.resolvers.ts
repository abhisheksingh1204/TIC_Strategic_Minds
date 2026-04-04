import { GraphQLContext } from "../../context";
import { SupportService } from "./support.service";

export const supportResolvers = {
  Mutation: {
    sendSupportEmail: (
      _parent: unknown,
      args: { subject: string; message: string },
      context: GraphQLContext
    ) => SupportService.sendSupportEmail(context.userId, args.subject, args.message),
  },
};
