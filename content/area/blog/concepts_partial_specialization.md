---
title: First Concepts not SFINAE
date: 2026-07-15
tags:
  - cpp
---
The differences between concepts and "old-school" (say, `enable_if`-based) SFINAE are purely cosmetic. There is seemingly nothing which is possible with concepts and impossible with `enable_if`. Concepts are just syntax sugar. They make something easier, plus they offer better error messages.

# One thing is possible with concepts, but not with SFINAE

It's extensibility.

```cpp
template<typename Mutex>
struct lock_guard {
	Mutex& mtx_;
	lock_guard(Mutex& m): mtx_(m) {
		mtx_.lock();
	}
	
	~lock_guard() {
		mtx_.unlock();
	}
};
```

Now you want to make it work with MFC-style mutexes whose methods are called `Lock` and `Unlock`, capitailzed. What can you do? You can specialize individually for all specific lockable classes you need, *but that's a lot of copy-pasted code*. 

```cpp
template<typename Mutex, typename SFINAE_Hook = void>
struct lock_guard {
	Mutex& mtx_;
	lock_guard(Mutex& m): mtx_(m) {
		mtx_.lock();
	}
	
	~lock_guard() {
		mtx_.unlock();
	}
};

template <typename MFCMutex>
struct lock_guard<MFCMutex, std::enable_if_t<is_pascal_case_lockable_v<MFCMutex>>, void>> {
    MFCMutex& m_mutex;
    lock_guard(Mutex& m) : m_mutex(m) { m_mutex.Lock(); }
    ~lock_guard() { m_mutex.Unlock(); }
};
```

Without concepts one has to think and try to envision extension points like this one. With concepts one can just do:

```cpp
template <lowercase_lockable Mutex>
struct lock_guard {
    Mutex& m_mutex;
    lock_guard(Mutex& m) : m_mutex(m) { m_mutex.lock(); }
    ~lock_guard() { m_mutex.unlock(); }
};

template <typename MFCMutex> requires pascal_case_lockable<MFCMutex>
struct lock_guard<MFCMutex> { ... };
```


For SFINAE, include all except not writed code, for concept, it's only this except all others code! It's the main difference I think.

# reference
- https://ibob.bg/blog/2025/02/20/concepts-specialization-fwd-decl/ 