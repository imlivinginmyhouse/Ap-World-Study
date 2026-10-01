(() => {
  "use strict";

  /* ================= Section settings ================= */
  const CFG = {
    review: {
      blurb: "Fill in the missing key term",
      fr: "Type the missing term.",
      mcA: "Which term fills the blank?",
      what: "topic"
    },
    timeline: {
      blurb: "When each state formed and fell",
      fr: "When did this state exist, from formation to collapse?",
      mcA: "Which dates match this state?",
      what: "state"
    },
    formation: {
      blurb: "How each state formed",
      fr: "How did this state form?",
      mcA: "Which of these is true about how it formed?",
      mcB: "Which state's formation does this describe?",
      what: "state"
    },
    expansion: {
      blurb: "How each state grew",
      fr: "How did this state expand?",
      mcA: "Which of these is true about how it expanded?",
      mcB: "Which state's expansion does this describe?",
      what: "state"
    },
    collapse: {
      blurb: "Why each state declined or fell",
      fr: "Why did this state decline or collapse?",
      mcA: "Which of these is true about its decline or collapse?",
      mcB: "Which state's decline or collapse does this describe?",
      what: "state"
    },
    beliefs: {
      blurb: "How religion and ideas shaped each state",
      fr: "How did belief systems shape this state?",
      mcA: "Which of these is true about its belief systems?",
      mcB: "Which state's belief systems does this describe?",
      what: "state"
    },
    centralization: {
      blurb: "How power was organized and why it mattered",
      fr: "Was this state centralized or decentralized? Explain why, and how that affected it.",
      mcA: "Which of these is true about how its power was organized?",
      mcB: "Which state's political organization does this describe?",
      mcType: "How was political power organized in this state?",
      what: "state"
    },
    legitimacy: {
      blurb: "How rulers justified their power",
      fr: "How did this state gain legitimacy?",
      mcA: "Which of these is true about how it gained legitimacy?",
      mcB: "Which state's legitimacy does this describe?",
      what: "state"
    }
  };
  const FALLBACK_CFG = {
    blurb: "Key facts",
    fr: "What do you know about this?",
    mcA: "Which of these belongs to this card?",
    mcB: "Which one does this describe?",
    what: "card"
  };
  const cfgFor = (key) => CFG[key] || FALLBACK_CFG;

  const DEFAULT_MODELS = { claude: "claude-haiku-4-5-20251001", gemini: "gemini-3.8-flash" };
  const RETIRED_MODELS = { gemini: ["gemini-2.5-flash", "gemini-2.0-flash"] };

  /* ================= Helpers ================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const app = $("#app");

  const esc = (s) => String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function titleCase(str) {
    return str.split(" ").map((word, i) => {
      if (word === "&") return word;
      if (word === "AND" || (word === "OF" && i > 0)) return word.toLowerCase();
      if (word.length <= 2) return word;
      return word.split("-").map((p) => (p === "AL" ? "al" : p.charAt(0) + p.slice(1).toLowerCase())).join("-");
    }).join(" ");
  }

  const GENERIC_NAME_WORDS = new Set([
    "empire", "kingdom", "kingdoms", "dynasty", "caliphate", "sultanate", "city-states", "states",
    "state", "the", "of", "and", "great", "khanate", "confederacy", "holy", "roman"
  ]);
  function nameWords(title) {
    return title.toLowerCase()
      .replace(/[()]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !GENERIC_NAME_WORDS.has(w));
  }
  function mentions(text, words) {
    const t = text.toLowerCase();
    return words.some((w) => t.includes(w));
  }
  function maskName(text, words) {
    let out = text;
    words.forEach((w) => {
      out = out.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "____");
    });
    return out;
  }

  /* ================= Motion ================= */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const blurNode = document.getElementById("mbNode");
  const easeIn = (t) => t * t * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 4);

  // Slides an element horizontally with real directional motion blur based on its speed.
  function motionSlide(el, fromX, toX, fromO, toO, dur, ease) {
    return new Promise((resolve) => {
      if (reduceMotion || !el || !blurNode) { resolve(); return; }
      let start = null;
      let lastX = fromX;
      el.style.filter = "url(#motion-blur)";
      el.style.transform = `translateX(${fromX}px)`;
      el.style.opacity = fromO;
      const step = (ts) => {
        if (start === null) start = ts;
        const p = Math.min(1, (ts - start) / dur);
        const e = ease(p);
        const x = fromX + (toX - fromX) * e;
        const speed = Math.abs(x - lastX);
        lastX = x;
        const blur = Math.min(40, speed * 1.4);
        blurNode.setAttribute("stdDeviation", `${blur.toFixed(1)} 0`);
        const stretch = 1 + Math.min(0.06, speed / 900);
        el.style.transform = `translateX(${x}px) scaleX(${stretch})`;
        el.style.opacity = fromO + (toO - fromO) * e;
        if (p < 1) requestAnimationFrame(step);
        else {
          blurNode.setAttribute("stdDeviation", "0 0");
          el.style.filter = "";
          el.style.transform = "";
          el.style.opacity = "";
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  function countUp(el, to, dur = 900) {
    if (!el) return;
    if (reduceMotion) { el.textContent = to; return; }
    let start = null;
    const step = (ts) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      el.textContent = Math.round(to * easeOut(p));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Letters resolve from random glyphs, left to right.
  function decodeText(el, dur = 1100) {
    if (!el || reduceMotion) return;
    const final = el.textContent;
    const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&<>/";
    let start = null;
    const step = (ts) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      const solved = Math.floor(final.length * p);
      let out = "";
      for (let i = 0; i < final.length; i++) {
        const ch = final[i];
        out += i < solved || ch === " " ? ch : glyphs[Math.floor(Math.random() * glyphs.length)];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(step); else el.textContent = final;
    };
    requestAnimationFrame(step);
  }

  // Cursor spotlight on the background
  if (!reduceMotion) {
    const spot = document.querySelector(".bg-spot");
    window.addEventListener("pointermove", (e) => {
      if (!spot) return;
      spot.style.setProperty("--cx", `${e.clientX}px`);
      spot.style.setProperty("--cy", `${e.clientY}px`);
    }, { passive: true });
  }

  function wireTilt(root) {
    if (reduceMotion || !window.matchMedia("(hover: hover)").matches) return;
    root.querySelectorAll(".deck").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.setProperty("--ry", `${(px - 0.5) * 14}deg`);
        el.style.setProperty("--rx", `${(0.5 - py) * 12}deg`);
        el.style.setProperty("--mx", `${px * 100}%`);
        el.style.setProperty("--my", `${py * 100}%`);
      });
      el.addEventListener("pointerleave", () => {
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
      });
    });
  }

  const stripMarks = (s) => s.replace(/\[\[(.+?)\]\]/g, "$1");

  // Centralization labels grouped into answer choices
  const ORG_TYPES = ["Centralized", "Decentralized", "Centralized → Decentralized", "Decentralized → Centralized", "Mixed (partly centralized)"];
  function orgType(tag) {
    if (tag.includes("→")) return /^\s*decentralized/i.test(tag) ? ORG_TYPES[3] : ORG_TYPES[2];
    if (/mixed|partly|moderately|in theory|core|with local/i.test(tag)) return ORG_TYPES[4];
    if (/decentralized/i.test(tag)) return ORG_TYPES[1];
    return ORG_TYPES[0];
  }

  // "the Song Dynasty", "the Inca Empire", but "Kilwa", "France"
  const the = (title) => /\b(dynasty|empire|caliphate|kingdoms?|sultanate|city-states|confederacy|puebloans|khanate|ilkhanate)\b/i.test(title) ? `the ${title}` : title;

  /* ================= Parse notes ================= */
  function parseNotes(raw) {
    const sections = [];
    let sec = null, reg = null, item = null;
    raw.split("\n").forEach((line) => {
      const t = line.trim();
      if (!t) return;
      if (t.startsWith("# ")) {
        const [name, key] = t.slice(2).split("|").map((s) => s.trim());
        sec = { name, key: key || name.toLowerCase().replace(/\W+/g, "-"), regions: [] };
        sections.push(sec);
        reg = null; item = null;
      } else if (t.startsWith("## ") && sec) {
        reg = { name: titleCase(t.slice(3).trim()), items: [] };
        sec.regions.push(reg);
        item = null;
      } else if (t.startsWith("### ") && reg) {
        const [title, tag] = t.slice(4).split(" | ").map((x) => x.trim());
        item = { title, tag: tag || "", bullets: [] };
        reg.items.push(item);
      } else if (t.startsWith("- ") && sec) {
        const text = t.slice(2).trim();
        if (sec.key === "timeline" && reg) {
          const i = text.indexOf(": ");
          if (i > 0) reg.items.push({ title: text.slice(0, i), bullets: [text.slice(i + 2)] });
        } else if (item) {
          item.bullets.push(text);
        }
      }
    });
    return sections;
  }

  const SECTIONS = parseNotes(typeof NOTES === "string" ? NOTES : "");
  const ALL_CARDS = [];
  const CARDS_BY_SECTION = {};
  SECTIONS.forEach((sec) => {
    CARDS_BY_SECTION[sec.key] = [];
    sec.regions.forEach((reg) => {
      reg.items.forEach((it, idx) => {
        if (!it.bullets.length) return;
        const plain = it.bullets.map(stripMarks);
        if (sec.key === "review") {
          // One fill-in-the-blank card per marked note
          it.bullets.forEach((b, bi) => {
            const m = b.match(/\[\[(.+?)\]\]/);
            if (!m) return;
            const card = {
              id: `${sec.key}::${reg.name}::${it.title}::${idx}::${bi}`,
              secKey: sec.key,
              secName: sec.name,
              region: reg.name,
              title: it.title,
              bullets: [stripMarks(b)],
              related: plain.filter((_, j) => j !== bi),
              cloze: {
                before: stripMarks(b.slice(0, m.index)),
                answer: m[1],
                after: stripMarks(b.slice(m.index + m[0].length))
              }
            };
            CARDS_BY_SECTION[sec.key].push(card);
            ALL_CARDS.push(card);
          });
          return;
        }
        const card = {
          id: `${sec.key}::${reg.name}::${it.title}::${idx}`,
          secKey: sec.key,
          secName: sec.name,
          region: reg.name,
          title: it.title,
          tag: it.tag,
          bullets: plain
        };
        CARDS_BY_SECTION[sec.key].push(card);
        ALL_CARDS.push(card);
      });
    });
  });

  // Look up the same state in other decks (dates, formation, collapse) for richer explanations
  const BY_TITLE = {};
  ALL_CARDS.forEach((c) => {
    if (c.cloze) return;
    (BY_TITLE[c.title] = BY_TITLE[c.title] || {})[c.secKey] = c;
  });
  const datesOf = (title) => (BY_TITLE[title] && BY_TITLE[title].timeline) ? BY_TITLE[title].timeline.bullets[0] : "";
  const firstFact = (title, key) => (BY_TITLE[title] && BY_TITLE[title][key]) ? BY_TITLE[title][key].bullets[0] : "";
  // Lowercase a fact's first letter only when it's an ordinary word (keeps "Sui", "Tula", "Protestant Reformation")
  const CORPUS_LOWER = new Set();
  ALL_CARDS.forEach((c) => c.bullets.forEach((b) => (b.match(/\b[a-z][a-z'-]+\b/g) || []).forEach((w) => CORPUS_LOWER.add(w))));
  const lower1 = (s) => {
    if (!s) return s;
    const [w1, w2] = s.split(/\s+/);
    const common = CORPUS_LOWER.has(w1.toLowerCase().replace(/[^a-z'-]/g, ""));
    const nextCapital = w2 && /^[A-Z]/.test(w2);
    return common && !nextCapital ? s.charAt(0).toLowerCase() + s.slice(1) : s;
  };
  const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const list = (arr) => arr.filter(Boolean).join("; ");
  const dropLabel = (s) => s.replace(/^(why( centralized| decentralized| it changed)?|influence):\s*/i, "");

  const DECKS = SECTIONS.map((sec) => ({
    key: sec.key,
    name: sec.name,
    blurb: cfgFor(sec.key).blurb,
    cards: CARDS_BY_SECTION[sec.key]
  })).filter((d) => d.cards.length);
  DECKS.push({
    key: "__all",
    name: "Everything mixed",
    blurb: "Every card from every deck",
    cards: ALL_CARDS,
    mixed: true
  });

  /* ================= Settings ================= */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } }
  };
  function getSettings() {
    const provider = store.get("apw.provider", "none");
    let model = store.get("apw.model", DEFAULT_MODELS[provider] || "");
    // Swap out models Google has retired so saved settings keep working
    if ((RETIRED_MODELS[provider] || []).includes(model)) {
      model = DEFAULT_MODELS[provider];
      store.set("apw.model", model);
    }
    return { provider, key: store.get("apw.key", ""), model };
  }
  const aiReady = () => { const s = getSettings(); return s.provider !== "none" && !!s.key; };

  function refreshAiBadge() {
    const s = getSettings();
    const on = aiReady();
    $("#aiDot").classList.toggle("on", on);
    $("#aiLabel").textContent = on ? `AI grading: ${s.provider === "claude" ? "Claude" : "Gemini"}` : "AI grading off";
  }

  const dlg = $("#settings");
  function updateKeyHelp() {
    const p = $("#provider").value;
    const help = $("#keyHelp");
    const model = $("#model");
    if (p === "gemini") {
      help.innerHTML = 'Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a>. If the model name stops working, check Google\'s model list for a current one.';
    } else if (p === "claude") {
      help.innerHTML = 'Create a key at <a href="https://console.anthropic.com/" target="_blank" rel="noopener">console.anthropic.com</a>. The Claude API is paid per use; grading one answer costs a fraction of a cent.';
    } else {
      help.textContent = "Keyword matching checks which key facts your answer covers. It can't tell when a fact is wrong.";
    }
    const disabled = p === "none";
    $("#apiKey").disabled = disabled;
    model.disabled = disabled;
    model.placeholder = DEFAULT_MODELS[p] || "";
  }
  function openSettings() {
    const s = getSettings();
    $("#provider").value = s.provider;
    $("#apiKey").value = s.key;
    $("#model").value = s.provider === "none" ? "" : s.model;
    updateKeyHelp();
    dlg.showModal();
  }
  $("#provider").addEventListener("change", () => {
    const p = $("#provider").value;
    $("#model").value = DEFAULT_MODELS[p] || "";
    updateKeyHelp();
  });
  $("#settingsForm").addEventListener("submit", () => {
    const p = $("#provider").value;
    store.set("apw.provider", p);
    store.set("apw.key", $("#apiKey").value.trim());
    store.set("apw.model", $("#model").value.trim() || DEFAULT_MODELS[p] || "");
    refreshAiBadge();
    if (state.view === "home") renderHome();
  });
  $("#clearKey").addEventListener("click", () => {
    store.del("apw.key");
    store.set("apw.provider", "none");
    $("#apiKey").value = "";
    $("#provider").value = "none";
    updateKeyHelp();
    refreshAiBadge();
  });
  $("#settingsBtn").addEventListener("click", openSettings);
  $("#homeBtn").addEventListener("click", () => renderHome());

  /* ================= State ================= */
  const state = {
    view: "home",
    deck: null,
    session: null
  };

  function focusMain() { app.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); }

  /* ================= Home ================= */
  function renderHome() {
    state.view = "home";
    state.session = null;
    const note = aiReady() ? "" : `
      <div class="ai-note">
        <p>Free-response answers are checked by keyword matching right now. Add an API key to get AI feedback on what you missed and what's wrong.</p>
        <button class="btn-on-desk" type="button" data-action="settings">Set up AI grading</button>
      </div>`;
    app.innerHTML = `
      <section class="home-head">
        <h1 id="heroTitle">Pick a deck. Start studying.</h1>
        <p>Test yourself on how states across the world formed, expanded, held power, and fell. Choose in-order or shuffled, then answer by multiple choice or in your own words.</p>
        <div class="stats">
          <span><b data-count="${ALL_CARDS.length}">0</b>cards</span>
          <span><b data-count="${DECKS.length - 1}">0</b>decks</span>
          <span><b data-count="${new Set(ALL_CARDS.filter((c) => c.secKey !== "review").map((c) => c.region)).size}">0</b>regions</span>
        </div>
      </section>
      ${note}
      <div class="deck-grid">
        ${DECKS.map((d, i) => {
          const counts = {};
          d.cards.forEach((c) => { counts[c.region] = (counts[c.region] || 0) + 1; });
          const bar = Object.entries(counts).map(([r, n]) => `<i style="flex:${n}" title="${esc(r)}: ${n}"></i>`).join("");
          return `
          <button class="deck${d.mixed ? " mixed" : ""}" type="button" data-deck="${esc(d.key)}" style="--i:${i}">
            <span class="deck-face">
              <span class="deck-top"><span class="deck-count-big">${d.cards.length}</span><span class="deck-unit">cards</span></span>
              <span class="deck-title">${esc(d.name)}</span>
              <span class="deck-blurb">${esc(d.blurb)}</span>
              <span class="region-bar" aria-hidden="true">${bar}</span>
              <span class="shine" aria-hidden="true"></span>
            </span>
          </button>`;
        }).join("")}
      </div>`;
    app.querySelectorAll("[data-deck]").forEach((b) =>
      b.addEventListener("click", () => renderSetup(DECKS.find((d) => d.key === b.dataset.deck))));
    const s = app.querySelector('[data-action="settings"]');
    if (s) s.addEventListener("click", openSettings);
    wireTilt(app);
    if (!state.introDone) {
      state.introDone = true;
      decodeText($("#heroTitle"));
      app.querySelectorAll("[data-count]").forEach((el) => countUp(el, Number(el.dataset.count), 1200));
    } else {
      app.querySelectorAll("[data-count]").forEach((el) => { el.textContent = el.dataset.count; });
    }
    focusMain();
  }

  /* ================= Setup ================= */
  function renderSetup(deck) {
    state.view = "setup";
    state.deck = deck;
    const regions = [...new Set(deck.cards.map((c) => c.region))];
    const lastOrder = store.get("apw.order", "ordered");
    const lastMode = store.get("apw.mode", "mc");
    app.innerHTML = `
      <button class="back-link" type="button" data-action="home">Back to decks</button>
      <section class="sheet">
        <div class="sheet-head">
          <p class="kicker">${deck.cards.length} cards</p>
          <h1 class="sheet-title">${esc(deck.name)}</h1>
        </div>
        <form class="sheet-body" id="setupForm">
          <label class="field">
            <span>Region</span>
            <select name="region">
              <option value="__all">All regions (${deck.cards.length} cards)</option>
              ${regions.map((r) => `<option value="${esc(r)}">${esc(r)} (${deck.cards.filter((c) => c.region === r).length} cards)</option>`).join("")}
            </select>
          </label>

          <fieldset class="setup-group">
            <legend>Order</legend>
            <div class="segmented">
              <label><input type="radio" name="order" value="ordered" ${lastOrder === "ordered" ? "checked" : ""}>
                <span class="seg"><strong>In order</strong><small>Grouped by region</small></span></label>
              <label><input type="radio" name="order" value="shuffled" ${lastOrder === "shuffled" ? "checked" : ""}>
                <span class="seg"><strong>Shuffled</strong><small>Random order every time</small></span></label>
            </div>
          </fieldset>

          <fieldset class="setup-group">
            <legend>Answer style</legend>
            <div class="segmented">
              <label><input type="radio" name="mode" value="mc" ${lastMode === "mc" ? "checked" : ""}>
                <span class="seg"><strong>Multiple choice</strong><small>See why every option is right or wrong</small></span></label>
              <label><input type="radio" name="mode" value="fr" ${lastMode === "fr" ? "checked" : ""}>
                <span class="seg"><strong>Free response</strong><small>${aiReady() ? "Graded by AI" : "Checked by keyword matching"}</small></span></label>
            </div>
          </fieldset>

          <div class="setup-actions">
            <button class="btn-primary" type="submit">Start studying</button>
          </div>
        </form>
      </section>`;
    app.querySelector('[data-action="home"]').addEventListener("click", renderHome);
    $("#setupForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const region = f.get("region");
      const order = f.get("order");
      const mode = f.get("mode");
      store.set("apw.order", order);
      store.set("apw.mode", mode);
      let cards = deck.cards.filter((c) => region === "__all" || c.region === region);
      if (order === "shuffled") cards = shuffle(cards);
      startSession({ deck, cards, order, mode, regionLabel: region === "__all" ? "All regions" : region });
    });
    focusMain();
  }

  /* ================= Session ================= */
  function startSession(opts) {
    state.view = "study";
    state.session = {
      ...opts,
      idx: 0,
      results: [],     // { card, correct, score }
      current: null    // per-card UI state
    };
    renderCard();
  }

  function renderCard(enter = false) {
    const s = state.session;
    if (s.idx >= s.cards.length) return renderSummary();
    const card = s.cards[s.idx];
    s.current = { card, answered: false };
    if (s.mode === "mc") s.current.mc = buildMC(card);

    const cfg = cfgFor(card.secKey);
    const hideTitle = s.mode === "mc" && s.current.mc.kind === "identify";
    const pct = Math.round((s.idx / s.cards.length) * 100);

    app.innerHTML = `
      <div class="study-bar">
        <button class="back-link" type="button" data-action="quit">End session</button>
        <span>Card ${s.idx + 1} of ${s.cards.length}</span>
      </div>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${s.cards.length}" aria-valuenow="${s.idx}" aria-label="Progress"><span style="width:${pct}%"></span></div>
      <section class="sheet" aria-live="polite">
        <div class="sheet-head">
          <p class="kicker">${esc(card.secName)}, ${esc(card.region)}</p>
          <h1 class="sheet-title">${hideTitle ? `Mystery ${esc(cfg.what)}` : esc(card.title)}</h1>
        </div>
        <div class="sheet-body" id="cardBody"></div>
      </section>`;
    app.querySelector('[data-action="quit"]').addEventListener("click", () => {
      if (s.results.length) renderSummary(); else renderSetup(s.deck);
    });

    if (s.mode === "mc") renderMC(); else renderFR();
    focusMain();
    if (enter) {
      const sheet = app.querySelector(".sheet");
      const w = Math.min(window.innerWidth * 0.55, 620);
      state.animating = true;
      motionSlide(sheet, w, 0, 0, 1, 520, easeOut).then(() => { state.animating = false; });
    }
  }

  function recordAndNext(result) {
    const s = state.session;
    s.results.push(result);
  }

  async function nextCard() {
    if (state.animating) return;
    state.animating = true;
    const sheet = app.querySelector(".sheet");
    const w = Math.min(window.innerWidth * 0.55, 620);
    await motionSlide(sheet, 0, -w, 1, 0, 300, easeIn);
    state.animating = false;
    state.session.idx += 1;
    renderCard(true);
  }

  /* ================= Multiple choice ================= */
  function distractorCards(card, n) {
    const pool = (CARDS_BY_SECTION[card.secKey] || []).filter((c) => c.id !== card.id && c.title !== card.title);
    const same = shuffle(pool.filter((c) => c.region === card.region));
    const other = shuffle(pool.filter((c) => c.region !== card.region));
    const out = [];
    const seen = new Set([card.title]);
    for (const c of [...same, ...other]) {
      if (seen.has(c.title)) continue;
      seen.add(c.title);
      out.push(c);
      if (out.length >= n) break;
    }
    return out;
  }

  function buildMC(card) {
    const cfg = cfgFor(card.secKey);
    const TOPIC = { formation: "formation", expansion: "expansion", collapse: "decline or collapse", beliefs: "belief systems", legitimacy: "legitimacy", centralization: "political organization" };
    const topic = TOPIC[card.secKey] || card.secName.toLowerCase();
    const T = the(card.title);
    const tDates = datesOf(card.title);

    /* ---- Timeline ---- */
    if (card.secKey === "timeline") {
      const answer = card.bullets[0];
      const others = distractorCards(card, 6).filter((c) => c.bullets[0] !== answer);
      const used = new Set([answer]);
      const wrong = [];
      for (const c of others) {
        if (used.has(c.bullets[0])) continue;
        used.add(c.bullets[0]);
        wrong.push(c);
        if (wrong.length === 3) break;
      }
      const began = firstFact(card.title, "formation");
      const ended = firstFact(card.title, "collapse");
      const story = `${began ? ` How it began: ${lower1(began)}.` : ""}${ended ? ` How it ended: ${lower1(ended)}.` : ""}`;
      const options = [
        { text: answer, correct: true, explain: `Correct. ${cap(T)} existed ${answer} (${card.region}).${story}` },
        ...wrong.map((c) => {
          const wBegan = firstFact(c.title, "formation");
          return {
            text: c.bullets[0],
            correct: false,
            explain: `These are the dates for ${the(c.title)} in ${c.region}${wBegan ? `, which began when: ${lower1(wBegan)}` : ""}. ${cap(T)} existed ${answer}.${story}`
          };
        })
      ];
      return { kind: "fact", prompt: cfg.mcA, options: shuffle(options) };
    }

    /* ---- Fill in the blank ---- */
    if (card.cloze) {
      const pool = shuffle((CARDS_BY_SECTION[card.secKey] || []).filter((c) => c.id !== card.id && c.cloze));
      pool.sort((x, y) => (y.region === card.region) - (x.region === card.region) || (y.title === card.title) - (x.title === card.title));
      const used = new Set([card.cloze.answer.toLowerCase()]);
      const wrong = [];
      for (const c of pool) {
        const t = c.cloze.answer.toLowerCase();
        if (used.has(t)) continue;
        used.add(t);
        wrong.push(c);
        if (wrong.length === 3) break;
      }
      const related = shuffle(card.related || []).slice(0, 2);
      const relatedText = related.length ? ` Related facts about ${card.title}: ${list(related)}.` : "";
      const options = [
        { text: card.cloze.answer, correct: true, explain: `Correct. The full fact: ${card.bullets[0]}.${relatedText}` },
        ...wrong.map((c) => ({
          text: c.cloze.answer,
          correct: false,
          explain: `"${c.cloze.answer}" belongs to a different fact, about ${c.title} (${c.region}): ${c.bullets[0]}. The correct term here is "${card.cloze.answer}": ${card.bullets[0]}.`
        }))
      ];
      return { kind: "cloze", prompt: cfg.mcA, options: shuffle(options) };
    }

    /* ---- Centralized or decentralized ---- */
    if (card.tag && cfg.mcType && Math.random() < 0.4) {
      const right = orgType(card.tag);
      const peers = CARDS_BY_SECTION[card.secKey] || [];
      const why = dropLabel(card.bullets[0] || "");
      const effects = card.bullets.slice(1).map(dropLabel);
      const options = ORG_TYPES.map((t) => {
        if (t === right) {
          return {
            text: t,
            correct: true,
            explain: `Correct. ${cap(T)} was ${card.tag.toLowerCase()}. Why: ${lower1(why)}.${effects.length ? ` Effects: ${list(effects.map(lower1))}.` : ""}`
          };
        }
        const examples = shuffle(peers.filter((c) => c.tag && orgType(c.tag) === t)).slice(0, 2).map((c) => the(c.title));
        return {
          text: t,
          correct: false,
          explain: `Not this one. ${cap(T)} was ${card.tag.toLowerCase()}, because ${lower1(why)}.${examples.length ? ` States that were "${t.toLowerCase()}" include ${examples.join(" and ")}.` : ""}`
        };
      });
      return { kind: "type", prompt: cfg.mcType, options };
    }

    const words = nameWords(card.title);
    const canIdentify = (CARDS_BY_SECTION[card.secKey] || []).length >= 4;

    /* ---- Which state does this describe? ---- */
    if (canIdentify && Math.random() < 0.5) {
      let clues = card.bullets.filter((b) => !mentions(b, words));
      if (clues.length < 2) clues = card.bullets.map((b) => maskName(b, words));
      clues = shuffle(clues).slice(0, 3);
      const extra = card.bullets.filter((b) => !clues.includes(b) && !clues.includes(maskName(b, words)));
      const others = distractorCards(card, 3);
      const moreKey = card.secKey === "formation" ? "expansion" : "formation";
      const moreFact = firstFact(card.title, moreKey);
      const moreAbout = moreFact ? ` Also, in its ${moreKey}: ${lower1(moreFact)}.` : "";
      const options = [
        {
          text: card.title,
          correct: true,
          explain: `Correct. These clues describe the ${topic} of ${T}${tDates ? ` (${tDates}, ${card.region})` : ` (${card.region})`}.${extra.length ? ` Its ${topic} also included: ${list(extra.slice(0, 2).map(dropLabel).map(lower1))}.` : moreAbout}`
        },
        ...others.map((c) => {
          const d = datesOf(c.title);
          return {
            text: c.title,
            correct: false,
            explain: `Not ${the(c.title)}${d ? ` (${d})` : ""}. Its ${topic} looked different: ${list(c.bullets.slice(0, 2).map(dropLabel).map(lower1))}. That doesn't fit a clue like "${clues[0]}".`
          };
        })
      ];
      return { kind: "identify", prompt: cfg.mcB, clues, options: shuffle(options) };
    }

    /* ---- Which of these is true? ---- */
    const right = pick(card.bullets);
    const others = distractorCards(card, 8);
    const wrong = [];
    const usedText = new Set([right]);
    for (const c of others) {
      const candidates = shuffle(c.bullets.filter((b) => !usedText.has(b) && !mentions(b, words)));
      if (!candidates.length) continue;
      usedText.add(candidates[0]);
      wrong.push({ card: c, text: candidates[0] });
      if (wrong.length === 3) break;
    }
    const restOfT = card.bullets.filter((b) => b !== right).slice(0, 2).map(dropLabel).map(lower1);
    const options = [
      {
        text: right,
        correct: true,
        explain: `Correct. This is part of the ${topic} of ${T}${tDates ? ` (${tDates})` : ""}.${restOfT.length ? ` Other key facts about its ${topic}: ${list(restOfT)}.` : ""}`
      },
      ...wrong.map((w) => {
        const companion = w.card.bullets.find((b) => b !== w.text);
        return {
          text: w.text,
          correct: false,
          explain: `This describes the ${topic} of ${the(w.card.title)} (${w.card.region}), not ${T}.${companion ? ` For ${the(w.card.title)}, it went along with: ${lower1(dropLabel(companion))}.` : ""} The ${topic} of ${T} centered on: ${list(card.bullets.slice(0, 2).map(dropLabel).map(lower1))}.`
        };
      })
    ];
    return { kind: "fact", prompt: cfg.mcA, options: shuffle(options) };
  }

  function renderMC() {
    const s = state.session;
    const { card, mc } = s.current;
    const body = $("#cardBody");
    body.innerHTML = `
      <p class="prompt">${esc(mc.prompt)}</p>
      ${mc.kind === "identify" ? `<ul class="clues">${mc.clues.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : ""}
      ${mc.kind === "cloze" ? clozeSentence(card) : ""}
      <ul class="options">
        ${mc.options.map((o, i) => `
          <li>
            <button class="option" type="button" data-i="${i}" aria-expanded="false">
              <span class="letter" aria-hidden="true">${"ABCDE"[i]}</span>
              <span class="option-text">${esc(o.text)}<span class="option-tag"></span></span>
              <span class="explain" hidden>${esc(o.explain)}</span>
            </button>
          </li>`).join("")}
      </ul>
      <div id="mcAfter"></div>`;

    body.querySelectorAll(".option").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.i);
        if (!s.current.answered) chooseMC(i);
        else toggleExplain(btn);
      });
    });
  }

  function toggleExplain(btn, force) {
    const ex = btn.querySelector(".explain");
    const open = force !== undefined ? force : ex.hidden;
    ex.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
  }

  function chooseMC(i) {
    const s = state.session;
    const { card, mc } = s.current;
    s.current.answered = true;
    const chosen = mc.options[i];
    const buttons = [...document.querySelectorAll(".option")];

    buttons.forEach((btn, j) => {
      const o = mc.options[j];
      const tag = btn.querySelector(".option-tag");
      if (o.correct) { btn.classList.add("is-correct"); tag.textContent = " Correct answer"; }
      if (j === i && !o.correct) { btn.classList.add("is-wrong"); tag.textContent = " Your answer"; }
      if (j === i && o.correct) tag.textContent = " Your answer, correct";
      if (o.correct || j === i) toggleExplain(btn, true);
    });

    recordAndNext({ card, correct: chosen.correct, score: chosen.correct ? 100 : 0 });

    $("#mcAfter").innerHTML = `
      <p class="explain-toggle-hint" style="margin-top:12px">Tap any other answer to see why it's right or wrong.</p>
      ${notesBlock(card)}
      <div class="next-row">
        <button class="btn-primary" type="button" id="nextBtn">${isLast() ? "See results" : "Next card"}</button>
        <span class="kbd-hint">or press Enter</span>
      </div>`;
    $("#nextBtn").addEventListener("click", nextCard);
    $("#nextBtn").focus({ preventScroll: true });
  }

  function clozeSentence(card, filled) {
    const c = card.cloze;
    const blank = filled === undefined
      ? `<span class="blank" aria-label="blank">______</span>`
      : `<span class="blank filled">${esc(filled)}</span>`;
    return `<p class="cloze">${esc(c.before)}${blank}${esc(c.after)}</p>`;
  }

  const isLast = () => state.session.idx >= state.session.cards.length - 1;

  function notesBlock(card) {
    return `
      <div class="notes-block">
        <h3>Key facts: ${esc(card.title)}</h3>
        ${card.tag ? `<p class="org-tag">${esc(card.tag)}</p>` : ""}
        <ul>${card.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
      </div>`;
  }

  /* ================= Free response ================= */
  function renderFR() {
    const s = state.session;
    const { card } = s.current;
    const cfg = cfgFor(card.secKey);
    const body = $("#cardBody");
    if (card.cloze) return renderClozeFR(card, cfg, body);
    body.innerHTML = `
      <label class="prompt" for="answer">${esc(cfg.fr)}</label>
      <textarea id="answer" class="answer-box" rows="6" placeholder="Write your answer in your own words..."></textarea>
      <p class="answer-hint">Press Ctrl + Enter (or Cmd + Enter) to check.</p>
      <div class="row">
        <button class="btn-primary" type="button" id="checkBtn">Check answer</button>
        <button class="btn-plain" type="button" id="skipBtn">I don't know</button>
      </div>
      <div id="frAfter"></div>`;
    const ta = $("#answer");
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); checkFR(); }
    });
    $("#checkBtn").addEventListener("click", checkFR);
    $("#skipBtn").addEventListener("click", () => {
      if (s.current.answered) return;
      s.current.answered = true;
      ta.disabled = true;
      $("#checkBtn").disabled = true;
      $("#skipBtn").disabled = true;
      recordAndNext({ card, correct: false, score: 0 });
      $("#frAfter").innerHTML = `
        <div class="result">
          <p class="verdict bad"><span>Study this one</span></p>
          ${notesBlock(card)}
          ${nextRow()}
        </div>`;
      wireNext();
    });
    setTimeout(() => ta.focus({ preventScroll: true }), 30);
  }

  /* ---- Fill in the blank (free response) ---- */
  function renderClozeFR(card, cfg, body) {
    const s = state.session;
    body.innerHTML = `
      <p class="prompt">${esc(cfg.fr)}</p>
      ${clozeSentence(card)}
      <label class="sr-only" for="clozeInput">Missing term</label>
      <input id="clozeInput" class="answer-line" type="text" autocomplete="off" spellcheck="false" placeholder="Missing term">
      <p class="answer-hint">Press Enter to check.</p>
      <div class="row">
        <button class="btn-primary" type="button" id="checkBtn">Check answer</button>
        <button class="btn-plain" type="button" id="skipBtn">I don't know</button>
      </div>
      <div id="frAfter"></div>`;
    const input = $("#clozeInput");
    const finish = (typed) => {
      if (s.current.answered) return;
      s.current.answered = true;
      input.disabled = true;
      $("#checkBtn").disabled = true;
      $("#skipBtn").disabled = true;
      const res = typed === null ? { level: "skip", score: 0 } : gradeCloze(typed, card.cloze.answer);
      s.current.result = { card, correct: res.score >= 70, score: res.score };
      recordAndNext(s.current.result);
      const label = { exact: "Correct", close: "Correct, check spelling", partial: "Partly right", wrong: "Not quite", skip: "Study this one" }[res.level];
      const cls = res.score >= 70 ? "good" : res.score >= 40 ? "mid" : "bad";
      $("#frAfter").innerHTML = `
        <div class="result">
          <div class="verdict-wrap ${cls}">
            <p class="verdict ${cls}"><span class="num"><span id="scoreNum">0</span>%</span><span>${label}</span></p>
            <div class="meter"><span id="scoreMeter"></span></div>
          </div>
          ${typed !== null ? `<p class="grader-note">You wrote: ${esc(typed)}</p>` : ""}
          <div class="feedback-block fb-right">
            <h3>Answer: ${esc(card.cloze.answer)}</h3>
            ${clozeSentence(card, card.cloze.answer)}
          </div>
          <div class="next-row">
            <button class="btn-primary" type="button" id="nextBtn">${isLast() ? "See results" : "Next card"}</button>
            ${typed !== null ? `<button class="btn-plain" type="button" id="overrideBtn">${res.score >= 70 ? "Count it as wrong" : "Count it as right"}</button>` : ""}
            <span class="kbd-hint">Enter for next</span>
          </div>
        </div>`;
      const ob = $("#overrideBtn");
      if (ob) ob.addEventListener("click", () => {
        const r = s.current.result;
        r.correct = !r.correct;
        r.score = r.correct ? 100 : 0;
        ob.textContent = r.correct ? "Counted as right" : "Counted as wrong";
        ob.disabled = true;
      });
      countUp($("#scoreNum"), res.score, 600);
      requestAnimationFrame(() => requestAnimationFrame(() => { $("#scoreMeter").style.width = `${res.score}%`; }));
      wireNext();
    };
    const check = () => {
      const v = input.value.trim();
      if (!v) { $("#frAfter").innerHTML = `<p class="error">Type the missing term first, or choose "I don't know".</p>`; input.focus(); return; }
      finish(v);
    };
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); check(); } });
    $("#checkBtn").addEventListener("click", check);
    $("#skipBtn").addEventListener("click", () => finish(null));
    setTimeout(() => input.focus({ preventScroll: true }), 30);
  }

  const normText = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  function lev(a, b) {
    const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      let prev = dp[0];
      dp[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const tmp = dp[j];
        dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = tmp;
      }
    }
    return dp[b.length];
  }
  function gradeCloze(typed, target) {
    const a = normText(typed);
    const alts = [target, ...target.split("/")].map(normText).filter(Boolean);
    const aw = a.split(" ");
    const sameWord = (x, w) => x === w || (w.length >= 5 && lev(x, w) <= 1);
    for (const t of alts) {
      if (a === t) return { level: "exact", score: 100 };
      const tw = t.split(" ").filter((w) => w.length > 2 && w !== "and" && w !== "the");
      if (tw.length && tw.every((w) => aw.some((x) => sameWord(x, w)))) return { level: "exact", score: 100 };
      const tol = /\d/.test(t) ? 0 : t.length >= 8 ? 2 : t.length >= 4 ? 1 : 0;
      if (lev(a, t) <= tol) return { level: "close", score: 100 };
    }
    const keyWords = normText(target).split(" ").filter((w) => w.length > 2 && w !== "and" && w !== "the");
    if (keyWords.length > 1 && keyWords.some((w) => aw.some((x) => sameWord(x, w)))) return { level: "partial", score: 50 };
    return { level: "wrong", score: 0 };
  }

  function nextRow() {
    return `
      <div class="next-row">
        <button class="btn-primary" type="button" id="nextBtn">${isLast() ? "See results" : "Next card"}</button>
        <span class="kbd-hint">or press Enter</span>
      </div>`;
  }
  function wireNext() {
    $("#nextBtn").addEventListener("click", nextCard);
    $("#nextBtn").focus({ preventScroll: true });
  }

  async function checkFR() {
    const s = state.session;
    if (s.current.answered || s.current.checking) return;
    const { card } = s.current;
    const ta = $("#answer");
    const answer = ta.value.trim();
    const after = $("#frAfter");
    if (!answer) {
      after.innerHTML = `<p class="error">Write an answer first, or choose "I don't know" to see the answer.</p>`;
      ta.focus();
      return;
    }
    s.current.checking = true;
    s.current.answer = answer;
    ta.disabled = true;
    $("#checkBtn").disabled = true;
    $("#skipBtn").disabled = true;

    let grade = null;
    let errorMsg = "";
    if (aiReady()) {
      after.innerHTML = `<div class="checking"><span class="scanner" aria-hidden="true"></span><span>Checking your answer...</span></div>`;
      try {
        grade = await aiGrade(card, answer, (msg) => {
          const label = document.querySelector(".checking span:last-child");
          if (label) label.textContent = msg;
        });
        grade.source = "ai";
      } catch (err) {
        errorMsg = graderErrorText(err);
      }
    }
    if (!grade) {
      grade = localGrade(card, answer);
      grade.source = "local";
    }

    s.current.checking = false;
    s.current.answered = true;
    const correct = grade.score >= 70;
    s.current.result = { card, correct, score: grade.score };
    recordAndNext(s.current.result);
    renderGrade(grade, errorMsg);
  }

  function graderErrorText(err) {
    return err && err.busy
      ? "The AI grader is busy right now (too many people are using it). Showing a keyword check instead. You can try the AI again in a moment."
      : `AI grading didn't work (${err ? err.message : "unknown error"}). Showing a keyword check instead. Check your key and model in AI grading settings.`;
  }

  async function retryAi() {
    const s = state.session;
    const cur = s.current;
    const btn = $("#retryAi");
    if (!btn || !cur.answer) return;
    btn.disabled = true;
    btn.textContent = "Grading...";
    try {
      const g = await aiGrade(cur.card, cur.answer, (msg) => { btn.textContent = msg; });
      g.source = "ai";
      cur.result.correct = g.score >= 70;
      cur.result.score = g.score;
      renderGrade(g, "");
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "Try AI grading again";
      const note = $("#graderError");
      if (note) note.textContent = graderErrorText(err);
    }
  }

  function renderGrade(g, errorMsg) {
    const { card } = state.session.current;
    const cls = g.score >= 70 ? "good" : g.score >= 40 ? "mid" : "bad";
    const label = g.score >= 70 ? "Got it" : g.score >= 40 ? "Partly there" : "Not yet";
    const list = (title, items, klass) => items && items.length ? `
      <div class="feedback-block ${klass}">
        <h3>${title}</h3>
        <ul>${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      </div>` : "";

    $("#frAfter").innerHTML = `
      ${errorMsg ? `<p class="error" id="graderError">${esc(errorMsg)}</p>
        <div class="row" style="margin-top:10px"><button class="btn-plain" type="button" id="retryAi">Try AI grading again</button></div>` : ""}
      <div class="result">
        <div class="verdict-wrap ${cls}">
          <p class="verdict ${cls}"><span class="num"><span id="scoreNum">0</span>%</span><span>${label}</span></p>
          <div class="meter"><span id="scoreMeter"></span></div>
        </div>
        <p class="grader-note">${g.source === "ai"
          ? "Graded by AI."
          : "Checked by keyword matching. It can tell which key facts you covered, but not whether something is wrong. Turn on AI grading for that."}</p>
        ${list("What you got right", g.right, "fb-right")}
        ${list("What you missed", g.missed, "fb-missed")}
        ${list("What's wrong", g.wrong, "fb-wrong")}
        ${g.context ? `<div class="feedback-block fb-context"><h3>More context</h3><p>${esc(g.context)}</p></div>` : ""}
        ${g.tip ? `<p class="tip">${esc(g.tip)}</p>` : ""}
        ${notesBlock(card)}
        <div class="next-row">
          <button class="btn-primary" type="button" id="nextBtn">${isLast() ? "See results" : "Next card"}</button>
          <button class="btn-plain" type="button" id="overrideBtn">${g.score >= 70 ? "Count it as wrong" : "Count it as right"}</button>
          <span class="kbd-hint">Enter for next</span>
        </div>
      </div>`;
    $("#overrideBtn").addEventListener("click", () => {
      const r = state.session.current.result;
      r.correct = !r.correct;
      r.score = r.correct ? 100 : 0;
      $("#overrideBtn").textContent = r.correct ? "Counted as right" : "Counted as wrong";
      $("#overrideBtn").disabled = true;
    });
    const rb = $("#retryAi");
    if (rb) rb.addEventListener("click", retryAi);
    countUp($("#scoreNum"), g.score);
    requestAnimationFrame(() => requestAnimationFrame(() => { $("#scoreMeter").style.width = `${g.score}%`; }));
    wireNext();
  }

  /* ---- Keyword grader (no API key) ---- */
  const STOP = new Set(("about above after again against also among another because been before being below between both " +
    "but came come could each from have having here into itself just like made make many more most much must " +
    "near only other over same should since some such than that their them then there these they this those " +
    "through under until upon very were what when where which while with within would your later early").split(" "));

  function keywords(text) {
    return [...new Set(text.toLowerCase()
      .replace(/[^a-z0-9\u00c0-\u024f\s'-]/g, " ")
      .split(/\s+/)
      .map((w) => w.replace(/^'+|'+$/g, ""))
      .filter((w) => (w.length >= 4 && !STOP.has(w)) || /^\d{3,4}$/.test(w)))];
  }
  const stem = (w) => w.slice(0, 5);

  function localGrade(card, answer) {
    if (card.secKey === "timeline") return localGradeTimeline(card, answer);
    const ansStems = new Set(keywords(answer).map(stem));
    const titleStems = new Set(keywords(card.title).map(stem));
    const right = [], missed = [];
    (card.tag ? [card.tag, ...card.bullets] : card.bullets).forEach((b) => {
      const kws = keywords(b);
      if (!kws.length) return;
      const hits = kws.filter((k) => ansStems.has(stem(k))).length;
      // Proper nouns (names, places) are strong evidence the student covered this note
      const proper = (b.match(/(?:^|\s)([A-Z\u00c0-\u00de][\w\u00c0-\u024f'-]{2,})/g) || [])
        .slice(1)
        .map((w) => stem(w.trim().toLowerCase()))
        .filter((w) => !titleStems.has(w) && !STOP.has(w));
      const properHit = proper.some((p) => ansStems.has(p));
      const covered = hits / kws.length >= 0.4 || hits >= 3 || properHit;
      (covered ? right : missed).push(b);
    });
    const total = right.length + missed.length || 1;
    const score = Math.round((right.length / total) * 100);
    return {
      score,
      right,
      missed,
      wrong: [],
      tip: missed.length ? "Include specific names, places, and causes to strengthen your answer." : "Nice, you covered the key facts."
    };
  }

  function localGradeTimeline(card, answer) {
    const refYears = (card.bullets[0].match(/\d{3,4}/g) || []).map(Number);
    const ansYears = (answer.match(/\d{3,4}/g) || []).map(Number);
    const hit = refYears.filter((y) => ansYears.some((a) => Math.abs(a - y) <= 25));
    const present = /present/i.test(card.bullets[0]) && /present|today|still/i.test(answer);
    const total = refYears.length + (/present/i.test(card.bullets[0]) ? 1 : 0) || 1;
    const score = Math.round(((hit.length + (present ? 1 : 0)) / total) * 100);
    return {
      score,
      right: hit.length ? [`Your dates match: ${hit.join(", ")}`] : [],
      missed: score < 100 ? [`Correct dates: ${card.bullets[0]}`] : [],
      wrong: [],
      tip: "Dates within about 25 years count as a match."
    };
  }

  /* ---- AI grader ---- */
  function gradingPrompt(card, answer) {
    const cfg = cfgFor(card.secKey);
    const system = [
      "You are an AP World History teacher grading a student's flashcard answer.",
      "Use the key facts provided as your main answer key: they are what the student is expected to know.",
      "You may also use your own accurate historical knowledge. Give credit for correct, relevant details that aren't in the key facts, and if more information would help the student understand, add it yourself.",
      "Give credit for paraphrases and for ideas that mean the same thing as a key fact, even with different wording.",
      "A strong answer does not need every fact, but it should capture the main ideas. Score 0-100 for how well it covers the key facts accurately.",
      "List as 'wrong' only statements in the student's answer that are historically incorrect, with a brief correction.",
      "List as 'missed' the important facts the student left out, written as short phrases.",
      "List as 'right' the specific points the student got correct, written as short phrases.",
      "In 'context', write 1-2 sentences of extra historical context that deepens understanding (causes, effects, or connections), using your own knowledge.",
      "Write all feedback about the history itself, in plain language, directly to the student. Never mention notes, key facts, an answer key, a reference, or where the information came from.",
      'Respond with JSON only, no markdown fences, in exactly this shape: {"score": number, "right": [string], "missed": [string], "wrong": [string], "context": string, "tip": string}'
    ].join("\n");
    const user = [
      `Deck: ${card.secName}`,
      `Card: ${card.title} (${card.region})`,
      `Question: ${cfg.fr}`,
      "",
      "Answer key (key facts):",
      ...(card.tag ? [`- Organization: ${card.tag}`] : []),
      ...card.bullets.map((b) => `- ${b}`),
      "",
      "Student answer:",
      answer
    ].join("\n");
    return { system, user };
  }

  const GEMINI_FALLBACKS = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  class GraderError extends Error {
    constructor(message, busy) { super(message); this.busy = !!busy; }
  }
  // Overloaded / rate limited: worth retrying or trying another model
  const isBusy = (status, msg) => status === 429 || status === 500 || status === 503 || status === 529 ||
    /high demand|overloaded|unavailable|try again later|resource.*exhausted|rate limit/i.test(msg || "");

  async function safeFetch(url, opts) {
    try { return await fetch(url, opts); }
    catch { throw new GraderError("couldn't reach the AI service", true); }
  }

  async function callGemini(key, model, system, user) {
    const res = await safeFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (data.error && data.error.message) || `HTTP ${res.status}`;
      throw new GraderError(msg, isBusy(res.status, msg) || /no longer available|not found/i.test(msg));
    }
    const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    return (parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("\n");
  }

  async function callClaude(key, model, system, user) {
    const res = await safeFetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({ model, max_tokens: 800, system, messages: [{ role: "user", content: user }] })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (data.error && data.error.message) || `HTTP ${res.status}`;
      throw new GraderError(msg, isBusy(res.status, msg));
    }
    return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  }

  async function aiGrade(card, answer, onStatus) {
    const s = getSettings();
    const { system, user } = gradingPrompt(card, answer);
    let text = "";

    if (s.provider === "claude") {
      const model = s.model || DEFAULT_MODELS.claude;
      let lastErr;
      for (let attempt = 0; attempt < 3; attempt++) {
        try { text = await callClaude(s.key, model, system, user); lastErr = null; break; }
        catch (err) {
          lastErr = err;
          if (!err.busy) throw err;
          if (onStatus) onStatus("The AI is busy. Retrying...");
          await sleep(1000 * (attempt + 1));
        }
      }
      if (lastErr) throw lastErr;
    } else if (s.provider === "gemini") {
      // Try the chosen model first, then backups, with a short wait between tries
      const models = [s.model || DEFAULT_MODELS.gemini, ...GEMINI_FALLBACKS].filter((m, i, arr) => m && arr.indexOf(m) === i);
      let lastErr = null;
      let done = false;
      for (const model of models) {
        for (let attempt = 0; attempt < 2 && !done; attempt++) {
          try { text = await callGemini(s.key, model, system, user); done = true; }
          catch (err) {
            lastErr = err;
            if (!err.busy) throw err; // wrong key, etc.: no point retrying
            if (onStatus) onStatus("The AI is busy. Trying again...");
            await sleep(700 * (attempt + 1));
          }
        }
        if (done) break;
      }
      if (!done) throw lastErr || new GraderError("no response", true);
    } else {
      throw new GraderError("no grader selected", false);
    }

    const cleaned = text.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end < 0) throw new Error("the grader's reply wasn't readable");
    const g = JSON.parse(cleaned.slice(start, end + 1));
    const arr = (x) => Array.isArray(x) ? x.map(String).filter(Boolean) : [];
    return {
      score: Math.max(0, Math.min(100, Math.round(Number(g.score) || 0))),
      right: arr(g.right),
      missed: arr(g.missed),
      wrong: arr(g.wrong),
      tip: typeof g.tip === "string" ? g.tip : "",
      context: typeof g.context === "string" ? g.context : ""
    };
  }

  /* ================= Summary ================= */
  function renderSummary() {
    const s = state.session;
    state.view = "summary";
    const n = s.results.length;
    const right = s.results.filter((r) => r.correct).length;
    const missed = s.results.filter((r) => !r.correct);
    const avg = n ? Math.round(s.results.reduce((a, r) => a + r.score, 0) / n) : 0;
    const scoreText = s.mode === "mc"
      ? `${right} of ${n} right`
      : `${right} of ${n} passed, ${avg}% average`;

    app.innerHTML = `
      <section class="sheet">
        <div class="sheet-head">
          <p class="kicker">${esc(s.deck.name)}, ${esc(s.regionLabel)}, ${s.mode === "mc" ? "multiple choice" : "free response"}</p>
          <h1 class="score-line">${n ? scoreText : "No cards answered"}</h1>
        </div>
        <div class="sheet-body">
          ${missed.length ? `
            <h2 class="prompt">Cards to review</h2>
            <ul class="missed-list">${missed.map((r) => `<li><strong>${esc(r.card.title)}</strong> (${esc(r.card.secName)}, ${esc(r.card.region)})</li>`).join("")}</ul>
          ` : n ? `<p class="prompt">You got every card. Try the other answer style or a shuffled run next.</p>` : ""}
          <div class="next-row">
            ${missed.length ? `<button class="btn-primary" type="button" id="retryMissed">Study missed cards</button>` : ""}
            <button class="${missed.length ? "btn-plain" : "btn-primary"}" type="button" id="again">Study this deck again</button>
            <button class="btn-plain" type="button" id="toHome">Back to decks</button>
          </div>
        </div>
      </section>`;

    const retry = $("#retryMissed");
    if (retry) retry.addEventListener("click", () => {
      const cards = s.order === "shuffled" ? shuffle(missed.map((r) => r.card)) : missed.map((r) => r.card);
      startSession({ deck: s.deck, cards, order: s.order, mode: s.mode, regionLabel: "Missed cards" });
    });
    $("#again").addEventListener("click", () => renderSetup(s.deck));
    $("#toHome").addEventListener("click", renderHome);
    focusMain();
  }

  /* ================= Keyboard ================= */
  document.addEventListener("keydown", (e) => {
    if (state.view !== "study" || dlg.open) return;
    const s = state.session;
    if (!s || !s.current) return;
    const inText = e.target && (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT");
    if (s.mode === "mc" && !s.current.answered && !inText && /^[1-5]$/.test(e.key)) {
      const i = Number(e.key) - 1;
      if (s.current.mc.options[i]) { e.preventDefault(); chooseMC(i); }
      return;
    }
    if (s.current.answered && e.key === "Enter" && !inText) {
      const active = document.activeElement;
      if (active && active.tagName === "BUTTON") return;
      e.preventDefault();
      nextCard();
    }
  });

  /* ================= Start ================= */
  refreshAiBadge();
  if (!ALL_CARDS.length) {
    app.innerHTML = `<section class="sheet"><div class="sheet-body"><p class="prompt">No cards found. Check that data.js is in the same folder as index.html.</p></div></section>`;
  } else {
    renderHome();
  }
})();
