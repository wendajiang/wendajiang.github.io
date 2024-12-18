---
title: Verilog Static Elaborator
date: 2024-12-18
typora-copy-images-to: ../pics/${filename}
---
# introduction
After a Verilog design has been parsed, the design must have the modules being instantiated linked to modules being defined, the parameters propagated among the various modules and hierarchical references resolved. This phase is called static elaboration.

During static elaboration the following steps are executed:
- top-level modules and tree of instantiations under each of them are identified.
- Deparam statements and module instantiations are processed to calculate the parameter values of the modules for every instantiation.
- Hierarchy names are checked for their validity and usage. These hierarchical names remain in designs.
- Generate statements are processed. For generate unrolled, if/case generate selects the correct concurrent statements to be present in the module.
- Instance arrays are flattened.
- Depending on hierarchical name usage and defparam values the same module gets different signatures. They are replicated and proper values are passed within them hierarchically before attaching them to the corresponding instantiations.
- In each module, parameter values are replaced with constant values by evaluating the constant expression assigned to them. Constant expressions include constant function calls, some system function calls AMS function calls and all operators.
- Function and task calls are checked for their validity (if they are defined in higher level of hierarchy and used in lower level).

The following example shows how utility works on RTL design.
```verilog
// Origin degisn
module test;
	parameter p1 = 10;
	parameter p2 = p1 * 2;
	parameter size = p2 + 12;
	dummy_intfc #(p1)DI();
	// ...
endmodule

interface dummy_intfc;
	parameter p = 2;
	// ...
endinterface

// design after static elaboration
module test;
	parameter p1 = 10;
	parameter p2 = 20;
	parameter size = 32;
	dummy_intfc_uniq_1 DI();
endmodule 

interface dummy_intfc;
	parameter p = 2;
	// ...
endinterface

interface dummy_intfc_uniq_1;
	parameter p = 10;
endinterface
```

# Detailed description
## Top level module extraction 
After analysis, module instantiations are bound name based. -y, -v options and uselib are processed to bind unresolved instantiations. After instance binding top-level modules can be identified. According to verilog 95 rule any un-instatntiated module is assumed to be top-level design and needs elaboration.
## Hierarchical tree creation
In elaboration for each top-level module a pseudo hierarchical tree is created considering the top level module as root. Each module instantiation within the top level will be considered as a child of the root and instantiations within the child will be grand children of the root and children of previous child. In this way the full grown hierarchical tree is created.

```verilog
module top;
	child I1();
	child I2();
endmodule 

module child;
	g_child I3();
	g_child I4();
endmodule 
module g_child;
endmodule
```

The parse tree is like the following :

![image-20241218132300329](/pics/verilog_static_elaborator/image-20241218132300329.png)
after static elaboration, the hierarchical tree will look like this :

![image-20241218132645600](/pics/verilog_static_elaborator/image-20241218132645600.png)
Each node of the hierarchical tree contains the following information:
- A list of declared parameters and their value pair. The default or overwritten value of parameter is stored along with the tree node where the default or overwritten expression is declared 
- A list of hierarchical identifiers referenced in that module. For each hierarchical identifier a placeholder is maintained to store the tree node where the first object referenced by the hierarchical identifier is defined. The declaration scope of the hierarchical identifier is also stored.
- A list of defparams and their value pair. All the hierarchical identifiers for defparams are also inserted in the list of hierarchical identifiers.
- Pointer to the module represented by the node
- Pointer to the instantiation for which the node is created.
The instantiations within the generate construct are to be ignored in hierarchical tree creation, as generate constructs can not be elaborated until the parameters associated with a module have obtained their actual values. When an instantiation is processed to create the hierarchical tree, the hierarchy under the instantiated module is created, and then the parameter values of instantiated modules are overwritten according to the parameter value assignment list of the instantiation. However, the overwriting of parameter values is not performed in actual parse tree, the new values of the parameters are stored in corresponding pseudo tree node replacing their default stored values.

