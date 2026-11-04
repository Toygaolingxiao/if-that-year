// [模块]《如果那年》引擎分片：呈现层——影子瞥视。独立模块（包装器 + window.IFY 共享命名空间），加载顺序见 index.html。
// v0.21 WP4（蓝图第六节）：有 Track_B 的新局，瞥视取材层改读不受控 Track 的真账本/真流水 + 现状事实表；
// 无 Track_B 的 legacy 局整屏走下方模板逻辑（renderGlimpseLegacy，一行未动）。呈现骨架两路共用同一套：
// 先标题、看/不看、计数真实（meta）、反思认领、首瞥机制说明、童年记号共同事实句。
(function (IFY) {
"use strict";
// ---------- 影子瞥视：先给标题，点开才看全文；不看的计数从此是真的 ----------
function shadowRoute() { const first = IFY.S.unchosen.find((u) => u.kind === "route"); return IFY.D.shadows[first.id];}

// 阶段标注（v0.20.1 W5）：下列细节按内容认定为「退休/晚年」阶段文本——瞥视发生在 30/40/50 岁，
// 目标人生还没走到退休，带退休/晚年语境的细节不出；结算揭晓走 shadowFinalText，不经本函数，照常出现。
// 认定清单逐条见 ~/workspace/sim-v0201/logs/w5-presuppose.md 第六部分。
const SHADOW_LATE_DETAILS = new Set([
"退休前把工位上的书分给了年轻人，自己只带走一个旧水杯。",
"社保和公积金都办完了，第一次在工作日上午去公园坐了很久。",
"退休后在院里支了张小桌，老同事隔三差五来下棋喝茶。",
"退休后把公寓卖了小一号，离华人超市近，买豆腐方便些。",
"退休那学期把教案留给了年轻教师，书架空出一大半。",
"退休后又背起包走了趟短途，回来把票根压在书桌玻璃下。",
"在异乡住了大半辈子，老了常去的那家诊所医生都换了两任。",
"办公室窗外有棵银杏，秋天给学生讲最后一课。",
]);

function shadowStageText(stage) {
const all = shadowRoute().stages[stage];
// 年代过滤（v0.20.1 W4）：瞥视目标年份=影子人生所处的日历年（出生年+当前年龄，与 scheduler 公历门口径一致）。
// 目标年份 <2000 时剔除带具体金额的细节（如「转了两千」「存下五百块」——1980 年代月工资不足百元，这类数额不成立）；
// 剔完为空则回退全池，保证瞥视永远有细节可看。
const shadowYear = (IFY.S.birthYear || 1978) + IFY.S.age;
const variants = shadowYear < 2000? (all.filter((t) =>!/两千|五百块/.test(t)).length? all.filter((t) =>!/两千|五百块/.test(t)): all): all;
// 阶段过滤（v0.20.1 W5）：剔除已标注的退休/晚年细节；剔完为空则回退上一级池。
const stageOk = variants.filter((t) =>!SHADOW_LATE_DETAILS.has(t));
const pool = stageOk.length? stageOk: variants;
return pool[Math.floor(IFY.rng() * pool.length)];
}

// 影子代价三选一（v0.10.0）：按种子+路线名哈希定值，同一局内结算页与分享卡取同一行；存量字符串原样返回。
function shadowCostText(sh) {
if (!sh) return "";
const c = sh.cost;
if (!Array.isArray(c)) return c || "";
if (c.length === 1) return c[0];
let h = 2166136261;
const s = String((IFY.S && IFY.S.seed) || "") + ":" + sh.name;
for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619);}
return c[Math.abs(h) % c.length];
}

function shadowFinalText(sh) {
const finals = sh && sh.stages && sh.stages[2];
if (!Array.isArray(finals) ||!finals.length) return "";
return finals.find((t) =>!(IFY.S.shadowSeenTexts || []).includes(t)) || finals[0] || "";
}

// 结算页与发帖文案共用同一组对照行：主影子拼入结局与代价，其余未选路线按 routes 原序各出一行。
function shadowCompareLines() {
if (!IFY.S ||!Array.isArray(IFY.S.unchosen)) return { main: "", others: []};
const routeEntries = IFY.S.unchosen.filter((u) => u && u.kind === "route");
if (!routeEntries.length) return { main: "", others: []};
const mainEntry = routeEntries[0];
const mainShadow = IFY.D.shadows && IFY.D.shadows[mainEntry.id];
const mainFinal = shadowFinalText(mainShadow);
const main = mainShadow && mainShadow.name && mainFinal && mainShadow.cost
? `另一条路（${mainShadow.name}）也走完了它的一生。${mainFinal}${shadowCostText(mainShadow)}`: "";
const routeOrder = new Map(IFY.D.routes.map((r, i) => [r.id, i]));
const others = routeEntries.slice(1)
.sort((a, b) => (routeOrder.has(a.id)? routeOrder.get(a.id): Number.MAX_SAFE_INTEGER)
- (routeOrder.has(b.id)? routeOrder.get(b.id): Number.MAX_SAFE_INTEGER))
.map((entry) => {
const sh = IFY.D.shadows && IFY.D.shadows[entry.id];
const final = shadowFinalText(sh);
return sh && sh.name && final? `${sh.name}：${final}`: "";
}).filter(Boolean);
return { main, others};
}

