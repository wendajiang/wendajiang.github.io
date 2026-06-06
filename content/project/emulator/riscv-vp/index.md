---
title: RISC-V Virtual Prototype(VP)
---
[[pdf/hybrid/2018FDL_RISCV_VP.pdf|Original RISCV_VP]] is begin from 2018. And the official website is [1](https://agra.informatik.uni-bremen.de/projects/risc-v/).

[vp++ github](https://github.com/ics-jku/riscv-vp-plusplus) is is a extended and improved successor of the [RISC-V based Virtual Prototype (VP) github](https://github.com/agra-uni-bremen/riscv-vp) , the [[pdf/hybrid/2024OSDA_RISCV-VP-plusplus.pdf|VP-plusplus]] author is [google scholar](https://scholar.google.com/scholar?q=%22Manfred+Schl%C3%A4gl%22&hl=zh-CN&as_sdt=0,5) .

The [[pdf/hybrid/iccd20_vp_based_adaptive_simulation.pdf|iccd20_vp_based_adaptive_simulation paper]] optimize the performance of ISS, and show the speed between QEMU and RISC-V VP, if enable the JIT compiler optimization.

The VP++ author proposal the [[pdf/hybrid/2025DATE_Fast_Interpreter-based_ISS.pdf|2025DATE_Fast_Interpreter-based_ISS]] method to speed up the ISS, and up to 400 MIPS, and [[pdf/hybrid/2023GLSVLSI_GUI-VP_Kit.pdf|2023GLSVLSI_GUI-VP_Kit]] can bootup the linux kernel.

[[project/emulator/riscv-vp/dts|dts]] is needed by linux bootup.

[systemc book](https://systemc.org/resources/books/) is from systemc official website. systemc and tlm2.0 [[pdf/hybrid/IEEE 1666-2023.pdf|spec]]. 