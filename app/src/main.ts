import "./style.css";
import type { Screen } from "./types";
import { renderListBuilder } from "./screens/list-builder";
import { renderMap } from "./screens/map";
import { renderSmoke } from "./screens/smoke";

const VALID_SCREENS: Screen[] = ["list", "map", "scan", "done", "smoke"];

function currentScreen(): Screen {
  const requested = new URLSearchParams(location.search).get("screen");
  if (requested && (VALID_SCREENS as string[]).includes(requested)) {
    return requested as Screen;
  }
  return "list";
}

function renderNotYet(root: HTMLElement, title: string, note: string) {
  root.innerHTML = `
    <header>
      <h1>${title}</h1>
      <p class="tag">${note}</p>
    </header>
    <main>
      <div class="status">This screen ships in the next phase.</div>
      <a class="primary" href="?screen=list">← Back to list</a>
    </main>
  `;
}

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
      renderNotYet(root, "Scan the shelf", "BarcodeFind view — Phase 3.");
      break;
    case "done":
      renderNotYet(root, "All set", "Done screen — Phase 4.");
      break;
  }
}

mount();
