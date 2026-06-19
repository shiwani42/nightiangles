import type { Product } from "../types";
import { search, getProduct } from "../catalog";
import { getList, addToList, removeFromList, clearList } from "../list";

function escapeHTML(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function stockBadge(p: Product): string {
  if (p.stock_total === 0) {
    return `<span class="badge badge--out">out of stock</span>`;
  }
  if (p.stock_front === 0) {
    return `<span class="badge badge--back">in back stock</span>`;
  }
  return `<span class="badge badge--ok">in store · ${p.stock_front}</span>`;
}

function resultRow(p: Product, alreadyOnList: boolean): string {
  const price = p.discount_pct > 0
    ? `<s>CHF ${p.price_chf.toFixed(0)}</s> <strong>CHF ${(p.price_chf * (1 - p.discount_pct / 100)).toFixed(0)}</strong>`
    : `<strong>CHF ${p.price_chf.toFixed(0)}</strong>`;
  return `
    <li class="result" data-code="${p.product_code}">
      <div class="result__meta">
        <div class="result__name">${escapeHTML(p.name)}</div>
        <div class="result__sub">${escapeHTML(p.brand)} · ${escapeHTML(p.color)} · size ${escapeHTML(p.size)}</div>
        <div class="result__row">${price} · ${stockBadge(p)} · <span class="zone">Zone ${escapeHTML(p.zone)} · ${escapeHTML(p.aisle)}</span></div>
      </div>
      <button class="add-btn" ${alreadyOnList ? "disabled" : ""}>
        ${alreadyOnList ? "✓ added" : "+ add"}
      </button>
    </li>
  `;
}

function chip(p: Product): string {
  return `
    <li class="chip" data-code="${p.product_code}">
      <span>${escapeHTML(p.name)} <span class="chip__sub">· ${escapeHTML(p.size)}</span></span>
      <button class="chip__x" aria-label="remove">×</button>
    </li>
  `;
}

export function renderListBuilder(root: HTMLElement) {
  root.innerHTML = `
    <header>
      <h1>What are you looking for?</h1>
      <p class="tag">Search the catalog. We'll guide you to it.</p>
    </header>
    <main class="screen-list">
      <input id="q" class="search" type="search" inputmode="search" placeholder="Search by name, brand, category…" autocomplete="off" />
      <ul id="results" class="results"></ul>

      <section class="your-list">
        <div class="your-list__head">
          <h2>Your list <span id="count" class="count">0</span></h2>
          <button id="clear" class="link-btn">Clear</button>
        </div>
        <ul id="chips" class="chips"></ul>
        <p id="empty" class="empty">Add at least one item to continue.</p>
      </section>

      <button id="continue" class="primary" disabled>Continue</button>
    </main>
  `;

  const qEl = root.querySelector("#q") as HTMLInputElement;
  const resultsEl = root.querySelector("#results") as HTMLUListElement;
  const chipsEl = root.querySelector("#chips") as HTMLUListElement;
  const countEl = root.querySelector("#count") as HTMLSpanElement;
  const emptyEl = root.querySelector("#empty") as HTMLParagraphElement;
  const continueEl = root.querySelector("#continue") as HTMLButtonElement;
  const clearEl = root.querySelector("#clear") as HTMLButtonElement;

  function refreshList() {
    const list = getList();
    countEl.textContent = String(list.length);
    if (list.length === 0) {
      chipsEl.innerHTML = "";
      emptyEl.style.display = "block";
      continueEl.disabled = true;
    } else {
      const items = list
        .map((code) => getProduct(code))
        .filter((p): p is Product => Boolean(p));
      chipsEl.innerHTML = items.map(chip).join("");
      emptyEl.style.display = "none";
      continueEl.disabled = false;
    }
    refreshResults(); // update "+ add" / "✓ added" buttons
  }

  let lastQuery = "";
  function refreshResults() {
    const q = qEl.value;
    if (q !== lastQuery) lastQuery = q;
    const matches = search(q, 12);
    const onList = new Set(getList());
    if (q.trim() === "") {
      resultsEl.innerHTML = `<li class="hint">Try "jacket", "boots size 42", "sleeping bag", or "headlamp".</li>`;
      return;
    }
    if (matches.length === 0) {
      resultsEl.innerHTML = `<li class="hint">No matches for <code>${escapeHTML(q)}</code>.</li>`;
      return;
    }
    resultsEl.innerHTML = matches.map((p) => resultRow(p, onList.has(p.product_code))).join("");
  }

  let debounce: number | undefined;
  qEl.addEventListener("input", () => {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(refreshResults, 120);
  });

  resultsEl.addEventListener("click", (e) => {
    const li = (e.target as HTMLElement).closest(".result") as HTMLLIElement | null;
    if (!li) return;
    const code = li.dataset.code;
    if (!code) return;
    const btn = li.querySelector(".add-btn") as HTMLButtonElement;
    if (btn.disabled) return;
    addToList(code);
    refreshList();
  });

  chipsEl.addEventListener("click", (e) => {
    const li = (e.target as HTMLElement).closest(".chip") as HTMLLIElement | null;
    if (!li) return;
    if (!(e.target as HTMLElement).classList.contains("chip__x")) return;
    const code = li.dataset.code;
    if (!code) return;
    removeFromList(code);
    refreshList();
  });

  clearEl.addEventListener("click", () => {
    if (!confirm("Clear your list?")) return;
    clearList();
    refreshList();
  });

  continueEl.addEventListener("click", () => {
    const url = new URL(window.location.href);
    url.searchParams.set("screen", "map");
    window.location.href = url.toString();
  });

  refreshList();
  refreshResults();
  qEl.focus();
}
