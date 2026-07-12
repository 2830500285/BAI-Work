const fs = require('node:fs')
const path = require('node:path')
const PptxGenJS = require('pptxgenjs')

const root = path.resolve(__dirname, '../..')
const output = path.join(__dirname, 'BAI-Work-Defense-Deck.pptx')
const scriptOutput = path.join(__dirname, 'BAI-Work-Defense-Script.md')
const wordmark = path.join(root, 'src/asset/img/bai-work-wordmark.png')
const homeScreenshot = path.join(root, 'docs/screenshots/bai-work-home-current.png')

const pptx = new PptxGenJS()
pptx.layout = 'LAYOUT_WIDE'
pptx.author = 'BAI Work'
pptx.company = 'BAI Work'
pptx.subject = 'BAI Work Genesis Hackathon defense deck'
pptx.title = 'BAI Work 项目答辩'
pptx.lang = 'zh-CN'
pptx.theme = {
  headFontFace: 'PingFang SC',
  bodyFontFace: 'PingFang SC',
  lang: 'zh-CN'
}
pptx.defineLayout({ name: 'BAI_WIDE', width: 13.333, height: 7.5 })
pptx.layout = 'BAI_WIDE'

const S = pptx.ShapeType
const W = 13.333
const H = 7.5
const C = {
  ink: '171A1F',
  softInk: '3E4650',
  muted: '69727E',
  line: 'D9DEE3',
  bg: 'F6F6F3',
  paper: 'FFFEFA',
  white: 'FFFFFF',
  black: '0C0E11',
  teal: '2B7A78',
  tealSoft: 'DDECEA',
  blue: '3559C7',
  blueSoft: 'E4E9F8',
  coral: 'D8644D',
  coralSoft: 'F5E2DD',
  amber: 'B87B16',
  amberSoft: 'F4E7C8',
  green: '39775C',
  greenSoft: 'DDEBE3',
  red: 'A44747',
  redSoft: 'F1DEDE',
  slate: '27313A',
  slateSoft: 'E5E9EC'
}

const scoreColor = {
  '技术创新性': C.teal,
  '产品完成度': C.blue,
  '商业与生态潜力': C.coral,
  'AI / Web3 应用': C.amber,
  '展示表达能力': C.green
}

const scriptSections = []

function addText(slide, text, x, y, w, h, options = {}) {
  slide.addText(text, {
    x,
    y,
    w,
    h,
    fontFace: options.fontFace || 'PingFang SC',
    fontSize: options.fontSize || 18,
    color: options.color || C.ink,
    bold: options.bold || false,
    margin: options.margin === undefined ? 0 : options.margin,
    breakLine: false,
    fit: 'shrink',
    valign: options.valign || 'mid',
    align: options.align || 'left',
    isTextBox: true,
    ...options
  })
}

function addRect(slide, x, y, w, h, fill, line = fill, radius = false) {
  slide.addShape(radius ? S.roundRect : S.rect, {
    x,
    y,
    w,
    h,
    rectRadius: radius ? 0.08 : undefined,
    fill: { color: fill },
    line: { color: line, width: line === fill ? 0 : 1 }
  })
}

function addLine(slide, x, y, w, h, color = C.line, width = 1, endArrowType) {
  slide.addShape(S.line, {
    x,
    y,
    w,
    h,
    line: { color, width, endArrowType }
  })
}

function addPill(slide, text, x, y, w, fill, color = C.ink, fontSize = 11) {
  addRect(slide, x, y, w, 0.34, fill, fill, true)
  addText(slide, text, x + 0.08, y + 0.01, w - 0.16, 0.3, {
    fontSize,
    color,
    bold: true,
    align: 'center'
  })
}

function addImageContain(slide, imagePath, ratio, x, y, w, h) {
  const boxRatio = w / h
  let imageW = w
  let imageH = h
  if (ratio > boxRatio) imageH = w / ratio
  else imageW = h * ratio
  slide.addImage({
    path: imagePath,
    x: x + (w - imageW) / 2,
    y: y + (h - imageH) / 2,
    w: imageW,
    h: imageH
  })
}

function addHeader(slide, number, title, dimension, points, accent, eyebrow) {
  addText(slide, eyebrow || `BAI WORK / ${String(number).padStart(2, '0')}`, 0.58, 0.33, 3.2, 0.25, {
    fontFace: 'Aptos',
    fontSize: 10,
    color: accent,
    bold: true,
    charSpacing: 1.2
  })
  addText(slide, title, 0.58, 0.68, 10.7, 0.7, {
    fontSize: 28,
    color: C.ink,
    bold: true
  })
  addPill(slide, `${dimension} · ${points}`, 10.95, 0.35, 1.8, scoreColor[dimension] || accent, C.white, 10)
  addLine(slide, 0.58, 1.42, 12.15, 0, C.line, 1)
}

function addFooter(slide, number, source) {
  addText(slide, source || 'BAI Work · Genesis Hackathon', 0.58, 7.16, 8.8, 0.18, {
    fontFace: 'Aptos',
    fontSize: 8.5,
    color: C.muted
  })
  addText(slide, `${String(number).padStart(2, '0')} / 16`, 11.82, 7.14, 0.9, 0.2, {
    fontFace: 'Aptos',
    fontSize: 8.5,
    color: C.muted,
    align: 'right'
  })
}

function addNotes(slide, number, title, duration, lines) {
  const notes = [`${title}（建议 ${duration}）`, ...lines].join('\n')
  slide.addNotes(notes)
  scriptSections.push(`## ${number}. ${title}（${duration}）\n\n${lines.map((line) => `- ${line}`).join('\n')}\n`)
}

function baseSlide(color = C.bg) {
  const slide = pptx.addSlide()
  slide.background = { color }
  return slide
}

function addBulletList(slide, items, x, y, w, lineHeight = 0.52, color = C.softInk, fontSize = 16) {
  items.forEach((item, index) => {
    addRect(slide, x, y + index * lineHeight + 0.16, 0.08, 0.08, C.teal)
    addText(slide, item, x + 0.2, y + index * lineHeight, w - 0.2, lineHeight, {
      fontSize,
      color,
      valign: 'top'
    })
  })
}

function addMetric(slide, value, label, x, y, w, accent, note) {
  addText(slide, value, x, y, w, 0.56, {
    fontFace: 'Aptos Display',
    fontSize: 30,
    color: accent,
    bold: true
  })
  addText(slide, label, x, y + 0.54, w, 0.3, {
    fontSize: 12,
    color: C.ink,
    bold: true
  })
  if (note) addText(slide, note, x, y + 0.88, w, 0.38, { fontSize: 9.5, color: C.muted, valign: 'top' })
}

