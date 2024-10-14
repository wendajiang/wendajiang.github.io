---
title: V8 engine
date: 2024-10-14 18:19
---
When i learn about [[reading/quartz|quartz]] , I'm curious about the JS runtime env. And I already know about [deno](https://github.com/denoland/deno) is a modern runtime for JavaScript and TypeScript. Its [official docs](https://docs.deno.com/runtime/) describe that it's built on [V8](https://v8.dev/docs), Rust and Tokio.

## V8
It's a open-source C++ project (JIT-compiler). The under the hood section has some interestring doc. 

[Ignition](https://v8.dev/blog/ignition-interpreter) is an interpreter that parse the JS source code and transform into bytecode for post optimizer pipeline. [design doc](https://docs.google.com/document/d/11T2CRex9hXxoJwbYqVQ32yIPMh0uouUZLdyrtmMoL44/edit?tab=t.0)
