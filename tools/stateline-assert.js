#!/usr/bin/env node
/* 《如果那年》v0.19.0 三相机制断言——点名样本：
   ① p11_043 / p11_044 带 spouse=partnered 状态门（离异后两地链后继不出）；
   ② p28_002 带 flagAgeWithin 时间窗门（配偶离世后 ≤2 年才可抽），且落点旗 spouse_passed 由 p28_001 立；
   ③ p14_053 回响按 spouse 状态分版（echoState；partnered 用原版，widowed/divorced/single/none 用独居版）；
   附带：kidMax 与 kidMin 对称生效（p3_052）、proc_dad_care 正文按母亲状态分版（textState）。
   数据断言（字段在数据里）+ 功能断言（用真实引擎 met/echoText/procText 跑）两层都过才算 PASS。
   用法：node scripts/stateline-assert.js */
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path");
const ROOT = path.join(__dirname, "..");
const PACK_FILES = ["src/content/pool/pack1.js", "src/content/pool/pack2.js", "src/content/pool/pack3.js", "src/content/pool/pack4.js", "src/content/pool/pack5.js", "src/content/pool/pack6.js", "src/content/pool/pack9.js", "src/content/pool/pack10.js", "src/content/pool/pack11.js", "src/content/pool/pack12.js", "src/content/lines/side-and-steady.js", "src/content/pool/pack14.js", "src/content/pool/pack15.js", "src/content/lines/exam.js", "src/content/pool/pack17.js", "src/content/pool/pack18.js", "src/content/pool/pack19.js", "src/content/pool/pack20.js", "src/content/pool/pack21.js", "src/content/pool/pack22.js", "src/content/pool/pack23.js", "src/content/lines/late-life.js", "src/content/pool/pack25.js", "src/content/pool/pack26.js", "src/content/pool/pack27.js", "src/content/pool/pack28.js", "src/content/pool/pack29.js", "src/content/pool/pack30.js", "src/content/pool/pack33.js", "src/content/pool/pack31.js", "src/content/pool/pack32.js", "src/content/pool/pack34.js", "src/content/lines/covenant.js", "src/content/lines/process-beats.js", "src/content/lines/abroad.js", "src/content/era/era1955.js", "src/content/era/era1965.js", "src/content/era/era1978.js", "src/content/era/era1985.js"];

let pass = 0, fail = 0;
function ok(cond, name) { if (cond) { pass++; console.log("  PASS", name); } else { fail++; console.log("  FAIL", name); } }

// ---- 装载（与 stateline-scan 同法：VM 载入真实数据与引擎探针导出） ----
const store = new Map();
const appEl = { addEventListener() {}, classList: { remove() {}, add() {}, toggle() {} }, set innerHTML(v) {}, get innerHTML() { return ""; } };
const sandbox = {
  window: { addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }), innerWidth: 390 },
  document: { getElementById: (id) => (id === "app" ? appEl : null), addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({ getContext: () => null, style: {} }), hidden: false },
  localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
  location: { search: "", origin: "http://assert", pathname: "/" }, navigator: {}, setTimeout, clearTimeout, requestAnimationFrame: () => {}, console,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const load = (rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), sandbox, { filename: rel });
load("src/events.js");
for (const p of PACK_FILES) load(p);
load("src/content/prologue/cards.js"); load("src/content/rare/synergy.js"); load("src/content/registry-v023.js"); load("src/content/registry-wp2.js"); load("src/content/registry-wp3.js"); load("src/content/registry-wp4.js"); load("src/content/registry-wp5.js"); load("src/content/registry-wp6.js"); load("src/content/registry-wp7.js"); load("src/content/registry-wp8.js"); load("src/world/state.js"); load("src/registry.js"); load("src/anchors.js"); load("src/rhythm.js"); load("src/content/prologue/prologue-c1955.js"); load("src/content/prologue/prologue-c1965.js"); load("src/content/prologue/prologue-c1978.js"); load("src/content/prologue/prologue-c1985.js"); load("src/content/prologue/prologue-c1995.js"); load("src/content/prologue/prologue.js"); load("src/storylet.js"); // v0.20.0 M1-B：storylet 在 prologue 之后、引擎之前并入并挂 sl（序同 index.html）；v0.23 WP1：登记数据文件在 state.js 之前（序同 index.html）
const ENGINE_FILES = ["src/engine.js", "src/world/apply.js", "src/record.js", "src/world/processes/parents.js", "src/world/processes/spouse.js", "src/world/processes/work.js", "src/world/processes/place.js", "src/world/processes/health.js", "src/scheduler.js", "src/views/stream.js", "src/views/year.js", "src/views/shadow.js", "src/views/settlement.js", "src/views/share.js"]; // v0.20.0 引擎模块（各自独立包装器，共享 window.IFY），按 index.html 顺序逐个真实载入，不再拼接（engine-boot.js 不载：断言不需要开局渲染）
for (const rel of ENGINE_FILES) load(rel);
vm.runInContext("window.__P = { get S() { return window.IFY.S; }, set S(v) { window.IFY.S = v; }, freshState: window.IFY.freshState, met: window.IFY.met, echoText: window.IFY.echoText, procText: window.IFY.procText, D: window.IFY.D };", sandbox, { filename: "probe-export" });
const P = sandbox.window.__P;
const byId = {};
for (const e of P.D.events || []) if (e.id) byId[e.id] = e;