// 01 Cover
{
  const slide = baseSlide(C.black)
  addRect(slide, 7.55, 0, 5.783, H, C.paper)
  addImageContain(slide, homeScreenshot, 1280 / 840, 7.72, 0.48, 5.28, 5.6)
  addRect(slide, 7.55, 6.15, 5.783, 1.35, C.slate)
  addText(slide, 'GENESIS HACKATHON', 0.7, 0.6, 3.5, 0.25, {
    fontFace: 'Aptos',
    fontSize: 11,
    color: '7EC5C1',
    bold: true,
    charSpacing: 1.8
  })
  addImageContain(slide, wordmark, 920 / 240, 0.68, 1.2, 5.55, 1.45)
  addText(slide, '让 AI Agent 真正完成\n桌面工程任务', 0.7, 2.76, 6.1, 1.35, {
    fontSize: 32,
    color: C.white,
    bold: true,
    breakLine: true,
    valign: 'top'
  })
  addText(slide, 'BAI Code runtime · 项目上下文 · 工具执行 · 安全生态', 0.72, 4.35, 6.1, 0.45, {
    fontSize: 15,
    color: 'C5CDD4'
  })
  const coverScores = [
    ['技术创新', '20'],
    ['产品完成', '25'],
    ['商业生态', '20'],
    ['AI 应用', '20'],
    ['展示表达', '15']
  ]
  coverScores.forEach(([label, value], index) => {
    const x = 0.72 + index * 1.23
    addText(slide, value, x, 5.38, 0.58, 0.42, { fontFace: 'Aptos Display', fontSize: 20, color: '7EC5C1', bold: true })
    addText(slide, label, x, 5.8, 1.05, 0.28, { fontSize: 9.5, color: 'C5CDD4' })
  })
  addText(slide, '项目答辩 · 2026.07', 0.72, 6.78, 3.1, 0.25, { fontSize: 10.5, color: '89939D' })
  addText(slide, '可运行产品，不是概念原型', 7.98, 6.48, 4.65, 0.35, {
    fontSize: 18,
    color: C.white,
    bold: true,
    align: 'center'
  })
  addText(slide, 'Mac Intel · Mac Apple Silicon · Windows x64', 7.98, 6.87, 4.65, 0.26, {
    fontFace: 'Aptos',
    fontSize: 10,
    color: 'C8D1D8',
    align: 'center'
  })
  addNotes(slide, 1, '封面', '30 秒', [
    '开场一句：BAI Work 不是一个新的聊天框，而是让 BAI Code 在真实桌面项目里持续完成任务的工作台。',
    '先建立可信度：当前版本已经有三平台产物、可运行的 Mac Intel 应用和完整测试。',
    '提示评委：接下来所有内容都按五项评分标准展开，并在最后逐项回收证据。'
  ])
}

// 02 One-line pitch and problem
{
  const slide = baseSlide()
  addHeader(slide, 2, '一句话：把可用 CLI 变成可交付桌面工作流', '技术创新性', '20', C.teal, 'WHY BAI WORK')
  addText(slide, '开发者真正缺的不是另一个模型入口，而是一个能保留上下文、展示过程、组织产物并安全扩展的 Agent 工作面。', 0.68, 1.7, 11.95, 0.72, {
    fontSize: 20,
    bold: true,
    color: C.softInk,
    align: 'center'
  })
  const problems = [
    ['01', '上下文碎片化', '项目、Git、文件、历史会话散落在终端和窗口之间。', C.coralSoft, C.coral],
    ['02', '执行过程不可见', '长任务只看到等待或原始日志，无法判断进度与失败位置。', C.amberSoft, C.amber],
    ['03', '能力扩展不可信', '命令、skills、hooks 很强，但安装即执行会扩大本地风险。', C.blueSoft, C.blue]
  ]
  problems.forEach(([n, title, body, fill, accent], index) => {
    const x = 0.7 + index * 4.13
    addRect(slide, x, 2.72, 3.8, 2.45, fill, fill, true)
    addText(slide, n, x + 0.24, 2.95, 0.6, 0.4, { fontFace: 'Aptos Display', fontSize: 20, color: accent, bold: true })
    addText(slide, title, x + 0.24, 3.42, 3.2, 0.42, { fontSize: 20, color: C.ink, bold: true })
    addText(slide, body, x + 0.24, 4.02, 3.25, 0.82, { fontSize: 14, color: C.softInk, valign: 'top' })
  })
  addRect(slide, 1.28, 5.55, 10.78, 0.92, C.slate, C.slate, true)
  addText(slide, 'BAI Work 的解法：项目优先 + 可观测执行 + 可审阅产物 + 受信任生态', 1.55, 5.72, 10.25, 0.5, {
    fontSize: 21,
    color: C.white,
    bold: true,
    align: 'center'
  })
  addFooter(slide, 2, '证据：README.md · runtime adapter · EBAI 安全策略')
  addNotes(slide, 2, '问题与一句话方案', '45 秒', [
    '不要从功能清单开始，先说清开发者为什么需要它。',
    '三个问题分别对应产品主流程、可观测性创新和生态安全设计。',
    '强调差异：BAI Work 不是把网页套壳，而是把执行、交互、文件与发布组织成一个连续工作流。'
  ])
}

