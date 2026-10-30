// 《如果那年》事件数据 v0.1 —— 原型用小事件库（目标正式版见 DESIGN-BOOK §6.2）
// 结构: routes 开局路线 / forks 大分岔(按年龄) / events 年度事件池 / shadows 影子剪影
window.GAME_DATA = {
  routes: [
    { id: "bigcity", name: "大城市 · 大厂", desc: "稳定，贵，远。", stats: { money: 12, growth: 10, freedom: -6, relation: -4, health: -2 } },
    { id: "abroad", name: "出国 · 读研", desc: "再读三年，赌一个更大的世界。", stats: { money: -6, growth: 16, freedom: 8, relation: -6, health: 0 } },
    { id: "hometown", name: "回家乡 · 体制内", desc: "离父母 20 分钟，离野心有点远。", stats: { money: 2, growth: -4, freedom: 2, relation: 14, health: 6 } },
    { id: "startup", name: "创业 / 自由职业", desc: "没人管你，也没人给你发工资。", stats: { money: -4, growth: 12, freedom: 16, relation: -2, health: -4 } },
    { id: "gap", name: "先停一年", desc: "所有人都会问你：这一年你干嘛去了？", stats: { money: -8, growth: 4, freedom: 14, relation: 2, health: 8 } }
  ],
  // 影子剪影: 按未选路线给片段, 在 30/40/50 岁瞥视时按年龄段取
  shadows: {
    bigcity: ["在上海买了房，还在还贷", "升到经理，周末经常在加班", "孩子上了小学，他说想慢一点了"],
    abroad: ["留在国外定居了", "在研究所工作，假期才回国", "父母去探亲，住了一个月"],
    hometown: ["在县城当中学老师", "有两个孩子，周末去钓鱼", "陪父亲把老房子翻修了"],
    startup: ["公司活下来了，不大", "搬了三次办公室，还在折腾", "把公司卖了，正在想下一步"],
    gap: ["旅行一年后去做了完全不同的工作", "那一年拍的照片，后来办了个小展", "他说那一年是他最不后悔的选择"]
  },
  forks: [
    { age: 25, title: "25 岁 · 第一次动摇", text: "工作两年，你发现日子和当初想的不太一样。", choices: [
      { label: "咬牙熬资历", effects: { money: 6, growth: 6, health: -4, freedom: -4 } },
      { label: "跳槽换个活法", effects: { money: 2, growth: 4, freedom: 6, health: 0 } },
      { label: "下班后学新东西", effects: { growth: 10, freedom: -2, health: -2 } } ] },
    { age: 28, title: "28 岁 · 回不回老家", text: "老同学在老家安顿下来。深夜你第很多次想：如果当年选了另一条呢？", choices: [
      { label: "留下，继续闯", effects: { money: 6, growth: 6, relation: -4 } },
      { label: "回去，重新开始", effects: { money: -6, relation: 12, health: 6, freedom: 2 } },
      { label: "先拖着，再看看", effects: { health: -4, freedom: -4 } } ] },
    { age: 31, title: "31 岁 · 婚与不婚", text: "身边的人陆续结婚。你们谈了很久，没有标准答案，只有你们的日子。", choices: [
      { label: "结婚成家", effects: { relation: 14, money: -6, freedom: -6 } },
      { label: "先不结，同行一段", effects: { relation: 6, freedom: 6 } },
      { label: "一个人也很好", effects: { freedom: 10, relation: -6, growth: 4 } } ] },
    { age: 35, title: "35 岁 · 要不要孩子", text: "这不是一道对错题。你们算了钱，算了时间，也算了心。", choices: [
      { label: "要，迎接新成员", effects: { relation: 12, money: -10, health: -4, freedom: -8 } },
      { label: "不要，把日子过给自己", effects: { money: 8, freedom: 10, relation: -2 } },
      { label: "顺其自然", effects: { relation: 4, freedom: 2 } } ] },
    { age: 38, title: "38 岁 · 买房关口", text: "房价和你的存款赛跑。你站在售楼处门口，站了很久。", choices: [
      { label: "上车，背上贷款", effects: { money: -12, relation: 4, health: -4 } },
      { label: "不买，租着住", effects: { money: 6, freedom: 8 } },
      { label: "去更小的城市买", effects: { money: -4, freedom: 4, growth: -4 } } ] },
    { age: 42, title: "42 岁 · 行业变冷", text: "行业忽然变冷。比你小十岁的人，开始面试你。", choices: [
      { label: "转管理，守住阵地", effects: { money: 6, growth: 4, health: -6 } },
      { label: "转行，从头学起", effects: { money: -8, growth: 12, freedom: 6 } },
      { label: "降薪换清闲", effects: { money: -8, health: 10, freedom: 8 } } ] },
    { age: 47, title: "47 岁 · 中年分岔", text: "你要不要从做了二十年的生活里，抽身出来一点？", choices: [
      { label: "培养一个能陪老去的爱好", effects: { health: 8, freedom: 6, growth: 4 } },
      { label: "再拼一次大的", effects: { money: 8, growth: 8, health: -8 } },
      { label: "多陪陪父母", effects: { relation: 12, money: -4 } } ] },
    { age: 52, title: "52 岁 · 照护与自己", text: "父母老了，你也开始体检单上见红字。日子要重新排优先级。", choices: [
      { label: "接父母同住", effects: { relation: 12, health: -4, freedom: -6 } },
      { label: "请人照护，自己常回去", effects: { money: -8, relation: 6 } },
      { label: "先把自己身体管起来", effects: { health: 12, money: -4 } } ] }
  ],
  events: [
    { min: 23, max: 30, text: "项目上线那晚你睡在公司。奖金到账时，你给家里换了台冰箱。母亲说：冰箱很好，就是你过年能回来吗。", effects: { money: 5, health: -3 } },
    { min: 23, max: 40, text: "父亲体检有个指标异常，要复查。那一周，你什么选择题都做不好。", effects: { relation: 4, health: -2 } },
    { min: 24, max: 35, text: "你在异乡的超市里学会做家乡菜。视频那头，父亲的头发白了一大半。", effects: { relation: 3, growth: 2 } },
    { min: 26, max: 45, text: "你带的小团队第一次拿了奖。回家路上你买了一束花，没什么理由。", effects: { growth: 5, health: 2 } },
    { min: 30, max: 50, text: "老同学聚会。有人升了总监，有人回了老家，有人正在离。你们都没说自己过得好不好。", effects: { relation: 4 } },
    { min: 32, max: 55, text: "你开始失眠，又开始跑步。身体用它的方式提醒你排顺序。", effects: { health: 5 } },
    { min: 34, max: 48, text: "账上第一次有了一笔像样的存款。你盯着数字看了很久，想起 22 岁宿舍退掉的那天。", effects: { money: 7 } },
    { min: 36, max: 58, text: "母亲学会用视频通话了。她举着手机给你看院子里的花，花比人清楚。", effects: { relation: 5 } },
    { min: 40, max: 60, text: "你把父母接来住了一阵。家里变挤了，晚饭变热闹了，你的睡眠变差了。三件事都是真的。", effects: { relation: 6, health: -3 } },
    { min: 45, max: 64, text: "年轻同事问你职业建议。你说了一半，停住——你其实也不确定。", effects: { growth: 3 } },
    { min: 50, max: 64, text: "你重拾年轻时放下的相机/琴/球拍。手生了，心是热的。", effects: { health: 4, freedom: 4 } },
    { min: 23, max: 64, text: "平平常常的一年。没有大事发生。后来你才知道，这样的一年最难得。", effects: { health: 2, relation: 2 } }
  ]
};
