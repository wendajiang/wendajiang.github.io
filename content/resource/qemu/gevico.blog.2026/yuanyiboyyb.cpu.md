---
title: CPU loop
date: 2026-09-01
tags:
  - qemu
---
| 操作                     | 有 kvm                                                           | 无 kvm                                                                                       |
| ---------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 内存访问（load/store)       | 页表查询等都由硬件来完成，与真机一致                                              | 每一处内存访问前都插入一个软件函数用来模拟 tlb，查询页表，cache，缺页等一一系列逻辑来获取物理地址，然后真正执行指令时用这个操作（当然硬件模拟并不是和真机一摸一样，相对简单） |
| Guest 访问 MMIO,port I/O | QEMU 地址翻译发现不是 RAM，调用设备回调；必要时退出 TB                               | CPU 二级翻译发现是 MMIO，`KVM_RUN` 返回 `KVM_EXIT_MMIO`，QEMU 处理设备                                     |
| 调试/断点                  | 无 KVM 下，一个 TB 往往只翻译一条指令  <br>helper 在翻译时就加入检测逻辑，每条指令都可单独触发调试事件。 | `KVM_EXIT_DEBUG` 或架构调试退出                                                                    |
| HLT/WFI/等待中断           | helper 模拟 CPU halt，退出 TB 回到主循环，等待外部事件唤醒 guest                   | CPU 自身进入 halted 状态。guest 行为与真机一致，无需 helper。                                                 |
| 关机/reset               | 设置退出原因，返回上层主循环                                                  | `KVM_EXIT_SHUTDOWN` 等返回 QEMU                                                                |
| 内部错误                   | QEMU 自己报错/abort/退出                                              | `KVM_EXIT_INTERNAL_ERROR` / `KVM_EXIT_FAIL_ENTRY`                                           |

# main loop
```cpp
do {
    if (cpu_can_run(cpu)) {             
        int r;
        bql_unlock();  // 释放 Big Qemu Lock（允许其他 CPU/线程并行访问资源）
        r = tcg_cpu_exec(cpu); // 执行 guest 指令块 (Translation Block)，这是 vCPU 执行路径
        bql_lock(); // 再次获取锁，保证接下来的状态操作安全
        /* 根据 tcg_cpu_exec 返回值处理特殊事件/异常 */
        switch (r) {
            case EXCP_DEBUG:              // 如果是调试异常
                cpu_handle_guest_debug(cpu); // 调用调试处理函数
                break;
            case EXCP_ATOMIC:             // 如果是原子操作异常
                bql_unlock();                 // 解锁
                cpu_exec_step_atomic(cpu);    // 逐步执行原子操作指令
                bql_lock();                   // 再次加锁
                break;
            default:                       // 其他情况忽略
                break;
        }
    }

    qatomic_set_mb(&cpu->exit_request, 0); // 清除退出请求标志，保证下次循环可以正常执行
    qemu_wait_io_event(cpu); //事件循环

} while (!cpu->unplug || cpu_can_run(cpu));
```
- two loop
	- vcpu -> `tcg_cpu_exec`
		- exe TB
		- handle exception and special insn, e.g. EXCP_DEBUG / EXCP_ATOMIC
	- event -> `qemu_wait_io_event`
		- handle devie I/O event, for example, tty write, cb register into event queue
		- timer and cb, handle timeout task
