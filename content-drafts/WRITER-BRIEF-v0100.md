# WRITER-BRIEF-v0100.md — v0.10.0 扩容轮写手简报正本（2026-10-31）

> 本简报由总协调从现行代码实测抽取，与 content-drafts/COVERAGE-AUDIT.md、docs/COPY-AND-AI.md、content-drafts/OCCUPATIONS.md 共同构成派单正本。写手只按本简报写，不许自行发明字段、路线名、年代名或标记名。

## 一、配额口径变更（用户 2026-10-31 新裁定，优先级高于审计原配额表）

**默认通用，专属要举证：写不出「换个年代就不成立」的理由，就不许锁年代。**

- 分类不切太碎，能共用的多共用。年代专属只保留三类硬专属：①年代资产线（认购证/国库券→c1955、房改房/早期股市→c1965、房价/6124→c1978、加密/AI 进工作→c2000）；②年代标志性集体经历的本人视角（如 下岗→c1955/c1965）；③技术与物价明显带年代烙印、改写成通用就会失真的内容。
- 其余一切——家庭、健康、照护、关系、兴趣、工作日常、迁徙、回望——一律写通用（不写 era），文本里不许把单一时代的物价/技术/政策写死成唯一版本。
- 再平衡后矩阵（844 总数不变；年龄列计 160/210/226/248 不变；注：审计 §2.1 格表逐格加总为 215/221，与其印刷列计 210/226 差 5，本轮按列计执行）：

| 年代＼年龄 | 22–34 | 35–49 | 50–64 | 65–80 | 行计 |
|---|---|---|---|---|---|
| 通用 | 90 | 110 | 145 | 165 | **510** |
| c1955 专属 | 12 | 26 | 22 | 26 | **86** |
| c1965 专属 | 14 | 25 | 22 | 28 | **89** |
| c1978 专属 | 16 | 25 | 21 | 29 | **91** |
| c2000 专属 | 28 | 24 | 16 | 0 | **68** |
| **列计** | **160** | **210** | **226** | **248** | **844** |

- c2000/c1965/c1978 的供给问题靠通用池抬升解决，不靠堆专属；专属只留硬货，模拟里专属命中 >0 即可。

## 二、字段口径正本（代码实测）

数据文件形态：`window.GAME_PACKS = (window.GAME_PACKS || []).concat([ ... ]);`，纯数据、无函数。每条事件对象可用字段只有下列这些：

| 字段 | 形态 | 口径 |
|---|---|---|
| `id` | 字符串 | 协调分配的前缀 + 三位序号，全库唯一 |
| `min`/`max` | 整数 | 年龄窗，22≤min≤max≤80，且**整窗必须落在派单年龄段内**（不许跨段，保配额可对账） |
| `text` | 字符串 | 正文 60–110 字（汉字计） |
| `effects` | 对象 | 无选项事件的效果；有 `choices` 时**不许**再写顶层 effects |
| `choices` | 数组 2–3 项 | 每项 `{label, effects, echo}`，可加 `set`；**echo 必填**，缺一打回 |
| `era` | 字符串 | 仅硬专属用，值域 {c1955, c1965, c1978, c2000}；通用事件**不写** era/eraIn |
| `route`/`routeIn`/`forbidRoute` | 字符串/数组/字符串 | route 值域只有 {corp, home, abroad, study, gap}，自创（stay/bigcity 类）视为未交付 |
| `require`/`forbid` | 字符串或字符串数组 | 值只能来自 §三 setter 清单或本包新标记（见标记纪律） |
| `all`/`any` | 字符串数组 | 同上 |
| `when` | 对象 | 只许 `{stat, lt}` 或 `{stat, gt}` 二选一，stat 为六维键之一，值为整数；**不许字符串形** |
| `stats` | 数组 | 每项 `{k, lt}` 或 `{k, gt}`，k 为六维键之一 |
| `chain` | 字符串 | 只许填**已存在的事件 id**（存量 id 或本包 id），不许填标记名 |
| `set` | 字符串 | 立旗位置见标记纪律 |
| `topic` | 字符串 | 草稿期审计字段（主主题，十二选一，见 §五），集成时由协调剥除 |
| `cell` | 字符串 | 草稿期审计字段（如 `通用×35–49`、`c1978×22–34`），集成时剥除 |

## 三、有效 setter 旗标清单（2026-10-31 从代码实测抽取）

