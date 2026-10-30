// 《如果那年》确定性引擎 v0.1 —— 规则决定, 文案呈现; 在线零 LLM 调用
(function () {
  "use strict";
  // --- 种子随机 (mulberry32): 同一种子可复现同一局, 支撑「同种子对战」 ---
  function rngFromSeed(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seedFromString(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  const STAT_META = [
    ["health", "健康"], ["money", "金钱"], ["growth", "成长"], ["freedom", "自由"], ["relation", "关系"]
  ];
  const GLIMPSE_AGES = [30, 40, 50];
  const END_AGE = 65;

  const el = (id) => document.getElementById(id);
  let S = null; // state

  function newGame(seedStr) {
    const seed = seedFromString(seedStr);
    S = {
      seedStr, rng: rngFromSeed(seed), age: 22, route: null,
      stats: { health: 60, money: 40, growth: 50, freedom: 50, relation: 50 },
      unchosen: [], glimpsesSkipped: 0, log: [], usedEvents: new Set(), reflections: {}
    };
    renderStart();
  }
  function clamp(v) { return Math.max(0, Math.min(100, v)); }
  function apply(effects) {
    if (!effects) return;
    for (const k in effects) S.stats[k] = clamp(S.stats[k] + effects[k]);
  }
  function statsHTML() {
    return STAT_META.map(([k, label]) =>
      `<div class="stat"><span>${label}</span><div class="bar"><i style="width:${S.stats[k]}%"></i></div><b>${S.stats[k]}</b></div>`).join("");
  }
  function shell(inner) {
    el("app").innerHTML = `
      <header><div class="brand">如果那年</div><div class="seed">种子 ${S.seedStr} · ${S.age} 岁</div></header>
      <section class="stats">${statsHTML()}</section>
      <main>${inner}</main>`;
  }
  function renderStart() {
    shell(`
      <h1>如果那年，你选了另一条路</h1>
      <p class="lead">22 岁，毕业照拍完，宿舍要退了。这一局，你选一条走到底——但你没选的那条，也会继续走，在你看不见的地方。30、40、50 岁，你可以回头看它一眼。看不看，随你。</p>
      <div class="choices">
        ${window.GAME_DATA.routes.map(r => `<button class="choice route" data-route="${r.id}"><b>${r.name}</b><span>${r.desc}</span></button>`).join("")}
      </div>`);
    document.querySelectorAll("[data-route]").forEach(b => b.addEventListener("click", () => chooseRoute(b.dataset.route)));
  }
  function chooseRoute(id) {
    const route = window.GAME_DATA.routes.find(r => r.id === id);
    S.route = route; apply(route.stats);
    S.unchosen = window.GAME_DATA.routes.filter(r => r.id !== id).map(r => r.id);
    S.log.push({ age: 22, text: `你选了「${route.name}」。` });
    try { localStorage.setItem("if-that-year:last-seed", S.seedStr); } catch (e) {}
    nextYear();
  }
  function pickEvent() {
    const pool = window.GAME_DATA.events.filter((e, i) => S.age >= e.min && S.age <= e.max && !S.usedEvents.has(i));
    if (!pool.length) return null;
    const idx = window.GAME_DATA.events.indexOf(pool[Math.floor(S.rng() * pool.length)]);
    S.usedEvents.add(idx);
    return window.GAME_DATA.events[idx];
  }
  function nextYear() {
    S.age += 1;
    if (S.age >= END_AGE) return renderEnd();
    if (GLIMPSE_AGES.includes(S.age)) return renderGlimpse();
    const fork = window.GAME_DATA.forks.find(f => f.age === S.age);
    if (fork) return renderFork(fork);
    const ev = pickEvent();
    if (!ev) return nextYear();
    apply(ev.effects);
    S.log.push({ age: S.age, text: ev.text });
    shell(`<div class="card"><div class="age">${S.age} 岁</div><p>${ev.text}</p>
      <button class="primary" id="cont">过一年</button></div>`);
    el("cont").addEventListener("click", nextYear);
  }
  function renderFork(fork) {
    shell(`<div class="card fork"><div class="age">${fork.title}</div><p>${fork.text}</p>
      <div class="choices">${fork.choices.map((c, i) => `<button class="choice" data-i="${i}">${c.label}</button>`).join("")}</div></div>`);
    document.querySelectorAll("[data-i]").forEach(b => b.addEventListener("click", () => {
      const c = fork.choices[Number(b.dataset.i)];
      apply(c.effects);
      S.log.push({ age: S.age, text: `${fork.title} —— 你选了「${c.label}」。` });
      fork.choices.forEach((o, i) => { if (i !== Number(b.dataset.i)) S.unchosen.push("fork:" + fork.age + ":" + i); });
      nextYear();
    }));
  }
  function shadowLine() {
    const routeId = S.unchosen.find(u => !String(u).startsWith("fork:")) || S.route.id;
    const arr = window.GAME_DATA.shadows[routeId] || [];
    const stage = S.age >= 50 ? 2 : S.age >= 40 ? 1 : 0;
    const name = (window.GAME_DATA.routes.find(r => r.id === routeId) || {}).name || "";
    return { name, text: arr[Math.min(stage, arr.length - 1)] || "" };
  }
  function renderGlimpse() {
    const sh = shadowLine();
    shell(`<div class="card glimpse"><div class="age">${S.age} 岁 · 影子人生</div>
      <p>另一条路上的你（${sh.name}）：${sh.text}。</p>
      <p class="hint">这是片段，不是全貌——现实里我们对没走的那条路，了解的也只有这么多。</p>
      <label class="refl">给现实里的自己留一句话（会进你的结算卡）
        <input id="refl" type="text" maxlength="60" placeholder="例如：别怕慢，怕的是没回头看过"></label>
      <button class="primary" id="cont">收下，继续</button>
      <button class="ghost" id="skip">不看细节，直接继续</button></div>`);
    el("cont").addEventListener("click", () => { const v = el("refl").value.trim(); if (v) S.reflections[S.age] = v; nextYear(); });
    el("skip").addEventListener("click", () => { S.glimpsesSkipped += 1; nextYear(); });
  }
  function verdict() {
    const top = STAT_META.slice().sort((a, b) => S.stats[b[0]] - S.stats[a[0]])[0];
    const map = { health: "你选了长久，日子也选了你", money: "你攒下了底气，也付过代价", growth: "你一直在往前走，这件事本身就是答案", freedom: "你选了自由，自由也选了你", relation: "你把人放在前面，人也把你放在心上" };
    return map[top[0]];
  }
  function renderEnd() {
    const sh = shadowLine();
    const refl = Object.keys(S.reflections).map(a => `${a} 岁那年你写：${S.reflections[a]}`).join("；");
    shell(`<div class="card end"><div class="age">65 岁 · 结算</div>
      <h2>${verdict()}</h2>
      <p>这条路（${S.route.name}）你走完了。另一条路上的你（${sh.name}）：${sh.text}——那边也不是天堂，只是另一种日子。</p>
      ${S.glimpsesSkipped ? `<p>你有 ${S.glimpsesSkipped} 次，没去细看另一条路。</p>` : ""}
      ${refl ? `<p class="refl-out">${refl}</p>` : ""}
      <div class="timeline">${S.log.map(l => `<div><b>${l.age} 岁</b> ${l.text}</div>`).join("")}</div>
      <div class="row">
        <button class="primary" id="card">生成分享卡（PNG）</button>
        <button class="primary" id="again-same">同种子再来一局（换选择）</button>
        <button class="ghost" id="again-new">随机种子新开一局</button>
      </div>
      <p class="hint">分享种子码「${S.seedStr}」给朋友：同样的运气，不同的选择——这就是同种子对战。</p></div>`);
    el("again-same").addEventListener("click", () => newGame(S.seedStr));
    el("again-new").addEventListener("click", () => newGame(String(Math.floor(Math.random() * 1e6))));
    el("card").addEventListener("click", drawCard);
  }
  // --- 分享卡出图 (VISUAL-DESIGN §二, A 判词版): Canvas 1080x1440, 本地生成零服务器 ---
  function wrapText(ctx, text, x, y, maxW, lh) {
    let line = "", yy = y;
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxW && line) { ctx.fillText(line, x, yy); line = ch; yy += lh; }
      else line += ch;
    }
    if (line) ctx.fillText(line, x, yy);
    return yy + lh;
  }
  function drawCard() {
    const sh = shadowLine();
    const c = document.createElement("canvas"); c.width = 1080; c.height = 1440;
    const x = c.getContext("2d");
    x.fillStyle = "#FAF8F4"; x.fillRect(0, 0, 1080, 1440);
    x.strokeStyle = "#DDD6C9"; x.lineWidth = 3; x.strokeRect(36, 36, 1008, 1368);
    x.fillStyle = "#2F4A3C"; x.font = "34px Georgia, 'Songti SC', serif"; x.textBaseline = "alphabetic";
    x.fillText("如果那年 · 另一条路", 90, 130);
    x.fillStyle = "#8A948C"; x.font = "28px monospace"; x.textAlign = "right";
    x.fillText("种子 " + S.seedStr, 990, 130); x.textAlign = "left";
    x.fillStyle = "#23211C"; x.font = "64px Georgia, 'Songti SC', serif";
    let y = wrapText(x, verdict(), 90, 250, 900, 84);
    // 分岔路图: 实线一生 + 虚线影子
    const gy = y + 90;
    x.strokeStyle = "#2F4A3C"; x.lineWidth = 7; x.beginPath(); x.moveTo(90, gy); x.lineTo(990, gy); x.stroke();
    const forks = S.log.filter(l => window.GAME_DATA.forks.some(f => f.age === l.age));
    x.strokeStyle = "#8A948C"; x.lineWidth = 4; x.setLineDash([14, 12]);
    forks.forEach((l) => {
      const fx = 90 + (900 * (l.age - 22)) / (END_AGE - 22);
      x.beginPath(); x.moveTo(fx, gy); x.quadraticCurveTo(fx + 60, gy - 90, fx + 150, gy - 110); x.stroke();
    });
    x.setLineDash([]);
    x.fillStyle = "#2F4A3C"; x.beginPath(); x.arc(990, gy, 12, 0, 7); x.fill();
    x.font = "30px Georgia, 'Songti SC', serif"; x.fillStyle = "#8A948C";
    x.fillText("22 岁", 90, gy + 54); x.textAlign = "right"; x.fillText("65 岁", 990, gy + 54); x.textAlign = "left";
    y = gy + 130;
    x.fillStyle = "#23211C"; x.font = "36px 'Hiragino Sans', 'Noto Sans SC', sans-serif";
    y = wrapText(x, "这条路：" + S.route.name + "，你走完了。", 90, y, 900, 52);
    x.fillStyle = "#8A948C";
    y = wrapText(x, "另一条路（" + sh.name + "）：" + sh.text + "。", 90, y + 8, 900, 52);
    // 五维小条 (不带名次不带总分)
    y += 30; x.font = "28px 'Hiragino Sans', 'Noto Sans SC', sans-serif";
    STAT_META.forEach(([k, label]) => {
      x.fillStyle = "#23211C"; x.fillText(label, 90, y + 8);
      x.fillStyle = "#DDD6C9"; x.fillRect(190, y - 8, 560, 14);
      x.fillStyle = "#2F4A3C"; x.fillRect(190, y - 8, 560 * S.stats[k] / 100, 14);
      x.fillStyle = "#23211C"; x.fillText(String(S.stats[k]), 780, y + 8);
      y += 52;
    });
    x.fillStyle = "#2F4A3C"; x.font = "34px Georgia, 'Songti SC', serif";
    x.fillText("你敢看你的另一条路吗？", 90, 1300);
    x.fillStyle = "#8A948C"; x.font = "28px 'Hiragino Sans', 'Noto Sans SC', sans-serif";
    x.fillText("if-that-year.pages.dev", 90, 1352);
    const a = document.createElement("a");
    a.download = "if-that-year-" + S.seedStr + ".png";
    a.href = c.toDataURL("image/png"); a.click();
  }
  // 启动: URL ?seed= 优先, 否则随机
  const params = new URLSearchParams(location.search);
  newGame(params.get("seed") || String(Math.floor(Math.random() * 1e6)));
})();
