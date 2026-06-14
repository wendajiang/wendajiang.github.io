---
title: RISC-V Virtual Prototype(VP)
---
[[pdf/hybrid/2018FDL_RISCV_VP.pdf|Original RISCV_VP]] is begin from 2018. And the official website is [1](https://agra.informatik.uni-bremen.de/projects/risc-v/).

[vp++ github](https://github.com/ics-jku/riscv-vp-plusplus) is is a extended and improved successor of the [RISC-V based Virtual Prototype (VP) github](https://github.com/agra-uni-bremen/riscv-vp) , the [[pdf/hybrid/2024OSDA_RISCV-VP-plusplus.pdf|VP-plusplus]] author is [google scholar](https://scholar.google.com/scholar?q=%22Manfred+Schl%C3%A4gl%22&hl=zh-CN&as_sdt=0,5) .

The [[pdf/hybrid/iccd20_vp_based_adaptive_simulation.pdf|iccd20_vp_based_adaptive_simulation paper]] optimize the performance of ISS, and show the speed between QEMU and RISC-V VP, if enable the JIT compiler optimization.

The VP++ author proposal the [[pdf/hybrid/2025DATE_Fast_Interpreter-based_ISS.pdf|2025DATE_Fast_Interpreter-based_ISS]] method to speed up the ISS, and up to 400 MIPS, and [[pdf/hybrid/2023GLSVLSI_GUI-VP_Kit.pdf|2023GLSVLSI_GUI-VP_Kit]] can bootup the linux kernel.

[[project/emulator/riscv-vp/dts|dts]] is needed by linux bootup.

[systemc book](https://systemc.org/resources/books/) is from systemc official website. systemc and tlm2.0 [[pdf/hybrid/IEEE 1666-2023.pdf|ieee1666-spec]]. [[project/emulator/riscv-vp/sc_sim_kernel|sc_sim_kernel]] describe the sc simulation kernel.

[plic](https://docs.riscv.org/reference/plic/_attachments/riscv-plic.pdf) is the official pdf, and the [link](https://github.com/torvalds/linux/blob/5bfc75d92efd494db37f5c4c173d3639d4772966/Documentation/devicetree/bindings/interrupt-controller/sifive%2Cplic-1.0.0.yaml) is the linux kernel document about dts of sifive plic.

[fu540-c000](https://static.dev.sifive.com/FU540-C000-v1.0.pdf) is the world's first 64-bit risc-v SoC, capable of supportting full-featured OS, like Linux. And riscv doc is [here](https://docs.riscv.org/reference/home/index.html). ISA reset is in The RISC-V Instruction Set Manual, Volume II: Privileged Architecture 3.4 chapter.

