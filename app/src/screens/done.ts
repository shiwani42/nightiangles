import type { Product } from "../types";
import { getProduct } from "../catalog";
import { clearList, getList } from "../list";

const FOUND_KEY = "nightiangles.found";

function escapeHTML(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function readFound(): Set<string> {
  try {
    const raw = sessionStorage.getItem(FOUND_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function row(p: Product, found: boolean): string {
  return `
    <li class="result">
      <div class="result__meta">
        <div class="result__name">${escapeHTML(p.name)}</div>
        <div class="result__sub">${escapeHTML(p.brand)} · ${escapeHTML(p.color)} · size ${escapeHTML(p.size)}</div>
      </div>
      <span class="badge ${found ? "badge--ok" : "badge--out"}">${found ? "✓ found" : "missing"}</span>
    </li>
  `;
}

export function renderDone(root: HTMLElement) {
  const list = getList();
  if (list.length === 0) {
    const url = new URL(window.location.href);
    url.searchParams.set("screen", "list");
    window.location.replace(url.toString());
    return;
  }

  const found = readFound();
  const products = list
    .map((code) => getProduct(code))
    .filter((p): p is Product => Boolean(p));
  const foundProducts = products.filter((p) => found.has(p.product_code));
  const missingProducts = products.filter((p) => !found.has(p.product_code));

  const allFound = missingProducts.length === 0;

  root.innerHTML = `
    <header>
      <h1>${allFound ? "All set!" : "Almost there"}</h1>
      <p class="tag">${foundProducts.length} of ${products.length} items collected</p>
    </header>
    <main class="screen-done">
      ${
        missingProducts.length > 0
          ? `
        <section class="zone-row zone-row--first">
          <div class="zone-row__head">
            <span class="zone-row__letter" style="background: var(--bad)">!</span>
            <div class="zone-row__meta">
              <div class="zone-row__name">Still to find</div>
              <div class="zone-row__sub">${missingProducts.length} item${missingProducts.length > 1 ? "s" : ""}</div>
            </div>
          </div>
          <ul class="results" style="max-height:none">
            ${missingProducts.map((p) => row(p, false)).join("")}
          </ul>
        </section>
      `
          : ""
      }

      ${
        foundProducts.length > 0
          ? `
        <section class="zone-row">
          <div class="zone-row__head">
            <span class="zone-row__letter" style="background: var(--ok)">✓</span>
            <div class="zone-row__meta">
              <div class="zone-row__name">Found</div>
              <div class="zone-row__sub">${foundProducts.length} item${foundProducts.length > 1 ? "s" : ""}</div>
            </div>
          </div>
          <ul class="results" style="max-height:none">
            ${foundProducts.map((p) => row(p, true)).join("")}
          </ul>
        </section>
      `
          : ""
      }

      <a class="primary" href="?screen=scan" style="display:${missingProducts.length > 0 ? "block" : "none"}">
        Keep scanning
      </a>
      <a class="primary" href="?screen=list" id="new-trip" style="background: var(--panel-strong); color: #fff">
        New trip
      </a>
    </main>
  `;

  const newTripBtn = root.querySelector("#new-trip") as HTMLAnchorElement;
  newTripBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!confirm("Clear your list and start over?")) return;
    clearList();
    sessionStorage.removeItem(FOUND_KEY);
    const url = new URL(window.location.href);
    url.searchParams.set("screen", "list");
    window.location.href = url.toString();
  });
}
