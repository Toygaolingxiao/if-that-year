// [M1-B 内容重组] 本文件现位于 src/content/lines/covenant.js（按领域重组搬入），除本行外内容一字未动。
// 扩展包 35（v0.17.0）：① fork38 立约的年度流——38 岁立下的约，后续年份要能读到这份账（cov38_has/none/wait 三条）；
// ② 童年记号的成年回响——序章记号 mark_deskmate / mark_river / mark_tree 各一条成年段回响事件。
// 立约只记旗与账，不碰 kids 状态机：三条的门都读现行 kids 状态，与 fork38/fork45/e_kid_settle 的既有流转并行不悖。
window.GAME_PACKS = (window.GAME_PACKS || []).concat([
  // —— 立约年度流 ——
  { id: "cov_has_flow", kidAgeMin: 1, kidAgeMax: 2, min: 39, max: 44, require: "cov38_has", state: { kids: "has" }, stateAll: { spouse: "partnered", mom: "alive" }, text: "孩子一岁多，正是离不了人的时候。夜里醒三回，你和另一半排了班，一人半夜。白天你妈发来消息，问孩子今天吃了多少、睡了多久，你一条一条回。日子被切得很碎，可你想起 38 岁那回的决定，心里是定的。",
    effects: { relation: 2, health: -1 } },
  { id: "cov_none_flow", min: 40, max: 48, require: "cov38_none", state: { kids: "none", spouse: "partnered" }, text: "你们把往后的安排列了张表，贴在书房墙上：钱怎么留，房子怎么处置，老了谁先走、剩下的那个靠什么。表是 38 岁那回定下来之后慢慢补全的。亲戚再问起孩子的事，你们就把话落到表上，说都安排好了。",
    effects: { wisdom: 2, freedom: 1 } },
  { id: "cov_wait_flow", min: 39, max: 41, require: "cov38_wait", state: { kids: "undecided" }, forbid: ["late_try"], text: "那张写着日期的纸还在文件夹最上面。这一年你又把它拿出来看了一眼，日期底下添了一行小字，是另一半写的：不急，先把身体养好。纸放回去，文件夹合上，这份账还没到期。",
    effects: { wisdom: 1, relation: 1 } },
  // 单身对账拍（v0.20.1 返修，审计 run-06）：fork45 有伴侣状态门，单身的人到期分岔不出现、约悬一辈子。
  // 本拍在 45–47 岁给无伴侣（partnered/dating 以外）且约未结的人单独对账：高权重 + 窄窗 + 多重具体门，
  // 尽量让到期这年就撞上；万一没撞上，结算对账行还有单身版本兜底（spouse.js covenantSettleLine）。
  // 口径（v0.20.1 W8 补修，验收 N1）：选「收了这份约」= 约与孩子的事一并结账——选项直接落定
  // kids→none（边载体 cov_solo_due 已登记进 state.js 的 kids undecided→none 边），此后
  // e_kid_settle/e_kid_final 的 kids=undecided 状态门天然不再出题，结算对账也不会再改写成
  // 「等来了孩子」。选「约先对到这儿」只立 cov_solo_done、不落定 kids：门留着，往后真想要
  // 时走 e_kid_settle/final 的单身收养版（events.js 两拍已给单身者分版，带到来回响）。
  { id: "cov_solo_due", min: 45, max: 47, w: 60, require: "cov38_wait", state: { kids: "undecided" }, stateNot: { spouse: ["partnered", "dating"] }, forbid: ["late_try"], text: "45 岁这年，你把文件夹从抽屉里拿了出来。那张写着日期的纸还在最上面，边角毛了。38 岁那会儿说好的，45 岁到期，再对一回。只是这回桌子对面没有人，这份账，得你一个人对。",
    choices: [
      { label: "收了这份约。孩子的事，一个人不再等了", effects: { freedom: 3, wisdom: 1 }, set: "cov_solo_done", setState: { kids: "none" }, echo: "纸折好，塞进抽屉底层。这件事，从今天起不用再搁在心上了。" },
      { label: "约先对到这儿。真有想要的那一天，再重新立", effects: { freedom: 1, wisdom: 2 }, set: "cov_solo_done", echo: "纸压回文件夹最上面。不是还等谁，是这扇门，你没替将来的自己关死。" },
    ] },
  // —— 童年记号回响 ——
  { id: "echo_deskmate", min: 24, max: 40, require: "mark_deskmate", text: "小学同桌要结婚了，喜帖寄到时，你先想起的是开学第一天那半块橡皮。你随了份子，人也去了。席间你们说起当年分橡皮的事，对方说，那块橡皮是他妈让他分的，他当时还有点舍不得。",
    effects: { relation: 2 } },
  { id: "echo_river", min: 25, max: 42, require: "mark_river", text: "回老家办事，车过桥的时候你往下看了一眼：河沟填平了一半，剩下的那段水还是浅的，几个孩子在桥洞底下，不知在摸什么。你把车停在路边站了一会儿，才重新上路。",
    effects: { freedom: 1, wisdom: 1 } },
  { id: "echo_tree", min: 26, max: 45, require: "mark_tree", text: "路过小学门口，你特意慢了一步：那棵梧桐还在，树底下修鞋摊换成了摊主的儿子，工具摆的位置都没变。你站着看了会儿，有个小孩跑出来喊师傅修鞋，答应声从摊子后头传出来，跟你小时候听的一样。",
    effects: { relation: 1, wisdom: 1 } },
]);
