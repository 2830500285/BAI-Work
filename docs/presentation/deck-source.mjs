import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const workspaceDir = path.join(__dirname, ".artifact-work");
const artifactRequire = createRequire(path.join(workspaceDir, "__artifact_tool_resolver__.cjs"));
const { Presentation, PresentationFile } = await import(
  artifactRequire.resolve("@oai/artifact-tool")
);

const outputPptx = path.join(__dirname, "BAI-Work-Project-Deck.pptx");
const previewDir = path.join(workspaceDir, "preview");
const layoutDir = path.join(workspaceDir, "layout");
const montagePath = path.join(workspaceDir, "BAI-Work-Project-Deck-montage.webp");
const logoPath = path.join(projectRoot, "src/asset/img/bai-work.png");

const W = 1280;
const H = 720;
const C = {
  bg: "#F7F8FA",
  white: "#FFFFFF",
  ink: "#0D1117",
  black: "#08090A",
  muted: "#5B6673",
  faint: "#E8ECF0",
  line: "#D2D8DE",
  cyan: "#1C8FA3",
  cyanDark: "#0E6374",
  cyanSoft: "#DDF3F5",
  blueSoft: "#E8F1FA",
  greenSoft: "#E7F5EE",
  amberSoft: "#F8EFE0",
  redSoft: "#F6E6E5",
  slate: "#1F2933"
};

