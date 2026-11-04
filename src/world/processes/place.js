// [模块]《如果那年》引擎分片：居所/出国去向进程。独立模块（包装器 + window.IFY 共享命名空间），加载顺序见 index.html。
(function (IFY) {
  "use strict";
  // ---------- 出国去向（v0.19.0）：abroadKind 国家原型 ----------
  // 原型只是一组属性（离家距离/定居可能/语言墙/回国成本，表见内核稿 §3.4 与 registry 的 abroadKind 域），正文永远不写具体国名。
  // 入口拍 proc_abroad_kind（pack37）在 22–26 岁由进程呈现落值；窗口过了还没落值（含旧存档续玩）在这里按进程流（#world）推断补值，
  // 走的仍是注册表已声明的 unset→* 边（经 applyState），不会出现 abroadKind 为空、新包永不命中的局。
  const ABROAD_KIND_W = [["anglo", 0.34], ["eastasia", 0.61], ["europe", 0.83], ["dispatch", 1.01]]; // 推断权重（累计）：移民国 > 近邻 > 福利型 > 派遣

  function inferAbroadKind() {
    if (IFY.S.era === "c1955" || IFY.S.era === "c1965") return "dispatch"; // v0.23 WP6（S-6D）：这两代唯一的 abroadKind 形是 dispatch（定居形条目已被 eraIn 挡在两代之外）；提前 return 不消费 rngW，属设计内变化
    const r = IFY.rngW(); for (const [k, w] of ABROAD_KIND_W) if (r < w) return k; return "dispatch";
  }

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
  // v0.22.1 F4：通用化为 residenceTrailOf(state, fromAge, toAge)——对任意 Track 的账本在年龄窗内算轨迹：
  // 窗前的迁徙只定进窗时的所在地（承接），不计年数；窗后的迁徙不读（那一段不归本段）。residenceTrail()
  // 委托它跑全程窗口，与原实现逐项等价。另补一条无旗标的迁徙事实：p11_041 是 p11_040「回老家住一阵」
  // 的链式回城拍（require back_home_stay、正文断言回了城里），事件本身不立旗——轨迹据事件 id 认这次回城，
  // 否则回城后半生会被误读成终老老家（审计 run-06）。
  function residenceTrailOf(st, fromAge, toAge) {
    const spans = { home: 0, city: 0, abroad: 0 };
    let place = null, since = IFY.START_AGE;
    const endFull = st && st.death ? st.death.age : (st && typeof st.age === "number" ? st.age : IFY.MAX_AGE);
    const endA = Math.min(typeof toAge === "number" ? toAge : endFull, endFull);
    const fromA = typeof fromAge === "number" ? fromAge : IFY.START_AGE;
    const addSpan = (p, a, b) => { const lo = Math.max(a, fromA), hi = Math.min(b, endA); if (hi > lo) spans[p] += hi - lo; };
    const move = (age, p) => { if (place && p !== place) { addSpan(place, since, age); place = p; since = age; } else if (!place) { place = p; since = age; } };
    const led = st && Array.isArray(st.ledger) ? st.ledger : [];
    for (const e of led) {
      if (typeof e.age === "number" && e.age > endA) continue;
      if (e.kind === "route") move(e.age, e.id === "abroad" ? "abroad" : (e.id === "home" || e.id === "gap") ? "home" : "city");
      else if (e.set === "back_home_stay" || e.set === "near_family") move(e.age, "home");
      else if (e.set === "moved_city" || e.set === "stayed_city") move(e.age, "city");
      else if (e.kind === "event" && e.id === "p11_041") move(e.age, "city");
    }
    if (!place) place = !st || !st.route ? "home" : st.route.id === "abroad" ? "abroad" : (st.route.id === "home" || st.route.id === "gap") ? "home" : "city";
    addSpan(place, since, endA);
    return { final: place, spans };
  }
  function residenceTrail() {
    return residenceTrailOf(IFY.S, IFY.START_AGE, IFY.finalAge());
  }
  Object.assign(IFY, { ABROAD_KIND_W, inferAbroadKind, settleAbroadDefault, abroadKindDue, residenceTrail, residenceTrailOf });
})(window.IFY);
