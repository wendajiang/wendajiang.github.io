---
title: Modeling a clock tree in QEMU
date: 2026-10-08
tags:
  - qemu
---
# QEMUClock/Timer
## QEMUClock(软件时钟)： 用于调度定时器，控制虚拟时间推进，`include/qemu/timer.h`

```cpp
// include/qemu/timer.h
typedef enum {
	QEMU_CLOCK_REALTIME = 0, // same with host time, do not influence VM state
	QEMU_CLOCK_VIRTUAL = 1,  // tick with VM
	QEMU_CLOCK_HOST = 2,     // Host time (e.g. NTP)
	QEMU_CLOCK_VIRTUAL_RT = 3, // icount mod fix virtual time
	QEMU_CLOCK_MAX
} QEMUClockType;

/* util/qemu-timer.c */
int64_t qemu_clock_get_ns(QEMUClockType type)
{
    switch (type) {
    case QEMU_CLOCK_REALTIME:
        return get_clock();
    default:
    case QEMU_CLOCK_VIRTUAL:
        return cpus_get_virtual_clock();
    case QEMU_CLOCK_HOST:
        return REPLAY_CLOCK(REPLAY_CLOCK_HOST, get_clock_realtime());
    case QEMU_CLOCK_VIRTUAL_RT:
        return REPLAY_CLOCK(REPLAY_CLOCK_VIRTUAL_RT, cpu_get_clock());
    }
}
```
## Timer
```cpp
/* include/qemu/timer.h */
void timer_init_ns(QEMUTimer *ts, QEMUClockType type,
                   QEMUTimerCB *cb, void *opaque);
void timer_mod_ns(QEMUTimer *ts, int64_t expire_time);
void timer_del(QEMUTimer *ts);

// main loop
/* util/main-loop.c */
void main_loop_wait(int nonblocking)
{
    int64_t timeout_ns;

    timeout_ns = qemu_soonest_timeout(timeout_ns,
                                      timerlistgroup_deadline_ns(
                                          &main_loop_tlg));

    ret = os_host_main_loop_wait(timeout_ns);
    qemu_clock_run_all_timers();
}
```

ClockType/Timer/Main loop 构成了 QEMU 的 “软件时间”。 但是对于硬件建模来说， 还需要能够描述 SoC 内部的时钟树拓扑。
# What are clocks ?
Clocks are [[resource/qemu/qom|QOM]] objects developed for the purpose of modeling the distribution of clocks in QEMU.

They allow us to model the clock distribution of a platform and detect configuration errors in the clock tree such as badly configured PLL, clock source selection or disabled clock.

The object is *Clock* and its *QOM* name is clock (in C code, the macro TYPE_CLOCK).

Clocks are typically used with devices where they are used to model inputs and outputs. They are created in a similar way to GPIOs. Inputs and outputs of different devices can be connected together.

In these cases a Clock object is child of a Device object, but this is not a requirement. Clocks can be independent of devices. For example it's possible to create a clock outside of any device to model the main clock source of a machine.

```text
+---------+      +----------------------+   +--------------+
| Clock 1 |      |       Device B       |   |   Device C   |
|         |      | +-------+  +-------+ |   | +-------+    |
|         |>>-+-->>|Clock 2|  |Clock 3|>>--->>|Clock 6|    |
+---------+   |  | | (in)  |  | (out) | |   | | (in)  |    |
              |  | +-------+  +-------+ |   | +-------+    |
              |  |            +-------+ |   +--------------+
              |  |            |Clock 4|>>
              |  |            | (out) | |   +--------------+
              |  |            +-------+ |   |   Device D   |
              |  |            +-------+ |   | +-------+    |
              |  |            |Clock 5|>>--->>|Clock 7|    |
              |  |            | (out) | |   | | (in)  |    |
              |  |            +-------+ |   | +-------+    |
              |  +----------------------+   |              |
              |                             | +-------+    |
              +----------------------------->>|Clock 8|    |
                                            | | (in)  |    |
                                            | +-------+    |
                                            +--------------+
```

Clocks are defined in the `include/hw/core/clock.h` header and device related functions are defined in the `include/hw/core/qdev-clock.h` header.

# The clock state
The state of a clock is its period; it is stored as an integer representing it in units of $2^{-32}$ ns. The special value of 0 is used to represent the clock being inactive or gated. The clocks do not model the signal itself (pin toggling) or other properties such as the duty cycle.

All clocks contain this state: outputs as well as inputs. This allows the current period of a clock to be fetched at any time. When a clock is updated, the value is immediately propagated to all connected clocks in the tree.

