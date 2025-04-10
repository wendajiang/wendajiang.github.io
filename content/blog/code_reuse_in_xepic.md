---
title: code reuse in work with using type erasure
date: 2025-3-21
---
Recently I refactor some code in work, and there are two components that they control registers and memory both, and maybe 90% code are same. So I want remove duplicated code.

## Low-level code reuse
But in down-level (conversation with hardware) software, we have two git repos, and so have some code about 90 percent are same. 

So I re-construct the smaller repo(using less hardware API) that using submodule to re-use another repo, and use [[blog/type_erasure|type erasure]] technology to abstract the common API, and reuse the existed code.

## compile and runtime db design


db 真的要一开始设计好框架
compile time 到 runtime db, 最好可以共用