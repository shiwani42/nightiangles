import {
  DataCaptureContext,
  DataCaptureView,
  Camera,
  FrameSourceState,
  Feedback,
} from "@scandit/web-datacapture-core";
import {
  barcodeCaptureLoader,
  BarcodeCapture,
  BarcodeCaptureSettings,
  Symbology,
  SymbologyDescription,
} from "@scandit/web-datacapture-barcode";

const LICENSE_KEY = import.meta.env.VITE_SCANDIT_LICENSE_KEY as string | undefined;

export function renderSmoke(root: HTMLElement) {
  root.innerHTML = `
    <header>
      <h1>nightiangles</h1>
      <p class="tag">Smoke test (Phase 0)</p>
    </header>
    <main>
      <button id="start">Start camera</button>
      <div id="status" class="status">press Start camera</div>
      <div id="capture-view"></div>
      <div id="last-scan" class="last-scan"></div>
    </main>
  `;

  const statusEl = root.querySelector("#status") as HTMLDivElement;
  const lastScanEl = root.querySelector("#last-scan") as HTMLDivElement;
  const captureViewEl = root.querySelector("#capture-view") as HTMLDivElement;
  const startBtn = root.querySelector("#start") as HTMLButtonElement;

  let scanCount = 0;

  function setStatus(msg: string) {
    statusEl.textContent = msg;
    console.log("[scandit]", msg);
  }

  function flashScan(line: string) {
    scanCount += 1;
    lastScanEl.textContent = `#${scanCount}  ${line}`;
    lastScanEl.classList.remove("flash");
    void lastScanEl.offsetWidth;
    lastScanEl.classList.add("flash");
    if ("vibrate" in navigator) navigator.vibrate(60);
  }

  async function boot() {
    if (!LICENSE_KEY) {
      setStatus("ERROR: VITE_SCANDIT_LICENSE_KEY is not set. Check app/.env");
      startBtn.disabled = true;
      return;
    }
    setStatus("initializing Scandit…");
    const context = await DataCaptureContext.forLicenseKey(LICENSE_KEY, {
      libraryLocation:
        "https://cdn.jsdelivr.net/npm/@scandit/web-datacapture-barcode@8/sdc-lib/",
      moduleLoaders: [barcodeCaptureLoader()],
    });

    const view = new DataCaptureView();
    view.connectToElement(captureViewEl);
    await view.setContext(context);

    const settings = new BarcodeCaptureSettings();
    settings.enableSymbologies([
      Symbology.EAN13UPCA,
      Symbology.EAN8,
      Symbology.UPCE,
      Symbology.QR,
      Symbology.Code128,
      Symbology.Code39,
      Symbology.DataMatrix,
    ]);

    const barcodeCapture = await BarcodeCapture.forContext(context, settings);
    const feedback = Feedback.defaultFeedback;

    barcodeCapture.addListener({
      didScan: async (_mode, session) => {
        const barcode = session.newlyRecognizedBarcode;
        if (!barcode) return;
        const sym = new SymbologyDescription(barcode.symbology);
        flashScan(`[${sym.readableName}] ${barcode.data ?? ""}`);
        feedback.emit();
      },
    });

    const camera = Camera.pickBestGuess();
    await camera.applySettings(BarcodeCapture.recommendedCameraSettings);
    await context.setFrameSource(camera);
    await camera.switchToDesiredState(FrameSourceState.On);
    await barcodeCapture.setEnabled(true);

    setStatus("READY — point at a barcode");
    startBtn.style.display = "none";
  }

  startBtn.addEventListener("click", () => {
    startBtn.disabled = true;
    setStatus("starting…");
    boot().catch((err: unknown) => {
      console.error(err);
      setStatus(`ERROR: ${(err as Error).message ?? String(err)}`);
      startBtn.disabled = false;
    });
  });
}