// =====================================================================
// v0.21 WP4 · 瞥视真账取材层（蓝图 6.1–6.3）
// 取材对象恒为「当前不受控的那条 Track」（一期 = Track_B）；本层只读它与（对照点所需的）
// 受控 Track 账本，不写回任何 Track、不消费任何随机流——唯一的 1 抽在 renderGlimpse 入口
// 单独消费（裁定二 1 抽不变式，见 renderGlimpseReal 头注）。
// =====================================================================

const GLIMPSE_AGES_ALL = [30, 40, 50]; // 与 engine.js GLIMPSE_AGES 键集同口径：stage 0/1/2 → 30/40/50

// ---- 现状事实表的来源登记（蓝图 6.2：清单即事实的边界——无登记来源就不出该行，宁缺不编） ----
// 自有房旗标（registry 登记的 setters 在括号内）：
// bought_house（e78_006 / fork33 / p17_021 / p17_024 / p18_049）、bought_fangai（e65_026 房改买断）、
// bought_commodity（e65_027 商品房）、jizi_house（e65_020 集资建房）。
// 「房贷还着」只认两组证据：①买房落账本身带月供口径的来源 id（fork33「算了三遍月供」/ e78_006
// 「月供占工资一半」/ p17_024「月供占工资一半」/ p18_049「月供从下个月开始扣·三十年还款表」；
// p17_021 的买房文本没提月供，不入此组）；②事后仍在还贷的条目（c_house 提前还一笔房贷 /
// p12_067 房贷还剩二十多年 / p2_056 存量房贷利率 / p2_060 房贷换经营贷，另加旗 loan_swap 本身 /
// cb_dink_plan 月供还剩多少；WP4 修复轮全池复核补 19 条：p1_076 存量房贷 / p2_046 月供七千二 /
// p2_048 该还多少月供还是多少 / p2_057 月供降到五千八 / p2_058 还剩十一年 / p2_059 月供少扣一截 /
// p2_061 算结清（当时仍欠）/ p3_051 心里算月供（家计）/ p12_054 月供商贷 / p12_059 记账表房贷 /
// p12_068 月供利息账 / p12_070 还剩最后两年 / p18_052 月供照扣 / p18_055 父母问月供数（期房）/
// p18_057 家计排月供 / p27_002 贷款还剩九十六万 / p30_011 月供按月扣 / e65_028 房贷办下来每月还 /
// e78_007 房贷短信排月供。自有房旗 4 个与买房 setter 8 个同轮复核无漏，未动）。
// 「房贷清了」全池无任何可靠来源（只有判词片段的 needs 门，不是落账事实）——故永不出此行。
// 独立的非房贷债务「有笔债在还」同样无可靠的现状来源（r_guarantee_trap 是替人代偿、且只持续
// 大半年，落账之后是否还在还无从判定；r_friend_debt 是借出不是借入）——故永不单独出此行。
const OWNED_FLAGS = ["bought_house", "bought_fangai", "bought_commodity", "jizi_house"];
const MORTGAGE_SETTER_IDS = ["fork33", "e78_006", "p17_024", "p18_049"];
const MORTGAGE_ONGOING_IDS = ["c_house", "p12_067", "p2_056", "p2_060", "cb_dink_plan",
"p1_076", "p2_046", "p2_048", "p2_057", "p2_058", "p2_059", "p2_061", "p3_051", "p12_054",
"p12_059", "p12_068", "p12_070", "p18_052", "p18_055", "p18_057", "p27_002", "p30_011",
"e65_028", "e78_007"];
// 警报来源 = 健康危机落账（账本 kind=crisis、id=health，即 crisisUsed.health 的账本形）
// + 健康线死亡落账本身（账本 kind=death、id=health，即引擎死因分类 type=health、rollDeath 的
// rec("death", type) 形）：影子走健康线离世时死亡条目本身即警报来源，悼念/回望的 health 行读
// 「身体出过警报」、不得再出否定形（与同屏死讯矛盾）；意外线死亡（id=accident）不入此来源。
// + 下列「本人」体检异常/查出问题/手术住院类条目 id（盘点全池后登记；父母/伴侣/孩子的体检与
// 生育复查条目一概不入——那不是本人的身体警报）：
// e_body（体检两个箭头朝上）、r_health_operation（体检圈出指标·手术）、p12_002（指标不对·住院检查）、
// p10_009（体检写明脂肪肝倾向）、p16_043（指标箭头）、e78_045（指标小箭头）、p15_013（血糖临界值）、
// p15_054（查出要长期吃药的毛病）、p21_013（报告三条标红提醒）、p21_032（指标圈出·建议复查）、
// p22_017（指标带箭头）、e65_050（箭头·血压血脂要控制）、e55_047（查出小毛病·按时吃药）、
// p24_007（要复查的箭头）、p23_023（箭头又多两个）、p26_015（三项箭头朝上）、
// p14_043（查出白内障·手术）、p20_061（眼睛查出要做小手术）、p4_045（颈椎查出问题）、
// p33_016（指标压线·复查）、p6_039（箭头比去年少——反推此前有箭头）。
// WP4 修复轮全池重盘补 63 条（逐条结论见 sim-v021/logs/wp4fix.md；口径同上：只认主文本断言，
// 不认选项回响）：体检/检查异常——p4_031 脂肪肝、p4_032 血压量出高、p4_053 复查单箭头史、
// p14_041 血脂血糖都在边上、p15_008 血压数值偏高、p18_039 体检几项飘红、p20_007 听力差一格、
// p20_017 体检表箭头、p20_027 片子肺上有影、p20_048 片子要多复查、p21_008 筛查召回先观察、
// p23_012 体检多了要复查的字、p23_028 血压不稳、p23_044 体检血压高一截、p23_064 复查耳朵在车间亏了、
// p23_069 量血压有高值、p24_028 数值贴合格线、p26_018 查听力一耳下降明显、p29_016 量三回都高；
// 查出/确诊——p4_033 牙髓炎、p4_042 浅表性胃炎、p12_020 牙拍片需拔种、p12_027 胃肠镜小息肉、
// p13_005 医院查明手腕老毛病、p15_048 腰椎退变、p16_064 膝片磨损厉害、p20_060 尘肺年年复查、
// p21_041/p25_024/p26_017 白内障、p23_019 胃肠镜小息肉、p23_036 医院查听力噪声落下、p27_007 胆结石确诊；
// 服药/慢病管理——p4_052 药盒三个、p4_058 药量调整、ab37_028 常吃的药、p12_022 常吃降压药、
// p12_025 腰老毛病康复理疗、p14_024 你俩药盒本人每日服药、p16_065 降压药日常、p20_062 药按时吃、
// p21_024 自己的降压药、p21_044 常吃慢病药、p21_049 一周药分格、p21_050 自己的药盒、p21_063 孩子查你药盒、
// p22_027 慢病日常、p22_051 颈椎老毛病理疗、p22_066 半年用药记录、p24_001 自己药盒分早晚、
// p25_002 每月药费、p25_023 一周药分格、p25_030 慢病复诊拿药、p26_019 慢病长处方、p28_009 清单有你的降压药、
// p29_020 一年的药钱（兼问血压）；手术/住院——p4_054 住院五天、p21_039 住院膝手术、p23_022 住院、
// p25_011 住院小手术、p25_028 病后出院恢复、p26_003 住院白内障手术、p26_009 住院复查五天。
// 「出过警报、后来没再听说」的后半句全池无登记的康复落账来源，永不带（宁缺不编）。
const HEALTH_ALERT_IDS = ["e_body", "r_health_operation", "p12_002", "p10_009", "p16_043", "e78_045",
"p15_013", "p15_054", "p21_013", "p21_032", "p22_017", "e65_050", "e55_047", "p24_007", "p23_023",
"p26_015", "p14_043", "p20_061", "p4_045", "p33_016", "p6_039",
"p4_031", "p4_032", "p4_033", "p4_042", "p4_052", "p4_053", "p4_054", "p4_058", "ab37_028",
"p12_020", "p12_022", "p12_025", "p12_027", "p13_005", "p14_024", "p14_041", "p15_008", "p15_048",
"p16_064", "p16_065", "p18_039", "p20_007", "p20_017", "p20_027", "p20_048", "p20_060", "p20_062",
"p21_008", "p21_024", "p21_039", "p21_041", "p21_044", "p21_049", "p21_050", "p21_063", "p22_027",
"p22_051", "p22_066", "p23_012", "p23_019", "p23_022", "p23_028", "p23_036", "p23_044", "p23_064",
"p23_069", "p24_001", "p24_028", "p25_002", "p25_011", "p25_023", "p25_024", "p25_028", "p25_030",
"p26_003", "p26_009", "p26_017", "p26_018", "p26_019", "p27_007", "p28_009", "p29_016", "p29_020"];