# Adding a new clock

Adding clocks to a device must be done during the init method of the Device instance.

To add an input clock to a device, the function `qdev_init_clock_in()` must be used. It takes the name, a callback, an opaque parameter for the callback and a mask of events when the callback should be called. Output is simpler; only the name is required. Typically:
```cpp
qdev_init_clock_in(DEVICE(dev), "clk_in", clk_in_callback, dev, ClockUpdate);
qdev_init_clock_out(DEVICE(dev), "clk_out);
```

Both functions return the created Clock pointer, which should be saved in the device's state structure for further case.

These objects will be automatically deleted by the QOM reference mechanism.

Note that is's possible to create a static array describing clock inputs and outputs. The function `qdev_init_clocks()` must be called with array as parameter to initialize the clocks: it has the same behavior as calling the `qdev_init_clock_in/out()` for each clock in the array. To ease the array construction, some macros are defined in `include/hw/core/qdev-clock.h`. As an example, the following creates 2 clocks to a device: one input and one output:

```cpp
typedef struct MyDeviceState {
	DeviceState parent_obj;
	Clock * clk_in;
	Clock * clk_out;
};

static void clk_in_cb(void* opaque, ClockEvent event);

static const ClockPortInitArray mydev_clocks = {
	QDEV_CLOCK_IN(MyDeviceState, clk_in, clk_in_cb, ClockUpdate),
	QDEV_CLOCK_OUT(MyDeviceState, clk_out),
	QDEV_CLOCK_END
};

static void mydev_init(Object* obj) {
	MyDeviceState *mydev = MYDEVCE(obj);
	qdev_init_clocks(mydev, mydev_clocks);
	// ... 
}
```

At creation, the period of the clock is 0: the clock is disabled. You can change it using `clock_set_ns()` or `clock_set_hz()`.

# Clock callbacks

```cpp
typedef void ClockCallback(void *opaque, ClockEvent event);
```

The `opaque` argument is the pointer passed to `qdev_init_clock_in` or `clock_set_callback()`; for `qdev_init_clocks()` it is the `dev` device pointer.

The `event` argument specifies why the callback has been called. When you register the callback you specify you specify a mask of ClockEvent values that you are interested in. the callback will only be called for those events.

The events currently supported are:
- ClockPreUpdate: called when input clock's period is about to update. This is useful if the device needs to do some action for which it needs to know the old value of the clock period. During the callback, Clock API functions like `clock_get()` or `clock_ticks_to_ns()` will use the old period.
- ClockUpdate: called after the input clock's period has changed. During this callback, Clock API functions like `clock_ticks_to_ns()` will use the new period.
# Connecting two clocks together

```text
+------------+  +--------------------------------------------------+
|  Device A  |  |                   Device B                       |
|            |  |               +---------------------+            |
|            |  |               |       Device C      |            |
|  +-------+ |  | +-------+     | +-------+ +-------+ |  +-------+ |
|  |Clock 1|>>-->>|Clock 2|>>+-->>|Clock 3| |Clock 5|>>>>|Clock 6|>>
|  | (out) | |  | | (in)  |  |  | | (in)  | | (out) | |  | (out) | |
|  +-------+ |  | +-------+  |  | +-------+ +-------+ |  +-------+ |
+------------+  |            |  +---------------------+            |
                |            |                                     |
                |            |  +--------------+                   |
                |            |  |   Device D   |                   |
                |            |  | +-------+    |                   |
                |            +-->>|Clock 4|    |                   |
                |               | | (in)  |    |                   |
                |               | +-------+    |                   |
                |               +--------------+                   |
                +--------------------------------------------------+
```

We can use the code `qdev_connect_clock_in(devB, "clk2", qdev_get_clock_out(devA, "clk1"))` to connect `devA` and `devB` clock.

# Clock multiplier and divider settings

By default, when clocks are connected together, the child clocks run with the same period as their source(parent) clock. The Clock API supports a built-in period multiplier/divider mechanism so you can configure a clock to make its children run at a different period from its own. If you call the `clock_set_mul_div()` function you can specify the clock's multiplier and divider values. The children of that clock will all run with period of `parent_period * multiplier / divider`. For instance, if the clock has frequency of 8MHz and you set its multiplier to 2 and its divider to 3, the child clocks will run at 12MHz.

# reference
- https://www.qemu.org/docs/master/devel/clocks.html
- https://qemu.gevico.online/tutorial/2026/ch2/qemu-clock/
