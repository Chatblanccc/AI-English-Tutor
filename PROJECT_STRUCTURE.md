# AURAE VOICE / english-tutor-assistant — 项目结构详解

> 本文档详细说明项目中每个文件夹和文件的作用，帮助新成员快速理解代码库。

---

## 一、项目概览

| 属性 | 内容 |
|------|------|
| **产品名称** | AURAE VOICE / SpeakStar |
| **定位** | AI 英语口语陪练助手 |
| **框架** | Next.js 16（App Router） |
| **前端** | React 19 + TypeScript + Tailwind CSS 4 |
| **认证** | Auth.js v5（next-auth），支持 Google OAuth、微信 OAuth |
| **数据库** | Neon Postgres（serverless，通过 `@neondatabase/serverless`） |
| **AI** | Vercel AI SDK + Moonshot/Kimi API |
| **语音** | 浏览器 Web Speech API（默认）+ Fish Audio TTS（付费用户） |
| **支付** | Stripe（Checkout + Customer Portal + Webhook） |
| **状态管理** | Zustand |
| **UI 组件库** | shadcn/ui（radix-nova 风格） |

---

## 二、根目录文件

### 配置文件

| 文件 | 作用 |
|------|------|
| `package.json` | 项目依赖与脚本定义（dev / build / start / lint） |
| `tsconfig.json` | TypeScript 编译配置，含 `@/*` 路径别名指向根目录 |
| `next.config.ts` | Next.js 配置：CSP 安全头、HTTPS 安全头、favicon 重定向、远程图片域名（Google/微信头像） |
| `next-env.d.ts` | Next.js 自动生成的环境类型声明 |
| `postcss.config.mjs` | PostCSS 配置，加载 `@tailwindcss/postcss` 插件 |
| `eslint.config.mjs` | ESLint 配置，继承 `eslint-config-next` |
| `components.json` | shadcn/ui 配置文件，定义组件别名、Tailwind 入口、图标库等 |
| `auth.ts` | Auth.js v5 主配置：Google Provider、自定义 WeChat Provider、JWT/Session 回调、登录后自动初始化免费计划 |
| `proxy.ts` | **路由级中间件**：未登录用户重定向到 `/sign-in`；公开白名单包含首页、健康检查、Stripe Webhook 等 |
| `instrumentation.ts` | 服务端启动钩子：配置 `undici` 全局 HTTP 代理（开发环境）、冷启动时自动执行数据库 schema 自举 |

### 环境变量模板

| 文件 | 作用 |
|------|------|
| `.env.example` | 环境变量完整示例（Auth、Kimi、Neon、Fish Audio、Stripe） |
| `.env.local.example` | 精简版本地环境变量模板 |
| `.env.local` | **本地实际环境变量（已被 .gitignore 忽略）** |

### 文档文件

| 文件 | 作用 |
|------|------|
| `README.md` | 面向人类用户的快速开始指南、功能介绍、项目结构简图 |
| `AGENTS.md` | 面向 AI 编码助手的规则（提示 Next.js 版本存在 Breaking Changes） |
| `KIMI_K2_6_AGENTS.md` | 简单指向 `AGENTS.md` |
| `KIMI_K2_6_PROJECT_RULES.md` | 项目规范文档：技术栈、开发原则、目录约定、特殊指令 |
| `DESIGN.md` | 完整设计系统文档（参考 kimi k2.6 风格）：配色、字体、按钮、卡片、间距、响应式 |
| `PROJECT_SUMMARY_LOCAL.md` | **本地备忘（不提交 Git）**，记录会话级改动、付费开关状态、恢复检查清单 |
| `PROJECT_STRUCTURE.md` | **本文件**，项目结构全景说明 |

### 构建产物/部署

| 文件/目录 | 作用 |
|-----------|------|
| `.next/` | Next.js 构建缓存与输出（已 .gitignore） |
| `.vercel/` | Vercel 部署配置（已 .gitignore） |
| `.kimi-k2.6-editor/` | kimi k2.6 编辑器设置 |

---

## 三、`app/` — Next.js App Router 路由层

### 页面路由

