// [模块]《如果那年》引擎分片：居所/出国去向进程。独立模块（包装器 + window.IFY 共享命名空间），加载顺序见 index.html。
(function (IFY) {
  "use strict";
  // ---------- 出国去向（v0.19.0）：abroadKind 国家原型 ----------
  // 原型只是一组属性（离家距离/定居可能/语言墙/回国成本，表见内核稿 §3.4 与 registry 的 abroadKind 域），正文永远不写具体国名。
  // 入口拍 proc_abroad_kind（pack37）在 22–26 岁由进程呈现落值；窗口过了还没落值（含旧存档续玩）在这里按进程流（#world）推断补值，
  // 走的仍是注册表已声明的 unset→* 边（经 applyState），不会出现 abroadKind 为空、新包永不命中的局。
  const ABROAD_KIND_W = [["anglo", 0.34], ["eastasia", 0.61], ["europe", 0.83], ["dispatch", 1.01]]; // 推断权重（累计）：移民国 > 近邻 > 福利型 > 派遣

  function inferAbroadKind() { const r = IFY.rngW(); for (const [k, w] of ABROAD_KIND_W) if (r < w) return k; return "dispatch"; }

  function settleAbroadDefault() {
    if (!IFY.S.route || IFY.S.route.id !== "abroad" || !IFY.S.state || IFY.S.state.abroadKind !== "unset" || IFY.S.age < 27) return;
    IFY.applyState({ setState: { abroadKind: inferAbroadKind() } });
    IFY.rec("proc", "abroad_kind_default", { set: IFY.S.state.abroadKind });
  }

  function abroadKindDue() {
    if (!IFY.S.route || IFY.S.route.id !== "abroad" || !IFY.S.state || IFY.S.state.abroadKind !== "unset") return null;
    if (IFY.S.age < 22 || IFY.S.age > 26) return null;
    return IFY.D.events.some((e) => e.id === "proc_abroad_kind") ? { item: "proc_abroad_kind" } : null;
  }

  // 居所轨迹（v0.18.0，审计急修 B7）：读账本里的路线起点与迁徙记录，数出各居所住过的年数与终点；
  // 结算标签与「终老在异国」类句子据此写。旧存档无账本时轨迹为空，按路线回落（起点即终点）。
  function residenceTrail() {
    const spans = { home: 0, city: 0, abroad: 0 };
    let place = null, since = IFY.START_AGE;
    const endA = IFY.finalAge();
    const move = (age, p) => { if (place && p !== place) { spans[place] += Math.max(0, age - since); place = p; since = age; } else if (!place) { place = p; since = age; } };
    const led = Array.isArray(IFY.S.ledger) ? IFY.S.ledger : [];
    for (const e of led) {
      if (e.kind === "route") move(e.age, e.id === "abroad" ? "abroad" : (e.id === "home" || e.id === "gap") ? "home" : "city");
      else if (e.set === "back_home_stay" || e.set === "near_family") move(e.age, "home");
      else if (e.set === "moved_city" || e.set === "stayed_city") move(e.age, "city");
    }
    if (!place) place = !IFY.S.route ? "home" : IFY.S.route.id === "abroad" ? "abroad" : (IFY.S.route.id === "home" || IFY.S.route.id === "gap") ? "home" : "city";
    spans[place] += Math.max(0, endA - since);
    return { final: place, spans };
  }
  Object.assign(IFY, { ABROAD_KIND_W, inferAbroadKind, settleAbroadDefault, abroadKindDue, residenceTrail });
})(window.IFY);
