import nodemailer from "nodemailer";

type BillingAlertEmailInput = {
  to: string;
  propertyName?: string | null;
  alertType: "COST" | "KWH";
  limitScope: "daily" | "monthly";
  currentValue: number;
  limitValue: number;
};

type SupportRequestEmailInput = {
  fromName: string;
  fromEmail: string;
  subject: string;
  message: string;
};

const smtpUser = process.env.SMTP_EMAIL;
const smtpPass = process.env.SMTP_PASS;
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const smtpSecure =
  process.env.SMTP_SECURE != null
    ? process.env.SMTP_SECURE === "true"
    : smtpPort === 465;
const smtpService = process.env.SMTP_SERVICE;
const smtpFromEmail = process.env.SMTP_FROM_EMAIL ?? smtpUser;
const smtpFromName = process.env.SMTP_FROM_NAME ?? "PowerFusion";
const supportToEmail = process.env.SUPPORT_EMAIL ?? smtpUser;

const assertSmtpConfig = () => {
  if (!smtpUser) {
    throw new Error("SMTP_EMAIL is not configured");
  }

  if (!smtpPass) {
    throw new Error("SMTP_PASS is not configured");
  }

  if (!smtpFromEmail) {
    throw new Error("SMTP_FROM_EMAIL is not configured");
  }
};

const createTransporter = () => {
  assertSmtpConfig();

  if (smtpHost) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort ?? (smtpSecure ? 465 : 587),
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  return nodemailer.createTransport({
    service: smtpService ?? "gmail",
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
};

const transporter = createTransporter();

const formatAlertValue = (alertType: "COST" | "KWH", value: number) =>
  alertType === "COST" ? `Rs.${value.toFixed(2)}` : `${value.toFixed(2)} kWh`;

const getSenderAddress = () => `${smtpFromName} <${smtpFromEmail}>`;

export async function sendBillingLimitExceededEmail({
  to,
  propertyName,
  alertType,
  limitScope,
  currentValue,
  limitValue,
}: BillingAlertEmailInput) {
  const recipient = to.trim();
  if (!recipient) {
    throw new Error("Recipient email is required");
  }

  const propertyLabel = propertyName?.trim() || "your property";
  const formattedCurrentValue = formatAlertValue(alertType, currentValue);
  const formattedLimitValue = formatAlertValue(alertType, limitValue);
  const metricLabel = alertType === "COST" ? "cost" : "usage";
  const scopeLabel = limitScope === "daily" ? "Daily" : "Monthly";

  const info = await transporter.sendMail({
    from: getSenderAddress(),
    to: recipient,
    subject: `${scopeLabel} ${metricLabel} limit exceeded`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827;">
        <h2 style="margin: 0 0 12px; color: #dc2626;">${scopeLabel} limit exceeded</h2>
        <p style="margin: 0 0 10px;">
          ${propertyLabel} has crossed the configured ${metricLabel} threshold.
        </p>
        <p style="margin: 0 0 6px;"><strong>Current ${metricLabel}:</strong> ${formattedCurrentValue}</p>
        <p style="margin: 0 0 16px;"><strong>Configured limit:</strong> ${formattedLimitValue}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
        <p style="margin: 0; font-size: 12px; color: #6b7280;">PowerFusion Smart Energy System</p>
      </div>
    `,
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
  };
}

export async function sendLimitExceededEmail(
  email: string,
  type: string,
  currentValue: number
) {
  const normalizedType = type.toUpperCase();
  const alertType = normalizedType.includes("COST") ? "COST" : "KWH";
  const limitScope = normalizedType.includes("MONTHLY") ? "monthly" : "daily";

  return sendBillingLimitExceededEmail({
    to: email,
    alertType,
    limitScope,
    currentValue,
    limitValue: currentValue,
  });
}

export async function sendSupportRequestEmail({
  fromName,
  fromEmail,
  subject,
  message,
}: SupportRequestEmailInput) {
  if (!supportToEmail) {
    throw new Error("SUPPORT_EMAIL is not configured");
  }

  const info = await transporter.sendMail({
    from: getSenderAddress(),
    to: supportToEmail,
    replyTo: `${fromName} <${fromEmail}>`,
    subject: `[Support] ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827;">
        <h2 style="margin: 0 0 12px; color: #06b6d4;">New Support Request</h2>
        <p style="margin: 0 0 8px;"><strong>Name:</strong> ${fromName}</p>
        <p style="margin: 0 0 16px;"><strong>Email:</strong> ${fromEmail}</p>
        <p style="margin: 0 0 8px;"><strong>Subject:</strong> ${subject}</p>
        <div style="margin-top: 16px; padding: 16px; border-radius: 12px; background: #f3f4f6; white-space: pre-wrap;">${message}</div>
      </div>
    `,
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
  };
}
