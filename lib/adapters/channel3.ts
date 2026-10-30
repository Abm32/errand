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
  // gardening
  { id: "m1", title: "Ergonomic Garden Kneeler & Seat", priceCents: 2899, category: "gardening", merchant: "GreenThumb", url: "https://example.com/p/m1" },
  { id: "m2", title: "Heirloom Herb Seed Collection (12 pack)", priceCents: 1799, category: "gardening", merchant: "SeedVault", url: "https://example.com/p/m2" },
  { id: "m3", title: "Hand-Forged Copper Trowel", priceCents: 3400, category: "gardening", merchant: "GreenThumb", url: "https://example.com/p/m3" },
  { id: "m5", title: "Self-Watering Ceramic Planter", priceCents: 4200, category: "gardening", merchant: "PotShop", url: "https://example.com/p/m5" },
  // books
  { id: "m4", title: "The Well-Tempered Garden (book)", priceCents: 1600, category: "books", merchant: "PageTurner", url: "https://example.com/p/m4" },
  { id: "m6", title: "Cooking for One — Cookbook", priceCents: 2200, category: "books", merchant: "PageTurner", url: "https://example.com/p/m6" },
  // electronics (used to demonstrate an allowlist denial)
  { id: "m7", title: "Wireless Noise-Cancelling Headphones", priceCents: 8900, category: "electronics", merchant: "SoundHub", url: "https://example.com/p/m7" },
  { id: "m8", title: "Smart LED Desk Lamp", priceCents: 3200, category: "electronics", merchant: "SoundHub", url: "https://example.com/p/m8" },
  // kitchen
  { id: "m9", title: "Pour-Over Coffee Set", priceCents: 3800, category: "kitchen", merchant: "BrewCo", url: "https://example.com/p/m9" },
  { id: "m10", title: "Cast-Iron Skillet 10in", priceCents: 2600, category: "kitchen", merchant: "BrewCo", url: "https://example.com/p/m10" },
  // toys
  { id: "m11", title: "Wooden Building Blocks (100 pc)", priceCents: 2400, category: "toys", merchant: "PlayWorks", url: "https://example.com/p/m11" },
  // fashion
  { id: "m12", title: "Merino Wool Scarf", priceCents: 4500, category: "fashion", merchant: "Knitwell", url: "https://example.com/p/m12" },
];

export async function searchProducts(query: string, maxPriceCents?: number): Promise<Product[]> {
  const key = process.env.CHANNEL3_API_KEY;
  if (!key) {
    // Token-based match so a full-sentence goal ("gift for mom who loves
    // gardening") still hits "gardening" products. Stopwords are ignored.
    const stop = new Set(["the", "a", "an", "for", "my", "who", "and", "under", "around", "with", "to", "of", "find", "buy", "me", "some", "nice", "cheap", "gift", "that", "loves", "is"]);
    const tokens = query.toLowerCase().match(/[a-z]+/g)?.filter((t) => t.length > 2 && !stop.has(t)) ?? [];
    const hay = (p: Product) => `${p.title} ${p.category} ${p.merchant}`.toLowerCase();
    let matches = MOCK.filter((p) => tokens.length === 0 || tokens.some((t) => hay(p).includes(t)));
    if (matches.length === 0) matches = MOCK; // never dead-end a demo
    return matches.filter((p) => maxPriceCents === undefined || p.priceCents <= maxPriceCents);
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
