import { getStockState, type StockState } from "@/lib/catalog";

const dotClass: Record<StockState, string> = {
  "in-stock": "bg-success",
  "low-stock": "bg-danger",
  "out-of-stock": "border border-muted-foreground",
};

export function StockStatus({ stock }: { stock: number }) {
  const state = getStockState(stock);
  const label =
    state === "out-of-stock" ? "Out of stock" : state === "low-stock" ? `Only ${stock} left` : "In stock";

  return (
    <p className="flex items-center gap-2 text-xs">
      <span aria-hidden className={`size-1.5 rounded-full ${dotClass[state]}`} />
      <span className={state === "out-of-stock" ? "text-muted-foreground" : undefined}>{label}</span>
    </p>
  );
}
