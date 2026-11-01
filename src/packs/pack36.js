// 扩展包 36（v0.18.0）：① 父母进程节拍与 dating 到期结算（procOnly 条目——只由引擎进程呈现，不进普通抽取池）；
// ② 职业语境的入行拍（从医/长途）与链后继——村医、长途类稀有与结局自本轮起以真实入行经历为门（审计急修 B5）；
// ③ 处境回响（识字线/half 线/never 线/work 轨道的成年回响，地基第一步 C8）。
window.GAME_PACKS = (window.GAME_PACKS || []).concat([
  // —— 父母进程节拍（proc_dad/proc_mom × care/hosp/dead）：呈现时机由父母进程决定，文本与选项在此 ——
  { id: "proc_dad_care", min: 22, max: 80, procOnly: true, text: "你爸的身体这一年明显不行了。电话里他还说没事，可捎话的人说，他上楼要歇两回，买的菜也提不动。你妈在电话那头压低声音：你有空，回来看看吧。",
    choices: [
      { label: "请一段长假，回去陪一阵", set: "care_self", effects: { relation: 4, money: -3, freedom: -2 }, echo: "你在家住了一个月。陪他去医院，陪他在院里晒太阳。他嘴上说你瞎耽误工夫，可你走那天，他站在门口看了半天。" },
      { label: "请个护工帮着，自己管钱管事", set: "care_hired", effects: { money: -5, relation: 1 }, echo: "护工是邻居介绍的，干活利索。你每月按时打钱，隔几天打个电话问一遍，心里才算踏实。" },
      { label: "先观察一段，周末多回去", effects: { relation: 1, freedom: -1 }, echo: "你把周末的安排改了，能回就回。路上的时间变多了，可有些事，错过就是错过了。" },
    ] },
  { id: "proc_mom_care", min: 22, max: 80, procOnly: true, text: "你妈的身体这一年明显不行了。她自己下厨都要扶着灶台站，夜里起来好几回。电话里她说不用你管，可你听得出来，她是怕拖累你。",
    choices: [
      { label: "请一段长假，回去陪一阵", set: "care_self", effects: { relation: 4, money: -3, freedom: -2 }, echo: "你在家住了一个月。给她做饭，扶她在屋里慢慢走。她总说自己能行，可你端过去的饭，她都吃完了。" },
      { label: "请个护工帮着，自己管钱管事", set: "care_hired", effects: { money: -5, relation: 1 }, echo: "护工是邻居介绍的，干活利索。你每月按时打钱，隔几天打个电话问一遍，心里才算踏实。" },
      { label: "先观察一段，周末多回去", effects: { relation: 1, freedom: -1 }, echo: "你把周末的安排改了，能回就回。路上的时间变多了，可有些事，错过就是错过了。" },
    ] },
  { id: "proc_dad_hosp", min: 22, max: 80, procOnly: true, text: "你爸住院了。病房里六张床，他靠窗。医生说先住下来观察，该做的检查一样一样做。你在走廊的长椅上坐了一夜，天亮的时候去楼下买了粥。",
    choices: [
      { label: "在医院陪床，晚上就睡陪护椅", effects: { relation: 3, health: -2, money: -2 }, echo: "陪护椅睡得腰酸。可他半夜醒来，看见你在，心里是定的。" },
      { label: "请护工帮着，自己每天去看一趟", set: "care_hired", effects: { money: -4, relation: 1 }, echo: "护工白班夜班地换。你每天下班先去病房坐一会儿，把当天的检查结果听完再走。" },
    ] },
  { id: "proc_mom_hosp", min: 22, max: 80, procOnly: true, text: "你妈住院了。病房里六张床，她靠窗。医生说先住下来观察，该做的检查一样一样做。你在走廊的长椅上坐了一夜，天亮的时候去楼下买了粥。",
    choices: [
      { label: "在医院陪床，晚上就睡陪护椅", effects: { relation: 3, health: -2, money: -2 }, echo: "陪护椅睡得腰酸。可她半夜醒来，看见你在，心里是定的。" },
      { label: "请护工帮着，自己每天去看一趟", set: "care_hired", effects: { money: -4, relation: 1 }, echo: "护工白班夜班地换。你每天下班先去病房坐一会儿，把当天的检查结果听完再走。" },
    ] },
  { id: "proc_dad_dead", min: 22, max: 80, procOnly: true, stateAll: { dad: "alive" }, setState: { dad: "dead" }, text: "你爸走了。走得还算安稳。葬礼办完，亲戚们陆续散了，你一个人把他的屋子收拾了一遍：衣服叠好，工具摆齐，抽屉里有一本记了一辈子的账。",
    effects: { relation: -2, health: -1 } },
  { id: "proc_mom_dead", min: 22, max: 80, procOnly: true, stateAll: { mom: "alive" }, setState: { mom: "dead" }, text: "你妈走了。走得还算安稳。葬礼办完，亲戚们陆续散了，你一个人把她的屋子收拾了一遍：针线盒还在老地方，里头的顶针磨得发亮。",
    effects: { relation: -2, health: -1 } },
  // —— dating 到期结算：处满 7 年未定，由进程拍给出三条路（推迟至多两次） ——
  { id: "proc_dating", min: 22, max: 80, procOnly: true, stateAll: { spouse: "dating" }, text: "处了这些年，周围人都默认你们是一对。可这事一直没个正式的说法。这一回，得有个决定了。",
    choices: [
      { label: "把关系定下来，好好过日子", setState: { spouse: "partnered" }, effects: { relation: 4, freedom: -1 }, echo: "没办多大的排场，两家人吃了顿饭，日子就接着往下过了。回头看，这个决定下得晚，可不算错。" },
      { label: "好聚好散，各过各的", setState: { spouse: "single" }, effects: { freedom: 3, relation: -3 }, echo: "最后那顿饭吃得很平静。东西分好，钥匙还回去。走出那个门的时候，你知道这回是真的分开了。" },
      { label: "再处处看，不急着定", deferDating: true, effects: { relation: 1 }, echo: "话说开了，反倒松快些。定不定，以后再说——你们先这么处着。" },
    ] },
  // —— 职业入行拍与链后继（B5 语境门的事实来源） ——
  { id: "e_med_start", min: 24, max: 36, text: "县里卫生院贴出招人启事：招医护辅助，先培训再上岗。去问的人不多，门口没排队。管事的说，这行当熬人，可饭碗稳。",
    choices: [
      { label: "去，先学起来", set: "med_work", effects: { growth: 4, money: -1 }, echo: "培训了三个月，你学会了量血压、换药、认常用药名。头一回独立值班，你手心全是汗。" },
      { label: "不去，手头的活先干着", effects: {}, echo: "你把启事看了一眼，又贴了回去。日子照旧过。" },
    ] },
  { id: "e_med_years", min: 34, max: 52, chain: "e_med_start", ctx: { flag: "med_work" }, text: "在卫生院干了这些年，附近几个村谁家老人什么病、吃什么药，你都门儿清。有人半夜来敲门，你披上衣服就走。",
    effects: { relation: 3, growth: 1 } },
  { id: "e_truck_start", min: 22, max: 32, routeIn: ["corp", "gap", "home"], text: "跑长途的师傅缺个搭把手的，问你跟不跟车。跟车先学路，学会了再上手，钱按趟结。这一行熬夜，也熬人。",
    choices: [
      { label: "跟车，先学起来", set: "truck_work", effects: { money: 3, health: -2, freedom: 2 }, echo: "头一趟跑下来，你在服务区睡了个整觉。醒来的时候，师傅说：能吃这碗饭。" },
      { label: "不跟，太熬人", effects: { health: 1 }, echo: "你帮师傅把货码好，目送车出了院子。这条路，你没上去。" },
    ] },
  { id: "e_truck_years", min: 36, max: 55, chain: "e_truck_start", ctx: { flag: "truck_work" }, set: "truck_veteran", text: "长途跑了十来年。哪段路雨天打滑、哪个服务区的饭实在，你闭着眼都说得出来。里程表上的数，一天天攒，攒得老长了。",
    effects: { money: 2, health: -2 } },
  // —— 处境回响（C8：识字线 / half 线 / work 轨道） ——
  { id: "e_lit_echo1", min: 30, max: 52, require: "literacy_gain", text: "签一份要紧的合同，人家把笔递给你。你一页一页看完，看得慢，可都看懂了，才在该签字的地方签下自己的名字。这事搁在小时候，你想都不敢想。",
    effects: { growth: 2, freedom: 2 } },
  { id: "e_lit_echo2", min: 42, max: 62, state: { schooling: "never" }, text: "村里填表、写申请，年轻人不在家时，老人都来敲你的门：你认字，你帮着看看。字是后来才认的，可认得扎实。",
    effects: { relation: 3 } },
  { id: "e_half_echo", min: 28, max: 46, require: "half_grown", text: "小时候半读半帮工落下的那些课，这些年你一点一点补。账本、说明书、招工告示，从前要人念的，如今你自己看。",
    effects: { growth: 3 } },
  { id: "e_work_echo", min: 26, max: 40, state: { track: "work" }, text: "出来打工快十年了。流水线、后厨、工地，能干的你都干过。手上的茧厚了，卡里也攒下了一点。",
    effects: { money: 2, growth: 1 } },
  { id: "e_never_work", min: 24, max: 40, state: { schooling: "never" }, text: "招工的人看你干活利索，一听不认字，把头摇了摇。你转身去了不问文凭的那家：活更重，钱更少。",
    effects: { money: 1, health: -1 } },
]);
