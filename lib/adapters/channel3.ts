// Channel3 product search adapter (100M+ product catalog).
// Falls back to a small deterministic mock catalog when CHANNEL3_API_KEY is
// absent, so the agent runs end-to-end with zero keys for local demos.

export type Product = {
  id: string;
  title: string;
  priceCents: number;
  category: string;
  merchant: string;
  url: string;
  image?: string;
};

const MOCK: Product[] = [
  { id: "m1", title: "Ergonomic Garden Kneeler & Seat", priceCents: 2899, category: "gardening", merchant: "GreenThumb", url: "https://example.com/p/m1" },
  { id: "m2", title: "Heirloom Herb Seed Collection (12 pack)", priceCents: 1799, category: "gardening", merchant: "SeedVault", url: "https://example.com/p/m2" },
  { id: "m3", title: "Hand-Forged Copper Trowel", priceCents: 3400, category: "gardening", merchant: "GreenThumb", url: "https://example.com/p/m3" },
  { id: "m4", title: "The Well-Tempered Garden (book)", priceCents: 1600, category: "books", merchant: "PageTurner", url: "https://example.com/p/m4" },
  { id: "m5", title: "Self-Watering Ceramic Planter", priceCents: 4200, category: "gardening", merchant: "PotShop", url: "https://example.com/p/m5" },
];

export async function searchProducts(query: string, maxPriceCents?: number): Promise<Product[]> {
  const key = process.env.CHANNEL3_API_KEY;
  if (!key) {
    const q = query.toLowerCase();
    return MOCK.filter(
      (p) =>
        (q === "" ||
          p.title.toLowerCase().includes(q) ||
          p.category.includes(q)) &&
        (maxPriceCents === undefined || p.priceCents <= maxPriceCents),
    );
  }

  // Real Channel3 search. Endpoint shape per Channel3 docs; adjust field names
  // to the live schema when wiring the key.
  const res = await fetch("https://api.channel3.com/v1/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query, limit: 8 }),
  });
  if (!res.ok) throw new Error(`Channel3 search failed: ${res.status}`);
  const data = await res.json();
  const items: Product[] = (data.products ?? data.results ?? []).map((p: Record<string, unknown>, i: number) => ({
    id: String(p.id ?? i),
    title: String(p.title ?? p.name ?? "Untitled"),
    priceCents: Math.round(Number(p.price ?? 0) * 100),
    category: String(p.category ?? "general"),
    merchant: String(p.merchant ?? p.brand ?? "unknown"),
    url: String(p.url ?? p.link ?? "#"),
    image: p.image ? String(p.image) : undefined,
  }));
  return maxPriceCents === undefined ? items : items.filter((p) => p.priceCents <= maxPriceCents);
}
