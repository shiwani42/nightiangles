# nightiangles — Hackathon Presentation Prep

**3-min demo + 2-min Q&A. Pre-submission checkpoint at 15:00.**

---

## One-line pitch

> nightiangles collapses 250 outdoor products into the 2–3 right ones for a specific shopper — no sales associate, no app install, no account. Open from a QR code in under 3 seconds.

---

## The problem (say this first, 20 seconds)

A customer walks into an outdoor gear store. They see a wall of 250+ jackets. Every jacket has a code on the tag. None of the codes mean anything.

Two outcomes today: find a sales associate (if one is free), or walk out.

The moment no one solves is the one **before** they pick anything up — when the wall of choice is so overwhelming they don't start. We solve that moment.

---

## What we built (every screen, honestly)

### 1. List Builder (`?screen=list`)
- Search 249 real SKUs by name, brand, size — fuzzy match
- Shows stock status: in store / in back / out of stock
- "Load demo list" button pre-fills 8 items that are guaranteed in the sample PDF
- If a Connect session is active, a sticky banner shows at top with "Back to session →"

### 2. Zone Navigator (`?screen=map`)
- Resolves your list to zones A–G using `zone` field from catalog
- Store floor plan (`store-map.png`) with pulsing animated pins on each zone your items are in
- Zones sorted by recommended walking order (follows the red-dashed arrow on the map)
- Per-zone item cards below the map
- CTA: "I'm here — Start scanning" → goes to scan screen with `?zone=X`

### 3. BarcodeFind Scanner (`?screen=scan`)
- **This is the core Scandit feature** — `BarcodeFind` + `BarcodeFindView` (Scandit 8.4.0)
- Pre-built UI from Scandit: camera, AR dots over every barcode in frame, green = on your list
- Carousel at the bottom ticks items off as found, sound + haptic on each match
- Camera-switch button (front/back)
- Symbologies: EAN-13, EAN-8, UPC-E, QR, Code128, Code39, DataMatrix
- Finish button → stashes found codes → done screen

### 4. Done Screen (`?screen=done`)
- Found vs still-missing list with product details

### 5. Trip Planner (`?screen=plan`) — AI feature
- Free-text trip input: *"3-day winter hike near Zermatt, starts Saturday"*
- Calls **Claude Haiku** with a `get_weather_forecast` tool defined
- Claude calls the tool → we fetch **Open-Meteo** (free, no API key) for real lat/lon forecast
- Open-Meteo data (temp, rain, snow, wind, daylight hours) is passed back to Claude as the tool result
- Claude picks 4–8 catalog items grounded in actual conditions, each with a one-sentence reason referencing the forecast (e.g. *"snow expected, -8°C nights → insulated jacket + 4-season tent"*)
- Falls back to a keyword heuristic if `VITE_ANTHROPIC_API_KEY` is not set
- **Honest caveat:** API key is in the browser (env var via Vite) — no server-side proxy

### 6. Price Decoder (`?screen=compare`)
- Scan two products into slot A and slot B using Scandit BarcodeCapture
- Deterministic JS diff over catalog fields: material (40%), waterproof rating (18%), temp rating (15%), weight (12%), features (10%), residual → brand premium
- Shows where the price gap goes as a breakdown card

### 7. Repair vs Replace (`?screen=repair`)
- Scan any product using Scandit BarcodeCapture
- Looks up the brand's repair programme from a hardcoded table (6 fictional brands modelled on Patagonia Worn Wear / Arc'teryx ReBird)
- Compares median repair cost band against new price → **Repair / Replace / Either** recommendation
- **Honest caveat:** brands (Nordfjell, Pinewild, Glaronia, Steinbock, Alpitec, wearit) are fictional — the data shape is real, brands are made up

### 8. Connect / Twin Shopper (`?screen=connect`, `?screen=connected`)
- Create or join a session with a 4-letter code (FAM-XXXX or PAR-XXXX)
- **Supabase Realtime** — presence (name, emoji, zone) + broadcast events
- Connected screen shows: roster, "Their Cart" (pull-based snapshot on join), "My Cart", activity feed, chat
- Chat IS fully working — text messages broadcast to all members in real time
- Activity feed shows scan:found, list:added, list:removed, chat events
- **Honest caveat:** vote buttons don't exist — the vote event type is defined but there is no UI to cast a vote. You can only see votes in the feed if sent programmatically.
- Family and Partner modes look identical (different session code prefix and title only)

### 9. Fit Check (`?screen=fit`)
- Take a photo (opt-in, processed once, never stored)
- Base64 JPEG sent to **Claude Vision (claude-haiku-4-5)** with a structured prompt
- Returns: top size (XS–XL), bottom size (XS–XL), EU shoe size (36–46), reasoning, silhouette notes
- Sizes saved to prefs and pre-fill the list screen

