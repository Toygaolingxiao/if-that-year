// [模块]《如果那年》引擎分片：伴侣进程（dating 到期、立约）。独立模块（包装器 + window.IFY 共享命名空间），加载顺序见 index.html。
(function (IFY) {
  "use strict";
  // 伴侣状态闭环（v0.18.0，审计急修 B6）：dating 超过 6 年必须走向定下来或分手，不许冻结几十年
  function datingDue() {
    return !!(IFY.S.state && IFY.S.state.spouse === "dating" && typeof IFY.S.datingSince === "number" && IFY.S.age - IFY.S.datingSince >= 7);
  }

  // 分岔文案状态感知（v0.13.1，B2）：选项可带 labelBySpouse/echoBySpouse 变体——partnered 用原文字段，
  // dating 优先 dating 变体、其余状态（single/none/divorced/widowed）用 solo 变体，缺变体回落原文。
  function spouseText(c, kind) {
    const orig = kind === "label" ? c.label : (c.echo || "");
    const m = kind === "label" ? c.labelBySpouse : c.echoBySpouse;
    if (!m) return orig;
    const sp = IFY.S.state.spouse;
    if (sp === "partnered") return orig;
    if (sp === "dating" && m.dating) return m.dating;
    return m.solo || orig;
  }

  // fork38 立约（v0.17.0，§4.3 样例）：选择登记为持续状态（S.covenant + cov38_* 旗），后续由年度流事件读账、
  // 到期点在 45 岁分岔（wait 支）与结算行呈现。只记约与旗，kids 的 setState 路径与价格结构一概不动。
  function registerCovenant(c) {
    const kind = c.set === "cov38_has" ? "has" : c.set === "cov38_none" ? "none" : "wait";
    IFY.S.covenant = { kind, since: 38, due: kind === "wait" ? 45 : null };
    const line = kind === "has" ? "立约：孩子的事定了，要。往后的日子，按这个安排走。"
      : kind === "none" ? "立约：孩子的事定了，不要。往后的安排，照这个来。"
      : "立约：再等等。这份账先挂着，45 岁到期，再对一回。";
    IFY.S.log.push(`38 岁 · ${line}`);
  }

  function covenantSettleLine() {
    if (!IFY.S.covenant) return "";
    const kids = IFY.S.state ? IFY.S.state.kids : "undecided";
    if (kids === "has") return IFY.S.covenant.kind === "wait" ? "38 岁挂起的那份账，后来等来了孩子。" : "38 岁立的约，后来有了孩子，那几年围着孩子转，约算是走完了。";
    if (kids === "none") return IFY.S.covenant.kind === "wait" ? "38 岁挂起的那份账，后来定下来了：不要。两个人把日子照旧过。" : "38 岁立的约，后来就照着过了，安排没再改。";
    return "38 岁挂起的那份账，到这一生走完，也没正式对完。";
  }
  Object.assign(IFY, { datingDue, spouseText, registerCovenant, covenantSettleLine });
})(window.IFY);
