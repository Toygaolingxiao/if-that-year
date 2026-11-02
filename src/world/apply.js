// [模块]《如果那年》引擎分片：世界状态应用（注册表边表与 setState 执行点）。独立模块（包装器 + window.IFY 共享命名空间），加载顺序见 index.html。
(function (IFY) {
  "use strict";
  // --- 状态矩阵（v0.12.0，docs/STATE-MATRIX.md）：域内互斥/不可逆的人生状态收进 S.state，
  // 流转只能走注册表（src/registry.js）声明的边；普通叙事旗标仍留在 S.flags（里程碑）。
  const REG = window.GAME_REGISTRY || { domains: {} };

  const STATE_EDGES = {}; // dom -> Set("from>to")，仅含已启用（有载体）的边
  for (const [dom, def] of Object.entries(REG.domains || {})) STATE_EDGES[dom] = new Set((def.edges || []).filter((e) => (e.by || []).length).map((e) => e.from + ">" + e.to));

  function initialState() { const o = {}; for (const [dom, def] of Object.entries(REG.domains || {})) o[dom] = def.initial; return o; }

  function applyState(item) { // setState 的唯一执行点：未声明的边（含去世类反向边）结构性写不出
    if (!item || !item.setState || !IFY.S || !IFY.S.state) return;
    for (const [dom, to] of Object.entries(item.setState)) {
      const from = IFY.S.state[dom];
      if (from === undefined || from === to) continue;
      if (STATE_EDGES[dom] && STATE_EDGES[dom].has(from + ">" + to)) {
        IFY.S.state[dom] = to;
        IFY.rec("state", dom + ">" + to); // 账本（v0.18.0）：状态流转本身就是事实，结算与证据都可读（如 kids 流转本身计一个证据点）
        if (dom === "spouse") { if (to === "dating") IFY.S.datingSince = IFY.S.age; else if (from === "dating") IFY.S.datingSince = null; }
        if (dom === "kids" && to === "has" && !IFY.S.kidsAt) IFY.S.kidsAt = IFY.S.age;
        if (dom === "workPhase") { // 退休相位（v0.19.0）：part 的停留年数在此按进程流（#world）定下，workPhaseDue 到期后发 proc_retire_full；retiredAt 供未来钱进程标定养老金读取（接口见 docs/WORK-PHASE.md）
          if (to === "part") { IFY.S.partAt = IFY.S.age; IFY.S.partYears = 1 + Math.floor(IFY.rngW() * 3) + (from === "retired" ? 2 : 0) + (IFY.S.retirePlan && IFY.S.retirePlan.form === "informal" ? 2 : 0); }
          if (to === "retired") { IFY.S.retiredAt = IFY.S.age; IFY.S.partAt = null; }
        }
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
  Object.assign(IFY, { REG, STATE_EDGES, initialState, applyState, deriveStateFromLegacy });
})(window.IFY);
