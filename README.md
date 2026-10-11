# 3D Pinball: Space Cadet — Web 移植

这是 **alula Emscripten 移植 + k4zmu2a 逆向工程引擎**的静态 WebAssembly 项目。保留原版球台资源加载、碰撞、挡板、弹射、任务、计分和军衔实现。没有重新模拟游戏物理，也没有替代球台。

**当前交付：** P0 代码/许可证审查、原始 Web 构建和缺资源启动检查已完成；P1 触控、完整画面适配及浏览器集成已实现。**尚无用户合法提供的游戏资源，因此原版完整游戏运行、实际碰撞、音效以及手机真机验收未完成，不能宣称 P0/P1 全部验收通过。** 实测记录见 [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md)。

## 先运行已构建的静态包

解压交付的 `space-cadet-web-static.zip` 后，在包含 `index.html` 的目录运行：

```bash
python3 -m http.server 8080
```

打开 `http://localhost:8080/`，选择下面列出的合法资源，点击「启动原版游戏」。**不要直接用 `file://` 打开**，ES 模块/WASM 必须通过 HTTP(S) 加载。线上及手机访问使用 HTTPS；GitHub Pages 会提供 HTTPS。

浏览器要求：WebAssembly、ES modules、WebGL、Pointer Events、`ResizeObserver`。以当前维护版本的 iPhone Safari、安卓 Chrome、桌面 Chrome/Edge/Firefox/Safari 为目标。Linux WebKit 的自动化通过不等同于 iPhone Safari 真机通过。声音必须经用户点击/触摸解锁；切后台会释放输入并暂停，返回后手动继续。

## 需要你提供的文件

本次使用 **Windows XP 版 Space Cadet** 资源，不混用 Full Tilt 的 `CADET.DAT`。项目、构建脚本和 GitHub Actions 均不获取或打包商业资源。

| 文件 | 用途及获取位置 |
| --- | --- |
| `PINBALL.DAT`（必需） | 你自己的原版 Pinball 安装目录；包含图像、球台数据和碰撞定义 |
| `PB_MSGFT.BIN`（必需） | 从你自己的 `PINBALL.EXE` 的 **FONT / PB_MSGFT** 资源提取；消息/任务字体 |
| 安装目录中的全部 `.WAV`（必需） | 保留原版音效及按声音时长安排的事件；从 DAT 自动列出准确缺失文件名，不能用重新合成声音替代 |
| `PINBALL.MID`（可选） | 你自己的原版背景音乐 |
| `GM.SF2`（可选） | 你可合法使用的 General MIDI SoundFont2 音色库，重命名为 `GM.SF2`；无音色库时仅背景音乐关闭，WAV 音效保留 |

Windows 版 WAV 通常与 DAT 在同一目录；如果你把音效整理到 `SOUND/`，选择其中所有 WAV 即可，浏览器按文件名写入原版需要的位置。导入可分多次，页面会保留本次会话已选文件。必须补齐 DAT 引用的 WAV 才能启动；具体清单由真实 DAT 内容决定，而非猜测 `SOUND1…N` 连续编号。

`PINBALL.EXE` 只在你自己的电脑上提取字体，不会被网页读取或执行：

```bash
python3 -m pip install pefile==2024.8.26
python3 scripts/extract-font.py /path/to/your/PINBALL.EXE --output legal-resources/PB_MSGFT.BIN
```

也可使用你已有的 PE 资源查看器，导出 FONT/PB_MSGFT 的原始二进制为 `PB_MSGFT.BIN`。提取授权来自你合法持有的原版副本；持有游戏不自动赋予公开再分发资源的权利。**不要提交原版资源、字体、EXE 或来源不明的音色库。** `.gitignore` 排除资源文件，但仍应在发布前运行分发检查。

文件仅写入当前页面的 WASM 内存文件系统，**不会上传、不会写到服务器，也不会保存到浏览器数据库**。刷新页面后需重新选择资源。最高分、原版排行榜 INI 和音量独立存入 `localStorage`；清除站点数据会清除存档，隐私模式/禁用存储时会提示存档不可用。

## 自行构建

已 vendoring 审查过的 MIT 源码，构建不需要再次克隆游戏仓库。需要 Python 3、CMake ≥3.16、GNU Make 或 Ninja，以及 **Emscripten 3.1.64**。

```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install 3.1.64
./emsdk activate 3.1.64
source ./emsdk_env.sh
cd /path/to/space-cadet-web
bash scripts/build.sh
python3 -m http.server 8080 --directory dist
```

