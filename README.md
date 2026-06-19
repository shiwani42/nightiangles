<div align="center">

![Florence Nightingale — pioneer of data visualisation](florence-nightingale.jpg)

*Florence Nightingale (1820–1910) — nurse, statistician, and the first person to use data visualisation to save lives.  
She pioneered the polar area chart ("rose diagram") to prove that sanitation reforms, not battle wounds, were killing soldiers.  
**Women + data have always changed the world.** nightiangles carries that forward.*

</div>

---

# nightiangles

> **In-store AI concierge for a Swiss outdoor retailer** — built on Scandit scanning + AR.  
> HerCode Summer Hackathon 2026 submission.

A shopper walks into a wall of 250+ jackets, boots, and tents. Our web app (no install — just scan a QR at the entrance) collapses that wall into the 2–3 items that are actually right for them.

## The name

**night + angles** — a nod to Florence Nightingale, who proved that data, visualised well, saves lives. Here, data saves shopping trips.

## What it does

### v1 — Find what you came for (live)

1. **Scan QR at store entrance.** Web app opens instantly — no install, no account.
2. **Tell us what you need.** Type or search product names, sizes, colours.
3. **Navigate to the right zone.** Store map overlay shows exactly which zones (A–G) hold your items.
4. **Point camera at the shelf.** Scandit BarcodeFind lights up every item on your list in real-time — green dots over matches, a carousel ticking items off as you find them, sound + haptic feedback on each hit.
5. **Done.** Summary of what you found, what's still needed.

### v2 — Plan from a goal *(next)*

> *"3-day winter hike in the Swiss Alps, starts March 14"*

LLM turns a trip plan into a curated gear checklist, then drops you straight into the v1 find flow.

### v3 — Smart lenses on top *(bonus)*

| Lens | What it does |
|---|---|
| **Price Decoder** | Scan two similar products → side-by-side breakdown of where the price gap goes (materials, brand, tech) |
| **Repair vs Replace** | Scan a worn item → shows brand repair programme options vs. full replacement cost |
| **Twin Shopper** | Share a live link to a partner at home; they see what you're scanning and can vote yes/no in real-time |

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| App | Vite + TypeScript, vanilla DOM | Lightest path; no framework needed for two screens with imperative camera UI |
| Scanning | Scandit Web SDK 8.4.0 — BarcodeFind | Ships pre-built camera UI, AR dot overlays, find carousel, sound + haptics. We compose, not rebuild. |
| Data | `products.json` (249 SKUs) bundled in browser | No backend needed; client-side filter is fast enough |
| Hosting | Render Static Site | Free HTTPS; WASM served correctly |
| AI (v2) | Claude API → Render Web Service | API key stays server-side |

## Repo layout

```
nightiangles/
├── florence-nightingale.jpg  ← our mascot
├── README.md
├── Ideas_bank.txt            ← original direction-setting writeups
├── scandit-challenge/        ← upstream Scandit HerCode starter (unmodified)
│   ├── README.md             ← challenge brief + judging criteria
│   ├── dataset/
│   │   ├── products.json     ← 249 product variants
│   │   ├── sample-barcodes.pdf
│   │   └── store-map.png
│   └── .env.example
├── docs/
│   └── scandit-web-sdk.md
├── body-measurements/        ← submodule (future Fit Translator feature)
└── app/                      ← the Vite + TypeScript web app
    ├── index.html
    ├── src/
    │   ├── screens/          ← list-builder, map, scan, done, …
    │   ├── catalog.ts        ← products.json → Map<barcode, Product>
    │   └── style.css
    └── .env.example          ← copy to .env, add VITE_SCANDIT_LICENSE_KEY
```

## Getting started

```bash
git clone --recurse-submodules https://github.com/shiwani42/nightiangles.git
cd nightiangles/app
cp .env.example .env
# Paste your Scandit license key as VITE_SCANDIT_LICENSE_KEY=...
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) on your phone (same WiFi) or desktop.

> **License key** — provided by Scandit / HerCode organisers. Never commit it.

If you cloned without `--recurse-submodules`:

```bash
git submodule update --init --recursive
```

## Judging criteria alignment

| Criterion | How we address it |
|---|---|
| **Use of Scandit SDK** | BarcodeFind is the core of the find flow — we use the pre-built view, AR overlays, sound, haptics, and item carousel out of the box |
| **Innovation** | v2 LLM trip-plan → gear list; v3 Price Decoder + Repair vs Replace lenses |
| **Real shopper pain** | 250+ SKUs in a store is genuinely overwhelming; most shoppers leave without finding the right item |
| **Demo-ability** | Works in a browser on a phone via QR, end-to-end in under 60 seconds |
| **HerCode spirit** | Named after Florence Nightingale; built at a women-in-tech hackathon |

---

<div align="center">
  <sub>Built with ❤️ at HerCode Summer Hack 2026 · Team nightiangles</sub>
</div>
