---
title: QEMU Dev Start[youtube] notes
date: 2026-07-09
tags:
  - qemu
---
# User- and system mode
## User mode
- Goal: run Linux binaries compiled for a different arch
- JIT compile
- Map syscalls
## System mode
- Full system simulation (CPU, MMU, buses, ...)
- Not cycle accurate, not cache model
- (aka softmmu)

# Major Internal API
## [[resource/qemu/qom|QOM]]
## [[resource/qemu/qdev|qdev]]

## Monitor
### HMP
Ctrl-A C -> info qom-tree
### QMP
Json API
## QAPI
- autogenerate C from JSON
- simplify impl. of QMP commands
- introspection
- Serialization/deserialization
# High Level Control flow (User-mode)
For user mode, the folders that should be needed to care about is 
- linux-user
	- loading of binary
	- entry-point
	- syscalls
- accel
	- KVM/HVF
	- core translation loop
	- memory mapping
	- Tinycode state
- target
	- Instruction decoding and translating
- tcg
	- Tinycode optimization
	- JIT engine

# Which machine
# System-mode high-level control flow
## system-mode entry point
```c
// system/main.c
int main(int argc, char **argv) {
	qemu_init(argc, argv);
	...
	qemu_default_main(NULL); // end up with qemu_main_loop
}

// system/vl.c
void qemu_init(int argc, char** argv) {
	// CLI parsing
	...
	qemu_create_machine(machine_opts_dict); 
		// -> machine init: hw/<arch>/<machine>.c
		//  -> vCPU realization: target/<arch>/cpu.c
		//   -> vCPU thread creation: qemu_init_vcpu in system/cpus.c
		//    -> vCPU thread loop: (cpus_accel->create_vcpu_thread(cpu)) in accel/tcg/tcg-accel-ops-mttcg.c
	
	// e.q. accel/tcg
	configure_accelerators(argv[0]);
	
	qemu_init_displays();
}
```

- BIOS is executed
- ...
- Load our program at 0x7c00
- Jumps to 0x7c00
## System-mode threads
- 1 main event loop thread
- N vCPU threads
- ~1 large mutex(BQL)

```c
// system/runstate.c
int qemu_main_loop(void) {
	int status = EXIT_SUCCESS;
	while (!main_loop_should_exit(&status)) {
		main_loop_wait(false);
	}
	return status;
}

// util/main-loop.c
void main_loop_wait(int nonblocking) {
	// Waiting for events, e.g. keyboard
	ret = os_host_main_loop_wait(timeout_ns);
	// Notify timers updates. e.g. VGA
	qemu_clock_run_all_timers();
}

static int os_host_main_loop_wait(int64_t timeout) {
	bql_unlock();
	ret = qemu_poll_ns((GPollFD*)gpollfds->data, gpollfds->len, timeout);
	bql_lock();
}
// <=>. 
// accel/tcg-accel-ops-mttcg.c
static void *mttcg_cpu_thread_fn(void *arg) {
	...
	do {
		qemu_process_cpu_events(cpu);
		
		bql_unlock();
		r = tcg_cpu_exec(cpu);
		bql_lock();
	} while(!cpu->unplug || cpu_can_run(cpu));
}
```


## [[resource/qemu/memory|Memory Regions]]

## How does our program work?
for x86 machine
- Bootloader stage 1
	- Bootsector headers
	- Loads stage 2
- Bootloader stage 2
	- Loads program
	- Gets VESA frambuffer from BIOS
	- set-up page-table
	- switch to 64-bit long mode
	- jump to program
- Actual program
	- set up programmable Interrupt Controller(PIC)
	- Register
		- Interrupt Service Routines(ISRs)
		- Interrupt Request Handlers(IRQs)
	- When a ps/2 keyboard interrupt occurs, draw a character to the VESA framebuffer


## Summary
- 1 main event thread
- N vCPU threads
- machine modeled in QOM types
- memory regions link together devices

# reference
- https://www.youtube.com/watch?v=OCBLTMKLGAk
- https://www.youtube.com/watch?v=jrZ56K3Sl_k