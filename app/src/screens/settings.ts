import { applyPrefs, getPrefs, setPrefs, type Prefs } from "../prefs";

function escapeHTML(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const SIZE_OPTIONS: Array<NonNullable<Prefs["topSize"]>> = ["XS", "S", "M", "L", "XL"];
const SHOE_OPTIONS = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45];

export function renderSettings(root: HTMLElement) {
  const p = getPrefs();

  root.innerHTML = `
    <header>
      <h1>Settings</h1>
      <p class="tag">Accessibility, sizes, and preferences.</p>
    </header>
    <main class="screen-settings">
      <section class="card-section" aria-labelledby="a11y-h">
        <h2 id="a11y-h">Accessibility</h2>
        <p class="tag">In-store apps need to work for everyone.</p>

        <label class="toggle">
          <input type="checkbox" id="hc" ${p.highContrast ? "checked" : ""} />
          <span><strong>High contrast</strong><br/><small>Stronger borders, brighter text</small></span>
        </label>

        <label class="toggle">
          <input type="checkbox" id="lt" ${p.largeText ? "checked" : ""} />
          <span><strong>Larger text</strong><br/><small>+25% size across the app</small></span>
        </label>

        <label class="toggle">
          <input type="checkbox" id="rm" ${p.reduceMotion ? "checked" : ""} />
          <span><strong>Reduce motion</strong><br/><small>Disable pulse + flash animations</small></span>
        </label>

        <label class="toggle">
          <input type="checkbox" id="tts" ${p.ttsAnnouncements ? "checked" : ""} />
          <span><strong>Speak scan results</strong><br/><small>Reads product name aloud on each scan</small></span>
        </label>

        <button id="test-tts" class="link-btn">Test voice</button>
      </section>

      <section class="card-section" aria-labelledby="size-h">
        <h2 id="size-h">Your sizes</h2>
        <p class="tag">
          Used to suggest the right variant in your gear lists. You can
          also <a class="inline-link" href="?screen=fit">scan-fit yourself</a> with a photo.
        </p>

        <div class="row-group">
          <label>Top size
            <select id="top-size">
              <option value="">Not set</option>
              ${SIZE_OPTIONS.map((s) => `<option value="${s}" ${p.topSize === s ? "selected" : ""}>${s}</option>`).join("")}
            </select>
          </label>

          <label>Bottom size
            <select id="bottom-size">
              <option value="">Not set</option>
              ${SIZE_OPTIONS.map((s) => `<option value="${s}" ${p.bottomSize === s ? "selected" : ""}>${s}</option>`).join("")}
            </select>
          </label>

          <label>Shoe size (EU)
            <select id="shoe-size">
              <option value="">Not set</option>
              ${SHOE_OPTIONS.map((s) => `<option value="${s}" ${p.shoeSizeEU === s ? "selected" : ""}>${s}</option>`).join("")}
            </select>
          </label>
        </div>

        ${p.sizeSource ? `<p class="tag">Source: ${escapeHTML(p.sizeSource === "fit-check" ? "Fit Check (AI photo)" : "manual entry")}</p>` : ""}
      </section>

      <a class="link-btn" href="?screen=list">← Back</a>
    </main>
  `;

  const bindCheck = (
    id: string,
    field: keyof Prefs,
    extra?: (val: boolean) => void,
  ) => {
    const el = root.querySelector(`#${id}`) as HTMLInputElement;
    el.addEventListener("change", () => {
      const next = setPrefs({ [field]: el.checked } as Partial<Prefs>);
      extra?.(el.checked);
      applyPrefs(next);
    });
  };

  bindCheck("hc", "highContrast");
  bindCheck("lt", "largeText");
  bindCheck("rm", "reduceMotion");
  bindCheck("tts", "ttsAnnouncements");

  (root.querySelector("#test-tts") as HTMLButtonElement).addEventListener(
    "click",
    () => {
      if (!("speechSynthesis" in window)) {
        alert("Speech synthesis isn't supported on this browser.");
        return;
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(
        "Scan announcements will sound like this. Trail shoe by Pinewild, size 42, found.",
      );
      u.rate = 1.05;
      window.speechSynthesis.speak(u);
    },
  );

  (root.querySelector("#top-size") as HTMLSelectElement).addEventListener(
    "change",
    (e) => {
      const val = (e.target as HTMLSelectElement).value;
      setPrefs({
        topSize: (val || null) as Prefs["topSize"],
        sizeSource: val ? "manual" : null,
      });
    },
  );
  (root.querySelector("#bottom-size") as HTMLSelectElement).addEventListener(
    "change",
    (e) => {
      const val = (e.target as HTMLSelectElement).value;
      setPrefs({
        bottomSize: (val || null) as Prefs["bottomSize"],
        sizeSource: val ? "manual" : null,
      });
    },
  );
  (root.querySelector("#shoe-size") as HTMLSelectElement).addEventListener(
    "change",
    (e) => {
      const val = (e.target as HTMLSelectElement).value;
      setPrefs({
        shoeSizeEU: val ? Number(val) : null,
        sizeSource: val ? "manual" : null,
      });
    },
  );
}
