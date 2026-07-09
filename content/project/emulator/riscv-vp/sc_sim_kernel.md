---
title: SystemC Simulation Kernel
date: 2026-06-14
---
[blog about sc kernel](https://singularitykchen.github.io/blog/2020/06/12/SystemC-and-Its-Simulation-Kernel/) is one great overview about simulation kernel of systemc.
![[pics/Pasted image 20260614122117.png]]
is the supplement of IEEE1666-2023 4.3.2. 


## Record of IEEE1666 4.3.2

Since process instances execute without interruption, only a single process instance can be running at any one time, and no other process instance can execute until the currently executing process instance has yielded control to the kernel.

A process shall not preempt or interrupt the execution of another process. This is known as _co-routine_ semantics or *co-operative multitasking.* **_(_only one OS thread run the kernel to sim the concurrency of hw_)_**_**

  
SystemC scheduling algorithm:
- the set of runnable processes
- the set of update requests (request_update / async_request_update)
- the set of delta notifications and time-outs (ev.notify(SC_TIME_ZERO))
- the set of timed notifications and time-outs (ev.notify(time))

  

**One time cycle:**  
1. initialization phase 
   - run update phase but without delta notification phase  
   - add the process into the runnable set of process, exclude "dont_initialize" and clocked thread process  
   - run the delta notification phase  
2. evaluation phase _(delta_cycle = c0, time = t0)_
   - immediate notification cause all process instances that are currently sensitive to the notified event shall be added to the set of runnable processes. and such process would be executed in the current evaluation phase.
   - repeat until the set of runnable processes if empty; then to on to the update phase  
3. update phase _(delta_cycle = c0, time = t0)_
   - Execute any pending calls to update() resulting from the calls to request_update() in the evaluation phase 
   - The update of channels could generate notification of events  
4. delta notification phase _(delta_cycle = c0+1, time = t0)_
   - notify(zero) and waited process add to the runnable process, remove delta notification from the set  
   - if runnable process set is not empty, goto the evaluation phase  
5.  timed notification phase _(delta_cycle = c0, time = t1)_  
   - advance time of the earliest pending timed notification or time-out, remove from timed notifications goto evaluation phase or finish