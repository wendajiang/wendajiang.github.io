---
title: IPC Inter-process communication
date: 2025-06-24
tags:
  - os
  - IPC
---
在研究工作中一个运行时组件性能时，关注到 IPC 性能，由于之前的实现在同一个 host 上的不同 process 仍然使用 [[reading/zmq_guide_read|zmq]] 的 tcp 协议进行进程间通信，通过统计各个步骤之间的时间占比，发现进程间通信大概占比 20%，是值得优化的一个点。


## shared memory
### System V 
可以使用 `ipcs` 命令查看当前系统使用的共享内存信息，`ipcrm` 可以释放系统的共享内存。
### Posix
# reference
- [evaluation of sockets/pipe/shared memory](https://pages.cs.wisc.edu/~adityav/Evaluation_of_Inter_Process_Communication_Mechanisms.pdf)