---
title: semaphore
date: 2023-06-15 09:28:10
updated: 2025-01-16 11:53:10
tags:
  - ostep
lead: the understand of ostep chapter 31
---

Indeed, Dijkstra and colleagues invented the semaphore as a single primitive for all things related to synchronization; as you will see, one can use semaphores as both locks and condition variables.

# Definition
A semaphore is an object with an integer value that we can manipulate with two routines; in the POSIX standard, these routines are` sem_wait() / P()` and `sem_post() / V()`.

```cpp
int sem_wait(semt_t *s) {
  decrement the value of semephore s by one
  wait if value of semaphore s is negative
}

int sem_post(sem_t *s) {
  increment the value of semphore s by one
  if there are one or more threads waiting, wake one
}

```

# Binary Semaphores (Locks)
Using a semaphore as a lock.
```cpp
sem_t m;
sem_init(&m, 0, 1); // init to 1
sem_wait(&m);
// critical section here 
sem_post(&m);
```
We sometimes call a semaphore used as a lock a **binary semaphore**.

# Semaphores for ordering 
Semaphores are also useful to order events in  a concurrent program.

```cpp
sem_t s; 
void child(void *arg) {
	printf("child\n");
	sem_post(&s);;
}

int main(int argc, char** argv) {
	sem_init(&m, 0, 0);
	printf("parent begin\n");
	pthread_t t;
	Pthread_create(&t, NULL, child);
	sem_wait(&s);
	printf("parent end\n);
	return 0;
}
```
**semaphore init to 0** is like condition variable.

# The Producer/Consumer (Bounded Buffer) problem
The first try:
```cpp
int buffer[MAX];
int fill_ptr = 0;
int use_ptr = 0;

void put(int value) {
	buffer[fill_ptr] = value;
	fill_ptr = (fill_ptr + 1) % MAX;
}

void get() {
	 int tmp = buffer[use_ptr];
	 use_ptr = (use_ptr + 1) % MAX;
	 return tmp;
}

sem_t empty, full;

void *producer(void *arg) {
	int i;
	for (i = 0; i < loops; i++) {
		sem_wait(&empty);
		put(i);
		sem_post(&full);
	}
}

void *consumer(void *arg) {
	int tmp = 0;
	while (tmp != -1) {
		sem_wait(&full);
		tmp = get();
		sem_post(&empty);
		printf("%d\n", tmp);
	}
}
int main() {
	sem_init(&empty, 0, MAX);
	sem_init(&full, 0, 0);
	return 0;
}

```
But if there more than one producer or consumer, it's bug. Image two P both calling into put() at roughly the same time. The data race happen.

## Adding mutual exclusion 
```cpp 
sem_t mtx;
void *producer(void *arg) {
	int i;
	for (i = 0; i < loops; i++) {
		sem_wait(&mtx); // P0
		sem_wait(&empty); // P1
		put(i); // P2
		sem_post(&full); // P3
		sem_post(&mtx); // P4
	}
}

void *consumer(void *arg) {
	int tmp = 0;
	while (tmp != -1) {
		sem_wait(&mtx); // C0
		sem_wait(&full); // C1
		tmp = get(); // C2
		sem_post(&empty); // C3
		sem_post(&mtx); // C4
		printf("%d\n", tmp); // C5
	}
}

sem_init(&mtx, 0, 1);
```

This would cause deadlock. For example, one consumer execute C0 and C1, and yield as there is no data, but consumer still hold the lock, then producer execute C0, and can't not acquire the lock, so Deadlock.

To solve this problem, we simply must reduce the scope of the lock.
```cpp
sem_t mtx;
void *producer(void *arg) {
	int i;
	for (i = 0; i < loops; i++) {
		sem_wait(&empty); 
		sem_wait(&mtx); 
		put(i); 
		sem_post(&mtx);
		sem_post(&full);
	}
}

void *consumer(void *arg) {
	int tmp = 0;
	while (tmp != -1) {
		sem_wait(&full); 
		sem_wait(&mtx); 
		tmp = get(); 
		sem_post(&mtx); 
		sem_post(&empty); 
		printf("%d\n", tmp); 
	}
}

sem_init(&mtx, 0, 1);
```