// ---- 措辞表（蓝图 6.2b：同一事实全游戏一套句形，只陈述已发生/现在如此，将来时全禁） ----
const FACT_WORDS = {
spouse: { partnered: "成家了", divorced: "成过家，后来离了", widowed: "成过家，对方先走了", none: "还没成家", single: "还没成家", dating: "还没成家"},
kids: { has: "有了孩子", none: "没要孩子"}, // undecided 不出此行
houseOwnedMortgage: "有自己的房子，房贷还着",
houseOwned: "有自己的房子",
houseRenting: "租着房子住",
healthAlert: "身体出过警报",
healthNone: "没听说身体有什么异常", // 否定形以「没听说」收口：那是瞥视者的信息边界，不是体检结论
residenceHomeAlways: "还在老家",
residenceHomeBack: "回了老家",
residenceCity: "在大城市落脚",
residenceAbroad: "去了海外",
parentsBoth: "父母都还在",
parentsOne: "父母还剩一位",
parentsNone: "父母都送走了",
workForm: { farm: "靠种地过日子", public: "在体制内做事", self: "自己做着点小买卖", flex: "接零活干", employee: "在单位里上班"},
phase: { part: "兼职着，还没全退", retired: "已经退了"}, // working 不出此行
};
// 悼念收尾骨架的状态流转句（蓝图 6.3 第 2 段「最后一次流转」用；未登记的流转不硬编成句）
const STATE_PHRASE = {
"spouse>partnered": "成了家", "spouse>dating": "处了一个人", "spouse>single": "定下来一个人过",
"spouse>divorced": "离了婚", "spouse>widowed": "另一半先走了",
"kids>has": "有了孩子", "kids>none": "定下来不要孩子",
"dad>dead": "父亲走了", "mom>dead": "母亲走了",
"workPhase>part": "改成做半截活", "workPhase>retired": "退了下来",
"dog>home": "养了条狗", "dog>gone": "狗没了", "cat>home": "养了只猫", "cat>gone": "猫没了",
};
const STATE_DOMAINS_L1 = ["spouse", "kids", "dad", "mom", "workPhase", "dog", "cat"]; // 6.1 一级流转的域（abroadKind 不入）
const CARE_PROC_IDS = ["proc_dad_care", "proc_mom_care", "proc_dad_hosp", "proc_mom_hosp"]; // 6.1 五级：父母照护进程拍

