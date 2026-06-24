---
title: QEMU and Kconfig
tags:
  - qemu
date: 2026-06-24
---
**QEMU is a very versatile emulator; it can be built for a variety of targets, where each target can emulate various boards and at the same time different targets can share large amounts of code.**

Each QEMU target enables a subset of the boards, devices and buses that are included in QEMU’s source code. As a result, each QEMU executable only links a small subset of the files that form QEMU’s source code; anything that is not needed to support a particular target is culled.

QEMU uses a simple domain-specific language to describe the dependencies between components. This is useful for two reasons:
- new targets and boards can be added without knowing in detail the architecture of the hard ware emulation subsystems.
- users can easily build reduced versions of QEMU that support only a subset of boards and devices

The domain-specific language is based on the Kconfig language that originated in the Kernel kernel, though it was heavily simplified and the handling of depedencies is stricter in QEMU.

## The Kconfig language
Kconfig defines configurable components in files named `hw/*/Kconfig`. **Note that configurable components are not visible in C code, they are only visible in the Makefile.** Each configurable component defines a Makefile variable whose names starts with `CONFIG_`.

```bash
config ARM_VIRT
	bool
	imply PCI_DEVICES
	select A15MPCORE
	select ACPI
	select ARM_SUMMUV3
```
`config` keyword introduces `CONFIG_ARM_VIRT`. After `bool` the following directives can be included:
- dependencies: `depends on <expr>`
- reverse dependencies: `select <symbol> [if <expr>]`
- default value: `defalut <value> [if <expr>]`
- reverse default(weak reverse dependency): `imply <symbol> [if <expr>]`

example:
```
config FOO
	select BAZ # CONFIG_BAZ will be true whenever CONFIG_FOO is true
	
	
config FOO
  bool
  imply BAZ

config BAZ
  bool
  default y if FOO
# Above config are equalvalent
```


