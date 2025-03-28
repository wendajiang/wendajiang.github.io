---
date: 2021-03-04 12:23:02
title: mysql_transaction

tags: reprint
---

这篇文章属于转载，原链接 https://draveness.me/mysql-transaction/
原链接作者如要求删除，请联系 wendajiang1993@gmail.com

在关系型数据库中，事务的重要性不言而喻，只要对数据库稍有了解的人都知道事务具有 ACID 四个基本属性。

ACID

- Atomicity
- Consistency
- Isolation
- Durability

事务其实就是并发控制的基本单位：相信我们都知道，事务是一个序列操作，要么都执行，要么都不执行，是不可分割的。数据库事务的 ACID 四大特性是事务的基础。

## Atomicity 原子性

要保证事务的原子性，就需要在异常发生时，对已经执行的操作进行回滚，而在 MySQL 中，恢复机制是通过回滚日志（undo log）实现的，所有事务进行的修改都会记录到这个回滚日志中，然后在对应数据库中进行写入。

{% mermaid() %}
graph LR
	subgraph SQL1
	A(Undo Log) -.-> B(Update Record) 
	end
	subgraph SQL2
	B --> C(Undo Log) -.-> D(Update Record)
	end
{% end %}

回滚日志除了能够在发生错误或者用户执行 `ROLLBACK` 时提供回滚相关的信息，它还能够在整个系统发生崩溃、数据库进程直接被杀死后，当用户再次启动数据库进程时，还能够立刻通过查询回滚日志将之前未完成的事务进行回滚，这也就需要回滚日志必须先于数据持久化到磁盘上，是我们需要先写日志后写数据库的主要原因。

回滚日志并不能将数据库物理地恢复到执行语句或者事务之前的样子；它是逻辑日志，当回滚日志被使用时，它只会按照日志**逻辑地**将数据库中的修改撤销掉，可以**理解**为，我们在事务中使用的每一条 `INSERT` 都对应了一条 `DELETE`，每一条 `UPDATE` 也都对应一条相反的 `UPDATE` 语句。

{% mermaid() %}
flowchart LR
	A("INSERT INTO users (id, name) VALUES (1, 'draven')") --> B("DELETE FROM users where id = 1")
	C("UPDATE users SET name='dravenss' WHERE id = 1") --> D("UPDATE users SET name='draven' WHERE id = 1")
{% end %}

在这里，我们并不会介绍回滚日志的格式以及它是如何被管理的，本文重点关注在它到底是一个什么样的东西，究竟解决了、如何解决了什么样的问题，如果想要了解具体实现细节，需要进一步学习 @todo

### 事务的状态

因为事务具有原子性，是一个密不可分的整体，事物的状态也有三种 Active,Commited,Failed，事务要不在执行中，要不就是成功或者失败

{% mermaid() %}
flowchart LR
	B((Active)) --> A((Commited))
	B --> C((Failed))
{% end %}

但是放大来看，事务不在是原子的，其中包括了很多中间状态，比如部分提交，事务的状态图也变得越来越复杂。

{% mermaid() %}
flowchart LR
	A((Active))
	B((Partially))
	C((Failed))
	D((Commited))
	E((Aborted))
	A --> B;
	A --> C;
	B --> D;
	C --> E;
	B --> C;
{% end %}

- Active：事务的初始状态，表示事务正在执行；
- Partially Commited：在最后一条语句执行之后；
- Failed：发现事务无法正常执行之后；
- Aborted：事务被回滚并且数据库恢复到了事务进行之前的状态之后；
- Commited：成功执行整个事务；

虽然在发生错误时，整个数据库的状态可以恢复，但是如果我们在事务中执行了诸如：向标准输出打印日志、向外界发出邮件、没有通过数据库修改了磁盘上的内容甚至在事务执行期间发生了转账汇款，那么这些操作作为可见的外部输出都是没有办法回滚的；这些问题都是由应用开发者解决和负责的，在绝大多数情况下，我们都需要在整个事务提交后，再触发类似的无法回滚的操作。

