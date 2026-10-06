import { notFound, redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { writeBag } from "@/lib/cart";
import { getOrderForSession } from "@/lib/orders";
import { requireUser } from "@/lib/session";

/**
 * Stripe's success_url. Read-only: a browser redirect never confirms payment,
 * only the webhook does. Stripe sends customers here once they've submitted
 * payment, so the bag is cleared and the order page waits for the webhook if
 * it hasn't landed yet.
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id") ?? "";
  const { user } = await requireUser(`/checkout/return?session_id=${encodeURIComponent(sessionId)}`);

  // Only the user's own orders: a session id from someone else is a 404.
  const order = sessionId.startsWith("cs_") ? await getOrderForSession(user.id, sessionId) : undefined;
  if (!order) notFound();

  // Expired, failed or canceled: the stock is back, send them to their bag.
  if (order.status !== "pending" && order.status !== "processing" && order.status !== "paid") {
    redirect(`/bag?checkout=${order.status}`);
  }

  await writeBag([]);
  redirect(`/account/orders/${order.id}?placed=1`);
}
