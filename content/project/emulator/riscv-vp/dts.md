---
title: DTS (Device Tree Spec)
date: 2026-06-02
---
[DTS spec](https://github.com/devicetree-org/devicetree-specification) is on github. and [[project/emulator/riscv-vp/notes_about_dts_spec|notes_about_dts_spec]] is the read note.

[The material](https://linux-book.readthedocs.io/en/latest/driver/dts/) is great overview and introduction.

[linux and devicetree](https://docs.kernel.org/devicetree/usage-model.html) The Linux usage model for device tree data.

The “Open Firmware Device Tree”, or simply Devicetree (DT), is a data structure and language for describing hardware. More specifically, it is a description of hardware that is readable by an operating system so that the operating system doesn’t need to hard code details of the machine.

## History
An operating system used the Device Tree to discover the topology of the hardware at runtime, and thereby supported a majority of available hardware without hard coded information (assuming drivers were available for all devices).

Since Open Firmware is commonly used on PowerPC and SPARC platforms, the Linux support for those architectures has for a long time used the Device Tree. In 2005, when PowerPC Linux began a major cleanup and to merge 32-bit and 64-bit support, the decision was made to require DT support on all powerpc platforms, regardless of whether or not they used Open Firmware. To do this, a DT representation called the Flattened Device Tree (FDT) was created which could be passed to the kernel as a binary blob without requiring a real Open Firmware implementation. U-Boot, kexec, and other bootloaders were modified to support both passing a Device Tree Binary (dtb) and to modify a dtb at boot time. DT was also added to the PowerPC boot wrapper (`arch/powerpc/boot/*`) so that a dtb could be wrapped up with the kernel image to support booting existing non-DT aware firmware.

**Some time later, FDT infrastructure was generalized to be usable by all architectures. At the time of this writing, 6 mainlined architectures (arm, microblaze, mips, powerpc, sparc, and x86) and 1 out of mainline (nios) have some level of DT support.**

## Data Model

The most important thing to understand is that the DT is simply a data structure that describes the hardware. **What it does do is provide a language for decoupling the hardware configuration from the board and device driver support in the Linux kernel (or any other operating system for that matter). Using it allows board and device support to become data driven; to make setup decisions based on data passed into the kernel instead of on per-machine hard coded selections.**  Ideally, data driven platform setup should result in less code duplication and make it easier to support a wide range of hardware with a single kernel image.

Linux uses DT data for three major purposes:
1. platform identification,
2. runtime configuration, and
3. device population.




