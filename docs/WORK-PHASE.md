# 活计相位 workPhase（v0.19.0）

退休不是一条事件，是一段相位。这份文档是 `workPhase` 域的单一口径：域定义、转换规则、进程落点、给未来钱进程留的接口。注册表（`src/registry.js`）是声明层，引擎进程（`src/engine.js` 的 `workPhaseDue` 一带）是执行层，两处对不上以注册表为准回修。

## 一、域定义

- 域名：`workPhase`（与 `abroadKind` 同轮新增的状态域）。
- 取值：`working`（还在全职干）/ `part`（半退：一周去一半的日子、返聘做半截、慢慢交棒）/ `retired`（退了）。
- 初值：`working`。旧存档缺这个域时按初值补齐，节点计划在续玩时按当前年龄与活计形态惰性生成，不追溯改写已经过去的年份。
- 相位只记「现在干到什么程度」，不记在哪儿干、干什么——那是入行旗（`factory_work`、`fab_work`、`shop_work` 等）和路线的事。相位与入行旗正交。

## 二、转换规则

触发是一个小进程（`workPhaseDue`），走进程流（`#world`，`rngW`），不碰叙事流和环境流，不改死亡判定。

1. **节点年龄（每局定一次）**：主角满 50 岁且仍 `working` 时，按当时的活计形态定下本局的节点年龄，记进 `S.retirePlan = { form, nodeAge }`：
   - `formal`（体制内形态）：路线是 `home`，或持有正式入行旗（`factory_work`、`fab_work`、`craft_work`、`heavy_work`、`miner_work`、`truck_work`、`med_hosp`、`teach_work`、`acct_work`、`fin_work`、`press_work`、`dev_work`）→ 节点在 **55–60 岁**均匀取一岁。
   - `informal`（自营/零活形态）：持有 `shop_work`、`gig_work`、`farm_work`、`courier_work`、`care_work`、`write_work` 任一，且不属 formal → 节点在 **63–68 岁**。
   - `fallback`（以上都不沾，如 corp/study/abroad/gap 又没落入行旗）→ 节点在 **58–63 岁**。
2. **节点拍 `proc_retire_node`**：到节点年龄发一拍（进程拍，不独占这一年），玩家三选一：
   - 「退下来」→ `working → retired`（同时立 `retired_full`）；
   - 「先半退」→ `working → part`（同时立 `slow_life`）；
   - 「再干几年」→ 不流转，节点后移 3 年（`deferRetire`），推迟计数 +1。推迟满两次后不再给节点拍，改走收束拍。
   58 岁既有分岔 `fork58` 是并行的第二道节点：它的三个选项同步写 `workPhase`（退→`retired`、返聘→`part`、半退→`part`），先到哪个算哪个，后到的按当时相位走已声明的边。
3. **半退到期 `proc_retire_full`**：进入 `part` 的那一刻，停留年数就定下了（流转执行点 `applyState` 里按进程流取：1–3 年；由 `retired` 返聘回来的 +2 年；`informal` 形态再 +2 年）。停留满后发一拍落定 `part → retired`（同时立 `retired_full`），正文就是领第一笔退休的钱那一拍。
4. **收束 `proc_retire_auto`**：推迟两次后到点、或拖过 74 岁仍 `working`，发收束拍直接 `working → retired`。保证活得够久的人最终都落到 `retired`，不会出现 75 岁还在全职口径里飘着。
5. **返聘回流边 `retired → part`**：`e_rehire_1`（老单位请回去做半截）、`e_rehire_2`（带新人一阵）两条普通事件，挂 `state = retired`，选接活才流转（同时立 `rehire`）。回 `part` 后照样走半退到期，再退一次。
6. **正文落点**：相位切换从不静默——节点拍、半退到期拍、收束拍都是带正文的进程拍；普通池另有 `e_retire_firstmonth`（退下来头一个月的不习惯，`state = retired`）和 `e_retire_farewell`（半退后回去拿东西，`state = part`）接住切换之后的日常。

## 三、晚年文本对账口径（同轮已执行）

- 60 岁上下还在写「全职上班/最后一个月交接/天亮上班」的条目，补 `stateNot = { workPhase: "retired" }`（`part` 仍可命中，半退的人还在干活，口径成立）：`p14_002`、`p15_070`、`p20_070`、`e65_052`、`p22_062`。
- 正文已按「退休后/养老金到账」写的条目，补 `state = { workPhase: "retired" }`：`p12_019`、`p14_003`、`p14_011`、`p14_012`、`p14_018`、`p14_041`、`p15_064`、`p21_057`、`p22_053`、`p23_037`、`p23_062`、`p24_037`、`p25_001`、`p25_002`、`p25_034`、`p25_067`、`e55_046`、`lk_retire_kid`。
- 只审不改的也登记在同轮交付 json（`phase4-build.json` 的 `lateLifeReviewedNoChange`）：办手续/欢送会这类「切换当天」的条目对 `working` 与 `part` 都成立，不设门；`p20_056` 的年龄窗（50–54）早于任何退休节点，补 `retired` 门会造成窗×前置错误，保留原样。

## 四、给未来钱进程的接口

养老金标定（未来轮次）只读下面四个量，不许自己再推一套退休时点：

| 量 | 位置 | 含义 |
|---|---|---|
| 当前相位 | `S.state.workPhase` | `working` / `part` / `retired`，任意时点可读 |
| 退休落点 | `S.retiredAt` | 进入 `retired` 的年龄（返聘后二退会刷新为最近一次）；未退为 `null` |
| 退休前形态 | `S.retirePlan.form` | `formal` / `informal` / `fallback`，节点计划生成时定下；`fork58` 先行落定的人可能为空，此时按落定时的入行旗用引擎 `workForm()` 同口径现算 |
| 节点年龄 | `S.retirePlan.nodeAge` | 本局原定节点（含推迟后移后的现值）；计划未生成（50 岁前）为 `null` |
| 半退落点 | `S.partAt` / `S.partYears` | 最近一次进入 `part` 的年龄与预定停留年数，供「半退期收入打折」类标定读 |

账本里每次相位流转都有一条 `kind = "state"`、`id = "workPhase><目标值>"` 的记录（带年龄），钱进程要复盘「哪一年退的、半退了几年」直接读账本，不用另记。
