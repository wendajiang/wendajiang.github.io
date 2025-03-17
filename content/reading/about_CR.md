---
title: C/R introduction
tags:
  - distribute
  - checkpoint
date: 2025-03-17
---
The checkpoint is a feature to save all of process states onto files, to restart its execution later.

早期在 LWN 上的讨论
- [2010 讨论在 user-space 实现 C/R，来源于 in-kernel 对于 C/R 的支持](https://lwn.net/Articles/414264/)
- [基于上一个讨论，在 2012 提出 CRIU，应用于 container-based 的场景](https://lwn.net/Articles/478111/)

[C/R 技术的总结和概览](https://cvw.cac.cornell.edu/checkpoint/cr-types/taxonomy)

## [CRIU](https://criu.org/Main_Page)
[https://lvee.org/uploads/image_upload/file/311/fedora-test-day.odp.pdf](https://lvee.org/uploads/image_upload/file/311/fedora-test-day.odp.pdf)

Due to restrictions imposed by several kernel APIs CRIU uses, the tools can only work with run with root privileges.

[comparison to other CR projects](https://criu.org/Comparison_to_other_CR_projects)
## [DMTCP](https://dmtcp.sourceforge.io/)
https://dmtcp.sourceforge.io/dmtcp-mug-17.pdf
## DMTCP vs CRIU
> CRIU can dump a task without preparations. DMTCP can dump only prepared tasks.
> """
> A DMTCP coordinator process is created on a host (default: localhost). As new processes are created (via fork or ssh), the LD_PRELOAD
> environment variable (supported by the Linux loader) is used to preload
> the DMTCP library (dmtcphijack.so). That library runs before the routine
> main(). It creates a second thread (DMTCP checkpoint thread). The
> checkpoint thread then creates a socket to the DMTCP coordinator and
> registers itself. The checkpoint thread also creates a signal handler
> (SIGUSR2 by default)
> """
> CRIU doesn't affect behavior of applications before and after
> checkpoint/restore. CRIU is independent from GLIBC and other libraries.
> DMTCP sets wrappers on a few system calls, so it can change behavior of
> applications. Probably DMCTP can't dump static linked programs and
> programs, which call syscall directly.
> """
> The run-time overhead of DMTCP is essentially zero. When there is no
> checkpoint or restart in process, DMTCP code will run only within DMTCP
> wrappers around certain less frequently used system calls. Examples of
> such wrappers are wrappers for open(), getpid(), socketpair(), etc.
> """
> DMTCP doesn't support namespaces, so it can not dump Linux Containers.
> DMTCP **virtualizes PID-s in user-space**, actually a task is restored with
> another pid. It may be prefered in some cases.
> 
> I'm not sure that DMCTP can restore anonymous shared memory correctly.
> 
> Probably DMTCP can't restore TCP connections, pending signals, zombies,
> signalfd, file locks, epoll, etc.