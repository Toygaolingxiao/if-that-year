// 《如果那年》开局出身牌数据与发牌（v0.13.0，设计：docs/DESIGN-V013.md §A）
// 结构：家底 family 16 / 性子 temper 16 / 时代注脚 era 每代 6（按年代分池），共 56 张、每局可达 38。
// 配比（§A5.2）：每类池内 好 ≈1/4、权衡 ≈1/2、坏 ≈1/4；坏牌净负、带小额补偿（以智慧为主）。
// 预算（用户裁定，中档＋双预算）：单项 ≤±5、每张总量 ≤9；每类池期望净注入 ≈0（三类合计 ≈0）；
//   智慧主注入牌每类 ≤3、单卡智慧 ≤+3，坏牌补偿智慧计入预算。机器核算见 DEVLOG v0.13.0。
// 钩子旗（hook_*）：先登记注册表（setter=牌 id）再写数据，消费事件在 pack33；牌不写 setState、不碰状态域（§A1.4）。
// 发牌用独立派生流（种子字符串 + 类别后缀），不消费主 RNG——同种子同年代牌面恒同，
// 且不平移主线事件序列；选牌是玩家动作，不耗任何随机流（与分岔选项同理）。
(function () {
  "use strict";
  // 与引擎同构的 FNV-1a 种子哈希与 mulberry 变体流（独立实例，不共享引擎 RNG.a）
  function cardSeedFromString(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function cardStream(seedInt) {
    let a = seedInt | 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // 池中抽 3 不重复：部分 Fisher-Yates，固定消费 3 次随机数（与玩家选哪张无关）
  function draw3(pool, next) {
    const idx = pool.map((_, i) => i);
    const out = [];
    for (let k = 0; k < 3 && k < pool.length; k++) {
      const j = k + Math.floor(next() * (idx.length - k));
      const tmp = idx[k]; idx[k] = idx[j]; idx[j] = tmp;
      out.push(pool[idx[k]].id);
    }
    return out;
  }
  const FAMILY = [
    // —— 好 4 ——
    { id: "cf_01", name: "柜台后头长大的", text: "你记事起，家里在街口开小卖部。你在柜台后头写作业，找零比同班同学都快，赊账的人站在门口，你爸从不催。", effects: { money: 2, growth: 1 }, set: "hook_counter" },
    { id: "cf_02", name: "一柜子书", text: "你家客厅有一面墙的书柜，是你爸年轻时自己打的。书不新，有水利的、种地的、还有半套没凑齐的小说。你小学就把能认字的都翻了一遍。", effects: { growth: 2, wisdom: 1 }, set: "hook_books" },
    { id: "cf_03", name: "院子里支着作坊", text: "你爸在院子里支了个小作坊，修车、焊东西，十里八乡都来找。你放学先在边上递扳手，手上有把子力气，也知道东西坏了先拆开看。", effects: { growth: 2, health: 1 } },
    { id: "cf_04", name: "爷爷留下的院子", text: "老家院子是爷爷盖的，枣树比你岁数大。家里不富裕，可逢年过节一大家子人挤在院里，你从没觉得自家比谁矮一头。", effects: { relation: 2, health: 1 } },
    // —— 权衡 8 ——
    { id: "cf_05", name: "一个厂里出来的", text: "你爸妈在同一个厂里干了一辈子。你在厂区大院长大，谁家今晚吃什么，闻味儿就知道。子弟学校、厂办医院、年终的澡票，都用过。", effects: { relation: 3, freedom: -1, money: -2 } },
    { id: "cf_06", name: "上头有姐姐，下头有弟弟", text: "你排老二。小时候新衣服先紧着姐姐，你穿剩下的再传给弟弟。家里吵吵闹闹，可吃饭永远多一双筷子等你。", effects: { relation: 3, money: -3 }, set: "hook_siblings" },
    { id: "cf_07", name: "奶奶带大的", text: "爸妈忙，你小时候跟奶奶住。她的咸菜坛子在墙角，你的乳牙是在她的摇椅边换的。她不识字，可谁家欠谁家人情，她记得比账本还清。", effects: { relation: 2, freedom: -2 }, set: "hook_grandma" },
    { id: "cf_08", name: "搬过三回家", text: "你上小学搬过一回，初中又搬一回，学校换了三个。刚混熟的同学，转眼就断了联系。你收拾行李比谁都快，新地方睡第一晚也不认床。", effects: { freedom: 3, relation: -3 }, set: "hook_moved_kid" },
    { id: "cf_09", name: "爸妈在外地那些年", text: "你小学有几年，爸妈在外地打工，过年才回来，带一包那边的水果糖。平时是爷爷接你放学。电话那头问你考试多少分，你报完成绩，两边就没话了。", effects: { money: 2, relation: -2 } },
    { id: "cf_10", name: "家里开过饭馆", text: "你家开过两年小饭馆，你在后厨择菜、记菜单，忙起来端盘子。后来不干了，灶台拆了，可你闻味儿就知道菜咸了还是淡了，嘴比一般人刁。", effects: { growth: 2, health: -1, money: -1 } },
    { id: "cf_11", name: "家里就你一个", text: "家里就你一个孩子。逢年过节，亲戚的红包都冲着你来；可家里的大事小事也没个商量的人，爸妈的眼睛全长在你身上。", effects: { relation: 2, freedom: -2 } },
    { id: "cf_12", name: "住在外婆家", text: "你中学几年住在外婆家，离学校近。她每天变着法给你加餐，鸡蛋永远卧两个。你长高得快，校服一年短一截，钱多半花在吃上了。", effects: { health: 2, money: -1, relation: -1 } },
    // —— 坏 4（净负，带智慧补偿）——
    { id: "cf_13", name: "家里欠着账", text: "你记事起，家里就欠着亲戚一笔钱。过年债主来家里坐坐，你妈让你回屋写作业。门关上，外头的说话声一直压得很低。", effects: { money: -4, wisdom: 1 } },
    { id: "cf_14", name: "饭桌上吵的那些年", text: "你小时候，家里饭桌上经常吃着吃着就吵起来。你学会听脚步声判断今晚的气氛，作业写得飞快，就怕被喊去评理。", effects: { relation: -3, freedom: -1, wisdom: 1 } },
    { id: "cf_15", name: "家里出过一场大病", text: "你上中学那年，家里有人住了大半年院。药费单子摞起来有一指厚，你妈把能借的亲戚都借遍了。你放学先去医院送饭，再回学校上晚自习。", effects: { money: -3, health: -1, wisdom: 1 } },
    { id: "cf_16", name: "家里管得严", text: "你家规矩大：几点回家、跟谁玩、零花钱怎么花，都有人盯着。你没在外头闯过祸，可同学约的那些局你多半去不了，只能听他们第二天讲。", effects: { freedom: -3, growth: 1 } },
  ];
  const TEMPER = [
    // —— 好 4 ——
    { id: "ct_01", name: "打小坐不住", text: "你小时候板凳上像有钉子，为这个挨过不少说。可爬墙上树你从来都是第一个，摔下来的次数也数不清，胳膊上的疤一直都在。", effects: { health: 3, freedom: 2, growth: -1 }, set: "hook_sporty" },
    { id: "ct_02", name: "坐得住", text: "你从小坐得住。一本书能从天亮看到天黑，家里人喊吃饭要喊三遍。为这个你近视来得早，眼镜片一年比一年厚。", effects: { growth: 3, wisdom: 1, health: -1 } },
    { id: "ct_03", name: "嘴甜，会来事", text: "你从小嘴甜，见人先打招呼。亲戚都喜欢你，过年压岁钱总比哥哥多几张。你也早早学会了：话说得好听，路就宽一点。", effects: { relation: 2, growth: 1 } },
    { id: "ct_04", name: "手巧", text: "你手巧，拆过的闹钟能装回去，坏了的插线板也敢修。邻居家电器出毛病，先敲你家的门。你为此得意了好多年。", effects: { growth: 2, relation: 1 } },
    // —— 权衡 8 ——
    { id: "ct_05", name: "慢性子", text: "你干什么都不紧不慢。作业写到最后，饭吃到最后，可交到你手里的事很少出错。急脾气的老师点过你几回名，后来也习惯了。", effects: { growth: 2, freedom: -1, relation: -1 } },
    { id: "ct_06", name: "心直口快", text: "你心里存不住话，高兴不高兴都写在脸上。为此得罪过人，也交下几个真朋友——他们说，跟你打交道不用猜。", effects: { relation: 2, freedom: -2 } },
    { id: "ct_07", name: "爱较真", text: "你认死理。账算不清你能对一晚上，理说不通你能跟人争到脸红。为这个家里人说你倔，可交给你的数字从没出过大错。", effects: { growth: 2, relation: -2 } },
    { id: "ct_08", name: "怕生", text: "你小时候怕见生人，家里来客你就躲屋里。长大些好些了，可当众说话还是心跳得厉害，要提前在心里排练好几遍。", effects: { growth: 2, wisdom: 1, relation: -2 } },
    { id: "ct_09", name: "贪玩", text: "你小时候心思不在书本上，弹珠、卡片、河沟里的鱼，哪样都比课本有意思。成绩单拿回家，你爸的脸比锅底还黑。", effects: { growth: -2, freedom: 1, health: 1 } },
    { id: "ct_10", name: "懂事得早", text: "你比同龄人懂事得早。大人说话你听得懂一半，就学会看脸色。家里有事，你是第一个被喊去商量的，也是第一个睡不着的。", effects: { relation: 2, wisdom: 1, health: -1, freedom: -2 } },
    { id: "ct_11", name: "上台不怵", text: "学校汇演，老师总点你上台。你不怯场，报幕、朗诵都行，台下坐多少人都不慌。奖状没得几张，这份胆量你带了半辈子。", effects: { growth: 2, freedom: -1, relation: -1 }, set: "hook_stage" },
    { id: "ct_12", name: "胆子大", text: "你胆子大，敢爬最高的树，敢一个人走夜路。为此摔过、丢过、被找过，家里人的心跟着你提了十几年。", effects: { freedom: 2, health: -2 } },
    // —— 坏 4（净负，带智慧补偿）——
    { id: "ct_13", name: "病历本比课本厚", text: "你小时候三天两头往医院跑，病历本摞起来比课本还厚。体育课你多半坐在边上看，看着看着，就把课本从头翻到尾了。", effects: { health: -4, growth: 1, wisdom: 1 }, set: "hook_frail" },
    { id: "ct_14", name: "性子闷", text: "你性子闷，三句问不出一句。家里来客你打个招呼就回屋，同学聚会你总坐在边上。好多事你心里明白，就是不说。", effects: { relation: -3, growth: -1, wisdom: 1 } },
    { id: "ct_15", name: "急脾气", text: "你脾气急，话赶话就上头，事后又后悔。为这个，你跟人红过脸，也跟自己生过闷气，胃就是那时候落下的毛病。", effects: { relation: -2, health: -2, wisdom: 1 } },
    { id: "ct_16", name: "念书不开窍", text: "你念书不开窍，同一道题别人一遍会，你要三遍。老师说你不用功，你在台灯底下坐到半夜，只有你自己知道。", effects: { growth: -3, wisdom: 1 } },
  ];
  const ERAS = {
    c1955: [
      { id: "ce55_01", name: "赶上恢复高考", text: "你十七八岁那年，广播里说恢复高考了。你把箱子底的课本翻出来，煤油灯芯剪了又剪。这件事把你这一茬人的日子，从中间劈成了两半。", effects: { growth: 1, wisdom: 1 } },
      { id: "ce55_02", name: "跟师傅学过手艺", text: "你十几岁就被送去跟师傅学手艺，管吃管住，就是没工钱。师傅骂得凶，可看家的本事没藏着掖着。你出师那天，他把自己那套工具给了你。", effects: { growth: 2, relation: 1 } },
      { id: "ce55_03", name: "粮票布票的年月", text: "你记事起，买什么都要票。粮票、布票、肉票，你妈用手绢包着，压在箱子底。你小学就会算家里这个月还剩几两油。", effects: { wisdom: 1, money: -2, health: -1 } },
      { id: "ce55_04", name: "下乡那几年", text: "你十几岁去了乡下，学会了挑水、插秧，落了一身晒不掉的印子。回城那天，你把那顶草帽留在了老乡家的墙上。", effects: { health: 2, growth: -1, freedom: -1 } },
      { id: "ce55_05", name: "家里那台收音机", text: "你家那台收音机是全巷子头一台。晚上一开，邻居端着小板凳就来了。你趴在桌边听评书，字就是那时候认全的。", effects: { growth: 1, relation: 1, money: -2 } },
      { id: "ce55_06", name: "念书断了几年", text: "你正上学的年纪，学校停了课。你在家帮着干活，课本压在灶台边，落了灰。后来再捡起来，好些东西要从头补。", effects: { growth: -3, wisdom: 1 } },
    ],
    c1965: [
      { id: "ce65_01", name: "家里买了电视机", text: "你上初中那年，家里咬牙买了台电视机，黑白的。搬回来那天，全楼的人都来看。你负责每天上房顶转天线，手举酸了，画面就稳了。", effects: { relation: 2, growth: 1 } },
      { id: "ce65_02", name: "考不考大学那阵子", text: "你高中那两年，家里为你考不考大学吵过几回。考上了是条道，进厂接班也是条道，两边说得都有理。最后你自己去报了名。", effects: { growth: 2, relation: -2, freedom: 1 } },
      { id: "ce65_03", name: "万元户的新闻", text: "你念书那几年，报纸上开始登万元户。老师把那页贴在教室后面。你回家算了算自家的存折，差着十万八千里，可心里有个数字，从此不一样了。", effects: { growth: 1, freedom: 1, relation: -1 } },
      { id: "ce65_04", name: "磁带和喇叭裤", text: "你年轻时攒钱买过一条喇叭裤、一台双卡录音机。磁带转起来，整条街都听得见。你为这个被你爸说了半个月，裤子还是穿出去了。", effects: { freedom: 2, money: -2, relation: 1 } },
      { id: "ce65_05", name: "亲戚下海赔过", text: "你上中学时，有个亲戚辞职下海，头两年风光，后来赔了。过年他坐在角落里不说话，你爸把烟递过去，两个人抽了半宿。", effects: { money: -2, relation: -1, wisdom: 1 } },
      { id: "ce65_06", name: "家里分过家", text: "你十几岁那年，家里为老房子的事分了家。亲戚在院子里吵了三天，你搬着小板凳坐在门槛上，听了个全场。从此过年，有些人就不在一张桌子上了。", effects: { relation: -3, wisdom: 1 } },
    ],
    c1978: [
      { id: "ce78_01", name: "第一批学电脑的", text: "你上中学时，学校机房刚配了电脑，上机要穿鞋套。你把键盘指法练得飞快，老师让你给全班演示，你紧张得手心全是汗。", effects: { growth: 2 } },
      { id: "ce78_02", name: "家里装了电话", text: "你家装电话那年，要排队等号。装好那天，你给每个同学打了一遍，就说一句：我家有电话了。话费单月底寄来，你妈心疼了好几天。", effects: { relation: 2, money: -2 } },
      { id: "ce78_03", name: "录像厅的年代", text: "你中学时，街口有家录像厅，一块钱看一下午。你去过几回，回来被老师点名。那些片子里的城市和街道，你后来真的去过了。", effects: { freedom: 2, growth: -1, health: -1 } },
      { id: "ce78_04", name: "南方有亲戚", text: "你有个亲戚早早去了南方。每次回来，穿的、用的都跟本地不一样，还说那边遍地是机会。你听得心里痒痒，又有点怕。", effects: { freedom: 1, relation: -1 } },
      { id: "ce78_05", name: "攒钱买随身听", text: "你攒了半年零花钱，买了台随身听。磁带是借的，歌词抄在笔记本上。晚自习你塞一只耳机，被同桌告了密，机器在班主任抽屉里躺到期末。", effects: { freedom: 2, growth: 1, money: -2 } },
      { id: "ce78_06", name: "家里那回集资", text: "你上小学时，家里跟风把钱投进过一个集资，说是利息高。后来那笔钱要回来一半都难，家里为这个吵了小半年，饭桌上不许再提那两个字。", effects: { money: -3, wisdom: 1 } },
    ],
    c2000: [
      { id: "ce00_01", name: "兴趣班没白上", text: "你小学被送去学过画画，学了三年，没走这条路。可你配色、看构图的底子留下了，工作汇报的图，你做的总比别人清楚。", effects: { growth: 2, relation: 1 } },
      { id: "ce00_02", name: "网吧那几年", text: "你上初中时，学校后门开了一排网吧。你去过，也在门口被班主任堵过。家里那台电脑买回来那天，拨号音响了整整一晚。", effects: { growth: 2, health: -1 } },
      { id: "ce00_03", name: "手机是高中才有的", text: "你高中才有自己的手机，二手的，屏幕裂了一道。班里群聊你总跟不上，消息攒到晚上才看。为这个你落过几次通知，也躲过不少热闹。", effects: { freedom: 1, relation: -1 } },
      { id: "ce00_04", name: "小升初摇号那年", text: "你小升初那年赶上摇号，电脑派到哪所算哪所。你妈盯着屏幕手心出汗，你倒先去洗了个澡。学校不算近，你骑车单程四十分钟，腿力就这么练出来了。", effects: { health: 1, freedom: 1, growth: -1 } },
      { id: "ce00_05", name: "家里的店让网店挤过", text: "你家开的小店，在你上中学时让网店挤得够呛。你爸学会了拍照上架，学得直揉眼睛。那几年家里说话都带着一股火药味，作业你都是关着门写的。", effects: { money: -2, relation: -1, wisdom: 1 } },
      { id: "ce00_06", name: "眼睛早早坏了", text: "你小学就戴上了眼镜，度数一年涨一截。体检表上那一行，你妈每次看都要叹口气。体育课的眼镜托，你换了七八个。", effects: { health: -3, growth: 1 } },
    ],
  };
  const byId = {};
  for (const c of [...FAMILY, ...TEMPER, ...ERAS.c1955, ...ERAS.c1965, ...ERAS.c1978, ...ERAS.c2000]) byId[c.id] = c;
  // 发牌：三类各用独立派生流（§A3.1）。换年代只重发时代行（家底/性子的种子不含 eraId）。
  function deal(seedStr, eraId) {
    const eraPool = ERAS[eraId] || ERAS.c2000;
    return {
      family: draw3(FAMILY, cardStream(cardSeedFromString(seedStr + "::cards::family"))),
      temper: draw3(TEMPER, cardStream(cardSeedFromString(seedStr + "::cards::temper"))),
      era: draw3(eraPool, cardStream(cardSeedFromString(seedStr + "::cards::era::" + (eraId || "c2000")))),
    };
  }
  window.GAME_CARDS = { family: FAMILY, temper: TEMPER, eras: ERAS, byId, deal };
})();
