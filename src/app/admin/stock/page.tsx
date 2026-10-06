import type { Metadata } from "next";

import { StockForms } from "@/components/admin/stock-form";
import { StockStatus } from "@/components/product/stock-status";
import { listAdminProducts } from "@/lib/admin-products";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Stock · Admin", robots: { index: false } };

export default async function AdminStockPage() {
  await requireAdmin();
  // Lowest stock first, so what needs restocking is at the top.
  const products = (await listAdminProducts()).sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name));

  return (
    <>
      <header className="mb-10">
        <p className="text-eyebrow mb-2 lg:hidden">Admin</p>
        <h1 className="font-display text-3xl md:text-4xl">Stock</h1>
        <p className="mt-3 max-w-prose text-xs text-muted-foreground">
          Units available to buy now. Items held by shoppers in checkout are already taken out, so prefer “Change by”
          when restocking — it won&apos;t overwrite a hold that lands at the same moment.
        </p>
      </header>

      {products.length === 0 ? (
        <p className="border-t pt-8 text-sm text-muted-foreground">No products yet.</p>
      ) : (
        <ul className="border-t">
          {products.map((p) => (
            <li key={p.id} className="grid gap-4 border-b py-5 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10">
              <div className="min-w-0">
                <p className="truncate text-sm">{p.name}</p>
                <div className="mt-1 flex items-center gap-3 text-2xs text-muted-foreground">
                  <span className="tabular-nums text-foreground">{p.stock}</span>
                  <StockStatus stock={p.stock} />
                </div>
              </div>
              <StockForms id={p.id} name={p.name} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
