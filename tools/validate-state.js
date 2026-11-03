#!/usr/bin/env node
/* 《如果那年》状态矩阵入库门（v0.12.0 起）——内容轮交付前必跑，绿了才入库。
   用法：node tools/validate-state.js
   检查：注册表为单一事实源——数据里出现的每个旗标/状态/流转都必须在 src/registry.js 登记，
   登记与数据实扫必须双向一致；不可逆边、互斥组合、终态自门控在数据层报错拦截；
   另含旗标可生产性 fixpoint（v0.13.1 起）：依赖环造成的不可达条目列为错误；
   及窗口 × 前置最早可达年龄检查（v0.14.0 起）：窗口终点早于状态门/chain 前置最早可达年龄、或 minYear 在全部允许年代下够不到的条目列为错误（推导口径见 docs/STATE-MATRIX.md §7）。
   退出码：0 = 通过（警告可存在，需在交付说明里交代）；1 = 有错误。 */
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path");
const ROOT = path.join(__dirname, "..");
const PACK_FILES = ["src/content/pool/pack1.js", "src/content/pool/pack2.js", "src/content/pool/pack3.js", "src/content/pool/pack4.js", "src/content/pool/pack5.js", "src/content/pool/pack6.js", "src/content/pool/pack9.js", "src/content/pool/pack10.js", "src/content/pool/pack11.js", "src/content/pool/pack12.js", "src/content/lines/side-and-steady.js", "src/content/pool/pack14.js", "src/content/pool/pack15.js", "src/content/lines/exam.js", "src/content/pool/pack17.js", "src/content/pool/pack18.js", "src/content/pool/pack19.js", "src/content/pool/pack20.js", "src/content/pool/pack21.js", "src/content/pool/pack22.js", "src/content/pool/pack23.js", "src/content/lines/late-life.js", "src/content/pool/pack25.js", "src/content/pool/pack26.js", "src/content/pool/pack27.js", "src/content/pool/pack28.js", "src/content/pool/pack29.js", "src/content/pool/pack30.js", "src/content/pool/pack33.js", "src/content/pool/pack31.js", "src/content/pool/pack32.js", "src/content/pool/pack34.js", "src/content/lines/covenant.js", "src/content/lines/process-beats.js", "src/content/lines/abroad.js", "src/content/era/era1955.js", "src/content/era/era1965.js", "src/content/era/era1978.js"];
const ld = (rel, key) => { const s = { window: {} }; vm.createContext(s); vm.runInContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), s, { filename: rel }); return s.window[key]; };
const errors = [], warnings = [];
const err = (m) => errors.push(m), warn = (m) => warnings.push(m);