const slides = [
  {
    kind: "cover",
    eyebrow: "Project deck",
    title: "BAI Work",
    subtitle: "面向 BAI / BAI Code 统一品牌的桌面 AI 工作台",
    meta: "July 2026"
  },
  {
    kind: "snapshot",
    title: "BAI Work 已从品牌、运行时和交付链路上独立成型",
    kicker: "当前状态",
    points: [
      ["产品定位", "完成 BAI Work 独立品牌整理，围绕 BAI Code 构建桌面工作台。"],
      ["已交付构建", "Mac Intel x64、Mac Apple Silicon arm64、Windows x64 均已有 0.1.0 构建产物。"],
      ["运行时策略", "Intel Mac 内置 BAI-Code-Runtime；arm64 Mac / Windows 使用官方 BAI Code 0.9.1 wheelhouse。"],
      ["关键缺口", "官方文档尚未公开桌面本地 service/session/event/permission/question 协议。"]
    ]
  },
  {
    kind: "problem",
    title: "单独的 CLI 不能覆盖桌面工程工作流的完整闭环",
    lead: "BAI Code 已提供可用的命令行入口，但桌面工作台需要把项目上下文、会话、审批和产物组织成连续体验。",
    needs: [
      "项目选择、文件引用、Git 上下文和长会话管理",
      "运行状态、错误提示、日志定位和可恢复的 runtime 配置",
      "权限审批、用户问题、工具调用和产物预览",
      "跨平台打包、桌面安装、品牌资产和更新通道"
    ]
  },
  {
    kind: "position",
    title: "BAI Work 的定位是 BAI Code 的桌面工作台层",
    claim: "它不替代 BAI Code 核心，而是在本地桌面边界上统一用户体验、配置、安全和发布。",
    lanes: [
      ["面向用户", "桌面 AI 工作台，承载项目、会话、文件、审阅和自动化。"],
      ["面向 runtime", "通过本地 /v1/* 兼容边界连接 BAI Code CLI / 后续 service。"],
      ["面向发布", "把官方 wheels、Intel runtime、技能和安装器纳入可验证包体。"]
    ]
  },
  {
    kind: "workflow",
    title: "核心用户路径围绕项目会话，而不是孤立提示词",
    steps: [
      ["1", "打开项目", "选择 workspace，读取 Git 和文件上下文。"],
      ["2", "配置模型", "使用 BAI 默认端点或自定义 provider。"],
      ["3", "运行会话", "发送任务，接收流式进度、工具摘要和变更。"],
      ["4", "处理交互", "审批敏感操作，回答 agent 问题，追踪运行时状态。"],
      ["5", "交付产物", "审阅 diff、导出文档、保留会话和检查点。"]
    ]
  },
  {
    kind: "experience",
    title: "产品体验把工作台、会话和运行时提示放在同一个操作面",
    callouts: [
      ["项目/会话", "侧边栏聚合项目、线程、历史和归档。"],
      ["模型配置", "composer 与设置页共享 provider/model 选择。"],
      ["运行时提示", "Runtime banner 暴露错误、日志路径、重试和设置入口。"],
      ["审阅面板", "变更、计划、预览和文件引用作为右侧工作面。"]
    ]
  },
  {
    kind: "runtimeUx",
    title: "Runtime UX 明确区分“可运行”和“缺协议”两类问题",
    left: [
      "探测 baicode --version 与 app-local runtime",
      "Mac Intel 可直接使用内置 BAI-Code-Runtime",
      "arm64 / Windows 可从 wheelhouse 创建本地 venv",
      "失败时提示安装 Python 3.10-3.13 或配置现有 baicode"
    ],
    right: [
      "CLI 可用不等于桌面 service contract 可用",
      "session / event / permission / question 缺口在错误中显式暴露",
      "当前桥接层先保障基本 chat/completions 路径",
      "后续接入官方协议时保持 renderer 边界稳定"
    ]
  },
  {
    kind: "architecture",
    title: "架构选择保留 Electron 桌面边界，同时替换 runtime 核心",
    boxes: [
      ["Renderer", "React / TypeScript\nWorkbench UI, settings, chat store"],
      ["Preload", "受控 IPC bridge\nruntime events, desktop commands"],
      ["Main", "Electron host\nsettings, packaging,\nlocal adapter"],
      ["Runtime adapter", "BAI Work adapter\n/v1/*, SSE,\nprovider config"],
      ["BAI Code", "baicode CLI today\nfuture service"]
    ]
  },
  {
    kind: "layers",
    title: "main / preload / renderer 的职责分层降低替换风险",
    columns: [
      ["Renderer", ["工作台 UI 与状态管理", "composer、会话、设置、右侧面板", "只依赖稳定 runtime-client contract"]],
      ["Preload", ["暴露最小 IPC 能力", "转发 runtime:sse-event", "避免 renderer 直接接触 Node 权限"]],
      ["Main", ["维护设置、文件、Git、packaging", "启动并代理 runtime", "把桌面能力收敛到本地服务边界"]]
    ]
  },
  {
    kind: "adapter",
    title: "Runtime adapter 用兼容层吸收官方协议尚未稳定的风险",
    rows: [
      ["稳定边界", "renderer 继续访问 /v1/runtime、/v1/threads、/v1/skills、/v1/usage 等桌面接口。"],
      ["桥接策略", "当前实现内存线程与 SSE，调用 BAI OpenAI-compatible chat/completions 完成基础对话。"],
      ["显式缺口", "resume-session、approval、user-input 等依赖官方 local service contract 的接口返回明确错误。"],
      ["迁移路径", "当 BAI 发布 service contract 后，只需要替换 adapter 内部实现，不扰动桌面 UI。"]
    ]
  },
  {
    kind: "distribution",
    title: "BAI Code 适配采用“可内置则内置，可 bootstrap 则 bootstrap”的分发策略",
    tracks: [
      ["Mac Intel x64", "随包包含 BAI-Code-Runtime\nCPython 3.11.15 + BAI Code 0.9.1\nbin/baicode 使用相对路径选择运行时"],
      ["Mac Apple Silicon arm64", "随包包含 BAI-Code-Official\n官方 macOS arm64 cp310-cp313 wheels\n目标机用 Python 3.10-3.13 创建本地 venv"],
      ["Windows x64", "随包包含 BAI-Code-Official\n官方 win_amd64 cp310-cp313 wheels\n创建 app-local venv 后运行 baicode.exe"]
    ]
  },
  {
    kind: "contractGap",
    title: "官方公开能力与桌面所需协议之间仍有一个待确认缺口",
    published: [
      "baicode CLI 安装与运行方式",
      "Python wheel / wheelhouse 分发",
      "OpenAI-compatible LLM 参数"
    ],
    missing: [
      "本地 service 启动与健康检查",
      "session create/list/read/resume",
      "event stream / SSE 语义",
      "permission reply 与 question reply"
    ],
    mitigation: "BAI Work 当前把缺口作为产品风险显式管理：代码、错误信息和路线图都指向同一个 service contract 待确认项。"
  },
  {
    kind: "provider",
    title: "模型配置默认 BAI，但不把凭据或端点写死在包体里",
    bullets: [
      "默认 provider 为 BAI，baseUrl 为 https://api.b.ai/v1，endpointFormat 为 chat_completions。",
      "模型列表由 preset 管理，支持 BAI 默认模型与自定义 OpenAI-compatible providers。",
      "API key 只来自用户设置、本地运行环境或 provider profile，代码和资源包不包含真实凭据。",
      "运行时信息只暴露 apiKeyConfigured 布尔状态，不回显 key 内容。"
    ]
  },
  {
    kind: "ecc",
    title: "EBAI 能力已内化为 BAI 原生目录和命令形态",
    mappings: [
      ["commands", "~/.bai/commands/*.md", "保持 slash command 可发现、可覆盖。"],
      ["agents", "~/.bai/commands/ebai-agent-*.md", "把 agent 规格转为 BAI slash command。"],
      ["rules", "~/.bai/skills/ebai-rules/", "以 skill 形式安装 common rules，可选全量规则。"],
      ["hooks", "~/.bai/ebai/hooks/hooks.toml", "生成 BAI hooks.toml，默认 enabled = false。"]
    ]
  },
  {
    kind: "eccSafety",
    title: "EBAI hooks 的安全策略是先生成、后审阅、再按 workspace 启用",
    items: [
      ["默认关闭", "生成的全局 hooks.toml 始终 enabled = false。"],
      ["信任边界", "启用 hooks 必须提供 trusted workspace 路径。"],
      ["作用域收敛", "真正启用的 hooks 写入 workspace/.bai/hooks.toml。"],
      ["命令改写", "执行前进入 EBAI source，并设置插件根目录环境变量。"],
      ["内容防护", "规则目录复制时拒绝 symlink，降低意外路径穿透风险。"]
    ]
  },
  {
    kind: "platforms",
    title: "当前产品迭代只发布 Mac Intel，其他平台延后验证",
    platforms: [
      ["mac-x64", "BAI-Work-0.1.0-mac-x64.dmg\nBAI-Work-0.1.0-mac-x64.zip", "当前发布候选，包含 Intel runtime"],
      ["mac-arm64", "暂缓发布", "Intel 版本稳定后再做真机验证"],
      ["win-x64", "暂缓发布", "Intel 版本稳定后再做安装验证"]
    ]
  },
  {
    kind: "release",
    title: "发布链路已经把包体资源、签名和更新元数据纳入配置",
    items: [
      ["包体命名", "BAI-Work-${version}-${os}-${arch}.${ext}，与 updater / R2 metadata 对齐。"],
      ["资源选择", "extraResources 按目标平台选择 BAI-Work-Skills、BAI-Code-Runtime 或 BAI-Code-Official。"],
      ["macOS 安全", "Developer ID 开启时启用 hardened runtime、timestamp 和 notarization hook。"],
      ["Windows 安装", "NSIS 支持安装路径选择、快捷方式重建和 app data 保留。"],
      ["发布通道", "R2 stable/frontier 与 latest promotion 脚本已预留。"]
    ]
  },
  {
    kind: "security",
    title: "安全与合规原则已经体现在 runtime、settings 和 packaging 中",
    principles: [
      ["不硬编码凭据", "API key 只作为本地凭据处理，不写入代码、deck 或资源包。"],
      ["本地服务默认", "desktop runtime 绑定 127.0.0.1，避免暴露到网络。"],
      ["最小 IPC", "preload 将 renderer 与 Node 能力隔离。"],
      ["hooks 谨慎启用", "EBAI hooks 默认关闭，启用必须限定到 trusted workspace。"],
      ["资源白名单", "打包测试确认不携带用户本地 skill 目录或历史 core worktree。"]
    ]
  },
  {
    kind: "verification",
    title: "发布验证应覆盖代码正确性、包体内容和安装器可用性",
    groups: [
      ["代码", ["npm run typecheck", "npm run test", "runtime / settings / EBAI focused tests"]],
      ["macOS", ["electron-builder mac x64", "codesign --verify", "DMG mount and app launch smoke"]],
      ["后续平台", ["Mac arm64 真机 smoke", "Windows NSIS 安装 / 卸载", "wheelhouse venv bootstrap"]],
      ["发布", ["latest.yml / latest-mac.yml check", "R2 upload and promote dry run", "SHA256 release parts check"]]
    ]
  },
  {
    kind: "status",
    title: "当前可进入决策评审，但不应掩盖 service contract 风险",
    done: [
      "BAI Work 品牌、package metadata、icons 与 artifact 命名已落地。",
      "Mac Intel x64 App、DMG、ZIP 与 bundled runtime 已完成真实 smoke。",
      "BAI Code 0.9.1 的 Intel runtime 与官方 wheelhouse 分发路径已实现。",
      "EBAI commands/rules/agents/hooks 映射与安全默认值已实现。"
    ],
    open: [
      "官方 BAI Code desktop service contract 尚需确认。",
      "签名、公证和真实设备 CI 仍需发布前闭环。",
      "Mac arm64 与 Windows x64 将在 Intel 版本稳定后继续迭代。",
      "目标机 Python 3.10-3.13 缺失时的引导体验需要继续打磨。"
    ]
  },
  {
    kind: "roadmap",
    title: "路线图应优先把 runtime 协议和发布质量收敛",
    phases: [
      ["1", "确认 service contract", "对齐 serve、session、event、permission、question 的官方协议与错误语义。"],
      ["2", "替换桥接实现", "保留 renderer /v1/* 边界，把 CLI bridge 迁移到真实 BAI Code service。"],
      ["3", "完善发布签名", "Developer ID、notarization、Windows signing 和更新通道联动验证。"],
      ["4", "建设真机 CI", "mac x64、mac arm64、Windows x64 构建与安装 smoke 自动化。"],
      ["5", "优化安装体验", "Python 缺失、wheel bootstrap、日志定位和重试流程产品化。"]
    ]
  },
  {
    kind: "close",
    title: "建议把 BAI Work 作为 BAI Code 桌面发行层继续推进",
    body: "当前工程已具备统一品牌、Mac Intel 包体、runtime 适配和安全策略基础。下一阶段的关键，不是继续扩展功能面，而是先把 Intel 版本稳定性、签名、公证和安装体验做到发布级，再恢复其他平台迭代。",
    ask: "决策点：批准进入 runtime contract 对齐与发布候选验证阶段。"
  }
];

