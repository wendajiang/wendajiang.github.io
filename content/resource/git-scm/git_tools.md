---
title: Git Tools
date: 2026-03-05 23:31
tags:
  - git
---
# Revision Selection

## Single Revisions
```bash
$ git show 1c002dd4b536e7479fe34593e72e6c6c1819e53b
$ git show 1c002dd4b536e7479f
$ git show 1c002d
```
- 40-character SHA-1 hash
- Short SHA-1
  `git log --abbrev-commit --pretty=oneline`
### Branch reference

branch name -> branch top commit id
```bash
$ git rev-parse <br> # plumbing tool
ca82a6dff817ec66f44342007202690a93763949
```


### RefLog Shortnames
reflog is a log of where your HEAD and branch references have been for the last few months.

```console
$ git reflog
734713b HEAD@{0}: commit: Fix refs handling, add gc auto, update tests
d921970 HEAD@{1}: merge phedders/rdocs: Merge made by the 'recursive' strategy.
1c002dd HEAD@{2}: commit: Add some blame and merge stuff
1c36188 HEAD@{3}: rebase -i (squash): updating HEAD
95df984 HEAD@{4}: commit: # This is a combination of two commits.
1c36188 HEAD@{5}: rebase -i (squash): updating HEAD
7e05da5 HEAD@{6}: rebase -i (pick): updating HEAD
```
Reflog is strictly local - it's a log only of what *you've* done in your repository.

Think of the reflog as Git’s version of shell history

### Ancestry References
The other main way to specify a commit is via its ancestry. If you place a `^` (caret) at the end of a reference, Git resolves it to mean the parent of that commit. Suppose you look at the history of your project:
```console
$ git log --pretty=format:'%h %s' --graph
* 734713b Fix refs handling, add gc auto, update tests
*   d921970 Merge commit 'phedders/rdocs'
|\
| * 35cfb2b Some rdoc changes
* | 1c002dd Add some blame and merge stuff
|/
* 1c36188 Ignore *.gem
* 9b29157 Add open3_detach to gemspec file list
```

You can see the previous commit by specifying `HEAD^`, which means “the parent of HEAD”. And you can specify a number after the `^` to identify *which* parent you want.
```console
$ git show HEAD^
commit d921970aadf03b3cf0e71becdaab3147ba71cdef
Merge: 1c002dd... 35cfb2b...
Author: Scott Chacon <schacon@gmail.com>
Date:   Thu Dec 11 15:08:43 2008 -0800

    Merge commit 'phedders/rdocs'
    
$ git show d921970^ # parent of d92
commit 1c002dd4b536e7479fe34593e72e6c6c1819e53b
Author: Scott Chacon <schacon@gmail.com>
Date:   Thu Dec 11 14:58:32 2008 -0800

    Add some blame and merge stuff

$ git show d921970^2 # second parent of d92
commit 35cfb2b795a55793d7cc56a6cc2060b4bb732548
Author: Paul Hedderly <paul+git@mjr.org>
Date:   Wed Dec 10 22:22:03 2008 +0000

    Some rdoc changes
```

The other main ancestry specification is the `~` (tilde). This also refers to the first parent, so `HEAD~` and `HEAD^` are equivalent. But the difference becomes apparent when you specify a number: `HEAD~2` means "the first parent of the first parent" -> "the grandparent".

You can also combine these syntaxes — you can get the second parent of the previous reference (assuming it was a merge commit) by using `HEAD~3^2`.

## Commit ranges

### Double dot
```bash
$ git log master..experiment
```
All commit `experiment` branch that hasn't yet been merged into `master`. `master..experiment` — that means “all commits reachable from `experiment` that aren’t reachable from `master`.”

If, on the other hand, you want to see the opposite — all commits in `master` that aren’t in `experiment` — you can reverse the branch names. `experiment..master` shows you everything in `master` not reachable from `experiment`
```bash
$ git log origin/master..HEAD
```

### Multiple Points

`^` `--not`
The following three commands are equivalent:
```bash
$ git log refA..refB
$ git log ^refA refB
$ git log refB --not refA
```
But with this syntax you can specify more than two references in your query:
```bash
$ git log refA refB ^refC
$ git log refA refB --not refC
```
### Triple Dot
`...`which specifies all the commits that are reachable by _either_ of two references but not by both of them.

A common swith to use with `log` command in this case is `--left-right`, which shows you which side of the range each commit is in.

# Interactive staging