function uncontrolledEntry() {
const ses = IFY.session;
if (!ses ||!ses.tracks) return null;
const key = ses.controlTrack === "A"? "B": "A";
const entry = ses.tracks[key];
return entry && entry.state? { key, entry}: null;
}

// 居所轨迹（place.js residenceTrail 的同口径只读复刻，对任意 Track 的 state 现算；结算侧仍用原函数读受控 Track）
function residenceOf(B, endAge) {
const spans = { home: 0, city: 0, abroad: 0};
let place = null, since = IFY.START_AGE || 22;
const move = (age, p) => { if (place && p!== place) { spans[place] += Math.max(0, age - since); place = p; since = age;} else if (!place) { place = p; since = age;}};
for (const e of (Array.isArray(B.ledger)? B.ledger: [])) {
if (e.kind === "route") move(e.age, e.id === "abroad"? "abroad": (e.id === "home" || e.id === "gap")? "home": "city");
else if (e.set === "back_home_stay" || e.set === "near_family") move(e.age, "home");
else if (e.set === "moved_city" || e.set === "stayed_city") move(e.age, "city");
}
if (!place) place =!B.route? "home": B.route.id === "abroad"? "abroad": (B.route.id === "home" || B.route.id === "gap")? "home": "city";
spans[place] += Math.max(0, endAge - since);
return { final: place, spans};
}

// 活计形态（work.js formOf 的同口径只读复刻，对任意 Track 的 state 现算；R1–R5 规则与 tie 表序与 work.js 同步，改那边须同步这边）
function formOfState(B) {
const FORM_OF_FLAG = IFY.FORM_OF_FLAG || {};
const TIE = ["farm", "public", "self", "flex", "employee"];
const F = B.flags || {};
let best = null;
for (const [flag, form] of Object.entries(FORM_OF_FLAG)) {
if (!F[flag]) continue;
const age = B.flagAges && typeof B.flagAges[flag] === "number"? B.flagAges[flag]: 22;
let idx = -1;
if (Array.isArray(B.ledger)) for (let i = B.ledger.length - 1; i >= 0; i--) { if (B.ledger[i].set === flag) { idx = i; break;}}
const cand = { flag, form, age, idx};
if (!best || cand.age > best.age || (cand.age === best.age && cand.idx > best.idx) ||
(cand.age === best.age && cand.idx === best.idx && TIE.indexOf(cand.form) < TIE.indexOf(best.form))) best = cand;
}
if (best) return best.form;
if (["side_job", "xiahai"].some((f) => F[f])) return "self";
if (B.route && B.route.id === "home") return "public";
if (B.state && B.state.track === "home") return "farm";
return "employee";
}

// 现状事实表（蓝图 6.2）：入参 = 不受控 Track 的 state 与定格年龄（活着 = 本瞥视岁；已故 = 去世岁）。
// 每一行只从该 Track 的 state/账本/旗标里读真事，无数字、无预后、无与受控 Track 的比较句。
// 返回 [{slot, text}]，槽序固定：route / spouse / kids / house / residence / parents / work / phase / health。
function glimpseFactLines(B, atAge) {
const out = [];
const st = B.state || {}, F = B.flags || {}, led = Array.isArray(B.ledger)? B.ledger: [];
const inLed = (pred) => led.some((e) => e.age <= atAge && pred(e));
if (B.route && B.route.name) out.push({ slot: "route", text: `走的是「${B.route.name}」那条路`});
if (FACT_WORDS.spouse[st.spouse]) out.push({ slot: "spouse", text: FACT_WORDS.spouse[st.spouse]});
if (FACT_WORDS.kids[st.kids]) out.push({ slot: "kids", text: FACT_WORDS.kids[st.kids]});
// 房贷/债务行：来源登记见上方 OWNED/MORTGAGE 两组清单；无登记来源时整行不出（只出居所行）。
const owned = OWNED_FLAGS.some((f) => F[f]) || inLed((e) => OWNED_FLAGS.includes(e.set));
if (owned) {
const mortgage = inLed((e) => (e.set === "bought_house" && MORTGAGE_SETTER_IDS.includes(e.id)) || MORTGAGE_ONGOING_IDS.includes(e.id)) ||!!F.loan_swap;
out.push({ slot: "house", text: mortgage? FACT_WORDS.houseOwnedMortgage: FACT_WORDS.houseOwned});
} else if (F.renting || inLed((e) => e.set === "renting")) {
out.push({ slot: "house", text: FACT_WORDS.houseRenting});
}
const res = residenceOf(B, atAge);
out.push({ slot: "residence", text: res.final === "abroad"? FACT_WORDS.residenceAbroad
: res.final === "city"? FACT_WORDS.residenceCity
: (res.spans.city + res.spans.abroad) > 0? FACT_WORDS.residenceHomeBack: FACT_WORDS.residenceHomeAlways});
const dadAlive = st.dad!== "dead", momAlive = st.mom!== "dead";
out.push({ slot: "parents", text: dadAlive && momAlive? FACT_WORDS.parentsBoth: (dadAlive || momAlive)? FACT_WORDS.parentsOne: FACT_WORDS.parentsNone});
out.push({ slot: "work", text: FACT_WORDS.workForm[formOfState(B)] || FACT_WORDS.workForm.employee});
if (FACT_WORDS.phase[st.workPhase]) out.push({ slot: "phase", text: FACT_WORDS.phase[st.workPhase]});
const alert = inLed((e) => (e.kind === "crisis" && e.id === "health") || (e.kind === "death" && e.id === "health") || HEALTH_ALERT_IDS.includes(e.id));
out.push({ slot: "health", text: alert? FACT_WORDS.healthAlert: FACT_WORDS.healthNone});
return out;
}

