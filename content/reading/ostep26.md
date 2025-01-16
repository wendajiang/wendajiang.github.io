---
title: concurrency an introduction
date: 2024-10-29
---

# Why use threads?
- parallelism
- avoid blocking program progress due to slow I/O.
# Why it get worse: shared data 
count = count + 1;
-> 
```assembly
mov <address>, %eax 
add $0x1, %eax 
mov %eax, <address>
```
`%eax` is the count, and two thread would change this register.
# the heart of the problem: uncontrolled scheduling
race condition (data race). Because multiple threads executing some code can result in a race condition 

# the wish for atomicity 
one way to solve this problem would be have more powerful instructions that, in a single step, did exactly whatever we needed done and thus removed the possibility of an untimely interrupt. For example, what if we had a super instruction that looked like this:
`memory-add <address>, $0x1`

Assume this instruction adds a value to a memory location, and the hardware guarantees that it executes atomically; when the instruction executed, it would perform the update as desired.

# One more problem: waiting for another (condition variable)
above content actually only set up only one type interaction between threads, that of accessing shared variables and need to support atomicity for critical sections. 

As it turns out, there is another common interaction that arises, where one thread must wait for another to complete some action before it continues.