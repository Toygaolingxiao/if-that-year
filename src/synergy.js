// 《如果那年》协同组合与稀有系统数据 v1（设计：docs/SYNERGY-AND-RARE-ENDINGS.md）
// combos：多标记组合事件，进普通池；rare：条件+骰子双门，含轨迹链（traj_*）；endings：65 岁特殊结局评定。
// 红线：不涉政（无官职/党派/选举/军队；校长、院士、行业标准、企业家、作家为民间/学术/市场荣誉）；
//       不玄幻（神药=真实新药研发获批；彩票概率如实极低）；稀有不等于高贵，文案不贬低普通活法。
window.GAME_SYNERGY = {
  combos: [
    { id: "cb_family3", all: ["partner", "bought_house", "has_kid"], min: 40, max: 55, text: "周六早上，孩子在客厅地板上搭积木，搭到第三层塌了，又从头来。对方在厨房煎蛋，鸡蛋是昨晚超市买的，一盒 12 个，小票上 18 块 9，够吃四天。你在阳台给那盆薄荷浇完水，把水壶放回窗台原处。早饭三个人吃了二十分钟，煎蛋有点糊，谁也没提。", effects: { relation: 3, health: 1 } },
    { id: "cb_solo_free", all: ["single_ok"], stats: [{ k: "freedom", gt: 68 }], min: 40, max: 58, text: "你一个人去看了场午夜场电影，会员票 45，座位随便挑，你坐了正中间。散场时整条街都是刚下班的年轻人，你在路边摊买了份炒粉，15 块，加了个蛋，边走边吃，到家十二点四十。", effects: { freedom: 2, health: 1 } },
    { id: "cb_care_near", all: ["care_self", "near_family"], min: 53, max: 64, text: "父亲半夜胃不舒服，电话打过来，你开车七分钟就到了。急诊抽血、做心电图，折腾到凌晨三点，医生说先留观。你在走廊的自助机上交了 480，自费部分。他看见缴费单，先说的是：把你折腾起来了。你说，没事，我住得近。", effects: { relation: 3, health: -1 } },
    { id: "cb_dink_plan", all: ["partner", "no_kid"], stats: [{ k: "money", gt: 58 }], min: 44, max: 58, text: "你和对方把养老的账认真算了一遍，列了张表：社保还要交几年、存款够花几年、现在这套小房子的月供还剩多少。算完你们去吃了顿火锅，两个人 178。计划表压在茶几玻璃板下面，压了两年，一直没动过。", effects: { money: 1, freedom: 2 } },
    { id: "cb_old_couple", all: ["partner", "retired_full"], min: 59, max: 64, text: "退休后第一个长假，你和对方报了个慢团，六天，一个人 4200，全程没赶过景点，中午还回酒店睡午觉。团里另一对老夫妻跟你们拼了四次饭，散团那天互相加了微信，约好明年还走这一条线。", effects: { relation: 2, health: 2, money: -2 } },
    { id: "cb_sandwich", all: ["has_kid", "care_self"], min: 53, max: 60, text: "这一天你两头跑：上午请了半天假，去学校坐最后一排开家长会；下午赶到医院，父亲的复查号是提前一周在手机上抢的，取报告、排队缴费，来回打车 63。晚上回家，你把成绩单和复查单夹进同一个文件夹，放在抽屉第二层。", effects: { relation: 2, health: -2 } },
    { id: "cb_rent_free", all: ["renting", "less_work"], stats: [{ k: "freedom", gt: 63 }], min: 45, max: 60, text: "房东在微信上问：续三年就不涨租，续一年要涨 100。你回：先续一年吧。签完你把合同塞进抽屉，抽屉里还有前两年的合同，三份叠在一起，租金那一栏一年比一年高一点。你给阳台那几盆花浇了水，明年住哪，到时候再说。", effects: { freedom: 2, wisdom: 5 } },
    { id: "cb_hop_viral_base", all: ["job_hop", "side_start"], min: 30, max: 45, text: "跳槽面试聊到一半，面试官把手机转过来：这个账号也是你做的？那是你下班更新的小账号，粉丝不多，置顶那条有两万多播放。后面又聊了四十分钟，聊的全是它，岗位本身只占了十分钟。临走对方说，账号别停更。", effects: { growth: 2, relation: 1 } },
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
    // —— v0.11.0 新增：五条轨迹链（各挂一个新结局，立旗事件本身都带代价）——
    { id: "r_teacher_students", min: 44, max: 55, chain: "r_school1", chance: 0.03, text: "教了二十多年书，你带过的一届学生里，有三个考回了县里当老师，其中一个就分在你隔壁办公室。期中考试前，三个人抱着教案来问你那道压轴题怎么讲。你把当年的备课本找出来，本子边角都磨毛了，借给他们传看。开学到现在，你自己掏钱给班里印卷子，已经垫了 600 多。", effects: { relation: 4, growth: 2, money: -3, health: -1 }, set: "traj_taoli" },
    { id: "r_craft_apprentice", min: 40, max: 55, any: ["took_over_job", "p20_cnc_retrain"], chance: 0.025, text: "你在机床边站了二十多年。这天车间主任领来个刚满十八岁的年轻人，说跟你学手艺。年轻人手有点抖，第一天就把一个工件车废了，站在那儿不敢说话。你看了看废件，没吭声。",
      choices: [
        { label: "收下。废件的料钱从我这儿出", effects: { money: -2, relation: 3, health: -2, growth: 2 }, set: "traj_craft", echo: "头三个月他出的活你件件复查，慢是慢了点。可你下班时，工具箱头一次有人帮你收拾好了。" },
        { label: "不收。自己干惯了", effects: { freedom: 2, money: 1 }, echo: "年轻人后来跟了别的师傅。你照旧一个人开工，一个人收工。" },
      ] },
    { id: "r_village_doc", min: 36, max: 52, route: "home", chance: 0.014, text: "你在乡镇卫生院当了几年医生，门诊一天最多看四十多个人，输液室的椅子常年坐满。这天县医院来电话，说有个进修之后留院的名额，问你去不去。你把白大褂口袋里的处方笺摸了摸，没当场答复。",
      choices: [
        { label: "留下。这一摊离不开人", effects: { money: -3, relation: 4, health: -2 }, set: "traj_village_doc", echo: "你回了电话，说不去了。当晚有个老人骑电动车来敲门，说家里孩子发烧，先找你看看再说。" },
        { label: "去。往大医院走", effects: { money: 3, growth: 2, relation: -1 }, echo: "交接那天，输液室的人挨个跟你道别。你走的时候，药房的窗户还开着。" },
      ] },
    { id: "r_captain_final", min: 53, max: 62, all: ["team_captain"], chance: 0.04, text: "这支业余球队你张罗了十来年。这场是联赛最后一场，你的膝盖热身时就开始疼，喷了两次止痛喷雾，还是顶完了全场。终场哨响，你们赢了一个球。年轻人把你抬起来的时候，你先喊的是：慢点，我的腰。", effects: { relation: 4, health: -3, growth: 1, wisdom: 2 }, set: "traj_captain" },
    { id: "r_trucker_route", min: 35, max: 46, chance: 0.012, text: "运输公司新开了一条跨省长途线，单程 900 多公里，跑一趟歇一天，工资比市内短途多出一截。调度问你愿不愿意固定跑这条线。你的驾照年限够，就是夜里赶路、白天补觉，日子要整个翻过来。",
      choices: [
        { label: "接。固定跑长途", effects: { money: 5, health: -4, relation: -2 }, set: "traj_trucker", echo: "第一个月你跑了九趟。服务区的泡面吃了四种口味，里程表跳得飞快，人瘦了六斤。" },
        { label: "不接。还是跑短途", effects: { money: 2, freedom: 1 }, echo: "你照旧每天能回家吃饭。就是工资条上那个数，一直没怎么动。" },
      ] },
    // —— v0.11.0 新增：苦味/负面/两难（稀有≠幸运）——
    { id: "r_scam_big", min: 38, max: 52, stats: [{ k: "money", gt: 54 }], chance: 0.008, w: 2, text: "熟人拉你进了一个投资群，说是熟人项目，保本，每月返息。前四个月，利息一分不少打到卡上，你又追加了一笔，前后投进去的，是你存了六年的数。第五个月，群主失联，群里 200 多号人一夜之间全在问同一句话。报警、登记、跑经侦，你跑了七趟，能追回多少，没人敢打包票。", effects: { money: -9, relation: -2, wisdom: 3 } },
    { id: "r_industry_overnight", min: 40, max: 55, any: ["stay_put", "steady_job"], chance: 0.009, w: 2, text: "你干了十几年的这条产品线，一夜之间就凉了。新的技术路线出来，客户的订单全转去了别家。厂里贴出通知：这条线的人，要么转岗降一档工资，要么拿补偿走人。名单贴在公告栏上，你的名字在第三行。",
      choices: [
        { label: "转岗。从头学新产线", effects: { money: -5, growth: 3, health: -1 }, echo: "新产线的活你干得比年轻人慢，笔记却记了三大本。工资条矮了一截，饭还得照吃。" },
        { label: "拿补偿。先歇一阵再说", effects: { money: -4, freedom: 2, health: -1, wisdom: 2 }, echo: "补偿款到账那天，你把工牌放进抽屉。歇了半个月，人是缓过来了，下一步还没想好。" },
      ] },
    { id: "r_oldfriend_gone", min: 42, max: 55, chance: 0.007, w: 2, text: "初中同桌去世的消息，是同学群里转发的。你上次见对方还是五年前同学聚会，散场时约了下次，对方说忙完这阵就约。葬礼在邻县，你请了一天假，开车两个多小时过去，在花圈里找到自己送的那个，站着看了一会儿上面的挽联。", effects: { relation: -2, health: -1, money: -1, wisdom: 4 } },
    { id: "r_friend_debt", min: 36, max: 50, stats: [{ k: "money", gt: 50 }], chance: 0.011, w: 2, text: "发小开口借钱周转，说三个月就还。你转过去一笔，是你攒了两年的数。三个月变半年，半年变一年，电话从秒接变成隔天回。最后一次见面在茶馆，两杯茶没喝完，话先说僵了。",
      choices: [
        { label: "认了。钱不要了，人也断了", effects: { money: -6, relation: -3, wisdom: 3 }, echo: "你把聊天记录翻到转账那一页，停了一会儿，还是退了出来。" },
        { label: "走法律程序，追回多少算多少", effects: { money: -3, relation: -5, wisdom: 2 }, echo: "调解室里坐了一下午，最后签了分期还款的纸。钱回来得很慢，逢年过节的问候先没了。" },
      ] },
    { id: "r_health_operation", min: 35, max: 55, stats: [{ k: "health", lt: 60 }], chance: 0.007, w: 2, text: "体检报告上圈出一个指标，复查、增强 CT、主任会诊，前后跑了五趟医院。结论是得做手术，不算大，但要在家歇一个月。手术费自费部分刷了你大半年的结余，出院那天，你扶着走廊的扶手走了一圈，比术前慢了一半。", effects: { health: -4, money: -6, wisdom: 2 } },
    { id: "r_guarantee_trap", min: 39, max: 54, stats: [{ k: "relation", gt: 54 }], chance: 0.005, w: 2, text: "亲戚买房差首付，求你做贷款担保，说就签个字，周转开就还上。你签了。两年后银行的催告函寄到你家：对方断供四个月，担保人要先行代偿。你替对方还了大半年的月供，两家人的年夜饭，那年没在一张桌子上吃。", effects: { money: -8, relation: -3, wisdom: 2 } },
    { id: "r_old_neighbor", min: 47, max: 58, chance: 0.005, text: "搬走十几年的老邻居回老街办事，在巷口碰见你。你们在小卖部门口站着聊了四十多分钟：谁谁搬去了哪，巷口那棵树是哪年砍的。临走互相留了新号码，你请对方吃了碗面，14 块。之后谁也没再联系谁，号码就躺在通讯录里。", effects: { relation: 1, money: -1 } },
  ],
  endings: [
    { id: "end_richest", tier: "legendary", all: ["traj_ipo"], stats: [{ k: "money", gt: 69 }], title: "世界首富",
      text: "公司上市之后又走了很多年。有那么一年，富豪榜把你的名字放在了第一位。记者问你秘诀，你说：哪有什么秘诀，就是当年书桌前那张白纸，我没扔。你还是习惯自己热饭，办公室的灯，也还是你走得最晚。" },
    { id: "end_drug", tier: "legendary", all: ["traj_drug2"], stats: [{ k: "growth", gt: 69 }], title: "神药研发者",
      text: "你牵头的那款药，最终获批上市。发布会那天，台下坐着一位用过临床试验药的病人，站起来向你鞠了一躬。你摆摆手，说：是药好，不是我。回去的路上你想，实验室记录本第一页的那个日期，隔了快二十年了。" },
    { id: "end_academician", tier: "legendary", all: ["traj_award"], stats: [{ k: "growth", gt: 96 }, { k: "wisdom", gt: 64 }], title: "院士",
      text: "当选院士那年，你回了趟母校。礼堂还是那间礼堂，你坐在第一排，听校长介绍你的名字。散场后你一个人去食堂吃了碗面，窗口阿姨没认出你，照例多给你加了个蛋。" },
    { id: "end_principal", tier: "epic", all: ["traj_vp"], stats: [{ k: "relation", gt: 88 }], title: "一校之长",
      text: "五十几岁那年，你成了这所学校的校长。开学典礼上你站在台上，看着一操场的学生，想起自己报到那天，老校长也是站在这个位置。你讲得很短：好好读书，也好好吃饭。台下笑了一片。" },
    { id: "end_bestseller", tier: "epic", all: ["traj_book"], stats: [{ k: "growth", gt: 86 }], title: "畅销书作家",
      text: "你的书一版再版，摆在书店门口的架子上。有读者来信说，是在最难的一年读到它的。你把信收在抽屉里，和当年那份薄薄的合同放在一起。" },
    { id: "end_influencer", tier: "epic", all: ["traj_viral"], title: "千万粉丝",
      text: "你的账号慢慢涨到了一千多万粉丝。有人问你现在算不算名人，你说：算个下班后比较忙的人。视频还是在那个小书桌上拍，灯也没换过。" },
    { id: "end_bigfamily", tier: "epic", all: ["partner", "has_kid"], stats: [{ k: "relation", gt: 99 }, { k: "health", gt: 58 }], title: "子孙满堂",
      text: "65 岁生日那天，家里摆了两桌。孩子带着孩子，孩子又带着更小的孩子。吹蜡烛的时候一屋子人喊你，称呼各不相同。你眯着眼睛看了一圈，心想：这一屋子，都是从那一年开始的。" },
    { id: "end_traveler", tier: "epic", all: ["retired_full"], stats: [{ k: "freedom", gt: 76 }, { k: "money", gt: 54 }], title: "环游世界",
      text: "退休金、存款、说走就走的身体，你都凑齐了。护照上的章一个挨一个，冰箱上贴满了各地的磁铁。有人问你还差哪没去，你说：不差了，剩下的时间，慢慢走回程。" },
    { id: "end_standard", tier: "epic", all: ["stay_put"], stats: [{ k: "growth", gt: 94 }], title: "定标准的人",
      text: "行业里那份用了很多年的标准，起草人名单里有你。年轻人入行学的第一课，写的就是你定的规矩。你没跟人提过这事，只是每次看到那份文件，都把错别字在心里默默改一遍。" },
    { id: "end_localfounder", tier: "epic", route: "home", all: ["side_job"], stats: [{ k: "money", gt: 71 }], title: "县城企业家",
      text: "你在县城里的那摊生意，后来成了镇上最大的用工单位。招工启事贴出去，来的有你小学同学的孩子。你在办公室里看着窗外想：当年要是走了，这一切就都没有了。当然，走了也会有别的——只是这个版本，你过得不后悔。" },
    { id: "end_lottery", tier: "rare", all: ["traj_lottery"], title: "天选之人",
      text: "中奖的事你没跟几个人说。钱一部分存了定期，一部分给家里换了房子，日子还是照常过。只是每年那一天，你会去楼下那家彩票站买一注，还是那组生日号码。店主问你图啥，你说：图个念想。" },
    { id: "end_champion", tier: "rare", all: ["traj_champ"], title: "年龄组冠军",
      text: "奖牌挂在书房门后，进门就能看见。年轻人问你跑步有什么秘诀，你说：没什么秘诀，就是六十多岁了，还跑得动。这话比奖牌还让你得意。" },
    { id: "end_teacher_taoli", tier: "epic", all: ["traj_taoli"], stats: [{ k: "relation", gt: 74 }], title: "桃李满天下",
      text: "退休那年，你教过的学生凑了三桌给你送行，最早的一届头发都白了一半。有人把你当年借出去的那本备课本还了回来，说传了三届人，本子还在。你没讲什么大道理，就说：都坐下，先吃饭，菜凉了。" },
    { id: "end_craft_legacy", tier: "epic", all: ["traj_craft"], stats: [{ k: "growth", gt: 64 }, { k: "relation", gt: 54 }], title: "手艺有人接",
      text: "你退休那天，徒弟已经能独立顶下整条线了。你把用了二十多年的那把卡尺留给对方，盒子上刻的名字都磨浅了。后来你路过车间，还能听见机器响，站在门口看一会儿，不进去。" },
    { id: "end_village_doctor", tier: "epic", all: ["traj_village_doc"], stats: [{ k: "relation", gt: 92 }], title: "一村的医生",
      text: "你在乡镇卫生院干到退休。辖区里几千口人，谁家的老人吃什么药、谁对什么过敏，你的本子上都记着。退休手续办完那天，输液室坐满了人，不是来看病的，是听说你要走，来送送你。你说：新医生比我强。没人接这句话。" },
    { id: "end_captain", tier: "rare", all: ["traj_captain"], stats: [{ k: "relation", gt: 59 }], title: "老队长",
      text: "你踢不动全场那年，把队长袖标交给了队里最年轻的那个。交完你们照常去吃宵夜，啤酒你只喝了一杯——膝盖还疼，回家得冰敷。后来每场比赛你都去，坐在场边，哨子和记分牌还归你管。" },
    { id: "end_trucker_million", tier: "rare", all: ["traj_trucker"], stats: [{ k: "money", gt: 59 }], title: "跑满一百万公里",
      text: "你跑长途的第十几年，里程表过了一百万公里，公司给你发了块无事故的牌子，挂在驾驶室里。你的腰落下了毛病，补觉要靠耳塞。可这条线上的服务区，哪家的盒饭实在、哪段路雨天打滑，你闭着眼都说得出来。" },
  ],
};