// 账本条目 → 它那一岁的流水原句（state 流转没有专属流水行，认同岁造成它的那条行）。
// 认领序：death 认「这一生停在这里」行 → fork 认含 choice 的行 → rare 认「」行 →
// crisis 认含标题的行（标题不在账本里，按「岁 · 」前缀 + choice 在行内匹配）→ 其余认同岁未被占用的第一行。
function logLineFor(B, e, used) {
const lines = (Array.isArray(B.log)? B.log: []).filter((l) => l.startsWith(`${e.age} 岁 · `) &&!used.has(l));
if (!lines.length) return "";
let pick = "";
if (e.kind === "death") pick = lines.find((l) => l.includes("这一生停在这里")) || "";
else if (e.kind === "fork" && e.choice) pick = lines.find((l) => l.includes(e.choice)) || "";
else if (e.kind === "rare") pick = lines.find((l) => l.includes("")) || "";
else if (e.kind === "crisis" && e.choice) pick = lines.find((l) => l.includes(e.choice)) || "";
return pick || lines[0];
}

// 取材（蓝图 6.1）：窗内候选分级排序后取主素材 1 件 + 不同级的次素材至多 1 件。
// draw = renderGlimpse 入口已消费的那 1 抽的值：仅当第一名出现同级同龄并列时在并列组内决胜，无并列不使用。
// 纯读函数：不消费任何流（那一抽由调用方消费，见不变式注释）。
function glimpsePick(B, ctrlLedger, prevAge, age, draw) {
const ctrlForkAges = new Set((ctrlLedger || []).filter((e) => e.kind === "fork").map((e) => e.age));
const cands = [];
(Array.isArray(B.ledger)? B.ledger: []).forEach((e, idx) => {
if (!(e.age > prevAge && e.age <= age)) return;
let level = -1;
if (e.kind === "state") { const dom = String(e.id).split(">")[0]; if (STATE_DOMAINS_L1.includes(dom)) level = 1;}
else if (e.kind === "fork") level = ctrlForkAges.has(e.age)? 2: 3;
else if (e.kind === "rare" || e.kind === "crisis") level = 4;
else if (e.kind === "proc" && CARE_PROC_IDS.includes(e.id)) level = 5;
if (level >= 0) cands.push({ e, idx, level});
});
cands.sort((a, b) => (a.level - b.level) || (b.e.age - a.e.age) || (b.idx - a.idx)); // 级升序、级内最近、同级同龄取后落账者
if (!cands.length) return { main: null, second: null};
// 同级同龄并列决胜：第一名的并列组（同级 + 同龄）长度 ≥2 时，用那 1 抽在组内定主素材（组内序 = 上列排序序）
const top = cands[0];
const tieGroup = cands.filter((c) => c.level === top.level && c.e.age === top.e.age);
let ordered = cands;
if (tieGroup.length >= 2) {
const win = tieGroup[Math.min(tieGroup.length - 1, Math.floor(draw * tieGroup.length))];
ordered = [win,...cands.filter((c) => c!== win)];
}
const used = new Set();
const resolve = (c) => { const text = logLineFor(B, c.e, used); if (!text) return null; used.add(text); return { id: c.e.id, kind: c.e.kind, age: c.e.age, level: c.level, text};};
let main = null;
for (const c of ordered) { main = resolve(c); if (main) break;}
if (!main) return { main: null, second: null};
let second = null;
for (const c of cands) { if (c.level === main.level) continue; const r = resolve(c); if (r) { second = r; break;}}
return { main, second};
}

// 悼念收尾骨架（蓝图 6.3 第 2 段）：出生路线 → 成家与否 → 子女 → 最后一次流转，各一句，全生取材。
function glimpseSkeleton(B) {
const st = B.state || {};
const out = [];
if (B.route && B.route.name) out.push(`22 岁那年，走的是「${B.route.name}」那条路。`);
const sp = { partnered: "后来成了家。", divorced: "成过家，后来离了。", widowed: "成过家，对方先走了。", dating: "处过一个人，没走到成家那一步。", single: "一直没成家。", none: "一直没成家。"}[st.spouse];
if (sp) out.push(sp);
const kd = { has: "有了孩子。", none: "没要孩子。", undecided: "孩子的事，一直没定下来。"}[st.kids];
if (kd) out.push(kd);
const states = (Array.isArray(B.ledger)? B.ledger: []).filter((e) => e.kind === "state" && STATE_PHRASE[e.id]);
if (states.length) { const last = states[states.length - 1]; out.push(`最后一次落定的事，是${STATE_PHRASE[last.id]}，在 ${last.age} 岁。`);}
return out;
}

