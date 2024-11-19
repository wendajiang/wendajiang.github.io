---
title: operators and expressions
date: 2024-11-18
---
# 11.1 general
- expression semantics
- operator on expressions
- operator precedence
- operand size extension rules
- signed and unsigned operation rules
- bit and part-select operations and longest static prefix
- bit-stream operations

# 11.2 overview
an *expression* is a construct that combines *operands* with *operators* to produce a result that is a function of the values of the operands and the semantic meaning of the operator. Any legal operand, such as a net bit-select, without any operator is considered an expression.

An *operand* can be one of the following:
- constant literal number, including real literals
- string literal
- parameter, including local and specify parameters
- parameter bit-select or part-select, including local and specify parameters
- net
- net bit-select or part-select
- variable 
- variable bit-select or part-select
- structure, either packed or unpacked
- structure member
- packed struct bit-select or part-select
- union, packed, unpacked, or tagged
- union member 
- packed union bit-select or part-select 
- array, either packed or unpacked 
- unpacked array element bit-select or part-select, element, or slice
- a call to user-defined function, system-defined function, or mehod that returns any of the above.
# 11.3 operators

| type                   | operators                                                                                                           | comment |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- | ------- |
| assignment             | = , +=,  -= , \*= , /= , %= , &= , \|= , ^= , <<= , >>= , <<<= , >>>=                                               |         |
| conditional_expression | cond_predicate ? {attribute_instance} expresion : expression                                                        |         |
| unary                  | \+ , - , ! , ~ , & , ~& , \| , ~\| , ^ , ~^ , ^~                                                                    |         |
| binary                 | +, -, \*, /, %, \==, !=, =\==,  !\==, \==?, &&, \|\|, **, <, <=, >, >=, &, \|, ^, ^~, ~^, >>, <<, <<<, >>>, =>, <-> |         |
| inc_or_dec             | ++, --                                                                                                              |         |
| stream                 | <<, >>                                                                                                              |         |
# 11.4 operator descriptions
# 11.5 operands

