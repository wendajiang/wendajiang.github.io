---
title: Memory ordering at Compile time
tags:
  - lock-free
date: 2025-2-9
---
Between the time you type in some C/C++ source code and the time it executes on a CPU, the memory interactions of that code may be reordered according to certain rules. Changes to memory reordering are made both by the **compiler(at compile time)** and by the **processor(at run time)**, all in the name of making your code run faster. 

The cardinal rule of memory reordering, which is universally followed by compiler developers and CPU vendors, could be phrased as follows:

> Thou shalt not modify the behavior of a single-threaded program.

As a result of this rule, memory reordering goes largely unnoticed by programmers writing single-threaded code.  It often goes unnoticed in multithreaded programming, too, since mutexes, semaphores and events are all designed to prevent memory reordering around their call sites. It’s only when lock-free techniques are used – when memory is shared between threads without any kind of mutual exclusion.

Mind you, it is possible to write lock-free code for multicore platforms without the hassles of memory reordering. As I mentioned in my [[blog/lock_free|introduction to lock-free programming]], one can take advantage of sequentially consistent types, such as `volatile` variables in Java or C++11 atomics – possibly at the price of a little performance. I won’t go into detail about those here. In this post, I’ll focus on the impact of the compiler on memory ordering for regular, non-sequentially-consistent types.

# Compiler Instruction reordering 
As you know, the job of a compiler is to convert human-readable source code into machine-readable code for the CPU. During this conversion, the compiler is free to take many liberties.

Once such liberty is the reordering of instructions – again, only in cases where single-threaded program behavior does not change. Such instruction reordering typically happens only when compiler optimizations are enabled. Consider the following function:
```cpp
int A, B;
void foo() {
	A = B + 1;
	B = 0;
}
```
If we compile this function using GCC 4.6.1 without compiler optimization, it generates the following machine code, which we can view as an assembly listing using the `-S` options. The memory store to global variable `B` occurs right after the store to `A`.

Compare that to the resulting assembly when using `-O2`, the compiler reordered the store to `B` before the store to `A`. A single-threaded program would never know the difference.

On the other hand, such compiler reorderings can cause problems when writing lock-free code. Here’s a commonly-cited example, where a shared flag is used to indicate that some other shared data has been published:

```cpp
int value;
int is_published = 0;
void send_value(int x) {
	value = x;
	is_published = 1;
}
```

Image what would happen if the compiler reordered the store to `is_published` before the store to `value`. Even on a single-processor system, we'd have a problem: a thread could very well be pre-empted by the operating system between the two stores, leaving other threads to believe that `value` has been updated when in fact, it hasn't.

## Explicit compiler barriers 

The minimalist approach to preventing compiler reordering is by using a special directive known as a compiler barrier.
```cpp
int A, B;

void foo()
{
    A = B + 1;
    asm volatile("" ::: "memory");
    B = 0;
}

// ----
#define COMPILER_BARRIER() asm volatile("" ::: "memory")

int Value;
int IsPublished = 0;

void sendValue(int x)
{
    Value = x;
    COMPILER_BARRIER();          // prevent reordering of stores
    IsPublished = 1;
}

int tryRecvValue()
{
    if (IsPublished)
    {
        COMPILER_BARRIER();      // prevent reordering of loads
        return Value;
    }
    return -1;  // or some other value to mean not yet received
}
```

Compiler barriers are sufficient to prevent memory reordering on a **single-processor system**. But it’s 2012, and these days, **multicore computing is the norm**. A compiler barrier is not enough on any CPU architecture. We need either to issue a CPU fence instruction.


## Implied compiler barriers 

In the new C++11 atomic library standard, every non-relaxed atomic operation acts as a compiler barrier as well.
```cpp
int value;
std::atomic<int> is_published(0);
void send_value(int x) {
	value = x;
	is_published.store(1, std::memory_order_release);
}
```
