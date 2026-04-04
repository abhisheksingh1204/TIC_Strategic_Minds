import { sendBillingLimitExceededEmail } from "@/lib/email";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const to = searchParams.get("to") ?? "lavanyabot11@gmail.com";

    const result = await sendBillingLimitExceededEmail({
      to,
      propertyName: "Dream",
      alertType: "COST",
      limitScope: "daily",
      currentValue: 120,
      limitValue: 50,
    });

    return Response.json({ success: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("Test email failed:", message);
    return Response.json({ success: false, error: message });
  }
}