async function readImageBlob(imagePath) {
  const bytes = await fs.readFile(imagePath);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function writeBlob(filePath, blob) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

function addShape(slide, geometry, position, options = {}) {
  return slide.shapes.add({
    geometry,
    position,
    fill: options.fill ?? "none",
    line: options.line ?? { style: "solid", fill: "none", width: 0 },
    ...(options.borderRadius ? { borderRadius: options.borderRadius } : {}),
    ...(options.shadow ? { shadow: options.shadow } : {}),
    ...(options.name ? { name: options.name } : {})
  });
}

function addText(slide, text, position, style = {}, name) {
  const box = addShape(slide, "textbox", position, {
    name,
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 }
  });
  box.text = text;
  box.text.style = {
    fontSize: style.fontSize ?? 20,
    color: style.color ?? C.ink,
    bold: style.bold ?? false,
    alignment: style.alignment ?? "left",
    ...(style.italic ? { italic: true } : {})
  };
  return box;
}

function addTitle(slide, title, kicker = "") {
  if (kicker) {
    addText(slide, kicker.toUpperCase(), { left: 72, top: 46, width: 460, height: 24 }, {
      fontSize: 13,
      bold: true,
      color: C.cyanDark
    });
  }
  addText(slide, title, { left: 72, top: 78, width: 920, height: 92 }, {
    fontSize: 36,
    bold: true,
    color: C.ink
  });
}

