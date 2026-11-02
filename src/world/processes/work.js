// [模块]《如果那年》引擎分片：工作/退休相位进程。独立模块（包装器 + window.IFY 共享命名空间），加载顺序见 index.html。
(function (IFY) {
  "use strict";
  // ---------- 退休相位（v0.19.0）：workPhase 小进程（进程流 #world，不碰叙事/环境流） ----------
  // 规则一句话：50 岁起按活计形态定下本局的退休节点年龄（S.retirePlan，只定一次）——
  // 体制内路线（route=home）与正式入行旗持有者 55–60；店主/零工/种地/自由形态 63–68；其余 58–63。
  // 到点发节点拍 proc_retire_node（退/part/再干几年）；part 停留期（applyState 流转时定）满后发 proc_retire_full；
  // 推迟两次或拖过 74 岁由 proc_retire_auto 收束；58 岁分岔 fork58 的选项同步写 workPhase。
  // 钱进程接口：未来养老金标定读 S.state.workPhase、S.retiredAt（退休落点年龄）与 S.retirePlan.form（退休前活计形态），定义见 docs/WORK-PHASE.md。
  const WORK_FORMAL_FLAGS = ["factory_work", "fab_work", "craft_work", "heavy_work", "miner_work", "truck_work", "med_hosp", "teach_work", "acct_work", "fin_work", "press_work", "dev_work"];
  const WORK_INFORMAL_FLAGS = ["shop_work", "gig_work", "farm_work", "courier_work", "care_work", "write_work"];

  function workForm() {
    if (WORK_FORMAL_FLAGS.some((f) => IFY.S.flags[f])) return "formal";
    if (IFY.S.route && IFY.S.route.id === "home") return "formal";
    if (WORK_INFORMAL_FLAGS.some((f) => IFY.S.flags[f])) return "informal";
    return "fallback";
  }

  // ---------- 活计形态（v0.20.0 M2）：通用职场纹理的语境层，与二相行当旗正交 ----------
  // formOf() 是派生量：只读本局已发生的事实（入行旗 + flagAges/账本先后 + 路线 + 少年轨道），
  // 不写入存档状态域、不新增旗标——旧存档载入后现算现得，读档口径不破。
  // 五形态：farm 务农 / public 体制内 / self 自营 / flex 灵活 / employee 受雇（默认）。
  // 派生规则表（显式优先级，多旗共存时按此表裁定）：
  //   R1 主入行旗（下表 FORM_OF_FLAG）——取「最近入行」的那一面定主形态：先比 flagAges
  //      落点年龄，年龄同再比账本里该旗最后一次落账的先后；仍同则按 farm>public>self>
  //      flex>employee 的表序。理由：人可以先种地后开店、先打工后上岸，主形态认最近的
  //      主线，不认最早的出身——这正是「职业身份每年重抽」读感的反面：形态随主线走。
  //   R2 副业成型旗（side_job / xiahai）——只在没有任何主入行旗时定 self：副业是主业
  //      之外的第二摊，它成型不等于主线换人；有主入行旗时不抢主形态。
  //   R3 路线 home（回家乡进体制内）——无主入行旗、无副业成型时定 public：路线本身
  //      就是体制内语境（exam_landed 上岸旗已在 R1 表内，单独立旗者同样走 R1）。
  //   R4 少年轨道 track=home（留在家里帮着种地守店）——再无上项时定 farm：这是农业
  //      轨道在成年段的余绪；track 的其余取值（study/work/craft）不单独定形态。
  //   R5 默认 employee——含 corp 路线与一切未落入行旗的局：22 岁出发即按受雇处理，
  //      通用职场纹理对这批人成立。
  const FORM_VALUES = ["farm", "public", "self", "flex", "employee"];
  const FORM_OF_FLAG = {
    farm_work: "farm",
    exam_landed: "public",
    shop_work: "self",
    gig_work: "flex", courier_work: "flex", care_work: "flex", write_work: "flex",
    factory_work: "employee", fab_work: "employee", craft_work: "employee", heavy_work: "employee",
    miner_work: "employee", truck_work: "employee", med_hosp: "employee", med_work: "employee",
    nurse_work: "employee", img_work: "employee", teach_work: "employee", acct_work: "employee",
    fin_work: "employee", press_work: "employee", dev_work: "employee", driver_taxi: "employee",
  };
  const FORM_SIDE_FLAGS = ["side_job", "xiahai"];
  const FORM_TIE_ORDER = ["farm", "public", "self", "flex", "employee"]; // R1 同龄同序时的表序

  // 主入行旗（v0.20.0 M2 形态补修第二批）：R1 的「最近入行旗」单独导出为可读量——
  // formOf() 的形态与 ctx.mainLine 门都读它。返回值是入行旗 id（如 "teach_work"），
  // 本局尚无任何主入行旗时为 null。派生量，只读现算，不进存档。
  function mainEntryOf() {
    const S = IFY.S;
    if (!S || !S.flags) return null;
    let best = null; // { flag, form, age, idx }
    for (const [flag, form] of Object.entries(FORM_OF_FLAG)) {
      if (!S.flags[flag]) continue;
      const age = S.flagAges && typeof S.flagAges[flag] === "number" ? S.flagAges[flag] : 22;
      let idx = -1;
      if (Array.isArray(S.ledger)) for (let i = S.ledger.length - 1; i >= 0; i--) { if (S.ledger[i].set === flag) { idx = i; break; } }
      const cand = { flag, form, age, idx };
      if (!best || cand.age > best.age || (cand.age === best.age && cand.idx > best.idx) ||
          (cand.age === best.age && cand.idx === best.idx && FORM_TIE_ORDER.indexOf(cand.form) < FORM_TIE_ORDER.indexOf(best.form))) best = cand;
    }
    return best ? best.flag : null;
  }

  function formOf() {
    const S = IFY.S;
    if (!S || !S.flags) return "employee";
    // R1：主入行旗取最近（判定与 mainEntryOf 同一份实现，形态由此旗的形态而定）
    const mainEntry = mainEntryOf();
    if (mainEntry) return FORM_OF_FLAG[mainEntry];
    // R2：副业成型
    if (FORM_SIDE_FLAGS.some((f) => S.flags[f])) return "self";
    // R3：home 路线体制内语境
    if (S.route && S.route.id === "home") return "public";
    // R4：农业轨道余绪
    if (S.state && S.state.track === "home") return "farm";
    // R5：默认受雇
    return "employee";
  }

  function ensureRetirePlan() {
    if (IFY.S.retirePlan || !IFY.S.route || IFY.S.age < 50 || !IFY.S.state || IFY.S.state.workPhase !== "working") return;
    const form = workForm();
    const band = form === "formal" ? [55, 60] : form === "informal" ? [63, 68] : [58, 63];
    IFY.S.retirePlan = { form, nodeAge: band[0] + Math.floor(IFY.rngW() * (band[1] - band[0] + 1)) };
  }

  function workPhaseDue() {
    if (!IFY.S.route || !IFY.S.state || !IFY.S.state.workPhase) return null;
    ensureRetirePlan();
    const wp = IFY.S.state.workPhase;
    if (wp === "part" && typeof IFY.S.partAt === "number" && IFY.S.age - IFY.S.partAt >= (IFY.S.partYears || 2)) return IFY.D.events.some((e) => e.id === "proc_retire_full") ? { item: "proc_retire_full" } : null;
    if (wp === "working") {
      if (IFY.S.age >= 74) return IFY.D.events.some((e) => e.id === "proc_retire_auto") ? { item: "proc_retire_auto" } : null;
      if (IFY.S.retirePlan && IFY.S.age >= IFY.S.retirePlan.nodeAge) {
        if ((IFY.S.retireDefers || 0) >= 2) return IFY.D.events.some((e) => e.id === "proc_retire_auto") ? { item: "proc_retire_auto" } : null;
        return IFY.D.events.some((e) => e.id === "proc_retire_node") ? { item: "proc_retire_node" } : null;
      }
    }
    return null;
  }
  Object.assign(IFY, { WORK_FORMAL_FLAGS, WORK_INFORMAL_FLAGS, workForm, FORM_VALUES, FORM_OF_FLAG, formOf, mainEntryOf, ensureRetirePlan, workPhaseDue });
})(window.IFY);
