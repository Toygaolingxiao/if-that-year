# Cloudflare Pages 部署（用户 2026-10-30 拍板：托管直接上 Cloudflare，跳过 GitHub Pages）

仓库保持私有也可以：Cloudflare Pages 连私有仓照样部署，站点通过 pages.dev 域名公开访问。

## 一次性接入（约 3 分钟，用户在 Cloudflare 后台操作）

账号：用已有的 Cloudflare 账号（komesomme.jp 就在上面，不用新注册）。

1. Cloudflare 后台 → **Workers & Pages** → **Create application（创建应用程序）**
2. 选 **Pages** 标签 → **Import an existing Git repository（导入现有 Git 仓库）**
3. 首次会跳 GitHub 授权 Cloudflare 的 GitHub App：选 Toygaolingxiao 账号，仓库范围只勾 `if-that-year` 即可（或 All，二选一不影响本项目）
4. 选中 `if-that-year` → **Begin setup**
5. Build settings 按下面填（本项目无构建步骤，官方对纯静态站的推荐填法）：
   - Project name：`if-that-year`（将决定网址 `if-that-year.pages.dev`）
   - Production branch：`main`
   - Framework preset：`None`
   - Build command：`exit 0`
   - Build output directory：`/`
6. **Save and Deploy** → 等约 1 分钟，得到 `https://if-that-year.pages.dev`

## 之后

- 每次往 `main` 推代码，Cloudflare 自动重新部署，不需要任何手动操作。
- 其他分支/PR 会生成预览网址，可先看再合并。
- 自定义域名（如以后用 game 子域名）走 Pages 项目 → Custom domains 添加，按提示加 DNS 记录；域名若也在 Cloudflare（参考 komesomme.jp）则自动配好。
- 缓存与响应头由仓库根目录 `_headers` 控制：`/src/*` 为 `no-cache` 回源校验（v0.13.1 起——此前缓存 1 小时曾使新旧版本脚本混装：新 index.html 配旧 engine.js 会白页或行为错乱；no-cache 每次先向源站校验，未变更才用本地副本，流量代价小）、HTML 不强缓存（改文案能较快生效）。

## 出问题先看

- 打开是 404：多半是 Build output directory 没填 `/`，或 index.html 不在根目录（本仓在根目录）。
- 改了代码线上没变：看 Pages 项目 → Deployments 里最新一次构建是否为 Success；失败点开看日志。
- 网址打不开但部署成功：等 1–2 分钟 DNS/证书生效再刷新。
