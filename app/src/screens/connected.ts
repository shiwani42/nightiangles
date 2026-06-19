import { getProduct } from "../catalog";
import { getList } from "../list";
import {
  Session,
  clearSession,
  loadSession,
  type Member,
  type SessionEvent,
} from "../session";

function escapeHTML(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function timeStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type FeedEntry = { time: string; html: string };

export function renderConnected(root: HTMLElement) {
  const state = loadSession();
  if (!state) {
    location.replace("?screen=connect");
    return;
  }

  const isPartner = state.mode === "partner";

  root.innerHTML = `
    <header>
      <h1>${isPartner ? "Partner session" : "Family session"}</h1>
      <p class="tag">
        Code <strong class="connect-code" id="code">${escapeHTML(state.code)}</strong>
        · you are <strong>${escapeHTML(state.me.emoji)} ${escapeHTML(state.me.name)}</strong>
      </p>
    </header>
    <main class="screen-connected">
      <div class="status" id="status">connecting…</div>

      <section class="card-section">
        <h2>Members</h2>
        <ul class="roster" id="roster"></ul>
      </section>

      <section class="card-section">
        <h2>Activity</h2>
        <ul class="feed" id="feed"><li class="hint">No activity yet.</li></ul>
      </section>

      <section class="card-section">
        <h2>Chat</h2>
        <ul class="chat" id="chat"></ul>
        <form class="chat-form" id="chat-form">
          <input id="chat-input" type="text" placeholder="Say something…" />
          <button class="primary" type="submit">Send</button>
        </form>
      </section>

      <div class="row-buttons">
        <a class="primary" href="?screen=list">Open my shopping</a>
        <button class="link-btn" id="copy">Copy code</button>
        <button class="link-btn" id="share">Share invite link</button>
        <button class="link-btn" id="leave">Leave session</button>
      </div>
    </main>
  `;

  const statusEl = root.querySelector("#status") as HTMLDivElement;
  const rosterEl = root.querySelector("#roster") as HTMLUListElement;
  const feedEl = root.querySelector("#feed") as HTMLUListElement;
  const chatEl = root.querySelector("#chat") as HTMLUListElement;
  const chatForm = root.querySelector("#chat-form") as HTMLFormElement;
  const chatInput = root.querySelector("#chat-input") as HTMLInputElement;
  const copyBtn = root.querySelector("#copy") as HTMLButtonElement;
  const shareBtn = root.querySelector("#share") as HTMLButtonElement;
  const leaveBtn = root.querySelector("#leave") as HTMLButtonElement;

  let members: Member[] = [];
  const feed: FeedEntry[] = [];
  const chat: FeedEntry[] = [];

  function memberById(id: string): Member | undefined {
    return members.find((m) => m.id === id);
  }

  function nameFor(id: string): string {
    const m = memberById(id);
    if (m) return `${m.emoji} ${m.name}`;
    if (id === state!.me.id) return `${state!.me.emoji} ${state!.me.name}`;
    return "Someone";
  }

  function renderRoster() {
    if (members.length === 0) {
      rosterEl.innerHTML = `<li class="hint">Waiting for others…</li>`;
      return;
    }
    rosterEl.innerHTML = members
      .map(
        (m) => `
          <li class="member ${m.id === state!.me.id ? "member--me" : ""}">
            <span class="member__emoji">${escapeHTML(m.emoji)}</span>
            <div class="member__meta">
              <div class="member__name">${escapeHTML(m.name)}${m.id === state!.me.id ? " (you)" : ""}</div>
              <div class="member__zone">📍 ${escapeHTML(m.zone ?? "entry")}</div>
            </div>
          </li>
        `,
      )
      .join("");
  }

  function pushFeed(html: string) {
    feed.unshift({ time: timeStr(), html });
    if (feed.length > 30) feed.pop();
    feedEl.innerHTML = feed
      .map(
        (f) => `<li><span class="feed__time">${f.time}</span> ${f.html}</li>`,
      )
      .join("");
  }

  function pushChat(html: string) {
    chat.push({ time: timeStr(), html });
    if (chat.length > 60) chat.shift();
    chatEl.innerHTML = chat
      .map(
        (c) =>
          `<li><span class="chat__time">${c.time}</span> ${c.html}</li>`,
      )
      .join("");
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  function describeEvent(e: SessionEvent): string {
    const who = nameFor(e.from);
    switch (e.kind) {
      case "list:added": {
        const p = getProduct(e.code);
        return `<strong>${escapeHTML(who)}</strong> added <strong>${escapeHTML(p?.name ?? e.code)}</strong> to the list`;
      }
      case "list:removed": {
        const p = getProduct(e.code);
        return `<strong>${escapeHTML(who)}</strong> removed <strong>${escapeHTML(p?.name ?? e.code)}</strong>`;
      }
      case "scan:found": {
        const p = getProduct(e.code);
        return `✓ <strong>${escapeHTML(who)}</strong> found <strong>${escapeHTML(p?.name ?? e.code)}</strong>`;
      }
      case "vote": {
        return `<strong>${escapeHTML(who)}</strong> voted ${e.vote === "yes" ? "👍" : "👎"} on a product`;
      }
      case "chat":
        return "";
    }
  }

  const session = new Session(
    state.code,
    {
      id: state.me.id,
      name: state.me.name,
      emoji: state.me.emoji,
      zone: "entry",
    },
    {
      onPresence: (m) => {
        members = m;
        renderRoster();
      },
      onEvent: (e) => {
        if (e.kind === "chat") {
          const who = nameFor(e.from);
          pushChat(`<strong>${escapeHTML(who)}</strong> ${escapeHTML(e.text)}`);
        } else {
          pushFeed(describeEvent(e));
        }
      },
    },
  );

  session
    .connect()
    .then(() => {
      statusEl.textContent = "Connected. Share the code to invite people.";
      // Push existing list so newcomers can see context (only the host's view
      // is meaningful; everyone's list is separate locally).
      const list = getList();
      if (list.length > 0) {
        pushFeed(
          `<strong>${escapeHTML(`${state.me.emoji} ${state.me.name}`)}</strong> starts with ${list.length} item${list.length > 1 ? "s" : ""}`,
        );
      }
    })
    .catch((err: unknown) => {
      statusEl.textContent = `ERROR: ${(err as Error).message ?? String(err)}`;
    });

  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    pushChat(
      `<strong>${escapeHTML(`${state.me.emoji} ${state.me.name}`)} (you)</strong> ${escapeHTML(text)}`,
    );
    chatInput.value = "";
    await session.send({ kind: "chat", from: state.me.id, text });
  });

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(state.code);
      copyBtn.textContent = "Copied ✓";
      setTimeout(() => (copyBtn.textContent = "Copy code"), 1500);
    } catch {
      copyBtn.textContent = "Can't copy — code: " + state.code;
    }
  });

  shareBtn.addEventListener("click", async () => {
    const url = `${location.origin}/?screen=connect&code=${state.code}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join my shopping session",
          text: `Open in nightiangles: code ${state.code}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        shareBtn.textContent = "Link copied ✓";
        setTimeout(() => (shareBtn.textContent = "Share invite link"), 1500);
      }
    } catch (err) {
      console.warn(err);
    }
  });

  leaveBtn.addEventListener("click", async () => {
    if (!confirm("Leave this session?")) return;
    await session.disconnect();
    clearSession();
    location.href = "?screen=list";
  });

  window.addEventListener("beforeunload", () => {
    session.disconnect();
  });

  renderRoster();
}