// 03 Demo flow
{
  const slide = baseSlide(C.paper)
  addHeader(slide, 3, '现场演示：从一句任务到可验收产物', '展示表达能力', '15', C.green, 'DEMO STORY')
  addRect(slide, 0.66, 1.68, 7.15, 4.8, C.white, C.line, true)
  addImageContain(slide, homeScreenshot, 1280 / 840, 0.86, 1.88, 6.75, 4.4)
  addPill(slide, '演示任务', 8.18, 1.76, 1.05, C.greenSoft, C.green, 10)
  addText(slide, '“检查当前项目，修复问题，展示推进过程，并交付可验证结果。”', 8.18, 2.18, 4.35, 0.82, {
    fontSize: 18,
    color: C.ink,
    bold: true,
    valign: 'top'
  })
  const demoSteps = [
    ['1', '选择 workspace', '项目 / Git / 文件进入上下文'],
    ['2', '持续执行', '计划、工具步骤、等待与错误可见'],
    ['3', '审阅结果', '文件、diff、文档和最终摘要分离'],
    ['4', '复用能力', '记忆、skills、自动化沉淀到后续任务']
  ]
  demoSteps.forEach(([n, title, body], index) => {
    const y = 3.2 + index * 0.78
    addRect(slide, 8.18, y, 0.4, 0.4, index === 3 ? C.green : C.teal, index === 3 ? C.green : C.teal, true)
    addText(slide, n, 8.18, y, 0.4, 0.4, { fontFace: 'Aptos', fontSize: 12, color: C.white, bold: true, align: 'center' })
    addText(slide, title, 8.75, y - 0.03, 1.45, 0.3, { fontSize: 14, color: C.ink, bold: true })
    addText(slide, body, 8.75, y + 0.28, 3.65, 0.3, { fontSize: 10.5, color: C.muted })
  })
  addRect(slide, 8.18, 6.35, 4.35, 0.45, C.slateSoft, C.slateSoft, true)
  addText(slide, '演示目标：3 分钟内证明“能做、看得见、可验收”', 8.35, 6.42, 4.0, 0.28, { fontSize: 11.5, color: C.slate, bold: true, align: 'center' })
  addFooter(slide, 3, '演示使用当前 Mac Intel x86_64 构建')
  addNotes(slide, 3, '现场演示路径', '50 秒 + 3 分钟演示', [
    '先展示最新首页，说明这是当前打包后的 Mac Intel 应用。',
    '现场只跑一条主流程，不在设置页来回跳转：选择项目、发送任务、展开步骤、打开产物。',
    '若网络异常，使用已生成产物和 packaged runtime health 作为兜底证据，不在台上排查网络。'
  ])
}

// 04 Product completion
{
  const slide = baseSlide()
  addHeader(slide, 4, '产品完成度：一条主流程，六个可演示能力', '产品完成度', '25', C.blue, 'PRODUCT COMPLETENESS')
  const capabilities = [
    ['项目与会话', 'Workspace、历史、Git 上下文'],
    ['模型与 Provider', 'BAI 默认 + OpenAI-compatible'],
    ['实时进度', '步骤、工具摘要、错误恢复'],
    ['文件与产物', '引用、预览、diff、文档'],
    ['长期记忆', '用户 / 工作区 / 项目作用域'],
    ['插件与自动化', 'Skills、EBAI、MCP、任务调度']
  ]
  capabilities.forEach(([title, body], index) => {
    const col = index % 3
    const row = Math.floor(index / 3)
    const x = 0.7 + col * 4.16
    const y = 1.82 + row * 1.72
    addRect(slide, x, y, 3.78, 1.38, index < 3 ? C.blueSoft : C.tealSoft, index < 3 ? C.blueSoft : C.tealSoft, true)
    addText(slide, `0${index + 1}`, x + 0.22, y + 0.18, 0.46, 0.3, { fontFace: 'Aptos', fontSize: 12, color: index < 3 ? C.blue : C.teal, bold: true })
    addText(slide, title, x + 0.72, y + 0.16, 2.72, 0.34, { fontSize: 17, color: C.ink, bold: true })
    addText(slide, body, x + 0.22, y + 0.68, 3.3, 0.42, { fontSize: 12.5, color: C.softInk })
  })
  addRect(slide, 0.7, 5.5, 12.0, 1.02, C.white, C.line, true)
  addMetric(slide, '3', '桌面目标', 1.08, 5.68, 1.7, C.blue, 'mac-x64 / mac-arm64 / win-x64')
  addMetric(slide, '0.1.1', '公开版本', 3.45, 5.68, 1.7, C.teal, '同源构建与 release assets')
  addMetric(slide, '8', '本地运行时路由', 5.82, 5.68, 1.7, C.amber, '稳定 /v1/* 桌面边界')
  addMetric(slide, '78', '内置技能入口', 8.19, 5.68, 1.7, C.coral, '其中 73 个 Hermes-derived')
  addMetric(slide, '1', '连续工作流', 10.56, 5.68, 1.7, C.green, '从任务到产物再到复用')
  addFooter(slide, 4, '当前实现证据：README · release v0.1.1 · resources/skills')
  addNotes(slide, 4, '产品完成度', '45 秒', [
    '从用户流程讲完成度，而不是从代码模块讲完成度。',
    '六项能力都在同一应用里可操作；三平台和公开版本证明不是一次性 Demo。',
    '强调目前最成熟的是 Mac Intel，其他平台已有同源产物和原生 CI smoke。'
  ])
}

// 05 Architecture innovation
{
  const slide = baseSlide(C.paper)
  addHeader(slide, 5, '技术创新 1：稳定桌面边界隔离上游变化', '技术创新性', '20', C.teal, 'ARCHITECTURE')
  const boxes = [
    ['Renderer', '工作台 UI\n会话 / 设置 / 审阅', 0.72, C.blueSoft, C.blue],
    ['Preload', '最小 IPC\n受控桌面能力', 3.18, C.slateSoft, C.slate],
    ['Main Host', '设置 / 文件 / Git\n运行时生命周期', 5.64, C.tealSoft, C.teal],
    ['/v1/* + SSE', '稳定本地契约\n进度与线程边界', 8.1, C.amberSoft, C.amber],
    ['BAI Code', 'CLI 0.9.1 today\nfuture service', 10.56, C.coralSoft, C.coral]
  ]
  boxes.forEach(([title, body, x, fill, accent], index) => {
    addRect(slide, x, 2.18, 1.98, 1.58, fill, fill, true)
    addText(slide, title, x + 0.12, 2.43, 1.74, 0.34, { fontFace: 'Aptos', fontSize: 16, color: accent, bold: true, align: 'center' })
    addText(slide, body, x + 0.14, 2.94, 1.7, 0.58, { fontSize: 11.5, color: C.softInk, align: 'center', breakLine: true })
    if (index < boxes.length - 1) addLine(slide, x + 2.03, 2.97, 0.38, 0, C.muted, 1.5, 'triangle')
  })
  addRect(slide, 0.72, 4.44, 7.55, 1.4, C.white, C.line, true)
  addText(slide, '创新点', 0.98, 4.68, 0.9, 0.3, { fontSize: 14, color: C.teal, bold: true })
  addText(slide, '把上游 CLI / service 的变化收敛在 Runtime Host 内部，Renderer 不需要随着协议反复重写。', 1.9, 4.62, 5.98, 0.48, { fontSize: 16, color: C.ink, bold: true })
  addText(slide, '当前官方未公开 session / event / permission / question 桌面协议；BAI Work 明确暴露这一边界，不把兼容桥伪装成官方能力。', 0.98, 5.18, 6.88, 0.42, { fontSize: 11.5, color: C.muted, valign: 'top' })
  addRect(slide, 8.55, 4.44, 4.05, 1.4, C.slate, C.slate, true)
  addText(slide, '差异化结果', 8.85, 4.68, 1.3, 0.3, { fontSize: 14, color: '8FD4CF', bold: true })
  addText(slide, '可替换 runtime\n不牺牲桌面连续性', 8.85, 5.05, 3.38, 0.62, { fontSize: 20, color: C.white, bold: true, breakLine: true })
  addFooter(slide, 5, '证据：src/main/runtime/bai-work-adapter.ts · preload IPC · renderer client')
  addNotes(slide, 5, '稳定桌面边界', '55 秒', [
    '先从左到右讲五层，每层只说一句职责。',
    '核心创新不是“用了 Electron”，而是把不稳定的上游协议封装在可替换 Host 内。',
    '主动说明官方协议缺口能增强可信度，也解释为什么当前选择兼容桥而不是硬编码不存在的 service。'
  ])
}

