import { GraphQLError } from "graphql";
import User from "@/models/User.model";
import { sendSupportRequestEmail } from "@/lib/email";

export class SupportService {
  static async sendSupportEmail(
    userId: string | undefined,
    subject: string,
    message: string
  ) {
    if (!userId) {
      throw new GraphQLError("Unauthorized");
    }

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedSubject) {
      throw new GraphQLError("Subject is required");
    }

    if (!trimmedMessage) {
      throw new GraphQLError("Message is required");
    }

    const user = await User.findById(userId).select("name email");
    if (!user?.email) {
      throw new GraphQLError("User email not found");
    }

    await sendSupportRequestEmail({
      fromName: user.name?.trim() || "PowerFusion User",
      fromEmail: user.email,
      subject: trimmedSubject,
      message: trimmedMessage,
    });

    return true;
  }
}
