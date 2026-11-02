// 《如果那年》统一 storylet 层（v0.20.0 M1-B）——加载位：序章之后、engine.js 之前（见 index.html）。
// 职责有二，都只搬不改：
//  1) 接管并入：原 engine.js 开头的并入逻辑原样搬到此处执行——GAME_PACKS concat 进 D.events、
//     GAME_SYNERGY 的 combos 并入 events、rare/endings 赋值给 D。顺序与结果与旧引擎一字不变；
//     engine.js 只保留数据守卫，读到的 D 已是并入后状态（CARDS/PRO/RHYTHM 等常量在 engine.js
//     里本来就排在并入之后读取，位置关系不变）。
//  2) 归一化：给并入后的全部条目挂 sl 元数据字段（不改任何现有字段、不改变任何抽取行为；
//     layer 只是元数据，M2 才消费）。
// 条目来源集合：D.events（主池 + 扩展包 + combos）、D.rare、D.forks、序章 acts（已含 sitActs）、
// D.crisis 各条目（pickCrisis 的实际来源集合，layer=1 的归属）。两类只登记清单不挂 sl：
//  - endings 是结局定义不是条目：只在 GAME_STORYLET.manifest.endings 登记 id 清单；
//  - micro 是纯字符串数组（平年微文本，实际形态为 string）：无法挂字段，只在 manifest 登记
//    条数与 layer=4，不改数据形态。
// sl 派生规则（全部按条目现有属性，不新造数据）：
//  - kind：forks 与 procOnly 条目为 "jump"，其余 "call"；
//  - domain：procOnly → "process"；带 era/eraIn 门 → "era"；带 chain 或 ctx 职业旗门 → "line"；
//    来自 rare/combos → "rare"；其余 → "pool"（按此顺序判定）；
//  - layer：forks/procOnly → 0；crisis 条目 → 1；带 chain 或来自 rare/combos → 2；其余 → 3；
//    micro → 4（仅 manifest 登记，见上）；
//  - win：[条目 min || 22, 条目 max || 80]。
(function () {
  "use strict";
  const D = window.GAME_DATA;
  if (!D || !Array.isArray(D.events)) return; // 数据缺失时不并入、不挂牌；提示渲染由 engine.js 的守卫负责

  // ---- 1) 并入（原 engine.js 开头逻辑，顺序与结果一字不变）----
  if (window.GAME_PACKS) D.events = D.events.concat(window.GAME_PACKS); // 事件扩展包（src/content/）在 storylet 层并入主池
  const comboSet = new Set();
  if (window.GAME_SYNERGY) { // 协同组合与稀有系统（docs/SYNERGY-AND-RARE-ENDINGS.md）
    const combos = window.GAME_SYNERGY.combos || [];
    for (const c of combos) comboSet.add(c);
    D.events = D.events.concat(combos);
    D.rare = window.GAME_SYNERGY.rare || [];
    D.endings = window.GAME_SYNERGY.endings || [];
  }
  const rareSet = new Set(D.rare || []);

  // ---- 2) 归一化：挂 sl ----
  function domainOf(e, src) {
    if (e.procOnly) return "process";
    if (e.era || e.eraIn) return "era";
    if (e.chain || e.ctx) return "line";
    if (src === "rare" || src === "combo") return "rare";
    return "pool";
  }
  function layerOf(e, src) {
    if (src === "fork" || e.procOnly) return 0;
    if (src === "crisis") return 1;
    if (e.chain || src === "rare" || src === "combo") return 2;
    return 3;
  }
  function tag(e, src) {
    if (!e || typeof e !== "object") return;
    e.sl = {
      domain: domainOf(e, src),
      win: [e.min || 22, e.max || 80],
      layer: layerOf(e, src),
      kind: (src === "fork" || e.procOnly) ? "jump" : "call",
    };
  }
  for (const e of D.events) tag(e, comboSet.has(e) ? "combo" : "event");
  for (const r of D.rare || []) tag(r, "rare");
  void rareSet;
  for (const f of D.forks || []) tag(f, "fork");
  const PRO = window.GAME_PROLOGUE || null;
  if (PRO && Array.isArray(PRO.acts)) for (const a of PRO.acts) tag(a, "prologue"); // acts 已含 sitActs（prologue.js 导出时 concat）
  for (const c of Object.values(D.crisis || {})) tag(c, "crisis");

  // ---- 登记清单（不挂 sl 的两类）与计数 ----
  const counts = { total: 0, byDomain: {}, byLayer: {}, byKind: {} };
  const bump = (e) => {
    if (!e || !e.sl) return;
    counts.total++;
    counts.byDomain[e.sl.domain] = (counts.byDomain[e.sl.domain] || 0) + 1;
    counts.byLayer[e.sl.layer] = (counts.byLayer[e.sl.layer] || 0) + 1;
    counts.byKind[e.sl.kind] = (counts.byKind[e.sl.kind] || 0) + 1;
  };
  for (const e of D.events) bump(e);
  for (const r of D.rare || []) bump(r);
  for (const f of D.forks || []) bump(f);
  if (PRO && Array.isArray(PRO.acts)) for (const a of PRO.acts) bump(a);
  for (const c of Object.values(D.crisis || {})) bump(c);

  window.GAME_STORYLET = {
    counts,
    manifest: {
      endings: (D.endings || []).map((e) => e.id), // 结局定义：只登记清单，不挂 sl
      micro: { count: (D.micro || []).length, layer: 4 }, // 纯字符串数组：无法挂字段，只登记
    },
  };
})();