// 06 Observability
{
  const slide = baseSlide()
  addHeader(slide, 6, '技术创新 2：把长任务过程变成可观测状态机', '技术创新性', '20', C.teal, 'RUNTIME OBSERVABILITY')
  const flow = [
    ['输入', '目标与约束'],
    ['事件', '流式 runtime 输出'],
    ['归一化', '去重 / 分类 / 清洗'],
    ['时间线', '步骤 / 工具 / 等待'],
    ['结果', '摘要与产物'],
    ['用量', '可得则展示，不臆造']
  ]
  flow.forEach(([title, body], index) => {
    const x = 0.67 + index * 2.08
    const fill = index === 2 || index === 3 ? C.tealSoft : C.white
    addRect(slide, x, 2.02, 1.73, 1.2, fill, C.line, true)
    addText(slide, title, x + 0.12, 2.23, 1.49, 0.32, { fontSize: 15, color: index === 2 || index === 3 ? C.teal : C.ink, bold: true, align: 'center' })
    addText(slide, body, x + 0.12, 2.68, 1.49, 0.25, { fontSize: 9.7, color: C.muted, align: 'center' })
    if (index < flow.length - 1) addLine(slide, x + 1.76, 2.61, 0.27, 0, C.muted, 1.2, 'triangle')
  })
  addText(slide, '原始输出', 0.75, 3.72, 1.25, 0.3, { fontSize: 13, color: C.red, bold: true })
  addRect(slide, 0.72, 4.08, 5.7, 1.54, C.redSoft, C.redSoft, true)
  addText(slide, 'bash(command=...)  read_file(...)  重复状态句\nRemoteProtocolError / incomplete chunked read\n长时间无反馈，最终整段堆积', 1.02, 4.34, 5.1, 1.02, {
    fontFace: 'Aptos',
    fontSize: 14,
    color: C.red,
    breakLine: true,
    valign: 'top'
  })
  addText(slide, 'BAI Work 呈现', 6.92, 3.72, 1.55, 0.3, { fontSize: 13, color: C.green, bold: true })
  addRect(slide, 6.9, 4.08, 5.7, 1.54, C.greenSoft, C.greenSoft, true)
  addText(slide, '正在检查工作区  →  已运行 6 条命令\n连接中断：可重试，并保留有效上下文\n完成后只留下清晰结论、产物与验证', 7.2, 4.34, 5.1, 1.02, {
    fontSize: 14,
    color: C.green,
    bold: true,
    breakLine: true,
    valign: 'top'
  })
  addRect(slide, 2.32, 6.03, 8.68, 0.55, C.slate, C.slate, true)
  addText(slide, '价值：用户知道“现在在做什么、哪里卡住、最终交付了什么”', 2.55, 6.12, 8.22, 0.32, { fontSize: 16, color: C.white, bold: true, align: 'center' })
  addFooter(slide, 6, '证据：runtime stream handling · progress timeline · failure sanitization tests')
  addNotes(slide, 6, '可观测状态机', '50 秒', [
    '这页直接回应产品迭代中最痛的体验：长时间无反馈、工具过程堆到最终回复、错误堆栈污染聊天。',
    '说明 BAI Work 不是展示模型思维链，而是展示可验证的状态、工具动作和产物。',
    '用量原则同样保守：runtime 没有 cache telemetry 就显示不可用，不把零当成真实命中率。'
  ])
}

// 07 AI depth
{
  const slide = baseSlide(C.paper)
  addHeader(slide, 7, 'AI 应用不是接口调用，而是完整 Agent 闭环', 'AI / Web3 应用', '20', C.amber, 'AI DEPTH')
  addRect(slide, 0.72, 1.72, 7.3, 4.85, C.white, C.line, true)
  const loop = [
    ['上下文', 'Workspace · Git · 文件 · 记忆', 2.22, 2.08, C.blue],
    ['规划', '拆解目标与约束', 5.35, 2.08, C.teal],
    ['工具', 'Shell · 文件 · MCP · Skills', 5.35, 4.2, C.coral],
    ['产物', '代码 · 文档 · 图表 · diff', 2.22, 4.2, C.green]
  ]
  loop.forEach(([title, body, x, y, accent]) => {
    addRect(slide, x, y, 2.18, 1.0, C.bg, C.line, true)
    addText(slide, title, x + 0.18, y + 0.16, 1.82, 0.32, { fontSize: 16, color: accent, bold: true, align: 'center' })
    addText(slide, body, x + 0.12, y + 0.56, 1.94, 0.22, { fontSize: 9.5, color: C.muted, align: 'center' })
  })
  addRect(slide, 3.78, 3.2, 2.06, 0.82, C.slate, C.slate, true)
  addText(slide, 'BAI Code\nruntime', 3.96, 3.28, 1.7, 0.62, { fontFace: 'Aptos', fontSize: 18, color: C.white, bold: true, align: 'center', breakLine: true })
  addLine(slide, 4.38, 3.08, 0, -0.5, C.amber, 2, 'triangle')
  addLine(slide, 5.84, 3.61, 0.55, 0, C.amber, 2, 'triangle')
  addLine(slide, 4.38, 4.02, 0, 0.45, C.amber, 2, 'triangle')
  addLine(slide, 3.78, 3.61, -0.55, 0, C.amber, 2, 'triangle')
  addText(slide, '验证通过后继续 / 失败则带上下文恢复', 2.35, 5.68, 5.7, 0.32, { fontSize: 12, color: C.softInk, bold: true, align: 'center' })
  addText(slide, 'AI 深度的四个证据', 8.42, 1.9, 3.8, 0.38, { fontSize: 20, color: C.ink, bold: true })
  addBulletList(slide, [
    '多轮、多步骤任务，而非单次问答',
    '真实本地工具执行与文件变更',
    '产物、验证和错误恢复进入同一循环',
    '记忆与技能让能力跨任务复用'
  ], 8.45, 2.52, 3.95, 0.68, C.softInk, 15)
  addRect(slide, 8.42, 5.55, 4.0, 0.9, C.amberSoft, C.amberSoft, true)
  addText(slide, '当前版本选择把 AI 做深，不用 Web3 贴标签。\n若未来接入链上能力，只用于插件签名与发布溯源。', 8.7, 5.7, 3.45, 0.58, { fontSize: 11.5, color: C.amber, bold: true, breakLine: true, align: 'center' })
  addFooter(slide, 7, '当前已实现 AI Agent 闭环；Web3 仅作为有需求时的可验证基础设施选项')
  addNotes(slide, 7, 'AI 应用深度', '55 秒', [
    '围绕闭环讲 AI，不要只报模型名称。',
    '强调工具执行、产物和验证是最难也最有价值的部分。',
    '对 Web3 保持克制：评分标准允许 AI 或 Web3，当前项目用真实 AI 深度得分，不做概念包装。'
  ])
}

