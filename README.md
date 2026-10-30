# 如果那年 · 另一条路

> 如果那年，你选了另一条路。
> 一个人生分岔网页游戏：选一条走到底，也看一眼没选的那条后来去了哪里。

- **定位**：既有人文关怀、又能赚钱的正式项目（不是克隆实验）。完整立项见 [docs/DESIGN-BOOK.md](docs/DESIGN-BOOK.md)。
- **核心机制**：选择 + 影子人生 —— 未选之路不消失，作为平行线继续运行；30/40/50 岁可瞥见它，65 岁揭晓它的代价。
- **设计原则**：规则决定，故事呈现。确定性种子引擎算后果（同一种子可复现，支撑「同种子对战」），在线零 LLM 调用——所以它天然抗流量，扩容路线见 [docs/SCALING.md](docs/SCALING.md)。

## 现在就能玩（原型 v0.2）

**线上（正式）**：托管在 Cloudflare Pages（用户 2026-10-30 拍板，与《80亿分之一》同一家）。接入步骤见 [docs/DEPLOY-CLOUDFLARE.md](docs/DEPLOY-CLOUDFLARE.md)，接入完成后网址为 `https://if-that-year.pages.dev`，推 `main` 自动部署。

**本地**：纯静态、免构建、免注册。用任意静态服务器打开即可：

```bash
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000  （带种子: http://localhost:8000/?seed=434）
```

已实现：5 条开局路线 · 8 个大分岔 · 年度事件池 · 五维数值（健康/金钱/成长/自由/关系）· 影子瞥视（30/40/50 岁）· 里程碑留言 · 65 岁结算卡（文本版）· 同种子重开。
已实现（v0.2，见 docs/CRITIQUE-AND-REDESIGN.md）：选择写状态标记→回响事件、年度小选择、数值阈值危机、诚实瞥视（先标题后细节）、形状判词、自动存档续玩、种子输入与同局链接、Canvas 分享卡出图。未实现：珍藏付费、影子完整推演引擎、事件库扩至设计书 §6.2 门槛、日文版、B 端引导版。

## 仓库结构

```
index.html          入口（静态直出，部署于 Cloudflare Pages）
src/engine.js       确定性引擎（种子随机 / 状态 / 影子线 / 结算）
src/events.js       事件数据（路线 / 分岔 / 年度事件 / 影子剪影）
src/style.css       纸感极简视觉（与作者主页同一套色板）
docs/DESIGN-BOOK.md 方案设计书 v0.1（立项、裂变、变现、止损线、待拍板清单 §15）
docs/SCALING.md     扩展与负载架构（静态优先、四级扩容）
docs/COPY-AND-AI.md 文字原则（自然人语感）与 AI 使用边界（对局与结算不用 AI，AI 仅离线辅助）
docs/DEPLOY-CLOUDFLARE.md Cloudflare Pages 接入步骤（后台点选清单与排障）
docs/VISUAL-DESIGN.md 视觉与出图设计（纸感风格系统、分岔路图、分享卡三模板规格）
_headers            Cloudflare Pages 缓存与响应头规则
```

## 开发纪律

一个工作副本、一仓一主线；内容（事件文案）上线前必须过设计书 §6.3 审核四问；数字进文案必须有出处，查不到就降级为定性描述。
