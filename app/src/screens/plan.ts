import type { Product } from "../types";
import { getProduct } from "../catalog";
import { addToList, clearList } from "../list";
import { planTrip, type PlanResult } from "../ai-planner";
import type { ForecastSummary } from "../weather";

function escapeHTML(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const EXAMPLES = [
  "3-day winter hike near Zermatt, starting Saturday",
  "Weekend camping in Interlaken, mild summer",
  "Overnight bivy near Mont Blanc, lightweight",
  "Day trail run in Davos, looks like rain",
];

function weatherCard(w: ForecastSummary): string {
  const s = w.summary;
  const conditions = s.has_snow
    ? "❄️ snow"
    : s.has_rain
      ? "🌧 rain"
      : "☀️ dry";
  return `
    <div class="weather-card">
      <div class="weather-card__top">
        <div>
          <div class="weather-card__loc">${escapeHTML(w.location.name)}${w.location.country ? `, ${escapeHTML(w.location.country)}` : ""}</div>
          <div class="weather-card__when">${escapeHTML(w.daily[0].date)} → ${escapeHTML(w.daily[w.daily.length - 1].date)}${w.location.elevation_m ? ` · ${Math.round(w.location.elevation_m)} m` : ""}</div>
        </div>
        <div class="weather-card__temp">${s.min_c}° / ${s.max_c}°C</div>
      </div>
      <div class="weather-card__stats">
        <span>${conditions}</span>
        <span>💧 ${s.total_precip_mm} mm</span>
        ${s.total_snow_cm > 0 ? `<span>🌨 ${s.total_snow_cm} cm</span>` : ""}
        <span>💨 ${s.max_wind_kmh} km/h</span>
        <span>☀️ ${s.short_daylight_h}h daylight</span>
      </div>
    </div>
  `;
}

export function renderPlan(root: HTMLElement) {
  root.innerHTML = `
    <header>
      <h1>Plan my trip</h1>
      <p class="tag">Tell us where you're going. We'll check the weather and suggest gear.</p>
    </header>
    <main class="screen-plan">
      <textarea id="plan-input" rows="3" placeholder="${escapeHTML(EXAMPLES[0])}"></textarea>
      <ul class="examples">
        ${EXAMPLES.map(
          (ex) =>
            `<li><button class="example-btn" data-text="${escapeHTML(ex)}">${escapeHTML(ex)}</button></li>`,
        ).join("")}
      </ul>
      <button id="generate" class="primary">Generate gear list</button>
      <div id="progress" class="progress" hidden></div>
      <div id="weather"></div>
      <div id="result"></div>
      <a class="link-btn" href="?screen=list">← Build a list manually</a>
    </main>
  `;

  const input = root.querySelector("#plan-input") as HTMLTextAreaElement;
  const generateBtn = root.querySelector("#generate") as HTMLButtonElement;
  const progressEl = root.querySelector("#progress") as HTMLDivElement;
  const weatherEl = root.querySelector("#weather") as HTMLDivElement;
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
      resultEl.innerHTML = `<div class="status">No matches. Try more detail (location, days, season).</div>`;
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
    const originalLabel = generateBtn.textContent;
    generateBtn.textContent = "Thinking…";
    weatherEl.innerHTML = "";
    resultEl.innerHTML = "";
    progressEl.hidden = false;
    progressEl.textContent = "Asking the AI…";

    try {
      const result = await planTrip(tripText, (msg, w) => {
        progressEl.textContent = msg;
        if (w) weatherEl.innerHTML = weatherCard(w);
      });
      progressEl.hidden = true;
      if (result.weather && weatherEl.innerHTML === "") {
        weatherEl.innerHTML = weatherCard(result.weather);
      }
      const products = result.codes
        .map((code) => getProduct(code))
        .filter((p): p is Product => Boolean(p));
      renderResult(result, products);
    } catch (err) {
      progressEl.hidden = true;
      resultEl.innerHTML = `<div class="status">Error: ${escapeHTML((err as Error).message)}</div>`;
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = originalLabel;
    }
  });
}
