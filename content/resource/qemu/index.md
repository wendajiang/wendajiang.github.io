---
title: QEMU information hub
date: 2026-06-19
---
[qemu wiki](https://wiki.qemu.org/Documentation) is another platform to simulate the risc-v ISA cpu. Its official webset [1](https://www.qemu.org/).
- [[resource/qemu/build|QEMU build]]

[Fabrice Bellard](https://bellard.org/) is the author, and he also dev ffmpeg. 

[This code review blog](https://connect.ed-diamond.com/GNU-Linux-Magazine/GLMF-147/Qemu-Visite-au-caeur-de-l-emulateur) is great blog but is french, I need google translate.

[学习资料的 blog](https://martins3.github.io/learn-virtualization.html)  [qemu-internal blog series](https://airbus-seclab.github.io/qemu_blog/) 

[内核虚拟化相关的 bloger](https://martins3.github.io/)

qemu 系统中文学习资料（泽文）
- https://zevorn.cn/
- https://www.bilibili.com/video/BV13FrxYNEND?spm_id_from=333.788.videopod.sections&vd_source=bca5aac95ba1ac296e437bcb3303e1f3
- https://qemu.gevico.online/tutorial/2026/ch1/vm-history/

QEMU 严重依赖 [Glib](https://docs.gtk.org/glib/)，基础数据比如 List HashTable 实用 Glib 提供，核心 [main_loop](https://docs.gtk.org/glib/struct.MainLoop.html) 实用 Glib 提供的 event listener 框架

[good overview from coder view](https://martins3.github.io/qemu/introduction.html) 