`git add -i/--interactive`, Git enters an interactive shell mode, display something like this:
```console
$ git add -i
           staged     unstaged path
  1:    unchanged        +0/-1 TODO
  2:    unchanged        +1/-1 index.html
  3:    unchanged        +5/-1 lib/simplegit.rb

*** Commands ***
  1: [s]tatus     2: [u]pdate      3: [r]evert     4: [a]dd untracked
  5: [p]atch      6: [d]iff        7: [q]uit       8: [h]elp
What now>
```

## Staging patches
`git add -i` and input `p(atch)`, or `git add -p/--patch`

```bash
$ git reset --patch
$ git checkout --path
$ git stash save --patch
```

# Stashing and Cleaning
Motivation: Often, when you’ve been working on part of your project, things are in a messy state and you want to switch branches for a bit to work on something else.

Stashing takes the dirty state of your working directory — that is, your modified tracked files and staged changes — and saves it on a stack of unfinished changes that you can reapply at any time (even on a different branch).

To push a new stash onto your stack, 

# Signing your work

# Searching
## Git Grep (where)
```bash
# -n / --line-number to print out the line numbers
# -c / --count summarize the ouput
# -p / --show-function
$ git grep -n gmtime_r
$ git grep --break --heading \
    -n -e '#define' --and \( -e LINK -e BUF_MAX \) v1.8.0
```

## Git log searching (when)
If, for example, we want to find out when the `ZLIB_BUF_MAX` constant was originally introduced, we can use the `-S` option to tell Git to show us only those commits that changed the number of occurrences of that string.
```bash
$ git log -S ZLIB_BUF_MAX --oneline
```
If you need to be more specific, you can provide a regular expression to search for with the `-G` option.
### Line Log Search
`-L` will show you the history of a function or line of code in your codebase.

# Rewriting History

# Reset

# Advanced Merging

# Rerere

# Debugging with Git

# Submodules

Submodules allow you to keep a Git repository as a subdirectory of another Git repository.

## Starting with submodules
```bash
$ git submodule add <url>
```
`.gitmodules` This is a configuration file that stores the mapping between the URL and the local subdirectory you've pulled it. Git see it as a **particular commit** from that repository.

You can overwrite this value local with `git config submodule.<sub>.url PRIVATE_URL`.

## Cloning a project with submodules
```bash
$ git clone <URL>
$ git submodule init
$ git submodule update

$ # or 
$ git clone --recurse-submodules <URL>
$ # or
$ git submodule update --init --recursive
```

## Working on a project with submodules
### Pulling in upstream changes from the submodule remote
```bash
$ # config diff
$ git config --global diff.submodule log
$ # config submodule branch, if you leave off the -f .gitmodules, it will only make the change for you
$ git config -f .gitmodules submodule.<sub>.branch stable
$ # show a short summary of changes to your submodules
$ git config status.submodulesummary 1

$ git submodule update --remote [<sub>]
```

### pulling upstream changes from the project remote
By default, `git pull` command recursively fetches submodules change. However, it does not update the submodules.

```bash
$ git pull
$ git submodule update --init --recursive
$ # equal below
$ git pull --recurse-submodules
```

if the submodule `<URL>` changed, you should `sync`:
```bash
# copy the new URL to your local config
$ git submodule sync --recursive
$ git submodule update --init --recursive
```

### working on a submodule
If you change local submodules files, and commit it. You update should add `--merge` or `--rebase` option. 

If you forget the `--rebase` or `--merge`, Git will just update the submodule to whatever is on the server and reset your project to a detached HEAD state.

#### publishing submodule changes
```bash
$ git push --recurse-submodules=check
The following submodule paths contain changes that can
not be found on any remote:
  DbConnector

Please try

	git push --recurse-submodules=on-demand

or cd to the path and use

	git push

to push them to a remote.

# config
$ git config push.recurseSubmodules check/on-demand
```
#### tips
```bash
# foreach
$ git submodule foreach 'git stash'
$ git submodule foreach 'git checkout -b featureA'
$ git diff; git submodule foreach 'git diff'

# useful aliases
$ git config alias.sdiff '!'"git diff && git submodule foreach 'git diff'"
$ git config alias.spush 'push --recurse-submodules=on-demand'
$ git config alias.supdate 'submodule update --remote --merge'

# git switch / checkout --recurse-submodules
# or
# git config submodule.recurse true
```

# Bundling

# Replace

# Credential Storage