---
title: Data flow analysis
date: 2024-04-25 17:07:42
updated: 2024-04-25 17:07:42
typora-copy-images-to: ../static/pics/${filename}
tags: 
  - compiler
  - dataflow
  - spa
---


# Purpose of data flow analysis
It is a static analysis technique that proves facts about a program or its fragment. It can make conclusions about all paths through the program, while takeing control flow into account and scaling to large programs. The basic idea is propagating facts about the program through the edges of the control flow graph (CFG) until a fixpoint is reached.

