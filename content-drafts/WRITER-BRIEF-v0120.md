# WRITER-BRIEF-v0120.md — v0.12.0 状态矩阵轮写手简报增补正本（2026-10-31）

> 本增补自 v0.12.0 起生效，**替换** WRITER-BRIEF-v0100.md 的 §二字段口径表中与状态/旗标有关的行与 §三全节；其余章节（配额口径、数值纪律、主题口径、文案纪律、浪潮口径、交付格式）继续以 v0100 正本为准。架构正本是 docs/STATE-MATRIX.md，机器事实源是 src/registry.js。

## 一、两层制：状态域 vs 叙事里程碑（新纪律，先读这一节）

全库标记分两层，不许混用：

- **状态域**（6 个）：配偶 spouse、子女 kids、父亲 dad、母亲 mom、宠物狗 dog、宠物猫 cat。域内互斥、流转不可逆的人生状态**只能**用 `state` / `stateNot` / `setState` 表达（字段口径见 STATE-MATRIX §6）。
- **叙事里程碑**：其余一切「发生过」的事实用旗标 `set` / `require` / `forbid` / `all` / `any`，且只能引用注册表（src/registry.js 的 milestones）里登记过的旗标。

**已废止的 13 个域旗，任何字段出现即校验报错**：
`partner, single_ok, slow_love, divorced, spouse_dead, has_kid, no_kid, undecided_kid, dad_dead, mom_dead, dog_home, dog_gone, cat_gone`。

对照速查（旧写法 → 新写法）：

| 旧 | 新 |
|---|---|
| `require:"partner"` / `all` 含 partner | `state:{spouse:"partnered"}` |
| `require:"single_ok"` | `state:{spouse:"single"}` |
| `require:"slow_love"` | `state:{spouse:"dating"}` |
| `require:"divorced"` / `require:"spouse_dead"` | `state:{spouse:"divorced"}` / `state:{spouse:"widowed"}` |
| `require:"has_kid"` / `"no_kid"` | `state:{kids:"has"}` / `state:{kids:"none"}`（未定不写，或 `state:{kids:"undecided"}`） |
| `forbid:["dad_dead"]` / `["mom_dead"]` | `state:{dad:"alive"}` / `state:{mom:"alive"}` |
| `forbid:["divorced","spouse_dead"]`（挂在已有 partner 正向门的事件上） | **不写**——正向状态门已自动排除其余状态 |
| `set:"divorced"` 类立旗 | `setState:{spouse:"divorced"}`，且流转必须已在注册表登记（见 §三） |

## 二、字段口径增补（替换 v0100 §二对应行）

| 字段 | 形态 | 口径 |
|---|---|---|
| `state` | 对象 | 正向状态门 `{域: 值}`，值可为单值或候选数组（如 `{spouse:["dating","partnered"]}`）。域与状态值只能取自注册表 domains。抽取权重与 require 同级。 |
| `stateAll` | 对象 | 与 state 同语义，抽取权重与 all 同级。硬前置用 state、组合条件用 stateAll，与 require/all 的选择同构；同域不许在两字段写不一致候选集。 |
| `stateNot` | 对象 | 负向状态门 `{域: 值或[值...]}`。同域已有 state/stateAll 正向门时不许再写 stateNot（冗余）。 |
| `setState` | 对象 | 流转声明 `{域: 目标值}`，位置与时机同 `set`（无选项写顶层、有选项写选项级）。**只能声明注册表已启用的边**；想引入新流转（新载体事件）必须在交付回报里单列「申请新边：域、from→to、本条 id」，由协调者登记注册表后才算交付。 |
| `set` / `require` / `forbid` / `all` / `any` | 同 v0100 | 值只能来自注册表 milestones，或本包新旗标（纪律见 §三）。13 个废止域旗禁用。 |

## 三、标记纪律（替换 v0100 §三，逐条执行）

1. **新旗标先登记后使用**：本包新造的里程碑旗标，必须在交付回报里逐个登记（名称 + 立旗条目 id + 引用条目 id）；协调者写入 src/registry.js 后跑入库门，未登记的旗标在数据里出现即报错、整包打回。
2. **状态不许用旗标模拟**：凡语义是「现在处于什么状态」（有没有伴侣、伴侣还在不在、有没有孩子、父母在不在、宠物在不在）的，一律走状态字段，不许新造 `xxx_now` 类旗标绕开状态矩阵。语义是「这件事发生过」（慢线安定 together、异地 long_dist、二孩 kid2、孩子出国 kid_abroad 等进程与附加事实）的，才是里程碑旗标。
3. **流转自门控**：产生流转的事件必须自带前态门——去世事件要求 `state:{dad:"alive"}` 这类正向门（或 chain 指向入边载体且 stateNot 排除终态），校验门会查。分岔类流转由分岔本身承载，不受此限。
4. **不可逆红线**：dead / gone / divorced / widowed 没有回头边。想写「复活」「宠物回来」「破镜重圆直接回到婚况」的，先停下——再结伴走的是注册表里预留的新边，必须有完整的新事件链载体并单独申请，不许在普通事件里用 setState 偷渡（引擎运行时会忽略未声明边，校验门会报错，两道都过不去）。
5. v0100 的其余标记纪律继续有效：顶层 set 时机口径（无选项呈现即立、有选项只许选项级）、不许引用 traj_* 写普通回响、chain 只填已存在 id。

## 四、入库门（交付前自查，协调者复跑为准）

```bash
node tools/validate-state.js
```

退出码 0 才算过门。检查内容：未登记引用报错、注册表 setter/载体清单与数据双向一致、不可逆违规报错、互斥组合报错、终态流转未自门控报错、不可达状态与 reserved 边出警告（警告要在交付回报里逐条交代）。另有全库通用校验（重复 id、禁词、值域、效果纪律）沿用往轮口径，由协调者执行。
