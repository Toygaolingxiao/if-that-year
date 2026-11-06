// [模块]《如果那年》引擎分片：死亡模型（主角死亡曲线与死因）。独立模块（包装器 + window.IFY 共享命名空间），加载顺序见 index.html。
(function (IFY) {
  "use strict";
  // 死亡模型 v3（v0.19.0 按世代重标）：年龄×健康风险，参数按出生世代分表——
  // 目标带与数据出处见 docs/MORTALITY-MODEL.md「v3 世代重标」节（旧 v2 全世代同一组参数、活到 80 约 90% 就此作废）。
  const MORTALITY = { accident: 0.00015, hfNum: 115, hfDen: 55, hfLo: 0.3, hfHi: 2.2 };

  const MORTALITY_BY_ERA = {
    // v0.19.0 按世代生存曲线重标（目标带与出处见 docs/MORTALITY-MODEL.md 修订节；旧三档死亡带作废）
    c1955: { a: 0.0038, g: 1.07 },
    c1965: { a: 0.00297, g: 1.075 },
    c1978: { a: 0.0024, g: 1.075 },
    c1985: { a: 0.00222, g: 1.075 }, // v0.23 WP7 已按定版带标定（4000 局实测落带；带见 work/g2-bands.md，登记见 docs/MORTALITY-MODEL.md）；数值与外推草案原值一致，未动
    c1995: { a: 0.00200, g: 1.075 }, // v0.23 WP8 已按定版带标定（1200 局实测落带；带见 work/g2-bands.md，登记见 docs/MORTALITY-MODEL.md）；数值与外推草案原值一致，未动
    c2000: { a: 0.00189, g: 1.075 },
  };

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

  // 死因文本按本局事实过滤（v0.20.1 W5）：只动文案选取，不动死亡率、死因类型判定与年代带。
  // (a) 居所事实：本局装过电梯（下列既有事件任一发生过，两选项回响均确认装成）→ 健康型「楼梯间」条（下标 2）不出。
  // (b) 健康事实：终局健康 ≥60 视为长期高位（引擎不存历史健康序列，以终局值代，口径见 w5-presuppose 日志）
  //     → 「拖延复查」型两条（下标 1 复查拖延、5 体检拖延）不出。意外池不读事实，照旧。
  const ELEVATOR_EVENT_IDS = ["p11_027", "p16_061", "p14_052", "e55_049", "p24_023"];
  const STAIR_CAUSE_IDX = 2;
  const DELAYED_CAUSE_IDX = [1, 5];
  const HIGH_HEALTH = 60;
  function deathCausePool(type) {
    let idx = DEATH_CAUSES[type].map((_, i) => i);
    if (type === "health") {
      if (ELEVATOR_EVENT_IDS.some((id) => IFY.hasFact(id))) idx = idx.filter((i) => i !== STAIR_CAUSE_IDX);
      if ((IFY.S.stats.health || 0) >= HIGH_HEALTH) idx = idx.filter((i) => !DELAYED_CAUSE_IDX.includes(i));
    }
    return idx.map((i) => DEATH_CAUSES[type][i]);
  }

  // ---------- 死亡机制 v4（v0.32.0 片 C：废 80 顶、四通道、疾病负担、保险丝 110） ----------
  // 设计与标定出处：docs/MORTALITY-MODEL.md v0.32.0 节＋ death-c-build/REPORT.md。
  // 通道与掷序写死：④意外基线 → 跌倒附加 → ②急性发作 → ①慢性累积；每年恒抽 4 骰
  // （顺序与次数不随年龄/状态漂移——下游随机流不因疾病状态增减而整批换账，设计稿 §4.5）。
  // 疾病状态暂由既有事实派生（片 B 的专属疾病旗未落，本片先读 A 档信号：住院旗与其落点
  // 年龄、健康危机、退休体检旗、先天体弱旗，及血糖临界/指标被圈/降压药日常/住院手术四个
  // 已呈现拍子的发生事实；片 B 落旗后只换 diseaseState() 的取数，不动公式）。
  const DEATH_CAL = {
    accSeg: [[30, 0.0004], [60, 0.0005], [75, 0.0008]], // 意外年龄分段基线（30 岁前为 0）
    accCarMul: 1.5,          // 有过车 → 交通暴露小抬
    accJobMul: 1.75,         // 高暴露职业且在职（working/part）→ 抬
    fallAge: 75, fallP: 0.00075, // 跌倒附加：75+ 且有住院史或先天体弱才掷；死法走健康池（含楼梯段）
    acuteCtrl: 0.0035,       // 急性发作·受控代理（心脑在管：有药有复诊）：0.35%/年
    acuteUnctrl: 0.012,      // 急性发作·未受控代理：1.2%/年（设计稿区间 0.8–1.5%）
    dfCap: 2.2,              // 疾病负担总乘数上限（与 hf 上限对齐）
    g2: 1.16, g2From: 82,    // 82 岁后慢性线斜率升档（保险丝标定杠杆 a；标定见 REPORT）
    driftFrom: 80, driftPerYear: 1, // 80 岁后每年健康 −1（保险丝标定杠杆 b：让高健康者的 hf 随高龄自然抬升；量级受子孙满堂等终局健康门约束，标定见 REPORT）
    eraMul: { c1955: 0.88, c1965: 0.98, c1978: 0.95, c1995: 0.88, c2000: 0.93 }, // df/急性接入后对年代 a 的重标（缺省 1.0；两轮标定定版，见 REPORT）
  };
  function eraMulOf(era) { const m = DEATH_CAL.eraMul; return typeof m === "object" ? (m[era] != null ? m[era] : 1) : m; }
  const CAR_FLAGS = ["car_bought", "bought_car", "e78_car"]; // 与 place.js 同口径：语义「有过车」
  const EXPOSED_JOBS = ["truck_work", "courier_work", "miner_work", "heavy_work"];

  function flagAgeOf(name) {
    const fa = IFY.S.flagAges;
    return fa && typeof fa[name] === "number" ? fa[name] : null;
  }

  // 疾病派生（判定表，登记在案）：df 乘慢性线；急性线仅在有疾病信号时激活。
  // 信号全部取自今日可读事实（片 B 专属疾病旗未落，先行代理，判定表写死在此）：
  //   代谢预警 = 退休体检旗（血脂血糖在边上）∨ 血糖临界拍 p15_013 ∨ 指标被圈拍 p21_032
  //   心脑在管 = 降压药日常拍 p22_027（每天吃药＋复诊贴冰箱：有药有复诊）
  //   住院史   = 住院旗 self_hosp_done ∨ 住院手术拍 p25_011；大病后窗口只认旗的落点年龄
  //   健康危机 = crisisUsed.health；先天体弱 = hook_frail
  // 「受控」代理 = 心脑在管（有药有复诊的日常管理在身）；其余激活情形按未受控档。
  function diseaseState() {
    const S = IFY.S, F = S.flags || {}, age = S.age;
    const has = (id) => typeof IFY.hasFact === "function" && IFY.hasFact(id);
    const hospEver = !!F.self_hosp_done || has("p25_011");
    const hospAge = F.self_hosp_done ? flagAgeOf("self_hosp_done") : null;
    const crisis = !!(S.crisisUsed && S.crisisUsed.health);
    const metabolicWarn = !!F.retired_checkup_done || has("p15_013") || has("p21_032");
    const cardioManaged = has("p22_027");
    const postWindow = hospAge != null && age - hospAge <= 3; // 大病后 3 年窗口
    let df = 1;
    if (F.hook_frail) df *= 1.15;          // 先天体弱：底子薄
    if (metabolicWarn) df *= 1.20;         // 代谢预警在身
    if (cardioManaged) df *= 1.20;         // 心脑线在管（在管也带负担，设计稿 1.15–1.3 档）
    if (crisis) df *= 1.20;                // 健康危机发过
    if (postWindow) df *= 1.40;            // 大病后窗口内（替代住院史常态档）
    else if (hospEver) df *= 1.15;         // 住院/手术史（窗口外）
    df = Math.min(df, DEATH_CAL.dfCap);
    const acuteActive = hospEver || crisis || metabolicWarn || cardioManaged;
    const acuteP = !acuteActive ? 0 : (cardioManaged ? DEATH_CAL.acuteCtrl : DEATH_CAL.acuteUnctrl);
    const fallRisk = age >= DEATH_CAL.fallAge && (hospEver || !!F.hook_frail);
    return { df, acuteP, fallRisk };
  }

  function accidentP() {
    const S = IFY.S, age = S.age;
    let base = 0;
    for (const [from, p] of DEATH_CAL.accSeg) if (age >= from) base = p;
    if (!base) return 0;
    const F = S.flags || {};
    if (CAR_FLAGS.some((f) => F[f])) base *= DEATH_CAL.accCarMul;
    const wp = S.state && S.state.workPhase;
    if ((wp === "working" || wp === "part") && EXPOSED_JOBS.some((f) => F[f])) base *= DEATH_CAL.accJobMul;
    return base;
  }

  function writeDeath(type, fuse) {
    const pool = deathCausePool(type);
    const text = pool[Math.floor(IFY.rngW() * pool.length)];
    IFY.S.death = { age: IFY.S.age, type, text };
    if (fuse) IFY.S.death.fuse = true; // 内部标定字段：玩家侧呈现与自然终局无区别，文案永不读它
    IFY.rec("death", type);
    IFY.S.log.push(`${IFY.S.age} 岁 · 这一生停在这里：${text}`);
    return true;
  }

  function rollDeath() {
    const S = IFY.S, age = S.age;
    // 80 岁后健康漂移：本函数是两条轨唯一的死亡入口，在此落账保证两轨同点同规。
    if (age > DEATH_CAL.driftFrom) S.stats.health = Math.max(0, S.stats.health - DEATH_CAL.driftPerYear);
    const ds = diseaseState();
    const rAcc = IFY.rngW(), rFall = IFY.rngW(), rAcute = IFY.rngW(), rChron = IFY.rngW(); // 恒 4 骰，序固定
    let type = null;
    if (rAcc < accidentP()) type = "accident";                                     // ④ 意外基线
    else if (ds.fallRisk && rFall < DEATH_CAL.fallP) type = "health";              // 跌倒附加（文本走健康池）
    else if (age >= 40 && rAcute < ds.acuteP) type = "health";                     // ② 急性发作（仅疾病线激活）
    else if (age >= 40) {                                                          // ① 慢性累积 × 疾病负担
      const mp = MORTALITY_BY_ERA[S.era] || MORTALITY_BY_ERA.c2000;
      const hf = Math.max(MORTALITY.hfLo, Math.min(MORTALITY.hfHi, (MORTALITY.hfNum - S.stats.health) / MORTALITY.hfDen));
      const bend = Math.min(age, DEATH_CAL.g2From);
      let lam = mp.a * eraMulOf(S.era) * Math.pow(mp.g, bend - 40) * hf * ds.df;
      if (age > DEATH_CAL.g2From) lam *= Math.pow(DEATH_CAL.g2, age - DEATH_CAL.g2From);
      if (rChron < lam) type = "health";
    }
    if (!type) return false;
    return writeDeath(type, false);
  }

  // 保险丝：活到 MAX_AGE(110) 仍未掷中死亡 → 强制终局。呈现与自然死亡完全一致
  // （正常死亡屏＋死法文本＋正常结算），玩家侧不存在「到顶局」这个概念。
  function forceFuseDeath() {
    if (IFY.S.death) return false;
    return writeDeath("health", true);
  }
  Object.assign(IFY, { MORTALITY, MORTALITY_BY_ERA, DEATH_CAUSES, rollDeath, deathCausePool, DEATH_CAL, diseaseState, forceFuseDeath, eraMulOf });
})(window.IFY);