function addFooter(slide, index, logoBytes) {
  addShape(slide, "rect", { left: 72, top: 664, width: 1136, height: 1 }, { fill: C.line });
  slide.images.add({
    blob: logoBytes,
    contentType: "image/png",
    alt: "BAI Work logo",
    fit: "contain",
    position: { left: 72, top: 674, width: 28, height: 28 }
  });
  addText(slide, "BAI Work", { left: 108, top: 676, width: 160, height: 22 }, {
    fontSize: 14,
    bold: true,
    color: C.muted
  });
  addText(slide, String(index).padStart(2, "0"), { left: 1156, top: 676, width: 52, height: 22 }, {
    fontSize: 14,
    bold: true,
    color: C.muted,
    alignment: "right"
  });
}

function addBadge(slide, text, x, y, fill = C.cyanSoft) {
  addShape(slide, "roundRect", { left: x, top: y, width: 170, height: 34 }, {
    fill,
    line: { style: "solid", fill: C.line, width: 1 },
    borderRadius: "rounded-lg"
  });
  addText(slide, text, { left: x + 14, top: y + 8, width: 142, height: 18 }, {
    fontSize: 14,
    bold: true,
    color: C.cyanDark,
    alignment: "center"
  });
}

function addBulletList(slide, items, x, y, width, gap = 46, options = {}) {
  items.forEach((item, i) => {
    const top = y + i * gap;
    addShape(slide, "ellipse", { left: x, top: top + 9, width: 9, height: 9 }, { fill: options.dot ?? C.cyan });
    addText(slide, item, { left: x + 26, top, width, height: gap - 4 }, {
      fontSize: options.fontSize ?? 19,
      color: options.color ?? C.slate
    });
  });
}

function addLargeNumber(slide, value, x, y, fill = C.cyanSoft) {
  addShape(slide, "ellipse", { left: x, top: y, width: 46, height: 46 }, {
    fill,
    line: { style: "solid", fill: C.cyan, width: 1 }
  });
  addText(slide, value, { left: x, top: y + 10, width: 46, height: 24 }, {
    fontSize: 20,
    bold: true,
    color: C.cyanDark,
    alignment: "center"
  });
}

function addMiniLogo(slide, logoBytes, x, y, size = 64) {
  slide.images.add({
    blob: logoBytes,
    contentType: "image/png",
    alt: "BAI Work logo",
    fit: "contain",
    position: { left: x, top: y, width: size, height: size }
  });
}

function addNoteBox(slide, title, body, x, y, w, h, fill = C.white) {
  addShape(slide, "roundRect", { left: x, top: y, width: w, height: h }, {
    fill,
    line: { style: "solid", fill: C.line, width: 1 },
    borderRadius: "rounded-lg"
  });
  addText(slide, title, { left: x + 24, top: y + 22, width: w - 48, height: 28 }, {
    fontSize: 22,
    bold: true,
    color: C.ink
  });
  addText(slide, body, { left: x + 24, top: y + 64, width: w - 48, height: h - 84 }, {
    fontSize: 17,
    color: C.muted
  });
}

function addCover(slide, spec, logoBytes) {
  slide.background.fill = C.black;
  addShape(slide, "rect", { left: 0, top: 0, width: W, height: H }, { fill: C.black });
  addShape(slide, "rect", { left: 0, top: 0, width: W, height: 720 }, {
    fill: { color: C.black }
  });
  addMiniLogo(slide, logoBytes, 90, 92, 112);
  addText(slide, spec.eyebrow.toUpperCase(), { left: 90, top: 246, width: 360, height: 28 }, {
    fontSize: 15,
    bold: true,
    color: "#9EDAE1"
  });
  addText(slide, spec.title, { left: 88, top: 288, width: 650, height: 104 }, {
    fontSize: 64,
    bold: true,
    color: C.white
  });
  addText(slide, spec.subtitle, { left: 92, top: 408, width: 690, height: 62 }, {
    fontSize: 25,
    color: "#D8E7EA"
  });
  addText(slide, spec.meta, { left: 92, top: 584, width: 240, height: 28 }, {
    fontSize: 18,
    color: "#9CA3AF"
  });
  addShape(slide, "rect", { left: 884, top: 0, width: 396, height: 720 }, { fill: "#111C20" });
  addShape(slide, "rect", { left: 914, top: 92, width: 2, height: 502 }, { fill: C.cyan });
  addText(slide, "Desktop workbench\nBAI Code runtime\nCross-platform release", {
    left: 948,
    top: 196,
    width: 244,
    height: 172
  }, {
    fontSize: 28,
    bold: true,
    color: C.white
  });
}