function glimpseDeathLine(B) {
const line = (Array.isArray(B.log)? B.log: []).find((l) => l.includes("这一生停在这里"));
if (line) return line;
return B.death? `${B.death.age} 岁 · 这一生停在这里：${B.death.text}`: "";
}

// ---------- 真账瞥视（呈现骨架与 legacy 同一套，只换取材） ----------
function renderGlimpseReal(stage, found) {
const { entry} = found;
const B = entry.state;
IFY.curKind = "glimpse";
IFY.S.flatCarry = null; // 瞥视年不是平年：挂起的平年只留在流水账里
// 每次 renderGlimpse 恰好消费主线叙事流 1 抽，与现行
// shadowStageText 的口径逐位一致——瞥视年的主线叙事流相位不许因取材改版而动。
// 本抽只在一个地方用：主素材出现同级同龄并列时在并列组内决胜（glimpsePick）；无并列时抽了丢弃。
// legacy 路径的 1 抽在 shadowStageText 内消费，同样恰好 1 抽。改本函数的人先过这条。
const draw = IFY.rng();
const age = IFY.S.age;
const prevAge = stage <= 0? (IFY.START_AGE || 22): GLIMPSE_AGES_ALL[stage - 1];
const mode = B.death? (entry.memorialShown? "retro": "memorial"): "normal";
const atAge = B.death? B.death.age: age;
const facts = glimpseFactLines(B, atAge);
const pick = mode === "normal"? glimpsePick(B, IFY.S.ledger, prevAge, age, draw): { main: null, second: null};
const skeleton = mode === "normal"? []: glimpseSkeleton(B);
const deathLine = mode === "normal"? "": glimpseDeathLine(B);
const routeName = B.route? B.route.name: "";
const firstLook = (IFY.playerMeta().glimpsesSeen + IFY.playerMeta().glimpsesSkipped) === 0; // v0.20.1 第九项：影子机制的说明不在开局讲，挪到第一次瞥视当口说（只说这一次）；v0.21 WP1：瞥视计数改读 session.meta（蓝图 3.1 玩家层）
IFY.app().innerHTML = `<section class="card glimpse">${IFY.head()}
<h2>${IFY.S.age} 岁 · 另一条路上的你</h2>
${firstLook? `<p class="body">这就是你 22 岁那年没选的那条路。它过得怎么样，你只能远远看一眼——三十岁、四十岁、五十岁，各来一次。</p>`: ""}
<p class="teaser">${IFY.esc(routeName)}，那条路上的你。</p>
<p class="hint">细节只给你看一眼。看，还是不看，你自己定——不看的那几次，结算时会记着。</p>
<div class="row"><button class="primary" id="look">看细节</button><button class="ghost" id="skip">不看，继续过日子</button></div>
<div id="detail"></div></section>`;
IFY.finishRender();
IFY.el("skip").addEventListener("click", () => { const mSkip = IFY.playerMeta(); mSkip.glimpsesSkipped += 1; IFY.S.glimpsesSkipped = mSkip.glimpsesSkipped; /* v0.21 WP1：计数权威在 meta，state 同名字段只作同形镜像 */ IFY.ANA.track("glimpse", { age: IFY.S.age, seen: false}); IFY.S.log.push(`${IFY.S.age} 岁 · 没有去看另一条路`); IFY.rec("glimpse", "skip"); IFY.advance();});
// 注：悼念模式下点「不看」同样只记跳过——memorialShown 不置位，悼念顺延到下一个瞥视点，不许被跳过吃掉（蓝图 6.3）。
IFY.el("look").addEventListener("click", () => {
const mSeen = IFY.playerMeta(); mSeen.glimpsesSeen += 1; IFY.S.glimpsesSeen = mSeen.glimpsesSeen; /* v0.21 WP1：计数权威在 meta，state 同名字段只作同形镜像 */ IFY.ANA.track("glimpse", { age: IFY.S.age, seen: true});
// shownFacts 记账（蓝图 6.2b）：实际呈现的素材（id+age）与事实行（槽名）落 meta，供二期揭价对着清单选材
const meta = IFY.playerMeta();
if (!Array.isArray(meta.shownFacts)) meta.shownFacts = [];
const mainText = mode === "memorial"? deathLine: mode === "retro"? (skeleton[0] || ""): (pick.main? pick.main.text: "");
if (mode === "normal") {
for (const m of [pick.main, pick.second]) if (m) meta.shownFacts.push({ glimpseAge: age, type: "material", id: m.id, atAge: m.age});
}
if (mode === "memorial") meta.shownFacts.push({ glimpseAge: age, type: "memorial", id: "death", atAge: B.death.age});
if (mode === "retro" && skeleton[0]) meta.shownFacts.push({ glimpseAge: age, type: "material", id: "route", atAge: 22});
for (const f of facts) meta.shownFacts.push({ glimpseAge: age, type: "fact", slot: f.slot});
if (mainText) (IFY.S.shadowSeenTexts = IFY.S.shadowSeenTexts || []).push(mainText);
IFY.rec("glimpse", "seen", mainText? { text: mainText}: undefined);
IFY.S.log.push(mainText? `${IFY.S.age} 岁 · 影子：${mainText}`: `${IFY.S.age} 岁 · 看了另一条路`);
if (mode === "memorial") entry.memorialShown = true; // 悼念呈现后才置位（蓝图 6.3）
// 童年记号的影子回响（v0.17.0）：每局第一次看瞥视时附一句「两条路上共同的事实」——童年不进影子锚点，只留共同事实
let markLine = "";
if (IFY.PRO && IFY.S.prologue &&!IFY.S.prologue.shadowMarkShown && (IFY.S.marks || []).length) {
const mk = IFY.PRO.marks[IFY.S.marks[0].id];
if (mk) { markLine = mk.shadow; IFY.S.prologue.shadowMarkShown = true; IFY.S.log.push(`${IFY.S.age} 岁 · ${mk.shadow}`);}
}
const factsHtml = `<p class="hint">近况，一行一条：</p>` + facts.map((f) => `<p class="body">· ${IFY.esc(f.text)}</p>`).join("");
let detailHtml = "";
if (mode === "normal") {
detailHtml = `${pick.main? `<p class="body">「${IFY.esc(pick.main.text)}」</p>`: ""}${pick.second? `<p class="body">「${IFY.esc(pick.second.text)}」</p>`: ""}${factsHtml}`;
} else if (mode === "memorial") {
detailHtml = `<p class="body">「${IFY.esc(deathLine)}」</p>`
+ skeleton.map((s) => `<p class="body">${IFY.esc(s)}</p>`).join("")
+ factsHtml
+ `<p class="body">那条路，在 ${B.death.age} 岁走完了。</p>`;
} else { // retro 回望：定格事实表 + 收尾叙述第一句，不编新素材（蓝图 6.3）
detailHtml = `${skeleton[0]? `<p class="body">${IFY.esc(skeleton[0])}</p>`: ""}${factsHtml}`;
}
// 交换提问（蓝图 7.1 时机 A+，二期 WP6）：只在 normal 屏、未交换过时出，位置在 detail 内容里、
// 反思输入行之前；机会说明行只陈述机会存量，不劝换不劝留。悼念/回望 mode 天然不在 normal、不出；
// skip 路径不经本处理器，不出。拒绝只关本次（下个瞥视点照常出），接受走 IFY.handControl()。
const swapHtml = (mode === "normal" && !meta.swapped)
? `<div id="swapblock"><p class="hint">换过去的机会，一生只有一次。换了，就再没有第二次。</p><div class="row"><button class="primary" id="swap-yes">换过去，过它接下来的日子</button><button class="ghost" id="swap-no">不换，继续过我的</button></div></div>`
: "";
IFY.el("detail").innerHTML = `${detailHtml}${markLine? `<p class="body">${IFY.esc(markLine)}</p>`: ""}${swapHtml}
<label class="refl-label">给现实里的自己留一句话（会出现在你的结算里）<input id="refl" type="text" maxlength="60" placeholder="一句就好"></label>
<div class="row"><button class="primary" id="cont">记下，继续</button><button class="ghost" id="cont2">不写了，继续</button></div>`;
document.querySelector(".row").remove();
const done = () => { const v = (IFY.el("refl").value || "").trim(); if (v) IFY.playerMeta().reflections.push({ age: IFY.S.age, text: v}); /* v0.21 WP1：反思认领是玩家层，写 session.meta（蓝图 3.1） */ IFY.advance();};
IFY.el("cont").addEventListener("click", done);
IFY.el("cont2").addEventListener("click", IFY.advance);
if (swapHtml) {
IFY.el("swap-no").addEventListener("click", () => { const b = IFY.el("swapblock"); if (b) b.remove();});
IFY.el("swap-yes").addEventListener("click", () => {
let okSwap = false;
try { okSwap = typeof IFY.handControl === "function" && IFY.handControl();} catch (e) { console.error("交换提问：handControl 抛错，提问块保留待查", e);}
if (okSwap) { const b = IFY.el("swapblock"); if (b) b.outerHTML = `<p class="body">从这一年起，你过的是这条路的日子了。先前那条，由另一个你接着过。</p>`;}
else console.error("交换提问：handControl 返回失败，提问块保留待查");
});
}
IFY.save();
});
}

