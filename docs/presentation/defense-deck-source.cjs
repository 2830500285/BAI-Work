const fs = require('node:fs')
const path = require('node:path')
const PptxGenJS = require('pptxgenjs')

const root = path.resolve(__dirname, '../..')
const output = path.join(__dirname, 'BAI-Work-Defense-Deck.pptx')
const scriptOutput = path.join(__dirname, 'BAI-Work-Defense-Script.md')
const wordmark = path.join(root, 'src/asset/img/bai-work-wordmark.png')
const homeScreenshot = path.join(root, 'docs/screenshots/bai-work-home-current.png')

const pptx = new PptxGenJS()
pptx.defineLayout({ name: 'BAI_WIDE', width: 13.333, height: 7.5 })
pptx.layout = 'BAI_WIDE'
pptx.author = 'BAI Work'
pptx.company = 'BAI Work'
pptx.subject = 'BAI Work project defense deck'
pptx.title = 'BAI Work 项目答辩'
pptx.lang = 'zh-CN'
pptx.theme = {
  headFontFace: 'PingFang SC',
  bodyFontFace: 'PingFang SC',
  lang: 'zh-CN'
}

const S = pptx.ShapeType
const H = 7.5
const TOTAL_SLIDES = 19
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

const scriptSections = []

function addText(slide, value, x, y, w, h, options) {
  const opts = options || {}
  slide.addText(value, {
    x: x,
    y: y,
    w: w,
    h: h,
    fontFace: opts.fontFace || 'PingFang SC',
    fontSize: opts.fontSize || 18,
    color: opts.color || C.ink,
    bold: opts.bold || false,
    margin: opts.margin === undefined ? 0 : opts.margin,
    fit: 'shrink',
    valign: opts.valign || 'mid',
    align: opts.align || 'left',
    breakLine: false,
    isTextBox: true,
    ...opts
  })
}

function addRect(slide, x, y, w, h, fill, line, rounded) {
  slide.addShape(rounded ? S.roundRect : S.rect, {
    x: x,
    y: y,
    w: w,
    h: h,
    rectRadius: rounded ? 0.08 : undefined,
    fill: { color: fill },
    line: { color: line || fill, width: line && line !== fill ? 1 : 0 }
  })
}

function addLine(slide, x, y, w, h, color, width, arrow) {
  slide.addShape(S.line, {
    x: x,
    y: y,
    w: w,
    h: h,
    line: {
      color: color || C.line,
      width: width || 1,
      endArrowType: arrow
    }
  })
}

