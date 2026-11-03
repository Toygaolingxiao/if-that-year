#!/usr/bin/env node
/* 《如果那年》立约对账常设检查（v0.20.1 返修新增）——用法：node tools/settle-choice-check.js [每年代局数=4000]
   借模拟 harness（simlib19.js，IFY_SIM_DIR 定位，默认 ~/workspace/sim-v0201/scripts，其次 sim-v020）
   按 sim main 同口径跑 4 年代 × 4000 = 16000 局（种子 V018-<era>-<i>、人格 PERSONA_ORDER 轮转），
   凡账本里有 fork45 选择记录的局，断言结算立约对账行（covenantSettleLine）与选择不冲突：
     ① 选「再试一回」（set=late_try）的局，对账行必须走「再试」版（含「再试一回」），
        绝不许出「定下来了：不要」那一版；
     ② 选「就这样定下来」（set=late_settle）的局，对账行不许出现「再试一回」版；
     ③ 终局伴侣状态为 divorced/widowed/single/none 的局，对账行不许出现「两个人把日子照旧过」。
   冲突数必须为 0，否则退出码 1。harness 的 runGame 返回值已带 ledger 与 covenantLine
   （simlib19.js 的 runGame 出口），无需另加探针。 */
"use strict";
const fs = require("fs"), path = require("path"), os = require("os");

const SIM_DIR = process.env.IFY_SIM_DIR
  || [path.join(os.homedir(), "workspace", "sim-v0201", "scripts"),
      path.join(os.homedir(), "workspace", "sim-v020", "scripts")].find((d) => fs.existsSync(path.join(d, "simlib19.js")));
if (!SIM_DIR) { console.log("settle-choice-check: 找不到 simlib19.js（IFY_SIM_DIR 未设置且 sim-v0201/sim-v020 均不存在）"); process.exit(1); }
const { makeContext, runGame, PERSONA_ORDER, ERAS } = require(path.join(SIM_DIR, "simlib19.js"));

const perEra = Number(process.argv[2] || 4000);
const ctx = makeContext();
let runs = 0, fork45Runs = 0, tryRuns = 0, settleRuns = 0, soloDueRuns = 0;
const conflicts = [];
function conflict(seed, why, line) { if (conflicts.length < 20) conflicts.push({ seed, why, line }); conflicts.count = (conflicts.count || 0) + 1; }

for (const era of ERAS) {
  for (let i = 0; i < perEra; i++) {
    const seedStr = `V018-${era}-${i}`;
    const r = runGame(ctx, { seedStr, era, persona: PERSONA_ORDER[i % PERSONA_ORDER.length] });
    runs++;
    const line = r.covenantLine || "";
    if ((r.ledger || []).some((e) => e.id === "cov_solo_due")) soloDueRuns++;
    const f45 = (r.ledger || []).find((e) => e.kind === "fork" && e.id === "fork45");
    if (f45) {
      fork45Runs++;
      if (f45.set === "late_try") {
        tryRuns++;
        if (/定下来了：不要|定下了：不要/.test(line)) conflict(seedStr, "选再试却出「不要」版", line);
        if (!line.includes("再试一回")) conflict(seedStr, "选再试却没走「再试」版对账行", line);
      } else if (f45.set === "late_settle") {
        settleRuns++;
        if (line.includes("再试一回")) conflict(seedStr, "选定下来却出「再试」版", line);
      }
    }
    if (line && ["divorced", "widowed", "single", "none"].includes(r.state.spouse) && line.includes("两个人把日子照旧过")) {
      conflict(seedStr, `伴侣状态 ${r.state.spouse} 却出「两个人把日子照旧过」`, line);
    }
  }
  console.log(`era ${era} done`);
}
const nConf = conflicts.count || 0;
console.log(`settle-choice-check: simDir=${SIM_DIR}`);
console.log(`runs=${runs} fork45=${fork45Runs} try=${tryRuns} settle=${settleRuns} covSoloDue=${soloDueRuns} conflicts=${nConf}`);
for (const c of conflicts) console.log(`  CONFLICT ${c.seed}: ${c.why} —— ${c.line}`);
console.log(nConf === 0 ? "RESULT: PASS" : "RESULT: FAIL");
process.exit(nConf === 0 ? 0 : 1);