抽取方法：按 index.html 加载顺序以 vm 载入全部 17 个数据文件，遍历核心事件+全部 pack+combos+rare+forks+endings。实测：可抽池 1156 条；**有效 setter 134 个**（含 v0.9.2 已修复的 12 个顶层 set 出处与稀有选项出处）；被引用标记 81 个；悬空引用 0。

134 个有效 setter（字母序）：
`ad_first, ai_daily, aims_team_lead, asked_leave, back_home_stay, badminton_captain, bookkeeping, bought_car, bought_commodity, bought_fangai, bought_house, bought_renzheng, calligraphy_teach, car_bought, care_hired, care_rotate, care_self, carpool_group, cert_study_started, cert_try, classmate_table, community_active, commute_reading, cooking_recipe, data_only_rep, dca, dinner_prep_habit, dog_home, door_neighbor, e78_ai, e78_car, edu_fund, ev_car, ex_colleague_neighbor, faded, fam_shop_in, fish_spot, frugal_rule, fund_bought, garden_share, had_pager, hainan_dream, has_kid, helped_divorce_colleague, hobby_badminton, hobby_calligraphy, hobby_cooking, hobby_fishing, hobby_garden, hobby_music, hobby_photo, hobby_run, ins_critical, jizi_house, job_hop, kid2, kid_abroad, knows_boss_focus, laid_off, legacy_sharing_done, less_work, let_go, library_talk_given, library_volunteer, loan_swap, long_dist, mentor_bond, monthly_sync_habit, moved_city, moved_school, music_stage, near_family, new_friend, night_school, no_ins, no_kid, often_back, p1_ai_user, parent_help, parent_pension_ok, parents_money_guard, partner, photo_show, photos_scanned, plan_late_retire, prepaid, promise_grandkid, refused_drink_once, rehire, renting, retired_full, run_marathon, saw_home, secondment_extended, shop_closed, side_job, side_start, single_ok, slow_life, slow_love, ss_fixed, stall_breakfast, stay_put, stayed_city, steady_job, stock_2008, together, took_over_job, touched_trade, traj_antique, traj_award, traj_book, traj_champ, traj_drug1, traj_drug2, traj_funded, traj_hero, traj_ipo, traj_lottery, traj_patent, traj_school, traj_startup, traj_viral, traj_vp, traj_windfall, tried_stock, tutor_hard, two_cities, undecided_kid, video_addict, video_quit, volunteer_regular, went_sancan, xiahai`

**优先消费的 46 个已埋未用标记**（有 setter、从未被引用，回响燃料现成，优先于新造标记）：
`ai_daily, aims_team_lead, asked_leave, badminton_captain, bought_car, bought_commodity, bought_fangai, bought_renzheng, calligraphy_teach, carpool_group, cert_study_started, classmate_table, commute_reading, data_only_rep, dca, dinner_prep_habit, e78_car, frugal_rule, had_pager, hainan_dream, helped_divorce_colleague, jizi_house, kid2, kid_abroad, knows_boss_focus, legacy_sharing_done, library_talk_given, library_volunteer, loan_swap, mentor_bond, monthly_sync_habit, night_school, parent_pension_ok, photos_scanned, plan_late_retire, promise_grandkid, refused_drink_once, secondment_extended, stall_breakfast, stock_2008, took_over_job, touched_trade, tried_stock, video_quit, went_sancan, xiahai`

### 标记纪律（逐字执行）

1. v0.9.2 结论：**顶层 `set` 是活字段**——无选项事件呈现即立旗（引擎与稀有路径同语义）。带选项事件立旗**只许**写选项级 `choices[].set`；带选项事件写顶层 set 不生效，视为错误。
2. `require/forbid/all/any` 引用的标记只能来自上表 134 个，或本包新标记。新标记只能由**本包**事件的选项 set（或无选项事件顶层 set）定义、只能被**本包**事件引用，且必须在交付回报里逐个登记（名称+定义事件 id+引用事件 id）。
3. 不许引用 traj_* 标记写普通回响（那是稀有轨迹链的内部标记）。
4. `chain` 只能填已存在 id 或本包 id。

## 四、数值纪律