function renderSnapshot(slide, spec) {
  addTitle(slide, spec.title, spec.kicker);
  const positions = [
    [74, 208],
    [650, 208],
    [74, 420],
    [650, 420]
  ];
  spec.points.forEach(([label, body], i) => {
    const [x, y] = positions[i];
    addShape(slide, "roundRect", { left: x, top: y, width: 510, height: 156 }, {
      fill: C.white,
      line: { style: "solid", fill: C.line, width: 1 },
      borderRadius: "rounded-lg"
    });
    addText(slide, label, { left: x + 28, top: y + 24, width: 180, height: 28 }, {
      fontSize: 23,
      bold: true,
      color: C.cyanDark
    });
    addText(slide, body, { left: x + 28, top: y + 64, width: 440, height: 70 }, {
      fontSize: 20,
      color: C.slate
    });
  });
}

function renderProblem(slide, spec) {
  addTitle(slide, spec.title, "Why it matters");
  addText(slide, spec.lead, { left: 74, top: 188, width: 640, height: 104 }, {
    fontSize: 24,
    color: C.slate
  });
  addShape(slide, "rect", { left: 770, top: 164, width: 3, height: 368 }, { fill: C.cyan });
  addText(slide, "桌面工作台必须补齐的能力", { left: 820, top: 172, width: 330, height: 36 }, {
    fontSize: 24,
    bold: true,
    color: C.ink
  });
  addBulletList(slide, spec.needs, 822, 236, 326, 72, { fontSize: 19 });
}

function renderPosition(slide, spec) {
  addTitle(slide, spec.title, "Product position");
  addText(slide, spec.claim, { left: 74, top: 180, width: 900, height: 62 }, {
    fontSize: 24,
    color: C.slate
  });
  spec.lanes.forEach(([label, body], i) => {
    const x = 92 + i * 380;
    addShape(slide, "rect", { left: x, top: 312, width: 286, height: 4 }, { fill: i === 1 ? C.cyan : C.ink });
    addText(slide, label, { left: x, top: 338, width: 286, height: 30 }, {
      fontSize: 25,
      bold: true,
      color: C.ink
    });
    addText(slide, body, { left: x, top: 388, width: 286, height: 120 }, {
      fontSize: 20,
      color: C.muted
    });
  });
}

function renderWorkflow(slide, spec) {
  addTitle(slide, spec.title, "Product workflow");
  spec.steps.forEach(([n, label, body], i) => {
    const x = 88 + i * 226;
    addLargeNumber(slide, n, x, 232, i === 2 ? C.blueSoft : C.cyanSoft);
    if (i < spec.steps.length - 1) {
      addText(slide, ">", { left: x + 84, top: 239, width: 42, height: 36 }, {
        fontSize: 28,
        bold: true,
        color: C.line,
        alignment: "center"
      });
    }
    addText(slide, label, { left: x, top: 304, width: 150, height: 30 }, {
      fontSize: 24,
      bold: true,
      color: C.ink
    });
    addText(slide, body, { left: x, top: 350, width: 172, height: 120 }, {
      fontSize: 18,
      color: C.muted
    });
  });
}

function renderExperience(slide, spec) {
  addTitle(slide, spec.title, "Product surface");
  const shellX = 72;
  const shellY = 190;
  addShape(slide, "roundRect", { left: shellX, top: shellY, width: 690, height: 390 }, {
    fill: C.white,
    line: { style: "solid", fill: C.line, width: 1 },
    borderRadius: "rounded-lg"
  });
  addShape(slide, "rect", { left: shellX, top: shellY, width: 690, height: 44 }, { fill: C.ink });
  addText(slide, "BAI Work", { left: shellX + 22, top: shellY + 12, width: 180, height: 20 }, {
    fontSize: 15,
    bold: true,
    color: C.white
  });
  addShape(slide, "rect", { left: shellX, top: shellY + 44, width: 160, height: 346 }, { fill: "#F0F3F5" });
  addShape(slide, "rect", { left: shellX + 160, top: shellY + 44, width: 360, height: 346 }, { fill: C.white });
  addShape(slide, "rect", { left: shellX + 520, top: shellY + 44, width: 170, height: 346 }, { fill: "#F8FAFB" });
  addText(slide, "Projects\nSessions\nArchive", { left: shellX + 22, top: shellY + 78, width: 110, height: 112 }, {
    fontSize: 17,
    color: C.muted
  });
  addText(slide, "Message timeline\n\nRuntime status\n\nComposer", { left: shellX + 198, top: shellY + 88, width: 250, height: 180 }, {
    fontSize: 20,
    bold: true,
    color: C.slate
  });
  addText(slide, "Plan\nDiff\nPreview\nFiles", { left: shellX + 548, top: shellY + 88, width: 100, height: 150 }, {
    fontSize: 18,
    color: C.muted
  });
  spec.callouts.forEach(([label, body], i) => {
    const y = 190 + i * 92;
    addShape(slide, "ellipse", { left: 822, top: y + 7, width: 14, height: 14 }, { fill: C.cyan });
    addText(slide, label, { left: 852, top: y, width: 270, height: 26 }, {
      fontSize: 22,
      bold: true,
      color: C.ink
    });
    addText(slide, body, { left: 852, top: y + 34, width: 320, height: 42 }, {
      fontSize: 17,
      color: C.muted
    });
  });
}