// ---- ① 数据断言：两地链后继的 spouse 门 ----
console.log("① p11_043 / p11_044 spouse 门");
for (const id of ["p11_043", "p11_044"]) {
  const e = byId[id];
  ok(!!e, `${id} 存在`);
  ok(e && e.stateAll && e.stateAll.spouse === "partnered", `${id} stateAll.spouse === "partnered"`);
  ok(e && e.require === "two_cities" && !!e.chain, `${id} 原 two_cities require 与 chain 保留`);
}
// ---- ② 数据断言：身后手续时间窗 ----
console.log("② p28_002 flagAgeWithin 时间窗门");
{
  const e2 = byId.p28_002, e1 = byId.p28_001;
  ok(!!e2 && !!e1, "p28_001 / p28_002 存在");
  ok(e1 && e1.set === "spouse_passed", "p28_001 立落点旗 spouse_passed");
  ok(e2 && e2.flagAgeWithin && e2.flagAgeWithin.flag === "spouse_passed" && e2.flagAgeWithin.years === 2, "p28_002 flagAgeWithin = {flag: spouse_passed, years: 2}");
  const reg = sandbox.window.GAME_REGISTRY;
  ok(reg && reg.milestones && reg.milestones.spouse_passed && reg.milestones.spouse_passed.setters.includes("p28_001"), "registry 里程碑 spouse_passed 已登记（setter p28_001）");
}
// ---- ③ 数据断言：p14_053 回响分版 ----
console.log("③ p14_053 echoState 回响分版");
{
  const e = byId.p14_053, c0 = e && e.choices && e.choices[0];
  ok(!!c0, "p14_053 首选项存在");
  ok(c0 && c0.echo.includes("对方说：是我定的。"), "partnered 原版回响保留在 echo 字段");
  const m = c0 && c0.echoState && c0.echoState.spouse;
  ok(!!m, "echoState.spouse 存在（通用形状 {域:{状态值:文本}}）");
  ok(m && typeof m.widowed === "string" && !m.widowed.includes("对方说"), "widowed 版为独居口径（无伴侣开口）");
  ok(m && typeof m.divorced === "string" && !m.divorced.includes("对方说"), "divorced 版为独居口径");
  ok(m && typeof m.single === "string" && typeof m.none === "string", "single / none 版齐备");
}

// ---- 功能断言：真实引擎 met / echoText / procText ----
function freshS() {
  const S = P.freshState("ASSERT-SEED");
  P.S = S;
  S.route = { id: "home" }; S.era = "c2000"; S.birthYear = 2000; S.age = 40;
  return S;
}
console.log("功能：met() 门行为");
{
  let S = freshS();
  S.flags.two_cities = true; S.usedEvents = ["p11_042"]; S.age = 40;
  S.state.spouse = "divorced";
  ok(P.met(byId.p11_043) === false && P.met(byId.p11_044) === false, "离异时 p11_043/044 不出");
  S.state.spouse = "partnered";
  ok(P.met(byId.p11_043) === true, "partnered 时 p11_043 可出（其余门满足）");
  S.age = 44; // p11_044 窗口 32–50、chain p11_043 需先行
  S.usedEvents = ["p11_042", "p11_043"];
  ok(P.met(byId.p11_044) === true, "partnered + chain 已行时 p11_044 可出");
}
{
  let S = freshS();
  S.state.spouse = "widowed"; S.age = 60;
  S.flagAges = { spouse_passed: 57 };
  ok(P.met(byId.p28_002) === false, "离世后 3 年 p28_002 不出（超 2 年窗）");
  S.flagAges = { spouse_passed: 58 };
  ok(P.met(byId.p28_002) === true, "离世后 2 年 p28_002 可出（窗内）");
  S.flagAges = {};
  ok(P.met(byId.p28_002) === false, "无落点年龄记录时 p28_002 不出（fail-closed）");
}
{
  let S = freshS();
  S.state.kids = "has"; S.kidsAt = 38;
  S.age = 46; // kidAge 8 > kidMax 6
  ok(P.met(byId.p3_052) === false, "kidAge 8 时 p3_052 不出（kidMax 6）");
  S.age = 44; // kidAge 6
  ok(P.met(byId.p3_052) === true, "kidAge 6 时 p3_052 可出");
  S.age = 40; // kidAge 2 < kidMin 3
  ok(P.met(byId.p3_052) === false, "kidAge 2 时 p3_052 不出（kidMin 3）");
}
console.log("功能：echoText / procText 分版");
{
  let S = freshS();
  const c0 = byId.p14_053.choices[0];
  S.state.spouse = "partnered";
  ok(P.echoText(c0) === c0.echo, "partnered 回响 = 原版");
  S.state.spouse = "widowed";
  ok(P.echoText(c0) === c0.echoState.spouse.widowed && !P.echoText(c0).includes("对方说"), "widowed 回响 = 独居版");
  S.state.spouse = "divorced";
  ok(P.echoText(c0) === c0.echoState.spouse.divorced, "divorced 回响 = 独居版");
  const proc = byId.proc_dad_care;
  S.state.mom = "alive";
  ok(P.procText(proc) === proc.text, "母亲在世时 proc_dad_care = 原版");
  S.state.mom = "dead";
  const solo = P.procText(proc);
  ok(solo === proc.textState.mom.dead && !solo.includes("你妈在电话"), "母亲已故时 proc_dad_care = 父亲单人版（母亲不开口）");
}

console.log(`\nstateline-assert: ${pass} passed, ${fail} failed`);
console.log(fail ? "RESULT: FAIL" : "RESULT: PASS");
process.exit(fail ? 1 : 0);