- 维度键只许六个：`health, money, growth, freedom, relation, wisdom`。错字（free/wise 类）导致效果静默丢失，直接打回。
- 划界：成长=本事（学与练，会贬值）；智慧=判断（阅历与吃亏，只涨不贬）。
- 单项效果整数 −10..+10 且非 0；单个效果对象（事件本体或每个选项分别算）合计绝对值 ≤14。
- **智慧只许 +2..+5，不许负智慧、不许 +1 或 +6 以上**。
- **坏事默认带智慧补偿**：任一效果对象带负值时，除非纯属天降横祸（自然灾害、突发疾病这类叙事上学不到东西的），同一对象内应同时给 wisdom +2..+5。
- 带 choices 的事件约占本包 1/3（30%–36%）；有 choices 时效果只写选项里，每个选项都必须有 effects 与 echo。
- 每名写手在其覆盖的每个 5 岁小段，至少 3 条保底事件：只带 era（专属格）或全无条件（通用格），不带 route/require/forbid/all/any/chain/when/stats/routeIn/forbidRoute/eraIn 中任何一个。晚年与无孩玩家要有完整供给，不许把条目全押在 has_kid/partner 上。

## 五、主题口径

主主题十二选一（`topic` 字段）：职业工作 / 资产钱财 / 照护陪伴 / 家庭亲子 / 健康身体 / 兴趣爱好 / 晚年回望 / 学习考试 / 伴侣婚恋 / 迁徙居住 / 团队体育 / 数字生活。每条事件恰好一个主主题，按派单给定的逐写手主题配额交付。

硬指标（跨写手合计，派单逐项落到人）：职业 170 内含半导体 28（G 簇 7 职业全覆盖）、IT 30、制造工匠 30、交通物流 24、医疗照护供给侧 20、商贸餐饮 20、农林牧渔 18；资产 96 内含年代资产线补环 48、电商/个体起伏 24、晚年钱账 24；照护 84 内含父母照护深化 36、配偶照护 24、照护者本人视角 24；兴趣 70 内含园艺 12、乐队/音乐 12、摄影 10、电竞 10、读书写作 12；学习 56 内含考公考编 20、考研 12、证书/技能贬值 12、老年大学 12；伴侣 48 内含相亲进行时 12、中年关系损耗 12、晚年老伴日常 24；迁徙 44 内含移民/跨境 16、返乡再迁徙 16、租房搬家 12；团队体育 24 四环各 6（入队/联赛/中年队长/老年带队带娃回望）；数字 24 只计生活侧。

## 六、文案纪律（COPY-AND-AI 摘要，逐条执行）

1. 说具体的事，不说抽象的理；情绪让玩家自己产生。
2. 句子长短像说话；禁止排比三连、禁止金句收尾、禁止翻译腔（进行抉择/迎接挑战/开启新篇章类）。
3. 数字像人记账：月工资、押金、计件单价、账上剩几个月工资这一层，不写报表腔。
4. **禁词零命中**：后来你才知道、才明白、原来这就是、不禁、油然而生、岁月、时光荏苒、人生就是、江湖。
5. 每条过朗读测试：像不像一个人在饭桌上讲另一个人的人生。
6. 留白：平年就平平无奇地过，不必条条点题。
7. 称呼：伴侣只称「对方/另一半」；玩家本人只用「你」；**玩家的孩子不写性别**（不用他/她指玩家的孩子，不写儿子/女儿指玩家的孩子，用「孩子」）；他人孩子非必要不写性别。
8. 红线：不涉政（无官职晋升线/政党/选举/军事；年代事件只写个人生活切片、不评价政策、无领导人姓名）；不玄幻（无超能力/预知/鬼神/风水改命；「神药」只指真实新药研发获批；彩票与加密暴富只许诚实极低概率且写税后平静后续——普通池不写暴富）；加密线按诚实分布（多数卖飞/丢钥匙/被骗）；敏感题材写事不写惨、一个具体细节带过；不贬低任何活法，稀有不等于高贵，结局无高下。
9. 通用事件的时代中立：不写死单一时代的物价/技术/政策为唯一版本（要写数字，写相对量：几个月工资、一笔押金；要写技术，写功能不写型号年份）。

## 七、浪潮口径（本轮特别）

浪潮试点（c1978 房价组 6 条随 W3、c1955 高考组 5 条随 W6）**只按普通事件写**：不带 wave 字段、不依赖必经机制、不许用 chain/require 把它们串成必经序列；就是同年代同年龄段的正常专属事件，计入对应专属格。docs/WAVE-EVENTS.md 在 §3.4 中段截断（止于 c1965 下海组伏笔表一半，§3.5 以后缺失），本轮不补写该文档。

## 八、交付格式

- 文件：`content-drafts/w<编号>-pack<包号>.js`，内容为 `window.GAME_PACKS = (window.GAME_PACKS || []).concat([ ... ]);`。
- 回报必须含：总条数、逐格（cell）分布、主主题分布、新标记登记表、保底事件计数、带 choices 条数。任一格对不上派单数视为未完成。