function renderRuntimeUx(slide, spec) {
  addTitle(slide, spec.title, "Runtime experience");
  addNoteBox(slide, "运行能力探测", spec.left.join("\n"), 86, 210, 500, 300, C.white);
  addNoteBox(slide, "协议缺口提示", spec.right.join("\n"), 694, 210, 500, 300, C.white);
  addShape(slide, "rect", { left: 620, top: 252, width: 34, height: 2 }, { fill: C.cyan });
  addShape(slide, "ellipse", { left: 644, top: 244, width: 18, height: 18 }, { fill: C.cyan });
}

function renderArchitecture(slide, spec) {
  addTitle(slide, spec.title, "Architecture");
  const y = 242;
  spec.boxes.forEach(([label, body], i) => {
    const x = 72 + i * 235;
    addShape(slide, "roundRect", { left: x, top: y, width: 180, height: 168 }, {
      fill: i === 4 ? C.ink : C.white,
      line: { style: "solid", fill: i === 4 ? C.ink : C.line, width: 1 },
      borderRadius: "rounded-lg"
    });
    addText(slide, label, { left: x + 18, top: y + 24, width: 144, height: 28 }, {
      fontSize: 22,
      bold: true,
      color: i === 4 ? C.white : C.ink,
      alignment: "center"
    });
    addText(slide, body, { left: x + 18, top: y + 72, width: 144, height: 70 }, {
      fontSize: 16,
      color: i === 4 ? "#CDECEF" : C.muted,
      alignment: "center"
    });
    if (i < spec.boxes.length - 1) {
      addText(slide, ">", { left: x + 190, top: y + 64, width: 36, height: 44 }, {
        fontSize: 32,
        bold: true,
        color: C.cyan,
        alignment: "center"
      });
    }
  });
  addText(slide, "稳定的桌面边界让 runtime 核心可以逐步从 CLI bridge 迁移到官方 service。", {
    left: 160,
    top: 482,
    width: 960,
    height: 38
  }, {
    fontSize: 24,
    bold: true,
    color: C.cyanDark,
    alignment: "center"
  });
}

function renderLayers(slide, spec) {
  addTitle(slide, spec.title, "Responsibilities");
  spec.columns.forEach(([label, items], i) => {
    const x = 92 + i * 390;
    addText(slide, label, { left: x, top: 206, width: 270, height: 34 }, {
      fontSize: 27,
      bold: true,
      color: C.ink
    });
    addShape(slide, "rect", { left: x, top: 254, width: 300, height: 3 }, { fill: i === 1 ? C.cyan : C.ink });
    addBulletList(slide, items, x, 292, 285, 68, { fontSize: 19, dot: i === 1 ? C.cyan : C.ink });
  });
}

function renderAdapter(slide, spec) {
  addTitle(slide, spec.title, "Runtime adapter");
  spec.rows.forEach(([label, body], i) => {
    const y = 196 + i * 92;
    addText(slide, label, { left: 92, top: y, width: 220, height: 32 }, {
      fontSize: 23,
      bold: true,
      color: C.cyanDark
    });
    addShape(slide, "rect", { left: 334, top: y + 14, width: 32, height: 2 }, { fill: C.line });
    addText(slide, body, { left: 394, top: y - 2, width: 720, height: 54 }, {
      fontSize: 20,
      color: C.slate
    });
  });
}

function renderDistribution(slide, spec) {
  addTitle(slide, spec.title, "BAI Code adaptation");
  spec.tracks.forEach(([label, body], i) => {
    const x = 82 + i * 392;
    addShape(slide, "roundRect", { left: x, top: 214, width: 330, height: 294 }, {
      fill: i === 0 ? C.blueSoft : i === 1 ? C.greenSoft : C.amberSoft,
      line: { style: "solid", fill: C.line, width: 1 },
      borderRadius: "rounded-lg"
    });
    addText(slide, label, { left: x + 26, top: 244, width: 278, height: 34 }, {
      fontSize: 26,
      bold: true,
      color: C.ink,
      alignment: "center"
    });
    addText(slide, body, { left: x + 28, top: 310, width: 274, height: 130 }, {
      fontSize: 19,
      color: C.slate,
      alignment: "center"
    });
  });
}

function renderContractGap(slide, spec) {
  addTitle(slide, spec.title, "Service contract");
  addText(slide, "官方已公开", { left: 116, top: 204, width: 240, height: 34 }, {
    fontSize: 25,
    bold: true,
    color: C.cyanDark
  });
  addText(slide, "桌面仍待确认", { left: 730, top: 204, width: 260, height: 34 }, {
    fontSize: 25,
    bold: true,
    color: C.ink
  });
  addBulletList(slide, spec.published, 118, 266, 360, 58, { fontSize: 20, dot: C.cyan });
  addBulletList(slide, spec.missing, 732, 266, 374, 58, { fontSize: 20, dot: C.ink });
  addShape(slide, "rect", { left: 610, top: 220, width: 2, height: 260 }, { fill: C.line });
  addShape(slide, "roundRect", { left: 150, top: 540, width: 980, height: 74 }, {
    fill: C.white,
    line: { style: "solid", fill: C.line, width: 1 },
    borderRadius: "rounded-lg"
  });
  addText(slide, spec.mitigation, { left: 180, top: 560, width: 920, height: 36 }, {
    fontSize: 20,
    bold: true,
    color: C.cyanDark,
    alignment: "center"
  });
}