// ---------- legacy 瞥视（无 Track_B 的旧档局）：现行模板逻辑，一行未动 ----------
function renderGlimpseLegacy(stage) {
IFY.curKind = "glimpse";
IFY.S.flatCarry = null; // 瞥视年不是平年：挂起的平年只留在流水账里
const sh = shadowRoute();
const text = shadowStageText(stage); // 先抽定，点不点开都是这一条（但只有点开才显示）
const firstLook = (IFY.playerMeta().glimpsesSeen + IFY.playerMeta().glimpsesSkipped) === 0; // v0.20.1 第九项：影子机制的说明不在开局讲，挪到第一次瞥视当口说（只说这一次）；v0.21 WP1：瞥视计数改读 session.meta（蓝图 3.1 玩家层）
IFY.app().innerHTML = `<section class="card glimpse">${IFY.head()}
<h2>${IFY.S.age} 岁 · 另一条路上的你</h2>
${firstLook? `<p class="body">这就是你 22 岁那年没选的那条路。它过得怎么样，你只能远远看一眼——三十岁、四十岁、五十岁，各来一次。</p>`: ""}
<p class="teaser">${IFY.esc(sh.name)}，今年：${IFY.esc(sh.teaser[stage])}</p>
<p class="hint">细节只给你看一眼。看，还是不看，你自己定——不看的那几次，结算时会记着。</p>
<div class="row"><button class="primary" id="look">看细节</button><button class="ghost" id="skip">不看，继续过日子</button></div>
<div id="detail"></div></section>`;
IFY.finishRender();
IFY.el("skip").addEventListener("click", () => { const mSkip = IFY.playerMeta(); mSkip.glimpsesSkipped += 1; IFY.S.glimpsesSkipped = mSkip.glimpsesSkipped; /* v0.21 WP1：计数权威在 meta，state 同名字段只作同形镜像 */ IFY.ANA.track("glimpse", { age: IFY.S.age, seen: false}); IFY.S.log.push(`${IFY.S.age} 岁 · 没有去看另一条路`); IFY.rec("glimpse", "skip"); IFY.advance();});
IFY.el("look").addEventListener("click", () => {
const mSeen = IFY.playerMeta(); mSeen.glimpsesSeen += 1; IFY.S.glimpsesSeen = mSeen.glimpsesSeen; /* v0.21 WP1：计数权威在 meta，state 同名字段只作同形镜像 */ IFY.ANA.track("glimpse", { age: IFY.S.age, seen: true});
(IFY.S.shadowSeenTexts = IFY.S.shadowSeenTexts || []).push(text);
IFY.rec("glimpse", "seen", { text});
IFY.S.log.push(`${IFY.S.age} 岁 · 影子：${text}`);
// 童年记号的影子回响（v0.17.0）：每局第一次看瞥视时附一句「两条路上共同的事实」——童年不进影子锚点，只留共同事实
let markLine = "";
if (IFY.PRO && IFY.S.prologue &&!IFY.S.prologue.shadowMarkShown && (IFY.S.marks || []).length) {
const mk = IFY.PRO.marks[IFY.S.marks[0].id];
if (mk) { markLine = mk.shadow; IFY.S.prologue.shadowMarkShown = true; IFY.S.log.push(`${IFY.S.age} 岁 · ${mk.shadow}`);}
}
IFY.el("detail").innerHTML = `<p class="body">「${IFY.esc(text)}」</p>${markLine? `<p class="body">${IFY.esc(markLine)}</p>`: ""}
<label class="refl-label">给现实里的自己留一句话（会出现在你的结算里）<input id="refl" type="text" maxlength="60" placeholder="一句就好"></label>
<div class="row"><button class="primary" id="cont">记下，继续</button><button class="ghost" id="cont2">不写了，继续</button></div>`;
document.querySelector(".row").remove();
const done = () => { const v = (IFY.el("refl").value || "").trim(); if (v) IFY.playerMeta().reflections.push({ age: IFY.S.age, text: v}); /* v0.21 WP1：反思认领是玩家层，写 session.meta（蓝图 3.1） */ IFY.advance();};
IFY.el("cont").addEventListener("click", done);
IFY.el("cont2").addEventListener("click", IFY.advance);
IFY.save();
});
}