// 08 Ecosystem
{
  const slide = baseSlide()
  addHeader(slide, 8, '生态能力：把开源资产变成可控、可安装的生产力', '商业与生态潜力', '20', C.coral, 'OPEN ECOSYSTEM')
  const lanes = [
    ['EBAI', 'commands · agent commands · rules · hooks', '映射到 ~/.bai；hooks 默认关闭', C.blueSoft, C.blue],
    ['Hermes-derived', '73 个可审阅 SKILL.md', '研究、开发、生产力、MLOps 等类别', C.tealSoft, C.teal],
    ['Agent-Reach / MCP', '外部搜索与工具连接', '按需安装，不静默扩大权限', C.coralSoft, C.coral],
    ['BAI Work Native', 'Guardrails · Token Efficiency · Speckit · Memory', '形成产品默认能力与安全口径', C.greenSoft, C.green]
  ]
  lanes.forEach(([title, capabilities, note, fill, accent], index) => {
    const y = 1.78 + index * 1.22
    addRect(slide, 0.72, y, 11.88, 0.95, fill, fill, true)
    addText(slide, title, 0.98, y + 0.18, 1.85, 0.34, { fontFace: 'Aptos', fontSize: 17, color: accent, bold: true })
    addText(slide, capabilities, 3.02, y + 0.16, 4.35, 0.34, { fontSize: 15, color: C.ink, bold: true })
    addText(slide, note, 7.52, y + 0.18, 4.72, 0.34, { fontSize: 12, color: C.softInk, align: 'right' })
  })
  addRect(slide, 0.72, 6.0, 11.88, 0.62, C.slate, C.slate, true)
  addText(slide, '生态原则：能复用，但必须可追溯、可禁用、可限定作用域', 1.0, 6.1, 11.3, 0.35, { fontSize: 18, color: C.white, bold: true, align: 'center' })
  addFooter(slide, 8, '仓库实测：resources/skills 下 78 个 SKILL.md，其中 73 个 Hermes-derived')
  addNotes(slide, 8, '开源生态内化', '45 秒', [
    '重点不是“集成了很多项目”，而是说明它们如何进入 BAI 目录、如何被用户发现、如何受权限约束。',
    'EBAI 将 commands、agents、rules、hooks 映射为 BAI 可用形态；Hermes-derived skills 直接进入技能发现层。',
    'Agent-Reach 和外部 MCP 保持按需安装，避免为了功能数量默认打开额外网络或执行能力。'
  ])
}

// 09 Safety
{
  const slide = baseSlide(C.paper)
  addHeader(slide, 9, '安全不是限制功能，而是定义可信执行边界', 'AI / Web3 应用', '20', C.amber, 'TRUST BOUNDARY')
  addRect(slide, 0.72, 1.78, 3.0, 4.72, C.slate, C.slate, true)
  addText(slide, '用户可信区', 1.04, 2.05, 2.35, 0.4, { fontSize: 21, color: C.white, bold: true, align: 'center' })
  addText(slide, 'API key\n项目文件\n工作区选择\n审批与问题', 1.16, 2.78, 2.12, 2.1, { fontSize: 18, color: 'DDE4E9', breakLine: true, align: 'center', valign: 'top' })
  addPill(slide, '本地保存', 1.55, 5.6, 1.35, C.green, C.white, 11)
  addLine(slide, 3.92, 4.1, 0.75, 0, C.amber, 2, 'triangle')
  addRect(slide, 4.72, 1.78, 3.02, 4.72, C.amberSoft, C.amberSoft, true)
  addText(slide, 'BAI Work 边界', 5.02, 2.05, 2.42, 0.4, { fontSize: 21, color: C.amber, bold: true, align: 'center' })
  addBulletList(slide, [
    '127.0.0.1 默认绑定',
    'Renderer 最小 IPC',
    '凭据不回显',
    '外部错误清洗',
    '日志路径可定位'
  ], 5.18, 2.76, 2.15, 0.58, C.softInk, 13)
  addLine(slide, 7.95, 4.1, 0.75, 0, C.amber, 2, 'triangle')
  addRect(slide, 8.74, 1.78, 3.86, 4.72, C.white, C.line, true)
  addText(slide, '外部能力区', 9.08, 2.05, 3.18, 0.4, { fontSize: 21, color: C.coral, bold: true, align: 'center' })
  addBulletList(slide, [
    'EBAI hooks 安装后 disabled',
    '启用必须指定 trusted workspace',
    'workspace/.bai/hooks.toml 作用域',
    '复制 rules 时拒绝 symlink',
    'MCP / Agent-Reach 按需安装'
  ], 9.16, 2.76, 3.0, 0.58, C.softInk, 13)
  addRect(slide, 4.95, 5.75, 2.56, 0.46, C.amber, C.amber, true)
  addText(slide, '默认安全，显式授权', 5.1, 5.82, 2.26, 0.27, { fontSize: 13, color: C.white, bold: true, align: 'center' })
  addFooter(slide, 9, '证据：credential redaction · loopback service · trusted-workspace hooks tests')
  addNotes(slide, 9, '安全与可信边界', '45 秒', [
    '按三层边界讲：用户可信区、BAI Work 本地边界、外部能力区。',
    '最关键的安全设计是 hooks 默认关闭，启用必须限定到受信任 workspace。',
    '强调所有安全默认值都在代码和测试中，不是答辩时补写的承诺。'
  ])
}