## Hierarchical identifier resolution 
After tree creation, the next step is hierarchical identifier resolution. To resolve a hierarchical identifier, the first object referenced by the hierarchical identifier is searched, starting from the scope where the hierarchical identifier is defined. To search the first referenced object, the following steps are performed(sequentially): 
- The first referenced object is searched in the scope where the hierarchical identifier is defined. If it is not in this scope, the parent scope is searched. This hierarchically upward scope searching is continued until module scope is reached.
- Check if the object is the module containing the hierarchical identifier itself.
- Check if the object is any instance instantiated in that module.
- Search the object traversing hierarchically upward. In each hierarchical parent node the following steps are performed for searching
	- i) Check if the object is the module representing that node.
    - ii) Check if the object is any instance instantiated in that module.
    - iii) Check if the object is any function/task declared in that module.
- Check if the object is any top level module.
- Check if the object name matches with any uniquely instantiated module.

When the first object is resolved, the remaining objects referenced by the hierarchical identifiers are checked for validity. If the hierarchical identifier is determined to be valid identifier, the tree node (where the first object is declared) is stored in the corresponding tree node (containing the hierarchical identifier).

## Parameter value evaluation
The value of a parameter can depend on the value of other parameters or on itself. For example.
``` verilog
module top ;
   parameter p1 = 4 ,
   p2 = p1 * 2 ;
   child I() ;
 endmodule
 
 module child ;
   parameter p = 10 ;
   defparam top.p1 = p ;
 endmodule
```
In the above design, the value of parameter `p1` depends on the value of parameter `p` of module `child`. On the other hand value of parameter `p2` depends on parameter `p1` of module `top` and parameter `p` of module `child`.

Again, for the following design, the value of a parameter `p` depends on itself.
```verilog
 module top ;
   parameter p = 5 ;
   child #(p) I() ;
 endmodule
 
 module child ;
   parameter q = 10 ;
   defparam top.p = q ;
 endmodule
```

For the above design, to evaluate parameter `p`, parameter `q` of module `child` is to be evaluated (and again, the evaluation of parameter `q` depends on evaluation of `p`). So this is a circular dependency and parameter `p` and `q` can not be evaluated.

To **check circular dependency while evaluating each parameter**, the following steps are to be performed:
- Create a duplet containing the parameter identifier to be evaluated and the hierarchical tree node where the parameter is declared.
- A unique list of duplets is maintained to check that if same duplet is created twice.
- Extract the parameters on which the default/overwritten value of the parameter depend.
- Try to evaluate the value of dependent parameters. To evaluate each dependent parameter first create another duplet containing the dependent parameter and its declaration node.
- Check if the new duplet is existed in the unique list of duplets. If exists, it is concluded that there is circular dependency and evaluation of the parameter fails. Otherwise the above two steps and this one is repeated to evaluate all dependent parameters.
- After evaluating dependent parameters, evaluate the value of actual parameter.
Moreover, many times it may be possible that all the parameters can not be evaluated in one pass of the full grown hierarchical tree due to dependency. So to evaluate all parameters and check circular dependency the following algorithm is to be followed:
- Traverse each hierarchical tree to evaluate all parameters.
- Examine the number of unresolved parameters in this traversal.
- If unresolved parameters exist, the hierarchical tree is to be traversed again to evaluate parameters.
- If in current traversal the unresolved parameter count remains the same, it is concluded that circular dependency exists. Otherwise if unresolved parameter count is greater than zero, the hierarchy is to be traversed again.
- Repeat comparison and traversal if required.
## Signature creation 
A signature is created for each hierarchical tree node **considering its parameter values, hierarchical references, and the signatures of its children.** If a module is instantiated multiple times at different level of hierarchy, a hierarchical reference within that module can refer to different objects in different modules.

The following example illustrates the effect of hierarchical reference on signature:
```verilog
module top1;
   child I() ;
 endmodule
 
 module top2;
   mod child () ;
 endmodule
 
 module mod ;
   parameter p = 50 ;
   gChild I3() ;
 endmodule
 
 module child ;
   parameter p = 10 ;
   gChild I2() ;
 endmodule
 
 module gChild;
   initial
   $display(“%m %d”, child.p) ;
 endmodule
```
Hierarchical identifier `child.p` in `gChild` refers to parameter `p` of module child for the hierarchy `top.I.I2(10)`, and again it refers parameter `p` of module `mod` for hierarchy `top2.child.I3(50)`.

