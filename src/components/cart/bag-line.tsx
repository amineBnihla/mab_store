"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useId } from "react";

import { removeFromBag, updateBagQuantity, type BagActionState } from "@/app/bag/actions";
import { ChevronDownIcon } from "@/components/icons";
import { Spinner } from "@/components/form-feedback";
import { formatPrice, getStockState } from "@/lib/catalog";
import { MAX_QTY_PER_LINE, type BagLine as BagLineData } from "@/lib/cart-core";
import type { Product } from "@/lib/products";

export function BagLine({ line }: { line: BagLineData<Product> }) {
  const { product, quantity, requested, lineTotalCents, status } = line;
  const [updateState, updateAction, updating] = useActionState<BagActionState, FormData>(updateBagQuantity, {});
  const [removeState, removeAction, removing] = useActionState<BagActionState, FormData>(removeFromBag, {});
  const pending = updating || removing;
  const soldOut = status === "sold-out";
  const href = `/products/${product.slug}`;
  const id = useId();

  const error = removeState.error ?? updateState.error;
  const notice =
    updateState.notice ??
    (status === "reduced"
      ? `You asked for ${requested}, but only ${product.stock} ${product.stock === 1 ? "is" : "are"} left. We've updated your quantity.`
      : undefined);

  return (
    <li
      aria-busy={pending}
      className={`grid grid-cols-[6rem_1fr] gap-x-4 gap-y-4 border-b py-8 transition-opacity sm:grid-cols-[8rem_1fr_auto] sm:gap-x-8 ${
        removing ? "opacity-40" : ""
      }`}
    >
      <Link href={href} tabIndex={-1} aria-hidden className="media-frame aspect-product row-span-2 block sm:row-span-1">
        <Image
          src={product.image}
          alt=""
          fill
          sizes="(min-width: 40rem) 8rem, 6rem"
          className={soldOut ? "opacity-50 grayscale" : undefined}
        />
      </Link>

      {/* Details */}
      <div className="min-w-0 space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm">
            <Link href={href} className="link-quiet">
              {product.name}
            </Link>
          </h3>
          <p className="text-2xs text-muted-foreground">
            {product.category} · {formatPrice(product.priceCents)} each
          </p>
        </div>

        <Availability stock={product.stock} soldOut={soldOut} />

        {notice && !error && (
          <p role="status" className="border border-line-strong px-3 py-2 text-2xs">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="border border-danger px-3 py-2 text-2xs text-danger">
            {error}
          </p>
        )}

        <form action={removeAction}>
          <input type="hidden" name="productId" value={product.id} />
          <button
            type="submit"
            disabled={pending}
            aria-label={`Remove ${product.name} from your bag`}
            className={soldOut ? "btn btn-outline btn-sm" : "link text-2xs disabled:opacity-40"}
          >
            {removing ? "Removing…" : "Remove"}
          </button>
        </form>
      </div>

      {/* Quantity and price: own column from `sm`, below the details on phones. */}
      <div className="col-start-2 flex items-center justify-between gap-4 sm:col-start-3 sm:row-start-1 sm:flex-col sm:items-end sm:justify-start">
        {soldOut ? (
          <p className="text-2xs tracking-eyebrow text-muted-foreground uppercase">Qty: {requested}</p>
        ) : (
          <form action={updateAction} className="flex items-center gap-2">
            <input type="hidden" name="productId" value={product.id} />
            {updating && <Spinner />}
            <label htmlFor={`${id}-qty`} className="sr-only">
              Quantity of {product.name}
            </label>
            <div className="relative">
              <select
                id={`${id}-qty`}
                name="quantity"
                // Remount when the server corrects the quantity so the select shows it.
                key={quantity}
                defaultValue={quantity}
                disabled={pending}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="h-9 cursor-pointer appearance-none border border-line-strong bg-transparent pr-8 pl-3 text-2xs tracking-eyebrow uppercase disabled:opacity-40"
              >
                {Array.from({ length: Math.min(product.stock, MAX_QTY_PER_LINE) }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    Qty: {n}
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                width={12}
                height={12}
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
              />
            </div>
            {/* Without JS the select can't submit itself. */}
            <noscript>
              <button type="submit" className="link text-2xs">
                Update
              </button>
            </noscript>
          </form>
        )}
        <p className={`text-sm ${soldOut ? "text-muted-foreground line-through" : "font-medium"}`}>
          {formatPrice(soldOut ? product.priceCents * requested : lineTotalCents)}
        </p>
      </div>
    </li>
  );
}

function Availability({ stock, soldOut }: { stock: number; soldOut: boolean }) {
  const state = getStockState(stock);

  if (soldOut) {
    return (
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-2xs font-medium tracking-eyebrow uppercase">
          <span aria-hidden className="size-1.5 rounded-full border border-muted-foreground" />
          Sold out
        </p>
        <p className="text-2xs text-muted-foreground">
          This piece is no longer available and isn&apos;t included in your total.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="flex items-center gap-2 text-2xs font-medium tracking-eyebrow uppercase">
        <span aria-hidden className={`size-1.5 rounded-full ${state === "low-stock" ? "bg-danger" : "bg-success"}`} />
        {state === "low-stock" ? `Only ${stock} left` : "Available"}
      </p>
      <p className="text-2xs text-muted-foreground">
        Enjoy complimentary express shipping and returns.
      </p>
    </div>
  );
}
