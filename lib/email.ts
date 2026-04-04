export async function sendLimitExceededEmail(
  email: string,
  type: string,
  currentValue: number
) {
  console.warn(
    "Billing alert email skipped because email delivery is not configured.",
    {
      email,
      type,
      currentValue,
    }
  );
}
