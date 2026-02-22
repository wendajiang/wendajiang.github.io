---
title: vLLM and something
date: 2025-3-6
tags:
  - compiler
  - AI
---
[vLLM official git](https://github.com/vllm-project/vllm)
https://zhuanlan.zhihu.com/p/715604870
@todo

[vLLM 和 xDiT 对比引入分布式系统的思考](https://zhuanlan.zhihu.com/p/715604870) 总结两个系统在分布式系统上的问题和解决方式很好。

[llm 需要怎么样的芯片](https://zhuanlan.zhihu.com/p/683908169) 其中提到，prefill 和 decode 一个是计算密集，一个是访存密集。

但是 [xDiT 介绍](https://www.zhihu.com/people/feifeibear/posts) 提到 DiT 系统没有 decode 阶段，所以推理任务是不同的，需要重新设计分布式系统框架，模型不大，但是推理序列长度很长，所以 TP 这种在 vLLM 第一优先级的并行在 DiT 中并不实用。