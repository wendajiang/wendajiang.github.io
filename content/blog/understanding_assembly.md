---
title: Unserstanding Assembly
date: 2024-12-25
tags:
  - compiler
  - assembly
---
Assembly language, the "lowest-level" programming language on any computer, has a similar reputation: difficult, mysterious, and beyond understanding.

`addi a1, a0, 10` is a simple line of assembly: it describes a single instruction in text form. Assembly language is "just" a textual representation of the program's machine code.

# On Architectures
There isn't "an" assembly language. Every computer has a different instruction set architecture, or "ISA". Each ISA has a corresponding assembly language that describes that ISA's specific instructions, but they all generally have similar overall structure.

It's actually very rare to write actual assembly. Thanks to modern (relatively) languages like Rust, C++ and Go, and even things like Haskell and JavaScript, virtual no programmers need to write assembly anymore.

But that's only because it's the leading language written by computers themselves (compiler). A compiler's job is, fundamentally, to write the assembly you would have had to write for you. To better understand what is compiler is doing for you, you need to be able to read its output.

It's worth looking at [[blog/linker_script_you_should_know|the C compilation model]].

# Diving in
```c
#include <stdio.h>

int square_and_print(int x) {
    x *= x;
    printf("%d\n", x);
    return x;
}
```
`clang -S square.c` command would output :
```assembly
.text
        .file   "square.c"
        .globl  square_and_print
square_and_print:
		// This is the function prologue, which "sets up" the 
		// function: it allocates stack space and saves the return address,
		// along with other calling-convention fussiness
        addi    sp, sp, -16
        sw      ra, 12(sp)
        sw      s0, 8(sp)

		// This is out `x *= x`, from before! Notice that the compiler 
		// rewrite this to `temp = x * x;` at some point, since the destination 
		// register is `s0`
        mul     s0, a0, a0 

		// These two instructions load the address of a string constant; this
		// pattern is specific to RISC-V
        lui     a0, %hi(.L.str)
        addi    a0, a0, %lo(.L.str)

		// This copies the multiplication result into `a1`
        mv      a1, s0

		// call to printf
        call    printf             

		// Move `s0` into `a0`, since it's the return value 
        mv      a0, s0

		// This is the function epilogue, which restores state saved
		// in the prologue and de-allocates the stack frame.
        lw      s0, 8(sp)
        lw      ra, 12(sp)
        addi    sp, sp, 16

		// We're done; return from the function 
        ret

		// This tells the assembler to place what follows in the `.rodata` 
		// section, for read-only constants like strings.
        .section        .rodata
.L.str:
        .asciz  "%d\n"
```

`.text` this tells the assembler to place all code that following in the `.text` section, where executable data goes.

- `.file` This is just metadata that tools can use to figure out how the executable was built.
- `.globl` This asks the assembler to mark `square_and_print` as an externally linkable symbol. Other files that refer to `square_and_print` will be able to find it at link time.

`square_and_print` This is a label, which gives this position in the executable a name that can be referenced. They're very similar to `goto` labels from C.

And this label content's description comment above code.

`.L.str` give our string constant a private name. By convention, .L labels are private names emitted by the compiler. 
- `.asciz` Emit an ASCII string into `.rodata` with an extra null terminator at the end: that's what the `z` stands for. 


# The Core Syntax 
All assemblers are different, but the core syntax tends to be the same. 
- Instructions, which consists of a *mnemonic* followed by some number of *operands*, such as `addi sp, sp -16` and `call printf` above. These are the text encoding of machine code.
- Labels, which consist of a symbol followed by a colon, like `square_and_print:` or `.L.str:`. These are used to let instruction operands refer to locations in the program.
- Directives, which vary wildly by assembler. GCC-style assembly like that above uses a `.directive arg, arg` syntax, as seen in `.text`, `.globl` and `.asciz`. They control the behavior of the assembler in various ways.

An assembler's purpose is to read the `.s` file and serialize it as a binary  `.o` file. It's kind of like a compiler, but it does virtually no interesting work at all, beyond knowing how to encode instructions.

Directives control how this serialization occurs (such as moving around the output cursor); instructions are emitted as-is, and labels refer to locations in the object file. 

# Type of instructions 
Available instructions tend to be motivated by providing one of three classes of functionality:
1. A Turing-complete register machine execution environment. This tends to the Turing tarpit nature of assembly: only the absolute minimum in terms of control flow and memory access is provides.
2. Efficient silicon implementation of common operations on bit strings and integers, ranging from arithmetic to cryptographic algorithms. 
3. Building a secure operating system, hosting virtual machines, and actuating hardware external to the processer, like a monitor, a keyword, or speakers.

Instructions can be broadly classified into four categories: arithmetic memory, control flow, and "everything else". In the last thirty years, the bar for general purpose architectures is usually "this is enough to implement a C runtime".

## Arithmetic instructions 
addition, subtractions, bitwise, or, nor, as well as unary not and negation 