// 10 Engineering proof
{
  const slide = baseSlide()
  addHeader(slide, 10, '工程证据：不是原型截图，而是已构建的软件', '产品完成度', '25', C.blue, 'DELIVERY EVIDENCE')
  const metrics = [
    ['3', '桌面平台', 'Mac Intel / Apple Silicon / Windows', C.blue],
    ['168', '测试文件', '覆盖 main、runtime、renderer、服务', C.teal],
    ['1,144', '自动化测试', '本轮完整测试全部通过', C.green],
    ['0.9.1', 'BAI Code runtime', 'Mac Intel packaged smoke healthy', C.coral]
  ]
  metrics.forEach(([value, label, note, accent], index) => {
    const x = 0.72 + index * 3.0
    addRect(slide, x, 1.82, 2.68, 1.7, C.white, C.line, true)
    addText(slide, value, x + 0.22, 2.05, 2.24, 0.58, { fontFace: 'Aptos Display', fontSize: 32, color: accent, bold: true, align: 'center' })
    addText(slide, label, x + 0.22, 2.69, 2.24, 0.3, { fontSize: 13.5, color: C.ink, bold: true, align: 'center' })
    addText(slide, note, x + 0.25, 3.03, 2.18, 0.3, { fontSize: 8.8, color: C.muted, align: 'center' })
  })
  const platforms = [
    ['macOS Intel x64', '自包含 CPython 3.11 + BAI Code runtime', '已在本机重新构建并运行'],
    ['macOS arm64', '官方 BAI Code wheelhouse + user-local venv', '原生 CI 构建与 smoke'],
    ['Windows x64', '官方 win_amd64 wheelhouse + NSIS', '原生 CI 构建与 smoke']
  ]
  platforms.forEach(([name, packageText, result], index) => {
    const y = 4.02 + index * 0.76
    addRect(slide, 0.72, y, 2.55, 0.56, index === 0 ? C.blue : C.slate, index === 0 ? C.blue : C.slate, true)
    addText(slide, name, 0.9, y + 0.09, 2.18, 0.3, { fontFace: 'Aptos', fontSize: 13, color: C.white, bold: true, align: 'center' })
    addText(slide, packageText, 3.55, y + 0.06, 5.5, 0.36, { fontSize: 12.5, color: C.softInk })
    addPill(slide, result, 9.38, y + 0.1, 2.9, index === 0 ? C.blueSoft : C.greenSoft, index === 0 ? C.blue : C.green, 10)
  })
  addRect(slide, 0.72, 6.44, 11.88, 0.42, C.slateSoft, C.slateSoft, true)
  addText(slide, '验证链：typecheck → lint → unit tests → production build → electron-builder → packaged runtime smoke', 0.98, 6.5, 11.35, 0.26, { fontFace: 'Aptos', fontSize: 11.5, color: C.slate, bold: true, align: 'center' })
  addFooter(slide, 10, '当前事实：Mac Intel binary 为 Mach-O 64-bit x86_64；CFBundleDisplayName = BAI Work')
  addNotes(slide, 10, '工程验证证据', '45 秒', [
    '先给四个大数字，再讲三平台分发策略。',
    'Mac Intel 是当前最稳定版本，自包含 runtime；arm64 和 Windows 使用官方 wheelhouse，在用户目录创建 venv。',
    '不要把 CI 通过等同于全部商业发布：当前 macOS 公证和 Windows 代码签名仍需正式凭据。'
  ])
}

// 11 Users
{
  const slide = baseSlide(C.paper)
  addHeader(slide, 11, '真实需求：先服务高频、长链路的知识工作者', '商业与生态潜力', '20', C.coral, 'TARGET USERS')
  const users = [
    ['个人开发者 / 研究者', '本地项目任务长、文件多、需要持续上下文', '从问题到代码 / 文档 / 图表的一站式交付', C.blueSoft, C.blue],
    ['小型研发团队', '重复流程难复用，Agent 行为和权限难统一', '共享 skills、规则、Provider 与审阅口径', C.tealSoft, C.teal],
    ['BAI 生态开发者', 'CLI 能力缺少桌面入口、分发和用户反馈面', '把 runtime、模型和生态能力带到日常工作流', C.coralSoft, C.coral]
  ]
  users.forEach(([name, pain, value, fill, accent], index) => {
    const x = 0.72 + index * 4.03
    addRect(slide, x, 1.85, 3.68, 3.9, fill, fill, true)
    addText(slide, `0${index + 1}`, x + 0.24, 2.08, 0.5, 0.34, { fontFace: 'Aptos', fontSize: 13, color: accent, bold: true })
    addText(slide, name, x + 0.24, 2.5, 3.15, 0.58, { fontSize: 20, color: C.ink, bold: true, valign: 'top' })
    addText(slide, '核心痛点', x + 0.24, 3.34, 1.1, 0.28, { fontSize: 11, color: accent, bold: true })
    addText(slide, pain, x + 0.24, 3.69, 3.14, 0.72, { fontSize: 13.5, color: C.softInk, valign: 'top' })
    addText(slide, 'BAI Work 价值', x + 0.24, 4.65, 1.4, 0.28, { fontSize: 11, color: accent, bold: true })
    addText(slide, value, x + 0.24, 5.0, 3.14, 0.55, { fontSize: 13.5, color: C.ink, bold: true, valign: 'top' })
  })
  addText(slide, '首批验证不追求“所有 AI 用户”，而聚焦已有本地项目、愿意把任务交给 Agent 的用户。', 1.12, 6.22, 11.1, 0.44, { fontSize: 16, color: C.coral, bold: true, align: 'center' })
  addFooter(slide, 11, '商业判断基于 Jobs-to-be-done；不使用未经验证的市场规模数字')
  addNotes(slide, 11, '目标用户与真实需求', '50 秒', [
    '用三类用户说明需求，但明确首批验证范围是个人开发者和小型研发团队。',
    '需求判断来自产品实际使用场景：代码、调试、文档、研究和自动化，不编造用户量或收入。',
    'BAI 生态协同点是桌面分发、API 使用和真实工作流反馈。'
  ])
}

