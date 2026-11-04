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

  // 立约对账段版（v0.22.1 F3，交换局）：按段读账，口径与 settlement.playerFacts 同源。
  // 每段的约只认两种：约的 since 落在该段内（玩家在那一段亲自立的），或长在末段 Track 上
  // （换入的身体带着的约，是接手后要过的日子的一部分，与 playerFacts.covenant() 同规）。
  // 两段各有约且方向相反（has 对 none）时出事实句，绝不许再断言「安排没再改」；
  // 单段情形与下方原读法同构，只是数据来源换成跨段见证：孩子收尾读 domainEnd、
  // 45 岁实选读合并账本、治疗链与对账旗按 flagWitnessed 见证口径。
  function covenantSettleLineSeg(view) {
    const segs = view.segments, lastIdx = segs.length - 1;
    const covOf = (si) => {
      const c = segs[si].state.covenant;
      if (!c) return null;
      if (si === lastIdx) return c;
      return (typeof c.since === "number" && c.since >= segs[si].fromAge && c.since <= segs[si].toAge) ? c : null;
    };
    const covs = segs.map((_, si) => covOf(si));
    const present = covs.map((c, si) => (c ? si : -1)).filter((si) => si >= 0);
    if (!present.length) return "";
    const kids = view.domainEnd("kids");
    const sp = IFY.S.state ? IFY.S.state.spouse : "none";
    const f45 = view.mergedLedger.find((e) => e.kind === "fork" && e.id === "fork45");
    const tried45 = !!(view.flagWitnessed("late_try") || (f45 && f45.set === "late_try"));
    const treated = !!(view.flagWitnessed("late_tried") || view.hasFact("lk_check") || view.hasFact("lk_wait"));
    const together = sp === "partnered" || sp === "dating";
    const aloneTail = sp === "divorced" ? "后来你们散了，剩下的日子各过各的。"
      : sp === "widowed" ? "后来对方先走了一步，剩下的日子是你一个人过的。"
      : "剩下的日子，是你一个人过的。";
    const kidInSeg = (si) => view.segmentLedgers[si].some((e) => e.kind === "state" && e.id === "kids>has");
    if (present.length >= 2) {
      const first = present[0], lastP = present[present.length - 1];
      const k0 = covs[first].kind, k1 = covs[lastP].kind;
      if ((k0 === "has" && k1 === "none") || (k0 === "none" && k1 === "has")) {
        const hasSeg = k0 === "has" ? first : lastP;
        let line = k0 === "has"
          ? "38 岁立的约，前一段定的是要；换了路，后一段带着的约是不要。换了一条路，约也跟着变了。"
          : "38 岁立的约，前一段定的是不要；换了路，后一段成了要。换了一条路，约也跟着变了。";
        if (kidInSeg(hasSeg)) line += "孩子在定「要」的那一段来了。";
        else if (view.stateWitnessed("kids", "has")) line += "这一生里，孩子后来还是来了。";
        return line;
      }
      if (k0 !== k1) { // 含 wait 的异向组合：只陈述两段定得不一样，不编细节
        let line = "38 岁立的约，前后两段定得不一样。换了一条路，约也跟着变了。";
        if (kids === "has") line += "这一生里，孩子后来还是来了。";
        return line;
      }
    }
    const cov = covs[present[present.length - 1]];
    if (kids === "has") {
      if (cov.kind !== "wait") return "38 岁立的约，后来有了孩子，那几年围着孩子转，约算是走完了。";
      return tried45 ? "38 岁挂起的那份账，45 岁说再试一回。后来，孩子等来了。" : "38 岁挂起的那份账，后来等来了孩子。";
    }
    if (kids === "none") {
      if (tried45) {
        const head = treated
          ? "38 岁挂起的那份账，45 岁说再试一回。检查、吃药、等结果，前前后后折腾了几年，最后没等来。"
          : "38 岁挂起的那份账，45 岁说再试一回。话定下来了，可医院没正经跑起来，日子推着人往前走，最后也没等来。";
        return head + (together ? "日子还是两个人一起过。" : aloneTail);
      }
      if (cov.kind === "wait") {
        return together ? "38 岁挂起的那份账，后来定下来了：不要。两个人把日子照旧过。"
          : "38 岁挂起的那份账，后来定下来了：不要。" + aloneTail;
      }
      return "38 岁立的约，后来就照着过了，安排没再改。";
    }
    if (kids === "undecided" && view.flagWitnessed("cov_solo_done")) return "38 岁挂起的那份账，45 岁你一个人对过一回。孩子的事后来没落定，可那份约，到期那年算是对上了。";
    if (kids === "undecided" && tried45) return treated
      ? "38 岁挂起的那份账，45 岁说再试一回。后来医院跑了几趟，孩子的事还是没落定，这份账对到最后，也没对出个结果。"
      : "38 岁挂起的那份账，45 岁说再试一回。可医院没正经跑起来，日子推着人往前走，孩子的事就一直没落定。";
    return "38 岁挂起的那份账，到这一生走完，也没正式对完。";
  }

  // 对账行按账本事实分版（v0.20.1 返修，审计第一类）：38 岁所选（S.covenant.kind）之外，还读
  // 45 岁 fork45 的真实选择（账本 fork 记录的 set / late_try·late_settle 旗）、治疗链走没走过
  // （账本 lk_check/lk_wait 记录或 late_tried 旗）、孩子最终来没来（kids 状态）与当前伴侣状态。
  // 选过「再试」的人绝不出「定下来了：不要」那一版；已离婚/丧偶/单身的局不出「两个人把日子照旧过」。
  function covenantSettleLine() {
    const view = typeof IFY.playerFacts === "function" ? IFY.playerFacts() : null;
    if (view) return covenantSettleLineSeg(view); // v0.22.1 F3：交换局走段版，未交换局 playerFacts 恒 null、走原读法
    if (!IFY.S.covenant) return "";
    const cov = IFY.S.covenant;
    const kids = IFY.S.state ? IFY.S.state.kids : "undecided";
    const sp = IFY.S.state ? IFY.S.state.spouse : "none";
    const F = IFY.S.flags || {};
    const led = Array.isArray(IFY.S.ledger) ? IFY.S.ledger : [];
    const f45 = led.find((e) => e.kind === "fork" && e.id === "fork45");
    const tried45 = !!(F.late_try || (f45 && f45.set === "late_try"));
    const settled45 = !!(F.late_settle || (f45 && f45.set === "late_settle"));
    const treated = !!(F.late_tried || led.some((e) => e.id === "lk_check" || e.id === "lk_wait"));
    const together = sp === "partnered" || sp === "dating";
    // 伴侣已不在场时，「两个人」式收尾换成一个人对完账的说法
    const aloneTail = sp === "divorced" ? "后来你们散了，剩下的日子各过各的。"
      : sp === "widowed" ? "后来对方先走了一步，剩下的日子是你一个人过的。"
      : "剩下的日子，是你一个人过的。";
    if (kids === "has") {
      if (cov.kind !== "wait") return "38 岁立的约，后来有了孩子，那几年围着孩子转，约算是走完了。";
      return tried45 ? "38 岁挂起的那份账，45 岁说再试一回。后来，孩子等来了。" : "38 岁挂起的那份账，后来等来了孩子。";
    }
    if (kids === "none") {
      if (tried45) {
        const head = treated
          ? "38 岁挂起的那份账，45 岁说再试一回。检查、吃药、等结果，前前后后折腾了几年，最后没等来。"
          : "38 岁挂起的那份账，45 岁说再试一回。话定下来了，可医院没正经跑起来，日子推着人往前走，最后也没等来。";
        return head + (together ? "日子还是两个人一起过。" : aloneTail);
      }
      if (cov.kind === "wait") { // 45 岁选「定下来」，或后来在 e_kid_settle/final 落定不要
        return together ? "38 岁挂起的那份账，后来定下来了：不要。两个人把日子照旧过。"
          : "38 岁挂起的那份账，后来定下来了：不要。" + aloneTail;
      }
      return "38 岁立的约，后来就照着过了，安排没再改。";
    }
    if (kids === "undecided" && F.cov_solo_done) return "38 岁挂起的那份账，45 岁你一个人对过一回。孩子的事后来没落定，可那份约，到期那年算是对上了。";
    if (kids === "undecided" && tried45) return treated
      ? "38 岁挂起的那份账，45 岁说再试一回。后来医院跑了几趟，孩子的事还是没落定，这份账对到最后，也没对出个结果。"
      : "38 岁挂起的那份账，45 岁说再试一回。可医院没正经跑起来，日子推着人往前走，孩子的事就一直没落定。";
    return "38 岁挂起的那份账，到这一生走完，也没正式对完。";
  }
  Object.assign(IFY, { datingDue, spouseText, registerCovenant, covenantSettleLine });
})(window.IFY);
