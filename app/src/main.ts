import "./style.css";
import type { Screen } from "./types";
import { renderDone } from "./screens/done";
import { renderListBuilder } from "./screens/list-builder";
import { renderMap } from "./screens/map";
import { renderScan } from "./screens/scan";
import { renderSmoke } from "./screens/smoke";

const VALID_SCREENS: Screen[] = ["list", "map", "scan", "done", "smoke"];

function currentScreen(): Screen {
  const requested = new URLSearchParams(location.search).get("screen");
  if (requested && (VALID_SCREENS as string[]).includes(requested)) {
    return requested as Screen;
  }
  return "list";
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
      renderScan(root);
      break;
    case "done":
      renderDone(root);
      break;
  }
}

mount();
