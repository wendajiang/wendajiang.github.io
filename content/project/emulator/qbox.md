---
title: QBOX
date: 2026-07-15
tags:
  - qemu
  - systemc
---
Qbox use [[area/blog/cmake_cpm|CPM]] to manage the project dependencies.

Qbox builds on a layered architecture in which **libqemu** exposes QEMU as a library, **libqemu-cxx** provides a C++ abstraction, and **libqbox** integrates QEMU as a SystemC TLM-2.0 component. Using this approach, QEMU can be instantiated like any other SystemC module and integrated into a larger virtual platform via standard TLM interfaces. *Treating QEMU as a TLM component keeps the rest of the platform clean and modular.*

Integrating QEMU into a SystemC virtual platform using libqemu and qbox is feasible and effective. The main issue we encountered is not technical, but organizational: **libqemu is not part of the official QEMU releases**.
# reference
-  [qbox github](https://github.com/qualcomm/qbox)
- [qualcomm qemu](https://github.com/qualcomm/qemu)
- [qemu in systemc reason and qbox intro](https://www.minres.com/integrating-qemu-in-systemc-virtual-platforms/)