#!/usr/bin/env node
/* 《如果那年》状态矩阵入库门（v0.12.0 起）——内容轮交付前必跑，绿了才入库。
   用法：node tools/validate-state.js
   检查：注册表为单一事实源——数据里出现的每个旗标/状态/流转都必须在 src/registry.js 登记，
   登记与数据实扫必须双向一致；不可逆边、互斥组合、终态自门控在数据层报错拦截。
   退出码：0 = 通过（警告可存在，需在交付说明里交代）；1 = 有错误。 */
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path");
const ROOT = path.join(__dirname, "..");
const PACK_ORDER = ["pack1","pack2","pack3","pack4","pack5","pack6","pack9","pack10","pack11","pack12","pack13","pack14","pack15","pack16","pack17","pack18","pack19","pack20","pack21","pack22","pack23","pack24","pack25","pack26","pack27","pack28","pack29","pack30","era1955","era1965","era1978"];
const ld = (rel, key) => { const s = { window: {} }; vm.createContext(s); vm.runInContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), s, { filename: rel }); return s.window[key]; };
const errors = [], warnings = [];
const err = (m) => errors.push(m), warn = (m) => warnings.push(m);

const REG = ld("src/registry.js", "GAME_REGISTRY");
const D = ld("src/events.js", "GAME_DATA");
let events = [...D.events];
for (const p of PACK_ORDER) events = events.concat(ld(`src/packs/${p}.js`, "GAME_PACKS") || []);
const syn = ld("src/synergy.js", "GAME_SYNERGY");
events = events.concat(syn.combos || [], syn.rare || [], syn.endings || []);
const byId = new Map();
for (const e of events) { if (byId.has(e.id)) err(`重复 id: ${e.id}`); byId.set(e.id, e); }

const DOMAINS = REG.domains || {}, MILESTONES = REG.milestones || {};
const DOMAIN_FLAGS = new Set(["partner","single_ok","slow_love","divorced","spouse_dead","has_kid","no_kid","undecided_kid","dad_dead","mom_dead","dog_home","dog_gone","cat_gone"]); // v0.11 时代的域旗，数据中不得再出现
const asArr = (v) => v == null ? [] : (Array.isArray(v) ? v : [v]);
const edgeKey = (d, f, t) => `${d}:${f}>${t}`;
const declaredEdges = new Map(); // edgeKey -> edge
for (const [dom, def] of Object.entries(DOMAINS)) for (const e of def.edges || []) declaredEdges.set(edgeKey(dom, e.from, e.to), { dom, ...e });

// ---- 数据实扫 ----
const seenSetters = new Map(); // flag -> Set(itemId)
const seenCarriers = new Map(); // edgeKey -> Set(itemId)
const stateRefs = new Set(); // "dom=value" 正向要求出现过
function scan(item, itemId) {
  for (const fld of ["require", "forbid", "all", "any"]) for (const f of asArr(item[fld])) {
    if (DOMAIN_FLAGS.has(f)) err(`${itemId}: 域旗 ${f} 仍出现在 ${fld}（v0.12 起改用 state/stateNot）`);
    else if (!(f in MILESTONES)) err(`${itemId}: ${fld} 引用未登记旗标 ${f}`);
  }
  if (item.set) {
    if (DOMAIN_FLAGS.has(item.set)) err(`${itemId}: set 仍在立域旗 ${item.set}（改用 setState）`);
    else if (!(item.set in MILESTONES)) err(`${itemId}: set 未登记旗标 ${item.set}`);
    else { if (!seenSetters.has(item.set)) seenSetters.set(item.set, new Set()); seenSetters.get(item.set).add(itemId); }
  }
  for (const [fld] of [["state"], ["stateAll"], ["stateNot"]]) {
    if (!item[fld]) continue;
    for (const [dom, v] of Object.entries(item[fld])) {
      if (!DOMAINS[dom]) { err(`${itemId}: ${fld} 引用未登记域 ${dom}`); continue; }
      for (const val of asArr(v)) {
        if (!DOMAINS[dom].states.includes(val)) err(`${itemId}: ${fld} 引用域 ${dom} 的未登记状态 ${val}`);
        if (fld === "state") stateRefs.add(`${dom}=${val}`);
      }
    }
  }
  if (item.stateNot) for (const fld of ["state", "stateAll"]) if (item[fld]) for (const [dom, v] of Object.entries(item[fld])) {
    const nots = asArr(item.stateNot[dom]);
    for (const val of asArr(v)) if (nots.includes(val)) err(`${itemId}: 互斥组合——${fld}.${dom} 要求 ${val} 又被 stateNot 排除`);
  }
  if (item.state && item.stateAll) for (const dom of Object.keys(item.stateAll)) if (item.state[dom] !== undefined) {
    const a = asArr(item.state[dom]), b = asArr(item.stateAll[dom]);
    if (!b.every((v) => a.includes(v))) err(`${itemId}: 互斥组合——state.${dom} 与 stateAll.${dom} 候选集不一致`);
  }
  if (item.setState) for (const [dom, to] of Object.entries(item.setState)) {
    if (!DOMAINS[dom]) { err(`${itemId}: setState 引用未登记域 ${dom}`); continue; }
    // 该条目可能从多个 from 出发（载体只声明边，from 由运行时当前状态定）；登记为所有指向 to 的已声明边的载体出现
    let matched = false;
    for (const [k, e] of declaredEdges) if (e.dom === dom && e.to === to && (e.by || []).length) { matched = true; if (!seenCarriers.has(k)) seenCarriers.set(k, new Set()); seenCarriers.get(k).add(itemId); }
    if (!matched) err(`${itemId}: setState ${dom}→${to} 无已启用的声明边（未登记或 reserved 边）`);
    // 终态自门控：进入 terminal 状态的条目必须自带前态门（state 正向=前态，或 chain 指向进入前态的载体且 stateNot 排除终态）
    const term = DOMAINS[dom].terminal || [];
    if (term.includes(to)) {
      const pres = [...declaredEdges.values()].filter((e) => e.dom === dom && e.to === to).map((e) => e.from);
      const selfGated = (item.state && pres.some((p) => asArr(item.state[dom]).includes(p))) || (item.stateAll && pres.some((p) => asArr(item.stateAll[dom]).includes(p)));
      let chainGated = false;
      if (!selfGated && item.chain && item.stateNot && asArr(item.stateNot[dom]).includes(to)) {
        const anchor = byId.get(item.chain);
        const anchorInto = anchor && anchor.setState && anchor.setState[dom];
        if (pres.includes(anchorInto)) chainGated = true;
      }
      if (!selfGated && !chainGated) err(`${itemId}: 进入终态 ${dom}=${to} 未自门控前态（需 state.${dom}∈{${pres}} 或 chain+stateNot 组合）`);
    }
  }
  if (item.chain && !byId.has(item.chain)) err(`${itemId}: chain 指向不存在的 ${item.chain}`);
  for (const c of (item.choices || [])) scan(c, itemId);
}
for (const e of events) scan(e, e.id);
for (const f of D.forks) for (const c of f.choices) scan(c, `fork${f.age}`);
for (const [k, c] of Object.entries(D.crisis || {})) for (const ch of c.choices) scan(ch, `crisis_${k}`);