| 文件 | 对应路由 | 作用 |
|------|----------|------|
| `app/layout.tsx` | 全局布局 | HTML 根结构、SEO metadata、favicon、主题初始化脚本、SessionProvider 与 ThemeProvider 包裹 |
| `app/page.tsx` | `/` | **落地页（Landing Page）**：组合 Navbar、Hero、Features、HowItWorks、Testimonials、Pricing、FAQ、CTA、Footer |
| `app/chat/page.tsx` | `/chat` | **聊天页**：加载主交互组件 `VoiceInterface`（含 Suspense fallback） |
| `app/sign-in/page.tsx` | `/sign-in` | **登录页**：Google/微信登录按钮、主题同步、返回 callbackUrl |
| `app/globals.css` | 全局样式 | Tailwind CSS v4 入口、CSS 变量（light/dark）、自定义动画、滚动条样式等 |
| `app/favicon.ico` | 浏览器标签图标 | 实际被 `next.config.ts` 重定向到 `/favicon.svg` |

### API 路由 (`app/api/`)

| 文件 | 路由 | 作用 |
|------|------|------|
| `api/chat/route.ts` | `POST /api/chat` | **核心 AI 对话接口**：Kimi 流式回复、工具调用（词汇解释 / 语法纠正 / 挑战任务）、用量限制（免费 100 条/7 天滚动窗）、速率限制、XP 记录 |
| `api/tts/route.ts` | `POST /api/tts` | **语音合成代理**：Fish Audio TTS（付费用户可用），支持 Trump 等声音别名 |
| `api/usage/route.ts` | `GET /api/usage` | 返回当前用户用量信息（计划、已用、上限、重置时间） |
| `api/health/route.ts` | `GET /api/health` | 健康检查（公开）：验证 AI/TTS 服务配置是否就绪；支持深度探测（需 secret header） |
| `api/debug/route.ts` | `GET /api/debug` | **开发专用**：返回当前用户会话、对话/消息统计、最近记录（生产环境禁用） |

#### 会话与消息

| 文件 | 路由 | 作用 |
|------|------|------|
| `api/conversations/route.ts` | `GET/POST /api/conversations` | 查询/创建会话列表；含遗留 UUID user_id 迁移逻辑（受环境变量开关控制） |
| `api/conversations/[id]/route.ts` | `DELETE/PATCH /api/conversations/{id}` | 删除会话 / 更新会话时间戳 |
| `api/conversations/[id]/messages/route.ts` | `GET/POST /api/conversations/{id}/messages` | 读取或保存某一会话下的消息 |
| `api/messages/route.ts` | `GET/POST/DELETE /api/messages` | 遗留全局消息接口（早期无会话模式），用于兼容旧数据 |

#### 用户成长与 Plus 内容

| 文件 | 路由 | 作用 |
|------|------|------|
| `api/progress/route.ts` | `GET /api/progress` | 返回用户等级进度（XP、连胜天数、段位信息） |
| `api/mission-progress/route.ts` | `GET /api/mission-progress` | 返回今日练习目标完成度（基于消息数与估算活跃时长） |
| `api/daily-plan/route.ts` | `GET /api/daily-plan` | 生成每日学习计划（结合用户等级、弱项、近期场景去重） |
| `api/assessment/route.ts` | `GET/POST /api/assessment` | 读取/保存用户口语能力评估结果（流利度、准确度、发音、互动性） |
| `api/scenarios/route.ts` | `GET /api/scenarios` | 返回用户可访问的场景列表与推荐场景 |

#### Stripe 支付

| 文件 | 路由 | 作用 |
|------|------|------|
| `api/stripe/checkout/route.ts` | `POST /api/stripe/checkout` | 创建 Stripe Checkout 订阅会话（ mode: subscription ） |
| `api/stripe/portal/route.ts` | `POST /api/stripe/portal` | 创建 Stripe Customer Portal 会话（管理订阅/账单） |
| `api/stripe/webhook/route.ts` | `POST /api/stripe/webhook` | 处理 Stripe Webhook 事件（订阅创建/更新/删除/付款失败），同步用户计划到数据库 |
| `api/stripe/checkout-onetime/` | （目录占位） | 预留一次性购买入口（当前未启用） |
| `api/stripe/capabilities/` | （目录占位） | 预留 Stripe 能力查询入口 |

---

## 四、`components/` — React 组件

### 核心交互组件

| 文件 | 作用 |
|------|------|
| `VoiceInterface.tsx` | **主聊天界面（最大文件）**：整合语音输入/输出、文本输入、会话侧边栏、场景选择、每日计划、Avatar 场景、用量显示、主题切换、用户菜单。支持 Alex / Trump 双人格 |
| `ChatInterface.tsx` | 早期纯文本聊天界面（当前项目中的简化/备用版本） |

