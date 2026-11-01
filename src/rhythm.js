// 《如果那年》轨道节奏档案与温度（v0.17.0）——设计：docs/DESIGN-FOUNDATION-V2.1.md「轨道节奏档案」节。
// 每条轨道/生活状态的质地由两个头号参数刻画：
//   温度 temp（0–100 的整数）：这一生的事发热度。温度低 → 事稀、平淡年多、数值波动小；温度高 → 事密、平淡年少、波动大。
//   节奏型 rhythm（与温度正交的质地标签）：季节型 / 日常型 / 闯荡型 / 生计型——同温度不是同一种平淡：
//     种田（季节型）与体制内（日常型）都低温，过的却不是一种日子；流浪暂态是生计型、高事发，与闯荡型的高温分开。
// 密度 / 平淡年占比 / 波动幅度三者一律由 derive() 从温度（与节奏型）派生，全游戏只此一处公式，不许在别处另写一套数。
// 红线：温度只管年份的质地——不碰死亡率、不碰特殊结局稀有纪律、不做玩家可见的数值（无条、无数字，只以文字质感被感知）。
// 温度是「这一生的」字段：轨道只给基线，分岔选择可以改它（选项带 temp 增减，引擎与状态一起存档），同种子确定（改温只来自玩家选择，不耗随机流）。
(function () {
  "use strict";
  // 基线表：路线（22 岁五路）/ 轨道（16 岁四轨）/ 童年（分岔前）/ 流浪暂态（仅登记，机制未施工）。
  // 各轨的具体标定在各自施工轮完成；此处成年五路线基线是按「派生平淡年占比为 0」标定的现行行为点（v0.17.0 口径，见开发日志）。
  const PROFILES = {
    route: {
      corp: { temp: 74, rhythm: "闯荡型" },
      abroad: { temp: 80, rhythm: "闯荡型" },
      gap: { temp: 58, rhythm: "闯荡型" },
      study: { temp: 50, rhythm: "日常型" },
      home: { temp: 38, rhythm: "日常型" }, // 体制内低温：在平淡阈值（34）上方留一格——单次「安定」选择不改质地，叠加降温（降速+退休）才真正平淡下来
    },
    track: {
      study: { temp: 50, rhythm: "日常型" },
      work: { temp: 48, rhythm: "生计型" },
      craft: { temp: 44, rhythm: "日常型" },
      home: { temp: 16, rhythm: "季节型" },
    },
    childhood: { temp: 45, rhythm: "日常型" },
    drift: { temp: 62, rhythm: "生计型" }, // 流浪暂态：高事发属生计型，非冒险型高温；本轮只登记
  };
  const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  // 派生公式（单一来源）：入参温度与节奏型，出参三项。
  //   平淡年占比 flatShare：温度低于 34 起按斜率生长（季节型更陡——农闲与等待本就是它的主线），闯荡型打六折；温度 ≥34 为 0。
  //   事件密度 density：年度口径 = 非平淡年占比（1 − flatShare）。
  //   波动幅度 volatility：数值增减的倍率，温度 50 → 1.0，每 ±25 度约 ∓/± 0.1。
  function derive(temp, rhythm) {
    const t = typeof temp === "number" ? temp : 50;
    let slope = rhythm === "季节型" ? 0.02 : 0.016;
    let flatShare = clampN((34 - t) * slope, 0, 0.5);
    if (rhythm === "闯荡型") flatShare *= 0.6;
    return {
      flatShare,
      density: 1 - flatShare,
      volatility: 0.8 + 0.004 * t,
    };
  }
  // 成年平淡年文案池（温度出口的平淡年专用，与 events.js 的 micro 微文本池分开计数）：
  // 每条带一个具体小细节，数值至多 ±1 或不动——平淡年不是空白年，流水账里如实记一行。
  const FLAT_ADULT = [
    { text: "这一年没什么大事。楼道里的声控灯换了新的，亮得比先前白，你上楼不用再跺脚了。", effects: {} },
    { text: "平平常常过完一年。常去的那家理发店涨了两块钱，师傅还是那句老话：还按原来的剪？", effects: {} },
    { text: "这一年，家里添了台小风扇，旧的那台转起来响，挪去了储物间。日子没什么变化，就是夏天好过些了。", effects: { health: 1 } },
    { text: "没什么大事的一年。楼下新开了家包子铺，你吃惯了三鲜馅，早上排队的人里有几个熟脸，点点头就算打过招呼。", effects: { relation: 1 } },
    { text: "这一年就这么过去了。你把阳台上的花换了茬，死的那盆没扔，土倒出来晒了晒，又种上了新的。", effects: {} },
  ];
  window.GAME_RHYTHM = { profiles: PROFILES, derive, flatAdult: FLAT_ADULT };
})();
