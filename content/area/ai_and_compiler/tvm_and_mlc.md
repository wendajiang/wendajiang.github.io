---
title: TVM 和 MLC 的摘录
date: 2025-2-25
tags:
  - compiler
---
[https://mlc.ai/chapter_introduction/index.html](https://mlc.ai/chapter_introduction/index.html) 是 Machine learning compilation 的课程

由陈天奇发起（TVM 创始人）


[知乎上一段 tvm or mlir ?不错的回答](https://zhuanlan.zhihu.com/p/388452164)

![[/pics/Pasted image 20250305105314.png]]
![[/pics/Pasted image 20250305105252.png]]

## Compiler Technologies in Deep Learning Co-Design: A Survey 摘录

[https://spj.science.org/doi/10.34133/icomputing.0040](https://spj.science.org/doi/10.34133/icomputing.0040). 

CPU

GPU

Developers need to implement the optimization strategies by using GPU programming interfaces, such as CUDA, OpenCL, OpenACC, and Vulkan. Some of these have corresponding IRs in multi-level intermediate representation (MLIR) or low-level virtual machine (LLVM) IR for compilation-pass development. In addition, standard portable intermediate representation (SPIR)-V builds an ecosystem for parallel computation and GPU compilers, hoping to become the standard IR for bridging programming interfaces and hardware platforms.

FPGA

CGRA, which stands for coarse-grained reconfigurable architecture, consists of processing element (PE) arrays and interconnection switches.

ASIC

A traditional compiler can be divided into three parts: the frontend parses the language; the midend optimizes the IR; and the backend generates hardware instructions. The compilation technologies  in each phase include lexical, syntax, and semantic analyses at the frontend; IR translation, dataflow analysis, control flow analysis, and interprocedural optimization at the midend; and instruction selection and register allocation at the backend. These ideas from traditional compilers can help solve the problems encountered in current deep learning software and hardware systems. 

deep learning compilers are widely used on the inference side, where the input to the compiler is a pre-trained deep learning model; the frontend converts the model into IR; the midend performs optimization and lowers it to low-level IR; and the backend uses the existing toolchain to generate hardware code.   |  With the emergence of large neural networks, the training framework also needs to introduce compilation technology to achieve acceleration.

The infrastructures of deep learning compilers include frontend importers, high-level language bindings, multi-level IR and its extension mechanism, tensor operations and data structures, optimization passes and a manager, and toolchain integration for hardware platforms. For these, optimization ability and IR design are particularly important, as they determine execution performance and development efficiency, respectively.

Optimization of deep learning compilers enables better mapping of the neural network workload to hardware [110](https://spj.science.org/doi/10.34133/icomputing.0040#core-B110) , [121](https://spj.science.org/doi/10.34133/icomputing.0040#core-B121),[122](https://spj.science.org/doi/10.34133/icomputing.0040#core-B122). Deep learning compilers typically split the entire DNN model into subgraphs and then apply graph-level optimization technologies to the subgraphs [104](https://spj.science.org/doi/10.34133/icomputing.0040#core-B104)， such as layout optimization, operator fusion, and constant folding. Subsequently, the IR is converted to a lower abstraction level for loop-level and hardware-related optimization [103](https://spj.science.org/doi/10.34133/icomputing.0040#core-B103), such as loop reordering, loop tiling, and memory-related optimization.

To improve development efficiency, deep learning compilers are on the way of forming a unified ecosystem. Currently, the two major deep learning compiler ecosystems are tensor virtual machine (TVM) [15](https://spj.science.org/doi/10.34133/icomputing.0040#core-B15) and MLIR [13](https://spj.science.org/doi/10.34133/icomputing.0040#core-B13). The remainder of this section discusses these two ecosystems.

## hardware lottery
https://hardwarelottery.github.io/

在摩尔定律仍然有效的时代，软件和硬件的发展基本是各自为战。写软件的人几乎不用考虑硬件的特性，因为硬件性能每隔两年翻一倍，软件的性能自然也会跟着变快。然而，摩尔定律的黄金年代已经结束。虽然NVIDIA的“黄氏定律”仍在推动硬件性能增长，但这种增长更多体现在专用领域。如果算法没有利用那些特化的硬件特性，就像没抽中“硬件彩票”——注定很难跑赢时代的红利。例如，Hinton提出的capsule network，由于对GPU不友好，目前尚未得到广泛应用。

硬件亲和性，已经成为决定算法成功的关键。

或许，最理想的情况，就像那个影响了FP8的男人那样，必须算法、软件、硬件协同设计。