// 《如果那年》引擎 v0.18.0 —— 版本号规则见 docs/DEVLOG.md 卷首// 要点：选择写标记→回响事件 / 年度小选择+当场回响 / 数值阈值危机 / 瞥视先给标题、点开才看全文（计数真实）
//      / 判词按数值形状拼装 / 全程自动存档可续玩 / 种子可输入、可复制分享链接 / 在线零 LLM 调用
(function () {
  "use strict";
  const D = window.GAME_DATA;
  if (!D || !Array.isArray(D.events) || !D.routes || !D.forks) { // 数据缺失守卫（v0.13.1）：脚本加载不全时渲染提示，不白页
    const appEl = document.getElementById("app");
    if (appEl) appEl.innerHTML = "<section class=\"card\"><h2>如果那年 · 另一条路</h2><p>这一生的账本没能打开：游戏数据没有加载完。检查一下网络，再刷新一次。</p></section>";
    return;
  }
  if (window.GAME_PACKS) D.events = D.events.concat(window.GAME_PACKS); // 事件扩展包（src/packs/）在引擎启动时并入主池
  if (window.GAME_SYNERGY) { // 协同组合与稀有系统（docs/SYNERGY-AND-RARE-ENDINGS.md）
    D.events = D.events.concat(window.GAME_SYNERGY.combos || []);
    D.rare = window.GAME_SYNERGY.rare || [];
    D.endings = window.GAME_SYNERGY.endings || [];
  }
  const CARDS = window.GAME_CARDS || null; // 出身牌（v0.13.0，src/cards.js；设计 docs/DESIGN-V013.md §A）
  const PRO = window.GAME_PROLOGUE || null; // 序章（v0.17.0，src/prologue.js；试点年代 c2000 的开局：来历→童年→少年→16 岁分岔→17–21 段→22 岁汇入）
  const RHYTHM = window.GAME_RHYTHM || null; // 节奏档案与温度（v0.17.0，src/rhythm.js；派生公式单一来源）
  const PROLOGUE_ERA = "c2000"; // 本轮试点年代：只有它走序章开局，其余年代序章随各自施工轮铺（地基第五章第二步）
  const ANA = window.GAME_ANALYTICS || { track() {}, flush() {} }; // 匿名埋点（v0.13.1，src/analytics.js；默认关闭、关闭时无操作，口径见 docs/ANALYTICS.md）
  // --- 状态矩阵（v0.12.0，docs/STATE-MATRIX.md）：域内互斥/不可逆的人生状态收进 S.state，
  // 流转只能走注册表（src/registry.js）声明的边；普通叙事旗标仍留在 S.flags（里程碑）。
  const REG = window.GAME_REGISTRY || { domains: {} };
  const STATE_EDGES = {}; // dom -> Set("from>to")，仅含已启用（有载体）的边
  for (const [dom, def] of Object.entries(REG.domains || {})) STATE_EDGES[dom] = new Set((def.edges || []).filter((e) => (e.by || []).length).map((e) => e.from + ">" + e.to));
  function initialState() { const o = {}; for (const [dom, def] of Object.entries(REG.domains || {})) o[dom] = def.initial; return o; }
  function applyState(item) { // setState 的唯一执行点：未声明的边（含去世类反向边）结构性写不出
    if (!item || !item.setState || !S || !S.state) return;
    for (const [dom, to] of Object.entries(item.setState)) {
      const from = S.state[dom];
      if (from === undefined || from === to) continue;
      if (STATE_EDGES[dom] && STATE_EDGES[dom].has(from + ">" + to)) {
        S.state[dom] = to;
        rec("state", dom + ">" + to); // 账本（v0.18.0）：状态流转本身就是事实，结算与证据都可读（如 kids 流转本身计一个证据点）
        if (dom === "spouse") { if (to === "dating") S.datingSince = S.age; else if (from === "dating") S.datingSince = null; }
        if (dom === "kids" && to === "has" && !S.kidsAt) S.kidsAt = S.age;
      }
    }
  }
  function deriveStateFromLegacy(saved) { // v0.11 及更早存档：由旧 flags 推导 state（映射见 docs/STATE-MATRIX.md §5）
    const F = saved.flags || {}, used = saved.usedEvents || [], st = initialState();
    const i27 = used.indexOf("p27_001"), i28 = used.indexOf("p28_001"); // 离异与丧偶互斥：旗标时代两者可同立，按事件先后取后发生者
    if (F.divorced && F.spouse_dead) st.spouse = i28 > i27 ? "widowed" : "divorced";
    else if (F.divorced) st.spouse = "divorced";
    else if (F.spouse_dead) st.spouse = "widowed";
    else if (F.partner) st.spouse = "partnered";
    else if (F.single_ok) st.spouse = "single";
    else if (F.slow_love) st.spouse = "dating";
    if (F.has_kid) st.kids = "has"; else if (F.no_kid) st.kids = "none";
    if (F.dad_dead) st.dad = "dead";
    if (F.mom_dead) st.mom = "dead";
    if (F.dog_gone) st.dog = "gone"; else if (F.dog_home) st.dog = "home";
    if (F.cat_gone) st.cat = "gone"; else if (used.includes("p5_043")) st.cat = "home";
    return st;
  }
  // ---------- 结构化人生账本（v0.18.0，内核一期）：文字流水是显示层，账本是事实层 ----------
  // 每条记录 { age, kind, id, choice?, set?, fx?, text? }；kind ∈ event/rare/fork/crisis/glimpse/flat/micro/proc/state/route/prologue/death。
  // 判词与特殊结局的证据、结算九槽、居所轨迹都读账本（与 flags/usedEvents 并读；旧存档无账本时各处回落旧读法）。
  function rec(kind, id, extra) {
    if (!S) return;
    if (!Array.isArray(S.ledger)) S.ledger = [];
    const e = { age: S.age, kind, id };
    if (extra) for (const [k, v] of Object.entries(extra)) if (v !== undefined && v !== null && v !== "") e[k] = v;
    S.ledger.push(e);
    if (extra && extra.set) { if (!S.flagAges) S.flagAges = {}; if (!(extra.set in S.flagAges)) S.flagAges[extra.set] = S.age; }
  }
  function hasRec(id) { return Array.isArray(S.ledger) && S.ledger.some((e) => e.id === id); }
  function hasFact(id) { return !!S.flags[id] || S.usedEvents.includes(id) || (S.usedRare || []).includes(id) || hasRec(id); }
  // 职业语境门（v0.18.0，审计急修 B5）：条目声明所需活计形态/关键经历（ctx），抽取层按本局实际状态与账本核对——
  // 没有从医经历不出村医，没有长途职业线不出「跑满一百万公里」。
  function ctxOk(ctx) {
    if (!ctx) return true;
    if (ctx.flag && !hasFact(ctx.flag)) return false;
    if (ctx.anyFlag && !ctx.anyFlag.some((f) => hasFact(f))) return false;
    if (ctx.state) for (const [dom, vals] of Object.entries(ctx.state)) if (!vals.includes(S.state[dom])) return false;
    return true;
  }
  // ---------- 父母进程（v0.18.0，内核一期）：父亲、母亲各一条身体进程 ----------
  // 出生时父母年龄、父母一代人寿命均值与散布按年代标定（标定说明见 docs/PARENTS-PROCESS.md）；
  // 需照护、住院、离世由进程越线发作成动静（pack36 的 proc_* 条目），不再等事件抽中。主角自身死亡曲线不在此列，一字未动。
  const PARENT_CAL = {
    c1955: { dadAge: [27, 35], momAge: [25, 33], dadLife: [66, 9], momLife: [71, 9] },
    c1965: { dadAge: [27, 35], momAge: [25, 33], dadLife: [69, 9], momLife: [74, 9] },
    c1978: { dadAge: [26, 34], momAge: [24, 32], dadLife: [73, 9], momLife: [78, 9] },
    c2000: { dadAge: [25, 33], momAge: [23, 31], dadLife: [79, 10], momLife: [85, 10] },
  };
  function triW() { return (rngW() + rngW() + rngW() - 1.5) / 1.5; } // [-1,1] 近正态扰动（进程流）
  function initParents() {
    if (S.parents || !S.route) return;
    const cal = PARENT_CAL[S.era] || PARENT_CAL.c2000;
    const one = (ageBand, lifeBand) => {
      const age0 = ageBand[0] + Math.floor(rngW() * (ageBand[1] - ageBand[0] + 1));
      const life = Math.round(lifeBand[0] + triW() * lifeBand[1]);
      const deathAge = Math.max(26, life - age0); // 换算成主角年龄口径的离世点；下限保证此事不出在童年段（序章不处理）
      const careAge = Math.max(24, deathAge - (2 + Math.floor(rngW() * 4))); // 需照护段起点：离世前 2–5 年
      const hospAge = deathAge - careAge >= 2 ? careAge + 1 + Math.floor(rngW() * (deathAge - careAge - 1)) : null;
      return { age0, deathAge, careAge, hospAge, stage: "well" }; // stage: well → care → hosp → dead
    };
    S.parents = { dad: one(cal.dadAge, cal.dadLife), mom: one(cal.momAge, cal.momLife) };
  }
  // 本年到期的进程动静（每岁至多一件：离世 > 住院 > 照护，父先于母）；已被事件写过世的父母不再发作
  function parentsDue() {
    if (!S.parents) return null;
    const due = [];
    for (const who of ["dad", "mom"]) {
      const P = S.parents[who];
      if (!P || S.state[who] !== "alive") continue;
      if (S.age >= P.deathAge) due.push({ pr: 0, item: "proc_" + who + "_dead", who, beat: "dead" });
      else if (P.hospAge !== null && S.age >= P.hospAge && P.stage === "hosp") { /* 已呈现 */ }
      else if (P.hospAge !== null && S.age >= P.hospAge && P.stage === "care") due.push({ pr: 1, item: "proc_" + who + "_hosp", who, beat: "hosp" });
      else if (S.age >= P.careAge && P.stage === "well") due.push({ pr: 2, item: "proc_" + who + "_care", who, beat: "care" });
    }
    if (!due.length) return null;
    due.sort((a, b) => a.pr - b.pr);
    return due[0];
  }
  // 伴侣状态闭环（v0.18.0，审计急修 B6）：dating 超过 6 年必须走向定下来或分手，不许冻结几十年
  function datingDue() {
    return !!(S.state && S.state.spouse === "dating" && typeof S.datingSince === "number" && S.age - S.datingSince >= 7);
  }
  // 进程条目呈现（pack36 的 proc_* 条目）：与事件年同形，但过完回到本年 step（进程拍不独占这一年，年内的分岔/瞥视照常）
  function renderProcItem(item, who, beat) {
    curKind = "proc";
    S.flatCarry = null; // 进程年不是平年
    if (beat && S.parents && S.parents[who]) { // 节拍呈现即推进父母进程段位（离世的状态流转走条目自身的 setState）
      S.parents[who].stage = beat === "dead" ? "dead" : beat === "hosp" ? "hosp" : "care";
      if (beat === "care") S.flags.care_stage = true;
    }
    if (item.set) S.flags[item.set] = true;
    applyState(item);
    if (!item.choices) { applyEffects(item.effects); } else S.lastDelta = "";
    rec("proc", item.id, { set: item.set || null, fx: !item.choices ? S.lastDelta : null });
    S.log.push(`${S.age} 岁 · ${item.text}`);
    const visChoices = item.choices ? item.choices.map((c, i) => [c, i]).filter(([c]) => !(c.deferDating && (S.datingDefers || 0) >= 2)) : null; // dating 推迟两次后不再给推迟选项
    app().innerHTML = `<section class="card">${head()}<p class="body">${esc(item.text)}</p>${deltaLine()}
      ${visChoices ? `<div class="choices">${visChoices.map(([c, i]) => `<button class="choice" data-i="${i}">${esc(c.label)}</button>`).join("")}</div><div id="echo"></div>`
                  : `<button class="primary" id="cont">继续</button>`}</section>`;
    finishRender();
    if (!visChoices) { save(); el("cont").addEventListener("click", () => step()); return; }
    document.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
      const c = item.choices[Number(b.dataset.i)];
      choiceBeat(b, () => {
        applyEffects(c.effects);
        if (c.set) S.flags[c.set] = true;
        applyState(c);
        if (c.deferDating) { S.datingSince = S.age - 3; S.datingDefers = (S.datingDefers || 0) + 1; } // 推迟：时钟回拨，下次到期在约 4 年后
        rec("proc", item.id, { choice: c.label, set: c.set || null, fx: S.lastDelta });
        document.querySelector(".choices").remove();
        el("echo").innerHTML = `${deltaLine()}<p class="pickednote">已选「${esc(c.label)}」</p>${c.echo ? `<p class="echo">${esc(c.echo)}</p>` : ""}<button class="primary" id="cont">继续</button>`;
        save(); el("cont").addEventListener("click", () => step());
      });
    }));
  }
  // 居所轨迹（v0.18.0，审计急修 B7）：读账本里的路线起点与迁徙记录，数出各居所住过的年数与终点；
  // 结算标签与「终老在异国」类句子据此写。旧存档无账本时轨迹为空，按路线回落（起点即终点）。
  function residenceTrail() {
    const spans = { home: 0, city: 0, abroad: 0 };
    let place = null, since = START_AGE;
    const endA = finalAge();
    const move = (age, p) => { if (place && p !== place) { spans[place] += Math.max(0, age - since); place = p; since = age; } else if (!place) { place = p; since = age; } };
    const led = Array.isArray(S.ledger) ? S.ledger : [];
    for (const e of led) {
      if (e.kind === "route") move(e.age, e.id === "abroad" ? "abroad" : (e.id === "home" || e.id === "gap") ? "home" : "city");
      else if (e.set === "back_home_stay" || e.set === "near_family" || e.set === "saw_home") move(e.age, "home");
      else if (e.set === "moved_city" || e.set === "stayed_city" || e.set === "often_back") move(e.age, "city");
    }
    if (!place) place = !S.route ? "home" : S.route.id === "abroad" ? "abroad" : (S.route.id === "home" || S.route.id === "gap") ? "home" : "city";
    spans[place] += Math.max(0, endA - since);
    return { final: place, spans };
  }

  const START_AGE = 22, MAX_AGE = 80;
  // 死亡模型 v2（年龄×健康风险）：公式与校准实测见 docs/MORTALITY-MODEL.md
  const MORTALITY = { accident: 0.00015, healthA: 0.0010, healthG: 1.04, hfNum: 115, hfDen: 55, hfLo: 0.3, hfHi: 2.2 };
  const CHAIN_BOOST = 48; // chain 后继权重倍数（v0.14.0，16000 局模拟定参，见 DEVLOG v0.14.0 条目⑤）
  const DEATH_CAUSES = {
    health: [
      "身体早几年就给过信儿。那天夜里胸口闷得睡不着，送到医院时已经晚了。",
      "复查拖了又拖。最后一次倒下是在家门口，邻居帮忙叫了车，人没能再醒过来。",
      "爬楼越来越吃力。那天下午在楼梯间坐下，就没再站起来。家里人赶到时，医生已经出来了。",
      "冬天那次感冒拖成了肺炎。输液的第三天夜里，监护仪先响，人没能再睁开眼。",
      "血压的药断过几天。早上洗脸时眼前一黑，摔在卫生间，送到医院时已经没有自主呼吸。",
      "体检单上圈出的那一项，你说过节后再查。节后第一周，病床上的管子比人还多，没撑过那一晚。",
    ],
    accident: [
      "雨天路滑，路口一辆车失控撞过来。救护车赶到时，已经晚了。",
      "夜里那趟车在高速上出了事故。同行的人活了下来，这边没能回来。",
      "河边护栏外的一块地面塌了，人掉了下去。等找到时，已经晚了。",
      "工地外边的脚手架有一截没固定好，掉下来的钢管砸在经过的人身上。救护来时，现场已经围了人。",
      "夜里厨房煤气胶管老化漏气。邻居闻到味儿砸开门时，人已经没有了气息。",
      "过马路时有人闯红灯。刹车声比喇叭更刺耳，人被撞出了人行道外。",
    ],
  };
  // 维度定义表：[键, 名, 初始值]。所有渲染（游玩数值条、分享卡）都从这张表生成，不写死根数——加新维度只改这里与数据。
  // v0.9.0 第六维「智慧」：成长=本事（学与练，前半生为主），智慧=判断（阅历与吃亏换来，全程可涨）。
  // 初值 40 为六维最低：22 岁的人本事可以现学，判断还没攒下——留出一生去涨的空间。取 40 而非更低，是 16000 局模拟校准的结果：
  // 关系终局中位约 99（存量生态），初值 35 时智慧登顶率为 0；初值 40＋改挂幅度校准后登顶约 5%、打满约 3% 以内（见 DEVLOG v0.9.0）。
  // 智慧不进危机表（D.crisis 无此键，pickCrisis 自动跳过）。
  const STAT_META = [["health", "健康", 60], ["money", "金钱", 45], ["growth", "成长", 50], ["freedom", "自由", 50], ["relation", "关系", 50], ["wisdom", "智慧", 40]];
  const GLIMPSE_AGES = { 30: 0, 40: 1, 50: 2 };
  const ERAS = [
    { id: "c1955", birth: 1955, label: "1955 年生", desc: "22 岁是 1977 年：恢复高考、返城、分房、下岗潮" },
    { id: "c1965", birth: 1965, label: "1965 年生", desc: "22 岁是 1987 年：海南热、下海潮、房改" },
    { id: "c1978", birth: 1978, label: "1978 年生", desc: "22 岁是 2000 年：互联网、非典、房价起飞" },
    { id: "c2000", birth: 2000, label: "2000 年生", desc: "22 岁是 2022 年：现在这一代人的路" },
  ];
  const SAVE_KEY = "ify-save-v2";
  const LIVES_KEY = "ify-lives-v1"; // 「活过的人生」本地记录（v0.13.0，docs/DESIGN-V013.md §B）：只存 id + 首次活到的本地日期，无次数、无上传
  const PREFS_KEY = "ify-prefs";
  // 停留按刚显示的文字长度算（v0.16.1）：基础 0.8 秒 + 字数 ÷ 每秒字数。三档是读法——
  // 慢·细读约 9 字/秒、中·通读约 16 字/秒、快·扫读约 25 字/秒；单屏上限 20 秒（慢档约 173 字触顶）。
  // 纯界面计时：只喂 setTimeout 与倒计时细线，不碰 RNG、不入游戏状态，同种子复现不受影响。
  const SPEED_CPS = { slow: 9, mid: 16, fast: 25 }; // 每秒字数（细读 / 通读 / 扫读）
  const SPEED_LABEL = { slow: "慢", mid: "中", fast: "快" };
  const SPEED_STYLE = { slow: "细读", mid: "通读", fast: "扫读" };
  const AUTO_BASE_MS = 800, AUTO_CAP_MS = 20000;
  const AUTO_MODES = [["off", "关"], ["plain", "平年"], ["full", "全程"]];
  const DEFAULT_AUTO_MODE = "off"; // v0.17.0 定案（地基 v2.1）：新玩家默认关——第一局先手动过完；老玩家已存的偏好不动（loadPrefs 优先读存档值）。完局后结算页提示一次可开平年自动。

  // --- 可序列化的种子随机（状态可存档） ---
  // v0.18.0 随机流分家（内核一期）：主种子派生三股流，各走各的计数器——叙事流 RNG（判词/瞥视/呈现层抽取，即旧 rng()）、
  // 进程流 RNGW（主角死亡判定与父母进程等世界进程）、环境流 RNGA（事件/稀有/平淡年的环境抽取）。
  // 序章流（种子+"#prologue"，prologue.js 内）并入此体系，为第四股。种子语义自 v0.18 起按此口径：
  // 同一种子在新口径下是一局新的人生；旧分享链接打开同一种子但不保证同一局（兼容策略见 DEVLOG v0.18.0 条目）；新链接带 k=3 版本位。
  const RNG = { a: 0 }, RNGW = { a: 0 }, RNGA = { a: 0 };
  function mulberry(st) {
    st.a |= 0; st.a = (st.a + 0x6D2B79F5) | 0;
    let t = Math.imul(st.a ^ (st.a >>> 15), 1 | st.a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function rng() { return mulberry(RNG); }
  function rngW() { return mulberry(RNGW); }
  function rngA() { return mulberry(RNGA); }
  function seedStreams(seedStr) { RNG.a = seedFromString(seedStr); RNGW.a = seedFromString(seedStr + "#world"); RNGA.a = seedFromString(seedStr + "#ambient"); }
  function seedFromString(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const clamp = (v) => Math.max(0, Math.min(100, v));
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const el = (id) => document.getElementById(id);
  const app = () => el("app");
  const reducedMotion = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  // v0.8.0 呈现层状态：上一屏数值快照（数值条旧值→新值）、画面类型（分级入场）、续玩定位标记、流水账跟随状态
  let prevStats = null, prevKind = null, curKind = null, resumeMark = false;
  let streamFollow = true, streamSeen = 0, streamTop = 0, streamProgUntil = 0;

  let S = null;
  function freshState(seedStr) {
    return {
      seedStr, age: START_AGE, era: "c2000", birthYear: 2000,
      stats: Object.fromEntries(STAT_META.map(([k, , init]) => [k, init])),
      route: null, unchosen: [], log: [], reflections: [],
      usedEvents: [], flags: {}, state: initialState(), crisisUsed: {}, microUsed: [], usedRare: [], cards: [],
      glimpsesSeen: 0, glimpsesSkipped: 0, lastDelta: "",
      healthCrisisSeen: false, death: null, pendingFork: null,
      // v0.17.0 地基字段：阶段机 phase/stage（origin/child/teen/youth/adult/late）、温度 temp（0–100）与节奏型 rhythm（只管质地，不做玩家可见数值）、
      // 童年记号 marks、fork38 立约 covenant、序章运行态 prologue、平年合并 flatCarry 与温度平淡年计数 flatYears
      phase: "adult", stage: "adult", temp: null, rhythm: null,
      marks: [], covenant: null, prologue: null, flatCarry: null, flatYears: 0,
      // v0.18.0 内核一期：结构化账本 ledger、父母进程 parents、dating 起点 datingSince 与推迟计数 datingDefers、旗标落点年龄 flagAges、子女落点 kidsAt
      ledger: [], parents: null, datingSince: null, datingDefers: 0, flagAges: {}, kidsAt: null,
      autoMode: DEFAULT_AUTO_MODE, speed: "mid", // 推进设定在本局的副本；权威来源是 localStorage 的 ify-prefs
    };
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...S, rngA: RNG.a, rngW: RNGW.a, rngAmb: RNGA.a })); } catch (e) { /* 存不了不阻塞游玩 */ } }
  // 存档判活（v0.17.0 改为按阶段判）：成年段存档有 route；序章段存档没有 route（路线 22 岁才定），凭 phase=prologue + prologue 运行态判活。
  // 旧版（v0.15/v0.16）存档恒有 route，走原判活路径；坏档仍按 null 处理。
  function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && (s.route || (s.phase === "prologue" && s.prologue)) ? s : null; } catch (e) { return null; } }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
  // ---------- 「活过的人生」记录：读/写 ify-lives-v1 ----------
  let livesCache = null;
  function loadLives() {
    if (livesCache) return livesCache;
    try { const v = JSON.parse(localStorage.getItem(LIVES_KEY)); if (v && v.endings && v.rares) { livesCache = v; return v; } } catch (e) { /* 损坏数据按空记录走 */ }
    livesCache = { v: 1, endings: {}, rares: {} };
    return livesCache;
  }
  function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
  // 结算时落盘本局活到的结局与稀有际遇；返回本局是否有「第一次」。落盘以当前数据为准：记录里的孤儿 id 不显示不计数、也不删（§B1）
  function recordLives(endingId, rareIds) {
    const rec = loadLives();
    const t = todayStr();
    let newEnding = false, newRare = false;
    if (endingId && !rec.endings[endingId]) { rec.endings[endingId] = t; newEnding = true; }
    for (const id of rareIds || []) if (!rec.rares[id]) { rec.rares[id] = t; newRare = true; }
    if (newEnding || newRare) { try { localStorage.setItem(LIVES_KEY, JSON.stringify(rec)); } catch (e) { /* 存不了不阻塞结算 */ } }
    return { newEnding, newRare };
  }

  // ---------- 留存记录（v0.15.0）：只记录，不奖励、不催促，断了不指责 ----------
  // ify-streak-v1：{ v:1, days:["YYYY-MM-DD", ...] } —— 有「完成一局」的日子（结算时落盘，升序去重，只留最近 400 天）。
  // ify-lastlife-v1：{ v:1, date, era, route, endAge, tags, verdictLine } —— 最近完成的一局，供开局屏回看。
  // 两键与进行中存档（ify-save-v2）、「活过的人生」（ify-lives-v1）互不相干；旧档没有这两键，按空记录走。
  const STREAK_KEY = "ify-streak-v1";
  const LASTLIFE_KEY = "ify-lastlife-v1";
  function loadStreak() {
    try { const v = JSON.parse(localStorage.getItem(STREAK_KEY)); if (v && Array.isArray(v.days)) return v; } catch (e) { /* 损坏数据按空记录走 */ }
    return { v: 1, days: [] };
  }
  function loadLastLife() {
    try { const v = JSON.parse(localStorage.getItem(LASTLIFE_KEY)); if (v && v.date && v.route) return v; } catch (e) { /* 同上 */ }
    return null;
  }
  function dateStrOf(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
  function shiftedDateStr(n) { const d = new Date(); d.setDate(d.getDate() + n); return dateStrOf(d); }
  // 结算时落盘：今天记进日子表，最近一局整条存下；同一天重复结算幂等。
  function recordDayAndLife() {
    const t = todayStr();
    const rec = loadStreak();
    if (!rec.days.includes(t)) {
      rec.days.push(t); rec.days.sort();
      if (rec.days.length > 400) rec.days = rec.days.slice(-400);
      try { localStorage.setItem(STREAK_KEY, JSON.stringify(rec)); } catch (e) { /* 存不了不阻塞结算 */ }
    }
    const v = verdict();
    const last = { v: 1, date: t, era: S.era, route: S.route.name, endAge: finalAge(), tags: lifeTags(), verdictLine: v.text.split("。")[0] + "。" };
    try { localStorage.setItem(LASTLIFE_KEY, JSON.stringify(last)); } catch (e) { /* 同上 */ }
  }
  // 开局屏的记录行：总天数 + 最近连续天数；连续只在 ≥2 天时提，断档时只报总数、只字不提断不断。
  function streakLine() {
    const days = loadStreak().days;
    if (!days.length) return "";
    let streak = 0;
    const d = new Date();
    if (!days.includes(dateStrOf(d))) d.setDate(d.getDate() - 1); // 今天还没玩，就从昨天往前数
    while (days.includes(dateStrOf(d))) { streak++; d.setDate(d.getDate() - 1); }
    return `活完过一生的日子，到今天一共 ${days.length} 天${streak >= 2 ? `，最近连着 ${streak} 天` : ""}。`;
  }
  // 开局屏的回看行：最近一局是昨天或今天才出现，就是一句事实回放。
  function lastLifeLine() {
    const last = loadLastLife();
    if (!last) return "";
    const when = last.date === todayStr() ? "今天" : last.date === shiftedDateStr(-1) ? "昨天" : null;
    if (!when) return "";
    const era = ERAS.find((e) => e.id === last.era);
    return `${when}那一生：${era ? era.label : ""}，${esc(last.route)}，活到 ${last.endAge} 岁。${esc(last.verdictLine)}`;
  }
  // 每日一局（v0.15.0）：种子就是日期本身（与旧「今日种子」按钮行为一致）；年代与路线由日期字符串哈希派生，
  // 人人同日同题。派生只读日期，不碰主 RNG，普通局的种子复现不受影响。
  function dailyFor(dateStr) {
    const h = seedFromString("ify-daily-" + dateStr);
    return { seed: dateStr, era: ERAS[h % ERAS.length], route: D.routes[Math.floor(h / ERAS.length) % D.routes.length] };
  }

  // ---------- 自动推进：偏好 (ify-prefs 为权威) + 单一全局计时器 ----------
  // 三态：off=全手动；plain=只有无抉择年份自动走；full=无抉择年份自动走，普通事件小选项也自动选。
  // 分岔、危机、稀有选项、影子瞥视在任何模式下都不设自动动作。step() 每次渲染前清旧计时，防串局。
  let prefs = loadPrefs();
  function loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY));
      if (p && AUTO_MODES.some(([k]) => k === p.mode) && SPEED_CPS[p.speed]) return { mode: p.mode, speed: p.speed, autoHintSeen: !!p.autoHintSeen };
    } catch (e) { /* 旧结构或损坏数据不报错，按新默认走 */ }
    return { mode: DEFAULT_AUTO_MODE, speed: "mid", autoHintSeen: false };
  }
  function savePrefs() {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* 存不了不阻塞 */ }
    if (S) { S.autoMode = prefs.mode; S.speed = prefs.speed; }
  }
  let autoTimer = null;  // 主 setTimeout 句柄（choice 模式下到点触发的是「预高亮」动作）
  let autoPhase2 = null; // §4.3 全程自动选的第二段：预高亮后 400ms 真正执行选择的句柄
  let autoRemain = 0;    // 剩余毫秒（暂停/恢复用；choice 模式为距预高亮的剩余）
  let autoStamp = 0;     // 本段计时起点
  let autoText = null;   // 当前画面若可自动推进，其正文；必停画面恒为 null
  let autoAction = null; // 当前画面可执行的自动动作（advance 或普通事件自动选）
  let autoKind = null;   // "advance" | "choice"
  let autoTotal = 0;     // 本屏总停留（细线用，choice 模式含最后 400ms 预高亮段）
  // §4.1 倒计时细线：纯计时账（总时长/已耗），不读布局，暂停冻结、恢复续走、切档由 scheduleAuto 干净重启
  let lineTotal = 0, lineElapsedBase = 0, lineSegT = 0;
  function linePaint(pct, transitionMs) {
    const l = el("autolinefill");
    if (!l) return;
    l.style.transition = transitionMs ? `width ${transitionMs}ms linear` : "none";
    l.style.width = pct + "%";
  }
  function lineStart(total) {
    lineReset();
    if (reducedMotion() || !total) return; // 减动效下不画细线，只留常亮圆点表示计时中（UX-MOTION §8.1 二选一取此）
    lineTotal = total; lineSegT = Date.now();
    linePaint(100, 0);
    const l = el("autolinefill"); if (l) void l.offsetWidth; // 强制回流，让随后的收尽过渡真正播放
    linePaint(0, total);
  }
  function lineFreeze() {
    if (!lineSegT || !lineTotal) return;
    lineElapsedBase += Date.now() - lineSegT; lineSegT = 0;
    linePaint(Math.max(0, Math.min(100, (lineTotal - lineElapsedBase) / lineTotal * 100)), 0);
  }
  function lineResume() {
    if (!lineTotal || reducedMotion()) return;
    const rem = lineTotal - lineElapsedBase;
    if (rem <= 0) { linePaint(0, 0); return; }
    linePaint(Math.max(0, Math.min(100, rem / lineTotal * 100)), 0); // 先无过渡地站到剩余位置（冻结态或未启动态）
    const l = el("autolinefill"); if (l) void l.offsetWidth;
    lineSegT = Date.now();
    linePaint(0, rem);
  }
  function lineReset() { lineTotal = 0; lineElapsedBase = 0; lineSegT = 0; linePaint(0, 0); }
  function autoEligible() {
    if (!autoText || !autoAction || prefs.mode === "off") return false;
    return autoKind === "advance" || (autoKind === "choice" && prefs.mode === "full");
  }
  function clearAuto() {
    if (autoTimer !== null) { clearTimeout(autoTimer); autoTimer = null; }
    if (autoPhase2 !== null) {
      clearTimeout(autoPhase2); autoPhase2 = null;
      // 预高亮被取消（切档/点正文夺回手动）时复位按钮，否则选项会被锁死在禁用态
      document.querySelectorAll(".choices .choice").forEach((o) => { o.disabled = false; o.classList.remove("picked", "faded"); });
    }
    autoRemain = 0; lineReset();
  }
  function clearAutoContext() { clearAuto(); autoText = null; autoAction = null; autoKind = null; }
  function autoDelay(text) {
    const cps = SPEED_CPS[prefs.speed] || SPEED_CPS.mid;
    return Math.min(AUTO_CAP_MS, Math.round(AUTO_BASE_MS + ((text ? text.length : 0) * 1000) / cps));
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
      autoTotal = autoDelay(autoText);
      // choice 模式：主计时在总停留的最后 400ms 之前到点，先预高亮，再由第二段执行选择（§4.3）
      const wait = autoKind === "choice" ? Math.max(200, autoTotal - 400) : autoTotal;
      autoRemain = wait;
      if (!document.hidden) { startAuto(wait); lineStart(autoTotal); }
      else { lineTotal = autoTotal; lineElapsedBase = 0; lineSegT = 0; } // 后台排程：只记账，回前台由 lineResume 从全长起线
    }
    refreshAutoRow();
  }
  function armAuto(text, action, kind) { // 无抉择画面传 advance；普通事件选项画面只在 full 模式传自动选动作
    autoText = text; autoAction = action || advance; autoKind = kind || "advance";
    scheduleAuto();
  }
  function pauseAuto() {
    if (autoTimer !== null) { clearTimeout(autoTimer); autoTimer = null; autoRemain = Math.max(0, autoRemain - (Date.now() - autoStamp)); lineFreeze(); }
    // 第二段（预高亮后的 400ms）已承诺执行，不在此冻结：窗口极短且 clearAuto 仍可由玩家点击取消
  }
  function resumeAuto() { // 回到前台且当前画面仍可自动推进、还有剩余时间，才接着走
    if (autoEligible() && autoRemain > 0 && autoTimer === null && autoPhase2 === null && S && S.route && !S.death && S.age < MAX_AGE && !document.hidden) { startAuto(autoRemain); lineResume(); }
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) pauseAuto(); else resumeAuto(); });
  window.addEventListener("blur", pauseAuto);
  window.addEventListener("focus", resumeAuto);
  function speedButtonLabel(k) { return `${SPEED_LABEL[k]} · ${SPEED_STYLE[k]}`; }
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
  // 暂停手势（§4.2）：全程模式点任意非控制区即回手动；平年模式点正文区（非控件）同样暂停本屏并切到关——两模式语义统一。
  // 被点的控件本身仍按原动作执行（例如点中某个选项，就按手动选它）。
  app().addEventListener("click", (ev) => {
    const t = ev.target;
    if (!t || !t.closest) return;
    if (!autoText || t.closest("#autorow")) return;
    const turnOff = () => {
      prefs.mode = "off";
      savePrefs();
      clearAuto();
      refreshAutoRow();
      if (S && S.route) save();
    };
    if (prefs.mode === "full") turnOff();
    else if (prefs.mode === "plain" && autoKind === "advance" && !t.closest("button, a, input, select, textarea, summary, label")) turnOff();
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
      if (SPEED_CPS[k] && k !== prefs.speed) {
        prefs.speed = k;
        savePrefs();
        scheduleAuto();
      }
      refreshAutoRow();
      if (S && S.route) save();
    }
  });

  // ---------- 节奏与温度（v0.17.0）：派生只走 src/rhythm.js 的 derive()，本文件不另算公式 ----------
  // 红线：温度只影响年份质地（平淡年出口），不进入 rollDeath / specialEnding / pickRare 的任何条件；界面不渲染温度数字。
  function rhythmOf(s) {
    if (!RHYTHM || !s || typeof s.temp !== "number") return { flatShare: 0, density: 1, volatility: 1 };
    return RHYTHM.derive(s.temp, s.rhythm);
  }
  function rhythmBase(kind, id) { // 轨道/路线基线（旧存档回填与开局赋值用）
    if (!RHYTHM) return null;
    const t = RHYTHM.profiles[kind];
    return (t && t[id]) || null;
  }
  function applyTempDelta(d) { // 分岔选项的 temp 增减：只改这一生的质地字段，不耗随机流、同种子确定
    if (!d || !S || typeof S.temp !== "number") return;
    S.temp = Math.max(0, Math.min(100, S.temp + d));
  }
  function applyEffects(ef) {
    if (!ef) { S.lastDelta = ""; return; }
    const parts = [];
    for (const [k, label] of STAT_META) if (ef[k]) { S.stats[k] = clamp(S.stats[k] + ef[k]); parts.push(`${label} ${ef[k] > 0 ? "+" : ""}${ef[k]}`); }
    S.lastDelta = parts.join(" · ");
  }
  function statsBar() {
    // §2.1：先按上屏快照的旧值出宽，渲染后一帧再写新值，让 .6s 过渡真正播放；§2.3：<30 的维度加临界静态分级
    return `<div class="stats">${STAT_META.map(([k, label]) => {
      const cur = S.stats[k], old = prevStats ? prevStats[k] : cur, crit = cur < 30;
      return `<div class="stat${crit ? " crit" : ""}"><span>${label}</span><div class="bar"><i style="width:${old}%" data-cur="${cur}"></i></div><b>${cur}</b>${crit ? '<i class="cdot"></i>' : ""}</div>`;
    }).join("")}</div>`;
  }
  function animateBars() {
    document.querySelectorAll("#app .bar i[data-cur]").forEach((bar) => {
      const cur = bar.getAttribute("data-cur");
      requestAnimationFrame(() => { bar.style.width = cur + "%"; });
    });
    if (S) prevStats = { ...S.stats };
  }
  // 渲染收尾：§1.1 分级入场（同类画面卡壳不动、只正文淡入）+ 数值条动画
  function finishRender() {
    const sec = app().querySelector("section.card");
    if (sec && curKind === prevKind && (curKind === "year" || curKind === "fork")) {
      sec.classList.add("still");
      let past = false;
      [...sec.children].forEach((kid) => {
        if (past) kid.classList.add("enter");
        if (kid.classList.contains("autorow") || kid.classList.contains("autoline") || kid.classList.contains("meta")) past = true;
      });
    }
    prevKind = curKind;
    animateBars();
  }
  function finalAge() { return S && S.death ? S.death.age : MAX_AGE; }
  function roadSvg() {
    const W = 640, pad = 14, end = finalAge();
    const X = (a) => pad + ((a - START_AGE) / (end - START_AGE)) * (W - pad * 2);
    let s = "";
    const forkFired = (f) => S.log.some((l) => l.startsWith(`${f.age} 岁 · `) && f.choices.some((c) => l.endsWith(`：${c.label}`)));
    (D.forks || []).filter((f) => f.age < end && !(f.state && S.age > f.age && !forkFired(f))).forEach((f) => { // v0.16.0：带门分岔没轮到这位玩家时不画（未到龄仍照常淡显）
      const on = S.age >= f.age, col = on ? "#2F4A3C" : "#C4BCA9";
      s += `<line x1="${X(f.age)}" y1="30" x2="${X(f.age) + 13}" y2="13" stroke="${col}" stroke-width="1.6" stroke-dasharray="3 3"/><circle cx="${X(f.age)}" cy="30" r="3" fill="${col}"/>`;
    });
    return `<svg class="road" viewBox="0 0 ${W} 52" width="100%" aria-hidden="true"><line x1="${pad}" y1="30" x2="${W - pad}" y2="30" stroke="#D8D2C2" stroke-width="2"/>${s}<line x1="${pad}" y1="30" x2="${X(S.age)}" y2="30" stroke="#2F4A3C" stroke-width="2.5"/><circle class="nowdot" cx="${X(S.age)}" cy="30" r="5" fill="#2F4A3C"/><text x="${pad}" y="49" font-size="10" fill="#8A8378">22 岁</text><text x="${W - pad}" y="49" font-size="10" fill="#8A8378" text-anchor="end">${end} 岁</text></svg>`;
  }
  function head(note, bare) {
    const yr = S.birthYear ? ` · 公元 ${S.birthYear + S.age} 年` : "";
    const mark = resumeMark ? " · （上次玩到这里）" : ""; // §6.2 续玩定位：只出现一次
    if (resumeMark) resumeMark = false;
    return `${roadSvg()}${statsBar()}<p class="meta">${S.age} 岁${yr} · ${esc(S.route.name)} · 种子 ${esc(S.seedStr)}${mark}${note ? " · " + note : ""}</p>${bare ? "" : `<div class="autorow" id="autorow">${autoRowHtml()}</div><div class="autoline"><i id="autolinefill"></i></div>`}`;
  }
  function streamHtml() {
    if (!S || !S.log.length) return "";
    const unread = !streamFollow && S.log.length > streamSeen;
    const rows = S.log.map((l, i) => {
      const m = l.match(/^(\d+) 岁 · ([\s\S]*)$/);
      const age = m ? +m[1] : S.age, txt = m ? m[2] : l;
      const yr = S.birthYear ? `${S.birthYear + age} · ` : "";
      const cls = i === S.log.length - 1 ? " last" : (!streamFollow && i >= streamSeen ? " new" : "");
      return `<div class="srow${cls}"><span class="sage">${yr}${age} 岁</span><span>${esc(txt)}</span></div>`;
    }).join("");
    return `<div class="streamwrap"><p class="streamtitle">这一生 · 流水账<button type="button" class="newhint" id="newhint"${unread ? "" : " hidden"}>有新的一年 ↓</button></p><div class="stream" id="stream">${rows}</div></div>`;
  }
  function mountStream() {
    const sec = app().querySelector("section.card");
    if (!sec || !S || (!S.route && S.phase !== "prologue") || S.death || S.age >= MAX_AGE) return; // v0.17.0：序章段无 route 也挂流水账（童年的平年行要看得见）
    const html = streamHtml();
    if (!html) return;
    if (window.matchMedia && window.matchMedia("(min-width: 1024px)").matches) {
      app().classList.add("playwrap");
      sec.insertAdjacentHTML("afterend", html);
    } else {
      app().classList.remove("playwrap");
      sec.insertAdjacentHTML("beforeend", html);
    }
    const st = el("stream");
    if (!st) return;
    // §5.1 跟随状态机：距底 <40px 为贴底跟随；上翻后切自由浏览，不再被新行拽回
    st.addEventListener("scroll", () => {
      streamTop = st.scrollTop;
      if (Date.now() < streamProgUntil) return; // 程序滚动进行中，不让它误判跟随状态
      const dist = st.scrollHeight - st.scrollTop - st.clientHeight;
      const was = streamFollow;
      streamFollow = dist < 40;
      if (streamFollow && !was) markStreamRead(st);
    });
    const nh = el("newhint");
    if (nh) nh.addEventListener("click", () => {
      streamFollow = true;
      markStreamRead(st);
      streamProgUntil = Date.now() + 450;
      st.scrollTo({ top: st.scrollHeight, behavior: reducedMotion() ? "auto" : "smooth" });
    });
    requestAnimationFrame(() => {
      if (streamFollow) {
        // §5.2 先回到上屏的滚动位置，再量剩余距离：贴底跟随平滑滚动；积压超过一屏则瞬时到位；减动效永远瞬时
        st.scrollTop = Math.min(streamTop, Math.max(0, st.scrollHeight - st.clientHeight));
        const dist = st.scrollHeight - st.clientHeight - st.scrollTop;
        streamProgUntil = Date.now() + 450;
        st.scrollTo({ top: st.scrollHeight, behavior: (reducedMotion() || dist > st.clientHeight) ? "auto" : "smooth" });
        streamSeen = S.log.length;
      } else {
        st.scrollTop = Math.min(streamTop, Math.max(0, st.scrollHeight - st.clientHeight));
      }
    });
  }
  function markStreamRead(st) {
    streamSeen = S.log.length;
    const nh = el("newhint"); if (nh) nh.hidden = true;
    if (st) st.querySelectorAll(".srow.new").forEach((r) => r.classList.remove("new"));
  }
  function deltaLine() { return S.lastDelta ? `<p class="delta">${esc(S.lastDelta)}</p>` : ""; }
  // §3.2 选择留一拍：被选按钮先置选中态停留 250ms、其余变淡，然后才执行后续（回响/复述拍）
  function choiceBeat(btn, fn) {
    clearAuto();
    const box = btn.closest(".choices");
    if (box) box.querySelectorAll(".choice").forEach((o) => {
      o.disabled = true;
      o.classList.toggle("picked", o === btn);
      o.classList.toggle("faded", o !== btn);
    });
    setTimeout(fn, 250);
  }

  // ---------- 开局 ----------
  function renderStart() {
    curKind = "start";
    prevStats = null;
    clearAutoContext();
    app().classList.remove("playwrap");
    clearSave0();
    const saved = loadSave();
    const sLine = streakLine(), lLine = lastLifeLine(), tomDaily = dailyFor(shiftedDateStr(1)); // 留存三行（v0.15.0）：记录/回看/明日预告，无数据则不出
    const seedParam = new URLSearchParams(location.search).get("seed");
    const eraParam = new URLSearchParams(location.search).get("era");
    const cardsParam = new URLSearchParams(location.search).get("cards"); // v0.13.2：同局链接可带三张已选牌 id
    // ---------- 出身牌（v0.13.0，docs/DESIGN-V013.md §A）：候选种子在开局页渲染时即生成并据此发牌（§A3.2）；
    // 发牌走 cards.js 的独立派生流，主 RNG 不动；屏幕上的手牌恒等于开局将用的手牌（种子输入即重发）。
    const CARDS_ON = !!CARDS;
    const candSeed = String(Math.floor(Math.random() * 1e6));
    const startEra = eraParam && ERAS.some((e) => e.id === eraParam) ? eraParam : "c2000";
    let dealt = CARDS_ON ? CARDS.deal(seedParam || candSeed, startEra) : null;
    const picked = { family: 0, temper: 0, era: 0 };
    // 同局链接带来的牌面：在已发的三选一里对齐选中下标；不在手牌中则忽略（防篡改/旧链）
    if (CARDS_ON && dealt && cardsParam) {
      const ids = cardsParam.split(",").map((s) => s.trim()).filter(Boolean);
      const cats = ["family", "temper", "era"];
      ids.forEach((id, i) => {
        const cat = cats[i]; if (!cat || !dealt[cat]) return;
        const idx = dealt[cat].indexOf(id); if (idx >= 0) picked[cat] = idx;
      });
    }
    const cardFx = (c) => { const parts = []; for (const [k, label] of STAT_META) if (c.effects && c.effects[k]) parts.push(`${label} ${c.effects[k] > 0 ? "+" : ""}${c.effects[k]}`); return parts.join(" · "); };
    const cardBtn = (id, i, cat) => { const c = CARDS.byId[id]; const fx = cardFx(c); return `<button type="button" class="cardpick${picked[cat] === i ? " sel" : ""}" data-cat="${cat}" data-i="${i}"><b>${esc(c.name)}</b><span>${esc(c.text)}</span>${fx ? `<small>${esc(fx)}</small>` : ""}</button>`; };
    const deckHtml = () => [["family", "家底"], ["temper", "性子"], ["era", "时代"]].map(([cat, lab]) => `<p class="setlab">${lab}</p><div class="cardrow" data-cat="${cat}">${dealt[cat].map((id, i) => cardBtn(id, i, cat)).join("")}</div>`).join("");
    // 旧同局链接可能带 end 参数：从本版起忽略，不报错。
    const savedLabel = saved ? (saved.route ? saved.route.name : (STAGE_LABEL[saved.stage] || "序章")) : "";
    app().innerHTML = `
      <section class="card">
        <h1 id="starttitle">22 岁，宿舍要退了。</h1>
        <div id="intro-old">
        <p>行李收好，站在宿舍门口。往后的路要自己选。一局大约十分钟。走哪一代人的路，下面能自己定。</p>
        <p>选一条路开始。其他的路也不会消失——它们会变成你的「另一条路」，在你 30、40、50 岁的时候，远远地看你一眼。</p>
        </div>
        <div id="intro-pro" hidden>
        <p>这一生从小时候讲起。先选年代——在哪儿长大、家里什么样，不是你挑的，是发到你手里的。童年、少年一路走过来，16 岁分一次道，22 岁再自己选往后的路。一局大约十分钟。</p>
        <p>没选的那些路也不会消失。它们会变成你的「另一条路」，在你 30、40、50 岁的时候，远远地看你一眼。</p>
        </div>
        ${CARDS_ON ? `<div class="carddeck" id="carddeck">${deckHtml()}</div>` : ""}
        <div class="choices" id="routechoices">${D.routes.map((r, i) => `<button class="choice" data-i="${i}"><b>${esc(r.name)}</b><small>${esc(r.desc)}</small></button>`).join("")}</div>
        <div id="prostart" hidden>
          <button class="primary" id="prologuego">从童年开始这一生</button>
          <p class="hint">先过完小时候。家里什么样、能不能顺顺当当上学，是发到手里的，换种子才是换一局——没有重抽。</p>
        </div>
        ${saved ? `<button class="ghost resume-link" id="resume">继续上次的人生（${saved.age} 岁 · ${esc(savedLabel)}）</button>` : ""}
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
        <div class="row"><button class="ghost" id="liveslink">活过的人生</button></div>
        <div class="seedrow">
          <input id="seedin" type="text" placeholder="种子码（不填就是随机）">
          <button class="ghost" id="seedgo">用这个种子</button>
          <button class="ghost" id="daily">今日一局</button>
        </div>
        <p class="hint" id="dailyline"></p>
        ${sLine ? `<p class="hint">${sLine}</p>` : ""}
        ${lLine ? `<p class="hint">${lLine}</p>` : ""}
        <p class="hint">明天一局：${tomDaily.era.label} · ${tomDaily.era.id === PROLOGUE_ERA ? "从小时候开始" : esc(tomDaily.route.name)}。</p>
        <p class="hint ver">v0.18.0</p>
        <p class="hint">不填随机。填了，运气定下来，跟朋友比同一局就用它。${seedParam ? `<br>你打开的链接带着种子「${esc(seedParam)}」${eraParam ? "，年代也按对方那局选好了" : ""}${cardsParam ? "，出身牌也按对方选过的对齐了" : ""}，点任意一条路就开始同一局。` : ""}</p>      </section>`;
    el("liveslink").addEventListener("click", () => { ANA.track("lives_view", {}); renderLives(); });
    if (saved) el("resume").addEventListener("click", () => {
      // v0.13.2：缺 seedStr 且无合法 rngA 的残档会在 seedFromString 处炸——按坏档清掉回开局，不抛错
      if (!saved.seedStr && typeof saved.rngA !== "number") { clearSave(); renderStart(); return; }
      S = saved;
      S.seedStr = S.seedStr || String(saved.rngA); // 仅有 rngA 的旧残档：用数字串兜底展示，RNG 仍走 rngA
      S.usedRare = S.usedRare || []; S.era = S.era || "c2000"; S.birthYear = S.birthYear || 2000;
      S.cards = S.cards || []; // v0.13.0：旧存档（无牌局）续玩不补发、不追溯改数值，出身行不出（§A3.3）
      S.healthCrisisSeen = !!S.healthCrisisSeen || !!(S.crisisUsed && S.crisisUsed.health);
      S.death = S.death || null;
      S.pendingFork = S.pendingFork || null;
      delete S.endAge;
      S.stats = S.stats || {};
      for (const [k, , init] of STAT_META) if (typeof S.stats[k] !== "number") S.stats[k] = init; // 新维度迁移：旧存档缺的维度按初值补齐（如 v0.9.0 新增的智慧），不清档不报错
      if (!S.state || typeof S.state !== "object") S.state = deriveStateFromLegacy(saved); // v0.12.0：旧存档无 state，由旧 flags 推导（docs/STATE-MATRIX.md §5）
      else for (const [dom, def] of Object.entries(REG.domains || {})) if (!(dom in S.state)) S.state[dom] = def.initial;
      // v0.17.0 回填：旧存档（v0.15/v0.16）没有阶段/温度/记号等字段——阶段按有无 route 定（老玩家恒成年段），温度按路线基线回填，序章态为空
      S.phase = S.phase || "adult"; S.stage = S.stage || "adult";
      S.marks = S.marks || []; if (!("covenant" in S)) S.covenant = null; if (!("prologue" in S)) S.prologue = null;
      if (!("flatCarry" in S)) S.flatCarry = null; S.flatYears = S.flatYears || 0;
      if (typeof S.temp !== "number") { const b = S.route ? rhythmBase("route", S.route.id) : null; S.temp = b ? b.temp : null; S.rhythm = b ? b.rhythm : null; }
      // v0.18.0 回填：旧存档无账本/父母进程/dating 起点——账本从空起（读账本处都有旧读法回落），父母进程在下一步 step 时按当前年龄惰性初始化，dating 中的按已处 3 年计
      S.ledger = Array.isArray(S.ledger) ? S.ledger : [];
      if (!("parents" in S)) S.parents = null;
      if (!("datingSince" in S)) S.datingSince = S.state && S.state.spouse === "dating" ? Math.max(START_AGE, S.age - 3) : null;
      S.datingDefers = S.datingDefers || 0; S.flagAges = S.flagAges || {}; if (!("kidsAt" in S)) S.kidsAt = null;
      S.autoMode = prefs.mode; S.speed = prefs.speed;
      RNG.a = typeof saved.rngA === "number" ? saved.rngA : seedFromString(saved.seedStr);
      RNGW.a = typeof saved.rngW === "number" ? saved.rngW : seedFromString(String(saved.rngA) + "#world-legacy"); // 旧存档无进程/环境流存档值：由旧随机态派生续玩（不承诺与旧口径同一局，见 DEVLOG）
      RNGA.a = typeof saved.rngAmb === "number" ? saved.rngAmb : seedFromString(String(saved.rngA) + "#ambient-legacy");
      prevStats = null; resumeMark = true; // §6.2 续玩第一屏给一句定位
      if (S.death) renderDeath(); else step();
    });
    const pickSeg = (id) => { const box = el(id); if (!box) return; box.querySelectorAll(".segbtn").forEach((b) => b.addEventListener("click", () => { box.querySelectorAll(".segbtn").forEach((o) => o.classList.remove("sel")); b.classList.add("sel"); })); };
    pickSeg("erapick");
    const preSel = (id, attr, val) => { const box = el(id); if (!box || !val) return; const btns = box.querySelectorAll(".segbtn"); btns.forEach((o) => { if (o.dataset[attr] === val) { btns.forEach((p) => p.classList.remove("sel")); o.classList.add("sel"); } }); };
    preSel("erapick", "era", eraParam);
    const autoSummary = () => prefs.mode === "off" ? "手动推进" : `自动推进 ${AUTO_MODES.find(([k]) => k === prefs.mode)[1]} · ${SPEED_LABEL[prefs.speed]}（${SPEED_STYLE[prefs.speed]}）`;
    const updSummary = () => { const eb = document.querySelector("#erapick .segbtn.sel"); const sv = (el("seedin").value || "").trim(); const birth = eb ? +eb.dataset.birth : 2000; const pro = PRO && selEra() === PROLOGUE_ERA; const cn = !pro && CARDS_ON && dealt ? ` · 出身 ${[dealt.family[picked.family], dealt.temper[picked.temper], dealt.era[picked.era]].map((id) => CARDS.byId[id].name).join("/")}` : ""; el("setsummary").textContent = `这一局：${eb ? eb.textContent.trim() : "2000 年生"} · ${pro ? "从小时候讲起" : `${birth + 22} 年 22 岁`} · ${sv ? `种子「${sv}」` : "随机种子"} · ${autoSummary()}${cn}`; };
    // 出身牌接线：点选改选（每行恒有一张预选=所发第一张，选路不拦截）；改年代只重发时代行；种子变更重发三行（所选位置重置为第一张）
    const effSeed = () => (el("seedin").value || "").trim() || seedParam || candSeed;
    const selEra = () => { const eb = document.querySelector("#erapick .segbtn.sel"); return eb ? eb.dataset.era : "c2000"; };
    const renderDeck = () => { const d = el("carddeck"); if (d) d.innerHTML = deckHtml(); };
    const redealAll = () => { if (!CARDS_ON) return; dealt = CARDS.deal(effSeed(), selEra()); picked.family = 0; picked.temper = 0; picked.era = 0; renderDeck(); };
    const redealEra = () => { if (!CARDS_ON) return; dealt.era = CARDS.deal(effSeed(), selEra()).era; picked.era = 0; renderDeck(); };
    if (CARDS_ON) {
      el("carddeck").addEventListener("click", (ev) => {
        const b = ev.target.closest(".cardpick"); if (!b) return;
        picked[b.dataset.cat] = Number(b.dataset.i);
        renderDeck(); updSummary();
      });
      document.querySelectorAll("#erapick .segbtn").forEach((b) => b.addEventListener("click", () => { redealEra(); updSummary(); }));
    }
    const syncAutoPick = () => {
      document.querySelectorAll("#autopick .segbtn").forEach((o) => o.classList.toggle("sel", o.dataset.mode === prefs.mode));
      document.querySelectorAll("#speedpick .segbtn").forEach((o) => o.classList.toggle("sel", o.dataset.speed === prefs.speed));
      const sp = el("speedpick"); if (sp) sp.classList.toggle("dim", prefs.mode === "off");
    };
    document.querySelectorAll("#autopick .segbtn").forEach((b) => b.addEventListener("click", () => { prefs.mode = b.dataset.mode; savePrefs(); syncAutoPick(); updSummary(); }));
    document.querySelectorAll("#speedpick .segbtn").forEach((b) => b.addEventListener("click", () => { prefs.speed = b.dataset.speed; savePrefs(); syncAutoPick(); updSummary(); }));
    syncAutoPick();
    // 年代分流（v0.17.0）：试点年代走序章开局——藏牌面与路线、亮序章入口；其余年代照旧。切换只改呈现，开局函数在点击时按年代走
    const eraToggle = () => {
      const pro = !!(PRO && selEra() === PROLOGUE_ERA);
      const t = el("starttitle"); if (t) t.textContent = pro ? "这一生，从小时候讲起。" : "22 岁，宿舍要退了。";
      const io = el("intro-old"); if (io) io.hidden = pro;
      const ip = el("intro-pro"); if (ip) ip.hidden = !pro;
      const dk = el("carddeck"); if (dk) dk.hidden = pro;
      const rc = el("routechoices"); if (rc) rc.hidden = pro;
      const ps = el("prostart"); if (ps) ps.hidden = !pro;
    };
    document.querySelectorAll("#erapick .segbtn").forEach((b) => b.addEventListener("click", eraToggle));
    eraToggle();
    document.querySelectorAll(".segbtn").forEach((b) => b.addEventListener("click", updSummary));
    el("seedin").addEventListener("input", () => { redealAll(); updSummary(); }); // 种子一变手牌即重发：屏幕上的手牌恒等于开局将用的手牌
    updSummary();
    el("daily").addEventListener("click", () => {
      const dd = dailyFor(todayStr());
      el("seedin").value = dd.seed;
      const eb = document.querySelector(`#erapick .segbtn[data-era="${dd.era.id}"]`);
      if (eb) eb.click(); // 年代走既有接线（重发时代牌 + 刷新小结）
      redealAll(); updSummary();
      if (PRO && dd.era.id === PROLOGUE_ERA) {
        el("dailyline").textContent = `今日一局：${dd.era.label}，从小时候开始。种子和年代都替你定好了，点「从童年开始这一生」就行。`;
      } else {
        document.querySelectorAll(".choice").forEach((o) => o.classList.toggle("dailymark", D.routes[Number(o.dataset.i)].id === dd.route.id));
        el("dailyline").textContent = `今日一局：${dd.era.label}，走「${dd.route.name}」那条路。种子和年代都替你定好了，点标出来的那条路就开始；选别的路也行，那就是普通的一局了。`;
      }
      el("daily").textContent = "今日一局已备好";
    });
    if (el("prologuego")) el("prologuego").addEventListener("click", () => {
      if (startLock) return;
      startLock = true;
      el("prologuego").disabled = true;
      const seedStr = (el("seedin").value || "").trim() || seedParam || candSeed;
      const eb = document.querySelector("#erapick .segbtn.sel");
      newGamePrologue(seedStr, eb ? eb.dataset.era : PROLOGUE_ERA, eb ? +eb.dataset.birth : 2000);
    });
    let startLock = false; // §6.1 防连点：双击不能在同一帧触发两次开局
    document.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
      if (startLock) return;
      startLock = true;
      document.querySelectorAll(".choice").forEach((o) => { o.disabled = true; });
      const chosen = D.routes[Number(b.dataset.i)];
      const seedStr = (el("seedin").value || "").trim() || seedParam || candSeed; // 随机开局用开局页渲染时已生成的候选种子（牌面据此而发，§A3.2）
      const eb = document.querySelector("#erapick .segbtn.sel");
      if (CARDS_ON && dealt) for (const cat of ["family", "temper", "era"]) ANA.track("card_pick", { cat, pick: picked[cat], changed: picked[cat] !== 0 });
      newGame(seedStr, chosen, { era: eb ? eb.dataset.era : "c2000", birth: eb ? +eb.dataset.birth : 2000, cards: CARDS_ON && dealt ? [dealt.family[picked.family], dealt.temper[picked.temper], dealt.era[picked.era]] : [] });
    }));
    el("seedgo").addEventListener("click", () => {
      const v = (el("seedin").value || "").trim();
      if (!v) { el("seedin").focus(); return; }
      el("seedin").scrollIntoView({ block: "center" });
      redealAll(); updSummary();
      // 种子已填好，提示玩家选路即可
      el("seedgo").textContent = "好，选一条路开始";
    });
    finishRender();
  }
  function clearSave0() { /* 开局页不清除存档，续玩入口要用 */ }

  function newGame(seedStr, route, opts) {
    S = freshState(seedStr);
    prevStats = null; resumeMark = false;
    streamFollow = true; streamSeen = 0; streamTop = 0;
    seedStreams(seedStr); // v0.18.0：三股流由主种子派生
    if (opts) { S.era = opts.era; S.birthYear = opts.birth; }
    S.autoMode = prefs.mode; S.speed = prefs.speed;
    S.route = route;
    { const base = rhythmBase("route", route.id); if (base) { S.temp = base.temp; S.rhythm = base.rhythm; } } // 温度基线（v0.17.0）：路线定基线，之后由分岔改温
    ANA.track("game_start", { era: S.era, route: route.id });
    S.unchosen = D.routes.filter((r) => r.id !== route.id).map((r) => ({ kind: "route", label: r.name, id: r.id }));
    // 出身层（v0.13.0，§A2.1）：叠加顺序 初值 → 牌面修正（数值+钩子旗同一拍） → 路线 stats；出身行记在出发之前
    S.cards = (opts && opts.cards) || [];
    if (CARDS && S.cards.length) {
      const ef = {};
      for (const id of S.cards) { const c = CARDS.byId[id]; if (!c) continue; for (const [k, v] of Object.entries(c.effects || {})) ef[k] = (ef[k] || 0) + v; if (c.set) S.flags[c.set] = true; }
      applyEffects(ef);
      const names = S.cards.map((id) => (CARDS.byId[id] || {}).name || "").filter(Boolean);
      if (names.length) S.log.push(`22 岁 · 出身：${names.join(" · ")}`);
    }
    applyEffects(route.stats); S.lastDelta = "";
    rec("route", route.id);
    S.log.push(`22 岁 · 出发：${route.name}`);
    save();
    step();
  }

  // ---------- 序章（v0.17.0，试点年代 c2000）：独立推进循环，汇入点在 22 岁 ----------
  const STAGE_LABEL = { origin: "来历", child: "童年", teen: "少年", youth: "少年", adult: "成年", late: "晚年" };
  function newGamePrologue(seedStr, eraId, birth) {
    S = freshState(seedStr);
    prevStats = null; resumeMark = false;
    streamFollow = true; streamSeen = 0; streamTop = 0;
    seedStreams(seedStr); // v0.18.0：三股流由主种子派生
    if (eraId) { S.era = eraId; S.birthYear = birth; }
    S.autoMode = prefs.mode; S.speed = prefs.speed;
    PRO.start(S, seedStr); // 处境发放与童年基线在此落定（序章独立流，主 RNG 一格不动）
    rec("prologue", "sit_" + (S.prologue ? S.prologue.situation : "school")); // 处境发放进账本（v0.18.0）
    save();
    step();
  }
  function prologueHead(age, stage) {
    const yr = S.birthYear ? ` · 公元 ${S.birthYear + age} 年` : "";
    return `<p class="meta">${age} 岁${yr} · ${STAGE_LABEL[stage] || ""} · 种子 ${esc(S.seedStr)}</p>`;
  }
  function renderPrologue() {
    curKind = "prologue";
    if (!PRO || !S.prologue) { S.phase = "adult"; step(); return; } // 序章模块缺失时不卡死（结构上不会发生）
    if (S.prologue.done) { renderRouteMerge(); return; }
    const view = PRO.present(S);
    if (!view) { renderRouteMerge(); return; }
    if (view.pendingState) { applyState({ setState: view.pendingState }); S.prologue.pendingState = null; } // 处境落定走状态边（pr_origin → schooling）
    save();
    app().innerHTML = `<section class="card">${prologueHead(view.age, view.stage)}
      ${view.title ? `<h2>${esc(view.title)}</h2>` : ""}
      ${view.text.split("\n").map((p) => `<p class="body">${esc(p)}</p>`).join("")}
      <div id="echo"></div>
      ${view.choices ? `<div class="choices">${view.choices.map((c, i) => `<button class="choice" data-i="${i}">${esc(c.label)}</button>`).join("")}</div>`
                     : `<button class="primary" id="cont">${view.id === "pr_y21" ? "到 22 岁" : "继续"}</button>`}
      </section>`;
    finishRender();
    if (!view.choices) {
      el("cont").addEventListener("click", () => {
        rec("prologue", view.id);
        const r = PRO.choose(S, -1);
        if (r.gapFx && Object.keys(r.gapFx).length) applyEffects(r.gapFx); else S.lastDelta = "";
        save();
        step();
      });
      armAuto(view.text);
      return;
    }
    document.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
      const i = Number(b.dataset.i);
      const c = view.choices[i];
      choiceBeat(b, () => {
        applyEffects(c.effects);
        if (c.set) S.flags[c.set] = true;
        applyState(c);
        rec("prologue", view.id, { choice: c.label, set: c.set || null });
        if (view.isFork) view.choices.forEach((o, j) => { if (j !== i) S.unchosen.push({ kind: "track", age: 16, label: o.label }); });
        const r = PRO.choose(S, i);
        if (r.gapFx && Object.keys(r.gapFx).length) applyEffects(r.gapFx);
        const box = document.querySelector(".choices");
        if (box) box.remove();
        el("echo").innerHTML = `${deltaLine()}<p class="pickednote">已选「${esc(c.label)}」</p>${c.echo ? `<p class="echo">${esc(c.echo)}</p>` : ""}<button class="primary" id="cont">继续</button>`;
        save(); el("cont").addEventListener("click", () => step());
      });
    }));
  }
  // 22 岁汇入：五路线在这里选；出身（家底+性子+时代）同一拍结算，叠加顺序与旧开局一致（初值 → 出身 → 路线）
  function renderRouteMerge() {
    curKind = "fork";
    const trackName = { study: "念书", work: "打工", craft: "学手艺", home: "守家里" }[S.state.track] || "";
    app().innerHTML = `<section class="card">${prologueHead(START_AGE, "adult")}
      <h2>22 岁 · 往后的路</h2>
      <p>${trackName ? `这几年，你是${trackName}过来的。` : ""}到了 22 岁，路一下子宽了。往哪边走，这一回你自己定。没选的那几条也不会消失——它们会在你 30、40、50 岁的时候，远远地看你一眼。</p>
      <div class="choices">${D.routes.map((r, i) => `<button class="choice" data-i="${i}"><b>${esc(r.name)}</b><small>${esc(r.desc)}</small></button>`).join("")}</div>
      </section>`;
    finishRender();
    document.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
      const route = D.routes[Number(b.dataset.i)];
      choiceBeat(b, () => mergeIntoRoute(route));
    }));
  }
  function mergeIntoRoute(route) {
    const P = S.prologue;
    S.phase = "adult"; S.stage = "adult"; S.age = START_AGE;
    S.route = route;
    S.unchosen = (S.unchosen || []).filter((u) => u.kind !== "route");
    for (const r of D.routes) if (r.id !== route.id) S.unchosen.push({ kind: "route", label: r.name, id: r.id });
    const cardIds = [P.family, P.temperPick, P.eraCard].filter(Boolean);
    S.cards = cardIds;
    if (CARDS && cardIds.length) {
      const ef = {};
      for (const id of cardIds) { const c = CARDS.byId[id]; if (!c) continue; for (const [k, v] of Object.entries(c.effects || {})) ef[k] = (ef[k] || 0) + v; if (c.set) S.flags[c.set] = true; }
      applyEffects(ef);
      const names = cardIds.map((id) => (CARDS.byId[id] || {}).name || "").filter(Boolean);
      if (names.length) S.log.push(`22 岁 · 出身：${names.join(" · ")}`);
      const temperIdx = P.temperPick ? P.temper.indexOf(P.temperPick) : -1;
      if (temperIdx >= 0) ANA.track("card_pick", { cat: "temper", pick: temperIdx, changed: temperIdx !== 0 }); // 序章里只有性子是真选择，埋点照口径只报这一类（家底是发放、时代是自动绑定）
    }
    ANA.track("game_start", { era: S.era, route: route.id });
    const base = rhythmBase("route", route.id); // 进成年段，温度基线换成路线基线（轨道基线已在 16 岁写入）；之后由分岔改温
    if (base) { S.temp = base.temp; S.rhythm = base.rhythm; }
    applyEffects(route.stats); S.lastDelta = "";
    rec("route", route.id);
    S.log.push(`22 岁 · 出发：${route.name}`);
    save();
    step();
  }

  // ---------- 主推进 ----------
  function step() {
    clearAutoContext(); // 每进一个新画面，先清掉上一个画面的自动上下文，防串局
    if (S.phase === "prologue") { renderPrologue(); return mountStream(); } // 序章段有自己的推进循环（v0.17.0）
    if (S.death) return renderDeath();
    if (S.age >= MAX_AGE) return renderEnd();
    save();
    if (S.pendingFork && S.pendingFork.age === S.age) { renderForkEcho(); return mountStream(); } // 分岔复述拍未走时，续玩/重入都回到复述拍
    // 进程拍（v0.18.0，内核一期）：父母进程到期与 dating 到期结算排在分岔/瞥视之前，呈现完仍回到本年（不独占年份）
    if (S.route) initParents();
    const pdue = parentsDue();
    if (pdue) { const pit = D.events.find((e) => e.id === pdue.item); if (pit) { renderProcItem(pit, pdue.who, pdue.beat); return mountStream(); } }
    if (datingDue()) { const dit = D.events.find((e) => e.id === "proc_dating"); if (dit) { renderProcItem(dit); return mountStream(); } }
    const fork = D.forks.find((f) => f.age === S.age && (!f.route || f.route === S.route.id) && (!f.forbidRoute || f.forbidRoute !== S.route.id) && (!f.forbid || !S.flags[f.forbid]) && (!f.anyParentAlive || S.state.dad === "alive" || S.state.mom === "alive") && (!f.state || met(f))); // v0.18.0 审计急修：分岔门接线补齐 route/forbidRoute/forbid/anyParentAlive（fork28 镜像、fork33 已购房不出、fork52 双亲已不在不出）；原 v0.16.0 口径只认 state 门 // v0.16.0：分岔可带状态门（如 fork45 只给 kids 未定且有伴侣的人）；无门分岔行为不变
    if (fork) { renderFork(fork); return mountStream(); }
    if (S.age in GLIMPSE_AGES) { renderGlimpse(GLIMPSE_AGES[S.age]); return mountStream(); }
    const rare = pickRare();
    if (rare) { renderRare(rare); return mountStream(); }
    const crisis = pickCrisis();
    if (crisis) { renderCrisis(crisis); return mountStream(); }
    renderEventYear();
    mountStream();
  }
  // ---------- 结算事实过滤（v0.17.0，F1/F2）：片段与结局声明的预设事实逐项核对本局事实，对不上不出 ----------
  function factOk(needs) {
    if (!needs) return true;
    if (needs.flag && !S.flags[needs.flag]) return false;
    if (needs.notFlag && S.flags[needs.notFlag]) return false;
    if (needs.anyFlag && !needs.anyFlag.some((f) => S.flags[f])) return false;
    if (needs.state) for (const [dom, vals] of Object.entries(needs.state)) if (!vals.includes(S.state[dom])) return false;
    if (needs.stateNot) for (const [dom, vals] of Object.entries(needs.stateNot)) if (vals.includes(S.state[dom])) return false;
    if (needs.eraIn && !needs.eraIn.includes(S.era)) return false;
    return true;
  }
  function evidenceCount(e) { // F4 证据点：evidence 组内任一备选命中算一点（备选 = 事件/稀有/旗标 id 或 {stat} 数值门）
    if (!e.evidence) return 99; // 未声明证据组的条目按满证据（现行 17 条结局已全部声明）
    let n = 0;
    for (const group of e.evidence) {
      const hit = group.some((alt) => {
        if (typeof alt === "string") return hasFact(alt); // v0.18.0：证据点改读账本并读（flags/usedEvents/usedRare/ledger 同一口径）
        if (alt && alt.stat) return alt.stat.gt !== undefined ? S.stats[alt.stat.k] > alt.stat.gt : S.stats[alt.stat.k] < alt.stat.lt;
        if (alt && alt.state) return Object.entries(alt.state).every(([dom, v]) => S.state[dom] === v);
        if (alt && alt.rec) return hasRec(alt.rec);
        return false;
      });
      if (hit) n++;
    }
    return n;
  }
  // --- 统一条件求值：路线/标记组合/数值形状/前置链 ---
  function met(e) {
    if (e.procOnly) return false; // 进程条目只由进程呈现，不进普通抽取池（v0.18.0）
    if (e.ctx && !ctxOk(e.ctx)) return false; // 职业语境门（v0.18.0）
    if (e.anyParentAlive && S.state.dad !== "alive" && S.state.mom !== "alive") return false;
    if (e.kidMin != null && (S.kidsAt == null || S.age - S.kidsAt < e.kidMin)) return false; // v0.18.0：孩子年龄门（按 kids 落定年龄推孩子岁数，挡「孩子 9 岁脱产备考」类错位） // 与父母进程对齐（fork52：父母都不在了不出此岔）
    if (e.route && e.route !== S.route.id) return false;
    if (e.routeIn && !e.routeIn.includes(S.route.id)) return false;
    if (e.forbidRoute && e.forbidRoute === S.route.id) return false;
    if (e.era && S.era !== e.era) return false;
    if (e.minYear && (S.birthYear || 1978) + S.age < e.minYear) return false; // 公历门（v0.11.0）：事件标注的最早公历年，出生年+年龄换算
    if (e.eraIn && !e.eraIn.includes(S.era || "c2000")) return false;
    if (e.require && !(Array.isArray(e.require) ? e.require : [e.require]).every((f) => S.flags[f])) return false;
    if (e.forbid && (Array.isArray(e.forbid) ? e.forbid : [e.forbid]).some((f) => S.flags[f])) return false;
    if (e.all && !e.all.every((f) => S.flags[f])) return false;
    if (e.any && !e.any.some((f) => S.flags[f])) return false;
    if (e.state && !Object.entries(e.state).every(([dom, v]) => (Array.isArray(v) ? v.includes(S.state[dom]) : S.state[dom] === v))) return false; // 状态门（v0.12.0）：值可为单值或候选数组
    if (e.stateAll && !Object.entries(e.stateAll).every(([dom, v]) => (Array.isArray(v) ? v.includes(S.state[dom]) : S.state[dom] === v))) return false; // 与 state 同语义；区别只在抽取权重（state 对应旧 require 的 ×3，stateAll 对应旧 all/forbid 的 ×1，迁移按来源保真，见 docs/STATE-MATRIX.md §6）
    if (e.stateNot && Object.entries(e.stateNot).some(([dom, v]) => (Array.isArray(v) ? v.includes(S.state[dom]) : S.state[dom] === v))) return false;
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
      if (rngA() < (r.chance !== undefined ? r.chance : 0.1)) return r;
    }
    return null;
  }
  function renderRare(r) {
    curKind = "rare";
    S.flatCarry = null; // 稀有年不是平年：挂起的平年只留在流水账里
    S.usedRare.push(r.id);
    rec("rare", r.id, { set: r.set || null });
    if (r.set) S.flags[r.set] = true; // 呈现即立旗（v0.11.0 起覆盖有选项事件：去世旗等必立旗靠它保证）
    applyState(r); // v0.12.0：状态流转与立旗同一时机
    if (!r.choices) { applyEffects(r.effects); } else S.lastDelta = "";
    S.log.push(`${S.age} 岁 · 【稀有】${r.text}`);
    app().innerHTML = `<section class="card rare">${head("这一年不太一样")}
      <p class="rare-tag">稀有事件</p><p class="body">${esc(r.text)}</p>${deltaLine()}
      ${r.choices ? `<div class="choices">${r.choices.map((c, i) => `<button class="choice" data-i="${i}">${esc(c.label)}</button>`).join("")}</div><div id="echo"></div>`
                  : `<button class="primary" id="cont">过一年</button>`}</section>`;
    finishRender();
    if (!r.choices) { save(); el("cont").addEventListener("click", advance); armAuto(r.text); return; }
    document.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
      const c = r.choices[Number(b.dataset.i)];
      choiceBeat(b, () => {
        applyEffects(c.effects);
        if (c.set) S.flags[c.set] = true;
        applyState(c);
        rec("rare", r.id, { choice: c.label, set: c.set || null, fx: S.lastDelta });
        document.querySelector(".choices").remove();
        el("echo").innerHTML = `${deltaLine()}<p class="pickednote">已选「${esc(c.label)}」</p><p class="echo">${esc(c.echo)}</p><button class="primary" id="cont">过一年</button>`;
        save(); el("cont").addEventListener("click", advance);
      });
    }));
  }
  function rollDeath() {
    const health = S.stats.health;
    let type = null;
    // v2：意外线独立先掷（30 岁前豁免）；健康线 λ(age,H) = a × g^(age−40) × hf(H)，40 岁前为 0
    if (S.age >= 30 && rngW() < MORTALITY.accident) type = "accident";
    else if (S.age >= 40) {
      const hf = Math.max(MORTALITY.hfLo, Math.min(MORTALITY.hfHi, (MORTALITY.hfNum - health) / MORTALITY.hfDen));
      if (rngW() < MORTALITY.healthA * Math.pow(MORTALITY.healthG, S.age - 40) * hf) type = "health";
    }
    if (!type) return false;
    const pool = DEATH_CAUSES[type];
    const text = pool[Math.floor(rngW() * pool.length)];
    S.death = { age: S.age, type, text };
    rec("death", type);
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
    curKind = "death";
    clearAutoContext();
    app().classList.remove("playwrap");
    app().innerHTML = `<section class="card death">${head(null, true)}
      <h2>这一生停在了 ${S.death.age} 岁</h2>
      <p class="body">${esc(S.death.text)}</p>
      <button class="primary" id="toend">看这一生的结算</button>
    </section>`;
    finishRender();
    el("toend").addEventListener("click", renderEnd);
  }

  // 分岔文案状态感知（v0.13.1，B2）：选项可带 labelBySpouse/echoBySpouse 变体——partnered 用原文字段，
  // dating 优先 dating 变体、其余状态（single/none/divorced/widowed）用 solo 变体，缺变体回落原文。
  function spouseText(c, kind) {
    const orig = kind === "label" ? c.label : (c.echo || "");
    const m = kind === "label" ? c.labelBySpouse : c.echoBySpouse;
    if (!m) return orig;
    const sp = S.state.spouse;
    if (sp === "partnered") return orig;
    if (sp === "dating" && m.dating) return m.dating;
    return m.solo || orig;
  }
  // fork38 立约（v0.17.0，§4.3 样例）：选择登记为持续状态（S.covenant + cov38_* 旗），后续由年度流事件读账、
  // 到期点在 45 岁分岔（wait 支）与结算行呈现。只记约与旗，kids 的 setState 路径与价格结构一概不动。
  function registerCovenant(c) {
    const kind = c.set === "cov38_has" ? "has" : c.set === "cov38_none" ? "none" : "wait";
    S.covenant = { kind, since: 38, due: kind === "wait" ? 45 : null };
    const line = kind === "has" ? "立约：孩子的事定了，要。往后的日子，按这个安排走。"
      : kind === "none" ? "立约：孩子的事定了，不要。往后的安排，照这个来。"
      : "立约：再等等。这份账先挂着，45 岁到期，再对一回。";
    S.log.push(`38 岁 · ${line}`);
  }
  function covenantSettleLine() {
    if (!S.covenant) return "";
    const kids = S.state ? S.state.kids : "undecided";
    if (kids === "has") return S.covenant.kind === "wait" ? "38 岁挂起的那份账，后来等来了孩子。" : "38 岁立的约，后来有了孩子，那几年围着孩子转，约算是走完了。";
    if (kids === "none") return S.covenant.kind === "wait" ? "38 岁挂起的那份账，后来定下来了：不要。两个人把日子照旧过。" : "38 岁立的约，后来就照着过了，安排没再改。";
    return "38 岁挂起的那份账，到这一生走完，也没正式对完。";
  }
  function renderFork(fork) {
    curKind = "fork";
    S.flatCarry = null; // 分岔年不是平年：挂起的平年只留在流水账里（22–38 合并纪律）
    const covPrefix = fork.age === 45 && S.covenant && S.covenant.kind === "wait" ? `<p>七年前在 38 岁挂起的那份账，今天到期。</p>` : ""; // 立约到期点呈现
    const careNow = S.parents ? ((S.parents.dad.stage === "care" && S.state.dad === "alive") || (S.parents.mom.stage === "care" && S.state.mom === "alive")) : !!S.flags.care_stage;
    const forkText = fork.age === 52 && careNow && fork.textCare ? fork.textCare : fork.text; // v0.18.0 审计急修：textCare 只认「正在照护且父母尚在」——旧 care_stage 旗在父母离世后仍留着，不能让 52 岁分岔对孤儿说「你已经在照护里了」 // fork52 与父母进程对齐（v0.18.0）：进程已到照护段时文本随动
    const GATE_KEYS = ["require", "forbid", "all", "any", "state", "stateAll", "stateNot", "era", "eraIn", "minYear", "route", "routeIn", "forbidRoute", "chain"];
    let vis = fork.choices.map((c, i) => [c, i]).filter(([c]) => !GATE_KEYS.some((k) => k in c) || met(c)); // 选项级门（v0.18.0）：带门的选项按本局事实显隐（如 fork52 排班选项只给有兄弟姐妹的人）
    if (!vis.length) vis = fork.choices.map((c, i) => [c, i]);
    app().innerHTML = `<section class="card">${head()}<h2>${esc(fork.title)}</h2>${covPrefix}<p>${esc(forkText)}</p>
      <div class="choices">${vis.map(([c, i]) => `<button class="choice" data-i="${i}">${esc(spouseText(c, "label"))}</button>`).join("")}</div></section>`;
    finishRender();
    document.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
      const c = fork.choices[Number(b.dataset.i)];
      choiceBeat(b, () => {
        applyEffects(c.effects);
        if (c.set) S.flags[c.set] = true;
        applyState(c);
        applyTempDelta(c.temp); // 温度接点（v0.17.0）：选项可带 temp 增减，只改质地字段
        if (fork.age === 38) registerCovenant(c);
        fork.choices.forEach((o) => { if (o !== c) S.unchosen.push({ kind: "fork", age: fork.age, label: spouseText(o, "label") }); });
        S.log.push(`${fork.age} 岁 · ${fork.title.split("·")[1].trim()}：${spouseText(c, "label")}`);
        rec("fork", fork.id || ("fork" + fork.age), { choice: spouseText(c, "label"), set: c.set || null, fx: S.lastDelta });
        S.pendingFork = { age: fork.age, label: spouseText(c, "label"), echo: spouseText(c, "echo") || null }; // §3.3 复述拍：先存下，续玩回到这一拍而不是重选
        save();
        renderForkEcho();
        mountStream();
      });
    }));
  }
  // §3.3 完整版（v0.10.0）：分岔选后不直接进下一年，先留一拍专属回响（文案在 events.js 各分岔选项的 echo 字段；旧存档无 echo 时回落最小版复述）。
  function renderForkEcho() {
    curKind = "fork";
    const pf = S.pendingFork;
    app().innerHTML = `<section class="card">${head()}${deltaLine()}<p class="echo">${esc(pf.echo || ("你选了「" + pf.label + "」"))}</p><button class="primary" id="cont">过一年</button></section>`;
    finishRender();
    el("cont").addEventListener("click", () => { S.pendingFork = null; save(); advance(); });
  }

  function pickCrisis() {
    for (const [k] of STAT_META) {
      const c = D.crisis[k];
      if (c && !S.crisisUsed[k] && S.stats[k] < c.threshold) return { key: k, ...c };
    }
    return null;
  }
  function renderCrisis(c) {
    curKind = "crisis";
    S.flatCarry = null; // 危机年不是平年：挂起的平年只留在流水账里
    if (c.key === "health") { S.healthCrisisSeen = true; save(); }
    app().innerHTML = `<section class="card crisis">${head("身体和日子，都得当回事")}<h2>${S.age} 岁 · ${esc(c.title)}</h2><p>${esc(c.text)}</p>
      <div class="choices">${c.choices.map((ch, i) => `<button class="choice" data-i="${i}">${esc(ch.label)}</button>`).join("")}</div><div id="echo"></div></section>`;
    finishRender();
    document.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
      const ch = c.choices[Number(b.dataset.i)];
      choiceBeat(b, () => {
        applyEffects(ch.effects); S.crisisUsed[c.key] = true;
        if (ch.set) S.flags[ch.set] = true; applyState(ch); // v0.12.0：与其它选项路径统一（现行危机数据未用 set/setState，防未来内容轮）
        S.log.push(`${S.age} 岁 · ${c.title}：${ch.label}`);
        rec("crisis", c.key, { choice: ch.label, set: ch.set || null, fx: S.lastDelta });
        document.querySelector(".choices").remove();
        el("echo").innerHTML = `${deltaLine()}<p class="pickednote">已选「${esc(ch.label)}」</p><p class="echo">${esc(ch.echo)}</p><button class="primary" id="cont">过一年</button>`;
        save(); el("cont").addEventListener("click", advance);
      });
    }));
  }

  function pickEvent() {
    const pool = D.events.filter((e) =>
      S.age >= e.min && S.age <= e.max && !S.usedEvents.includes(e.id) && met(e));
    if (!pool.length) return null;
    // 回响事件（require 命中）与本年代事件权重更高：早年的选择更容易被「想起来」，年代质感不能被大池稀释
    // chain 后继关窗保底（v0.14.0）：后继只剩最后两年窗口且当年可抽时，先以 1/2 概率在后继中等概率直抽——深链后继的合格局本就少，错过窗口整链就沉了（定参见 DEVLOG v0.14.0 条目⑤）
    const closing = pool.filter((e) => e.chain && S.age >= e.max - 1);
    if (closing.length && rngA() < 0.5) return closing[Math.floor(rngA() * closing.length)];
    const weighted = pool.flatMap((e) => { let n = 1; if (e.require || e.state) n = 3; if (e.era && e.era === S.era) n = Math.max(n, 3); if (e.w) n *= e.w; if (e.chain) n *= CHAIN_BOOST; return Array(n).fill(e); }); // e.w 数据权重倍数（v0.11.0：中段苦味事件 w:2）；v0.12.0 状态门事件与 require 同权重；v0.14.0 chain 后继再乘 CHAIN_BOOST
    return weighted[Math.floor(rngA() * weighted.length)];
  }
  function renderEventYear() {
    curKind = "year";
    // 温度平淡年出口（v0.17.0）：派生平淡年占比 >0 才掷这一骰——现有路线基线派生为 0，不掷、主随机流零平移，
    // 只有温度被分岔改低的年份才可能落到这里。平淡年不抽事件卡：流水账记一行带具体细节的平淡，数值至多 ±1；
    // 死亡判定仍在 advance() 里逐年走，温度不碰死亡率（红线）。
    const flatShare = rhythmOf(S).flatShare;
    if (RHYTHM && flatShare > 0 && rng() < flatShare) {
      const f = RHYTHM.flatAdult[Math.floor(rngA() * RHYTHM.flatAdult.length)];
      S.flatYears = (S.flatYears || 0) + 1;
      S.flatCarry = null;
      applyEffects(f.effects);
      S.log.push(`${S.age} 岁 · ${f.text}`);
      rec("flat", "flat_adult", { text: f.text });
      app().innerHTML = `<section class="card">${head()}<p class="body">${esc(f.text)}</p>${deltaLine()}<button class="primary" id="cont">过一年</button></section>`;
      finishRender();
      save(); el("cont").addEventListener("click", advance);
      armAuto(f.text);
      return;
    }
    const e = pickEvent();
    if (!e) {
      // 平年微文本：年份不再被静默跳过
      const fresh = D.micro.filter((_, i) => !S.microUsed.includes(i));
      const idx = fresh.length ? D.micro.indexOf(fresh[Math.floor(rngA() * fresh.length)]) : Math.floor(rngA() * D.micro.length);
      if (!S.microUsed.includes(idx)) S.microUsed.push(idx);
      const microText = D.micro[idx];
      S.log.push(`${S.age} 岁 · ${microText}`);
      rec("micro", "micro", { text: microText });
      // 22–38 相邻平年合并（v0.17.0）：前一年先挂起（只入流水账），下一年同为平年则两行同卡呈现，省一屏；
      // 合并只动呈现——抽取、随机流、死亡判定全不变（模拟口径与旧版一致），总时长不涨。
      if (S.flatCarry) {
        const carryText = S.flatCarry.text;
        S.flatCarry = null;
        app().innerHTML = `<section class="card">${head()}<p class="body">${esc(carryText)}</p><p class="body">${esc(microText)}</p><p class="hint">这两年都没什么大事，一并记在这里。</p><button class="primary" id="cont">过一年</button></section>`;
        finishRender();
        save(); el("cont").addEventListener("click", advance);
        armAuto(microText);
        return;
      }
      if (S.age >= START_AGE && S.age <= 37) {
        S.flatCarry = { age: S.age, text: microText };
        save();
        advance(); // 挂起本年直接进下一年：下一年是平年合并呈现，不是平年则本年只留在流水账里
        return;
      }
      app().innerHTML = `<section class="card">${head()}<p class="body">${esc(microText)}</p><button class="primary" id="cont">过一年</button></section>`;
      finishRender();
      save(); el("cont").addEventListener("click", advance);
      armAuto(microText);
      return;
    }
    S.flatCarry = null; // 事件年：挂起的平年只留在流水账里
    S.usedEvents.push(e.id);
    if (e.set) S.flags[e.set] = true; // 顶层 set 呈现即立（v0.9.2 补齐普通事件路径；v0.11.0 起覆盖有选项事件：去世旗等必立旗靠它保证）
    applyState(e); // v0.12.0：状态流转与立旗同一时机
    if (!e.choices) { applyEffects(e.effects); } else S.lastDelta = "";
    rec("event", e.id, { set: e.set || null, fx: !e.choices ? S.lastDelta : null });
    S.log.push(`${S.age} 岁 · ${e.text}`);
    app().innerHTML = `<section class="card">${head()}<p class="body">${esc(e.text)}</p>${deltaLine()}
      ${e.choices ? `<div class="choices">${e.choices.map((c, i) => `<button class="choice" data-i="${i}">${esc(c.label)}</button>`).join("")}</div><div id="echo"></div>`
                  : `<button class="primary" id="cont">过一年</button>`}</section>`;
    finishRender();
    if (!e.choices) { save(); el("cont").addEventListener("click", advance); armAuto(e.text); return; }
    const chooseEventChoice = (c, autoSelected) => {
      clearAuto();
      applyEffects(c.effects);
      if (c.set) S.flags[c.set] = true;
      applyState(c);
      rec("event", e.id, { choice: c.label, set: c.set || null, fx: S.lastDelta });
      if (autoSelected) S.log.push(`${S.age} 岁 · 自动选：${c.label}`);
      document.querySelector(".choices").remove();
      el("echo").innerHTML = `${deltaLine()}${autoSelected ? `<p class="autonote">自动推进 · 已选「${esc(c.label)}」</p>` : `<p class="pickednote">已选「${esc(c.label)}」</p>`}<p class="echo">${esc(c.echo)}</p><button class="primary" id="cont">过一年</button>`;
      save(); el("cont").addEventListener("click", advance);
      if (autoSelected) armAuto(c.echo || c.label, advance, "advance");
    };
    document.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
      choiceBeat(b, () => chooseEventChoice(e.choices[Number(b.dataset.i)], false));
    }));
    // §4.3 全程自动选分两段：主计时到点先预高亮被选按钮 400ms（玩家可点任意处夺回手动），再执行选择
    armAuto(e.text, () => {
      const idx = Math.floor(rng() * e.choices.length);
      const btns = document.querySelectorAll(".choices .choice");
      btns.forEach((o, j) => {
        o.disabled = true;
        o.classList.toggle("picked", j === idx);
        o.classList.toggle("faded", j !== idx);
      });
      autoPhase2 = setTimeout(() => { autoPhase2 = null; chooseEventChoice(e.choices[idx], true); }, 400);
    }, "choice");
  }

  // ---------- 影子瞥视：先给标题，点开才看全文；不看的计数从此是真的 ----------
  function shadowRoute() { const first = S.unchosen.find((u) => u.kind === "route"); return D.shadows[first.id]; }
  function shadowStageText(stage) {
    const variants = shadowRoute().stages[stage];
    return variants[Math.floor(rng() * variants.length)];
  }
  // 影子代价三选一（v0.10.0）：按种子+路线名哈希定值，同一局内结算页与分享卡取同一行；存量字符串原样返回。
  function shadowCostText(sh) {
    if (!sh) return "";
    const c = sh.cost;
    if (!Array.isArray(c)) return c || "";
    if (c.length === 1) return c[0];
    let h = 2166136261;
    const s = String((S && S.seed) || "") + ":" + sh.name;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return c[Math.abs(h) % c.length];
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
      ? `另一条路（${mainShadow.name}）也走完了它的一生。${mainFinal}${shadowCostText(mainShadow)}` : "";
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
    curKind = "glimpse";
    S.flatCarry = null; // 瞥视年不是平年：挂起的平年只留在流水账里
    const sh = shadowRoute();
    const text = shadowStageText(stage); // 先抽定，点不点开都是这一条（但只有点开才显示）
    app().innerHTML = `<section class="card glimpse">${head()}
      <h2>${S.age} 岁 · 另一条路上的你</h2>
      <p class="teaser">${esc(sh.name)}，今年：${esc(sh.teaser[stage])}</p>
      <p class="hint">细节只给你看一眼。看，还是不看，你自己定——不看的那几次，结算时会记着。</p>
      <div class="row"><button class="primary" id="look">看细节</button><button class="ghost" id="skip">不看，继续过日子</button></div>
      <div id="detail"></div></section>`;
    finishRender();
    el("skip").addEventListener("click", () => { S.glimpsesSkipped += 1; ANA.track("glimpse", { age: S.age, seen: false }); S.log.push(`${S.age} 岁 · 没有去看另一条路`); rec("glimpse", "skip"); advance(); });
    el("look").addEventListener("click", () => {
      S.glimpsesSeen += 1; ANA.track("glimpse", { age: S.age, seen: true });
      (S.shadowSeenTexts = S.shadowSeenTexts || []).push(text);
      rec("glimpse", "seen", { text });
      S.log.push(`${S.age} 岁 · 影子：${text}`);
      // 童年记号的影子回响（v0.17.0）：每局第一次看瞥视时附一句「两条路上共同的事实」——童年不进影子锚点，只留共同事实
      let markLine = "";
      if (PRO && S.prologue && !S.prologue.shadowMarkShown && (S.marks || []).length) {
        const mk = PRO.marks[S.marks[0].id];
        if (mk) { markLine = mk.shadow; S.prologue.shadowMarkShown = true; S.log.push(`${S.age} 岁 · ${mk.shadow}`); }
      }
      el("detail").innerHTML = `<p class="body">「${esc(text)}」</p>${markLine ? `<p class="body">${esc(markLine)}</p>` : ""}
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
    // 并列打破（v0.11.0）：同值维度用本局 rng 随机定序，不再按固定键序隐式优先
    const sorted = Object.entries(S.stats).map(([k, v]) => [k, v, rng()]).sort((a, b) => (b[1] - a[1]) || (a[2] - b[2]));
    const top = sorted[0][0], bottom = sorted[sorted.length - 1][0];
    // F1/F2（v0.17.0）：片段先按 needs 对本局事实过滤再抽；过滤后为空回落中性片段（无 needs 者），事实不许将就
    const pickF = (pool) => {
      if (!Array.isArray(pool)) return { text: pool, idx: 0 };
      let cands = pool.map((f, i) => [f, i]).filter(([f]) => factOk(typeof f === "string" ? null : f.needs));
      if (!cands.length) cands = pool.map((f, i) => [f, i]).filter(([f]) => typeof f === "string" || !f.needs);
      if (!cands.length) cands = pool.map((f, i) => [f, i]);
      const [f, i] = cands[Math.floor(rng() * cands.length)];
      return { text: typeof f === "string" ? f : f.t, idx: i };
    };
    const tF = pickF(D.verdictTop[top]), cF = pickF(D.verdictCost[bottom]);
    S._verdict = { text: tF.text + cF.text, top, bottom, topIdx: tF.idx, costIdx: cF.idx };
    return S._verdict;
  }
  // ---------- 事实标签行（v0.11.0） ----------
  // 只从本局事实取材，三段为限、纯描述：①路线与人生形状（迁徙旗标优先于路线默认）②一条最有分量的轨迹（按下方优先级取第一条有旗标/日志证据的，无证据不生成）③晚年与家庭收尾。
  // 无稀有度、无档位；不复述特殊结局名；纯函数（不耗 rng），同局在结算页与分享卡恒一致。
  function lifeTags() {
    const F = S.flags, used = S.usedEvents, out = [];
    const trail = residenceTrail(); // v0.18.0：形状段改读实际居所轨迹（账本里的路线起点与迁徙记录），不再只凭路线与旗标
    let shape = "";
    if (trail.final === "home" && trail.spans.city + trail.spans.abroad >= 5) shape = "最后回了老家";
    else if (F.back_home_stay) shape = "最后回了老家";
    else if (F.stayed_city) shape = "在异乡扎下根";
    else if (F.moved_city) shape = "换过城市生活";
    else if (F.near_family) shape = "守在家人近处";
    else if (F.often_back) shape = "一直没断了回老家的路";
    else shape = { corp: "去大城市闯过", home: "留在家乡过日子", abroad: "去远方生活过", study: "多读了几年书", gap: "停过一年再出发" }[S.route.id] || "";
    if (shape) out.push(shape);
    const traj = [
      [used.includes("p11_054"), "送走过一条狗"],
      [used.includes("p5_044") || used.includes("p13_055"), "送走过一只猫"],
      [!!F.care_self, "把工作放一放，回去陪过父母"],
      [!!F.laid_off, "下过岗，又重新站住"],
      [!!F.xiahai, "下过海"],
      [!!F.exam_landed, "考进过体制内"],
      [!!F.stock_2008, "在六千点那年跟过风"],
      [!!F.crypto_old, "早年倒腾过一阵币"],
      [!!F.stall_breakfast, "摆过早点摊"],
      [!!F.kid_abroad, "把孩子送到了国外"],
      [!!F.two_cities, "过过两地奔波的日子"],
      [!!F.long_dist, "和对方两地过"],
      [!!(F.side_business || F.side_start || F.side_job), "正职之外干过副业"]
    ];
    let t2 = "";
    for (const [ok, label] of traj) if (ok) { t2 = label; break; }
    if (!t2 && finalAge() >= 55) {
      const HOB = { hobby_calligraphy: "书法", hobby_photo: "摄影", hobby_fishing: "钓鱼", hobby_garden: "种菜", hobby_music: "音乐", hobby_run: "跑步", hobby_cook: "做饭", hobby_badminton: "羽毛球" };
      const hk = Object.keys(HOB).find((k) => F[k]);
      if (hk) t2 = HOB[hk] + "陪了大半辈子";
    }
    if (!t2 && S.state && S.state.dog !== "none") t2 = "养过一条狗"; // v0.12.0：旗标时代 dog_home 立后不清（在养/已离世都算养过），状态读法等价取 ≠none
    if (!t2 && F.bought_house) t2 = "供过一套房";
    if (t2) out.push(t2);
    const res = trail.final === "home" ? "家乡" : trail.final === "abroad" ? "异国" : "异乡"; // v0.18.0：「终老在异国」只在居所轨迹终点确为异国时才写
    let close = "";
    const ST = S.state || {}; // v0.12.0：收尾段改读状态矩阵（原旗标读法在离异/丧偶后因旗不清会误判，现按当前状态）
    if (ST.spouse === "widowed") close = "老伴先走，最后一段自己过";
    else if (ST.spouse === "divorced" && ST.kids === "has") close = "后来一个人把孩子带大";
    else if (ST.spouse === "divorced") close = "后来一个人过";
    else if (ST.spouse === "partnered" && F.kid_abroad) close = "和老伴相伴，儿女在远方";
    else if (ST.spouse === "partnered" && ST.kids === "has") close = "和老伴、儿女一起走完";
    else if (ST.spouse === "partnered") close = "和老伴走完这一生";
    else if (ST.kids === "has") close = "儿女陪着走完";
    else if (ST.spouse === "single") close = "一个人走完这一生";
    else close = S.death ? "最后住在" + res : "终老在" + res;
    out.push(close);
    return out.join(" · ");
  }
  const TIER_ORDER = { legendary: 0, epic: 1, rare: 2 };
  const TIER_LABEL = { legendary: "传说结局", epic: "史诗结局", rare: "稀有结局" };
  function specialEnding() {
    // F3/F4（v0.17.0）：met() 条件之外还须凑满 2 个独立证据点（evidence，见 src/synergy.js）；凑不满就不出——一局可以没有特殊结局
    const hits = (D.endings || []).filter((e) => met(e) && evidenceCount(e) >= 2);
    if (!hits.length) return null;
    hits.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
    return hits[0];
  }
  // ---------- 结算纵轴立轴图（VISUAL-DESIGN 第四节裁定 + UX-MOTION §9.2 生长仪式） ----------
  // 纵轴恒为 22→80 岁：走过的线居中成脊只画到实际终年，早夭的留白就是信息；未选支流按分岔序号左右交替。
  function settlementMapHtml() {
    const end = finalAge();
    const W = Math.min(460, Math.max(300, (window.innerWidth || 360) - 56));
    const cx = W / 2, pxY = 11, topPad = 34;
    const Y = (a) => topPad + (a - START_AGE) * pxY;
    const H = Y(MAX_AGE) + 30;
    const GROW_S = 1.05, GROW_DELAY = 0.36;
    // 标签按可用宽度截断：宽度单位（半角 0.55 / 全角 1）×字号 ≈ 实际像素，原型实测口径
    const units = (s) => [...s].reduce((a, ch) => a + (ch.charCodeAt(0) < 256 ? 0.55 : 1), 0);
    const fitW = (t) => {
      const maxU = (W / 2 - 18) / 11.5;
      if (units(t) <= maxU) return t;
      let s = t;
      while (s.length && units(s + "…") > maxU) s = s.slice(0, -1);
      return s + "…";
    };
    const chosenOf = (f) => {
      const line = S.log.find((l) => l.startsWith(`${f.age} 岁 · `) && f.choices.some((c) => l.endsWith(`：${c.label}`)));
      return line ? line.slice(line.lastIndexOf("：") + 1) : "";
    };
    const faced = (D.forks || []).filter((f) => (!S.death || f.age < S.death.age) && (!f.state || chosenOf(f))); // v0.16.0：带门分岔没触发过的，不进结算对照（无门分岔照旧）
    let g = `<line x1="${cx}" y1="${Y(START_AGE)}" x2="${cx}" y2="${Y(MAX_AGE)}" stroke="#DDD6C9" stroke-width="1.5"/>`;
    g += `<path class="mapspine" style="--gd:${GROW_DELAY}s" pathLength="100" d="M ${cx} ${Y(START_AGE)} L ${cx} ${Y(end)}" fill="none" stroke="#2F4A3C" stroke-width="3" stroke-linecap="round"/>`;
    const labels = [];
    let prevBd = -1;
    faced.forEach((f, fi) => {
      const side = fi % 2 === 0 ? -1 : 1; // 分岔序号定侧：左右交替，横向偏移不编码好坏
      const y0 = Y(f.age);
      let bd = GROW_DELAY + ((f.age - START_AGE) / Math.max(1, end - START_AGE)) * GROW_S;
      if (prevBd >= 0) bd = Math.max(bd, prevBd + 0.09); // 早年分岔密集：延迟加 90ms 最小间隔下限，保住「依次」感（原型验证对策）
      prevBd = bd;
      S.unchosen.filter((u) => u.kind === "fork" && u.age === f.age).forEach((u, j) => {
        const dx = side * (84 + j * 42), dy = (6 + j * 2.5) * pxY;
        g += `<path class="mapbranch" style="--bd:${bd.toFixed(2)}s" d="M ${cx} ${y0} Q ${cx + dx * 0.72} ${y0 + dy * 0.5} ${cx + dx} ${y0 + dy}" fill="none" stroke="#8A948C" stroke-width="2" stroke-dasharray="4 4" stroke-linecap="round"/><circle cx="${cx + dx}" cy="${y0 + dy}" r="2" fill="#8A948C" opacity=".45"/>`;
      });
      g += `<circle cx="${cx}" cy="${y0}" r="4" fill="#2F4A3C"/>`;
      const chosen = chosenOf(f);
      if (chosen) labels.push(`<text class="maplab" style="--bd2:${(bd + 0.1).toFixed(2)}s" x="${cx - side * 12}" y="${y0 + 4}" font-size="11.5" fill="#6E6A5E" text-anchor="${side === 1 ? "end" : "start"}">${esc(fitW(`${f.age} 岁 · ${chosen}`))}</text>`);
    });
    g += `<circle cx="${cx}" cy="${Y(START_AGE)}" r="4.5" fill="#2F4A3C"/>`;
    labels.push(`<text class="maplab" style="--bd2:.4s" x="${cx + 12}" y="${Y(START_AGE) + 4}" font-size="11.5" fill="#6E6A5E">22 岁 · ${esc(S.route.name)}</text>`);
    g += `<circle cx="${cx}" cy="${Y(end)}" r="4.5" fill="#2F4A3C"/>`;
    labels.push(`<text class="maplab" style="--bd2:${(GROW_DELAY + GROW_S + 0.1).toFixed(2)}s" x="${cx - 12}" y="${Y(end) + 4}" font-size="11.5" fill="#6E6A5E" text-anchor="end">${end} 岁</text>`);
    if (end < MAX_AGE) labels.push(`<text x="${cx + 12}" y="${Y(MAX_AGE) + 4}" font-size="11" fill="#A39C8B">80 岁</text>`);
    return `<div class="mapwrap" id="mapwrap"><svg viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-label="这一生的分岔图">${g}${labels.join("")}</svg></div>`;
  }
  // 「活过的人生」记录页（§B3）：已活到的给名与日期，未活到的只给一句线索；无完成度、无稀有度、无奖励（§B2.4 禁止项）
  function renderLives() {
    curKind = "lives";
    clearAutoContext();
    app().classList.remove("playwrap");
    const rec = loadLives();
    const lived = (list, key) => list.filter((x) => rec[key][x.id]).sort((a, b) => (rec[key][a.id] < rec[key][b.id] ? -1 : 1));
    const unlived = (list, key) => list.filter((x) => !rec[key][x.id]);
    const le = lived(D.endings, "endings"), ue = unlived(D.endings, "endings");
    const lr = lived(D.rare, "rares"), ur = unlived(D.rare, "rares");
    app().innerHTML = `<section class="card">
      <h2>你活过的人生</h2>
      <p>结局活过 ${le.length} 种，稀有际遇撞过 ${lr.length} 件。每一种，都只是众多人生里的一种。</p>
      <h3>结局</h3>
      ${le.map((e) => `<p class="liverow"><b>${esc(e.title)}</b><span>${esc(rec.endings[e.id])}</span></p>`).join("")}
      ${ue.map((e) => `<p class="clue">${esc(e.clue || "")}</p>`).join("")}
      <h3>稀有际遇</h3>
      ${lr.map((r) => `<p class="liverow"><b>${esc(r.label || r.name)}</b><span>${esc(rec.rares[r.id])}</span></p>`).join("")}
      ${ur.map((r) => `<p class="clue">${esc(r.clue || "")}</p>`).join("")}
      <p class="hint">这份记录只存在这台设备的浏览器里，清掉浏览器数据就没了。</p>
      <div class="row">
        <button class="ghost" id="backstart">回开局</button>
        <button class="ghost" id="clearlives">清空记录</button>
      </div>
    </section>`;
    el("backstart").addEventListener("click", renderStart);
    let armed = false;
    el("clearlives").addEventListener("click", () => {
      if (!armed) { armed = true; el("clearlives").textContent = "再点一次，真的清空"; return; }
      try { localStorage.removeItem(LIVES_KEY); } catch (e) {}
      livesCache = { v: 1, endings: {}, rares: {} };
      renderLives();
    });
  }

  // ---------- 结算九槽（v0.18.0，地基 §4.6/§4.7）：九个槽位全读状态与账本拼装 ----------
  // 落脚/陪伴/钱/手艺事业/子女线/父母线/没办完的事/影子代价/认领句；认领句（玩家在瞥视时留下的话）原样入槽；
  // 判词退为九槽之后的收尾一行。平淡轨（没撞上什么大事的一生）在认领槽有「平淡而完整」的写法。
  function settlementSlots() {
    const F = S.flags, ST = S.state || {};
    const trail = residenceTrail();
    const slots = [];
    let s1;
    if (trail.final === "home" && trail.spans.city + trail.spans.abroad >= 5) s1 = `在外头住了${trail.spans.city + trail.spans.abroad}年，最后还是回了老家落脚。`;
    else if (trail.final === "abroad") s1 = `最后落脚在异国，在那边住了${trail.spans.abroad}年。`;
    else if (trail.final === "city" && S.route && S.route.id === "home") s1 = `后来出了家乡，在外头落了脚，一住${trail.spans.city}年。`;
    else if (trail.final === "home") s1 = "最后落脚在老家这边，住的还是熟门熟路的地方。";
    else s1 = "最后落脚在住惯了的这座城，没再挪窝。";
    slots.push(["落脚", s1]);
    let s2;
    if (ST.spouse === "partnered") s2 = "另一半陪着走到了最后。吵过，也和好过，饭还是一起吃。";
    else if (ST.spouse === "widowed") s2 = "另一半先走了一步。最后一段路，是自己走完的。";
    else if (ST.spouse === "divorced") s2 = "中间那段婚姻散了。后来的几十年，各过各的。";
    else if (ST.spouse === "dating") s2 = "身边一直有个人，没领证，也没散，就这么处到了老。";
    else if (ST.spouse === "single") s2 = "这一生没和谁凑成一对。日子自己过，饭自己吃，也过来了。";
    else s2 = "没遇上要凑成一对的人。一个人，也把日子过完了。";
    slots.push(["陪伴", s2]);
    const m = S.stats.money;
    let s3;
    if (F.bought_house) s3 = m >= 60 ? "房子的尾款早结清了，手里还留着余钱，够花。" : "供下了一套房，尾款结清那年存折上没剩多少，日子紧巴巴地过。";
    else if (m >= 70) s3 = "没买房，手里的钱倒是攒下了，够用，还有富余。";
    else if (m >= 40) s3 = "钱不多不少，够日常开销。遇上大事帮不上，小日子能过。";
    else if (m >= 20) s3 = "手头一直紧。钱这事，操心了一辈子。";
    else s3 = "到最后也没攒下什么。好在饭还吃得上，觉还睡得着。";
    slots.push(["钱", s3]);
    const g = S.stats.growth;
    let s4;
    if (F.traj_ipo || F.traj_funded) s4 = "事业做到过上市那一步，锣声听过，名字也上过报。";
    else if (F.side_business || F.side_job || F.side_start) s4 = g >= 60 ? "正职之外还干出过一份副业，后来成了日子里的一块。" : "正职之外试过副业，成没成另说，手没闲着。";
    else if (g >= 75) s4 = "手里的活儿干到了顶。行里的人碰上难事，会来问你。";
    else if (g >= 50) s4 = "一辈子就干这一行。活儿拿得出手，饭吃得安稳。";
    else if (g >= 30) s4 = "活儿干得不算出色，胜在没出过大错。一天一天，也就过来了。";
    else s4 = "没在活儿上争过什么高低。日子过得平，活儿也干得平。";
    slots.push(["手艺事业", s4]);
    let s5;
    if (F.late_parent) s5 = "孩子来得晚。别人抱孙辈的年纪，你还在给孩子开家长会。";
    else if (ST.kids === "has") s5 = F.kid_abroad ? "孩子大了，去了远方。逢年过节，电话那头热闹。" : "孩子在跟前长大，老了也还在跟前。";
    else if (ST.kids === "none") s5 = S.covenant && S.covenant.kind === "none" ? "孩子的事，38 岁那年就定下了：不要。后来照着这个安排过。" : "这一生没要孩子。屋里清静，日子是另一种过法。";
    else s5 = "孩子的事一直没正式定下来。拖着拖着，就到了这岁数。";
    slots.push(["子女", s5]);
    const dadD = ST.dad === "dead", momD = ST.mom === "dead";
    let s6;
    if (dadD && momD) s6 = F.care_self ? "爸妈都送走了。需要人那几年，你回去陪过一阵。" : F.care_hired ? "爸妈都送走了。走之前请了人照护，你管钱，也管事。" : "爸妈都送走了。最后那一程，赶上了。";
    else if (dadD) s6 = "爸先走了，妈还在。逢年过节，先给妈打电话。";
    else if (momD) s6 = "妈先走了，爸还在。老两口剩一个，屋里空了一半。";
    else s6 = "到这一生走完，爸妈都还健在。这样的情形，不多。";
    slots.push(["父母", s6]);
    let s7;
    if (S.covenant && S.covenant.kind === "wait" && ST.kids === "undecided") s7 = "38 岁挂起的那份账，到最后也没正式对完。";
    else if (F.late_tried && !F.late_parent) s7 = "想要孩子那几年，试过，也跑过医院，最后没等来。这事放下了，就是偶尔还想起。";
    else if ((S.glimpsesSkipped || 0) >= 2) s7 = "另一条路有几回摆在眼前，你都没去细看。不知道的，就让它不知道下去。";
    else if (F.renting && !F.bought_house) s7 = "买房的事提过几回，最后没办成，租着住到了老。";
    else s7 = "没什么悬着的大事。该办的办了，办不了的，也放下了。";
    slots.push(["没办完的事", s7]);
    const mainU = (S.unchosen || []).find((u) => u.kind === "route");
    const sh = mainU && D.shadows ? D.shadows[mainU.id] : null;
    const cost = sh ? shadowCostText(sh).replace(/^代价也清楚：/, "") : "";
    slots.push(["另一条路", cost ? `没走的那条路，代价在那边：${cost}` : "没走的那几条路，各有各的走法，没法放在一起称。"]);
    const refl = S.reflections && S.reflections.length ? S.reflections[S.reflections.length - 1].text : "";
    const flatLife = !(S.usedRare || []).length && (Array.isArray(S.ledger) ? S.ledger.filter((e) => e.kind === "event").length : 99) < 30;
    slots.push(["你留的话", refl ? `「${refl}」` : flatLife ? "这一生没留下认领的话。平淡是平淡，可一年一年都是真的——平淡，也是完整的一生。" : "这一生没留下认领的话。就这么走完了。"]);
    return slots;
  }
  function renderEnd() {
    curKind = "end";
    clearAutoContext();
    app().classList.remove("playwrap");
    clearSave();
    const v = verdict();
    const sp = specialEnding();
    S.special = sp;
    ANA.track("game_complete", { era: S.era, route: S.route.id, endAge: finalAge(), death: !!S.death, ending: sp ? sp.id : "none", tier: sp ? sp.tier : "none" });
    const livesNew = recordLives(sp ? sp.id : null, S.usedRare || []); // 活过记录：落盘 + 本局新纪录（§B3）
    recordDayAndLife(); // 留存记录（v0.15.0）：日子表 + 最近一局回看，与活过记录同一落点、互不相干
    const shadowLines = shadowCompareLines();
    const covLine = covenantSettleLine(); // fork38 立约的结算对账行（v0.17.0）：没有立过约就不出
    // 自动推进提示（v0.17.0 定案）：默认关的玩家，完局后只在这页提示一次可开平年自动；提示过就落 prefs，不再重复
    const showAutoHint = prefs.mode === "off" && !prefs.autoHintSeen;
    if (showAutoHint) { prefs.autoHintSeen = true; savePrefs(); }
    const skippedLine = S.glimpsesSkipped ? `<p>你有 ${S.glimpsesSkipped} 次没有去细看另一条路。这样也好，有些事不知道，更睡得着。</p>` : "";
    const reflHtml = S.reflections.length
      ? `<h3>你留给自己的话</h3>` + S.reflections.map((r) => `<p class="refl">「${esc(r.text)}」（${r.age} 岁）</p>`).join("") : "";
    app().innerHTML = `<section class="card">${head(null, true)}
      <div class="rev" style="--d:0s">
      <h2>${finalAge()} 岁 · 这一局走完了</h2>
      ${S.death ? `<p>这一生停在了 ${S.death.age} 岁：${esc(S.death.text)}</p>` : ""}
      ${sp ? `<div class="special"><p class="rare-tag">${TIER_LABEL[sp.tier]}</p><p class="special-title">${esc(sp.title)}</p><p>${esc(sp.text)}</p></div>` : ""}
      </div>
      <div class="rev" style="--d:.12s">
      <p class="lifetags">${esc(lifeTags())}</p>
      ${settlementSlots().map(([k, t]) => `<p class="slotline"><span class="slotk">${esc(k)}</span>${esc(t)}</p>`).join("")}
      <p class="verdict">${esc(v.text)}</p>
      <p>你走了这条路：${esc(S.route.name)}。</p>
      ${covLine ? `<p>${esc(covLine)}</p>` : ""}
      </div>
      <div class="rev" style="--d:.24s">
      ${livesNew.newEnding ? `<p class="livesnew">这种人生，你第一次活到。</p>` : (livesNew.newRare ? `<p class="livesnew">这件稀罕事，你这回头一次撞上。</p>` : "")}
      ${shadowLines.main ? `<p>${esc(shadowLines.main)}</p>` : ""}
      ${shadowLines.others.length ? `<h3>其他几条路</h3>${shadowLines.others.map((line) => `<p>${esc(line)}</p>`).join("")}` : ""}
      ${skippedLine}
      ${reflHtml}
      </div>
      ${settlementMapHtml()}
      <div class="rev" style="--d:.55s">
      <h3>这一生，年表</h3>
      <div class="timeline">${S.log.map((l) => { const m = l.match(/^(\d+) 岁 · ([\s\S]*)$/); const yr = m && S.birthYear ? `${S.birthYear + (+m[1])} 年 · ` : ""; return `<p>${esc(yr + l)}</p>`; }).join("")}</div>
      </div>
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
          <button type="button" class="segbtn sel" data-type="verdict"><b>判词卡</b><small>判词 + 分岔路图 + 六维</small></button>
          <button type="button" class="segbtn" data-type="log"><b>流水账卡</b><small>公元年轴 + 关键节点 + 六维</small></button>
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
      ${showAutoHint ? `<p class="hint">这一局是手动过完的。开局页和游戏里都能把「自动推进」设成平年——没有抉择的年份会自己往前走，分岔和要紧事还是会停下来等你。</p>` : ""}
      <p class="hint">种子码：${esc(S.seedStr)}。朋友打开同局链接，就是和你完全相同的运气——他选得不一样，会走成什么样？</p>
    </section>`;
    finishRender();
    // §1.2/§9.2 揭示与生长都可跳过：点结算页任意处立即全显
    const endSec = app().querySelector("section.card");
    if (endSec) endSec.addEventListener("click", () => {
      endSec.classList.add("shown");
      const mw = el("mapwrap"); if (mw) mw.classList.add("shown");
    });
    el("again-same").addEventListener("click", () => location.assign(sameSeedUrl()));
    el("again-new").addEventListener("click", () => location.assign(location.pathname));
    el("copylink").addEventListener("click", async () => {
      ANA.track("share_click", { action: "copy_link" });
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
    el("share").addEventListener("click", () => { ANA.track("share_click", { action: "share" }); shareCurrent(); });
    el("saveimg").addEventListener("click", () => { ANA.track("share_click", { action: "save_image" }); downloadCurrent(); });
    el("copytext").addEventListener("click", async () => {
      ANA.track("share_click", { action: "copy_text" });
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
  // type: "verdict" 判词卡（模板 A：特殊结局标题+判词+分岔路图+六维）
  //       "log"     流水账卡（公元年轴+关键节点+判词节选+六维小条）
  // ratio: "45" 1080×1350 | "916" 1080×1920
  const SERIF = "Georgia, 'Songti SC', 'Noto Serif SC', serif";
  const SANS = "'Hiragino Sans', 'Noto Sans SC', sans-serif";
  let currentCanvas = null; // 分享台当前预览的 canvas，分享/保存都用它

  // 同局链接：种子 + 年代 + 出身牌所选（v0.13.2：改过牌面后朋友打开须同牌，否则「完全相同的运气」不成立）
  function sameSeedUrl() {
    let u = location.origin + location.pathname
      + "?seed=" + encodeURIComponent(S.seedStr)
      + "&era=" + encodeURIComponent(S.era || "c2000")
      + "&k=3"; // 内核版本位（v0.18.0）：k=3 为三股流新口径；无此位的旧链接按新口径打开同一种子，不保证同一局（策略见 DEVLOG v0.18.0 条目）
    if (S.cards && S.cards.length) u += "&cards=" + encodeURIComponent(S.cards.join(","));
    return u;
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
      x.fillStyle = "#8A948C"; x.font = "27px " + SANS; // 事实标签行（v0.11.0，与结算页同一行）
      y = wrapText(x, lifeTags(), 90, y + 4, 900, 40);
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
      y = wrapText(x, "另一条路（" + sh.name + "）：" + shadowCostText(sh), 90, y + 6, 900, big ? 50 : 46);
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
