import { redirect } from "next/navigation";

import { cancelOpenCheckouts } from "@/lib/orders";
import { requireUser } from "@/lib/session";

/**
 * Stripe's cancel_url: the customer left the payment page. Expires their open
 * session at Stripe and puts the held stock back, so the bag shows it as
 * available again. Never touches payment outcomes: a session that completed
 * meanwhile is left for its webhook.
 */
export async function GET() {
  const { user } = await requireUser("/bag");
  try {
    await cancelOpenCheckouts(user.id);
  } catch (error) {
    // The hold still lapses when the session expires; the bag credits it back meanwhile.
    console.error("checkout-cancel failed", error);
  }
  redirect("/bag?checkout=canceled");
}
