import {
  Camera,
  CameraPosition,
  CameraSwitchControl,
  DataCaptureContext,
  DataCaptureView,
  FrameSourceState,
  Feedback,
} from "@scandit/web-datacapture-core";
import {
  barcodeCaptureLoader,
  BarcodeCapture,
  BarcodeCaptureSettings,
  Symbology,
} from "@scandit/web-datacapture-barcode";
import { getProduct } from "../catalog";
import { repairProgramFor, type RepairProgram } from "../repair-programs";
import type { Product } from "../types";

const LICENSE_KEY = import.meta.env.VITE_SCANDIT_LICENSE_KEY as
  | string
  | undefined;

function escapeHTML(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function decide(p: Product, prog: RepairProgram): {
  recommendation: "Repair" | "Replace" | "Either";
  reasoning: string;
} {
  const median = prog.repairCostBands.medium;
  const ratio = median / p.price_chf;
  if (ratio < 0.25)
    return {
      recommendation: "Repair",
      reasoning: `Median repair (~CHF ${median}) is just ${Math.round(ratio * 100)}% of a new one (CHF ${p.price_chf.toFixed(0)}). Keep what you have.`,
    };
  if (ratio < 0.6)
    return {
      recommendation: "Either",
      reasoning: `Repair (~CHF ${median}) is ${Math.round(ratio * 100)}% of new (CHF ${p.price_chf.toFixed(0)}). Worth fixing if it has sentimental or break-in value.`,
    };
  return {
    recommendation: "Replace",
    reasoning: `Repair (~CHF ${median}) is ${Math.round(ratio * 100)}% of new (CHF ${p.price_chf.toFixed(0)}). Replacement makes economic sense unless damage is purely cosmetic.`,
  };
}

function repairCard(p: Product, prog: RepairProgram): string {
  const accepted = prog.acceptedCategories.includes(p.category);
  if (!accepted) {
    return `
      <div class="diff-card">
        <h3>${escapeHTML(prog.brand)} doesn't repair ${escapeHTML(p.category)} products</h3>
        <p class="diff-card__lead">${escapeHTML(prog.programName)} accepts: ${prog.acceptedCategories.map((c) => `<code>${escapeHTML(c)}</code>`).join(", ")}.</p>
      </div>
    `;
  }
  const { recommendation, reasoning } = decide(p, prog);
  const recColor =
    recommendation === "Repair"
      ? "var(--ok)"
      : recommendation === "Replace"
        ? "var(--bad)"
        : "var(--warn)";
  return `
    <div class="diff-card">
      <h3>${escapeHTML(prog.programName)}</h3>
      <p class="diff-card__lead">${escapeHTML(prog.pitch)}</p>

      <div class="repair-rec" style="border-color:${recColor}">
        <div class="repair-rec__label" style="color:${recColor}">${recommendation}</div>
        <div class="repair-rec__reasoning">${escapeHTML(reasoning)}</div>
      </div>

      <ul class="diff-list">
        <li>
          <span class="diff-list__label">Minor (re-stitch / patch)</span>
          <span class="diff-list__delta">~CHF ${prog.repairCostBands.minor}</span>
        </li>
        <li>
          <span class="diff-list__label">Medium (zipper / lining / DWR)</span>
          <span class="diff-list__delta">~CHF ${prog.repairCostBands.medium}</span>
        </li>
        <li>
          <span class="diff-list__label">Major (membrane / sole / panel)</span>
          <span class="diff-list__delta">~CHF ${prog.repairCostBands.major}</span>
        </li>
        <li>
          <span class="diff-list__label">New one costs</span>
          <span class="diff-list__delta">CHF ${p.price_chf.toFixed(0)}</span>
        </li>
        <li>
          <span class="diff-list__label">Turnaround</span>
          <span class="diff-list__delta">${escapeHTML(prog.turnaroundDays)} days</span>
        </li>
        ${
          prog.perk
            ? `<li>
                <span class="diff-list__label">Perk</span>
                <span class="diff-list__delta" style="color:var(--ok)">${escapeHTML(prog.perk)}</span>
              </li>`
            : ""
        }
      </ul>

      <a class="primary" href="${escapeHTML(prog.url)}" target="_blank" rel="noreferrer noopener">
        Start a repair with ${escapeHTML(prog.brand)}
      </a>
    </div>
  `;
}

export function renderRepair(root: HTMLElement) {
  root.innerHTML = `
    <header>
      <h1>Repair or replace?</h1>
      <p class="tag">Scan a product. We'll show the brand's repair option and the math.</p>
    </header>
    <main class="screen-compare">
      <div id="status" class="status">tap "Scan a product" to start</div>
      <div id="capture-view" class="compare-cam"></div>
      <button class="primary" id="scan-btn">Scan a product</button>
      <div id="result"></div>
      <a class="link-btn" href="?screen=list">← Back</a>
    </main>
  `;

  const statusEl = root.querySelector("#status") as HTMLDivElement;
  const captureViewEl = root.querySelector("#capture-view") as HTMLDivElement;
  const resultEl = root.querySelector("#result") as HTMLDivElement;
  const scanBtn = root.querySelector("#scan-btn") as HTMLButtonElement;

  function setStatus(msg: string) {
    statusEl.textContent = msg;
  }

  let initialized = false;
  let barcodeCapture: BarcodeCapture | null = null;

  async function initScanner() {
    if (initialized) return;
    if (!LICENSE_KEY) {
      setStatus("ERROR: VITE_SCANDIT_LICENSE_KEY missing");
      return;
    }
    setStatus("loading scanner…");
    const context = await DataCaptureContext.forLicenseKey(LICENSE_KEY, {
      libraryLocation:
        "https://cdn.jsdelivr.net/npm/@scandit/web-datacapture-barcode@8/sdc-lib/",
      moduleLoaders: [barcodeCaptureLoader()],
    });

    const view = new DataCaptureView();
    view.connectToElement(captureViewEl);
    await view.setContext(context);
    view.addControl(new CameraSwitchControl());

    const camera = Camera.pickBestGuessForPosition(CameraPosition.WorldFacing);
    await camera.applySettings(BarcodeCapture.recommendedCameraSettings);
    await context.setFrameSource(camera);
    await camera.switchToDesiredState(FrameSourceState.On);

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
    barcodeCapture = await BarcodeCapture.forContext(context, settings);
    const feedback = Feedback.defaultFeedback;

    barcodeCapture.addListener({
      didScan: async (_mode, session) => {
        const barcode = session.newlyRecognizedBarcode;
        if (!barcode || !barcodeCapture) return;
        const code = barcode.data ?? "";
        const product = getProduct(code);
        if (!product) {
          setStatus(`Code "${code}" not in catalog — try another.`);
          return;
        }
        feedback.emit();
        if ("vibrate" in navigator) navigator.vibrate(60);
        await barcodeCapture.setEnabled(false);
        captureViewEl.classList.remove("compare-cam--active");
        scanBtn.textContent = "Scan another product";
        setStatus(
          `Scanned: ${product.name} · ${product.brand} · size ${product.size}`,
        );
        const prog = repairProgramFor(product.brand);
        if (!prog) {
          resultEl.innerHTML = `
            <div class="diff-card">
              <h3>No repair program on file</h3>
              <p class="diff-card__lead">${escapeHTML(product.brand)} hasn't published a repair workflow yet. Replacement cost: <strong>CHF ${product.price_chf.toFixed(0)}</strong>.</p>
            </div>
          `;
          return;
        }
        resultEl.innerHTML = repairCard(product, prog);
      },
    });

    initialized = true;
  }

  scanBtn.addEventListener("click", async () => {
    try {
      await initScanner();
      if (!barcodeCapture) return;
      captureViewEl.classList.add("compare-cam--active");
      await barcodeCapture.setEnabled(true);
      setStatus("Point at a product barcode…");
    } catch (err) {
      setStatus(`ERROR: ${(err as Error).message ?? String(err)}`);
    }
  });
}