### 品牌与视觉

| 文件 | 作用 |
|------|------|
| `AuraeLogo.tsx` | AURAE VOICE Logo 组件（SVG 波形图标）+ 可选文字标，适配亮暗主题 |
| `AvatarScene.tsx` | Avatar 场景卡片：包含发光动效、状态标签（Ready / Listening / Speaking / Thinking…），支持 Alex（橙）与 Trump（红）两种主题色 |
| `AvatarCharacter.tsx` | **Alex 的 SVG 形象**：带呼吸、倾听倾斜、眉毛抬起、眼珠转动等 CSS 动画 |
| `TrumpAvatarCharacter.tsx` | **Trump 的 SVG 形象**：红色主题、金发、领带等特征形象 |

### 系统/工具组件

| 文件 | 作用 |
|------|------|
| `ThemeProvider.tsx` | 主题同步：将 Zustand 的 theme mode 写入 `<html>` 的 `data-theme` 和 `class` |
| `ThemeToggle.tsx` | 亮/暗模式切换按钮（太阳/月亮图标） |
| `AuthEndpointSelfCheck.tsx` | **开发辅助**：自检测 `SessionProvider` 的 `basePath` 与 `/api/auth/session` 是否对齐，不匹配时在控制台报错 |

### 落地页组件 (`components/landing/`)

| 文件 | 作用 |
|------|------|
| `LandingNavbar.tsx` | 落地页导航栏：Logo、锚点链接、登录/去聊天按钮、语言切换、主题切换 |
| `HeroSection.tsx` | 首屏：大标题、副标题、CTA 按钮、产品截图/动效 |
| `FeaturesSection.tsx` | 功能特性展示（语音对话、语法纠正、每日挑战等） |
| `HowItWorksSection.tsx` | 三步流程说明 |
| `TestimonialsSection.tsx` | 用户评价/推荐语 |
| `PricingSection.tsx` | 定价卡片：Free / Plus / Pro 三档，显示价格、功能清单、Coming Soon 状态 |
| `FaqSection.tsx` | 常见问题折叠列表 |
| `FinalCtaSection.tsx` | 页面底部再次号召行动 |
| `LandingFooter.tsx` | 页脚：链接、版权、社交图标 |

### shadcn/ui 组件 (`components/ui/`)

| 文件 | 作用 |
|------|------|
| `button.tsx` | shadcn Button 组件（含 cva 变体：default / outline / secondary / ghost / destructive / link 等） |

---

## 五、`hooks/` — 自定义 React Hooks

| 文件 | 作用 |
|------|------|
| `useSpeechToText.ts` | **语音转文字**：封装 Web Speech API（`SpeechRecognition`），支持开始/停止监听、实时转写、错误处理 |
| `useTextToSpeech.ts` | **文字转语音**：双引擎支持——<br>1) 浏览器原生 `speechSynthesis`（默认，所有用户可用）<br>2) Fish Audio 高质量 TTS（付费用户，通过 `/api/tts` 代理）<br>功能包括音频预取、播放队列、断句缓存、解锁音频上下文（iOS/Safari 兼容）、停止/清理 |

---

## 六、`lib/` — 工具函数与业务逻辑

### 核心基础设施

| 文件 | 作用 |
|------|------|
| `db.ts` | **数据库核心（716 行）**：Neon SQL 客户端封装、idempotent schema 自举（conversations / messages / user_plans / user_usage / daily_plans / assessments / progress 等表）、所有业务 CRUD、索引管理、遗留 UUID 迁移逻辑 |
| `utils.ts` | 通用工具：`cn()`（`clsx` + `tailwind-merge` 组合） |
| `rate-limit.ts` | 内存令牌桶限流：`checkRateLimit`（通用）、`checkChatRateLimit`（用户+IP 双层，20/分钟 + 40/分钟） |
| `stripe.ts` | Stripe 客户端懒加载单例 + `planFromPriceId`（Price ID 映射到内部计划名） |
| `themes.ts` | 完整设计 token：定义 `darkTheme` 与 `lightTheme`，含背景、文字、强调色、聊天气泡、滚动条、光晕等 40+ 字段 |
| `product-flags.ts` | 产品功能开关：`PAID_PLANS_LIVE`（控制付费计划是否对外可见/可用） |
| `rank.ts` | 游戏化等级系统：黑铁→最强王者共 10 大段、每段 4 小级、`getRankProgress()` 计算当前段位与进度 |
| `tutor-agent.ts` | **早期 Tutor Agent 定义**：基于 `ai` 包的 `ToolLoopAgent`，配置 Alex 人设与三个工具（词汇解释 / 语法纠正 / 挑战任务） |
| `landing-i18n.ts` | 落地页多语言文案（中英双语），被所有 landing 组件读取 |