function addPill(slide, value, x, y, w, fill, color, fontSize) {
  addRect(slide, x, y, w, 0.34, fill, fill, true)
  addText(slide, value, x + 0.08, y + 0.01, w - 0.16, 0.3, {
    fontSize: fontSize || 10.5,
    color: color || C.ink,
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

function addSanitizedScreenshot(slide, x, y, w, h) {
  addRect(slide, x, y, w, h, C.white, C.line, true)
  const ratio = 1280 / 840
  const innerX = x + 0.08
  const innerY = y + 0.08
  const innerW = w - 0.16
  const innerH = h - 0.16
  const boxRatio = innerW / innerH
  const imageW = ratio > boxRatio ? innerW : innerH * ratio
  const imageH = ratio > boxRatio ? innerW / ratio : innerH
  const imageX = innerX + (innerW - imageW) / 2
  const imageY = innerY + (innerH - imageH) / 2
  const overlayH = Math.min(1.15, imageH * 0.28)

  slide.addImage({ path: homeScreenshot, x: imageX, y: imageY, w: imageW, h: imageH })
  addRect(slide, imageX, imageY + imageH - overlayH, imageW, overlayH, C.paper, C.paper)
  addText(slide, 'BAI Work · 项目级桌面工作台', imageX + 0.2, imageY + imageH - overlayH / 2 - 0.14, imageW - 0.4, 0.28, {
    fontSize: 11,
    color: C.slate,
    bold: true,
    align: 'center'
  })
}

function baseSlide(color) {
  const slide = pptx.addSlide()
  slide.background = { color: color || C.bg }
  return slide
}

function addHeader(slide, number, title, section, accent, eyebrow) {
  addText(slide, eyebrow || 'BAI WORK / ' + String(number).padStart(2, '0'), 0.58, 0.33, 4.4, 0.25, {
    fontFace: 'Aptos',
    fontSize: 10,
    color: accent,
    bold: true,
    charSpacing: 1.2
  })
  addText(slide, title, 0.58, 0.68, 10.8, 0.68, {
    fontSize: 27,
    color: C.ink,
    bold: true
  })
  addPill(slide, section, 10.85, 0.35, 1.9, accent, C.white, 10)
  addLine(slide, 0.58, 1.42, 12.15, 0, C.line, 1)
}

function addFooter(slide, number, source) {
  addText(slide, source || 'BAI Work · Genesis Hackathon', 0.58, 7.16, 9.9, 0.18, {
    fontFace: 'Aptos',
    fontSize: 8.3,
    color: C.muted
  })
  addText(slide, String(number).padStart(2, '0') + ' / ' + TOTAL_SLIDES, 11.75, 7.14, 0.98, 0.2, {
    fontFace: 'Aptos',
    fontSize: 8.3,
    color: C.muted,
    align: 'right'
  })
}

function addNotes(slide, number, title, duration, lines) {
  const noteText = [title + '（建议 ' + duration + '）'].concat(lines).join('\n')
  slide.addNotes(noteText)
  scriptSections.push(
    '## ' + number + '. ' + title + '（' + duration + '）\n\n' +
    lines.map(function (line) { return '- ' + line }).join('\n') +
    '\n'
  )
}

function addBulletList(slide, items, x, y, w, lineHeight, color, fontSize, accent) {
  items.forEach(function (item, index) {
    addRect(slide, x, y + index * lineHeight + 0.15, 0.08, 0.08, accent || C.teal)
    addText(slide, item, x + 0.2, y + index * lineHeight, w - 0.2, lineHeight, {
      fontSize: fontSize || 14,
      color: color || C.softInk,
      valign: 'top'
    })
  })
}

function addMetric(slide, value, label, x, y, w, accent, note) {
  addText(slide, value, x, y, w, 0.55, {
    fontFace: 'Aptos Display',
    fontSize: 29,
    color: accent,
    bold: true,
    align: 'center'
  })
  addText(slide, label, x, y + 0.52, w, 0.3, {
    fontSize: 12,
    color: C.ink,
    bold: true,
    align: 'center'
  })
  if (note) {
    addText(slide, note, x, y + 0.84, w, 0.34, {
      fontSize: 9,
      color: C.muted,
      align: 'center',
      valign: 'top'
    })
  }
}

function addStepCard(slide, index, title, body, x, y, w, fill, accent) {
  addRect(slide, x, y, w, 1.2, fill, fill, true)
  addText(slide, String(index).padStart(2, '0'), x + 0.18, y + 0.18, 0.42, 0.3, {
    fontFace: 'Aptos',
    fontSize: 11,
    color: accent,
    bold: true
  })
  addText(slide, title, x + 0.7, y + 0.15, w - 0.88, 0.34, {
    fontSize: 16,
    color: C.ink,
    bold: true
  })
  addText(slide, body, x + 0.18, y + 0.65, w - 0.36, 0.35, {
    fontSize: 11,
    color: C.softInk,
    valign: 'top'
  })
}

// 01 Cover
{
  const slide = baseSlide(C.black)
  addRect(slide, 7.55, 0, 5.783, H, C.paper)
  addSanitizedScreenshot(slide, 7.76, 0.52, 5.2, 5.55)
  addRect(slide, 7.55, 6.18, 5.783, 1.32, C.slate)
  addText(slide, 'GENESIS HACKATHON', 0.7, 0.6, 3.6, 0.25, {
    fontFace: 'Aptos',
    fontSize: 11,
    color: '7EC5C1',
    bold: true,
    charSpacing: 1.8
  })
  addImageContain(slide, wordmark, 920 / 240, 0.68, 1.18, 5.7, 1.5)
  addText(slide, '项目级轻量 Agent 工作台', 0.72, 2.9, 6.25, 0.62, {
    fontSize: 31,
    color: C.white,
    bold: true
  })
  addText(slide, '更短执行链 · 更小故障域 · 更清晰产物闭环', 0.72, 3.68, 6.15, 0.42, {
    fontSize: 16,
    color: 'C5CDD4'
  })
  const tags = [
    ['30 秒路径', C.teal],
    ['单项目执行', C.blue],
    ['Token Economy', C.amber],
    ['EBAI', C.coral],
    ['三平台交付', C.green]
  ]
  tags.forEach(function (item, index) {
    const row = index > 2 ? 1 : 0
    const col = row === 0 ? index : index - 3
    addPill(slide, item[0], 0.72 + col * 1.65, 4.62 + row * 0.55, 1.42, item[1], C.white, 10)
  })
  addText(slide, '项目答辩 · 2026.07', 0.72, 6.78, 3.1, 0.25, {
    fontSize: 10.5,
    color: '89939D'
  })
  addText(slide, '从 API Key 到可验收产物', 7.98, 6.48, 4.65, 0.35, {
    fontSize: 18,
    color: C.white,
    bold: true,
    align: 'center'
  })
  addText(slide, 'Mac Intel · Mac Apple Silicon · Windows x64', 7.98, 6.88, 4.65, 0.26, {
    fontFace: 'Aptos',
    fontSize: 10,
    color: 'C8D1D8',
    align: 'center'
  })
  addNotes(slide, 1, '封面', '25 秒', [
    '开场一句：BAI Work 不是另一个聊天入口，而是面向真实项目交付的轻量桌面工作台。',
    '核心差异是把执行链收敛到本地项目：配置更短、过程可见、产物可验收。',
    '当前已有可运行应用、三平台构建路径和完整自动化验证。'
  ])
}

// 02 Product thesis
{
  const slide = baseSlide()
  addHeader(slide, 2, '为什么需要 BAI Work：项目任务要求“连续交付”', '产品定义', C.teal, 'WHY BAI WORK')
  addText(slide, '真实知识工作不是一次问答，而是上下文进入、工具执行、过程反馈、产物审阅与后续复用的连续系统。', 0.9, 1.68, 11.55, 0.58, {
    fontSize: 19,
    color: C.softInk,
    bold: true,
    align: 'center'
  })
  const problems = [
    ['上下文割裂', '项目、文件、版本状态与会话历史分散，重复传递成本高。', C.coralSoft, C.coral],
    ['过程不可观测', '长任务只有等待或原始日志，难以判断当前状态和失败位置。', C.amberSoft, C.amber],
    ['交付不可验收', '回答与工具过程混在一起，产物、差异和验证证据缺少结构。', C.blueSoft, C.blue]
  ]
  problems.forEach(function (item, index) {
    const x = 0.72 + index * 4.12
    addRect(slide, x, 2.62, 3.78, 2.38, item[2], item[2], true)
    addText(slide, '0' + (index + 1), x + 0.24, 2.88, 0.55, 0.35, {
      fontFace: 'Aptos Display',
      fontSize: 18,
      color: item[3],
      bold: true
    })
    addText(slide, item[0], x + 0.24, 3.38, 3.2, 0.4, {
      fontSize: 20,
      color: C.ink,
      bold: true
    })
    addText(slide, item[1], x + 0.24, 4.0, 3.25, 0.72, {
      fontSize: 13.5,
      color: C.softInk,
      valign: 'top'
    })
  })
  addRect(slide, 1.15, 5.55, 11.02, 0.92, C.slate, C.slate, true)
  addText(slide, 'BAI Work = 项目上下文 + 本地执行 + 可观测状态机 + 可审阅产物 + 受信任能力层', 1.42, 5.72, 10.48, 0.5, {
    fontSize: 19,
    color: C.white,
    bold: true,
    align: 'center'
  })
  addFooter(slide, 2, '产品原则：以任务到产物的闭环效率为主目标')
  addNotes(slide, 2, '产品问题与定义', '35 秒', [
    '不要从功能数量开始，先说明真实项目任务为什么需要连续交付。',
    'BAI Work 的目标函数是缩短任务到产物的闭环，而不是覆盖所有通信场景。',
    '这条目标函数决定了后续的轻量架构、过程可观测和 Token Economy。'
  ])
}

// 03 Thirty-second setup
{
  const slide = baseSlide(C.paper)
  addHeader(slide, 3, '30 秒演示目标：API Key 进入，模型能力自动就绪', '极简上手', C.green, 'THIRTY-SECOND ONBOARDING')
  addPill(slide, '现场路径', 0.72, 1.7, 1.08, C.greenSoft, C.green, 10)
  const steps = [
    ['输入 API Key', 'Main-Process Credential Isolation'],
    ['探测服务', 'Endpoint Canonicalization'],
    ['拉取模型', 'GET /v1/models'],
    ['能力分类', 'Capability-Aware Discovery'],
    ['保存并使用', 'Idempotent Set Merge']
  ]
  steps.forEach(function (item, index) {
    const x = 0.72 + index * 2.48
    addRect(slide, x, 2.24, 2.06, 1.52, index === 4 ? C.greenSoft : C.white, index === 4 ? C.green : C.line, true)
    addText(slide, String(index + 1).padStart(2, '0'), x + 0.16, 2.43, 0.45, 0.28, {
      fontFace: 'Aptos',
      fontSize: 10,
      color: index === 4 ? C.green : C.teal,
      bold: true
    })
    addText(slide, item[0], x + 0.16, 2.82, 1.72, 0.34, {
      fontSize: 16,
      color: C.ink,
      bold: true,
      align: 'center'
    })
    addText(slide, item[1], x + 0.16, 3.25, 1.72, 0.28, {
      fontFace: 'Aptos',
      fontSize: 8.5,
      color: C.muted,
      align: 'center'
    })
    if (index < steps.length - 1) addLine(slide, x + 2.08, 2.98, 0.32, 0, C.muted, 1.2, 'triangle')
  })
  addRect(slide, 0.72, 4.35, 7.35, 1.75, C.white, C.line, true)
  addText(slide, '实现机制', 0.98, 4.62, 1.05, 0.32, { fontSize: 14, color: C.green, bold: true })
  addBulletList(slide, [
    '凭据只在主进程中参与请求，避免渲染层暴露与跨域约束。',
    '统一规范化 Base URL，8 秒模型列表超时与 10 秒连通性探测。',
    '去重模型 ID，按文本对话能力过滤，并与已有配置幂等合并。'
  ], 2.1, 4.55, 5.62, 0.47, C.softInk, 12, C.green)
  addRect(slide, 8.35, 4.35, 4.25, 1.75, C.slate, C.slate, true)
  addText(slide, '用户感知', 8.68, 4.62, 3.58, 0.34, { fontSize: 14, color: '8FD4CF', bold: true, align: 'center' })
  addText(slide, '无需编辑配置文件\n无需手工录入模型\n无需理解运行时参数', 8.68, 5.05, 3.58, 0.8, {
    fontSize: 17,
    color: C.white,
    bold: true,
    align: 'center',
    breakLine: true
  })
  addText(slide, '实际完成时间取决于网络与 API 可用性；30 秒是典型配置目标，不是网络 SLA。', 1.05, 6.48, 11.25, 0.34, {
    fontSize: 11,
    color: C.muted,
    align: 'center'
  })
  addFooter(slide, 3, '实现证据：provider connection · model discovery · protocol URL normalization')
  addNotes(slide, 3, '30 秒演示目标', '45 秒', [
    '用户只需提供 API Key，主进程完成服务探测、模型拉取、能力分类和保存。',
    '技术上使用凭据隔离、端点规范化、能力感知发现与幂等集合合并。',
    '30 秒是顺畅网络下的现场演示目标，不作为固定网络 SLA。'
  ])
}

// 04 Demo story
{
  const slide = baseSlide()
  addHeader(slide, 4, '现场演示：从一句任务到可验收产物', '用户流程', C.blue, 'DEMO STORY')
  addSanitizedScreenshot(slide, 0.66, 1.68, 7.15, 4.88)
  addPill(slide, '演示任务', 8.18, 1.78, 1.05, C.blueSoft, C.blue, 10)
  addText(slide, '“检查当前项目，持续展示推进过程，并交付可验证结果。”', 8.18, 2.2, 4.35, 0.75, {
    fontSize: 18,
    color: C.ink,
    bold: true,
    valign: 'top'
  })
  const flow = [
    ['选择项目', '项目、文件与版本状态进入上下文'],
    ['启动执行', '规划、工具动作与等待状态持续可见'],
    ['审阅结果', '回答、产物、差异与验证证据分离'],
    ['沉淀能力', '规则、技能与记忆进入后续任务']
  ]
  flow.forEach(function (item, index) {
    const y = 3.18 + index * 0.79
    addRect(slide, 8.18, y, 0.42, 0.42, index === 3 ? C.green : C.blue, index === 3 ? C.green : C.blue, true)
    addText(slide, String(index + 1), 8.18, y, 0.42, 0.42, {
      fontFace: 'Aptos',
      fontSize: 12,
      color: C.white,
      bold: true,
      align: 'center'
    })
    addText(slide, item[0], 8.78, y - 0.03, 1.35, 0.3, { fontSize: 14, color: C.ink, bold: true })
    addText(slide, item[1], 8.78, y + 0.28, 3.55, 0.32, { fontSize: 10.5, color: C.muted })
  })
  addFooter(slide, 4, '现场演示使用当前 Mac Intel x86_64 构建')
  addNotes(slide, 4, '现场演示路径', '35 秒 + 3 分钟演示', [
    '演示只跑一条主流程：选项目、发任务、展开步骤、打开产物。',
    '每一步都说用户获得了什么信息，不在现场展开内部实现。',
    '网络异常时切换到打包运行时健康检查、预生成产物与最新界面证据。'
  ])
}

// 05 Product completeness
{
  const slide = baseSlide(C.paper)
  addHeader(slide, 5, '产品完成度：一个工作面覆盖完整任务生命周期', '产品能力', C.blue, 'PRODUCT COMPLETENESS')
  const capabilities = [
    ['项目与会话', 'Workspace、历史与版本上下文'],
    ['模型与服务', 'BAI 默认与标准兼容协议'],
    ['实时进度', '步骤、工具摘要与错误恢复'],
    ['文件与产物', '引用、预览、差异与文档'],
    ['长期记忆', '用户、工作区与项目作用域'],
    ['产品能力', 'EBAI 命令、技能、规则与自动化']
  ]
  capabilities.forEach(function (item, index) {
    const col = index % 3
    const row = Math.floor(index / 3)
    addStepCard(
      slide,
      index + 1,
      item[0],
      item[1],
      0.72 + col * 4.13,
      1.82 + row * 1.5,
      3.78,
      row === 0 ? C.blueSoft : C.tealSoft,
      row === 0 ? C.blue : C.teal
    )
  })
  addRect(slide, 0.72, 5.05, 11.88, 1.42, C.white, C.line, true)
  addMetric(slide, '3', '桌面目标', 0.98, 5.28, 1.8, C.blue, 'mac-x64 / mac-arm64 / win-x64')
  addMetric(slide, '168', '测试文件', 3.3, 5.28, 1.8, C.teal, 'main / runtime / renderer')
  addMetric(slide, '/v1/*', '本地服务边界', 5.62, 5.28, 1.8, C.amber, '稳定桌面接口')
  addMetric(slide, '5', 'EBAI 能力形态', 7.94, 5.28, 1.8, C.coral, 'Command · Agent · Skill · Rule · Hook')
  addMetric(slide, '1', '连续工作流', 10.26, 5.28, 1.8, C.green, '任务到产物再到复用')
  addFooter(slide, 5, '当前实现证据：README · runtime adapter · EBAI capability tests')
  addNotes(slide, 5, '产品完成度', '40 秒', [
    '完成度从用户生命周期衡量：配置、执行、观察、审阅、沉淀都在一个工作面完成。',
    '三平台目标和稳定本地服务边界证明它不是一次性原型。',
    'EBAI 的 Commands、Agents、Skills、Rules 和 Hooks 是 BAI Work 面向用户的产品能力；来源与安装不定义它的产品身份。'
  ])
}

// 06 Architecture
{
  const slide = baseSlide()
  addHeader(slide, 6, '技术实现：单一 Runtime Host 收敛桌面复杂度', '系统架构', C.teal, 'LIGHTWEIGHT RUNTIME ARCHITECTURE')
  const boxes = [
    ['Renderer', '工作台 UI\n会话 / 设置 / 审阅', C.blueSoft, C.blue],
    ['Preload', '最小 IPC\n受控桌面能力', C.slateSoft, C.slate],
    ['Main Host', '凭据 / 文件 / 生命周期\n单一运行时入口', C.tealSoft, C.teal],
    ['Loopback API', '稳定 /v1/*\nSSE 事件边界', C.amberSoft, C.amber],
    ['BAI Code', '模型调用\n工具执行 / 上下文压缩', C.coralSoft, C.coral]
  ]
  boxes.forEach(function (item, index) {
    const x = 0.72 + index * 2.47
    addRect(slide, x, 2.12, 2.02, 1.72, item[2], item[2], true)
    addText(slide, item[0], x + 0.12, 2.38, 1.78, 0.34, {
      fontFace: 'Aptos',
      fontSize: 16,
      color: item[3],
      bold: true,
      align: 'center'
    })
    addText(slide, item[1], x + 0.14, 2.92, 1.74, 0.62, {
      fontSize: 11,
      color: C.softInk,
      align: 'center',
      breakLine: true
    })
    if (index < boxes.length - 1) addLine(slide, x + 2.05, 2.99, 0.35, 0, C.muted, 1.3, 'triangle')
  })
  addRect(slide, 0.72, 4.46, 7.55, 1.42, C.white, C.line, true)
  addText(slide, '协议隔离', 0.98, 4.72, 1.02, 0.3, { fontSize: 14, color: C.teal, bold: true })
  addText(slide, '上游 CLI 与服务契约的变化只进入 Runtime Host；Renderer 始终面对稳定的本地事件模型。', 2.02, 4.65, 5.83, 0.46, {
    fontSize: 16,
    color: C.ink,
    bold: true
  })
  addText(slide, '结果：运行时可替换、桌面流程连续、错误可清洗、测试边界清晰。', 0.98, 5.28, 6.85, 0.34, {
    fontSize: 12,
    color: C.muted
  })
  addRect(slide, 8.55, 4.46, 4.05, 1.42, C.slate, C.slate, true)
  addText(slide, '轻量拓扑', 8.88, 4.72, 3.38, 0.3, { fontSize: 14, color: '8FD4CF', bold: true, align: 'center' })
  addText(slide, '单进程主机 · 本机回环\n项目级状态 · 最短交付路径', 8.88, 5.08, 3.38, 0.58, {
    fontSize: 17,
    color: C.white,
    bold: true,
    align: 'center',
    breakLine: true
  })
  addFooter(slide, 6, '实现证据：runtime host · preload IPC · streaming adapter')
  addNotes(slide, 6, '轻量 Runtime Host 架构', '50 秒', [
    '核心创新不是桌面框架本身，而是单一 Runtime Host 对协议、凭据、文件和生命周期的收敛。',
    'Renderer 只消费稳定事件模型，因此上游变化不会扩散到整个界面。',
    '项目级状态和本机回环服务共同缩短了任务到产物的执行路径。'
  ])
}

// 07 Project-level Runtime Host data plane
{
  const slide = baseSlide(C.paper)
  addHeader(slide, 7, '架构选择：把复杂度收敛到项目级 Runtime Host', '架构优势', C.coral, 'RUNTIME DESIGN')
  addText(slide, '系统复杂度集中处理，交付证据持续回到当前项目。', 1.1, 1.66, 11.1, 0.42, {
    fontSize: 18,
    color: C.softInk,
    bold: true,
    align: 'center'
  })
  addRect(slide, 0.72, 2.22, 5.72, 3.82, C.slateSoft, C.slateSoft, true)
  addText(slide, '控制边界', 1.0, 2.5, 2.0, 0.42, { fontFace: 'Aptos Display', fontSize: 22, color: C.slate, bold: true })
  addPill(slide, 'Runtime Host', 4.38, 2.53, 1.62, C.slate, C.white, 10)
  addBulletList(slide, [
    '凭据、协议、文件访问和生命周期集中在主进程',
    '上游变化只进入适配层，不扩散到工作台界面',
    '本机回环服务与稳定 /v1/* 构成清晰边界',
    '错误清洗、重试和事件归一化共享同一入口'
  ], 1.0, 3.12, 4.95, 0.6, C.softInk, 13, C.slate)
  addRect(slide, 6.88, 2.22, 5.72, 3.82, C.tealSoft, C.tealSoft, true)
  addText(slide, '交付数据面', 7.18, 2.5, 2.1, 0.42, { fontFace: 'Aptos Display', fontSize: 22, color: C.teal, bold: true })
  addPill(slide, 'Workspace', 10.5, 2.53, 1.62, C.teal, C.white, 10)
  addBulletList(slide, [
    '上下文、任务状态、权限与记忆围绕项目收敛',
    '工具动作、等待、错误与完成进入统一时间线',
    '回答、文件、差异、截图与报告分区呈现',
    '文件、测试、构建和运行证据共同完成验收'
  ], 7.18, 3.12, 4.95, 0.6, C.softInk, 13, C.teal)
  addRect(slide, 1.25, 6.32, 10.83, 0.52, C.coralSoft, C.coralSoft, true)
  addText(slide, 'Workspace Context → Runtime Host → Event Stream → Deliverables → Verification', 1.48, 6.4, 10.37, 0.32, {
    fontSize: 13,
    color: C.coral,
    bold: true,
    align: 'center'
  })
  addFooter(slide, 7, '实现依据：runtime host · streaming adapter · project-scoped state')
  addNotes(slide, 7, '项目级 Runtime Host 数据链', '55 秒', [
    '这一页只解释 BAI Work 自身的架构选择：把桌面复杂度集中在 Runtime Host。',
    '工作台只消费稳定事件，项目上下文、状态、权限和产物则始终围绕 workspace 收敛。',
    '从输入到验收的每一段都有明确边界，因此长任务可以被观察、恢复和验证。'
  ])
}

// 08 Observability
{
  const slide = baseSlide()
  addHeader(slide, 8, '可观测执行：把长任务转换为确定性状态机', '过程体验', C.teal, 'RUNTIME OBSERVABILITY')
  const flow = [
    ['输入', '目标与约束'],
    ['事件', '流式运行时输出'],
    ['归一化', '去重 / 分类 / 清洗'],
    ['时间线', '步骤 / 工具 / 等待'],
    ['交付', '摘要 / 产物 / 验证'],
    ['用量', '可得则展示']
  ]
  flow.forEach(function (item, index) {
    const x = 0.67 + index * 2.08
    addRect(slide, x, 1.94, 1.73, 1.18, index === 2 || index === 3 ? C.tealSoft : C.white, C.line, true)
    addText(slide, item[0], x + 0.12, 2.16, 1.49, 0.32, {
      fontSize: 15,
      color: index === 2 || index === 3 ? C.teal : C.ink,
      bold: true,
      align: 'center'
    })
    addText(slide, item[1], x + 0.12, 2.6, 1.49, 0.26, { fontSize: 9.5, color: C.muted, align: 'center' })
    if (index < flow.length - 1) addLine(slide, x + 1.76, 2.52, 0.27, 0, C.muted, 1.2, 'triangle')
  })
  addText(slide, '原始输出问题', 0.75, 3.62, 1.45, 0.3, { fontSize: 13, color: C.red, bold: true })
  addRect(slide, 0.72, 3.98, 5.7, 1.58, C.redSoft, C.redSoft, true)
  addText(slide, '工具语法与状态句混排\n连接错误堆栈污染聊天\n长时间无反馈，最终整段堆积', 1.02, 4.28, 5.1, 0.98, {
    fontSize: 15,
    color: C.red,
    breakLine: true,
    valign: 'top'
  })
  addText(slide, 'BAI Work 呈现', 6.92, 3.62, 1.55, 0.3, { fontSize: 13, color: C.green, bold: true })
  addRect(slide, 6.9, 3.98, 5.7, 1.58, C.greenSoft, C.greenSoft, true)
  addText(slide, '正在检查工作区 → 已运行 6 条命令\n连接中断：可重试并保留有效上下文\n完成后只留下结论、产物与验证', 7.2, 4.28, 5.1, 0.98, {
    fontSize: 14.5,
    color: C.green,
    bold: true,
    breakLine: true,
    valign: 'top'
  })
  addRect(slide, 2.22, 6.05, 8.88, 0.55, C.slate, C.slate, true)
  addText(slide, '只展示可验证状态，不暴露模型内部推理；Telemetry 缺失时显示不可用，不伪造零值。', 2.46, 6.14, 8.4, 0.32, {
    fontSize: 13.5,
    color: C.white,
    bold: true,
    align: 'center'
  })
  addFooter(slide, 8, '实现证据：stream normalization · progress timeline · failure sanitization tests')
  addNotes(slide, 8, '可观测状态机', '45 秒', [
    '事件流先去重、分类和清洗，再进入时间线和最终交付区。',
    '过程区展示工具动作和可验证状态，不展示模型内部思维链。',
    '错误与用量采用保守策略：不让堆栈污染界面，也不把缺失遥测当成零。'
  ])
}

// 09 Token Economy control surface
{
  const slide = baseSlide(C.paper)
  addHeader(slide, 9, 'Token Economy：先建立可配置预算，再谈节省', '上下文控制面', C.amber, 'CONTEXT BUDGET CONTROL')
  addRect(slide, 0.72, 1.82, 4.35, 2.28, C.slate, C.slate, true)
  addText(slide, '请求预算 ≠ 删除聊天记录', 1.02, 2.12, 3.75, 0.38, { fontSize: 16, color: 'F2BE73', bold: true, align: 'center' })
  addText(slide, '本次请求受限', 1.02, 2.74, 3.75, 0.58, {
    fontFace: 'Aptos Display',
    fontSize: 27,
    color: C.white,
    bold: true,
    align: 'center'
  })
  addText(slide, '原始历史保留', 1.02, 3.42, 3.75, 0.38, {
    fontFace: 'Aptos',
    fontSize: 18,
    color: 'C8D1D8',
    bold: true,
    align: 'center'
  })
  addRect(slide, 5.42, 1.82, 7.18, 2.28, C.white, C.line, true)
  addText(slide, 'History Hygiene 默认预算', 5.72, 2.12, 6.58, 0.38, {
    fontFace: 'Aptos',
    fontSize: 16,
    color: C.amber,
    bold: true
  })
  const gates = [
    ['320 行', '单次工具结果', C.teal],
    ['32 KiB', '结果字节预算', C.amber],
    ['8K tokens', '结果 Token 预算', C.coral]
  ]
  gates.forEach(function (item, index) {
    const x = 5.72 + index * 2.08
    addPill(slide, item[0], x, 2.78, 1.68, item[2], C.white, 10)
    addText(slide, item[1], x, 3.28, 1.68, 0.34, { fontSize: 12, color: C.ink, bold: true, align: 'center' })
  })
  addRect(slide, 0.72, 4.55, 11.88, 1.48, C.amberSoft, C.amberSoft, true)
  addText(slide, '控制契约', 0.98, 4.84, 1.15, 0.32, { fontSize: 14, color: C.amber, bold: true })
  addBulletList(slide, [
    '工具参数字符串默认 8 KiB / 2K tokens，数组默认最多 80 项。',
    '共享类型、IPC schema 与 normalizer 共同限制非法或失控配置。',
    '设置层保留压缩工具描述、工具结果和简洁回答的独立开关。'
  ], 2.15, 4.76, 9.85, 0.42, C.softInk, 12, C.amber)
  addText(slide, '遥测不可用时明确显示 unavailable，不把缺失数据包装成“节省 0%”。', 1.42, 6.4, 10.5, 0.38, {
    fontSize: 16,
    color: C.ink,
    bold: true,
    align: 'center'
  })
  addFooter(slide, 9, '实现证据：app settings · IPC schema · normalizer · usage telemetry guards')
  addNotes(slide, 9, 'Token Economy 控制面', '50 秒', [
    '这里展示的是当前代码中可复现的请求预算配置，不使用仓库里不存在的估算公式。',
    '历史保护限制发送请求时的超长工具结果和参数，原始聊天记录保持不变。',
    '当前适配层没有可用的节省遥测，因此界面明确显示不可用，不宣称节省百分比。'
  ])
}

// 10 Context governance contract
{
  const slide = baseSlide()
  addHeader(slide, 10, '双层上下文治理：历史卫生 + 压缩配置契约', '控制参数', C.amber, 'CONTEXT GOVERNANCE')
  const layers = [
    {
      label: 'L1',
      title: 'History Hygiene / 工具结果预算',
      condition: '默认：320 行 · 32 KiB · 8K tokens',
      action: '定义工具结果上限；原始聊天记录保持不变。',
      result: '控制输入放大',
      fill: C.tealSoft,
      accent: C.teal
    },
    {
      label: 'L2',
      title: 'Tool Argument Guard / 工具参数预算',
      condition: '默认：8 KiB · 2K tokens · 80 项',
      action: '约束长字符串与数组展开；输入边界由 schema 和 normalizer 校验。',
      result: '降低结构冗余',
      fill: C.amberSoft,
      accent: C.amber
    },
    {
      label: 'L3',
      title: 'Context Compaction / 摘要配置契约',
      condition: '默认：软阈值 16K · 硬阈值 24K',
      action: '启发式摘要；15 秒超时；摘要上限 1,200 tokens；输入 96 KiB。',
      result: '为运行时留出空间',
      fill: C.coralSoft,
      accent: C.coral
    }
  ]
  layers.forEach(function (layer, index) {
    const y = 1.78 + index * 1.52
    addRect(slide, 0.72, y, 11.88, 1.2, layer.fill, layer.fill, true)
    addPill(slide, layer.label, 0.98, y + 0.2, 0.62, layer.accent, C.white, 11)
    addText(slide, layer.title, 1.82, y + 0.18, 3.6, 0.32, {
      fontFace: 'Aptos',
      fontSize: 15,
      color: layer.accent,
      bold: true
    })
    addText(slide, layer.condition, 1.82, y + 0.65, 3.6, 0.28, { fontSize: 11, color: C.softInk, bold: true })
    addText(slide, layer.action, 5.68, y + 0.18, 4.1, 0.72, { fontSize: 12, color: C.softInk, valign: 'top' })
    addText(slide, layer.result, 10.0, y + 0.25, 2.25, 0.5, {
      fontSize: 12,
      color: layer.accent,
      bold: true,
      align: 'center'
    })
  })
  addRect(slide, 0.72, 6.42, 11.88, 0.4, C.slateSoft, C.slateSoft, true)
  addText(slide, '证据边界：这是可配置控制面与压缩配置契约；实际节省量只在后端提供遥测时展示。', 0.98, 6.48, 11.35, 0.24, {
    fontSize: 11.5,
    color: C.slate,
    bold: true,
    align: 'center'
  })
  addFooter(slide, 10, '实现证据：history hygiene defaults · compaction settings · validation bounds')
  addNotes(slide, 10, '上下文治理契约', '55 秒', [
    '第一层约束工具结果，第二层约束工具参数，第三层定义摘要阈值与资源预算。',
    '这些默认值和输入上限都能从共享设置、IPC schema 与 normalizer 中复现。',
    '我们把控制面和实际运行效果分开陈述；只有可用遥测才进入节省展示。'
  ])
}

// 11 EBAI product capability system
{
  const slide = baseSlide(C.paper)
  addHeader(slide, 11, 'EBAI：BAI Work 面向用户的能力体系', '产品能力层', C.coral, 'EBAI PRODUCT CAPABILITY SYSTEM')
  const capabilities = [
    ['Commands', '项目命令\n运行时可加载', C.redSoft, C.red],
    ['Agents', '专业角色\n以命令工作流接入', C.blueSoft, C.blue],
    ['Skills', '任务方法\n运行时可加载', C.tealSoft, C.teal],
    ['Rules', '行为约束\n以 Skill 指令接入', C.amberSoft, C.amber],
    ['Hooks', '自动化契约\nManifest 已生成', C.greenSoft, C.green]
  ]
  addRect(slide, 0.72, 1.72, 11.88, 0.7, C.slateSoft, C.slateSoft, true)
  addText(slide, 'EBAI', 0.98, 1.9, 1.2, 0.34, {
    fontFace: 'Aptos',
    fontSize: 13,
    color: C.slate,
    bold: true,
    align: 'center'
  })
  addText(slide, '能力随应用呈现\n统一产品身份', 2.28, 1.8, 9.92, 0.48, {
    fontSize: 10.5,
    color: C.softInk,
    align: 'center',
    breakLine: true
  })
  capabilities.forEach(function (item, index) {
    const x = 0.72 + index * 2.424
    addRect(slide, x, 2.64, 2.184, 1.38, item[2], item[2], true)
    addText(slide, item[0], x + 0.12, 2.87, 1.944, 0.34, {
      fontFace: 'Aptos',
      fontSize: 13,
      color: item[3],
      bold: true,
      align: 'center'
    })
    addText(slide, item[1], x + 0.16, 3.31, 1.864, 0.56, {
      fontSize: 10.5,
      color: C.softInk,
      align: 'center',
      breakLine: true
    })
  })
  addRect(slide, 0.72, 4.26, 5.7, 1.64, C.white, C.line, true)
  addText(slide, '用户可用能力', 0.98, 4.45, 2.0, 0.32, { fontSize: 14, color: C.coral, bold: true })
  addBulletList(slide, [
    '命令、技能与规则进入任务上下文',
    'Agent 以专业命令工作流对用户呈现',
    'Hooks 保留能力定义，执行契约待 Runtime 支持'
  ], 1.02, 4.8, 5.05, 0.36, C.softInk, 11.5, C.coral)
  addRect(slide, 6.72, 4.26, 5.88, 1.64, C.slate, C.slate, true)
  addText(slide, '当前状态', 7.02, 4.45, 2.0, 0.32, { fontSize: 14, color: '8FD4CF', bold: true })
  addText(slide, 'Commands · Skills：安装后可加载\nAgents：命令化接入\nRules：Skill 化接入\nHooks：默认关闭', 7.02, 4.82, 5.15, 0.95, {
    fontFace: 'Aptos',
    fontSize: 13,
    color: C.white,
    breakLine: true,
    valign: 'top'
  })
  addText(slide, '这些能力就是 BAI Work 的产品能力；来源与安装只属于内部交付方式。', 1.22, 6.25, 10.9, 0.42, {
    fontSize: 16,
    color: C.ink,
    bold: true,
    align: 'center'
  })
  addFooter(slide, 11, '实现证据：runtime instruction loader · component install tests · hook manifest guard')
  addNotes(slide, 11, 'EBAI 产品能力体系', '60 秒', [
    'EBAI 的产品定义是 BAI Work 面向用户的能力体系；来源与安装只属于内部交付方式。',
    '当前 Commands 和 Skills 可被运行时加载，Agents 以命令工作流接入，Rules 以 Skill 指令接入。',
    'Hooks 当前仅生成默认关闭的 manifest；来源与安装是内部交付方式，不定义 EBAI 的产品身份。'
  ])
}

// 12 EBAI hooks safety
{
  const slide = baseSlide()
  addHeader(slide, 12, 'EBAI Hooks：能力已纳入产品体系，执行仍服从 Runtime 契约', '能力边界', C.amber, 'HOOK CAPABILITY BOUNDARY')
  addRect(slide, 0.72, 1.78, 5.45, 4.72, C.white, C.line, true)
  addText(slide, 'Hook 能力模型', 1.0, 2.05, 2.2, 0.38, { fontSize: 19, color: C.amber, bold: true })
  const mappings = [
    ['消息', 'message_submit'],
    ['会话开始', 'session_start'],
    ['工具调用前', 'tool_call_before'],
    ['工具调用后', 'tool_call_after'],
    ['轮次结束', 'turn_end'],
    ['会话结束', 'session_end']
  ]
  mappings.forEach(function (item, index) {
    const y = 2.62 + index * 0.5
    addText(slide, item[0], 1.02, y, 1.62, 0.28, { fontFace: 'Aptos', fontSize: 11, color: C.slate, bold: true })
    addLine(slide, 2.72, y + 0.14, 0.52, 0, C.muted, 1, 'triangle')
    addText(slide, item[1], 3.42, y, 2.16, 0.28, { fontFace: 'Aptos', fontSize: 11, color: C.teal, bold: true })
  })
  addRect(slide, 6.52, 1.78, 6.08, 4.72, C.slate, C.slate, true)
  addText(slide, '当前交付状态', 6.86, 2.05, 2.3, 0.38, { fontSize: 19, color: 'F2BE73', bold: true })
  addBulletList(slide, [
    '生成的全局 manifest 始终 enabled = false',
    '当前设置页 Hook 开关保持禁用',
    'BAI Code 0.9.1 尚无 Hook 执行契约',
    '只有显式工作区才允许生成项目配置',
    '不安全路径与符号链接会被拒绝',
    '未支持事件被记录，不伪装为已执行'
  ], 6.9, 2.72, 5.15, 0.55, 'DDE4E9', 13, C.amber)
  addPill(slide, '能力已建模', 7.02, 5.98, 1.35, C.red, C.white, 11)
  addPill(slide, '执行未开放', 8.63, 5.98, 1.48, C.teal, C.white, 11)
  addPill(slide, '边界可验证', 10.37, 5.98, 1.35, C.green, C.white, 11)
  addFooter(slide, 12, '交付原则：产品能力与当前可执行状态分开陈述；未开放能力不冒充为已生效')
  addNotes(slide, 12, 'EBAI Hook 安全', '50 秒', [
    'Hook 已作为 EBAI 产品能力之一被建模，覆盖消息、会话和工具调用生命周期。',
    '当前交付范围是生成默认关闭的 manifest，设置页开关禁用，BAI Code 0.9.1 也没有 Hook 执行契约。',
    '因此答辩只宣称能力定义、配置边界与安全策略已实现，不把 Hook 冒充为已执行。'
  ])
}

// 13 Agent loop
{
  const slide = baseSlide(C.paper)
  addHeader(slide, 13, 'AI 深度：上下文、工具、产物与验证构成闭环', 'Agent 系统', C.blue, 'AGENT EXECUTION LOOP')
  addRect(slide, 0.72, 1.75, 7.38, 4.88, C.white, C.line, true)
  const nodes = [
    ['上下文', 'Workspace · 文件 · 版本 · 记忆', 1.35, 2.18, C.blue],
    ['规划', '目标拆解与约束解析', 4.95, 2.18, C.teal],
    ['工具', '命令 · 文件 · 检索 · 技能', 4.95, 4.38, C.coral],
    ['产物', '代码 · 文档 · 图表 · 差异', 1.35, 4.38, C.green]
  ]
  nodes.forEach(function (item) {
    addRect(slide, item[2], item[3], 2.55, 1.02, C.bg, item[4], true)
    addText(slide, item[0], item[2] + 0.18, item[3] + 0.16, 0.72, 0.32, {
      fontSize: 16,
      color: item[4],
      bold: true
    })
    addText(slide, item[1], item[2] + 0.18, item[3] + 0.57, 2.2, 0.25, { fontSize: 10, color: C.muted })
  })
  addLine(slide, 3.94, 2.7, 0.92, 0, C.muted, 1.5, 'triangle')
  addLine(slide, 6.22, 3.24, 0, 1.02, C.muted, 1.5, 'triangle')
  addLine(slide, 4.87, 4.9, -0.92, 0, C.muted, 1.5, 'triangle')
  addLine(slide, 2.62, 4.3, 0, -0.98, C.muted, 1.5, 'triangle')
  addRect(slide, 3.0, 3.44, 2.85, 0.7, C.slate, C.slate, true)
  addText(slide, '验证门：结果一致 · 文件存在 · 测试/运行证据', 3.14, 3.54, 2.57, 0.46, {
    fontSize: 13,
    color: C.white,
    bold: true,
    align: 'center'
  })
  addRect(slide, 8.45, 1.75, 4.15, 4.88, C.slate, C.slate, true)
  addText(slide, '系统级 AI 应用', 8.78, 2.1, 3.48, 0.38, { fontSize: 19, color: '8FD4CF', bold: true, align: 'center' })
  addBulletList(slide, [
    '多轮上下文与自动压缩',
    '基于事件流的工具执行',
    '项目级权限与工作区边界',
    '产物生成后的验证与摘要',
    '长期记忆与能力复用',
    '可选的签名与发布溯源方向'
  ], 8.9, 2.8, 3.05, 0.55, 'DDE4E9', 13, C.teal)
  addFooter(slide, 13, 'AI 的价值通过任务闭环证明；生态溯源作为未来方向，不包装为当前能力')
  addNotes(slide, 13, 'Agent 执行闭环', '45 秒', [
    'BAI Work 的 AI 应用不是单次接口调用，而是上下文、规划、工具、产物和验证的闭环。',
    '验证门将“模型说完成了”转换为文件、差异、测试与运行证据。',
    '可选的签名和发布溯源是后续生态方向，不作为当前完成度陈述。'
  ])
}

// 14 End-to-end evidence chain
{
  const slide = baseSlide()
  addHeader(slide, 14, '交付闭环：从输入到验收，每一步都有工程证据', '综合证据', C.coral, 'BAI WORK EVIDENCE CHAIN')
  const cols = [
    ['交付阶段', 0.72, 2.22, C.slate],
    ['用户价值', 2.94, 3.2, C.teal],
    ['系统机制', 6.2, 3.0, C.coral],
    ['可验证证据', 9.24, 3.36, C.blue]
  ]
  cols.forEach(function (item) {
    addRect(slide, item[1], 1.82, item[2], 0.54, item[3], item[3], true)
    addText(slide, item[0], item[1] + 0.1, 1.92, item[2] - 0.2, 0.32, {
      fontSize: 13,
      color: C.white,
      bold: true,
      align: 'center'
    })
  })
  const rows = [
    ['配置进入', '完成服务与模型就绪', '凭据隔离 · 探测 · 能力发现', '连接与模型发现测试'],
    ['任务执行', '项目内发起并持续看见推进', 'Runtime Host · SSE 归一化', '适配器与流式事件测试'],
    ['上下文经济', '请求预算与摘要边界可配置', '历史卫生 · 压缩配置契约', '默认值与输入边界测试'],
    ['能力体系', '五类能力归入 BAI Work 产品体验', '命令/技能加载 · Rule 指令 · Hook manifest', '加载与 manifest 安全测试'],
    ['产物交付', '回答、文件、差异与摘要分区', '结果区与项目文件联动', '文件存在性与差异证据'],
    ['工程验收', '从代码验证到桌面包体', '类型检查 · 测试 · 构建 · 打包', '自动化测试与运行 smoke']
  ]
  rows.forEach(function (row, index) {
    const y = 2.52 + index * 0.64
    const fill = index % 2 === 0 ? C.white : C.bg
    addRect(slide, 0.72, y, 11.88, 0.58, fill, C.line)
    addText(slide, row[0], 0.9, y + 0.1, 1.86, 0.32, { fontSize: 11, color: C.slate, bold: true })
    addText(slide, row[1], 3.08, y + 0.1, 2.88, 0.32, { fontSize: 10.5, color: C.teal, bold: true, align: 'center' })
    addText(slide, row[2], 6.38, y + 0.1, 2.62, 0.32, { fontSize: 10.5, color: C.coral, align: 'center' })
    addText(slide, row[3], 9.42, y + 0.1, 2.98, 0.32, { fontSize: 10.5, color: C.blue, align: 'center' })
  })
  addRect(slide, 1.1, 6.52, 11.12, 0.38, C.coralSoft, C.coralSoft, true)
  addText(slide, '上手、执行、上下文、安全、交付、验收——每个价值点都能回到实现与现场证据。', 1.32, 6.57, 10.68, 0.26, {
    fontSize: 11.5,
    color: C.coral,
    bold: true,
    align: 'center'
  })
  addFooter(slide, 14, '证据来源：BAI Work 当前代码 · 自动化测试 · 构建与运行结果')
  addNotes(slide, 14, '端到端工程证据链', '55 秒', [
    '这一页把前半段技术点收束为评委可以直接判断的证据链。',
    '从配置到工程验收，每个用户价值都对应明确的系统机制和验证入口。',
    'BAI Work 的优势来自完整闭环，不需要依赖外部产品比较。'
  ])
}

// 15 OpenAI upstream contribution and BAI Work reliability inheritance
{
  const slide = baseSlide(C.paper)
  addHeader(slide, 15, '把 Agent 可靠性写进上游，也写进 BAI Work', '技术背书', C.blue, 'UPSTREAM CONTRIBUTION')
  const metrics = [
    ['OPENAI', 'Contributor', '@2830500285 · 首次贡献者', C.blue],
    ['#3642', 'Merged PR', 'OpenAI Agents SDK main', C.teal],
    ['v0.17.7', '正式发布', '官方 release 收录', C.green],
    ['GPT-5.6', 'ChatGPT Codex', '贡献流程采用', C.coral]
  ]
  metrics.forEach(function (item, index) {
    const x = 0.72 + index * 3.0
    addRect(slide, x, 1.82, 2.68, 1.68, C.white, C.line, true)
    addMetric(slide, item[0], item[1], x + 0.22, 2.04, 2.24, item[3], item[2])
  })
  const principles = [
    ['有界状态', '上游释放缓冲；BAI Work：pending 上限 50，消费即删', '长跑不涨'],
    ['无重复续传', '上游不重复写入；BAI Work：单调 seq + 跨批去重', '重连不重'],
    ['超时恢复', '上游超时落盘；BAI Work：SSE 续传 + 退避熔断', '失败可恢复']
  ]
  principles.forEach(function (item, index) {
    const y = 4.02 + index * 0.76
    addRect(slide, 0.72, y, 2.55, 0.56, index === 0 ? C.blue : C.slate, index === 0 ? C.blue : C.slate, true)
    addText(slide, item[0], 0.9, y + 0.09, 2.18, 0.3, {
      fontFace: 'Aptos',
      fontSize: 13,
      color: C.white,
      bold: true,
      align: 'center'
    })
    addText(slide, item[1], 3.55, y + 0.06, 5.5, 0.36, { fontSize: 12.5, color: C.softInk })
    addPill(slide, item[2], 9.38, y + 0.1, 2.9, index === 0 ? C.blueSoft : C.greenSoft, index === 0 ? C.blue : C.green, 10)
  })
  addRect(slide, 0.72, 6.44, 11.88, 0.42, C.slateSoft, C.slateSoft, true)
  addText(slide, '原则复用，非代码移植：把经 OpenAI 主线验证的可靠性不变量，产品化为 BAI Work Runtime Host 的默认行为。', 0.98, 6.5, 11.35, 0.26, {
    fontFace: 'Aptos',
    fontSize: 11.5,
    color: C.slate,
    bold: true,
    align: 'center'
  })
  addFooter(slide, 15, '公开证据：OpenAI Agents SDK PR #3642 · v0.17.7 release；GPT-5.6 Codex 使用情况来自贡献者研发记录')
  addNotes(slide, 15, '上游贡献与 BAI Work 可靠性', '50 秒', [
    '我以 @2830500285 身份向 OpenAI Agents SDK 贡献 PR #3642，并随 v0.17.7 正式发布，官方 release 将我列为首次贡献者。',
    '这项贡献解决长时 Agent 沙箱中的缓冲增长、重复写入和网络超时落盘问题。',
    'BAI Work 没有移植该段 Python 代码，而是在 Runtime Host 中独立落实同一工程原则：pending 有界、事件游标去重、SSE 断点续传、指数退避与熔断。',
    'GPT-5.6 ChatGPT Codex 用于本次贡献流程的协作与复核；公开仓库只证明 PR 合并与版本发布，因此不宣称 Codex 产品直接集成这段代码。',
    '公开来源：https://github.com/openai/openai-agents-python/pull/3642 · https://github.com/openai/openai-agents-python/releases/tag/v0.17.7 · https://help.openai.com/en/articles/20001354-gpt-56-in-chatgpt'
  ])
}

// 16 Users
{
  const slide = baseSlide()
  addHeader(slide, 16, '目标用户：先占领高频、长链路的项目工作', '市场切入', C.coral, 'TARGET USERS')
  const users = [
    ['个人开发者 / 研究者', '本地项目任务长、文件多、上下文重复传递。', '从问题到代码、文档和图表的一站式交付。', C.blueSoft, C.blue],
    ['小型研发团队', '流程难复用，Agent 行为和权限口径难统一。', '共享技能、规则、服务配置与审阅标准。', C.tealSoft, C.teal],
    ['BAI 生态用户', '底层执行能力缺少持续桌面入口与产物工作面。', '模型、运行时与生态能力进入日常项目流程。', C.coralSoft, C.coral]
  ]
  users.forEach(function (item, index) {
    const x = 0.72 + index * 4.03
    addRect(slide, x, 1.85, 3.68, 3.92, item[3], item[3], true)
    addText(slide, '0' + (index + 1), x + 0.24, 2.08, 0.5, 0.34, {
      fontFace: 'Aptos',
      fontSize: 13,
      color: item[4],
      bold: true
    })
    addText(slide, item[0], x + 0.24, 2.48, 3.15, 0.58, {
      fontSize: 20,
      color: C.ink,
      bold: true,
      valign: 'top'
    })
    addText(slide, '核心摩擦', x + 0.24, 3.32, 1.1, 0.28, { fontSize: 11, color: item[4], bold: true })
    addText(slide, item[1], x + 0.24, 3.68, 3.14, 0.68, { fontSize: 13.5, color: C.softInk, valign: 'top' })
    addText(slide, 'BAI Work 价值', x + 0.24, 4.62, 1.4, 0.28, { fontSize: 11, color: item[4], bold: true })
    addText(slide, item[2], x + 0.24, 4.98, 3.14, 0.55, { fontSize: 13.5, color: C.ink, bold: true, valign: 'top' })
  })
  addText(slide, '首批验证不追求覆盖所有 AI 用户，而聚焦已有本地项目、愿意把完整任务交给 Agent 的用户。', 1.0, 6.24, 11.3, 0.42, {
    fontSize: 15.5,
    color: C.coral,
    bold: true,
    align: 'center'
  })
  addFooter(slide, 16, '市场判断基于 Jobs-to-be-Done；不使用未经验证的市场规模数字')
  addNotes(slide, 16, '目标用户', '35 秒', [
    '首批用户是有真实本地项目、长任务和产物验收需求的个人与小团队。',
    'BAI 生态用户获得的是持续桌面入口和项目交付工作面。',
    '切入策略先验证高频留存与任务完成率，再扩展更广泛场景。'
  ])
}

// 17 Go-to-market
{
  const slide = baseSlide(C.paper)
  addHeader(slide, 17, '商业推广：受控补贴驱动首批高质量激活', '商业增长', C.green, 'CONTROLLED SUBSIDY ACQUISITION')
  addPill(slide, '建议实验方案', 0.72, 1.72, 1.36, C.greenSoft, C.green, 10)
  const offer = [
    ['限量 Cohort', '首批限量名额\n按批次开放', C.blue],
    ['半价折扣', '模型使用费用\n提供 50% 优惠', C.green],
    ['额度封顶', '单账户月度上限\n控制补贴敞口', C.amber],
    ['限时验证', '持续 8–12 周\n到期自动复核', C.coral]
  ]
  offer.forEach(function (item, index) {
    const x = 0.72 + index * 3.02
    addRect(slide, x, 2.22, 2.7, 1.58, C.white, item[2], true)
    addText(slide, item[0], x + 0.2, 2.46, 2.3, 0.34, { fontSize: 17, color: item[2], bold: true, align: 'center' })
    addText(slide, item[1], x + 0.2, 2.96, 2.3, 0.56, {
      fontSize: 12.5,
      color: C.softInk,
      align: 'center',
      breakLine: true
    })
  })
  addRect(slide, 0.72, 4.25, 7.2, 1.65, C.greenSoft, C.greenSoft, true)
  addText(slide, 'Activation-Gated Subsidy', 0.98, 4.52, 2.55, 0.34, {
    fontFace: 'Aptos',
    fontSize: 15,
    color: C.green,
    bold: true
  })
  addBulletList(slide, [
    '绑定有效 API Key 并完成首个项目任务后激活优惠。',
    '按账户、设备与异常使用信号控制重复领取。',
    '补贴只覆盖真实使用量，未使用额度不沉淀、不转售'
  ], 3.55, 4.42, 3.95, 0.43, C.softInk, 11.5, C.green)
  addRect(slide, 8.25, 4.25, 4.35, 1.65, C.slate, C.slate, true)
  addText(slide, '单位经济门槛', 8.58, 4.52, 3.7, 0.34, { fontSize: 15, color: '8FD4CF', bold: true, align: 'center' })
  addText(slide, 'Subsidy CAC ≤ Cohort LTV ×\n目标回收系数', 8.58, 5.0, 3.7, 0.6, {
    fontFace: 'Aptos',
    fontSize: 17,
    color: C.white,
    bold: true,
    align: 'center',
    breakLine: true
  })
  const metrics = ['API Key 绑定率', '首任务完成率', 'D7 活跃项目', '付费转化率', '补贴效率']
  metrics.forEach(function (metric, index) {
    addPill(slide, metric, 0.82 + index * 2.45, 6.35, 2.12, index % 2 ? C.greenSoft : C.blueSoft, index % 2 ? C.green : C.blue, 9.5)
  })
  addFooter(slide, 17, '商业方案为待验证实验；额度、周期和风控阈值需按 Cohort 数据迭代')
  addNotes(slide, 17, '首批商业推广', '50 秒', [
    '建议采用限量、半价、封顶、限时的受控补贴方案，而不是无上限降价。',
    '优惠在用户绑定有效 API Key 并完成首个项目任务后激活，确保补贴对应真实使用。',
    '用首任务完成率、七日活跃项目和付费转化率决定是否扩大 Cohort。'
  ])
}

// 18 Roadmap
{
  const slide = baseSlide()
  addHeader(slide, 18, '12 周推进：先稳定发布，再验证增长', '执行计划', C.teal, '12-WEEK ROADMAP')
  const phases = [
    ['NOW', '稳定基线', 'Mac Intel 主版本\nToken Economy / EBAI\n当前自动化验证', C.slate, C.slateSoft],
    ['W1–4', '发布级', '正式签名与公证\n运行时契约对齐\n崩溃与恢复遥测', C.blue, C.blueSoft],
    ['W5–8', '试点级', '首批限量 Cohort\n30 秒上手漏斗\n真实任务回归', C.teal, C.tealSoft],
    ['W9–12', '规模化判断', '留存与单位经济\n团队策略复用\n生态能力审核', C.coral, C.coralSoft]
  ]
  phases.forEach(function (item, index) {
    const x = 0.72 + index * 3.02
    addRect(slide, x, 1.82, 2.72, 2.72, item[4], item[4], true)
    addPill(slide, item[0], x + 0.22, 2.05, 0.92, item[3], C.white, 10)
    addText(slide, item[1], x + 0.22, 2.62, 2.28, 0.42, { fontSize: 19, color: item[3], bold: true })
    addText(slide, item[2], x + 0.22, 3.22, 2.28, 0.98, {
      fontSize: 12.5,
      color: C.softInk,
      breakLine: true,
      valign: 'top'
    })
    if (index < phases.length - 1) addLine(slide, x + 2.75, 3.16, 0.24, 0, C.muted, 1.2, 'triangle')
  })
  addText(slide, '12 周内只验证三件事：稳定发布、真实激活、单位经济成立。', 1.4, 5.45, 10.55, 0.42, {
    fontSize: 14.5,
    color: C.ink,
    bold: true,
    align: 'center'
  })
  addFooter(slide, 18, '路线图优先级：稳定发布 → 真实激活 → 留存与单位经济')
  addNotes(slide, 18, '十二周路线图', '45 秒', [
    '前四周解决发布级稳定性，第二阶段验证首批 Cohort，第三阶段再决定规模化。',
    '每个阶段用发布质量、真实激活、留存和单位经济验收，而不是继续堆叠功能数量。'
  ])
}

// 19 Close
{
  const slide = baseSlide(C.black)
  addImageContain(slide, wordmark, 920 / 240, 0.72, 0.58, 3.9, 1.02)
  addText(slide, '简单，不代表能力少。', 0.76, 2.02, 5.15, 0.62, { fontSize: 29, color: C.white, bold: true })
  addText(slide, '而是把复杂度留在系统里。', 0.76, 2.82, 5.45, 0.62, { fontSize: 29, color: '8FD4CF', bold: true })
  addText(slide, '30 秒配置目标；过程可见；产物可验收。', 0.76, 3.9, 5.6, 0.82, {
    fontSize: 18,
    color: 'CDD4DB',
    bold: true,
    valign: 'top'
  })
  const recap = [
    ['轻量架构', '项目级 Runtime Host 与最短执行链', C.teal],
    ['Token Economy', '请求预算与上下文治理契约', C.amber],
    ['EBAI', '产品能力体系与清晰执行边界', C.coral],
    ['产品交付', '三平台路径、自动化测试与运行证据', C.blue],
    ['商业增长', '限量半价、额度封顶与 Cohort 验证', C.green]
  ]
  recap.forEach(function (item, index) {
    const y = 0.78 + index * 1.02
    addRect(slide, 6.0, y, 6.55, 0.78, C.slate, C.slate, true)
    addRect(slide, 6.0, y, 0.08, 0.78, item[2])
    addText(slide, item[0], 6.28, y + 0.13, 1.75, 0.3, {
      fontFace: 'Aptos',
      fontSize: 11.5,
      color: item[2],
      bold: true
    })
    addText(slide, item[1], 8.12, y + 0.11, 4.05, 0.4, {
      fontSize: 13,
      color: C.white,
      bold: true
    })
  })
  addRect(slide, 6.0, 6.02, 6.55, 0.78, C.paper, C.paper, true)
  addText(slide, '下一步：稳定签名发布 · 首批用户验证 · 项目级生态扩展', 6.25, 6.17, 6.05, 0.42, {
    fontSize: 13.5,
    color: C.ink,
    bold: true,
    align: 'center'
  })
  addText(slide, 'github.com/2830500285/BAI-Work', 0.76, 6.72, 4.55, 0.3, {
    fontFace: 'Aptos',
    fontSize: 11.5,
    color: '8FD4CF'
  })
  addNotes(slide, 19, '收束', '30 秒', [
    '最后一句：简单不是删掉能力，而是把架构、配置和安全复杂度留在系统内部。',
    'BAI Work 通过轻量架构、Token Economy、EBAI 和工程验证形成完整交付闭环。',
    '下一步是稳定签名发布并用首批真实用户数据验证留存与单位经济。'
  ])
}

const scriptHeader =
  '# BAI Work 项目答辩逐页讲稿\n\n' +
  '- 建议总时长：约 12 分钟（含 3 分钟产品演示）\n' +
  '- 核心叙事：BAI Work 把配置、执行、上下文、安全与验收收敛成可本地验证的项目交付闭环。\n' +
  '- 答辩文件：BAI-Work-Defense-Deck.pptx\n\n'

fs.writeFileSync(scriptOutput, scriptHeader + scriptSections.join('\n'))

pptx.writeFile({ fileName: output })
  .then(function () {
    console.log('[defense-deck] wrote ' + output)
    console.log('[defense-deck] wrote ' + scriptOutput)
    console.log('[defense-deck] slides: ' + pptx._slides.length)
  })
  .catch(function (error) {
    console.error(error)
    process.exitCode = 1
  })
