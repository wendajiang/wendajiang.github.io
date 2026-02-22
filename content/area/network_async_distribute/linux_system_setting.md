---
title: linux 系统设置
date: 2025-10-20 11:33:00
tags:
  - tencent
  - onenote
---
# TCP/IP
```shell
/proc/sys/net/core/rmem_max    -> TCP receive data buffer length
/proc/sys/net/core/wmem_max    -> TCP send data buffer length
/proc/sys/net/ipv4/tcp_timestamps -> RFC 1323, TCP data head
/proc/sys/net/ipv4/tcp_window_scaling -> tcp window
```

proc filesystem is temp, so we should change `/etc/rc.local` or `/etc/sysctl.conf` to be persistent.

总体来说，/proc/sys 里面是系统参数的设置，直接修改可以临时生效，但是当系统重启，这些修改会失效，所以如果需要持久化修改某些系统参数，建议使用 `sysctl` 