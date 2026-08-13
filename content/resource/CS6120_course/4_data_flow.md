---
title: Data Flow
date: 2026-08-11
tags:
  - compiler
---
# reaching definition problem

A instruction *d* defining a variable *v* reaches an instruction *u* iff $\exists$ a path in the CFG from *d* to *u*, where, along that path, there no other assignments to *v*.

- **use**: An instruction uses all its arguments
- **definition**: An instruction defines the variable it writes to
- **available**: Definitions that reach a given program point are available there.
- **Kill**: Any definition kills all of the currently available definitions

The reaching definitions problem: For every definition and every use, determine whether the definition reaches the use.

By solve this problem, abstract one generic data flow algorithm:

![[pics/Pasted image 20260811230857.png]]

This is equal with [[area/ai_and_compiler/nju/dfa_foundation|dfa_foundation]]'s worklist algorithm.

So in the analysis algorithm, for different problem, the direction (forward/backward), transfer function and meet operator is user designed.