Multiplication and division are somewhat rarer, because they are expensive to implement in silicon: smaller devices don't have them. Division in particular is very complex to implement in silicon. Instructions sets usually have different behavior around division by zero: some architectures will fault, similar to a memory error, while some, like RISC-V, produce a well-defined trap value.

copy instruction that move the value of one register to another, which is kind of like trivial arithmetic instruction.

Some architectures also offer more exotic arithmetic. This is just a sampler of what's sometimes available:
- bit rotation
- byte reversal
- bit extraction
- carry-less multiplication. This is used to implement Galois/Counter mode encryption.
- fused instructions, like `xnor` and `nand`
- floating point instructions, usually implementing the IEEE 754 standard.

## Memory instruction
load, fetch memory from RAM into register, while store, write it back.

These instructions frequently have an alignment constraint: the pointer value must (or, at least, should) be divisible by the number of bytes being loaded.

This category also includes instructions necessary for implementing atomics, such as `lock cmpxchg` on x86 and `lr/sc` on RISC-V. Atomics are fundamentally about changing the semantics of reading and writing from RAM, and thus require special processor support.

## Control flow instructions
**unconditional jumps** implement `goto`: given some `label`, the `j label` instruction jumps directly to it.

**conditional jumps**, often called *branches*, implement `if`. `beq a0, a1, label` will jump to `label` if `a0` and `a1` contain the same value. RISC-V provides branch instructions for all kinds of comparisons, like `bne`, `blt`, `bge`.

conditional and unconditional jumps can be used together to build loops, much like we could in C using `if` and `goto`.

## Miscellaneous instructions
"Everything else" is, well... everything else.

No-op instructions do nothing: `nop` 's  only purpose is to take up space in the instruction stream. No-op instructions can be used to pad space in the instruction stream, provide space for the linker to fix things up later, or implement `nop` sleds.

Instructions for poking processer state like, `csrrw` in RISC-V and `wrmsr` in x86 also belong in this category, as do "hinting" instructions like memory prefetches.

There are also instructions for special control flow: `ecall` is RISC-V's "syscall" instruction, which "traps" to the kernel for it to do something; other architectures have simlilar instructions.

Breakpoint instructions and "fence" instructions belong here, too.


# The calling convention
Functions are the core abstraction of all of programming. Assembly is no different: we have functions there, too!

Like in any language, functions are passed a list of arguments, perform some work, and return a value. For example, in C:

```c
int identity(int x) {
	return x;
}
...
identity(5);
```
Unfortunately, there isn't anything like function call syntax in assembly. As with everything else, we need to it instruction by instruction. All we do get in most architectures is a `call` instruction, which sets up a return address somewhere, and a `ret` instruction, which uses the return address to jump to where the function was called.

We need some way to pass arguments, return a computed value, and maintain a call stack, so that each function's return address is kept intact for its `ret` instruction to consume. We also need this to be universal: if I pull in a library, I should be able to call its functions.

This mechanism is called the **calling convention** of the platform's ABI. It's a convention, because all libraries must respect it in their exposed API for code to work correctly at runtime.


## A function call in slow-mo
At the instruction level, function calls look something like this:
1. Pre-call setup. the caller sets up the function call arguments by placing them in the appointed locations for arguments. These are usually either registers or locations on the stack. a. The caller also saves the **caller-saved registers** to the stack.
2. Jump to the function. The caller execute `call` instruction (or whatever the function call instructions might be called - virtually all architectures have one). This sets the program counter to the first instruction of the callee.
3. Function prologue. The callee does some setup before executing its code. a. The callee reserves space on the stack in an architecture-dependent manner.b. The callee saves the **callee-saved registers** to this stack space.
4. Function body. The actual code of the function runs now! This part of the function needs to make sure the return value winds up wherever the **return slot** for the functions is.
5. Function epilogue. The callee undoes whatever work it did in the prologue, such as restoring saved registers, and executes a `ret` (or equivalent) instruction to return 
6. Post-call cleanup. The caller is now executing again; it can unspill any saved state that is needs immediately after the function call, and can retrieve the return value from the return slot.
   In some ABIs, such as C++'s on Linux, this is where the destructors of the arguments get run. (Rust, and C++ on Windows, have callee-destroyed arguments instead).

When people say the function calls have overhead, this is what they mean. Not only does the `call` instruction cause the processor to slam the breaks on its pipeline, causing all kinds of work to get thrown away, but state always needs to be delicately saved and restored across the function boundary to maintain the illusion of a callstack.

## Caller-side
```assembly
lui     a0, %hi(.L.str)
addi    a0, a0, %lo(.L.str)
mv      a1, s0
call    printf
```
`lui, addi` do the work of actually putting that pointer into `a0`. the second argument `x` is passed in `a1`, copied from `s0` where it landed from the earlier `mul` instruction.

## Callee-side
Look at the `square_and_print` comments about prologue/epilogue.

# Cite
- [mcy blog](https://mcyoung.xyz/2021/11/29/assembly-1/)