{% mermaid() %}
graph LR
	A((BEGIN))
	B((SQLs))
	C((COMMITED))
	D((External Write))
	A2((BEGIN))
	B2((SQLs))
	C2((COMMITED))
	D2((shut down))
	E2(("???"))
	subgraph Normal
		A -.-> B -.-> C -.-> D
	end
	subgraph Abnormal
		A2 -.-> B2 -.-> C2 -.-> D2 -.-> E2
	end
	style D2 fill:#f9f,stroke:#333,stroke-width:4px
{% end %}

以订票为例，哪怕我们在整个事务结束之后，才向第三方发起请求，由于向第三方请求并获取结果是一个需要较长时间的操作，如果在事务刚刚提交时，数据库或者服务器发生了崩溃，那么我们就非常有可能丢失发起请求这一过程，这就造成了非常严重的问题；而这一点就不是数据库所能保证的，开发者需要在适当的时候查看请求是否被发起、结果是成功还是失败。

### 并行事务的原子性

到目前为止，所有的事务都只是串行执行的，一直都没有考虑过并行执行的问题；然而在实际工作中，并行执行的事务才是常态，然而并行任务下，却可能出现非常复杂的问题：

![image-20200820153119619](/pics/mysql-transaction/transaction1.png)

当 Transaction1 在执行的过程中对 `id = 1` 的用户进行了读写，但是没有将修改的内容进行提交或者回滚，在这时 Transaction2 对同样的数据进行了读操作并提交了事务；也就是说 Transaction2 是依赖于 Transaction1 的，当 Transaction1 由于一些错误需要回滚时，因为要保证事务的原子性，需要对 Transaction2 进行回滚，但是由于我们已经提交了 Transaction2，所以我们已经没有办法进行回滚操作，在这种问题下我们就发生了问题，**Database System Concepts** 一书中将这种现象称为*不可恢复安排*（Nonrecoverable Schedule），那什么情况下是可以恢复的呢？

书中描述的如果 Tran2 依赖 Tran1，那么 Tran1 必须在 Tran2 提交之前完成提交，但是当事务数量逐渐增多，整个恢复流程也会变得越来越复杂，多个事务依赖时，就会出现级联回滚（cascading rollback），级联回滚会导致大量工作需要撤回。

## Durability 持久性

既然是数据库，对数据的持久存储就有需求，驶入的持久性体现在，一旦事务被提交，数据一定能够被写入数据库中持久存储起来。

当事务被提交之后，就无法被撤销，只能创建一个相反的事务进行补偿，这也是事务持久性的体现之一。

### 重做日志 （redo log）

与原子性一样，事务的持久性也是通过日志来实现的，MySQL 使用重做日志（redo log）实现事务的持久性，redo log 由两个部分组成，一是内存中的重做日志缓冲区，因为重做日志缓冲区在内存中，所以是易失的，另一个就是在磁盘上的重做日志文件，是持久的。

![image-20200820213642125](/pics/mysql-transaction/redolog.png)

当我们在一个事务中尝试对数据进行修改时，它会先将数据从磁盘读入内存，并更新内存中缓存的数据，然后生成一条 redo log 并写入 redo log 缓存，当事务真正提交时，MySQL 会将重做日志缓冲中的内容刷新到重做日志文件，在将内存中的数据更新到磁盘上，图上的 4、5 步就是在事务提交时执行的。

在 InnoDB 中，redo log 都是以 512 字节的块的形式进行存储的，同时因为块的大小与磁盘扇区大小相同，所以 redo log 的写入可以保证原子性，不会由于机器断电导致 redo log 仅写入一半并留下脏数据。

除了所有对数据库的修改会产生 redo log，因为回滚日志也是需要持久存储的，它们也会创建对应的 redo log，在发生错误后，数据库重启时会从 redo log 中找出未被更新到数据库磁盘中的日志重新执行以满足事务的持久性。

### 回滚日志和重做日志

到现在为止我们了解了 MySQL 中的两种日志，回滚日志（undo log）和重做日志（redo log）；在数据库系统中，事务的原子性和持久性是由事务日志（transaction log）保证的，在实现时也就是上面提到的两种日志，前者用于对事务的影响进行撤销，后者在错误处理时对已经提交的事务进行重做，它们能保证两点：