### 10. Settings (`?screen=settings`)
- High contrast mode (stronger borders, brighter text)
- Larger text (+25% across the app)
- Reduce motion (disables pulse/flash animations)
- Speak scan results (TTS via Web Speech API on scan finish)
- Manual size entry: top / bottom / EU shoe (alternative to Fit Check)

---

## Tech stack (be exact with judges)

| Layer | What | Why |
|---|---|---|
| **Build** | Vite + TypeScript | Fast HMR, ESM-native, trivial static deploy |
| **UI** | Vanilla DOM, no framework | Zero overhead — screens are imperative camera UI, React adds nothing |
| **Scanning** | Scandit Web SDK 8.4.0 | `BarcodeFind`+`BarcodeFindView` for main scan; `BarcodeCapture` for compare/repair |
| **AI — planner** | Claude Haiku 4.5 via Anthropic API | Tool-use loop with weather as a tool; fast + cheap for real-time generation |
| **AI — vision** | Claude Haiku 4.5 (multimodal) | Base64 image → size estimate |
| **Weather** | Open-Meteo | Free, no key, real forecast data |
| **Realtime** | Supabase Realtime | Presence + broadcast channels |
| **Hosting** | Render Static Site | Free HTTPS, auto-deploy from git |
| **Data** | `products.json` (249 SKUs) | Ships with the bundle — client-side search, O(1) barcode lookup |

---

## How Scandit is used (judge focus area)

The judges specifically look for **"Scandit used correctly as a real part of the experience, not bolted on."**

**BarcodeFind (main scan) — the structural core:**
- `BarcodeFindSettings` → enable 7 symbologies
- `BarcodeFind.forSettings(settings)` → capture mode
- `BarcodeFindView.createWithSettings(dataCaptureView, context, barcodeFind, viewSettings)` → pre-built UI
- `barcodeFind.setItemList(items)` → called AFTER createWithSettings (SDK requires this order)
- `view.setListener({ didTapFinishButton })` → our only hook — routes to done screen
- `view.startSearching()` → Scandit handles camera, dots, carousel, sound, haptics

**BarcodeCapture (compare + repair):**
- Used to scan products one at a time into slots
- `BarcodeCaptureSettings` + `BarcodeCapture.forSettings`
- `BarcodeCaptureListener.didScan` callback with feedback haptic on each scan

**Workaround to know about:** In Scandit 8.4.0, `BarcodeFindView.createWithSettings()` does NOT auto-register the `<scandit-barcode-find-view>` custom element. We call `(BarcodeFindView as any).register?.()` before `createWithSettings` to avoid a "setTorchAvailable is not a function" crash.

---

## How the AI works (judge focus area)

**Trip planner — Claude tool use loop:**
```
User types: "3-day winter hike near Zermatt, starts Saturday"
        ↓
Claude receives trip text + catalog (compact JSON) + tool definition
        ↓
Claude calls: get_weather_forecast({ location: "Zermatt", days: 3, start_date: "2026-06-21" })
        ↓
We call Open-Meteo: geocode "Zermatt" → lat/lon → daily forecast
        ↓
Tool result returned to Claude: min -4°C, max 2°C, 8cm snow, 12km/h wind
        ↓
Claude picks gear grounded in that data, returns: { codes: [...], reasoning: "..." }
        ↓
App loads those codes into the list → shopper hits Scan
```

This is **agentic AI** — Claude decides when to call the tool and uses real data to make decisions, not static knowledge.

---

## Judging criteria — your answers

| Criterion | Our answer |
|---|---|
| **UI & UX** | Mobile-first, zero install, opens from QR. One clear action per screen. Scandit's pre-built BarcodeFind UI handles camera — we don't fight it. Forest-green design, Inter font, tab bar navigation. |
| **Feature completeness** | v1 flow is fully end-to-end: list → zones → scan → done. Not mocked — real Scandit, real catalog barcodes, real product data returned on match. |
| **Scandit implementation** | BarcodeFind is the structural core, not a demo widget. We use BarcodeFindView (pre-built AR + carousel + haptics), BarcodeFindItem + BarcodeFindItemSearchOptions for item targeting, and didTapFinishButton for result routing. |
| **Smart AI** | Claude Haiku in a tool-use loop with a real weather API. The model calls the tool itself, reads actual forecast data, and grounds gear choices in real conditions. Fit Check uses Claude Vision for size estimation. |
| **Uniqueness** | Solves the moment *before* a shopper picks anything up — overwhelming choice paralysis. Named after Florence Nightingale, who made invisible data visible with angular charts. We make invisible product info visible via AR. |

