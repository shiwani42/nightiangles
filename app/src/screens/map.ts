import storeMapUrl from "../../../scandit-challenge/dataset/store-map.png";
import { getList } from "../list";
import { getProduct, zonesForCodes } from "../catalog";
import type { Product } from "../types";

// Pin positions on the store-map.png, as percentages of width/height.
// Map layout (3 columns):
//   left:   C (top) - B (mid) - A (bot)
//   center: F (upper-mid) - G (lower-mid)
//   right:  D (top) - E (mid) - Checkout (bot)
const ZONE_POS: Record<string, { x: number; y: number }> = {
  C: { x: 21, y: 38 },
  B: { x: 21, y: 60 },
  A: { x: 21, y: 82 },
  F: { x: 52, y: 42 },
  G: { x: 52, y: 75 },
  D: { x: 82, y: 38 },
  E: { x: 82, y: 60 },
};

// Recommended walking order, following the red dashed arrow in store-map.png:
// up aisle 1 (A → B → C), across top to F, then right column (D → E), then G on the way out.
const WALK_ORDER = ["A", "B", "C", "F", "D", "E", "G"];

function escapeHTML(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderMap(root: HTMLElement) {
  const list = getList();

  if (list.length === 0) {
    const url = new URL(window.location.href);
    url.searchParams.set("screen", "list");
    window.location.replace(url.toString());
    return;
  }

  const zones = zonesForCodes(list).sort(
    (a, b) => WALK_ORDER.indexOf(a.zone) - WALK_ORDER.indexOf(b.zone),
  );

  // Group resolved products by zone for the per-zone item lists.
  const byZone = new Map<string, Product[]>();
  for (const code of list) {
    const p = getProduct(code);
    if (!p) continue;
    const arr = byZone.get(p.zone);
    if (arr) arr.push(p);
    else byZone.set(p.zone, [p]);
  }

  const pins = zones
    .map(({ zone, count }) => {
      const pos = ZONE_POS[zone];
      if (!pos) return "";
      return `
        <div class="zone-pin" style="left:${pos.x}%; top:${pos.y}%">
          <span class="zone-pin__letter">${zone}</span>
          <span class="zone-pin__count" aria-label="${count} item${count > 1 ? "s" : ""}">${count}</span>
        </div>
      `;
    })
    .join("");

  const rows = zones
    .map(({ zone, zone_name, count }, i) => {
      const items = byZone.get(zone) ?? [];
      return `
        <li class="zone-row${i === 0 ? " zone-row--first" : ""}">
          <div class="zone-row__head">
            <span class="zone-row__letter">${zone}</span>
            <div class="zone-row__meta">
              <div class="zone-row__name">${escapeHTML(zone_name)}</div>
              <div class="zone-row__sub">${count} item${count > 1 ? "s" : ""}</div>
            </div>
            ${i === 0 ? `<span class="badge badge--ok">start here</span>` : ""}
          </div>
          <ul class="zone-items">
            ${items
              .map(
                (p) =>
                  `<li>
                     <span class="zone-items__name">${escapeHTML(p.name)}</span>
                     <span class="zone-items__sub">· ${escapeHTML(p.size)} · aisle ${escapeHTML(p.aisle)}</span>
                   </li>`,
              )
              .join("")}
          </ul>
        </li>
      `;
    })
    .join("");

  const startZone = zones[0]?.zone ?? "A";

  root.innerHTML = `
    <header>
      <h1>Your route</h1>
      <p class="tag">${zones.length} zone${zones.length > 1 ? "s" : ""} · ${list.length} item${list.length > 1 ? "s" : ""}</p>
    </header>
    <main class="screen-map">
      <div class="map-wrap">
        <img src="${storeMapUrl}" class="map-img" alt="Store map" />
        <div class="pin-layer">${pins}</div>
      </div>

      <ul class="zone-list">${rows}</ul>

      <a class="primary" href="?screen=scan&zone=${startZone}">I'm at Zone ${startZone} — start scanning</a>
      <a class="link-btn" href="?screen=list">← Edit list</a>
    </main>
  `;
}
