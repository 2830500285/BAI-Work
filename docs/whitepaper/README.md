# BAI Work 技术白皮书

本目录包含《BAI Work 技术白皮书》的 LaTeX 源文件和参考资料。

## 文件结构

- `bai-work-whitepaper.tex`: 主 LaTeX 文件, 使用 `ctexbook`, 面向 XeLaTeX。
- `chapters/*.tex`: 分章正文, 由主文件 `\input`；EBAI 映射章节为 `12-ebai-mapping.tex`。
- `references.bib`: 公开资料引用。当前白皮书主要基于本项目源码、资源说明、README 和公开 BAI Code 安装资料。
- `bai-work-whitepaper.pdf`: 本机验证生成的 PDF。

## 编译

推荐使用 `latexmk`:

```bash
cd docs/whitepaper
latexmk -xelatex -interaction=nonstopmode -halt-on-error bai-work-whitepaper.tex
```

也可以使用 `xelatex` 多次编译:

```bash
cd docs/whitepaper
xelatex -interaction=nonstopmode -halt-on-error bai-work-whitepaper.tex
xelatex -interaction=nonstopmode -halt-on-error bai-work-whitepaper.tex
```

## 字符统计

本目录使用两个统计口径:

```bash
node - <<'NODE'
const fs = require('fs')
const path = require('path')
const dir = 'docs/whitepaper'
const files = [
  path.join(dir, 'bai-work-whitepaper.tex'),
  ...fs.readdirSync(path.join(dir, 'chapters'))
    .filter((file) => file.endsWith('.tex'))
    .map((file) => path.join(dir, 'chapters', file))
]
let total = 0
let han = 0
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8')
  total += [...text].length
  han += (text.match(/[\u3400-\u9fff]/g) || []).length
}
console.log({ totalCharacters: total, hanCharacters: han })
NODE
```

当前统计结果:

- 总字符数: 236,153
- 汉字数: 100,602
- 分章文件数: 18

`texcount` 也可用于 LaTeX 合并统计:

```bash
cd docs/whitepaper
texcount -merge -char bai-work-whitepaper.tex
```

## 验证状态

- `latexmk -xelatex -interaction=nonstopmode -halt-on-error bai-work-whitepaper.tex`: 已通过, 生成 175 页 PDF。
- 敏感内容扫描: 未发现常见 API key/token/private key 模式。
- 文本扫描: 未发现 em dash、聊天痕迹短语。

编译日志中存在长英文标识导致的 overfull hbox 警告, 例如环境变量名和路径名过长。这些警告不影响 PDF 生成。
