import {
  Camera,
  CameraPosition,
  CameraSwitchControl,
  Color,
  DataCaptureContext,
  DataCaptureView,
} from "@scandit/web-datacapture-core";
import {
  barcodeCaptureLoader,
  BarcodeFind,
  BarcodeFindItem,
  BarcodeFindItemContent,
  BarcodeFindItemSearchOptions,
  BarcodeFindSettings,
  BarcodeFindView,
  BarcodeFindViewSettings,
  Symbology,
} from "@scandit/web-datacapture-barcode";
import { getList } from "../list";
import { getProduct } from "../catalog";
import { announce } from "../prefs";

const LICENSE_KEY = import.meta.env.VITE_SCANDIT_LICENSE_KEY as
  | string
  | undefined;

const FOUND_KEY = "nightiangles.found";

function escapeHTML(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderScan(root: HTMLElement) {
  const list = getList();
  if (list.length === 0) {
    const url = new URL(window.location.href);
    url.searchParams.set("screen", "list");
    window.location.replace(url.toString());
    return;
  }

  const zoneParam =
    new URLSearchParams(window.location.search).get("zone") ?? "";

  root.innerHTML = `
    <header>
      <h1>${zoneParam ? `Scanning Zone ${escapeHTML(zoneParam)}` : "Scanning"}</h1>
      <p class="tag">Point at the shelf. Items on your list light up green.</p>
    </header>
    <main class="screen-scan">
      <div id="status" class="status">starting camera…</div>
      <div id="capture-view" class="scan-view"></div>
      <a class="link-btn back-link" href="?screen=map">← Back to map</a>
    </main>
  `;

  const statusEl = root.querySelector("#status") as HTMLDivElement;
  const captureViewEl = root.querySelector("#capture-view") as HTMLDivElement;

  function setStatus(msg: string) {
    statusEl.textContent = msg;
    console.log("[scandit]", msg);
  }

  async function start() {
    if (!LICENSE_KEY) {
      setStatus("ERROR: VITE_SCANDIT_LICENSE_KEY missing. Check app/.env");
      return;
    }

    setStatus("loading Scandit SDK…");
    const context = await DataCaptureContext.forLicenseKey(LICENSE_KEY, {
      libraryLocation:
        "https://cdn.jsdelivr.net/npm/@scandit/web-datacapture-barcode@8/sdc-lib/",
      moduleLoaders: [barcodeCaptureLoader()],
    });

    const dataCaptureView = new DataCaptureView();
    dataCaptureView.connectToElement(captureViewEl);
    await dataCaptureView.setContext(context);

    // Camera switch toggle (front <-> back) lives in the top-right corner.
    dataCaptureView.addControl(new CameraSwitchControl());

    // Default to the rear-facing camera; user can toggle via the switch control.
    const camera = Camera.pickBestGuessForPosition(CameraPosition.WorldFacing);
    await context.setFrameSource(camera);

    const settings = new BarcodeFindSettings();
    settings.enableSymbologies([
      Symbology.EAN13UPCA,
      Symbology.EAN8,
      Symbology.UPCE,
      Symbology.QR,
      Symbology.Code128,
      Symbology.Code39,
      Symbology.DataMatrix,
    ]);

    const barcodeFind = await BarcodeFind.forSettings(settings);

    // Build BarcodeFindItem[] from the shopper's list.
    const items: BarcodeFindItem[] = [];
    for (const code of list) {
      const p = getProduct(code);
      if (!p) continue;
      items.push(
        new BarcodeFindItem(
          new BarcodeFindItemSearchOptions(code),
          new BarcodeFindItemContent(
            p.name,
            `${p.brand} · ${p.color} · size ${p.size}`,
            undefined,
          ),
        ),
      );
    }

    const viewSettings = new BarcodeFindViewSettings(
      Color.fromHex("#2ecc71"), // in-list pin (green)
      Color.fromHex("#ff5a5a"), // not-in-list pin (red)
      true, // sound
      true, // haptics
    );

    // Workaround for Scandit 8.4.0 bug: createWithSettings() does NOT register
    // the <scandit-barcode-find-view> custom element (create() does). Without
    // registration, document.createElement(tag) returns a bare HTMLElement
    // missing methods like setTorchAvailable, causing "setTorchAvailable is not
    // a function" at runtime. Calling register() first fixes it.
    (BarcodeFindView as unknown as { register?: () => void }).register?.();

    const view = await BarcodeFindView.createWithSettings(
      dataCaptureView,
      context,
      barcodeFind,
      viewSettings,
    );

    await barcodeFind.setItemList(items);

    view.setListener({
      didTapFinishButton: async (foundItems: BarcodeFindItem[]) => {
        const codes = foundItems.map((it) => it.searchOptions.barcodeData);
        sessionStorage.setItem(FOUND_KEY, JSON.stringify(codes));
        announce(`Found ${codes.length} of ${items.length} items. Done.`);
        const url = new URL(window.location.href);
        url.searchParams.set("screen", "done");
        url.searchParams.delete("zone");
        window.location.href = url.toString();
      },
    });

    await view.startSearching();
    setStatus(
      `searching for ${items.length} item${items.length > 1 ? "s" : ""} — tap Finish when done`,
    );
  }

  start().catch((err: unknown) => {
    console.error(err);
    setStatus(`ERROR: ${(err as Error).message ?? String(err)}`);
  });
}
