// 《如果那年》协同组合与稀有系统数据 v1（设计：docs/SYNERGY-AND-RARE-ENDINGS.md）
// combos：多标记组合事件，进普通池；rare：条件+骰子双门，含轨迹链（traj_*）；endings：65 岁特殊结局评定。
// 红线：不涉政（无官职/党派/选举/军队；校长、院士、行业标准、企业家、作家为民间/学术/市场荣誉）；
//       不玄幻（神药=真实新药研发获批；彩票概率如实极低）；稀有不等于高贵，文案不贬低普通活法。
window.GAME_SYNERGY = {
  combos: [
    { id: "cb_family3", all: ["partner", "bought_house", "has_kid"], min: 40, max: 55, text: "周六早上，孩子在客厅搭积木，对方在厨房煎蛋，你在阳台浇花。谁也没说话，但你站了一会儿，觉得这一幕可以多停一下。", effects: { relation: 3, health: 1 } },
    { id: "cb_solo_free", all: ["single_ok"], stats: [{ k: "freedom", gt: 68 }], min: 40, max: 58, text: "你一个人去看了场午夜场电影，散场时整条街都是刚下班的年轻人。你买了份炒粉，边走边吃。", effects: { freedom: 2, health: 1 } },
    { id: "cb_care_near", all: ["care_self", "near_family"], min: 53, max: 64, text: "父亲半夜不舒服，你五分钟就赶到了。他看见你，先说的是：把你折腾起来了。你说，没事，我住得近。", effects: { relation: 3, health: -1 } },
    { id: "cb_dink_plan", all: ["partner", "no_kid"], stats: [{ k: "money", gt: 58 }], min: 44, max: 58, text: "你和对方把养老的账认真算了一遍：社保、存款、一套小房子。算完你们去吃了顿火锅。计划表压在茶几玻璃板下面，一直没动过。", effects: { money: 1, freedom: 2 } },
    { id: "cb_old_couple", all: ["partner", "retired_full"], min: 59, max: 64, text: "退休后第一个长假，你和对方报了个慢悠悠的团。全程没赶过景点，倒是跟团里另一对老夫妻约好了明年再一起走。", effects: { relation: 2, health: 2, money: -2 } },
    { id: "cb_sandwich", all: ["has_kid", "care_self"], min: 53, max: 60, text: "这一年你两头跑：孩子的家长会，父亲的复查单。有一天你在医院走廊里坐着，把两边的日程对了对，发现自己居然没漏过一次。", effects: { relation: 2, health: -2 } },
    { id: "cb_rent_free", all: ["renting", "less_work"], stats: [{ k: "freedom", gt: 63 }], min: 45, max: 60, text: "房东问你要不要续租三年。你说先一年一年来吧。没房的人有没房的自由，这话你以前不信，现在信一半。", effects: { freedom: 2, wisdom: 5 } },
    { id: "cb_hop_viral_base", all: ["job_hop", "side_start"], min: 30, max: 45, text: "跳槽面试时，对方翻到你下班做的那个小账号，抬头看了你一眼：这个也是你做的？聊了四十分钟，工作本身只占了十分钟。", effects: { growth: 2, relation: 1 } },
  ],
  rare: [
    // —— 创业轨迹链：side_start + side_job 凑齐 build，三环骰子相乘 ——
    { id: "r_startup", min: 38, max: 50, all: ["side_start", "side_job"], chance: 0.05, text: "副业的收入第一次超过工资。晚上你坐在书桌前，面前摊着一张白纸，上面就写了一行：要不要把它当正事干？",
      choices: [
        { label: "干。辞职，全职做这件事", effects: { money: -6, growth: 5, freedom: 4 }, set: "traj_startup", echo: "离职那天你把工牌交了，保安说：慢走。你走出大楼，脚步比上班时快。" },
        { label: "再稳一年，副业先养着", effects: { freedom: 1, money: 2, wisdom: 3 }, echo: "白纸被收进抽屉。这个念头没死，只是睡下了。" },
      ] },
    { id: "r_funding", min: 40, max: 55, chain: "r_startup", chance: 0.055, text: "投资人约你喝咖啡，聊了两个小时。临走他说：钱可以投，但你要想清楚，拿了钱就没有回头路了。",
      choices: [
        { label: "拿。把盘子做大", effects: { money: 10, growth: 3, health: -3 }, set: "traj_funded", echo: "签完协议那晚你失眠了。账户里的数字变多了，肩上的东西也变重了。" },
        { label: "不拿。慢慢长大也行", effects: { money: 3, freedom: 2, wisdom: 5 }, echo: "公司不大，但每一分钱都是自己挣的。你睡了个好觉。" },
      ] },
    { id: "r_ipo", min: 45, max: 60, chain: "r_funding", stats: [{ k: "money", gt: 54 }], chance: 0.05, text: "敲钟那天，你西装里的衬衫是对方前一天熨的。锣声一响，身边的人都在喊，你站在原地，想起了书桌前那张白纸。", effects: { money: 25, growth: 3 }, set: "traj_ipo" },
    // —— 神药轨迹链：study 路线 + 高成长 ——
    { id: "r_drug1", min: 30, max: 42, route: "study", stats: [{ k: "growth", gt: 61 }], chance: 0.022, text: "你牵头的课题立项了：一种针对罕见病的药。评审专家说，这条路线很难，十年起步。你说，那就十年。",
      choices: [
        { label: "接。十年就十年", effects: { growth: 5, money: -2, health: -2 }, set: "traj_drug1", echo: "实验室的灯，那天亮到很晚。你在实验记录本的第一页写了日期。" },
        { label: "换个容易出成果的题目", effects: { growth: 2, money: 2 }, echo: "新题目稳妥得多。只是有时候路过那间实验室，你会慢下来。" },
      ] },
    { id: "r_drug2", min: 36, max: 52, chain: "r_drug1", chance: 0.025, text: "临床二期的数据出来那天，实验室里先是没人说话，然后有人哭了。有效。真的有效。你给家里打电话，只说了一句：今晚早点回，有好消息。", effects: { growth: 5, relation: 2 }, set: "traj_drug2" },
    // —— 校长轨迹链：home 路线，早年分到学校 ——
    { id: "r_school1", min: 23, max: 30, route: "home", chance: 0.05, text: "分配的时候，你被分到了县一中当老师。报到那天，老校长指着操场说：这学校比你岁数大，好好干。",
      choices: [
        { label: "留下教书，先把课讲好", effects: { relation: 3, growth: 2 }, set: "traj_school", echo: "你的第一堂课，紧张得粉笔都拿反了。最后一排的男生憋着笑，憋得很辛苦。" },
        { label: "先干着，以后再说调动", effects: { growth: 1 }, echo: "调动的事后来没人再提。课倒是越讲越顺。" },
      ] },
    { id: "r_school2", min: 34, max: 50, chain: "r_school1", stats: [{ k: "relation", gt: 54 }], chance: 0.022, text: "学校让你当教导主任。你推了两次没推掉。开学典礼上你站在台下，看着一操场的学生，忽然想起自己报到那天。", effects: { relation: 3, growth: 2 }, set: "traj_vp" },
    // —— 写作 / 流量轨迹 ——
    { id: "r_book", min: 33, max: 55, all: ["side_start"], stats: [{ k: "growth", gt: 65 }], chance: 0.010, text: "出版社的编辑找到你，说你陆续写的那些东西，想结集出本书。合同寄到家里，薄薄几页，你看了三遍。", effects: { growth: 3, money: 2 }, set: "traj_book" },
    { id: "r_viral", min: 30, max: 50, all: ["side_start", "side_job"], chance: 0.012, text: "你随手发的一条视频，第二天早上醒来，播放量后面跟了六个零。手机烫得像块铁，一整天都在震。", effects: { money: 6, relation: 2, health: -2 }, set: "traj_viral" },
    // —— 学术荣誉 ——
    { id: "r_award", min: 46, max: 62, stats: [{ k: "growth", gt: 84 }], chance: 0.06, text: "提名名单公布，你的名字在里面。单位拉了条横幅，你有点不好意思，但路过的时候，还是放慢脚步看了一眼。", effects: { growth: 3, relation: 2 }, set: "traj_award" },
    // —— 独立稀有点 ——
    { id: "r_lottery", min: 23, max: 60, chance: 0.00015, text: "楼下彩票站贴了张红纸：本站中出头奖。名字没写，但你知道是你——那组号码，是你随手写的生日组合。税后的钱到账那天，你照常去上了班。", effects: { money: 40 }, set: "traj_lottery" },
    { id: "r_patent", min: 32, max: 55, stats: [{ k: "growth", gt: 71 }], chance: 0.015, text: "你业余捣鼓出来的一个小专利，被一家公司看上了，开价比你想的高得多。签约的时候对方说：我们找这个方案找了两年。", effects: { money: 14, growth: 2 }, set: "traj_patent" },
    { id: "r_oldhouse", min: 40, max: 60, any: ["near_family"], routeIn: ["home", "corp", "abroad", "study", "gap"], chance: 0.015, text: "老家那片要改造了。老房子的补偿款打下来，比你想的多。你站在老屋门口拍了张照，才锁上门。", effects: { money: 12 }, set: "traj_windfall" },
    { id: "r_marathon", min: 52, max: 64, stats: [{ k: "health", gt: 74 }], chance: 0.05, text: "城市马拉松，你拿了年龄组的第一名。冲线的时候计时员愣了一下，看了看你的号码布，又看了看你。", effects: { health: 3, freedom: 2 }, set: "traj_champ" },
    { id: "r_rescue", min: 28, max: 55, chance: 0.002, text: "河边有人落水，你跳下去了。人救上来的时候你才发现自己鞋掉了一只。本地新闻播了四十秒，母亲把那段视频存在手机里，给亲戚挨个看。", effects: { relation: 5, health: -2 }, set: "traj_hero" },
    { id: "r_antique", min: 35, max: 60, chance: 0.003, text: "清理老柜子时翻出个旧瓷瓶，拿去给懂行的人看了一眼。对方戴上眼镜看了很久，说：别擦了，这个擦不得。后来它拍出去的钱，正好够把老房的房顶修了。", effects: { money: 8 }, set: "traj_antique" },
  ],
  endings: [
    { id: "end_richest", tier: "legendary", all: ["traj_ipo"], stats: [{ k: "money", gt: 69 }], title: "世界首富",
      text: "公司上市之后又走了很多年。有那么一年，富豪榜把你的名字放在了第一位。记者问你秘诀，你说：哪有什么秘诀，就是当年书桌前那张白纸，我没扔。你还是习惯自己热饭，办公室的灯，也还是你走得最晚。" },
    { id: "end_drug", tier: "legendary", all: ["traj_drug2"], stats: [{ k: "growth", gt: 69 }], title: "神药研发者",
      text: "你牵头的那款药，最终获批上市。发布会那天，台下坐着一位用过临床试验药的病人，站起来向你鞠了一躬。你摆摆手，说：是药好，不是我。回去的路上你想，实验室记录本第一页的那个日期，隔了快二十年了。" },
    { id: "end_academician", tier: "legendary", all: ["traj_award"], stats: [{ k: "growth", gt: 84 }], title: "院士",
      text: "当选院士那年，你回了趟母校。礼堂还是那间礼堂，你坐在第一排，听校长介绍你的名字。散场后你一个人去食堂吃了碗面，窗口阿姨没认出你，照例多给你加了个蛋。" },
    { id: "end_principal", tier: "epic", all: ["traj_vp"], stats: [{ k: "relation", gt: 64 }], title: "一校之长",
      text: "五十几岁那年，你成了这所学校的校长。开学典礼上你站在台上，看着一操场的学生，想起自己报到那天，老校长也是站在这个位置。你讲得很短：好好读书，也好好吃饭。台下笑了一片。" },
    { id: "end_bestseller", tier: "epic", all: ["traj_book"], stats: [{ k: "growth", gt: 64 }], title: "畅销书作家",
      text: "你的书一版再版，摆在书店门口的架子上。有读者来信说，是在最难的一年读到它的。你把信收在抽屉里，和当年那份薄薄的合同放在一起。" },
    { id: "end_influencer", tier: "epic", all: ["traj_viral"], title: "千万粉丝",
      text: "你的账号慢慢涨到了一千多万粉丝。有人问你现在算不算名人，你说：算个下班后比较忙的人。视频还是在那个小书桌上拍，灯也没换过。" },
    { id: "end_bigfamily", tier: "epic", all: ["partner", "has_kid"], stats: [{ k: "relation", gt: 87 }], title: "子孙满堂",
      text: "65 岁生日那天，家里摆了两桌。孩子带着孩子，孩子又带着更小的孩子。吹蜡烛的时候一屋子人喊你，称呼各不相同。你眯着眼睛看了一圈，心想：这一屋子，都是从那一年开始的。" },
    { id: "end_traveler", tier: "epic", all: ["retired_full"], stats: [{ k: "freedom", gt: 76 }, { k: "money", gt: 54 }], title: "环游世界",
      text: "退休金、存款、说走就走的身体，你都凑齐了。护照上的章一个挨一个，冰箱上贴满了各地的磁铁。有人问你还差哪没去，你说：不差了，剩下的时间，慢慢走回程。" },
    { id: "end_standard", tier: "epic", all: ["stay_put"], stats: [{ k: "growth", gt: 84 }], title: "定标准的人",
      text: "行业里那份用了很多年的标准，起草人名单里有你。年轻人入行学的第一课，写的就是你定的规矩。你没跟人提过这事，只是每次看到那份文件，都把错别字在心里默默改一遍。" },
    { id: "end_localfounder", tier: "epic", route: "home", all: ["side_job"], stats: [{ k: "money", gt: 71 }], title: "县城企业家",
      text: "你在县城里的那摊生意，后来成了镇上最大的用工单位。招工启事贴出去，来的有你小学同学的孩子。你在办公室里看着窗外想：当年要是走了，这一切就都没有了。当然，走了也会有别的——只是这个版本，你过得不后悔。" },
    { id: "end_lottery", tier: "rare", all: ["traj_lottery"], title: "天选之人",
      text: "中奖的事你没跟几个人说。钱一部分存了定期，一部分给家里换了房子，日子还是照常过。只是每年那一天，你会去楼下那家彩票站买一注，还是那组生日号码。店主问你图啥，你说：图个念想。" },
    { id: "end_champion", tier: "rare", all: ["traj_champ"], title: "年龄组冠军",
      text: "奖牌挂在书房门后，进门就能看见。年轻人问你跑步有什么秘诀，你说：没什么秘诀，就是六十多岁了，还跑得动。这话比奖牌还让你得意。" },
  ],
};
