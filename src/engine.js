// 《如果那年》引擎 v0.2 —— 重设计落地（docs/CRITIQUE-AND-REDESIGN.md）
// 要点：选择写标记→回响事件 / 年度小选择+当场回响 / 数值阈值危机 / 瞥视先给标题、点开才看全文（计数真实）
//      / 判词按数值形状拼装 / 全程自动存档可续玩 / 种子可输入、可复制分享链接 / 在线零 LLM 调用
(function () {
  "use strict";
  const D = window.GAME_DATA;
  const START_AGE = 22, END_AGE = 65;
  const STAT_META = [["health", "健康"], ["money", "金钱"], ["growth", "成长"], ["freedom", "自由"], ["relation", "关系"]];
  const GLIMPSE_AGES = { 30: 0, 40: 1, 50: 2 };
  const SAVE_KEY = "ify-save-v2";

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
      seedStr, age: START_AGE,
      stats: { health: 60, money: 45, growth: 50, freedom: 50, relation: 50 },
      route: null, unchosen: [], log: [], reflections: [],
      usedEvents: [], flags: {}, crisisUsed: {}, microUsed: [],
      glimpsesSeen: 0, glimpsesSkipped: 0, lastDelta: "",
    };
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...S, rngA: RNG.a })); } catch (e) { /* 存不了不阻塞游玩 */ } }
  function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && s.route ? s : null; } catch (e) { return null; } }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

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
  function head(note) {
    return `${statsBar()}<p class="meta">${S.age} 岁 · ${esc(S.route.name)} · 种子 ${esc(S.seedStr)}${note ? " · " + note : ""}</p>`;
  }
  function deltaLine() { return S.lastDelta ? `<p class="delta">${esc(S.lastDelta)}</p>` : ""; }

  // ---------- 开局 ----------
  function renderStart() {
    clearSave0();
    const saved = loadSave();
    const seedParam = new URLSearchParams(location.search).get("seed");
    app().innerHTML = `
      <section class="card">
        <h1>22 岁，宿舍要退了。</h1>
        <p>行李收好，站在宿舍门口。往后的路要自己选。这局大约十分钟，从 22 岁走到 65 岁。</p>
        <p>选一条路开始。其他的路也不会消失——它们会变成你的「另一条路」，在你 30、40、50 岁的时候，远远地看你一眼。</p>
        ${saved ? `<button class="primary big" id="resume">继续上次的人生（${saved.age} 岁 · ${esc(saved.route.name)}）</button>` : ""}
        <div class="choices">${D.routes.map((r, i) => `<button class="choice" data-i="${i}"><b>${esc(r.name)}</b><small>${esc(r.desc)}</small></button>`).join("")}</div>
        <div class="seedrow">
          <input id="seedin" type="text" placeholder="朋友给的种子码，填这里">
          <button class="ghost" id="seedgo">用这个种子开局</button>
        </div>
        <p class="hint">也可以自己写一个词当种子（比如生日、幸运数字）。同一种子，同样的运气，不同的选择。${seedParam ? `<br>你打开的链接带着种子「${esc(seedParam)}」，点任意一条路就开始同一局。` : ""}</p>
      </section>`;
    if (saved) el("resume").addEventListener("click", () => { S = saved; RNG.a = saved.rngA || seedFromString(saved.seedStr); step(); });
    document.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
      const chosen = D.routes[Number(b.dataset.i)];
      const seedStr = (el("seedin").value || "").trim() || seedParam || String(Math.floor(Math.random() * 1e6));
      newGame(seedStr, chosen);
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

  function newGame(seedStr, route) {
    S = freshState(seedStr);
    RNG.a = seedFromString(seedStr);
    S.route = route;
    S.unchosen = D.routes.filter((r) => r.id !== route.id).map((r) => ({ kind: "route", label: r.name, id: r.id }));
    applyEffects(route.stats); S.lastDelta = "";
    S.log.push(`22 岁 · 出发：${route.name}`);
    save();
    step();
  }

  // ---------- 主推进 ----------
  function step() {
    if (S.age >= END_AGE) return renderEnd();
    save();
    const fork = D.forks.find((f) => f.age === S.age);
    if (fork) return renderFork(fork);
    if (S.age in GLIMPSE_AGES) return renderGlimpse(GLIMPSE_AGES[S.age]);
    const crisis = pickCrisis();
    if (crisis) return renderCrisis(crisis);
    renderEventYear();
  }
  function advance() { S.age += 1; step(); }

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
      S.age >= e.min && S.age <= e.max && !S.usedEvents.includes(e.id) &&
      (!e.route || e.route === S.route.id) && (!e.forbidRoute || e.forbidRoute !== S.route.id) &&
      (!e.require || S.flags[e.require]) && (!e.forbid || !S.flags[e.forbid]));
    if (!pool.length) return null;
    // 回响事件（require 命中）权重更高：早年的选择应该更容易被「想起来」
    const weighted = pool.flatMap((e) => (e.require ? [e, e, e] : [e]));
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
      return;
    }
    S.usedEvents.push(e.id);
    if (!e.choices) applyEffects(e.effects); else S.lastDelta = "";
    S.log.push(`${S.age} 岁 · ${e.text}`);
    app().innerHTML = `<section class="card">${head()}<p class="body">${esc(e.text)}</p>${deltaLine()}
      ${e.choices ? `<div class="choices">${e.choices.map((c, i) => `<button class="choice" data-i="${i}">${esc(c.label)}</button>`).join("")}</div><div id="echo"></div>`
                  : `<button class="primary" id="cont">过一年</button>`}</section>`;
    if (!e.choices) { save(); el("cont").addEventListener("click", advance); return; }
    document.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
      const c = e.choices[Number(b.dataset.i)];
      applyEffects(c.effects);
      document.querySelector(".choices").remove();
      el("echo").innerHTML = `${deltaLine()}<p class="echo">${esc(c.echo)}</p><button class="primary" id="cont">过一年</button>`;
      save(); el("cont").addEventListener("click", advance);
    }));
  }

  // ---------- 影子瞥视：先给标题，点开才看全文；不看的计数从此是真的 ----------
  function shadowRoute() { const first = S.unchosen.find((u) => u.kind === "route"); return D.shadows[first.id]; }
  function shadowStageText(stage) {
    const variants = shadowRoute().stages[stage];
    return variants[Math.floor(rng() * variants.length)];
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
    const sorted = Object.entries(S.stats).sort((a, b) => b[1] - a[1]);
    const top = sorted[0][0], bottom = sorted[sorted.length - 1][0];
    return { text: D.verdictTop[top] + D.verdictCost[bottom], top, bottom };
  }
  function renderEnd() {
    clearSave();
    const v = verdict();
    const sh = shadowRoute();
    const skippedLine = S.glimpsesSkipped ? `<p>你有 ${S.glimpsesSkipped} 次没有去细看另一条路。这样也好，有些事不知道，更睡得着。</p>` : "";
    const reflHtml = S.reflections.length
      ? `<h3>你留给自己的话</h3>` + S.reflections.map((r) => `<p class="refl">「${esc(r.text)}」（${r.age} 岁）</p>`).join("") : "";
    app().innerHTML = `<section class="card">${head()}
      <h2>65 岁 · 这一局走完了</h2>
      <p class="verdict">${esc(v.text)}</p>
      <p>你走了这条路：${esc(S.route.name)}。</p>
      <p>另一条路（${esc(sh.name)}）也走完了它的一生。${esc(sh.stages[2].find((t) => !(S.shadowSeenTexts || []).includes(t)) || sh.stages[2][0])}</p>
      <p>${esc(sh.cost)}</p>
      ${skippedLine}
      ${reflHtml}
      <div class="row">
        <button class="primary" id="card">生成分享卡（PNG）</button>
        <button class="ghost" id="copylink">复制同局链接（给朋友玩同一种子）</button>
      </div>
      <label class="refl-label"><input type="checkbox" id="cardrefl"> 把我留的话里第一句放进分享卡（只有你勾选才会印）</label>
      <div class="row">
        <button class="primary" id="again-same">同种子再来一局（换选择）</button>
        <button class="ghost" id="again-new">随机种子新开一局</button>
      </div>
      <p class="hint">种子码：${esc(S.seedStr)}。朋友打开同局链接，就是和你完全相同的运气——他选得不一样，会走成什么样？</p>
      <h3>这一生，年表</h3>
      <div class="timeline">${S.log.map((l) => `<p>${esc(l)}</p>`).join("")}</div>
    </section>`;
    el("again-same").addEventListener("click", () => location.assign(location.pathname + "?seed=" + encodeURIComponent(S.seedStr)));
    el("again-new").addEventListener("click", () => location.assign(location.pathname));
    el("copylink").addEventListener("click", async () => {
      const url = location.origin + location.pathname + "?seed=" + encodeURIComponent(S.seedStr);
      try { await navigator.clipboard.writeText(url); el("copylink").textContent = "已复制，去发给他"; }
      catch (e) { el("copylink").textContent = url; }
    });
    el("card").addEventListener("click", drawCard);
  }

  // ---------- 分享卡出图 (VISUAL-DESIGN §二, A 判词版) ----------
  function wrapText(ctx, text, x, y, maxW, lh) {
    let line = "", yy = y;
    for (const ch of text) { if (ctx.measureText(line + ch).width > maxW && line) { ctx.fillText(line, x, yy); line = ch; yy += lh; } else line += ch; }
    if (line) ctx.fillText(line, x, yy);
    return yy + lh;
  }
  function drawCard() {
    const sh = shadowRoute(); const v = verdict();
    const c = document.createElement("canvas"); c.width = 1080; c.height = 1440;
    const x = c.getContext("2d");
    x.fillStyle = "#FAF8F4"; x.fillRect(0, 0, 1080, 1440);
    x.strokeStyle = "#DDD6C9"; x.lineWidth = 3; x.strokeRect(36, 36, 1008, 1368);
    x.fillStyle = "#2F4A3C"; x.font = "34px Georgia, 'Songti SC', serif";
    x.fillText("如果那年 · 另一条路", 90, 130);
    x.fillStyle = "#8A948C"; x.font = "28px monospace"; x.textAlign = "right";
    x.fillText("种子 " + S.seedStr, 990, 130); x.textAlign = "left";
    x.fillStyle = "#23211C"; x.font = "58px Georgia, 'Songti SC', serif";
    let y = wrapText(x, v.text, 90, 246, 900, 80);
    const gy = y + 80;
    x.strokeStyle = "#2F4A3C"; x.lineWidth = 7; x.beginPath(); x.moveTo(90, gy); x.lineTo(990, gy); x.stroke();
    x.strokeStyle = "#8A948C"; x.lineWidth = 4; x.setLineDash([14, 12]);
    D.forks.forEach((f) => { const fx = 90 + (900 * (f.age - START_AGE)) / (END_AGE - START_AGE); x.beginPath(); x.moveTo(fx, gy); x.quadraticCurveTo(fx + 60, gy - 90, fx + 150, gy - 110); x.stroke(); });
    x.setLineDash([]);
    x.fillStyle = "#2F4A3C"; x.beginPath(); x.arc(990, gy, 12, 0, 7); x.fill();
    x.font = "30px Georgia, 'Songti SC', serif"; x.fillStyle = "#8A948C";
    x.fillText("22 岁", 90, gy + 54); x.textAlign = "right"; x.fillText("65 岁", 990, gy + 54); x.textAlign = "left";
    const keyFork = S.log.find((l) => l.includes("回不回老家")) || S.log.find((l) => l.includes("·") && l.includes("："));
    y = gy + 118;
    x.fillStyle = "#23211C"; x.font = "34px 'Hiragino Sans', 'Noto Sans SC', sans-serif";
    if (keyFork) y = wrapText(x, "关键的一岔：" + keyFork.split("· ")[1], 90, y, 900, 50);
    y = wrapText(x, "这条路：" + S.route.name + "，你走完了。", 90, y + 6, 900, 50);
    x.fillStyle = "#8A948C";
    y = wrapText(x, "另一条路（" + sh.name + "）：" + sh.cost, 90, y + 6, 900, 50);
    const withRefl = el("cardrefl") && el("cardrefl").checked && S.reflections.length;
    if (withRefl) { x.fillStyle = "#2F4A3C"; x.font = "34px Georgia, 'Songti SC', serif"; y = wrapText(x, "「" + S.reflections[0].text.slice(0, 40) + "」", 90, y + 10, 900, 50); }
    y += 26; x.font = "28px 'Hiragino Sans', 'Noto Sans SC', sans-serif";
    STAT_META.forEach(([k, label]) => {
      x.fillStyle = "#23211C"; x.fillText(label, 90, y + 8);
      x.fillStyle = "#DDD6C9"; x.fillRect(190, y - 8, 560, 14);
      x.fillStyle = "#2F4A3C"; x.fillRect(190, y - 8, (560 * S.stats[k]) / 100, 14);
      x.fillStyle = "#23211C"; x.fillText(String(S.stats[k]), 780, y + 8);
      y += 50;
    });
    x.fillStyle = "#2F4A3C"; x.font = "34px Georgia, 'Songti SC', serif";
    x.fillText("同样的运气，你会怎么选？", 90, 1300);
    x.fillStyle = "#8A948C"; x.font = "28px 'Hiragino Sans', 'Noto Sans SC', sans-serif";
    x.fillText("if-that-year.pages.dev", 90, 1352);
    const a = document.createElement("a");
    a.download = "if-that-year-" + S.seedStr + ".png";
    a.href = c.toDataURL("image/png"); a.click();
  }

  renderStart();
})();