### Plus 内容资产 (`lib/plus-content/`)

| 文件 | 作用 |
|------|------|
| `runtime.ts` | Plus 内容运行时：场景过滤、推荐算法、每日计划构建、能力等级映射 |
| `scenario-catalog.json` | 40+ 口语场景的目录（标题、分类、难度、目标） |
| `scenario-template.json` | 单个场景的标准模板结构 |
| `daily-plan-agent-rules.json` | 每日推荐引擎的 fallback 规则 |
| `onboarding-assessment.json` | 首次会话 10–12 分钟评估蓝图 |
| `plan-entry-card-spec.json` | 每日计划卡片 UI 规格 |
| `feedback-playbook.md` | 语法/发音/自适应辅导策略文档 |
| `quality-gate-checklist.md` | 质量标准与上线审计清单 |
| `product-alignment-checklist.md` | 发布协调检查清单 |
| `weekly-release-calendar.json` | 每周内容上线计划 |
| `weekly-report-templates.md` | Plus 与 Pro 用户的周报模板 |
| `growth-support-copy.json` | 升级引导文案与优先支持话术 |
| `agent-pipeline.ts` | Agent 工作流契约与交接 schema |
| `README.md` | 本目录内容清单说明 |

---

## 七、`store/` — Zustand 全局状态

| 文件 | 作用 |
|------|------|
| `useChatStore.ts` | 聊天状态：消息列表、会话列表、当前会话 ID、加载状态、人格选择（Alex/Trump）、消息/会话的增删改查 |
| `useThemeStore.ts` | 主题状态：亮/暗模式切换，持久化到 `localStorage`，自动恢复 |
| `useLanguageStore.ts` | 语言状态：中英切换，持久化到 `localStorage` |

---

## 八、`types/` — TypeScript 类型定义

| 文件 | 作用 |
|------|------|
| `index.ts` | 全局类型：Role、UserPlan、UsageInfo、RankStage、RankProgress、MissionProgressInfo、Persona、Message、Conversation、UserSettings、ChatState 等 |

---

## 九、`public/` — 静态资源

| 文件 | 作用 |
|------|------|
| `favicon.svg` | 浏览器标签页图标（与 `AuraeLogo` 一致的七条波形） |
| `globe.svg` | Next.js 默认模板图标（未使用可清理） |
| `next.svg` | Next.js 默认模板图标（未使用可清理） |

---

## 十、`scripts/` — 运维脚本

| 文件 | 作用 |
|------|------|
| `setup-db.mjs` | 手动创建/迁移基础数据库表（conversations / messages / 索引） |
| `check-db.mjs` | 数据库诊断：打印表、会话、消息、孤立消息、消息数统计 |
| `migrate-userids.mjs` | 一次性脚本：将所有 UUID 格式的 user_id 合并迁移到稳定的 Google Provider ID |

---

## 十一、关键用户路径

1. **访客访问 `/`** → 浏览落地页，点击 CTA → 进入 `/sign-in`
2. **登录 `/sign-in`** → Google OAuth → 回调后自动创建 `free` 计划 → 进入 `/chat`
3. **聊天 `/chat`** → `VoiceInterface` 加载 → 可语音/文字交互 → AI 通过 `/api/chat` 流式回复
4. **付费升级** → 落地页或聊天侧栏点击升级 → `/api/stripe/checkout` → Stripe 支付 → Webhook 同步计划到 `plus`/`pro`
5. **TTS 语音** → 付费用户可选 Trump 等 Fish Audio 声音，通过 `/api/tts` 获取高品质音频

---

## 十二、扩展阅读

- 设计规范 → `DESIGN.md`
- 本地改动备忘 → `PROJECT_SUMMARY_LOCAL.md`
- AI 编码规则 → `AGENTS.md`
- 快速开始 → `README.md`
