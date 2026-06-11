---
title: dlopen and C++ class
tags:
  - shared_library
date: 2026-6-11
---
VP 需要一些 by case 的 shared library，如果不想 by case 编译 vp 的执行文件，只能通过 dlopen lazy load 一些 shared library，于是引入了 [C++ dlopen](https://tldp.org/HOWTO/C++-dlopen/) 的问题。

[this blog](https://blog.theopnv.com/posts/cpp-dynamic-loading/) 清晰的描述了解决这个问题的方法和细节。