The next example illustrates the effect of signatures of child nodes:
```verilog 
module top ;
   child I1() ;
   child I2() ;
 endmodule
 
 module child ;
   gChild I() ;
 endmodule
 
 module gChild ;
   parameter p = 10 ;
 endmodule
 
 module top1 ;
   defparam top.I1.I.p = 20 ;
 endmodule
```
In the above example, for hierarchy `top.I1.I` the value of parameter `p` of `gChild` is 20, but for hierarchy `top.I2.I` the value of parameter `p` of `gChild` is 10. So the signature of module child will be unique for instance `I1` and `I2`. The elaborated design will be:
```verilog
module top ;
   child I1 () ;
   child_2 I2 () ;
 endmodule
 
 module child ;
   gChild_uniq_1 I () ;
 endmodule
 
 module gChild ;
   parameter p = 10 ;
 endmodule
 
 module top1 ;
 endmodule
 
 module child_2 ;
   gChild_2 I () ;
 endmodule
 
 module gChild_uniq_1 ;
   parameter p = 20 ;
 endmodule
 
 module gChild_2 ;
   parameter p = 10 ;
 endmodule
```
## Copy modules for different signatures 
When a module is instantiated multiple times, each instance can have different signatures or a group of instances can have same signature. Moreover multiple modules of same name (from different libraries) can be instantiated in a design. To consider this for each module, a hash table is maintained. The hash table associates each signature of the module with an array of hierarchical tree nodes containing that signature. Another hash table is maintained to associate module pointer with the previous hash table for that module.

## Modification of parameters in actual parse-tree
In elaboration, the overwritten values of parameters are stored in a corresponding hierarchical tree node. After copying the modules for different signatures, the parse-tree is modified to set the actual values of parameters. Moreover, the resolved `defparam`s are removed from the parse tree, and the task/function calls (situated hierarchically upwards) are bound, extracting information from the corresponding hierarchical tree node.
## Generate construct and array instance elaboration
When the parameters associated with a module become defined, the generate instantiations and array instances can be resolved. In this stage, each module is examined to elaborate generate constructs and array instances declared within that module.
### Generate construct elaboration
Generate statements allow control over the declaration of variables, functions, tasks, and instantiations.
* Generated declarations and instantiations can be conditionally instantiated into a design.
* Generated variable declarations and instantiations can be instantiated into a design multiple times.
* Generated instances have unique identifier names.

Generated instantiations are one or more of the following:
* modules
* user defined primitives
* Verilog gate primitives
* continuous assignments
* initial blocks
* defparam statements
* always blocks.

Generated statements are created using one of the following three methods:
- generate-conditional elaboration

	A generate-conditional is an if-else-if generate construct that permits modules, user defined primitives, Verilog gate primitives, continuous assignments, initial blocks and always blocks to be conditionally instantiated into another module based on an expression (condition expression) that is deterministic at elaboration time. So in elaboration the condition expression of generate-conditional is evaluated. If the condition is true, the true statement of the generate-conditional is elaborated. Otherwise the false statement of generate-conditional is elaborated.

- generate-case elaboration

	A generate case construct permits modules, user defined primitives, Verilog gate primitives, continuous assignments, initial blocks and always blocks to be conditionally instantiated into another module based on a select one-of-many case construct. So in elaboration the case condition expression and the condition expressions of case-items are evaluated. The value of the case condition is compared with the values of case-item conditions. If any case-item condition matches with the case condition, corresponding case-item statement is elaborated. If no case-item condition matches with the case condition, the default statement (if any) is elaborated.