首轮构建会从 Emscripten 官方 ports 获取 SDL2 / SDL2_mixer **软件源码**。`dist/` 只有 HTML、CSS、JS、WASM、说明和许可证，不含 `.data` 或商业游戏资源。引擎单线程，未使用 pthread、SharedArrayBuffer、COOP/COEP，因此可部署到 GitHub Pages。所有运行时路径相对站点，兼容 `/仓库名/` 子路径。

环境中 CMake/Ninja 不在 PATH 时可指定：

```bash
CMAKE_BIN=/absolute/path/to/cmake NINJA_BIN=/absolute/path/to/ninja bash scripts/build.sh
```

## 操作

| 操作 | 手机/触屏 | 电脑 |
| --- | --- | --- |
| 左挡板 | 游戏区域左半屏，或左挡板按钮 | Z / ← |
| 右挡板 | 游戏区域右半屏，或右挡板按钮 | / / → |
| 蓄力弹射 | 独立发射按钮，按住蓄力、松开发射 | 空格按住/松开 |
| 暂停/继续 | 顶部按钮或暂停层 | F3；Escape 暂停 |
| 重开 | 顶部重开，确认新一局 | F2 |
| 原版晃台 | 暂未新增触屏晃台按钮 | X / . / ↑；原版 TILT 规则保留 |

两侧和发射可同时操作。同一挡板的多个手指/键盘按键共享输入所有权，最后一个松开才释放；触控取消、失去捕获、离开页面和失焦均释放。没有触屏自动发射或自动挡板。

默认竖屏，使用原版 **600×416 完整帧（包括计分栏）**，CSS `object-fit: contain` 等比例显示；画面不会被拉伸、遮住或裁切，空白区域保留黑边。全屏优先使用浏览器 Fullscreen API；不支持容器全屏的 iPhone 使用页面内沉浸布局，不能强制隐藏 iOS 系统栏。

最高分每秒及暂停/离开时保存；原版前五名/姓名仍由原版结算逻辑决定，侧栏「本机最高分」另外记录本机达到的最高分，包括未结束的一局。不是断点续玩，P2 的完整进度存档尚未实现。重开保留本机记录。

## GitHub Pages

1. 将源码提交到你自己的 GitHub 仓库 `main` 分支，不提交 `legal-resources/`。
2. 在 Settings → Pages → Source 选择 **GitHub Actions**。
3. 推送后运行 `.github/workflows/pages.yml`，或手动触发。
4. workflow 构建 `dist/` 并发布，访客自行在本地导入合法资源。

源码仓库：[zslhentai/space-cadet-web](https://github.com/zslhentai/space-cadet-web)。原始交付提交 `3a310e51398991122388b5e985f3195bce22bf52` 已连同此前提交历史完整推送，未加入商业资源。迁移、Actions 实测及 Pages 启用状态见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

## 验证

```bash
node --test tests/resources.test.js
python3 scripts/check-core.py
python3 scripts/check-dist.py
npm ci
npx playwright install chromium firefox webkit
# 在另一个终端：python3 -m http.server 8080 --directory dist
TEST_BROWSERS=chromium,firefox,webkit npm run test:browser
```

Linux 浏览器可能需要 `npx playwright install-deps`。测试可设置 `CHROMIUM_PATH`、`TEST_URL`、`PLAYWRIGHT_BROWSERS_PATH`。交付报告记录了实际环境和结果。多指自动化验证输入状态转发，不代表 iPhone 实际触控延迟或碰撞实测。P3 的真实设备/完整游戏步骤见验收报告。

## 源码和许可证

- [k4zmu2a/SpaceCadetPinball](https://github.com/k4zmu2a/SpaceCadetpinball)：原版逆向工程，MIT。
- [alula/SpaceCadetPinball](https://github.com/alula/SpaceCadetPinball)：所用 Emscripten 移植，固定 commit `0bc12d3ca97a30a61e1e325cfde1eeec379bb9b9`。
- `vendor/`：引擎源码，排除商业字体字节数组和未经确认的资源。
- `src/web_bridge.cpp`：调用原版 `pb::keydown/keyup`、暂停/重开及音量接口。
- `web/`：触控、布局和本地资源导入。
- [docs/AUDIT.md](docs/AUDIT.md)：许可证、资源及移植改动审查。
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)：依赖完整许可文本索引。
