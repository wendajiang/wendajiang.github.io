---
title: Data Flow Analysis
date: 2026-08-08
---
# How Data Flows on CFG?
How **application-specific** Data 
		Flows through 
		*Nodes* (BBs/stmts) and 
		*Edges*(control flows) of 
		*CFG* (a program) ?


> may analysis:
> 
> outputs information that may be true (over-approximation)
> 
> must analysis:
> 
> outputs information that must be true (under-approximation)
> 
> Over- nad under-approximations are both for safety of analysis


## Input and Output States
- each execution of an IR statement transforms an input state to a new output state
- the input (output) state is associated with the **program point** before(after) the statement

In each data-flow analysis application, we associate with every program point a *data-flow value* that represents an *abstraction* of the set of all possible *program states* that can be observed for that point.

Another view: Data-flow analysis is to *find a solution* to a set of *safe-approximation-directed constraints* on the IN\[s\]'s and OUT\[s\]'s, for *all stmts*
- constraints based on semantics of stmts (*transfer functions*)
- constraints based on the *flows of control*

### Notations for transfer functions
#### Forward Analysis
$OUT[s] = f_s(IN[s])$
#### Backward Analysis
$IN[s] = f_{s}(OUT[s])$
### Notations for Control Flow's Constraints
#### Control flow within a BB
$IN[s_{i+1}] = OUT[s_i], for all i=1,2,\dots,n-1$ 

![[pics/Pasted image 20260808213142.png]]
#### Control flow among BBs
$IN[B] = IN[s_{1}] OUT[B] = OUT[s_{n}]$

![[pics/Pasted image 20260808213152.png]]

$OUT[B] = f_{B}(IN[B]), f_{B}=f_{s_{n}}\circ\dots\circ f_{s_{2}}\circ f_{s_{1}}$

$IN[B]=\wedge_{P\space a \space predecessor \space of \space B}OUT[P]$

![[pics/Pasted image 20260808213411.png]]

$IN[B] = f_{B}(OUT[B]), f_{B}=f_{s_{1}}\circ\dots\circ f_{s_{n-1}}\circ f_{s_{n}}$

$OUT[S]=\wedge_{S\space a \space successor \space of \space B}IN[S]$

# Application

## Reaching Definitions Analysis
A *definition d* at program point p *reaches* a point q if there is a path from p to q such that *d* is not "killed" along that path.

For example: lint variable undefined error

## Live Variables Analysis

## Available Expressions Analysis