function renderProvider(slide, spec) {
  addTitle(slide, spec.title, "Provider settings");
  addShape(slide, "roundRect", { left: 86, top: 202, width: 410, height: 250 }, {
    fill: C.ink,
    line: { style: "solid", fill: C.ink, width: 1 },
    borderRadius: "rounded-lg"
  });
  addText(slide, "BAI default", { left: 126, top: 236, width: 300, height: 34 }, {
    fontSize: 28,
    bold: true,
    color: C.white
  });
  addText(slide, "https://api.b.ai/v1\nchat_completions\ncustom providers allowed", {
    left: 126,
    top: 294,
    width: 300,
    height: 86
  }, {
    fontSize: 21,
    color: "#DDF3F5"
  });
  addBulletList(slide, spec.bullets, 570, 202, 560, 72, { fontSize: 19 });
}

function renderEcc(slide, spec) {
  addTitle(slide, spec.title, "EBAI mapping");
  spec.mappings.forEach(([source, target, policy], i) => {
    const y = 202 + i * 88;
    addText(slide, source, { left: 92, top: y + 4, width: 150, height: 30 }, {
      fontSize: 24,
      bold: true,
      color: C.ink
    });
    addText(slide, ">", { left: 252, top: y, width: 42, height: 36 }, {
      fontSize: 30,
      bold: true,
      color: C.cyan,
      alignment: "center"
    });
    addText(slide, target, { left: 320, top: y + 4, width: 330, height: 30 }, {
      fontSize: 21,
      bold: true,
      color: C.cyanDark
    });
    addText(slide, policy, { left: 700, top: y + 3, width: 400, height: 34 }, {
      fontSize: 19,
      color: C.slate
    });
    addShape(slide, "rect", { left: 92, top: y + 58, width: 1020, height: 1 }, { fill: C.line });
  });
}

function renderEccSafety(slide, spec) {
  addTitle(slide, spec.title, "EBAI safety");
  spec.items.forEach(([label, body], i) => {
    const x = i % 2 === 0 ? 92 : 676;
    const y = 202 + Math.floor(i / 2) * 124;
    addShape(slide, "roundRect", { left: x, top: y, width: 470, height: 90 }, {
      fill: i === 0 ? C.cyanSoft : C.white,
      line: { style: "solid", fill: C.line, width: 1 },
      borderRadius: "rounded-lg"
    });
    addText(slide, label, { left: x + 22, top: y + 18, width: 160, height: 28 }, {
      fontSize: 22,
      bold: true,
      color: C.ink
    });
    addText(slide, body, { left: x + 180, top: y + 18, width: 260, height: 42 }, {
      fontSize: 17,
      color: C.muted
    });
  });
}

function renderPlatforms(slide, spec) {
  addTitle(slide, spec.title, "Build matrix");
  spec.platforms.forEach(([platform, artifact, note], i) => {
    const y = 206 + i * 120;
    addBadge(slide, platform, 96, y, i === 0 ? C.blueSoft : i === 1 ? C.greenSoft : C.amberSoft);
    addText(slide, artifact, { left: 318, top: y - 2, width: 500, height: 60 }, {
      fontSize: 20,
      bold: true,
      color: C.ink
    });
    addText(slide, note, { left: 886, top: y + 6, width: 260, height: 30 }, {
      fontSize: 20,
      color: C.cyanDark,
      bold: true
    });
    addShape(slide, "rect", { left: 96, top: y + 86, width: 1050, height: 1 }, { fill: C.line });
  });
}

function renderRelease(slide, spec) {
  addTitle(slide, spec.title, "Release chain");
  spec.items.forEach(([label, body], i) => {
    const y = 192 + i * 72;
    addShape(slide, "rect", { left: 96, top: y + 10, width: 6, height: 38 }, { fill: i % 2 ? C.ink : C.cyan });
    addText(slide, label, { left: 126, top: y, width: 190, height: 30 }, {
      fontSize: 22,
      bold: true,
      color: C.ink
    });
    addText(slide, body, { left: 344, top: y - 2, width: 730, height: 42 }, {
      fontSize: 18,
      color: C.slate
    });
  });
}

function renderSecurity(slide, spec) {
  addTitle(slide, spec.title, "Security and compliance");
  spec.principles.forEach(([label, body], i) => {
    const x = 92 + (i % 3) * 360;
    const y = i < 3 ? 212 : 410;
    addText(slide, label, { left: x, top: y, width: 280, height: 30 }, {
      fontSize: 23,
      bold: true,
      color: C.ink
    });
    addShape(slide, "rect", { left: x, top: y + 44, width: 72, height: 3 }, { fill: C.cyan });
    addText(slide, body, { left: x, top: y + 68, width: 285, height: 74 }, {
      fontSize: 18,
      color: C.muted
    });
  });
}

function renderVerification(slide, spec) {
  addTitle(slide, spec.title, "Verification");
  spec.groups.forEach(([label, cmds], i) => {
    const x = 88 + i * 292;
    addShape(slide, "roundRect", { left: x, top: 218, width: 238, height: 260 }, {
      fill: C.white,
      line: { style: "solid", fill: C.line, width: 1 },
      borderRadius: "rounded-lg"
    });
    addText(slide, label, { left: x + 24, top: 244, width: 190, height: 30 }, {
      fontSize: 24,
      bold: true,
      color: C.cyanDark,
      alignment: "center"
    });
    addBulletList(slide, cmds, x + 24, 304, 180, 54, { fontSize: 16, dot: C.ink });
  });
}

