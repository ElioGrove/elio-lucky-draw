# 代码与依赖安全审查（2026-10-22）

审查范围：Vue 入口与路由、Pinia 状态和本地持久化、抽奖随机性与动画生命周期、人员导入导出、奖项分批与回滚、图片和音频管理、备份恢复、HTML 输出、构建依赖及 Cloudflare 实际生产配置。遵循最小修改原则，保留存储结构和抽奖规则，没有升级框架主版本。

## 发现及已修复事项

| 问题 | 修复 |
| --- | --- |
| 构建 Node 固定在 22.16.0，未包含 10 月 21 日安全修复 | `.node-version` 更新为同主版本的 22.23.4，并收紧 engines，允许已修复的 22 / 24 / 26 版本线。官方校验和验证临时 Node 二进制后，在 22.23.4 下重新测试和构建；未修改系统 Node 安装 |
| Markdown-it、Vite、Vitest / mocker、Wrangler 间接 Sharp 存在已公开漏洞 | 分别升级为 14.3.3、6.4.5、4.1.12、4.151.3；Sharp 随 Wrangler 更新到 0.35.5 |
| 旧 SVG 插件引入过时 PostCSS、Micromatch、Braces、解码器等编译依赖 | 删除插件；Vite 直接将仓库的 14 个可信 SVG 注入为 sprite，保留原 symbol 名、viewBox、路径和描边属性，移除根宽高以适配组件尺寸；删除不再需要的虚拟模块导入 |
| 弹窗输入空格、聚焦按钮的原生按键及长按空格可能误触发抽奖 | 快捷键跳过已处理事件、按键重复、打开的弹窗和空格对应的交互控件；全局空格阻止默认行为，聚焦按钮时保留原生操作；各流程入口增加状态检查 |
| 已选中奖者后，仍可编辑临时奖项和批次，影响记账对象或人数 | 抽取、结果展示和回位阶段将奖项侧栏设为 inert；准备完成后恢复操作 |
| 使用旧行对象重复删除或移出中奖者，可能多次回退其他人的奖项计数 | 根据当前 store 中人员的实际历史回滚；已删除人员直接返回；重复操作不再重复扣减 |
| 删除未完成临时奖项的中奖者，没有回退该临时奖项计数 | 回滚查找包含仍存在的临时奖项 |
| Excel ZIP 元数据可声称目录为空、截断或与本地头冲突，跳过部分解压检查 | 检查非空目录、磁盘/条目数、目录和文件边界、本地头方法/标志/尺寸一致性以及目录遍历完整性；保持实际解压字节上限和线程超时 |
| 上传在读取大文件后才加忙碌锁，可能发生并发读取与错误成功提示 | 图片和音乐在读取文件之前进入已有操作锁，重复上传事件直接返回 |
| 浏览器禁止写 localStorage 时，应用主题初始化仍可能抛错 | 主题偏好复用带错误反馈的存储适配器；主题仍应用于 DOM |
| 背景图存储读取拒绝未处理，且重复实现图片读取 | 复用 ImageSync 已有异常和竞态处理；星空尺寸随 ResizeObserver 结果更新，移除重复 resize 监听 |
| Cloudflare 本地状态和 `.dev.vars` 没有忽略规则 | 添加 Git 忽略，避免误提交本地数据库或开发秘密 |
| 文档只描述 Workers，与线上实际部署不一致；通配重写在 Workers 被判为循环 | README 明确 Pages 生产与可选 Workers；移除多余 `_redirects`，Pages 使用默认 SPA 行为，Workers 保留现有 SPA 配置 |

