// 《如果那年》引擎 v0.7.0 —— 版本号规则见 docs/DEVLOG.md 卷首
// 要点：选择写标记→回响事件 / 年度小选择+当场回响 / 数值阈值危机 / 瞥视先给标题、点开才看全文（计数真实）
//      / 判词按数值形状拼装 / 全程自动存档可续玩 / 种子可输入、可复制分享链接 / 在线零 LLM 调用
(function () {
  "use strict";
  const D = window.GAME_DATA;
  if (window.GAME_PACKS) D.events = D.events.concat(window.GAME_PACKS); // 事件扩展包（src/packs/）在引擎启动时并入主池
  if (window.GAME_SYNERGY) { // 协同组合与稀有系统（docs/SYNERGY-AND-RARE-ENDINGS.md）
    D.events = D.events.concat(window.GAME_SYNERGY.combos || []);
    D.rare = window.GAME_SYNERGY.rare || [];
    D.endings = window.GAME_SYNERGY.endings || [];
  }
  const START_AGE = 22, MAX_AGE = 80;
  // 死亡模型 v2（年龄×健康风险）：公式与校准实测见 docs/MORTALITY-MODEL.md
  const MORTALITY = { accident: 0.00015, healthA: 0.0010, healthG: 1.04, hfNum: 115, hfDen: 55, hfLo: 0.3, hfHi: 2.2 };
  const DEATH_CAUSES = {
    health: [
      "身体早几年就给过信儿。那天夜里胸口闷得睡不着，送到医院时已经晚了。",
      "复查拖了又拖。最后一次倒下是在家门口，邻居帮忙叫了车，人没能再醒过来。",
      "爬楼越来越吃力。那天下午在楼梯间坐下，就没再站起来。家里人赶到时，医生已经出来了。",
    ],
    accident: [
      "雨天路滑，路口一辆车失控撞过来。救护车赶到时，已经晚了。",
      "夜里那趟车在高速上出了事故。同行的人活了下来，这边没能回来。",
      "河边护栏外的一块地面塌了，人掉了下去。等找到时，已经晚了。",
    ],
  };
  const STAT_META = [["health", "健康"], ["money", "金钱"], ["growth", "成长"], ["freedom", "自由"], ["relation", "关系"]];
  const GLIMPSE_AGES = { 30: 0, 40: 1, 50: 2 };
  const ERAS = [
    { id: "c1955", birth: 1955, label: "1955 年生", desc: "22 岁是 1977 年：恢复高考、返城、分房、下岗潮" },
    { id: "c1965", birth: 1965, label: "1965 年生", desc: "22 岁是 1987 年：海南热、下海潮、房改" },
    { id: "c1978", birth: 1978, label: "1978 年生", desc: "22 岁是 2000 年：互联网、非典、房价起飞" },
    { id: "c2000", birth: 2000, label: "2000 年生", desc: "22 岁是 2022 年：现在这一代人的路" },
  ];
  const SAVE_KEY = "ify-save-v2";
  const PREFS_KEY = "ify-prefs";
  const SPEED_BASE = { slow: 2800, mid: 1600, fast: 800 }; // 速度三档的基础停留时长 (ms)
  const SPEED_LABEL = { slow: "慢", mid: "中", fast: "快" };
  const SPEED_SECONDS = { slow: "2.8", mid: "1.6", fast: "0.8" };
  const AUTO_MODES = [["off", "关"], ["plain", "平年"], ["full", "全程"]];
  const DEFAULT_AUTO_MODE = "full"; // 由无头模拟的停顿次数口径决定；模拟明细见 docs/MORTALITY-MODEL.md 与 DEVLOG v0.7.0

  // --- 可序列化的种子随机 (状态可存档) ---
  const RNG = { a: 0 };
  function rng() {
    RNG.a |= 0; RNG.a = (RNG.a + 0x6D2B79F5) | 0;
    let t = Math.imul(RNG.a ^ (RNG.a >>> 15), 1 | RNG.a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function seedFromString(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const clamp = (v) => Math.max(0, Math.min(100, v));
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const el = (id) => document.getElementById(id);
  const app = () => el("app");

  let S = null;
  function freshState(seedStr) {
    return {
      seedStr, age: START_AGE, era: "c2000", birthYear: 2000,
      stats: { health: 60, money: 45, growth: 50, freedom: 50, relation: 50 },
      route: null, unchosen: [], log: [], reflections: [],
      usedEvents: [], flags: {}, crisisUsed: {}, microUsed: [], usedRare: [],
      glimpsesSeen: 0, glimpsesSkipped: 0, lastDelta: "",
      healthCrisisSeen: false, death: null,
      autoMode: DEFAULT_AUTO_MODE, speed: "mid", // 推进设定在本局的副本；权威来源是 localStorage 的 ify-prefs
    };
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...S, rngA: RNG.a })); } catch (e) { /* 存不了不阻塞游玩 */ } }
  function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && s.route ? s : null; } catch (e) { return null; } }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

  // ---------- 自动推进：偏好 (ify-prefs 为权威) + 单一全局计时器 ----------
  // 三态：off=全手动；plain=只有无抉择年份自动走；full=无抉择年份自动走，普通事件小选项也自动选。
  // 分岔、危机、稀有选项、影子瞥视在任何模式下都不设自动动作。step() 每次渲染前清旧计时，防串局。
  let prefs = loadPrefs();
  function loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY));
      if (p && AUTO_MODES.some(([k]) => k === p.mode) && SPEED_BASE[p.speed]) return { mode: p.mode, speed: p.speed };
    } catch (e) { /* 旧结构或损坏数据不报错，按新默认走 */ }
    return { mode: DEFAULT_AUTO_MODE, speed: "mid" };
  }
  function savePrefs() {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* 存不了不阻塞 */ }
    if (S) { S.autoMode = prefs.mode; S.speed = prefs.speed; }
  }
  let autoTimer = null;  // 唯一的 setTimeout 句柄
  let autoRemain = 0;    // 剩余毫秒（暂停/恢复用）
  let autoStamp = 0;     // 本段计时起点
  let autoText = null;   // 当前画面若可自动推进，其正文；必停画面恒为 null
  let autoAction = null; // 当前画面可执行的自动动作（advance 或普通事件自动选）
  let autoKind = null;   // "advance" | "choice"
  function autoEligible() {
    if (!autoText || !autoAction || prefs.mode === "off") return false;
    return autoKind === "advance" || (autoKind === "choice" && prefs.mode === "full");
  }
  function clearAuto() { if (autoTimer !== null) { clearTimeout(autoTimer); autoTimer = null; } autoRemain = 0; }
  function clearAutoContext() { clearAuto(); autoText = null; autoAction = null; autoKind = null; }
  function autoDelay(text) {
    const base = autoKind === "choice" ? SPEED_BASE.mid : (SPEED_BASE[prefs.speed] || SPEED_BASE.mid);
    return base + Math.min(1800, (text ? text.length : 0) * 12); // 正文越长留得越久，上限再加 1800ms
  }
  function startAuto(ms) {
    if (autoTimer !== null) clearTimeout(autoTimer);
    autoStamp = Date.now(); autoRemain = ms;
    const action = autoAction;
    autoTimer = setTimeout(() => { autoTimer = null; autoRemain = 0; if (action) action(); }, ms);
  }
  function scheduleAuto() {
    clearAuto();
    if (autoEligible()) {
      autoRemain = autoDelay(autoText);
      if (!document.hidden) startAuto(autoRemain);
    }
    refreshAutoRow();
  }
  function armAuto(text, action, kind) { // 无抉择画面传 advance；普通事件选项画面只在 full 模式传自动选动作
    autoText = text; autoAction = action || advance; autoKind = kind || "advance";
    scheduleAuto();
  }
  function pauseAuto() {
    if (autoTimer !== null) { clearTimeout(autoTimer); autoTimer = null; autoRemain = Math.max(0, autoRemain - (Date.now() - autoStamp)); }
  }
  function resumeAuto() { // 回到前台且当前画面仍可自动推进、还有剩余时间，才接着走
    if (autoEligible() && autoRemain > 0 && autoTimer === null && S && S.route && !S.death && S.age < MAX_AGE && !document.hidden) startAuto(autoRemain);
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) pauseAuto(); else resumeAuto(); });
  window.addEventListener("blur", pauseAuto);
  window.addEventListener("focus", resumeAuto);
  function speedButtonLabel(k) { return `${SPEED_LABEL[k]} · 约${SPEED_SECONDS[k]}秒`; }
  function autoRowHtml() {
    const counting = autoEligible();
    const modes = AUTO_MODES.map(([k, label]) => `<button type="button" class="automode${prefs.mode === k ? " on" : ""}" data-automode="${k}">${label}</button>`).join("");
    const spd = ["slow", "mid", "fast"].map((k) => `<button type="button" class="autospd${prefs.speed === k ? " on" : ""}" data-autospeed="${k}">${speedButtonLabel(k)}</button>`).join("");
    return `<span class="autoleft">自动推进 ${modes}${counting ? `<span class="autodot" aria-hidden="true"></span><span class="autolive">自动推进中</span>` : ""}</span><span class="autoright">${spd}</span>`;
  }
  function refreshAutoRow() { const r = el("autorow"); if (r) r.innerHTML = autoRowHtml(); }
  function setAutoMode(mode) {
    if (!AUTO_MODES.some(([k]) => k === mode)) return;
    prefs.mode = mode;
    savePrefs();
    scheduleAuto();
    if (S && S.route) save();
  }
  // 全程模式下，玩家点任意非控制区即暂停回手动；被点的控件本身仍按原动作执行（例如点中某个选项，就按手动选它）。
  app().addEventListener("click", (ev) => {
    const t = ev.target;
    if (!t || !t.closest) return;
    if (prefs.mode !== "full" || !autoText || t.closest("#autorow")) return;
    prefs.mode = "off";
    savePrefs();
    clearAuto();
    refreshAutoRow();
    if (S && S.route) save();
  }, true);
  // 游戏中控制行用事件委托接线：卡片每次重渲染都不丢监听
  app().addEventListener("click", (ev) => {
    const t = ev.target;
    if (!t || !t.closest) return;
    const mode = t.closest("[data-automode]");
    const spd = t.closest("[data-autospeed]");
    if (mode) {
      setAutoMode(mode.getAttribute("data-automode"));
    } else if (spd) {
      const k = spd.getAttribute("data-autospeed");
      if (SPEED_BASE[k] && k !== prefs.speed) {
        prefs.speed = k;
        savePrefs();
        scheduleAuto();
      }
      refreshAutoRow();
      if (S && S.route) save();
    }
  });

  function applyEffects(ef) {
    if (!ef) { S.lastDelta = ""; return; }
    const parts = [];
    for (const [k, label] of STAT_META) if (ef[k]) { S.stats[k] = clamp(S.stats[k] + ef[k]); parts.push(`${label} ${ef[k] > 0 ? "+" : ""}${ef[k]}`); }
    S.lastDelta = parts.join(" · ");
  }
  function statsBar() {
    return `<div class="stats">${STAT_META.map(([k, label]) =>
      `<div class="stat"><span>${label}</span><div class="bar"><i style="width:${S.stats[k]}%"></i></div><b>${S.stats[k]}</b></div>`).join("")}</div>`;
  }
  function finalAge() { return S && S.death ? S.death.age : MAX_AGE; }
  function roadSvg() {
    const W = 640, pad = 14, end = finalAge();
    const X = (a) => pad + ((a - START_AGE) / (end - START_AGE)) * (W - pad * 2);
    let s = "";
    (D.forks || []).filter((f) => f.age < end).forEach((f) => {
      const on = S.age >= f.age, col = on ? "#2F4A3C" : "#C4BCA9";
      s += `<line x1="${X(f.age)}" y1="30" x2="${X(f.age) + 13}" y2="13" stroke="${col}" stroke-width="1.6" stroke-dasharray="3 3"/><circle cx="${X(f.age)}" cy="30" r="3" fill="${col}"/>`;
    });
    return `<svg class="road" viewBox="0 0 ${W} 52" width="100%" aria-hidden="true"><line x1="${pad}" y1="30" x2="${W - pad}" y2="30" stroke="#D8D2C2" stroke-width="2"/>${s}<line x1="${pad}" y1="30" x2="${X(S.age)}" y2="30" stroke="#2F4A3C" stroke-width="2.5"/><circle cx="${X(S.age)}" cy="30" r="5" fill="#2F4A3C"/><text x="${pad}" y="49" font-size="10" fill="#8A8378">22 岁</text><text x="${W - pad}" y="49" font-size="10" fill="#8A8378" text-anchor="end">${end} 岁</text></svg>`;
  }
  function head(note, bare) {
    const yr = S.birthYear ? ` · 公元 ${S.birthYear + S.age} 年` : "";
    return `${roadSvg()}${statsBar()}<p class="meta">${S.age} 岁${yr} · ${esc(S.route.name)} · 种子 ${esc(S.seedStr)}${note ? " · " + note : ""}</p>${bare ? "" : `<div class="autorow" id="autorow">${autoRowHtml()}</div>`}`;
  }
  function streamHtml() {
    if (!S || !S.log.length) return "";
    const rows = S.log.map((l, i) => {
      const m = l.match(/^(\d+) 岁 · ([\s\S]*)$/);
      const age = m ? +m[1] : S.age, txt = m ? m[2] : l;
      const yr = S.birthYear ? `${S.birthYear + age} · ` : "";
      return `<div class="srow${i === S.log.length - 1 ? " last" : ""}"><span class="sage">${yr}${age} 岁</span><span>${esc(txt)}</span></div>`;
    }).join("");
    return `<div class="streamwrap"><p class="streamtitle">这一生 · 流水账</p><div class="stream" id="stream">${rows}</div></div>`;
  }
  function mountStream() {
    const sec = app().querySelector("section.card");
    if (!sec || !S || !S.route || S.death || S.age >= MAX_AGE) return;
    const html = streamHtml();
    if (!html) return;
    if (window.matchMedia && window.matchMedia("(min-width: 1024px)").matches) {
      app().classList.add("playwrap");
      sec.insertAdjacentHTML("afterend", html);
    } else {
      app().classList.remove("playwrap");
      sec.insertAdjacentHTML("beforeend", html);
    }
    requestAnimationFrame(() => { const st = el("stream"); if (st) st.scrollTop = st.scrollHeight; });
  }
  function deltaLine() { return S.lastDelta ? `<p class="delta">${esc(S.lastDelta)}</p>` : ""; }

  // ---------- 开局 ----------
  function renderStart() {
    clearAutoContext();
    app().classList.remove("playwrap");
    clearSave0();
    const saved = loadSave();
    const seedParam = new URLSearchParams(location.search).get("seed");
    const eraParam = new URLSearchParams(location.search).get("era");
    // 旧同局链接可能带 end 参数：从本版起忽略，不报错。
    app().innerHTML = `
      <section class="card">
        <h1>22 岁，宿舍要退了。</h1>
        <p>行李收好，站在宿舍门口。往后的路要自己选。一局大约十分钟。走哪一代人的路，下面能自己定。</p>
        <p>选一条路开始。其他的路也不会消失——它们会变成你的「另一条路」，在你 30、40、50 岁的时候，远远地看你一眼。</p>
        <div class="choices">${D.routes.map((r, i) => `<button class="choice" data-i="${i}"><b>${esc(r.name)}</b><small>${esc(r.desc)}</small></button>`).join("")}</div>
        ${saved ? `<button class="ghost resume-link" id="resume">继续上次的人生（${saved.age} 岁 · ${esc(saved.route.name)}）</button>` : ""}
        <div class="setblock">
          <p class="setlab">出生年代</p>
          <div class="segpicks" id="erapick">${ERAS.map((e) => `<button type="button" class="segbtn${e.id === "c2000" ? " sel" : ""}" data-era="${e.id}" data-birth="${e.birth}"><b>${e.label}</b></button>`).join("")}</div>
          <p class="setlab">自动推进</p>
          <div class="segpicks" id="autopick">
            ${AUTO_MODES.map(([mode, label]) => `<button type="button" class="segbtn" data-mode="${mode}"><b>${label}</b></button>`).join("")}
          </div>
          <p class="setlab">速度</p>
          <div class="segpicks" id="speedpick">
            ${["slow", "mid", "fast"].map((k) => `<button type="button" class="segbtn" data-speed="${k}">${speedButtonLabel(k)}</button>`).join("")}
          </div>
          <p class="hint" id="setsummary"></p>
        </div>
        <div class="seedrow">
          <input id="seedin" type="text" placeholder="种子码（不填就是随机）">
          <button class="ghost" id="seedgo">用这个种子</button>
          <button class="ghost" id="daily">今日种子</button>
        </div>
        <p class="hint ver">v0.7.0</p>
        <p class="hint">不填随机。填了，运气定下来，跟朋友比同一局就用它。${seedParam ? `<br>你打开的链接带着种子「${esc(seedParam)}」${eraParam ? "，年代也按对方那局选好了" : ""}，点任意一条路就开始同一局。` : ""}</p>
      </section>`;
    if (saved) el("resume").addEventListener("click", () => {
      S = saved;
      S.usedRare = S.usedRare || []; S.era = S.era || "c2000"; S.birthYear = S.birthYear || 2000;
      S.healthCrisisSeen = !!S.healthCrisisSeen || !!(S.crisisUsed && S.crisisUsed.health);
      S.death = S.death || null;
      delete S.endAge;
      S.autoMode = prefs.mode; S.speed = prefs.speed;
      RNG.a = saved.rngA || seedFromString(saved.seedStr);
      if (S.death) renderDeath(); else step();
    });
    const pickSeg = (id) => { const box = el(id); if (!box) return; box.querySelectorAll(".segbtn").forEach((b) => b.addEventListener("click", () => { box.querySelectorAll(".segbtn").forEach((o) => o.classList.remove("sel")); b.classList.add("sel"); })); };
    pickSeg("erapick");
    const preSel = (id, attr, val) => { const box = el(id); if (!box || !val) return; const btns = box.querySelectorAll(".segbtn"); btns.forEach((o) => { if (o.dataset[attr] === val) { btns.forEach((p) => p.classList.remove("sel")); o.classList.add("sel"); } }); };
    preSel("erapick", "era", eraParam);
    const autoSummary = () => prefs.mode === "off" ? "手动推进" : `自动推进 ${AUTO_MODES.find(([k]) => k === prefs.mode)[1]} · ${SPEED_LABEL[prefs.speed]}（约${SPEED_SECONDS[prefs.speed]}秒）`;
    const updSummary = () => { const eb = document.querySelector("#erapick .segbtn.sel"); const sv = (el("seedin").value || "").trim(); const birth = eb ? +eb.dataset.birth : 2000; el("setsummary").textContent = `这一局：${eb ? eb.textContent.trim() : "2000 年生"} · ${birth + 22} 年 22 岁 · ${sv ? `种子「${sv}」` : "随机种子"} · ${autoSummary()}`; };
    const syncAutoPick = () => {
      document.querySelectorAll("#autopick .segbtn").forEach((o) => o.classList.toggle("sel", o.dataset.mode === prefs.mode));
      document.querySelectorAll("#speedpick .segbtn").forEach((o) => o.classList.toggle("sel", o.dataset.speed === prefs.speed));
      const sp = el("speedpick"); if (sp) sp.classList.toggle("dim", prefs.mode === "off");
    };
    document.querySelectorAll("#autopick .segbtn").forEach((b) => b.addEventListener("click", () => { prefs.mode = b.dataset.mode; savePrefs(); syncAutoPick(); updSummary(); }));
    document.querySelectorAll("#speedpick .segbtn").forEach((b) => b.addEventListener("click", () => { prefs.speed = b.dataset.speed; savePrefs(); syncAutoPick(); updSummary(); }));
    syncAutoPick();
    document.querySelectorAll(".segbtn").forEach((b) => b.addEventListener("click", updSummary));
    el("seedin").addEventListener("input", updSummary);
    updSummary();
    el("daily").addEventListener("click", () => { const d = new Date(); el("seedin").value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; el("daily").textContent = "今日种子已填好，选一条路开始"; updSummary(); });
    document.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
      const chosen = D.routes[Number(b.dataset.i)];
      const seedStr = (el("seedin").value || "").trim() || seedParam || String(Math.floor(Math.random() * 1e6));
      const eb = document.querySelector("#erapick .segbtn.sel");
      newGame(seedStr, chosen, { era: eb ? eb.dataset.era : "c2000", birth: eb ? +eb.dataset.birth : 2000 });
    }));
    el("seedgo").addEventListener("click", () => {
      const v = (el("seedin").value || "").trim();
      if (!v) { el("seedin").focus(); return; }
      el("seedin").scrollIntoView({ block: "center" });
      // 种子已填好，提示玩家选路即可
      el("seedgo").textContent = "好，选一条路开始";
    });
  }
  function clearSave0() { /* 开局页不清除存档，续玩入口要用 */ }

  function newGame(seedStr, route, opts) {
    S = freshState(seedStr);
    RNG.a = seedFromString(seedStr);
    if (opts) { S.era = opts.era; S.birthYear = opts.birth; }
    S.autoMode = prefs.mode; S.speed = prefs.speed;
    S.route = route;
    S.unchosen = D.routes.filter((r) => r.id !== route.id).map((r) => ({ kind: "route", label: r.name, id: r.id }));
    applyEffects(route.stats); S.lastDelta = "";
    S.log.push(`22 岁 · 出发：${route.name}`);
    save();
    step();
  }

  // ---------- 主推进 ----------
  function step() {
    clearAutoContext(); // 每进一个新画面，先清掉上一个画面的自动上下文，防串局
    if (S.death) return renderDeath();
    if (S.age >= MAX_AGE) return renderEnd();
    save();
    const fork = D.forks.find((f) => f.age === S.age);
    if (fork) { renderFork(fork); return mountStream(); }
    if (S.age in GLIMPSE_AGES) { renderGlimpse(GLIMPSE_AGES[S.age]); return mountStream(); }
    const rare = pickRare();
    if (rare) { renderRare(rare); return mountStream(); }
    const crisis = pickCrisis();
    if (crisis) { renderCrisis(crisis); return mountStream(); }
    renderEventYear();
    mountStream();
  }
  // --- 统一条件求值：路线/标记组合/数值形状/前置链 ---
  function met(e) {
    if (e.route && e.route !== S.route.id) return false;
    if (e.routeIn && !e.routeIn.includes(S.route.id)) return false;
    if (e.forbidRoute && e.forbidRoute === S.route.id) return false;
    if (e.era && S.era !== e.era) return false;
    if (e.eraIn && !e.eraIn.includes(S.era || "c2000")) return false;
    if (e.require && !(Array.isArray(e.require) ? e.require : [e.require]).every((f) => S.flags[f])) return false;
    if (e.forbid && (Array.isArray(e.forbid) ? e.forbid : [e.forbid]).some((f) => S.flags[f])) return false;
    if (e.all && !e.all.every((f) => S.flags[f])) return false;
    if (e.any && !e.any.some((f) => S.flags[f])) return false;
    if (e.chain && !S.usedEvents.includes(e.chain) && !(S.usedRare || []).includes(e.chain)) return false;
    if (e.when && (e.when.lt !== undefined ? S.stats[e.when.stat] >= e.when.lt : S.stats[e.when.stat] <= e.when.gt)) return false;
    if (e.stats && !e.stats.every((c) => (c.lt !== undefined ? S.stats[c.k] < c.lt : S.stats[c.k] > c.gt))) return false;
    return true;
  }
  // --- 稀有事件：条件是门票，骰子是第二道门 ---
  function pickRare() {
    for (const r of D.rare || []) {
      if ((S.usedRare || []).includes(r.id)) continue;
      if (S.age < r.min || S.age > r.max) continue;
      if (!met(r)) continue;
      if (rng() < (r.chance !== undefined ? r.chance : 0.1)) return r;
    }
    return null;
  }
  function renderRare(r) {
    S.usedRare.push(r.id);
    if (!r.choices) { applyEffects(r.effects); if (r.set) S.flags[r.set] = true; } else S.lastDelta = "";
    S.log.push(`${S.age} 岁 · 【稀有】${r.text}`);
    app().innerHTML = `<section class="card rare">${head("这一年不太一样")}
      <p class="rare-tag">稀有事件</p><p class="body">${esc(r.text)}</p>${deltaLine()}
      ${r.choices ? `<div class="choices">${r.choices.map((c, i) => `<button class="choice" data-i="${i}">${esc(c.label)}</button>`).join("")}</div><div id="echo"></div>`
                  : `<button class="primary" id="cont">过一年</button>`}</section>`;
    if (!r.choices) { save(); el("cont").addEventListener("click", advance); armAuto(r.text); return; }
    document.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
      const c = r.choices[Number(b.dataset.i)];
      applyEffects(c.effects);
      if (c.set) S.flags[c.set] = true;
      document.querySelector(".choices").remove();
      el("echo").innerHTML = `${deltaLine()}<p class="echo">${esc(c.echo)}</p><button class="primary" id="cont">过一年</button>`;
      save(); el("cont").addEventListener("click", advance);
    }));
  }
  function rollDeath() {
    const health = S.stats.health;
    let type = null;
    // v2：意外线独立先掷（30 岁前豁免）；健康线 λ(age,H) = a × g^(age−40) × hf(H)，40 岁前为 0
    if (S.age >= 30 && rng() < MORTALITY.accident) type = "accident";
    else if (S.age >= 40) {
      const hf = Math.max(MORTALITY.hfLo, Math.min(MORTALITY.hfHi, (MORTALITY.hfNum - health) / MORTALITY.hfDen));
      if (rng() < MORTALITY.healthA * Math.pow(MORTALITY.healthG, S.age - 40) * hf) type = "health";
    }
    if (!type) return false;
    const pool = DEATH_CAUSES[type];
    const text = pool[Math.floor(rng() * pool.length)];
    S.death = { age: S.age, type, text };
    S.log.push(`${S.age} 岁 · 这一生停在这里：${text}`);
    return true;
  }
  function advance() {
    if (S.death) return renderDeath();
    S.age += 1;
    if (S.age >= MAX_AGE) { S.age = MAX_AGE; return step(); }
    if (rollDeath()) { save(); return renderDeath(); }
    step();
  }
  function renderDeath() {
    clearAutoContext();
    app().classList.remove("playwrap");
    app().innerHTML = `<section class="card death">${head(null, true)}
      <h2>这一生停在了 ${S.death.age} 岁</h2>
      <p class="body">${esc(S.death.text)}</p>
      <button class="primary" id="toend">看这一生的结算</button>
    </section>`;
    el("toend").addEventListener("click", renderEnd);
  }

  function renderFork(fork) {
    app().innerHTML = `<section class="card">${head()}<h2>${esc(fork.title)}</h2><p>${esc(fork.text)}</p>
      <div class="choices">${fork.choices.map((c, i) => `<button class="choice" data-i="${i}">${esc(c.label)}</button>`).join("")}</div></section>`;
    document.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
      const c = fork.choices[Number(b.dataset.i)];
      applyEffects(c.effects);
      if (c.set) S.flags[c.set] = true;
      fork.choices.forEach((o) => { if (o !== c) S.unchosen.push({ kind: "fork", age: fork.age, label: o.label }); });
      S.log.push(`${fork.age} 岁 · ${fork.title.split("·")[1].trim()}：${c.label}`);
      advance();
    }));
  }

  function pickCrisis() {
    for (const [k] of STAT_META) {
      const c = D.crisis[k];
      if (c && !S.crisisUsed[k] && S.stats[k] < c.threshold) return { key: k, ...c };
    }
    return null;
  }
  function renderCrisis(c) {
    if (c.key === "health") { S.healthCrisisSeen = true; save(); }
    app().innerHTML = `<section class="card crisis">${head("身体和日子，都得当回事")}<h2>${S.age} 岁 · ${esc(c.title)}</h2><p>${esc(c.text)}</p>
      <div class="choices">${c.choices.map((ch, i) => `<button class="choice" data-i="${i}">${esc(ch.label)}</button>`).join("")}</div><div id="echo"></div></section>`;
    document.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
      const ch = c.choices[Number(b.dataset.i)];
      applyEffects(ch.effects); S.crisisUsed[c.key] = true;
      S.log.push(`${S.age} 岁 · ${c.title}：${ch.label}`);
      document.querySelector(".choices").remove();
      el("echo").innerHTML = `${deltaLine()}<p class="echo">${esc(ch.echo)}</p><button class="primary" id="cont">过一年</button>`;
      save(); el("cont").addEventListener("click", advance);
    }));
  }

  function pickEvent() {
    const pool = D.events.filter((e) =>
      S.age >= e.min && S.age <= e.max && !S.usedEvents.includes(e.id) && met(e));
    if (!pool.length) return null;
    // 回响事件（require 命中）与本年代事件权重更高：早年的选择更容易被「想起来」，年代质感不能被大池稀释
    const weighted = pool.flatMap((e) => { let n = 1; if (e.require) n = 3; if (e.era && e.era === S.era) n = Math.max(n, 3); return Array(n).fill(e); });
    return weighted[Math.floor(rng() * weighted.length)];
  }
  function renderEventYear() {
    const e = pickEvent();
    if (!e) {
      // 平年微文本：年份不再被静默跳过
      const fresh = D.micro.filter((_, i) => !S.microUsed.includes(i));
      const idx = fresh.length ? D.micro.indexOf(fresh[Math.floor(rng() * fresh.length)]) : Math.floor(rng() * D.micro.length);
      if (!S.microUsed.includes(idx)) S.microUsed.push(idx);
      S.log.push(`${S.age} 岁 · ${D.micro[idx]}`);
      app().innerHTML = `<section class="card">${head()}<p class="body">${esc(D.micro[idx])}</p><button class="primary" id="cont">过一年</button></section>`;
      save(); el("cont").addEventListener("click", advance);
      armAuto(D.micro[idx]);
      return;
    }
    S.usedEvents.push(e.id);
    if (!e.choices) applyEffects(e.effects); else S.lastDelta = "";
    S.log.push(`${S.age} 岁 · ${e.text}`);
    app().innerHTML = `<section class="card">${head()}<p class="body">${esc(e.text)}</p>${deltaLine()}
      ${e.choices ? `<div class="choices">${e.choices.map((c, i) => `<button class="choice" data-i="${i}">${esc(c.label)}</button>`).join("")}</div><div id="echo"></div>`
                  : `<button class="primary" id="cont">过一年</button>`}</section>`;
    if (!e.choices) { save(); el("cont").addEventListener("click", advance); armAuto(e.text); return; }
    const chooseEventChoice = (c, autoSelected) => {
      clearAuto();
      applyEffects(c.effects);
      if (c.set) S.flags[c.set] = true;
      if (autoSelected) S.log.push(`${S.age} 岁 · 自动选：${c.label}`);
      document.querySelector(".choices").remove();
      el("echo").innerHTML = `${deltaLine()}${autoSelected ? `<p class="autonote">自动推进 · 已选「${esc(c.label)}」</p>` : ""}<p class="echo">${esc(c.echo)}</p><button class="primary" id="cont">过一年</button>`;
      save(); el("cont").addEventListener("click", advance);
      if (autoSelected) armAuto(c.echo || c.label, advance, "advance");
    };
    document.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
      chooseEventChoice(e.choices[Number(b.dataset.i)], false);
    }));
    armAuto(e.text, () => {
      const idx = Math.floor(rng() * e.choices.length);
      chooseEventChoice(e.choices[idx], true);
    }, "choice");
  }

  // ---------- 影子瞥视：先给标题，点开才看全文；不看的计数从此是真的 ----------
  function shadowRoute() { const first = S.unchosen.find((u) => u.kind === "route"); return D.shadows[first.id]; }
  function shadowStageText(stage) {
    const variants = shadowRoute().stages[stage];
    return variants[Math.floor(rng() * variants.length)];
  }
  function shadowFinalText(sh) {
    const finals = sh && sh.stages && sh.stages[2];
    if (!Array.isArray(finals) || !finals.length) return "";
    return finals.find((t) => !(S.shadowSeenTexts || []).includes(t)) || finals[0] || "";
  }
  // 结算页与发帖文案共用同一组对照行：主影子拼入结局与代价，其余未选路线按 routes 原序各出一行。
  function shadowCompareLines() {
    if (!S || !Array.isArray(S.unchosen)) return { main: "", others: [] };
    const routeEntries = S.unchosen.filter((u) => u && u.kind === "route");
    if (!routeEntries.length) return { main: "", others: [] };
    const mainEntry = routeEntries[0];
    const mainShadow = D.shadows && D.shadows[mainEntry.id];
    const mainFinal = shadowFinalText(mainShadow);
    const main = mainShadow && mainShadow.name && mainFinal && mainShadow.cost
      ? `另一条路（${mainShadow.name}）也走完了它的一生。${mainFinal}${mainShadow.cost}` : "";
    const routeOrder = new Map(D.routes.map((r, i) => [r.id, i]));
    const others = routeEntries.slice(1)
      .sort((a, b) => (routeOrder.has(a.id) ? routeOrder.get(a.id) : Number.MAX_SAFE_INTEGER)
        - (routeOrder.has(b.id) ? routeOrder.get(b.id) : Number.MAX_SAFE_INTEGER))
      .map((entry) => {
        const sh = D.shadows && D.shadows[entry.id];
        const final = shadowFinalText(sh);
        return sh && sh.name && final ? `${sh.name}：${final}` : "";
      }).filter(Boolean);
    return { main, others };
  }
  function renderGlimpse(stage) {
    const sh = shadowRoute();
    const text = shadowStageText(stage); // 先抽定，点不点开都是这一条（但只有点开才显示）
    app().innerHTML = `<section class="card glimpse">${head()}
      <h2>${S.age} 岁 · 另一条路上的你</h2>
      <p class="teaser">${esc(sh.name)}，今年：${esc(sh.teaser[stage])}</p>
      <p class="hint">细节只给你看一眼。看，还是不看，你自己定——不看的那几次，结算时会记着。</p>
      <div class="row"><button class="primary" id="look">看细节</button><button class="ghost" id="skip">不看，继续过日子</button></div>
      <div id="detail"></div></section>`;
    el("skip").addEventListener("click", () => { S.glimpsesSkipped += 1; S.log.push(`${S.age} 岁 · 没有去看另一条路`); advance(); });
    el("look").addEventListener("click", () => {
      S.glimpsesSeen += 1;
      (S.shadowSeenTexts = S.shadowSeenTexts || []).push(text);
      S.log.push(`${S.age} 岁 · 影子：${text}`);
      el("detail").innerHTML = `<p class="body">「${esc(text)}」</p>
        <label class="refl-label">给现实里的自己留一句话（会出现在你的结算里）<input id="refl" type="text" maxlength="60" placeholder="一句就好"></label>
        <div class="row"><button class="primary" id="cont">记下，继续</button><button class="ghost" id="cont2">不写了，继续</button></div>`;
      document.querySelector(".row").remove();
      const done = () => { const v = (el("refl").value || "").trim(); if (v) S.reflections.push({ age: S.age, text: v }); advance(); };
      el("cont").addEventListener("click", done);
      el("cont2").addEventListener("click", advance);
      save();
    });
  }

  // ---------- 结算 ----------
  function verdict() {
    if (S._verdict) return S._verdict;
    const sorted = Object.entries(S.stats).sort((a, b) => b[1] - a[1]);
    const top = sorted[0][0], bottom = sorted[sorted.length - 1][0];
    const pickF = (v) => (Array.isArray(v) ? v[Math.floor(rng() * v.length)] : v);
    S._verdict = { text: pickF(D.verdictTop[top]) + pickF(D.verdictCost[bottom]), top, bottom };
    return S._verdict;
  }
  const TIER_ORDER = { legendary: 0, epic: 1, rare: 2 };
  const TIER_LABEL = { legendary: "传说结局", epic: "史诗结局", rare: "稀有结局" };
  function specialEnding() {
    const hits = (D.endings || []).filter((e) => met(e));
    if (!hits.length) return null;
    hits.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
    return hits[0];
  }
  function renderEnd() {
    clearAutoContext();
    app().classList.remove("playwrap");
    clearSave();
    const v = verdict();
    const sp = specialEnding();
    S.special = sp;
    const shadowLines = shadowCompareLines();
    const skippedLine = S.glimpsesSkipped ? `<p>你有 ${S.glimpsesSkipped} 次没有去细看另一条路。这样也好，有些事不知道，更睡得着。</p>` : "";
    const reflHtml = S.reflections.length
      ? `<h3>你留给自己的话</h3>` + S.reflections.map((r) => `<p class="refl">「${esc(r.text)}」（${r.age} 岁）</p>`).join("") : "";
    app().innerHTML = `<section class="card">${head(null, true)}
      <h2>${finalAge()} 岁 · 这一局走完了</h2>
      ${S.death ? `<p>这一生停在了 ${S.death.age} 岁：${esc(S.death.text)}</p>` : ""}
      ${sp ? `<div class="special"><p class="rare-tag">${TIER_LABEL[sp.tier]}</p><p class="special-title">${esc(sp.title)}</p><p>${esc(sp.text)}</p></div>` : ""}
      <p class="verdict">${esc(v.text)}</p>
      <p>你走了这条路：${esc(S.route.name)}。</p>
      ${shadowLines.main ? `<p>${esc(shadowLines.main)}</p>` : ""}
      ${shadowLines.others.length ? `<h3>其他几条路</h3>${shadowLines.others.map((line) => `<p>${esc(line)}</p>`).join("")}` : ""}
      ${skippedLine}
      ${reflHtml}
      <div class="row">
        <button class="ghost" id="copylink">复制同局链接（给朋友玩同一种子）</button>
      </div>
      <div class="sharedesk">
        <h3>把这一生寄出去</h3>
        <label class="refl-label">给这一生留一句话（可选）
          <input id="shareline" type="text" maxlength="60" placeholder="一句就好，会出现在发帖文案的开头" value="${S.reflections.length ? esc(S.reflections[0].text) : ""}">
        </label>
        <label class="refl-label"><input type="checkbox" id="cardrefl"> 把这句话印到分享卡上（只有你勾选才会印）</label>
        <p class="setlab">卡面</p>
        <div class="segpicks" id="cardtype">
          <button type="button" class="segbtn sel" data-type="verdict"><b>判词卡</b><small>判词 + 分岔路图 + 五维</small></button>
          <button type="button" class="segbtn" data-type="log"><b>流水账卡</b><small>公元年轴 + 关键节点 + 五维</small></button>
        </div>
        <p class="setlab">尺寸</p>
        <div class="segpicks" id="cardratio">
          <button type="button" class="segbtn sel" data-ratio="45">4:5</button>
          <button type="button" class="segbtn" data-ratio="916">9:16</button>
        </div>
        <div class="cardpreview" id="cardpreview"></div>
        <div class="row">
          <button class="primary" id="share">分享这张卡</button>
          <button class="ghost" id="saveimg">保存图片</button>
          <button class="ghost" id="copytext">复制发帖文案</button>
        </div>
        <details class="sharetext">
          <summary>发帖文案预览</summary>
          <p class="sharetext-body" id="sharetext"></p>
        </details>
      </div>
      <div class="row">
        <button class="primary" id="again-same">同种子再来一局（换选择）</button>
        <button class="ghost" id="again-new">随机种子新开一局</button>
      </div>
      <p class="hint">种子码：${esc(S.seedStr)}。朋友打开同局链接，就是和你完全相同的运气——他选得不一样，会走成什么样？</p>
      <h3>这一生，年表</h3>
      <div class="timeline">${S.log.map((l) => { const m = l.match(/^(\d+) 岁 · ([\s\S]*)$/); const yr = m && S.birthYear ? `${S.birthYear + (+m[1])} 年 · ` : ""; return `<p>${esc(yr + l)}</p>`; }).join("")}</div>
    </section>`;
    el("again-same").addEventListener("click", () => location.assign(sameSeedUrl()));
    el("again-new").addEventListener("click", () => location.assign(location.pathname));
    el("copylink").addEventListener("click", async () => {
      const url = sameSeedUrl();
      try { await navigator.clipboard.writeText(url); el("copylink").textContent = "已复制，去发给他"; }
      catch (e) { el("copylink").textContent = url; }
    });
    // ---------- 分享台接线：切换版式/尺寸即重绘预览 ----------
    let cardType = "verdict", cardRatio = "45";
    const refreshCard = () => {
      currentCanvas = buildCard(cardType, cardRatio);
      currentCanvas.className = "card-img";
      const box = el("cardpreview");
      box.innerHTML = "";
      box.appendChild(currentCanvas);
      el("sharetext").textContent = shareCopy();
    };
    const pickDesk = (id, isType) => {
      const box = el(id);
      box.querySelectorAll(".segbtn").forEach((b) => b.addEventListener("click", () => {
        box.querySelectorAll(".segbtn").forEach((o) => o.classList.remove("sel"));
        b.classList.add("sel");
        if (isType) cardType = b.dataset.type; else cardRatio = b.dataset.ratio;
        refreshCard();
      }));
    };
    pickDesk("cardtype", true);
    pickDesk("cardratio", false);
    el("shareline").addEventListener("input", () => {
      el("sharetext").textContent = shareCopy();
      if (el("cardrefl").checked) refreshCard(); // 勾选了印卡，改字要即时重绘
    });
    el("cardrefl").addEventListener("change", refreshCard);
    el("share").addEventListener("click", shareCurrent);
    el("saveimg").addEventListener("click", downloadCurrent);
    el("copytext").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(shareCopy()); el("copytext").textContent = "已复制，去粘贴吧"; }
      catch (e) { el("copytext").textContent = "复制失败，展开下面的文案预览手动复制"; }
    });
    refreshCard();
  }

  // ---------- 分享卡出图 (VISUAL-DESIGN §二, A 判词版) ----------
  function wrapText(ctx, text, x, y, maxW, lh) {
    let line = "", yy = y;
    for (const ch of text) { if (ctx.measureText(line + ch).width > maxW && line) { ctx.fillText(line, x, yy); line = ch; yy += lh; } else line += ch; }
    if (line) ctx.fillText(line, x, yy);
    return yy + lh;
  }
  // ---------- 分享台出图：buildCard(type, ratio) 参数化绘制 ----------
  // type: "verdict" 判词卡（模板 A：特殊结局标题+判词+分岔路图+五维）
  //       "log"     流水账卡（公元年轴+关键节点+判词节选+五维小条）
  // ratio: "45" 1080×1350 | "916" 1080×1920
  const SERIF = "Georgia, 'Songti SC', 'Noto Serif SC', serif";
  const SANS = "'Hiragino Sans', 'Noto Sans SC', sans-serif";
  let currentCanvas = null; // 分享台当前预览的 canvas，分享/保存都用它

  // 同局链接：种子之外必须带年代与跨度，否则朋友点开不是同一道题
  function sameSeedUrl() {
    return location.origin + location.pathname
      + "?seed=" + encodeURIComponent(S.seedStr)
      + "&era=" + encodeURIComponent(S.era || "c2000");
  }
  // 勾选了「印到卡上」才取感想输入框的当前文字（预填的是第一句 reflection，可改）
  function cardReflText() {
    const box = el("cardrefl"), inp = el("shareline");
    if (!box || !box.checked || !inp) return "";
    return (inp.value || "").trim().slice(0, 40);
  }
  // 发帖文案：感想（若填）+ 判词 + 主影子 + 其他三条路 + 钩子 + 同局链接
  function shareCopy() {
    const line = (el("shareline") ? el("shareline").value : "").trim();
    const parts = [];
    if (line) parts.push(line);
    parts.push(verdict().text);
    const shadowLines = shadowCompareLines();
    if (shadowLines.main) parts.push(shadowLines.main);
    parts.push(...shadowLines.others);
    parts.push("同样的运气，你会怎么选？");
    parts.push(sameSeedUrl());
    return parts.join("\n");
  }
  function fitText(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
    return t + "…";
  }
  function cardBase(x, W, H) {
    x.fillStyle = "#FAF8F4"; x.fillRect(0, 0, W, H);
    x.strokeStyle = "#DDD6C9"; x.lineWidth = 3; x.strokeRect(36, 36, W - 72, H - 72);
    x.textAlign = "left";
    x.fillStyle = "#2F4A3C"; x.font = "34px " + SERIF;
    x.fillText("如果那年 · 另一条路", 90, 130);
    x.fillStyle = "#8A948C"; x.font = "28px monospace"; x.textAlign = "right";
    x.fillText("种子 " + S.seedStr, W - 90, 130); x.textAlign = "left";
  }
  function cardFooter(x, W, H) {
    x.fillStyle = "#2F4A3C"; x.font = "34px " + SERIF;
    x.fillText("同样的运气，你会怎么选？", 90, H - 140);
    x.fillStyle = "#8A948C"; x.font = "28px " + SANS;
    x.fillText("if-that-year.pages.dev", 90, H - 88);
  }
  function cardStats(x, y, barW, rowH) {
    const step = rowH || 50;
    x.font = "28px " + SANS;
    STAT_META.forEach(([k, label]) => {
      x.fillStyle = "#23211C"; x.fillText(label, 90, y + 8);
      x.fillStyle = "#DDD6C9"; x.fillRect(190, y - 8, barW, 14);
      x.fillStyle = "#2F4A3C"; x.fillRect(190, y - 8, (barW * S.stats[k]) / 100, 14);
      x.fillStyle = "#23211C"; x.fillText(String(S.stats[k]), 190 + barW + 30, y + 8);
      y += step;
    });
    return y;
  }
  // 分岔路图：松绿实线一生 + 影子灰绿虚线支路（与原判词卡同一画法）
  function drawRoad(x, gy) {
    const end = finalAge();
    x.strokeStyle = "#2F4A3C"; x.lineWidth = 7; x.beginPath(); x.moveTo(90, gy); x.lineTo(990, gy); x.stroke();
    x.strokeStyle = "#8A948C"; x.lineWidth = 4; x.setLineDash([14, 12]);
    D.forks.filter((f) => f.age < end).forEach((f) => { const fx = 90 + (900 * (f.age - START_AGE)) / (end - START_AGE); x.beginPath(); x.moveTo(fx, gy); x.quadraticCurveTo(fx + 60, gy - 90, fx + 150, gy - 110); x.stroke(); });
    x.setLineDash([]);
    x.fillStyle = "#2F4A3C"; x.beginPath(); x.arc(990, gy, 12, 0, 7); x.fill();
  }
  function parseLog() {
    const entries = [];
    for (const l of S.log) {
      const m = l.match(/^(\d+) 岁 · ([\s\S]*)$/);
      if (m) entries.push({ age: +m[1], text: m[2] });
    }
    return entries;
  }
  // 流水账卡的关键节点（3–5 个）：第一次分岔选择 / 稀有事件 / 后段分岔 / 特殊结局
  function logNodes() {
    const entries = parseLog();
    const picked = [];
    const push = (age, title) => { if (age !== null && title && !picked.some((p) => p.age === age)) picked.push({ age, title }); };
    const forks = entries.filter((e) => e.age > START_AGE && e.text.includes("：") && !e.text.includes("影子"));
    if (forks[0]) push(forks[0].age, forks[0].text.split("：")[0]);
    const rares = entries.filter((e) => e.text.includes("【稀有】"));
    if (rares[0]) push(rares[0].age, "稀有 · " + rares[0].text.replace("【稀有】", "").slice(0, 10));
    if (rares[1]) push(rares[1].age, "稀有 · " + rares[1].text.replace("【稀有】", "").slice(0, 10));
    if (forks.length > 1) push(forks[forks.length - 1].age, forks[forks.length - 1].text.split("：")[0]);
    picked.sort((a, b) => a.age - b.age);
    const out = picked.slice(0, 5);
    if (S.special && !out.some((p) => p.age === finalAge())) {
      if (out.length >= 5) out.pop();
      out.push({ age: finalAge(), title: S.special.title });
    }
    return out;
  }
  // 9:16 流水账卡补的年表节选：带「：」的抉择行与稀有行优先，再等距补足
  function logHighlights(n) {
    const entries = parseLog();
    if (entries.length <= n) return entries;
    const picks = new Set();
    entries.forEach((e, i) => { if (e.text.includes("：") || e.text.includes("【稀有】")) picks.add(i); });
    const stepN = Math.max(1, Math.floor(entries.length / n));
    for (let i = 0; i < entries.length && picks.size < n; i += stepN) picks.add(i);
    return [...picks].sort((a, b) => a - b).slice(0, n + 1).map((i) => entries[i]);
  }

  function buildCard(type, ratio) {
    const W = 1080, H = ratio === "916" ? 1920 : 1350;
    const big = H > 1500; // 9:16 用宽松参数，4:5 用紧凑参数防溢出
    const sh = shadowRoute(); const v = verdict();
    const end = finalAge();
    const refl = cardReflText();
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d");
    cardBase(x, W, H);

    if (type === "log") {
      // ===== 流水账卡：公元年轴 + 关键节点 =====
      x.fillStyle = "#23211C"; x.font = "52px " + SERIF;
      x.fillText("这一生 · 流水账", 90, 252);
      x.fillStyle = "#8A948C"; x.font = "30px " + SANS;
      const spanTxt = S.birthYear
        ? `公元 ${S.birthYear + START_AGE} 年 — ${S.birthYear + end} 年 · ${S.route.name}`
        : `${START_AGE} 岁 — ${end} 岁 · ${S.route.name}`;
      x.fillText(spanTxt, 90, 308);
      let y = 340;
      if (S.special) {
        x.fillStyle = "#2F4A3C"; x.font = "40px " + SERIF;
        y = wrapText(x, "【" + S.special.title + "】", 90, y + 44, 900, 58);
      }
      const gy = y + (S.special ? 150 : 210); // 年轴：上方留给分岔虚线
      drawRoad(x, gy);
      // 轴两端：公元年 · 年龄
      x.font = "26px " + SANS; x.fillStyle = "#8A948C";
      x.fillText(S.birthYear ? `${S.birthYear + START_AGE} 年 · 22 岁` : "22 岁", 90, gy + 148);
      x.textAlign = "right";
      x.fillText(S.birthYear ? `${S.birthYear + end} 年 · ${end} 岁` : `${end} 岁`, 990, gy + 148);
      x.textAlign = "left";
      // 关键节点：圆点 + 竖线 + 公元年/年龄 + 事件短题
      logNodes().forEach((n) => {
        const nx = 90 + (900 * (n.age - START_AGE)) / (end - START_AGE);
        x.strokeStyle = "#DDD6C9"; x.lineWidth = 2;
        x.beginPath(); x.moveTo(nx, gy + 12); x.lineTo(nx, gy + 30); x.stroke();
        x.fillStyle = "#2F4A3C"; x.beginPath(); x.arc(nx, gy, 9, 0, 7); x.fill();
        const align = nx < 210 ? "left" : nx > 870 ? "right" : "center";
        const ax = nx < 210 ? 90 : nx > 870 ? 990 : nx;
        x.textAlign = align;
        x.fillStyle = "#8A948C"; x.font = "24px monospace";
        x.fillText(S.birthYear ? `${S.birthYear + n.age} 年 · ${n.age} 岁` : `${n.age} 岁`, ax, gy + 62);
        x.fillStyle = "#23211C"; x.font = "26px " + SANS;
        x.fillText(fitText(x, n.title, 260), ax, gy + 100);
        x.textAlign = "left";
      });
      y = gy + 196;
      x.fillStyle = "#8A948C"; x.font = "26px " + SANS;
      x.fillText("终局判词", 90, y);
      x.fillStyle = "#23211C"; x.font = "36px " + SERIF;
      const excerpt = v.text.split("。")[0] + "。"; // 节选第一句，卡面不贪多
      y = wrapText(x, excerpt, 90, y + 52, 900, 52);
      if (refl) { x.fillStyle = "#2F4A3C"; x.font = "34px " + SERIF; y = wrapText(x, "「" + refl + "」", 90, y + 12, 900, 50); }
      if (big) {
        // 9:16 长卡补年表节选，免得下半页空着
        y += 40;
        x.fillStyle = "#2F4A3C"; x.font = "32px " + SERIF;
        x.fillText("年表节选", 90, y);
        x.font = "27px " + SANS; x.fillStyle = "#23211C";
        for (const h of logHighlights(7)) {
          y += 46;
          const line = (S.birthYear ? `${S.birthYear + h.age} 年 · ` : "") + `${h.age} 岁 · ${h.text}`;
          x.fillText(fitText(x, line, 900), 90, y);
        }
        y += 8;
      }
      cardStats(x, y + 26, 560, 44);
    } else {
      // ===== 判词卡（模板 A），视觉元素与旧版一致 =====
      const titleY = big ? 246 : 232;
      const tall = big ? (H - 1350) * 0.35 : 0;
      x.fillStyle = "#23211C";
      let y;
      if (S.special) {
        x.font = (big ? 58 : 50) + "px " + SERIF;
        y = wrapText(x, "【" + S.special.title + "】", 90, titleY + tall * 0.4, 900, big ? 80 : 72);
        x.font = "46px " + SERIF;
        y = wrapText(x, v.text, 90, y + 6, 900, big ? 66 : 60);
      } else {
        x.font = (big ? 58 : 52) + "px " + SERIF;
        y = wrapText(x, v.text, 90, titleY + tall * 0.4, 900, big ? 80 : 68);
      }
      const gy = y + (big ? 80 : 56) + tall * 0.6;
      drawRoad(x, gy);
      x.font = "30px " + SERIF; x.fillStyle = "#8A948C";
      x.fillText("22 岁", 90, gy + 54); x.textAlign = "right"; x.fillText(end + " 岁", 990, gy + 54); x.textAlign = "left";
      const keyFork = S.log.find((l) => l.includes("回不回老家")) || S.log.find((l) => l.includes("·") && l.includes("："));
      y = gy + (big ? 118 : 104);
      x.fillStyle = "#23211C"; x.font = "34px " + SANS;
      if (keyFork) y = wrapText(x, "关键的一岔：" + keyFork.split("· ")[1], 90, y, 900, 50);
      y = wrapText(x, "这条路：" + S.route.name + "，你走完了。", 90, y + 6, 900, 50);
      x.fillStyle = "#8A948C";
      y = wrapText(x, "另一条路（" + sh.name + "）：" + sh.cost, 90, y + 6, 900, big ? 50 : 46);
      if (refl) { x.fillStyle = "#2F4A3C"; x.font = "34px " + SERIF; y = wrapText(x, "「" + refl + "」", 90, y + 10, 900, 50); }
      cardStats(x, y + (big ? 26 : 14), 560, big ? 50 : 42);
    }
    cardFooter(x, W, H);
    return c;
  }

  function downloadCurrent() {
    if (!currentCanvas) return;
    const a = document.createElement("a");
    a.download = "if-that-year-" + S.seedStr + ".png";
    a.href = currentCanvas.toDataURL("image/png");
    a.click();
  }
  // 主按钮：优先 Web Share API 带图片文件；不支持或失败退化为下载 PNG（用户取消分享则不打扰）
  async function shareCurrent() {
    if (!currentCanvas) return;
    try {
      const blob = await new Promise((res) => currentCanvas.toBlob(res, "image/png"));
      const file = blob ? new File([blob], "if-that-year-" + S.seedStr + ".png", { type: "image/png" }) : null;
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: shareCopy() });
        return;
      }
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
    downloadCurrent();
  }

  renderStart();
})();
