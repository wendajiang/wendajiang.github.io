---
title: Git On the Server
date: 2026-03-05 23:10
tags:
  - git
---
# [Protocols](https://git-scm.com/book/en/v2/Git-on-the-Server-The-Protocols)
Running a Git server is fairly straightforward. First you choose which protocols you want your server to support.

A remote repository is generally a _bare repository_ — a Git repository that has no working directory. Because the repository is only used as a collaboration point, there is no reason to have a snapshot checked out on disk; it’s just the Git data. In the simplest terms, a bare repository is the contents of your project’s `.git` directory and nothing else.

## Local Protocols
```bash
$ git clone /srv/git/project.git
$ git clone file:///srv/git/project.git
```

## HTTP Protocols
### Smart HTTP

Like Github. Smart HTTP operates very similarly to the SSH or Git protocols but runs over standard HTTPS ports and can use various HTTP authentication mechanisms, meaning it’s often easier on the user than something like SSH, since you can use things like username/password authentication rather than having to set up SSH keys.
### Dumb HTTP
The Dumb protocol expects the bare Git repository to be served like normal files from the web server. Git repository under your HTTP document root and set up a specific `post-update` hook, and you’re done
```bash
$ cd /var/www/htdocs/
$ git clone --bare /path/to/git_project gitproject.git
$ cd gitproject.git
$ mv hooks/post-update.sample hooks/post-update
$ chmod a+x hooks/post-update
```

## SSH Protocols
A common transport protocol for Git when self-hosting is over SSH. To clone a Git repository over SSH, you can specify an `ssh://` URL like this:
```bash
$ git clone ssh://[user@]server/project.git
```
Or you can use the shorter scp-like syntax for the SSH protocol:
```bash
$ git clone [user@]server:project.git
```

## Git Protocols
 This is a special daemon that comes packaged with Git; it listens on a dedicated port (9418) that provides a service similar to the SSH protocol, but with absolutely no authentication or cryptography.

Specific Setting-up steps: https://git-scm.com/book/en/v2/Git-on-the-Server-Git-Daemon