# Reader-Writer locks 
```cpp
struct rw_lock_t {
	sem_t lock;   // binary semaphore (basic lock)
	sem_t writeloc; // allow one writer/many readers
	int readers; // readers in critical section
};
void rwlock_init(rwlock_t* rw) {
	rw->readers = 0;
	sem_init(&rw->lock, 0, 1);
	sem_init(&rw->writelock, 0, 1);
}

void rwlock_acquire_readlock(rwlock_t* rw) {
	sem_wait(&rw->lock);
	rw->readers++;
	if (rw->readers == 1) sem_wait(&rw->writelock); // first reader gets writelock
	sem_post(&rw->lock);
}

void rwlock_release_readlock(rwlock_t *rw) {
	sem_wait(&rw->lock);
	rw->readers--;
	if (rw->readers == 0) sem_post(&rw->writelock);
	sem_post(&rw->lock);
}

void rwlock_acquire_writelock(rwlock_t* rw) {
	sem_wait(&rw->writelock);
}
void rwlock_release_writelock(rwlock_t *rw) {
	sem_post(&rw->writelock);
}
```

# The dining philosophers (哲学家用餐问题)
非常有名的问题，虽然实际使用意义并不大，但是由于是很有趣而且考验智力的问题，面试中可能会问到。

问题是这样的：
![[/pics/Pasted image 20250116134336.png]]
哲学家（P）围坐在圆形餐桌，每个哲学家左右分别放一个叉子（f），思考的时候不需要叉子，吃饭的时候需要两个叉子，所以每个哲学家可以抽象成
```cpp
while (1) {
	think();
	get_forks(p);
	eat();
	put_forks(p);
}
```
定义两个 helper 函数
```cpp
int left(int p) { return p; }
int right(int p) { return (p + 1) % 5; }
```

对每个 fork 定义 sem：
`semt_t forks[5];`
First broken try:
```cpp
void get_forks(int p) {
	sem_wait(&forks[left(p)]);
	sem_wait(&forks[right(p)]);
}

void put_forks(int p) {
	sem_post(&forks[left(p)]);
	sem_post(&forks[right(p)]);
}
```
但是如果 5 个哲学家同时先拿起了左侧的叉子，就出现了死锁的情况。

最简单的解决方法就是改变至少一个哲学家的取叉子顺序
```cpp
void get_forks(int p) {
	if (p == 4) {
		sem_wait(&forks[right(p)]);
		sem_wait(&forks[left(p)]);
	} else {
		sem_wait(&forks[left(p)]);
		sem_wait(&forks[right(p)]);
	}
}
```

# Thread Throttling 
使用 semaphore 限制线程数量。

# Implementation
locks and cv are low-level synchronization primitives, can build semaphores.
```cpp
struct zsem_t {
	int value;
	pthread_cond_t cond;
	pthread_mutex_t lock;
}

void zsem_init(zsem_t* s, int value) {
	s->value = value;
	cond_init(&s->cond);
	mutex_init(&s->lock);
}

void zsem_wait(zsem_t *s) {
	mutex_lock(&s->lock);
	while (s->value == 0) {
		cond_wait(&s->cond, &s->lock);
	}
	s->value--;
	mutex_unlock(&s->lock);
}

void zsem_post(zsem_t *s) {
	mutex_lock(&s->lock);
	s->value++;
	cond_signal(&s->cond);
	mutex_unlock(&s->lock);
}
```
Or

```cpp
void P(csem) {
  while(1) {
    mutex_acquire(csem.mx);
    if (csem.value <= 0) {
      mutex_release(csem.mx);
      continue;
    } else {
      csem.value -= 1;
      mutex_release(csem.mx);
      break;
    }
  }
}

void V(csem) {
  mutex_acquire(csem.mx);
  csem.value += 1;
  mutex_release(csem.mx);
}
```

Re-think the P implementation. If the critical section is large, we could spend a great deal of time spinning.

# reference

- [cse170 semaphores and cv](https://cseweb.ucsd.edu/classes/sp17/cse120-a/applications/ln/lecture7.html)
- [信号量与mutex区别](https://www.zhihu.com/question/47704079/answer/136200849)
- [Goodbyes semaphores](https://lwn.net/Articles/166195/)
- [How are mutexes and semaphores different with respect to their implementation in a Linux kernel?](https://www.quora.com/How-are-mutexes-and-semaphores-different-with-respect-to-their-implementation-in-a-Linux-kernel) PS - Ealrier mutex was implemented using binary semaphore but that is changed now. Please see below for more reference.
  - http://lwn.net/Articles/163807/
  - https://www.kernel.org/doc/Documentation/locking/mutex-design.txt
  - https://lkml.org/lkml/2005/12/22/154
