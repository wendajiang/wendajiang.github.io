---
title: c++ reflection(introspection) and code generation
date: 2025-04-10
tags:
  - compiler
  - reflection
---
The begin of story is from [[blog/code_reuse_in_xepic|Code reuse in xepic]], I try merge compiler and debugger runtime db code, and investigate the industry solution about this.

As I was writing some Rust code, and use [serde](https://serde.rs/) , so I think I need something like it in c++. I find [reflect-cpp](https://github.com/getml/reflect-cpp) , and begin to consider what is the essence of the problem ? 

I find [Andrei Alexandrescu representation about: Reflection and code generation](https://www.youtube.com/watch?v=H3IdVM4xoCU) and [related post](https://brevzin.github.io/c++/2024/09/30/annotations/). 

> Rust does not actually have any introspection facilities _at all_, but it does have a mature code generation facility in the form of its declarative and procedural macros.

So after some solid thinking, I basically agree this viewpoint.