- generate-loop elaboration

	A generate-loop permits one or more variable declarations, modules, user defined primitives, gate primitives, continuous assignments, initial blocks and always blocks to be instantiated multiple times using a for-loop. The index loop variable used in a generate for-loop is declared as a genvar. The initial, final and increment value of the loop index variable are determined. From these the iteration count of the loop can be determined. The generated name for the scope at each iteration of the loop is created by adding “[genvar’s value]” string to the end of the generate block identifier for the loop.

	for example:
	```verilog 
	module test(a, b, out);
    parameter SIZE = 4 ;
  	output [SIZE -1 : 0] out ;
  	input [SIZE -1 : 0] a, b;
     
  	genvar i ;
  	generate
  		for (i= 0 ; i< SIZE; i= i+1)
  		begin :blk
  			wire t1 ;
  			xor g1(t1, a[i], b [i] ) ;
  		end
  	endgenerate
  endmodule 
  ```
  The generated instance names are `blk[0].g1, blk[1].g1, blk[2].g1, blk[3].g1`, and generated nets are `blk[0].t1, blk[1].t1, blk[2].t1, blk[3].t1`. The unrolled loop will be 
  ```ver
  for i = 0
	  wire blk[0] .t1 ;
	  xor blk[0] .g1 (blk[0] .t1, a[0], b[0]) ;
  for i = 1
	  wire blk[1] .t1 ;
	  xor blk[1] .g1 (blk[1] .t1, a[1], b[1]) ;
  for i = 2
	  wire blk[2] .t1 ;
	  xor blk[2] .g1 (blk[2] .t1, a[2], b[2]) ;
  for i = 3
	  wire blk[3] .t1 ;
	  xor blk[3] .g1 (blk[3] .t1, a[3], b[3]) ;
  ```
  To perform the above, before elaborating the statements in each iteration of the for-loop, the objects declared within the generate block of the loop are copied with the new generated names, and those copied objects are stored in a hash table associating old identifiers with the newly created identifiers. While elaborating the statements of the for-loop, these newly created objects replace the old ones. In each iteration, the hierarchical identifier references are also stored, so that after that iteration the hierarchical identifiers can be modified.
  
  for example :
  ```verilog
  generate 
	  genvar I;
	  for (I = 0; I < 2; I = I + 1) begin: b1
		  always #5
		  begin: b2
			  parameter p = 10;
		  end
		  initial $display(b2.p);
	  end
	```
	For I = 0, the hierarchical identifier b2.p will be modified to b1[0].b2.p
	For I = 1, hierarchical identifier b2.p will be modified to b1[1].b2.p
- elaboration of module, user defined primitive and gate instantiation

	If these constructs are within a generate-loop, the constructs are copied and the instance names are modified as stated above. Otherwise, the constructs are detached from generate construct and added to module item list.

- elaboration of function/task and variable declaration

	If these declarations are within a generate-loop, the declarations are copied and the names of the declared objects are modified as stated above. Otherwise, the declarations are detached from the generate construct and added to module item list.

- elaboration of always-construct, initial statements

	If these statements are within a generate-loop, the statements are copied. If the statement of always/initial is a sequential/parallel block, the name of the block is modified. Otherwise the statements are detached from generate construct and added to module item list.

- elaboration of other items

	If these items are within a generate loop, the items are copied and added to module item list. Otherwise the items are only detached form generate construct and added to module item list.

After generate construct is elaborated, the original generate construct is removed from the parse-tree.
### Array instance elaboration
There are many situations when repetitive instances are required. These instances shall differ from each other only by the index of the vector to which they are connected. In order to specify an array of instances, the instance name shall be followed by the range specification. An array of instances shall have a continuous range. One identifier shall be associated with only one range to declare an array of instances.

For examples:
```verilog
output[3:0] out;
input[3:0] in;
input en;
bufif0 ar[3:0](out, in, en); // array of instances 
```
The above array instances is equivalent to: 
```verilog
bufif0 ar3(out[3], in[3], en);
bufif0 ar2(out[2], in[2], en);
bufif0 ar1(out[1], in[1], en);
bufif0 ar0(out[0], in[0], en);
```
In array instance elaboration, multiple single instances are created from the instance array depending on the width of the range associated with the instance name. For single instance creation, the bit length of each port expression in the declared instance-array shall be compared with the bit length of each single-instance port or terminal in the instantiated module or primitive. For each port or terminal where the bit length of the instance-array port expression is the same as the bit length of the single-instance port, the instance array port expression shall be connected to each single-instance port. If bit lengths are different, each instance shall get a part-select of the port expression as specified in the range.

