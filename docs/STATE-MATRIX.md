# 状态矩阵（v0.12.0）——域、流转、注册表与入库门

> 本文档是《如果那年》状态架构的正本。机器可读的单一事实源是 `src/registry.js`；
> 本文档解释裁定与口径，两者冲突时以注册表为准并立即修文档。

## 1. 为什么分两层

v0.11 及以前，全库 168 个自由布尔旗标没有总表：互斥（结了婚又离了婚，`partner` 旗还立着）与不可逆（父亲去世后又被「健在」事件抽中）全靠写手在两千多条事件里逐条挂 `require/forbid`，记漏就是 bug——配偶悬空、子女悬空、父亲复活、悬空旗、立旗漏应用，四次同病发作（见 DEVLOG v0.9.1/v0.9.2/v0.11.0）。

v0.12 起分两层（混合架构，不全量推倒）：

- **状态域**：域内互斥、或流转不可逆的人生状态，收进状态矩阵 `S.state`。门控查状态，不再靠人手挂互斥 forbid；流转只能走注册表声明的边，去世类状态没有出边，**数据层写不出复活**。
- **叙事里程碑**：其余旗标留在 `S.flags`，语义是「这件事发生过」的单向事实（立后不清、彼此不互斥），全部登记在注册表里，带 setter 清单，入库门逐项核对。

判据：一个旗标进状态域，当且仅当它与同组旗标**互斥**（同一时刻只能真一个）或其否定方向**不可逆**（去世、离异后的「曾结过婚」这类回不去的事实）。拿不准的留里程碑并在 §3 写明理由。

## 2. 状态域定稿（6 域）

| 域 | 初始 | 状态 | 已启用流转边（载体） | 终态 |
|---|---|---|---|---|
| spouse 配偶 | none | none / single / dating / partnered / divorced / widowed | none→partnered（fork31）、none→single（fork31）、none→dating（fork31）、partnered→divorced（p27_001）、partnered→widowed（p28_001） | divorced、widowed（见 §4 再结伴） |
| kids 子女 | undecided | undecided / has / none | undecided→has（fork38）、undecided→none（fork38） | —（has/none 互斥，无出边） |
| dad 父亲 | alive | alive / dead | alive→dead（p4_015） | dead |
| mom 母亲 | alive | alive / dead | alive→dead（p4_086） | dead |
| dog 宠物狗 | none | none / home / gone | none→home（p11_049 选项）、home→gone（p11_054） | gone |
| cat 宠物猫 | none | none / home / gone | none→home（p5_043）、home→gone（p5_044 / p13_055） | gone |

设计说明（每条都有普查实据，见 DEVLOG v0.12.0）：

- 配偶域的三个起点（partnered/single/dating）来自 31 岁分岔的三种立场。`dating`（原 `slow_love`）不是「没伴」：慢线玩家在文本里有长期对象（同居、领证、互相照护），只是没走 `partnered` 的婚况叙事线。两条线的事件池因此不同——这是存量设计，迁移只如实翻译，不合并。慢线内部的 `together/faded/long_dist/two_cities` 是叙事里程碑（同线内可先后发生、不互斥），留在旗标区。
- 父亲与母亲分两个域：双亲去世时点独立；且存量设计是「只有先走的那位有去世叙述事件」（p4_015 与 p4_086 互相以对方健在为门），分域后该约束由各自的 `alive` 门自然保持。
- 猫的「领养」在旧数据里没有立旗（p5_043 只作 chain 锚点），迁移时给 p5_043 补 `setState: {cat:"home"}` 作为入边载体——这是全轮唯一新增的流转字段，依据是它就是领养事件本体且全猫线 chain 以它为父。一次性宠物速写（如 p3_031 街边猫）不在追踪线内，保持旧行为不挂状态。

## 3. 不入域的候选与理由

| 候选 | 裁定 | 理由（实测） |
|---|---|---|
| 居所组（moved_city / stayed_city / back_home_stay / near_family / often_back / saw_home / renting / bought_house） | 留里程碑 | 它们是正交累积事实：买了房可以又回老家、租房与买房在不同人生阶段都真；无互斥、无不可逆。人生形状标签按优先序消费它们，是呈现层的事。 |
| 职业组（laid_off / rehire / retired_full / side_job / xiahai / steady_job 等） | 留里程碑 | 下岗可再就业、退休可返聘、副业与正职并行——可循环、可叠加，不是状态机形状。 |
| kid2 / kid_abroad | 留里程碑 | 子女域的附加事实（二孩、在外），与 has 兼容并存，非互斥。 |
| together / faded / long_dist / two_cities | 留里程碑 | dating/partnered 线内的关系进程标记，同一玩家可先后经历（先异地、后安定），不构成互斥分区。 |

## 4. 再结伴边（v0.13.0 已启用）

