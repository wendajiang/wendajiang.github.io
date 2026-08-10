---
title: Data Flow Analysis - Foundation
date: 2026-08-09
---

[[pdf/nju_spa/4.DFA-FD.pdf|slides]]

# review the iterative algorithm
$$ 
\begin{aligned} 
&OUT[entry] = \emptyset \\
&for (each \space basic \space block \space B\entry) \\
&\space \space OUT[B] = \emptyset \\
&while (changes \space to \space any \space OUT \space occur) \\
&\space \space for (each \space basic \space block \space B\entry) \{ \\
&\space \space \space \space IN[B] = \bigcup_{P\space a \space predecessor \space of \space B}OUT[P]; \\
&\space \space \space \space OUT[B] = gen_{B} \cup (IN[B] - kill_{B}); \\
&\}
\end{aligned} 
$$

## question
- 1. is the algorithm guaranteed to terminate or reach the fixed point, or does it always have a solution ?
- 2. if so, is there only one solution or only one fixed point ? if more than one, is our solution the best one (most precise) ?
- 3. When will the algorithm reach the fixed point, or when can we get the solution ?

**We need some math - Lattice. But before introduce Lattice, we need learn some concept.**

# Partial Order

We define *poset* as a pair (P, $\sqsubseteq$), where $\sqsubseteq$ is a binary relation that defines a *partial ordering* over P, and $\sqsubseteq$ has the following properties:
- $\forall x \in P, x\sqsubseteq x \qquad (Reflexivity)$
- $\forall x,y\in P, x\sqsubseteq y \wedge y \sqsubseteq x \implies x = y \qquad (Antisymmetry)$
- $\forall x,y,z\in P, x\sqsubseteq y \wedge y\sqsubseteq z \implies x \sqsubseteq z \qquad (Transitivity)$

Example: Is (S, $\sqsubseteq$) a poset where S is a set of integers and $\sqsubseteq$ represents $\le$ ? -> Yes

> **partial** means for a pair of set elements in P, they could be incomparable; in other words, not necessary that every pair of set elements must satisfy the ordering $\sqsubseteq$ 

# Upper and Lower Bounds

Given a poset (P, $\sqsubseteq$) and its subset S that $S \subseteq P$, we say that $u \in P$ is an **upper bound** of S, if $\forall x\in S, x\sqsubseteq u$. Similarly, $l\in P$ is an **lower bound** of S, if $\forall x\in S, l \sqsubseteq x$. 

![[pics/Pasted image 20260809133544.png]]

We define the **least upper bound (lub or join)** of S, written $\bigsqcup S$ , if for every upper bound of S, say u, $\bigsqcup S \sqsubseteq u$. Similarly, we define the **greatest lower bound (glb, or meet)** of S, written $\sqcap S$, if for every lower bound of S, say l, $l \sqsubseteq \sqcap S$.

![[pics/Pasted image 20260809134325.png]]

Some properties:
- Not every poset has *lub* or *glb*
- But if a poset has *lub* or *glb*, it will be unique


# Lattice
lattice 是数学理论用来证明 data-flow analysis 的正确性

Given a poset (P, $\sqsubseteq$), $\forall a,b \in P, if a \bigsqcup b \space and \space a \sqcap b \space exist$, then (P, $\sqsubseteq$) is called a lattice.

> A poset is a lattice if **every pair** of its elements has a least upper bound and a greatest lower bound 

## Semilattice

Given a poset (P, $\sqsubseteq$), $\forall a,b \in P$, 
- if only $a \bigsqcup b \space  exists$, then (P, $\sqsubseteq$) is called a join semilattice.
- if only $a \sqcap b \space exists$, then (P, $\sqsubseteq$) is called a meet semilattice.

## Complete lattice
Given a lattice (P, $\sqsubseteq$), for arbitrary subset S of P, if $\bigsqcup S$ and $\sqcap S$ exist, then (P, $\sqsubseteq$) is called a complete lattice.

> **All subsets** of a lattice have a least upper bound and a greatest lower bound.

Every complete lattice (P, $\sqsubseteq$) has 
- a **greatest** element $\top = \bigsqcup P$  called **top** and 
- a **least** element $\bot = \sqcap P$ called **bottom**


> Every **finite** lattice (P is finite) is a complete lattice.


## Product Lattice
![[pics/Pasted image 20260809140426.png]]
Ok, now the math is enough

# Data Flow Analysis Framework via Lattice

A data flow analysis framework (D, L, F) consists of:
- D: a **direction** of data flow: forwards or backwards
- L: a **lattice** including domain of values V and a meet $\bigsqcup$ or join $\sqcap$ operator
- F: a family of **transfer functions** from V to V

![[pics/Pasted image 20260809141344.png]]
> Data flow analysis can be seen as iteratively applying transfer functions and meet/join operations on the values of a lattice

Now we can review the question of begin, for answering the three question, we need some properties:

1. monotonicity of lattice
2. lattice has only one top

## Monotonicity
A function f : L -> L (L is a lattice) is monotomic if $\forall x,y \in L$, $x \sqsubseteq y \implies f(x)\sqsubseteq f(y)$
## Fixed-Point Theorem
Given a complete lattice (L, $\sqsubseteq$), if 
- f: L -> L is monotonic and 
- L is finite
then the **least fixed point** of f can be found by iterating $f(\bot),f(f(\bot)), \dots,f^k(\bot)$ until a fixed point is reached

then the **greatest fixed point** of f can be found by iterating $f(\top),f(f(\top)), \dots,f^k(\top)$ until a fixed point is reached


# May and Must Analyses, A Lattice View
![[pics/Pasted image 20260810215323.png]]


# Worklist Algorithm, an optimization of Iterative Algorithm

$$ 
\begin{aligned} 
&OUT[entry] = \emptyset \\
&for (each \space basic \space block \space B\entry) \\
&\space \space OUT[B] = \emptyset \\
&Worklist \leftarrow  all \space basic \space blocks \\
&while (Worklist \space is \space not \space empty) \\
&\space \space Pick \space a \space BB \space from \space Worklist \\
&\space \space old\_OUT = OUT[B] \\
&\space \space IN[B] = \bigcup_{P\space a \space predecessor \space of \space B}OUT[P]; \\
&\space \space OUT[B] = gen_{B} \cup (IN[B] - kill_{B}); \\
&\space \space if (old\_OUT \neq OUT[B])  \\ 
&\space \space \space \space Add \space all \space successors \space of \space B \space to \space Worklist \\
\end{aligned} 
$$
