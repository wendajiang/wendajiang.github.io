---
title: MLIR 相关
date: 2025-1-22
tags:
  - mlir
  - compiler
---

## 什么是 MLIR？
[先进编译实验室](https://space.bilibili.com/1540261574/lists) （可能是郑州超算中心的马甲?【搜索 韩林是里面的博导】）

对于 MLIR 的介绍从官网翻译过来，还不错

> [2024 EuroLLVM - Efficient Data-Flow Analysis on Region-Based Control Flow in MLIR](https://www.youtube.com/watch?v=vvVR3FyU9TE&list=PL_R5A0lGi1ADpNfgC8SHm9O73s3PfeJGo&index=42)weiweichen 的演讲
> 
> 主页在这里 [https://weiweichen.github.io/](https://weiweichen.github.io/)
> 
> 发现了 [https://adventofcode.com/2024/day/1](https://adventofcode.com/2024/day/1) 这个圣诞节前后 25 天的解体训练

## 为什么要创造 MLIR？
[[reading/about_zhihu_mackler|知乎上关于这个问题的解释]]

## 使用 MLIR 能做什么？

MLIR 更像是 LLVM，但是不如 LLVM 像是生态，更多的是基础框架，因为 DSA 太过于碎片话，将 DSA 的 dialect 合入上游，并不能像是 LLVM 后端 target，让更多用户受益，不过当 GPxPU 更趋于架构（ISA）收敛之后，能否也像 LLVM 一样就看以后发展了

## conclusion
总体来说，MLIR 是在 TVM，HLO 等 AI compiler 发展一段时间后，Chris 从传统编译器角度，试图解决 IR 碎片化做出的工程努力。