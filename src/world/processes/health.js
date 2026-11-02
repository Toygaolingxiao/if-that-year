// [模块]《如果那年》引擎分片：死亡模型（主角死亡曲线与死因）。独立模块（包装器 + window.IFY 共享命名空间），加载顺序见 index.html。
(function (IFY) {
  "use strict";
  // 死亡模型 v3（v0.19.0 按世代重标）：年龄×健康风险，参数按出生世代分表——
  // 目标带与数据出处见 docs/MORTALITY-MODEL.md「v3 世代重标」节（旧 v2 全世代同一组参数、活到 80 约 90% 就此作废）。
  const MORTALITY = { accident: 0.00015, hfNum: 115, hfDen: 55, hfLo: 0.3, hfHi: 2.2 };

  const MORTALITY_BY_ERA = {
    // v0.19.0 按世代生存曲线重标（目标带与出处见 docs/MORTALITY-MODEL.md 修订节；旧三档死亡带作废）
    c1955: { a: 0.00531, g: 1.055 },
    c1965: { a: 0.00297, g: 1.075 },
    c1978: { a: 0.0024, g: 1.075 },
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

  function rollDeath() {
    const health = IFY.S.stats.health;
    let type = null;
    // v2：意外线独立先掷（30 岁前豁免）；健康线 λ(age,H) = a × g^(age−40) × hf(H)，40 岁前为 0
    if (IFY.S.age >= 30 && IFY.rngW() < MORTALITY.accident) type = "accident";
    else if (IFY.S.age >= 40) {
      const mp = MORTALITY_BY_ERA[IFY.S.era] || MORTALITY_BY_ERA.c2000;
      const hf = Math.max(MORTALITY.hfLo, Math.min(MORTALITY.hfHi, (MORTALITY.hfNum - health) / MORTALITY.hfDen));
      if (IFY.rngW() < mp.a * Math.pow(mp.g, IFY.S.age - 40) * hf) type = "health";
    }
    if (!type) return false;
    const pool = DEATH_CAUSES[type];
    const text = pool[Math.floor(IFY.rngW() * pool.length)];
    IFY.S.death = { age: IFY.S.age, type, text };
    IFY.rec("death", type);
    IFY.S.log.push(`${IFY.S.age} 岁 · 这一生停在这里：${text}`);
    return true;
  }
  Object.assign(IFY, { MORTALITY, MORTALITY_BY_ERA, DEATH_CAUSES, rollDeath });
})(window.IFY);
