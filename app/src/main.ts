import "./style.css";
import type { Screen } from "./types";
import { applyPrefs } from "./prefs";
import { renderCompare } from "./screens/compare";
import { renderConnect } from "./screens/connect";
import { renderConnected } from "./screens/connected";
import { renderDone } from "./screens/done";
import { renderListBuilder } from "./screens/list-builder";
import { renderMap } from "./screens/map";
import { renderPlan } from "./screens/plan";
import { renderRepair } from "./screens/repair";
import { renderScan } from "./screens/scan";
import { renderSettings } from "./screens/settings";
import { renderSmoke } from "./screens/smoke";
import { loadSession, initGlobalSession } from "./session";
const VALID_SCREENS: Screen[] = [
  "list",
  "map",
  "scan",
  "done",
  "smoke",
  "plan",
  "compare",
  "repair",
  "connect",
  "connected",
  "settings",
  "fit",
];

function currentScreen(): Screen {
  const requested = new URLSearchParams(location.search).get("screen");
  if (requested && (VALID_SCREENS as string[]).includes(requested)) {
    return requested as Screen;
  }
  return "list";
}

// ─── Bottom Tab Bar ──────────────────────────────────────────────────────────

function mountTabBar() {
  // Don't double-mount
  if (document.getElementById("tab-bar")) return;

  const screen = currentScreen();
  const session = loadSession();

  // Which URL does "Connect" tab point to?
  const connectHref = session ? "?screen=connected" : "?screen=connect";

  function isActive(screens: Screen[]): boolean {
    return screens.includes(screen);
  }

  function tabClass(screens: Screen[], extra = ""): string {
    const active = isActive(screens) ? " tab-btn--active" : "";
    return `tab-btn${active}${extra ? " " + extra : ""}`;
  }

  const bar = document.createElement("nav");
  bar.id = "tab-bar";
  bar.className = "tab-bar";
  bar.setAttribute("aria-label", "Main navigation");
  bar.innerHTML = `
    <div class="tab-bar__inner">
      <a id="tab-home" href="?screen=list"
         class="${tabClass(["list", "done", "map"])}"
         aria-label="Home">
        <span class="tab-btn__icon">🧭</span>
        <span class="tab-btn__label">Home</span>
      </a>

      <a id="tab-plan" href="?screen=plan"
         class="${tabClass(["plan", "compare", "repair"])}"
         aria-label="Plan">
        <span class="tab-btn__icon">🗺️</span>
        <span class="tab-btn__label">Plan</span>
      </a>

      <a id="tab-scan" href="?screen=scan"
         class="${tabClass(["scan", "smoke"], "tab-btn--scan")}"
         aria-label="Scan">
        <span class="tab-btn__icon-wrap">
          <span class="tab-btn__icon">📷</span>
        </span>
        <span class="tab-btn__label">Scan</span>
      </a>

      <a id="tab-connect" href="${connectHref}"
         class="${tabClass(["connect", "connected"])}"
         aria-label="Connect">
        <span class="tab-btn__icon">👥</span>
        <span class="tab-btn__label">Connect</span>
      </a>

      <a id="tab-settings" href="?screen=settings"
         class="${tabClass(["settings", "fit"])}"
         aria-label="Settings">
        <span class="tab-btn__icon">⚙️</span>
        <span class="tab-btn__label">Settings</span>
      </a>
    </div>
  `;

  document.body.appendChild(bar);
}

// ─── Screen router ───────────────────────────────────────────────────────────

function mount() {
  const root = document.getElementById("app");
  if (!root) throw new Error("#app not found");
  const screen = currentScreen();
  switch (screen) {
    case "list":
      renderListBuilder(root);
      break;
    case "smoke":
      renderSmoke(root);
      break;
    case "map":
      renderMap(root);
      break;
    case "scan":
      renderScan(root);
      break;
    case "done":
      renderDone(root);
      break;
    case "plan":
      renderPlan(root);
      break;
    case "compare":
      renderCompare(root);
      break;
    case "repair":
      renderRepair(root);
      break;
    case "connect":
      renderConnect(root);
      break;
    case "connected":
      renderConnected(root);
      break;
    case "settings":
      renderSettings(root);
      break;
    case "fit":
      // dynamically import so the camera/Vision code doesn't load up front
      import("./screens/fit").then(({ renderFit }) => renderFit(root));
      break;
  }

  // Mount tab bar AFTER screen render so session state is up-to-date
  mountTabBar();
}

applyPrefs();
initGlobalSession();
mount();
