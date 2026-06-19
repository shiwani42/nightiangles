<div align="center">

![Florence Nightingale — pioneer of data visualisation](florence-nightingale.jpg)

*Florence Nightingale (1820–1910) — nurse, mathematician, and the first person to use data visualisation to save lives.
She invented the polar area chart to prove that sanitation — not battle wounds — was killing soldiers in the Crimean War.
**Women + data have always changed the world.** nightiangles carries that forward.*

</div>

---

<div align="center">

# nightiangles

### In-store AI concierge for a Swiss outdoor retailer
#### Built on Scandit BarcodeFind · No install · Open from a QR code

**HerCode × Scandit Hackathon 2026**

</div>

---

Experience TrailMate AI here: https://alpine-smart-shopper.lovable.app

---

## The problem

A customer walks into an outdoor gear store. They see a wall of 250+ jackets. Every jacket has a number on the tag. None of the numbers mean anything without a degree in textile engineering.

**Today, there are two outcomes:**
1. They find a sales associate — if one is free
2. They walk out

The harder moment isn't "which jacket is best" — it's the second before they pick one up, when the wall of choice is so overwhelming they don't even start. **That moment is currently unsolved.**

---

## Our solution

**nightiangles** collapses 250 SKUs into the 2–3 right ones for a specific shopper — no sales associate needed, no app to install, no account to create.

**The shopper's flow, start to finish:**

```
📱 Scan QR at store entrance
        ↓
📝 Enter what you're looking for  (name, size, or paste a list)
        ↓
🗺️  App shows which zones to visit  (A–G on the store map)
        ↓
📷  Point camera at the shelf
        ↓
✅  Items on your list glow green  (Scandit BarcodeFind)
        ↓
🎉  Done — tap Finish, see summary
```

Zero friction. Works in Safari and Chrome. Opens from a QR code in under 3 seconds.

---

## Demo

> **Video walkthrough:** `video.mp4` at repo root *(to be recorded)*

**To try it yourself:**

```
http://localhost:5173   (after running npm run dev — see Getting Started below)
```

Print `scandit-challenge/dataset/sample-barcodes.pdf` (or open it on a second screen) and point the camera at it. The catalog has 249 real EAN-13, QR, and Code128 barcodes.

---

## Features built

### ✅ v1 — Find what you came for (complete)

| Step | What happens | Tech |
|---|---|---|
| **List builder** | Search 249 SKUs by name, brand, or size — click to add to your list | Client-side fuzzy search over `products.json` |
| **Zone navigator** | Resolves your list to store zones A–G, shows which zones to visit on the store floor plan | `zone` field from catalog + `store-map.png` overlay |
| **BarcodeFind scanner** | Pre-built Scandit camera UI: live AR dots over every barcode on the shelf, green = on your list; carousel ticks items off as found; sound + haptic on each hit | `BarcodeFind` + `BarcodeFindView` (Scandit 8.4.0) |
| **Done screen** | Summary of found vs still-missing items | — |

**Symbologies supported:** EAN-13, EAN-8, UPC-E, QR, Code 128, Code 39, Data Matrix — covers the full Scandit demo book + main catalog.

### 🔧 v2 — Trip plan → gear list (in progress)

> *"3-day winter hike in the Swiss Alps, starts March 14"*

Claude API turns a free-text trip goal into a curated gear checklist matched against the catalog, then drops the shopper straight into the v1 scan flow. The LLM call is routed through a small server-side proxy so the API key never hits the browser.

### 💡 v3 — Smart lenses (designed, time-permitting)

Three zero-install additions on top of the same barcode scanner:

| Lens | Shopper pain it solves | Tech weight |
|---|---|---|
| **Price Decoder** | Scan two similar products with a price gap → bullet-point breakdown of where the money goes (material, brand premium, tech) | Deterministic JS diff over catalog fields + optional 1-sentence LLM copy |
| **Repair vs Replace** | Scan a worn item → shows brand repair programme (Patagonia Worn Wear, Arc'teryx ReBird) vs. replacement cost | Hardcoded `brand → repairProgram` JSON lookup + card UI |
| **Twin Shopper** | Share a live link to a partner at home; they see what you're scanning and vote yes/no in real-time | Supabase Realtime or SSE channel |

---

## Why Scandit is the right foundation

| Scandit capability | How we use it |
|---|---|
| **BarcodeFind** (MatrixScan Find) | Pre-built camera view, AR dot overlays on every barcode in frame simultaneously, item carousel with auto-tick, sound + haptic feedback — we compose this, not rebuild it |
| **Multi-barcode tracking** | Reads an entire shelf in one camera frame — no need to scan items one by one |
| **Web SDK (WASM)** | Runs in a mobile browser — no App Store, no install, no account. QR → app in under 3 seconds |
| **EAN-13 + QR + Code128** | Covers the full demo-book dataset and the main catalog barcodes |

> **Key design principle:** *don't reinvent the wheel.* BarcodeFind already ships the camera preview, dot overlays, sound/haptics, and the "items still to find" carousel. We wire it up to real product data and a navigation step. That's the whole v1.

---

## Technical architecture

```
Browser (Vite + TypeScript, vanilla DOM)
├── catalog.ts          → products.json → Map<barcode, Product>  (O(1) lookup)
├── screens/
│   ├── list-builder.ts → search + build checklist → sessionStorage
│   ├── map.ts          → zone resolver + store-map.png overlay
│   ├── scan.ts         → BarcodeFind wire-up (THE CORE FEATURE)
│   ├── done.ts         → found / still-missing summary
│   └── plan.ts         → v2 trip plan input → Claude API
└── style.css           → Inter font, forest-green design tokens, mobile-first

No backend for v1 — products.json (~600 KB) ships with the bundle.
v2 LLM calls go through a tiny Render Web Service (API key stays server-side).
```

**Stack choices:**

| Choice | Reason |
|---|---|
| Vite + TypeScript | Minimal setup, ESM-native, trivial Render Static Site deploy |
| No framework (vanilla DOM) | React adds zero value for screens that are mostly imperative camera UI |
| No backend (v1) | 249 products fit comfortably in the browser; client-side filter is instant |
| Render Static Site | Free HTTPS; correct WASM MIME type; easy redeploy on push |

---

## Catalog

249 product variants across 7 store zones — one scannable barcode per variant.

| Zone | Name | Categories |
|---|---|---|
| A | Jackets & Shells | rain-jacket, insulated-jacket, hardshell |
| B | Footwear | boots, trail-shoes, approach-shoes |
| C | Tents & Shelter | tent, tarp |
| D | Sleep | sleeping-bag, sleeping-mat |
| E | Backpacks | backpack |
| F | Base Layers & Clothing | base-layer, fleece, trousers |
| G | Accessories | headlamp, water-bottle, trekking-poles, gloves, socks, hat, stove |

**Key product fields used by the app:**

`product_code` (barcode) · `name` · `brand` · `category` · `zone` + `aisle` (navigation) · `size` · `color` · `price_chf` · `weight_g` · `waterproof_rating_mm` · `temp_rating_c` · `material` · `tags` · `stock_total` · `stock_front`

---

## Judging criteria — our answers

| Criterion | Our answer |
|---|---|
| **UI & UX** | Mobile-first, opens from QR, zero-install. One clear action at each step. BarcodeFind's pre-built UI handles camera — we don't fight it. Forest-green design system, Inter font, smooth transitions. |
| **Feature completeness** | v1 is end-to-end and working: list → zones → scan → done. Not mocked — real Scandit BarcodeFind, real catalog barcodes, real product data returned on match. |
| **Scandit implementation** | BarcodeFind is the structural core of the experience, not bolted on. We use `BarcodeFindView` (pre-built AR dots + carousel + haptics), `BarcodeFindItem` + `BarcodeFindItemSearchOptions` for item targeting, and `didTapFinishButton` for result routing. |
| **Smart AI** | v2 uses Claude to turn a free-text trip plan into a structured gear checklist matched against the catalog — AI as a list-generator, not a chatbot. v3 Price Decoder uses AI to explain a price gap in one natural-language sentence. |
| **Uniqueness** | The "certain shopper" flow (I know what I want, help me find it) is under-solved. Every competitor assumes the customer has already picked up a product. We solve the moment before they touch anything. Named after Florence Nightingale — a woman who used data to change how decisions are made. |

---

## Getting started

```bash
git clone --recurse-submodules https://github.com/shiwani42/nightiangles.git
cd nightiangles/app
cp .env.example .env
# Paste your Scandit license key:
# VITE_SCANDIT_LICENSE_KEY=your_key_here
npm install
npm run dev
```

Open **http://localhost:5173** (or the network URL shown in the terminal, for phone testing on the same WiFi).

> If you cloned without `--recurse-submodules`: `git submodule update --init --recursive`

**Test scanning without a physical store:**
Print `scandit-challenge/dataset/sample-barcodes.pdf` or open it on a second screen. Scan from the phone camera — every barcode returns real product data from the catalog.

---

## Repo layout

```
nightiangles/
├── florence-nightingale.jpg     ← our mascot (women + data)
├── README.md                    ← you are here
├── Ideas_bank.txt               ← original direction-setting writeups
├── AGENTS.md                    ← full technical brief for coding agents
├── scandit-challenge/           ← upstream Scandit HerCode starter (unmodified)
│   ├── README.md                ← challenge brief + judging criteria
│   ├── dataset/
│   │   ├── products.json        ← 249 product variants (the catalog)
│   │   ├── sample-barcodes.pdf  ← 3 scannable demo-book pages
│   │   └── store-map.png        ← store floor plan, zones A–G
│   └── .env.example
├── docs/
│   └── scandit-web-sdk.md       ← indexed Scandit Web SDK reference
├── body-measurements/           ← submodule for future Fit Translator feature
└── app/                         ← THE APP (Vite + TypeScript)
    ├── index.html
    ├── .env.example             ← copy to .env, set VITE_SCANDIT_LICENSE_KEY
    └── src/
        ├── screens/
        │   ├── list-builder.ts  ← Phase 1: search + checklist
        │   ├── map.ts           ← Phase 2: zone resolver + floor plan
        │   ├── scan.ts          ← Phase 3: BarcodeFind (core feature)
        │   ├── done.ts          ← Phase 4: results
        │   ├── plan.ts          ← v2: trip plan → AI checklist
        │   ├── compare.ts       ← v3: Price Decoder
        │   ├── repair.ts        ← v3: Repair vs Replace
        │   └── connect.ts       ← v3: Twin Shopper
        ├── catalog.ts           ← products.json → Map<barcode, Product>
        ├── session.ts           ← sessionStorage helpers
        └── style.css            ← design tokens + component styles
```

---

## The name

**night + angles** — a nod to Florence Nightingale, who used angular polar charts ("rose diagrams") to make invisible data visible and change how decisions were made. We use Scandit AR overlays to make invisible product information visible to a shopper in a store. Same idea, 165 years later.

---

<div align="center">
  <sub>Built with ❤️ at HerCode × Scandit Summer Hackathon 2026 · Team nightiangles</sub>
</div>