function renderStatus(slide, spec) {
  addTitle(slide, spec.title, "Status and risks");
  addText(slide, "已完成", { left: 92, top: 202, width: 160, height: 32 }, {
    fontSize: 25,
    bold: true,
    color: C.cyanDark
  });
  addText(slide, "待收敛", { left: 690, top: 202, width: 160, height: 32 }, {
    fontSize: 25,
    bold: true,
    color: C.ink
  });
  addBulletList(slide, spec.done, 94, 260, 470, 62, { fontSize: 18, dot: C.cyan });
  addBulletList(slide, spec.open, 692, 260, 420, 74, { fontSize: 18, dot: C.ink });
  addShape(slide, "rect", { left: 630, top: 220, width: 2, height: 310 }, { fill: C.line });
}

function renderRoadmap(slide, spec) {
  addTitle(slide, spec.title, "Roadmap");
  spec.phases.forEach(([n, label, body], i) => {
    const y = 188 + i * 78;
    addLargeNumber(slide, n, 96, y, i < 2 ? C.cyanSoft : C.blueSoft);
    addText(slide, label, { left: 170, top: y + 4, width: 260, height: 30 }, {
      fontSize: 23,
      bold: true,
      color: C.ink
    });
    addText(slide, body, { left: 462, top: y + 2, width: 620, height: 38 }, {
      fontSize: 18,
      color: C.slate
    });
  });
}

function renderClose(slide, spec, logoBytes) {
  slide.background.fill = C.ink;
  addMiniLogo(slide, logoBytes, 90, 88, 88);
  addText(slide, spec.title, { left: 90, top: 220, width: 860, height: 92 }, {
    fontSize: 42,
    bold: true,
    color: C.white
  });
  addText(slide, spec.body, { left: 92, top: 336, width: 850, height: 112 }, {
    fontSize: 22,
    color: "#DDE4EA"
  });
  addShape(slide, "roundRect", { left: 92, top: 512, width: 760, height: 72 }, {
    fill: "#0E6374",
    line: { style: "solid", fill: "#0E6374", width: 1 },
    borderRadius: "rounded-lg"
  });
  addText(slide, spec.ask, { left: 122, top: 534, width: 700, height: 28 }, {
    fontSize: 23,
    bold: true,
    color: C.white,
    alignment: "center"
  });
}

function renderSlide(slide, spec, index, logoBytes) {
  slide.background.fill = C.bg;
  if (spec.kind === "cover") {
    addCover(slide, spec, logoBytes);
    return;
  }
  if (spec.kind === "close") {
    renderClose(slide, spec, logoBytes);
    return;
  }
  addShape(slide, "rect", { left: 0, top: 0, width: W, height: H }, { fill: C.bg });
  const handlers = {
    snapshot: renderSnapshot,
    problem: renderProblem,
    position: renderPosition,
    workflow: renderWorkflow,
    experience: renderExperience,
    runtimeUx: renderRuntimeUx,
    architecture: renderArchitecture,
    layers: renderLayers,
    adapter: renderAdapter,
    distribution: renderDistribution,
    contractGap: renderContractGap,
    provider: renderProvider,
    ecc: renderEcc,
    eccSafety: renderEccSafety,
    platforms: renderPlatforms,
    release: renderRelease,
    security: renderSecurity,
    verification: renderVerification,
    status: renderStatus,
    roadmap: renderRoadmap
  };
  handlers[spec.kind](slide, spec);
  addFooter(slide, index, logoBytes);
}

async function main() {
  await fs.mkdir(previewDir, { recursive: true });
  await fs.mkdir(layoutDir, { recursive: true });

  const logoBytes = await readImageBlob(logoPath);
  const presentation = Presentation.create({
    slideSize: { width: W, height: H }
  });

  slides.forEach((spec, i) => {
    const slide = presentation.slides.add();
    renderSlide(slide, spec, i + 1, logoBytes);
  });

  for (const [i, slide] of presentation.slides.items.entries()) {
    const stem = `slide-${String(i + 1).padStart(2, "0")}`;
    await writeBlob(
      path.join(previewDir, `${stem}.png`),
      await presentation.export({ slide, format: "png", scale: 1 })
    );
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(layoutDir, `${stem}.layout.json`), await layout.text(), "utf8");
  }

  await writeBlob(
    montagePath,
    await presentation.export({ format: "webp", montage: true, scale: 1 })
  );

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(outputPptx);

  const inspect = await presentation.inspect({
    kind: "slide,textbox,shape,image,chart,table",
    maxChars: 8000
  });
  await fs.writeFile(path.join(workspaceDir, "inspect.ndjson"), inspect.ndjson, "utf8");
  await fs.rm(`${outputPptx}.inspect.ndjson`, { force: true });

  console.log(`Wrote ${outputPptx}`);
  console.log(`Slides: ${slides.length}`);
  console.log(`Preview: ${previewDir}`);
  console.log(`Montage: ${montagePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
