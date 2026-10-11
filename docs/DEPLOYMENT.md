# 仓库迁移与部署记录

目标仓库：https://github.com/zslhentai/space-cadet-web

## 已验证的源码迁移

- 原始完整交付提交：`3a310e51398991122388b5e985f3195bce22bf52`。
- 上一条源代码导入提交：`40314aed5118c04ef18d6024957669967037191f`。
- 空仓库初始化 `main`；正常推送，未强制推送、重建游戏或改写历史。
- GitHub `refs/heads/main` 指向原始交付提交，远程递归 Git tree 的 184 个文件路径、mode、类型和 blob SHA 与本地逐项相同。
- WASM 构建、触控源码、README、`docs/AUDIT.md`、`docs/ACCEPTANCE.md`、原始测试记录和 Pages 工作流均已保留。
- 本地再次执行核心哈希、分发资源检查和资源校验测试通过。92 个玩法源码/头文件保持原审查基线；分发目录不含商业数据或 preload 包。
- `dist/` 和商业游戏资源不在 Git 历史中。线上 WASM 从审查后的源码重新编译，访客自行导入合法资源。

## Actions 和 Pages

首次实际运行：https://github.com/zslhentai/space-cadet-web/actions/runs/38096676537

工作流 `.github/workflows/pages.yml` 在 `main` 推送或手动触发时，使用 Emscripten 3.1.64 构建真实引擎，检查核心哈希和分发内容，在 Chromium/WebKit 中执行 UI / 输入 / 真实 WASM 缺资源初始化测试，上传 `dist/` Pages artifact 并执行部署。

### 首次线上运行结果

运行对应原始交付提交 `3a310e51398991122388b5e985f3195bce22bf52`，于 2026-10-10 UTC 完成：

| 检查 | 结果 |
| --- | --- |
| WASM 源码编译和无商业资源分发检查 | 通过 |
| 原版玩法核心 92 文件哈希 | 通过 |
| npm 资源校验单元测试 | 2 项通过 |
| Chromium 154.0.8037.0、Linux WebKit 26.5 | 均通过：六种视口、触控输入所有权、键盘/触屏共享、全屏回退、音量恢复、真实 WASM 导出及缺 DAT 初始化保护 |
| WASM 浏览器加载大小 | 1,360,312 bytes；不同构建环境与初次本地构建的大小可略有差异 |
| `github-pages` artifact 上传 | 通过，623,987 bytes；API 返回 artifact ID `11686246133` |
| Pages deploy | 失败：HTTP 404，`Ensure GitHub Pages has been enabled` |
| 总工作流结论 | failure；不能将 build 成功写成整条工作流成功 |

实际记录见 `actions-migration-run.json`、`actions-browser-results.json`、`actions-artifact.json`。本环境直接下载 artifact 时，其 blob 存储域名返回 Forbidden，因此不声称完成下载包的独立检查；CI 中的分发检查与上传均已成功。GitHub 日志还提示部分 Action 使用的 Node 20 已弃用（runner 强制使用 Node 24），本次未阻止构建；这与 Pages 未启用的错误不同。

Pages 需要仓库的 Settings → Pages → Build and deployment → Source 设置为 **GitHub Actions**。本次使用的 GitHub 凭据可以推送源码和读取 Actions，但创建 Pages 站点的 API 返回 HTTP 403 `Resource not accessible by integration`。这是 GitHub 集成权限限制，需要仓库管理员在设置中启用；代码提交不能代替这个设置。

预期站点：https://zslhentai.github.io/space-cadet-web/ 。本次 HTTPS 实际访问返回 HTTP 404；在部署步骤成功及 HTTPS 页面验证通过前，不将这个地址视为已上线。

### 管理员启用后的发布步骤

1. 打开 https://github.com/zslhentai/space-cadet-web/settings/pages ，选择 **GitHub Actions** 作为 Source。
2. 在 Actions → Build and deploy static WebAssembly → Run workflow，选择 `main`，重新完整运行（首次 artifact 仅保留一天；重新完整运行可避免过期）。也可在有效期内对首次运行选择 Re-run failed jobs。
3. 等待 build 与 deploy 均通过，再访问上述 HTTPS 地址，确认 JS/WASM 从 `/space-cadet-web/` 子路径正确加载。
4. 访客导入自己合法持有的资源后才能启动原版游戏；部署本身不提供这些文件。

迁移报告的后续提交只更新说明和已有验收记录，不改变此次已通过的引擎、触控或构建代码。它使用 `[skip ci]` 避免重复编译；Pages 启用后应按上述步骤手动运行最新 `main`。后续正常代码提交仍会自动构建和发布。

## 游戏运行验收边界

没有用户合法提供的原版资源，仍不能验证完整可玩、实际碰撞、任务、军衔和音效；没有 iPhone/安卓真机，仍不能声明手机真机验收通过。Linux WebKit 自动化不等同于 iPhone Safari 真机。所需文件和导入方法见 README；原验收记录与待执行清单见 `ACCEPTANCE.md`。
