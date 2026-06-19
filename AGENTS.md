# AGENTS.md — nightiangles project brief

> Live document. Any coding agent (Claude Code, Codex, Cursor, Copilot, etc.) opening this repo should read this file first. Updated whenever direction shifts. Latest entries at the bottom of the [Changelog](#changelog).

## Project

In-store AI concierge for a Swiss outdoor retailer, built on Scandit scanning + AR. HerCode hackathon submission. The shopper stands in front of a wall of jackets / boots / tents and our app helps them collapse 250+ SKUs into the 2-3 right ones for their needs — without talking to staff.

**Hard constraint we keep in mind:** *don't reinvent the wheel.* Scandit already ships the hard parts (multi-barcode tracking, AR overlay framework, pre-built BarcodeFindView). We compose, we don't rebuild.

## Two features we're shipping

1. **Shelf Lens** — point the phone at any shelf. The AR view dims everything except the products that match the active filter ("waterproof shells under 400g", "boots size 42", "rated for -10°C"). Tap a highlighted product → details popover.
2. **Find My Product** — give the app a checklist (gear list, shopping list). Point camera at a wall. AR highlights the exact models on the list with check marks; the rest stay dim.

Both are pure MatrixScan AR territory. Both share the same dataset, license key, camera setup, and product-lookup index.

## Repo layout

```
nightiangles/
├── AGENTS.md                 ← you are here
├── README.md                 ← user-facing repo overview
├── Ideas_bank.txt            ← original direction-setting writeups (read for context)
├── scandit-challenge/        ← upstream Scandit HerCode starter, unmodified
│   ├── README.md             ← challenge brief + judging criteria
│   ├── .env.example          ← template for SCANDIT_LICENSE_KEY
│   └── dataset/
│       ├── README.md         ← full dataset schema + zone map (READ THIS)
│       ├── products.json     ← 249 product variants
│       ├── sample-barcodes.pdf  ← 3 demo-book pages, scannable
│       └── store-map.png     ← floor plan, zones A–G
├── docs/
│   └── scandit-web-sdk.md    ← our indexed reference for the Scandit Web SDK
├── body-measurements/        ← submodule (farazBhatti/Human-Body-Measurements-…). Not used by the two features above. Sits here for the "Fit Translator" idea if we extend later.
└── app/                      ← (not yet created) the actual web app — see Build phases below
```

## Scandit primitives we lean on

Anchors point into `docs/scandit-web-sdk.md`.

### For Shelf Lens (MatrixScan AR)

- **`BarcodeBatch`** — multi-barcode tracking across frames. (§9 of the docs.) This is the workhorse.
- **`BarcodeBatchBasicOverlay`** with the `brushForTrackedBarcode(overlay, trackedBarcode)` callback — Scandit calls this per tracked barcode every frame; we return a green brush if the product matches the active filter, a transparent brush otherwise. This is **exactly** the "color this barcode based on whether it matches" primitive we need.
- **`didTapTrackedBarcode`** — built-in tap handling on AR overlays; we wire it to a product-details popover.
- **`Symbology.EAN13UPCA`, `Symbology.QR`, `Symbology.Code128`** — required to cover the catalog (EAN-13 for the main 230 SKUs, QR for demo-book shoes, Code128 for demo-book socks/tops).
- Multithreading is required for MatrixScan — page must be served with COOP/COEP headers (§9). On Render that's a `_headers` file on the static site, or middleware on a web service.

### For Find My Product (BarcodeFind)

- **`BarcodeFind`** — capture mode. (§10 of the docs.)
- **`BarcodeFindView` + `BarcodeFindViewSettings`** — Scandit's **pre-built** UI with shutter button, visual dots, sound + haptic feedback, and a search carousel with check marks. We do not draw any of this ourselves.
- **`BarcodeFindItem`, `BarcodeFindItemSearchOptions(barcodeString)`, `BarcodeFindItemContent(name, subtitle, image)`** — model class for "an item the shopper is looking for."
- **`barcodeFind.setItemList(items)`** + **`barcodeFindView.startSearching()`** — that's the whole wire-up.
- **`didTapFinishButton(foundItems)`** listener — fires when shopper hits the Finish button; we navigate to a results screen.

### Shared

- **`configure({ licenseKey, libraryLocation, moduleLoaders })`** (§2.4) — once at app start, before any mode is created.
- **`DataCaptureContext.create()`** — the conductor; both features attach to one context (but not simultaneously — modes are exclusive).
- **`DataCaptureView`** — DOM mount.
- **`Camera.default` + `FrameSourceState.On`** — camera plumbing.

### What this saves us from building

- Multi-barcode tracking
- AR overlay framework + per-barcode brush coloring
- Camera permission flow / video preview
- Pre-built shutter / carousel / sound / haptic UI (Find My Product)
- Symbology decoding (EAN-13, QR, Code128)
- Loading progress UI

## Dataset reference (key fields only)

Full schema in `scandit-challenge/dataset/README.md`. 249 variants. Filterable attributes:

| Field | Used by | Notes |
|---|---|---|
| `product_code` | both | the barcode — primary key |
| `product_id` | both | groups variants of same product |
| `name`, `brand`, `description` | both | display |
| `category` | Shelf Lens | hardshell, boots, sleeping-bag, … |
| `tags` (array) | Shelf Lens | `waterproof`, `lightweight`, `vegan`, … (full vocab in dataset README) |
| `weight_g`, `waterproof_rating_mm`, `temp_rating_c` | Shelf Lens | numeric filter ranges |
| `price_chf`, `discount_pct` | Shelf Lens | numeric filter |
| `size`, `color` | both | size 42, etc. |
| `material` | Shelf Lens | "Gore-Tex 3L", "Merino wool" |
| `stock_total`, `stock_front` | both | grey out if `stock_total === 0`; show "in back" if `stock_front === 0` |
| `zone` (A-G), `aisle` | future "guide me there" feature | not on the critical path for v1 |

> Recommended in-memory shape: `Map<product_code, Product>` for O(1) lookup keyed on the scanned barcode. Build it once at app start from `products.json` (~600 KB — fine to ship to the browser).

## Architecture

### Stack (proposed — change here if we deviate)

- **Vite + TypeScript** — minimal, fast HMR, easy to deploy as a Render Static Site.
- **No framework**, vanilla DOM + small handwritten components. JSX/React only if we feel friction.
- **No backend** — `products.json` ships with the bundle; filter logic runs client-side; license key is supplied via build-time env var (`VITE_SCANDIT_LICENSE_KEY`).
- **Deploy** — Render Static Site at `nightingale-hack.onrender.com` (or whichever subdomain we pick). HTTPS free; add COOP/COEP via `_headers`.
- **AI layer (optional)** — natural-language → filter JSON via Claude API. Only needed when we go beyond chip-based filtering. If we add it, route through a tiny Render Web Service so the API key stays server-side.

### Proposed file layout for `app/`

```
app/
├── index.html              ← landing + mode switcher (Shelf Lens / Find My Product)
├── shelf-lens.html
├── find-product.html
├── public/
│   └── _headers            ← COOP/COEP for Render
├── src/
│   ├── main.ts             ← entry, license configure, route
│   ├── scandit-setup.ts    ← shared configure() + module loaders
│   ├── catalog.ts          ← load products.json → Map<barcode, Product>
│   ├── filter.ts           ← Predicate type + chip/slider UI
│   ├── shelf-lens.ts       ← MatrixScan AR wire-up
│   ├── find-product.ts     ← BarcodeFind wire-up
│   └── types.ts            ← Product, Filter, Checklist types
├── package.json
└── vite.config.ts
```

### Data flow — Shelf Lens

```
boot
  └─ load products.json → Map<barcode, Product> (in catalog.ts)
  └─ configure Scandit, create DataCaptureContext, BarcodeBatch with [EAN13, QR, Code128]
  └─ mount DataCaptureView in #shelf-lens-view
  └─ render FilterChips component, default = "all"

user picks filter "waterproof + weight_g < 400"
  └─ predicate = (p) => p.tags.includes('waterproof') && p.weight_g < 400

each frame
  └─ Scandit callback: brushForTrackedBarcode(overlay, tb)
        ↓
     product = catalog.get(tb.barcode.data)
        ↓
     predicate(product) ? greenBrush : Brush.transparent

user taps tracked barcode
  └─ didTapTrackedBarcode → open product detail popover (name, price, stock, "in back" warning)
```

### Data flow — Find My Product

```
boot
  └─ load products.json → catalog
  └─ load checklist from URL query / localStorage / hardcoded demo
        (e.g. ["7610000000011", "7610000000088", ...])
  └─ items = checklist.map(code => {
        const p = catalog.get(code)
        return new BarcodeFindItem(
          new BarcodeFindItemSearchOptions(code),
          new BarcodeFindItemContent(p.name, `${p.brand} · ${p.size}`, null))
      })

configure Scandit
  └─ BarcodeFindSettings + enableSymbologies([EAN13, QR, Code128])
  └─ BarcodeFind.forSettings(settings)
  └─ BarcodeFindView.createWithSettings(view, context, find, viewSettings)
  └─ barcodeFind.setItemList(items)

user taps "Start"
  └─ barcodeFindView.startSearching()
  └─ Scandit's pre-built UI handles: camera, dots, sound, carousel, check marks

user taps Finish button
  └─ didTapFinishButton(foundItems) → results screen
```

## Build phases

We work in vertical slices — each phase is demoable.

- [ ] **Phase 0 — Scaffold (≈30 min).** Vite + TS project under `app/`. `npm install @scandit/web-datacapture-core @scandit/web-datacapture-barcode`. Wire license key from `.env`. Render an empty `DataCaptureView`. Confirm camera permission works on phone. Scan one of the PDF barcodes and console.log the result.
- [ ] **Phase 1 — Shelf Lens MVP (≈2 h).** Hardcoded filter (`tags.includes('waterproof')`). Green/transparent overlay. Tap → details popover.
- [ ] **Phase 2 — Filter UI (≈1 h).** Chip selector (tags) + sliders (max weight, max price). Build a `Filter` type, a `predicate(filter)` builder, and a small component that emits filter changes.
- [ ] **Phase 3 — Find My Product (≈1.5 h).** Hardcoded checklist of 5 demo-book barcodes. Full BarcodeFind integration. Results screen on finish.
- [ ] **Phase 4 — Checklist builder (≈1 h).** UI to add/remove items by name search over the catalog. Saves to localStorage. Optional: a "trip plan" textarea that LLM-converts into a checklist.
- [ ] **Phase 5 — Landing + polish (≈1 h).** Mode switcher, simple branding, store map glance, demo-mode banner.
- [ ] **Phase 6 — Deploy on Render (≈30 min).** Static site, `_headers` with COOP/COEP, env var for license key, custom subdomain matching the Scandit bundle ID.
- [ ] **Phase 7 (stretch) — NL filter (≈1 h).** Text input for filter ("waterproof shells under 400g"). Claude API endpoint via small Render Web Service. Returns a `Filter` JSON.

**Rough total:** ~7-8 h for both features end-to-end. Stretch optional.

## Decisions made

| Decision | Choice | Why |
|---|---|---|
| Stack | Vite + TypeScript, vanilla DOM | Lightest path; ESM-native; trivial Render deploy |
| Framework | none for v1 | React adds zero value for two pages with imperative camera UI |
| Backend | none for v1 | products.json is small; filter is client-side; license key via Vite env |
| Hosting | Render Static Site | Already chosen by user; free HTTPS |
| Repo layout | vendor in subfolder, user files at root | User preference (see memory note) |
| Submodule strategy | body-measurements as submodule, not vendored copy | Stays current with upstream; not used by these two features |
| Symbologies | EAN-13, QR, Code128 | Required to cover catalog incl. demo-book SKUs |

## Open questions

- **Bundle ID for the license key** — current plan is `nightingale-hack.onrender.com, localhost.localdomain`. Confirm exact subdomain once we provision the Render service.
- **Multi-context or one-context?** Scandit modes are exclusive — Shelf Lens (BarcodeBatch) and Find My Product (BarcodeFind) can share a `DataCaptureContext` but only one is active at a time. Plan: keep one context, swap modes on route change.
- **NL filter — needed for v1?** Chips + sliders cover the brief. NL is a stretch demo wow-factor. Defer unless time allows.
- **Out-of-stock handling in Shelf Lens** — grey brush, transparent brush, or hide entirely? Tentative: orange brush with a "out of stock" badge on tap.
- **Store map / "guide me there"** — not on the critical path for these two features. Hold for a v2.

## Working agreements

- **Secrets** — `SCANDIT_LICENSE_KEY` lives in `app/.env` (gitignored). Never paste into chat, commit, or share via screenshots. The original key copy lives at `../licencse.txt` outside the repo and is also gitignored as a belt-and-suspenders measure.
- **Commits** — small, descriptive. Co-author trailer not required.
- **Don't touch `scandit-challenge/`** — it's the upstream starter; leave it as-is. Our work goes in `app/` and `docs/`.
- **`body-measurements/` is a submodule** — don't edit files inside it. If we want to use it, vendor only the function we need into `app/`.
- **`docs/scandit-web-sdk.md` is the reference** — when in doubt about a Scandit API, search there first; only fetch live docs if you need something not covered.

## Changelog

- **2026-06-19** — Initial AGENTS.md. Two features (Shelf Lens, Find My Product) mapped to Scandit primitives. Build phases drafted. No code yet — `app/` directory not created. Next step: Phase 0 scaffold.
