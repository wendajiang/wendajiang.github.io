---
title: How can I link a static library to a dynamic library?
date: 2026-02-27 17:39
tags:
  - so
  - shared_library
---
Very often, you get a static library from some other source, which you need to use for your purposes. What if you finally are working towards creation of a dynamic library, which uses symbols (or functions) from the static library? How do you “link” the symbols in the static library to your dynamic library so that there will be no “undefined” symbols at runtime? This article helps to bust this problem.

First the correction. There is nothing like “linking a static library to dynamic library”.

“Linking” is a process of completing the “symbol table” present in every executable or a shared library (see “[Linkers and symbol tables](https://blog.ramdoot.in/linkers-and-symbol-tables-40f85f6df3c9)”). When you want to “link a static library with dynamic library”, you really want to include the symbols defined in the static library as a part of the dynamic library, so that the run-time linker gets the symbols when it is loading the dynamic library.

Now, for a mini-tutorial that drills this whole concept.

We will need three files for our tutorial. Quickly create these files:

```c
// file1.c
#include <stdio.h>  
  
void func1();  
extern void func2();  
  
void func1()  
{  
printf(“func1n”);  
}  
  
int main(void)  
{  
func1();  
func2();  
}

// file2.c
#include <stdio.h>  
  
void func2()  
{  
printf(“func2n”);  
}

// file3.c
#include <stdio.h>  
  
void func3()  
{  
printf(“Function that is never called.n”);  
}
```

Now we begin the creation of dynamic library that includes all the symbols from a static library. We shall put symbols in `file1.c` and `file2.c` in a static library, and then finally create a dynamic library that includes all these symbols, and new symbols from file3.c.

For this to happen, first create the static library with an option that makes the compiler generate “Position Independent Code” (PIC) for every object that is archived as a part of the static library. This is required, because, a dynamic library, by its definition, is a “shared library” — which means it is relocatable. **In order to have object files in the static library packed within the dynamic library**, it is important these objects are also relocatable — i.e., made position independent.

In GCC, this is done with the `-fPIC` option:[[area/blog/gcc_compile_options|gcc_compile_options]] 
```bash
$gcc -c -fPIC file1.c  
$gcc -c -fPIC file2.c
```
This creates both `file1.o` and `file2.o` with position independent code. Note that this depends on the platform in which it is used: for example, when gcc is Linux to create an ELF object, on default (i.e., without `-fPIC`), the code generated is “static” in nature — hence `-fPIC` forces it to generate PIC code. However, certain platforms (like Cygwin on Windows) always generate PIC code for objects, regardless of whether `-fPIC` is used or not.

Next, archive these objects to get a static library:
```bash
$ ar -rv libfiles.a file1.o file2.o  
$ ranlib libfiles.a
```
The `ranlib` is optional: it just generates an index of symbols in the archive and puts it in the archive — this helps speed up the process of linking. For large libraries, this becomes essential rather an optional.

`libfiles.a` now contains the files `file1.o` and `file2.o` — both generated as PIC.  
Now, generate the final dynamic library, which includes another file. First, create the object file of the new file as before:
```bash
$ gcc -c -fPIC file3.c
```
Finally, create the dynamic library, which contains the new file (`file3.o`), along with the other files in `libfiles.a`.
```bash
$ gcc -o libfiledyn.so -Wl, —whole-archive libfiles.a -Wl, —no-whole-archive -shared file3.o
```
The `-Wl` options to gcc are directly passed to the linker (gcc invokes the linker “`ld`” as the last step before creation of an executable or a shared library). The linker gets the option “`–whole-archive`” — this option instructs the linker to “extract” the option argument (in this case, `libfiles.a`) so that all the object files in the archive (`file1.o` and `file2.o`) are individually added to the link command line (equivalent to actually having them on the command line separately); the `–no-whole-archive` reverses this behaviour.

Both `–whole-archive` and `–no-whole-archive` are needed because the linker extracts all the archives that are present in-between these options.

That’s it! Now, `libfiledyn.so` contains also the contents of `libfiles.a` — and can be then used independently.