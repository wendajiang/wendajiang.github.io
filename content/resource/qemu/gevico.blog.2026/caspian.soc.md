---
title: QEMU IRQ
date: 2026-08-31
tags:
  - qemu
---
# IRQ 连接：两种机制

QEMU 中有**两种 IRQ 连接机制**，分别用于不同场景：
```text
          sysbus_connect_irq              qdev_connect_gpio_out
 设备 ─────────────────────── PLIC ─────────────────────── CPU
      n = 中断源编号                    irq = IRQ_S_EXT/M_EXT

 外部设备 ──────────────────── GPIO ────────────────────── LED
  qdev_connect_gpio_out       qdev_connect_gpio_in
```

### 机制 1: sysbus_init_irq + sysbus_connect_irq[¶](https://qemu.gevico.online/blogs/2026/professional/qemu-camp-2026-caspian/soc/#1-sysbus_init_irq-sysbus_connect_irq "Permanent link")

通过 SysBus 总线连接，用于**设备 → 中断控制器**：

```cpp
// 设备端 realize:
sysbus_init_irq(sbd, &s->irq);       // 注册 IRQ 输出（索引 0）

// Board 端：
sysbus_connect_irq(sbd, 0,            // 将设备的 IRQ[0]
    qdev_get_gpio_in(plic, 10));      // 连接到 PLIC 的 GPIO_IN[10]
```

**特点**：通过 SysBus 总线，按索引号匹配，一对一的设备→PLIC 连接。

### 机制 2: qdev_init_gpio_in/out + qdev_connect_gpio_out[¶](https://qemu.gevico.online/blogs/2026/professional/qemu-camp-2026-caspian/soc/#2-qdev_init_gpio_inout-qdev_connect_gpio_out "Permanent link")

**不经过任何总线**，板级直连，用于 PLIC → CPU、外设 ↔ 外设：

```cpp
// PLIC → CPU（实现板级中断通路）:
qdev_connect_gpio_out(plic_dev, hart_idx,
    qdev_get_gpio_in(DEVICE(cpu), IRQ_S_EXT));
//       ↑                    ↑
//  PLIC 的 GPIO_OUT[hart]     CPU 的 GPIO_IN[IRQ_S_EXT=9]

// 外设 → 外设（如按键→GPIO）:
qdev_connect_gpio_out(key_dev, 0,
    qdev_get_gpio_in(gpio_dev, 7));
```

**特点**：无总线介入，名称/索引匹配，多用于芯片内部引脚对接。


## Example. gpio
```text
IRQ 路径:
GPIO.sysbus_irq[0] ──sysbus_connect_irq──→ PLIC.qdev_gpio_in[2]
                                              │
                                         qdev_connect_gpio_out
                                              │
                                              ▼
                                      CPU.qdev_gpio_in[IRQ_S_EXT=9]
                                              │
                                         riscv_cpu_set_irq
                                              │
                                         env->mip.SEIP = 1 → trap

数据路径（对比）:
GPIO.output[0] ──qdev_connect_gpio_out──→ LED.qdev_gpio_in[0]
```

# Summay
```text
从芯片规格到 QEMU 代码的映射:
───────────────────────────

1. 芯片引脚
   ├── MMIO 寄存器 → memory_region_init_io + sysbus_init_mmio
   ├── IRQ 输出    → sysbus_init_irq + sysbus_connect_irq → PLIC
   └── GPIO 引脚   → qdev_init_gpio_in/out → 板级连线

2. 内部寄存器
   → C 结构体字段（uint32_t 映射每一位）

3. 状态转换
   → read/write 回调（每次 MMIO 访问触发）

4. 中断触发条件
   → g233_xxx_update_irq() → qemu_set_irq(s->irq, level)

5. 时间建模
   → 延迟追赶: last_update_ns + elapsed → 当前值

6. 总线互联（仅 SPI）
   → realize 中创建 SSI Bus
   → Board 中挂载从设备
   → GPIO 引脚连接 CS
```


# reference
- [Good GPGPU doc in QEMU](https://qemu.gevico.online/blogs/2026/professional/qemu-camp-2026-caspian/gpgpu/#cpu-gpu)
	- two example [1](https://qemu.gevico.online/blogs/2026/professional/qemu-camp-2026-caspian/gpgpu-advanced-1/) [2](https://qemu.gevico.online/blogs/2026/professional/qemu-camp-2026-caspian/gpgpu-advanced-2/)
- [[resource/qemu/gevico.blog.2026/lfan-ke.gpu|some detail about gpgpu]]