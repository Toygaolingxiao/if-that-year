// 《如果那年》引擎 v0.16.1 —— 版本号规则见 docs/DEVLOG.md 卷首// 要点：选择写标记→回响事件 / 年度小选择+当场回响 / 数值阈值危机 / 瞥视先给标题、点开才看全文（计数真实）
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
      if (STATE_EDGES[dom] && STATE_EDGES[dom].has(from + ">" + to)) S.state[dom] = to;
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
  const DEFAULT_AUTO_MODE = "full"; // 由无头模拟的停顿次数口径决定；模拟明细见 docs/MORTALITY-MODEL.md 与 DEVLOG v0.7.0

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
      autoMode: DEFAULT_AUTO_MODE, speed: "mid", // 推进设定在本局的副本；权威来源是 localStorage 的 ify-prefs
    };
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...S, rngA: RNG.a })); } catch (e) { /* 存不了不阻塞游玩 */ } }
  function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && s.route ? s : null; } catch (e) { return null; } }
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
      if (p && AUTO_MODES.some(([k]) => k === p.mode) && SPEED_CPS[p.speed]) return { mode: p.mode, speed: p.speed };
    } catch (e) { /* 旧结构或损坏数据不报错，按新默认走 */ }
    return { mode: DEFAULT_AUTO_MODE, speed: "mid" };
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
    if (!sec || !S || !S.route || S.death || S.age >= MAX_AGE) return;
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
    app().innerHTML = `
      <section class="card">
        <h1>22 岁，宿舍要退了。</h1>
        <p>行李收好，站在宿舍门口。往后的路要自己选。一局大约十分钟。走哪一代人的路，下面能自己定。</p>
        <p>选一条路开始。其他的路也不会消失——它们会变成你的「另一条路」，在你 30、40、50 岁的时候，远远地看你一眼。</p>
        ${CARDS_ON ? `<div class="carddeck" id="carddeck">${deckHtml()}</div>` : ""}
        <div class="choices">${D.routes.map((r, i) => `<button class="choice" data-i="${i}"><b>${esc(r.name)}</b><small>${esc(r.desc)}</small></button>`).join("")}</div>
        ${saved ? `<button class="ghost resume-link" id="resume">继续上次的人生（${saved.age} 岁 · ${esc(saved.route.name)}）</button>` : ""}
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
        <p class="hint">明天一局：${tomDaily.era.label} · ${esc(tomDaily.route.name)}。</p>
        <p class="hint ver">v0.16.1</p>
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
      S.autoMode = prefs.mode; S.speed = prefs.speed;
      RNG.a = typeof saved.rngA === "number" ? saved.rngA : seedFromString(saved.seedStr);
      prevStats = null; resumeMark = true; // §6.2 续玩第一屏给一句定位
      if (S.death) renderDeath(); else step();
    });
    const pickSeg = (id) => { const box = el(id); if (!box) return; box.querySelectorAll(".segbtn").forEach((b) => b.addEventListener("click", () => { box.querySelectorAll(".segbtn").forEach((o) => o.classList.remove("sel")); b.classList.add("sel"); })); };
    pickSeg("erapick");
    const preSel = (id, attr, val) => { const box = el(id); if (!box || !val) return; const btns = box.querySelectorAll(".segbtn"); btns.forEach((o) => { if (o.dataset[attr] === val) { btns.forEach((p) => p.classList.remove("sel")); o.classList.add("sel"); } }); };
    preSel("erapick", "era", eraParam);
    const autoSummary = () => prefs.mode === "off" ? "手动推进" : `自动推进 ${AUTO_MODES.find(([k]) => k === prefs.mode)[1]} · ${SPEED_LABEL[prefs.speed]}（${SPEED_STYLE[prefs.speed]}）`;
    const updSummary = () => { const eb = document.querySelector("#erapick .segbtn.sel"); const sv = (el("seedin").value || "").trim(); const birth = eb ? +eb.dataset.birth : 2000; const cn = CARDS_ON && dealt ? ` · 出身 ${[dealt.family[picked.family], dealt.temper[picked.temper], dealt.era[picked.era]].map((id) => CARDS.byId[id].name).join("/")}` : ""; el("setsummary").textContent = `这一局：${eb ? eb.textContent.trim() : "2000 年生"} · ${birth + 22} 年 22 岁 · ${sv ? `种子「${sv}」` : "随机种子"} · ${autoSummary()}${cn}`; };
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
    document.querySelectorAll(".segbtn").forEach((b) => b.addEventListener("click", updSummary));
    el("seedin").addEventListener("input", () => { redealAll(); updSummary(); }); // 种子一变手牌即重发：屏幕上的手牌恒等于开局将用的手牌
    updSummary();
    el("daily").addEventListener("click", () => {
      const dd = dailyFor(todayStr());
      el("seedin").value = dd.seed;
      const eb = document.querySelector(`#erapick .segbtn[data-era="${dd.era.id}"]`);
      if (eb) eb.click(); // 年代走既有接线（重发时代牌 + 刷新小结）
      redealAll(); updSummary();
      document.querySelectorAll(".choice").forEach((o) => o.classList.toggle("dailymark", D.routes[Number(o.dataset.i)].id === dd.route.id));
      el("dailyline").textContent = `今日一局：${dd.era.label}，走「${dd.route.name}」那条路。种子和年代都替你定好了，点标出来的那条路就开始；选别的路也行，那就是普通的一局了。`;
      el("daily").textContent = "今日一局已备好";
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
    RNG.a = seedFromString(seedStr);
    if (opts) { S.era = opts.era; S.birthYear = opts.birth; }
    S.autoMode = prefs.mode; S.speed = prefs.speed;
    S.route = route;
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
    S.log.push(`22 岁 · 出发：${route.name}`);
    save();
    step();
  }

  // ---------- 主推进 ----------
  function step() {
    clearAutoContext(); // 每进一个新画面，先清掉上一个画面的自动上下文，防串局
    if (S.death) return renderDeath();
    if (S.age >= MAX_AGE) return renderEnd();
    save();
    if (S.pendingFork && S.pendingFork.age === S.age) { renderForkEcho(); return mountStream(); } // 分岔复述拍未走时，续玩/重入都回到复述拍
    const fork = D.forks.find((f) => f.age === S.age && (!f.state || met(f))); // v0.16.0：分岔可带状态门（如 fork45 只给 kids 未定且有伴侣的人）；无门分岔行为不变
    if (fork) { renderFork(fork); return mountStream(); }
    if (S.age in GLIMPSE_AGES) { renderGlimpse(GLIMPSE_AGES[S.age]); return mountStream(); }
    const rare = pickRare();
    if (rare) { renderRare(rare); return mountStream(); }
    const crisis = pickCrisis();
    if (crisis) { renderCrisis(crisis); return mountStream(); }
    renderEventYear();
    mountStream();
  }
  // --- 统一条件求值：路线/标记组合/数值形状/前置链 ---
  function met(e) {
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
      if (rng() < (r.chance !== undefined ? r.chance : 0.1)) return r;
    }
    return null;
  }
  function renderRare(r) {
    curKind = "rare";
    S.usedRare.push(r.id);
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
    if (S.age >= 30 && rng() < MORTALITY.accident) type = "accident";
    else if (S.age >= 40) {
      const hf = Math.max(MORTALITY.hfLo, Math.min(MORTALITY.hfHi, (MORTALITY.hfNum - health) / MORTALITY.hfDen));
      if (rng() < MORTALITY.healthA * Math.pow(MORTALITY.healthG, S.age - 40) * hf) type = "health";
    }
    if (!type) return false;
    const pool = DEATH_CAUSES[type];
    const text = pool[Math.floor(rng() * pool.length)];
    S.death = { age: S.age, type, text };
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
  function renderFork(fork) {
    curKind = "fork";
    app().innerHTML = `<section class="card">${head()}<h2>${esc(fork.title)}</h2><p>${esc(fork.text)}</p>
      <div class="choices">${fork.choices.map((c, i) => `<button class="choice" data-i="${i}">${esc(spouseText(c, "label"))}</button>`).join("")}</div></section>`;
    finishRender();
    document.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
      const c = fork.choices[Number(b.dataset.i)];
      choiceBeat(b, () => {
        applyEffects(c.effects);
        if (c.set) S.flags[c.set] = true;
        applyState(c);
        fork.choices.forEach((o) => { if (o !== c) S.unchosen.push({ kind: "fork", age: fork.age, label: spouseText(o, "label") }); });
        S.log.push(`${fork.age} 岁 · ${fork.title.split("·")[1].trim()}：${spouseText(c, "label")}`);
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
    if (closing.length && rng() < 0.5) return closing[Math.floor(rng() * closing.length)];
    const weighted = pool.flatMap((e) => { let n = 1; if (e.require || e.state) n = 3; if (e.era && e.era === S.era) n = Math.max(n, 3); if (e.w) n *= e.w; if (e.chain) n *= CHAIN_BOOST; return Array(n).fill(e); }); // e.w 数据权重倍数（v0.11.0：中段苦味事件 w:2）；v0.12.0 状态门事件与 require 同权重；v0.14.0 chain 后继再乘 CHAIN_BOOST
    return weighted[Math.floor(rng() * weighted.length)];
  }
  function renderEventYear() {
    curKind = "year";
    const e = pickEvent();
    if (!e) {
      // 平年微文本：年份不再被静默跳过
      const fresh = D.micro.filter((_, i) => !S.microUsed.includes(i));
      const idx = fresh.length ? D.micro.indexOf(fresh[Math.floor(rng() * fresh.length)]) : Math.floor(rng() * D.micro.length);
      if (!S.microUsed.includes(idx)) S.microUsed.push(idx);
      S.log.push(`${S.age} 岁 · ${D.micro[idx]}`);
      app().innerHTML = `<section class="card">${head()}<p class="body">${esc(D.micro[idx])}</p><button class="primary" id="cont">过一年</button></section>`;
      finishRender();
      save(); el("cont").addEventListener("click", advance);
      armAuto(D.micro[idx]);
      return;
    }
    S.usedEvents.push(e.id);
    if (e.set) S.flags[e.set] = true; // 顶层 set 呈现即立（v0.9.2 补齐普通事件路径；v0.11.0 起覆盖有选项事件：去世旗等必立旗靠它保证）
    applyState(e); // v0.12.0：状态流转与立旗同一时机
    if (!e.choices) { applyEffects(e.effects); } else S.lastDelta = "";
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
    const sh = shadowRoute();
    const text = shadowStageText(stage); // 先抽定，点不点开都是这一条（但只有点开才显示）
    app().innerHTML = `<section class="card glimpse">${head()}
      <h2>${S.age} 岁 · 另一条路上的你</h2>
      <p class="teaser">${esc(sh.name)}，今年：${esc(sh.teaser[stage])}</p>
      <p class="hint">细节只给你看一眼。看，还是不看，你自己定——不看的那几次，结算时会记着。</p>
      <div class="row"><button class="primary" id="look">看细节</button><button class="ghost" id="skip">不看，继续过日子</button></div>
      <div id="detail"></div></section>`;
    finishRender();
    el("skip").addEventListener("click", () => { S.glimpsesSkipped += 1; ANA.track("glimpse", { age: S.age, seen: false }); S.log.push(`${S.age} 岁 · 没有去看另一条路`); advance(); });
    el("look").addEventListener("click", () => {
      S.glimpsesSeen += 1; ANA.track("glimpse", { age: S.age, seen: true });
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
    if (S._verdict) return S._verdict;
    // 并列打破（v0.11.0）：同值维度用本局 rng 随机定序，不再按固定键序隐式优先
    const sorted = Object.entries(S.stats).map(([k, v]) => [k, v, rng()]).sort((a, b) => (b[1] - a[1]) || (a[2] - b[2]));
    const top = sorted[0][0], bottom = sorted[sorted.length - 1][0];
    const pickF = (v) => (Array.isArray(v) ? v[Math.floor(rng() * v.length)] : v);
    S._verdict = { text: pickF(D.verdictTop[top]) + pickF(D.verdictCost[bottom]), top, bottom };
    return S._verdict;
  }
  // ---------- 事实标签行（v0.11.0） ----------
  // 只从本局事实取材，三段为限、纯描述：①路线与人生形状（迁徙旗标优先于路线默认）②一条最有分量的轨迹（按下方优先级取第一条有旗标/日志证据的，无证据不生成）③晚年与家庭收尾。
  // 无稀有度、无档位；不复述特殊结局名；纯函数（不耗 rng），同局在结算页与分享卡恒一致。
  function lifeTags() {
    const F = S.flags, used = S.usedEvents, out = [];
    let shape = "";
    if (F.back_home_stay) shape = "最后回了老家";
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
    const res = (F.back_home_stay || S.route.id === "home" || F.near_family) ? "家乡" : (S.route.id === "abroad" ? "异国" : (F.stayed_city || F.moved_city || S.route.id === "corp" ? "异乡" : "住了大半辈子的地方"));
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
    const hits = (D.endings || []).filter((e) => met(e));
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
      <p class="verdict">${esc(v.text)}</p>
      <p>你走了这条路：${esc(S.route.name)}。</p>
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
      + "&era=" + encodeURIComponent(S.era || "c2000");
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
