---
title: timestamp in distributed system
date: 2024-10-13 18:19
---
 [分布式事务中的时间戳](https://ericfu.me/timestamp-in-distributed-trans) 

Introducing TSO(Timestamp Oracle) into distributed system is a good and simple method.

## [[reading/time_clock_the_orderingEventDistriSytem#Logical Clocks|Lamport Clock]] and HLC
Lamport clock is simple logical clock implemention, and is an incremental integer.

And If we use high bits to store physical timestamp and low bits store logical timestamp, that is HLC(Hybrid Logical Clock). 