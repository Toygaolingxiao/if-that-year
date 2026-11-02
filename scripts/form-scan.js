"use strict";
/* 活计形态候选扫描（v0.20.0 M2）：全池扫「通用职场纹理」——文本预设了雇佣/单位语境，
   但条目本身没挂行当旗、没挂路线门的条目。两档词表：
   S 档（强预设词）：驻场/科室/述职/考勤/工位/跳槽/编制/上司/车间/线长 —— 命中且无行当门（无 ctx、
     （车间/线长为定向验收自查后补入：首轮词表漏了工厂纹理，p15_020 在农民局里撞出；
     补扫另命中的若干条已登记在 m2form-tagging.json 的 supplementaryBacklog，下一轮逐条判，本轮未动。）
     师傅/厂里/流水线/排班 单独不成词：多义太强（维修师傅、家庭陪护排班、第三人称厂里），只作人读时的旁证。
     无 chain、无 route 门、require/all/any 里没有入行旗）且非 procOnly 即入选。
   W 档（单位/窗口）：多义太强，只收「主角本职语境」模式命中者（单位+组织动词/我的单位/
     在单位/单位里、窗口+主角岗位办理语境等启发式），再加：非年代包、无 era/eraIn、
     无 workPhase 状态门、无强词命中、无行当门。
   扫描只产候选，不产处置：逐条处置（挂门/换皮/确认通用）见 sim-v020/logs/m2form-tagging.json。
   用法：node scripts/form-scan.js [--json] */
const fs = require("fs"), vm = require("vm"), path = require("path");
const ROOT = path.join(__dirname, "..");
const PACK_FILES = ["src/content/pool/pack1.js", "src/content/pool/pack2.js", "src/content/pool/pack3.js", "src/content/pool/pack4.js", "src/content/pool/pack5.js", "src/content/pool/pack6.js", "src/content/pool/pack9.js", "src/content/pool/pack10.js", "src/content/pool/pack11.js", "src/content/pool/pack12.js", "src/content/lines/side-and-steady.js", "src/content/pool/pack14.js", "src/content/pool/pack15.js", "src/content/lines/exam.js", "src/content/pool/pack17.js", "src/content/pool/pack18.js", "src/content/pool/pack19.js", "src/content/pool/pack20.js", "src/content/pool/pack21.js", "src/content/pool/pack22.js", "src/content/pool/pack23.js", "src/content/lines/late-life.js", "src/content/pool/pack25.js", "src/content/pool/pack26.js", "src/content/pool/pack27.js", "src/content/pool/pack28.js", "src/content/pool/pack29.js", "src/content/pool/pack30.js", "src/content/pool/pack33.js", "src/content/pool/pack31.js", "src/content/pool/pack32.js", "src/content/pool/pack34.js", "src/content/lines/covenant.js", "src/content/lines/process-beats.js", "src/content/lines/abroad.js", "src/content/era/era1955.js", "src/content/era/era1965.js", "src/content/era/era1978.js"];
const ld = (rel, key) => { const s = { window: {} }; vm.createContext(s); vm.runInContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), s, { filename: rel }); return s.window[key]; };
const D = ld("src/events.js", "GAME_DATA");
const fileOf = {}; let events = [];
const push = (e, f) => { if (e && e.id && !fileOf[e.id]) { fileOf[e.id] = f; events.push(e); } };
(D.events || []).forEach((e) => push(e, "src/events.js"));
for (const p of PACK_FILES) (ld(p, "GAME_PACKS") || []).forEach((e) => push(e, p));
const SYN = ld("src/content/rare/synergy.js", "GAME_SYNERGY") || {};
(SYN.combos || []).forEach((e) => push(e, "src/content/rare/synergy.js"));
(SYN.rare || []).forEach((e) => push(e, "src/content/rare/synergy.js"));

const ENTRY_FLAGS = new Set(["factory_work", "fab_work", "craft_work", "heavy_work", "miner_work", "truck_work", "med_hosp", "med_work", "nurse_work", "img_work", "teach_work", "acct_work", "fin_work", "press_work", "dev_work", "driver_taxi", "farm_work", "exam_landed", "shop_work", "gig_work", "courier_work", "care_work", "write_work"]);
const tokens = (e) => [].concat(e.require || [], e.all || [], e.any || []);
const hasWorkGate = (e) => !!(e.ctx || e.chain || e.route || e.routeIn || e.forbidRoute || tokens(e).some((t) => ENTRY_FLAGS.has(t)));
const allText = (e) => [e.text || "", ...((e.choices || []).flatMap((c) => [c.label || "", c.echo || ""]))].join("\n");

const STRONG = ["驻场", "科室", "述职", "考勤", "工位", "跳槽", "编制", "上司", "车间", "线长"];
// W 档主角本职语境模式：单位的组织行为落在主角身上（批假/贴表/上新工具/组织活动/体检/
// 球队联赛/来电返聘），或主角本人就在窗口岗位上（在窗口坐班、窗口是主角的岗位），
// 或窗口/单位出现在主角的办事动线里（窗口的人、缴费窗口、新单位、离单位近）。
// 第三方窗口（医院/银行/药房的办事窗口）也会命中——那是逐条人读判定 (c) 的活，扫描只管捞全。
const OWN_JOB = /(单位(组织|搞|请|里|门口|体检|球队|联赛|汇演|运动会|打来|又问|问|批了|贴出|上了|换了|给交|近|的人|的活|最忙)|原单位|老单位|新单位|在单位|回单位|在窗口|去窗口|窗口的人|缴费窗口|社保窗口|给[一个小]{0,3}单位)/;

const S = [], W = [];
for (const e of events) {
  if (e.procOnly || hasWorkGate(e)) continue;
  const t = allText(e);
  const strongHit = STRONG.filter((w) => t.includes(w));
  if (strongHit.length) { S.push({ id: e.id, file: fileOf[e.id], hit: strongHit }); continue; }
  const file = fileOf[e.id];
  if (/era(1955|1965|1978)/.test(file) || e.era || e.eraIn) continue;
  if (e.state && e.state.workPhase) continue;
  if (OWN_JOB.test(t)) W.push({ id: e.id, file: fileOf[e.id], hit: ["单位/窗口(本职语境)"] });
}
const out = { strong: S, weak: W, total: S.length + W.length };
if (process.argv.includes("--json")) console.log(JSON.stringify(out, null, 1));
else {
  console.log(`S 档（强预设词）${S.length} 条：`);
  for (const c of S) console.log(`  ${c.id}  ${c.file}  [${c.hit.join("/")}]`);
  console.log(`W 档（单位/窗口·本职语境）${W.length} 条：`);
  for (const c of W) console.log(`  ${c.id}  ${c.file}`);
  console.log(`候选合计 ${out.total} 条`);
}
