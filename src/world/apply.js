// [模块]《如果那年》引擎分片：世界状态应用（注册表边表与 setState 执行点）。独立模块（包装器 + window.IFY 共享命名空间），加载顺序见 index.html。
(function (IFY) {
  "use strict";
  // --- 状态矩阵（v0.12.0，docs/STATE-MATRIX.md）：域内互斥/不可逆的人生状态收进 S.state，
  // 流转只能走注册表（src/registry.js）声明的边；普通叙事旗标仍留在 S.flags（里程碑）。
  const REG = window.GAME_REGISTRY || { domains: {} };

  const STATE_EDGES = {}; // dom -> Set("from>to")，仅含已启用（有载体）的边
  for (const [dom, def] of Object.entries(REG.domains || {})) STATE_EDGES[dom] = new Set((def.edges || []).filter((e) => (e.by || []).length).map((e) => e.from + ">" + e.to));

  // --- 出生拍清单（v0.20.1，W3）：正文叙事本身就是「孩子出生/到来」的那几拍。
  // kids 状态的流转点（fork38 / e_kid_settle / e_kid_final 选「要」）只是落定/决定，孩子真正
  // 出生要晚几个月到几年；阶段文本按真实岁数读时须以出生年为锚。下列条目首次呈现时把
  // 当年年龄记进 S.kidsBornAt（只记首次，之后不改）：
  //   p3_046「孩子出生那天，你在产房外坐了六个小时」——fork38 直达路径的出生叙事（39–43 岁窗）；
  //   lk_born「孩子出生那天，你在产房外站了很久」——晚育链（fork45 再试）终点稀有，呈现即出生，
  //     其 setState 与出生同拍，kidsAt 与 kidsBornAt 同年；
  //   e55_057「给孩子上户口，你带着出生证明……」——出生后数周内的手续拍，作为次级出生拍：
  //     若它先于 p3_046 呈现，按手续当年记出生年（与真实出生同年或相邻年，误差 ≤1 年）。
  // e_kid_settle / e_kid_final 选「要」的人没有专属出生叙事拍（余波走 lk_night 等既有条目），
  // kidsBornAt 保持 null，kidAge 口径回落 kidsAt（落定年龄），全文一致（见 scheduler.js）。
  // e65_056 是第二个孩子的出生叙事，不记 kidsBornAt（kidsBornAt 恒指第一个孩子）。
  const BORN_BEATS = new Set(["p3_046", "lk_born", "e55_057"]);

  function initialState() { const o = {}; for (const [dom, def] of Object.entries(REG.domains || {})) o[dom] = def.initial; return o; }

  function applyState(item) { // setState 的唯一执行点：未声明的边（含去世类反向边）结构性写不出
    if (!item || !IFY.S || !IFY.S.state) return;
    if (item.setState) {
      for (const [dom, to] of Object.entries(item.setState)) {
        const from = IFY.S.state[dom];
        if (from === undefined || from === to) continue;
        if (STATE_EDGES[dom] && STATE_EDGES[dom].has(from + ">" + to)) {
          IFY.S.state[dom] = to;
          IFY.rec("state", dom + ">" + to); // 账本（v0.18.0）：状态流转本身就是事实，结算与证据都可读（如 kids 流转本身计一个证据点）
          if (dom === "spouse") { if (to === "dating") IFY.S.datingSince = IFY.S.age; else if (from === "dating") IFY.S.datingSince = null; }
          if (dom === "kids" && to === "has" && !IFY.S.kidsAt) IFY.S.kidsAt = IFY.S.age;
          if (dom === "cat" && to === "home" && !IFY.S.catAt) IFY.S.catAt = IFY.S.age; // v0.20.1：抱回年龄（宠物阶段文本按 petMin/petMax 读真实岁数）
          if (dom === "dog" && to === "home" && !IFY.S.dogAt) IFY.S.dogAt = IFY.S.age; // v0.20.1：同上
          if (dom === "workPhase") { // 退休相位（v0.19.0）：part 的停留年数在此按进程流（#world）定下，workPhaseDue 到期后发 proc_retire_full；retiredAt 供未来钱进程标定养老金读取（接口见 docs/WORK-PHASE.md）
            if (to === "part") { IFY.S.partAt = IFY.S.age; IFY.S.partYears = 1 + Math.floor(IFY.rngW() * 3) + (from === "retired" ? 2 : 0) + (IFY.S.retirePlan && IFY.S.retirePlan.form === "informal" ? 2 : 0); }
            if (to === "retired") { IFY.S.retiredAt = IFY.S.age; IFY.S.partAt = null; }
          }
        }
      }
    }
    // 出生拍（v0.20.1）：出生叙事条目首次呈现时落 kidsBornAt。放在 setState 处理之后——
    // lk_born 的流转与出生同拍，须先完成 kids→has 再记；p3_046 / e55_057 本身无 setState，
    // 靠呈现调用走到这里（呈现层对每条呈现的事件/稀有都调 applyState，口径与实机一致）。
    if (item.id && BORN_BEATS.has(item.id) && IFY.S.state.kids === "has" && IFY.S.kidsBornAt == null) IFY.S.kidsBornAt = IFY.S.age;
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
  Object.assign(IFY, { REG, STATE_EDGES, initialState, applyState, deriveStateFromLegacy, BORN_BEATS });
})(window.IFY);