## vCPU loop
```cpp
// tcg_cpu_exec call 
static int __attribute__((noinline))
cpu_exec_loop(CPUState *cpu, SyncClocks *sc)
{

    int ret;
    //检查是否有挂起的异常需要处理,如果有异常且需要退出
    while (!cpu_handle_exception(cpu, &ret)) {

        TranslationBlock *last_tb = NULL;

        int tb_exit = 0;


        //检查是否有挂起的中断需要处理，如果有则退出到外层循环，由外层来处理
        while (!cpu_handle_interrupt(cpu, &last_tb)) {
            //当前要执行的TCG块的指针
            TranslationBlock *tb;
            vaddr pc;
            uint64_t cs_base;
            uint32_t flags, cflags;
            cpu_get_tb_cpu_state(cpu_env(cpu), &pc, &cs_base, &flags);
            /*
             * When requested, use an exact setting for cflags for the next
             * execution.  This is used for icount, precise smc, and stop-
             * after-access watchpoints.  Since this request should never
             * have CF_INVALID set, -1 is a convenient invalid value that
             * does not require tcg headers for cpu_common_reset.
             */
             
            // 检查是否需要使用特殊的标志位（`cpu->cflags_next_tb`）。
            // 如果没有特殊要求，使用默认标志位（`curr_cflags(cpu)`）。
            // 如果使用了特殊标志位，执行后将其重置为默认状态（`-1`），以便后续 TB 恢复正常行为。
            cflags = cpu->cflags_next_tb;
            if (cflags == -1) {
                cflags = curr_cflags(cpu);
            } else {
                cpu->cflags_next_tb = -1;
            }
            //断点需要跳出循环，由外层循环处理
            if (check_for_breakpoints(cpu, pc, &cflags)) {
                break;
            }
            //找到tb，无缓存则翻译
            tb = tb_lookup(cpu, pc, cs_base, flags, cflags);
            if (tb == NULL) {
                CPUJumpCache *jc;
                uint32_t h;
                mmap_lock();
                tb = tb_gen_code(cpu, pc, cs_base, flags, cflags);
                mmap_unlock();
                //缓存翻译结果，以后使用
                //是一个键值对，但是存储空间有限，键重复的会把原先的覆盖，所以需要存储pc的原值负责比对
                //注意只存储了（pc，tb）键值对，但是不同进程空间pc会重叠，所以tb下回存储其他上下文信息。
                h = tb_jmp_cache_hash_func(pc);
                jc = cpu->tb_jmp_cache;
                jc->array[h].pc = pc;
                qatomic_set(&jc->array[h].tb, tb);
            }


//用户模式下可给tb结尾增加一个跳转指令来合并tb，系统模式下有换页等问题在tb处于不同分页时不进行这个操作，处于同一页内增加跳转指令
#ifndef CONFIG_USER_ONLY
            if (tb_page_addr1(tb) != -1) {
                last_tb = NULL;
            }
#endif
            if (last_tb) {
                tb_add_jump(last_tb, tb_exit, tb);
            }


            //执行tv
            cpu_loop_exec_tb(cpu, tb, pc, &last_tb, &tb_exit);
           
            align_clocks(sc, cpu);
        }
    }
    return ret;
}
```

## event loop
```cpp
// qemu_wait_io_event all this
void process_queued_cpu_work(CPUState *cpu)
{
    struct qemu_work_item *wi;
    qemu_mutex_lock(&cpu->work_mutex);
    if (QSIMPLEQ_EMPTY(&cpu->work_list)) {
        qemu_mutex_unlock(&cpu->work_mutex);
        return;
    }
    while (!QSIMPLEQ_EMPTY(&cpu->work_list)) {
        wi = QSIMPLEQ_FIRST(&cpu->work_list);//取出队列里的回调函数
        QSIMPLEQ_REMOVE_HEAD(&cpu->work_list, node);
        qemu_mutex_unlock(&cpu->work_mutex);
        if (wi->exclusive) {
            bql_unlock();
            start_exclusive();
            wi->func(cpu, wi->data);//执行回调
            end_exclusive();
            bql_lock();
        } else {
            wi->func(cpu, wi->data);
        }
        qemu_mutex_lock(&cpu->work_mutex);
        if (wi->free) {
            g_free(wi);
        } else {
            qatomic_store_release(&wi->done, true);
        }
    }
    qemu_mutex_unlock(&cpu->work_mutex);
    qemu_cond_broadcast(&qemu_work_cond);
}
```