// [模块]《如果那年》引擎分片：结构化人生账本。独立模块（包装器 + window.IFY 共享命名空间），加载顺序见 index.html。
(function (IFY) {
  "use strict";
  // ---------- 结构化人生账本（v0.18.0，内核一期）：文字流水是显示层，账本是事实层 ----------
  // 每条记录 { age, kind, id, choice?, set?, fx?, text? }；kind ∈ event/rare/fork/crisis/glimpse/flat/micro/proc/state/route/prologue/death。
  // 判词与特殊结局的证据、结算九槽、居所轨迹都读账本（与 flags/usedEvents 并读；旧存档无账本时各处回落旧读法）。
  function rec(kind, id, extra) {
    if (!IFY.S) return;
    if (!Array.isArray(IFY.S.ledger)) IFY.S.ledger = [];
    const e = { age: IFY.S.age, kind, id };
    if (extra) for (const [k, v] of Object.entries(extra)) if (v !== undefined && v !== null && v !== "") e[k] = v;
    IFY.S.ledger.push(e);
    if (extra && extra.set) { if (!IFY.S.flagAges) IFY.S.flagAges = {}; if (!(extra.set in IFY.S.flagAges)) IFY.S.flagAges[extra.set] = IFY.S.age; }
  }

  function hasRec(id) { return Array.isArray(IFY.S.ledger) && IFY.S.ledger.some((e) => e.id === id); }

  function hasFact(id) { return !!IFY.S.flags[id] || IFY.S.usedEvents.includes(id) || (IFY.S.usedRare || []).includes(id) || hasRec(id); }

  // 职业语境门（v0.18.0，审计急修 B5）：条目声明所需活计形态/关键经历（ctx），抽取层按本局实际状态与账本核对——
  // 没有从医经历不出村医，没有长途职业线不出「跑满一百万公里」。
  function ctxOk(ctx) {
    if (!ctx) return true;
    if (ctx.flag && !hasFact(ctx.flag)) return false;
    if (ctx.anyFlag && !ctx.anyFlag.some((f) => hasFact(f))) return false;
    if (ctx.state) for (const [dom, vals] of Object.entries(ctx.state)) if (!vals.includes(IFY.S.state[dom])) return false;
    // 活计形态门（v0.20.0 M2）：form 命中任一即过、notForm 命中任一即拦。形态是派生量
    // （规则表见 world/processes/work.js formOf），只随本局事实现算，不进存档状态域。
    if (ctx.form || ctx.notForm) {
      const f = typeof IFY.formOf === "function" ? IFY.formOf() : "employee";
      if (ctx.form && ![].concat(ctx.form).includes(f)) return false;
      if (ctx.notForm && [].concat(ctx.notForm).includes(f)) return false;
    }
    // 主线门（v0.20.0 M2 形态补修第二批）：mainLine 为入行旗 id 或其数组——条目可抽
    // 当且仅当本局主入行旗（work.js mainEntryOf，R1 最近入行）∈ mainLine。治「入行旗
    // 只进不出」：旧线条目（如焊工终身文本）自带 require 只认旗存在过、不认主线是否
    // 已换人；mainLine 按当前主线裁。无主入行旗（mainEntryOf 为 null）时一律不过。
    // 同为派生量，不进存档。
    if (ctx.mainLine) {
      const m = typeof IFY.mainEntryOf === "function" ? IFY.mainEntryOf() : null;
      if (!m || ![].concat(ctx.mainLine).includes(m)) return false;
    }
    return true;
  }
  Object.assign(IFY, { rec, hasRec, hasFact, ctxOk });
})(window.IFY);