离异/丧偶后再结伴是登记在案的设计张力（v0.11.0 ⑥）。v0.12 逐条精读存量候选后的结论是无合格载体（`p27_006` 止于一杯咖啡、`p28_006` 文本是回绝），两条边先以 reserved 登记、只报警告，不硬造。

v0.13.0 补出专属载体后启用，引擎零改动：

- **离异线 pack31**：`p31_001` 相识（36–62 岁，门 `state.spouse=divorced`；走近的选项立里程碑 `re_div_start`，「算了」选项不立旗、不惩罚）→ `p31_002` 相处（42–68 岁，require `re_div_start` + chain）→ `p31_003` 落点（48–72 岁；结伴选项带选项级 `setState {spouse:"partnered"}`，效果为关系+/自由−的权衡签名；「算了」选项无 setState）。三环带 `w:4` 且年龄窗整体上移：初版定向模拟漏斗过窄（命中 23/1/0、流转 0），实测根因是中年池密度——45 岁可抽池加权约 500、晚年仅约 150–220，同权重下年命中率差约 3 倍；离异多年后再结伴在叙事上同样成立，故链窗上移进晚年稀薄池并加权至值域上限，复测达标（数字见 DEVLOG v0.13.0 条）。
- **丧偶线 pack32**：同构三环（`p32_001` 58–70 岁立 `re_wid_start` → `p32_002` 60–74 岁 → `p32_003` 64–78 岁落点流转 widowed→partnered；落点「算了」选项 effects 为空，是全线持平收尾；三环带 `w:2`——丧偶线本就位于晚年稀薄池，初版即达标，未随离异线加权）。
- 注册表两条边的 `by` 已填（`p31_003`/`p32_003`）、reserved 已摘除，校验门警告清零。流转只在走完三环后发生：相识/相处两环不写 setState，再结伴在数据层同样写不出「一步到位」。

## 5. 旧存档迁移（deriveStateFromLegacy）

v0.11 及更早的存档没有 `state` 字段，载入时由旧 flags 推导（引擎 `deriveStateFromLegacy`）：

| 域 | 推导规则（按序） |
|---|---|
| spouse | divorced 与 spouse_dead 同立时按 usedEvents 中 p27_001/p28_001 的先后取后发生者；否则 divorced→divorced、spouse_dead→widowed、partner→partnered、single_ok→single、slow_love→dating；都没有→none |
| kids | has_kid→has；否则 no_kid→none；否则 undecided（undecided_kid 旗与从未表态同形，都是 undecided） |
| dad / mom | dad_dead→dead / mom_dead→dead；否则 alive |
| dog | dog_gone→gone；否则 dog_home→home；否则 none |
| cat | cat_gone→gone；否则 usedEvents 含 p5_043→home；否则 none |

歧义与保守口径：

- 离异与丧偶在旗标时代可同局同立（p28_001 旧门控没挡离异者），真实终态取决于发生顺序——usedEvents 是有序的，取后发生者，是唯一有据的读法。
- together（慢线安定）无法从旧旗标区分「dating 已安定」与「dating 未安定」，且状态域里本就没有这一档（together 仍是里程碑旗、续玩后照常消费），不影响推导。
- 推导只在存档缺 state 时发生一次，续玩落盘后即为正常 state 存档。

## 6. 数据字段口径（写手与校验门共同依据）

| 字段 | 形态 | 口径 |
|---|---|---|
| `state` | 对象 `{域: 值}` 或 `{域: [候选值...]}` | 正向状态门：每个域都要相等（数组=属于其一）。抽取权重与 `require` 同级（×3）。 |
| `stateAll` | 对象，同上 | 与 `state` 语义完全相同，区别只在抽取权重（×1，与 `all`/`forbid` 同级）。两个字段并存是为迁移保真：存量引擎只给 `require` 来源的门控 ×3 权重，`all`/`forbid` 来源的没有；v0.12 逐条按来源映射（require→state、all→stateAll、forbid 转正向→stateAll），保证迁移前后抽取分布不变。写新事件时：把状态条件当硬前置（没有它事件不成立）用 `state`，当组合条件之一用 `stateAll`，与 require/all 的选择同构。同域不许在两个字段写不一致的候选集（校验门报错）。 |
| `stateNot` | 对象 `{域: 值或[值...]}` | 负向状态门：当前状态命中任一所列值即不过。只在没有同域正向门时有意义（有正向门时其余状态已被排除，再写是冗余，请勿写）。 |
| `setState` | 对象 `{域: 目标值}` | 流转声明，位置与 `set` 相同（无选项事件/稀有写顶层，有选项写选项级），生效时机与 `set` 相同（呈现即生效 / 选项点选时生效）。引擎只执行注册表已启用边内的流转；未声明的边在运行时被忽略、在校验门报错。 |
| `set` / `require` / `forbid` / `all` / `any` | 同 v0.11 | 只许引用注册表里程碑旗标。v0.11 的 13 个域旗（partner/single_ok/slow_love/divorced/spouse_dead/has_kid/no_kid/undecided_kid/dad_dead/mom_dead/dog_home/dog_gone/cat_gone）在任何字段出现即报错。 |

