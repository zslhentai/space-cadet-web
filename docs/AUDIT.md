# P0 审查记录

审查日期：2026-10-10 UTC。

## 代码来源和固定版本

| 参考 | 发现 | 采用方式 |
| --- | --- | --- |
| `k4zmu2a/SpaceCadetpinball` | MIT；C++11、SDL2/SDL2_mixer；README 明确原版资源不提供，并列出 alula 为 Emscripten 移植 | 原版逆向工程和玩法来源；没有混合最新 master 的物理变更 |
| `alula/SpaceCadetPinball` | MIT；`CMakeLists.txt` 存在 Emscripten 分支、SDL2 ports、预加载 `game_resources` 和 HTML shell | 固定 `0bc12d3ca97a30a61e1e325cfde1eeec379bb9b9`，作为 Web 引擎源码基线 |

两份主许可证均保留 Andrey Muzychenko 的 MIT 声明。依赖许可证与版本见根目录 `THIRD_PARTY_NOTICES.md` 和 `licenses/`；TinySoundFont/TinyMidiLoader 的完整 MIT 头仍在源码中。SDL2 2.28.4 / SDL2_mixer 2.8.0 由 Emscripten 3.1.64 ports 构建。最终构建关闭 SDL_mixer 的其他格式后端，只使用 WAV 与自带的 MIT TinySoundFont 合成器，避免不必要的 OGG 等依赖。

## 商业资源审查

alula 仓库的 `game_resources` 仅有 README，游戏仍需要原版 DAT/WAV。除此之外，其源码树包含：

- `score.cpp` 中的商业 Windows 消息字体字节数组及 `PB_MSGFT.bin`：字节数组在获取源码时即从本地保存结果中剔除，二进制文件不下载。字体改为用户本地提取导入。
- `gm.sf2`、约 19 MB 的嵌入版 `gm_sf2.cpp`：没有足以确认音色库再分发权的独立授权信息，本项目不下载、不编译、不提交。
- `Icon_1.ico`、`splash_bitmap.bmp`：不下载、不提交、不用于 UI。
- `Doc` 中的反汇编/数据分析 dump 与 spreadsheet：不纳入移植交付。

没有访问在线游戏部署来提取 `.data`，没有获取原版 EXE/DAT/WAV/MID，也没有下载网上游戏资源包。公开源码的 MIT 不被解释为商业资源的授权。

浏览器导入的合法资源只放在当前 WASM 的 `/game_resources/` 内存目录。构建与 GitHub Pages artifact 都没有原版资源。`scripts/check-dist.py` 强制拒绝 DAT/WAV/MID/SF2/BIN/EXE/DATA。

## 原始 Web 构建验证

使用上游 CMake 的 Emscripten 分支，`MUSIC_TSF=OFF`（排除未经确认的嵌入 SoundFont），Release，Emscripten 3.1.64，CMake 4.4.4 / Ninja 1.13.2。

原始构建的最小差异为：排除字体字节数组后，`score.cpp` 从用户字体文件读取并校验；`game_resources/README.txt` 提供非游戏文本，以免上游 `--preload-file` 对空目录报 “Nothing to do”。原始 `DEMANGLE_SUPPORT` 弃用警告保留，不阻止链接。

**结果：编译成功。** 输出 HTML / JS / WASM / 仅含 README 的 `.data`。Chromium 加载实际 1,607,322-byte WASM，执行原版初始化并显示 `Could not load game data / The .dat file is missing`，无页面 JS 错误。未提供合法数据，因此仅证明构建链、WASM 载入和缺资源启动路径，不证明完整游戏可玩。

最终面向 Pages 的构建改为模块化 JS/WASM、不预加载游戏资源；真实 WASM 的导出与缺资源路径经浏览器验证。最终 WASM 大小以 `docs/browser-results.json` 为准。

## P1 代码改动边界

| 文件 | 修改原因 |
| --- | --- |
| `src/web_bridge.cpp` | 直接调用原版按下/松开、暂停、重开、音量和排行榜接口；不实现碰撞/任务替代逻辑 |
| `winmain.cpp` | rAF 回调持有堆对象并按值捕获帧状态，消除原先对退出栈帧的引用；浏览器调度下去掉忙等待；INI 路径寿命稳定；HTML 工具栏替换主菜单条；SDL 继续输入给原版排行榜 ImGui，但禁止重复应用 HTML 已处理的游戏输入 |
| `options.cpp` | 浏览器固定统一缩放和显示/更新比率；仍使用原版按时间推进的 `pb::frame` / `collide`，不替换物理计算 |
| `score.cpp` | 只将原商业字体数组改为用户文件；校验完整字宽数据；计分算法保持原版 |
| `loader.cpp` | 缺少 WAV 时避免对零声道/采样率除零；正常原版资源路径保持原版逻辑 |
| `midi.cpp/.h` | 可选音色库由用户提供；无音色库安全关闭背景音乐；音量同时控制合成器和 WAV |
| `web/` | 文件选择、资源基本结构检查、Pointer Events 输入所有权、竖屏完整帧布局、页面全屏回退、本地存储 |

`docs/core-sha256.json` 固定 92 个玩法源文件/头文件的 SHA-256，与本地初始审查基线相同，包括全部 T* 组件、`maths`、`pb`、`control`、`timer`、`nudge`、`proj`、`render`。`scripts/check-core.py` 校验通过。初始源快照移除了 UTF-8 BOM；哈希比较针对一致规范化后的文本。这个检查证明核心未被改写，**不替代真实球台碰撞验收**。

## 浏览器/托管条件

- HTTP(S) ES modules + WebAssembly + WebGL；不支持直接双击 `file://`。
- 单线程 SDL2；不需要跨源隔离、COOP/COEP 或 SharedArrayBuffer。
- WASM 路径相对 `import.meta.url`，支持 Pages 仓库子目录。
- Pointer Events、指针捕获、`touch-action:none`，不依赖有 300ms 延迟的点击模拟来控制挡板。
- 触摸/按键用户手势调用 AudioContext.resume；具体 iPhone 音频行为仍待真机验证。
- `dvh` 与安全区适配；实际 canvas 元素本身按 600:416 拟合，避免排行榜指针坐标受黑边影响。
- iPhone 浏览器不支持容器 Fullscreen API 时，使用页面内沉浸回退，不能保证隐藏系统栏。
- localStorage 每秒/生命周期保存，捕获存储异常。没有实现中途局面存档或离线 Service Worker。

## GitHub 仓库迁移复查

原始交付提交 `3a310e51398991122388b5e985f3195bce22bf52` 已保留历史推送到 https://github.com/zslhentai/space-cadet-web 。远程递归树的 184 个文件与本地逐项匹配；未新增游戏资源或改动引擎。核心 92 个源文件/头文件的哈希检查和静态分发检查再次通过。Actions 从原有源码编译 WASM；Pages 构建与发布实测见 `DEPLOYMENT.md`，不改变上述资源授权边界。