// 12 Business model
{
  const slide = baseSlide()
  addHeader(slide, 12, '商业化：从个人工作台到团队 Agent 基础设施', '商业与生态潜力', '20', C.coral, 'BUSINESS MODEL')
  const tiers = [
    ['Open Source', '获客入口', ['本地工作台', '基础 runtime 与 skills', '社区贡献与透明安全'], C.slateSoft, C.slate],
    ['Pro', '个人增值', ['多设备同步与备份', '高级自动化 / 更强模型', '云端任务与长期历史'], C.blueSoft, C.blue],
    ['Team', '团队协作', ['共享 skills 与策略', '审计、配额与权限', '组织 Provider / SSO'], C.tealSoft, C.teal],
    ['Ecosystem', '平台收入', ['精选能力市场', 'Provider 联合分发', '企业集成与服务'], C.coralSoft, C.coral]
  ]
  tiers.forEach(([name, stage, items, fill, accent], index) => {
    const x = 0.68 + index * 3.1
    const h = 3.62 + index * 0.26
    const y = 5.9 - h
    addRect(slide, x, y, 2.82, h, fill, fill, true)
    addPill(slide, stage, x + 0.2, y + 0.2, 0.96, accent, C.white, 9.5)
    addText(slide, name, x + 0.2, y + 0.72, 2.42, 0.48, { fontFace: 'Aptos Display', fontSize: 21, color: accent, bold: true })
    addBulletList(slide, items, x + 0.26, y + 1.42, 2.28, 0.61, C.softInk, 11.5)
  })
  addRect(slide, 0.72, 6.2, 11.88, 0.5, C.coralSoft, C.coralSoft, true)
  addText(slide, '当前状态：开源核心已落地；Pro / Team / Ecosystem 为待试点验证的商业假设。', 0.98, 6.28, 11.35, 0.3, { fontSize: 13, color: C.coral, bold: true, align: 'center' })
  addFooter(slide, 12, '商业化顺序：先证明高频留存与任务完成率，再扩展团队和市场能力')
  addNotes(slide, 12, '商业模式', '45 秒', [
    '明确区分已实现与商业假设，避免把路线图说成收入事实。',
    '开源核心降低采用门槛；个人 Pro 解决同步和高级自动化；Team 解决策略与审计。',
    '生态收入必须建立在能力质量、签名、审核和真实交易需求之上。'
  ])
}

// 13 Flywheel
{
  const slide = baseSlide(C.paper)
  addHeader(slide, 13, '生态飞轮：每次任务都能沉淀为下一次的能力', '商业与生态潜力', '20', C.coral, 'ECOSYSTEM FLYWHEEL')
  const nodes = [
    ['使用', '真实项目产生需求', 1.0, 2.65, C.blue],
    ['沉淀', '命令 / skill / 规则 / 记忆', 3.78, 1.78, C.teal],
    ['治理', '审阅 / 禁用 / 权限 / 签名', 7.0, 1.78, C.amber],
    ['复用', '个人与团队工作流', 9.78, 2.65, C.green],
    ['反馈', '模型、runtime 与产品改进', 7.0, 4.25, C.coral],
    ['增长', '更多用户与生态贡献', 3.78, 4.25, C.slate]
  ]
  nodes.forEach(([title, body, x, y, accent], index) => {
    addRect(slide, x, y, 2.55, 1.1, C.white, accent, true)
    addText(slide, title, x + 0.18, y + 0.16, 0.78, 0.34, { fontSize: 16, color: accent, bold: true })
    addText(slide, body, x + 0.18, y + 0.56, 2.18, 0.28, { fontSize: 10.5, color: C.muted })
    const next = nodes[(index + 1) % nodes.length]
    const x1 = x + (next[2] > x ? 2.55 : next[2] < x ? 0 : 1.28)
    const y1 = y + 0.55
    const x2 = next[2] + (next[2] > x ? 0 : next[2] < x ? 2.55 : 1.28)
    const y2 = next[3] + 0.55
    addLine(slide, x1, y1, x2 - x1, y2 - y1, C.line, 1.3, 'triangle')
  })
  addRect(slide, 5.19, 3.02, 2.95, 1.12, C.slate, C.slate, true)
  addText(slide, 'BAI Work\n生态工作面', 5.45, 3.16, 2.43, 0.78, { fontSize: 21, color: C.white, bold: true, align: 'center', breakLine: true })
  addRect(slide, 0.86, 6.08, 11.62, 0.62, C.tealSoft, C.tealSoft, true)
  addText(slide, '与 BAI 的协同：桌面分发扩大 runtime 使用 → API 与模型进入真实任务 → 用户反馈反哺协议和产品。', 1.08, 6.18, 11.18, 0.36, { fontSize: 14, color: C.teal, bold: true, align: 'center' })
  addFooter(slide, 13, '可选 Web3 方向仅限可验证插件签名与发布溯源，不作为当前功能陈述')
  addNotes(slide, 13, '生态飞轮', '40 秒', [
    '从真实项目开始，而不是从空市场开始：使用产生需求，需求沉淀为能力，治理后才能复用。',
    'BAI Work 的价值是提供统一工作面和安全边界，让开源资产可进入日常生产。',
    '如未来使用 Web3，优先解决插件来源与版本溯源，不发无实际效用的资产。'
  ])
}

// 14 Roadmap
{
  const slide = baseSlide()
  addHeader(slide, 14, '12 周路线图：从可发布到可规模化', '商业与生态潜力', '20', C.coral, 'ROADMAP & METRICS')
  const phases = [
    ['NOW', 'v0.1.1', '三平台产物\nMac Intel 可运行\n技能生态与安全边界', 0.72, C.slate, C.slateSoft],
    ['W1—4', '发布级', '对齐 official service contract\nDeveloper ID / notarization\nWindows code signing', 3.76, C.blue, C.blueSoft],
    ['W5—8', '试点级', '3—5 个真实团队\n首轮 onboarding 与遥测\n插件审阅流程', 6.8, C.teal, C.tealSoft],
    ['W9—12', '团队级', '共享 skills / policy\n审计与权限\n生态闭环小规模验证', 9.84, C.coral, C.coralSoft]
  ]
  phases.forEach(([time, title, body, x, accent, fill], index) => {
    addRect(slide, x, 1.88, 2.72, 3.28, fill, fill, true)
    addPill(slide, time, x + 0.22, 2.12, 0.92, accent, C.white, 10)
    addText(slide, title, x + 0.22, 2.72, 2.26, 0.46, { fontSize: 21, color: accent, bold: true })
    addText(slide, body, x + 0.22, 3.4, 2.26, 1.28, { fontSize: 13, color: C.softInk, breakLine: true, valign: 'top' })
    if (index < phases.length - 1) addLine(slide, x + 2.75, 3.48, 0.24, 0, C.muted, 1.2, 'triangle')
  })
  addText(slide, '验证指标', 0.8, 5.63, 1.0, 0.3, { fontSize: 13, color: C.coral, bold: true })
  const kpis = ['首次任务完成率', '首个产物耗时', '错误恢复率', '周活跃项目', '团队 skill 复用率']
  kpis.forEach((kpi, index) => addPill(slide, kpi, 1.75 + index * 2.12, 5.58, 1.88, index % 2 ? C.tealSoft : C.coralSoft, index % 2 ? C.teal : C.coral, 10))
  addText(slide, '原则：每个阶段都以行为指标验收，不以“新增多少功能”验收。', 1.32, 6.43, 10.7, 0.38, { fontSize: 16, color: C.ink, bold: true, align: 'center' })
  addFooter(slide, 14, '下一关键里程碑：官方桌面 service contract 对齐 + 可信签名发布')
  addNotes(slide, 14, '12 周路线图', '45 秒', [
    '先说明当前起点，再分发布级、试点级、团队级三个阶段。',
    '第一优先级不是继续堆功能，而是 official service contract、签名、公证和真实团队回归。',
    '用任务完成率、首个产物耗时和错误恢复率衡量产品价值。'
  ])
}

