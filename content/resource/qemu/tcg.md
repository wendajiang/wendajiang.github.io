---
title: TCG(Tiny Code Generator)
date: 2026-07-04
tags:
  - qemu
---
QEMU support multiple accel (accelerator, determine how the vCPU to exec)
- simulator (TCG)
- virtual (KVM, HVF)
We pay attention to the TCG technology.

## TCG IR
```plain
Gues  Inst
    |     
    v     
 QEMU IR  
    |     
    v     
Host inst 
```

# reference
- https://qemu.gevico.online/tutorial/2026/ch2/qemu-tcg/#tcg_1