# 11.6 Expression bit lengths
The number of bits of an expression is determined by the operands and the context. Casting can be used to set the size context of an intermediate value. ({type} ' {expression})

SV uses the bit length of the operands to determine how many bits to use while evaluating an expression. The bit length rules :

A *self-determined expression* is one where the bit length of the expression is solely determined by the expression itself -- for example, an expression representing a delay value.

A *context-determined expression* is one where the bit length of the expression is determined by the bit length of the expression and by the fact that it is part of another expression. For example, the bit size of the right-hand expression of an assignment depends on itself and the size of the left-hand side.


| Expression                                                 | Bit length                | Comments                              |
| ---------------------------------------------------------- | ------------------------- | ------------------------------------- |
| Unsized constant number                                    | Same as integer           |                                       |
| Sized constant number                                      | As given                  |                                       |
| i op j, where op is <br>+, -, \*, /, %, &, \|, ^, ^~, ~^   | max(L(i), L(j))           |                                       |
| op i, where op is <br>+, -, ~                              | L(i)                      |                                       |
| i op j, where op is <br>=\==,  !\==, \==, !=, >, >=, <, <= | 1 bit                     | Operands are sized to max(L(i), L(j)) |
| i op j, where op is <br>&&, \|\|, ->, <->                  | 1 bit                     | All operands are self-determined      |
| op i, where op is<br>&, ~&, \|, ~\|, ^, ~^, ^~, !          | 1 bit                     | All operands are self-determined      |
| i op j, where op is <br>\>>, <<, \*\*, >>>, <<<            | L(i)                      | j is self-determined                  |
| i ? j : k                                                  | max(L(j), L(k))           | i is self-determined                  |
| {i, .., j}                                                 | L(i) +..+L(j)             | All operands are self-determined      |
| {i, {j,..,k}}                                              | i $\times$ (L(j)+..+L(k)) | All operands are self-determined      |
# 11.7 Signed expressions
In addition to cast operator, the `$signed` and `$unsigned` system functions are available for casting the signedness of expressions.

```verilog
logic [7:0] rega, regb;
logic signed [7:0] regs;

rega = $unsigned(-4); // rega = 8'b11111100
regb = $unsigned(-4'sd4); // regb = 8'b00001100
regs = $signed(4'b1100); // regs = -4

rega = unsigned'(-4); // rega = 8'b11111100
regs = signed'(4'b1100); // regs = -4

regs = rega + regb; // will do unsigned addition
regs = byte'(rega) + byte'(regb); // will do signed addtion
regs = signed'(rega) + signed'(regb); // will do signed addition
regs = $signed(rega) + $signed(regb); // will do signed addition
```

# 11.8 Expression evaluation rules
The following are the rules for determining the resulting type of an expression
- depends only on the operands. it does not depend on the left-hand size(if any)
- decimal numbers are signed
- based numbers are unsigned, except where the s notation is used in the base specifier(as in 4'sd12)
- bit-select results are unsigned, regardless of the operands
- part-select results are unsigned, regardless of the operands even if the part-select specifies the entire vector.
```verilog
logic [15:0] a;
logic signed [7:0] b;
initial 
	a = b[7:0]; // b[7:0] is unsigned and therefore zero-extended
```
- concatenate results are unsigned, regardless of the operands
- comparison and reduction operator results are unsigned, regardless of the operands
- reals converted to integers by type coercion are signed
- the sign and size of any self-determined operand are determined by the operand itself and independent of the remainder of the expression
- For non-self-determined operands, the following rules:
	- if any operand is real, the result is real
	- if any operand is unsigned, the result is unsigned, regardless of the operator
	- if all operands are signed, the result will be signed, regardless of operator, except when specified otherwise.

## 11.8.2 steps for evaluating an expression
The following are the steps for evaluating an expression:
- determine the expression size based upon the standard rules of expression size determination.
- determine the sign of the expression using the rules outlined above
- propagate the type and size of the expression (or self-determined subexpression) back down to the context-determined operands of the expression. In general, any context-determined operand of an operator shall be the same type and size as the result of the operator. However, there are two exceptions:
	- if the result type of the operator is real and if it has a context-determined operand that is not real, that operand shall be treated as if it were self-determined and then converted to real just before the operator is applied.
	- The relational and equality operators have operands that are neither fully self-determined nor fully context-determined. The operands shall effect each other as if they were context-determined operands with a result type and size (maximum of the two operand sizes) determined from them. However, the actual result shall always be 1 bit unsigned. The type and size of the operand shall be independent of the rest of the expression and vice versa.
- When propagation reaches a simple operand as 11.5, then that operand shall be converted to the propagated type and size. If the operand shall be extended, then is shall be sign-extended only if the propagated type is signed.

# 11.9 tagged union expressions and member access
# 11.10 string literal expressions
string literal operands shall be treated as constant numbers consisting of a sequence of 8-bit ASCII codes, one per character. Any SV operator can manipulate string literal operands. The operator shall behave as though the entire string were a single numeric value.
# 11.11 minimum, typical, and maximum delay expressions
SV models typically specify three values for delay expressions. The three values allow a design to be tested with minimum, typical, or maximum delay values, known as a *min:typ:max expression*.

# 11.12 let construct
A **let** declaration defines a template expression(a let body), customized by its ports. A let construct may be instantiated in other expression.

let declarations can be used for customization and can replace the text macros in many cases. The let construct is safer because it has a local scope, while the scope of compiler directives is global within the compilation unit. Including let declarations in packages  is a natural way to implement a well-structured customization for the design code.

A let may be declared in any of the following:
- a module
- an interface 
- a program 
- a checker
- a clocking block
- a package
- a compilation-unit scope
- a generate block
- a sequential or parallel block
- a subroutine