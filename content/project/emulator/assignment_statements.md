---
title: IEEE 1800 assignment statements
date: 2024-11-06
tags:
  - ieee1800
---
# 10.2 overview
The assignment is the basic mechanism for placing values into nets and variables.
- The *continuous assignment*, which assigns values to nets or variables
- The *procedural assignment*, which assigns values to variables.
Continuous assignments drive nets or variables in a manner similar to the way gates drive nets or variables. The expression on the RHS can be thought of as a combinational circuit that drives the net or variable continuously. In contrast, procedural assignments put values in variables. The assignment does not have duration; instead, the variable holds the value of the assignment until the next procedural assignment to that variable.

There are two additional forms of assignments, **assign/deassign and force/release**, which are called *procedural continuous assignments*, described in [[#10.6 procedural continous assignments]]

An assignment consists of two parts, LHS and RHS, separated by the '=' or '<='. The RHS can be any expression that evaluates to a value. The LHS indicates the net or variable to which the RHS value is to be assigned. The LHS can take one of the forms given in below table.

| Statement type        | LHS                                                                                                                                                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Continuous assignment | Net or variable(vector or scalar)<br>Constant bit-select of a vector net or packed variable<br>Constant part-select of a vector net or packed variable<br>Concatenation or nested concatenation of any of the above left-hand sides           |
| Procedural assignment | Variable(vector or scalar)<br>Bit-select of a packed variable<br>Part-select of a packed variable<br>Memory word<br>Array<br>Array element select<br>Array slice<br>Concatenation or nested concatenation of any of the above left-hand sides |
# 10.3 Continuous assignments
continuous assignments shall drive values onto nets or variables, both vector(packed) and scalar. **This assignement shall occur whenever the value of the RHS changes.** Continuous assignments provide a way to model combinational logic without specifying an interconnection of gates. Instead, the model speficies the logical expression that drives the net or variable.
# 10.4 Procedural assignments
Procedural assignments occur within procedures such as `always, initial, task and function` and can be thought of as 'triggered' assignments.

The RHS of a procedural assignment can be any expression that evaluates to a value, however the variable type on the LHS may restrict what is a legal expression on the RHS. The LHS shall be a variable that receives the assignment from the RHS.
- Singular variables 
- aggregate variables 
- bit-selects, part-selects, and slices of packed arrays
- slice of unpacked arrays

## 10.4.1 Blocking procedural assignments
A blocking procedural assignment stmt shall be executed before the execution of the stmts that follow it in a sequential block. A blocking procedural assignment stmt shall not prevent the execution of statements that follow it in a parallel block.

```verilog
rega = 0;
rega[3] = 1; // a bit-select
rega[3:5] = 7; // a part-select
mema[address] = 8'hff; // assignment to a mem element
{carry, acc} = rega + regb; // a concatenation
```

## 10.4.2 Nonblocking procedural assignments
The *nonblocking procedural assignment* allows assignment scheduling without blocking the procedural flow.

It shall be illegal to make nonblocking assignments to automatic variables.

If variable_lvalue requires an evaluation, such as index expression, class handle, or virtual interface reference, it shall be evaluated at the same time as the expression on the right-hand side.

The nonblocking procedural assignments shall be evaluated in two steps as discuss in [[reading/scheduling_semantics|scheduling_semantics|]].

```verilog
module evaluates (out);
	output out;
	logic a, b, c;
	initial begin
		a = 0;
		b = 1;
		c = 0;
	end
	always c = #5 ~c;
	always@(posedge c) begin
		a <= b;
		b <= a;
	end
endmodule
```
Step1. At `posedge c`, the simulator evaluates the RHS of the nonblocking assignments and schedules the assignments of the new values at end of the *nonblocking assign update* events NBA region.

Step2. When the simulator activates the nonblocking assign update events the simulator update events, the simulator updates the left-hand side of each nonblocking assignment statement.

# 10.5 Variable declaration assignment (variable initialization)
```verilog
wire w = vara & varb; // net with a continuous assignment
logic v = consta & constb; // variable with initialization
```
# 10.6 procedural continuous assignments
## 10.6.1 assign and deassign procedural stmts
The **assign** procedural continuous assignment stmt shall override all procedural assignments to a variable. The **deassign** stmt shall end a procedural continuous assignment to a variable.

**The LHS shall be a singular variable reference or a concatenation of variables. It shall not be a bit-select or a part-select of a variable.**

The assign/deassign procedural stmts allow, for example, modeling of asynchronous clear/preset on a D-type edged-triggered flip-flop, where the clock is inhibited when the clear or preset is active.

```verilog
module dff(q, d, clear, preset, clock);
	output q;
	input d, clear, preset, clock;
	logic q;
	always@(clear or preset) begin
		if (!clear) assign q = 0;
		else if (!preset) assign q = 1;
		else deassign q;
	end
	alwasy@(posedge clock) q = d;
endmodule
```

## 10.6.2 force and release procedural stmts
These stmts have a similar effect to the assign-deassign pair, but a force can be applied to nets as well as to variables.

**The LHS can be a reference to a singular variable, a net, a constant bit-select of a vector net, a constant part-select of a vector net, or a concatenation of these. It shall not be a bit-select or a part-select of a variable or of a net with a user-defined nettype.**



# reference
- [BA and NBA](http://www.sunburst-design.com/papers/CummingsSNUG2000SJ_NBA.pdf)