## 7. 入库门：tools/validate-state.js

```bash
node tools/validate-state.js   # 退出码 0 = 通过；警告须在交付说明里交代
```

检查项：①未登记引用（旗标、域、状态值）报错；②注册表里程碑 setter 清单与数据实扫双向一致（声明了没立、立了没声明都报错）；③流转边载体双向一致；④不可逆违规（终态有出边）报错；⑤互斥组合（同域 state 与 stateNot 冲突）报错；⑥进入终态的事件未自门控前态报错（须 `state` 正向要求前态，或 chain 指向入边载体且 stateNot 排除终态）；⑦不可达状态与 reserved 边列为警告；⑧重复 id、chain 悬空报错；⑨出身牌（src/cards.js）一并实扫——牌是钩子旗的 setter 本体，牌 id 与事件撞名报错（v0.13.0 起）。

载体 from 推断（v0.13.0 口径补强）：③的载体登记按 `setState` 的 from 推断——条目自身及从父事件继承的正向 `state`/`stateAll` 门控给出 from 候选时，只登记 from∈门控值的边；无门控的分岔条目按校验门内 `UNGATED_FORK_FROM` 声明表取前态（fork31→spouse=none、fork38→kids=undecided：分岔是一次性年龄节点，前态由结构保证——fork31 在 31 岁触发，此前无任何条目能写 spouse）；其余无门控条目仍登记为全部指向该 to 的已启用边的载体。补强前在 v0.12 数据树上对照运行过，输出（PASS、警告 2）与补强前逐字一致。

内容轮流程：新旗标先在交付回报里登记（名称+立旗条目），由协调者写入注册表后跑门；新状态/新边先改注册表与本文档，再写数据。门不过不入库。

## 8. 迁移映射摘要（v0.11 → v0.12）

基线↔现行逐条 diff 实测：**644 条门控/立旗记录变更**（含事件顶层与其选项层），其余条目一字未动。正向状态门按来源分两个字段（state=require 来源、stateAll=all/forbid 来源，见 §6），下表按域归类、不分字段。按旗标引用口径（与 v0.11 普查同口径对账）：

| 类别 | 旧形 | 新形 | 引用数 |
|---|---|---|---|
| 配偶正向门 | require/all 含 partner / single_ok / slow_love / divorced / spouse_dead | state.spouse = partnered / single / dating / divorced / widowed | 364 |
| 配偶负向门 | forbid 含 divorced（268）/ spouse_dead（269）/ partner（1，p25_061） | 有同域正向门时删除（互斥自动成立，274 条）；否则 stateNot.spouse | 538 |
| 子女门 | require/all 含 has_kid / no_kid / undecided_kid（249）+ forbid no_kid（1） | state.kids = has / none / undecided（forbid 的 1 条被正向门吸收） | 250 |
| 双亲门 | forbid dad_dead（81）/ mom_dead（71） | state.dad = alive / state.mom = alive（二值域用正向门） | 152 |
| 宠物门 | require dog_home（5）+ forbid dog_gone（6）/ cat_gone（9） | state.dog = home / stateNot.dog、stateNot.cat | 20 |
| 流转点 | set 立域旗 14 处 + p5_043 补挂 1 处 | setState（fork31×3、fork38×2、p27_001、p28_001、p4_015、p4_086、p11_049 选项、p11_054、p5_043、p5_044、p13_055） | 15 |
| 特例 | fork38「再等等」选项 set undecided_kid | 删除 set（undecided 是初始态，本就无流转） | 1 |
| 特例 | p13_014 `all:["slow_love","partner"]` | state.spouse ∈ [dating, partnered]（见下） | 1 |

p13_014 特例说明：原稿 `all` 同时要求 slow_love 与 partner，而这两旗是 31 岁分岔的互斥选项，**该事件自入库起永不可抽**（死条件）。其文本是两人商量老了住哪边、钱怎么安排、谁先走一步——长期伴侣语境，慢线与婚线都成立。迁移按文本语义改为候选数组 [dating, partnered]，使事件首次可达——这是本轮唯一一处由迁移修复的可达性变化，命中变化在验收中单独归因。

行为等价口径：除三处结构性收紧外，翻译逐条保持旧语义——①离异/丧偶后，旧旗标不落导致的「前配偶预设事件仍可抽」被状态门关闭（基线语义探针实测有此泄漏，见 DEVLOG）；②p27_001 旧门控未挡丧偶者、p28_001 未挡离异者，两处跨状态抽取被关闭；③lifeTags 收尾段原读旗标（离异后 partner 旗还在，会误读「和老伴走完」），改读当前状态，与 ① 同源修正。
