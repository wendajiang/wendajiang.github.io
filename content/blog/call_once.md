---
title: std::call_once
tags:
  - cpp
date: 2024-12-26
---
# introduction 
My project that is peer-to-peer library, and every peer introduce the library, and every peer call init function. 

But actually, in one peer, my library is low-level, so that another two library use it, like below dependency.
```text

user_binary -  liba.so - libpeer.so
           |_  libb.so _|
```

`liba.so` has init function, `libb.so` has init function, and both call `libpeer.so`'s init function.

So `libpeer.so` init function must be called only once in one process. 


First I implement in init function with `std::mutex and inited flag`, to avoid race data, and `inited` to indicate `libpeer.so` is already inited, and return directly.

And some seconds later, I realize `std::call_once` is just for this scenario.

# but how `std::call_once` is implemented ? 

> Executes the [Callable](dfile:///Users/david/Library/Application%20Support/Dash/DocSets/C++/C++.docset/Contents/Resources/Documents/en.cppreference.com/w/cpp/named_req/Callable.html "cpp/named req/Callable") object f exactly once, even if called concurrently from several threads.

abseil::call_once is lock free. 

[[#reference | call_once in abseil cpp]]

#  reference
- [abseil-cpp call_once](https://kye.hashnode.dev/abseil-cpp-behind-the-scenes-the-implementation-of-callonce)

