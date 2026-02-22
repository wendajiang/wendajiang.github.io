---
title: ZMQ guide note
date: 2025-06-12 10:59:00
tags:
  - async
  - network
  - asio
---
ZeroMQ does I/O in a background thread. When you create a new context, it starts with one I/O thread. *To raise the number of I/O threads, use the `zmq_ctx_set()` call before creating any sockets:*

```c
int io_threads = 4;
void *context = zmq_ctx_new();
zmq_ctx_set(context, ZMQ_IO_THREADS, io_threads);
assert(zmq_ctx_get(context, ZMQ_IO_THREADS) == io_threads);
```

Technically, the context is the container for all sockets in a single process, the acts as the transport for inproc sockets, which are the fastest way to connect threads in one process. If at runtime a process has two contexts, these are like seperate ZeroMQ instances.

It uses lock-free techniques for talking between nodes, so there are never locks, waits, semaphores, or deadlocks.
# Core Msg Patten
## Request-reply
**REP-RESP** socket pair. Client sends msg to the server, which replies with another msg. which connects a set of clients to a set of services. This is a remote procedure call and task distribution pattern.

As above of all: Ask and Ye Shall Receive.
## Pub-sub
Getting the Message Out. Server pushes updates to a set of clients. which connects a set of publishers to a set of subscribers. This is a data distribution pattern.
![[pics/Pasted image 20250612110442.png]]
**PUB-SUB** socket pair is asynchronous. The client does `zmq_recv()`, in a loop (or once if that's all it needs). Trying to send a message to a SUB socket will cause an error. Similarly, the server does `zmq_send()` as often as it needs to, but must not do `zmq_recv()` on a PUB socket.

There is one more important thing to know about PUB-SUB sockets: you do not know precisely when a subscriber starts to get messages. Even if you start a subscriber, wait a while, and then start the publisher, **the subscriber will always miss the first messages that the publisher sends**. This is because as the subscriber connects to the publisher (something that takes a small but non-zero time), the publisher may already be sending messages out.

So, we need with REP-REQ pair to sync the information whether the publisher can push the data.

A more robust model could be:

- Publisher opens PUB socket and starts sending “Hello” messages (not data).
- Subscribers connect SUB socket and when they receive a Hello message they tell the publisher via a REQ/REP socket pair.
- When the publisher has had all the necessary confirmations, it starts to send real data.


Some points about the publish-subscribe (pub-sub) pattern:

- A subscriber can connect to more than one publisher, using one connect call each time. Data will then arrive and be interleaved (“fair-queued”) so that no single publisher drowns out the others.
- If a publisher has no connected subscribers, then it will simply drop all messages.
- If you’re using TCP and a subscriber is slow, messages will queue up on the publisher. We’ll look at how to protect publishers against this using the “high-water mark” later.
- **From ZeroMQ v3.x, filtering happens at the publisher side when using a connected protocol (tcp:@<_>@_ _or ipc:@<_>@).** Using the epgm:@<//>@ protocol, filtering happens at the subscriber side. In ZeroMQ v2.x, all filtering happened at the subscriber side.

## Pipeline
which connects nodes in a fan-out/fan-in pattern that can have multiple steps and loops. This is a parallel task distribution and collection pattern.

## Exclusive pair
which connects two sockets exclusively. This is a pattern for connecting two threads in a process, not to be confused with “normal” pairs of sockets.

# Socket type
## unicast transports
- zmq_inproc
- zmq_ipc
- zmq_tcp
## multicase transports
- zmq_pgm
- zmq_epgm