---
title: faster compile
description: "how to speed up compile time "
date: 2026-07-12
tags: compiler
---

# profile
- clang -ftime-trace would output one json file, that can generate flame graph
- gcc -ftime-report would output the phase time and percent

## only Ninja
Ninja would output .ninja_log, use [ninjatracing](https://github.com/nico/ninjatracing) tool to convert the log files to Chrome (`about:tracing`), but actually it's not very useful.

## Clang + Ninja
```
cmake -G Ninja -DCMAKE_CXX_FLAGS="-ftime-trace" ..
```
Clang would output the compile time detail.
```shell
ninjatracing -e $BUILD_DIR/.ninja_log > trace.json
```
would report more detail of compile time

## Clang + Clang Build Analyzer
[ClangBuildAnalyzer](https://github.com/aras-p/ClangBuildAnalyzer) is very useful tool with Clang + `-ftime-trace`. It can directly output
> Time summary:
> 	parsing (frontend) : _time_
> 	 Codegen & opts (backend)
>  Files that took longest to parse (compiler backend)
>   ...
>  Files that took longest to codegen (compiler backend)
>   ...
>  Templates that took longest to instantiate:
>    ...
>  Template sets that took longest to instantiate:
>   ...
>  Functions that took longest to compile:
>   ...
>  Function sets that took longest to compile / optimize:
>   ...
>  Expensive headers:
>   ...

# speed up

## do not change the code
1. faster linker 
   lld faster than gnu bsd linker
2. PCH(pre-compiled header)
   `target_precompile_headers(<target> PUBLIC <headers>)`
   ```cmake
   add_library(mylib_pch INTERFACE)
   add_library(my_lib::pch ALIAS mylib_pch)
   
   target_precompile_headers(mylib_pch INTERFACE
	   # C++ headers
	   <algorithm>
	   <chrono>
	   <functional>
	   # third party libraries
	   <Eigen/Core>
	   
	   # your own library headers
	   <mylib/common.h>
	   <mylib/Mesh.h>
	   <mylib/logger.h>
   )
   
   target_link_libraries(mylib PRIVATE mylib::pch)
   target_link_libraries(myexecutable PRIVATE mylib::pch)
   ```
3. cache compile result
   - ccache (macos or linux)
     ```cmake
     find_program(CCACHE_PROGRAM ccache)
     if (CCACHE_PROGRAM)
	     set(CMAKE_C_COMPILER_LAUNCHER ${CCACHE_PROGRAM})
	     set(CMAKE_CXX_COMPILER_LAUNCHER ${CCACHE_PROGRAM})
	 endif()
     ```
   - sccache(window)
4. unity builds
   `cmake -DCMAKE_UNITY_BUILD=ON` when cmake 3.16+
5. LTO (link time optimization)
   `cmake -DLLVM_ENABLE_LTO=Thin` for clang
6. PGO(profile guided optimization)
   ```markdown
   build clang with cmake -DLLVM_BUILD_INSTRUMENTED=IR
   use this to train the compiler
     - we build some application
     - generate a profraw file
   merge all profraw files with llvm-prodata
   feed output to clang cmake with -DLLVM_PROFDATA_FILE=<path>
   combine with LTO for best results
   ```
7. Post link optimization
   - LLVM-BOLT
   - LLVM-Propeller


## Grab bag
1. -fvisibility=hidden
2. -fexperimental-new-pass-manager
3. distcc
4. LTO on your code
5. -ftime-trace

[bloaty](https://github.com/google/bloaty) a size profiler for binaries

## change the code

1. split one large file into many small file , so that is benefit from parallel compiling
2. PIMPL
3. fwd class instead of include header
4. explicit template instantiation

# reference

- [youtube](https://www.youtube.com/watch?v=X4pyOtawqjg)
- https://github.com/lagadic/visp/wiki/Profiling-Compilation-Times
- https://opensource.adobe.com/lagrange-docs/dev/compilation-profiling/
- [PCH](https://www.bensyz.com/blogs/PCH/)