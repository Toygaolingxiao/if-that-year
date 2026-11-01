// 《如果那年》序章（v0.17.0，试点：2000 年生 × school 处境）——设计：docs/DESIGN-FOUNDATION-V2.1.md 第二、三章。
// 结构：被讲起的来历 1 幕（无选项、无数值、无影子）→ 童年 4 幕 → 少年 2 幕 → 16 岁分岔（写入 track）→ 17–21 岁 4 幕，
// 共 12 幕；幕与幕之间的年份是平淡年，只在流水账里记一行。22 岁汇入现有五路线。
// 随机流独立：序章用自己的派生流（种子 + "#prologue"），同种子可复现，且一格都不消费主 RNG——成年段的运气不被童年平移。
// 处境发放：年代 × 家底按种子发放（权重表 SITUATION_W），玩家不能重掷（界面无刷新、无重抽暗示）；
//   本轮试点 c2000 的 school 为必达分支，half / never 权重登记为 0、第一步（v0.18.0）开放。
// 出身牌在本年代退役并入序章：家底牌 → 来历质地（开局即定、22 岁汇入时结算数值与钩子旗），
//   性子牌 → 童年「性子拍」三选一（真选择），时代牌 → 少年拍自动绑定。牌的数据与发牌流仍在 src/cards.js，其余年代照旧用牌。
(function () {
  "use strict";
  function seedFromString(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function prng(S) { const P = S.prologue; P.a |= 0; P.a = (P.a + 0x6D2B79F5) | 0; let t = Math.imul(P.a ^ (P.a >>> 15), 1 | P.a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  function stageFor(age) { return age < 6 ? "origin" : age <= 12 ? "child" : age <= 16 ? "teen" : age <= 21 ? "youth" : age <= 64 ? "adult" : "late"; }

  // 处境发放权重（[处境, 权重]）：v0.17.0 试点只开 school；v0.18.0 第一步把 c2000 补齐——
  // school 88（义务教育普及年代的绝大多数）、half 9（帮工 + 初中流失的小格）、never 3（登记小权重：只剩重病、极端贫困、家庭变故这类特殊情形，并带识字线）。
  // 其余年代仍只开 school，各年代的处境权重在第二步按各自年代的入学数据分别标定。
  const SITUATION_W = {
    c2000: [["school", 88], ["half", 9], ["never", 3]],
    c1978: [["school", 100], ["half", 0], ["never", 0]],
    c1965: [["school", 100], ["half", 0], ["never", 0]],
    c1955: [["school", 100], ["half", 0], ["never", 0]],
  };
  const ORIGIN_OPEN = [
    "你出生那年，家里住的还是老房子，厨房和卧房只隔一道布帘。爸妈把你的小床放在靠墙的一侧，墙上贴着一张全家福，是你满月时照的。",
    "你出生在县城医院。住院那几天，奶奶每天送两趟饭，保温桶用毛巾裹着，到的时候还是热的。出院回家，你爸在自行车后座绑了个小筐，说以后载你用。",
  ];
  // 童年记号：小时候留下的具体事，成年段会有事件回响（pack35），影子瞥视里会以「两条路上共同的事实」出现一次。
  const MARKS = {
    mark_deskmate: { shadow: "两条路上都一样的是，开学第一天同桌分你的那半块橡皮，你用了大半年，磨得只剩一个小三角。" },
    mark_river: { shadow: "两条路上都一样的是，放学路上的那条河沟，后来修路填平了一半，你每次路过都要往下看一眼。" },
    mark_tree: { shadow: "两条路上都一样的是，小学门口那棵梧桐还在，修鞋摊换成了摊主的儿子在守。" },
  };
  // 间隔平年（幕之间的年份）：只记流水账一行，带一个具体小细节；数值至多 ±1（波动派生 <0.95 的轨道连这点也不动，见 choose）。
  const FLATS_BY_AGE = {
    6: { text: "六岁那年，你学会了自己系鞋带，头一回没让大人帮忙，就是系成了死结，最后还是大人蹲下来解的。", effects: {} },
    8: { text: "这一年没什么大事。你的乳牙掉了一颗，压在枕头底下，第二天枕头底下多了一块糖，你到现在也不确定是谁放的。", effects: {} },
    10: { text: "十岁那年，家里换了台新电视，旧的那台搬去了奶奶屋里。你负责上房顶转天线，转准了画面，全家都说你手稳。", effects: { relation: 1 } },
    14: { text: "初二这一年，你的个子蹿了一截，校服裤子眼看着短下去，露着脚脖子过了一冬天，谁也没顾上给你换。", effects: {} },
    19: { text: "这一年过得平。手机换了张新卡，旧号码的联系人导过来，少了几个，你也没太在意。", effects: {} },
  };
  const ACTS = [
    { id: "pr_origin", age: 5, log: "家里是这样开始的", setState: { schooling: "school" },
      setStateBySit: { half: { schooling: "half" }, never: { schooling: "never" } },
      text: "" }, // 文本在 present 时物化：开场白（独立流二选一）+ 家底牌原话。无选项、无数值、无影子（地基红线）。处境落定按发放结果选 setStateBySit。
    { id: "pr_child1", age: 7, log: "开学第一天", set: "mark_deskmate", mark: "mark_deskmate",
      text: "开学第一天，你背着新书包站在教室门口，手心全是汗。老师按个子排座，你的同桌来得比你早，桌上摆着一块新橡皮，已经切成两半，推给你一半。",
      choices: [
        { label: "把橡皮收好，在课本第一页写下自己的名字", effects: { growth: 1 }, echo: "字写得歪，你描了三遍，才让它站直了点。" },
        { label: "先跟同桌把话说开，问对方家住哪个院", effects: { relation: 1 }, echo: "放学时你们已经约好，第二天在路口等着，一起走。" },
      ] },
    { id: "pr_child2", age: 9, log: "河沟里摸螺蛳", set: "mark_river", mark: "mark_river",
      text: "放学路上有一条河沟，水浅的时候能蹚过去。你和几个孩子在桥洞底下摸螺蛳，裤腿湿到膝盖，回家挨了两句，也没耽误第二天再去。",
      choices: [
        { label: "把摸来的螺蛳分一半给带你去的那个", effects: { relation: 1 }, echo: "对方第二天带你去了更上游一处，水更清，螺蛳的个头也大些。" },
        { label: "自己留着，晚上让奶奶炒了一盘", effects: { health: 1 }, echo: "炒螺蛳放了紫苏，你吃了大半盘，手指头上都是油。" },
      ] },
    { id: "pr_child3", age: 11, log: "性子", temperPick: true,
      text: "班里要出节目，老师在讲台上点人。点到你之前，你心里先过了一遍自己会怎么应——这事你从小就是这个应法，改不掉，也没想改。",
      choices: [] }, // 选项在 present 时由所发的三张性子牌物化（真选择：选哪张，哪张的钩子与数值在 22 岁汇入时结算）
    { id: "pr_child4", age: 12, log: "校门口的老梧桐", set: "mark_tree", mark: "mark_tree",
      text: "小学门口有棵老梧桐，树底下有个修鞋摊。你毕业那年夏天，学校说要拓宽校门，树留不留，街上的人议论了好一阵。后来树留下了，修鞋摊挪到了树影的另一边。",
      choices: [
        { label: "毕业照就站在树底下拍，你伸手摸了摸树皮", effects: { relation: 1 }, echo: "照片洗出来，你站在最边上，树占了半个画面。" },
        { label: "你更惦记修鞋摊的大爷，问他还来不来", effects: { wisdom: 1 }, echo: "大爷说，来，摊子在哪我在哪。这话你记了很多年。" },
      ] },
    { id: "pr_teen1", age: 13, log: "升初中", eraText: true,
      text: "升初中那年，学校离家远了，日子一下子铺开。",
      choices: [
        { label: "开学先把新路线骑熟，来回时间记在本子上", effects: { growth: 1 }, echo: "单程三十五分钟。后来你闭着眼都知道，哪个路口要等灯。" },
        { label: "约上顺路的同学一起走，路上说话不闷", effects: { relation: 1 }, echo: "你们在早点摊分过一根油条，这事被说了一学期。" },
      ] },
    { id: "pr_teen2", age: 15, log: "十五岁的念头",
      text: "十五岁那年，你开始想一件事：往后的日子，是接着念书，还是早点出去挣钱。想归想，日子还是一天一天过——作业要交，饭要照吃。",
      choices: [
        { label: "把念头压下去，先把眼前的试考好", effects: { growth: 1 }, itch: "study", echo: "你把那页写了念头的纸夹进课本里，再没翻开过。" },
        { label: "跟家里旁敲侧击提了一回，看看大人的反应", effects: { relation: 1 }, itch: "out", echo: "你妈说，等你初中毕业再说。你爸没接话，把电视声音调小了一格。" },
      ] },
    { id: "pr_fork16", age: 16, title: "16 岁 · 往哪条道上走", log: "初中毕业，分了道",
      text: "初中毕业。这个夏天过后，一块儿玩的那些人要散到不同的地方去了。你得选一条道，先走起来。",
      choices: [
        { label: "接着念高中，往下考", setState: { track: "study" }, echo: "录取通知书到家那天，你妈放了一小挂鞭炮。书包还是旧的，里头换了新课本。" },
        { label: "去职校，学一门能吃饭的手艺", setState: { track: "craft" }, echo: "报名表上专业那一栏，你填得很慢，一笔一画。师傅还没见着，工具先领了一套。" },
        { label: "出去打工，先挣钱", setState: { track: "work" }, echo: "介绍人是同村的亲戚。临走前一晚，你妈把你的衣服叠了又叠，行李袋的拉链差点拉不上。" },
        { label: "留在家里，帮着种地守店", setState: { track: "home" }, echo: "你爸没说什么，第二天一早就把你喊起来下了地。露水把裤脚打湿了一大片。" },
      ] },
    { id: "pr_y17", age: 17, log: "十七岁",
      textByTrack: {
        study: "高二分了科。你选的那一科，班里走了一半人，又从别的班补进来一半。晚自习的灯管换了一根，亮得有点晃眼。",
        work: "打工第一年，你在流水线上学到一件事：手上的活要快，眼睛还得盯着前一个工位。工资发下来，头一笔给你妈转了三百。",
        craft: "职校第二年，开始进实训车间。师傅让你先练基本功，同一个件磨了四十遍，手上的茧先起来了。",
        home: "留在家里的第一年，你跟着把一季庄稼从头走到尾。播种的时候腰是弯的，收的时候也是。晒场上的谷子，你翻了不下二十遍。",
      },
      choices: [
        { label: "把手头的日子过扎实，不想太远", effects: { health: 1 }, echo: "你把闹钟定得比别人早十分钟，慢慢成了习惯。" },
        { label: "给自己留个小目标，写在日记本最后一页", effects: { growth: 1 }, echo: "那页纸你后来很少翻，可一直没撕。" },
      ] },
    { id: "pr_y18", age: 18, log: "十八岁",
      textByTrack: {
        study: "高三这一年，日子是按周过的：周考、月考、模拟。教室后墙贴了张倒计时，数字一天少一个。你的水杯上贴着名字，怕拿错。",
        work: "你满十八了。厂里把你从临时工转成正式的，工牌换了颜色。夜班排到你的时候，你在休息室的长椅上睡过几个整觉。",
        craft: "毕业这一年，你开始跟师傅出活。头一回独立干完一件，验收的人点了点头。你回去把那件工具擦了三遍。",
        home: "这一年收成还行。你爸把卖粮的钱数了两遍，分出一份，说给你留着。村里同龄的走了大半，晚饭桌上常听见他们打工地方的名字。",
      },
      choices: [
        { label: "成年这天没什么仪式，你给自己煮了碗面，加了个蛋", effects: { freedom: 1 }, echo: "面吃完，你把碗洗了。这一天就这么过去了。" },
        { label: "你请要好的几个吃了顿饭，一人一瓶汽水", effects: { relation: 1, money: -1 }, echo: "汽水瓶碰在一起，声音很脆。你们说，往后各走各的路，常联系。" },
      ] },
    { id: "pr_y20", age: 20, log: "二十岁",
      textByTrack: {
        study: "大二的课排得满。你开始在一家小公司做兼职文案，一千字三十块，改三遍。第一笔钱到账，你截了图，没发给任何人。",
        work: "你换了第二份工，在一家餐馆后厨帮工。师傅骂人凶，可你偷着学了几道菜。过年回家你露了一手，桌上的人都说行。",
        craft: "手艺慢慢上身了。你接了个私活，周末给人修机器，挣得不多，可那是你凭手艺挣的第一笔。",
        home: "地里的活，你已经能顶大半个劳力。农闲时你去镇上的厂里做过两个月零工，又回来。日子就这么交替着过。",
      },
      choices: [
        { label: "挣的钱先存起来，存折上的数慢慢往上涨", effects: { money: 2 }, echo: "存折你藏在抽屉最里面，数到整数时，心里会稳一下。" },
        { label: "挣的钱先紧着家里，剩下的才是自己的", effects: { relation: 2, money: -1 }, echo: "你妈收下钱，转头给你买了双新鞋，说旧的那双早该扔了。" },
      ] },
    { id: "pr_y21", age: 21, log: "二十二岁前夜",
      textByTrack: {
        study: "毕业季快到了。论文、答辩、投简历，日子被切成一格一格。宿舍里开始有人打包，纸箱堆在走廊，得侧着身过。",
        work: "二十一岁，你在这个行当里站住了脚。同事换了几茬，你还在。你开始想：是接着这么干，还是换个地方看看。",
        craft: "你出师了。师傅在最后一课上说：手艺是你的，谁也拿不走。往后往哪儿去，你得自己拿主意了。",
        home: "二十一岁，村里给你说对象的人多起来。你心里清楚，往后的路得宽起来，不能只守着这一摊想了。",
      },
      choices: null }, // 无选项：看完点「到 22 岁」，汇入五路线
  ];
  // 处境专属幕（v0.18.0 第一步）：half 线（半读半帮工 → 读了又离开/补课）、never 线（没进校门 → 夜校识字线 → 认字之后）。
  // 留守不是处境值，是家底底色（见 start 的 leftBehind）：只改来历幕与童年幕的质地，不占幕序。
  const SIT_ACTS = {
    half: [
      { id: "pr_half1", age: 10, log: "半天学校半天家", sit: "half",
        text: "你家里的活多。上半天学，下半天回家帮工：喂猪、晒谷、农忙时下地。老师知道你家的情况，作业晚交一两天，也不说你。",
        choices: [
          { label: "书包里揣着课本，路上也在背", effects: { growth: 1 }, echo: "课文背得磕磕绊绊，可放下书包之前，总能顺下来了。" },
          { label: "先紧着家里的活，书有空再看", effects: { relation: 1 }, echo: "家里的活你干得利索。大人说起你，都讲懂事。" },
        ] },
      { id: "pr_half2", age: 14, log: "读了又离开", sit: "half", title: "14 岁 · 还读不读",
        text: "初二念完，家里的意思越来越明确：地里缺人手，学费也是一笔。这个书，还读不读，你自己也得拿个主意了。",
        choices: [
          { label: "咬咬牙，继续读下去", effects: { growth: 2, money: -1 }, echo: "你接着读了。家里的活没少干，觉睡得更少了。" },
          { label: "就读到这儿，回家帮工", setState: { schooling: "left" }, effects: { relation: 1, money: 1 }, echo: "退学那天，你把课本摞好，放在柜子顶上。往后，就是全天帮工的人了。" },
        ] },
      { id: "pr_half3", age: 19, log: "半大的手艺", sit: "half",
        text: "这些年，书读得不全，手上的活倒是齐全了。家里家外的事，你都能顶上去。",
        choices: [
          { label: "农闲去镇上补课，把落下的认回来", set: "half_grown", effects: { growth: 2 }, echo: "补课班上多是半大孩子，你坐在最后一排，也不觉得臊。落下的，一点一点往回捡。" },
          { label: "手艺活接着干，日子先过稳", effects: { money: 1, health: 1 }, echo: "你把手上的活干得更细了。找你干活的人，慢慢多起来。" },
        ] },
    ],
    never: [
      { id: "pr_never1", age: 8, log: "没进过校门", sit: "never",
        text: "村里的小学在山那边。你家的情况，报名的那几天，没人顾得上送你去。开学那天，你站在村口，看背书包的孩子一拨一拨往山那边走。",
        choices: [
          { label: "回家帮着放羊，心里把这条路记下", effects: { freedom: 1 }, echo: "羊吃草的时候，你坐在坡上看山那边的学校，旗升起来，又落下去。" },
          { label: "跟放羊的老人认了几个字，写在地上", effects: { growth: 1 }, echo: "老人用树枝在地上划，你的名字，就是先这么学会写的。" },
        ] },
      { id: "pr_never2", age: 15, log: "夜校的灯", sit: "never", title: "15 岁 · 夜校开课",
        text: "村里办了个夜校，说是扫盲班，晚上开课，认字不要钱。去的多是上了年纪的，你是里头最小的一个。",
        choices: [
          { label: "去。一晚上认十个字，回来写在灶台墙上", set: "literacy_gain", effects: { growth: 2 }, echo: "半年下来，墙上的字连成了一片。你头一回自己读完了一整张报纸的标题。" },
          { label: "没去成，家里的活离不开人；可买回来的账本，你试着自己记", set: "home_ledger", effects: { growth: 1 }, echo: "账记得歪歪扭扭，数目倒从没错过。字认得不多，够用了。" },
        ] },
      { id: "pr_never3", age: 20, log: "认字之后", sit: "never",
        text: "这两年，招工告示贴出来，你能自己一字一句看完。去镇上办事，表格拿到手里，心里不慌了。",
        choices: [
          { label: "照着告示去应聘，先挑认字少的活干稳", effects: { money: 1, growth: 1 }, echo: "面试的人问了几句，就让你第二天来上工。你把告示折好，收进了口袋。" },
          { label: "接着认字，晚上就着灯看借来的书", effects: { growth: 2 }, echo: "书是借的，还的时候你把折角都展平了。里头的世界，比村子大得多。" },
        ] },
    ],
  };
  // 间隔年只在 child/teen/youth 段出现（act 年龄表）：5→7→9→11→12→13→15→16→17→18→20→21，空档为 6/8/10/14/19。处境幕并入后，落在处境幕年龄上的平年不再重复出现。

  function cards() { return window.GAME_CARDS || null; }
  function rhythmProfiles() { return (window.GAME_RHYTHM && window.GAME_RHYTHM.profiles) || null; }

  function start(S, seedStr) {
    const C = cards();
    const dealt = C ? C.deal(seedStr, S.era) : null;
    S.prologue = {
      a: seedFromString(seedStr + "#prologue"), idx: 0, presented: -1,
      family: dealt ? dealt.family[0] : null,
      temper: dealt ? dealt.temper.slice() : [],
      temperPick: null,
      eraCard: dealt ? dealt.era[0] : null,
      situation: null, itch: null, done: false,
      pendingState: null, curText: null, curChoices: null, shadowMarkShown: false,
      seq: null, leftBehind: false,
    };
    // 处境发放（年代 × 家底的权重表按种子抽一次；本轮 school 权重 100，其余登记未开放）——发放即定，不重掷
    const table = SITUATION_W[S.era] || SITUATION_W.c2000;
    const total = table.reduce((s, [, w]) => s + w, 0);
    let roll = prng(S) * total, sit = table[0][0];
    for (const [name, w] of table) { if (roll < w) { sit = name; break; } roll -= w; }
    S.prologue.situation = sit;
    // 留守是家底底色（地基 v2.1），不占处境值：父母不在身边长大的孩子各处境都有，half 最多。只改质地（来历幕/童年幕文本），不发数值。
    const LB = { school: 0.18, half: 0.45, never: 0.30 };
    S.prologue.leftBehind = prng(S) < (LB[sit] || 0);
    // 处境幕并入幕序（按年龄交错，同龄时主幕在前）：本处境的专属幕只在本局出现
    S.prologue.seq = ACTS.concat(SIT_ACTS[sit] || []).slice().sort((a, b) => a.age - b.age);
    const prof = rhythmProfiles();
    const base = prof ? prof.childhood : { temp: 45, rhythm: "日常型" };
    S.temp = base.temp; S.rhythm = base.rhythm;
    S.age = 5; S.phase = "prologue"; S.stage = "origin";
  }

  // 物化当前幕：文本与选项只在首次呈现时定版（独立流的消费点固定，同种子复现）；顶层立旗/记号在此落，setState 暂存待调用方走 applyState。
  function present(S) {
    const P = S.prologue;
    if (!P || P.done) return null;
    if (!P.seq) P.seq = ACTS; // v0.17 旧存档无幕序字段：按主幕表续玩（处境恒 school，与旧局一致）
    if (P.leftBehind === undefined) P.leftBehind = false;
    const act = P.seq[P.idx];
    if (!act) return null;
    if (P.presented !== P.idx) {
      P.presented = P.idx;
      if (act.set) S.flags[act.set] = true;
      if (act.mark) S.marks.push({ id: act.mark, age: act.age });
      P.pendingState = act.setStateBySit ? (act.setStateBySit[P.situation] || act.setState || null) : (act.setState || null);
      S.log.push(`${act.age} 岁 · ${act.log}`);
      const C = cards();
      if (act.id === "pr_origin") {
        const open = ORIGIN_OPEN[Math.floor(prng(S) * ORIGIN_OPEN.length)];
        const fam = P.family && C && C.byId[P.family] ? C.byId[P.family].text : "";
        const lb = P.leftBehind ? "\n你爸妈去了外地打工，你跟着爷爷奶奶过。电话一礼拜打一回，声音从听筒里出来，有点远。" : "";
        P.curText = (fam ? open + "\n" + fam : open) + lb;
        P.curChoices = null;
      } else if (act.temperPick) {
        P.curText = act.text;
        P.curChoices = P.temper.map((cid) => {
          const c = C && C.byId[cid];
          return { label: c ? c.name : cid, card: cid, echo: c ? `「${c.name}」——家里人后来提起你，还总这么说。` : "", effects: {} };
        });
      } else if (act.textByTrack) {
        P.curText = act.textByTrack[S.state.track] || act.textByTrack.study;
        P.curChoices = act.choices || null;
      } else if (act.eraText) {
        const era = P.eraCard && C && C.byId[P.eraCard] ? C.byId[P.eraCard].text : "";
        P.curText = era ? act.text + "\n" + era : act.text;
        P.curChoices = act.choices || null;
      } else {
        let t = act.text;
        if (act.id === "pr_child2" && P.leftBehind) t = "放学路上有一条河沟，水浅的时候能蹚过去。你和几个孩子在桥洞底下摸螺蛳，裤腿湿到膝盖，回家挨了爷爷两句，也没耽误第二天再去。";
        if (act.id === "pr_fork16" && P.itch === "out") t += "\n十五岁那年你跟家里提过的那件事，今天要定下来了。";
        P.curText = t;
        P.curChoices = act.choices || null;
      }
    }
    return { id: act.id, age: act.age, stage: stageFor(act.age), title: act.title || null, text: P.curText, choices: P.curChoices, pendingState: P.pendingState, isFork: act.id === "pr_fork16" };
  }

  // 记账并推进：调用方须先按现行顺序应用所选项的 effects / set（旗）/ setState，再调用本函数。
  // 本函数负责：性子/念头/轨道基线（温度与节奏型）记账、幕次推进、间隔平年落账。返回 { done, gapFx }（gapFx 待调用方 applyEffects）。
  function choose(S, i) {
    const P = S.prologue;
    if (!P.seq) P.seq = ACTS;
    const act = P.seq[P.idx];
    const ch = (P.curChoices || [])[i] || null;
    if (ch) {
      if (ch.card) P.temperPick = ch.card;
      if (ch.itch) P.itch = ch.itch;
      if (ch.setState && ch.setState.track) {
        const prof = rhythmProfiles();
        const tp = prof && prof.track[ch.setState.track];
        if (tp) { S.temp = tp.temp; S.rhythm = tp.rhythm; }
      }
    }
    P.idx += 1;
    P.presented = -1; P.pendingState = null; P.curText = null; P.curChoices = null;
    const nextAge = P.idx < P.seq.length ? P.seq[P.idx].age : 22;
    const gapFx = {};
    const RH = window.GAME_RHYTHM;
    const flatMute = RH && typeof S.temp === "number" ? RH.derive(S.temp, S.rhythm).volatility < 0.95 : false;
    for (let a = act.age + 1; a < nextAge; a++) {
      const f = FLATS_BY_AGE[a];
      if (!f) continue;
      S.log.push(`${a} 岁 · ${f.text}`);
      if (!flatMute) for (const [k, v] of Object.entries(f.effects || {})) gapFx[k] = (gapFx[k] || 0) + v;
    }
    S.age = nextAge;
    S.stage = stageFor(nextAge);
    if (P.idx >= P.seq.length) P.done = true;
    return { done: P.done, gapFx };
  }

  window.GAME_PROLOGUE = { acts: ACTS.concat(SIT_ACTS.half, SIT_ACTS.never), sitActs: SIT_ACTS, marks: MARKS, flatsByAge: FLATS_BY_AGE, situationW: SITUATION_W, start, present, choose, stageFor, prng };
})();
