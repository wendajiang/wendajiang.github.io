---
title: "CS 6120: The Self-Guided Course"
source: https://www.cs.cornell.edu/courses/cs6120/2025fa/self-guided/
author:
published:
created: 2026-04-07
description: Test obsidian clipper chrome plugin
tags:
  - compiler
---
## CS 6120: Advanced Compilers: The Self-Guided Online Course

CS 6120 is a PhD-level [Cornell CS](https://www.cs.cornell.edu/) course by [Adrian Sampson](https://www.cs.cornell.edu/~asampson/) on programming language implementation. It covers universal compilers topics like intermediate representations, data flow, and “classic” optimizations as well as more research-flavored topics such as parallelization, just-in-time compilation, and garbage collection. The work consists of reading papers and open-source hacking tasks, which use [LLVM](https://llvm.org/) and [an educational IR invented just for this class](https://capra.cs.cornell.edu/bril/).

This page lists the curriculum for following this course at the university of your imagination, for four imagination credits (ungraded). There’s a linear timeline of lessons interspersed with papers to read. Each lesson has videos and written notes, and some have *implementation tasks* for you to complete. Tasks are all open-ended, to one degree or another, and are meant to solidify your understanding of the abstract concepts by turning them into real code. The order represents a suggested interleaving of video-watching and paper-reading.

Some differences with the “real” CS 6120 are that you can ignore the task deadlines and you can’t participate in our discussion threads on Zulip. Real 6120 also has an end-of-semester course project—in the self-guided version, your end-of-semester assignment is to change the world through the magic of compilers.

The instructor is a video production neophyte, so please excuse the production values, especially in the early lessons. CS 6120 is [open source and on GitHub](https://github.com/sampsyo/cs6120), so please file bugs if you find problems.

When you finish the course, please fill out [this feedback form](https://forms.gle/GuRiMa728DUvTbZQ7).

## Lesson 1: Welcome & Overview

- [video](https://vod.video.cornell.edu/media/0_bug89uok)

- [Producing Wrong Data Without Doing Anything Obviously Wrong!](https://dl.acm.org/citation.cfm?id=1508275)  
	Todd Mytkowicz, Amer Diwan, Matthias Hauswirth, and Peter F. Sweeney. ASPLOS 2009.
- [SIGPLAN Empirical Evaluation Guidelines](https://www.sigplan.org/Resources/EmpiricalEvaluation/)

## Lesson 2: Representing Programs

- [representing programs](https://vod.video.cornell.edu/media/1_vnx6laq9)
- [getting started with Bril](https://vod.video.cornell.edu/media/1_jc91ke0h)

## Lesson 3: Local Analysis & Optimization

- [simple dead code elimination](https://vod.video.cornell.edu/media/1_6k52flbg)
- [local value numbering](https://vod.video.cornell.edu/media/1_i2gnhw41)

## Lesson 4: Data Flow

- [data flow](https://vod.video.cornell.edu/media/1_72tqupsb)
- [implementation task](https://vod.video.cornell.edu/media/1_mjy6lamo)

## Lesson 5: Global Analysis

- [global analysis & optimization](https://vod.video.cornell.edu/media/1_i5apfx6t)

- [Efficient Path Profiling](https://dl.acm.org/citation.cfm?id=243857)  
	Thomas Ball and James R. Larus. MICRO 1996.

## Lesson 6: Static Single Assignment

- [static single assignment](https://vod.video.cornell.edu/media/1_130pq2fh)

- [Provably Correct Peephole Optimizations with Alive](https://dl.acm.org/citation.cfm?id=2737965)  
	Nuno P. Lopes, David Menendez, Santosh Nagarakatte, and John Regehr. PLDI 2015.

## Lesson 7: LLVM

- [introduction to LLVM](https://vod.video.cornell.edu/media/1_f231lwkz)
- [writing an LLVM pass](https://vod.video.cornell.edu/media/1_4nrtmvc9)

## Lesson 8: Loop Optimization

- [video](https://vod.video.cornell.edu/media/1_2shcxd1h)

## Lesson 9: Interprocedural Analysis

- [video](https://vod.video.cornell.edu/media/1_9csov2la)

- [Type-Based Alias Analysis](https://dl.acm.org/citation.cfm?id=277670)  
	Amer Diwan, Kathryn S. McKinley, and J. Eliot B. Moss.

## Lesson 10: Alias Analysis

- [video](https://vod.video.cornell.edu/media/1_7ngps985)

- [A Unified Theory of Garbage Collection](https://dl.acm.org/citation.cfm?id=1028982)  
	David F. Bacon, Perry Cheng, and V. T. Rajan. OOPSLA 2004.
- [Fast Conservative Garbage Collection](http://www.cs.utexas.edu/~mckinley/papers/conservative-gc-oopsla-2014.pdf)  
	Rifat Shahriyar, Stephen M. Blackburn, and Kathryn S. McKinley. OOPSLA 2014.

## Lesson 11: Memory Management

- [video](https://vod.video.cornell.edu/media/1_21p8mjsw)

- [An Efficient Implementation of SELF, a Dynamically-Typed Object-Oriented Language Based on Prototypes](http://portal.acm.org/citation.cfm?id=74884)  
	C. Chambers, D. Ungar, and E. Lee. OOPSLA 1989.
- [Trace-Based Just-in-Time Type Specialization for Dynamic Languages](https://dl.acm.org/citation.cfm?id=1542476.1542528)  
	Andreas Gal, Brendan Eich, Mike Shaver, David Anderson, David Mandelin, Mohammad R. Haghighat, Blake Kaplan, Graydon Hoare, Boris Zbarsky, Jason Orendorff, Jesse Ruderman, Edwin W. Smith, Rick Reitmaier, Michael Bebenita, Mason Chang, and Michael Franz. PLDI 2009.

## Lesson 12: Dynamic Compilers

- [Dynamic Compilers](https://vod.video.cornell.edu/media/1_ltb1t94i)
- [Tracing via Speculation](https://vod.video.cornell.edu/media/1_nk1o4hzm)

- [Superoptimizer: A Look at the Smallest Program](https://courses.cs.washington.edu/courses/cse501/15sp/papers/massalin.pdf)  
	Alexia Massalin. ASPLOS 1987.
- [Chlorophyll: Synthesis-Aided Compiler for Low-Power Spatial Architectures](https://dl.acm.org/citation.cfm?id=2594339)  
	Phitchaya Mangpo Phothilimthana, Tikhon Jelvis, Rohin Shah, Nishant Totla, Sarah Chasins, and Rastislav Bodik. PLDI 2014.

## Lesson 13: Concurrency & Parallelism

- [video](https://vod.video.cornell.edu/media/1_8cpusna2)

- [Threads Cannot Be Implemented as a Library](https://dl.acm.org/doi/10.1145/1065010.1065042)  
	Hans-J. Boehm. PLDI 2005.
- [Exploiting Superword Level Parallelism with Multimedia Instruction Sets](https://dl.acm.org/doi/10.1145/358438.349320)  
	Samuel Larsen and Saman Amarasinghe. PLDI 2000.
- [A Type and Effect System for Deterministic Parallel Java](http://dpj.cs.illinois.edu/DPJ/Publications_files/DPJ-OOPSLA-2009.pdf)  
	Robert L. Bocchino, Vikram S. Adve, Danny Dig, Sarita V. Adve, Stephen Heumann, Rakesh Komuravelli, Jeffrey Overbey, Patrick Simmons, Hyojin Sung, and Mohsen Vakilian. OOPSLA 2009.
- [Formal Verification of a Realistic Compiler](https://dl.acm.org/citation.cfm?id=1538814)  
	Xavier Leroy. CACM in 2009.