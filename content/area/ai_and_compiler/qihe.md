---
title: Qihe paper notes
date: 2026-03-06 21:12
tags:
  - spa
  - verilog
---
[[area/ai_and_compiler/nju_spa| 南京大学程序分析团队]] 最新verilog 分析框架 Qihe.

[paper link](https://arxiv.org/abs/2601.11408v1) and [office site](https://qihe.pascal-lab.net/)

Drawing from the designs of existing frameworks for software analysis(tai-e, soot), a *general purpose* framework typically requires the close cooperation of the following key components:
- *fundamental analyses* that provide basic program information used across various application-specific analysis （Qihe 有 22 种）
- *front-end* and *IR* that derive an analysis-oriented program abstraction from source code
- *analysis manager* that facilitates the reuse of results from existing analyses and the integration of new ones

然而当前的 verilog 静态分析依赖下面的三种选择，每种都有其限制
- linter (Slang, Verible, SVLint, Verilator-Lint) 都是在 AST 上进行语法及模式匹配分析
- Pyverilog / VeriPy 这类工具能够提供超越 AST 的硬件抽象能力，但缺乏应对同步、并发等关键硬件特性的底层架构，这极大限制了它们在多样化分析需求场景下的实用性
- CIRCT，一个以综合为主的综合性硬件编译框架，虽然可以适配做静态分析，但是缺少构建复杂分析的基础组件（比如精细的数据流分析以及语义推理分析）



