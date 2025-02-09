---
title: Memory ordering at Runtime
tags:
  - lock-free
date: 2025-2-9 10:06
---
[[blog/memory_ordering_at_compile_time|memory ordering at compile time]] have indicated one half of the memory ordering puzzle. This blog is about the other half : memory ordering at runtime, on the processor itself. Like compiler reordering, processor reordering is invisible to a single-threaded program. It only becomes apparent when [[blog/lock_free|lock-free techniques]] are used – that is, when shared memory is manipulated without any mutual exclusion between threads. However, unlike compiler reordering, the effects of processor reordering are only visible in multicore and multiprocessor systems.


经常发生在**编译器阶段**或[CPU流水线](https://zhida.zhihu.com/search?content_id=705739430&content_type=Answer&match_order=1&q=CPU%E6%B5%81%E6%B0%B4%E7%BA%BF&zhida_source=entity)内部，优化的是指令的执行效率。为了**减少[数据相关性](https://zhida.zhihu.com/search?content_id=705739430&content_type=Answer&match_order=1&q=%E6%95%B0%E6%8D%AE%E7%9B%B8%E5%85%B3%E6%80%A7&zhida_source=entity)和资源冲突**，最大限度利用硬件资源。

如果是发生在**编译器层面的指令重排，编译器在生成目标代码时，通过分析指令间的依赖关系，对指令顺序进行调整。例如，将不会互相影响的指令重新排序，这种重排发生在程序执行之前。但是如果是**CPU硬件层面的指令重排，**CPU流水线在运行时，会通过硬件动态调整指令执行的顺序，以避免流水线停顿（如数据相关性或硬件资源争用）。

## **指令重排 vs. 乱序发射： 一表看透**

|特性|指令重排|乱序发射|
|---|---|---|
|发生阶段|- 编译器阶段（静态重排）  <br>- CPU流水线运行时（动态重排）|- 仅在CPU运行时的指令调度阶段|
|实现方式|- 通过编译器优化（静态）  <br>- 硬件流水线优化（动态）|- 通过CPU硬件（调度器、寄存器重命名、Reorder Buffer）|
|优化目标|- 减少流水线停顿（提高硬件利用率）|- 最大化指令并行度，避免等待前置指令完成|
|依赖关系|- 遵守基本数据和控制依赖|- 需要更复杂的硬件来动态解决依赖（如寄存器重命名）|
|执行结果顺序|- 指令结果按照程序逻辑顺序执行|- 指令可能乱序执行，但结果按程序逻辑顺序提交|
|工作层次|- 可以是软件级别（编译器）或硬件级别（CPU）|- 完全是CPU硬件级别的优化|
|典应用场景|- 编译器生成优化代码  <br>- 提高流水线的效率|- 高性能CPU的乱序执行优化|


  
