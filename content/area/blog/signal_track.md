---
title: How to track who is sending SIGKILL to a process
date: 2026-09-14
tags:
  - linux
---
Sometimes we are investigating an issue with process that are suddenly dying, and we have determined that process receives a `SIGKILL` signal. However, there is no log msg explaing more about the reason for the kill. How can we check who sends the kill signal to the process?

## Audit
It's possible to configure an audit rule for capturing kill signals which help use to identify which user has initiated the signal.

```bash
auditctl -a exit,always -F arch=b64 -F a1=9 -S kill
auditctl -a exit,always -F arch=b64 -F a1=9 -S tkill
auditctl -a exit,always -F arch=b64 -F a2=9 -S tgkill
auditctl -a exit,always -F arch=b32 -F a1=9 -S kill
auditctl -a exit,always -F arch=b32 -F a1=9 -S tkill
auditctl -a exit,always -F arch=b32 -F a2=9 -S tgkill
```

[usage](https://access.redhat.com/solutions/36278)

## SystemTap
`SystemTap` is a tracing and probing tool that allows users to study and monitor the activities of the operating system(particularly, the kernel) in fine detail. It provides information similar to the output of tools like netstat, ps, top and iostat; however, SystemTap is designed to provide more filteringand analysis options for collected information.

```bash
# systemtap script sg.stp
probe signal.send {
	if (sig_name == "SIGKILL" || sig_name == "SIGTERM") {
		printf("%10d  %-34s  %-10s  %5d  %-7s  %s\n", gettimeofday_s(), tz_ctime(gettimeofday_s()), pid_name, sig_pid, sig_name, execname());
	}
}

probe begin {
	printf("system script started at: %s\n\n", tz_ctime(Gettimeofday_s()));
	printf("%50s%-18s\n\n", "", "Signaled process");
	printf("%-10s  %-34s  %-10s  %5s %-7s  %s\n", "Epoch", "Time of signal", "name", "PID", "Signal", "Signaling process name");
	printf("------------------------------------------------------------");
}

probe.end {
	printf("\n");
}
# systemtap script

sudo stap sg.stp
```

## bcc-tools
1. install bcc package on your Linux distribution (`bpfcc-tools` on Ubuntu/Debian)
2. `sudo <bcc>/killsnoop [-p pid]`