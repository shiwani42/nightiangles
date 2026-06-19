import {
  supabaseConfigured,
  saveSession,
  loadSession,
  newCode,
  randomEmoji,
  randomId,
  type Mode,
} from "../session";

function escapeHTML(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderConnect(root: HTMLElement) {
  const existing = loadSession();
  const joinCode =
    new URLSearchParams(location.search).get("code")?.toUpperCase() ?? "";

  if (!supabaseConfigured) {
    root.innerHTML = `
      <header>
        <h1>Connect</h1>
        <p class="tag">Real-time shopping with family or a partner at home.</p>
      </header>
      <main>
        <div class="status">
          ERROR: Supabase isn't configured. Set
          <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>
          in Render and redeploy.
        </div>
        <a class="link-btn" href="?screen=list">← Back</a>
      </main>
    `;
    return;
  }

  root.innerHTML = `
    <header>
      <h1>Connect<span class="brand-accent"> 👥</span></h1>
      <p class="tag">Shop together in real time.</p>
    </header>
    <main class="screen-connect">
      ${
        existing
          ? `
        <div class="connect-banner">
          Active: <strong>${escapeHTML(existing.code)}</strong> as
          <strong>${escapeHTML(existing.me.emoji)} ${escapeHTML(existing.me.name)}</strong>
          (${escapeHTML(existing.mode)})
          <a class="primary" style="padding:8px 16px;font-size:13px" href="?screen=connected">Open →</a>
          <button class="link-btn" id="leave">Leave</button>
        </div>
      `
          : ""
      }

      <section class="card-section">
        <h2>Create a session</h2>
        <p class="tag" style="margin-bottom:12px">You become the host. Share the code with people who join.</p>
        <div class="row-group">
          <label>Your name <input id="create-name" type="text" placeholder="e.g. Shiwani" /></label>
        </div>
        <p class="section-label">Session mode</p>
        <div class="mode-cards">
          <label class="mode-card mode-card--active" id="mode-family-card">
            <input type="radio" name="mode" value="family" checked style="display:none" />
            <span class="mode-card__icon">🏪</span>
            <span class="mode-card__title">In Store</span>
            <span class="mode-card__sub">Everyone shops together</span>
          </label>
          <label class="mode-card" id="mode-partner-card">
            <input type="radio" name="mode" value="partner" style="display:none" />
            <span class="mode-card__icon">🏠</span>
            <span class="mode-card__title">At Home</span>
            <span class="mode-card__sub">Partner votes remotely</span>
          </label>
        </div>
        <button id="create-btn" class="primary" style="margin-top:14px">Create session</button>
      </section>

      <section class="card-section">
        <h2>Join a session</h2>
        <p class="tag" style="margin-bottom:12px">Enter the code someone shared with you.</p>
        <div class="row-group">
          <label>Code <input id="join-code" type="text" placeholder="FAM-A4T7" value="${escapeHTML(joinCode)}" autocapitalize="characters" /></label>
          <label>Your name <input id="join-name" type="text" placeholder="e.g. Alex" /></label>
        </div>
        <button id="join-btn" class="primary">Join session</button>
      </section>

      <a class="link-btn" href="?screen=list">← Back to shopping</a>
    </main>
  `;

  const createBtn = root.querySelector("#create-btn") as HTMLButtonElement;
  const joinBtn = root.querySelector("#join-btn") as HTMLButtonElement;
  const leaveBtn = root.querySelector("#leave") as HTMLButtonElement | null;
  const modeFamilyCard = root.querySelector("#mode-family-card") as HTMLLabelElement | null;
  const modePartnerCard = root.querySelector("#mode-partner-card") as HTMLLabelElement | null;

  // Mode card visual toggle (radio inputs are hidden)
  function syncModeCards() {
    const checked = (root.querySelector('input[name="mode"]:checked') as HTMLInputElement)?.value;
    modeFamilyCard?.classList.toggle("mode-card--active", checked === "family");
    modePartnerCard?.classList.toggle("mode-card--active", checked === "partner");
  }
  modeFamilyCard?.addEventListener("click", () => { setTimeout(syncModeCards, 0); });
  modePartnerCard?.addEventListener("click", () => { setTimeout(syncModeCards, 0); });

  createBtn.addEventListener("click", () => {
    const name =
      (root.querySelector("#create-name") as HTMLInputElement).value.trim() ||
      "Host";
    const mode =
      ((root.querySelector('input[name="mode"]:checked') as HTMLInputElement)
        ?.value as Mode) ?? "family";
    const code = newCode(mode === "family" ? "FAM" : "PAR");
    saveSession({
      code,
      mode,
      me: { id: randomId(), name, emoji: randomEmoji() },
    });
    location.href = "?screen=connected";
  });

  joinBtn.addEventListener("click", () => {
    let code = (
      root.querySelector("#join-code") as HTMLInputElement
    ).value
      .trim()
      .toUpperCase();
    if (!/^(FAM|PAR)-[A-Z0-9]{4}$/.test(code)) {
      alert("Code looks wrong — should be like FAM-A4T7 or PAR-J2KP.");
      return;
    }
    const name =
      (root.querySelector("#join-name") as HTMLInputElement).value.trim() ||
      "Guest";
    const mode: Mode = code.startsWith("PAR") ? "partner" : "family";
    saveSession({
      code,
      mode,
      me: { id: randomId(), name, emoji: randomEmoji() },
    });
    location.href = "?screen=connected";
  });

  leaveBtn?.addEventListener("click", () => {
    if (!confirm("Leave this session?")) return;
    sessionStorage.removeItem("nightiangles.session");
    location.reload();
  });
}
