---
title: Write-Ahead Logging
date: 2026-10-16
tags:
  - sqlite
---
The default method by which SQLite implements [[project/emulator/atomic_commit_in_sqlite|atomic commit and rollback]] is a [rollback journal](https://sqlite.org/lockingv3.html#rollback). Beginning with version 3.7.0(2010), a new 'Write-Ahead Log' option is available.

Advantages:
- WAL is significantly faster in most scenarios
- WAL provides more concurrency as readers do not block writers and a writer does not block readers. Reading and writing can proceed concurrently
- Disk I/O operations tends to be more sequential using WAL
- WAL uses many fewer fsync() operations and is thus less vulnerable to problems on systems where the fsync() system call is broken.

Disadvantages:
- All processes using a database must be on the same host computer; WAL does not work over a network filesystem. This is because WAL requires all processed to share a small amount of memory and processes on separate host machines obviously cannot share memory with each other.
- Transactions that involve changes against multiple ATTACHed databases are atomic for each individual database, but are not atomic across all databases as a set.
- It is not possible to change the `page size` after entering WAL mode, either on an empty database or by using `VACUUM` or by restoring from a backup using `back API`. You must be in a rollback journal mode to change the page size.
- A read-only WAL-mode database file can be opened if the `-shm` and `-wal` files already exist or those files can be created or the database is immutable.
- WAL might be very slightly slower than the traditional rollback-journal approach in applications that do mostly reads and seldom write.
- There is an additional quasi-persistent `-wal` file and `-shm` shared memory associated with each database, which can make SQLite less appealing for use an an application file-format.
- There is the extra operation of checkpointing which, though automatic by default, is still something that application developers need to be mindful of.
- WAL mode works as efficiently with large transactions as does rollback mode.


# How WAL works

The traditional rollback journal works by **writing a copy of the original unchanged database content into a separate rollback journal file and then writing changes directly into the database file.** In the event of a crash or ROLLBACK, the original content contained in the rollback journal is played back into the database file to revert the database file to its original state. The COMMIT occurs when the rollback journal is deleted.

The WAL approach inverts this. **The original content is preserved in the database file and the changes are appended into a separate WAL file.** A COMMIT occurs when a special record indicating a commit is appended to the WAL. Thus a COMMIT can happen without ever writing to the original database, which allows readers to continue operating from the original unaltered database while changes are simutaneously being committed into the WAL. Multiple transactions can be appended to the end of a single WAL file.

# reference 
- https://sqlite.org/wal.html