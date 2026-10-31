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

  // Real Channel3 search — https://api.trychannel3.com/v1 (x-api-key header).
  // Real products: title, price + currency, merchant brand, buyable offer URL,
  // and product imagery. Only buyable items (with an offer) are returned.
  type C3Offer = { url?: string; domain?: string; price?: { price?: number; currency?: string }; availability?: string };
  type C3Product = {
    id?: string; title?: string;
    brands?: { name?: string }[];
    images?: { url?: string; cleaned_url?: string; is_main_image?: boolean }[];
    category?: { slug?: string };
    offers?: C3Offer[];
  };
  const res = await fetch("https://api.trychannel3.com/v1/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key },
    body: JSON.stringify({ query, limit: 8 }),
  });
  if (!res.ok) throw new Error(`Channel3 search failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { products?: C3Product[] };
  const items: Product[] = (data.products ?? [])
    .map((p, i): Product | null => {
      const offer = p.offers?.find((o) => o.price?.price != null) ?? p.offers?.[0];
      if (!offer?.price?.price) return null; // skip non-buyable items
      const img = p.images?.find((im) => im.is_main_image) ?? p.images?.[0];
      return {
        id: String(p.id ?? i),
        title: String(p.title ?? "Untitled"),
        priceCents: Math.round(Number(offer.price.price) * 100),
        category: String(p.category?.slug ?? "general"),
        merchant: String(p.brands?.[0]?.name ?? offer.domain ?? "unknown"),
        url: String(offer.url ?? "#"),
        image: img?.cleaned_url ?? img?.url,
      };
    })
    .filter((p): p is Product => p !== null);
  return maxPriceCents === undefined ? items : items.filter((p) => p.priceCents <= maxPriceCents);
}
