import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendLimitExceededEmail(
  email: string,
  type: string,
  currentValue: number
) {
  try {
    await resend.emails.send({
      from: "PowerFusion <lavanyabot11@gmail.com>",
      to: email,
      subject: "Electricity Limit Exceeded",
      html: `
        <h2>Alert: Limit Exceeded</h2>
        <p>Your ${type} usage has exceeded your set limit.</p>
        <p><b>Current Usage:</b> ${currentValue.toFixed(2)}</p>
      `,
    });
  } catch (err) {
    console.error("Email failed:", err);
  }
}