---

## Probable Q&A

**Q: Why did you use BarcodeFind instead of MatrixScan AR?**
BarcodeFind ships an entire pre-built camera UI — dots, carousel, haptics, finish button. MatrixScan AR gives you primitives to build that yourself. For a hackathon where the goal is a working app, composing BarcodeFind is the right call. The challenge brief literally says "built with MatrixScan Find" in the example — BarcodeFind IS MatrixScan Find (it's the alias used in the Web SDK).

**Q: How does the weather integration actually work?**
Open-Meteo is a free, no-key weather API. We geocode the location string from the trip text (e.g. "Zermatt" → lat/lon), fetch a daily forecast for the trip window, and return the JSON to Claude as a tool result. Claude then picks gear based on actual temperatures, snowfall, and daylight hours — not a generic alpine guess.

**Q: Isn't putting the Anthropic API key in the browser a security risk?**
Yes. For a hackathon demo it's acceptable. In production you'd proxy through a server (e.g. a small Render Web Service). The key is in a Vite env var (`VITE_ANTHROPIC_API_KEY`) which gets baked into the JS bundle — fine for a demo, not for production.

**Q: What happens if there's no API key set?**
The trip planner falls back to a local keyword-matching heuristic (snow/winter → insulated jacket, camping → tent, etc.). All other features work without AI — scanning is pure Scandit, no AI needed.

**Q: How does the catalog work? Is it real data?**
249 product variants, all fictional brands (Nordfjell, Pinewild, etc.) but realistic data — weight in grams, waterproof rating in mm, temperature rating in °C, real EAN-13 / QR / Code128 barcodes that match the Scandit sample PDF. Ships as a JSON file with the bundle, loaded into a `Map<barcode, Product>` at startup for O(1) lookup.

**Q: Does it work without internet?**
No. Scandit SDK loads from a CDN (`cdn.jsdelivr.net`). The AI features need Anthropic's API. Open-Meteo is remote. The catalog and store map ship with the bundle, so *technically* those work offline — but the scanner won't initialise.

**Q: What's Twin Shopper / Connect actually doing technically?**
Supabase Realtime uses WebSockets under the hood. We create a channel named `nightiangles:{code}`. Each member tracks their presence (name, emoji, current zone). List additions/removals, scan finds, and chat messages are broadcast events on that channel. A joiner sends a `list:request-snapshot` event and the host responds with their full list — so you see their cart immediately on join.

**Q: Why no React / Next.js?**
Two reasons: the Scandit BarcodeFind camera UI is fully imperative (Scandit manages the DOM), and we needed fast load time from a QR code. A vanilla Vite app with Scandit initialises faster than a React hydration cycle would. Zero-overhead UI is the right choice when 80% of the experience is a camera.

**Q: What would you build next?**
Vote buttons on the Partner-at-home connected screen (the event type is wired, just no UI yet). A proper AI-powered shelf filter (MatrixScan AR with a predicate function). A server-side proxy for the Anthropic key for production safety.

**Q: How long did it take?**
Built in ~1 day at the hackathon. v1 (list → map → scan → done) took about 4 hours. v2/v3 features were layered on top in the remaining time.

---

## Demo flow (3 minutes)

1. **(0:00–0:20)** Open `nightingale-hack.onrender.com`. Show it opens instantly from a URL/QR. No install.
2. **(0:20–0:50)** List builder — search "trail shoe", add a few items. Hit "Load demo list" to fill 8 items fast. Show stock badges.
3. **(0:50–1:10)** Zone navigator — show the map with pulsing pins. "Your gear is in Zone B and Zone G." Hit Start Scanning.
4. **(1:10–2:00)** BarcodeFind scanner — point at the sample PDF (open on a second screen or printed). Watch items light up green and carousel tick off. Let judges see AR dots.
5. **(2:00–2:30)** Trip planner — type "3-day winter hike near Zermatt". Show the weather card loading, then gear list with weather-grounded reasoning.
6. **(2:30–3:00)** Briefly show Price Decoder (scan two barcodes from PDF) or Fit Check (take a photo).

---

## Things to NOT say

- Don't say "vote buttons" work — they don't render (event is wired but no UI)
- Don't say brands are real (Patagonia/Arc'teryx) — the repair brands are fictional
- Don't say there's a server-side proxy for the API key — there isn't, it's in the browser
- Don't say Family and Partner modes are different experiences — currently they show the same UI

---

## URLs

- **Live app:** https://nightingale-hack.onrender.com
- **Repo:** https://github.com/shiwani42/nightiangles