The following steps are performed for array instance elaboration:
- For each port or terminal where the bit length of the instance array port expression is different from the bit length of the single-instance port, a wire type object is created in the module scope. The word range of the created object will be same as the bit length of the instance array port expression. If the direction of the single-instance port for the terminal is input, the instance array port expression is set as the initial value of the declared net object. Each instance shall get a part-select of the created object as the terminal expression.
- The terminal expressions of each elaborated single-instance will be as follows:
    - If the bit length of the terminal is equal to multiplication of bit length of the single-instance port and width of instance range, the terminal expression of the single instance will be a part select of the created net object (as stated in above step). Otherwise the terminal expression of the single instance will be same as the corresponding terminal expression of the instance array.
    - The instance name of the elaborated single instance will be “instance name of instance array [range index]”.
    - If the direction of the formal is inout, tran gates will be created to handle inout properties of the port. The number of created tran gates will depend on the bit length of the formal. One terminal of the tran gate will be bit select of the created single-instance terminal and another terminal will be bit select of the corresponding instance array terminal.
- After creating all single instances, the terminals of the instance array are examined. For each terminal of the instance array, if the direction of the formal is output, a continuous assignment is created. The left hand side of the assignment will be the terminal expression of the instance array and the right hand side of the assignment will be net type object (created in first step for this terminal).
- Original instance array is removed from the parse-tree.

Example:
```verilog
module top();
	parameter SIZE = 4;
	wire[SIZE-1 : 0] x, y, z;
	child I[SIZE-1:0](x, y, z);
endmodule 

// the above example is the result after analysis but before static elaboration. After static elaboration is done, the elaborated design will be: 

module top();
   parameter SIZE = 4 ;
   wire [SIZE -1 : 0] x, y, z;
   wire [3:0] tmp = x ;
   wire [3:0] tmp_0 ;
   wire [3:0] tmp_1;
   child \I[3] (tmp[3], tmp_0[3], tmp_1[3]) ;
   tran (tmp_0[3], y[3]) ;
   child \I[2] (tmp[2], tmp_0[2], tmp_1[2]);
   tran (tmp_0[2], y[2]) ;
   child \I[1] (tmp[1], tmp_0[1], tmp_1[1]) ;
   tran (tmp_0[1], y[1]) ;
   child \I[0] (tmp[0], tmp_0[0], tmp_1[0]) ;
   tran (tmp_0[0], y[0]) ;
   assign z = tmp_1 ;
```
## Hierarchical tree expansion
After generate construct and array instance elaboration, some module instantiations are added in the module item list. These instantiations will create a new hierarchy, so the hierarchical tree is expanded in this stage if required. This expansion will introduce some additional hierarchical references, defparams, and generate constructs. To process the introduced constructs, hierarchical identifier resolution, parameter evaluation, signature creation, module copy, module updating, generate/array instance elaboration, and hierarchical tree expansion are performed until all generate constructs are elaborated.

## Modification of hierarchical references and master name of instantiations
In elaboration modules are replicated for different signatures. Due to replication the master name of the instantiations and the hierarchical references can be changed.

Example:
```verilog
module top1 ;
   child #(4) I1() ;
   child #(5) I2() ;
 endmodule
 
 module top2;
   mod child () ;
 endmodule
 
 module mod ;
   parameter p = 10 ;
   gchild I() ;
 endmodule
 
 module child ;
   parameter p = 30 ;
   gchild I() ;
 endmodule
 
 module gchild ;
   initial
   $display(child.p) ;
 endmodule

/// after static elaboration 
module top1 ;
   child I1() ;
   child_5_gchild_1 I2() ; // master name changed as the master module is
                           // replicated with different name
endmodule
 
module top2 ;
   mod child () ;
endmodule
 
module mod ;
   parameter p = 10 ;
   gchild_2 I() ; // master name changed as the master module is replicated
                  // with different name due to hierarchical// references.
endmodule
 
module child ;
   parameter p = 4 ;
   gchild I() ;
endmodule
 
module gchild ;
   initial
   $display(child.p) ; // hierarchical reference remains unchanged
endmodule
 
module child_5_gchild_1 ;
   parameter p = 5 ;
   gchild_1 I() ;
endmodule
 
module gchild_1 ; // Replicated module, replication due to hierarchical
                   // reference
   initial
   $display(child_5_gchild_1.p) ; // Name of the hierarchical identifier
                                  // is changed as the first object referenced 
                                  // by the hierarchic Identifier is replicated 
                                  // with a new name
endmodule
 
module gchild_2 ;
   initial$display(child.p) ;
endmodule
```
## Deletion of parameter value assignment list from instantiations
The last step of the elaboration is to delete parameter value assignment list from module instantiations as the parameters associated with the modules now obtain overwritten values.

