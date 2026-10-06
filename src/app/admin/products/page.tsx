import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { StockStatus } from "@/components/product/stock-status";
import { listAdminProducts } from "@/lib/admin-products";
import { formatPrice } from "@/lib/catalog";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Products · Admin", robots: { index: false } };

export default async function AdminProductsPage() {
  await requireAdmin();
  const products = await listAdminProducts();

  return (
    <>
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-eyebrow mb-2 lg:hidden">Admin</p>
          <h1 className="font-display text-3xl md:text-4xl">Products</h1>
          <p className="mt-3 text-xs text-muted-foreground">{products.length} in the catalog</p>
        </div>
        <Link href="/admin/products/new" className="btn btn-primary btn-sm">
          New product
        </Link>
      </header>

      {products.length === 0 ? (
        <p className="border-t pt-8 text-sm text-muted-foreground">No products yet.</p>
      ) : (
        <ul className="border-t">
          {products.map((p) => (
            <li key={p.id} className="border-b">
              <Link
                href={`/admin/products/${p.id}/edit`}
                className="group grid grid-cols-[3.5rem_1fr] items-center gap-4 py-4 sm:grid-cols-[3.5rem_1fr_7rem_9rem] sm:gap-6"
              >
                <Image src={p.image} alt="" width={56} height={72} className="aspect-[7/9] w-14 object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-sm group-hover:underline">{p.name}</p>
                  <p className="truncate text-2xs text-muted-foreground">
                    {p.category} · /{p.slug}
                  </p>
                </div>
                <p className="col-start-2 text-sm sm:col-start-auto sm:text-right">{formatPrice(p.priceCents)}</p>
                <div className="col-start-2 sm:col-start-auto">
                  <StockStatus stock={p.stock} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