Node 官方公告确认 2026-10-21 发布的修复涵盖 Brotli 越界写入、DNS 和 TLS 等漏洞：[安全公告](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)、[22.23.4 发布说明](https://nodejs.org/en/blog/release/v22.23.4)。这些影响开发/构建运行时；此项目线上为浏览器静态应用，不运行 Node 服务。

相关依赖公告：[Markdown-it](https://github.com/advisories/GHSA-gfr2-rv44-r23c)、[Vite / launch-editor](https://github.com/advisories/GHSA-587h-7wmj-h5pm)、[Vitest](https://github.com/advisories/GHSA-qxg6-89mg-rqv8)、[Sharp](https://github.com/advisories/GHSA-wq5f-xc86-pv6w)。公告的原始披露、数据库收录和更新日期可能不同，不能将所有告警都称为 10 月 21 日首次披露。

## 依赖扫描及仍需关注事项

| 扫描 | 修复前 | 修复后 |
| --- | --- | --- |
| 全部依赖 | 21 条：高危 7、中危 12、低危 2 | 2 条：高危 1、中危 1 |
| 浏览器生产依赖 | Markdown-it 告警 | 0 条已知告警 |

剩余告警没有被忽略或隐藏：

- `braces@3.0.3`，高危：[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)。通过 Tailwind 的 Chokidar / Micromatch 引入。npm 扫描提示需 3.0.4，但截至本次查询，npm 最新仍是 3.0.3，官方公告也没有已发布补丁。只处理项目的可信文件路径/构建模式，不在浏览器处理上传文件。等待上游发布后升级；没有伪造版本或自行引入第三方分叉。
- `postcss-selector-parser@6.1.5`，中危：[GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf)。通过 Tailwind 和 Vue ESLint 插件引入；补丁位于 7.1.6+，当前 6.x 最新无修复。只处理仓库样式与模板，未暴露给线上用户输入。没有强行覆盖主版本以改变 Tailwind/ESLint 的依赖契约。后续可单独评估上游迁移或补丁回移。

`vue-i18n@10`、`vue3-colorpicker@2.3.0` 和 ESLint 9 存在上游停止支持/弃用提示，建议另行安排兼容迁移。本轮没有为消除提示而进行框架或 UI 主版本重构。

依赖扫描不能证明不存在未知漏洞；本地固定的 SheetJS tarball、浏览器实现以及 Cloudflare 托管运行时也不能只依赖 npm audit 判断。已额外核对 [SheetJS 官方 CDN](https://cdn.sheetjs.com/)，当前正式版仍为 0.20.3；项目未调用 `sheet_to_html`，Excel 内容通过 JSON 与文本节点显示。Excel 文件大小、解压上限、后台线程隔离与超时继续保留。CSP 保留既有统计脚本来源；本轮未替换该外部服务。

## Cloudflare 审查

- 实际生产为 Pages 项目 `luck-thus-chat`，域名 `luck.thus.chat`，Git 生产分支为 `main`。已读取远端项目设置确认构建 `pnpm build`、目录 `dist`，生产和预览均无 `NODE_VERSION` 覆盖。
- 远端未配置 KV、D1、R2、Durable Objects 或 service bindings；源码无 Functions / Worker handler、Cron、后端认证接口或数据库查询。本地名单和媒体仍只保存在浏览器，不改变权限边界或引入远端存储。
- `wrangler.jsonc` 是可选的 Workers Static Assets 配置，不对应已存在的生产 Worker；保留 compatibility_date，避免无必要的运行时行为切换，也没有创建新 Worker。
- 移除重写后的 Pages 深层路由通过默认 SPA 回退正确加载；安全头、CSP、禁止嵌入和默认重新验证缓存策略均验证保留。缺失脚本可能回退为 HTML，但 MIME 校验和 `nosniff` 保持生效，未配置长时间 immutable 缓存。
- 最终静态文件 55 个，最大单文件 8,641,349 字节，低于 Cloudflare 单文件 25 MiB 限制；JS 合计约 1.60 MB，仍按路由分块，音乐仍按播放需要加载。无新增服务端 CPU/内存、数据库或定时任务开销。

官方行为依据：[Pages 默认 SPA 和缓存](https://developers.cloudflare.com/pages/configuration/serving-pages/)、[Static Assets 安全头](https://developers.cloudflare.com/workers/static-assets/headers/)、[资源限制](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)。

## 验证

- Node 22.23.4 下 `pnpm check` 通过：17 个测试文件、58 项测试（原有 48 项），ESLint、应用类型检查及标准生产构建。
- 构建配置类型检查、`pnpm peers check`、`pnpm build:file`、冻结锁文件安装以及 Workers `deploy --dry-run` 通过。
- 实际 Pages 本地运行验证：`/home` 和 `/config/person/all` 返回 SPA HTML，Markdown 返回正确内容类型，响应保留 CSP、`DENY`、`nosniff` 和 `max-age=0, must-revalidate`。
- 独立本机 origin 使用合成数据完成三人抽奖，名单中奖数及奖项计数均为 3；抽奖时奖项侧栏锁定。压缩 XLSX 导入 12 人、确认替换后名单完整、中奖及奖项计数归零；恶意 HTML 姓名按文本显示，无注入图片。
- 浏览器确认操作说明渲染、sprite 的 14 个 symbol 及设置菜单图标均可解析，实际显示图标的几何宽度非零。浏览器截图接口超时，因此没有声称完成截图视觉对比；未穷举所有设备和旧浏览器。
- 浏览器逐一加载八个配置路由，标题和页面内容正常，所有引用的 SVG symbol 均存在。
- Git diff 空白检查通过；常见私钥/GitHub token/AWS key 模式扫描无匹配。这不是专用秘密检测的替代。

发布沿用现有 main → Cloudflare Pages 集成，以该提交的远端检查和站点资源核验为准。
