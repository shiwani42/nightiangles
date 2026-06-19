import type { Product } from "./types";
import productsRaw from "../../scandit-challenge/dataset/products.json";

const products = productsRaw as Product[];

const byBarcode = new Map<string, Product>(
  products.map((p) => [p.product_code, p]),
);

// Pre-computed lower-cased haystack per product for substring search.
const haystack = new Map<string, string>(
  products.map((p) => [
    p.product_code,
    [p.name, p.brand, p.category, p.color, p.size, ...p.tags]
      .join(" ")
      .toLowerCase(),
  ]),
);

export function getProduct(barcode: string): Product | undefined {
  return byBarcode.get(barcode);
}

export function allProducts(): Product[] {
  return products;
}

export function search(query: string, limit = 12): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/);
  const out: Product[] = [];
  for (const p of products) {
    const hs = haystack.get(p.product_code) ?? "";
    if (tokens.every((t) => hs.includes(t))) {
      out.push(p);
      if (out.length >= limit) break;
    }
  }
  return out;
}

export function zonesForCodes(codes: string[]): {
  zone: string;
  zone_name: string;
  count: number;
}[] {
  const counts = new Map<string, { zone_name: string; count: number }>();
  for (const code of codes) {
    const p = byBarcode.get(code);
    if (!p) continue;
    const prev = counts.get(p.zone);
    if (prev) prev.count += 1;
    else counts.set(p.zone, { zone_name: p.zone_name, count: 1 });
  }
  return Array.from(counts, ([zone, { zone_name, count }]) => ({
    zone,
    zone_name,
    count,
  })).sort((a, b) => a.zone.localeCompare(b.zone));
}
