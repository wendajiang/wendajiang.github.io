---
title: ray
date: 2025-3-5
tags:
  - compiler
  - distribute
  - 分布式
---
之前做 job 分发系统的时候（function 级别），参考了 ray 的框架（实际更多的是 ray-core），在最近了解 AI compiler 的时候【[大佬](https://zhuanlan.zhihu.com/p/14430956145) 的评论里提到依赖了 ray】，发现 [[about_vllm|vLLM]] 推理框架分布式计算的时候也依赖了 ray 更上层的 AI 分发系统，所以重新认识一下，并记录在自己实现 job 分发系统的心得。

ray 来源于 UC Berkeley 的 Ion Stoica 在 2020 年写的[一篇文章](https://www.anyscale.com/blog/the-future-of-computing-is-distributed)，总结下来就是 AI 和大数据的发展，对于分布式应用有了更高的挑战。



# reference
- [ray 2.0 doc](https://docs.google.com/document/d/1tBw9A4j62ruI5omIJbMxly-la5w4q_TjyJgJL_jN2fI/preview?tab=t.0#heading=h.iyrm5j2gcdoq)
- [ray 1.0 doc](https://docs.google.com/document/d/1lAy0Owi-vPz2jEqBSaHNQcy2IBSDEHyXNOQZlGuj93c/preview?pli=1&tab=t.0)
- [ray design pattern](https://docs.google.com/document/d/167rnnDFIVRhHhK4mznEIemOtj63IOhtIPvSYaPgI4Fg/edit?tab=t.0#heading=h.crt5flperkq3)
- [ray paper](https://arxiv.org/pdf/1712.05889)




