---
title: Byte order and Bit order
date: 2025-10-20 18:52:00
---
This article tries to summarize the various areas in which the business of byte and bit order plays a role, including CPU, buses, devices and networking protocols. We dive into the details and hope to provide a good reference on this topic. The article also tries to suggest some guidelines and rules of thumb developed from practice.

## Byte order: Endianness
Two types of endianness exist, big endian and little endian. Big endian refers to the method that stores the most significant byte of an integer at the lowest byte address. Little endian is the opposite; it refers to the method of storing the most significant byte of an integer at the highest byte address.

Bit order usually follows the same endianness as the byte order for a given computer system. That is, in a big endian system the most significant bit is stored at the lowest bit address; in a little endian system, the least significant bit is stored at the lowest bit address.

Every effort is made to avoid bit swapping in software when designing a system, because bit swapping is both expensive and tedious.

Write Integer for Big Endian System
```bash
byte  addr       0         1       2        3
bit  offset  01234567 01234567 01234567 01234567
     binary  00001010 00001011 00001100 00001101
        hex     0a       0b      0c        0d
```

Write Integer for Little Endian System
```bash
byte  addr      3         2       1        0
bit  offset  76543210 76543210 76543210 76543210
     binary  00001010 00001011 00001100 00001101
        hex     0a       0b      0c        0d
```

## Computer architecture
![[pics/Pasted image 20251020185639.png]]

As above picture, CPU, local bus and internal memory/cache all are considered to be CPU, because they usually share the same endianness. Discussion of bus endianness, however, covers only external bus. The CPU register width, memory word width and bus width are assumed to be 32 bits for this article.

### CPU endianness
The CPU endianness is the byte and bit order in which it interprets multi-byte integers from on-chip registers, local bus, in-line cache, memory and so on.

Little endian CPUs include Intel and DEC. Big endian CPUs include Motorola 680x0, Sun Sparc and IBM (e.g., PowerPC). MIPs and ARM can be configured either way.

The CPU endianness affects the CPU's instruction set. Different GNU C toolchains for compiling the C code ought to be used for CPUs of different endianness. For example, mips-linux-gcc and mipsel-linux-gcc are used to compile MIPs code for big endian and little endian, respectively.

The CPU endianness also has an impact on software programs if we need to access part of a multi-byte integer. The following program illustrates that situation. If one accesses the whole 32-bit integer, the CPU endianness is invisible to software programs.

```c
union {
    uint32_t my_int;
    uint8_t  my_bytes[4];
} endian_tester;
endian_tester et;
et.my_int = 0x0a0b0c0d;
if(et.my_bytes[0] == 0x0a )
    printf( "I'm on a big-endian system\n" );
else
    printf( "I'm on a little-endian system\n" );
```

### Bus endianness
The bus we refer to here is the external bus we showed in the figure above. We use PCI as an example below. The bus, as we know, is an intermediary component that interconnects CPUs, devices and various other components on the system. The endianness of bus is a standard for byte/bit order that bus protocol defines and with which other components comply.

Take an example of the PCI bus known as little endian. It implies the following: among the 32 address/data bus line `AD [31:0]`, it expects a 32-bit device and connects its most significant data line to AD31 and least significant data line to AD0. A big endian bus protocol would be the opposite.

For a partial word device connected to bus, for example, an 8-bit device, little endian bus-like PCI specifies that the eight data lines of the device be connected to `AD[7:0]`. For a big endian bus protocol, it would be connected to `AD[24:31]`.

In addition, for PCI bus the protocol requires each PCI device to implement a configuration space. This is a set of configuration registers that have the same byte order as the bus.

Just as all the devices need to follow bus's rules regarding byte/bit endianness, so does the CPU. If a CPU operates in an endianness different from the bus, the bus controller/bridge usually is the place where the conversion is performed.

### Devices endianness

Kevin's Theory #1: When a multi-byte data unit travels across the boundary of two reverse endian systems, the conversion is made such that memory contiguousness to the unit is preserved.

We assume CPU and bus share the same endianness in the following discussion. If the endianness of a device is the same as that of CPU/bus, then no conversion is needed.

In the case of different endianness between the device and the CPU/bus, we offer two solutions here from a hardware wiring point of view. We assume CPU/bus is little endian and the device is big endian in the following discussion.

#### word consistent approach

data can not  cross a 32-bit memory boundary.
#### byte consistent approach


----
Kevin's Theory #2: In a C structure that contains bit fields, if field A is defined in front of field B, then field A always occupies a lower bit address than field B.

Now that everything is sorted out nicely, we can define the C structure as the following to access the descriptor in the NIC:
```c
struct nic_tag_reg {
        uint64_t vlan:24 __attribute__((packed));
        uint64_t rx  :6  __attribute__((packed));
        uint64_t tag :10 __attribute__((packed));
};
```


## Network Protocols endianness

The endianness of network protocols defines the order in which the bits and bytes of an integer field of a network protocol header are sent and received. We also introduce a term called wire address here. A lower wire address bit or byte always is transmitted and received in front of a higher wire address bit or byte.

In fact, for network endianness, it is a little different than what we have seen so far. Another factor is in the picture: the bit transmission/reception order on the physical wire. Lower layer protocols, such as Ethernet, have specifications for bit transmission/reception order, and sometimes it can be the reverse of the upper layer protocol endianness. We look at this situation in our examples.

The endianness of NIC devices usually follow the endianness of the network protocols they support, so it could be different from the endianness of the CPU on the system. **Most network protocols are big endian**; here we take Ethernet and IP as examples.

