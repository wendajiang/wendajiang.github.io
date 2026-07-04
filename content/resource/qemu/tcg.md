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
Guest  Inst
    |     
    v     
 QEMU IR  
    |     
    v     
Host inst 
```
- decode: pick up the `rd` `rs1` `rs2` filed, pattern specific instrucment
- translate: call `trans_add()` function, generate TCG IR
- exec: TCG backend translate IR to host instrument and exec

Decodetree is glue  between step one and step two:

```
guest instn (32-bit binary)
     |
     v
decode_insn32()     // decodetree.py generated
   1. match bit (bitmask): determine which instn
   2. pick up field: fill the arg struct
   3. call trans_xxx(ctx, arg_xxx *a)
     |
     v
trans_add(ctx, arg_r *a) // developer writed function
	read rs1, rs2 -> generate TCG add op -> write back rs
	 |
	 v
TCG backend compile to host instn and exec 
```

```platin
+----------------+           +---------------+            +-----------------------+
| target/arch/   |  input    | scripts/      |  output    | decode-@BASENAME@     |
| insn32.decode  +---------->| decodetree.py +----------->|     .c.inc            |
+----------------+           +---------------+            +-----------------------+
```
# reference
- https://qemu.gevico.online/tutorial/2026/ch2/qemu-tcg/#tcg_1
- https://www.qemu.org/docs/master/devel/decodetree.html