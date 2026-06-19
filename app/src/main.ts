import "./style.css";
import {
  DataCaptureContext,
  DataCaptureView,
  Camera,
  FrameSourceState,
} from "@scandit/web-datacapture-core";
import {
  barcodeCaptureLoader,
  BarcodeCapture,
  BarcodeCaptureSettings,
  Symbology,
  SymbologyDescription,
} from "@scandit/web-datacapture-barcode";

const LICENSE_KEY = import.meta.env.VITE_SCANDIT_LICENSE_KEY as string | undefined;

const statusEl = document.getElementById("status") as HTMLDivElement;
const lastScanEl = document.getElementById("last-scan") as HTMLDivElement;
const captureViewEl = document.getElementById("capture-view") as HTMLDivElement;
const startBtn = document.getElementById("start") as HTMLButtonElement;

function setStatus(msg: string) {
  statusEl.textContent = msg;
  console.log("[scandit]", msg);
}

async function boot() {
  if (!LICENSE_KEY) {
    setStatus("ERROR: VITE_SCANDIT_LICENSE_KEY is not set. Check app/.env");
    startBtn.disabled = true;
    return;
  }

  setStatus("initializing Scandit…");
  // Scandit 8.x: forLicenseKey() replaces the legacy configure() + create() flow
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
    Symbology.QR,
    Symbology.Code128,
  ]);

  const barcodeCapture = await BarcodeCapture.forContext(context, settings);

  barcodeCapture.addListener({
    didScan: async (_mode, session) => {
      const barcode = session.newlyRecognizedBarcode;
      if (!barcode) return;
      const sym = new SymbologyDescription(barcode.symbology);
      const line = `[${sym.readableName}] ${barcode.data ?? ""}`;
      lastScanEl.textContent = line;
      console.log("scanned:", line);
    },
  });

  // Scandit 8.x: Camera.pickBestGuess() replaces Camera.default
  const camera = Camera.pickBestGuess();
  await camera.applySettings(BarcodeCapture.recommendedCameraSettings);
  await context.setFrameSource(camera);
  await camera.switchToDesiredState(FrameSourceState.On);

  await barcodeCapture.setEnabled(true);
  setStatus("scanning — point at a barcode from sample-barcodes.pdf");
}

startBtn.addEventListener("click", () => {
  startBtn.disabled = true;
  boot().catch((err: unknown) => {
    console.error(err);
    setStatus(`ERROR: ${(err as Error).message ?? String(err)}`);
    startBtn.disabled = false;
  });
});

setStatus("press Start camera");