// ---- 注册表双向一致性 ----
for (const [flag, def] of Object.entries(MILESTONES)) {
  const declared = new Set(def.setters || []);
  const seen = seenSetters.get(flag) || new Set();
  for (const id of declared) if (!seen.has(id)) err(`注册表里程碑 ${flag}: 声明 setter ${id} 在数据中未找到`);
  for (const id of seen) if (!declared.has(id)) err(`里程碑 ${flag}: 数据中 ${id} 立了此旗但注册表未登记该 setter`);
}
for (const [flag, seen] of seenSetters) if (!(flag in MILESTONES)) err(`数据中出现未登记里程碑 ${flag}（setter: ${[...seen].join(",")}）`);
for (const [k, e] of declaredEdges) {
  if (!(e.by || []).length) continue; // reserved 边单列警告
  const seen = seenCarriers.get(k) || new Set();
  for (const id of e.by) if (!seen.has(id)) err(`注册表边 ${k}: 声明载体 ${id} 在数据中未产生该流转`);
  for (const id of seen) if (!e.by.includes(id)) err(`边 ${k}: 数据中 ${id} 产生该流转但注册表 by 未登记`);
}

// ---- 不可逆与可达性 ----
for (const [dom, def] of Object.entries(DOMAINS)) {
  for (const t of (def.terminal || [])) for (const e of (def.edges || [])) if (e.from === t) err(`不可逆违规: 域 ${dom} 终态 ${t} 存在出边 →${e.to}`);
  // 可达性 BFS（只走已启用边）
  const reach = new Set([def.initial]);
  let grew = true;
  while (grew) { grew = false; for (const e of (def.edges || [])) if ((e.by || []).length && reach.has(e.from) && !reach.has(e.to)) { reach.add(e.to); grew = true; } }
  for (const s of def.states) if (!reach.has(s)) warn(`域 ${dom} 状态 ${s} 无已启用可达路径`);
  for (const e of (def.edges || [])) if (!(e.by || []).length) warn(`域 ${dom} 边 ${e.from}→${e.to} 为 reserved（已设计无载体）：${e.note || ""}`);
  for (const s of def.states) if (s !== def.initial && ![...declaredEdges.values()].some((e) => e.dom === dom && e.to === s)) warn(`域 ${dom} 状态 ${s} 无任何入边声明`);
}

console.log(`validate-state: 条目 ${events.length}（含核心/扩展/协同/稀有/结局）| 域 ${Object.keys(DOMAINS).length} | 里程碑 ${Object.keys(MILESTONES).length}`);
console.log(`错误 ${errors.length} 条:`); errors.forEach((m) => console.log("  ERROR", m));
console.log(`警告 ${warnings.length} 条:`); warnings.forEach((m) => console.log("  WARN", m));
console.log(errors.length ? "RESULT: FAIL" : "RESULT: PASS");
process.exit(errors.length ? 1 : 0);
