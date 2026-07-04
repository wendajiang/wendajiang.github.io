---
title: Git Internals
date: 2026-03-05 23:32
tags:
  - git
---
[link](https://git-scm.com/book/en/v2/Git-Internals-Git-References)


First, if it isn’t yet clear, Git is fundamentally a content-addressable filesystem with a VCS user interface written on top of it.

> “plumbing” commands -> 底层命令 ，“porcelain” commands -> 上层命令

At the core of Git is a simple key-value data store.

## Git Objects
dir is `.git/objects`
- Blob -> file
- Tree -> dir

commit object save who saved the snapshots, when they were saved, or why were saved. commit information and one tree snapshot.