#### Ethernet endianness
Ethernet is big endian. This means the most significant byte of an integer field is placed at a lower wire byte address and transmitted/received in front of the least significant byte. For example, the protocol field with a value of 0x0806(ARP) in the Ethernet header has a wire layout like this:

```bash
wire byte offset :   0     1
hex              :  08    06
```
Notice that the MAC address field of the Ethernet header is considered as a string of characters, in which case the byte order does not matter. For example, a MAC address 12:34:56:89:9a:bc has a layout on the wire like that shown below, and byte 12 is transimitted first.
```bash
wrie byte offset    0         1         2       3         4        5
binary           00010010  00110100  01010110 01111000 10011010 10111100
hex                12         34        56      78        9a       bc
```

#### Bit Transmission/Reception Order

The bit transmission/reception order specifies how the bits within a byte are transmitted/received on the wire. For Ethernet, the order is from the least significant bit (lower wire address offset) to the most significant bit (higher wire address offset). This apparently is little endian. The byte order remains the same as big endian, as described in early section. Therefore, here we see the situation where the byte order and the bit transmission/reception order are the reverse.

The following is an illustration of Ethernet bit transmission/reception order:
```bash
in memory byte offset 0         1         2       3         4        5
value in mem      00010010  00110100  01010110 01111000 10011010 10111100
hex                12         34        56      78        9a       bc

on the wire          0         1         2       3         4        5
                  01001000  00101100  01101010 00011110 01011001 00111101
```

We see from this that the group (multicast) bit, the least significant bit of the first byte, appeared as the first bit on the wire. Ethernet and 802.3 hardware behave consistently with the bit transmission/reception order above.

In this case, where the protocol byte order and the bit transmission/reception order are different, the NIC must convert the bit transmission/reception order from/to the host(CPU) bit order. By doing so, the upper layers do not have to worry about bit order and need only to sort out the byte order. In fact, this is another form of the Byte Consistent approach, where byte semantics are preserved when data travels across different endian domains.

The bit transmission/reception order generally is **invisible** to the CPU and software, but is important to hardware considerations such as the serdes (serializer/deserializer) of PHY and the wiring of NIC device data lines to the bus.

#### Parsing Ethernet Header in Software
For either endianness, the Ethernet header can be parsed by software with the C structure below:
```c
struct ethhdr
{
    unsigned char   h_dest[ETH_ALEN];       
    unsigned char   h_source[ETH_ALEN];     
    unsigned short  h_proto;                
};
```
The **h_dest** and **h_source** fields are byte arrays, so no conversion is needed. The **h_proto** field here is an integer, therefore a `ntohs()` is needed before the host accesses this field, and `htons()` is needed before the host fills up this field.
##### Endianness of IP

IP's byte order also is big endian. The bit endianness of IP inherits that of the CPU, and the NIC takes care of converting it from/to the bit transmission/reception order on the wire.

For big endian hosts, IP header fields can be accessed directly. For little endian hosts, which are most PCs in the world (x86), byte swap needs to be be performed in software for the integer fields in the IP header.

Below is the structure of iphdr from the Linux kernel. We use ntohs() before reading integer fields and htons() before writing them. Essentially, these two functions do nothing for big endian hosts and perform byte swapping for little endian hosts.
```c
struct iphdr {
#if defined(__LITTLE_ENDIAN_BITFIELD)
        __u8    ihl:4,
                version:4;
#elif defined (__BIG_ENDIAN_BITFIELD)
        __u8    version:4,
                ihl:4;
#else
#error  "Please fix <asm/byteorder.h>"
#endif
        __u8    tos;
        __u16   tot_len;
        __u16   id;
        __u16   frag_off;
        __u8    ttl;
        __u8    protocol;
        __u16   check;
        __u32   saddr;
        __u32   daddr;
        /*The options start here. */
};
```

Take a look at some interesting fields in the IP header:

**version and ihl fields**: According to IP standard, version is the most significant four bits of the first byte of an IP header. ihl is the least significant four bits of the first byte of the IP header.

There are two methods to access these fields. Method 1 directly extracts them from the data. If ver_ihl holds the first byte of the IP header, then (ver_ihl & 0x0f) gives the ihl field and (ver_ihl > > 4) gives the version field. This applies for hosts with either endianness.

Method 2 is to define the structure as above, then access these fields from the structure itself. In the above structure, if the host is little endian, then we define ihl before version; if the host is big endian, we define version before ihl. If we apply Kevin's Theory #2 here that an earlier defined field always occupies a lower memory address, we find that the above definition in C structure fits the IP standard pretty well.

**saddr and daddr fields:** these two fields can be treated as either byte or integer arrays. If they are treated as byte arrays, there is no need to do endianness conversion. If they are treated as integers, then conversions need to be performed as needed. Below is a function with integer interpretation:
```c
/*  dot2ip - convert a dotted decimal string into an 
 *           IP address 
 */
uint32_t dot2ip(char *pdot)
{
  uint32_t i,my_ip;
  my_ip=0;
  for (i=0; i<IP_ALEN; ++i) {
    my_ip = my_ip*256+atoi(pdot);
    if ((pdot = (char *) index(pdot, '.')) == NULL)
        break;             
        ++pdot;
    }
    return my_ip;
}
```
And here is the function with byte array interpretation:
```c
uint32_t dot2ip2(char *pdot)
{
  int i;
  uint8_t ip[IP_ALEN];
  for (i=0; i<IP_ALEN; ++i) {
    ip[i] = atoi(pdot);
    if ((pdot = (char *) index(pdot, '.')) == NULL)
        break;          
     ++pdot;
  }
  return *((uint32_t *)ip);
}
```

# reference
https://www.linuxjournal.com/article/6788