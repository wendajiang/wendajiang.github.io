---
title: "Solution : VP++ and Emu platform"
date: 2026-06-02
---
1. 需要支持 VP 将地址空间定制化，可配置，通过 xtor 连接 VP 和 Emu (S <-> H)
2. 是否需要用户自行定制 DTS，并编译 dtb 

PLIC doc is [[pdf/hybrid/riscv-plic.pdf|here]]. 

[[project/emulator/riscv-vp/dlopen_cpp_class|dlopen and cpp class]] is a problem about how to use dlopen to load cpp class symbol, as dlsym only support load variable and function in c style.

As we must use the QEMU to simu the T-head RISC-V CPU, [[project/emulator/qbox|qbox]] is one solution about integrating QEMU with SystemC.


