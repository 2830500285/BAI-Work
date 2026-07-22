# EBAI 能力叙事校正设计

## 沟通目标

答辩结束时，评委应当理解 EBAI 是 BAI Work 面向用户的产品能力体系，而不是一个以外部资产转换为核心的迁移工具。

## 设计选择

- 第 11 页由迁移管线改为 EBAI 产品能力体系，直接展示 Commands、Agents、Skills、Rules 和 Hooks 及当前可用状态。
- 第 12 页改为 Hook 能力模型与 Runtime 执行边界，明确当前只交付默认关闭的 manifest。
- 第 5、14、19 页同步改为“产品能力体系”与“清晰执行边界”叙事。

## 取舍

不把 EBAI 描述为原生执行引擎，也不宣称存在仓库未实现的统一能力目录或 Hook 执行器。答辩将“产品定义”与“当前实现状态”分开：EBAI 定义 BAI Work 面向用户的能力体系；当前 Commands/Skills 可加载，Agents/Rules 通过命令与 Skill 形态接入，Hooks 仅生成 manifest。

## 验收标准

- 第 11 页不再出现 Remote Index、Staging Cache、Semantic Mapper、外部资产、转译或迁移等核心定义。
- 第 12 页不再使用外部事件名与内部事件名的转换矩阵，并明示当前 Hook 执行未开放。
- 整套 PPTX、讲稿、README 与生成源对 EBAI 的定义一致。
- 不宣称当前 runtime 不支持的 Hook 执行效果。
