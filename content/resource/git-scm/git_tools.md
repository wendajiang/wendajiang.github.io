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
## File Annotation (blame)
If you track down a bug in your code and want to know when it was introduced and why, file annotation is often your best tool.
```bash
$ git blame -L 69,82 Makefile
```
Another case, for example, say you are refactoring a file named `GITServerHandler.m` into multiple files, one of which is `GITPackUpload.m`. By blaming `GITPackUpload.m` with the `-C` option, you can see where sections of the code originally came from
```bash
git blame -C -L 141,153 GITPackUpload.m
f344f58d GITServerHandler.m (Scott 2009-01-04 141)
f344f58d GITServerHandler.m (Scott 2009-01-04 142) - (void) gatherObjectShasFromC
f344f58d GITServerHandler.m (Scott 2009-01-04 143) {
70befddd GITServerHandler.m (Scott 2009-03-22 144)         //NSLog(@"GATHER COMMI
ad11ac80 GITPackUpload.m    (Scott 2009-03-24 145)
ad11ac80 GITPackUpload.m    (Scott 2009-03-24 146)         NSString *parentSha;
ad11ac80 GITPackUpload.m    (Scott 2009-03-24 147)         GITCommit *commit = [g
ad11ac80 GITPackUpload.m    (Scott 2009-03-24 148)
ad11ac80 GITPackUpload.m    (Scott 2009-03-24 149)         //NSLog(@"GATHER COMMI
ad11ac80 GITPackUpload.m    (Scott 2009-03-24 150)
56ef2caf GITServerHandler.m (Scott 2009-01-05 151)         if(commit) {
56ef2caf GITServerHandler.m (Scott 2009-01-05 152)                 [refDict setOb
56ef2caf GITServerHandler.m (Scott 2009-01-05 153)
```
## Binary Search
The `bisect` command does a binary search through your commit history to help you identify as quickly as possible which commit introduced an issue.
```bash
$ git bisect start
$ git bisect bad
$ git bisect good v1.0
Bisecting: 6 revisions left to test after this
[ecb6e1bc347ccecc5f9350d878ce677feb13d3b2] Error handling on repo
# you test current commit, and it's good
$ git bisect good
Bisecting: 3 revisions left to test after this
[b047b02ea83310a70fd603dc8cd7a6cd13d15c04] Secure this thing
# you test, and it's bad
$ git bisect bad
Bisecting: 1 revisions left to test after this
[f71ce38690acf49c1f3c9bea38e09d82a5ce6014] Drop exceptions table
# test and it's good
$ git bisect good
b047b02ea83310a70fd603dc8cd7a6cd13d15c04 is first bad commit
commit b047b02ea83310a70fd603dc8cd7a6cd13d15c04
Author: PJ Hyett <pjhyett@example.com>
Date:   Tue Jan 27 14:48:32 2009 -0800

    Secure this thing

:040000 040000 40ee3e7821b895e52c1695092db9bdc4c61d1730
f24d3c6ebcfc639b1a3814550e62d60b8e68a8e4 M  config
# finish bisect, reset your HEAD
$ git bisect reset
```

Automated the program
```bash
$ git bisect start HEAD v1.0
$ git bisect run test-error.sh
```

Doing so automatically runs `test-error.sh` on each checked-out commit until Git finds the first broken commit. You can also run something like `make` or `make tests` or whatever you have that runs automated tests for you.

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
If you want to send that repository to someone and you don’t have access to a repository to push to, or simply don’t want to set one up, you can bundle it with `git bundle create`.

```bash
$ git bundle create repo.bundle HEAD master
Counting objects: 6, done.
Delta compression using up to 2 threads.
Compressing objects: 100% (2/2), done.
Writing objects: 100% (6/6), 441 bytes, done.
Total 6 (delta 0), reused 0 (delta 0)
```

Now you have a file named `repo.bundle` that has all the data needed to re-create the repository’s `master` branch. With the `bundle` command you need to list out every reference or specific range of commits that you want to be included. If you intend for this to be cloned somewhere else, you should add HEAD as a reference as well as we’ve done here.

You can email this `repo.bundle` file to someone else, or put it on a USB drive and walk it over.
On the other side, say you are sent this `repo.bundle` file and want to work on the project. You can clone from the binary file into a directory, much like you would from a URL.

```bash
$ git clone repo.bundle repo
Cloning into 'repo'...
...
$ cd repo
$ git log --oneline
9a466c5 Second commit
b1ec324 First commit
```

And you can bundle some commits.
```bash
$ git log --oneline master ^origin/master
71b84da Last commit - second repo
c99cf5b Fourth commit - second repo
7011d3d Third commit - second repo

$ git bundle create commits.bundle master ^9a466c5
Counting objects: 11, done.
Delta compression using up to 2 threads.
Compressing objects: 100% (3/3), done.
Writing objects: 100% (9/9), 775 bytes, done.
Total 9 (delta 0), reused 0 (delta 0)
```

When she gets the bundle, she can inspect it to see what it contains before she imports it into her repository. The first command is the `bundle verify` command that will make sure the file is actually a valid Git bundle and that you have all the necessary ancestors to reconstitute it properly.
```bash
$ git bundle verify ../commits.bundle
The bundle contains 1 ref
71b84daaf49abed142a373b6e5c59a22dc6560dc refs/heads/master
The bundle requires these 1 ref
9a466c572fe88b195efd356c3f2bbeccdb504102 second commit
../commits.bundle is okay
```

If the bundler had created a bundle of just the last two commits they had done, rather than all three, the original repository would not be able to import it, since it is missing requisite history. The `verify` command would have looked like this instead:

```bash
$ git bundle verify ../commits-bad.bundle
error: Repository lacks these prerequisite commits:
error: 7011d3d8fc200abe0ad561c011c3852a4b7bbe95 Third commit - second repo
```

However, our first bundle is valid, so we can fetch in commits from it. If you want to see what branches are in the bundle that can be imported, there is also a command to just list the heads:

```console
$ git bundle list-heads ../commits.bundle
71b84daaf49abed142a373b6e5c59a22dc6560dc refs/heads/master
```

The `verify` sub-command will tell you the heads as well. The point is to see what can be pulled in, so you can use the `fetch` or `pull` commands to import commits from this bundle. Here we’ll fetch the `master` branch of the bundle to a branch named `other-master` in our repository:

```bash
$ git fetch ../commits.bundle master:other-master
From ../commits.bundle
 * [new branch]      master     -> other-master
```

Now we can see that we have the imported commits on the `other-master` branch as well as any commits we’ve done in the meantime in our own `master` branch.

```console
$ git log --oneline --decorate --graph --all
* 8255d41 (HEAD, master) Third commit - first repo
| * 71b84da (other-master) Last commit - second repo
| * c99cf5b Fourth commit - second repo
| * 7011d3d Third commit - second repo
|/
* 9a466c5 Second commit
* b1ec324 First commit
```

So, `git bundle` can be really useful for sharing or doing network-type operations when you don’t have the proper network or shared repository to do so.
# Replace

# Credential Storage