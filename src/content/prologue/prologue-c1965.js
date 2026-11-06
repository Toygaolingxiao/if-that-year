// 《如果那年》v0.23.0 序章包：c1965（生于 1965，序章年份 1970–1986）。WP3 施工。
// 底稿：~/workspace/sim-v022/packs/prologue-c1965.js（暂存包，PACK-SPEC 验收部分原样保留）；
// 备稿：~/workspace/prologue-eras/c1965.md；规格：蓝图 §2.2、§3.2 F65-a/F65-b、§3.3 归属机制专段＋L65-家/L65-衔。
//
// ---- CALIB 头（本代设计参数登记）----
// examBand 三档分布（F65-b 小升初分层）：设计参数，无统计出处，只受阈值单调性与可玩性约束
// （蓝图 §3.2 总则②、附录 B）。精确值经 registry-wp3.js 的 examBandTables.c1965 合入：
//   school { high 35, mid 40, low 25 } / half { high 20, mid 40, low 40 }（fix3 B1 子类 3a：never 行已删——没进过校门的人不掷 band，pr_child4 另带 bandSkipSchooling 兜底）。
// band 只影响 16 岁考学路的口吻与去向口（fork16 的 band 门控 study 选项），不切选项面：
// 低档仍可选 study（回声降级），阈值单调不反转。本代 band 不管 16 岁够格面（与 F95/F00 的切面形不同，登记在此）。
// 掷定点：pr_child4（12 岁，小升初）带 rollBand 标记——现行 prologue.js 无调用点，
// 须 WP1-补/集成步按 work/wp3-prologue-patch.md 在 present() 物化点调用 PRO.rollExamBand（序章自有流，只掷一次）。
//
// ---- 顶替归属机制（L65-家，本代头号件）----
// L65-家 与 pr_teen2（15 岁）同拍两段：先由下方 quotaRule（发放规则纯函数）按拍前已立、
// 且已在场景里出现过的家庭事实定 quotaHolder，再开小应对（争/让/听，只动亲疏与记号）。
// 规则只读事实、不掷骰、不读小应对；小应对的 effects/setFact 永远写不到 quotaHolder
// （WP1 的 E4 断言＋runtime 拦截双保险）。quotaRule 的落码调用点同样见 wp3-prologue-patch.md：
// present() 物化 pr_teen2 时，若本局立了 famRetire65（退休变体已在场景里把事实摆出），
// 调用 quotaRule(collectQuotaFacts(S)) 并 setFact quotaHolder、按 textByQuota/echoByQuota 取文。
// 输入事实的场景来源（全部拍前已立）：
//   sibAway65    L65-衔（pr_fam_sentdown65，10 岁）变体：兄姐下乡未归、未在乡成家
//   sibBack65    L65-衔变体：兄姐已返城、待业等招工
//   sibMarried65 L65-衔变体：兄姐已在乡成家（不在可顶替之列，规则里显式排除）
//   sibNone65    L65-衔变体：兄姐无待业/下乡情形（或独生，cf_11 经 notFamily 过滤只发此款）
//   famRetire65  pr_teen2 变体：父母一方办退休/退职，单位顶替表已发下
//   famWorking65 pr_teen2 变体：父母离退休还早（→ 规则第 (4) 条：本拍不触发，quotaHolder 保持 absent）
// 优先级序（蓝图 §3.3 写死）：(1) 下乡未归未成家兄姐 → sibling；(2) 返城待业兄姐与本人按子女
// 排序取年长待业者；(3) 皆无 → mine；(4) 父母未到退休退职 → 不触发（返回 null）。
//
// ---- SOURCES 段（本代新写入数字/制度年份逐条登记，证据档位同调查报告三档）----
// [硬] 顶替成文：1978 年 6 月两个《暂行办法》，父母退休退职、子女一名进原单位、一家只进一个
//      （调查报告 §6 c1965 第 1/2 条，顶替制度史口径）；1978–83 年子女顶替约 900 多万人（同上）。
// [硬] 已在当地结婚的下乡知青不在可顶替之列（调查报告 §6 c1965 第 2 条，多源一致细则）。
// [硬] 小升初选拔恢复：1977–78 年小学毕业考试与初中选拔恢复，重点/普通分层自本代成型
//      （调查报告 §6 c1965 第 3 条）；升学率 1978 年 87.7%→1980 年 75.9% 只作背景，不入文案数字。
// [硬] 分田到户：事件轴登记 [1978,1984] 背景（蓝图 §八 8.1）；fork16 home/work 回声沿暂存包原句。
// [硬] 下岗潮：事件轴登记 [1995,2002] 本体、峰值 1998（蓝图 §八 8.1）；本人下岗链（era 包
//      e65_060–062）是本代 33–38 岁「立业格」格文案，回改键位登记见 logs/wp3.md。
// [红线] 1977 年高考录取率约 4.8% 是 c1955 那一届的数，不许安给本代——本包与本代 era 包
//      文案零使用（验收扫描断言 "4.8" 不出现，见 scripts/wp3-scan.js）。
// [设计参数] examBand 分布见上 CALIB 头，无统计出处，不许标「锚自升学率」。
//
// ---- 幕序表（本代自断言，口径＝WP0 总账 C1 裁定＋蓝图 §3.6 幕数相容）----
// 主幕 12（origin/child1–4/teen1/teen2/fork16/y17/y18/y20/y21）＝school 形基线 12；
// half/never 形另加处境幕 3 ＝15。随时池每局呈现 ≤2（L65-衔＋搬家）：第一幕替代当年平年幕位
// （净 0）、第二幕用家庭拍增量（净 +1）——逐形封顶 13/16/16＝基线＋1，与 §3.6 写死口径一致。
// L65-家 与 pr_teen2 同拍（+0，不入池，属分岔机械）；F65-b 落 pr_child4 拍内（+0）。
// 池触发权重（设计参数，无统计出处）：衔 0.35/岁（窗 7–15，另有保底 15 兜事实）、搬家 0.055/岁（窗 5–15）。
// 分根集成预留（§七评审后薄集成，本轮不写锚点段）：分岔拍 id＝pr_fork16（顶替形，选择分根），
// 结果文案位置＝pr_fork16 各选项 echo；登记随 registry-wp3.js 的 prologueForks 行预留。
(function () {
  "use strict";
  window.GAME_PROLOGUE_PACKS = window.GAME_PROLOGUE_PACKS || {};

  // 顶替名额发放规则（纯函数，无副作用、不掷骰）：facts 全部来自拍前已立的场景事实。
  // facts: { parentRetiring, sibAway, sibMarried, sibBackElder, sibBackYounger }
  //   sibAway＝下乡未归且未成家的兄姐；sibMarried＝下乡兄姐已在乡成家（与 sibAway 互斥，
  //   且即便家中另有说法，成家者一律不计入可顶替之列）；sibBackElder/sibBackYounger＝
  //   已返城待业的兄姐/弟妹。返回 "sibling" | "mine" | null（null＝本拍不触发）。
  function quotaRule(facts) {
    if (!facts || !facts.parentRetiring) return null; // (4) 无人够格接：父母未到退休退职
    if (facts.sibAway && !facts.sibMarried) return "sibling"; // (1) 下乡未归未成家兄姐
    if (facts.sibBackElder) return "sibling"; // (2) 返城待业者中取年长者：兄姐在本人之前
    if (facts.sibBackYounger) return "mine"; // (2) 待业者只剩本人与弟妹：本人年长
    return "mine"; // (3) 皆无
  }
  // 从序章状态收集规则输入（集成步在补丁里调用；写在这里保证收集口径与规则同源）。
  function collectQuotaFacts(S) {
    const F = (S && S.flags) || {};
    return {
      parentRetiring: !!F.famRetire65,
      sibAway: !!F.sibAway65,
      sibMarried: !!F.sibMarried65,
      sibBackElder: !!F.sibBack65,
      sibBackYounger: !!F.sibBackYounger65,
    };
  }

  window.GAME_PROLOGUE_PACKS.c1965 = {
    quotaRule,
    collectQuotaFacts,
    originOpen: [
      "你出生那年，家里住的是单位分的平房，一间半。你妈说你生在清早，她坐月子那几天，你爸天天下了班去副食店排队，买回来半斤红糖。",
      "你出生在村里。你奶奶说，你落地那会儿，队里的喇叭正响，满院子都听得见。她用小被把你裹好，放在炕头，说这孩子哭声亮，身体结实。",
      "你出生那年，家里添了台缝纫机，是你妈置办下的。你小时候的衣裳，都是在那台机子上踩出来的，边角料给你拼了个书包，背了很多年。",
      "你上头有个姐姐。你出生那天，你爸骑车去公社卫生院请大夫，回来时车胎还扎了。你姐趴在窗台上看了你半天，说你小得跟猫似的。",
    ],
    // fix3 B1（子类 1a/1b）：开场白场景标签与手足断言登记（与 originOpen 同序）——第 4 款断言姐姐。
    originOpenSetting: ["urban", "rural", null, null],
    originOpenAssert: [null, null, null, { siblings: "elderSister" }],
    originLB: "你爸去了外地做工，你跟着爷爷奶奶过。家里有事，就去大队部打长途，排到了也说不上几句，话筒里的声音远得很。",
    marks: {
      mark_pencil65: { shadow: "两条路上都一样的是，你那支只剩个头的铅笔一直用到小学毕业，最后短得捏不住，才收进抽屉。" },
      mark_eraser65: { shadow: "两条路上都一样的是，同桌那块三角橡皮的样子你记了半辈子，后来再没见过一模一样的。" },
      mark_river65: { shadow: "两条路上都一样的是，去学校那条路你走了好几年，小河上的桥修了又修，你个子也一年比一年高。" },
      mark_hoop65: { shadow: "两条路上都一样的是，你那只铁环后来挂在仓房墙上锈住了，取下来滚，声音还是当年的声音。" },
      mark_movie65: { shadow: "两条路上都一样的是，那场电影里有句台词你记了半辈子，后来在电视上重看到，开口就能接上。" },
      mark_wheat65: { shadow: "两条路上都一样的是，你拾麦穗用的那只小篮子后来装过针线，篮底还粘着两粒没抖干净的麦子。" },
      mark_books65: { shadow: "两条路上都一样的是，你老师讲台上那摞擦干净的课本，你后来想起来，还觉得那是件大事。" },
      mark_tv65: { shadow: "两条路上都一样的是，你头一回看电视站的那户人家，后来搬走了，你路过那扇窗户还要看一眼。" },
      mark_tree65: { shadow: "两条路上都一样的是，小学门口那棵老槐树还在，修鞋摊换成了摊主的儿子在守。" },
      mark_table65: { shadow: "两条路上都一样的是，那年饭桌上碗筷的数目变过一回，你后来摆碗时，还会先数一遍人头。" },
      mark_desk65: { shadow: "两条路上都一样的是，小升初前家里给你腾的那张桌子，后来一直摆在窗边，你回家还坐那儿。" },
      mark_dawn65: { shadow: "两条路上都一样的是，那阵子你天不亮就起来背书，窗纸一点点发白的样子，你记了半辈子。" },
      mark_movebox65: { shadow: "两条路上都一样的是，搬家那天你捆的那箱小人书，后来一直摆在你手边的架子上。" },
      mark_move65: { shadow: "两条路上都一样的是，你认路快——新地方住下没几天，哪条路通到哪儿，你总是头一个摸熟。" },
    },
    flatsByAge: {
      6: { text: "六岁那年，你学会了自己系鞋带。红鞋带是你姐退下来的，你系得慢，可从那天起，出门不用人帮了。", effects: {},
        textByFact: { siblingForm: { only: "六岁那年，你学会了自己系鞋带。鞋带是你妈拆了旧布条搓的，你系得慢，可从那天起，出门不用人帮了。" } } },
      8: { text: "这一年，你家买了个暖水瓶，红的，印着牡丹花。你妈说这是贵重东西，只许大人倒水。你偷偷摸过一回瓶身，烫得缩回了手。", effects: {} },
      10: { text: "十岁那年，村里拉上了电线，队屋先亮了灯。你站在门口看了半天，觉得那灯比煤油灯亮十倍，回家还惦记自家啥时候能安上。", effects: {} },
      14: { text: "初二这一年，你的个子往上蹿，裤腿短了一截。你妈把你爸的旧裤子改了给你，腰上多收了两针，你穿着去上了学。", effects: {},
        // fix4（序章四修）：never 分文——13 岁明写没进过校门的人，14 岁不许再「穿着去上了学」
        // （第④段盲审 S4-7 本条）；留守形同步改处境中性（旧形同带上学句，留守×never 同命中时穿帮）。
        // 注：本代留守只走父亲（originLB），母亲在场合法，never 文保留母亲改裤。
        textBySchooling: { never: "十四岁这一年，你的个子往上蹿，裤腿短了一截。你妈把你爸的旧裤子改了给你，腰上多收了两针，你穿上正好，下地干活也不碍事。" },
        textByLeftBehind: "十四岁这一年，你的个子往上蹿，裤腿短了一截。奶奶把压箱底的一条旧裤子改了给你，腰上多收了两针，你穿上正好。" },
      19: { text: "这一年过得平。你攒钱买了块电子表，夜里能发光。你没事就按着看，觉得稀奇，睡觉都舍不得摘。", effects: {} },
    },
    acts: [
      { id: "pr_origin", age: 5, log: "家里是这样开始的", setState: { schooling: "school" },
        setStateBySit: { half: { schooling: "half" }, never: { schooling: "never" } },
        text: "" },
      { id: "pr_child1", age: 7, log: "开学第一天",
        variants: [
          { key: "pencil", log: "开学第一天", set: "mark_pencil65", mark: "mark_pencil65", setting: "rural",
            text: "村小是复式班，一个老师教两个年级。你坐在后排，练习本头一页写名字，字歪，你描了三遍。你的铅笔只剩个头，还舍不得扔。" },
          { key: "eraser", log: "开学第一天", set: "mark_eraser65", mark: "mark_eraser65", setting: "factory",
            text: "你家楼下就是子弟小学。开学第一天，你自己背着书包去，点名时答「到」的声音最大。同桌是转学来的，橡皮是三角形的，你头一回见。放学时你们约好，明天楼门口见。" },
          { key: "river", log: "开学第一天", set: "mark_river65", mark: "mark_river65", setting: "rural",
            text: "学校离家三里地，中间过一条小河，涨水就得绕桥。头一天上学，你妈送你到河边，看你过了桥，站了好一会儿才回去。哪块石头滑，你都记下了。",
            // fix4（序章四修）：留守形——本代留守只走父亲，送你过河的是爷爷（变体 textLB 通用化后生效）。
            textLB: "学校离家三里地，中间过一条小河，涨水就得绕桥。头一天上学，爷爷送你到河边，看你过了桥，站了好一会儿才回去。哪块石头滑，你都记下了。" },
        ] },
      { id: "pr_child2", age: 9, log: "滚铁环",
        variants: [
          { key: "hoop", log: "谁先到老槐树", set: "mark_hoop65", mark: "mark_hoop65", setting: "rural",
            text: "放学路上滚铁环比赛，谁先滚到村口老槐树谁赢。你的环是你爸托人焊的钢筋圈，滚起来哗啦响，老远就知道是你来了。那天你赢了全场。" },
          { key: "movie", log: "占座", set: "mark_movie65", mark: "mark_movie65", setting: "rural",
            text: "放映队来村里放电影，大队包场，不卖票，幕布挂在场院里，两面都能坐人。你早早搬小板凳占了地方。没去成的奶奶问起，你从头讲给她听。" },
          { key: "wheat", log: "拾麦穗换画书", set: "mark_wheat65", mark: "mark_wheat65", setting: "rural",
            text: "麦收以后，你跟几个孩子去地里拾麦穗，拾满一篮，换来两分钱。村口的租书摊，厚的连环画两分、薄的一分，你坐在小板凳上看了一下午，摊主都认识你了。" },
        ] },
      // L65-衔已按蓝图 §3.6 换算入池（见 pack.pool 首条）：窗 7–15、保底 15，不再占固定幕位。
      { id: "pr_child3", age: 11, log: "性子", temperPick: true, consumesTextCell: true,
        // 选幕制片一：旧 texts[] 退役、换幕框（present 的 temperPick 支定框）。
        // consumesTextCell＝基线 texts[] 物化在本拍消费序章流一格，本拍仍消费一格对齐此后全部掷定（框由纯函数定，不用其值）。
        frames: [
          { name: "过年那天", text: "过年那天，亲戚挤了一屋子。炉子上坐着水壶，窗玻璃全是哈气。桌上难得见荤腥，大人的筷子都往孩子碗里伸。" },
          { name: "院里摆席那天", text: "院里一户人家办满月酒，席摆在楼下空地上，几家的大桌子拼在一起。天擦黑才开席，灯泡从二楼拉下来，照得一地亮。" },
          { name: "放电影那天", text: "队里来放电影，晒场上早早挂起幕布。一村人吃完饭就往那儿聚，大人占了后排说话，孩子在幕布前后乱窜。" },
        ],
        choices: [] },
      // child4 变体序：tree 款置首——never 覆写（路过校门口）强制对齐首款记号，照 c2000 母本口径。
      // F65-b 落本拍：rollBand 标记＝小升初考试在本拍内落定（掷定点见文件头 CALIB 与补丁稿）；
      // 小选是复习条件（effects 小、立记号），band 的消费点在 pr_fork16 的 study 选项门与回声。
      { id: "pr_child4", age: 12, log: "校门口的老槐树", rollBand: true, bandSkipSchooling: ["left", "never"],
        variants: [
          { key: "tree", log: "老槐树", set: "mark_tree65", mark: "mark_tree65",
            text: "小学门口有棵老槐树，树下有个修鞋摊。你毕业那年，学校要修围墙，树留不留争了一阵，后来留下了，修鞋摊挪到墙根另一头。你问大爷还来不来，他说，来，摊子在哪我在哪。" },
          { key: "books", log: "老师把书搬出来了", set: "mark_books65", mark: "mark_books65",
            text: "那年秋天，广播里说恢复高考了。老师把落了灰的课本搬出来，擦干净，码在讲台上。回乡的大青年天天来借书。你帮着擦，翻了翻高年级的课本，记住了书又值钱了。" },
          { key: "tv", log: "九寸电视", set: "mark_tv65", mark: "mark_tv65",
            text: "邻居家买了台九寸黑白电视。天一黑，半条巷子的人都挤去看。你头一回站在人堆最后头，踮脚看了一整晚。后来你帮着搬凳子、倒水，混上了前排。" },
        ],
        choices: [
          { label: "家里给腾了张桌子，安静复习", effects: { growth: 1 }, set: "mark_desk65",
            echo: "桌子靠着窗，你在那儿把课本从头到尾过了一遍，心里有了点底。" },
          { label: "起早贪黑，自己挤时间背书", effects: { growth: 1 }, set: "mark_dawn65",
            echo: "你早上起来背书，嗓子哑了两天，你妈给你冲了碗糖水，放在桌边。",
            // fix4（序章四修）：留守形回声——冲糖水的是奶奶（echoLB 全幕统一通道）。
            echoLB: "你早上起来背书，嗓子哑了两天，奶奶给你冲了碗糖水，放在桌边。" },
        ] },
      { id: "pr_teen1", age: 13, log: "升初中", logBySchooling: { never: "十三岁", left: "十三岁" }, eraText: true,
        variants: [
          { key: "dorm", text: "升初中那年，学校在公社，离家远了，你开始住校。铺盖卷好，米和粮票交到食堂，蒸饭的笼屉上贴着你的名字。你和同村的伴儿分过一回桃酥，被说了一学期。",
            textBySchooling: { never: "升初中那年，村里的孩子去公社上学，离家远，要住校。开学前一晚，他们在家收拾铺盖卷。你帮着把一个人的被子捆好，站在院门口看他们商量谁跟谁一个宿舍。" } },
          { key: "backteam", text: "一起毕业的，有一半没再念，回队里帮工。开学那天你在村口碰见他们扛着锄头下地。你说，等放假回来还一块玩。他笑笑：行，你别嫌地里活脏。",
            textBySchooling: { never: "一起长大的，有一半去了公社初中，一半回队里帮工。你没进过校门，放牛、砍柴，日子照旧。他说，等放假回来还一块玩。你笑笑：行，你别嫌地里活脏。" } },
        ] },
      // L65-家（15–18 家庭拍）与 pr_teen2 同拍两段：变体先把事实摆到场景里——
      // retire 款：父母办退休、顶替表发下（立 famRetire65）；working 款：父母离退还早（立 famWorking65，
      // 归属规则第 (4) 条，本拍不触发顶替、只呈普通少年拍）。归属由 quotaRule 在物化点定（见文件头），
      // textByQuota/echoByQuota 是按归属取的事实链呈现（集成步经补丁消费；未定归属时回落 text/echo）。
      // 小应对在归属既定之后：争/让/听，只动 relation/wisdom ±1 与记号，绝不动 quotaHolder。
      { id: "pr_teen2", age: 15, log: "十五岁，家里商量大事", familyBeat: true, familyFact: "famQuota65", quotaBeat: true,
        text: "十五岁那年，家里有件大事要商量。你坐在饭桌边上，头一回觉得，大人的账，也压到你肩膀上了一点。",
        textByQuota: {
          mine: "你爸退下来的手续办完了，单位只给一个顶替名额。能接的人里，你年纪正够，手续也齐。爸把表推到你面前：这个名额，给你。",
          mineMarried: "你爸退下来的手续办完了，单位只给一个顶替名额。你哥在乡下成了家，这个班他接不了。爸把表推到你面前：这个名额，给你。",
          siblingAway: "你爸退下来的手续办完了，单位只给一个顶替名额。外头那个下乡几年还没回来，年纪、手续都对得上。爸把表收进抽屉：先紧着他。",
          siblingBack: "你爸退下来的手续办完了，单位只给一个顶替名额。你姐返城半年了还没等到招工，年纪、手续都对得上。爸把表收进抽屉：先紧着她。",
          none: "你爸的手续还没办完，顶替的表也没发下来。饭桌上提了一句，又放下了：这事今年定不了，先各过各的日子。",
        },
        echo: "那顿饭吃完，碗筷收进碗柜，日子照常往下过。",
        echoByQuota: {
          mine: "名额给了你——爸先退下来，你接了他的班。",
          siblingAway: "名额给了你哥——他下乡几年还没回来，爸先退了，家里先紧着他。",
          siblingBack: "名额给了你姐——她返城待业半年了，爸先退了，家里先紧着她。",
          none: "那年没定成名额的事，家里谁也没再提。",
        },
        variants: [
          { key: "retire", log: "十五岁，家里商量大事", set: "famRetire65",
            text: "十五岁那年，你爸把退休的手续办了，单位的顶替表发下来，只给一个名额。晚饭桌上，这事头一回摆到明面上商量，你也在桌边坐着。" },
          { key: "working", log: "十五岁的念头", set: "famWorking65",
            text: "十五岁那年，你开始想一件事：接着念，考出去；还是早点下来，帮家里把日子撑起来。你爸离退还早，家里的账，你也清楚。" },
        ],
        choices: [
          { label: "当面争了一回，把话说透", effects: { relation: -1 }, set: "famSpeak65",
            echo: "那晚没人给你盛饭，你自己盛的。隔壁屋的门，关得比平时响了一声。" },
          { label: "把话咽回去，先顾全家里", effects: { relation: 1 }, set: "famYield65",
            echo: "你爸看出来了，第二天给你订了双过冬棉鞋，说家里别的地方补你，这话当场落了地。" },
          { label: "听爸妈的，没吭声", effects: { wisdom: 1 },
            echo: "你回屋收拾了书包。第二天照常出门，只是那天的晚饭，你吃得格外慢。",
            echoLB: "你回屋躺下，没睡着。第二天照常出门，只是那天的晚饭，你吃得格外慢。" },
        ] },
      // fork16 本代形（F65-a）：study 按 examBand 分口（high/mid 各含中专形、low 降级口吻）；
      // work 两形：顶替进厂形仅 quotaHolder=mine 亮（专属形），等招工形不设门——归属给兄姐/无人可顶/
      // 规则未触发的局里它是唯一的 work 形，mine 的局里与进厂形并列（拿着名额也可以不接这个班去等
      // 招工，是家里另有安排时的真实选项）。requiresFact 不许写 absent（validate-state 口径：absent 是
      // 缺省读法、不是一个值），故不靠 absent 门、也不设 absent 兜底单——本片（S-3）以归属/掷档补丁
      // 合并为上线前提，无补丁呈现不在支持面内。名额给了兄姐者，顶替路不亮——事实链已在 pr_teen2 的
      // textByQuota/echoByQuota 里摆过，不另发通知句；本拍不带 gateNote（默认不提门）。
      { id: "pr_fork16", age: 16, title: "16 岁 · 往哪条道上走", log: "初中毕业，分了道", logBySchooling: { never: "分了道", left: "分了道" },
        text: "初中毕业。这个夏天过后，一块儿玩的那些人要散到不同的地方去了。你得选一条道，先走起来。",
        textBySchooling: {
          never: "这个夏天过后，一块儿玩的那些人要散到不同的地方去了。你的日子没在学校里过，往下这条道，也得选一条先走起来。",
          left: "这个夏天过后，一块儿玩的那些人要散到不同的地方去了。你的书已经放下了，往下这条道，也得选一条先走起来。",
        },
        choices: [
          { label: "接着考学，去念高中", setState: { track: "study" }, setFact: { studyForm: "putong" }, requiresFact: { examBand: "high" }, requiresState: { schooling: ["school", "half"] }, effects: { growth: 2 },
            echo: "榜放出来那天，你的名字在前头。你妈放了一小挂鞭炮，说这一步，算是迈出去了。" },
          { label: "读中专，包分配的那种", setState: { track: "study" }, setFact: { studyForm: "zhongzhuan" }, requiresFact: { examBand: "high" }, requiresState: { schooling: ["school", "half"] }, effects: { growth: 2 },
            echo: "中专的录取信到家，你爸把信读了两遍：这一步迈出去，户口和饭碗都有了着落。" },
          { label: "接着考学，去念高中", setState: { track: "study" }, setFact: { studyForm: "putong" }, requiresFact: { examBand: "mid" }, requiresState: { schooling: ["school", "half"] }, effects: { growth: 2 },
            echo: "你考上了普通高中。学校远了些，家里给你买了辆旧自行车，擦得锃亮。" },
          { label: "读中专，早点定下来", setState: { track: "study" }, setFact: { studyForm: "zhongzhuan" }, requiresFact: { examBand: "mid" }, requiresState: { schooling: ["school", "half"] }, effects: { growth: 3 },
            echo: "中专的名额争的人多，你赶上了末一班。家里商量了一晚，说这条路稳当。" },
          { label: "接着考学", setState: { track: "study" }, setFact: { studyForm: "putong" }, requiresFact: { examBand: "low" }, requiresState: { schooling: ["school", "half"] }, effects: { growth: 3 },
            echo: "分数只够普通口的学校。你还是去了，报到那天把行李捆得紧紧的，没回头。" },
          { label: "打听补录的口子，再回学校", setState: { track: "study" }, setFact: { studyForm: "zhongzhuan" }, requiresState: { schooling: ["left"] }, effects: { growth: 2 },
            echo: "你跑了两趟学校，先补考，再报名，赶在开学前把学籍续上了。落下的课，得自己一页一页追。" },
          { label: "顶替进厂，接爸的班", setState: { track: "work" }, set: "took_quota65", requiresFact: { quotaHolder: "mine" }, effects: { money: 3 },
            echo: "报到那天你穿着爸的旧工装，袖口长了一截。车间主任说，你爸的手艺，你得接得住。" },
          { label: "等招工的信儿", setState: { track: "work" }, effects: { money: 2 },
            echo: "你在家等了些日子，招工的信儿来了又黄。后来总算有了个去处，先干着再说。" },
          { label: "学一门手艺", setState: { track: "craft" }, effects: { growth: 1, money: 1 },
            echo: "你报了技校。报名那天，你把专业那一栏填得很慢，一笔一画。师傅还没见着，工具先领了一套。" },
          { label: "留在家里种地", setState: { track: "home" }, effects: { relation: 1, money: -1 },
            echo: "分田到户那年，你家分了几亩地。你爸蹲在地头抽了半宿烟，说，这地往后就是自家的了，得经管好。你点了点头，心里有点发热。" },
        ] },
      { id: "pr_y17", age: 17, log: "十七岁",
        textByTrack: {
          study: "高二这一年，班里开始分快慢。晚自习停电是常事，你们点着蜡烛做题，蜡油滴在课本上。老师说，你们赶上了好时候。",
          work: "田分到户了。你白天种自家的地，农闲跟着村里人去县城盖房，拌灰、搬砖，一天一块五。你把钱交给你妈，她数了两遍。",
          craft: "学手艺第二年，师傅让你独立接活了。头一回给人家修好拖拉机，队长当场给你记了双倍工分，还留你吃了顿饭，饭桌上夸了你两回。",
          home: "分田这一年，你成了家里的主劳力。种子、化肥都得自己买，你蹲在供销社门口算了半天账，买了两袋化肥，先紧着好地用。",
        },
        factAlt: { fact: "studyForm", texts: {
          zhongzhuan: "中专第二年，你穿的还是学生装，可家里人看你的眼神不一样了——这一步迈出去，户口和饭碗都有了着落。你把课本看得格外认真。",
        } },
        tail: "你给自己留了个小目标，写在日记本最后一页，写完就合上，谁问也不给看。",
        choices: null },
      { id: "pr_y18", age: 18, log: "十八岁",
        textByTrack: {
          study: "高考那年热得邪乎。考场在县中，扇子声响成一片。你考完最后一门，骑车往家走，一路上想：考不上，再补一年，家里供不供得起。",
          work: "这一年，村里出去的人多起来。有人去了南边工地，回来穿了件的确良衬衫，说话带了外地腔。你动了心，又想起地没人种，先按下了。",
          craft: "你快出师了。公社的机修站招人，你去报了名，师傅替你写了推荐信。出门那天，他把自己的旧工具箱给了你，说里头的东西，比新的顺手。",
          home: "这一年收成不错。你家卖了余粮，添了台缝纫机。集市上有人开始摆摊卖衣裳，你站着看了一会儿，心里盘算自家能不能也干点什么小的。",
        },
        factAlt: { fact: "studyForm", texts: {
          zhongzhuan: "中专快毕业了，分配去向还没定。你们宿舍里天天猜，谁能留城、谁回县里。你把那张表格填了又填，字写得比考试还认真。",
        } },
        tail: "成年这天，你给自己煮了碗面，卧了个鸡蛋，连面汤都喝干净了。",
        choices: null },
      { id: "pr_y20", age: 20, log: "二十岁",
        textByTrack: {
          study: "大学第三年。你在图书馆抢座位，早上六点去排队。家里寄来的钱和粮票，你省着花。同学里有人开始打听出国的事，你听了听，没往心里去。",
          work: "你还是去了南方。工地是老乡介绍的，一个月挣的，顶在家里小半年。过年回家，你给你爸带了台双卡录音机，他嘴上说浪费，摆弄了一晚上没撒手。",
          craft: "你的手艺在县里出了点名气。这一年你带了第一个徒弟，是亲戚家的孩子。你教他的时候想起自己的师傅，话都不自觉地学他，连停顿都像。",
          home: "你成了村里头一批「专业户」：包下几亩果园，年景好的时候，收入比上班的还强。有人来取经，你把账本摊开给他看，说这里头没有巧，靠算。",
        },
        factAlt: { fact: "studyForm", texts: {
          zhongzhuan: "中专毕业，分配到了单位。你穿上工装那天，你妈把你的学生装叠好，收进箱底。头一个月工资发下来，你先给家里寄了一半。",
        } },
        choices: [
          { label: "挣的钱先存起来，存折上的数慢慢往上涨", effects: { money: 2 }, echo: "存折你藏在抽屉最里面，数到整数时，心里会稳一下。" },
          { label: "挣的钱先紧着家里，剩下的才是自己的", effects: { relation: 2, money: -1 }, echo: "你妈收下钱，转头给你买了双新鞋，说旧的那双早该扔了。" },
        ] },
      { id: "pr_y21", age: 21, log: "二十二岁前夜",
        textByTrack: {
          study: "毕业分配在即。去哪儿由不得自己挑，志愿表填了又改。宿舍里的人一个个都有了去向，散伙饭约了一回又一回，吃到后来都不说话了。",
          work: "二十一岁，你在城里落了脚，租了间小屋。老乡说你算站住了。你想的是，再干两年，攒够钱，是回村盖房，还是就留在这边。",
          craft: "二十一岁，你在行里站住了。有人劝你自己开个修理铺，租个门面。你算了算本钱，心里有了主意，还没跟家里说，想等准了再开口。",
          home: "二十一岁，村里给你介绍对象的人多起来。果园里的活离不开人，你心里清楚，往后的路多半围着这片地转——可这日子，是你自己选的，你认。",
        },
        factAlt: { fact: "studyForm", texts: {
          zhongzhuan: "进了单位第二年，你算站住了。带你的师傅说你手稳，车间里有活先想起你。宿舍是八个人的，你的床靠窗，窗台上摆着一盆葱。",
        } },
        choices: null },
      // —— 童年深度一期（2026-11-06）：6/8/10 岁补固定幕，追加在 acts 末尾（旧下标不动，同 c1955 注）。
      { id: "pr_kid6_65", age: 6, log: "看小鸡",
        text: "开春，母鸡孵出一窝小鸡，毛茸茸，黄澄澄。家里把看鸡的活交给你：猫来了，你得撵。你搬个小板凳坐到院门口，坐得屁股发麻，一下午没挪窝。",
        textLB: "开春，母鸡孵出一窝小鸡，毛茸茸，黄澄澄。奶奶把看鸡的活交给你：猫来了，你得撵。你搬个小板凳坐到院门口，坐得屁股发麻，一下午没挪窝。",
        choices: [
          { label: "坐到天黑，小鸡一只没少", effects: { growth: 1 }, echo: "数到最后一只，正好。大人说，这孩子坐得住，是个干活的料。" },
          { label: "跟小伙伴疯跑了一圈，回来先数鸡", effects: {}, echo: "一只不少，你长出一口气。板凳却不知道被谁坐走了。" },
          { label: "把小鸡圈在爷爷留下的老院里看着", requiresFamily: "cf_04", effects: { relation: 1 }, echo: "老院墙高，猫进不来。你靠着枣树，还眯了一小觉。" },
        ] },
      { id: "pr_kid8_65", age: 8, log: "学骑车",
        text: "家里那辆二八车，比你还高出一头。你推着它到打谷场，左脚踩上脚蹬，右腿从横梁底下钻过去。骑出去没几步，连人带车歪进了草垛。",
        choices: [
          { label: "把车扶起来接着练，傍晚能歪着骑一圈了", effects: { growth: 1 }, echo: "裤腿蹭满了灰。你推车回家那一路，走得比谁都神气。" },
          { label: "推回家，说等腿长长了再学", effects: {}, echo: "车又靠回墙根。你路过它，总忍不住伸手拨一下车铃。" },
          { label: "让你爸把车座往下放一截，再接着练", requiresFamily: "cf_03", effects: { relation: 1 }, echo: "车座放下来，脚能够着地了。扳手你爸递给你，让你自己拧。" },
        ] },
      { id: "pr_kid10_65", age: 10, log: "头一回进城",
        text: "你跟着家里大人去县城。班车晃了两个钟头，你晕得脸色发白。车一停，你又活过来了：百货大楼有三层楼高，柜台隔着玻璃，里头的东西看得见，摸不着。",
        choices: [
          { label: "在大楼里转了一圈，什么也没买，眼睛看饱了", effects: {}, echo: "回去的车上，你把看见的东西一样一样讲，讲了一路。" },
          { label: "拿攒下的钱买了本画书，抱了一路", effects: { growth: 1 }, echo: "画书抱在怀里，车再晃也不晕了。到家你先把手洗干净，才敢翻第一页。" },
          { label: "先去厂里找你爸，在厂澡堂洗了个澡再逛", requiresFamily: "cf_05", effects: { relation: 1 }, echo: "厂澡堂的水真热乎。洗完出来，你爸领你去食堂，打了份红烧肉。" },
        ] },
    ],
    // ===== 童年随时事件池（蓝图 §3.6；调度归集成步，本包只给条目数据，调度规格见 work/wp3-prologue-patch.md 补丁 3）=====
    // 共同纪律：familyBeat 同源（小应对只动亲疏/智慧 ±1＋记号，当场见后果）；长尾只落学籍线/亲疏/记号；
    // 一条一局至多呈现一次；全池每局呈现 ≤2、净增 ≤+1（替代/插入账见补丁 3）。条目顺序即调度优先级：
    // 事实供给条目（带保底）在前，旗舰在后。
    // 触发权重＝窗内逐年触发概率，设计参数、无统计出处（§3.6 第 2 件登记口径）。
    pool: [
      // L65-衔（池形态）：兄姐下乡/返城事实供给条目。窗 7–15、权重 0.35/岁、保底 15（窗内未触发则 15 岁
      // 必呈现于 pr_teen2 之前——保事实被呈现，不保形态，以当段变体呈现）。事实维＝四款变体（互斥、恰立
      // 其一），是 L65-家归属规则的场景来源；阶段维＝段文本（低龄 7–9／中段 10–13／临考 14–15）：
      // away/back 三段全写；married/none 两段（正文兼低龄/中段＋临考段专文）——并段理由：家信与「无事」
      // 两款的质地在 7–13 岁间无实质差别（孩子对一封信的读法不随这几年变），临考段因紧邻归属拍而另写。
      { id: "pr_fam_sentdown65", window: [7, 15], weight: 0.35, guaranteeAge: 15, supplyFor: "quotaRule",
        act: { log: "饭桌上的碗筷", familyBeat: true, familyFact: "famSentdownEcho",
          echo: "后来你想起那年，头一个想起的总是饭桌——少了一副碗筷，或者多了一副。",
          text: "那年家里的大事，都摆在饭桌上。",
          variants: [
            { key: "away", log: "饭桌上少一副碗筷", set: "sibAway65", notFamily: ["cf_11", "cf_06"],
              text: "你哥下乡三年了，没回来过。晚饭桌上他那副碗筷还摆在你妈手边，谁也不去动。你妈盛汤，先往那只空碗里添一勺，又慢慢倒回去。",
              stageText: {
                low: "你哥下乡那年你还小，只记得走那天他摸了摸你的头。晚饭桌上他那副碗筷还摆着，你妈盛汤，先往空碗里添一勺。你问哥什么时候回来，没人答得上来。",
                exam: "你哥下乡快五年了。晚饭桌上他那副碗筷还摆在你妈手边。你大了，知道这副碗筷空着，家里有些事就悬着——明年你初中毕业，路怎么走，多少跟它连着。",
              } },
            { key: "back", log: "饭桌上多一副碗筷", set: "sibBack65", notFamily: ["cf_11"],
              text: "你姐返城半年了，招工的信儿还没来。晚饭她帮着摆碗筷，摆到自己那副，顿了一下，还是摆上了。白天她多半坐在窗边补衣裳。",
              stageText: {
                low: "你姐回来了，铺盖卷就堆在堂屋角上，白天出去找活，晚上回来。你帮着摆碗筷，摆到她那副，心里高兴——桌上的人齐了，就是饭要多煮一碗。",
                exam: "你姐返城快一年了，招工的信儿还是没来。晚饭她帮着摆碗筷，手脚比从前慢。你想起明年就轮到自己毕业，心里掠过一个念头，又赶紧压下去了。",
              } },
            { key: "married", log: "一封家信", set: "sibMarried65", notFamily: ["cf_11", "cf_06"],
              text: "你哥在乡下成了家，信里说嫂子人勤快，孩子都会走了。你妈把信读了三遍，晚饭多炒了个鸡蛋，说就当给他们添的，隔着这么远。",
              stageText: {
                exam: "你哥在乡下成了家，孩子都满地跑了。信还是按月来，你妈看完收进柜子。晚饭多炒了个鸡蛋，你知道，明年自己的路，家里得另作打算了。",
              } },
            { key: "none", log: "饭桌上的碗筷", set: "sibNone65",
              text: "你家这年没什么大动静。晚饭桌上碗筷齐整，你帮着摆碗，数了一遍人头，一个不多，一个不少。你妈说，齐齐整整的，就是好日子。",
              stageText: {
                exam: "你家这年没什么大动静，碗筷齐整。你妈说，齐齐整整就是好日子。你应着，心里却在算另一笔账：明年毕业，自己的路该怎么走。",
              } },
          ],
          choices: [
            { label: "抢着摆碗筷、盛饭", effects: { relation: 1 }, set: "mark_table65",
              echo: "那晚你盛的饭，你妈吃得比平时多半碗，说今天的饭香。" },
            { label: "跑出去玩，喊了三遍才回来", effects: {},
              echo: "你回来时饭菜都摆好了，没人说你，只给你留了块最大的红薯，你蹲在门槛上吃完。" },
            { label: "问了一句，往后过年还齐不齐", effects: { wisdom: 1 },
              echo: "大人停了筷子，没答上来。那顿饭的后半截，吃得格外安静。" },
          ] } },
      // 旗舰「搬家」本代皮：父母工作调动（兼分房）。窗 5–15、权重 0.055/岁、无保底（一局至多一次，
      // 没触发＝这家这轮没搬，合法缺席）。三段全写：低龄段落「转过学」轻事实（moved_school65）、
      // 中段记号最重、临考段学籍全转落「临考前转学」（moved_exam65——§3.6 口径下 migrantExam 的
      // 事实来源之一，读法归 WP9/集成，本包只生产）。小应对与回声按段各备一套（stageChoices/stageEcho）。
      { id: "pool_move65", window: [5, 15], weight: 0.055, flagship: "move",
        act: { log: "搬家", familyBeat: true, familyFact: "famMove65", splitMove: true,
          text: "家里要搬了。大人的事，孩子只有跟着走的份。",
          echo: "后来你想起那回搬家，心里先浮起来的，是新地方的模样。",
          poolSetByStage: { low: "moved_school65", mid: "moved_school65", exam: "moved_exam65" },
          stageText: {
            low: "家里要搬了，大人的活换了地方，家搬到城另一头。走那天你抱着自己的搪瓷碗，坐在板车上看院子越来越小。老院子的枣树、井台，都留在后头了。",
            mid: "家里搬了，大人的活换到新地方，住处也跟着换了。走前一天，你把常玩的那几个地方走了一遍：校门口的摊子、河边的台阶。新学校那头，一个人都不认识。",
            exam: "偏偏这个时候搬。家里换了地方，学籍跟着转到新学校，升学要在哪边考、卷子往哪边送，都得重新打听。家里跑了好几趟，你的复习计划全乱了。",
          },
          stageEcho: {
            low: "后来你想起搬家，先想起的是板车上的那只搪瓷碗。",
            mid: "后来你想起那回搬家，想起的是新学校课桌上别人的名字。",
            exam: "后来你想起那回搬家，先想起陪你爸跑教育科的那天——手续办下来，天都黑了。",
          },
          stageChoices: {
            low: [
              { label: "抱着碗，一路没撒手", effects: { relation: 1 },
                echo: "新家头一晚，你妈把你的碗摆在新桌子正中间，说，碗在哪，家就在哪。" },
              { label: "帮着捆箱子，跑前跑后", effects: {}, set: "mark_movebox65",
                echo: "你的小人书捆在最上头。到了新家，你头一件事就是把它们摆出来。" },
              { label: "躲在门后头，不想走", effects: { wisdom: 1 },
                echo: "最后还是你爸把你抱上车。你回头看老院子，看到拐弯才看不见。" },
            ],
            mid: [
              { label: "跟家里人黏得更紧了", effects: { relation: 1 },
                echo: "新家饭桌小了些，挤着坐。你妈说，人齐，比什么都强。" },
              { label: "先把新学校周围的路摸熟", effects: { wisdom: 1 }, set: "mark_move65",
                echo: "你用一个礼拜把新学校周围的路走熟了。课桌上刻着先前用的人的名字。" },
              { label: "谁也不理，在家生闷气", effects: { relation: -1 }, set: "mark_move65",
                echo: "你妈没说你，只是晚饭多给你卧了个鸡蛋，放在碗底。" },
            ],
            exam: [
              { label: "先陪着把学籍的事跑明白", effects: { wisdom: 1 },
                echo: "你陪着你爸跑了一天教育科，手续办下来，天都黑了。这事不弄清，书看不进去。" },
              { label: "跟家里发了通脾气", effects: { relation: -1 },
                echo: "你把门摔得响。夜里你妈端了碗面进来，放在桌上就出去了，你吃着吃着不气了。" },
              { label: "认了，先把心思收回书上", effects: { wisdom: 1 }, set: "mark_move65",
                echo: "新教室最后一排有空位，你坐下，把课本摊开。窗外的操场，一点也不认识。" },
            ],
          } } },
    ],
    sitActs: {
      half: [
        { id: "pr_half1", age: 10, log: "半天学校半天家", sit: "half",
          text: "你上学三天两头缺课：家里一忙就得请假，回去搭把手。老师把落下的课指给你，让你抄同桌的本子。你抄得认真，字比上课时还整齐。",
          tail: "课文背得磕磕绊绊，放下书包前总能顺下来。",
          choices: null },
        { id: "pr_half2", age: 14, log: "还读不读", sit: "half", title: "14 岁 · 还读不读",
          text: "初中念了一年，家里的账摆在那儿：供你念书，地里就少个劳力。这个书还读不读，你自己也得拿个主意了。",
          choices: [
            { label: "咬咬牙，继续读下去", effects: { growth: 2, money: -1 }, echo: "你接着读了。家里的活没少干，觉睡得更少了。" },
            { label: "就读到这儿，回家帮工", setState: { schooling: "left" }, effects: { relation: 1, money: 1 }, echo: "退学那天，你把课本摞好，放在柜子顶上。往后，就是全天帮工的人了。" },
          ] },
        { id: "pr_half3", age: 19, log: "半大的手艺", sit: "half", whenState: { track: "work" },
          text: "这些年书没念全，手上的本事倒齐全。这一年，乡里办起了企业，招工的人看你算账利索、手脚勤快，喊你去试了试。",
          choices: [
            { label: "去乡里的企业上工，稳稳当当干", set: "half_grown", effects: { growth: 2 }, echo: "你成了厂里最年轻的组长候选。家里人说，这孩子算是站住了。" },
            { label: "手艺活接着干，日子先过稳", effects: { money: 1, health: 1 }, echo: "你把手上的活干得更细了。找你干活的人，慢慢多起来。" },
          ] },
      ],
      never: [
        { id: "pr_never1", age: 8, log: "没进过校门", sit: "never",
          text: "你家孩子多，你排中间。报名那几天，家里没人提送你去，你也没吭声。你背着弟弟站在村口，看背书包的孩子往学校走。",
          textByFact: { siblingForm: {
            only: "你家就你一个。报名那几天，家里没人提送你去，你也没吭声。你站在村口，看背书包的孩子往学校走。",
          } },
          tail: "牛吃草时，你坐在坡上，看村口的旗升起来，又落下去。",
          choices: null },
        { id: "pr_never2", age: 15, log: "冬学的灯", sit: "never", title: "15 岁 · 冬学开课",
          text: "入冬，村里办冬学，晚上在队屋里认字，一晚上认十个字，回来还能写在门框上，第二天出门前再看一眼。队屋的灯一亮，半村的人都往那儿去。",
          choices: [
            { label: "去。一晚上认十个字，回来写在门框上", set: "literacy_gain", effects: { growth: 2 }, echo: "半年下来，门框上的字连成了一片。你头一回自己读完了一整张通知。" },
            { label: "没去成，家里的活离不开人", effects: { growth: 1 }, echo: "账记得歪歪扭扭，数目倒从没错过。字认得不多，够用了。" },
          ] },
        { id: "pr_never3", age: 20, log: "认字之后", sit: "never",
          text: "这两年，招工的告示、集上的价目，你都能自己看完了。乡里企业招人，要能记账的，队里有人想起你，让你去试试。",
          tail: "上班头一个月，你把记工分账的老底子全用上了，一笔没错。",
          choices: null },
      ],
    },
    special: {
      neverChild1Text: "开学那天，你没去。家里孩子多，没人顾上送你，这个门这一回进不去了。你背着弟弟站在村口，看背书包的孩子往学校走，看了一会儿，转身回家帮着放牛去了。",
      neverChild4Text: "跟你一般大的孩子小学毕业了。毕业照在校门口拍，老槐树下站了两排人。你路过看了一眼，扁担还压在肩上。修鞋摊的大爷招手让你坐下歇会儿，说摊子挪几步，照样修鞋。",
      townFamilies: ["cf_05"],
    },
  };
})();