// 15 Demo playbook
{
  const slide = baseSlide(C.paper)
  addHeader(slide, 15, '答辩现场：3 分钟证明产品价值', '展示表达能力', '15', C.green, 'LIVE DEMO PLAYBOOK')
  const demo = [
    ['00:00—00:30', '打开项目', '展示最新 B.AI Work 首页、workspace 与模型配置', C.blue],
    ['00:30—01:30', '发送任务', '一句指令触发计划、工具步骤和实时状态', C.teal],
    ['01:30—02:30', '审阅交付', '打开生成文件 / diff / 文档，说明验证结果', C.coral],
    ['02:30—03:00', '证明边界', '展示 EBAI hooks 默认关闭与三平台 release', C.green]
  ]
  demo.forEach(([time, title, body, accent], index) => {
    const y = 1.85 + index * 1.05
    addText(slide, time, 0.78, y + 0.16, 1.52, 0.34, { fontFace: 'Aptos', fontSize: 15, color: accent, bold: true })
    addLine(slide, 2.45, y + 0.34, 0.52, 0, accent, 3)
    addText(slide, title, 3.18, y + 0.08, 1.55, 0.4, { fontSize: 19, color: C.ink, bold: true })
    addText(slide, body, 4.85, y + 0.08, 6.95, 0.5, { fontSize: 14, color: C.softInk })
  })
  addRect(slide, 0.78, 6.15, 5.72, 0.66, C.greenSoft, C.greenSoft, true)
  addText(slide, '成功标准：任务推进可见 + 产物可打开 + 验证可复述', 1.02, 6.27, 5.26, 0.36, { fontSize: 14, color: C.green, bold: true, align: 'center' })
  addRect(slide, 6.75, 6.15, 5.72, 0.66, C.amberSoft, C.amberSoft, true)
  addText(slide, '网络兜底：packaged health + 预生成产物 + 最新截图', 6.98, 6.27, 5.26, 0.36, { fontSize: 14, color: C.amber, bold: true, align: 'center' })
  addFooter(slide, 15, '演示时只跑一条主流程；不在台上临时安装依赖或修改 Provider')
  addNotes(slide, 15, '现场演示脚本', '40 秒', [
    '演示前准备一个小型、确定性高的项目任务，避免现场跑超长任务。',
    '每一步都说“用户看到了什么”，不要讲后台代码细节。',
    '发生网络问题时立即切换兜底证据，不把答辩时间消耗在调试。'
  ])
}

// 16 Close
{
  const slide = baseSlide(C.black)
  addImageContain(slide, wordmark, 920 / 240, 0.72, 0.58, 3.8, 0.98)
  addText(slide, '可执行的 AI', 0.76, 1.95, 3.65, 0.62, { fontSize: 30, color: C.white, bold: true })
  addText(slide, '+ 可验证的工程', 0.76, 2.7, 4.45, 0.62, { fontSize: 30, color: '8FD4CF', bold: true })
  addText(slide, '+ 可扩展的生态', 0.76, 3.45, 4.45, 0.62, { fontSize: 30, color: 'F2BE73', bold: true })
  addText(slide, '这就是 BAI Work。', 0.76, 4.58, 4.6, 0.5, { fontSize: 22, color: 'CDD4DB', bold: true })
  const recap = [
    ['技术创新性 · 20', 'Runtime Host + 稳定 /v1/* + 可观测状态机', C.teal],
    ['产品完成度 · 25', '三平台产物、可运行应用、1,144 项测试', C.blue],
    ['商业生态 · 20', '个人 → 团队 → 能力市场的递进路径', C.coral],
    ['AI 应用 · 20', '上下文、工具、产物、验证、记忆完整闭环', C.amber],
    ['展示表达 · 15', '3 分钟主流程演示 + 网络兜底证据', C.green]
  ]
  recap.forEach(([title, evidence, accent], index) => {
    const y = 0.78 + index * 1.02
    addRect(slide, 6.0, y, 6.55, 0.78, C.slate, C.slate, true)
    addRect(slide, 6.0, y, 0.08, 0.78, accent)
    addText(slide, title, 6.28, y + 0.13, 1.7, 0.3, { fontFace: 'Aptos', fontSize: 11.5, color: accent, bold: true })
    addText(slide, evidence, 8.08, y + 0.11, 4.15, 0.4, { fontSize: 13, color: C.white, bold: true })
  })
  addRect(slide, 6.0, 6.02, 6.55, 0.78, C.paper, C.paper, true)
  addText(slide, '下一步：3—5 个试点团队 · official service contract · 可信签名发布', 6.25, 6.17, 6.05, 0.42, { fontSize: 13.5, color: C.ink, bold: true, align: 'center' })
  addText(slide, 'github.com/2830500285/BAI-Work', 0.76, 6.72, 4.55, 0.3, { fontFace: 'Aptos', fontSize: 11.5, color: '8FD4CF' })
  addNotes(slide, 16, '收束与评审要点回收', '35 秒', [
    '用一句话回收：可执行的 AI、可验证的工程、可扩展的生态。',
    '沿五项评分标准各给一个证据，不请求评委记住全部功能。',
    '最后给出具体下一步：试点团队、官方 service contract 对齐和可信签名发布。'
  ])
}

const scriptHeader = `# BAI Work 项目答辩逐页讲稿\n\n- 建议总时长：约 12 分钟（含 3 分钟产品演示）\n- 核心原则：先展示可运行产品，再讲技术差异，最后回收评分证据。\n- 答辩文件：\`BAI-Work-Defense-Deck.pptx\`\n\n`

fs.writeFileSync(scriptOutput, scriptHeader + scriptSections.join('\n'))

pptx.writeFile({ fileName: output })
  .then(() => {
    console.log(`[defense-deck] wrote ${output}`)
    console.log(`[defense-deck] wrote ${scriptOutput}`)
    console.log(`[defense-deck] slides: ${pptx._slides.length}`)
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
