# nightiangles

In-store AI concierge for a Swiss outdoor retailer — built on top of Scandit scanning + AR.
HerCode hackathon submission.

## Layout

- **`scandit-challenge/`** — the original Scandit HerCode starter, unmodified. Start here for the brief.
  - `README.md` — challenge brief and judging criteria
  - `dataset/` — sample product catalog, scannable barcodes PDF, and the store map
  - `.env.example` — template for the Scandit license key
- **`docs/`** — our own working notes and references.
  - `scandit-web-sdk.md` — indexed reference covering install, modes, symbologies, ID Capture, Parser, samples, release notes
- **`body-measurements/`** — git submodule of [farazBhatti/Human-Body-Measurements-using-Computer-Vision](https://github.com/farazBhatti/Human-Body-Measurements-using-Computer-Vision) (MIT). Anthropometric measurement extraction from a single image — candidate building block for the "Fit Translator" direction.
- **`Ideas_bank.txt`** — candidate hackathon directions and the reasoning behind each.

## Getting started

```bash
git clone --recurse-submodules https://github.com/shiwani42/nightiangles.git
cd nightiangles/scandit-challenge
cp .env.example .env   # then paste your Scandit license key into .env
```

If you already cloned without `--recurse-submodules`:

```bash
git submodule update --init --recursive
```

The Scandit license key is shared separately by the organizers — never commit it.
