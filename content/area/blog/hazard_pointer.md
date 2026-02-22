---
title: Hazard Pointer
tags:
  - lock-free
date: 2025-2-12 12:21:00
---
[wiki](https://en.wikipedia.org/wiki/Hazard_pointer)  introduce the Hazard pointer. This technique can solve two problem : **ABA and memory reclamation.**

[Folly library has hazard pointer class](https://github.com/facebook/folly/blob/main/folly/synchronization/Hazptr.h)  describe and implement hazard pointer, here quote it:

> What is Hazard pointer?
> A hazard pointer is a single-writer multi-reader pointer that can be owned by at most one thread at a time. To protect an object A from being reclaimed while in use, a thread X sets one of its owned hazard pointers, P, to the address of A. If P is set to &A before A is removed (i.e, it becomes unreachable) then A will not be reclaimed as long as P continues to hold the value &A.

Alternative Safe Reclamation Methods:

| Method      | Locking(exclusive or shared)                                                      | Reference counting(atomic shared_ptr)                                                                     | Read-copy-update (RCU)                                                                          | Hazard Pointer                                   |
| ----------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Pros        | simple to reason about                                                            | automatic reclamation, thread-anonymous, independent of support for thread local data, immune to deadlock | simple, fast, scalable                                                                          | fast, scalable, blocking can use                 |
| Cons        | serialization, high reader overhead, high contention, deadlock                    | high reader(and writer) overhead, high reader (and writer) contention                                     | sensitive to blocking                                                                           | sensitive thread local storage                   |
| When to use | When speed and contention are not critical, and when deadlock avoidance is simple | When thread local support is lacking and deadlock can be a problem, or automatic reclamation is needed    | when speed and scalability are important and objects do not need to be protected while blocking | when seed are important and read more write less |
Hazard pointer vs RCU
- The differences between hazard pointers and RCU boil down to that hazard pointers protect specific objects, whereas RCU sections protect all protectable objects.
- Both have comparable low overheads for protection (i.e. reading or traversal) in the order of low nanoseconds
- both support effectively perfect scalability of object protection by read-only operations (barring other factors)
- both rely on thread local data for performance
- Hazard pointers can protect objects while blocking indefinitely. Hazard pointers only prevent the reclamation of the objects they are protecting
- RCU sections do not allow indefinite blocking, because RCU prevents the reclamation of all protectable objects, which otherwise would lead to deadlock and /or running out of memory
- Hazard pointers can support end-to-end lock-free operations, including updates (provided lock-free allocator), regardless of thread delays and scheduling constraints
- RCU can support wait-free read operations, but reclamation of unbounded objects can be delayed for as long as a single thread is delayed.
- The number of unreclaimed objects if bounded when protected by hazard pointers, but is unbounded when protected by RCU
- RCU is simpler to use than hazard pointers (except for the blocking and deadlock issues mentioned above). Hazard pointers need to identify protected objects, whereas RCU does not need to because it protects all protectable objects
- both can protect linked structures. Hazard pointers needs additional link counting with low or moderate overhead for update operations, and no overhead for readers. RCU protects linked structures automatically, because it implicitly protects all protectable objects.

# implementation
![hazard pointer](/pics/hp.png)

Every thread store *hazard pointers* which point this thread is using object and *retire list* which point this thread deleted object but not deallocated.

And *hazard pointer* is single write multi read, *retire list* is single write single read.

详细的 [blog](https://lancern.xyz/posts/2023/07/hazard-pointers) 
# reference
- http://blog.kongfy.com/2017/02/hazard-pointer/
- https://sf-zhou.github.io/programming/hazard_pointer.html
- [Hazard pointer RFC for C++26](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2023/p2530r3.pdf)