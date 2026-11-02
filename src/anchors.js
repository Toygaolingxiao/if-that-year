// 《如果那年》年代锚点表（v0.20.0 M2）——加载位：registry 之后、storylet 之前（见 index.html）。
// 这是对现状的登记，不是新内容：L0 必经节点此前散落在 engine.js 的 step()、各进程模块与
// 数据本体里，本表把「哪些是锚点」收成一张可校验的表。锚点的触发机制本步不变（进程拍仍由
// 各进程的 Due 函数判定、分岔仍由 step() 按年龄找、瞥视仍在 30/40/50）；调度层（scheduler.js）
// 以本表组织年份计划（planYear 先认锚点、再仲裁内容时槽）。
// 一致性由 tools/validate-storylet.js 的锚点断言守住：表里有的 forks 数据里必须有、数据里的
// forks 必须全在表里；procBeats 必须与 D.events 中 procOnly 条目集合全等；瞥视年龄恒 [30,40,50]。
// 分岔登记键 = 年龄 + id + route：无 id 的分岔以 id=null 登记（数据本体即无 id，靠年龄定位）；
// 28 岁有两条（fork28 通用 / fork28m 限 home 路线），靠 route 区分。
(function () {
  "use strict";
  const FORKS = [
    { age: 25, id: null, route: null },
    { age: 28, id: "fork28", route: null },
    { age: 28, id: "fork28m", route: "home" },
    { age: 31, id: null, route: null },
    { age: 33, id: null, route: null },
    { age: 38, id: null, route: null },
    { age: 44, id: null, route: null },
    { age: 52, id: null, route: null },
    { age: 58, id: null, route: null },
    { age: 45, id: null, route: null },
  ];
  // 进程拍：父母进程 care/hosp/dead 六拍（who/beat 与 parentsDue 的返回同形）、dating 到期拍、
  // 退休节点拍（node/full/auto 三条呈现条目同属一个节点机制）、出国去向拍（abroad 入口拍）。
  const PROC_BEATS = [
    { id: "proc_dad_signal", who: "dad", beat: "signal" },
    { id: "proc_mom_signal", who: "mom", beat: "signal" },
    { id: "proc_dad_care", who: "dad", beat: "care" },
    { id: "proc_mom_care", who: "mom", beat: "care" },
    { id: "proc_dad_hosp", who: "dad", beat: "hosp" },
    { id: "proc_mom_hosp", who: "mom", beat: "hosp" },
    { id: "proc_dad_dead", who: "dad", beat: "dead" },
    { id: "proc_mom_dead", who: "mom", beat: "dead" },
    { id: "proc_dating", kind: "dating" },
    { id: "proc_retire_node", kind: "retire" },
    { id: "proc_retire_full", kind: "retire" },
    { id: "proc_retire_auto", kind: "retire" },
    { id: "proc_abroad_kind", kind: "abroad" },
  ];
  window.GAME_ANCHORS = {
    // 四个年代共用同一套成年段锚点（数据本体即如此：分岔不分年代、进程拍不分年代）。
    eras: ["c1955", "c1965", "c1978", "c2000"],
    forks: FORKS,
    glimpseAges: [30, 40, 50], // 瞥视年龄（L0 展示层）：与 engine.js 的 GLIMPSE_AGES 键集同口径
    procBeats: PROC_BEATS,
    // 序章分岔只 c2000 有（16 岁轨道分岔，在序章 acts 里，id 实存由 validate-storylet 一并校验）。
    prologueForks: [{ era: "c2000", age: 16, id: "pr_fork16" }],
  };
})();