const REG = (() => { const s = { window: {} }; vm.createContext(s); for (const rel of ["src/world/state.js", "src/registry.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), s, { filename: rel }); return s.window.GAME_REGISTRY; })(); // v0.20.0 拆分：domains 在 src/world/state.js，milestones 在 src/registry.js，须同沙盒顺序载入
const D = ld("src/events.js", "GAME_DATA");
let events = [...D.events];
for (const p of PACK_FILES) events = events.concat(ld(p, "GAME_PACKS") || []); // v0.20.0 M1-B：内容按领域重组至 src/content/，PACK_FILES 为 index.html 相对顺序的完整路径
const syn = ld("src/content/rare/synergy.js", "GAME_SYNERGY");
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
// 载体 from 推断（v0.13.0 口径补强，docs/STATE-MATRIX.md §7）：setState 的 from 优先按条目自身（含从父事件继承）的正向 state/stateAll 门控推断；
// 无门控的分岔条目按此表声明前态——分岔是一次性年龄节点，前态由结构保证（fork31 在 31 岁触发，此前无任何条目能写 spouse；fork38 同理于 kids）。
const UNGATED_FORK_FROM = { fork31: { spouse: "none" }, fork38: { kids: "undecided" }, fork45: { kids: "undecided" }, pr_origin: { schooling: "pre" }, pr_fork16: { track: "pre" } }; // v0.17.0：序章两个结构节点同理（来历幕落定处境、16 岁分岔写入轨道，前态由结构保证）
function scan(item, itemId, inhGate) {
  const effGate = Object.assign({}, inhGate);
  for (const fld of ["state", "stateAll"]) if (item[fld]) for (const [dom, v] of Object.entries(item[fld])) effGate[dom] = asArr(v);
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
    // 载体 from 推断：有正向门控（含继承）只登记 from∈门控值的边；无门控分岔按 UNGATED_FORK_FROM；其余无门控条目登记为所有指向 to 的已启用边的载体出现
    const froms = effGate[dom] || (UNGATED_FORK_FROM[itemId] && UNGATED_FORK_FROM[itemId][dom] ? [UNGATED_FORK_FROM[itemId][dom]] : null);
    let matched = false;
    for (const [k, e] of declaredEdges) if (e.dom === dom && e.to === to && (e.by || []).length && (!froms || froms.includes(e.from))) { matched = true; if (!seenCarriers.has(k)) seenCarriers.set(k, new Set()); seenCarriers.get(k).add(itemId); }
    if (!matched) err(`${itemId}: setState ${dom}→${to} 无已启用的声明边（未登记或 reserved 边，或门控 from 与声明边不符）`);
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
  if (item.setStateBySit) for (const variant of Object.values(item.setStateBySit)) { // v0.18.0：来历幕按处境落定（setStateBySit），与 setState 同规实扫
    for (const [dom, to] of Object.entries(variant || {})) {
      if (!DOMAINS[dom]) { err(`${itemId}: setStateBySit 引用未登记域 ${dom}`); continue; }
      if (!DOMAINS[dom].states.includes(to)) { err(`${itemId}: setStateBySit 引用域 ${dom} 的未登记状态 ${to}`); continue; }
      let matched = false;
      for (const [k, e] of declaredEdges) if (e.dom === dom && e.to === to && (e.by || []).includes(itemId)) { matched = true; if (!seenCarriers.has(k)) seenCarriers.set(k, new Set()); seenCarriers.get(k).add(itemId); }
      if (!matched) err(`${itemId}: setStateBySit ${dom}→${to} 无已启用的声明边（未登记或 by 未含本条目）`);
    }
  }
  if (item.chain && !byId.has(item.chain)) err(`${itemId}: chain 指向不存在的 ${item.chain}`);
  // 通用门/变体字段登记核对（v0.19.0 三相）：kidMin/kidMax 须为数字且下限不大于上限；
  // flagAgeWithin.flag 须为已登记里程碑、years 须为非负数；echoState/textState 须为 { 域: { 状态值: 非空文本 } }，域与状态值须已登记。
  if (item.kidMin != null && typeof item.kidMin !== "number") err(`${itemId}: kidMin 不是数字`);
  if (item.kidMax != null && typeof item.kidMax !== "number") err(`${itemId}: kidMax 不是数字`);
  if (item.kidMin != null && item.kidMax != null && item.kidMin > item.kidMax) err(`${itemId}: kidMin ${item.kidMin} 大于 kidMax ${item.kidMax}`);
  // 真实年龄门（v0.20.1，W3）：kidAgeMin/kidAgeMax（锚出生年 kidsBornAt ?? kidsAt）与 petMin/petMax（锚抱回年 catAt/dogAt），
  // 形状与 kidMin 同口径——须为数字且下限不大于上限；语义与物种推断见 src/registry.js 登记与 src/scheduler.js 的 kidAgeTrue/petAgesTrue。
  if (item.kidAgeMin != null && typeof item.kidAgeMin !== "number") err(`${itemId}: kidAgeMin 不是数字`);
  if (item.kidAgeMax != null && typeof item.kidAgeMax !== "number") err(`${itemId}: kidAgeMax 不是数字`);
  if (item.kidAgeMin != null && item.kidAgeMax != null && item.kidAgeMin > item.kidAgeMax) err(`${itemId}: kidAgeMin ${item.kidAgeMin} 大于 kidAgeMax ${item.kidAgeMax}`);
  if (item.petMin != null && typeof item.petMin !== "number") err(`${itemId}: petMin 不是数字`);
  if (item.petMax != null && typeof item.petMax !== "number") err(`${itemId}: petMax 不是数字`);
  if (item.petMin != null && item.petMax != null && item.petMin > item.petMax) err(`${itemId}: petMin ${item.petMin} 大于 petMax ${item.petMax}`);
  if (item.flagAgeWithin) {
    const fw = item.flagAgeWithin;
    if (!(fw.flag in MILESTONES)) err(`${itemId}: flagAgeWithin.flag 引用未登记里程碑 ${fw.flag}`);
    else if (typeof fw.years !== "number" || fw.years < 0) err(`${itemId}: flagAgeWithin.years 不是非负数`);
  }
  // 返聘后复退门与退休年数变体（v0.20.1 W7 登记）：rehireAfterRetire 须为布尔；
  // textRetireYears 须为 { mid, long 非空文本 }，且条目 text 须真含「没多久」（替换锚点，防变体静默失效）。
  if (item.rehireAfterRetire !== undefined && typeof item.rehireAfterRetire !== "boolean") err(`${itemId}: rehireAfterRetire 不是布尔`);
  if (item.textRetireYears !== undefined) {
    const ry = item.textRetireYears;
    if (!ry || typeof ry !== "object" || Array.isArray(ry)) err(`${itemId}: textRetireYears 不是对象`);
    else {
      for (const k of ["mid", "long"]) if (typeof ry[k] !== "string" || !ry[k]) err(`${itemId}: textRetireYears.${k} 不是非空文本`);
      if (typeof item.text === "string" && !item.text.includes("没多久")) err(`${itemId}: textRetireYears 已声明但 text 不含「没多久」（变体替换无锚点）`);
    }
  }
  for (const fld of ["echoState", "textState"]) {
    if (!item[fld]) continue;
    for (const [dom, variants] of Object.entries(item[fld])) {
      if (!DOMAINS[dom]) { err(`${itemId}: ${fld} 引用未登记域 ${dom}`); continue; }
      for (const [val, txt] of Object.entries(variants || {})) {
        if (!DOMAINS[dom].states.includes(val)) err(`${itemId}: ${fld} 引用域 ${dom} 的未登记状态 ${val}`);
        else if (typeof txt !== "string" || !txt) err(`${itemId}: ${fld}.${dom}.${val} 不是非空文本`);
      }
    }
  }
  // 活计形态字段登记核对（v0.20.0 M2）：ctx.form/notForm 须为形态值域（farm/public/self/flex/employee）内的非空数组；
  // textForm/echoForm 须为 { 形态: 非空文本 }。形态是派生量（work.js formOf 规则表），此处只核形状与值域。
  const FORM_VALUES = ["farm", "public", "self", "flex", "employee"];
  if (item.ctx) for (const fld of ["form", "notForm"]) {
    if (item.ctx[fld] === undefined) continue;
    const v = item.ctx[fld];
    if (!Array.isArray(v) || !v.length) err(`${itemId}: ctx.${fld} 应为非空数组`);
    else for (const fv of v) if (!FORM_VALUES.includes(fv)) err(`${itemId}: ctx.${fld} 含非法形态值 ${fv}`);
  }
  // 主线门（v0.20.0 M2 第二批）：ctx.mainLine 须为入行旗 id 或其非空数组，值必须是
  // work.js FORM_OF_FLAG 的键（与形态派生同一张表）；标量字符串与数组两种形状都认。
  const ENTRY_FLAGS = ["farm_work", "exam_landed", "shop_work", "gig_work", "courier_work", "care_work", "write_work", "factory_work", "fab_work", "craft_work", "heavy_work", "miner_work", "truck_work", "med_hosp", "med_work", "nurse_work", "img_work", "teach_work", "acct_work", "fin_work", "press_work", "dev_work", "driver_taxi"];
  if (item.ctx && item.ctx.mainLine !== undefined) {
    const v = item.ctx.mainLine;
    const arr = Array.isArray(v) ? v : [v];
    if (!arr.length || arr.some((x) => typeof x !== "string")) err(`${itemId}: ctx.mainLine 应为入行旗 id 或其非空数组`);
    else for (const fv of arr) if (!ENTRY_FLAGS.includes(fv)) err(`${itemId}: ctx.mainLine 含非入行旗 ${fv}`);
  }
  // 在护对象门（v0.20.1 W8 登记）：ctx.anyCareTarget 出现时须为 true（求值口径见 registry.js 头注释与 record.js ctxOk）
  if (item.ctx && item.ctx.anyCareTarget !== undefined && item.ctx.anyCareTarget !== true) err(`${itemId}: ctx.anyCareTarget 应为 true`);
  for (const fld of ["textForm", "echoForm", "labelForm"]) {
    if (!item[fld]) continue;
    for (const [fv, txt] of Object.entries(item[fld])) {
      if (!FORM_VALUES.includes(fv)) err(`${itemId}: ${fld} 含非法形态键 ${fv}`);
      else if (typeof txt !== "string" || !txt) err(`${itemId}: ${fld}.${fv} 不是非空文本`);
    }
  }
  // 年代变体（v0.20.1 面板急修登记）：textEra/echoEra/labelEra 须为 { 年代id: 非空文本 }，键值域为四个年代 id。
  const ERA_VALUES = ["c1955", "c1965", "c1978", "c2000"];
  for (const fld of ["textEra", "echoEra", "labelEra"]) {
    if (!item[fld]) continue;
    for (const [ev, txt] of Object.entries(item[fld])) {
      if (!ERA_VALUES.includes(ev)) err(`${itemId}: ${fld} 含非法年代键 ${ev}`);
      else if (typeof txt !== "string" || !txt) err(`${itemId}: ${fld}.${ev} 不是非空文本`);
    }
  }
  for (const c of (item.choices || [])) scan(c, itemId, effGate);
  for (const v of (item.variants || [])) scan(v, itemId, effGate); // v0.21.1：序章变体池与选项同规实扫（变体级 set 记在幕 id 名下）
}
for (const e of events) scan(e, e.id);
// 出身牌（v0.13.0）：牌是钩子旗的 setter 本体，一并实扫（id 与事件不得撞名）
const CARDS = ld("src/content/prologue/cards.js", "GAME_CARDS");
let cardCount = 0;
if (CARDS && CARDS.byId) for (const c of Object.values(CARDS.byId)) { cardCount++; if (byId.has(c.id)) err(`重复 id: 牌 ${c.id} 与事件撞名`); scan(c, c.id); }
for (const f of D.forks) for (const c of f.choices) scan(c, f.id || `fork${f.age}`); // v0.18.0：同龄双分岔（fork28/fork28m）以显式 id 为键
for (const [k, c] of Object.entries(D.crisis || {})) for (const ch of c.choices) scan(ch, `crisis_${k}`);
// 序章幕（v0.17.0，src/content/prologue/prologue.js）：与事件同规实扫（顶层 set/setState 与选项递归）
const PRO = ld("src/content/prologue/prologue.js", "GAME_PROLOGUE");
if (PRO && PRO.acts) for (const a of PRO.acts) scan(a, a.id);

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
const reservedInfo = []; // v0.17.0：注册表显式 reserved 登记（域 reservedStates / 边 reserved:true）是「已设计未开放」，单列信息行，不算警告——与意外死内容区分
for (const [dom, def] of Object.entries(DOMAINS)) {
  for (const t of (def.terminal || [])) for (const e of (def.edges || [])) if (e.from === t) err(`不可逆违规: 域 ${dom} 终态 ${t} 存在出边 →${e.to}`);
  // 可达性 BFS（只走已启用边）
  const reach = new Set([def.initial]);
  let grew = true;
  while (grew) { grew = false; for (const e of (def.edges || [])) if ((e.by || []).length && reach.has(e.from) && !reach.has(e.to)) { reach.add(e.to); grew = true; } }
  for (const s of def.states) {
    if ((def.reservedStates || []).includes(s)) { reservedInfo.push(`域 ${dom} 状态 ${s}（reserved，已登记未开放）`); continue; }
    if (!reach.has(s)) warn(`域 ${dom} 状态 ${s} 无已启用可达路径`);
  }
  for (const e of (def.edges || [])) if (!(e.by || []).length) {
    if (e.reserved) { reservedInfo.push(`域 ${dom} 边 ${e.from}→${e.to}（reserved：${e.note || ""}）`); continue; }
    warn(`域 ${dom} 边 ${e.from}→${e.to} 为 reserved（已设计无载体）：${e.note || ""}`);
  }
  for (const s of def.states) if (s !== def.initial && ![...declaredEdges.values()].some((e) => e.dom === dom && e.to === s)) warn(`域 ${dom} 状态 ${s} 无任何入边声明`);
}

// ---- 旗标可生产性（v0.13.1 补盲，B1 教训：chain 方向写反造成的「立旗环」旧检查全绿却整线死亡）----
// 可达 fixpoint：条目可呈现 ⟺ 其正向依赖全可满足（require/all 旗可生产、any 至少一可生产、chain 前置可呈现、正向状态值可达）；
// 旗可生产 ⟺ 至少一个 setter 条目可呈现；状态值可达 ⟺ 初始值，或存在已声明边 u→v 且 u 可达、某载体条目可呈现并写出该流转。
// 负向门（forbid/stateNot）不影响可生产性；数值门（when/stats/危机阈值）、年代/路线/公历年不建模（视为可满足）。口径见 docs/STATE-MATRIX.md §7。
const prodItems = new Map();
function newAcc() { return { flags: new Set(), any: new Set(), chain: null, states: new Map(), sets: new Set(), setStates: [] }; }
function collectDeps(item, acc) {
  for (const f of asArr(item.require)) acc.flags.add(f);
  for (const f of asArr(item.all)) acc.flags.add(f);
  for (const f of asArr(item.any)) acc.any.add(f);
  if (item.chain) acc.chain = item.chain;
  for (const fld of ["state", "stateAll"]) if (item[fld]) for (const [dom, v] of Object.entries(item[fld])) { if (!acc.states.has(dom)) acc.states.set(dom, new Set()); for (const val of asArr(v)) acc.states.get(dom).add(val); }
  if (item.set) acc.sets.add(item.set);
  if (item.setState) for (const [dom, to] of Object.entries(item.setState)) acc.setStates.push([dom, to]);
  if (item.setStateBySit) for (const variant of Object.values(item.setStateBySit)) for (const [dom, to] of Object.entries(variant || {})) acc.setStates.push([dom, to]);
  for (const c of (item.choices || [])) collectDeps(c, acc);
  for (const v of (item.variants || [])) collectDeps(v, acc); // v0.21.1：变体级 set 计入可生产性，与 scan 同规
}
for (const e of events) { const acc = newAcc(); collectDeps(e, acc); prodItems.set(e.id, acc); }
for (const f of D.forks) { const acc = newAcc(); for (const c of f.choices) collectDeps(c, acc); prodItems.set(f.id || `fork${f.age}`, acc); }
for (const [k, c] of Object.entries(D.crisis || {})) { const acc = newAcc(); for (const ch of c.choices) collectDeps(ch, acc); prodItems.set(`crisis_${k}`, acc); }
if (CARDS && CARDS.byId) for (const c of Object.values(CARDS.byId)) { const acc = newAcc(); collectDeps(c, acc); prodItems.set(c.id, acc); }
if (PRO && PRO.acts) for (const a of PRO.acts) { const acc = newAcc(); collectDeps(a, acc); prodItems.set(a.id, acc); }
const structural = new Set([...D.forks.map((f) => f.id || `fork${f.age}`), ...Object.keys(D.crisis || {}).map((k) => `crisis_${k}`), ...(CARDS && CARDS.byId ? Object.keys(CARDS.byId) : []), ...(PRO && PRO.acts ? PRO.acts.map((a) => a.id) : [])]); // 序章幕是序列驱动的结构节点，与分岔同规
const presentable = new Set(structural);
const producible = new Set();
const attainable = new Map(); for (const [dom, def] of Object.entries(DOMAINS)) attainable.set(dom, new Set([def.initial]));
const edgeList = [...declaredEdges.values()];
let grewP = true;
while (grewP) {
  grewP = false;
  for (const [id, acc] of prodItems) {
    if (presentable.has(id)) continue;
    let ok = true;
    for (const f of acc.flags) if (!producible.has(f)) { ok = false; break; }
    if (ok && acc.any.size && ![...acc.any].some((f) => producible.has(f))) ok = false;
    if (ok && acc.chain && !presentable.has(acc.chain)) ok = false;
    if (ok) for (const [dom, vals] of acc.states) { if (![...vals].some((v) => attainable.get(dom).has(v))) { ok = false; break; } }
    if (ok) { presentable.add(id); grewP = true; }
  }
  for (const [id, acc] of prodItems) {
    if (!presentable.has(id)) continue;
    for (const f of acc.sets) if (!producible.has(f)) { producible.add(f); grewP = true; }
    for (const [dom, to] of acc.setStates) {
      const att = attainable.get(dom);
      if (!att.has(to) && edgeList.some((e) => e.dom === dom && e.to === to && att.has(e.from))) { att.add(to); grewP = true; }
    }
  }
}
for (const [id, acc] of prodItems) {
  if (structural.has(id) || presentable.has(id)) continue;
  const why = [];
  for (const f of acc.flags) if (!producible.has(f)) why.push(`旗标 ${f} 无可达 setter`);
  if (acc.any.size && ![...acc.any].some((f) => producible.has(f))) why.push(`any 旗标组 [${[...acc.any].join("/")}] 无一可生产`);
  if (acc.chain && !presentable.has(acc.chain)) why.push(`chain 前置 ${acc.chain} 不可达`);
  for (const [dom, vals] of acc.states) if (![...vals].some((v) => attainable.get(dom).has(v))) why.push(`状态 ${dom}∈{${[...vals].join("/")}} 不可达`);
  err(`不可达条目 ${id}: ${why.join("；") || "依赖链不可达"}`);
}

// ---- 窗口 × 前置最早可达年龄（v0.14.0 补盲，逻辑学家复审 11 条死事件教训：旧检查只问「状态/旗可达吗」，不问「在窗口内来得及吗」）----
// 推导方法（口径同步写进 docs/STATE-MATRIX.md §7）：
//   状态值最早年龄 = 各载体「最早可呈现年龄」的最小值——载体在呈现拍即写出流转（分岔年龄固定；出身牌在开局 22 岁）；
//   条目最早可呈现年龄 = max(自身 min, 正向状态门各域「候选值最早年龄的最小值」的最大值, chain 前置条目的最早年龄,
//     require/all 旗标 setter 最早年龄的最大值, any 旗标组 setter 最早年龄的最小值)。自下而上 fixpoint，单调上升必收敛。
//   只在数学上不可能时报错（宁漏不误）：(A) 条目 max < 其正向状态门某域候选值的最早年龄；
//   (B) 条目 max < chain 前置条目的最早可呈现年龄；(C) 条目全部允许年代下 birth+max < minYear。
//   负向门（forbid/stateNot）、数值门（when/stats）、路线门不建模（不产生年龄互斥）；结局无年龄窗不查。
const ERA_BIRTH = { c1955: 1955, c1965: 1965, c1978: 1978, c2000: 2000 }; // 与 engine.js ERAS 表同步
const ageItems = new Map(); // id -> {min,max,gates:Map(dom->Set(vals)),flags:Set,any:Set,chain,sets:Set,setStates:[[dom,to]],eraGate:[eras],minYear}
function ageAcc(item, min, max) {
  const a = { min, max, gates: new Map(), flags: new Set(), any: new Set(), chain: item.chain || null, sets: new Set(), setStates: [], eraGate: null, minYear: item.minYear || null };
  if (item.era) a.eraGate = [item.era]; else if (item.eraIn) a.eraGate = asArr(item.eraIn);
  const walk = (o) => {
    for (const fld of ["state", "stateAll"]) if (o[fld]) for (const [dom, v] of Object.entries(o[fld])) { if (!a.gates.has(dom)) a.gates.set(dom, new Set()); for (const val of asArr(v)) a.gates.get(dom).add(val); }
    for (const f of asArr(o.require)) a.flags.add(f);
    for (const f of asArr(o.all)) a.flags.add(f);
    for (const f of asArr(o.any)) a.any.add(f);
    if (o.set) a.sets.add(o.set);
    if (o.setState) for (const [dom, to] of Object.entries(o.setState)) a.setStates.push([dom, to]);
    if (o.setStateBySit) for (const variant of Object.values(o.setStateBySit)) for (const [dom, to] of Object.entries(variant || {})) a.setStates.push([dom, to]);
    for (const c of (o.choices || [])) walk(c);
  };
  walk(item);
  return a;
}
for (const e of events) if (typeof e.min === "number" && typeof e.max === "number") ageItems.set(e.id, ageAcc(e, e.min, e.max));
for (const f of D.forks) ageItems.set(f.id || `fork${f.age}`, ageAcc(f, f.age, f.age));
if (PRO && PRO.acts) for (const a of PRO.acts) ageItems.set(a.id, ageAcc(a, a.age, a.age)); // 序章幕：单一年龄节点，与分岔同规
if (CARDS && CARDS.byId) for (const c of Object.values(CARDS.byId)) ageItems.set(c.id, { min: 22, max: 22, gates: new Map(), flags: new Set(), any: new Set(), chain: null, sets: new Set(c.set ? [c.set] : []), setStates: [], eraGate: null, minYear: null });
const stateEarliest = new Map(); // "dom=value" -> age
// 年龄基线（v0.17.0 重建）：人生从 5 岁来历幕起算（旧版按 22 岁开局写死）——域初值在 5 岁即成立；
// 出身牌的结算点仍是 22 岁（旧年代开局与试点汇入点相同），牌条目自身的 min/max 在下方单独写 22，不随基线动。
for (const [dom, def] of Object.entries(DOMAINS)) stateEarliest.set(`${dom}=${def.initial}`, 5);
const flagEarliest = new Map(); // flag -> age
const itemEarliest = new Map();
for (const [id, a] of ageItems) itemEarliest.set(id, a.min);
let grewA = true, guardA = 0;
while (grewA && guardA++ < 500) {
  grewA = false;
  // 载体写出：状态值/旗标的最早年龄随载体最早年龄更新（只降不升，取最小）
  for (const [id, a] of ageItems) {
    const ea = itemEarliest.get(id);
    for (const f of a.sets) if (!flagEarliest.has(f) || ea < flagEarliest.get(f)) { flagEarliest.set(f, ea); grewA = true; }
    for (const [dom, to] of a.setStates) {
      const k = `${dom}=${to}`;
      // 写出须同时满足：该边在注册表里就是由本载体承担（by 含本条目 id），且前态在载体年龄时已可达
      const pres = [...declaredEdges.values()].filter((e) => e.dom === dom && e.to === to && (e.by || []).includes(id));
      const okPre = pres.some((e) => stateEarliest.has(`${dom}=${e.from}`) && ea >= stateEarliest.get(`${dom}=${e.from}`));
      if (okPre && (!stateEarliest.has(k) || ea < stateEarliest.get(k))) { stateEarliest.set(k, ea); grewA = true; }
    }
  }
  // 条目最早年龄：随前置最早年龄上升（只升不降，取所需最大值）
  for (const [id, a] of ageItems) {
    let need = a.min;
    for (const [dom, vals] of a.gates) {
      let best = Infinity;
      for (const v of vals) { const k = `${dom}=${v}`; if (stateEarliest.has(k)) best = Math.min(best, stateEarliest.get(k)); }
      if (best === Infinity) { need = Infinity; break; }
      need = Math.max(need, best);
    }
    if (need !== Infinity) {
      for (const f of a.flags) { if (!flagEarliest.has(f)) { need = Infinity; break; } need = Math.max(need, flagEarliest.get(f)); }
    }
    if (need !== Infinity && a.any.size) {
      let best = Infinity;
      for (const f of a.any) if (flagEarliest.has(f)) best = Math.min(best, flagEarliest.get(f));
      if (best === Infinity) need = Infinity; else need = Math.max(need, best);
    }
    if (need !== Infinity && a.chain) {
      if (!itemEarliest.has(a.chain) || itemEarliest.get(a.chain) === Infinity) need = Infinity;
      else need = Math.max(need, itemEarliest.get(a.chain));
    }
    if (need !== Infinity && need > itemEarliest.get(id)) { itemEarliest.set(id, need); grewA = true; }
    if (need === Infinity && itemEarliest.get(id) !== Infinity) { itemEarliest.set(id, Infinity); grewA = true; }
  }
}
const AGE_STRUCTURAL = new Set([...D.forks.map((f) => f.id || `fork${f.age}`), ...(CARDS && CARDS.byId ? Object.keys(CARDS.byId) : []), ...(PRO && PRO.acts ? PRO.acts.map((a) => a.id) : [])]);
for (const [id, a] of ageItems) {
  if (AGE_STRUCTURAL.has(id)) continue; // 分岔/出身牌无窗口可查
  // (A) 窗口终点早于正向状态门要求值的最早年龄
  for (const [dom, vals] of a.gates) {
    let best = Infinity;
    for (const v of vals) { const k = `${dom}=${v}`; if (stateEarliest.has(k)) best = Math.min(best, stateEarliest.get(k)); }
    if (best !== Infinity && a.max < best) err(`窗×前置 ${id}: 窗口终点 ${a.max} 早于状态 ${dom} 候选值最早可达年龄 ${best}（该窗内此门永无可能满足）`);
  }
  // (B) 窗口终点早于 chain 前置最早可呈现年龄
  if (a.chain && itemEarliest.has(a.chain)) {
    const pe = itemEarliest.get(a.chain);
    if (pe !== Infinity && a.max < pe) err(`窗×前置 ${id}: 窗口终点 ${a.max} 早于 chain 前置 ${a.chain} 的最早可呈现年龄 ${pe}（后继窗整体早于前置）`);
  }
  // (C) minYear × 年代：全部允许年代下公历都够不到
  if (a.minYear) {
    const eras = a.eraGate || Object.keys(ERA_BIRTH);
    if (eras.every((er) => (ERA_BIRTH[er] || 0) + a.max < a.minYear)) err(`窗×前置 ${id}: minYear ${a.minYear} 在全部允许年代下不可达（最晚 ${Math.max(...eras.map((er) => (ERA_BIRTH[er] || 0) + a.max))} < ${a.minYear}）`);
  }
}

console.log(`validate-state: 条目 ${events.length}（含核心/扩展/协同/稀有/结局）+ 出身牌 ${cardCount} + 序章幕 ${PRO && PRO.acts ? PRO.acts.length : 0} | 域 ${Object.keys(DOMAINS).length} | 里程碑 ${Object.keys(MILESTONES).length}`);
if (reservedInfo.length) { console.log(`已登记未开放（reserved）${reservedInfo.length} 项:`); reservedInfo.forEach((m) => console.log("  RESERVED", m)); }
console.log(`错误 ${errors.length} 条:`); errors.forEach((m) => console.log("  ERROR", m));
console.log(`警告 ${warnings.length} 条:`); warnings.forEach((m) => console.log("  WARN", m));
console.log(errors.length ? "RESULT: FAIL" : "RESULT: PASS");
process.exit(errors.length ? 1 : 0);
