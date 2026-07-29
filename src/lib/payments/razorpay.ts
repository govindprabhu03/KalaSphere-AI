/**
 * Razorpay config guard. Paid events stay disabled until real keys are present,
 * so free events work now and paid checkout lights up the moment keys are added
 * (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in .env.local).
 */
export function isRazorpayConfigured(): boolean {
  const id = process.env.RAZORPAY_KEY_ID ?? "";
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  return (
    id.length > 0 &&
    secret.length > 0 &&
    !id.includes("REPLACE") &&
    !secret.includes("REPLACE")
  );
}
