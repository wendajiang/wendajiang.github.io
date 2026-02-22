---
title: Understanding Linker
date: 2024-12-25 14:20:00
tags:
  - compiler
  - link
---
The linker script, provided to Clang as `-Wl,-T,foo.ld` is like a template for the final executable. It tells the linker how to organize code from the input objects. This permits extremely precise control over the toolchain' output.

Everything in this blog can be found in detail in [GNU ld's documentation](https://sourceware.org/binutils/docs/ld/index.html). `lld` accepts basically the same syntax. There's no spec, just what your linker happens to accept.


# What is a linker ?
A linker is but a small part of a `toolchain`, the low-level programmer's toolbox: everything you need to go from source code to execution.

1. compiler
2. assembler
3. linker 
This three( or two, if you do compiler/assemble in one step) phase process is sometimes called the **C complication model**. All modern software build infrastructure is built around this model.

The toolchain also provides various debugging tools, including an interactive debugger, and tools for manipulating object files, such as `nm, objdump, objcpy and ar`.

### Final Link
Some fifty years ago at Bell Labs, someone really wanted to write a program with more than one `.s` file. To solve this, a program that could “link” symbol references across object files was written: the first linker.

You can take several `.o` files and use `ar` (an archaic `tar`, basically) to create a library, which always have names like `libfoo.a` (the `lib` is mandatory). A static library is just a collection of objects, which can be provided on an as-needed basis to the linker.

The “final link” incorporates several `.o` files and `.a` files to produce an executable. It does roughly the following:
1. Parse all the objects and static libraries and put their *symbols* into a database. Symbols are named addresses of functions and global variables.
2. Search for all unresolved symbol references in the `.o` files and match it up with a symbol from the database, recursively doing this for any code in a `.a` referenced during this process. This forms a sort of dependency graph between sections. This step is called *symbol resolution*.
3. Throw out any code that isn't referenced by the input files by tracing the dependency graph from the entry-point symbol (e.g. `__start` on Linux). This step is called *garbage collection*.
4. Execute the linker script to figure out how to stitch the final binary together. This includes discovering the offsets at which everything will go.
5. Resolve *relocations*, "holes" in the binary that require knowing the final runtime address of the section. Relocations are instructions placed in the object file for the linker to execute.
6. Write out the completed binary.
This process is extremely memory-intensive; it is possible for colossal binaries, especially ones with tons of debug information, to "fail to link" because the linker exhausts the system's memory.

We only care about step4: whole books can be written about the previous steps. Ian Lance Taylor, mad linker scientist and author of `gold`, has written several excellent words on [LWN](https://lwn.net/Articles/276782/)

# Object files and sections
Linkers, fundamentally, consume object files and produce object files; the output is executable, meaning that all relocations have been resolved and an entry-point address(where the OS/bootloader will jump to start the binary).

It's useful to be able to peek into object files. The `objdump` utility is best for this. `objdump -x my_object.o` will show `all` headers, telling you what exactly is in it.

At a high level, an object file describes how a program should be loaded into memory. The object is divided into sections, which are named blocks of data. Section may have file-like permissions, such as allocatable, loadable, readonly, and executable. `objdump -h` can be used to show the list of sections. 
```terminal
$ objdump -h "$(which clang)"
/usr/bin/clang:     file format elf64-x86-64

Sections:
Idx Name    Size      VMA       LMA       File off  Algn
 11 .init   00000017  00691ab8  00691ab8  00291ab8  2**2
            CONTENTS, ALLOC, LOAD, READONLY, CODE
 12 .plt    00006bb0  00691ad0  00691ad0  00291ad0  2**4
            CONTENTS, ALLOC, LOAD, READONLY, CODE
 13 .text   0165e861  00698680  00698680  00298680  2**4
            CONTENTS, ALLOC, LOAD, READONLY, CODE
 14 .fini   00000009  01cf6ee4  01cf6ee4  018f6ee4  2**2
            CONTENTS, ALLOC, LOAD, READONLY, CODE
 15 .rodata 0018ec68  01cf6ef0  01cf6ef0  018f6ef0  2**4
            CONTENTS, ALLOC, LOAD, READONLY, DATA
 24 .data   000024e8  021cd5d0  021cd5d0  01dcc5d0  2**4
            CONTENTS, ALLOC, LOAD, DATA
 26 .bss    00009d21  021cfac0  021cfac0  01dceab8  2**4
            ALLOC
```
Allocatable (`ALLOC`) sections must be *allocated* space by the operating system, if the section is loadable(`LOAD`), then the operating system must further fill that space with the contents of the sections. This process is called *loading* and is performed by a *loader* program. The loader is sometimes called the "dynamic linker", and is often the same program as the "program linker", this is why the linker is called `ld`.

Some common (POSIX) sections include:
- `.text` where your code lives. It's usually a loadable, readonly, executable section
- `.data` contains the initial values of global variables. It's loadable.
- `.rodata` contains constants. It's loadable and readonly.
- `.bss` is any empty allocatable section. C specifies that uninitialized globals default to zero, this is a convenient way for avoiding storing a huge block of zeros in the executable!
- Debug sections that not loaded or allocated, these are usually removed for release builds.

After the linker decides which sections from the `.o` and `.a` inputs to keep(based on which symbols it decided it needed), it looks to the linker script how to arrange them in the output.

Let's write our first linker script.
```linker 
SECTIONS {
	/* define an output sections ".text" */
	.text : {
		/* pull in all symbols in input sections named .text */
		*(.text)
		/* do the same for sections starting with .text, such as .text.foo */
		*(.text.*)
	}
	.bss : { *(.bss); *(.bss.*) }
	.data: { *(.data); *(.data.*) }
	.rodata: { *(.rodata); *(.rodata.*); }
}
```
This tells the linker to create a `.text` section in the output, which contains all sections named `.text` from all inputs, plus all sections with names like `.text.foo`. The content of the section is laid out in order: the contents of all `.text` sections will come before any `.text.*`, i don't think the linker makes any promises about the ordering between different objects.

## LMA and VMA
Every section has three addresses associated with it. The simplest is the file offset: how far from the start of the file to find the section.

The *virtual memory address*, or VMA, is where the program expects to find the section at runtime. This is the address that is used by pointers and the program counter.

The *load memory address*, or LMA, is where the loader (be it a runtime loader or `objcpy`) must place the code. This is almost always the same as the VMA. Later on, in [[#Using Symbols and LMA]], we will explain a place where this is actually useful.

When declaring a new section, the VMA and LMA are both set to the value of the *location counter*, which has the *extremely* descriptive name. This counter is automatically incremented as data is copied from the input.

We can explicitly specify the VMA of a section by putting an expression before the colon, and the LMA by putting  an expression in the `AT(lma)` specifier *after* the colon:
```cpp
SECTIONS {
  .text 0x10008000: AT(0x40008000) {
    /* ... */
  }
}
```
This will modify the location counter, you could also write it as :
```cpp
SECTIONS {
  . = 0x10008000;
  .text : AT(0x40008000) {
    /* ... */
  }
}
```
within `SECTIONS`, the location counter can be set at any point, even while in the middle of declaring a section (though the linker will probably complain if you do something rude like move it backwards).

The location counter is incremented automatically as sections are added, so it's rarely necessary to fuss with it directly.

## Memory regions and section allocation
By default, the linker will simply allocate sections starting at address `0`. The `MEMORY` statement can be used to define *memory regions* for more finely controlling how VMAs and LMAs are allocated without write them down explicitly.

A classic example of a `MEMORY` block separates the address space into ROM and RAM:

```cpp
MEMORY {
  rom (rx)   : ORIGIN = 0x8000,     LENGTH = 16K
  ram (rw!x) : ORIGIN = 0x10000000, LENGTH = 256M
}
```

A region is a block of memory with a name and some attributes. The name is irrelevant beyond the scope of the linker script. The attributes in parens are used to specify what sections could conceivably go in that region. A section is compatible if it has any of the attributes before the `!`, and none which come after the `!`. (This filter mini-language isn’t very expressive.)

The attributes are the ones we mentioned earlier: `rwxal` are readonly, read/write, executable, allocated, and loadable.

When allocating a section a VMA, the linker will try to pick the best memory region that matches the filter using a heuristic. I don’t really trust the heuristic, but you can instead write `> region` to put something into a specific region. Thus,

```cpp
SECTION {
  .data {
    /* ... */
  } > ram AT> rom
}
```

`AT>` is the “obvious” of `AT()` and `>`, and sets which region to allocate the LMA from.

The origin and length of a region can be obtained with the `ORIGIN(region)` and `LENGTH(region)` functions.

## Other Stuff to put in sections 
Output sections can hold more than just input sections. Arbitrary data can be placed into sections using the `BYTE, SHORT, LONG and QUA` for placing literal 8, 16, 32, and 64-bit unsigned integers into the section:
```cpp
SECTIONS {
	.screams_internally: { LONG(0xaaaaaaaa) }
}
```
Numeric literals in linker script may, conveniently, be given the suffixes `K` or `M` to specify a kilobyte or megabyte quantity. E.g. `4K` is sugar for `4096`

### Fill 
You can fill the unused portions of a section by using the `FILL` command, which sets the "fill pattern" from that point onward. For example, we can create four kilobytes of `0xaa` using `FILL` and the location counter. 
```cpp
SECTIONS {
	.scream_page: {
		FILL(0xaa)
		. += 4K;
	}
}
```
The "fill pattern" is used to fill any unspecified space, such as alignment padding or jumping around with the location counter. We can use multiple FILLs to vary the fill pattern, such as if we wanted half the page to be `0x0a` and half `0xa0`.
```cpp
SECTIONS {
	.scream_page : {
		FILL(0x0a)
		. += 2K;
		FILL(0xa0)
		. += 2K;
	}
}
```
When using one fill pattern for the whole section, you can just write = fill; at the end of the section. For example 
```cpp
SECTIONS {
	.scream_page : {
		. += 4K;
	} = 0xaa;
}
```
### Linker symbols 
Although the linker needs to resolve all symbols using the input `.o` and `.a` files, you can also declare symbols directly in linker script; this is the absolute latest that symbols can be provided. For example:
```cpp
SECTIONS {
	my_cool_symbol = 5;
}
```
This will define a new symbol with value `5`. If we then wrote `extern char my_cool_symbol;` we can access the value placed by the linker. However, note that the value of a symbol is an *address*. If you did 
```cpp
extern char my_cool_symbol;
uintptr_t get() {
	return my_cool_symbol;
}
```
The processor would be very confused about why you just dereferenced a pointer with address `5`. The *correct* way to extract a linker symbol's value is to write 
```cpp
extern char my_cool_symbol;
uintptr_t get() {
	return (uintptr_t)&my_cool_symbol;
}
```
It seems a bit silly to take the address of the global and use that as some kind of magic value, but that's just how it works. The exact same mechanism works in Rust, too:
```rust 
fn get() -> usize {
	extern "C" {
		#[link_name = "my_coll_symbol"]
		static SYM: u8;
	}
	addr_of!(SYM) as usize 
}
```
The most common use of this mechanism is percolating not known until link time. For example, common idiom is 
```cpp
SECTIONS {
	.text : {
		__text_start = .;
		/* stuff */
		__text_end = .;
	}
}
```
This allows initialization code to find the section's address and length; in this case, the pointer values are actually meaningful!

Symbol assignments can even go inside of a section, to capture the location counter’s value between input sections:

```cpp
SECTIONS {
  .text : {
    *(.text)
    text_middle = .;
    *(.text.*)
  }
}
```
Symbol names are not limited to C identifiers, and may contain dashes, periods, dollar signs, and other symbols. They may even be quoted, like `"this symbol has spaces"`, which C will never be able to access as an `extern`.

There is a mini-language of expressions that symbols can be assigned to. This includes:

- Numeric literals like `42`, `0xaa`, and `4K`.
- The location counter, `.`.
- Other symbols.
- The usual set of C operators, such as arithmetic and bit operations. Xor is curiously missing.
- A handful of builtin functions, described below.
There are some fairly complicated rules around how symbols may be given relative addresses to the start of a section, which are only relevant when dealing with position-independent code: [https://sourceware.org/binutils/docs/ld/Expression-Section.html](https://sourceware.org/binutils/docs/ld/Expression-Section.html)

Functions belong to one of two board categories: getters for properties of sections, memory regions, and other linker structures; and arithmetic. Useful functions include:

- `ADDR`, `LOADADDR`, `SIZEOF`, and `ALIGNOF`, which produce the VMA, LMA, size, and alignment of a previously defined section.
- `ORIGIN` and `LENGTH`, which produce the start address and length of a memory region.
- `MAX`, `MIN` are obvious; `LOG2CEIL` computes the base-2 log, rounded up.
- `ALIGN(expr, align)` rounds `expr` to the next multiple of `align`. `ALIGN(align)` is roughly equivalent to `ALIGN(., align)` with some subtleties around PIC. `. = ALIGN(align);` will align the location counter to `align`.

Some other builtins can be found at [https://sourceware.org/binutils/docs/ld/Builtin-Functions.html](https://sourceware.org/binutils/docs/ld/Builtin-Functions.html).

A symbol definition can be wrapped in the `PROVIDEO()` function to make it “weak”, analogous to the “weak symbol” feature found in Clang. This means that the linker will not use the definition if any input object defines it.
## Using Symbols and LMA
As mentioned before, it is extremely rare for the LMA and VMA to be different. The most common situation where this occurs is when you’re running on a system, like a microcontroller, where memory is partitioned into two pieces: ROM and RAM. The ROM has the executable burned into it, and RAM starts out full of random garbage.

Most of the contents of the linked executable are read-only, so their VMA can be in ROM. However, the `.data` and `.bss` sections need to lie in RAM, because they’re writable. For `.bss` this is easy, because it doesn’t have loadable content. For `.data`, though, we need to separate the VMA and LMA: the VMA must go in RAM, and the LMA in ROM.

This distinction is important for the code that initializes the RAM: while for `.bss` all it has to do is zero it, for `.data`, it has to copy from ROM to RAM! The LMA lets us distinguish the copy source and the copy destination.

This has the important property that it tells the loader (usually `objcopy` in this case) to use the ROM addresses for actually loading the section to, but to link the code as if it were at a RAM address (which is needed for things like PC-relative loads to work correctly).

Here’s how we’d do it in linker script:
```cpp
MEMORY {
  rom : /* ... */
  ram : /* ... */
}

SECTIONS {
  /* .text and .rodata just go straight into the ROM. We don't need
     to mutate them ever. */
  .text : { *(.text) } > rom
  .rodata : { *(.rodata) } > rom

  /* .bss doesn't have any "loadable" content, so it goes straight
     into RAM. We could include `AT> rom`, but because the sections
     have no content, it doesn't matter. */
  .bss : { *(.bss) } > ram

  /* As described above, we need to get a RAM VMA but a ROM LMA;
     the > and AT> operators achieve this. */
  .data : { *(.data) } > ram AT> rom
}

/* The initialization code will need some symbols to know how to
   zero the .bss and copy the initial .data values. We can use the
   functions from the previous section for this! */

bss_start = ADDR(.bss);
bss_end = bss_start + SIZEOF(.bss);

data_start = ADDR(.data);
data_end = data_start + SIZEOF(.data);

rom_data_start = LOADADDR(.data);
```
Although we would normally write the initialization code in assembly (since it's undefined behavior to execute C before initializing the `.bss` and `.data` sections), I've written it in C for illustrative purposes:
```c
#include <string.h>

extern char bss_start[];
extern char bss_end[];
extern char data_start[];
extern char data_end[];
extern char rom_data_start[];

void init_sections(void) {
  // Zero the .bss.
  memset(bss_start, 0, bss_end - bss_start);

  // Copy the .data values from ROM to RAM.
  memcpy(data_start, rom_data_start, data_end - data_start);
}
```

## Misc Linker Script Features

Linker script includes a bunch of other commands that don’t fit into a specific category:

- `ENTRY()` sets the program entry-point, either as a symbol or a raw address. The `-e` flag can be used to override it. The `ld` docs assert that there are fallbacks if an entry-point can’t be found, but in my experience you can sometimes get errors here. `ENTRY(_start)` would use the `_start` symbol, for example.
- `INCLUDE "path/to/file.ld"` is `#include` but for linker script.
- `INPUT(foo.o)` will add `foo.o` as a linker input, as if it was passed at the commandline. `GROUP` is similar, but with the semantics of `--start-group`.
- `OUTPUT()` overrides the usual `a.out` default output name.
- `ASSERT()` provides static assertions.
- `EXTERN(sym)` causes the linker to behave as if an undefined reference to `sym` existed in an input object.

(Other commands are documented, but I’ve never needed them in practice.)

## Real Linker Scripts

It may be useful to look at some real-life linker scripts.

If you wanna see what Clang, Rust, and the like all ultimately use, run `ld --verbose`. This will print the default linker script for your machine; this is a really intense script that uses basically every feature available in linker script (and, since it’s GNU, is very poorly formatted).

The Linux kernel also has linker scripts, which are differently intense, because they use the C preprocessor. For example, the one for amd64: [https://github.com/torvalds/linux/blob/master/arch/x86/kernel/vmlinux.lds.S](https://github.com/torvalds/linux/blob/master/arch/x86/kernel/vmlinux.lds.S).

Tock OS, a secure operating system written in Rust, has some pretty solid linker scripts, with lots of comments: [tock os kernel layout ld script](https://github.com/tock/tock/blob/b842f654ff62efc42d6608c4cb86269cee95e1c5/boards/build_scripts/tock_kernel_layout.ld#L47). I recommend taking a look to see what a “real” but not too wild linker script looks like. There’s a fair bit of toolchain-specific stuff in there, too, that should give you an idea of what to expect.

Happy linking!