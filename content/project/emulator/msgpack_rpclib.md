---
title: rpclib (msgpack)
date: 2026-07-14
---
As [[area/blog/protoetc|protoetc]] mentioning, cpp-serializers contains so many projects, [msgpack](https://msgpack.org/) and the [github org](https://github.com/msgpack) is like JSON, but very fast and small, that is not heavy like protobuf. 

If project do not depends on grpc, and want to keep light, we can use [rpclib](http://rpclib.net/gettingstarted/). And msgpack is used in [[area/ai_and_compiler/ray_distributed_computation_framework|Ray]]. 

When I survey QEMU + SystemC solution, I find the [qbox](https://github.com/qualcomm/qbox), that use the rpclib. I need to investigate how to use it and where.ssss