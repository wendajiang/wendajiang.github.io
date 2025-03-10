---
date: 2021-04-02 14:41:56
title: Linux top
tags: 
    - linux
    - tool
---
<!--
mermaid example:
<div class="mermaid">
    mermaid program
</div>
-->
## linux top命令VIRT,RES,SHR,DATA的含义 

**VIRT：virtual memory usage 虚拟内存

**1、进程“需要的”虚拟内存大小，包括进程使用的库、代码、数据等
2、假如进程申请100m的内存，但实际只使用了10m，那么它会增长100m，而不是实际的使用量

**RES：resident memory usage 常驻内存**
1、进程当前使用的内存大小，但不包括swap out
2、包含其他进程的共享
3、如果申请100m的内存，实际使用10m，它只增长10m，与VIRT相反
4、关于库占用内存的情况，它只统计加载的库文件所占内存大小

**SHR：shared memory 共享内存**
1、除了自身进程的共享内存，也包括其他进程的共享内存
2、虽然进程只使用了几个共享库的函数，但它包含了整个共享库的大小
3、计算某个进程所占的物理内存大小公式：RES – SHR
4、swap out后，它将会降下来

**DATA**
1、数据占用的内存。如果top没有显示，按f键可以显示出来。
2、真正的该程序要求的数据空间，是真正在运行中要使用的。

**top 运行中可以通过 top 的内部命令对进程的显示方式进行控制。内部命令如下：**
s – 改变画面更新频率
l – 关闭或开启第一部分第一行 top 信息的表示
t – 关闭或开启第一部分第二行 Tasks 和第三行 Cpus 信息的表示
m – 关闭或开启第一部分第四行 Mem 和 第五行 Swap 信息的表示
N – 以 PID 的大小的顺序排列表示进程列表
P – 以 CPU 占用率大小的顺序排列进程列表
M – 以内存占用率大小的顺序排列进程列表
h – 显示帮助
n – 设置在进程列表所显示进程的数量
q – 退出 top
K - 终止一个进程。系统将提示用户输入需要终止的进程PID，以及需要发送给该进程什么样的信号。一般的终止进程可以使用15信号；如果不能正常结束那就使用信号9强制结束该进程。默认值是信号15。在安全模式中此命令被屏蔽。
i - 忽略闲置和僵死进程。这是一个开关式命令。
r - 重新安排一个进程的优先级别。系统提示用户输入需要改变的进程PID以及需要设置的进程优先级值。输入一个正值将使优先级降低，反之则可以使该进程拥有更高的优先权。默认值是10。
S - 切换到累计模式。
s - 改变两次刷新之间的延迟时间。系统将提示用户输入新的时间，单位为s。如果有小数，就换算成m s。输入0值则系统将不断刷新，默认值是5 s。需要注意的是如果设置太小的时间，很可能会引起不断刷新，从而根本来不及看清显示的情况，而且系统负载也会大大增加。
f或者F - 从当前显示中添加或者删除项目。
o或者O - 改变显示项目的顺序
c - 切换显示命令名称和完整命令行。
T - 根据时间/累计时间进行排序。
W - 将当前设置写入~/.toprc文件中。


***<u>内存默认单位为KiB(kibibytes)</u>***

**顶部的内存信息可以在top运行时按E切换，每次切换转换率为1000，只是没有单位，切换的单位为 k,m,g,t,p**

KiB = kibibyte = 1024 bytes
MiB = mebibyte = 1024 KiB = 1,048,576 bytes
GiB = gibibyte = 1024 MiB = 1,073,741,824 bytes
TiB = tebibyte = 1024 GiB = 1,099,511,627,776 bytes
PiB = pebibyte = 1024 TiB = 1,125,899,906,842,624 bytes
EiB = exbibyte = 1024 PiB = 1,152,921,504,606,846,976 bytes

| 序号 | 列名       | 含义                                                         |
| ---- | ---------- | ------------------------------------------------------------ |
| a    | PID 进程id |                                                              |
| b    | PPID       | 父进程id                                                     |
| c    | RUSER      | Real user name                                               |
| d    | UID        | 进程所有者的用户id                                           |
| e    | USER       | 进程所有者的用户名                                           |
| f    | GROUP      | 进程所有者的组名                                             |
| g    | TTY        | 启动进程的终端名。不是从终端启动的进程则显示为?              |
| h    | PR         | 优先级                                                       |
| i    | NI         | nice值。负值表示高优先级，正值表示低优先级                   |
| j    | P          | 最后使用的CPU，仅在多CPU环境下有意义                         |
| k    | %CPU       | 上次更新到现在的CPU时间占用百分比                            |
| l    | TIME       | 进程使用的CPU时间总计，单位秒                                |
| m    | TIME+      | 进程使用的CPU时间总计，单位1/100秒                           |
| n    | %MEM       | 进程使用的物理内存百分比                                     |
| o    | VIRT       | 进程使用的虚拟内存总量。VIRT=SWAP+RES                        |
| p    | SWAP       | 进程使用的虚拟内存中，被换出的大小                           |
| q    | RES        | 进程使用的、未被换出的物理内存大小。RES=CODE+DATA            |
| r    | CODE       | 可执行代码占用的物理内存大小                                 |
| s    | DATA       | 可执行代码以外的部分(数据段+栈)占用的物理内存大小            |
| t    | SHR        | 共享内存大小，单位kb                                         |
| u    | nFLT       | 页面错误次数                                                 |
| v    | nDRT       | 最后一次写入到现在，被修改过的页面数。                       |
| w    | S          | 进程状态。（D=不可中断的睡眠状态，R=运行，S=睡眠，T=跟踪/停止，Z=僵尸进程） |
| x    | COMMAND    | 命令名/命令行                                                |
| y    | WCHAN      | 若该进程在睡眠，则显示睡眠中的系统函数名                     |
| z    | Flags      | 任务标志，参考 sched.h                                       |

默认情况下仅显示比较重要的 PID、USER、PR、NI、VIRT、RES、SHR、S、%CPU、%MEM、TIME+、COMMAND 列。可以通过下面的快捷键来更改显示内容。

通过 f 键可以选择显示的内容。按 f 键之后会显示列的列表，按 a-z 即可显示或隐藏对应的列，最后按回车键确定。
按 o 键可以改变列的显示顺序。按小写的 a-z 可以将相应的列向右移动，而大写的 A-Z 可以将相应的列向左移动。最后按回车键确定。
按大写的 F 或 O 键，然后按 a-z 可以将进程按照相应的列进行排序。而大写的 R 键可以将当前的排序倒转。