---
title: Notes about DTS
tags:
  - linux_kernel
  - vp
date: 2026-06-14
---
![[pics/Pasted image 20260614163659.png]]
## Tree Structure.
### Node name
> `node-name@unit-address`

The *unit-address* component of the name is specific to the bus type on which the node sits. The *unit-address* must match the first address specified in the `reg` property of the node. If the node has no `reg` property, the `@unit-address` must be omitted and the *node-name* alone differentiates the node from other nodes at the same level in the tree.

### Properties
Each node in the devicetree has properties that describe the characteristics of the node. Properties consist of a name and a value.

DTSpec specifies a set of standard properties for device nodes.

> compatible = <stringlist>
> mode = <string>
> phandle = <u32>
> status = <string>
> #address-cells, #size-cells = <u32>
> reg = <prop-encodes-array> (encoded as an arbitrary number of (address, length) pairs)
> virtual-reg = <u32>


