import { allProducts, compactCatalog, getProduct } from "./catalog";

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as
  | string
  | undefined;

const MODEL = "claude-haiku-4-5-20251001";

export type PlanResult = {
  codes: string[];
  source: "llm" | "heuristic";
  reasoning?: string;
};

export async function planTrip(tripText: string): Promise<PlanResult> {
  if (ANTHROPIC_API_KEY) {
    try {
      return await planWithLLM(tripText);
    } catch (err) {
      console.warn("LLM planner failed, falling back to heuristic:", err);
      const fallback = planHeuristic(tripText);
      return { ...fallback, reasoning: `(LLM error — heuristic fallback used)` };
    }
  }
  return planHeuristic(tripText);
}

async function planWithLLM(tripText: string): Promise<PlanResult> {
  const catalog = compactCatalog();

  const prompt = `You are a gear advisor for a Swiss outdoor retailer. Given a customer's trip description and the available catalog, return a JSON object with two fields:
- "codes": an array of 4-8 product code strings (the "code" field from the catalog) for the gear they need
- "reasoning": one short sentence explaining the selection (e.g. "Cold-weather Alpine hike: insulated jacket, 4-season tent, hiking boots, layered base")

Pick the BEST single variant per product when multiple sizes/colors exist (assume size M for clothing, size 42 for footwear unless the trip text specifies otherwise). Don't pick more than one variant of the same product_id pattern.

Trip:
${tripText}

Catalog:
${JSON.stringify(catalog)}

Respond with ONLY a JSON object, no markdown. Example:
{"codes":["7610000000011","7610000000088"],"reasoning":"3-day winter hike: ..."}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Claude API ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = (json.content?.[0]?.text ?? "").trim();

  // Strip optional ```json fences
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("LLM response did not contain a JSON object");

  const parsed = JSON.parse(match[0]) as {
    codes: unknown;
    reasoning?: unknown;
  };

  if (!Array.isArray(parsed.codes)) throw new Error("`codes` is not an array");

  const codes = parsed.codes
    .filter((c): c is string => typeof c === "string")
    .filter((c) => Boolean(getProduct(c))); // drop any that don't resolve

  if (codes.length === 0)
    throw new Error("LLM returned no valid product codes");

  return {
    codes,
    source: "llm",
    reasoning:
      typeof parsed.reasoning === "string" ? parsed.reasoning : undefined,
  };
}

// Pure-JS fallback. Keyword matching against tags + categories, then a
// per-category pick. Not as good as the LLM but always works, no API key.
function planHeuristic(tripText: string): PlanResult {
  const text = tripText.toLowerCase();

  type Mapping = { categories?: string[]; tags?: string[]; coldHint?: boolean };
  const KEYWORDS: Record<string, Mapping> = {
    winter: { tags: ["winter", "insulated", "4-season", "down"], coldHint: true },
    cold: { tags: ["winter", "insulated", "down"], coldHint: true },
    snow: { tags: ["winter", "4-season"], coldHint: true },
    alpine: { tags: ["4-season", "technical"], coldHint: true },
    alps: { tags: ["4-season", "technical"], coldHint: true },
    "-10": { tags: ["winter", "insulated"], coldHint: true },
    "-20": { tags: ["winter", "insulated", "down"], coldHint: true },

    summer: { tags: ["summer", "lightweight", "breathable", "3-season"] },
    warm: { tags: ["lightweight", "breathable"] },

    rain: { tags: ["waterproof", "gore-tex"] },
    wet: { tags: ["waterproof", "gore-tex"] },

    hike: {
      categories: ["boots", "trail-shoes", "hardshell", "fleece", "base-layer", "backpack"],
    },
    hiking: {
      categories: ["boots", "trail-shoes", "hardshell", "fleece", "base-layer", "backpack"],
    },
    trail: { categories: ["trail-shoes", "backpack", "base-layer"] },
    trek: { categories: ["boots", "backpack", "trekking-poles", "hardshell"] },
    backpacking: {
      categories: ["backpack", "tent", "sleeping-bag", "sleeping-mat", "stove"],
    },
    camp: { categories: ["tent", "sleeping-bag", "sleeping-mat", "stove"] },
    camping: { categories: ["tent", "sleeping-bag", "sleeping-mat", "stove"] },

    multi: { categories: ["tent", "sleeping-bag", "sleeping-mat", "backpack"] },
    overnight: { categories: ["tent", "sleeping-bag", "sleeping-mat"] },
    "3-day": { categories: ["tent", "sleeping-bag", "sleeping-mat", "backpack"] },
    "4-day": { categories: ["tent", "sleeping-bag", "sleeping-mat", "backpack"] },
    "5-day": { categories: ["tent", "sleeping-bag", "sleeping-mat", "backpack"] },
    week: { categories: ["tent", "sleeping-bag", "sleeping-mat", "backpack"] },

    night: { categories: ["headlamp"] },
  };

  const wantedTags = new Set<string>();
  const wantedCategories = new Set<string>();
  let coldHint = false;

  for (const [kw, m] of Object.entries(KEYWORDS)) {
    if (text.includes(kw)) {
      m.tags?.forEach((t) => wantedTags.add(t));
      m.categories?.forEach((c) => wantedCategories.add(c));
      if (m.coldHint) coldHint = true;
    }
  }

  // If we matched nothing, throw in some sensible defaults for an outdoor trip.
  if (wantedCategories.size === 0 && wantedTags.size === 0) {
    ["backpack", "hardshell", "boots"].forEach((c) => wantedCategories.add(c));
  }

  const products = allProducts();
  const scored = products.map((p) => {
    let score = 0;
    if (wantedCategories.has(p.category)) score += 3;
    for (const tag of p.tags) {
      if (wantedTags.has(tag)) score += 1;
    }
    if (coldHint && p.temp_rating_c != null && p.temp_rating_c > 5) score -= 1;
    if (!coldHint && p.temp_rating_c != null && p.temp_rating_c < -10) score -= 1;
    return { p, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // One pick per category, up to 8 items, only items with score > 0.
  const picked = new Set<string>();
  const codes: string[] = [];
  for (const { p, score } of scored) {
    if (score <= 0) break;
    if (picked.has(p.category)) continue;
    codes.push(p.product_code);
    picked.add(p.category);
    if (codes.length >= 8) break;
  }

  const reasoning = `Matched keywords: ${[...wantedTags, ...wantedCategories].join(", ") || "none"}`;
  return { codes, source: "heuristic", reasoning };
}