# Constant Expression Replacement
`VERILOG_REPLACE_CONST_EXPRS` compile flag.
- Bounds of packed and unpacked ranges in all data declartions
- Default values of all declared objects if those are constant
- Constant bit/part/slice expressions from all identifier references.
- Delay values
# Limitations 
There are SystemVerilog corner cases in which the prettyprint output of the elaborated parse tree can be illegal SystemVerilog, or have incorrect behavior.

In some such cases, the following runtime flags can be used to prettyprint a legal output file.

1. module type parameter override 
```verilog
// Type 'ST' defined inside module 'top' is used to overwrite type
// parameter of module 'foo'. From module 'foo', type 'ST' is not visible
//
// Runtime flag 'veri_make_pretty_print_legal_for_type_parameter_override'
// needs to be set to make pretty-printed output legal after static
// elaboration

module foo #(parameter type T = int)(input T in1, output int out1) ;
   assign out1 = in1.a + in1.b ;
endmodule

module top ;
   typedef struct { int a; byte b ; } ST ;
   ST in ;
   int out ;
   foo #(ST) I(in, out) ; 
endmodule
```
2. Class type parameter override 
```verilog
// Runtime flag 'veri_make_pretty_print_legal_for_type_parameter_override'
// needs to be set to make pretty-printed output legal after static
// elaboration since 'local_class' is not visible from within class 'foo'

int global_int = 4 ;

class foo #(parameter type T=int) ;
   T obj ;
   function int get ;
       obj = new ;
       return obj.get() + global_int ;
   endfunction
endclass

module top #(parameter p = 10) ;
   class local_class ;
       function int get ;
           return p ;
       endfunction
   endclass
   foo #(local_class) x = new ;
   initial $display("%d", x.get()) ;
endmodule
```
3. same function identifier in different packages 
```verilog
// Runtime flag 'veri_alternative_generate_elab' should be set to keep
// pretty-printed output correct. Otherwise pretty-printed output will
// have incorrect simulation result.

package p1 ;
   function int func ;
       return 1 ;
   endfunction
endpackage

package p2 ;
   function int func ;
      return 2 ;
   endfunction
endpackage

module top ;
   import p1::* ;
   generate
   begin : b
       initial $display("Function func returns %d", func()) ; // Should be 2 from package 'p2'
       import p2::* ;
   end
   endgenerate 
endmodule
```
4. hierarchical reference of parameter 
```verilog
// Runtime flag 'veri_alternative_generate_elab' should be set to keep
// pretty-printed output legal. Otherwise hierarchical name becomes simple
// name reference to parameter defined in other module

module top ;
   generate
   begin : b
       parameter param = 1 ;
       foo I() ;
   end
   endgenerate
endmodule

module foo ;
   initial $display(b.param) ;
endmodule
```
5. parameter of different instances of interface 
```verilog 
// There are two instances of interface 'intf'. Hierarchical name 'b.I.param' is
// pointing to two different parameters (param inside module mod for instance
// top.I1 and param inside module mod2 for instance top.bar_inst.I2).  
// So we need to create two copies of interface 'intf'. However, when these
// copied interface instances are assigned to virtual interfaces, those
// assignments become illegal (interface name mismatch for target and value)
// when pretty-printed output is analyzed and elaborated.
//
// If runtime flag 'veri_do_not_copy_interfaces_for_hier_ids' is set, we will
// not copy interfaces and we can analyze and elaborate pretty-printed output
// after static elaboration. However, the static-elaborated parse tree will NOT be 
// correct as the hierarchical name will point to one parameter for both instances.
//
// This is one of the corner cases in which the pretty-printed output is not
// usable.

interface intf ;
   initial $display("%m %d", b.I.param) ;
endinterface 

module top ;
   intf I1() ;
   foo b() ;
   bar bar_inst() ;
   virtual interface intf vi = I1 ;
endmodule

module foo ;
   mod I() ;
endmodule

module mod ;
   parameter param = 10 ;
endmodule

module bar ;
   generate
   begin : b
       mod2 I() ; 
   end
   endgenerate
   intf I2() ;
   virtual interface intf vi = I2 ;
endmodule

module mod2 ;
   parameter param = 5 ;
endmodule
```
6. parameter override of some items of interface array 
```verilog 
// Here defparam is used to change one instance element of an interface array 
// So instance \I[0] should represent a copied interface with p=4.
// However, that will create an incorrect design as the whole interface array is
// connected to interface array port of module 'foo' and its type is 'intf'
//
// To make the design legal, we can set runtime flag
// 'veri_expand_interface_array_ports'
//
// Another way is to set runtime flag
// 'veri_preserve_interface_array_instances'. However, when this flag is set
// defparam will not be applied to design. It will remain in the elaborated parse tree

interface intf ;
   parameter p = 2 ;
   logic x, y ;
endinterface

module top (input int in);
   intf I[3:0] () ;
   defparam I[0].p = 4 ;
   foo I2(I) ;
endmodule

module foo(intf i[3:0]) ;
endmodule
```
7. parameter override of some items of virtual interface array 
```verilog 
// Here defparam is used to change one instance element from interface array 
// So instance \I[0] should represent a copied interface with p=4.
// However, that will create incorrect design as whole interface array is
// connected to virtual interface array 
//
// To make design legal, we can set runtime flag
// 'veri_preserve_interface_array_instances'. However, when this flag is set
// defparam will not be applied to design. It will remain in the elaborated parse tree

interface intf ;
   parameter p = 2 ;
   logic x, y ;
endinterface

module top (input int in);
   intf I[3:0] () ;
   defparam I[0].p = 4 ;
   virtual interface intf vi[3:0] = I ;
   initial $display("vi[3].p=%d vi[0].p=%d", vi[3].p, vi[0].p) ; 
endmodule
```
8. parameter in self-referencing class 
```verilog 
// Inside class 'foo' there is a self-reference with a different parameter value.
// When class foo is copied for its instance x, its self-reference will also be 
// replaced with a different copied version of class 'foo' and that will make
// pretty-printed output illegal (Try VCS or Modelsim).
// To make the output legal, we need to add a forward ref of every copied class.
// That is done with runtime flag
// 'veri_make_pretty_print_legal_for_type_parameter_override'
// or 'veri_add_forward_typedef_for_copied_class'

module test ;
   class foo#(parameter type T=int) ;
       static int y = 1 ;
       static int z = foo#(string)::y ;
   endclass
   foo #(byte) x = new;
endmodule
```
9. generate block and identifier declared in generate blocks 
```verilog 
// Elaboration removes generate blocks and identifiers declared inside
// generate blocks become identifiers declared directly inside modules.
// Moreover the hierarchical name 'blk1.x' become simple identifier reference
// i.e \blk1.x . 
// In elaborated output simple reference '\blk1.x ' will be referenced before its 
// declaration and so other tools will produce error. Verific produces
// a warning for this.
// This can be fixed by maintaining the hierarchy i.e by setting
// 'veri_alternative_generate_elab'.

module test (input c, in1, in2, output reg out1) ;
   always @(*)
       if (c)
           out1 = blk1.x ;
       else
           out1 = blk2.x ;
   generate
   begin : blk1
       logic x ;
       assign x = in1 ;
   end
   begin : blk2 
       logic x ;
       assign x = in2 ;
   end
   endgenerate 
endmodule
```
10. nested interface parameter type
```verilog 
// Here nested interface 'intf' is passed as actual to interface type port of
// module 'foo'. Static elaboration will modify the generic interface type
// port 'c' to point to copied interface \intf(p=9). However this interface is
// nested and so not visible from module 'foo' making the output illegal.
//
// Set runtime flag
// 'veri_print_generic_interface_for_nested_interface_type_ports' to keep
// interface ports as generate interface ports to make output legal

module top ;
   interface intf #(parameter p = 3) ;
       logic x, y ;
   endinterface
   intf #(9) inst() ;
   foo I(inst) ;
endmodule

module foo (interface c) ;
endmodule
```