1. 发生错误或者需要回滚的事务能够成功回滚（原子性）；
2. 在事务提交后，数据没来得及写入磁盘就宕机时，在下次重新启动后能够成功恢复数据（持久性）；

在数据库中，这两种日志经常都是一起工作的，我们**可以**将它们整体看做一条事务日志，其中包含了事务的 ID、修改的行元素以及修改前后的值。

| Transaction Log |         |          |          |
| --------------- | ------- | -------- | -------- |
| Transaction ID  | Element | OldValue | NewValue |

一条事务日志同时包含了修改前后的值，能够非常简单的进行回滚和重做两种操作，具体细节，此处不展开 @todo 查

## Isolation 隔离性

事务的隔离性是数据库处理数据的几个基础之一，如果没有数据库事务之间的隔离性，就会发生上面提到的级联回滚的问题，造成性能上的巨大损失。如果所有事务的执行顺序都是线性的，那么对于事务的管理容易得多，但是允许事务的并行执行能够提升吞吐量和资源利用率，并且减少每个事务的等待时间。

{% mermaid() %}
graph LR
	A((Improve Throughput)) --- B((Improve Resource Utilization)) --- C((Reduced Wating Time))
{% end %}

当多个事务同时并发执行时，事务的隔离性可能就会被违反，虽然单个事务的执行可能没有任何错误，但是从总体来看就会造成一些数据库的一致性出现问题，而串行执行能够允许开发者忽略并行造成的影响，能够很好的维护数据库的一致性，但是却会影响事务的并行执行。

### 事务的隔离级别

所以说数据库的隔离性和一致性其实是一个需要开发者去权衡的问题，为数据库提供什么样的隔离性层级也就决定了数据库的性能以及可以达到什么样的一致性；在 SQL 标准中定义了四种数据库的事务的隔离级别：`READ UNCOMMITED`、`READ COMMITED`、`REPEATABLE READ` 和 `SERIALIZABLE`；每个事务的隔离级别其实都比上一级多解决了一个问题：

- READ UNCOMMITED: 使用查询语句不会加锁，但是可能会读到未提交的行（Dirty Read）
- READ COMMITED: 只对记录加记录锁，而不会在记录之间加间隙锁，所以允许新的记录插入到被锁定记录的附近，所以在多次使用查询语句时，可能得到不同的结果（Non-Repeatable Read）
- REPEATABLE READ: 多次读取同一范围的数据会返回第一次查询的快照，不会返回不同的数据行，但是可能发生幻读（Phantom Read）
- SERIALIZABLE：InnoDB 隐式地将全部的查询语句加上共享锁，解决了幻读的问题

以上所有级别的事务隔离级别都不允许脏写（Dirty Write），就是当前事务更新了另一个事务已经更新但是没有提交的数据，大部分数据库使用了 READ COMMITED 作为默认的事务隔离级别，但是 MySQL 使用了 ERPEATABLE READ 作为默认级别，从 RAED UNCOMMITED 到 SERIALIZABLE，随着事务隔离级别变得越来越严格，数据库对于并发执行事务的性能也逐渐下降

{% mermaid() %}
graph LR
	A["High Performance"] --- B1((READ UNCOMMITED)) --- B2((READ COMMITED)) --- B3((REPEATABLE READ)) --- B4((SERIALIZABLE)) --> C[Low Performance]
{% end %}

展示各个隔离级别对于脏读，不可重复读，幻读的解决情况：

![image-20200821103436656](/pics/mysql-transaction/tranisolationmatrix.png)

### 隔离级别的实现

数据库对于隔离级别的实现就是使用**并发控制机制**对在同一时间执行的事务进行控制，限制不同的事务对于同一资源的访问和更新，而最重要也最常见的并发控制机制，在这里我们将简单介绍三种最重要的并发控制器机制的工作原理。

#### 锁

锁是一种最为常见的并发控制机制，在一个事务中，我们并不会将整个数据库都加锁，而是只会锁住那些需要访问的数据项， MySQL 和常见数据库中的锁都分为两种，共享锁（Shared）和互斥锁（Exclusive），前者也叫读锁，后者叫写锁

