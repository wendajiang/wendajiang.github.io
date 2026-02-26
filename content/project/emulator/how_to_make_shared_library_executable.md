---
title: Make shared library executable
date: 2026-02-26 22:45
tags:
  - so
  - shared_library
---
You may know that it is possible to run the C shared library. For example, on my Linux system, if I run it, it displays its version:

```bash
$ /lib/libc.so.6  
GNU C Library (Ubuntu EGLIBC 2.11.1-0ubuntu7.8) stable release version 2.11.1, by Roland McGrath et al.  
Copyright (C) 2009 Free Software Foundation, Inc.  
This is free software; see the source for copying conditions.  
There is NO warranty; not even for MERCHANTABILITY or FITNESS FOR A  
PARTICULAR PURPOSE.  
Compiled by GNU CC version 4.4.3.  
Compiled on a Linux >>2.6.24-27-server<< system on 2011-01-21.  
Available extensions:  
        crypt add-on version 2.1 by Michael Glad and others  
        GNU Libidn by Simon Josefsson  
        Native POSIX Threads Library by Ulrich Drepper et al  
        BIND-8.2.3-T5B  
For bug reporting instructions, please see:  
<http://www.debian.org/Bugs/>.
```

## Example of shared library
```c++
// service.c
#include <stdio.h>
void lib_service(void) {
	printf("This is a service of the shared library\n");
}


// main.c
#include <stdio.h>
extern void lib_service(void);
int main(int ac, char *av[]) {
	lib_service();
	return 0;
}
```

To build this program along with its shared library, we do:
```bash
$gcc -shared service.c -o libservice.so -Wl,-soname,libservice.so
$gcc main.c -o main -lservice -L.

$export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:`pwd`
$./main
This is a service of the shared library
```

If we run the library we get a segmentation fault:
```bash
$chmod +x ./libservice.so
$./libservice.so
exec format error: ./libservice.so
```

## Makeing an executable shared library
```cpp
#include <stdio.h>
void lib_service(void) {
	printf("This is a service of the shared library\n");
}

void lib_entry(void) {
	printf("Entry point of the service library\n");
}
```

```bash
$gcc -shared service.c -o libservice.so -Wl,-soname,libservice.so -Wl,-e,lib_entry
```
But the execution still fails.


We must make the entry point be a "no return" function thanks to the "_exit()" service:

```cpp
#include <stdio.h>
#include <unistd.h>
void lib_service(void) {
	printf("This is a service of the shared library\n");
}

void lib_entry(void) {
	printf("Entry point of the service library\n");
	_exit(0);
}
```

But it still fails. We specify the interpreter file to be the dynamic linker. On our Linux system, it is **/lib64/ld-linux-x86-64.so.2**. Make sure to use the right linker.
```cpp
#include <stdio.h>
#include <unistd.h>

const char service_interp[] __attribute__((section(".interp"))) = "/lib64/ld-linux-x86-64.so.2";
void lib_service(void) {
	printf("This is a service of the shared library\n");
}

extern "C" {
void lib_entry(void) {
	printf("Entry point of the service library\n");
	_exit(0);
}
}
```

Now it works.