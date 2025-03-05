---
title: maclker from 知乎
date: 2025-2-25
tags:
  - compiler
---
[mackler(行云集成电路创始人季宇)](https://www.zhihu.com/people/mackler)

回答中认为 mlir 以及 TVM 等 AI compiler 的设计比较过于强调抽象  

其实mlir也是类似，只是Chris有丰富的编译器工程经验，设计接口的能力更强，所以mlir的这一套抽象出现类似tvm和tensorflow这样不断扩展从而变得臃肿的概率会低很多，但仍然避免不了这套抽象解决不了他所claim要解决的核心问题，也就是算子工程量的问题。这种没有边界感的扩张也体现在mlir一直强调不只是ai软件栈这一点上，比如去碰瓷 eda。

## 专用架构与 AI 软件栈的观点摘录

编译器手段：

1. Term rewrite: 匹配程序 IR 中的某种特征，并按照预设模版进行替换，从而达到对程序进行变形，增加 term rewrite rule 来不断覆盖各种手工变换代码的经验  
      
    这种方法在变换空间较大的时候会变得低效，这时候就需要一些形式化的方法来建模和变换程序，这方面 polyheral model 算是集大成者，定义了一个很大的 affine loop 调度变换空间  
      
    lowering 容易，rising 或者 lifting 难  
    山顶半山腰的高层级 IR 完备性比较差，程序的变换形式相对离散，一般会用 term rewrite 方式覆盖，比如各种计算图编译器，会包含各种图融合算法。  
      
    山底细粒度 IR 完备性好，变换空间大，尤其是 loop 变换，比较容易设计各种形式化方法  
      
    这种状况其实也是路径依赖导致的，过去编译器关注的都是通用处理器上的代码优化问题，合法调度在解空间里非常稠密，只要解决依赖性分析的问题，搜索空间里基本都是合法调度，关键在于调度后程序的性能。  
      
    而体系结构核心瓶颈是访存，因此调度的核心在于优化访存。访存一方面取决于代码执行顺序，一方面取决于片上缓存如何分配，这两个问题也是过去编译优化两个最关键的问题，即[auto-schedule](https://zhida.zhihu.com/search?content_id=179112268&content_type=Article&match_order=1&q=auto-schedule&zhida_source=entity)和[auto-tiling](https://zhida.zhihu.com/search?content_id=179112268&content_type=Article&match_order=1&q=auto-tiling&zhida_source=entity)。可以说，在过去这么多年HPC领域的编译技术发展下，auto-schedule的问题被polyhedral model部分解决，而auto-tiling的问题形式化后往往会变得极其非线性，所以一直以来都是老大难问题。  
      
    DSA 指令的引入，会把搜索空间的合法解变得稀疏化！此时找到合法解本身就很困难。  
      
     

换个角度想，原来的搜索空间中，其实大多数都是硬件上不怎么高效的解。现在DSA指令相当于直接把这个问题换了个形式，DSA指令实际上是标记了那些形式的变换是可以被硬件高效执行的，这部分其实一直都是很稀疏的，而编译器现在只要找到这部分解，就可以一定程度上拿到DSA指令提供的性能，当然编译器在可行解的集合里进一步求最优化。优化问题实际上是变成了软硬件协同完成了，DSA指令优化一部分（manual-tiling和manual-schedule），编译器优化一部分（auto-tiling和auto-schedule）。而且这种协同是以编译器和后端解耦的方式完成的，后端粒度越大，DSA指令优化的部分占比越高，编译器优化的压力就越小，当然覆盖的应用程序也就越少，而后端粒度越小，DSA指令优化的部分占比就越少，编译器优化的压力就越大，当然覆盖的应用程序就越多。所以实际上一个具体的后端可以构建层次化的DSA指令，包含不同粒度的DSA指令，从而在通用性和高性能方面达到兼顾。此外，广义上来讲，DSA指令不仅可以包括芯片上实际的物理指令，也可以是高性能库提供的算子，硬件指令和手写库可以共同构建一套层次化的后端模板集合。

这种软硬件的解耦与协同的前提，是编译器可以解决auto-tensorize的问题，在调度空间种自动寻找极其稀疏的可行解。

当然，寻找可行解的开放问题是非常困难的，这个问题朝着最开放的方式去形式化，其实就是SAT的问题：即软件写一段代码，硬件指令的功能也用一段代码描述，要判断这个硬件指令和软件的这段代码功能是否等价，基本是标准的SAT问题。当然更一般的情况是要判断软件代码中是否包含这条指令的等价功能片段，更加变态。反过来讲，这个问题也可以很简单，如果我们要求软件代码和硬件功能描述保持字面上完全一致，这个问题做一个简单的IR匹配就可以实现，但软件编写的灵活性就没了，这个灵活性其实就在于各种代码的等价变换。

**软件需要复杂性，硬件需要演进空间**

## DSA 已死？
DSA （domain specific architecture） 专用硬件结构在当前 transformer is all you need 已经不太好能

持续迭代出越来越高性能的版本，所以勉强算已经“收敛”

还是要卷 GPGPU？当然这是在数据中心角度，各种端侧芯片（比如功耗优势）还是有各种机会，就看市场大小

## middle-end transformations not as optimizations
[https://www.npopov.com/2021/06/02/Design-issues-in-LLVM-IR.html](https://www.npopov.com/2021/06/02/Design-issues-in-LLVM-IR.html)  
 