---
title: CPP standard networking proposal(execution)
date: 2025-5-13
---
## 为什么需要 execution
[这篇知乎文章](https://zhuanlan.zhihu.com/p/395250667) 很好阐述了为什么需要 execution。
总结如下：

### P0443 和 P2300 之前
- std::async 并不好用，并且不支持 lazy
- future/promise 模型并不能表示任务的前后依赖关系
- 早期的 executor 并没有提出 sender/recevier 模型，依然基于 future/promise 模型表达任务图关系，主要把重点放在任务调度的抽象

### P0443 和 P2300
统一并清理了各种概念，将 future/promise 改造的更加 generic -> Sender/Receiver 模型。

P2300R1的发布意味着 executor 的迭代稳定了下来


[ericniebler本人的 blog](https://ericniebler.com/2024/02/04/what-are-senders-good-for-anyway/) 

## 阅读 [P2300 latest](https://cplusplus.github.io/sender-receiver/execution.html)

其中说明了 [coroutine 并不是异步算法的基石](https://cplusplus.github.io/sender-receiver/execution.html#intro-prior-art-coroutines)。

## executor 的演进历史

[reddit first comment](https://www.reddit.com/r/cpp/comments/1caa7fn/is_senders_and_receivers_a_replacement_for/) 大致梳理了关于 executor 的历史，以及新代码使用 API 的建议。

总结如下：

- https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2021/p2464r0.html 反对 asio 提出的 [executor](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2020/p0443r14.html) 进入标准，关于此问题的投票 https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2022/p2453r0.html
- 最终 [execution](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2024/p2300r10.html) (声称是 P0443 演进而来)进入标准
  其中 execution 需要解决 [[blog/customization_point_object|customization_point_object]] 的问题。

在 [compiler support](https://en.cppreference.com/w/cpp/compiler_support) 查询得到结论，execution 是 library 的工作，并规划在 C++26 中完成，当前时间(2025-05-13) 并没有任何编译器对其进行实现

当前时间点确定下来的标准就是 https://github.com/cplusplus/sender-receiver

## 这个问题的争论历史
https://www.zhihu.com/question/518043735/answer/2929787089

https://www.zhihu.com/question/631459764

各回答站 Chris (executor 的抽象可以基于当前的 coro)的很多，大概是实事求是吧，所以当前使用的话 asio 可以作为不错的选择，至于以后 networking 的发展，可能真的要很多年了。


