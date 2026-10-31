# 匿名埋点（v0.13.1）

最小匿名埋点模块 `src/analytics.js`，为 docs/PM-GROWTH.md 的增长指标提供数据源。**默认关闭**：不开启时零网络请求、零行为变化（`track()` 立即返回，不入队、不读游戏状态、不消费主 RNG、不写任何存档键）。

## 如何开启

部署方在 `index.html` 加载 `src/analytics.js` **之前**注入配置（或用一段内联脚本置于其前）：

```html
<script>window.IFY_ANALYTICS = { enabled: true, endpoint: "https://你的收集端地址" };</script>
```

- `enabled` 必须为 `true` 且 `endpoint` 为非空字符串，否则视为关闭。
- 发送实现可插拔：配置里另给 `send(endpoint, bodyString)` 函数即可替换默认发送（默认先试 `navigator.sendBeacon`，回落 `fetch` + keepalive）。
- 事件在本地队列攒满 10 条批量发送一次；页面隐藏/关闭时自动冲刷剩余队列。发送失败静默丢弃，绝不影响游戏。
- 关闭方法：去掉配置或把 `enabled` 改为非 `true`，重新部署即可；代码无需改动。

## 事件表

| 事件 | 触发点 | 字段（均为游戏内分类量） | 对应 PM-GROWTH 指标 |
|---|---|---|---|
| `game_start` | 新开一局（newGame） | `era`（年代 id）、`route`（路线 id） | start、era_span_selected |
| `card_pick` | 选定路线时，每类牌一条（共 3 条） | `cat`（family/temper/era）、`pick`（所选位置 0/1/2）、`changed`（是否改过预选） | 出身层参与度（v0.13 新增口径） |
| `glimpse` | 30/40/50 岁瞥视，玩家点「看」或「不看」时 | `age`（30/40/50）、`seen`（true/false） | 瞥视到达率与观看率 |
| `game_complete` | 进入结算页 | `era`、`route`、`endAge`、`death`（是否早夭/中途死亡）、`ending`（特殊结局 id 或 none）、`tier`（legendary/epic/rare 或 none） | complete、结局分布（含传说单体 ≤1% 护栏的线上监测） |
| `share_click` | 结算页分享台按钮 | `action`（share/save_image/copy_text/copy_link） | share_action、challenge_link_copy（action=copy_link） |
| `lives_view` | 开局页点开「活过的人生」 | 无 | 留存代理指标（回访查看） |

未埋点（PM-GROWTH 表内、本轮不做）：`visit`（页面访问——与 game_start 的漏斗口径取舍后暂缓，需要时在模块里加页面加载事件即可）、`challenge_land` / `challenge_start`（同局链接落地与开局细分，待挑战玩法口径定版）、`daily_seed_start`（今日种子入口细分，可由 game_start 后续扩展）、`keepsake_purchase`（珍藏版交易未上线，无事件源）。

## 隐私口径

- 只收集上表字段：事件名、时间戳与游戏内分类量（年代、路线、年龄点、结局类别）。
- **不收集**：种子原文（同局链接含种子，绝不回传）、玩家在瞥视里写的留言、姓名/联系方式等任何个人信息、设备指纹与 IP 定制标识（收集端若记录 IP 属部署方基础设施口径，不在本模块内）。
- 不写 localStorage、不种 cookie；队列只在页面内存里，关页即弃（未冲刷部分直接丢失，不落盘重试）。
- 与存档完全隔离：埋点状态不进入 `ify-save-v2`，同一种子双跑的事件序列与数值不受埋点开关影响（验收以确定性双跑为准）。
