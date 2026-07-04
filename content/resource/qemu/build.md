---
title: QEMU build system architecture
date: 2026-06-24
tags:
  - virtual-machine
  - qemu
---
We can build outside of QEMU source tree or subdir
### Outside
```bash
cd ../
mkdir build
cd build
../qemu/configure
make
```
### Subdir
```bash
mkdir build
cd build
../configure
make
```
## Configure script
- detect the host architecture
- list the targets for which to build emulators (also affects which fireware binaries and tests to build)
- find the compilers: the results are written as either Makefile fragments (`config-host.mak`) or a Meson machine file (`config-meson.cross`)
- create a virtual env in which Python code runs during the build
- invoke Meson in the virtual env, to perform the actual configuration step for the emulator build
**Almost all QEMU developers that need to modify the build system will only be concerned with Meson, If we need to change the `configure` script, look the [doc](https://www.qemu.org/docs/master/devel/build-system.html#modifying-configure)**

## Meson
The meson build system describes the build and install process for :

> 1. executables, which include
>    - Tools -qemu-img, qemu-bnd, qemu-ga, etc
>    - System emulators - qemu-system-$ARCH
>    - Userspace emulators - qemu-$ARCH
>    - Unit tests
> 2. doc
> 3. ROMs
> 4. other data files, such as icons or desktop files


### Sourcesets
#### `Subsystem sourcesets`
**Common to both tools and emulators**

for example, `block_ss` for the block device subsystem, `chardev_ss` for the character device subsystem, etc. These sourcesets are then turned in to static libraries as follow:
```meson
libchardev = static_library('chardev', chardev_ss.sources(), build_by_default: false)
chardev = declare_dependency(objects: libchardev.extract_all_objects(recursive: false), dependencies: chardev_ss.dependencies())
```

#### `Target-independent emulator sourcesets`
**General purpose helper code is compiled only once, and the .o file are linked into all output binaries that need it.**

- error handling infrastructure
- standard data structures
- platform portability wrapper functions.
- etc
`common_ss`, `system_ss`, `user_ss`
#### `Target-dependent emulator sourcesets`
**CPU emulation, some device emulation, and much glue code.** The sometimes also has to be compiled multiple times. `specific_ss`

Each emulators also include sources for files in the `hw/` and `target/` *subdirectories*. The subdir used for each emulator comes from the target's definition of `TARGET_BASE_ARCH` or `TARGET_ARCH`, as found in [[#`configs/targets/*.mak`]].

Each subdirectory in `hw/` adds one sourceset to the `hw_arch` dictionary, for example:
```
arm_ss = ss.source_set()
arm_ss.add(files('boot.c'), fdt)
...
hw_arch += {'arm': arm_ss}
```

**The sourceset is only used for system emulators**

Each subdirectory in `target/` instead should add one sourceset to each of the `target_arch` and `target_system_arch`, which are used respectively for all emulators and for system emulators only. For example:

```
arm_ss = ss.source_set()
arm_system_ss = ss.source_set()
...
target_arch += {'arm': arm_ss}
target_system_arch += {'arm': arm_system_ss}
```
#### `Module sourcesets`
There are two dictionaries for modules: `modules` is used for *target-independent modules* and `target_modules` is used for *target-dependent modules*. When modules are disabled the `module` source sets are added to `system_ss` and the `target_modules` source sets are added to `specific_ss`.

Both dictionaries are nested. One dictionary is created per subdirectory, and these per-subdirectory dictionaries are added to the toplevel dictionaries. For example:
```
hw_display_modules = {}
qxl_ss = ss.source_set()
...
hw_display_modules += { 'qxl': qxl_ss }
modules += { 'hw-display': hw_display_modules }
```
#### `Utility sourcesets`
**All binaries link with a static library `libqemuutil.a`. This library is built from several sourcesets; most of them however host generated code, and the only two of general interest are `util_ss` and `stub_ss`.**

### definition files

#### `configs/devices/*.mak`

Control the boards and devices that are built into each QEMU system emulation targets. The merely contain a list of config variable definitions such as 
```
include arm-softmmu.mak
CONFIG_XLNX_ZYNQMP_ARM=y
CONFIG_XLNX_VERSAL=y
```

#### [[resource/qemu/QEMU_and_Kconfig|*/Kconfig]]

#### `configs/targets/*.mak`

These files mostly define symbols that appear in the `*-config-target.h` file for each emulator. However, the `TARGET_ARCH` and `TARGET_BASE_ARCH` will also be used to select the `hw/` and `target/` subdirectories that are compiled into each target.


### [Add checks](https://www.qemu.org/docs/master/devel/build-system.html#adding-checks)

## Make
The Makefile wraps both Ninja and the smaller build systems for firmware and tests.

## Import files for the build system
- Makefile
  main entry point
- `*/meson.build`
- `python/scripts/mkvenv.py`
  A wrapper for the Python env and distlib.scripts packages.
- `test/Makefile.include`
  Rules for external test harnesses like the TCG tests
- `test/docker/Makefile.include`
  Rules for the Docker tests
- `test/vm/Makefile.include`
  Rules for the VM-based tests.

### Dynamically created files
#### Built by configure:
- run
- config-host.mak
- config-meson.cross
- config.status
- Makefile.prereqs
- `pc-bios/*/config.mak, tests/tcg/config-host.mak, tests/tcg/*/config-target.mak`
- pyvenv
#### Built by Meson
- config-host.h
  Used by C code to determine the properties of the build environment and the set of enabled features for the entire build.
- `${TARGET-NAME}-config-device.mak`
  generated by Meson using files under `configs/devices`
- `${TARGET-NAME}-config-target.mak`
  generated by Meson using files under `configs/targets`
- `${TARGET_NAME}-config-target.h, ${TARGET_NAME}-config-devices.h`
  Used by C code to determine the properties and enabled features for each target. They are generated from the contents of the corresponding `*.mak` files using Meson’s `configure_file()` function
- build.ninja
#### Built by Makefile
- Makefile.ninja
- Makefile.mtest