读锁保证了读操作可以并发执行，相互不受影响，写锁保证了在更新数据库数据时不会有其他事务访问或者更改同一条记录造成不可预知的情况

#### 时间戳

除了锁，另一种实现事务的隔离性的方式就是通过时间戳，使用这种方式实现事务的数据库，例如 PostgreSQL 会为每一条记录保留两个字段；*读时间戳*中包括了所有访问该记录的事务中的最大时间戳，而记录行的*写时间戳*中保存了将记录改到当前值的事务的时间戳。

| 记录行的结构 |               |                 |
| ------------ | ------------- | --------------- |
| Data         | Read Timstamp | Write Timestamp |

使用时间戳实现事务的隔离性时，往往都会使用乐观锁，先对数据进行修改，在写回时再去判断当前值，也就是时间戳是否改变过，如果没有改变过，就写入，否则，生成一个新的时间戳并再次更新数据，乐观锁其实并不是真正的锁机制，它只是一种思想，在这里并不会对它进行展开介绍

#### 多版本和快照隔离

通过维护多个版本的数据，数据库可以允许事务在数据被其他事务更新时对旧版本的数据进行读取，很多数据库都对这一机制进行了实现；因为所有的读操作不再需要等待写锁的释放，所以能够显著地提升读的性能，MySQL 和 PostgreSQL 都对这一机制进行自己的实现，也就是 MVCC，虽然各自实现的方式有所不同，MySQL 就通过文章中提到的回滚日志实现了 MVCC，保证事务并行执行时能够不等待互斥锁的释放直接获取数据。

#### 隔离性和原子性

简单提一下在原子性里面提到的级联回滚，如果一个事务对数据进行了写入，就会获取一个互斥锁，其他事务想要获取该行数据的读锁就必须等待写锁的释放，就不会发生级联回滚的问题。

不过在大多数的数据库，比如 MySQL 中都使用了 MVCC 等特性，也就是正常的读方法是不需要获取锁的，在想要对读取的数据进行更新时需要使用 `SELECT ... FOR UPDATE` 尝试获取对应行的互斥锁，以保证不同事务可以正常工作。

## Consistency 一致性

两个一致性 A***C***ID ， ***C***AP

数据库对于 ***ACID*** 中的一致性的定义是这样的：如果一个事务原子地在一个一致地数据库中独立运行，那么在它执行之后，数据库的状态一定是一致的。对于这个概念，它的第一层意思就是对于数据完整性的约束，包括主键约束、引用约束以及一些约束检查等等，在事务的执行的前后以及过程中不会违背对数据完整性的约束，所有对数据库写入的操作都应该是合法的，并不能产生不合法的数据状态。

而第二层意思其实是指逻辑上的对于开发者的要求，我们要在代码中写出正确的事务逻辑，比如银行转账，事务中的逻辑不可能只扣钱或者只加钱，这是应用层面上对于数据库一致性的要求。

数据库 ACID 中的一致性对事务的要求不止包含对数据完整性以及合法性的检查，还包含应用层面逻辑的正确。

-----

CAP 定理中的数据一致性，其实是说分布式系统中的各个节点中对于同一数据的拷贝有着相同的值；而 ACID 中的一致性是指数据库的规则，如果 schema 中规定了一个值必须是唯一的，那么一致的系统必须确保在所有的操作中，该值都是唯一的，由此来看 CAP 和 ACID 对于一致性的定义有着根本性的区别

## 总结

事务的 ACID 四大基本特性是保证数据库能够运行的基石，但是完全保证数据库的 ACID，尤其是隔离性会对性能有比较大影响，在实际的使用中我们也会根据业务的需求对隔离性进行调整，除了隔离性，数据库的原子性和持久性相信都是比较好理解的特性，前者保证数据库的事务要么全部执行、要么全部不执行，后者保证了对数据库的写入都是持久存储的、非易失的，而一致性不仅是数据库对本身数据的完整性的要求，同时也对开发者提出了要求 - 写出逻辑正确并且合理的事务。

最后，也是最重要的，当别人在讲一致性的时候，一定要搞清楚他的上下文
