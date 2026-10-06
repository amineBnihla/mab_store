import type { OrderStatus } from "@/lib/order-core";

const labels: Record<OrderStatus, string> = {
  pending: "Awaiting payment",
  processing: "Payment processing",
  paid: "Confirmed",
  expired: "Checkout expired",
  failed: "Payment failed",
  canceled: "Canceled",
};

const dots: Record<OrderStatus, string> = {
  pending: "border border-muted-foreground",
  processing: "border border-muted-foreground",
  paid: "bg-success",
  expired: "border border-muted-foreground",
  failed: "bg-danger",
  canceled: "border border-muted-foreground",
};

export function OrderStatusLabel({ status }: { status: OrderStatus }) {
  return (
    <span className="inline-flex items-center gap-2 text-2xs font-medium tracking-eyebrow uppercase">
      <span aria-hidden className={`size-1.5 rounded-full ${dots[status]}`} />
      {labels[status]}
    </span>
  );
}