function renderGlimpse(stage) {
const found = uncontrolledEntry();
if (found) return renderGlimpseReal(stage, found);
return renderGlimpseLegacy(stage);
}

// 只读测试导出（v0.21 WP5）：把一次瞥视的呈现记录按 renderGlimpseReal 的同口径算出来，供
// 出处检查的批量快照法复用。纯函数：只读入参快照、不写任何 Track、不消费任何随机流——
// draw 是那一抽的值、由调用方按裁定二不变式在渲染当口取得后传入（与 glimpsePick 同口径）。
// B = 不受控 Track 的 state 快照；ctrlLedger = 受控 Track 账本（只读、只为对照点配对）；
// memorialShown = 该 Track 条目在本次瞥视之前的悼念置位（决定悼念/回望）。
// 返回 {mode, materials, facts, skeleton, closing, framing}，形状与 glimpse-provenance 的 case 对齐。
function glimpseTakeForTest(B, ctrlLedger, glimpseAge, draw, memorialShown) {
const stage = GLIMPSE_AGES_ALL.indexOf(glimpseAge);
const prevAge = stage <= 0? (IFY.START_AGE || 22): GLIMPSE_AGES_ALL[stage - 1];
const mode = B.death? (memorialShown? "retro": "memorial"): "normal";
const atAge = B.death? B.death.age: glimpseAge;
const facts = glimpseFactLines(B, atAge);
const framing = [`${B.route? B.route.name: ""}，那条路上的你。`];
if (mode === "normal") {
const pick = glimpsePick(B, ctrlLedger, prevAge, glimpseAge, draw);
const materials = [pick.main, pick.second].filter(Boolean).map((m) => m.text);
return { mode, materials, facts, skeleton: [], closing: "", framing};
}
const skeleton = glimpseSkeleton(B);
if (mode === "memorial") {
return { mode, materials: [glimpseDeathLine(B)], facts, skeleton, closing: `那条路，在 ${B.death.age} 岁走完了。`, framing};
}
return { mode, materials: [], facts, skeleton: skeleton.slice(0, 1), closing: "", framing};
}

Object.assign(IFY, {
shadowRoute, shadowStageText, shadowCostText, shadowFinalText, shadowCompareLines, renderGlimpse,
// WP4 取材层导出（供出处检查工具与断言复用同一套登记表与纯函数；呈现层之外不消费它们做决策）
glimpseFactLines, glimpsePick, glimpseSkeleton, glimpseDeathLine, uncontrolledEntry, glimpseTakeForTest,
GLIMPSE_FACT_SOURCES: { OWNED_FLAGS, MORTGAGE_SETTER_IDS, MORTGAGE_ONGOING_IDS, HEALTH_ALERT_IDS, FACT_WORDS},
});
})(window.IFY);
