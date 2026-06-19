import type { Product } from "../types";
import { getProduct } from "../catalog";
import { addToList, clearList } from "../list";
import { planTrip, type PlanResult } from "../ai-planner";

function escapeHTML(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const EXAMPLES = [
  "3-day winter hike in the Swiss Alps, starts March 14",
  "Weekend camping with two kids, mild summer weather",
  "Overnight bivy at -10°C, lightweight only",
  "Trail running half-day, expect rain",
];

export function renderPlan(root: HTMLElement) {
  root.innerHTML = `
    <header>
      <h1>Plan my trip</h1>
      <p class="tag">Tell us where you're going. We'll suggest a gear list.</p>
    </header>
    <main class="screen-plan">
      <textarea id="plan-input" rows="4" placeholder="${escapeHTML(EXAMPLES[0])}"></textarea>
      <ul class="examples">
        ${EXAMPLES.map(
          (ex) => `<li><button class="example-btn" data-text="${escapeHTML(ex)}">${escapeHTML(ex)}</button></li>`,
        ).join("")}
      </ul>
      <button id="generate" class="primary">Generate gear list</button>
      <div id="result"></div>
      <a class="link-btn" href="?screen=list">← Or build a list manually</a>
    </main>
  `;

  const input = root.querySelector("#plan-input") as HTMLTextAreaElement;
  const generateBtn = root.querySelector("#generate") as HTMLButtonElement;
  const resultEl = root.querySelector("#result") as HTMLDivElement;
  const examplesEl = root.querySelector(".examples") as HTMLUListElement;

  examplesEl.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest(
      ".example-btn",
    ) as HTMLButtonElement | null;
    if (!btn) return;
    input.value = btn.dataset.text ?? "";
    input.focus();
  });

  function renderResult(result: PlanResult, products: Product[]) {
    if (products.length === 0) {
      resultEl.innerHTML = `<div class="status">No matches. Try more detail (gear type, weather, days).</div>`;
      return;
    }
    resultEl.innerHTML = `
      <div class="ai-banner">
        <span class="ai-banner__source">${result.source === "llm" ? "AI gear list" : "Keyword match"}</span>
        ${result.reasoning ? `<span class="ai-banner__reason">${escapeHTML(result.reasoning)}</span>` : ""}
      </div>
      <ul class="results" style="max-height:none">
        ${products
          .map(
            (p) => `
          <li class="result">
            <div class="result__meta">
              <div class="result__name">${escapeHTML(p.name)}</div>
              <div class="result__sub">${escapeHTML(p.brand)} · ${escapeHTML(p.color)} · size ${escapeHTML(p.size)}</div>
              <div class="result__row"><strong>CHF ${p.price_chf.toFixed(0)}</strong> · <span class="zone">Zone ${escapeHTML(p.zone)} · ${escapeHTML(p.aisle)}</span></div>
            </div>
          </li>
        `,
          )
          .join("")}
      </ul>
      <button id="accept" class="primary">Add ${products.length} item${products.length > 1 ? "s" : ""} to my list</button>
    `;

    const acceptBtn = resultEl.querySelector("#accept") as HTMLButtonElement;
    acceptBtn.addEventListener("click", () => {
      clearList();
      for (const p of products) addToList(p.product_code);
      const url = new URL(window.location.href);
      url.searchParams.set("screen", "list");
      window.location.href = url.toString();
    });
  }

  generateBtn.addEventListener("click", async () => {
    const tripText = input.value.trim();
    if (!tripText) {
      input.focus();
      return;
    }
    generateBtn.disabled = true;
    const originalText = generateBtn.textContent;
    generateBtn.textContent = "Thinking…";
    resultEl.innerHTML = `<div class="status">Generating your list…</div>`;

    try {
      const result = await planTrip(tripText);
      const products = result.codes
        .map((code) => getProduct(code))
        .filter((p): p is Product => Boolean(p));
      renderResult(result, products);
    } catch (err) {
      resultEl.innerHTML = `<div class="status">Error: ${escapeHTML((err as Error).message)}</div>`;
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = originalText;
    }
  });
}
